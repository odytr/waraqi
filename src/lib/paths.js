// Where Waraqi keeps things on disk.
//
// Every imported photo is copied into ONE folder inside the app's own data
// directory. On Windows that resolves to:
//     C:\Users\<you>\AppData\Roaming\ngo.josa.waraqi\library\
//
// Three reasons this matters:
//   1. The path survives the user moving or deleting the original photo.
//   2. It sits inside our assetProtocol scope ("$APPDATA/**"), which is the
//      only way the webview is allowed to display the image at all.
//   3. It gives us a single folder to export or back up.

import { appDataDir, join } from '@tauri-apps/api/path';
import { mkdir, exists, BaseDirectory } from '@tauri-apps/plugin-fs';

/** Absolute path to the library folder, creating it on first call. */
export async function libraryDir() {
  const dir = await join(await appDataDir(), 'library');
  if (!(await exists('library', { baseDir: BaseDirectory.AppData }))) {
    await mkdir('library', { baseDir: BaseDirectory.AppData, recursive: true });
  }
  return dir;
}

/** Absolute path a given filename would occupy inside the library. */
export async function libraryPathFor(filename) {
  return join(await libraryDir(), filename);
}
