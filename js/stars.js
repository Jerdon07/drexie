/*
 * stars.js — everything that is "space" rather than "a planet":
 *   - two twinkling star layers spread through the whole flight corridor (real parallax)
 *   - a procedural nebula dome that follows the camera
 *   - occasional meteors (disabled when Ambient motion is off)
 */
(() => {
  'use strict';

  const Orbit = window.Orbit;
  if (!Orbit || !Orbit.THREE) return;
  const { THREE, glsl } = Orbit;
  const rand = (a, b) => a + Math.random() * (b - a);

  // ---- Stars ---------------------------------------------------------------
  Orbit.register('Mapping the stars', () => {
    const mobile = innerWidth <= 760;
    const px = { value: Orbit.renderer.getPixelRatio() };
    Orbit.resizers.add(() => { px.value = Orbit.renderer.getPixelRatio(); });

    const white = new THREE.Color(0xdfe8ff);
    const violet = new THREE.Color(0xb7a5ff);
    const cyan = new THREE.Color(0x83d9ff);

    const makeLayer = (count, size, maxPx) => {
      const pos = new Float32Array(count * 3);
      const sizes = new Float32Array(count);
      const phase = new Float32Array(count);
      const color = new Float32Array(count * 3);
      const tmp = new THREE.Color();

      for (let i = 0; i < count; i += 1) {
        pos[i * 3] = rand(-170, 170);
        pos[i * 3 + 1] = rand(-95, 95);
        pos[i * 3 + 2] = rand(-190, 50);
        sizes[i] = size * rand(0.5, 1.4);
        phase[i] = Math.random();
        const roll = Math.random();
        tmp.copy(roll < 0.7 ? white : roll < 0.9 ? violet : cyan).multiplyScalar(rand(0.55, 1));
        color[i * 3] = tmp.r;
        color[i * 3 + 1] = tmp.g;
        color[i * 3 + 2] = tmp.b;
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
      geo.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
      geo.setAttribute('aColor', new THREE.BufferAttribute(color, 3));

      const mat = new THREE.ShaderMaterial({
        uniforms: { uTime: Orbit.uniforms.uTime, uPx: px, uMax: { value: maxPx } },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexShader: `
          attribute float aSize; attribute float aPhase; attribute vec3 aColor;
          uniform float uTime; uniform float uPx; uniform float uMax;
          varying vec3 vColor; varying float vTw;
          void main() {
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            gl_Position = projectionMatrix * mv;
            vTw = 0.7 + 0.3 * sin(uTime * (0.7 + aPhase * 0.9) + aPhase * 40.0);
            vColor = aColor;
            float s = aSize * uPx * clamp(34.0 / max(-mv.z, 1.0), 0.0, 3.0);
            gl_PointSize = clamp(s, 1.0 * uPx, uMax * uPx);
          }`,
        fragmentShader: `
          varying vec3 vColor; varying float vTw;
          void main() {
            float d = length(gl_PointCoord - 0.5);
            float a = 1.0 - smoothstep(0.0, 0.5, d);
            a *= a;
            gl_FragColor = vec4(vColor, a * vTw);
          }`,
      });
      const points = new THREE.Points(geo, mat);
      points.frustumCulled = false;
      Orbit.scene.add(points);
    };

    makeLayer(mobile ? 1100 : 2600, 2.4, 3);
    makeLayer(mobile ? 90 : 220, 6.0, 7);
  });

  // ---- Nebula dome ---------------------------------------------------------
  Orbit.register('Painting the nebula', () => {
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(500, 32, 24),
      new THREE.ShaderMaterial({
        uniforms: { uTime: Orbit.uniforms.uTime },
        side: THREE.BackSide,
        depthWrite: false,
        depthTest: false,
        vertexShader: `
          varying vec3 vDir;
          void main() {
            vDir = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }`,
        fragmentShader: `
          varying vec3 vDir; uniform float uTime;
          ${glsl.noise}
          void main() {
            vec3 d = normalize(vDir);
            float a = fbm(d * 2.2 + vec3(0.0, uTime * 0.004, 0.0));
            float b = fbm(d * 4.5 + 7.3);
            float c = fbm(d * 1.3 + 21.0);
            vec3 col = vec3(0.22, 0.12, 0.50) * pow(a, 2.6) * 1.5;
            col += vec3(0.05, 0.25, 0.45) * pow(b, 3.0) * 1.2;
            col += vec3(0.40, 0.15, 0.35) * pow(c, 4.0) * 0.8;
            gl_FragColor = vec4(col, 1.0);
          }`,
      }),
    );
    dome.renderOrder = -100;
    dome.frustumCulled = false;
    Orbit.scene.add(dome);
    Orbit.hooks.add(() => dome.position.copy(Orbit.camera.position));
  });

  // ---- Meteors -------------------------------------------------------------
  Orbit.register('Waiting for meteors', () => {
    const geo = new THREE.PlaneGeometry(1, 1);
    geo.translate(-0.5, 0, 0); // head at x = 0, tail trailing toward -x
    const POOL = 5;
    const pool = [];

    for (let i = 0; i < POOL; i += 1) {
      const mesh = new THREE.Mesh(geo, new THREE.ShaderMaterial({
        uniforms: { uAlpha: { value: 0 } },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexShader: `
          varying vec2 vUv;
          void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: `
          varying vec2 vUv; uniform float uAlpha;
          void main() {
            float along = pow(vUv.x, 3.0);
            float across = 1.0 - smoothstep(0.0, 0.5, abs(vUv.y - 0.5));
            vec3 col = mix(vec3(0.55, 0.78, 1.0), vec3(1.0), vUv.x);
            gl_FragColor = vec4(col, along * across * uAlpha);
          }`,
      }));
      mesh.visible = false;
      mesh.frustumCulled = false;
      Orbit.scene.add(mesh);
      pool.push({ mesh, age: 0, life: 1, speed: 0, dir: new THREE.Vector3(), angle: 0, live: false });
    }

    const right = new THREE.Vector3();
    const up = new THREE.Vector3();
    const fwd = new THREE.Vector3();
    let timer = rand(1.5, 3);

    const spawn = (m) => {
      const cam = Orbit.camera;
      right.set(1, 0, 0).applyQuaternion(cam.quaternion);
      up.set(0, 1, 0).applyQuaternion(cam.quaternion);
      fwd.set(0, 0, -1).applyQuaternion(cam.quaternion);
      // Down-right or down-left, in the camera's screen plane.
      m.angle = Math.random() < 0.5 ? -rand(0.25, 0.75) : Math.PI + rand(0.25, 0.75);
      m.dir.copy(right).multiplyScalar(Math.cos(m.angle)).addScaledVector(up, Math.sin(m.angle));
      m.mesh.position.copy(cam.position)
        .addScaledVector(fwd, rand(16, 42))
        .addScaledVector(right, rand(-20, 20))
        .addScaledVector(up, rand(-6, 14));
      m.mesh.scale.set(rand(4, 9), 0.05, 1);
      m.speed = rand(24, 40);
      m.life = rand(0.8, 1.4);
      m.age = 0;
      m.live = true;
      m.mesh.visible = true;
    };

    Orbit.hooks.add((dt) => {
      const on = Orbit.state.ambient && !Orbit.state.reduced;
      timer -= dt;
      if (on && timer <= 0) {
        const free = pool.find((m) => !m.live);
        if (free) spawn(free);
        timer = rand(2.5, 6);
      }
      pool.forEach((m) => {
        if (!m.live) return;
        m.age += dt;
        if (m.age >= m.life || !on) {
          m.live = false;
          m.mesh.visible = false;
          return;
        }
        m.mesh.position.addScaledVector(m.dir, m.speed * dt);
        m.mesh.quaternion.copy(Orbit.camera.quaternion);
        m.mesh.rotateZ(m.angle);
        m.mesh.material.uniforms.uAlpha.value = Math.sin((m.age / m.life) * Math.PI) * 0.9;
      });
    });
  });
})();
