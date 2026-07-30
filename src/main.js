import { open } from '@tauri-apps/plugin-dialog';
import { openPath } from '@tauri-apps/plugin-opener';
import { libraryDir } from './lib/paths.js';
import { getDb, recent } from './lib/db.js';
import { search } from './lib/search.js';
import { exportArchive } from './lib/export/archive.js';
import { applyLang, toggleLang, t } from './lib/i18n.js';
import { applyTheme, toggleTheme } from './lib/theme.js';
import { renderLibrary } from './ui/library.js';
import { openViewer } from './ui/viewer.js';
import { mountImportUi } from './ui/importui.js';
import { renderSidebar } from './ui/sidebar.js';

const searchBox = document.querySelector('#search');

function pick(value) {
  searchBox.value = value;
  refresh();
}

async function refresh() {
  const q = searchBox.value.trim();
  const docs = q ? await search(q) : await recent();
  await renderSidebar(pick, q);
  renderLibrary(docs, (id) => openViewer(id, refresh), pick);
}

let typing;
searchBox.oninput = () => {
  clearTimeout(typing);
  typing = setTimeout(refresh, 150);
};

document.querySelector('#theme').onclick = toggleTheme;

// Shows people where their documents actually live. libraryDir() creates the
// folder if it is not there yet, so this works on a fresh install too.
document.querySelector('#open-folder').onclick = async () => {
  try {
    await openPath(await libraryDir());
  } catch (err) {
    console.error('[open folder]', err);
    alert(String(err));
  }
};

document.querySelector('#ui-lang').onclick = () => {
  toggleLang();
  refresh();
};

document.querySelector('#export').onclick = async () => {
  const dir = await open({ directory: true });
  if (!dir) return;
  try {
    const { count } = await exportArchive(dir);
    alert(`${t('exported', count)}\n${dir}`);
  } catch (err) {
    console.error('[archive]', err);
    alert(String(err));
  }
};

applyTheme();
applyLang();
await getDb();
await mountImportUi(refresh);
await refresh();
