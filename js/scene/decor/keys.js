import THREE from '../three.js';
import { hex } from '../../colors.js';
import { mat, box } from '../primitives.js';
import { loadPortrait } from '../../images.js';

// Key ring with two keys and two key tags, lying flat on the desk. Non-interactive decor.
// The two tag faces are IMAGE SLOTS, like the portraits: drop images/keytag1.png and images/keytag2.png (.jpg works too; ids live in
// IMAGES, config.js). The image is letterboxed onto a cream plate, so a logo on a transparent background stays legible. Until a file
// loads, the plate shows a dashed empty-slot outline. Metal and plastic are neutral real-world colours (same rule as the mug), so they
// live here rather than in css/tokens.css. y = 0 is the desk top; Y lifts everything a hair so no face is coplanar with it.
const Y = .004, RING_R = .2, SCALE = 1.25; // SCALE: real key tags are tiny, but a logo has to be readable from the desk-wide camera
const TAG = { w: .5, d: .72, t: .03, hole: .08 }; // world units; hole = distance from the tag's head to the centre of its hole
const PX = 800, TW = Math.round(TAG.w * PX), TH = Math.round(TAG.d * PX); // texture px per world unit

const rr = (c, x, y, w, h, r) => { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); };

// Top face of a tag: coloured body, cream plate (the image slot), punched hole. Repainted when the image file arrives.
function tagFace(color, id) {
  const cv = Object.assign(document.createElement('canvas'), { width: TW, height: TH }), c = cv.getContext('2d');
  const map = new THREE.CanvasTexture(cv); map.flipY = false; map.anisotropy = 4; // flipY = false: canvas row 0 lands on the box's -z edge = the tag's head (same as the achievements sheet)
  const M = 30, top = 130, plate = { x: M, y: top, w: TW - 2 * M, h: TH - top - M }, hx = TW / 2, hy = TAG.hole * PX;
  const draw = img => {
    c.fillStyle = '#' + color.toString(16).padStart(6, '0'); c.fillRect(0, 0, TW, TH);
    c.fillStyle = hex('--paper'); rr(c, plate.x, plate.y, plate.w, plate.h, 26); c.fill();
    if (img) {
      const pad = 30, k = Math.min((plate.w - 2 * pad) / img.width, (plate.h - 2 * pad) / img.height), w = img.width * k, h = img.height * k;
      c.imageSmoothingQuality = 'high'; c.drawImage(img, plate.x + (plate.w - w) / 2, plate.y + (plate.h - h) / 2, w, h);
    } else { // empty slot
      c.strokeStyle = hex('--folio'); c.lineWidth = 4; c.setLineDash([18, 14]); rr(c, plate.x + 24, plate.y + 24, plate.w - 48, plate.h - 48, 16); c.stroke(); c.setLineDash([]);
    }
    c.fillStyle = '#0a0b0d'; c.beginPath(); c.arc(hx, hy, 20, 0, 7); c.fill(); // punched hole
    c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 3; c.beginPath(); c.arc(hx, hy, 24, 0, 7); c.stroke();
  };
  draw(null); loadPortrait(id).then(img => { if (img) { draw(img); map.needsUpdate = true; } }); // real file wins; null (missing) keeps the empty slot
  return map;
}

// The pivot sits on the hole, so the tag fans out around the point the ring passes through. Unlit face (like the other readable surfaces).
function tag(color, id, hole, yaw) {
  const g = new THREE.Group(), face = new THREE.MeshBasicMaterial({ map: tagFace(color, id) }), edge = mat(color, { roughness: .5 });
  g.add(box(TAG.w, TAG.t, TAG.d, [edge, edge, face, edge, edge, edge], 0, Y + TAG.t / 2, TAG.d / 2 - TAG.hole, .012)); // face order: +x, -x, +y (top), -y, +z, -z
  g.position.set(hole[0], 0, hole[1]); g.rotation.y = yaw;
  return { g, face };
}

// A plain key lying along +x from its bow (origin = bow centre): bow, blade, three bits.
function key(len, m) {
  const g = new THREE.Group(), bow = new THREE.Mesh(new THREE.TorusGeometry(.075, .02, 10, 28), m);
  bow.rotation.x = -Math.PI / 2; bow.position.y = Y + .02;
  g.add(bow, box(len, .03, .07, m, .07 + len / 2, Y + .015, 0, .01));
  [.45, .65, .85].forEach((f, i) => g.add(box(.05, .03, .04 + i * .008, m, .07 + len * f, Y + .015, .055, .008)));
  return g;
}

// Elongated split ring through two points on the desk (a ring point and a tag hole). Sits a little above the tag so it reads as passing through the hole.
function link(a, b, m) {
  const dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz), r = .05, g = new THREE.Group(), t = new THREE.Mesh(new THREE.TorusGeometry(r, .011, 8, 28), m);
  t.rotation.x = -Math.PI / 2; t.scale.x = (len / 2 + r) / r; // stretched along its own x, then the group aims x from a to b
  g.add(t); g.position.set((a[0] + b[0]) / 2, Y + .031, (a[1] + b[1]) / 2); g.rotation.y = -Math.atan2(dz, dx);
  return g;
}

export default function keys() {
  const group = new THREE.Group(), steel = mat(0xb8bec6, { metalness: .55, roughness: .35 }), brass = mat(0xc9a24a, { metalness: .55, roughness: .4 });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(RING_R, .016, 10, 40), steel); ring.rotation.x = -Math.PI / 2; ring.position.y = Y + .016; group.add(ring);
  const onRing = deg => { const a = deg * Math.PI / 180; return [Math.cos(a) * RING_R, Math.sin(a) * RING_R, a]; }; // +z is toward the viewer

  // Keys fan out sideways and slightly back. rotation.y = -a turns the key's +x axis to point away from the ring centre.
  [[205, brass, .5], [335, steel, .46]].forEach(([deg, m, len]) => { const [x, z, a] = onRing(deg), k = key(len, m); k.position.set(x, 0, z); k.rotation.y = -a; group.add(k); });

  // Tags hang forward (toward the viewer) so their faces read upright. Tag centre x ±.38 and yaw ±.25 leave a ~.1 gap between them (rotated footprints).
  const faces = [], c0 = TAG.d / 2 - TAG.hole; // pivot (hole) to tag centre
  [[125, -.38, -.25, 0x2b3440, 'keytag1'], [55, .38, .25, 0x7a2f2f, 'keytag2']].forEach(([deg, cx, yaw, color, id]) => {
    const [rx, rz] = onRing(deg), hole = [cx - c0 * Math.sin(yaw), .62 - c0 * Math.cos(yaw)], t = tag(color, id, hole, yaw);
    group.add(t.g, link([rx, rz], hole, steel)); faces.push(t.face);
  });

  group.scale.setScalar(SCALE);
  // Free patch of the pad between the laptop and the phone stand, behind the mug (where the camera sees it clearly). `paper`: the scene dims unlit faces with the theme.
  return { group, x: 2.8, z: -.85, ry: .1, cast: true, paper: faces };
}
