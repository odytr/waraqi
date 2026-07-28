#!/usr/bin/env bash
# Waraqi — create the Part 3 file map.
# Run from the project root:   bash scaffold.sh
# Only creates files that do not already exist. Safe to run repeatedly.

set -e
[ -f package.json ] || { echo "ERROR: run from the project root."; exit 1; }

mkdir -p src/lib/export src/ui src/test

# stub <path> <heredoc-on-stdin>
stub() {
  if [ -e "$1" ]; then
    echo "  skip    $1"
    cat > /dev/null
  else
    mkdir -p "$(dirname "$1")"
    cat > "$1"
    echo "  created $1"
  fi
}

stub src/lib/db.js <<'EOF'
// Schema, migration, FTS triggers.  Manual §4.2
// NOTE: tauri-plugin-sql runs ONE statement per execute() call.
import Database from '@tauri-apps/plugin-sql';

let db;

export async function getDb() {
  if (!db) db = await Database.load('sqlite:waraqi.db');
  return db;
}

export async function migrate() {
  throw new Error('TODO §4.2: run each CREATE statement in its own execute()');
}
EOF

stub src/lib/arabic.js <<'EOF'
// Arabic normalization — the Arabic-first core.  Manual §4.3
// Strips diacritics/tatweel and folds alef, yaa and taa marbuta variants so
// that search matches how people actually type.

/** @param {string} input @returns {string} */
export function normalize(input) {
  throw new Error('TODO §4.3');
}
EOF

stub src/lib/hash.js <<'EOF'
// sha256 of file bytes, for duplicate detection.  Manual §4.4

/** @param {Uint8Array} bytes @returns {Promise<string>} hex digest */
export async function sha256(bytes) {
  throw new Error('TODO §4.4');
}
EOF

stub src/lib/cv.js <<'EOF'
// Loads /opencv/opencv.js and exposes clean().  Manual §4.5
// opencv.js is ~11 MB and initialises asynchronously — always await ready().
// Mats are NOT garbage collected; every Mat you create must be .delete()d.

export async function ready() {
  throw new Error('TODO §4.5: load /opencv/opencv.js, await cv.onRuntimeInitialized');
}

/** Deskew + binarize a page before OCR. */
export async function clean(imageData) {
  throw new Error('TODO §4.5');
}
EOF

stub src/lib/ocr.js <<'EOF'
// Tesseract worker lifecycle, fully offline.  Manual §4.6
// All four paths point at bundled files — nothing may be fetched from a CDN.
import { createWorker } from 'tesseract.js';

let worker;

export async function getWorker(langs = ['ara']) {
  if (worker) return worker;
  worker = await createWorker(langs, 1, {
    workerPath: '/tesseract/worker.min.js',
    corePath: '/tesseract',
    langPath: '/tessdata',
    gzip: true,
  });
  return worker;
}

export async function terminate() {
  if (worker) { await worker.terminate(); worker = undefined; }
}
EOF

stub src/lib/importer.js <<'EOF'
// Import one file / a queue, with cancel and dedupe.  Manual §4.7
// Copy into the library FIRST (§2.3) — only then can the image be displayed.
import { libraryPathFor } from './paths.js';

export async function importOne(sourcePath, { signal } = {}) {
  throw new Error('TODO §4.7');
}

export async function enqueueImport(paths) {
  throw new Error('TODO §4.7');
}
EOF

stub src/lib/search.js <<'EOF'
// FTS query + normalization.  Manual §4.8
// Normalize the query the same way the indexed text was normalized, or Arabic
// searches silently miss.
import { normalize } from './arabic.js';

export async function search(query) {
  throw new Error('TODO §4.8');
}
EOF

stub src/lib/tags.js <<'EOF'
// Tag CRUD and filtering.  Manual §4.9

export async function listTags() { throw new Error('TODO §4.9'); }
export async function addTag(docId, name) { throw new Error('TODO §4.9'); }
export async function removeTag(docId, name) { throw new Error('TODO §4.9'); }
EOF

stub src/lib/types.js <<'EOF'
// Rule-based document type suggestion — zero AI.  Manual §4.10
// Keyword rules over the normalized text; explainable and offline.

/** @returns {{type: string, confidence: number} | null} */
export function suggestType(normalizedText) {
  throw new Error('TODO §4.10');
}
EOF

stub src/lib/export/pdf.js <<'EOF'
// Searchable PDF export.  Manual §4.11
// Arabic needs the bundled Amiri font registered through fontkit — the
// standard 14 PDF fonts cannot encode Arabic at all.
import { PDFDocument } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

export async function exportSearchablePdf(docIds, destPath) {
  throw new Error('TODO §4.11');
}
EOF

stub src/lib/export/archive.js <<'EOF'
// Whole-archive export — the ownership proof.  Manual §4.12
// The user must be able to walk away with everything, readable without Waraqi.

export async function exportArchive(destDir, onProgress) {
  throw new Error('TODO §4.12');
}
EOF

stub src/ui/library.js <<'EOF'
// The grid screen.  Manual §5.3
export function mountLibrary(root) { throw new Error('TODO §5.3'); }
EOF

stub src/ui/viewer.js <<'EOF'
// Single document screen.
export function mountViewer(root, docId) { throw new Error('TODO Part 5'); }
EOF

stub src/ui/importui.js <<'EOF'
// Drop zone + progress.  Uses the Tauri drag-drop event (§2.4), whose payload
// carries real filesystem paths — HTML5 drag-drop does not.
import { getCurrentWebview } from '@tauri-apps/api/webview';
import { enqueueImport } from '../lib/importer.js';

export async function mountImportUi(root) {
  throw new Error('TODO Part 5');
}
EOF

stub src/test/arabic.test.js <<'EOF'
// Tests for normalize().  Manual §4.3
// These are the cases that prove the Arabic-first claim — keep them honest.

// import { normalize } from '../lib/arabic.js';

// TODO: alef variants fold together
// TODO: diacritics are stripped
// TODO: tatweel is removed
// TODO: taa marbuta / haa fold
EOF

echo
echo "File map:"
find src -type f | sort | sed 's|^|  |'
