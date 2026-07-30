import { listTags } from '../lib/tags.js';
import { t } from '../lib/i18n.js';

const box = () => document.querySelector('#sidebar');

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

// Which way the arrow points: it shows where the panel is about to move, so it
// has to flip in rtl as well as when collapsed.
function arrow(collapsed) {
  const rtl = document.documentElement.dir === 'rtl';
  return rtl !== collapsed ? '\u203a' : '\u2039';
}

// `active` is whatever is currently in the search box, so a tag clicked here
// and a tag typed there highlight the same row.
export async function renderSidebar(onPick, active = '') {
  const collapsed = localStorage.getItem('waraqi.sidebar') === 'collapsed';
  const tags = (await listTags()).filter((tag) => tag.n > 0);

  const row = (label, count, value, on) => `
    <li><button class="side-item${on ? ' on' : ''}" data-value="${esc(value)}">
      <span>${esc(label)}</span>${count === null ? '' : `<span class="count">${count}</span>`}
    </button></li>`;

  box().classList.toggle('collapsed', collapsed);
  box().innerHTML = `
    <div class="side-head">
      <span class="side-title">${t('tags')}</span>
      <button id="side-toggle" class="ghost" title="${t('collapse')}">${arrow(collapsed)}</button>
    </div>
    <ul class="side-list">
      ${row(t('allDocs'), null, '', !active)}
      ${tags.map((tag) => row(tag.name, tag.n, tag.name, tag.name === active)).join('')}
    </ul>`;

  box().querySelector('#side-toggle').onclick = (e) => {
    const now = box().classList.toggle('collapsed');
    localStorage.setItem('waraqi.sidebar', now ? 'collapsed' : 'open');
    e.currentTarget.textContent = arrow(now);
  };

  box().querySelector('.side-list').onclick = (e) => {
    const btn = e.target.closest('[data-value]');
    if (btn) onPick(btn.dataset.value);
  };
}
