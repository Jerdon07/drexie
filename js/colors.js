// The bridge between css/tokens.css (the ONE place colours are defined) and JavaScript (canvas textures, three.js).
// A token can be any CSS colour expression: #hex, rgb(), var(--other), color-mix(...). We let the browser resolve it on a hidden probe
// element and read the pixel back, so JS never keeps its own copy of a colour. Results are cached (a reload picks up edited tokens).
//
//   hex('--wood')            -> '#233d5b'          (three.js materials/lights, canvas fillStyle)
//   rgba('--wood-seam', .55) -> 'rgba(3,9,20,0.55)' (canvas strokes/fills that need transparency)
//
// Everything is read LAZILY (at the first call, never at import time) so the stylesheet is guaranteed to be loaded, and so
// main.js can apply ?palette=... before the first read.
const cache = new Map();
let probe = null, g = null;

function resolve(token) { // -> [r, g, b] (0-255)
  let v = cache.get(token); if (v) return v;
  if (!probe) {
    probe = document.createElement('i'); probe.hidden = true; document.documentElement.append(probe);
    const c = document.createElement('canvas'); c.width = c.height = 1; g = c.getContext('2d', { willReadFrequently: true });
  }
  const isVar = token.startsWith('--');
  if (isVar && !getComputedStyle(document.documentElement).getPropertyValue(token).trim()) {
    console.warn(`[theme] token ${token} is missing from css/tokens.css`); v = [255, 0, 255]; // loud magenta so a typo is impossible to miss
  } else {
    probe.style.color = ''; probe.style.color = isVar ? `var(${token})` : token;
    g.clearRect(0, 0, 1, 1); g.fillStyle = '#000'; g.fillStyle = getComputedStyle(probe).color; g.fillRect(0, 0, 1, 1);
    const d = g.getImageData(0, 0, 1, 1).data; v = [d[0], d[1], d[2]];
  }
  cache.set(token, v); return v;
}

export const hex = token => '#' + resolve(token).map(n => n.toString(16).padStart(2, '0')).join('');
export const rgba = (token, a) => `rgba(${resolve(token).join(',')},${a})`;
export const clearColors = () => cache.clear();
