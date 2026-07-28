import { copyFile, readFile } from '@tauri-apps/plugin-fs';
import { convertFileSrc } from '@tauri-apps/api/core';
import { basename, join } from '@tauri-apps/api/path';
import { libraryDir } from './paths.js';
import { getDb } from './db.js';
import { sha256OfFile } from './hash.js';
import { clean } from './cv.js';
import { recognize } from './ocr.js';
import { normalize } from './arabic.js';
import { suggestType } from './types.js';

const IMAGE_RE = /\.(jpe?g|png|webp|bmp|tiff?)$/i;

export async function importOne(sourcePath, onProgress) {
  if (!IMAGE_RE.test(sourcePath)) return { status: 'skipped', reason: 'not an image' };

  const db = await getDb();
  const hash = await sha256OfFile(sourcePath);

  const dupe = await db.select('SELECT id FROM documents WHERE hash = $1', [hash]);
  if (dupe.length) return { status: 'duplicate', id: dupe[0].id };

  // copy into our library (stable path, inside asset scope)
  const name = await uniqueName(await basename(sourcePath));
  const dest = await join(await libraryDir(), name);
  await copyFile(sourcePath, dest);

  // clean -> OCR
  const img = await loadImage(dest);
  const cleaned = await clean(img);
  const { text, confidence, words } = await recognize(cleaned, onProgress);

  const norm = normalize(text);
  await db.execute(
    `INSERT INTO documents (filename, path, hash, ocr_text, ocr_norm, doc_type)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [name, dest, hash, text, norm, suggestType(norm)]
  );

  const row = await db.select('SELECT last_insert_rowid() AS id');
  return { status: 'imported', id: row[0].id, confidence, words };
}

function loadImage(path) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = convertFileSrc(path);      // see Part 2.3
  });
}

async function uniqueName(name) {
  const db = await getDb();
  const taken = await db.select('SELECT 1 FROM documents WHERE filename = $1', [name]);
  if (!taken.length) return name;
  const dot = name.lastIndexOf('.');
  return `${name.slice(0, dot)}-${Date.now()}${name.slice(dot)}`;
}

/* ---------------- queue ---------------- */

export function createImportQueue({ onItem, onDone }) {
  let cancelled = false;
  return {
    cancel() { cancelled = true; },
    async run(paths) {
      const results = { imported: 0, duplicate: 0, skipped: 0, failed: 0 };
      for (let i = 0; i < paths.length; i++) {
        if (cancelled) break;
        try {
          const r = await importOne(paths[i]);
          results[r.status] = (results[r.status] ?? 0) + 1;
        } catch (e) {
          console.error('import failed', paths[i], e);
          results.failed++;
        }
        onItem?.({ index: i + 1, total: paths.length, results });
        await new Promise(r => setTimeout(r, 0));   // let the UI repaint
      }
      onDone?.(results);
      return results;
    },
  };
}