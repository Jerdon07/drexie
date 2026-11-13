import THREE from '../three.js';
import { hex } from '../../colors.js';
import { mat, box } from '../primitives.js';
import { blank, certSheetTex, certCoverTex } from '../textures.js';
import { SHEET } from '../../config.js';

// One landscape sheet lying on the desk with every achievement on it. The texture goes on the box's own top face (material array, like the desk),
// so there are no overlay planes and nothing to z-fight. On click the camera looks straight down at the whole sheet (camera.js, view 'flat'):
// no pager, no scrolling.
export default function folders() {
  const T = .04, edge = mat(hex('--page-edge'), { roughness: .9 }), face = new THREE.MeshBasicMaterial({ map: blank() });
  const group = new THREE.Group();
  group.add(box(SHEET.w, T, SHEET.h, [edge, edge, face, edge, edge, edge], 0, T / 2, 0)); // face order: +x, -x, +y (top), -y, +z, -z
  const view = { type: 'flat', w: SHEET.w, h: SHEET.h, y: T, fill: { w: .94, h: .82 } }; // leave room for the Back button
  return { id: 'folders', group, x: -2.7, z: 1.7, ry: .08, dist: 5, view, paper: [face],
    surfaces: [{ material: face, rest: face.map, preview: certCoverTex, full: certSheetTex }] };
}
