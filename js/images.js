// Portrait loading shared by the HTML panel and the 3D frames (no three.js in here).
// Real file wins whenever it loads; otherwise a generated silhouette stands in. Probed once per id.
import { IMG_DIRS, IMAGES } from './config.js';

const load = src => new Promise(ok => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = src; });
const cache = new Map();
export function loadPortrait(id) {
  if (!cache.has(id)) cache.set(id, (async () => {
    for (const dir of IMG_DIRS) { const img = await load(dir + IMAGES[id].file); if (img) return img; }
    return null;
  })());
  return cache.get(id);
}

function silhouette(c, w, h, tint) {
  const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, tint); g.addColorStop(1, '#0b1118');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  c.fillStyle = 'rgba(255,255,255,.82)';
  c.beginPath(); c.arc(w / 2, h * .38, w * .2, 0, 7); c.fill();                       // head
  c.beginPath(); c.ellipse(w / 2, h * .98, w * .38, h * .3, 0, Math.PI, 0); c.fill(); // shoulders
}
// Centre-crop (nudged up so faces survive) to fill w×h.
function cover(c, img, w, h) {
  const k = Math.max(w / img.width, h / img.height), dw = img.width * k, dh = img.height * k;
  c.drawImage(img, (w - dw) / 2, (h - dh) * .25, dw, dh);
}

// Canvas that shows the fallback immediately and repaints with the real image if one turns up. `ready` resolves true in that case.
export function portraitCanvas(id, w, h) {
  const canvas = Object.assign(document.createElement('canvas'), { width: w, height: h }), c = canvas.getContext('2d');
  silhouette(c, w, h, IMAGES[id].tint);
  const ready = loadPortrait(id).then(img => { if (img) cover(c, img, w, h); return !!img; });
  return { canvas, ready };
}

// <img> source for the HTML panel: the real file, or the fallback as a data URL.
export async function portraitSrc(id) {
  const img = await loadPortrait(id);
  if (img) return img.src;
  const { canvas } = portraitCanvas(id, 400, 500); return canvas.toDataURL();
}