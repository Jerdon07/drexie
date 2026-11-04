import THREE from '../three.js';
import { mat, cyl } from '../primitives.js';

// Click → the mug lifts toward you, tips, and the level drops; after 5 sips it's "refilled".
export default function coffee() {
  const group = new THREE.Group(), ceramic = mat(0xf4efe6, { roughness: .3, side: THREE.DoubleSide }), mug = new THREE.Group(); mug.position.y = .05;
  const body = new THREE.Mesh(new THREE.CylinderGeometry(.42, .37, .7, 32, 1, true), ceramic); body.position.y = .35;
  const handle = new THREE.Mesh(new THREE.TorusGeometry(.19, .05, 12, 24, Math.PI), ceramic); handle.rotation.z = -Math.PI / 2; handle.position.set(.42, .38, 0);
  const brew = cyl(.36, .02, mat(0x3a1f10, { roughness: .15 }), 0, .6, 0);
  mug.add(body, cyl(.37, .04, ceramic, 0, .02, 0), handle, brew);
  group.add(cyl(.95, .05, mat(0xf4efe6, { roughness: .3 }), 0, .025, 0, .8), mug);

  let t = -1, sips = 0;
  const D = 2.8, cl = x => Math.max(0, Math.min(1, x)), sm = x => x * x * (3 - 2 * x);
  return { id: 'coffee', group, x: 2.4, z: 2, dist: 3.8,
    play() { if (t < 0) t = 0; },
    update(dt) {
      if (t < 0) return;
      const prev = t; t += dt / D;
      const lift = sm(cl(t / .25)) * (1 - sm(cl((t - .75) / .25))), tilt = sm(cl((t - .15) / .25)) * (1 - sm(cl((t - .6) / .25)));
      mug.position.set(0, .05 + lift, 1.1 * lift); mug.rotation.x = tilt;
      if (prev < .45 && t >= .45) { sips = (sips + 1) % 5; brew.position.y = .6 - sips * .05; }
      if (t >= 1) { t = -1; mug.position.set(0, .05, 0); mug.rotation.x = 0; }
    } };
}
