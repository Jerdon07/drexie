import THREE from '../three.js';
import { mat } from '../primitives.js';

// Generic white kitten plush with a red bow (original design, not a licensed character).
export default function plush() {
  const group = new THREE.Group(), fur = mat(0xfaf7f2, { roughness: .95, metalness: 0 }), black = mat(0x15110f), red = mat(0xd93a52, { roughness: .6 });
  const ball = (r, m, x, y, z, sx = 1, sy = 1, sz = 1) => { const s = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 24), m); s.position.set(x, y, z); s.scale.set(sx, sy, sz); group.add(s); return s; };
  ball(.4, fur, 0, .38, 0, 1, 1.05, .9);                       // body
  ball(.5, fur, 0, 1, 0, 1.1, .88, .85);                       // head
  [-.14, .14].forEach((s, i) => { ball(.2, fur, s * 3.2, .35, .3, .9, 1.4, .9); ball(.17, fur, s * 2.2, .08, .25); }); // arms, feet
  for (const s of [-1, 1]) {
    const ear = ball(.17, fur, s * .36, 1.38, 0, .85, 1.5, .55); ear.rotation.z = -s * .3; // soft rounded ear (was a 4-sided cone)
    ball(.045, black, s * .2, 1.02, .4);                       // eyes
  }
  ball(.05, mat(0xf2a0b4), 0, .93, .42, 1.2, .8, .8);          // nose
  ball(.07, red, .3, 1.38, .12, 1.3, 1, .7); ball(.07, red, .5, 1.3, .12, 1.3, 1, .7); ball(.045, red, .4, 1.34, .14); // bow
  return { group, x: -3.85, z: -2, ry: .3, cast: true }; // back-left gap (was right of the laptop; the profile frame lives there now)
}