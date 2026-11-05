// Canvas textures. All text comes from content.js; all colours from config.js.
import THREE from './three.js';
import { SECTIONS, PROFILE } from '../content.js';
import { P, FONT, font, BARS } from '../config.js';

const tex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); return new THREE.CanvasTexture(c); };
const sharp = t => (t.anisotropy = 4, t); // keeps small/oblique text from shimmering
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

export const phoneTex = () => { const s = SECTIONS.phone; return tex(256, 512, (c, w, h) => {
  const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#1a2a3a'); g.addColorStop(1, '#0b1118'); c.fillStyle = g; c.fillRect(0, 0, w, h);
  c.fillStyle = P.text; c.textAlign = 'center'; c.font = font(64, FONT.sans, '300'); c.fillText('09:41', w / 2, 120);
  c.fillStyle = P.mute; c.font = font(15, FONT.mono); c.fillText(s.kicker.toUpperCase(), w / 2, 150);
  c.strokeStyle = P.em; c.lineWidth = 6; c.strokeRect(70, 230, 116, 80); c.beginPath(); c.moveTo(70, 230); c.lineTo(128, 275); c.lineTo(186, 230); c.stroke();
  c.fillStyle = P.text; c.font = font(22, FONT.sans, '600'); c.fillText(s.title, w / 2, 372);
  c.fillStyle = 'rgba(255,255,255,.4)'; c.fillRect(88, h - 26, 80, 5); c.textAlign = 'left';
}); };

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

// Desk-distance laptop screen: same canvas size/aspect as laptopTex but ~2x type, no sidebar or cards, so it stays legible when small.
export const laptopPreviewTex = () => { const s = SECTIONS.laptop; return sharp(tex(1280, 800, (c, w, h) => {
  c.fillStyle = P.screenBg; c.fillRect(0, 0, w, h); c.fillStyle = P.panel; c.fillRect(0, 0, w, 84);
  P.traffic.forEach((k, i) => { c.fillStyle = k; c.beginPath(); c.arc(50 + i * 42, 42, 13, 0, 7); c.fill(); });
  c.fillStyle = P.mute; c.font = font(32, FONT.mono); c.fillText(s.screen.windowTitle, 190, 53);
  c.fillStyle = P.em; c.font = font(36, FONT.mono, '600'); c.fillText(s.kicker.toUpperCase(), 80, 200);
  c.fillStyle = P.text; c.font = font(190, FONT.sans, '700'); c.fillText(s.title, 80, 380);
  c.fillStyle = P.mute; c.font = font(54, FONT.sans); wrap(c, s.lead, 80, 470, 1100, 66);
  c.fillStyle = P.em; c.fillRect(80, 560, 160, 8); c.fillStyle = P.sap; c.fillRect(250, 560, 80, 8);
  pills(c, s.badges.slice(0, 2).map(b => b.text), 80, 690, 1220, P.emSoft, 40);
})); };

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

// Desk-distance notebook page: same canvas as paperTex, name at ~112px and a big lead line; paragraphs/badges are left for the focused view.
export const paperPreviewTex = () => { const s = SECTIONS.notebook; return sharp(tex(900, 1190, (c, w, h) => {
  c.fillStyle = P.paper; c.fillRect(0, 0, w, h);
  c.strokeStyle = P.margin; c.lineWidth = 3; c.beginPath(); c.moveTo(62, 0); c.lineTo(62, h); c.stroke();
  c.fillStyle = P.pine; c.font = font(40, FONT.mono, '600'); c.fillText(s.kicker.toUpperCase(), 96, 150);
  c.font = font(112, FONT.serif, '700'); c.fillStyle = P.ink; c.fillText(PROFILE.first, 96, 330); c.fillStyle = P.pine; c.fillText(PROFILE.last, 96, 456);
  c.fillStyle = P.ink; c.fillRect(96, 520, 160, 8);
  c.fillStyle = P.sub; c.font = font(64, FONT.serif, 'italic'); wrap(c, s.lead, 96, 640, 720, 82);
})); };

export const pageTex = p => tex(1024, 732, (c, w, h) => {
  c.fillStyle = P.page; c.fillRect(0, 0, w, h); c.fillStyle = P.pine; c.fillRect(0, 0, 18, h);
  c.font = font(26, FONT.mono, '600'); c.fillText(p.eyebrow.toUpperCase(), 80, 100);
  c.fillStyle = P.ink; c.font = font(80, FONT.serif, '700'); let y = wrap(c, p.title, 80, 200, 860, 92);
  c.fillStyle = P.sub; c.font = font(32, FONT.sans); y = wrap(c, p.text, 80, y + 20, 820, 46);
  pills(c, p.tags, 80, y + 34, 960, P.pine, 24);
  c.fillStyle = P.folio; c.font = font(22, FONT.mono); c.fillText(p.folio, w - 130, h - 40);
});

// Desk-distance cover page for the folders flip-book (page 0 only): big title + eyebrow + tag, no body copy.
export const pagePreviewTex = p => sharp(tex(1024, 732, (c, w, h) => {
  c.fillStyle = P.page; c.fillRect(0, 0, w, h); c.fillStyle = P.pine; c.fillRect(0, 0, 28, h);
  c.fillStyle = P.pine; c.font = font(44, FONT.mono, '600'); c.fillText(p.eyebrow.toUpperCase(), 90, 150);
  c.fillStyle = P.ink; c.font = font(200, FONT.serif, '700'); c.fillText(p.title, 90, 380);
  c.fillStyle = P.ink; c.fillRect(90, 440, 160, 8);
  pills(c, p.tags, 90, 560, 980, P.pine, 40);
}));

// Procedural oak: 4 planks, wavy grain lines, occasional knots. Seeded so it's identical every load.
export const woodTex = () => { let s = 7; const rnd = () => (s = s * 16807 % 2147483647) / 2147483647;
  const t = tex(1024, 512, (c, w, h) => {
    const cols = ['#8a5a36', '#7b4d2c', '#935f39', '#84552f'], ph = h / cols.length;
    cols.forEach((col, i) => {
      const y0 = i * ph; c.fillStyle = col; c.fillRect(0, y0, w, ph);
      for (let k = 0; k < 46; k++) {
        const y = y0 + rnd() * ph, a = .05 + rnd() * .12, amp = 1 + rnd() * 3, f = .004 + rnd() * .01, p0 = rnd() * 6;
        c.strokeStyle = rnd() > .5 ? `rgba(40,20,8,${a})` : `rgba(255,220,170,${a * .6})`; c.lineWidth = .6 + rnd() * 1.4; c.beginPath();
        for (let x = 0; x <= w; x += 16) c.lineTo(x, y + Math.sin(x * f + p0) * amp); c.stroke();
      }
      if (rnd() > .4) { const kx = rnd() * w; for (let r = 3; r > 0; r--) { c.strokeStyle = `rgba(40,20,8,${.12 * r / 3})`; c.lineWidth = 2; c.beginPath(); c.ellipse(kx, y0 + ph / 2, r * 14, r * 5, 0, 0, 7); c.stroke(); } }
      c.fillStyle = 'rgba(30,14,6,.55)'; c.fillRect(0, y0, w, 2); // plank seam
    });
  }); t.anisotropy = 4; return t; };

export const keyboardTex = () => tex(1120, 600, (c, w, h) => {
  c.fillStyle = '#2a3038'; c.fillRect(0, 0, w, h); c.fillStyle = '#11151a';
  for (let r = 0; r < 5; r++) for (let k = 0; k < 14; k++) c.fillRect(40 + k * 74, 36 + r * 66, 66, 56);
  c.fillStyle = '#232a33'; c.fillRect(380, 392, 360, 180); c.strokeStyle = '#3a424d'; c.lineWidth = 3; c.strokeRect(380, 392, 360, 180);
});