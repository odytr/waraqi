import { getDb } from './db.js';

export async function listTags() {
  const db = await getDb();
  return db.select(
    `SELECT t.id, t.name, COUNT(dt.doc_id) AS n
     FROM tags t LEFT JOIN doc_tags dt ON dt.tag_id = t.id
     GROUP BY t.id ORDER BY t.name`
  );
}

export async function tagsFor(docId) {
  const db = await getDb();
  return db.select(
    `SELECT t.id, t.name FROM tags t
     JOIN doc_tags dt ON dt.tag_id = t.id
     WHERE dt.doc_id = $1 ORDER BY t.name`,
    [docId]
  );
}

export async function addTag(docId, name) {
  const clean = name.trim();
  if (!clean) return;
  const db = await getDb();
  await db.execute(`INSERT OR IGNORE INTO tags (name) VALUES ($1)`, [clean]);
  const t = await db.select(`SELECT id FROM tags WHERE name = $1`, [clean]);
  await db.execute(
    `INSERT OR IGNORE INTO doc_tags (doc_id, tag_id) VALUES ($1, $2)`,
    [docId, t[0].id]
  );
}

export async function removeTag(docId, tagId) {
  const db = await getDb();
  await db.execute(
    `DELETE FROM doc_tags WHERE doc_id = $1 AND tag_id = $2`, [docId, tagId]);
}

export async function docsWithTag(tagId) {
  const db = await getDb();
  return db.select(
    `SELECT d.id, d.filename, d.path, d.doc_type, d.imported_at,
            substr(d.ocr_text, 1, 160) AS preview
     FROM documents d JOIN doc_tags dt ON dt.doc_id = d.id
     WHERE dt.tag_id = $1 ORDER BY d.imported_at DESC`,
    [tagId]
  );
}
