import THREE from '../three.js';
import { mat, box, cyl, screen as makeScreen } from '../primitives.js';
import { idleScreen, laptopTex, keyboardTex } from '../textures.js';

// Slim aluminium notebook. The lid angle (-.3 rad) is mirrored by the 'screen' framing in camera.js.
export default function laptop() {
  const group = new THREE.Group(), alu = mat(0x9aa3ad, { metalness: .8, roughness: .35 }), dark = mat(0x0d1014, { roughness: .6 });
  const deck = makeScreen(2.8, 1.5, keyboardTex()); deck.rotation.x = -Math.PI / 2; deck.position.set(0, .101, -.15);
  const hingeBar = cyl(.06, 3, alu, 0, .1, -1.02); hingeBar.rotation.z = Math.PI / 2;
  group.add(box(3.1, .08, 2.1, alu, 0, .06, 0), deck, hingeBar);
  [[-1.3, -.9], [1.3, -.9], [-1.3, .9], [1.3, .9]].forEach(([x, z]) => group.add(cyl(.06, .02, dark, x, .01, z)));

  const hinge = new THREE.Group(); hinge.position.set(0, .1, -1); hinge.rotation.x = -.3; group.add(hinge);
  const scr = makeScreen(2.8, 1.7, idleScreen()); scr.position.set(0, .95, .045);
  const cam = cyl(.025, .004, mat(0x222831), 0, 1.9, .046); cam.rotation.x = Math.PI / 2;
  const logo = new THREE.Mesh(new THREE.CircleGeometry(.2, 32), new THREE.MeshBasicMaterial({ color: 0xeef3f8 })); logo.position.set(0, 1, -.036); logo.rotation.y = Math.PI;
  hinge.add(box(3.1, 2, .07, alu, 0, 1, 0), box(2.96, 1.86, .008, dark, 0, .95, .038), scr, cam, logo);
  return { id: 'laptop', group, x: 0, z: -.6, dist: 6.4, view: { type: 'screen', mesh: scr },
    surfaces: [{ material: scr.material, rest: scr.material.map, full: laptopTex }] };
}
