import THREE from '../three.js';
import { mat, box, cyl, screen } from '../primitives.js';
import { blank, paperTex, paperPreviewTex } from '../textures.js';

// Shared notebook body. Each notebook differs only by colours, placement and which page textures it shows.
// preview = big, legible page shown on the desk view; full = detailed page shown when focused.
export function makeNotebook({ id, x, z, ry, cover = 0x0f6b4f, spine = 0x0a4c38, pen = 0x3b82f6, preview, full }) {
  const group = new THREE.Group();
  group.add(box(1.95, .1, 2.5, mat(cover), 0, .05, 0), box(1.8, .09, 2.38, mat(0xe8e4d8, { roughness: .9 }), .04, .14, 0), box(.08, .2, 2.5, mat(spine), -.95, .1, 0));
  const pencil = cyl(.04, 1.3, mat(pen), .3, .27, .2); pencil.rotation.z = Math.PI / 2; pencil.rotation.y = .5;
  const page = screen(1.8, 2.38, blank()); page.rotation.x = -Math.PI / 2; page.position.set(.04, .189, 0);
  group.add(pencil, page);
  return { id, group, x, z, ry, dist: 4.4, view: { type: 'flat', w: 1.8, h: 2.38, y: .19 },
    paper: [page.material], surfaces: [{ material: page.material, rest: page.material.map, preview, full }] };
}

export default () => makeNotebook({ id: 'notebook', x: -4, z: .9, ry: .22, preview: paperPreviewTex, full: paperTex });
