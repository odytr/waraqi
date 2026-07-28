import { convertFileSrc } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';
import { getDoc, deleteDoc } from '../lib/db.js';
import { tagsFor, addTag, removeTag } from '../lib/tags.js';
import { exportSearchablePdf } from '../lib/export/pdf.js';
import { t } from '../lib/i18n.js';

const box = () => document.querySelector('#viewer');

export function closeViewer() {
  box().hidden = true;
  box().innerHTML = '';
}

export async function openViewer(id, onChange) {
  const doc = await getDoc(id);
  if (!doc) return;

  const el = box();
  el.hidden = false;
  el.innerHTML = `
    <div class="sheet">
      <div class="row">
        <h2 style="flex:1;margin:0">${doc.filename}</h2>
        <button id="v-pdf" class="ghost">${t('exportPdf')}</button>
        <button id="v-del" class="ghost">${t('delete')}</button>
        <button id="v-close">${t('close')}</button>
      </div>
      <div class="tags" id="v-tags"></div>
      <div class="row">
        <input id="v-tag-input" placeholder="${t('addTag')}" />
        <button id="v-tag-add" class="ghost">${t('add')}</button>
      </div>
      <img src="${convertFileSrc(doc.path)}" alt="" />
      <h3>${t('extracted')}</h3>
      <pre>${doc.ocr_text || t('noText')}</pre>
    </div>`;

  el.onclick = (e) => { if (e.target === el) closeViewer(); };
  el.querySelector('#v-close').onclick = closeViewer;

  async function drawTags() {
    const tags = await tagsFor(id);
    const c = el.querySelector('#v-tags');
    c.innerHTML = '';
    for (const tag of tags) {
      const s = document.createElement('span');
      s.className = 'tag';
      s.textContent = tag.name;
      const x = document.createElement('button');
      x.textContent = '×';
      x.onclick = async () => { await removeTag(id, tag.id); drawTags(); };
      s.appendChild(x);
      c.appendChild(s);
    }
  }
  drawTags();

  el.querySelector('#v-tag-add').onclick = async () => {
    const input = el.querySelector('#v-tag-input');
    await addTag(id, input.value);
    input.value = '';
    drawTags();
  };

  el.querySelector('#v-pdf').onclick = async () => {
    const btn = el.querySelector('#v-pdf');
    const dest = await save({
      defaultPath: doc.filename.replace(/\.\w+$/, '') + '.pdf',
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
    });
    if (!dest) return;
    btn.disabled = true;
    try {
      await exportSearchablePdf([id], dest);
      alert(`${t('saved')}\n${dest}`);
    } catch (err) {
      console.error('[pdf]', err);
      alert(`PDF: ${err}`);
    } finally {
      btn.disabled = false;
    }
  };

  el.querySelector('#v-del').onclick = async () => {
    if (!confirm(t('confirmDelete'))) return;
    await deleteDoc(id);
    closeViewer();
    onChange?.();
  };
}
