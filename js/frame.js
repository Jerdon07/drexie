// Hanging portrait frame (right side of the screen): a slim light-oak frame on a braided rope hanger that drops from above the top edge.
// It has its own small transparent WebGL canvas, so it gets its own lighting without touching the desk scene.
// Pull the frame or the cord: ONLY the cord gives (js/scene/lanyard.js). The frame + hanger are one rigid pose: they are moved
// and tilted, never scaled or bent.
import THREE from './scene/three.js';
import { REDUCED_MOTION } from './config.js';
import { portraitSrc } from './images.js';
import { frameWoodTex, ropeTex, plaqueTex, FRAME_PHOTO } from './scene/textures.js';
import { createLanyard } from './scene/lanyard.js';
import { makeStudioEnv } from './scene/env.js';

// World units. `border` = moulding width, `mat` = paper margin; the photo opening is 4:5 and `foot` is the extra mat below it for the nameplate.
const FRAME = { w: .5, border: .026, mat: .046, foot: .07, depth: .032 };
const OPEN_W = FRAME.w - 2 * FRAME.border, PHOTO_W = OPEN_W - 2 * FRAME.mat, PHOTO_H = PHOTO_W * FRAME_PHOTO.h / FRAME_PHOTO.w;
FRAME.h = PHOTO_H + 2 * FRAME.border + FRAME.mat + FRAME.foot;
const HW = .15;                                    // cord end (the ring) → top edge of the frame
const HOOK_X = FRAME.w * .34;                      // where the two hanger cords meet the top edge
const WIDTH = .014;                                // cord thickness
const RIGID = HW + FRAME.h / 2;                    // cord end → frame centre
const TOP_Y = .46, CARD_Y = -.05;                  // anchor reference height; frame centre at rest (a little below screen centre, to show the hanger)
const MAX_H_FRAC = .7, MAX_W_FRAC = .28, NARROW_W_FRAC = .23; // share of viewport height / width the frame may take; narrow = aspect < 1.5, where the desk fills the width
const ANCHOR = new THREE.Vector3(0, TOP_Y + 1.1, 0); // hidden above the top edge: the cord's visible part is just its lower end
const DROP = (ANCHOR.y - (CARD_Y + RIGID)) / 1.03; // rest length (it sits ~3% stretched under the frame's weight)
const TILE = .06;                                  // cord length per texture repeat
const FOV = 20, RIGHT_PX = 28;                     // RIGHT_PX: gap between the frame and the right edge
const LIGHT = { ambient: .62, key: .55, env: .2, metal: .75 }; // tune here if the frame reads too dark / too hot

const rect = (s, w, h) => { s.moveTo(-w / 2, -h / 2); s.lineTo(w / 2, -h / 2); s.lineTo(w / 2, h / 2); s.lineTo(-w / 2, h / 2); s.lineTo(-w / 2, -h / 2); return s; };
// A rectangular ring with bevelled edges, `d` deep, centred on z = 0.
function moulding(w, h, border, d, bevel, material) {
  const s = rect(new THREE.Shape(), w - 2 * bevel, h - 2 * bevel);
  s.holes.push(rect(new THREE.Path(), w - 2 * border + 2 * bevel, h - 2 * border + 2 * bevel));
  const geo = new THREE.ExtrudeGeometry(s, { depth: d - 2 * bevel, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 4 }).translate(0, 0, -d / 2 + bevel);
  return new THREE.Mesh(geo, material);
}

// Origin = frame centre.
function buildFrame(photoMap, plaqueMap, grain) {
  const g = new THREE.Group(), { w, h, border, mat, foot, depth } = FRAME;
  const wood = (map, color) => new THREE.MeshStandardMaterial({ map, color, roughness: .55, metalness: 0, envMapIntensity: LIGHT.env });
  const add = (o, z, y = 0) => { o.position.set(0, y, z); g.add(o); return o; };
  const flat = (pw, ph, m) => new THREE.Mesh(new THREE.PlaneGeometry(pw, ph), m);
  add(moulding(w, h, border, depth, .004, wood(grain, 0xffffff)), 0);
  add(moulding(w - 2 * border + .012, h - 2 * border + .012, .01, depth * .55, .002, wood(grain, 0xd8c3a6)), .002); // slightly shaded inner lip
  add(new THREE.Mesh(new THREE.BoxGeometry(w - border, h - border, .008), wood(grain, 0xb09676)), -depth / 2 + .006); // backing board
  add(flat(w - 2 * border, h - 2 * border, new THREE.MeshStandardMaterial({ color: 0xf6f4ef, roughness: .95 })), -.004);  // paper mat
  const photoY = h / 2 - border - mat - PHOTO_H / 2;
  add(flat(PHOTO_W, PHOTO_H, new THREE.MeshBasicMaterial({ map: photoMap })), -.002, photoY); // unlit: the photo keeps its true colours
  add(flat(PHOTO_W * .8, foot * .62, new THREE.MeshBasicMaterial({ map: plaqueMap, transparent: true })), -.002, -h / 2 + border + foot / 2);
  return g;
}

// A thin rod from a to b (the two hanger cords).
function rod(a, b, r, material) {
  const d = b.clone().sub(a), o = new THREE.Mesh(new THREE.CylinderGeometry(r, r, d.length(), 10), material);
  o.position.copy(a).addScaledVector(d, .5); o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); return o;
}

// Ring at the cord end, two cords down to the top edge, and a brushed-silver eyelet at each. Origin = cord end, +y up.
function buildHanger(cord) {
  const g = new THREE.Group(), metal = new THREE.MeshStandardMaterial({ color: 0xd5d8dc, metalness: 1, roughness: .42, envMapIntensity: LIGHT.metal });
  const torus = (r, t, x, y) => { const o = new THREE.Mesh(new THREE.TorusGeometry(r, t, 10, 28), metal); o.position.set(x, y, 0); g.add(o); };
  torus(.018, .005, 0, -.012);
  for (const s of [-1, 1]) { g.add(rod(new THREE.Vector3(0, -.026, 0), new THREE.Vector3(s * HOOK_X, -HW + .008, 0), WIDTH * .32, cord)); torus(.009, .0035, s * HOOK_X, -HW + .006); }
  return g;
}

export function createFrameModel(photoSrc) {
  const group = new THREE.Group();
  // The existing profile photo: portraitSrc() resolves to the real file, or the generated silhouette if it is missing.
  const photo = Object.assign(document.createElement('canvas'), { width: FRAME_PHOTO.w, height: FRAME_PHOTO.h }), pc = photo.getContext('2d');
  const photoMap = new THREE.CanvasTexture(photo); photoMap.anisotropy = 8;
  const grain = frameWoodTex(), plaque = plaqueTex(), rope = ropeTex();
  [photoMap, grain, plaque, rope].forEach(t => { t.encoding = THREE.sRGBEncoding; });
  grain.repeat.set(1.6, 1.6); // extrude UVs are in world units
  Promise.resolve(photoSrc).then(src => new Promise(ok => { const img = new Image(); img.onload = () => ok(img); img.onerror = () => ok(null); img.src = src; })).then(img => {
    if (!img) return; const k = Math.max(FRAME_PHOTO.w / img.width, FRAME_PHOTO.h / img.height), w = img.width * k, h = img.height * k;
    pc.imageSmoothingQuality = 'high'; pc.drawImage(img, (FRAME_PHOTO.w - w) / 2, Math.min(0, (FRAME_PHOTO.h - h) * .2), w, h); photoMap.needsUpdate = true; // bias toward the top so faces aren't cropped
    model.onPhoto?.();
  });

  const cord = new THREE.MeshStandardMaterial({ map: rope, roughness: .9, metalness: 0 });
  const lanyard = createLanyard({ anchor: ANCHOR, length: DROP, width: WIDTH, tile: TILE, material: cord, rigid: RIGID, damp: REDUCED_MOTION ? .95 : .988 });
  const rigid = new THREE.Group(), frame = buildFrame(photoMap, plaque, grain); frame.position.y = -RIGID;
  rigid.add(buildHanger(cord), frame); group.add(lanyard.ribbon, rigid);
  rigid.traverse(o => { if (o.isMesh) o.userData.frame = true; }); // grabbing the frame or hanger drags the frame

  const basis = new THREE.Matrix4();
  function pose() { const P = lanyard.pose; rigid.position.copy(P.pos); basis.makeBasis(P.r, P.u, P.f); rigid.quaternion.setFromRotationMatrix(basis); }
  pose();
  const model = { group, lanyard, rigid, step(dt) { lanyard.step(dt); pose(); } };
  return model;
}

export function mountFrame(root) {
  const canvas = root.querySelector('canvas'), main = document.getElementById('c');
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true }); // throws w/o WebGL → main.js hides the frame
  renderer.setClearColor(0, 0); renderer.outputEncoding = THREE.sRGBEncoding;
  const scene = new THREE.Scene(); scene.environment = makeStudioEnv(renderer);
  scene.add(new THREE.AmbientLight(0xffffff, LIGHT.ambient));
  const key = new THREE.DirectionalLight(0xfff0dd, LIGHT.key); key.position.set(-2, 3, 4); scene.add(key);
  const model = createFrameModel(portraitSrc('profile')); scene.add(model.group);
  const camera = new THREE.PerspectiveCamera(FOV, 1, .1, 40);

  const visible = () => root.getClientRects().length > 0; // display:none on phones
  function layout() {
    if (!visible()) return;
    const W = innerWidth, H = innerHeight, ppu = Math.min(H * MAX_H_FRAC / FRAME.h, W * (W / H < 1.5 ? NARROW_W_FRAC : MAX_W_FRAC) / FRAME.w), viewH = H / ppu, sx = W - RIGHT_PX - FRAME.w / 2 * ppu; // screen x of the cord
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

  /* pointer: hit-test the frame/cord ourselves (the overlay never catches pointer events) and swallow the event so the desk
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
    model.lanyard.grab(h.point, !!h.object.userData.frame); grabbing = true; main.style.cursor = 'grabbing'; wake();
  }, true);
  addEventListener('pointermove', e => {
    if (grabbing) { e.stopPropagation(); aim(e); if (ray.ray.intersectPlane(plane, pt)) model.lanyard.move(pt); return; }
    if (!active || !visible() || e.pointerType === 'touch') return;
    if (hit(e)) { e.stopPropagation(); main.style.cursor = 'grab'; hovered = true; } else if (hovered) { hovered = false; main.style.cursor = ''; }
  }, true);
  for (const t of ['pointerup', 'pointercancel']) addEventListener(t, e => { if (grabbing) { e.stopPropagation(); end(); } }, true);

  return { setActive(on) { active = on; if (!on && grabbing) end(); } }; // inactive while an object is focused (the frame is faded out)
}