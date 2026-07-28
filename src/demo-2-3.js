// Demo for Manual §2.3 — showing a local image.
// Temporary. Point index.html here, run it, then delete this file.
//
//     <script type="module" src="/src/demo-2-3.js" defer></script>

import { open } from '@tauri-apps/plugin-dialog';
import { readFile, writeFile } from '@tauri-apps/plugin-fs';
import { convertFileSrc } from '@tauri-apps/api/core';
import { basename } from '@tauri-apps/api/path';
import { libraryDir, libraryPathFor } from './lib/paths.js';

document.body.innerHTML = `
  <main style="font-family:system-ui;padding:2rem;max-width:900px">
    <h1>§2.3 — showing a local image</h1>
    <p>Run these in order.</p>
    <button id="b1">1. Pick a photo</button>
    <button id="b2" disabled>2. Copy it into the library</button>
    <button id="b3" disabled>3. Display it</button>
    <button id="b4">Show me the library folder path</button>
    <pre id="out" style="background:#111;color:#0f0;padding:1rem;
         white-space:pre-wrap;font-size:12px;min-height:6rem"></pre>
    <img id="img" style="max-width:100%;border:1px solid #ccc" />
  </main>`;

const out = document.querySelector('#out');
const log = (m) => { out.textContent += m + '\n'; console.log(m); };

let sourcePath = null;   // where the user's photo lives now
let libraryPath = null;  // where our copy lives

// ---------------------------------------------------------------- 1. pick
document.querySelector('#b1').onclick = async () => {
  const picked = await open({
    multiple: false,
    filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp'] }],
  });
  if (!picked) return log('cancelled');

  sourcePath = picked;
  log(`picked: ${sourcePath}`);

  // The instructive part: this path is a real disk path, NOT a URL, and it is
  // outside $APPDATA. Converting it now produces a URL the asset protocol
  // will refuse to serve. Try button 3 before button 2 to watch it fail.
  log(`convertFileSrc on it would give:\n  ${convertFileSrc(sourcePath)}`);
  document.querySelector('#b2').disabled = false;
  document.querySelector('#b3').disabled = false;
};

// ---------------------------------------------------------------- 2. copy
document.querySelector('#b2').onclick = async () => {
  const name = await basename(sourcePath);
  libraryPath = await libraryPathFor(name);

  // readFile gives a Uint8Array; writeFile puts those exact bytes down.
  // We avoid copyFile because our capabilities grant fs:allow-read-file on
  // "**" but do not path-allowlist fs:allow-copy-file.
  const bytes = await readFile(sourcePath);
  await writeFile(libraryPath, bytes);

  log(`copied ${bytes.length} bytes ->\n  ${libraryPath}`);
};

// ---------------------------------------------------------------- 3. display
document.querySelector('#b3').onclick = () => {
  const path = libraryPath ?? sourcePath;
  const inScope = libraryPath !== null;

  const url = convertFileSrc(path);
  log(`displaying ${inScope ? 'the LIBRARY copy' : 'the ORIGINAL (out of scope)'}`);
  log(`  ${url}`);

  const img = document.querySelector('#img');
  img.onload = () => log('RENDERED. §2.3 works.');
  img.onerror = () => log(
    'FAILED to load.' +
    (inScope
      ? ' Path is in scope, so check img-src in your CSP.'
      : ' Expected: this path is outside $APPDATA/**. Press 2, then 3.')
  );
  img.src = url;
};

// ---------------------------------------------------------------- where?
document.querySelector('#b4').onclick = async () => {
  log(`library folder: ${await libraryDir()}`);
};

log('ready');
