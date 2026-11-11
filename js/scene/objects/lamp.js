import THREE from '../three.js';
import { hex } from '../../colors.js';
import { mat, cyl } from '../primitives.js';

// A real light source: SpotLight aimed at the desk centre + a faint additive cone so the beam is visible.
export default function lamp() {
  const group = new THREE.Group(), metal = mat(0x232d3a, { metalness: .6, roughness: .4 });
  const arm = cyl(.045, 1.7, metal, .1, .95, 0); arm.rotation.z = .25;
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(.14, .46, .5, 32, 1, true), mat(0x2d3b4c, { metalness: .5, side: THREE.DoubleSide })); shade.position.set(-.15, 1.78, 0);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(.13, 16, 16), new THREE.MeshBasicMaterial({ color: hex('--lamp-bulb') })); bulb.position.set(-.15, 1.62, 0);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(.12, 1.5, 1.6, 24, 1, true),
    new THREE.MeshBasicMaterial({ color: hex('--lamp-beam'), transparent: true, opacity: .07, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending })); beam.position.set(-.15, .8, 0);
  const spot = new THREE.SpotLight(hex('--lamp-spot'), 2, 22, .85, .7, 1); spot.position.set(-.15, 1.6, 0);
  group.add(cyl(.48, .1, metal, 0, .05, 0), arm, shade, bulb, beam, spot, spot.target);
  spot.target.position.set(-3.4, 0, 2.4); // local → toward the middle of the desk
  return { id: 'lamp', group, x: 6.2, z: -2.4, dist: 4,
    onTheme(t) { spot.intensity = 2 - .8 * t; beam.material.opacity = .07 - .035 * t; } };
}
