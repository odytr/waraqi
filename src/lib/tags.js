import { getDb } from './db.js';
import { normalize } from './arabic.js';

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

// فاتورة and فاتوره should be the same tag. Matching in JS rather than adding a
// normalized column keeps the schema alone, and there are only ever a few
// dozen tags so the cost does not matter.
export async function findTag(name) {
  const target = normalize(name);
  const all = await listTags();
  return all.find((t) => normalize(t.name) === target) ?? null;
}

export async function matchTags(query) {
  const q = normalize(query);
  if (!q) return [];
  const all = await listTags();
  return all.filter((t) => normalize(t.name).includes(q));
}

export async function addTag(docId, name) {
  const clean = name.trim();
  if (!clean) return;

  const db = await getDb();
  // reuse an existing tag that only differs by spelling
  let tag = await findTag(clean);
  if (!tag) {
    await db.execute(`INSERT OR IGNORE INTO tags (name) VALUES ($1)`, [clean]);
    const rows = await db.select(`SELECT id, name FROM tags WHERE name = $1`, [clean]);
    tag = rows[0];
  }

  await db.execute(
    `INSERT OR IGNORE INTO doc_tags (doc_id, tag_id) VALUES ($1, $2)`,
    [docId, tag.id]
  );
}

export async function removeTag(docId, tagId) {
  const db = await getDb();
  await db.execute(
    `DELETE FROM doc_tags WHERE doc_id = $1 AND tag_id = $2`, [docId, tagId]);
}
