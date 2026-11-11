import THREE from '../three.js';
import { mat, box, screen } from '../primitives.js';
import { portraitCanvas } from '../../images.js';
import { SECTIONS } from '../../content.js';

// Standing picture frame: wood border, cream mat, photo plane, angled back leg. The photo is a canvas that shows a generated
// silhouette immediately and swaps in images/<id>.png as soon as it loads (see images.js), so nothing blocks on a missing file.
function makeFrame({ id, w, h, accent, wood = 0x6a4126 }) {
  const group = new THREE.Group(), pivot = new THREE.Group(), B = .09, D = .12, pw = w - 2 * B - .1, ph = h - 2 * B - .1; // photo area
  const woodMat = mat(wood, { roughness: .55 }), matte = mat(0xf1ece0, { roughness: .9 });
  const { canvas, ready } = portraitCanvas(id, 512, Math.round(512 * ph / pw)), map = new THREE.CanvasTexture(canvas);
  map.anisotropy = 4; ready.then(ok => { if (ok) map.needsUpdate = true; });

  const photo = screen(pw, ph, map); photo.position.set(0, h / 2, D / 2 + .02); // must clear the mat's front face (D/2 + .005)
  pivot.add(box(w, h, D, woodMat, 0, h / 2, 0), box(w - 2 * B, h - 2 * B, D + .01, matte, 0, h / 2, 0), photo);
  if (accent) { // thin emerald keyline around the photo (profile only)
    const k = new THREE.MeshBasicMaterial({ color: accent }), t = .025, z0 = D / 2 + .022;
    pivot.add(box(pw + 2 * t, t, .006, k, 0, h / 2 + ph / 2 + t / 2, z0), box(pw + 2 * t, t, .006, k, 0, h / 2 - ph / 2 - t / 2, z0),
      box(t, ph, .006, k, -pw / 2 - t / 2, h / 2, z0), box(t, ph, .006, k, pw / 2 + t / 2, h / 2, z0));
  }
  pivot.rotation.x = -.12; // leans back on its leg (= LEAN below)
  // Leg top must land on the frame's *back* face at that height (the frame leans back by LEAN), or it pokes through the photo.
  const LEAN = .12, legTop = h * .72, legBack = .55, zTop = -D / 2 - legTop * LEAN - .035;
  const leg = box(.07, Math.hypot(legTop, legBack), .05, woodMat, 0, legTop / 2, zTop - legBack / 2);
  leg.rotation.x = Math.atan2(legBack, legTop);
  group.add(pivot, leg, box(w * .5, .03, .12, woodMat, 0, .015, -.02)); // foot keeps the pivot from looking like it floats
  return group;
}

// Parents: ONE object holding both frames side by side (identical size/styling) in the front-right corner, clear of the phone and coffee.
// Clicking either frame opens the pair, and the camera frames both. The pair is centred on the object's origin.
const FRAME = { w: .95, h: 1.3 }, GAP = 1.2; // GAP = centre-to-centre
export default function parents() {
  const group = new THREE.Group(), people = SECTIONS.parents.people;
  people.forEach((p, i) => { const fr = makeFrame({ id: p.photo, ...FRAME }); fr.position.x = (i - (people.length - 1) / 2) * GAP; group.add(fr); });
  return { id: 'parents', group, x: 5.7, z: 2.35, ry: -.15, dist: 3.1, lookY: FRAME.h / 2 + .1 };
}
