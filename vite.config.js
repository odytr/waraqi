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
