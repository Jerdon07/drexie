// Canvas textures. All text comes from content.js; all colours from config.js.
import { hex, rgba } from '../colors.js';
import THREE from './three.js';
import { SECTIONS, PROFILE, BOOK_PAGES, EDU_PAGES } from '../content.js';
import { P, FONT, font, BARS, SHEET, EDU_BOOK } from '../config.js';
import { portraitCanvas, loadPortrait } from '../images.js';

const tex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); return new THREE.CanvasTexture(c); };
const sharp = t => (t.anisotropy = 4, t); // keeps small/oblique text from shimmering
function wrap(c, t, x, y, w, lh, max = 1e9) { // `max` caps the line count and ellipsizes the last line
  const lines = []; let l = '';
  for (const s of t.split(' ')) { const n = l ? l + ' ' + s : s; if (l && c.measureText(n).width > w) { lines.push(l); l = s; } else l = n; }
  lines.push(l);
  if (lines.length > max) { lines.length = max; let e = lines[max - 1] + '…'; while (e.length > 1 && c.measureText(e).width > w) e = e.slice(0, -2) + '…'; lines[max - 1] = e; }
  lines.forEach((s, k) => c.fillText(s, x, y + k * lh)); return y + lines.length * lh;
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

/* ---- School ID (CR80, portrait) + lanyard ribbon. University of the Cordilleras' school colour is forest green. The ID's logo is the
   real file images/uc.png; until it loads (or if it is missing) the generated emblem below (mountains + sun, NOT the university's seal) stands in. ---- */
const UC = { green: '#14633d', dark: '#0c3f27', deep: '#0a2d1c', lite: '#1b7a4b', gold: '#c9a227', cream: '#f4efe3', mint: '#b9e4cf', ink: '#10301f' };
const ID_W = 864, ID_H = 1370; // 53.98 : 85.60 (CR80); keep in sync with CARD in js/idcard.js
export const ID_PHOTO = { w: 592, h: 740 }; // portrait area on the card (4:5). idcard.js sizes its source canvas from this, so they can't drift apart.
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
// The real logo, letterboxed (never cropped or stretched) into a size × size box centred on (cx, cy).
const logoImg = (c, img, cx, cy, size) => {
  const k = Math.min(size / img.width, size / img.height), w = img.width * k, h = img.height * k;
  c.imageSmoothingQuality = 'high'; c.drawImage(img, cx - w / 2, cy - h / 2, w, h);
};

// `photo` = the profile portrait canvas (images.js). t.redraw() repaints after the real file loads.
// `onLogo` runs once images/uc.png has been drawn in: the ID overlay's render loop sleeps when idle, so the owner must wake it.
export const idFrontTex = (photo, onLogo) => {
  let logo = null; // images/uc.png once loaded
  const draw = (c, w, h) => {
    c.fillStyle = '#fbfbf7'; c.fillRect(0, 0, w, h); guilloche(c, w, h, .06);
    const hg = c.createLinearGradient(0, 0, w, 340); hg.addColorStop(0, '#0a3a24'); hg.addColorStop(1, UC.lite); c.fillStyle = hg; c.fillRect(0, 0, w, 330); // header (the slot punches through its top)
    c.fillStyle = UC.gold; c.fillRect(0, 330, w, 8); c.fillStyle = 'rgba(20,99,61,.55)'; c.fillRect(0, 346, w, 3);
    logo ? logoImg(c, logo, 140, 196, 168) : emblem(c, 140, 196, 66); // 168 = the emblem's outer ring diameter, so the layout is unchanged
    c.textAlign = 'left'; c.fillStyle = UC.cream; c.font = font(40, FONT.serif, '700'); c.fillText('UNIVERSITY OF THE', 250, 182);
    fit(c, 'CORDILLERAS', 570, 72, FONT.serif, '700'); c.fillText('CORDILLERAS', 250, 256);
    c.fillStyle = UC.mint; c.font = font(24, FONT.mono, '600'); c.fillText('BAGUIO CITY · PHILIPPINES', 252, 300);
    // Portrait fills the space the name used to take (the name is already in the page header). 4px gold frame + 4px green rim around it.
    const px = (w - ID_PHOTO.w) / 2, py = 382;
    c.fillStyle = UC.gold; c.fillRect(px - 8, py - 8, ID_PHOTO.w + 16, ID_PHOTO.h + 16); c.fillStyle = UC.green; c.fillRect(px - 4, py - 4, ID_PHOTO.w + 8, ID_PHOTO.h + 8); c.drawImage(photo, px, py, ID_PHOTO.w, ID_PHOTO.h);
    c.fillStyle = UC.gold; c.fillRect(w / 2 - 90, 1148, 180, 4);
    c.textAlign = 'center'; c.fillStyle = '#4a5663'; c.font = font(32, FONT.mono, '600'); c.fillText(PROFILE.program.toUpperCase(), w / 2, 1204);
    const bg = c.createLinearGradient(0, 1250, w, 1370); bg.addColorStop(0, '#0a3a24'); bg.addColorStop(1, UC.lite); c.fillStyle = bg; c.fillRect(0, 1256, w, 114);
    c.fillStyle = UC.gold; c.fillRect(0, 1250, w, 6);
    c.fillStyle = UC.cream; c.font = font(42, FONT.mono, '700'); spaced(c, 'STUDENT', w / 2 - 70, 1330, 14);
  };
  const t = tex(ID_W, ID_H, draw); t.anisotropy = 8; t.redraw = () => { draw(t.image.getContext('2d'), ID_W, ID_H); t.needsUpdate = true; };
  loadPortrait('uc').then(img => { if (img) { logo = img; t.redraw(); onLogo?.(); } }); // real file wins; null (missing) keeps the generated emblem
  return t;
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
  const bg = c.createLinearGradient(0, 1256, w, 1370); bg.addColorStop(0, '#0a3a24'); bg.addColorStop(1, UC.lite); c.fillStyle = bg; c.fillRect(0, 1256, w, 114); c.fillStyle = UC.gold; c.fillRect(0, 1250, w, 6);
  c.textAlign = 'center'; c.fillStyle = UC.cream; fit(c, 'UNIVERSITY OF THE CORDILLERAS', 760, 36, FONT.serif, '700'); c.fillText('UNIVERSITY OF THE CORDILLERAS', w / 2, 1326);
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

/* ---- Phone. Focused: a real "contacts" screen (header + tappable rows). Desk distance: a lock screen with a big clock. ----
   PHONE is shared with objects/phone.js so the hit-test and the drawing use the SAME row rectangles (canvas px). */
export const PHONE = { w: 540, h: 1156, rows: 4, row: i => ({ x: 34, y: 508 + i * 150, w: 472, h: 126 }) }; // aspect = the .7 x 1.5 screen
const rr = (c, x, y, w, h, r) => { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); };
const wallpaper = (c, w, h) => { const g = c.createLinearGradient(0, 0, w * .6, h); g.addColorStop(0, hex('--phone-a')); g.addColorStop(.55, hex('--phone-b')); g.addColorStop(1, hex('--phone-c')); c.fillStyle = g; c.fillRect(0, 0, w, h); };
function statusBar(c, w) {
  c.fillStyle = P.text; c.textAlign = 'left'; c.textBaseline = 'alphabetic'; c.font = font(30, FONT.sans, '600'); c.fillText('9:41', 40, 58);
  c.beginPath(); c.arc(w / 2, 40, 12, 0, 7); c.fillStyle = '#04070a'; c.fill(); // front camera
  c.fillStyle = P.text; for (let i = 0; i < 4; i++) c.fillRect(w - 196 + i * 14, 56 - (i + 1) * 8, 9, (i + 1) * 8); // signal
  c.strokeStyle = P.text; c.lineWidth = 3; rr(c, w - 120, 32, 56, 26, 8); c.stroke(); rr(c, w - 115, 37, 40, 16, 4); c.fill(); c.fillRect(w - 61, 40, 5, 10); // battery
}
const homeBar = (c, w, h) => { c.fillStyle = 'rgba(255,255,255,.42)'; rr(c, w / 2 - 84, h - 34, 168, 9, 4.5); c.fill(); };

export const phoneTex = () => { // focused: t.redraw(hoverRow) repaints with that row highlighted
  const s = SECTIONS.phone, A = s.accent, { w, h } = PHONE, cv = Object.assign(document.createElement('canvas'), { width: w, height: h }), c = cv.getContext('2d');
  const t = sharp(new THREE.CanvasTexture(cv)); let hov = -1;
  t.redraw = (row = hov) => {
    hov = row; wallpaper(c, w, h); statusBar(c, w);
    c.textAlign = 'left'; c.textBaseline = 'alphabetic';
    c.fillStyle = A; c.font = font(24, FONT.mono, '600'); c.fillText(s.kicker.toUpperCase(), 44, 190);
    c.fillStyle = P.text; fit(c, s.title, w - 88, 72, FONT.sans, '700'); c.fillText(s.title, 44, 268);
    c.fillStyle = P.mute; c.font = font(28, FONT.sans); wrap(c, s.lead, 44, 328, w - 88, 38);
    const list = s.contacts.slice(0, PHONE.rows);
    list.forEach((k, i) => {
      const r = PHONE.row(i), on = i === hov;
      rr(c, r.x, r.y, r.w, r.h, 30); c.fillStyle = on ? 'rgba(255,255,255,.16)' : 'rgba(255,255,255,.07)'; c.fill();
      if (on) { c.strokeStyle = A; c.lineWidth = 3; c.stroke(); }
      c.fillStyle = A; c.beginPath(); c.arc(r.x + 66, r.y + r.h / 2, 40, 0, 7); c.fill(); // app-icon disc
      c.fillStyle = P.screenBg; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = font(k.icon?.length > 1 ? 30 : 38, FONT.sans, '800'); c.fillText(k.icon || k.label[0], r.x + 66, r.y + r.h / 2 + 2);
      c.textAlign = 'left'; c.textBaseline = 'alphabetic';
      c.fillStyle = P.text; c.font = font(32, FONT.sans, '600'); c.fillText(k.label, r.x + 126, r.y + 54);
      c.fillStyle = P.mute; fit(c, k.value, r.w - 126 - 64, 25, FONT.mono); c.fillText(k.value, r.x + 126, r.y + 92);
      c.strokeStyle = on ? A : 'rgba(255,255,255,.4)'; c.lineWidth = 5; c.lineCap = 'round'; c.beginPath(); c.moveTo(r.x + r.w - 46, r.y + 46); c.lineTo(r.x + r.w - 32, r.y + 63); c.lineTo(r.x + r.w - 46, r.y + 80); c.stroke();
    });
    const last = PHONE.row(Math.max(0, list.length - 1)); c.fillStyle = 'rgba(255,255,255,.4)'; c.font = font(22, FONT.mono); c.textAlign = 'center'; c.fillText('Tap a contact to open', w / 2, last.y + last.h + 54); c.textAlign = 'left';
    homeBar(c, w, h); t.needsUpdate = true;
  };
  t.redraw(); return t;
};

// Desk-distance lock screen: the phone is ~60 px wide at home, so only a huge clock and a short title stay legible.
export const phonePreviewTex = () => { const s = SECTIONS.phone; return sharp(tex(PHONE.w, PHONE.h, (c, w, h) => {
  wallpaper(c, w, h); statusBar(c, w); c.textAlign = 'center';
  c.fillStyle = P.text; c.font = font(210, FONT.sans, '300'); c.fillText('9:41', w / 2, 420);
  c.fillStyle = s.accent; c.font = font(34, FONT.mono, '600'); c.fillText(s.kicker.toUpperCase(), w / 2, 500);
  c.fillStyle = P.text; fit(c, s.title, w - 80, 76, FONT.sans, '700'); c.fillText(s.title, w / 2, 640);
  s.contacts.slice(0, PHONE.rows).forEach((k, i, a) => { c.fillStyle = s.accent; c.beginPath(); c.arc(w / 2 + (i - (a.length - 1) / 2) * 90, 760, 30, 0, 7); c.fill(); }); // one dot per contact
  homeBar(c, w, h);
})); };

// Laptop screen. Left: identity sidebar (avatar, name, headline, contact). Right: grouped cards + hobby/skill pills. All text from content.js.
const initials = () => PROFILE.first[0] + PROFILE.last[0];
function avatar(c, cx, cy, r) { // gradient disc with initials (a photo would need an async repaint; the ID card already carries the photo)
  const g = c.createLinearGradient(cx - r, cy - r, cx + r, cy + r); g.addColorStop(0, P.em); g.addColorStop(1, P.sap);
  c.fillStyle = g; c.beginPath(); c.arc(cx, cy, r, 0, 7); c.fill();
  c.fillStyle = P.screenBg; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = font(r * .85, FONT.sans, '700'); c.fillText(initials(), cx, cy + r * .04);
  c.textAlign = 'left'; c.textBaseline = 'alphabetic';
}
export const laptopTex = () => { const s = SECTIONS.laptop, A = s.accent, flat = f => Object.fromEntries(f); return tex(1280, 800, (c, w, h) => {
  c.fillStyle = P.screenBg; c.fillRect(0, 0, w, h); c.fillStyle = P.panel; c.fillRect(0, 0, w, 52);
  P.traffic.forEach((k, i) => { c.fillStyle = k; c.beginPath(); c.arc(30 + i * 26, 26, 8, 0, 7); c.fill(); });
  c.fillStyle = P.mute; c.font = font(20, FONT.mono); c.fillText(s.screen.windowTitle, 130, 33);

  // sidebar
  const SW = 360, cx = SW / 2; c.fillStyle = P.sidebar; c.fillRect(0, 52, SW, h);
  avatar(c, cx, 168, 66);
  c.textAlign = 'center'; c.fillStyle = P.text; c.font = font(30, FONT.sans, '700'); let y = wrap(c, s.name, cx, 282, SW - 60, 36);
  c.fillStyle = P.mute; c.font = font(17, FONT.sans); y = wrap(c, PROFILE.headline, cx, y + 4, SW - 70, 24);
  c.fillStyle = 'rgba(255,255,255,.1)'; c.fillRect(40, y + 4, SW - 80, 2);
  c.textAlign = 'left'; y += 40;
  s.groups.find(g => g.title === 'Contact').fields.forEach(([k, v], i) => {
    c.fillStyle = P.em; c.font = font(13, FONT.mono, '600'); c.fillText(k.toUpperCase(), 36, y);
    c.fillStyle = P.text; fit(c, v, SW - 72, 20, FONT.sans, '600'); c.fillText(v, 36, y + 26); y += 62;
  });

  // main: section label + cards
  const X0 = SW + 44, XW = w - X0 - 44, GAP = 14, label = (t, yy) => { c.fillStyle = P.mute; c.font = font(15, FONT.mono, '600'); c.fillText(t.toUpperCase(), X0, yy); };
  const card = (k, v, x, yy, cw, accent) => {
    c.fillStyle = P.panel; c.fillRect(x, yy, cw, 66); c.fillStyle = accent; c.fillRect(x, yy, 5, 66);
    c.fillStyle = P.mute; c.font = font(14, FONT.mono, '600'); c.fillText(k.toUpperCase(), x + 20, yy + 24);
    c.fillStyle = P.text; fit(c, v, cw - 40, 24, FONT.sans, '600'); c.fillText(v, x + 20, yy + 52);
  };
  c.fillStyle = A; c.font = font(18, FONT.mono, '600'); c.fillText(s.kicker.toUpperCase(), X0, 102);
  c.fillStyle = P.text; c.font = font(40, FONT.sans, '700'); c.fillText(s.title, X0, 148);

  const half = (XW - GAP) / 2, acd = flat(s.groups[1].fields);
  const third = (XW - 2 * GAP) / 3; // 3 columns x 2 rows: the Personal group is sized for 6 cards; a 7th would collide with the Academics label below
  label('Personal', 196); s.groups[0].fields.forEach(([k, v], i) => card(k, v, X0 + (i % 3) * (third + GAP), 208 + ((i / 3) | 0) * 80, third, A));
  label('Academics', 384); card('Program', acd.Program, X0, 396, XW, A); card('College', acd.College, X0, 476, half, A); card('Year level', acd['Year level'], X0 + half + GAP, 476, half, A);
  let ly = 590; s.lists.forEach(l => { label(l.title, ly); ly = pills(c, l.items, X0, ly + 40, w - 44, l.title === 'Skills' ? P.sap : P.emSoft, 20) + 12; });
}); };

// Desk-distance laptop screen: same canvas size/aspect as laptopTex but ~2x type, no sidebar or cards, so it stays legible when small.
export const laptopPreviewTex = () => { const s = SECTIONS.laptop, A = s.accent; return sharp(tex(1280, 800, (c, w, h) => {
  c.fillStyle = P.screenBg; c.fillRect(0, 0, w, h); c.fillStyle = P.panel; c.fillRect(0, 0, w, 84);
  P.traffic.forEach((k, i) => { c.fillStyle = k; c.beginPath(); c.arc(50 + i * 42, 42, 13, 0, 7); c.fill(); });
  c.fillStyle = P.mute; c.font = font(32, FONT.mono); c.fillText(s.screen.windowTitle, 190, 53);
  avatar(c, 270, 440, 150);
  c.fillStyle = A; c.font = font(36, FONT.mono, '600'); c.fillText(s.kicker.toUpperCase(), 500, 320);
  c.fillStyle = P.text; c.font = font(92, FONT.sans, '700'); const y = wrap(c, s.name.replace(/ M\./, ''), 500, 420, 740, 100);
  c.fillStyle = A; c.fillRect(500, y - 40, 160, 8); c.fillStyle = P.sap; c.fillRect(670, y - 40, 80, 8);
  pills(c, s.badges.slice(0, 2).map(b => b.text), 500, y + 60, 1220, P.emSoft, 40);
})); };

/* ---- Achievements sheet: ONE portrait (A4) sheet. The camera frames only its top SHEET.content part, so that is the only part that
   carries content; the rest stays blank paper. Both faces go on the sheet box's top face (objects/folders.js). ---- */
const SHEET_H = Math.round(SHEET.px * SHEET.h / SHEET.w);
const TILE = { w: 692, h: 488 }; // certificate image tile (canvas px, ~7:5); drawn at about half size on the sheet
// The sheet's top is the box's -z edge, but roundedBoxGeo runs v along +z: don't flip, so canvas row 0 lands at -z (top of the sheet).
const sheetFace = t => (t.flipY = false, sharp(t));

// Desk-distance face: big title + count, legible while the whole sheet is small on the desk.
export const certCoverTex = () => sheetFace(tex(SHEET.px, SHEET_H, (c, w, h) => {
  const s = SECTIONS.folders, n = s.items.length;
  c.fillStyle = P.page; c.fillRect(0, 0, w, h); c.fillStyle = s.accent; c.fillRect(0, 0, 28, h);
  c.fillStyle = P.pine; c.font = font(50, FONT.mono, '600'); c.fillText('CERTIFICATES', 90, 150);
  c.fillStyle = P.ink; fit(c, s.title, w - 160, 200, FONT.serif, '700'); c.fillText(s.title, 90, 380);
  c.fillStyle = s.accent; c.fillRect(90, 440, 180, 10);
  pills(c, [`${n} certificates`, 'Click to open'], 90, 600, w - 60, P.pine, 44);
}));

// Focused face: header + three certificate cards per page, one block per page, SHEET.pitch px apart down the sheet. The camera shows one
// block at a time and slides down to the next (objects/folders.js). Repainted whenever an image file finishes loading
// (tiles show the generated placeholder until then).
export const certSheetTex = () => {
  const W = SHEET.px, cv = Object.assign(document.createElement('canvas'), { width: W, height: SHEET_H }), c = cv.getContext('2d');
  const t = sheetFace(new THREE.CanvasTexture(cv)), tiles = {};
  const tile = id => tiles[id] ||= (() => { const { canvas, ready } = portraitCanvas(id, TILE.w, TILE.h); ready.then(ok => ok && t.redraw()); return canvas; })();
  t.redraw = () => {
    const pad = 70, gap = 30, cw = (W - 2 * pad - 2 * gap) / 3, ch = cw * TILE.h / TILE.w;
    c.imageSmoothingQuality = 'high'; c.textAlign = 'left';
    c.fillStyle = P.page; c.fillRect(0, 0, W, SHEET_H); c.fillStyle = BOOK_PAGES[0].accent; c.fillRect(0, 0, 18, SHEET_H);
    BOOK_PAGES.forEach((p, b) => {
      const o = b * SHEET.pitch, y0 = o + 226; // every block repeats the same header so each camera position looks the same
      c.fillStyle = P.pine; c.font = font(26, FONT.mono, '600'); c.fillText(p.eyebrow.toUpperCase(), pad, o + 84);
      c.fillStyle = P.folio; c.textAlign = 'right'; c.fillText(p.folio, W - pad, o + 84); c.textAlign = 'left';
      c.fillStyle = P.ink; c.font = font(64, FONT.serif, '700'); c.fillText(SECTIONS.folders.title, pad, o + 160);
      c.fillStyle = 'rgba(29,37,48,.14)'; c.fillRect(pad, o + 188, W - 2 * pad, 2); c.fillStyle = p.accent; c.fillRect(pad, o + 185, 160, 8);
      p.rows.forEach((r, k) => {
        const x = pad + k * (cw + gap);
        c.drawImage(tile(r.image), x, y0, cw, ch);
        c.strokeStyle = 'rgba(29,37,48,.25)'; c.lineWidth = 2; c.strokeRect(x, y0, cw, ch);
        c.fillStyle = p.accent; c.fillRect(x, y0, 66, 42);
        c.fillStyle = P.ink; c.font = font(24, FONT.mono, '700'); c.textAlign = 'center'; c.fillText(String(r.n).padStart(2, '0'), x + 33, y0 + 29); c.textAlign = 'left';
        c.font = font(30, FONT.serif, '700'); wrap(c, r.title, x, y0 + ch + 48, cw, 36, 2);
      });
    });
    t.needsUpdate = true;
  };
  BOOK_PAGES.forEach(p => p.rows.forEach(r => tile(r.image))); // start every image loading now
  t.redraw(); return t;
};

/* ---- Education book (scene/tome.js, objects/shelf.js). Page faces are the top faces of the page-stack boxes, so flipY = false (row 0 = head of the page).
   Portrait canvases sized from the grown page (EDU_BOOK), one per EDU_PAGES entry, in reading order: even index = left page, odd = right. ---- */
const shade = (hex, k) => '#' + [1, 3, 5].map(i => Math.round(parseInt(hex.slice(i, i + 2), 16) * k).toString(16).padStart(2, '0')).join(''); // darker accent for text on paper
const flat = t => (t.flipY = false, t);
const BP = { w: Math.round((EDU_BOOK.w - .04) * EDU_BOOK.grow.x * EDU_BOOK.px), h: Math.round((EDU_BOOK.l - .06) * EDU_BOOK.grow.z * EDU_BOOK.px) }, MX = 100;

export const eduPageTexes = () => {
  const s = SECTIONS.notebooks, A = shade(s.accent, .5), { w, h } = BP;
  return EDU_PAGES.map((pg, i) => flat(sharp(tex(w, h, c => {
    c.fillStyle = P.page; c.fillRect(0, 0, w, h);
    const left = i % 2 === 0, g = c.createLinearGradient(left ? w : 0, 0, left ? w - 110 : 110, 0); // the page curls into the gutter
    g.addColorStop(0, 'rgba(60,40,20,.2)'); g.addColorStop(1, 'rgba(60,40,20,0)'); c.fillStyle = g; c.fillRect(left ? w - 110 : 0, 0, 110, h);
    c.textAlign = 'left'; c.textBaseline = 'alphabetic';
    const head = (txt, y = 150) => { c.fillStyle = A; c.font = font(32, FONT.mono, '600'); c.fillText(txt.toUpperCase(), MX, y); c.fillStyle = s.accent; c.fillRect(MX, y + 22, 170, 10); };
    if (pg.kind === 'title') {
      head(s.kicker);
      c.fillStyle = P.ink; fit(c, s.title, w - 2 * MX, 150, FONT.serif, '700'); c.fillText(s.title, MX, 400);
      c.fillStyle = P.body; c.font = font(52, FONT.serif, 'italic'); wrap(c, s.lead, MX, 540, w - 2 * MX, 72);
      c.fillStyle = P.sub; c.font = font(34, FONT.mono, '600'); c.fillText(PROFILE.school, MX, h - 250); c.fillStyle = P.folio; c.fillText(PROFILE.program, MX, h - 200);
    } else if (pg.kind === 'entry') {
      const e = pg.e, ink = e.todo ? P.folio : P.ink;
      c.globalAlpha = .06; c.fillStyle = P.ink; c.font = font(360, FONT.serif, '700'); c.textAlign = 'right'; c.fillText(String(pg.n).padStart(2, '0'), w - MX + 20, h - 130); c.globalAlpha = 1; c.textAlign = 'left'; // watermark: low and small so it never sits under the text
      head(e.tag);
      c.fillStyle = ink; c.font = font(92, FONT.serif, '700'); let y = wrap(c, e.title, MX, 320, w - 2 * MX, 110, 4);
      c.fillStyle = e.todo ? P.folio : A; c.font = font(56, FONT.serif, '700'); y = wrap(c, e.school, MX, y + 50, w - 2 * MX, 70, 3);
      c.fillStyle = e.todo ? P.folio : P.sub; c.font = font(44, FONT.sans); wrap(c, e.meta, MX, y + 40, w - 2 * MX, 62, 4);
    } else {
      head('Coursework & focus');
      const list = s.coursework, pitch = Math.min(122, 800 / list.length);
      list.forEach((t, k) => {
        const y = 330 + k * pitch;
        c.fillStyle = s.accent; c.fillRect(MX, y - 30, 22, 22);
        c.fillStyle = P.folio; c.font = font(30, FONT.mono, '600'); c.fillText(String(k + 1).padStart(2, '0'), MX + 50, y - 6);
        c.fillStyle = P.ink; fit(c, t, w - 2 * MX - 150, 58, FONT.serif, '700'); c.fillText(t, MX + 150, y + 8);
        c.fillStyle = 'rgba(29,37,48,.13)'; c.fillRect(MX, y + 34, w - 2 * MX, 2);
      });
    }
    c.fillStyle = P.folio; c.font = font(30, FONT.mono); c.textAlign = 'center'; c.fillText(String(i + 1), w / 2, h - 64);
  }))));
};

export const eduCoverTex = () => flat(sharp(tex(620, 950, (c, w, h) => {
  const g = c.createLinearGradient(0, 0, w, h); g.addColorStop(0, hex('--cover-a')); g.addColorStop(1, hex('--cover-b')); c.fillStyle = g; c.fillRect(0, 0, w, h);
  c.strokeStyle = hex('--gold'); c.lineWidth = 5; c.strokeRect(34, 34, w - 68, h - 68); c.lineWidth = 2; c.strokeRect(50, 50, w - 100, h - 100);
  c.fillStyle = hex('--page'); c.textAlign = 'center'; c.font = font(78, FONT.serif, '700'); spaced(c, SECTIONS.notebooks.title.toUpperCase(), w / 2, 440, 10);
  c.fillStyle = hex('--gold'); c.fillRect(w / 2 - 70, 480, 140, 6);
  c.fillStyle = hex('--cover-sub'); c.font = font(30, FONT.serif, 'italic'); wrap(c, PROFILE.school, w / 2, 560, w - 160, 40);
})));
export const eduEndTex = () => flat(tex(620, 950, (c, w, h) => { // endpaper: warm paper with a fine diagonal weave
  c.fillStyle = hex('--endpaper'); c.fillRect(0, 0, w, h); c.strokeStyle = rgba('--weave', .13); c.lineWidth = 2;
  for (let k = -h; k < w; k += 16) { c.beginPath(); c.moveTo(k, h); c.lineTo(k + h, 0); c.stroke(); }
  for (let k = 0; k < w + h; k += 16) { c.beginPath(); c.moveTo(k, h); c.lineTo(k - h, 0); c.stroke(); }
}));

// Procedural oak: 4 planks, wavy grain lines, occasional knots. Seeded so it's identical every load.
export const woodTex = () => { let s = 7; const rnd = () => (s = s * 16807 % 2147483647) / 2147483647;
  const t = tex(1024, 512, (c, w, h) => {
    const cols = [1, 2, 3, 4].map(n => hex(`--wood-${n}`)), ph = h / cols.length;
    cols.forEach((col, i) => {
      const y0 = i * ph; c.fillStyle = col; c.fillRect(0, y0, w, ph);
      for (let k = 0; k < 46; k++) {
        const y = y0 + rnd() * ph, a = .05 + rnd() * .12, amp = 1 + rnd() * 3, f = .004 + rnd() * .01, p0 = rnd() * 6;
        c.strokeStyle = rnd() > .5 ? rgba('--wood-grain-dark', a) : rgba('--wood-grain-light', a * .55); c.lineWidth = .6 + rnd() * 1.4; c.beginPath();
        for (let x = 0; x <= w; x += 16) c.lineTo(x, y + Math.sin(x * f + p0) * amp); c.stroke();
      }
      if (rnd() > .4) { const kx = rnd() * w; for (let r = 3; r > 0; r--) { c.strokeStyle = rgba('--wood-grain-dark', .12 * r / 3); c.lineWidth = 2; c.beginPath(); c.ellipse(kx, y0 + ph / 2, r * 14, r * 5, 0, 0, 7); c.stroke(); } }
      c.fillStyle = rgba('--wood-seam', .55); c.fillRect(0, y0, w, 2); // plank seam
    });
  }); t.anisotropy = 4; return t; };

export const keyboardTex = () => tex(1120, 600, (c, w, h) => {
  c.fillStyle = '#2a3038'; c.fillRect(0, 0, w, h); c.fillStyle = '#11151a';
  for (let r = 0; r < 5; r++) for (let k = 0; k < 14; k++) c.fillRect(40 + k * 74, 36 + r * 66, 66, 56);
  c.fillStyle = '#232a33'; c.fillRect(380, 392, 360, 180); c.strokeStyle = '#3a424d'; c.lineWidth = 3; c.strokeRect(380, 392, 360, 180);
});