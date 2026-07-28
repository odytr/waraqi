import { readFile, writeFile, mkdir, exists } from '@tauri-apps/plugin-fs';
import { join } from '@tauri-apps/api/path';
import { allDocs } from '../db.js';
import { tagsFor } from '../tags.js';

// The point of this is that the user can walk away. Everything they own comes
// out as plain files plus a CSV that opens in any spreadsheet - no Waraqi
// needed to read it afterwards.
function csvCell(v) {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function exportArchive(destDir, onProgress) {
  const filesDir = await join(destDir, 'files');
  if (!(await exists(filesDir))) await mkdir(filesDir, { recursive: true });

  const docs = await allDocs();
  const rows = [['id', 'filename', 'type', 'imported_at', 'tags', 'text']];

  for (let i = 0; i < docs.length; i++) {
    const d = docs[i];
    onProgress?.({ index: i, total: docs.length, filename: d.filename });

    await writeFile(await join(filesDir, d.filename), await readFile(d.path));

    const tags = (await tagsFor(d.id)).map((t) => t.name).join(' ');
    rows.push([d.id, d.filename, d.doc_type,
               new Date(d.imported_at).toISOString(), tags, d.ocr_text]);
  }

  const csv = rows.map((r) => r.map(csvCell).join(',')).join('\n');
  await writeFile(await join(destDir, 'index.csv'),
                  new TextEncoder().encode('﻿' + csv));

  const readme = [
    'Waraqi archive export',
    '',
    `${docs.length} documents.`,
    '',
    'files/      the original images, unchanged',
    'index.csv   filename, type, tags and the extracted text of each one',
    '',
    'Nothing here needs Waraqi to open. The CSV is UTF-8 with a BOM so',
    'Excel shows Arabic correctly.',
  ].join('\n');
  await writeFile(await join(destDir, 'README.txt'),
                  new TextEncoder().encode(readme));

  return { count: docs.length, destDir };
}
