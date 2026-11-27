// Canvas textures. All text comes from content.js; all colours from config.js.
import { hex, rgba } from '../colors.js';
import THREE from './three.js';
import { SECTIONS, PROFILE } from '../content.js';
import { P, FONT, font, BARS, SHEET, BENTO, ALBUM_BOOK, IMAGES } from '../config.js';
import { portraitCanvas } from '../images.js';

const tex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); return new THREE.CanvasTexture(c); };
const sharp = t => (t.anisotropy = 4, t); // keeps small/oblique text from shimmering
function lines(c, t, w) { // greedy word wrap -> array of lines (uses c.font)
  const out = []; let l = '';
  for (const s of t.split(' ')) { const n = l ? l + ' ' + s : s; if (l && c.measureText(n).width > w) { out.push(l); l = s; } else l = n; }
  out.push(l); return out;
}
function wrap(c, t, x, y, w, lh, max = 1e9) { // `max` caps the line count and ellipsizes the last line
  const ls = lines(c, t, w);
  if (ls.length > max) { ls.length = max; let e = ls[max - 1] + '…'; while (e.length > 1 && c.measureText(e).width > w) e = e.slice(0, -2) + '…'; ls[max - 1] = e; }
  ls.forEach((s, k) => c.fillText(s, x, y + k * lh)); return y + ls.length * lh;
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

// Book spine for the bookshelf. Mapped to a thin upright face (w:h = 1:4), label reads bottom-to-top like a real spine.
export const spineTex = (label, col) => sharp(tex(96, 384, (c, w, h) => {
  c.fillStyle = col; c.fillRect(0, 0, w, h);
  c.fillStyle = 'rgba(255,255,255,.22)'; c.fillRect(0, 28, w, 4); c.fillRect(0, h - 32, w, 4); // head/tail bands
  c.save(); c.translate(w / 2, h / 2); c.rotate(-Math.PI / 2);
  c.fillStyle = P.paper; c.textAlign = 'center'; c.textBaseline = 'middle';
  fit(c, label, h - 100, 40, FONT.serif, '700'); c.fillText(label, 0, 0); c.restore();
}));

/* ---- Hanging portrait frame (js/frame.js) ---- */
export const FRAME_PHOTO = { w: 800, h: 1000 }; // photo opening (4:5). frame.js derives the frame's proportions from this.
// Pale oak: fine, nearly straight grain plus short pores, from a fixed seed so every load looks the same.
export const frameWoodTex = () => { const t = tex(512, 512, (c, w, h) => {
  let s = 7; const rnd = () => (s = s * 16807 % 2147483647) / 2147483647;
  c.fillStyle = hex('--frame-wood'); c.fillRect(0, 0, w, h);
  for (let i = 0; i < 120; i++) {
    const y = rnd() * h, amp = rnd() * 2.5, ph = rnd() * 6.28;
    c.strokeStyle = hex(i % 3 ? '--frame-grain' : '--frame-shine'); c.globalAlpha = .1 + rnd() * .22; c.lineWidth = .6 + rnd() * 1.8;
    c.beginPath(); for (let x = 0; x <= w; x += 16) c.lineTo(x, y + Math.sin(x / w * 6.28 + ph) * amp); c.stroke(); // whole periods, so it tiles
  }
  c.fillStyle = hex('--frame-grain'); c.globalAlpha = .22;
  for (let i = 0; i < 700; i++) c.fillRect(rnd() * w, rnd() * h, 3 + rnd() * 9, 1);
  c.globalAlpha = 1;
}); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t; };
// Braided cotton rope: interlocking chevrons. Repeats down the cord.
export const ropeTex = () => { const t = tex(64, 128, (c, w, h) => {
  c.fillStyle = hex('--rope'); c.fillRect(0, 0, w, h);
  c.strokeStyle = hex('--rope-shade'); c.globalAlpha = .75; c.lineWidth = 3; c.lineCap = 'round';
  for (let y = -32; y < h + 32; y += 16) { c.beginPath(); c.moveTo(0, y); c.lineTo(w / 2, y + 18); c.lineTo(w, y); c.stroke(); }
  c.globalAlpha = .5; c.fillStyle = hex('--rope-shade'); c.fillRect(w / 2 - 1, 0, 2, h);
  c.globalAlpha = 1;
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

  // main: section label + cards. Personal = 4-column grid (each field says how many columns it spans); everything fits one 800 px screen.
  const X0 = SW + 44, XW = w - X0 - 44, GAP = 10, CH = 52, COL = (XW - 3 * GAP) / 4, span = n => n * COL + (n - 1) * GAP;
  const label = (t, yy) => { c.fillStyle = P.mute; c.font = font(15, FONT.mono, '600'); c.fillText(t.toUpperCase(), X0, yy); };
  const card = (k, v, x, yy, cw, accent) => {
    c.fillStyle = P.panel; c.fillRect(x, yy, cw, CH); c.fillStyle = accent; c.fillRect(x, yy, 5, CH);
    c.fillStyle = P.mute; c.font = font(13, FONT.mono, '600'); c.fillText(k.toUpperCase(), x + 18, yy + 20);
    c.fillStyle = P.text; fit(c, v, cw - 30, 22, FONT.sans, '600'); c.fillText(v, x + 18, yy + 43);
  };
  c.fillStyle = A; c.font = font(18, FONT.mono, '600'); c.fillText(s.kicker.toUpperCase(), X0, 90);
  c.fillStyle = P.text; c.font = font(36, FONT.sans, '700'); c.fillText(s.title, X0, 130);

  label('Personal', 164);
  let col = 0, cy = 176;
  s.groups[0].fields.forEach(([k, v, n = 1]) => {
    if (col + n > 4) { col = 0; cy += CH + 8; }
    card(k, v, X0 + col * (COL + GAP), cy, span(n), A); col += n;
  });
  let y2 = cy + CH + 30; label('Academics', y2);
  const acd = flat(s.groups[1].fields); y2 += 12;
  card('Program', acd.Program, X0, y2, span(2), A); card('College', acd.College, X0 + span(2) + GAP, y2, span(1), A); card('Year level', acd['Year level'], X0 + span(3) + GAP, y2, span(1), A);
  let ly = y2 + CH + 44;
  s.lists.forEach(l => { label(l.title, ly); pills(c, l.items, X0 + 100, ly + 2, w - 24, l.title === 'Skills' ? P.sap : P.emSoft, 17); ly += 46; });
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

/* ---- Achievements sheet: ONE landscape page laid out as a BENTO grid (config.js BENTO): one tile per achievement (medal + title, certificate, highlights),
   all visible at once. The cover is what you see at desk distance. Both go on the sheet box's top face (objects/folders.js). ---- */
const SHEET_H = Math.round(SHEET.px * SHEET.h / SHEET.w);
const GRID = { pad: 64, top: 200, bottom: 56 }; // px on the sheet; top = space for the header
const TILE = { pad: 24, head: 84, share: .45 }; // head = title strip; share = most of a tile's width a side-by-side certificate may take
const BULLET = { indent: 30, max: 30, min: 16 };
// The sheet's top is the box's -z edge, but roundedBoxGeo runs v along +z: don't flip, so canvas row 0 lands at -z (top of the sheet).
const sheetFace = t => (t.flipY = false, sharp(t));

// Pixel rectangle of an achievement's tile, from the BENTO grid. Null (with a warning) if config.js has no cell for it.
const tileRect = id => {
  const L = BENTO.layout[id]; if (!L) { console.warn(`[sheet] BENTO.layout has no cell for "${id}"`); return null; }
  const { cols, rows, gap } = BENTO, cw = (SHEET.px - 2 * GRID.pad - (cols - 1) * gap) / cols, ch = (SHEET_H - GRID.top - GRID.bottom - (rows - 1) * gap) / rows, cs = L.cs || 1, rs = L.rs || 1;
  return { x: GRID.pad + L.c * (cw + gap), y: GRID.top + L.r * (ch + gap), w: cs * cw + (cs - 1) * gap, h: rs * ch + (rs - 1) * gap };
};
// Splits a tile's body into the certificate frame and the text box. Portrait scans and wide tiles go side by side (frame left, text right);
// a landscape scan in a roughly square tile stacks (frame on top, text below).
function tileParts(id, r) {
  const { pad, head, share } = TILE, bx = r.x + pad, by = r.y + head, bw = r.w - 2 * pad, bh = r.h - head - pad, ratio = IMAGES[id].ratio;
  if (ratio < 1 || r.w > r.h * 1.6) {
    const fw = Math.round(Math.min(bw * share, bh * ratio)), fh = Math.round(fw / ratio);
    return { img: [Math.round(bx), Math.round(by), fw, fh], txt: { x: bx + fw + pad, y: by, w: bw - fw - pad, h: bh } };
  }
  const fh = Math.round(Math.min(bh * .58, bw / ratio)), fw = Math.round(fh * ratio);
  return { img: [Math.round(bx + (bw - fw) / 2), Math.round(by), fw, fh], txt: { x: bx, y: by + fh + 16, w: bw, h: bh - fh - 16 } };
}

// Gold medal carrying the achievement number.
function medal(c, cx, cy, r, n, gold) {
  c.fillStyle = gold; c.beginPath(); c.arc(cx, cy, r, 0, 7); c.fill();
  c.strokeStyle = 'rgba(29,37,48,.55)'; c.lineWidth = 3; c.beginPath(); c.arc(cx, cy, r, 0, 7); c.stroke();
  c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = 2; c.beginPath(); c.arc(cx, cy, r * .78, 0, 7); c.stroke();
  c.fillStyle = P.ink; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = font(r * .95, FONT.serif, '700'); c.fillText(String(n), cx, cy + r * .04);
  c.textAlign = 'left'; c.textBaseline = 'alphabetic';
}

const lay = (c, items, s, tw) => { c.font = font(s, FONT.sans, '600'); const ls = items.map(t => lines(c, t, tw)), lh = s * 1.26; return { ls, lh, h: ls.reduce((a, l) => a + l.length * lh, 0) + s * .6 * (ls.length - 1) }; };
// Largest type size at which EVERY tile's list fits its text box (`jobs` = [{ items, w, h }]). One shared size keeps the page reading as one, and
// adding or lengthening a highlight in content.js can never overflow.
const bulletSize = (c, jobs) => { let s = BULLET.max; while (s > BULLET.min && jobs.some(j => lay(c, j.items, s, j.w - BULLET.indent).h > j.h)) s -= 2; return s; };
// Diamond-bullet list inside text box `t` ({ x, y, w }).
function bullets(c, items, t, s, ink, mark) {
  const L = lay(c, items, s, t.w - BULLET.indent); c.font = font(s, FONT.sans, '600'); let cy = t.y;
  L.ls.forEach(ls => {
    const base = cy + s * .95, my = base - s * .3, d = s * .2, bx = t.x + 10;
    c.fillStyle = mark; c.strokeStyle = ink; c.lineWidth = 2;
    c.beginPath(); c.moveTo(bx, my - d); c.lineTo(bx + d, my); c.lineTo(bx, my + d); c.lineTo(bx - d, my); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = P.ink; ls.forEach((x, k) => c.fillText(x, t.x + BULLET.indent, base + k * L.lh));
    cy += ls.length * L.lh + s * .6;
  });
}

// Desk-distance face: the whole sheet is small on the desk, so only a huge title and one medal per achievement stay legible.
export const certCoverTex = () => sheetFace(tex(SHEET.px, SHEET_H, (c, w, h) => {
  const s = SECTIONS.folders, A = shade(s.accent, .5), n = s.items.length, cw = (w - 180) / n, mr = Math.min(130, cw * .38);
  c.fillStyle = P.page; c.fillRect(0, 0, w, h); c.fillStyle = s.accent; c.fillRect(0, 0, 28, h);
  c.fillStyle = A; c.font = font(56, FONT.mono, '600'); c.fillText('RECOGNITIONS', 90, 170);
  c.fillStyle = P.ink; fit(c, s.title, w - 180, 260, FONT.serif, '700'); c.fillText(s.title, 90, 430);
  c.fillStyle = s.accent; c.fillRect(90, 490, 200, 12);
  s.items.forEach((it, i) => {
    const cx = 90 + cw * (i + .5), k = it.highlights.length;
    medal(c, cx, 710, mr, i + 1, s.accent);
    c.fillStyle = A; c.font = font(30, FONT.mono, '600'); c.textAlign = 'center'; c.fillText(`${k} ${k === 1 ? 'highlight' : 'highlights'}`.toUpperCase(), cx, 710 + mr + 70); c.textAlign = 'left';
  });
  pills(c, ['Click to open'], 90, h - 90, w - 60, A, 50);
}));

// Focused face: header, then the bento grid (numbered medal + title, certificate, highlights per tile). Repainted whenever
// an image file finishes loading (frames show the generated placeholder until then).
export const certSheetTex = () => {
  const W = SHEET.px, cv = Object.assign(document.createElement('canvas'), { width: W, height: SHEET_H }), c = cv.getContext('2d');
  const s = SECTIONS.folders, A = shade(s.accent, .5), G = GRID, tiles = {};
  const t = sheetFace(new THREE.CanvasTexture(cv));
  const tile = (id, fw, fh) => tiles[id] ||= (() => { const { canvas, ready } = portraitCanvas(id, fw * 2, fh * 2); ready.then(ok => ok && t.redraw()); return canvas; })(); // 2x: downscaled with 'high' smoothing so scan text stays crisp
  const cells = s.items.map(it => { const r = tileRect(it.image); return r && { it, r, ...tileParts(it.image, r) }; }).filter(Boolean); // geometry never changes: compute once
  t.redraw = () => {
    c.imageSmoothingQuality = 'high'; c.textAlign = 'left'; c.textBaseline = 'alphabetic';
    c.fillStyle = P.page; c.fillRect(0, 0, W, SHEET_H); c.fillStyle = s.accent; c.fillRect(0, 0, 18, SHEET_H);
    c.fillStyle = A; c.font = font(28, FONT.mono, '600'); c.fillText('RECOGNITIONS', G.pad, 62);
    c.fillStyle = P.ink; fit(c, s.title, W - 2 * G.pad, 84, FONT.serif, '700'); c.fillText(s.title, G.pad, 140);
    c.fillStyle = 'rgba(29,37,48,.14)'; c.fillRect(G.pad, 168, W - 2 * G.pad, 2); c.fillStyle = s.accent; c.fillRect(G.pad, 165, 160, 8);
    const size = bulletSize(c, cells.map(k => ({ items: k.it.highlights, w: k.txt.w, h: k.txt.h })));
    cells.forEach(({ it, r, img: [fx, fy, fw, fh], txt }, i) => {
      c.fillStyle = 'rgba(29,37,48,.06)'; rr(c, r.x, r.y, r.w, r.h, 22); c.fill(); c.strokeStyle = 'rgba(29,37,48,.2)'; c.lineWidth = 2; c.stroke(); // tile card
      c.fillStyle = s.accent; c.fillRect(r.x + 22, r.y, r.w - 44, 6);
      medal(c, r.x + TILE.pad + 30, r.y + 46, 28, i + 1, s.accent);
      c.fillStyle = P.ink; fit(c, it.title, r.w - 2 * TILE.pad - 76, 38, FONT.serif, '700'); c.fillText(it.title, r.x + TILE.pad + 74, r.y + 58);
      c.fillStyle = 'rgba(29,37,48,.16)'; c.fillRect(fx + 8, fy + 10, fw, fh); // drop shadow
      c.drawImage(tile(it.image, fw, fh), fx, fy, fw, fh);
      c.strokeStyle = 'rgba(29,37,48,.35)'; c.lineWidth = 2; c.strokeRect(fx, fy, fw, fh);
      bullets(c, it.highlights, txt, size, A, s.accent);
    });
    t.needsUpdate = true;
  };
  cells.forEach(k => tile(k.it.image, k.img[2], k.img[3])); // start every image loading now
  t.redraw(); return t;
};

/* ---- Family & friends book (scene/tome.js, objects/shelf.js). Page faces are the top faces of the page-stack boxes, so flipY = false (row 0 = head of the page).
   One spread: [left page, right page], 3 photos each. Boxes are [x, y, w, h] in canvas px, listed in content.js photo order. ---- */
const shade = (hex, k) => '#' + [1, 3, 5].map(i => Math.round(parseInt(hex.slice(i, i + 2), 16) * k).toString(16).padStart(2, '0')).join(''); // darker accent for text on paper
const flat = t => (t.flipY = false, t);
const BP = { w: Math.round((ALBUM_BOOK.w - .04) * ALBUM_BOOK.grow.x * ALBUM_BOOK.px), h: Math.round((ALBUM_BOOK.l - .06) * ALBUM_BOOK.grow.z * ALBUM_BOOK.px) };
const ALBUM_LAYOUT = [ // designed on a 990 x 1207 page; boxes are [x, y, w, h]
  { slots: [ // left: two 2:3 portraits (captions below), landscape (caption beside)
    { img: [90, 200, 330, 495], text: [90, 725, 330, 155] },
    { img: [540, 200, 330, 495], text: [540, 725, 330, 155] },
    { img: [90, 900, 420, 280], text: [545, 960, 325, 180] },
  ] },
  { slots: [ // right: two stacked landscapes + one tall portrait
    { img: [90, 200, 402, 268] },
    { img: [523, 200, 377, 566] },
    { img: [90, 498, 402, 268] },
  ], shared: [115, 840, 760, 300] },
];

// Draws a caption at the largest size that fits its box. Never truncates; warns if even `min` is too big.
function caption(c, text, [x, y, w, h], { max = 31, min = 22, center = false } = {}) {
  let size = max, ls, lh, height;
  for (;;) {
    c.font = font(size, FONT.serif, 'italic');
    ls = lines(c, text, w); lh = Math.round(size * 1.32); height = size + (ls.length - 1) * lh;
    if (height <= h || size <= min) break;
    size--;
  }
  if (height > h) console.warn(`[album] caption too long for its box: "${text.slice(0, 30)}…"`);
  const tx = center ? x + w / 2 : x, top = center ? y + Math.max(0, (h - height) / 2) : y;
  c.textAlign = center ? 'center' : 'left';
  ls.forEach((s, k) => c.fillText(s, tx, top + size + k * lh));
  c.textAlign = 'left';
}

export const albumPageTexes = () => {
  const s = SECTIONS.album, A = shade(s.accent, .5), { w, h } = BP;
  return ALBUM_LAYOUT.map(({ slots, shared }, side) => {
    const cv = Object.assign(document.createElement('canvas'), { width: w, height: h }), c = cv.getContext('2d'), t = flat(sharp(new THREE.CanvasTexture(cv)));
    const cells = slots.map((slot, i) => {
      const p = s.photos[side * 3 + i], [, , iw, ih] = slot.img, { canvas, ready } = portraitCanvas(p.image, Math.round(iw * w / 990), Math.round(ih * h / 1207)); // photo at final texture resolution, not upscaled
      ready.then(ok => ok && draw()); return { ...slot, p, canvas };
    });
    function draw() {
      c.save(); c.scale(w / 990, h / 1207);
      c.fillStyle = P.page; c.fillRect(0, 0, 990, 1207);
      const left = side === 0, g = c.createLinearGradient(left ? 990 : 0, 0, left ? 920 : 70, 0); // the page curls into the gutter
      g.addColorStop(0, 'rgba(60,40,20,.2)'); g.addColorStop(1, 'rgba(60,40,20,0)'); c.fillStyle = g; c.fillRect(left ? 920 : 0, 0, 70, 1207);
      c.textBaseline = 'alphabetic'; c.textAlign = 'left';
      c.fillStyle = P.ink; fit(c, left ? 'Family' : '& Friends', 800, 84, FONT.serif, '700'); c.fillText(left ? 'Family' : '& Friends', 90, 135);
      c.fillStyle = s.accent; c.fillRect(90, 158, 150, 9);
      cells.forEach(({ img: [x, y, iw, ih], text, p, canvas }) => {
        c.fillStyle = 'rgba(29,37,48,.2)'; c.fillRect(x - 4, y - 2, iw + 16, ih + 18); // shadow
        c.fillStyle = '#fff'; c.fillRect(x - 10, y - 10, iw + 20, ih + 20); // print border
        c.imageSmoothingQuality = 'high'; c.drawImage(canvas, x, y, iw, ih);
        if (text && p.text) { c.fillStyle = A; caption(c, p.text, text); }
      });
      if (shared) {
        c.fillStyle = s.accent; c.fillRect(435, 812, 120, 4); // divider, centred under the photo group
        c.fillStyle = A; caption(c, s.sharedCaption, shared, { max: 36, center: true });
      }
      c.restore(); t.needsUpdate = true;
    }
    draw(); return t;
  });
};
export const albumCoverTex = () => flat(sharp(tex(620, 950, (c, w, h) => {
  const g = c.createLinearGradient(0, 0, w, h); g.addColorStop(0, hex('--cover-a')); g.addColorStop(1, hex('--cover-b')); c.fillStyle = g; c.fillRect(0, 0, w, h);
  c.strokeStyle = hex('--gold'); c.lineWidth = 5; c.strokeRect(34, 34, w - 68, h - 68); c.lineWidth = 2; c.strokeRect(50, 50, w - 100, h - 100);
  c.fillStyle = hex('--page'); c.textAlign = 'center'; fit(c, SECTIONS.album.title, w - 140, 78, FONT.serif, '700'); c.fillText(SECTIONS.album.title, w / 2, 440);
  c.fillStyle = hex('--gold'); c.fillRect(w / 2 - 70, 480, 140, 6);
  c.fillStyle = hex('--cover-sub'); c.font = font(30, FONT.serif, 'italic'); wrap(c, SECTIONS.album.lead, w / 2, 560, w - 160, 40);
})));
export const albumEndTex = () => flat(tex(620, 950, (c, w, h) => { // endpaper: warm paper with a fine diagonal weave
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