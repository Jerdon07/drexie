import THREE from '../three.js';
import { mat, cyl } from '../primitives.js';

// Potted plant: tapered terracotta pot, soil disc, and a ring of tilted leaf blades. Non-interactive decor.
// Neutral real-world colours, so they live here rather than in css/tokens.css (same rule as the mug and plush).
// Origin = the desk surface under the pot; y grows upward.
const POT_H = .62, LEAVES = 9;

export default function plant() {
  const group = new THREE.Group();
  const clay = mat(0xb8643c, { roughness: .85, metalness: 0 }), soil = mat(0x2a1b12, { roughness: 1, metalness: 0 });
  const greens = [0x2f8f4e, 0x3aa35c, 0x278047].map(c => mat(c, { roughness: .6, metalness: 0 }));

  group.add(cyl(.42, POT_H, clay, 0, POT_H / 2, 0, .3), cyl(.45, .08, clay, 0, POT_H - .04, 0), cyl(.36, .03, soil, 0, POT_H - .02, 0)); // body, rim, soil
  const leafGeo = new THREE.SphereGeometry(.5, 20, 14);
  for (let i = 0; i < LEAVES; i++) {
    const a = i / LEAVES * Math.PI * 2 + (i % 2) * .25, tall = 1 + (i % 3) * .22, lean = .3 + (i * 7 % 5) * .1; // deterministic variation: identical on every load
    const spin = new THREE.Group(), tilt = new THREE.Group(), leaf = new THREE.Mesh(leafGeo, greens[i % greens.length]);
    leaf.scale.set(.32, .9 * tall, .08); leaf.position.y = .45 * tall; // blade pivots about its base
    spin.position.set(Math.cos(a) * .07, POT_H, Math.sin(a) * .07); spin.rotation.y = -a;
    tilt.rotation.z = -lean; // lean outward along the spin's local +x
    tilt.add(leaf); spin.add(tilt); group.add(spin);
  }
  return { group, x: 3.8, z: -2.1, ry: .4, cast: true }; // clear gap between the laptop and the lamp, back-right of the desk
}