import THREE from '../three.js';
import { mat, box } from '../primitives.js';

export default function glasses() {
  const group = new THREE.Group(), frame = mat(0x1b1410, { metalness: .5, roughness: .35 });
  const lens = mat(0x9fd0ff, { transparent: true, opacity: .28, roughness: .05, metalness: .2 });
  for (const s of [-1, 1]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.28, .03, 10, 32), frame); ring.rotation.x = -Math.PI / 2; ring.position.set(s * .36, .05, 0);
    const glass = new THREE.Mesh(new THREE.CylinderGeometry(.28, .28, .01, 32), lens); glass.position.set(s * .36, .05, 0);
    group.add(ring, glass, box(.035, .03, .85, frame, s * .64, .05, -.42));
  }
  group.add(box(.16, .03, .035, frame, 0, .06, -.04));
  return { group, x: .4, z: 1.7, ry: .35, cast: true };
}
