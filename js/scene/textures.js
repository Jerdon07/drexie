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
// Shrinks `size` until `t` fits in `w`, leaves c.font set to the result.
function fit(c, t, w, size, family, style = '') {
  let s = size; c.font = font(s, family, style);
  while (c.measureText(t).width > w && s > 12) c.font = font(s -= 2, family, style);
  return s;
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

// Book spine for the notebooks shelf. Mapped to a thin upright face (w:h = 1:4), label reads bottom-to-top like a real spine.
// `muted` greys out entries that are still TODO in content.js.
export const spineTex = (label, col, muted) => sharp(tex(96, 384, (c, w, h) => {
  c.fillStyle = col; c.fillRect(0, 0, w, h);
  c.fillStyle = 'rgba(255,255,255,.22)'; c.fillRect(0, 28, w, 4); c.fillRect(0, h - 32, w, 4); // head/tail bands
  c.save(); c.translate(w / 2, h / 2); c.rotate(-Math.PI / 2);
  c.fillStyle = muted ? 'rgba(255,255,255,.5)' : P.paper; c.textAlign = 'center'; c.textBaseline = 'middle';
  fit(c, label, h - 100, 40, FONT.serif, '700'); c.fillText(label, 0, 0); c.restore();
}));

/* ---- School ID (CR80, portrait) + lanyard ribbon. University of the Cordilleras' school colour is forest green; the mark below is
   an original generic emblem (mountains + sun), NOT the university's seal. ---- */
const UC = { green: '#14633d', dark: '#0c3f27', deep: '#0a2d1c', lite: '#1b7a4b', gold: '#c9a227', cream: '#f4efe3', mint: '#b9e4cf', ink: '#10301f' };
const ID_W = 864, ID_H = 1370; // 53.98 : 85.60 (CR80); keep in sync with CARD in js/idcard.js
const spaced = (c, s, cx, y, gap) => { // canvas letter-spacing without relying on c.letterSpacing
  const ws = [...s].map(ch => c.measureText(ch).width), total = ws.reduce((a, b) => a + b, 0) + gap * (ws.length - 1);
  let x = cx - total / 2; [...s].forEach((ch, i) => { c.fillText(ch, x, y); x += ws[i] + gap; });
};
const guilloche = (c, w, h, a) => { c.strokeStyle = `rgba(20,99,61,${a})`; c.lineWidth = 2; for (let x = -h; x < w; x += 18) { c.beginPath(); c.moveTo(x, h); c.lineTo(x + h, 0); c.stroke(); } };
const emblem = (c, cx, cy, r) => {
  c.save(); c.beginPath(); c.arc(cx, cy, r, 0, 7); c.clip();
  const g = c.createLinearGradient(0, cy - r, 0, cy + r); g.addColorStop(0, UC.lite); g.addColorStop(1, UC.deep); c.fillStyle = g; c.fillRect(cx - r, cy - r, r * 2, r * 2);
  c.fillStyle = UC.gold; c.beginPath(); c.arc(cx + r * .3, cy - r * .35, r * .17, 0, 7); c.fill();
  c.fillStyle = UC.cream; c.beginPath(); c.moveTo(cx - r, cy + r * .6); c.lineTo(cx - r * .45, cy - r * .1); c.lineTo(cx - r * .15, cy + r * .25); c.lineTo(cx + r * .25, cy - r * .35); c.lineTo(cx + r, cy + r * .6); c.closePath(); c.fill();
  c.restore(); c.strokeStyle = UC.cream; c.lineWidth = 6; c.beginPath(); c.arc(cx, cy, r + 8, 0, 7); c.stroke();
  c.strokeStyle = UC.gold; c.lineWidth = 3; c.beginPath(); c.arc(cx, cy, r + 18, 0, 7); c.stroke();
};

// `photo` = the profile portrait canvas (images.js). t.redraw() repaints after the real file loads.
export const idFrontTex = photo => {
  const draw = (c, w, h) => {
    c.fillStyle = '#fbfbf7'; c.fillRect(0, 0, w, h); guilloche(c, w, h, .06);
    const hg = c.createLinearGradient(0, 0, w, 340); hg.addColorStop(0, '#0a3a24'); hg.addColorStop(1, UC.lite); c.fillStyle = hg; c.fillRect(0, 0, w, 330); // header (the slot punches through its top)
    c.fillStyle = UC.gold; c.fillRect(0, 330, w, 8); c.fillStyle = 'rgba(20,99,61,.55)'; c.fillRect(0, 346, w, 3);
    emblem(c, 140, 196, 66);
    c.textAlign = 'left'; c.fillStyle = UC.cream; c.font = font(40, FONT.serif, '700'); c.fillText('UNIVERSITY OF THE', 250, 182);
    fit(c, 'CORDILLERAS', 570, 72, FONT.serif, '700'); c.fillText('CORDILLERAS', 250, 256);
    c.fillStyle = UC.mint; c.font = font(24, FONT.mono, '600'); c.fillText('BAGUIO CITY · PHILIPPINES', 252, 300);
    c.fillStyle = UC.gold; c.fillRect(204, 372, 456, 566); c.fillStyle = UC.green; c.fillRect(208, 376, 448, 558); c.drawImage(photo, 212, 380, 440, 550); // existing profile photo
    c.textAlign = 'center'; c.fillStyle = UC.ink; fit(c, PROFILE.first.toUpperCase(), 760, 64, FONT.sans, '700'); c.fillText(PROFILE.first.toUpperCase(), w / 2, 1010);
    c.fillStyle = UC.green; fit(c, PROFILE.last.toUpperCase(), 760, 104, FONT.serif, '700'); c.fillText(PROFILE.last.toUpperCase(), w / 2, 1108);
    c.fillStyle = UC.gold; c.fillRect(w / 2 - 90, 1136, 180, 5);
    c.fillStyle = '#4a5663'; c.font = font(32, FONT.mono, '600'); c.fillText(PROFILE.program.toUpperCase(), w / 2, 1190);
    const bg = c.createLinearGradient(0, 1250, w, 1370); bg.addColorStop(0, '#0a3a24'); bg.addColorStop(1, UC.lite); c.fillStyle = bg; c.fillRect(0, 1256, w, 114);
    c.fillStyle = UC.gold; c.fillRect(0, 1250, w, 6);
    c.fillStyle = UC.cream; c.font = font(42, FONT.mono, '700'); spaced(c, 'STUDENT', w / 2 - 70, 1330, 14);
    c.save(); c.beginPath(); c.arc(736, 1196, 52, 0, 7); c.clip(); // security-hologram patch
    const hl = c.createLinearGradient(684, 1144, 788, 1248); ['#ff6ec7', '#ffe36e', '#6effb0', '#6ec7ff', '#b06eff'].forEach((k, i) => hl.addColorStop(i / 4, k));
    c.globalAlpha = .6; c.fillStyle = hl; c.fillRect(684, 1144, 104, 104); c.globalAlpha = .5; c.strokeStyle = '#fff'; c.lineWidth = 2;
    for (let r = 10; r < 56; r += 9) { c.beginPath(); c.arc(736, 1196, r, 0, 7); c.stroke(); } c.restore(); c.globalAlpha = 1;
  };
  const t = tex(ID_W, ID_H, draw); t.anisotropy = 8; t.redraw = () => { draw(t.image.getContext('2d'), ID_W, ID_H); t.needsUpdate = true; }; return t;
};

export const idBackTex = () => { const t = tex(ID_W, ID_H, (c, w, h) => {
  c.fillStyle = '#f2f2ec'; c.fillRect(0, 0, w, h); guilloche(c, w, h, .05);
  c.fillStyle = UC.green; c.fillRect(0, 0, w, 150); c.fillStyle = UC.gold; c.fillRect(0, 150, w, 6);
  const ms = c.createLinearGradient(0, 190, 0, 360); ms.addColorStop(0, '#2a2d31'); ms.addColorStop(.5, '#0a0b0d'); ms.addColorStop(1, '#1b1d20'); c.fillStyle = ms; c.fillRect(0, 190, w, 170); // magnetic-stripe look
  c.fillStyle = '#fff'; c.fillRect(70, 420, 724, 150); c.strokeStyle = UC.green; c.lineWidth = 3; c.strokeRect(70, 420, 724, 150);
  c.fillStyle = 'rgba(20,99,61,.16)'; c.font = font(18, FONT.mono, '600'); for (let y = 446; y < 566; y += 26) for (let x = 78 - (y % 52); x < 790; x += 250) c.fillText('UNIVERSITY OF THE CORDILLERAS', x, y);
  c.fillStyle = '#4a5663'; c.font = font(20, FONT.mono, '600'); c.textAlign = 'left'; c.fillText('AUTHORIZED SIGNATURE', 72, 606);
  c.fillStyle = '#33403a'; c.font = font(28, FONT.sans); wrap(c, 'This card is the property of the University of the Cordilleras and is not transferable. If found, please return it to the university.', 70, 690, 724, 40);
  let s = 0; for (const ch of `${PROFILE.first}${PROFILE.last}`) s = (s * 31 + ch.charCodeAt(0)) >>> 0; // decorative barcode seeded from the name (not a real ID number)
  const rnd = () => (s = s * 16807 % 2147483647) / 2147483647; c.fillStyle = '#0a0b0d'; let x = 120;
  while (x < 740) { const bw = 2 + Math.floor(rnd() * 5), gap = 2 + Math.floor(rnd() * 4); c.fillRect(x, 960, bw, 170); x += bw + gap; }
  c.fillStyle = '#4a5663'; c.font = font(22, FONT.mono, '600'); c.textAlign = 'center'; c.fillText(`${PROFILE.first} ${PROFILE.last}`.toUpperCase(), w / 2, 1170);
  const bg = c.createLinearGradient(0, 1256, w, 1370); bg.addColorStop(0, '#0a3a24'); bg.addColorStop(1, UC.lite); c.fillStyle = bg; c.fillRect(0, 1256, w, 114); c.fillStyle = UC.gold; c.fillRect(0, 1250, w, 6);
  c.fillStyle = UC.cream; fit(c, 'UNIVERSITY OF THE CORDILLERAS', 760, 36, FONT.serif, '700'); c.fillText('UNIVERSITY OF THE CORDILLERAS', w / 2, 1326);
}); t.anisotropy = 8; return t; };

// Woven ribbon. Colour map and bump map share one canvas size so they stay registered; both repeat down the strap.
const RW = 256, RH = 1280; // one repeat = 1280/256 × strap width ≈ 105 mm of strap
export const RIBBON = { w: RW, h: RH };
let _weave;
const weaveCanvas = () => _weave ||= (() => { // 2/2 twill at ~0.3 mm per thread
  const cv = document.createElement('canvas'); cv.width = RW; cv.height = RH;
  const g = cv.getContext('2d'), im = g.createImageData(RW, RH), px = im.data;
  for (let y = 0; y < RH; y++) for (let x = 0; x < RW; x++) { const k = (y * RW + x) * 4, v = ((x + (y >> 1)) & 3) < 2 ? 150 : 108; px[k] = px[k + 1] = px[k + 2] = v + ((x * 7 + y * 13) & 7); px[k + 3] = 255; }
  g.putImageData(im, 0, 0); return cv;
})();
export const weaveTex = () => { const t = new THREE.CanvasTexture(weaveCanvas()); t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t; };
export const ribbonTex = () => { const t = tex(RW, RH, (c, w, h) => {
  c.fillStyle = UC.green; c.fillRect(0, 0, w, h);
  c.globalCompositeOperation = 'overlay'; c.globalAlpha = .55; c.drawImage(weaveCanvas(), 0, 0); c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1; // thread shading
  c.fillStyle = UC.dark; c.fillRect(0, 0, 14, h); c.fillRect(w - 14, 0, 14, h); // selvedge
  [[44, 5, UC.cream], [54, 3, UC.gold], [w - 54, 3, UC.gold], [w - 44, 5, UC.cream]].forEach(([x, lw, col]) => { c.fillStyle = col; c.fillRect(x - lw / 2, 0, lw, h); });
  c.strokeStyle = UC.mint; c.lineWidth = 3; c.setLineDash([18, 12]); [28, w - 28].forEach(x => { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); }); c.setLineDash([]); // edge stitching
  c.save(); c.translate(w / 2, 0); c.rotate(Math.PI / 2); // print reads down the strap
  const label = 'UNIVERSITY OF THE CORDILLERAS';
  c.textBaseline = 'middle'; c.textAlign = 'left'; c.fillStyle = UC.cream; fit(c, label, 880, 46, FONT.sans, '700'); c.fillText(label, 96, 0);
  c.fillStyle = UC.gold; [48, 1010].forEach(x => { c.beginPath(); c.moveTo(x, -13); c.lineTo(x + 11, 0); c.lineTo(x, 13); c.lineTo(x - 11, 0); c.fill(); });
  c.beginPath(); c.moveTo(1082, 22); c.lineTo(1116, -22); c.lineTo(1140, 4); c.lineTo(1170, -28); c.lineTo(1226, 22); c.closePath(); c.fill(); // mountain mark
  c.fillStyle = UC.cream; c.beginPath(); c.arc(1190, -20, 6, 0, 7); c.fill();
  c.restore();
}); t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t; };

export const phoneTex = () => { const s = SECTIONS.phone; return tex(256, 512, (c, w, h) => {
  const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#1a2a3a'); g.addColorStop(1, '#0b1118'); c.fillStyle = g; c.fillRect(0, 0, w, h);
  c.fillStyle = P.text; c.textAlign = 'center'; c.font = font(64, FONT.sans, '300'); c.fillText('09:41', w / 2, 120);
  c.fillStyle = P.mute; c.font = font(15, FONT.mono); c.fillText(s.kicker.toUpperCase(), w / 2, 150);
  c.textAlign = 'left';
  s.contacts.slice(0, 4).forEach((k, i) => { // one row per contact: accent bar, label, value
    const y = 184 + i * 62;
    c.fillStyle = 'rgba(255,255,255,.07)'; c.fillRect(24, y, 208, 52); c.fillStyle = i % 2 ? P.sap : P.em; c.fillRect(24, y, 5, 52);
    c.fillStyle = P.text; c.font = font(19, FONT.sans, '600'); c.fillText(k.label, 42, y + 22);
    c.fillStyle = P.mute; fit(c, k.value, 180, 14, FONT.mono); c.fillText(k.value, 42, y + 42);
  });
  c.fillStyle = P.text; c.textAlign = 'center'; c.font = font(22, FONT.sans, '600'); c.fillText(s.title, w / 2, 468);
  c.fillStyle = 'rgba(255,255,255,.4)'; c.fillRect(88, h - 26, 80, 5); c.textAlign = 'left';
}); };

export const laptopTex = () => { const s = SECTIONS.laptop; return tex(1280, 800, (c, w, h) => {
  c.fillStyle = P.screenBg; c.fillRect(0, 0, w, h); c.fillStyle = P.panel; c.fillRect(0, 0, w, 52);
  P.traffic.forEach((k, i) => { c.fillStyle = k; c.beginPath(); c.arc(30 + i * 26, 26, 8, 0, 7); c.fill(); });
  c.fillStyle = P.mute; c.font = font(20, FONT.mono); c.fillText(s.screen.windowTitle, 130, 33);
  c.fillStyle = P.sidebar; c.fillRect(0, 52, 220, h);
  s.screen.nav.forEach((t, i) => { c.fillStyle = i ? P.mute : P.em; c.font = font(22, FONT.mono); c.fillText((i ? '  ' : '▸ ') + t, 24, 110 + i * 46); });
  c.fillStyle = P.em; c.font = font(20, FONT.mono, '600'); c.fillText(s.kicker.toUpperCase(), 260, 110);
  c.fillStyle = P.text; fit(c, s.title, 960, 86, FONT.sans, '700'); c.fillText(s.title, 260, 205);
  c.fillStyle = P.mute; c.font = font(30, FONT.sans); c.fillText(s.lead, 260, 262);
  s.fields.forEach(([k, v], i) => { // 2 × 4 grid of label/value cards
    const x = 260 + (i % 2) * 495, y = 300 + (i >> 1) * 96;
    c.fillStyle = P.panel; c.fillRect(x, y, 475, 84); c.fillStyle = (i >> 1) % 2 ? P.sap : P.em; c.fillRect(x, y, 5, 84);
    c.fillStyle = P.mute; c.font = font(16, FONT.mono, '600'); c.fillText(k.toUpperCase(), x + 24, y + 30);
    c.fillStyle = P.text; fit(c, v, 430, 28, FONT.sans, '600'); c.fillText(v, x + 24, y + 64);
  });
  pills(c, s.badges.map(b => b.text), 260, 716, 1260, P.emSoft, 20);
}); };

// Desk-distance laptop screen: same canvas size/aspect as laptopTex but ~2x type, no sidebar or cards, so it stays legible when small.
export const laptopPreviewTex = () => { const s = SECTIONS.laptop; return sharp(tex(1280, 800, (c, w, h) => {
  c.fillStyle = P.screenBg; c.fillRect(0, 0, w, h); c.fillStyle = P.panel; c.fillRect(0, 0, w, 84);
  P.traffic.forEach((k, i) => { c.fillStyle = k; c.beginPath(); c.arc(50 + i * 42, 42, 13, 0, 7); c.fill(); });
  c.fillStyle = P.mute; c.font = font(32, FONT.mono); c.fillText(s.screen.windowTitle, 190, 53);
  c.fillStyle = P.em; c.font = font(36, FONT.mono, '600'); c.fillText(s.kicker.toUpperCase(), 80, 200);
  c.fillStyle = P.text; fit(c, s.title, 1120, 190, FONT.sans, '700'); c.fillText(s.title, 80, 380);
  c.fillStyle = P.mute; c.font = font(54, FONT.sans); wrap(c, s.lead, 80, 470, 1100, 66);
  c.fillStyle = P.em; c.fillRect(80, 560, 160, 8); c.fillStyle = P.sap; c.fillRect(250, 560, 80, 8);
  pills(c, s.badges.slice(0, 2).map(b => b.text), 80, 690, 1220, P.emSoft, 40);
})); };

export const pageTex = p => tex(1024, 732, (c, w, h) => {
  c.fillStyle = P.page; c.fillRect(0, 0, w, h); c.fillStyle = P.pine; c.fillRect(0, 0, 18, h);
  c.font = font(26, FONT.mono, '600'); c.fillText(p.eyebrow.toUpperCase(), 80, p.rows ? 76 : 100);
  if (p.rows) p.rows.forEach((r, i) => { // achievement cards: number, year · category, title, one-liner
    const y = 106 + i * 190;
    c.fillStyle = 'rgba(29,37,48,.06)'; c.fillRect(60, y, 904, 172); c.fillStyle = P.pine; c.fillRect(60, y, 8, 172);
    c.fillStyle = P.folio; c.font = font(64, FONT.serif, '700'); c.fillText(String(r.n).padStart(2, '0'), 96, y + 100);
    c.fillStyle = P.pine; c.font = font(22, FONT.mono, '600'); c.fillText(`${r.year} · ${r.tag}`.toUpperCase(), 196, y + 44);
    c.fillStyle = P.ink; fit(c, r.title, 740, 38, FONT.serif, '700'); c.fillText(r.title, 196, y + 92);
    c.fillStyle = P.sub; c.font = font(24, FONT.sans); wrap(c, r.text, 196, y + 128, 740, 30);
  });
  else {
    c.fillStyle = P.ink; c.font = font(80, FONT.serif, '700'); let y = wrap(c, p.title, 80, 200, 860, 92);
    c.fillStyle = P.sub; c.font = font(32, FONT.sans); y = wrap(c, p.text, 80, y + 20, 820, 46);
    pills(c, p.tags, 80, y + 34, 960, P.pine, 24);
  }
  c.fillStyle = P.folio; c.font = font(22, FONT.mono); c.fillText(p.folio, w - 130, h - 40);
});

// Desk-distance cover page for the folders flip-book (page 0 only): big title + eyebrow + tag, no body copy.
export const pagePreviewTex = p => sharp(tex(1024, 732, (c, w, h) => {
  c.fillStyle = P.page; c.fillRect(0, 0, w, h); c.fillStyle = P.pine; c.fillRect(0, 0, 28, h);
  c.fillStyle = P.pine; c.font = font(44, FONT.mono, '600'); c.fillText(p.eyebrow.toUpperCase(), 90, 150);
  c.fillStyle = P.ink; fit(c, p.title, 860, 200, FONT.serif, '700'); c.fillText(p.title, 90, 380);
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