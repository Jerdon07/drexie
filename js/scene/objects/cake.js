import THREE from '../three.js';
import { mat, cyl } from '../primitives.js';

export default function cake() {
  const group = new THREE.Group(), sponge = mat(0xf3d9c4, { roughness: .8 }), cream = mat(0xfff3e8, { roughness: .9 });
  const cherry = new THREE.Mesh(new THREE.SphereGeometry(.12, 16, 16), mat(0xd1344a, { roughness: .3 })); cherry.position.y = .95;
  group.add(cyl(1.05, .06, mat(0xdfe6ee, { metalness: .3 }), 0, .03, 0), cyl(.62, .34, sponge, 0, .23, 0), cyl(.65, .08, cream, 0, .44, 0),
    cyl(.5, .3, sponge, 0, .63, 0), cyl(.53, .07, cream, 0, .81, 0), cherry);
  return { id: 'cake', group, x: 4.3, z: -1.6, dist: 4.4 };
}
