/*
 * intro.js — ~5s Three.js intro: chaos -> order.
 *
 *  0.0-0.8s  scattered particles fade in and drift
 *  0.8-2.4s  particles spiral in and form the "DJ" initials
 *  2.4-3.0s  hold the initials (shimmer)
 *  3.0-4.0s  initials collapse into the monolith core; ERP icons streak in
 *  3.7s      HTML hero reveal fires (intro:reveal)
 *  3.9-5.0s  glass shell materializes, core flashes, icons burst back out
 *  5.0s      cleanup (intro:done)
 *
 * Runs on the shared clock in script.js (portfolioThree.frameHooks), so there is
 * exactly one timeline. Every tunable lives in INTRO below.
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

  const { THREE, frameHooks, icons, monolith: m } = api;

  const INTRO = {
    duration: 5.0,
    reveal: 3.7,
    skipSpeed: 8,
    particleCount: 2600,
    particleSize: 0.04,
    textWorldWidth: 4.2,
    iconBaseScale: 1.22,
    iconBaseOpacity: 0.72,
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
    for (let y = 0; y < h; y += 2) {
      for (let x = 0; x < w; x += 2) {
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
      out[i * 3] = (hits[k] - w / 2) * scale + (Math.random() - 0.5) * 0.015;
      out[i * 3 + 1] = (h / 2 - hits[k + 1]) * scale + (Math.random() - 0.5) * 0.015;
      out[i * 3 + 2] = (Math.random() - 0.5) * 0.12;
    }
    return out;
  };

  // ---- Particle buffers ---------------------------------------------------
  const N = INTRO.particleCount;
  const cloud = new Float32Array(N * 3);
  const core = new Float32Array(N * 3); // unit-sphere offsets, scaled by root scale per frame
  const delay = new Float32Array(N);
  const phase = new Float32Array(N);
  const positions = new Float32Array(N * 3);
  const colors = new Float32Array(N * 3);
  const dj = sampleTextToPoints('DJ', N, INTRO.textWorldWidth);

  const violet = new THREE.Color(0xb9a2ff);
  const blue = new THREE.Color(0x75dfff);
  for (let i = 0; i < N; i += 1) {
    const o = i * 3;
    const theta = Math.random() * Math.PI * 2;
    const z = Math.random() * 2 - 1;
    const planar = Math.sqrt(1 - z * z);
    const reach = 1.6 + Math.random() * 1.6;
    cloud[o] = planar * Math.cos(theta) * reach * 1.6;
    cloud[o + 1] = z * reach * 1.1;
    cloud[o + 2] = planar * Math.sin(theta) * reach * 0.9;

    const r = Math.cbrt(Math.random()) * 0.45;
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
    size: INTRO.particleSize,
    vertexColors: true,
    transparent: true,
    opacity: 0,
    sizeAttenuation: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(geometry, pointsMaterial);
  points.frustumCulled = false; // positions are rewritten every frame
  m.scene.add(points);

  // ---- Setup of the real monolith for the intro ---------------------------
  m.glassMaterial.transparent = true;
  m.glassMaterial.opacity = 0;
  m.glassMaterial.needsUpdate = true;
  m.shell.visible = false;
  m.core.visible = false;
  m.edges.forEach((edge) => { edge.material.opacity = 0; });

  const tmp = new THREE.Vector3();

  // ---- Per-frame update ---------------------------------------------------
  const updateParticles = (t) => {
    const b = INTRO.beats;
    const s = m.root.scale.x;
    const cx = m.root.position.x;
    const cy = m.root.position.y;
    const cz = 0.16 * s;

    for (let i = 0; i < N; i += 1) {
      const o = i * 3;
      const ph = phase[i];
      const d = delay[i];

      // 1. free-floating cloud
      let x = cloud[o] + Math.sin(t * 0.9 + ph) * 0.14;
      let y = cloud[o + 1] + Math.cos(t * 0.7 + ph * 1.3) * 0.14;
      let z = cloud[o + 2] + Math.sin(t * 0.6 + ph * 0.7) * 0.14;

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
        x += Math.sin(t * 3 + ph) * 0.008 * g;
        y += Math.cos(t * 3.3 + ph) * 0.008 * g;
      }

      // 3. collapse into the core, arcing above/below
      const c = ease.inOutCubic(clamp01((t - b.collapseStart - d * (b.collapseStagger / b.gatherStagger)) / b.collapseLength));
      if (c > 0) {
        const tx = cx + core[o] * s;
        const ty = cy + core[o + 1] * s;
        const tz = cz + core[o + 2] * s;
        const arc = Math.sin(c * Math.PI) * (0.35 + (ph % 1) * 0.4) * (i % 2 ? 1 : -1);
        x += (tx - x) * c;
        y += (ty - y) * c + arc;
        z += (tz - z) * c;
        if (c >= 1) {
          x += Math.sin(t * 6 + ph) * 0.03 * s;
          y += Math.cos(t * 6 + ph) * 0.03 * s;
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
    const bounds = stage.getBoundingClientRect();
    const vw = innerWidth;
    const vh = innerHeight;
    const viewHeight = 10;
    const viewWidth = viewHeight * (vw / vh);

    // Screen position of the monolith -> the icon camera's world space.
    tmp.copy(m.root.position).project(m.camera);
    const px = bounds.left + ((tmp.x + 1) / 2) * bounds.width;
    const py = bounds.top + ((1 - tmp.y) / 2) * bounds.height;
    const tx = (px / vw - 0.5) * viewWidth;
    const ty = (0.5 - py / vh) * viewHeight;

    const approach = ease.inCubic(clamp01((t - b.iconInStart) / b.iconInLength));
    const leave = ease.outCubic(clamp01((t - b.iconOutStart) / b.iconOutLength));
    const toward = approach * (1 - leave);
    const intro = clamp01(t / 1.2);

    icons.forEach((sprite) => {
      const u = sprite.userData;
      const dx = tx - u.baseX;
      const dy = ty - u.baseY;
      const curve = Math.sin(toward * Math.PI) * 0.25;
      u.offsetX = dx * toward - dy * curve;
      u.offsetY = dy * toward + dx * curve;
      u.opacity = (0.14 + (INTRO.iconBaseOpacity - 0.14) * intro) * (1 - 0.9 * toward ** 3);
      sprite.scale.setScalar(INTRO.iconBaseScale * (1 - 0.6 * toward));
    });
  };

  const updateMonolith = (t, dt) => {
    const b = INTRO.beats;

    const shellT = clamp01((t - b.shellStart) / b.shellLength);
    const shellE = ease.outCubic(shellT);
    m.shell.visible = shellT > 0;
    m.glassMaterial.opacity = shellE;
    m.edges.forEach((edge) => { edge.material.opacity = 0.38 * shellE; });
    m.artifact.scale.setScalar(0.55 + 0.45 * ease.outBack(shellT));
    m.artifact.rotation.y += dt * 7 * (1 - shellE); // spins in, decelerates into the idle rotation

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

  const apply = (t, dt) => {
    updateCamera(t);
    updateParticles(t);
    updateIcons(t);
    updateMonolith(t, dt);
    if (skipButton) skipButton.style.setProperty('--p', (t / INTRO.duration).toFixed(3));
  };

  // ---- Lifecycle ----------------------------------------------------------
  let elapsed = 0;
  let previous = null;
  let speed = 1;
  let revealed = false;
  let finished = false;

  const reveal = () => {
    if (revealed) return;
    revealed = true;
    emit('intro:reveal');
  };

  const finish = () => {
    if (finished) return;
    finished = true;
    frameHooks.delete(update); // eslint-disable-line no-use-before-define

    // Restore every property the intro touched to its steady-state value.
    restoreSteadyState();
    reveal();
    if (skipButton) skipButton.hidden = true;
    try { sessionStorage.setItem('introSeen', '1'); } catch (error) { /* storage blocked: replay next load */ }
    emit('intro:done');
  };

  const restoreSteadyState = () => {
    m.scene.remove(points);
    geometry.dispose();
    pointsMaterial.dispose();

    m.glassMaterial.transparent = false;
    m.glassMaterial.opacity = 1;
    m.glassMaterial.needsUpdate = true;
    m.shell.visible = true;
    m.edges.forEach((edge) => { edge.material.opacity = 0.38; });
    m.artifact.scale.setScalar(1);
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

  function update(time) {
    try {
      if (previous === null) previous = time;
      const dt = Math.min((time - previous) / 1000, 0.05) * speed;
      previous = time;
      elapsed += dt;

      const t = Math.min(elapsed, INTRO.duration);
      apply(t, dt);
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

  apply(0, 0); // first frame is already in its start state
  if (skipButton) skipButton.hidden = false;
  frameHooks.add(update);
})();