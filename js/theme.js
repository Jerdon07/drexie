// Single source of truth for light/dark. CSS follows data-theme; the 3D scene eases toward themeTarget().
let t = 0;
export const themeTarget = () => t;
export function toggleTheme() {
  t = t ? 0 : 1;
  document.documentElement.dataset.theme = t ? 'light' : 'dark';
}
