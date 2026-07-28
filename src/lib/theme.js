// Follows the OS setting until the user picks one, then remembers the choice.
const KEY = 'waraqi.theme';

function system() {
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

// The button shows what you get if you press it, not what you are on.
function paintButton(theme) {
  const btn = document.querySelector('#theme');
  if (!btn) return;
  btn.textContent = theme === 'dark' ? '☀' : '☾';
  btn.title = theme === 'dark' ? 'Light mode' : 'Dark mode';
}

function set(theme) {
  document.documentElement.dataset.theme = theme;
  paintButton(theme);
}

export function applyTheme() {
  set(localStorage.getItem(KEY) ?? system());
}

export function toggleTheme() {
  const next =
    document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  localStorage.setItem(KEY, next);
  set(next);
}
