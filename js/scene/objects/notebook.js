import THREE from '../three.js';
import { mat, box, cyl, screen } from '../primitives.js';
import { blank, paperTex } from '../textures.js';

export default function notebook() {
  const group = new THREE.Group();
  group.add(box(1.95, .1, 2.5, mat(0x0f6b4f), 0, .05, 0), box(1.8, .09, 2.38, mat(0xe8e4d8, { roughness: .9 }), .04, .14, 0), box(.08, .2, 2.5, mat(0x0a4c38), -.95, .1, 0));
  const pen = cyl(.04, 1.3, mat(0x3b82f6), .3, .27, .2); pen.rotation.z = Math.PI / 2; pen.rotation.y = .5;
  const page = screen(1.8, 2.38, blank()); page.rotation.x = -Math.PI / 2; page.position.set(.04, .189, 0);
  group.add(pen, page);
  return { id: 'notebook', group, x: -4, z: .9, ry: .22, dist: 4.4, view: { type: 'flat', w: 1.8, h: 2.38, y: .19 },
    paper: [page.material], surfaces: [{ material: page.material, rest: page.material.map, full: paperTex }] };
}
