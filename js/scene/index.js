// Scene runtime: renderer, loop, picking, focus. Knows nothing about *which* objects exist.
import THREE from './three.js';
import { REDUCED_MOTION, FOG } from '../config.js';
import { themeTarget } from '../theme.js';
import { mixTheme } from './palette.js';
import { createCameraRig } from './camera.js';
import PROPS from './props.js';
import OBJECTS from './objects/index.js';

export function createScene(canvas, { onPick, onHover }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', alpha: true });
  renderer.setClearColor(0, 0); // CSS paints the brown gradient behind the canvas // throws w/o WebGL → main.js fallback
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; // soft shadow edges
  const scene = new THREE.Scene(); scene.fog = new THREE.Fog(0, FOG.near, FOG.far);
  const camera = new THREE.PerspectiveCamera(50, 1, .1, 80), rig = createCameraRig(camera);

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
    cur = id;
    if (id) skin(); else setTimeout(() => { if (!cur) skin(); }, 700); // swap back after the zoom-out finishes
    rig.aim(id ? byId[id] : null, aspect);
  }
  skin(); // apply previews on load (must run after `cur` is declared)

  /* resize */
  function resize() {
    renderer.setSize(innerWidth, innerHeight, false); aspect = innerWidth / innerHeight;
    camera.aspect = aspect; camera.updateProjectionMatrix(); rig.aim(cur ? byId[cur] : null, aspect);
  }
  addEventListener('resize', resize); resize(); rig.snap();

  /* picking */
  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2(), roots = objects.map(o => o.group), mouse = { x: 0, y: 0 };
  let down = null, lastPt = null, dragging = false;
  function pick(e) {
    ptr.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); ray.setFromCamera(ptr, camera);
    const h = ray.intersectObjects(roots, true)[0]; if (!h) return null;
    let o = h.object; while (o && !o.userData?.id) o = o.parent;
    return o ? o.userData.id : null;
  }
  canvas.addEventListener('pointermove', e => {
    mouse.x = e.clientX / innerWidth - .5; mouse.y = e.clientY / innerHeight - .5;
    if (down && !cur) { // drag to orbit (camera.js clamps it so you can never reach the back of the desk)
      if (dragging || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 6) { dragging = true; rig.rotate(e.clientX - lastPt[0], e.clientY - lastPt[1]); lastPt = [e.clientX, e.clientY]; canvas.style.cursor = 'grabbing'; return; }
    }
    if (e.pointerType === 'touch') return;
    hover = cur ? null : pick(e); canvas.style.cursor = hover ? 'pointer' : 'default'; onHover(hover, e.clientX, e.clientY);
  });
  canvas.addEventListener('pointerdown', e => {
    down = lastPt = [e.clientX, e.clientY]; dragging = false; canvas.setPointerCapture?.(e.pointerId);
  });
  canvas.addEventListener('pointerup', e => {
    const d = down; down = null; dragging = false; canvas.style.cursor = 'default';
    if (!d || Math.hypot(e.clientX - d[0], e.clientY - d[1]) > 6) return; // a drag, not a click
    const id = pick(e);
    if (id && id === cur && byId[id].onClick) byId[id].onClick(); else onPick(id);
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
    const target = themeTarget();
    if (LT !== target) { LT += (target - LT) * Math.min(1, dt * (REDUCED_MOTION ? 60 : 4)); if (Math.abs(LT - target) < .002) LT = target; applyTheme(LT); }
    renderer.render(scene, camera);
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) cancelAnimationFrame(raf); else { last = performance.now(); frame(); } });
  frame();

  return { focus, play: id => byId[id]?.play?.(), hasView: id => !!byId[id]?.view, bookOf: id => byId[id]?.book };
}