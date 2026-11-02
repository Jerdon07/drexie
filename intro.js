/*
 * intro.js — ~5s Three.js intro: chaos -> order, across the WHOLE viewport.
 *
 *  0.0-0.8s  particles fade in across the entire screen and drift
 *  0.8-2.4s  they spiral in and form the "DJ" initials, centered on the screen
 *  2.4-3.0s  hold the initials (shimmer)
 *  3.0-3.55s initials collapse into the core of the stack (at the stage center)
 *  2.8-4.0s  ERP icons streak in toward the same point
 *  3.7s      HTML hero reveal fires (intro:reveal)
 *  3.9-5.0s  glass layers materialize while spinning in, core flashes, icons burst out
 *  4.25s     the stack glides from the stage center to its dock
 *  5.0s      cleanup (intro:done)
 *
 * The particles live in their own full-viewport orthographic scene, rendered after the
 * stage pass, so they are not clipped to the monolith's scissor rectangle. Runs on the
 * shared clock in script.js (portfolioThree.frameHooks): exactly one timeline.
 */
(() => {
  const html = document.documentElement;
  const skipButton = document.querySelector('.intro-skip');
  const stage = document.querySelector('.monolith-stage');
  const api = window.portfolioThree;
  const emit = (name) => window.dispatchEvent(new Event(name));

  // Not pending (reduced motion / already seen this session): nothing to do.
  if (!html.classList.contains('intro-pending')) {
    if (skipButton) skipButton.hidden = true;
    return;
  }

  // WebGL or the monolith failed to load: never leave the page hidden.
  if (!api || !api.monolith || !api.frameHooks || !stage) {
    if (skipButton) skipButton.hidden = true;
    emit('intro:reveal');
    emit('intro:done');
    return;
  }

  const { THREE, renderer, frameHooks, icons, monolith: m } = api;
  const VIEW_H = 10; // same ortho height as the icon camera in script.js
  const isNarrow = innerWidth <= 760;

  const INTRO = {
    duration: 5.0,
    reveal: 3.7,
    skipSpeed: 8,
    particleCount: isNarrow ? 1800 : 3400,
    particlePx: 2.4, // point size in CSS pixels (scaled by the renderer's pixel ratio)
    textWidthFraction: isNarrow ? 0.86 : 0.62, // initials width as a share of the viewport width
    coreRadius: 0.22, // collapse target radius, in monolith-scene units
    iconBaseScale: 1.22,
    iconBaseOpacity: 0.72,
    spinTurns: 5, // radians of extra yaw the stack sheds while materializing
    camera: { from: 9.4, to: 8 },
    beats: {
      fadeIn: 0.6,
      gatherStart: 0.8,
      gatherLength: 1.0,
      gatherStagger: 0.5,
      collapseStart: 3.0,
      collapseLength: 0.55,
      collapseStagger: 0.2,
      fadeOutStart: 4.05,
      fadeOutLength: 0.45,
      iconInStart: 2.8,
      iconInLength: 0.9,
      iconOutStart: 3.95,
      iconOutLength: 1.05,
      shellStart: 3.9,
      shellLength: 1.1,
      coreStart: 4.0,
      coreLength: 0.9,
      flashStart: 3.95,
      flashLength: 0.65,
      dockStart: 4.25, // the stack glides from the stage center to its docked spot
    },
  };

  const clamp01 = (v) => Math.min(1, Math.max(0, v));
  const ease = {
    outCubic: (v) => 1 - ((1 - v) ** 3),
    inCubic: (v) => v ** 3,
    inOutCubic: (v) => (v < 0.5 ? 4 * v ** 3 : 1 - ((-2 * v + 2) ** 3) / 2),
    outBack: (v) => {
      const c1 = 1.70158;
      const c3 = c1 + 1;
      return 1 + c3 * ((v - 1) ** 3) + c1 * ((v - 1) ** 2);
    },
  };

  // ---- Text -> point cloud (reusable for any future morph target) ----------
  const sampleTextToPoints = (text, count, worldWidth) => {
    const w = 420;
    const h = 200;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const out = new Float32Array(count * 3);
    if (!ctx) return out;

    ctx.fillStyle = '#fff';
    ctx.font = 'italic 700 170px Georgia, "Times New Roman", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, w / 2, h / 2 + 8);

    const data = ctx.getImageData(0, 0, w, h).data;
    const hits = [];
    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        if (data[((y * w) + x) * 4 + 3] > 128) hits.push(x, y);
      }
    }
    const n = hits.length / 2;
    if (!n) return out;

    for (let i = n - 1; i > 0; i -= 1) { // Fisher-Yates over coordinate pairs
      const j = Math.floor(Math.random() * (i + 1));
      [hits[i * 2], hits[j * 2]] = [hits[j * 2], hits[i * 2]];
      [hits[i * 2 + 1], hits[j * 2 + 1]] = [hits[j * 2 + 1], hits[i * 2 + 1]];
    }

    const scale = worldWidth / w;
    for (let i = 0; i < count; i += 1) {
      const k = (i % n) * 2;
      out[i * 3] = (hits[k] - w / 2) * scale + (Math.random() - 0.5) * scale;
      out[i * 3 + 1] = (h / 2 - hits[k + 1]) * scale + (Math.random() - 0.5) * scale;
      out[i * 3 + 2] = (Math.random() - 0.5) * 0.4;
    }
    return out;
  };

  // ---- Full-viewport particle scene ---------------------------------------
  const introScene = new THREE.Scene();
  const introCamera = new THREE.OrthographicCamera(-1, 1, VIEW_H / 2, -VIEW_H / 2, 0.1, 100);
  introCamera.position.z = 10;

  const viewWidthNow = () => VIEW_H * (innerWidth / innerHeight);
  const startWidth = viewWidthNow();
  const textWidth = startWidth * INTRO.textWidthFraction;

  const N = INTRO.particleCount;
  const cloud = new Float32Array(N * 3);
  const core = new Float32Array(N * 3); // unit-sphere offsets, scaled to the core radius per frame
  const delay = new Float32Array(N);
  const phase = new Float32Array(N);
  const positions = new Float32Array(N * 3);
  const colors = new Float32Array(N * 3);
  const dj = sampleTextToPoints('DJ', N, textWidth);

  const violet = new THREE.Color(0xb9a2ff);
  const blue = new THREE.Color(0x75dfff);
  for (let i = 0; i < N; i += 1) {
    const o = i * 3;
    // Scattered over the entire screen (a little past the edges so the drift never exposes a gap).
    cloud[o] = (Math.random() - 0.5) * startWidth * 1.08;
    cloud[o + 1] = (Math.random() - 0.5) * VIEW_H * 1.08;
    cloud[o + 2] = (Math.random() - 0.5) * 2;

    const r = Math.cbrt(Math.random());
    const t2 = Math.random() * Math.PI * 2;
    const z2 = Math.random() * 2 - 1;
    const p2 = Math.sqrt(1 - z2 * z2);
    core[o] = r * p2 * Math.cos(t2);
    core[o + 1] = r * z2;
    core[o + 2] = r * p2 * Math.sin(t2);

    delay[i] = Math.random() * INTRO.beats.gatherStagger;
    phase[i] = Math.random() * Math.PI * 2;
    const c = violet.clone().lerp(blue, Math.random());
    colors[o] = c.r;
    colors[o + 1] = c.g;
    colors[o + 2] = c.b;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const pointsMaterial = new THREE.PointsMaterial({
    size: INTRO.particlePx * Math.min(renderer.getPixelRatio(), 1.5),
    vertexColors: true,
    transparent: true,
    opacity: 0,
    sizeAttenuation: false, // constant pixel size: this is a flat overlay
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(geometry, pointsMaterial);
  points.frustumCulled = false; // positions are rewritten every frame
  introScene.add(points);

  // ---- Setup of the real monolith for the intro ---------------------------
  m.glassMaterial.transparent = true;
  m.glassMaterial.opacity = 0;
  m.glassMaterial.needsUpdate = true;
  m.shell.visible = false;
  m.core.visible = false;
  m.edges.forEach((edge) => { edge.material.opacity = 0; });

  // ---- Lifecycle state (declared up front; the render callback reads `finished`) ----
  let elapsed = 0;
  let previous = null;
  let speed = 1;
  let revealed = false;
  let finished = false;
  let removeRenderCallback = () => {};

  const tmp = new THREE.Vector3();
  const spot = { x: 0, y: 0, unit: 1 }; // monolith center and scene-unit size, in ortho world units

  // Where the monolith core is on screen, in the intro/icon ortho space.
  const locateMonolith = () => {
    const bounds = stage.getBoundingClientRect();
    const vw = innerWidth;
    const vh = innerHeight;
    const viewWidth = viewWidthNow();

    tmp.copy(m.root.position).project(m.camera);
    const px = bounds.left + ((tmp.x + 1) / 2) * bounds.width;
    const py = bounds.top + ((1 - tmp.y) / 2) * bounds.height;
    spot.x = (px / vw - 0.5) * viewWidth;
    spot.y = (0.5 - py / vh) * VIEW_H;

    const visibleHeight = 2 * Math.tan(THREE.MathUtils.degToRad(m.camera.fov / 2)) * m.camera.position.z;
    const pxPerSceneUnit = (bounds.height / visibleHeight) * m.root.scale.x;
    spot.unit = pxPerSceneUnit * (VIEW_H / vh);
  };

  // ---- Per-frame update ---------------------------------------------------
  const updateParticles = (t) => {
    const b = INTRO.beats;
    const radius = INTRO.coreRadius * spot.unit;
    const cx = spot.x;
    const cy = spot.y;

    for (let i = 0; i < N; i += 1) {
      const o = i * 3;
      const ph = phase[i];
      const d = delay[i];

      // 1. free-floating cloud, over the whole screen
      let x = cloud[o] + Math.sin(t * 0.9 + ph) * 0.18;
      let y = cloud[o + 1] + Math.cos(t * 0.7 + ph * 1.3) * 0.18;
      let z = cloud[o + 2];

      // 2. spiral in to the initials (rotation angle is 0 at both ends: no pops)
      const g = ease.outCubic(clamp01((t - b.gatherStart - d) / b.gatherLength));
      if (g > 0) {
        const dx = x - dj[o];
        const dy = y - dj[o + 1];
        const dz = z - dj[o + 2];
        const a = Math.sin(g * Math.PI) * 1.2;
        const ca = Math.cos(a);
        const sa = Math.sin(a);
        const k = 1 - g;
        x = dj[o] + (dx * ca - dy * sa) * k;
        y = dj[o + 1] + (dx * sa + dy * ca) * k;
        z = dj[o + 2] + dz * k;
        x += Math.sin(t * 3 + ph) * 0.02 * g;
        y += Math.cos(t * 3.3 + ph) * 0.02 * g;
      }

      // 3. collapse from the initials into the core, arcing above/below
      const c = ease.inOutCubic(clamp01((t - b.collapseStart - d * (b.collapseStagger / b.gatherStagger)) / b.collapseLength));
      if (c > 0) {
        const tx = cx + core[o] * radius;
        const ty = cy + core[o + 1] * radius;
        const arc = Math.sin(c * Math.PI) * (0.6 + (ph % 1) * 0.9) * (i % 2 ? 1 : -1);
        x += (tx - x) * c;
        y += (ty - y) * c + arc;
        z += (core[o + 2] * radius - z) * c;
        if (c >= 1) {
          x += Math.sin(t * 6 + ph) * 0.05;
          y += Math.cos(t * 6 + ph) * 0.05;
        }
      }

      positions[o] = x;
      positions[o + 1] = y;
      positions[o + 2] = z;
    }
    geometry.attributes.position.needsUpdate = true;

    const fadeIn = clamp01(t / b.fadeIn);
    const fadeOut = 1 - clamp01((t - b.fadeOutStart) / b.fadeOutLength);
    pointsMaterial.opacity = fadeIn * fadeOut;
    points.visible = fadeOut > 0;
  };

  const updateIcons = (t) => {
    const b = INTRO.beats;
    const approach = ease.inCubic(clamp01((t - b.iconInStart) / b.iconInLength));
    const leave = ease.outCubic(clamp01((t - b.iconOutStart) / b.iconOutLength));
    const toward = approach * (1 - leave);
    const intro = clamp01(t / 1.2);

    icons.forEach((sprite) => {
      const u = sprite.userData;
      const dx = spot.x - u.baseX;
      const dy = spot.y - u.baseY;
      const curve = Math.sin(toward * Math.PI) * 0.25;
      u.offsetX = dx * toward - dy * curve;
      u.offsetY = dy * toward + dx * curve;
      u.opacity = (0.14 + (INTRO.iconBaseOpacity - 0.14) * intro) * (1 - 0.9 * toward ** 3);
      sprite.scale.setScalar(INTRO.iconBaseScale * (1 - 0.6 * toward));
    });
  };

  const updateMonolith = (t) => {
    const b = INTRO.beats;

    m.layout.dockTarget = t >= b.dockStart ? 1 : 0;

    const shellT = clamp01((t - b.shellStart) / b.shellLength);
    const shellE = ease.outCubic(shellT);
    m.shell.visible = shellT > 0;
    m.glassMaterial.opacity = m.glassRest.opacity * shellE;
    m.edges.forEach((edge) => { edge.material.opacity = m.edgeOpacity * shellE; });
    m.artifact.scale.setScalar(0.55 + 0.45 * ease.outBack(shellT));
    m.layout.spin = INTRO.spinTurns * (1 - shellE); // spins in, decelerates into the idle sway

    const coreT = clamp01((t - b.coreStart) / b.coreLength);
    m.core.visible = coreT > 0;
    m.core.scale.setScalar(0.01 + 0.99 * ease.outBack(coreT));

    const flash = Math.sin(clamp01((t - b.flashStart) / b.flashLength) * Math.PI);
    m.coreGlow.scale.setScalar(1 + 2.5 * flash);
    m.coreGlow.material.opacity = 0.38 + 0.55 * flash;
  };

  const updateCamera = (t) => {
    const e = ease.outCubic(clamp01(t / INTRO.duration));
    m.camera.position.z = INTRO.camera.from + (INTRO.camera.to - INTRO.camera.from) * e;
    m.camera.updateMatrixWorld(true);
  };

  const apply = (t) => {
    const halfW = viewWidthNow() / 2;
    introCamera.left = -halfW;
    introCamera.right = halfW;
    introCamera.updateProjectionMatrix();

    updateCamera(t);
    locateMonolith();
    updateParticles(t);
    updateIcons(t);
    updateMonolith(t);
    if (skipButton) skipButton.style.setProperty('--p', (t / INTRO.duration).toFixed(3));
  };

  // Full-viewport pass: runs after the stage render, so the particles sit on top of everything.
  const renderIntro = () => {
    if (finished || document.hidden) return;
    try {
      renderer.autoClear = false;
      renderer.clearDepth();
      renderer.render(introScene, introCamera);
    } finally {
      renderer.autoClear = true;
    }
  };

  // ---- Lifecycle ----------------------------------------------------------
  const reveal = () => {
    if (revealed) return;
    revealed = true;
    emit('intro:reveal');
  };

  const restoreSteadyState = () => {
    removeRenderCallback();
    introScene.remove(points);
    geometry.dispose();
    pointsMaterial.dispose();

    m.glassMaterial.transparent = m.glassRest.transparent;
    m.glassMaterial.opacity = m.glassRest.opacity;
    m.glassMaterial.needsUpdate = true;
    m.shell.visible = true;
    m.edges.forEach((edge) => { edge.material.opacity = m.edgeOpacity; });
    m.artifact.scale.setScalar(1);
    m.layout.spin = 0;
    m.layout.dockTarget = 1; // a skipped intro still ends docked (the glide finishes on its own)
    m.core.visible = true;
    m.core.scale.setScalar(1);
    m.coreGlow.scale.setScalar(1);
    m.coreGlow.material.opacity = 0.38;
    m.camera.position.z = INTRO.camera.to;
    m.camera.updateMatrixWorld(true);

    icons.forEach((sprite) => {
      const u = sprite.userData;
      u.offsetX = 0;
      u.offsetY = 0;
      u.opacity = INTRO.iconBaseOpacity;
      sprite.scale.set(INTRO.iconBaseScale, INTRO.iconBaseScale, 1);
    });
  };

  const finish = () => {
    if (finished) return;
    finished = true;
    frameHooks.delete(update); // eslint-disable-line no-use-before-define

    restoreSteadyState();
    reveal();
    if (skipButton) skipButton.hidden = true;
    try { sessionStorage.setItem('introSeen', '1'); } catch (error) { /* storage blocked: replay next load */ }
    emit('intro:done');
  };

  function update(time) {
    try {
      if (previous === null) previous = time;
      const dt = Math.min((time - previous) / 1000, 0.05) * speed;
      previous = time;
      elapsed += dt;

      const t = Math.min(elapsed, INTRO.duration);
      apply(t);
      if (t >= INTRO.reveal) reveal();
      if (elapsed >= INTRO.duration) finish();
    } catch (error) {
      console.error('Intro failed; skipping to the finished page.', error);
      finish();
    }
  }

  const skip = () => { speed = INTRO.skipSpeed; };
  window.addEventListener('pointerdown', skip, { once: true });
  window.addEventListener('keydown', (event) => {
    if (['Escape', ' ', 'Enter'].includes(event.key)) skip();
  });

  apply(0); // first frame is already in its start state
  if (skipButton) skipButton.hidden = false;
  frameHooks.add(update);
  removeRenderCallback = api.addRenderCallback(renderIntro);
})();