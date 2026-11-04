// Canvas textures. All text comes from content.js; all colours from config.js.
import THREE from './three.js';
import { SECTIONS, PROFILE } from '../content.js';
import { P, FONT, font, BARS } from '../config.js';

const tex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); return new THREE.CanvasTexture(c); };
function wrap(c, t, x, y, w, lh) {
  let l = '';
  for (const s of t.split(' ')) { const n = l ? l + ' ' + s : s; if (l && c.measureText(n).width > w) { c.fillText(l, x, y); y += lh; l = s; } else l = n; }
  c.fillText(l, x, y); return y + lh;
}
function pills(c, a, x0, y, mx, col, fs) {
  let x = x0; c.font = font(fs, FONT.mono, '600');
  for (const s of a) {
    const w = c.measureText(s).width + fs * 1.2;
    if (x + w > mx) { x = x0; y += fs * 2; }
    c.strokeStyle = col; c.lineWidth = 2; c.strokeRect(x, y - fs * 1.1, w, fs * 1.6);
    c.fillStyle = col; c.fillText(s, x + fs * .6, y); x += w + fs * .5;
  }
  return y + fs * 2;
}
const bars = c => BARS.forEach((a, i) => { c.fillStyle = i % 2 ? P.sap : P.em; c.fillRect(34 + i * 74, 290 - a * 170, 52, a * 170); });

let _blank;
export const blank = () => _blank ||= tex(8, 8, c => { c.fillStyle = P.paper; c.fillRect(0, 0, 8, 8); });
export const idleScreen = () => tex(512, 320, (c, w, h) => { c.fillStyle = P.screenBg; c.fillRect(0, 0, w, h); bars(c); });

export const phoneTex = () => tex(256, 512, (c, w, h) => {
  c.fillStyle = P.screenBg; c.fillRect(0, 0, w, h);
  c.strokeStyle = P.em; c.lineWidth = 8; c.strokeRect(46, 170, 164, 116);
  c.beginPath(); c.moveTo(46, 170); c.lineTo(128, 240); c.lineTo(210, 170); c.stroke();
});

export const laptopTex = () => { const s = SECTIONS.laptop; return tex(1280, 800, (c, w, h) => {
  c.fillStyle = P.screenBg; c.fillRect(0, 0, w, h); c.fillStyle = P.panel; c.fillRect(0, 0, w, 52);
  P.traffic.forEach((k, i) => { c.fillStyle = k; c.beginPath(); c.arc(30 + i * 26, 26, 8, 0, 7); c.fill(); });
  c.fillStyle = P.mute; c.font = font(20, FONT.mono); c.fillText(s.screen.windowTitle, 130, 33);
  c.fillStyle = P.sidebar; c.fillRect(0, 52, 220, h);
  s.screen.nav.forEach((t, i) => { c.fillStyle = i ? P.mute : P.em; c.font = font(22, FONT.mono); c.fillText((i ? '  ' : '▸ ') + t, 24, 110 + i * 46); });
  c.fillStyle = P.em; c.font = font(20, FONT.mono, '600'); c.fillText(s.kicker.toUpperCase(), 260, 110);
  c.fillStyle = P.text; c.font = font(86, FONT.sans, '700'); c.fillText(s.title, 260, 205);
  c.fillStyle = P.mute; c.font = font(30, FONT.sans); c.fillText(s.lead, 260, 262);
  s.items.forEach((k, i) => {
    const x = 260 + i * 330;
    c.fillStyle = P.panel; c.fillRect(x, 320, 306, 330); c.fillStyle = i % 2 ? P.sap : P.em; c.fillRect(x, 320, 306, 5);
    c.fillStyle = P.text; c.font = font(27, FONT.sans, '700'); const y = wrap(c, k.title, x + 22, 378, 262, 34);
    c.fillStyle = P.mute; c.font = font(23, FONT.sans); wrap(c, k.text, x + 22, y + 16, 262, 32);
  });
  pills(c, s.badges.map(b => b.text), 260, 716, 1260, P.emSoft, 20);
}); };

export const paperTex = () => { const s = SECTIONS.notebook; return tex(900, 1190, (c, w, h) => {
  c.fillStyle = P.paper; c.fillRect(0, 0, w, h);
  c.strokeStyle = P.margin; c.lineWidth = 2; c.beginPath(); c.moveTo(62, 0); c.lineTo(62, h); c.stroke();
  c.fillStyle = P.pine; c.font = font(25, FONT.mono, '600'); c.fillText(s.kicker.toUpperCase(), 96, 96);
  c.font = font(96, FONT.serif, '700'); c.fillStyle = P.ink; c.fillText(PROFILE.first, 96, 210); c.fillStyle = P.pine; c.fillText(PROFILE.last, 96, 308);
  c.fillStyle = P.sub; c.font = font(29, FONT.serif, 'italic'); let y = wrap(c, PROFILE.headline, 96, 366, 720, 38);
  c.fillStyle = P.ink; c.fillRect(96, y, 120, 4); c.font = font(42, FONT.serif, 'italic'); y = wrap(c, s.lead, 96, y + 66, 720, 52);
  c.font = font(27, FONT.sans); c.fillStyle = P.body;
  s.paragraphs.forEach((t, i) => { y = wrap(c, t, 96, y + (i ? 10 : 14), 720, 39); });
  pills(c, s.badges.map(b => b.text), 96, y + 30, 830, P.pine, 22);
}); };

export const pageTex = p => tex(1024, 732, (c, w, h) => {
  c.fillStyle = P.page; c.fillRect(0, 0, w, h); c.fillStyle = P.pine; c.fillRect(0, 0, 18, h);
  c.font = font(26, FONT.mono, '600'); c.fillText(p.eyebrow.toUpperCase(), 80, 100);
  c.fillStyle = P.ink; c.font = font(80, FONT.serif, '700'); let y = wrap(c, p.title, 80, 200, 860, 92);
  c.fillStyle = P.sub; c.font = font(32, FONT.sans); y = wrap(c, p.text, 80, y + 20, 820, 46);
  pills(c, p.tags, 80, y + 34, 960, P.pine, 24);
  c.fillStyle = P.folio; c.font = font(22, FONT.mono); c.fillText(p.folio, w - 130, h - 40);
});
