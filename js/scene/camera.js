import THREE from './three.js';
import { HOME_LIFT, HOME_SHIFT } from '../config.js';
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const MAX_YAW = .9, PITCH = [-.2, .4]; // ±~52° left/right; never reaches the back of the desk
// Tall-sheet framing (view.top). VIS = visible height per unit of camera distance (fov 50° in scene/index.js); the pads keep the
// sheet clear of the Back button (top) and the pager (bottom).
const VIS = 2 * Math.tan(25 * Math.PI / 180), TOP_PAD = .09, BOTTOM_PAD = .1;

// Owns where the camera wants to be (aim), the user's orbit offset (rotate), and the easing (step).
export function createCameraRig(camera) {
  const pos = new THREE.Vector3(), target = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), look = new THREE.Vector3(), c = new THREE.Vector3(),
    Y = new THREE.Vector3(0, 1, 0), ax = new THREE.Vector3(), off = new THREE.Vector3(), orb = { yaw: 0, pitch: 0, ty: 0, tp: 0 };
  return {
    rotate(dx, dy) { orb.ty = clamp(orb.ty - dx * .005, -MAX_YAW, MAX_YAW); orb.tp = clamp(orb.tp + dy * .004, PITCH[0], PITCH[1]); },
    aim(def, aspect) {
      const wide = aspect > 1.1, v = def?.view; up.set(0, 1, 0);
      if (!def) { // home view: lifted by HOME_LIFT so the desk sits lower and clears the title block
        const k = aspect < 1.2 ? (1.2 - aspect) * 14 : 0;
        const sx = HOME_SHIFT * clamp((aspect - 1.3) / .4, 0, 1); // pan only when there is width to spare
        pos.set(sx, 6.2 + k * .45 + HOME_LIFT, 10.8 + k); target.set(sx, (wide ? 1.3 : 2) + HOME_LIFT, 0); return;
      }
      orb.ty = orb.tp = 0;
      if (v?.type === 'screen') { // face a screen head-on
        v.mesh.getWorldPosition(c); const d = Math.max(2.1, 2.8 / (.84 * aspect));
        pos.set(c.x, c.y + .296 * d, c.z + .955 * d); target.copy(c); up.set(0, .955, -.296); return;
      }
      const p = def.group.position;
      if (v?.type === 'flat') { // look straight down at a sheet
        const ry = def.group.rotation.y, ux = -Math.sin(ry), uz = -Math.cos(ry); // world direction of the sheet's top edge
        let d = Math.max(v.h / .8, v.w / (.84 * aspect)), s = 0;
        if (v.top) { // tall sheet: fit its WIDTH to the screen and frame only the top `v.top` units; the rest runs off the bottom.
          d = Math.max(v.w / (.84 * aspect), v.top / (VIS * (1 - TOP_PAD - BOTTOM_PAD))); // wider than tall screens fall back to showing all of `top`
          s = Math.max(0, v.h / 2 - VIS * d * (.5 - TOP_PAD)); // slide the view toward the top edge until the sheet starts TOP_PAD from the screen top
          s = Math.max(s - (v.scroll || 0), Math.min(0, VIS * d / 2 - v.h / 2)); // view.scroll slides down the sheet, but never past its bottom edge (step() eases the move)
        }
        pos.set(p.x + ux * s, v.y + d, p.z + uz * s); target.set(p.x + ux * s, v.y, p.z + uz * s); up.set(ux, 0, uz); return;
      }
      const d = (def.dist || 4.6) * (wide ? 1 : 1.25), ox = wide ? d * .36 : 0; // default 3/4 orbit framing
      pos.set(p.x + ox, p.y + d * (def.rise ?? .55), p.z + d); target.set(p.x + ox, def.lookY ?? p.y + (wide ? .35 : -.5), p.z);
    },
    snap() { look.copy(target); camera.position.copy(pos); },
    step(k, free, mx, my) {
      orb.yaw += ((free ? orb.ty : 0) - orb.yaw) * k; orb.pitch += ((free ? orb.tp : 0) - orb.pitch) * k;
      off.set(pos.x + (free ? mx * 1.2 : 0) - target.x, pos.y + (free ? -my * .6 : 0) - target.y, pos.z - target.z).applyAxisAngle(Y, orb.yaw);
      off.applyAxisAngle(ax.set(1, 0, 0).applyAxisAngle(Y, orb.yaw), -orb.pitch);
      camera.position.x += (target.x + off.x - camera.position.x) * k;
      camera.position.y += (target.y + off.y - camera.position.y) * k;
      camera.position.z += (target.z + off.z - camera.position.z) * k;
      look.lerp(target, k); camera.up.lerp(up, k).normalize(); camera.lookAt(look);
    },
  };
}