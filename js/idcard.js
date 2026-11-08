// School ID overlay (right side of the screen, as before). A CR80 card on a UC-style woven lanyard that hangs from above the top edge.
// It has its own small transparent WebGL canvas, so the card gets real PVC / metal shading without touching the desk scene.
// Pull the card or the strap: ONLY the lanyard gives (js/scene/lanyard.js). The card + hardware are one rigid pose: they are moved
// and tilted, never scaled or bent. Scale: 1 unit = 140 mm, so CR80 = 53.98 × 85.60 × 0.76 mm exactly (portrait).
import THREE from './scene/three.js';
import { REDUCED_MOTION } from './config.js';
import { portraitSrc } from './images.js';
import { idFrontTex, idBackTex, ribbonTex, weaveTex, RIBBON, ID_PHOTO } from './scene/textures.js';
import { createLanyard } from './scene/lanyard.js';
import { makeStudioEnv } from './scene/env.js';

const MM = 1 / 140;
const CARD = { w: 53.98 * MM, h: 85.6 * MM, t: .76 * MM, r: 3.18 * MM, top: 6.5 * MM }; // top = slot centre below the top edge
const SLOT = { w: 12.7 * MM, h: 3.2 * MM };
const HW = .192;                                   // strap end → slot centre (crimp + swivel + ring stack)
const WIDTH = .15;                                 // 21 mm strap
const RIGID = HW + CARD.h / 2 - CARD.top;          // strap end → card centre
const VIEW_H = .64, CARD_Y = 0;                    // world height of the viewport (smaller = bigger card); card centre at rest (screen centre)
const SIZE = .75;                                  // on-screen scale of the whole ID (1 = original). Scales pixels-per-unit only; physics and card geometry are untouched.
const MAX_W_FRAC = .36;                           // the card never takes more than this share of the viewport width (keeps it off the desk on narrow windows)
const ANCHOR = new THREE.Vector3(0, VIEW_H / 2 + 1.1, 0); // hidden above the top edge: the strap's visible part is just its lower end
const DROP = (ANCHOR.y - (CARD_Y + RIGID)) / 1.03; // rest length (it sits ~3% stretched under the card's weight)
const TILE = RIBBON.h * WIDTH / RIBBON.w;          // strap length per texture repeat
const FOV = 20, RIGHT_PX = 28;                     // RIGHT_PX: gap between the card and the right edge, as in the original layout
const LIGHT = { ambient: .4, key: .5, env: .25, metal: .75 }; // tune here if the card reads too dark / too hot

function slab(w, h, d, r) { // rounded-rectangle block with softened edges (crimp, caps)
  const s = new THREE.Shape(), x = w / 2, y = h / 2;
  s.moveTo(-x + r, -y); s.lineTo(x - r, -y); s.quadraticCurveTo(x, -y, x, -y + r); s.lineTo(x, y - r); s.quadraticCurveTo(x, y, x - r, y);
  s.lineTo(-x + r, y); s.quadraticCurveTo(-x, y, -x, y - r); s.lineTo(-x, -y + r); s.quadraticCurveTo(-x, -y, -x + r, -y);
  return new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: true, bevelThickness: .004, bevelSize: .004, bevelSegments: 3, curveSegments: 6 }).translate(0, 0, -d / 2);
}

function cardShape() { // origin = slot centre; the card hangs below it
  const { w, h, r, top } = CARD, x0 = -w / 2, x1 = w / 2, y0 = -(h - top), y1 = top, s = new THREE.Shape();
  s.moveTo(x0 + r, y0); s.lineTo(x1 - r, y0); s.absarc(x1 - r, y0 + r, r, -Math.PI / 2, 0, false); s.lineTo(x1, y1 - r);
  s.absarc(x1 - r, y1 - r, r, 0, Math.PI / 2, false); s.lineTo(x0 + r, y1); s.absarc(x0 + r, y1 - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(x0, y0 + r); s.absarc(x0 + r, y0 + r, r, Math.PI, Math.PI * 1.5, false);
  const a = SLOT.w / 2, b = SLOT.h / 2, hole = new THREE.Path(); // oblong slot punch
  hole.moveTo(-a + b, -b); hole.lineTo(a - b, -b); hole.absarc(a - b, 0, b, -Math.PI / 2, Math.PI / 2, false); hole.lineTo(-a + b, b); hole.absarc(-a + b, 0, b, Math.PI / 2, Math.PI * 1.5, false);
  s.holes.push(hole); return s;
}

function buildCard(frontMap, backMap) {
  const shape = cardShape(), g = new THREE.Group();
  const core = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: CARD.t, bevelEnabled: false, curveSegments: 10 }).translate(0, 0, -CARD.t / 2),
    new THREE.MeshPhysicalMaterial({ color: 0xf2f2ec, roughness: .45, envMapIntensity: LIGHT.env })); // PVC edge
  const printGeo = () => { // printed face with the same rounded outline + slot; UVs span the whole card
    const geo = new THREE.ShapeGeometry(shape, 10), p = geo.attributes.position, uv = geo.attributes.uv;
    for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / CARD.w + .5, (p.getY(i) + CARD.h - CARD.top) / CARD.h);
    return geo;
  };
  const pvc = map => new THREE.MeshPhysicalMaterial({ map, roughness: .32, metalness: 0, clearcoat: .9, clearcoatRoughness: .1, envMapIntensity: LIGHT.env }); // laminated PVC
  const front = new THREE.Mesh(printGeo(), pvc(frontMap)), back = new THREE.Mesh(printGeo(), pvc(backMap));
  front.position.z = CARD.t / 2 + .0003; back.position.z = -CARD.t / 2 - .0003; back.rotation.y = Math.PI;
  g.add(core, front, back); return g;
}

// Crimp (clamps the strap end) → neck → swivel barrel → hook eye, with a split ring through the card slot. Origin = strap end, +y up.
function buildHardware() {
  const g = new THREE.Group();
  const steel = new THREE.MeshStandardMaterial({ color: 0xdde1e6, metalness: 1, roughness: .26, envMapIntensity: LIGHT.metal });
  const brushed = new THREE.MeshStandardMaterial({ color: 0xbfc4cc, metalness: 1, roughness: .4, envMapIntensity: LIGHT.metal });
  const part = (geo, m, y) => { const o = new THREE.Mesh(geo, m); o.position.y = y; g.add(o); return o; };
  const cyl = (r, h, m, y) => part(new THREE.CylinderGeometry(r, r, h, 24), m, y);
  part(slab(.17, .09, .02, .014), brushed, .012);   // crimp body (hides the strap end)
  part(slab(.178, .012, .026, .005), steel, .06);   // lip the strap exits through
  cyl(.014, .03, steel, -.045); cyl(.024, .008, steel, -.06); cyl(.019, .07, steel, -.098); cyl(.024, .008, steel, -.136); // neck, collar, swivel barrel, collar
  const eye = part(new THREE.TorusGeometry(.016, .005, 10, 24, Math.PI * 1.5), steel, -.152); eye.rotation.z = -Math.PI / 4; // hook
  const ring = part(new THREE.TorusGeometry(.03, .0065, 12, 32), steel, -HW + .03); ring.rotation.y = Math.PI / 2;          // split ring through the slot
  g.traverse(o => { if (o.isMesh) o.userData.card = true; }); // grabbing the hardware drags the card
  return g;
}

export function createIdModel(photoSrc) {
  const group = new THREE.Group();
  // The existing profile photo: portraitSrc() resolves to the real file, or the generated silhouette if it is missing.
  const photo = Object.assign(document.createElement('canvas'), { width: ID_PHOTO.w, height: ID_PHOTO.h }), pc = photo.getContext('2d');
  pc.fillStyle = '#14633d'; pc.fillRect(0, 0, ID_PHOTO.w, ID_PHOTO.h);
  const front = idFrontTex(photo), back = idBackTex(), ribbon = ribbonTex(), bump = weaveTex();
  [front, back, ribbon].forEach(t => { t.encoding = THREE.sRGBEncoding; });
  Promise.resolve(photoSrc).then(src => new Promise(ok => { const img = new Image(); img.onload = () => ok(img); img.onerror = () => ok(null); img.src = src; })).then(img => {
    if (!img) return; const k = Math.max(ID_PHOTO.w / img.width, ID_PHOTO.h / img.height), w = img.width * k, h = img.height * k;
    pc.drawImage(img, (ID_PHOTO.w - w) / 2, Math.min(0, (ID_PHOTO.h - h) * .2), w, h); front.redraw(); // bias toward the top so faces aren't cropped
    model.onPhoto?.();
  });

  const strap = new THREE.MeshStandardMaterial({ map: ribbon, bumpMap: bump, bumpScale: 1.5, roughness: .88, metalness: 0, envMapIntensity: .4 });
  const lanyard = createLanyard({ anchor: ANCHOR, length: DROP, width: WIDTH, tile: TILE, material: strap, rigid: RIGID, damp: REDUCED_MOTION ? .95 : .988 });
  const rigid = new THREE.Group(), card = buildCard(front, back); card.position.y = -HW;
  card.traverse(o => { if (o.isMesh) o.userData.card = true; });
  rigid.add(buildHardware(), card); group.add(lanyard.ribbon, rigid);

  const basis = new THREE.Matrix4();
  function pose() { const P = lanyard.pose; rigid.position.copy(P.pos); basis.makeBasis(P.r, P.u, P.f); rigid.quaternion.setFromRotationMatrix(basis); }
  pose();
  const model = { group, lanyard, rigid, card, step(dt) { lanyard.step(dt); pose(); } };
  return model;
}

export function mountIdCard(root) {
  const canvas = root.querySelector('canvas'), main = document.getElementById('c');
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true }); // throws w/o WebGL → main.js hides the ID
  renderer.setClearColor(0, 0); renderer.outputEncoding = THREE.sRGBEncoding;
  const scene = new THREE.Scene(); scene.environment = makeStudioEnv(renderer);
  scene.add(new THREE.AmbientLight(0xffffff, LIGHT.ambient));
  const key = new THREE.DirectionalLight(0xfff0dd, LIGHT.key); key.position.set(-2, 3, 4); scene.add(key);
  const model = createIdModel(portraitSrc('profile')); scene.add(model.group);
  const camera = new THREE.PerspectiveCamera(FOV, 1, .1, 40);

  const visible = () => root.getClientRects().length > 0; // display:none on phones
  function layout() {
    if (!visible()) return;
    const W = innerWidth, H = innerHeight, ppu = Math.min(H / VIEW_H, W * MAX_W_FRAC / CARD.w) * SIZE, viewH = H / ppu, sx = W - RIGHT_PX - CARD.w / 2 * ppu; // screen x of the strap
    renderer.setPixelRatio(Math.min(devicePixelRatio, W * H > 2.5e6 ? 1.5 : 2)); // the canvas covers the viewport: keep huge screens cheap
    renderer.setSize(W, H, false); camera.aspect = W / H; camera.updateProjectionMatrix();
    const cx = -(sx - W / 2) / ppu; camera.position.set(cx, 0, viewH / 2 / Math.tan(FOV * Math.PI / 360)); camera.lookAt(cx, 0, 0);
    wake();
  }

  // Render only while something moves: the loop sleeps once the strap has settled.
  let raf = 0, last = 0, calm = 0;
  function frame(now) {
    const dt = Math.min((now - last) / 1000, .05); last = now;
    model.step(dt); renderer.render(scene, camera);
    if (!model.lanyard.dragging && model.lanyard.energy() < 5e-5) { if (++calm > 20) { raf = 0; return; } } else calm = 0;
    raf = requestAnimationFrame(frame);
  }
  function wake() { calm = 0; if (!raf && visible() && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(frame); } }
  model.onPhoto = wake;
  addEventListener('resize', layout); document.addEventListener('visibilitychange', () => { if (document.hidden) { cancelAnimationFrame(raf); raf = 0; } else wake(); });
  layout();

  /* pointer: hit-test the card/strap ourselves (the overlay never catches pointer events) and swallow the event so the desk
     scene underneath doesn't also orbit or hover. The drag plane is the screen plane (z = 0). */
  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), pt = new THREE.Vector3();
  let active = true, grabbing = false, hovered = false;
  const aim = e => { ptr.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); ray.setFromCamera(ptr, camera); };
  const hit = e => { aim(e); return ray.intersectObject(model.group, true)[0] || null; };
  const end = () => { grabbing = false; model.lanyard.release(); main.style.cursor = ''; wake(); };

  addEventListener('pointerdown', e => {
    if (!active || e.button > 0 || !visible()) return;
    const h = hit(e); if (!h) return;
    e.stopPropagation(); e.preventDefault();
    model.lanyard.grab(h.point, !!h.object.userData.card); grabbing = true; main.style.cursor = 'grabbing'; wake();
  }, true);
  addEventListener('pointermove', e => {
    if (grabbing) { e.stopPropagation(); aim(e); if (ray.ray.intersectPlane(plane, pt)) model.lanyard.move(pt); return; }
    if (!active || !visible() || e.pointerType === 'touch') return;
    if (hit(e)) { e.stopPropagation(); main.style.cursor = 'grab'; hovered = true; } else if (hovered) { hovered = false; main.style.cursor = ''; }
  }, true);
  for (const t of ['pointerup', 'pointercancel']) addEventListener(t, e => { if (grabbing) { e.stopPropagation(); end(); } }, true);

  return { setActive(on) { active = on; if (!on && grabbing) end(); } }; // inactive while an object is focused (the ID is faded out)
}