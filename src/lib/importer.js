import { readFile, writeFile } from '@tauri-apps/plugin-fs';
import { basename } from '@tauri-apps/api/path';
import { libraryPathFor } from './paths.js';
import { getDb } from './db.js';
import { sha256 } from './hash.js';
import { recognize, terminate } from './ocr.js';
import { normalize } from './arabic.js';
import { suggestType } from './types.js';
import { t } from './i18n.js';

let cancelled = false;

// Killing the worker is the only way to stop a recognition that is already
// running; the flag alone would only take effect between files.
export async function cancel() {
  cancelled = true;
  await terminate();
}

async function copyIntoLibrary(sourcePath) {
  const bytes = await readFile(sourcePath);
  const hash = await sha256(bytes);

  const db = await getDb();
  const dupe = await db.select(
    `SELECT id FROM documents WHERE sha256 = $1`, [hash]);
  if (dupe.length) return { duplicate: true, id: dupe[0].id };

  const name = await basename(sourcePath);
  const dest = await libraryPathFor(`${Date.now()}-${name}`);
  await writeFile(dest, bytes);
  return { duplicate: false, path: dest, name, hash, bytes };
}

// Decode the bytes we already have rather than fetching the file back through
// convertFileSrc. An <img> pointed at asset.localhost is cross-origin, which
// taints the canvas, and Tesseract has to read the pixels back out.
async function toCanvas(bytes) {
  const bitmap = await createImageBitmap(new Blob([bytes]));
  const c = document.createElement('canvas');
  c.width = bitmap.width;
  c.height = bitmap.height;
  c.getContext('2d').drawImage(bitmap, 0, 0);
  bitmap.close();
  return c;
}

export async function importOne(sourcePath, { langs, onStatus } = {}) {
  const copied = await copyIntoLibrary(sourcePath);
  if (copied.duplicate) return { skipped: 'duplicate', id: copied.id };

  onStatus?.({ status: t('reading'), progress: 0 });
  const canvas = await toCanvas(copied.bytes);

  const text = await recognize(canvas, langs, onStatus);
  const norm = normalize(text);
  const guess = suggestType(norm);

  const db = await getDb();
  await db.execute(
    `INSERT INTO documents
       (filename, path, sha256, ocr_text, ocr_norm, doc_type, imported_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [copied.name, copied.path, copied.hash, text, norm,
     guess?.type ?? '', Date.now()]
  );

  const row = await db.select(
    `SELECT id FROM documents WHERE sha256 = $1`, [copied.hash]);
  return { id: row[0].id, type: guess?.type ?? '', chars: text.length };
}

export async function importMany(paths, { langs, onFile } = {}) {
  cancelled = false;
  const results = [];
  for (let i = 0; i < paths.length; i++) {
    if (cancelled) break;
    const p = paths[i];
    onFile?.({ index: i, total: paths.length, path: p, status: t('starting'), progress: 0 });
    try {
      const r = await importOne(p, {
        langs,
        onStatus: (m) => onFile?.({
          index: i, total: paths.length, path: p,
          status: m.status, progress: m.progress,
        }),
      });
      results.push({ path: p, ...r });
    } catch (err) {
      if (cancelled) break;
      results.push({ path: p, error: String(err) });
    }
  }
  return results;
}
