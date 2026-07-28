import { getDb } from './db.js';

export async function allTags() {
  const db = await getDb();
  return db.select(`
    SELECT t.id, t.name, COUNT(dt.document_id) AS count
    FROM tags t LEFT JOIN document_tags dt ON dt.tag_id = t.id
    GROUP BY t.id ORDER BY t.name`);
}

export async function ensureTag(name) {
  const db = await getDb();
  const clean = name.trim();
  await db.execute('INSERT OR IGNORE INTO tags (name) VALUES ($1)', [clean]);
  const rows = await db.select('SELECT id FROM tags WHERE name = $1', [clean]);
  return rows[0].id;
}

export async function tagDocument(documentId, tagName) {
  const db = await getDb();
  const tagId = await ensureTag(tagName);
  await db.execute(
    'INSERT OR IGNORE INTO document_tags (document_id, tag_id) VALUES ($1, $2)',
    [documentId, tagId]);
}

export async function untagDocument(documentId, tagId) {
  const db = await getDb();
  await db.execute(
    'DELETE FROM document_tags WHERE document_id = $1 AND tag_id = $2',
    [documentId, tagId]);
}

export async function tagsFor(documentId) {
  const db = await getDb();
  return db.select(`
    SELECT t.id, t.name FROM tags t
    JOIN document_tags dt ON dt.tag_id = t.id
    WHERE dt.document_id = $1 ORDER BY t.name`, [documentId]);
}