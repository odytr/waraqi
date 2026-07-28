import { getDb, recent } from './db.js';
import { normalize } from './arabic.js';

// User text goes straight into a MATCH expression, where bare punctuation is a
// syntax error. Quoting each word makes them literals, and the trailing * gives
// prefix matching so "فات" finds "فاتورة".
function toMatchQuery(raw) {
  const n = normalize(raw);
  if (!n) return null;
  return n.split(' ').filter(Boolean)
    .map((w) => `"${w.replace(/"/g, '""')}"*`)
    .join(' ');
}

const TAGS = `
  SELECT (SELECT group_concat(t2.name, ' ') FROM doc_tags dt2
          JOIN tags t2 ON t2.id = dt2.tag_id WHERE dt2.doc_id = d.id) AS tags,
         d.id, d.filename, d.path, d.doc_type, d.imported_at,
         substr(d.ocr_text, 1, 160) AS preview
  FROM documents d
  JOIN doc_tags dt ON dt.doc_id = d.id
  JOIN tags t ON t.id = dt.tag_id
  WHERE t.name LIKE $1
  GROUP BY d.id
  ORDER BY d.imported_at DESC
  LIMIT 200`;

const FTS = `
  SELECT (SELECT group_concat(t2.name, ' ') FROM doc_tags dt2
          JOIN tags t2 ON t2.id = dt2.tag_id WHERE dt2.doc_id = d.id) AS tags,
         d.id, d.filename, d.path, d.doc_type, d.imported_at,
         snippet(documents_fts, 0, '[', ']', '…', 12) AS preview
  FROM documents_fts
  JOIN documents d ON d.id = documents_fts.rowid
  WHERE documents_fts MATCH $1
  ORDER BY bm25(documents_fts)
  LIMIT 200`;

// Filenames are not in the index, and a document whose OCR came back empty
// would otherwise be unfindable. Slower, but it always answers.
const LIKE = `
  SELECT (SELECT group_concat(t2.name, ' ') FROM doc_tags dt2
          JOIN tags t2 ON t2.id = dt2.tag_id WHERE dt2.doc_id = d.id) AS tags,
         d.id, d.filename, d.path, d.doc_type, d.imported_at,
         substr(d.ocr_text, 1, 160) AS preview
  FROM documents d
  WHERE d.ocr_norm LIKE $1 OR lower(d.filename) LIKE $1
  ORDER BY d.imported_at DESC
  LIMIT 200`;

export async function search(raw) {
  const term = raw.trim();
  if (!term) return recent();

  const db = await getDb();
  const found = new Map();

  // Tag hits go first — if you typed a tag name, that is what you meant.
  try {
    for (const r of await db.select(TAGS, [`%${term}%`])) found.set(r.id, r);
  } catch (err) {
    console.warn('[search] tag lookup failed:', err);
  }

  const q = toMatchQuery(term);
  if (q) {
    try {
      for (const r of await db.select(FTS, [q])) {
        if (!found.has(r.id)) found.set(r.id, r);
      }
    } catch (err) {
      console.warn('[search] FTS failed, falling back to LIKE:', err);
    }
  }

  if (!found.size) {
    for (const r of await db.select(LIKE, [`%${normalize(term)}%`])) {
      found.set(r.id, r);
    }
  }

  return [...found.values()];
}
