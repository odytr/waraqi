// Temporary smoke test for Manual §2.3 (showing a local image) and
// §2.4 (drag-drop with real filesystem paths).
//
// To run it, point index.html at this file instead of main.js:
//     <script type="module" src="/src/smoketest.js" defer></script>
// Delete the file once both checks pass.

import { convertFileSrc } from '@tauri-apps/api/core';
import { getCurrentWebview } from '@tauri-apps/api/webview';
import { appDataDir, join, basename } from '@tauri-apps/api/path';
import { mkdir, exists, readFile, writeFile } from '@tauri-apps/plugin-fs';

const log = (msg) => {
  console.log(msg);
  const el = document.querySelector('#smoke-log');
  if (el) el.textContent += msg + '\n';
};

// §2.3: the webview cannot read arbitrary disk paths, and assetProtocol.scope
// is "$APPDATA/**". So a dropped file only becomes displayable after we copy it
// into AppData. Copy first, convert second - that ordering is the whole point.
async function importToLibrary(srcPath) {
  const libDir = await join(await appDataDir(), 'library');
  if (!(await exists(libDir))) await mkdir(libDir, { recursive: true });

  const name = await basename(srcPath);
  const destPath = await join(libDir, name);

  // read+write rather than copyFile: the source is outside AppData, and the
  // capabilities file already grants fs:allow-read-file on "**".
  await writeFile(destPath, await readFile(srcPath));
  log(`copied -> ${destPath}`);
  return destPath;
}

async function show(destPath) {
  const url = convertFileSrc(destPath);
  log(`asset url: ${url}`);
  const img = document.querySelector('#smoke-img');
  img.onload = () => log('IMAGE RENDERED - 2.3 passes');
  img.onerror = () => log('IMAGE FAILED - check assetProtocol scope and CSP img-src');
  img.src = url;
}

// §2.4: HTML5 drag-drop hands back a File with no path. Tauri's own event
// carries real filesystem paths instead.
await getCurrentWebview().onDragDropEvent(async (event) => {
  // The manual's [VERIFY] note: confirm the field really is `paths`.
  log(`payload: ${JSON.stringify(event.payload)}`);

  if (event.payload.type === 'over') return;
  if (event.payload.type === 'leave') return;
  if (event.payload.type !== 'drop') return;

  const paths = event.payload.paths;
  if (!paths?.length) {
    log('NO PATHS on payload - the field name differs in this version');
    return;
  }
  log(`dropped ${paths.length} file(s), first: ${paths[0]}`);

  try {
    await show(await importToLibrary(paths[0]));
  } catch (err) {
    log(`FAILED: ${err}`);
  }
});

document.body.innerHTML = `
  <main style="font-family:system-ui;padding:2rem">
    <h1>Drop an image anywhere in this window</h1>
    <pre id="smoke-log" style="background:#111;color:#0f0;padding:1rem;
         min-height:8rem;white-space:pre-wrap;font-size:12px"></pre>
    <img id="smoke-img" style="max-width:100%;border:1px solid #ccc" />
  </main>`;

log('ready - waiting for a drop');
