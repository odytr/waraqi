import { getCurrentWebview } from '@tauri-apps/api/webview';
import { open } from '@tauri-apps/plugin-dialog';
import { importMany, cancel } from '../lib/importer.js';
import { t } from '../lib/i18n.js';

function setProgress(state) {
  const box = document.querySelector('#progress');
  if (!state) { box.hidden = true; return; }
  box.hidden = false;
  document.querySelector('#progress-label').textContent =
    `${state.index + 1} / ${state.total} — ${state.status ?? ''}`;
  const done = (state.index + (state.progress ?? 0)) / state.total;
  document.querySelector('#progress-fill').style.width = `${done * 100}%`;
}

function selectedLangs() {
  return document.querySelector('#lang').value.split('+');
}

async function run(paths, onDone) {
  if (!paths?.length) return;

  const results = await importMany(paths, {
    langs: selectedLangs(),
    onFile: setProgress,
  });
  setProgress(null);
  console.table(results);

  const failed = results.filter((r) => r.error);
  if (failed.length) {
    alert(`${t('failed', failed.length, results.length)}\n\n` +
          failed.map((r) => r.error).join('\n'));
  } else if (results.length && results.every((r) => r.skipped === 'duplicate')) {
    alert(t('duplicate'));
  }

  onDone(results);
}

export async function mountImportUi(onDone) {
  document.querySelector('#cancel').onclick = async () => {
    await cancel();
    setProgress(null);
  };

  document.querySelector('#import').onclick = async () => {
    const picked = await open({
      multiple: true,
      filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp'] }],
    });
    await run(picked ? [].concat(picked) : [], onDone);
  };

  // HTML5 drag-drop hands back File objects with no path. Tauri's event
  // carries the real paths, which is what we need in order to copy.
  await getCurrentWebview().onDragDropEvent(async (e) => {
    const p = e.payload;
    if (p.type === 'enter') document.body.classList.add('dragging');
    if (p.type === 'leave') document.body.classList.remove('dragging');
    if (p.type === 'drop') {
      document.body.classList.remove('dragging');
      await run(p.paths, onDone);
    }
  });
}
