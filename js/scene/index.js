// Scene runtime: renderer, loop, picking, focus. Camera near = .5 (closest focus distance is ~1.9): more depth precision, fewer z-fight artefacts. Knows nothing about *which* objects exist.
import THREE from './three.js';
import { REDUCED_MOTION, FOG } from '../config.js';
import { themeTarget } from '../theme.js';
import { mixTheme } from './palette.js';
import { createCameraRig } from './camera.js';
import PROPS from './props.js';
import OBJECTS from './objects/index.js';

export function createScene(canvas, { onPick, onHover, accents = {} }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', alpha: true });
  renderer.setClearColor(0, 0); // CSS paints the brown gradient behind the canvas // throws w/o WebGL → main.js fallback
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; // soft shadow edges
  let markReady; const ready = new Promise(r => (markReady = r)); // resolves once the first frame is on screen
  const scene = new THREE.Scene(); scene.fog = new THREE.Fog(0, FOG.near, FOG.far);
  const camera = new THREE.PerspectiveCamera(50, 1, .5, 80), rig = createCameraRig(camera);

  const props = PROPS.map(b => b()), objects = OBJECTS.map(b => b()), all = [...props, ...objects], byId = {};
  props.forEach(p => {
    if (p.x !== undefined) { p.group.position.set(p.x, 0, p.z); p.group.rotation.y = p.ry || 0; }
    if (p.cast) p.group.traverse(n => { if (n.isMesh) n.castShadow = n.receiveShadow = true; });
    scene.add(p.group);
  });
  objects.forEach(o => {
    const g = o.group; byId[o.id] = o;
    g.position.set(o.x, 0, o.z); g.rotation.y = o.ry || 0; g.userData = { id: o.id, base: g.scale.x };
    g.traverse(n => { if (n.isMesh) n.castShadow = n.receiveShadow = true; });
    scene.add(g);
  });
  /* glow rings: one flat ring on the desk under every object that has an accent. Normal blending (not additive) so it reads on
     both the dark and the light theme; fog off so distance doesn't wash it out. Not parented to the object, so hover-scale
     doesn't resize it and it is never raycast (picking only tests `roots`). */
  const RING_MAX = .8, box3 = new THREE.Box3(), sz = new THREE.Vector3(), ctr = new THREE.Vector3(), glow = [];
  objects.forEach(o => {
    if (!accents[o.id]) return;
    box3.setFromObject(o.group); box3.getSize(sz); box3.getCenter(ctr);
    const rx = sz.x / 2 * 1.1 + .25, rz = sz.z / 2 * 1.1 + .25; // an ellipse that follows the object's footprint, not a loose circle
    const m = new THREE.Mesh(new THREE.RingGeometry(rx - .14, rx, 64),
      new THREE.MeshBasicMaterial({ color: accents[o.id], transparent: true, opacity: 0, depthWrite: false, fog: false, side: THREE.DoubleSide }));
    m.rotation.x = -Math.PI / 2; m.scale.y = rz / rx; m.position.set(ctr.x, .03, ctr.z); m.visible = false; scene.add(m); // y .03: above the pad (.02), below sheet/object tops
    glow.push({ id: o.id, m, a: 0 });
  });
  let pinned = null; // set from outside (a nav chip being hovered)

  const paper = all.flatMap(d => d.paper || []);
  const surfaces = objects.flatMap(o => (o.surfaces || []).map(s => ({ ...s, owner: o.id })));

  /* theme */
  const bg = new THREE.Color();
  function applyTheme(t) {
    mixTheme('bg', t, bg); scene.fog.color.copy(bg);
    all.forEach(d => d.onTheme?.(t));
    paper.forEach(m => m.color.setScalar(.8 + .2 * t));
  }
  applyTheme(0);

  /* focus. Surface textures are generated lazily and cached.
     focused → full texture; unfocused → optional `preview` (legible at desk distance), else the cheap `rest`. */
  let cur = null, hover = null, aspect = 1;
  function skin() {
    surfaces.forEach(s => {
      const idle = s.preview ? (s.previewTex ||= s.preview()) : s.rest;
      const want = s.owner === cur ? (s.fullTex ||= s.full()) : idle;
      if (s.material.map !== want) { s.material.map = want; s.material.needsUpdate = true; }
    });
  }
  function focus(id) {
    if (cur && cur !== id) byId[cur].onBlur?.();
    cur = id; if (id) byId[id].onFocus?.();
    if (id) skin(); else setTimeout(() => { if (!cur) skin(); }, 700); // swap back after the zoom-out finishes
    rig.aim(id ? byId[id] : null, aspect);
  }
  skin(); // apply previews on load (must run after `cur` is declared)
  objects.forEach(o => { if (o.book) o.book.onMove = () => { if (cur === o.id) rig.aim(o, aspect); }; }); // e.g. the sheet slid: re-aim; the rig eases there

  /* resize */
  function resize() {
    renderer.setSize(innerWidth, innerHeight, false); aspect = innerWidth / innerHeight;
    camera.aspect = aspect; camera.updateProjectionMatrix(); rig.aim(cur ? byId[cur] : null, aspect);
  }
  addEventListener('resize', resize); resize(); rig.snap();

  /* picking */
  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2(), roots = objects.map(o => o.group), mouse = { x: 0, y: 0 };
  let down = null, lastPt = null, dragging = false;
  function pickHit(e) { // -> { id, hit } for the object under the pointer (hit = the raycast intersection: .object, .uv, .point), or null
    ptr.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); ray.setFromCamera(ptr, camera);
    const hit = ray.intersectObjects(roots, true)[0]; if (!hit) return null;
    let o = hit.object; while (o && !o.userData?.id) o = o.parent;
    return o ? { id: o.userData.id, hit } : null;
  }
  const pick = e => pickHit(e)?.id ?? null;
  canvas.addEventListener('pointermove', e => {
    mouse.x = e.clientX / innerWidth - .5; mouse.y = e.clientY / innerHeight - .5;
    if (down && !cur) { // drag to orbit (camera.js clamps it so you can never reach the back of the desk)
      if (dragging || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 6) { dragging = true; rig.rotate(e.clientX - lastPt[0], e.clientY - lastPt[1]); lastPt = [e.clientX, e.clientY]; canvas.style.cursor = 'grabbing'; return; }
    }
    if (e.pointerType === 'touch') return;
    if (cur) { // focused: let the object say whether the pointer is over something tappable (e.g. a contact row on the phone)
      const p = pickHit(e), o = byId[cur], over = p?.id === cur && !!o.hover?.(p.hit);
      if (p?.id !== cur) o.hover?.(null);
      hover = null; canvas.style.cursor = over ? 'pointer' : 'default'; onHover(null); return;
    }
    hover = pick(e); canvas.style.cursor = hover ? 'pointer' : 'default'; onHover(hover, e.clientX, e.clientY);
  });
  canvas.addEventListener('pointerdown', e => {
    down = lastPt = [e.clientX, e.clientY]; dragging = false; canvas.setPointerCapture?.(e.pointerId);
  });
  canvas.addEventListener('pointerup', e => {
    const d = down; down = null; dragging = false; canvas.style.cursor = 'default';
    if (!d || Math.hypot(e.clientX - d[0], e.clientY - d[1]) > 6) return; // a drag, not a click
    const p = pickHit(e), id = p?.id ?? null;
    if (id && id === cur && byId[id].onClick) byId[id].onClick(p.hit); else onPick(id);
  });
  canvas.addEventListener('pointercancel', () => { down = null; dragging = false; });

  /* loop */
  let last = performance.now(), raf = 0, LT = 0;
  function frame() {
    raf = requestAnimationFrame(frame);
    const now = performance.now(), dt = Math.min((now - last) / 1000, .05); last = now;
    rig.step(REDUCED_MOTION ? 1 : 1 - Math.exp(-dt * 3.4), !cur, mouse.x, mouse.y);
    objects.forEach(o => { const g = o.group, s = g.userData.base * (hover === o.id ? 1.07 : 1); g.scale.setScalar(g.scale.x + (s - g.scale.x) * Math.min(1, dt * 10)); });
    all.forEach(d => d.update?.(dt));
    glow.forEach(g => { // lit by pointer hover OR chip hover, never while an object is focused
      const want = !cur && (hover === g.id || pinned === g.id) ? RING_MAX : 0;
      g.a += (want - g.a) * Math.min(1, dt * (REDUCED_MOTION ? 60 : 12));
      if (Math.abs(g.a - want) < .004) g.a = want;
      g.m.material.opacity = g.a; g.m.visible = g.a > 0;
    });
    const target = themeTarget();
    if (LT !== target) { LT += (target - LT) * Math.min(1, dt * (REDUCED_MOTION ? 60 : 4)); if (Math.abs(LT - target) < .002) LT = target; applyTheme(LT); }
    renderer.render(scene, camera);
    if (markReady) { const done = markReady; markReady = null; requestAnimationFrame(() => { performance.measure('scene-build+first-frame'); done(); }); }
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) cancelAnimationFrame(raf); else { last = performance.now(); frame(); } });
  frame();

  return { ready, focus, highlight: id => { pinned = id; }, play: id => byId[id]?.play?.(), hasView: id => !!byId[id]?.view, bookOf: id => byId[id]?.book };
}