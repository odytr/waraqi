import { mkdir, copyFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { join, basename } from '@tauri-apps/api/path';
import { getDb } from '../db.js';
import { tagsFor } from '../tags.js';

export async function exportArchive(destDir, onProgress) {
  const db = await getDb();
  const docs = await db.select('SELECT * FROM documents ORDER BY id');

  await mkdir(destDir, { recursive: true });

  for (let i = 0; i < docs.length; i++) {
    const d = docs[i];
    const tags = (await tagsFor(d.id)).map(t => t.name);
    const stem = d.filename.replace(/\.[^.]+$/, '');
    const folder = await join(destDir, stem);
    await mkdir(folder, { recursive: true });

    await copyFile(d.path, await join(folder, d.filename));   // the original, untouched
    await writeTextFile(await join(folder, 'metadata.json'),
      JSON.stringify({
        filename: d.filename, type: d.doc_type, tags,
        imported_at: d.imported_at, ocr_text: d.ocr_text,
      }, null, 2));
    await writeTextFile(await join(folder, 'text.txt'), d.ocr_text ?? '');

    onProgress?.({ index: i + 1, total: docs.length });
  }

  await writeTextFile(await join(destDir, 'README.txt'),
    'Exported from Waraqi.\n\nEach folder contains the original image, its extracted text,\n' +
    'and metadata.json with tags and dates. No special software is required to read any of it.\n');

  return docs.length;
}