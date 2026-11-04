import THREE from './three.js';

// Owns where the camera wants to be (aim) and eases it there (step).
export function createCameraRig(camera) {
  const pos = new THREE.Vector3(), target = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), look = new THREE.Vector3(), c = new THREE.Vector3();
  return {
    aim(def, aspect) {
      const wide = aspect > 1.1, v = def?.view; up.set(0, 1, 0);
      if (!def) { const k = aspect < 1.2 ? (1.2 - aspect) * 14 : 0; pos.set(0, 6.2 + k * .45, 10.8 + k); target.set(0, wide ? 1.3 : 2, 0); return; }
      if (v?.type === 'screen') { // face a screen head-on
        v.mesh.getWorldPosition(c); const d = Math.max(2.1, 2.8 / (.84 * aspect));
        pos.set(c.x, c.y + .296 * d, c.z + .955 * d); target.copy(c); up.set(0, .955, -.296); return;
      }
      const p = def.group.position;
      if (v?.type === 'flat') { // look straight down at a sheet
        const ry = def.group.rotation.y, d = Math.max(v.h / .8, v.w / (.84 * aspect));
        pos.set(p.x, v.y + d, p.z); target.set(p.x, v.y, p.z); up.set(-Math.sin(ry), 0, -Math.cos(ry)); return;
      }
      const d = (def.dist || 4.6) * (wide ? 1 : 1.25), ox = wide ? d * .36 : 0; // default 3/4 orbit framing
      pos.set(p.x + ox, p.y + d * .55, p.z + d); target.set(p.x + ox, p.y + (wide ? .35 : -.5), p.z);
    },
    snap() { look.copy(target); camera.position.copy(pos); },
    step(k, free, mx, my) {
      const px = free ? mx * 1.2 : 0, py = free ? -my * .6 : 0;
      camera.position.x += (pos.x + px - camera.position.x) * k;
      camera.position.y += (pos.y + py - camera.position.y) * k;
      camera.position.z += (pos.z - camera.position.z) * k;
      look.lerp(target, k); camera.up.lerp(up, k).normalize(); camera.lookAt(look);
    },
  };
}
