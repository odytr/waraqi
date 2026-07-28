// Drop zone + progress.  Uses the Tauri drag-drop event (§2.4), whose payload
// carries real filesystem paths — HTML5 drag-drop does not.
import { getCurrentWebview } from '@tauri-apps/api/webview';
import { enqueueImport } from '../lib/importer.js';

export async function mountImportUi(root) {
  throw new Error('TODO Part 5');
}
