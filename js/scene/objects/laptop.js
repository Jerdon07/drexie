import THREE from '../three.js';
import { mat, box, screen as makeScreen } from '../primitives.js';
import { idleScreen, laptopTex } from '../textures.js';

export default function laptop() {
  const group = new THREE.Group(), metal = mat(0x2a3441, { metalness: .6, roughness: .4 });
  group.add(box(3, .1, 2.1, metal, 0, .05, 0), box(2.6, .02, 1.1, mat(0x141b24), 0, .11, .25));
  const hinge = new THREE.Group(); hinge.position.set(0, .1, -1); hinge.rotation.x = -.3; group.add(hinge);
  const scr = makeScreen(2.8, 1.7, idleScreen()); scr.position.set(0, .95, .045);
  hinge.add(box(3, 1.9, .08, metal, 0, .95, 0), scr);
  return { id: 'laptop', group, x: 0, z: -.6, dist: 6.4, view: { type: 'screen', mesh: scr },
    surfaces: [{ material: scr.material, rest: scr.material.map, full: laptopTex }] };
}
