#!/usr/bin/env bash
# Waraqi - bring a second machine up to the working Vite setup.
# Run from the project root in Git Bash:   bash sync-setup.sh
# Safe to run twice; every step is idempotent.

set -e

[ -f package.json ] || { echo "ERROR: run this from the project root (where package.json is)."; exit 1; }

echo "==> 1/7  package.json: add vite + dev/build/preview scripts"
node -e '
const fs = require("fs");
const p = JSON.parse(fs.readFileSync("package.json", "utf8"));
p.scripts = Object.assign({}, p.scripts, {
  dev: "vite",
  build: "vite build",
  preview: "vite preview",
  tauri: "tauri",
});
p.devDependencies = Object.assign({}, p.devDependencies, { vite: "^6" });
fs.writeFileSync("package.json", JSON.stringify(p, null, 2) + "\n");
'

echo "==> 2/7  vite.config.js"
cat > vite.config.js <<'EOF'
import { defineConfig } from 'vite';

// Tauri expects a fixed port and fails if it is taken, so strictPort is required.
export default defineConfig({
  // public/ is copied verbatim into dist/ — that is how the offline OCR assets
  // (tessdata, tesseract cores, opencv.js, fonts) end up inside the bundle.
  publicDir: 'public',
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      // src-tauri is Rust; Vite reloading on those changes just adds noise.
      ignored: ['**/src-tauri/**'],
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // WebView2 / WKWebView are both modern Chromium/WebKit; no legacy transpiling.
    target: 'esnext',
    // opencv.js and the tesseract cores are multi-MB by nature. Silence the noise.
    chunkSizeWarningLimit: 12000,
  },
});
EOF

echo "==> 3/7  move index.html to project root (Vite convention)"
if [ -f src/index.html ] && [ ! -f index.html ]; then
  mv src/index.html index.html
fi
# Repoint the script/style tags at src/ regardless of how we got here.
if [ -f index.html ]; then
  sed -i 's|href="styles.css"|href="/src/styles.css"|; s|src="/main.js"|src="/src/main.js"|' index.html
fi

echo "==> 4/7  move src/assets -> public/assets"
mkdir -p public/assets
if [ -d src/assets ]; then
  # shellcheck disable=SC2086
  mv src/assets/* public/assets/ 2>/dev/null || true
  rmdir src/assets 2>/dev/null || true
fi

echo "==> 5/7  tauri.conf.json: withGlobalTauri"
node -e '
const fs = require("fs");
const f = "src-tauri/tauri.conf.json";
const c = JSON.parse(fs.readFileSync(f, "utf8"));
c.app = c.app || {};
c.app.withGlobalTauri = true;               // src/main.js uses window.__TAURI__
fs.writeFileSync(f, JSON.stringify(c, null, 2) + "\n");
'

echo "==> 6/7  tesseract cores: keep only the -lstm variants v7 requests"
mkdir -p public/tesseract
if [ -d node_modules/tesseract.js-core ]; then
  for f in tesseract-core-relaxedsimd-lstm.wasm.js \
           tesseract-core-simd-lstm.wasm.js \
           tesseract-core-lstm.wasm.js; do
    cp "node_modules/tesseract.js-core/$f" public/tesseract/
  done
  cp node_modules/tesseract.js/dist/worker.min.js public/tesseract/
else
  echo "    WARNING: node_modules/tesseract.js-core missing - run 'npm install' then re-run this script."
fi
rm -f public/tesseract/tesseract-core.wasm.js \
      public/tesseract/tesseract-core-simd.wasm.js \
      src-tauri/2

echo "==> 7/7  npm install"
npm install

echo
echo "Checking offline assets still needed in public/ ..."
for p in tessdata/ara.traineddata.gz tessdata/eng.traineddata.gz opencv/opencv.js fonts/Amiri-Regular.ttf; do
  if [ -f "public/$p" ]; then
    echo "  ok      public/$p"
  else
    echo "  MISSING public/$p   <- download this before OCR will work offline"
  fi
done

echo
echo "Done. Now run:  npm run tauri dev"
