/*
 * hub.js — turns the monolith into the ERP "core" and the icons into its modules.
 *
 *  - Icons orbit the monolith on two counter-rotating elliptical rings.
 *  - Thin links run from every icon to the core; light pulses travel both ways.
 *  - Each pulse that arrives makes the core flare.
 *  - Hovering an icon brightens its link and speeds its pulses.
 *  - When the hero scrolls away the hub "parks" mid-screen: bigger, dimmer, no links,
 *    so the background keeps some life without fighting the content.
 *
 * Load order matters: script.js, monolith.js, hub.js, intro.js. hub.js must register its
 * frame hook before intro.js so the intro reads fresh orbit positions each frame.
 */
(() => {
  const api = window.portfolioThree;
  if (!api || !api.monolith || !api.frameHooks || !api.lateHooks || !api.scene) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const stage = document.querySelector('.monolith-stage');
  if (!stage) return;

  const { THREE, icons, frameHooks, lateHooks, scene, monolith: m } = api;

  const HUB = {
    rings: [
      { rx: 2.7, ry: 1.75, speed: 0.11, dir: 1, offset: 0 },
      { rx: 4.7, ry: 3.1, speed: 0.065, dir: -1, offset: Math.PI / 4 },
    ],
    tilt: -0.22,
    viewHeight: 10, // matches the ortho camera in script.js
    edgePadding: 0.7,
    parked: { x: 0, y: 0, radiusScale: 1.35, opacity: 0.22 },
    active: { opacity: 0.66 },
    followFrom: 0.1, // hub is "active" while the stage bottom is below this fraction of the viewport...
    followRange: 0.45, // ...and fully active once it is this much further down
    link: { intensity: 0.34, hover: 0.95, tailFalloff: 0.2 },
    pulse: { speed: 0.16, hoverSpeed: 0.45, size: 3.5 },
    core: { decay: 5, perArrival: 0.45, scale: 0.5, opacity: 0.3 },
    hover: { radius: 1.2, smoothing: 8, scaleBoost: 0.25 },
    linkFadeInSeconds: 1.2,
    iconBaseScale: 1.22,
  };

  const COLORS = [new THREE.Color(0xb7a5ff), new THREE.Color(0x83d9ff)]; // alternates like iconData

  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const clamp01 = (v) => clamp(v, 0, 1);
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (v) => v * v * (3 - 2 * v);

  // ---- Per-icon orbit state -----------------------------------------------
  const orbits = icons.map((sprite, index) => {
    const ring = index % 2;
    const slot = (index - ring) / 2;
    sprite.userData.drift = 0; // orbits replace the random drift in script.js
    return {
      ring,
      angle: HUB.rings[ring].offset + slot * (Math.PI / 2),
      hover: 0,
      pulse: Math.random(),
      pulseVariance: 0.85 + (index % 4) * 0.1,
      color: COLORS[index % 2],
    };
  });

  // ---- Links + pulses (live in the same ortho scene as the icons) ----------
  const count = icons.length;
  const linkPositions = new Float32Array(count * 2 * 3);
  const linkColors = new Float32Array(count * 2 * 3);
  const linkGeometry = new THREE.BufferGeometry();
  linkGeometry.setAttribute('position', new THREE.BufferAttribute(linkPositions, 3));
  linkGeometry.setAttribute('color', new THREE.BufferAttribute(linkColors, 3));
  const links = new THREE.LineSegments(
    linkGeometry,
    new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  links.frustumCulled = false;
  links.renderOrder = -1;
  scene.add(links);

  const pulsePositions = new Float32Array(count * 2 * 3);
  const pulseColors = new Float32Array(count * 2 * 3);
  const pulseGeometry = new THREE.BufferGeometry();
  pulseGeometry.setAttribute('position', new THREE.BufferAttribute(pulsePositions, 3));
  pulseGeometry.setAttribute('color', new THREE.BufferAttribute(pulseColors, 3));
  const pulses = new THREE.Points(
    pulseGeometry,
    new THREE.PointsMaterial({
      size: HUB.pulse.size,
      sizeAttenuation: false, // constant pixel size regardless of the ortho camera
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  pulses.frustumCulled = false;
  pulses.renderOrder = 1;
  scene.add(pulses);

  // ---- Shared state -------------------------------------------------------
  const state = {
    clock: 0,
    previous: null,
    follow: 0,
    cx: 0,
    cy: 0,
    corePulse: 0,
    introDone: !document.documentElement.classList.contains('intro-pending'),
    doneAt: null,
    linkFade: 0,
  };
  const pointer = { x: 0, y: 0, active: false };
  const tmp = new THREE.Vector3();

  window.addEventListener('intro:done', () => { state.introDone = true; }, { once: true });
  window.addEventListener('pointermove', (event) => {
    if (event.pointerType === 'touch') return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    pointer.x = (event.clientX / vw - 0.5) * HUB.viewHeight * (vw / vh);
    pointer.y = (0.5 - event.clientY / vh) * HUB.viewHeight;
    pointer.active = true;
  });
  document.documentElement.addEventListener('pointerleave', () => { pointer.active = false; });

  // ---- Frame hook: positions, hover, pulse timing, core flare --------------
  const update = (time) => {
    if (state.previous === null) state.previous = time;
    const dt = Math.min((time - state.previous) / 1000, 0.05);
    state.previous = time;
    state.clock += dt;

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const viewHeight = HUB.viewHeight;
    const viewWidth = viewHeight * (vw / vh);
    const halfW = viewWidth / 2;
    const halfH = viewHeight / 2;

    // Where the monolith is on screen, in the icon camera's units.
    const bounds = stage.getBoundingClientRect();
    let mx = HUB.parked.x;
    let my = HUB.parked.y;
    let follow = 0;
    if (bounds.width && bounds.height) {
      m.camera.updateMatrixWorld(true);
      tmp.copy(m.root.position).project(m.camera);
      const px = bounds.left + ((tmp.x + 1) / 2) * bounds.width;
      const py = bounds.top + ((1 - tmp.y) / 2) * bounds.height;
      mx = (px / vw - 0.5) * viewWidth;
      my = (0.5 - py / vh) * viewHeight;
      follow = smooth(clamp01((bounds.bottom - vh * HUB.followFrom) / (vh * HUB.followRange)));
    }
    state.follow = follow;
    state.cx = lerp(HUB.parked.x, mx, follow);
    state.cy = lerp(HUB.parked.y, my, follow);

    if (state.introDone && state.doneAt === null) state.doneAt = state.clock;
    state.linkFade = state.doneAt === null
      ? 0
      : clamp01((state.clock - state.doneAt) / HUB.linkFadeInSeconds);

    const radiusScale = lerp(HUB.parked.radiusScale, 1, follow);
    const baseOpacity = lerp(HUB.parked.opacity, HUB.active.opacity, follow);
    const cosT = Math.cos(HUB.tilt);
    const sinT = Math.sin(HUB.tilt);

    // Nearest icon under the pointer (previous frame's final positions).
    let hovered = -1;
    if (pointer.active && follow > 0.4) {
      let best = HUB.hover.radius ** 2;
      icons.forEach((sprite, index) => {
        const dx = sprite.position.x - pointer.x;
        const dy = sprite.position.y - pointer.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < best) {
          best = d2;
          hovered = index;
        }
      });
    }

    let arrivals = 0;
    icons.forEach((sprite, index) => {
      const orbit = orbits[index];
      const ring = HUB.rings[orbit.ring];
      const u = sprite.userData;

      orbit.angle += dt * ring.speed * ring.dir;
      orbit.hover += ((index === hovered ? 1 : 0) - orbit.hover) * (1 - Math.exp(-dt * HUB.hover.smoothing));

      // Keep each ring inside the viewport by sliding its center, not squashing the ring.
      const rx = Math.min(ring.rx * radiusScale, halfW - HUB.edgePadding);
      const ry = Math.min(ring.ry * radiusScale, halfH - HUB.edgePadding);
      const ringX = clamp(state.cx, -halfW + HUB.edgePadding + rx, halfW - HUB.edgePadding - rx);
      const ringY = clamp(state.cy, -halfH + HUB.edgePadding + ry, halfH - HUB.edgePadding - ry);

      const ex = Math.cos(orbit.angle) * rx;
      const ey = Math.sin(orbit.angle) * ry;
      u.baseX = ringX + ex * cosT - ey * sinT;
      u.baseY = ringY + ex * sinT + ey * cosT;

      const depth = (Math.sin(orbit.angle) + 1) / 2; // back of the orbit dimmer than the front
      u.opacity = clamp(baseOpacity * (0.6 + 0.4 * depth) + orbit.hover * 0.3 * follow, 0, 0.95);
      sprite.scale.setScalar(HUB.iconBaseScale * (1 + HUB.hover.scaleBoost * orbit.hover * follow));

      // Pulse timing; a wrap of the inbound pulse means it just hit the core.
      const before = orbit.pulse;
      const speed = lerp(HUB.pulse.speed, HUB.pulse.hoverSpeed, orbit.hover) * orbit.pulseVariance;
      orbit.pulse += dt * speed;
      if (Math.floor(orbit.pulse) > Math.floor(before)) arrivals += 1;
    });

    // Core flare, only once the intro has handed the core back.
    state.corePulse = Math.min(1, state.corePulse * Math.exp(-dt * HUB.core.decay)
      + (state.introDone ? arrivals * HUB.core.perArrival * follow : 0));
    if (state.introDone) {
      if (arrivals > 0 && follow > 0.4) m.layout.rippleAge = 0; // each layer of the stack lifts in turn
      m.coreGlow.scale.setScalar(1 + HUB.core.scale * state.corePulse);
      m.coreGlow.material.opacity = 0.38 + HUB.core.opacity * state.corePulse;
    }
  };

  // ---- Late hook: write link/pulse buffers from the icons' FINAL positions --
  const lateUpdate = () => {
    const { cx, cy, follow, linkFade } = state;

    icons.forEach((sprite, index) => {
      const orbit = orbits[index];
      const ax = sprite.position.x;
      const ay = sprite.position.y;
      const o = index * 6;
      const hoverK = orbit.hover * follow;
      const k = clamp01(linkFade * (follow * HUB.link.intensity + hoverK * HUB.link.hover));
      const { r, g, b } = orbit.color;

      linkPositions[o] = ax;
      linkPositions[o + 1] = ay;
      linkPositions[o + 2] = 0;
      linkPositions[o + 3] = cx;
      linkPositions[o + 4] = cy;
      linkPositions[o + 5] = 0;

      const tail = k * HUB.link.tailFalloff; // dim at the icon, bright at the core
      linkColors[o] = r * tail;
      linkColors[o + 1] = g * tail;
      linkColors[o + 2] = b * tail;
      linkColors[o + 3] = r * k;
      linkColors[o + 4] = g * k;
      linkColors[o + 5] = b * k;

      // One pulse inbound (icon -> core), one outbound (core -> icon), half a cycle apart.
      const pIn = orbit.pulse - Math.floor(orbit.pulse);
      const shifted = orbit.pulse + 0.5;
      const pOut = shifted - Math.floor(shifted);
      const glow = clamp01(linkFade * (follow * 0.9 + hoverK));

      pulsePositions[o] = ax + (cx - ax) * pIn;
      pulsePositions[o + 1] = ay + (cy - ay) * pIn;
      pulsePositions[o + 2] = 0;
      pulsePositions[o + 3] = cx + (ax - cx) * pOut;
      pulsePositions[o + 4] = cy + (ay - cy) * pOut;
      pulsePositions[o + 5] = 0;

      const inGlow = glow * Math.sin(pIn * Math.PI);
      const outGlow = glow * Math.sin(pOut * Math.PI);
      pulseColors[o] = r * inGlow;
      pulseColors[o + 1] = g * inGlow;
      pulseColors[o + 2] = b * inGlow;
      pulseColors[o + 3] = r * outGlow;
      pulseColors[o + 4] = g * outGlow;
      pulseColors[o + 5] = b * outGlow;
    });

    linkGeometry.attributes.position.needsUpdate = true;
    linkGeometry.attributes.color.needsUpdate = true;
    pulseGeometry.attributes.position.needsUpdate = true;
    pulseGeometry.attributes.color.needsUpdate = true;
  };

  frameHooks.add(update);
  lateHooks.add(lateUpdate);
})();