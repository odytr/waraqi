// Schema, migration, FTS triggers.  Manual §4.2
// NOTE: tauri-plugin-sql runs ONE statement per execute() call.
import Database from '@tauri-apps/plugin-sql';

let db;

export async function getDb() {
  if (!db) db = await Database.load('sqlite:waraqi.db');
  return db;
}

export async function migrate() {
  throw new Error('TODO §4.2: run each CREATE statement in its own execute()');
}
