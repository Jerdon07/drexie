import THREE from './three.js';
import { ROUND, ENV } from '../config.js';

// Reflective materials need more environment light than matte ones, so intensity scales with metalness.
export const mat = (c, o) => new THREE.MeshStandardMaterial({ color: c, roughness: .55, metalness: .1, envMapIntensity: ENV.intensity * (1 + 2 * (o?.metalness ?? .1)), ...o });

// Rounded box. A BoxGeometry whose vertices are remapped so each edge/corner gets a ring of points on a quarter-circle,
// with analytic normals (so shading is perfectly smooth across the edge). Material groups are preserved, so material arrays still work.
export function roundedBoxGeo(w, h, d, r = ROUND.box) {
  const g = new THREE.BoxGeometry(w, h, d, 6, 6, 6), pos = g.attributes.position, nor = g.attributes.normal, uv = g.attributes.uv;
  const H = [w / 2, h / 2, d / 2], dim = [w, h, d];
  r = Math.min(r, Math.min(...H) * .999);
  const I = H.map(v => v - r), c = [0, 0, 0], n = [0, 0, 0];
  for (let i = 0; i < pos.count; i++) {
    const raw = [pos.getX(i), pos.getY(i), pos.getZ(i)];
    const face = Math.abs(nor.getX(i)) > .5 ? 0 : Math.abs(nor.getY(i)) > .5 ? 1 : 2;
    let len = 0;
    for (let k = 0; k < 3; k++) {
      // grid index 0..3 from centre outward -> 0, inner edge, 60% around the arc, outer edge
      const a = Math.round(Math.abs(raw[k]) / H[k] * 3), s = Math.sign(raw[k]) || 1, p = s * [0, I[k], I[k] + .6 * r, H[k]][a];
      c[k] = Math.max(-I[k], Math.min(I[k], p)); n[k] = p - c[k]; len += n[k] * n[k];
    }
    len = Math.sqrt(len) || 1;
    const q = [0, 1, 2].map(k => c[k] + n[k] / len * r);
    pos.setXYZ(i, q[0], q[1], q[2]); nor.setXYZ(i, n[0] / len, n[1] / len, n[2] / len);
    // Remapping made the grid non-uniform, so project UVs from the final position instead (keeps textures undistorted).
    const [u, v] = face === 0 ? [q[2] / dim[2], q[1] / dim[1]] : face === 1 ? [q[0] / dim[0], q[2] / dim[2]] : [q[0] / dim[0], q[1] / dim[1]];
    uv.setXY(i, u + .5, v + .5);
  }
  return g;
}

// Cylinder with softly rounded rims, revolved from a profile (also supports a taper: radiusTop != radiusBottom).
function cylGeo(rt, rb, h, seg = 48) {
  const b = Math.min(ROUND.cyl, rt * .45, rb * .45, h * .45), hh = h / 2, pts = [new THREE.Vector2(0, -hh)];
  const arc = (cx, cy, a0) => { for (let i = 0; i <= 4; i++) { const a = a0 + i * Math.PI / 8; pts.push(new THREE.Vector2(cx + b * Math.cos(a), cy + b * Math.sin(a))); } };
  arc(rb - b, -hh + b, -Math.PI / 2); // bottom rim: -90deg -> 0deg
  arc(rt - b, hh - b, 0);             // top rim: 0deg -> 90deg
  pts.push(new THREE.Vector2(0, hh));
  return new THREE.LatheGeometry(pts, seg);
}

export const box = (w, h, d, m, x = 0, y = 0, z = 0, r) => { const s = new THREE.Mesh(roundedBoxGeo(w, h, d, r), m); s.position.set(x, y, z); return s; };
export const cyl = (r, h, m, x = 0, y = 0, z = 0, r2) => { const s = new THREE.Mesh(cylGeo(r, r2 || r, h), m); s.position.set(x, y, z); return s; };
export const screen = (w, h, map) => new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map }));