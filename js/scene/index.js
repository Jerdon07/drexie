// Scene runtime: renderer, loop, picking, focus. Knows nothing about *which* objects exist.
import THREE from './three.js';
import { REDUCED_MOTION, FOG } from '../config.js';
import { themeTarget } from '../theme.js';
import { mixTheme } from './palette.js';
import { createCameraRig } from './camera.js';
import PROPS from './props.js';
import OBJECTS from './objects/index.js';

export function createScene(canvas, { onPick, onHover }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' }); // throws w/o WebGL → main.js fallback
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  const scene = new THREE.Scene(); scene.fog = new THREE.Fog(0, FOG.near, FOG.far);
  const camera = new THREE.PerspectiveCamera(50, 1, .1, 80), rig = createCameraRig(camera);

  const props = PROPS.map(b => b()), objects = OBJECTS.map(b => b()), all = [...props, ...objects], byId = {};
  props.forEach(p => scene.add(p.group));
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
    mixTheme('bg', t, bg); renderer.setClearColor(bg); scene.fog.color.copy(bg);
    all.forEach(d => d.onTheme?.(t));
    paper.forEach(m => m.color.setScalar(.8 + .2 * t));
  }
  applyTheme(0);

  /* focus. Surface textures are generated lazily on first focus, then cached. */
  let cur = null, hover = null, aspect = 1;
  function skin() {
    surfaces.forEach(s => {
      const want = s.owner === cur ? (s.fullTex ||= s.full()) : s.rest;
      if (s.material.map !== want) { s.material.map = want; s.material.needsUpdate = true; }
    });
  }
  function focus(id) {
    if (cur && cur !== id) byId[cur].onBlur?.();
    cur = id;
    if (id) skin(); else setTimeout(() => { if (!cur) skin(); }, 700); // swap back after the zoom-out finishes
    rig.aim(id ? byId[id] : null, aspect);
  }

  /* resize */
  function resize() {
    renderer.setSize(innerWidth, innerHeight, false); aspect = innerWidth / innerHeight;
    camera.aspect = aspect; camera.updateProjectionMatrix(); rig.aim(cur ? byId[cur] : null, aspect);
  }
  addEventListener('resize', resize); resize(); rig.snap();

  /* picking */
  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2(), roots = objects.map(o => o.group), mouse = { x: 0, y: 0 };
  let down = null;
  function pick(e) {
    ptr.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); ray.setFromCamera(ptr, camera);
    let o = ray.intersectObjects(roots, true)[0]?.object;
    while (o && !o.userData?.id) o = o.parent;
    return o ? o.userData.id : null;
  }
  canvas.addEventListener('pointermove', e => {
    mouse.x = e.clientX / innerWidth - .5; mouse.y = e.clientY / innerHeight - .5;
    if (e.pointerType === 'touch') return;
    hover = cur ? null : pick(e); canvas.style.cursor = hover ? 'pointer' : 'default'; onHover(hover, e.clientX, e.clientY);
  });
  canvas.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY]; });
  canvas.addEventListener('pointerup', e => {
    const d = down; down = null;
    if (!d || Math.hypot(e.clientX - d[0], e.clientY - d[1]) > 6) return; // a drag, not a click
    const id = pick(e);
    if (id && id === cur && byId[id].onClick) byId[id].onClick(); else onPick(id);
  });

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

  return { focus, hasView: id => !!byId[id]?.view, bookOf: id => byId[id]?.book };
}
