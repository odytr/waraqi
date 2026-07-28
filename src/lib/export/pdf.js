import { PDFDocument } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { readFile, writeFile } from '@tauri-apps/plugin-fs';
import { getDoc } from '../db.js';

// The text is drawn at opacity 0 on top of the page image. You cannot see it,
// but Ctrl+F in any PDF reader finds it. That is what "searchable PDF" means.
let amiri;

async function amiriBytes() {
  if (!amiri) {
    const res = await fetch('/fonts/Amiri-Regular.ttf');
    if (!res.ok) throw new Error(`Amiri font not found (${res.status})`);
    amiri = new Uint8Array(await res.arrayBuffer());
  }
  return amiri;
}

// Trust the bytes, not the extension. A .jpg that is really a PNG is common
// once phones and messaging apps have been involved.
function isPng(b) {
  return b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;
}

export async function exportSearchablePdf(docIds, destPath) {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const font = await pdf.embedFont(await amiriBytes(), { subset: true });

  let pages = 0;
  for (const id of docIds) {
    const doc = await getDoc(id);
    if (!doc) continue;

    const bytes = await readFile(doc.path);
    const img = isPng(bytes) ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
    const page = pdf.addPage([img.width, img.height]);
    page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
    pages++;

    const size = 10;
    const lines = (doc.ocr_text || '').split('\n').filter((l) => l.trim());
    lines.forEach((line, i) => {
      const y = img.height - 20 - i * (size + 2);
      if (y < 0) return;
      try {
        page.drawText(line, { x: 10, y, size, font, opacity: 0 });
      } catch {
        // a glyph Amiri does not cover — skip the line rather than kill the
        // whole export
      }
    });
  }

  if (!pages) throw new Error('nothing to export');
  await writeFile(destPath, await pdf.save());
  return destPath;
}
