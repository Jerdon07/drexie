import THREE from '../three.js';
import { mat, cyl } from '../primitives.js';

export default function lamp() {
  const group = new THREE.Group(), metal = mat(0x232d3a, { metalness: .6, roughness: .4 });
  const arm = cyl(.045, 1.7, metal, .1, .95, 0); arm.rotation.z = .25;
  const head = cyl(.14, .5, mat(0x2d3b4c, { metalness: .5 }), -.3, 1.8, 0, .46); head.rotation.z = -.5;
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(.13, 16, 16), new THREE.MeshBasicMaterial({ color: 0x403a30 })); bulb.position.set(-.42, 1.6, 0);
  const light = new THREE.PointLight(0xffd9a0, 0, 18); light.position.set(-.5, 1.5, 0);
  group.add(cyl(.48, .1, metal, 0, .05, 0), arm, head, bulb, light);
  return { id: 'lamp', group, x: 6.2, z: -2.4, dist: 4,
    onTheme(t) { light.intensity = 1.6 * t; bulb.material.color.setRGB(.25 + .75 * t, .23 + .67 * t, .19 + .5 * t); } };
}
