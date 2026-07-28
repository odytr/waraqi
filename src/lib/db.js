import Database from '@tauri-apps/plugin-sql';

let db;

// The FTS table uses content='documents', so SQLite will not keep it in sync
// on its own. The three triggers below do that. Drop them and search returns
// nothing, without ever erroring.
const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS documents (
     id INTEGER PRIMARY KEY,
     filename TEXT NOT NULL,
     path TEXT NOT NULL,
     sha256 TEXT NOT NULL UNIQUE,
     ocr_text TEXT NOT NULL DEFAULT '',
     ocr_norm TEXT NOT NULL DEFAULT '',
     doc_type TEXT NOT NULL DEFAULT '',
     imported_at INTEGER NOT NULL
   )`,

  `CREATE TABLE IF NOT EXISTS tags (
     id INTEGER PRIMARY KEY,
     name TEXT NOT NULL UNIQUE
   )`,

  `CREATE TABLE IF NOT EXISTS doc_tags (
     doc_id INTEGER NOT NULL,
     tag_id INTEGER NOT NULL,
     PRIMARY KEY (doc_id, tag_id)
   )`,

  `CREATE VIRTUAL TABLE IF NOT EXISTS documents_fts
     USING fts5(ocr_norm, content='documents', content_rowid='id')`,

  `CREATE TRIGGER IF NOT EXISTS documents_ai AFTER INSERT ON documents BEGIN
     INSERT INTO documents_fts(rowid, ocr_norm) VALUES (new.id, new.ocr_norm);
   END`,

  `CREATE TRIGGER IF NOT EXISTS documents_ad AFTER DELETE ON documents BEGIN
     INSERT INTO documents_fts(documents_fts, rowid, ocr_norm)
     VALUES ('delete', old.id, old.ocr_norm);
   END`,

  `CREATE TRIGGER IF NOT EXISTS documents_au AFTER UPDATE ON documents BEGIN
     INSERT INTO documents_fts(documents_fts, rowid, ocr_norm)
     VALUES ('delete', old.id, old.ocr_norm);
     INSERT INTO documents_fts(rowid, ocr_norm) VALUES (new.id, new.ocr_norm);
   END`,
];

export async function getDb() {
  if (db) return db;
  db = await Database.load('sqlite:waraqi.db');
  // one statement per execute() - the plugin will not take a batch
  for (const sql of SCHEMA) await db.execute(sql);
  return db;
}

export async function recent(limit = 200) {
  const d = await getDb();
  return d.select(
    `SELECT d.id, d.filename, d.path, d.doc_type, d.imported_at,
            substr(d.ocr_text, 1, 160) AS preview,
            (SELECT group_concat(t.name, ' ') FROM doc_tags dt
             JOIN tags t ON t.id = dt.tag_id WHERE dt.doc_id = d.id) AS tags
     FROM documents d ORDER BY d.imported_at DESC LIMIT $1`,
    [limit]
  );
}

export async function getDoc(id) {
  const d = await getDb();
  const rows = await d.select(`SELECT * FROM documents WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

export async function allDocs() {
  const d = await getDb();
  return d.select(`SELECT * FROM documents ORDER BY imported_at`);
}

export async function countDocs() {
  const d = await getDb();
  const rows = await d.select(`SELECT COUNT(*) AS n FROM documents`);
  return rows[0].n;
}

export async function deleteDoc(id) {
  const d = await getDb();
  await d.execute(`DELETE FROM doc_tags WHERE doc_id = $1`, [id]);
  await d.execute(`DELETE FROM documents WHERE id = $1`, [id]);
}
