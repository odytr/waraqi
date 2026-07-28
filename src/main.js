import { open } from '@tauri-apps/plugin-dialog';
import { getDb, recent } from './lib/db.js';
import { search } from './lib/search.js';
import { exportArchive } from './lib/export/archive.js';
import { applyLang, toggleLang, t } from './lib/i18n.js';
import { applyTheme, toggleTheme } from './lib/theme.js';
import { renderLibrary } from './ui/library.js';
import { openViewer } from './ui/viewer.js';
import { mountImportUi } from './ui/importui.js';

const searchBox = document.querySelector('#search');

async function refresh() {
  const q = searchBox.value.trim();
  const docs = q ? await search(q) : await recent();
  renderLibrary(
    docs,
    (id) => openViewer(id, refresh),
    (tag) => { searchBox.value = tag; refresh(); }
  );
}

let typing;
searchBox.oninput = () => {
  clearTimeout(typing);
  typing = setTimeout(refresh, 150);
};

document.querySelector('#theme').onclick = toggleTheme;

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
