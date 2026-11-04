/*
 * rig.js — scroll-driven camera, parallax, drag-to-rotate, chapter visibility.
 *
 * The page is a stack of tall "chapters" (one per world). Scroll position is mapped to a
 * float chapter index `c` using the REAL element positions, so the scene stays aligned
 * with the text even if a chapter's height changes:
 *
 *   first half of a chapter  -> camera holds at that world (text is pinned on screen)
 *   second half              -> smoothstep travel to the next world
 *
 * `c` is damped (state.cam) so jumping via the nav makes the camera fly instead of cut.
 */
(() => {
  'use strict';

  const Orbit = window.Orbit;
  if (!Orbit || !Orbit.THREE) return;
  const { THREE, util } = Orbit;
  const { clamp, clamp01, smooth } = util;

  Orbit.register('Charting the route', () => {
    const { camera, planets, defs, state } = Orbit;
    const root = document.documentElement;
    const canvas = document.getElementById('scene');
    const chapters = [...document.querySelectorAll('[data-chapter]')];
    const n = defs.length;
    if (chapters.length !== n) console.warn(`Orbit: ${chapters.length} chapters in HTML but ${n} worlds in the scene.`);

    let stops = [];
    let curve = null;
    let anchors = [];

    const tanHalf = () => Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));

    // Camera stop + look target per world. The look target is offset sideways so the planet
    // lands on the opposite side from the text (or in the top half on portrait screens).
    const layout = () => {
      const portrait = camera.aspect < 0.95;
      stops = defs.map((d) => {
        const dist = d.dist * (portrait ? 1.3 : 1);
        const halfH = tanHalf() * dist;
        const halfW = halfH * camera.aspect;
        const P = new THREE.Vector3(...d.pos);
        const C = P.clone().add(new THREE.Vector3(0, d.r * 0.18, dist));
        const L = P.clone();
        if (portrait) L.y -= halfH * 0.42;
        else L.x -= d.side * halfW * 0.46;
        return { C, L };
      });
      curve = new THREE.CatmullRomCurve3(stops.map((s) => s.C), false, 'centripetal');
      anchors = chapters.map((el) => el.getBoundingClientRect().top + window.scrollY);
    };
    layout();
    Orbit.resizers.add(layout);
    window.addEventListener('load', layout);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);
    Orbit.relayout = layout;

    // ---- Pointer parallax (mouse only) ---------------------------------------
    const pointer = { x: 0, y: 0, sx: 0, sy: 0 };
    window.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch') return;
      pointer.x = (e.clientX / innerWidth - 0.5) * 2;
      pointer.y = (e.clientY / innerHeight - 0.5) * 2;
    });

    // ---- Drag to rotate the world on screen ----------------------------------
    let drag = null;
    const activePlanet = () => planets[state.active];

    canvas.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: 0, t: performance.now() };
      state.dragDist = 0;
      const p = activePlanet();
      if (p) { p.dragging = true; p.drag = 0; }
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* synthetic events */ }
      root.classList.add('is-dragging');
    });

    canvas.addEventListener('pointermove', (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      const now = performance.now();
      const dt = Math.max((now - drag.t) / 1000, 0.001);
      drag.x = e.clientX;
      drag.y = e.clientY;
      drag.t = now;
      drag.moved += Math.abs(dx) + Math.abs(dy);
      state.dragDist = drag.moved;

      const p = activePlanet();
      if (!p) return;
      const yaw = dx * 0.006;
      p.body.rotation.y += yaw;
      p.body.rotation.x = clamp(p.body.rotation.x + dy * 0.003, p.home.x - 0.6, p.home.x + 0.6);
      p.drag = 0.6 * p.drag + 0.4 * (yaw / dt); // velocity for the release inertia
    });

    const endDrag = (e) => {
      if (!drag || (e && e.pointerId !== drag.id)) return;
      const p = activePlanet();
      if (p) {
        p.dragging = false;
        p.drag = clamp(p.drag, -6, 6);
      }
      drag = null;
      root.classList.remove('is-dragging');
    };
    canvas.addEventListener('pointerup', endDrag);
    canvas.addEventListener('pointercancel', endDrag);

    // ---- Per-frame ----------------------------------------------------------
    const pos = new THREE.Vector3();
    const look = new THREE.Vector3();
    let lastActive = -1;
    const shownV = new Array(n).fill(-1);

    // Settle the damped index on the very first frame so the page does not open mid-flight.
    let first = true;

    Orbit.hooks.add((dt, time) => {
      // 1. scroll -> float chapter index
      const y = window.scrollY;
      let i = 0;
      for (let k = 0; k < anchors.length; k += 1) if (y >= anchors[k] - 1) i = k;
      let target;
      if (i >= n - 1) {
        target = n - 1;
      } else {
        const span = Math.max(anchors[i + 1] - anchors[i], 1);
        const f = clamp01((y - anchors[i]) / span);
        target = i + smooth((f - 0.5) / 0.5);
      }
      if (first) { state.cam = target; first = false; }
      state.cam += (target - state.cam) * (1 - Math.exp(-dt * 3.2));
      const c = clamp(state.cam, 0, n - 1);

      // 2. camera
      curve.getPoint(c / (n - 1), pos);
      const ia = Math.floor(c);
      const ib = Math.min(ia + 1, n - 1);
      const e = c - ia;
      look.lerpVectors(stops[ia].L, stops[ib].L, e);

      pointer.sx += (pointer.x - pointer.sx) * (1 - Math.exp(-dt * 3));
      pointer.sy += (pointer.y - pointer.sy) * (1 - Math.exp(-dt * 3));
      const k = state.ambientK;
      const driftX = Math.sin(time * 0.17) * 0.18;
      const driftY = Math.cos(time * 0.13) * 0.12;
      camera.position.set(
        pos.x + (pointer.sx * 0.55) * k + driftX,
        pos.y + (-pointer.sy * 0.32) * k + driftY,
        pos.z,
      );
      camera.lookAt(look);

      // 3. which worlds render at all (the moon shader is the expensive one)
      planets.forEach((p, idx) => { p.group.visible = Math.abs(c - idx) < 1.35; });

      // 4. text chapters fade with proximity of the camera
      chapters.forEach((el, idx) => {
        const v = clamp01(1 - Math.abs(c - idx) * 2.4);
        if (Math.abs(v - shownV[idx]) > 0.004) {
          shownV[idx] = v;
          el.style.setProperty('--v', v.toFixed(3));
          el.dataset.active = v > 0.55 ? 'true' : 'false';
        }
      });

      // 5. HUD bookkeeping
      state.active = Math.round(c);
      root.style.setProperty('--p', (c / (n - 1)).toFixed(4));
      if (state.active !== lastActive) {
        lastActive = state.active;
        root.dispatchEvent(new CustomEvent('orbit:chapter', { detail: { index: state.active } }));
      }
    });

    Orbit.resetPositions = () => {
      planets.forEach((p) => p.reset());
      pointer.x = pointer.y = 0;
    };
  });
})();
