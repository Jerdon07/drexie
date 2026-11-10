// Portrait loading shared by the HTML panel and the 3D frames (no three.js in here).
// Real file wins whenever it loads; otherwise a generated silhouette stands in. Probed once per id.
import { IMG_DIRS, IMAGES, FONT, font } from './config.js';

const load = src => new Promise(ok => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = src; });
const cache = new Map();
export function loadPortrait(id) {
  if (!cache.has(id)) cache.set(id, (async () => {
    for (const dir of IMG_DIRS) for (const file of [].concat(IMAGES[id].file)) { const img = await load(dir + file); if (img) return img; } // `file` may list alternatives (.jpg/.png)
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

// Certificate stand-in (landscape): a framed blank certificate plus the file name to drop into images/.
function certPlaceholder(c, w, h, tint, id) {
  c.fillStyle = '#fbfaf4'; c.fillRect(0, 0, w, h);
  c.strokeStyle = tint; c.lineWidth = w * .012; c.strokeRect(w * .035, h * .05, w * .93, h * .9);
  c.globalAlpha = .5; c.lineWidth = w * .004; c.strokeRect(w * .055, h * .09, w * .89, h * .82);
  c.globalAlpha = .3; c.fillStyle = tint;
  c.fillRect(w * .28, h * .2, w * .44, h * .07); c.fillRect(w * .36, h * .33, w * .28, h * .035);
  c.fillRect(w * .22, h * .42, w * .56, h * .02); c.fillRect(w * .22, h * .47, w * .56, h * .02);
  c.beginPath(); c.arc(w / 2, h * .66, h * .09, 0, 7); c.fill();
  c.globalAlpha = 1; c.fillStyle = '#6b6558'; c.textAlign = 'center'; c.font = font(Math.round(w * .042), FONT.mono, '600');
  c.fillText(`images/${[].concat(IMAGES[id].file)[0]}`, w / 2, h * .88); c.textAlign = 'left';
}
// Certificates are shown whole (letterboxed), never cropped like portraits.
function contain(c, img, w, h) {
  c.fillStyle = '#f1ece0'; c.fillRect(0, 0, w, h);
  const k = Math.min(w / img.width, h / img.height), dw = img.width * k, dh = img.height * k;
  c.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
}

// Canvas that shows the fallback immediately and repaints with the real image if one turns up. `ready` resolves true in that case.
export function portraitCanvas(id, w, h) {
  const canvas = Object.assign(document.createElement('canvas'), { width: w, height: h }), c = canvas.getContext('2d');
  const cert = IMAGES[id].kind === 'cert';
  (cert ? certPlaceholder : silhouette)(c, w, h, IMAGES[id].tint, id);
  const ready = loadPortrait(id).then(img => { if (img) (cert ? contain : cover)(c, img, w, h); return !!img; });
  return { canvas, ready };
}

// <img> source for the HTML panel: the real file, or the fallback as a data URL.
export async function portraitSrc(id) {
  const img = await loadPortrait(id);
  if (img) return img.src;
  const cert = IMAGES[id].kind === 'cert', { canvas } = portraitCanvas(id, cert ? 480 : 400, cert ? 340 : 500); return canvas.toDataURL();
}