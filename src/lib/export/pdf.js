// Searchable PDF export.  Manual §4.11
// Arabic needs the bundled Amiri font registered through fontkit — the
// standard 14 PDF fonts cannot encode Arabic at all.
import { PDFDocument } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

export async function exportSearchablePdf(docIds, destPath) {
  throw new Error('TODO §4.11');
}
