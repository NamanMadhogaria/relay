export type Theme = 'light' | 'dark';

export function readTheme(): Theme {
  try {
    const saved = localStorage.getItem('relay-theme');
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    // Theme switching remains available when browser storage is blocked.
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem('relay-theme', theme);
  } catch {
    // Keep the chosen theme for this session even if it cannot be persisted.
  }
}
