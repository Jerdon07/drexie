import THREE from '../three.js';
import { mat, box, cyl } from '../primitives.js';
import { ENV } from '../../config.js';
import { idFrontTex, idBackTex, ribbonTex, weaveTex, ID_PHOTO } from '../textures.js';
import { portraitSrc } from '../../images.js';
import { createLanyard } from '../lanyard.js';

// School ID on a UC-green woven lanyard, hanging from a small desk stand. Drag the card or the strap; the strap swings, goes taut
// and settles back (js/scene/lanyard.js). The card + hardware are one rigid pose: they are translated/rotated, never scaled.
// Scale: 1 unit = 140 mm, so CR80 = 53.98 × 85.60 × 0.76 mm is exact (portrait).
const MM = 1 / 140;
const CARD = { w: 53.98 * MM, h: 85.6 * MM, t: .76 * MM, r: 3.18 * MM, top: 6.5 * MM }; // top = slot centre below the top edge
const SLOT = { w: 12.7 * MM, h: 3.2 * MM };
const HW = .192;                 // crimp bottom → slot centre (hardware stack length)
const HANGER_Y = 3.3, HANG_X = .55, DROP = 1.95, WIDTH = .15; // strap: 21 mm wide, 1.95 u from the bar to the crimp (card hangs clear of the desk)
const TILE = 2048 * WIDTH / 256; // texture rows per unit of strap length (ribbonTex is 256 × 2048 for the strap width)

function cardShape() { // origin = slot centre; card hangs below it
  const { w, h, r, top } = CARD, x0 = -w / 2, x1 = w / 2, y0 = -(h - top), y1 = top, s = new THREE.Shape();
  s.moveTo(x0 + r, y0); s.lineTo(x1 - r, y0); s.absarc(x1 - r, y0 + r, r, -Math.PI / 2, 0, false); s.lineTo(x1, y1 - r);
  s.absarc(x1 - r, y1 - r, r, 0, Math.PI / 2, false); s.lineTo(x0 + r, y1); s.absarc(x0 + r, y1 - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(x0, y0 + r); s.absarc(x0 + r, y0 + r, r, Math.PI, Math.PI * 1.5, false);
  const a = SLOT.w / 2, b = SLOT.h / 2, hole = new THREE.Path(); // oblong slot punch
  hole.moveTo(-a + b, -b); hole.lineTo(a - b, -b); hole.absarc(a - b, 0, b, -Math.PI / 2, Math.PI / 2, false); hole.lineTo(-a + b, b); hole.absarc(-a + b, 0, b, Math.PI / 2, Math.PI * 1.5, false);
  s.holes.push(hole); return s;
}

function buildCard(frontMap, backMap) {
  const shape = cardShape(), g = new THREE.Group(), env = ENV.intensity * 2.2;
  const core = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: CARD.t, bevelEnabled: false, curveSegments: 10 }).translate(0, 0, -CARD.t / 2),
    new THREE.MeshPhysicalMaterial({ color: 0xf7f7f2, roughness: .4, envMapIntensity: env }));
  const printGeo = () => { // printed face with the same rounded outline + slot; UVs span the whole card
    const geo = new THREE.ShapeGeometry(shape, 10), p = geo.attributes.position, uv = geo.attributes.uv;
    for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / CARD.w + .5, (p.getY(i) + CARD.h - CARD.top) / CARD.h);
    return geo;
  };
  const pvc = map => new THREE.MeshPhysicalMaterial({ map, roughness: .3, metalness: 0, clearcoat: .9, clearcoatRoughness: .12, envMapIntensity: env }); // laminated PVC
  const front = new THREE.Mesh(printGeo(), pvc(frontMap)), back = new THREE.Mesh(printGeo(), pvc(backMap));
  front.position.z = CARD.t / 2 + .0003; back.position.z = -CARD.t / 2 - .0003; back.rotation.y = Math.PI; // back faces -z; its u still runs to the viewer's right
  [core, front, back].forEach(m => { m.userData.card = true; g.add(m); });
  return g;
}

// Crimp (clamps both strap layers) → neck → swivel barrel → hook eye, with a split ring through the card slot. Origin = strap end.
function buildHardware() {
  const g = new THREE.Group(), steel = mat(0xd5d9de, { metalness: 1, roughness: .22 }), brushed = mat(0xb9bec6, { metalness: 1, roughness: .38 });
  g.add(box(.165, .085, .03, brushed, 0, .0425, 0, .008), box(.17, .008, .034, steel, 0, .085, 0, .003),
    cyl(.012, .03, steel, 0, -.015, 0), cyl(.021, .008, steel, 0, -.03, 0), cyl(.017, .07, steel, 0, -.065, 0), cyl(.021, .008, steel, 0, -.1, 0));
  const eye = new THREE.Mesh(new THREE.TorusGeometry(.016, .005, 10, 24, Math.PI * 1.5), steel); eye.position.y = -.118; eye.rotation.z = -Math.PI / 4; // swivel hook
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.03, .0065, 12, 32), steel); ring.position.y = -.162; ring.rotation.y = Math.PI / 2; // lies in the card's slot axis
  g.add(eye, ring); return g;
}

function buildStand() {
  const g = new THREE.Group(), wood = mat(0x6a4126, { roughness: .6 }), dark = mat(0x2b1d14, { roughness: .8 }), brass = mat(0xb08d57, { metalness: .9, roughness: .35 });
  const bar = cyl(.028, 1.5, wood, .375, HANGER_Y, 0); bar.rotation.z = Math.PI / 2;
  g.add(cyl(.55, .1, dark, 0, .05, 0), cyl(.2, .03, brass, 0, .115, 0), cyl(.06, HANGER_Y - .03, wood, 0, (HANGER_Y - .03) / 2, 0), bar);
  for (const x of [-.375, 1.125]) { const cap = new THREE.Mesh(new THREE.SphereGeometry(.04, 20, 14), brass); cap.position.set(x, HANGER_Y, 0); g.add(cap); }
  return g;
}

export default function profile() {
  const group = new THREE.Group();
  // The existing profile photo: portraitSrc() resolves to the real file, or the generated silhouette if it is missing.
  // Cover-fit it into a canvas the card texture draws from; until it loads the canvas is a neutral mint placeholder.
  const photo = Object.assign(document.createElement('canvas'), { width: ID_PHOTO.w, height: ID_PHOTO.h }), pc = photo.getContext('2d');
  pc.fillStyle = '#14633d'; pc.fillRect(0, 0, ID_PHOTO.w, ID_PHOTO.h);
  const front = idFrontTex(photo);
  portraitSrc('profile').then(src => { const img = new Image(); img.onload = () => {
    const k = Math.max(ID_PHOTO.w / img.width, ID_PHOTO.h / img.height), w = img.width * k, h = img.height * k;
    pc.drawImage(img, (ID_PHOTO.w - w) / 2, Math.min(0, (ID_PHOTO.h - h) * .2), w, h); front.redraw(); // bias toward the top so faces aren't cropped
  }; img.src = src; });

  const ribbonMat = new THREE.MeshStandardMaterial({ map: ribbonTex(), bumpMap: weaveTex(), bumpScale: 1.5, roughness: .88, metalness: 0, envMapIntensity: ENV.intensity });
  const foldMat = new THREE.MeshStandardMaterial({ color: 0x14633d, roughness: .9, side: THREE.DoubleSide, envMapIntensity: ENV.intensity });
  const lanyard = createLanyard({
    anchor: new THREE.Vector3(HANG_X, HANGER_Y, 0), length: DROP, width: WIDTH, tile: TILE, material: ribbonMat, foldMaterial: foldMat,
    rigid: HW + CARD.h / 2 - CARD.top, cardHalf: CARD.h / 2, post: { x: 0, z: 0, r: .07, top: HANGER_Y - .12 },
  });

  const rigid = new THREE.Group(), card = buildCard(front, idBackTex()); card.position.y = -HW;
  rigid.add(buildHardware(), card);
  group.add(buildStand(), lanyard.ribbon, rigid);

  const basis = new THREE.Matrix4(), plane = new THREE.Plane(), local = new THREE.Vector3(), hitPt = new THREE.Vector3(), nrm = new THREE.Vector3();
  const toLocal = w => local.copy(w).sub(group.position); // group is only translated, so this is exact
  function pose() { const P = lanyard.pose; rigid.position.copy(P.pos); basis.makeBasis(P.r, P.u, P.f); rigid.quaternion.setFromRotationMatrix(basis); }
  pose();

  return { id: 'profile', group, x: 3.4, z: -1.8, dist: 4.2, rise: .3, lookY: 1.7, view: { type: 'orbit' }, noHoverScale: true,
    // Pointer contract used by scene/index.js: start(hit, ray, camera) / move(ray) / end(). The drag plane faces the camera.
    drag: {
      start(hit, ray, camera) { camera.getWorldDirection(nrm); plane.setFromNormalAndCoplanarPoint(nrm, hit.point); lanyard.grab(toLocal(hit.point), !!hit.object.userData.card); },
      move(ray) { if (ray.ray.intersectPlane(plane, hitPt)) lanyard.move(toLocal(hitPt)); },
      end() { lanyard.release(); },
    },
    update(dt) { lanyard.step(dt); pose(); } };
}