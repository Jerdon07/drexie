import THREE from '../three.js';
import { mat, box, screen } from '../primitives.js';
import { blank, pageTex } from '../textures.js';
import { BOOK_PAGES } from '../../content.js';
import { REDUCED_MOTION } from '../../config.js';

export default function folders() {
  const group = new THREE.Group(), n = BOOK_PAGES.length, pages = [], paper = [], surfaces = [];
  [[0x3b82f6, .2], [0x2f3a48, -.15], [0x34d399, .1]].forEach(([c, ry], i) => { const f = box(2.2, .08, 1.6, mat(c), 0, .05 + i * .09, 0); f.rotation.y = ry; group.add(f); });
  const back = screen(2.1, 1.5, blank()); back.rotation.x = Math.PI / 2; back.position.set(1.05, -.002, 0); // one shared back face
  paper.push(back.material);

  BOOK_PAGES.forEach((p, i) => {
    const pivot = new THREE.Group(); pivot.position.set(-1.05, .27 + (n - 1 - i) * .008, 0);
    const front = screen(2.1, 1.5, blank()); front.rotation.x = -Math.PI / 2; front.position.x = 1.05;
    const rear = new THREE.Mesh(back.geometry, back.material); rear.rotation.copy(back.rotation); rear.position.copy(back.position);
    pivot.add(front, rear); group.add(pivot);
    pages.push({ pivot, a: 0, t: 0 }); paper.push(front.material);
    surfaces.push({ material: front.material, rest: front.material.map, full: () => pageTex(p) });
  });

  const book = {
    index: 0, count: n, onChange: null,
    flip(d) {
      if (d > 0 && this.index < n - 1) pages[this.index++].t = Math.PI;
      else if (d < 0 && this.index > 0) pages[--this.index].t = 0;
      this.onChange?.(this.index, n);
    },
    reset() { pages.forEach(p => { p.t = 0; }); this.index = 0; this.onChange?.(0, n); },
  };
  return { id: 'folders', group, x: -1.9, z: 2.1, ry: .1, dist: 4.4, view: { type: 'flat', w: 2.1, h: 1.5, y: .28 },
    paper, surfaces, book, onClick: () => book.flip(1), onBlur: () => book.reset(),
    update(dt) { pages.forEach(p => { p.a += (p.t - p.a) * Math.min(1, dt * (REDUCED_MOTION ? 60 : 6)); p.pivot.rotation.z = p.a; p.pivot.visible = p.a < Math.PI - .03; }); } };
}
