import THREE from '../three.js';
import { mat, box, screen } from '../primitives.js';
import { phoneTex } from '../textures.js';

export default function phone() {
  const group = new THREE.Group(), s = screen(.68, 1.4, phoneTex());
  s.rotation.x = -Math.PI / 2; s.position.y = .075;
  group.add(box(.78, .07, 1.5, mat(0x1d2631, { metalness: .5 }), 0, .035, 0), s);
  return { id: 'phone', group, x: 4.1, z: 1.1, ry: -.35, dist: 4.2 };
}
