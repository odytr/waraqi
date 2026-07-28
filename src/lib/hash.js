import { readFile } from '@tauri-apps/plugin-fs';

export async function sha256OfFile(path) {
  const bytes = await readFile(path);                       // Uint8Array
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)]
    .map(b => b.toString(16).padStart(2, '0')).join('');
}