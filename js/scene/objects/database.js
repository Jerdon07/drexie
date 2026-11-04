import THREE from '../three.js';
import { mat, cyl } from '../primitives.js';

export default function database() {
  const group = new THREE.Group(), body = mat(0x1d2a38, { metalness: .5, roughness: .4 }), glow = new THREE.MeshBasicMaterial({ color: 0x34d399 });
  for (let i = 0; i < 3; i++) group.add(cyl(.78, .38, body, 0, .19 + i * .43, 0), cyl(.8, .04, glow, 0, .39 + i * .43 - .02, 0));
  group.add(cyl(.78, .02, body, 0, 1.29, 0));
  return { id: 'db', group, x: -4.2, z: -1.7, dist: 4.8 };
}
