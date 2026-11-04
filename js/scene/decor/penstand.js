import THREE from '../three.js';
import { mat, cyl } from '../primitives.js';

export default function penStand() {
  const group = new THREE.Group(), metal = mat(0x2b2f36, { metalness: .6, roughness: .4, side: THREE.DoubleSide });
  group.add(new THREE.Mesh(new THREE.CylinderGeometry(.38, .34, .85, 24, 1, true), metal), cyl(.34, .03, metal, 0, -.42, 0));
  group.children[0].position.y = 0; group.position.y = 0;
  [[0xd94b4b, .1, .05], [0x3b82f6, -.12, .08], [0xf2c14e, .05, -.12], [0x34d399, -.08, -.1], [0xeeeeee, .15, -.04]].forEach(([c, x, z], i) => {
    const pen = cyl(.035, 1.5, mat(c, { roughness: .4 }), x * 1.2, .65, z); pen.rotation.set(z * 2.2, 0, -x * 2.2); group.add(pen);
  });
  const root = new THREE.Group(); group.position.y = .43; root.add(group);
  return { group: root, x: -2.7, z: -1.9, cast: true };
}
