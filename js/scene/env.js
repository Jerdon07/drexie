import THREE from './three.js';

// Procedural studio environment (a dim warm room + a few bright "softboxes"), prefiltered once with PMREM.
// Used only by the ID overlay's own renderer: it is what gives the metal hardware and PVC something to reflect.
export function makeStudioEnv(renderer) {
  const env = new THREE.Scene();
  env.add(new THREE.Mesh(new THREE.BoxGeometry(40, 20, 40), new THREE.MeshBasicMaterial({ color: 0x1a2c44, side: THREE.BackSide })));
  const panel = (w, h, color, k, x, y, z) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k), side: THREE.DoubleSide }));
    m.position.set(x, y, z); m.lookAt(0, 0, 0); env.add(m); // HDR values (>1) survive PMREM, so these read as real light sources
  };
  panel(16, 10, 0xeafff6, 2.4, -6, 9, 6);    // key: cool mint-white, top-left-front
  panel(12, 8, 0x9ec5ff, 1.1, 12, 5, -4);  // fill: cool, right
  panel(14, 6, 0xfff2dd, 1.2, 2, 1, 14);     // soft front panel so the card face gets a glossy sweep
  const pm = new THREE.PMREMGenerator(renderer), rt = pm.fromScene(env, .04); pm.dispose();
  return rt.texture;
}