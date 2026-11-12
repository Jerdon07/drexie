import THREE from '../three.js';
import { hex } from '../../colors.js';
import { mat } from '../primitives.js';

// Round floor mat under the desk and chair: it gives the legs and casters something to stand on. Non-interactive decor.
// Two stacked discs (outer trim, slightly raised inner field) so no two faces are coplanar. The field's top sits exactly at FLOOR,
// the height the desk legs (desk() in props.js) and chair casters (decor/chair.js) end at, so nothing sinks into it.
// R covers the desk corners (~7.7 from the origin) and the chair casters (~6.7) with margin. Colours: --mat-trim / --mat-field.
const FLOOR = -5.3, R = 9.5, SEG = 128; // SEG: cyl() in primitives.js is 48 segments, which would show facets at this radius

export default function floorMat() {
  const group = new THREE.Group();
  const disc = (r, h, m, top) => { const s = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, SEG), m); s.position.y = top - h / 2; s.receiveShadow = true; return s; };
  group.add(
    disc(R, .14, mat(hex('--mat-trim'), { roughness: .95, metalness: 0 }), FLOOR - .02),
    disc(R * .86, .14, mat(hex('--mat-field'), { roughness: .98, metalness: 0 }), FLOOR),
  );
  return { group, x: 0, z: .4 }; // z matches the desk pad's offset
}
