import THREE from '../three.js';
import { mat, box } from '../primitives.js';
import { spineTex } from '../textures.js';
import { SECTIONS } from '../../content.js';

// Desk bookcase, two levels. Top: the education entries. Bottom: coursework. Every label comes from content.js,
// so adding an entry/course adds a book. Clicking it opens the Education panel (no 3D "view": books are too thin to read up close).
const W = 2.6, D = .8, T = .08, LEVEL = 1.08, H = 2 * LEVEL + T; // LEVEL = board-to-board spacing; clear height per level = LEVEL - T
const SPINES = ['#1e4fa8', '#0f6b4f', '#2f3a48', '#7a3b3b', '#3b5f8a', '#5a4630']; // cobalt/emerald echo the old notebook covers

export default function shelf() {
  const group = new THREE.Group(), wood = mat(0x6a4126, { roughness: .6 }), backWood = mat(0x4a2d19, { roughness: .7 }), pages = mat(0xe8e4d8, { roughness: .9 });
  const { entries, coursework } = SECTIONS.notebooks;

  // Carcass: 3 boards (bottom, middle, cap), 2 sides, a recessed back.
  for (let i = 0; i < 3; i++) group.add(box(W, T, D, wood, 0, i * LEVEL + T / 2, 0));
  for (const s of [-1, 1]) group.add(box(T, H, D, wood, s * (W / 2 - T / 2), H / 2, 0));
  group.add(box(W - 2 * T, H - T, T * .75, backWood, 0, H / 2, -D / 2 + T * .4));

  // Books stand on a board, spine to +z (the only face with a texture). Face order: +x, -x, +y, -y, +z, -z.
  const row = (level, items, size) => {
    let x = -W / 2 + T + .12; const y0 = level * LEVEL + T;
    items.forEach(({ label, muted }, i) => {
      const [w, h] = size(i), col = muted ? '#4a5663' : SPINES[i % SPINES.length], d = D - .2 - (i % 2) * .05;
      const cover = mat(col, { roughness: .8 }), spine = mat(0xffffff, { map: spineTex(label, col, muted), roughness: .8 });
      group.add(box(w, h, d, [cover, cover, pages, pages, spine, pages], x + w / 2, y0 + h / 2, .04));
      x += w + .025;
    });
  };
  row(1, entries.map(e => ({ label: e.tag, muted: e.todo })), i => [.42, .92 - i * .06]);
  row(0, coursework.map(label => ({ label })), i => [.26 + (i * 5 % 3) * .04, .7 + (i * 7 % 4) * .06]);

  return { id: 'notebooks', group, x: -5.4, z: -.8, ry: .25, dist: 5.4, rise: .4, lookY: 1.1 };
}