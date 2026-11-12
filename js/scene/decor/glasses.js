import THREE from '../three.js';
import { mat, box } from '../primitives.js';

// Rectangular glasses resting open on the desk: the temples lie on the desk, the front frame stands on its lower rim facing the viewer.
// 1 unit ≈ 14 cm, so ~1 unit wide is a real pair. All proportions are constants so the shape is tuned here.
const LW = .4, LH = .3, R = .07;   // lens opening: width, height, corner radius
const RIM = .035, DEPTH = .04;     // rim thickness in the lens plane, and front-to-back depth
const GAP = .1;                    // nose-bridge gap between the two rims
const TEMPLE = .95, HINGE = .22;   // temple length; hinge height above the desk
const CX = GAP / 2 + RIM + LW / 2; // lens centre offset

function rounded(w, h, r, path = new THREE.Shape()) { // rounded rectangle centred on the origin
  const x = w / 2, y = h / 2;
  path.moveTo(-x + r, -y); path.lineTo(x - r, -y); path.quadraticCurveTo(x, -y, x, -y + r); path.lineTo(x, y - r); path.quadraticCurveTo(x, y, x - r, y);
  path.lineTo(-x + r, y); path.quadraticCurveTo(-x, y, -x, y - r); path.lineTo(-x, -y + r); path.quadraticCurveTo(-x, -y, -x + r, -y);
  return path;
}

export default function glasses() {
  const group = new THREE.Group(), frame = mat(0x1b1410, { metalness: .4, roughness: .35 });
  const lensMat = new THREE.MeshStandardMaterial({ color: 0x9fd0ff, transparent: true, opacity: .3, roughness: .05, metalness: .1, depthWrite: false, side: THREE.DoubleSide });
  const rimShape = rounded(LW + 2 * RIM, LH + 2 * RIM, R + RIM); rimShape.holes.push(rounded(LW, LH, R)); // a frame with a lens-shaped hole
  const rimGeo = new THREE.ExtrudeGeometry(rimShape, { depth: DEPTH, bevelEnabled: true, bevelThickness: .006, bevelSize: .006, bevelSegments: 2, curveSegments: 8 }).translate(0, 0, -DEPTH / 2);
  const lensGeo = new THREE.ShapeGeometry(rounded(LW, LH, R), 8);

  const front = new THREE.Group(); front.position.y = LH / 2 + RIM + .005; front.rotation.x = -.1; // stands on its lower rim, leaning back slightly
  const lenses = [];
  for (const s of [-1, 1]) {
    const rim = new THREE.Mesh(rimGeo, frame); rim.position.x = s * CX;
    const lens = new THREE.Mesh(lensGeo, lensMat); lens.position.x = s * CX; lenses.push(lens);
    front.add(rim, lens);
  }
  front.add(box(GAP + .03, .035, DEPTH * .9, frame, 0, LH * .28, 0)); // bridge across the nose gap, near the top
  group.add(front);

  // Temples: hinge at the outer upper corner of each rim, run back and slope down so the tips touch the desk.
  const outer = CX + LW / 2 + RIM, tilt = Math.asin(Math.min(.95, HINGE / TEMPLE));
  for (const s of [-1, 1]) {
    const pivot = new THREE.Group(); pivot.position.set(s * outer, HINGE, -DEPTH / 2); pivot.rotation.x = -tilt;
    pivot.add(box(.03, .03, TEMPLE, frame, 0, 0, -TEMPLE / 2));
    group.add(pivot);
  }

  group.traverse(n => { if (n.isMesh && !lenses.includes(n)) n.castShadow = n.receiveShadow = true; }); // the see-through lens must not cast a solid shadow
  return { group, x: .4, z: 1.7, ry: .35 };
}