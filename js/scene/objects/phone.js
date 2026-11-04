import THREE from '../three.js';
import { mat, box, cyl, screen } from '../primitives.js';
import { phoneTex } from '../textures.js';

// Phone leaning back in a desk cradle (base plate, front lip, rear support).
export default function phone() {
  const group = new THREE.Group(), metal = mat(0x2b3038, { metalness: .7, roughness: .3 }), stand = mat(0x3a2a1e, { metalness: .2, roughness: .5 }), dark = mat(0x0b0d10);
  group.add(box(1.2, .08, .85, stand, 0, .04, 0), box(.9, .14, .1, stand, 0, .12, .3), box(.14, 1, .06, stand, 0, .52, -.02));
  group.children[2].rotation.x = -.28;

  const ph = new THREE.Group(); ph.position.set(0, .17, .18); ph.rotation.x = -.28; group.add(ph);
  const scr = screen(.7, 1.5, phoneTex()); scr.position.set(0, .8, .041);
  const bump = cyl(.11, .03, dark, -.2, 1.3, -.055); bump.rotation.x = Math.PI / 2;
  ph.add(box(.8, 1.6, .08, metal, 0, .8, 0), scr, bump, box(.02, .22, .03, metal, .41, 1.1, 0));
  return { id: 'phone', group, x: 4.1, z: 1.1, ry: -.35, dist: 4.2, lookY: .9 };
}
