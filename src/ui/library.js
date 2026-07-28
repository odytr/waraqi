import { convertFileSrc } from '@tauri-apps/api/core';
import { t } from '../lib/i18n.js';

const grid = () => document.querySelector('#grid');
const empty = () => document.querySelector('#empty');

function escape(s) {
  return String(s).replace(/[&<>]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}

// snippet() wraps matches in [ ] — turn those into something visible
function highlight(text) {
  return escape(text).replace(/\[(.+?)\]/g, '<b>$1</b>');
}

function tagChips(doc) {
  const names = (doc.tags || '').split(' ').filter(Boolean);
  if (!names.length) return '';
  return `<div class="card-tags">${
    names.map((n) => `<span class="tag mini" data-tag="${escape(n)}">${escape(n)}</span>`).join('')
  }</div>`;
}

function card(doc, onOpen, onTag) {
  const el = document.createElement('article');
  el.className = 'card';
  el.innerHTML = `
    <img src="${convertFileSrc(doc.path)}" alt="" />
    <div class="meta">
      <div class="name">${escape(doc.filename)}</div>
      <div class="sub">${escape(doc.doc_type || t('untyped'))}</div>
      ${tagChips(doc)}
      <div class="sub snippet">${highlight(doc.preview || '')}</div>
    </div>`;

  el.onclick = (e) => {
    const chip = e.target.closest('[data-tag]');
    if (chip) { onTag?.(chip.dataset.tag); return; }
    onOpen(doc.id);
  };
  return el;
}

export function renderLibrary(docs, onOpen, onTag) {
  const g = grid();
  g.innerHTML = '';
  empty().hidden = docs.length > 0;
  for (const d of docs) g.appendChild(card(d, onOpen, onTag));
}
