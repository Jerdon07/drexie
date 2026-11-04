/*
 * planets.js — four procedural worlds, one per chapter. No textures, no downloads.
 *
 *   0 LUNAR  cratered moon        (hero)
 *   1 TERRA  ocean/land/clouds    (about)   + atmosphere, orbit ring with satellites
 *   2 AURELIA banded giant, rings (journey) + 3 clickable moons that map to the 3 goals
 *   3 SOL    star + corona        (connect) + debris ring
 *
 * Each world is a shader keyed to Orbit.sunDir. Spin comes from the object-space position
 * (vObj) so the surface rotates while lighting stays fixed in world space.
 * rig.js hides any world more than ~1.3 chapters away, so only 1-2 shaders run per frame.
 */
(() => {
  'use strict';

  const Orbit = window.Orbit;
  if (!Orbit || !Orbit.THREE) return;
  const { THREE, glsl } = Orbit;

  // pos: world position. r: radius. dist: camera distance (in radii-ish units).
  // side: +1 = planet sits on the right of the screen (text on the left), -1 = opposite.
  const DEFS = [
    { id: 'lunar', label: 'Lunar', pos: [0, 0, 0], r: 2.4, dist: 9.5, side: 1 },
    { id: 'terra', label: 'Terra', pos: [26, -5, -38], r: 3.0, dist: 11.5, side: -1 },
    { id: 'aurelia', label: 'Aurelia', pos: [-28, 6, -82], r: 2.4, dist: 15.5, side: 1 },
    { id: 'sol', label: 'Sol', pos: [18, -3, -128], r: 3.2, dist: 12.5, side: -1 },
  ];
  Orbit.defs = DEFS;

  const shader = (fragment, uniforms, extra = {}) => new THREE.ShaderMaterial({
    uniforms,
    vertexShader: glsl.vert,
    fragmentShader: `${glsl.varyings}\n${fragment}`,
    extensions: { derivatives: true },
    ...extra,
  });

  const addPlanet = (def, group, body, spin, home, extra = {}) => {
    group.position.set(...def.pos);
    Orbit.scene.add(group);
    body.rotation.set(home.x, home.y, 0);
    const p = {
      def, group, body, spin, home, drag: 0, dragging: false, ...extra,
      reset() {
        body.rotation.set(home.x, home.y, 0);
        p.drag = 0;
      },
    };
    Orbit.planets.push(p);
    Orbit.hooks.add((dt) => {
      if (!group.visible) return;
      body.rotation.y += (p.spin * Orbit.state.ambientK + p.drag) * dt;
      if (!p.dragging) p.drag *= Math.exp(-dt * 2.2);
      body.rotation.x += (home.x - body.rotation.x) * (1 - Math.exp(-dt * 0.8)); // ease the tilt back
      if (p.update) p.update(dt);
    });
    return p;
  };

  const sphere = (seg = 96) => new THREE.SphereGeometry(1, seg, Math.round(seg * 0.75));

  // ==========================================================================
  // 0 — LUNAR
  // ==========================================================================
  Orbit.register('Shaping the Moon', () => {
    const d = DEFS[0];
    const material = shader(`
      uniform vec3 uSun; uniform float uBump;
      ${glsl.noise}

      // Craters: every cell may hold one crater (bowl + raised rim). Each cell's contribution is
      // summed instead of picking the "nearest" cell, so the height field stays continuous across
      // cell borders (a nearest-cell pick leaves 1px black speckles once we differentiate it).
      // Max crater radius is 0.78 cell widths, so the 3x3x3 neighbourhood always covers it.
      float craters(vec3 p) {
        vec3 i = floor(p);
        vec3 f = fract(p);
        float h = 0.0;
        for (int x = -1; x <= 1; x++) {
          for (int y = -1; y <= 1; y++) {
            for (int z = -1; z <= 1; z++) {
              vec3 g = vec3(float(x), float(y), float(z));
              vec3 c = i + g;
              vec3 o = vec3(hash13(c), hash13(c + vec3(7.1, 3.3, 5.9)), hash13(c + vec3(2.7, 9.1, 1.3)));
              float id = hash13(c + vec3(11.3, 4.7, 8.1));
              float d = length(g + o - f) / (0.5 + 0.5 * id);
              float present = 1.0 - smoothstep(0.66, 0.78, id);
              float bowl = -(1.0 - smoothstep(0.05, 0.5, d)) * 0.6;
              float rim = smoothstep(0.38, 0.52, d) * (1.0 - smoothstep(0.52, 0.78, d)) * 0.25;
              h += (bowl + rim) * present;
            }
          }
        }
        return h;
      }

      void main() {
        vec3 p = normalize(vObj);
        float h = fbm(p * 3.0) * 0.35 + craters(p * 2.8) + craters(p * 7.5) * 0.6 + noise(p * 40.0) * 0.08;

        vec3 N = normalize(vN);
        vec3 dpdx = dFdx(vWorld);
        vec3 dpdy = dFdy(vWorld);
        float hx = dFdx(h);
        float hy = dFdy(h);
        vec3 r1 = cross(dpdy, N);
        vec3 r2 = cross(N, dpdx);
        float det = dot(dpdx, r1);
        vec3 grad = sign(det) * (hx * r1 + hy * r2);
        // Surface slope in world units. Voronoi cell borders make h jump, which would flip the
        // normal and leave black speckles, so cap how hard any single pixel can tilt it.
        vec3 tilt = uBump * grad / max(abs(det), 1e-12);
        tilt *= min(1.0, 0.7 / max(length(tilt), 1e-4));
        // Fine detail aliases into 2x2 blocks at grazing angles, so fade the bump out toward the limb.
        tilt *= smoothstep(0.05, 0.45, dot(N, normalize(cameraPosition - vWorld)));
        vec3 Nb = normalize(N - tilt);

        vec3 L = normalize(uSun);
        float geo = clamp(dot(N, L), 0.0, 1.0);
        float diff = clamp(dot(Nb, L), 0.0, 1.0);

        float maria = smoothstep(0.42, 0.62, fbm(p * 1.4 + 4.0));
        float dust = fbm(p * 7.0);
        vec3 alb = mix(vec3(0.62, 0.60, 0.66), vec3(0.86, 0.84, 0.90), dust);
        alb = mix(alb, vec3(0.34, 0.33, 0.40), maria * 0.75);
        alb *= clamp(0.85 + h * 0.3, 0.5, 1.1);

        float term = smoothstep(0.0, 0.35, geo);
        vec3 col = alb * (diff * term * 1.25 + 0.025);

        vec3 V = normalize(cameraPosition - vWorld);
        float rim = pow(1.0 - max(dot(N, V), 0.0), 3.0);
        col += vec3(0.45, 0.55, 1.0) * rim * (0.12 + 0.5 * geo);
        gl_FragColor = vec4(col, 1.0);
      }`, { uSun: { value: Orbit.sunDir }, uBump: { value: 0.1 * d.r } });

    const group = new THREE.Group();
    const body = new THREE.Mesh(sphere(128), material);
    body.scale.setScalar(d.r);
    group.add(body);
    addPlanet(d, group, body, 0.035, { x: 0.12, y: 1.4 });
  });

  // ==========================================================================
  // 1 — TERRA
  // ==========================================================================
  Orbit.register('Growing an ocean world', () => {
    const d = DEFS[1];
    const uniforms = () => ({ uSun: { value: Orbit.sunDir }, uTime: Orbit.uniforms.uTime });

    const surface = shader(`
      uniform vec3 uSun;
      ${glsl.noise}
      void main() {
        vec3 p = normalize(vObj);
        float h = fbm(p * 2.2 + 3.0) + 0.12 * fbm(p * 8.0);
        float land = smoothstep(0.49, 0.51, h);
        float elev = clamp((h - 0.5) * 3.5, 0.0, 1.0);
        float moist = fbm(p * 3.6 + 9.0);
        float lat = abs(p.y);

        vec3 ocean = mix(vec3(0.01, 0.05, 0.18), vec3(0.04, 0.30, 0.52), smoothstep(0.25, 0.5, h));
        vec3 lc = mix(vec3(0.10, 0.30, 0.14), vec3(0.60, 0.52, 0.32), smoothstep(0.45, 0.7, 1.0 - moist));
        lc = mix(lc, vec3(0.40, 0.36, 0.34), smoothstep(0.5, 1.0, elev));
        float ice = smoothstep(0.80, 0.90, lat + (h - 0.5) * 0.2);
        vec3 alb = mix(ocean, lc, land);
        alb = mix(alb, vec3(0.90, 0.94, 1.0), ice);

        vec3 N = normalize(vN);
        vec3 L = normalize(uSun);
        vec3 V = normalize(cameraPosition - vWorld);
        float nl = dot(N, L);
        float day = smoothstep(-0.05, 0.25, nl);
        vec3 col = alb * (max(nl, 0.0) * 1.15 + 0.02);

        vec3 H = normalize(L + V);
        float spec = pow(max(dot(N, H), 0.0), 160.0) * (1.0 - land) * (1.0 - ice) * day;
        col += vec3(0.9, 0.95, 1.0) * spec * 0.55;

        float night = 1.0 - smoothstep(-0.12, 0.1, nl);
        float city = smoothstep(0.72, 0.9, noise(p * 60.0)) * smoothstep(0.45, 0.65, fbm(p * 5.0 + 2.0)) * land * (1.0 - ice);
        col += vec3(1.0, 0.72, 0.38) * city * night * 1.3;

        float fr = pow(1.0 - max(dot(N, V), 0.0), 2.6);
        col += vec3(0.25, 0.60, 1.0) * fr * (0.25 + 0.75 * smoothstep(-0.3, 0.6, nl));
        gl_FragColor = vec4(col, 1.0);
      }`, uniforms());

    const cloudMat = shader(`
      uniform vec3 uSun; uniform float uTime;
      ${glsl.noise}
      void main() {
        vec3 p = normalize(vObj);
        float c = fbm(p * 3.2 + vec3(uTime * 0.015, 0.0, uTime * 0.01));
        c = smoothstep(0.5, 0.72, c) * (0.6 + 0.4 * fbm(p * 9.0));
        vec3 N = normalize(vN);
        float diff = clamp(dot(N, normalize(uSun)) * 1.2 + 0.12, 0.0, 1.0);
        gl_FragColor = vec4(vec3(1.0) * diff * 0.95 + vec3(0.02, 0.03, 0.06), c * 0.8);
      }`, uniforms(), { transparent: true, depthWrite: false });

    const atmoMat = new THREE.ShaderMaterial({
      uniforms: { uSun: { value: Orbit.sunDir } },
      transparent: true,
      depthWrite: false,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      vertexShader: `
        varying vec3 vNV; varying vec3 vNW;
        void main() {
          vNV = normalize(normalMatrix * normal);
          vNW = normalize(mat3(modelMatrix) * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        varying vec3 vNV; varying vec3 vNW; uniform vec3 uSun;
        void main() {
          float k = clamp(-vNV.z * 1.9, 0.0, 1.0);
          float I = pow(k, 2.4);
          float lit = 0.2 + 0.8 * smoothstep(-0.35, 0.55, dot(vNW, normalize(uSun)));
          vec3 col = mix(vec3(0.30, 0.45, 1.0), vec3(0.45, 0.85, 1.0), k);
          gl_FragColor = vec4(col * I * lit * 1.6, 1.0);
        }`,
    });

    const group = new THREE.Group();
    const tilt = new THREE.Group();
    tilt.rotation.z = 0.4;
    group.add(tilt);

    const body = new THREE.Mesh(sphere(128), surface);
    body.scale.setScalar(d.r);
    const clouds = new THREE.Mesh(sphere(96), cloudMat);
    clouds.scale.setScalar(d.r * 1.012);
    const atmo = new THREE.Mesh(sphere(64), atmoMat);
    atmo.scale.setScalar(d.r * 1.18);
    tilt.add(body, clouds, atmo);

    // "Modules" orbiting the world: a thin ring with three satellites.
    const ringPts = [];
    for (let i = 0; i < 160; i += 1) {
      const a = (i / 160) * Math.PI * 2;
      ringPts.push(new THREE.Vector3(Math.cos(a), 0, Math.sin(a)));
    }
    const orbitLine = new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints(ringPts),
      new THREE.LineBasicMaterial({ color: 0x83d9ff, transparent: true, opacity: 0.28 }),
    );
    orbitLine.scale.setScalar(d.r * 1.55);
    orbitLine.rotation.x = 0.5;
    group.add(orbitLine);

    const sats = [0, 2.1, 4.2].map((phase, i) => {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({
        map: Orbit.glow(i === 1 ? '#a895ff' : '#83d9ff'),
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }));
      orbitLine.add(s); // child of the unit ring, so it inherits scale + tilt
      s.scale.setScalar(0.17);
      return { sprite: s, phase };
    });

    const p = addPlanet(d, group, body, 0.06, { x: 0.05, y: 2.2 }, {
      update(dt) {
        sats.forEach((s) => {
          s.phase += dt * 0.4 * Orbit.state.ambientK;
          s.sprite.position.set(Math.cos(s.phase), 0, Math.sin(s.phase));
        });
      },
    });
    p.clouds = clouds;
    // Single writer for cloud rotation: it rides the body's spin (slightly faster), so
    // dragging the planet drags the weather with it.
    Orbit.hooks.add(() => { if (group.visible) clouds.rotation.y = body.rotation.y * 1.04; });
  });

  // ==========================================================================
  // 2 — AURELIA (ringed giant + three goal moons)
  // ==========================================================================
  Orbit.register('Raising a ringed giant', () => {
    const d = DEFS[2];
    const RING_IN = 1.45;
    const RING_OUT = 2.45;

    const surface = shader(`
      uniform vec3 uSun; uniform float uTime;
      ${glsl.noise}
      void main() {
        vec3 p = normalize(vObj);
        float w = fbm(vec3(p.x * 2.5, p.y * 5.0, p.z * 2.5) + vec3(0.0, uTime * 0.01, 0.0));
        float lat = p.y + (w - 0.5) * 0.22;
        float b1 = sin(lat * 20.0) * 0.5 + 0.5;
        float b2 = sin(lat * 47.0 + 1.3) * 0.5 + 0.5;
        float band = b1 * 0.65 + b2 * 0.35;
        vec3 col = mix(vec3(0.58, 0.48, 0.95), vec3(0.96, 0.74, 0.86), band);
        col = mix(col, vec3(0.33, 0.50, 0.92), smoothstep(0.55, 0.9, fbm(p * vec3(2.0, 9.0, 2.0) + 4.0)));
        col = mix(col, vec3(0.98, 0.90, 0.82), smoothstep(0.72, 0.95, b2 * w));

        vec3 N = normalize(vN);
        vec3 L = normalize(uSun);
        vec3 V = normalize(cameraPosition - vWorld);
        float nl = dot(N, L);
        col *= smoothstep(-0.1, 0.9, nl) * 1.2 + 0.03;
        float rim = pow(1.0 - max(dot(N, V), 0.0), 3.0);
        col += vec3(0.5, 0.6, 1.0) * rim * (0.1 + 0.4 * smoothstep(-0.2, 0.6, nl));
        gl_FragColor = vec4(col, 1.0);
      }`, { uSun: { value: Orbit.sunDir }, uTime: Orbit.uniforms.uTime });

    const ringMat = shader(`
      uniform vec3 uSun; uniform vec3 uCenter; uniform float uR; uniform float uInner;
      ${glsl.noise}
      void main() {
        float r = length(vUv - 0.5) * 2.0;
        float t = (r - uInner) / (1.0 - uInner);
        if (t < 0.0 || t > 1.0) discard;
        float bands = fbm(vec3(t * 28.0, 1.7, 0.0));
        float fine = noise(vec3(t * 140.0, 3.1, 0.0));
        float gap = smoothstep(0.015, 0.045, abs(t - 0.6));
        float alpha = (0.2 + 0.8 * bands) * (0.6 + 0.4 * fine) * gap;
        alpha *= smoothstep(0.0, 0.06, t) * (1.0 - smoothstep(0.88, 1.0, t));
        vec3 col = mix(vec3(0.85, 0.75, 0.95), vec3(0.98, 0.88, 0.80), bands);

        // The planet casts a shadow across its own rings.
        vec3 L = normalize(uSun);
        vec3 toC = uCenter - vWorld;
        float along = dot(toC, L);
        float shadow = 1.0;
        if (along > 0.0) shadow = smoothstep(uR * 0.97, uR * 1.03, length(toC - L * along));
        col *= 0.15 + 0.85 * shadow;
        gl_FragColor = vec4(col, alpha * 0.9);
      }`, {
      uSun: { value: Orbit.sunDir },
      uCenter: { value: new THREE.Vector3(...d.pos) },
      uR: { value: d.r },
      uInner: { value: RING_IN / RING_OUT },
    }, { transparent: true, depthWrite: false, side: THREE.DoubleSide });

    const group = new THREE.Group();
    const tilt = new THREE.Group();
    tilt.rotation.set(0.12, 0, 0.38);
    group.add(tilt);

    const body = new THREE.Mesh(sphere(96), surface);
    body.scale.setScalar(d.r);
    tilt.add(body);

    const ring = new THREE.Mesh(new THREE.RingGeometry(RING_IN, RING_OUT, 128, 1), ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.scale.setScalar(d.r);
    tilt.add(ring);

    // Three moons = the three goals on the page. Colours match the glow on their cards.
    const MOONS = [
      { orbit: 3.0, size: 0.17, speed: 0.32, phase: 0.5, color: 0xb7a5ff, css: '#b7a5ff' },
      { orbit: 3.55, size: 0.22, speed: 0.22, phase: 2.4, color: 0x83d9ff, css: '#83d9ff' },
      { orbit: 4.15, size: 0.15, speed: 0.16, phase: 4.4, color: 0xf3b4d8, css: '#f3b4d8' },
    ];
    const hits = [];
    const moons = MOONS.map((m, index) => {
      const pivot = new THREE.Object3D();
      pivot.rotation.y = m.phase;
      tilt.add(pivot);
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(1, 32, 24),
        new THREE.MeshStandardMaterial({
          color: m.color, roughness: 0.8, metalness: 0, emissive: m.color, emissiveIntensity: 0.18,
        }),
      );
      mesh.position.x = m.orbit * d.r;
      mesh.scale.setScalar(m.size * d.r);
      pivot.add(mesh);

      const glow = new THREE.Sprite(new THREE.SpriteMaterial({
        map: Orbit.glow(m.css), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.15,
      }));
      glow.scale.setScalar(4);
      mesh.add(glow);

      // Generous invisible hit sphere: the real moons are tiny on screen.
      const hit = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshBasicMaterial());
      hit.visible = false;
      hit.scale.setScalar(2.8);
      hit.userData.moon = index;
      mesh.add(hit);
      hits.push(hit);
      return { ...m, index, pivot, mesh, glow, hit, h: 0 };
    });

    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    let hoverIdx = -1;
    let activeIdx = -1;

    const p = addPlanet(d, group, body, 0.05, { x: 0.1, y: 0.4 }, {
      moons,
      setHover(i) { hoverIdx = i; },
      setActive(i) { activeIdx = i; },
      update(dt) {
        const k = Orbit.state.ambientK;
        moons.forEach((m) => {
          m.pivot.rotation.y += dt * m.speed * k;
          const target = (m.index === hoverIdx || m.index === activeIdx) ? 1 : 0;
          m.h += (target - m.h) * (1 - Math.exp(-dt * 8));
          m.mesh.scale.setScalar(m.size * d.r * (1 + 0.35 * m.h));
          m.mesh.material.emissiveIntensity = 0.18 + 0.5 * m.h;
          m.glow.material.opacity = 0.15 + 0.6 * m.h;
        });
      },
    });

    // Screen-space pick used by ui.js. Returns a moon index or -1.
    Orbit.pickMoon = (clientX, clientY) => {
      if (!p.group.visible || Orbit.state.staticView) return -1;
      ndc.set((clientX / innerWidth) * 2 - 1, -(clientY / innerHeight) * 2 + 1);
      raycaster.setFromCamera(ndc, Orbit.camera);
      const hit = raycaster.intersectObjects(hits, false)[0];
      return hit ? hit.object.userData.moon : -1;
    };
  });

  // ==========================================================================
  // 3 — SOL (the star)
  // ==========================================================================
  Orbit.register('Lighting a star', () => {
    const d = DEFS[3];
    const surface = shader(`
      uniform float uTime;
      ${glsl.noise}
      void main() {
        vec3 p = normalize(vObj);
        float n = fbm(p * 3.0 + vec3(uTime * 0.04, 0.0, uTime * 0.03)) * 0.65 + fbm(p * 9.0 - uTime * 0.06) * 0.35;
        vec3 col = mix(vec3(0.45, 0.20, 0.90), vec3(0.95, 0.45, 0.65), smoothstep(0.3, 0.6, n));
        col = mix(col, vec3(1.0, 0.90, 0.78), smoothstep(0.55, 0.8, n));
        vec3 N = normalize(vN);
        vec3 V = normalize(cameraPosition - vWorld);
        float mu = max(dot(N, V), 0.0);
        col *= 0.55 + 0.7 * pow(mu, 0.6);
        gl_FragColor = vec4(col, 1.0);
      }`, { uTime: Orbit.uniforms.uTime });

    const group = new THREE.Group();
    const body = new THREE.Mesh(sphere(96), surface);
    body.scale.setScalar(d.r);
    group.add(body);

    const coronas = [
      { color: '#ff9ad0', scale: 3.0, opacity: 0.75 },
      { color: '#a895ff', scale: 5.6, opacity: 0.45 },
      { color: '#83d9ff', scale: 9.5, opacity: 0.18 },
    ].map((c) => {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({
        map: Orbit.glow(c.color), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: c.opacity,
      }));
      s.scale.setScalar(d.r * c.scale);
      group.add(s);
      return { sprite: s, ...c };
    });

    // Debris ring: ~1400 points in a flat, tilted disc.
    const count = innerWidth <= 760 ? 700 : 1400;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      const a = Math.random() * Math.PI * 2;
      const rad = d.r * (2.0 + Math.pow(Math.random(), 1.6) * 1.5);
      pos[i * 3] = Math.cos(a) * rad;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 0.18;
      pos[i * 3 + 2] = Math.sin(a) * rad;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const debris = new THREE.Points(geo, new THREE.PointsMaterial({
      size: 0.05, color: 0xcbb8ff, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    const tilt = new THREE.Group();
    tilt.rotation.set(0.5, 0, 0.2);
    tilt.add(debris);
    group.add(tilt);

    addPlanet(d, group, body, 0.02, { x: 0, y: 0 }, {
      update(dt) {
        debris.rotation.y += dt * 0.05 * Orbit.state.ambientK;
        const pulse = 1 + 0.04 * Math.sin(Orbit.time * 0.9);
        coronas.forEach((c, i) => c.sprite.scale.setScalar(d.r * c.scale * (i === 0 ? pulse : 1)));
      },
    });
  });
})();
