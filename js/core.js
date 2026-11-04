/*
 * core.js — shared renderer, loop and utilities. Everything else hangs off window.Orbit.
 *
 * Load order (all plain deferred scripts, so the site still works from file://):
 *   vendor/three.min.js -> core.js -> stars.js -> planets.js -> rig.js -> ui.js
 *
 * Modules never touch each other directly. They call Orbit.register(label, fn) to queue a
 * build stage; ui.js runs the stages one frame apart so the loader can show real progress.
 */
(() => {
  'use strict';

  const root = document.documentElement;
  const THREE = window.THREE || null;

  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const clamp01 = (v) => clamp(v, 0, 1);
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (v) => { const t = clamp01(v); return t * t * (3 - 2 * t); };
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const Orbit = (window.Orbit = {
    THREE,
    util: { clamp, clamp01, lerp, smooth },
    state: {
      ambient: !reduced, // user-facing "Ambient motion" switch
      ambientK: reduced ? 0 : 1, // smoothed 0..1 version that the animations actually read
      staticView: false,
      reduced,
      cam: 0, // damped camera chapter index (float)
      active: 0, // rounded chapter index
      dragDist: 0, // pixels moved during the last drag, used to tell a tap from a drag
    },
    time: 0,
    hooks: new Set(), // (dt, time) => void, run every frame before render
    resizers: new Set(),
    stages: [],
    planets: [],
    defs: [],
    uniforms: { uTime: { value: 0 } },
    sunDir: THREE ? new THREE.Vector3(0.55, 0.35, 0.75).normalize() : null,
    renderer: null,
    scene: null,
    camera: null,
    register(label, run) { Orbit.stages.push({ label, run }); },
  });

  // ---- Shared GLSL ---------------------------------------------------------
  Orbit.glsl = {
    vert: `
      varying vec3 vObj; varying vec3 vWorld; varying vec3 vN; varying vec2 vUv;
      void main() {
        vObj = position;
        vUv = uv;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorld = wp.xyz;
        vN = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    varyings: 'varying vec3 vObj; varying vec3 vWorld; varying vec3 vN; varying vec2 vUv;',
    noise: `
      float hash13(vec3 p) {
        p = fract(p * 0.3183099 + 0.1);
        p *= 17.0;
        return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
      }
      float noise(vec3 x) {
        vec3 i = floor(x);
        vec3 f = fract(x);
        f = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(mix(hash13(i + vec3(0.,0.,0.)), hash13(i + vec3(1.,0.,0.)), f.x),
              mix(hash13(i + vec3(0.,1.,0.)), hash13(i + vec3(1.,1.,0.)), f.x), f.y),
          mix(mix(hash13(i + vec3(0.,0.,1.)), hash13(i + vec3(1.,0.,1.)), f.x),
              mix(hash13(i + vec3(0.,1.,1.)), hash13(i + vec3(1.,1.,1.)), f.x), f.y),
          f.z);
      }
      float fbm(vec3 p) {
        float a = 0.5;
        float s = 0.0;
        for (int i = 0; i < 5; i++) {
          s += a * noise(p);
          p = p * 2.02 + vec3(1.7, 9.2, 3.1);
          a *= 0.5;
        }
        return s;
      }`,
  };

  // Soft radial sprite texture, cached per colour. Used for coronas, moon halos, satellites.
  const glowCache = {};
  Orbit.glow = (color = '#ffffff') => {
    if (glowCache[color]) return glowCache[color];
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, color);
    grad.addColorStop(0.25, color.length === 7 ? `${color}88` : color);
    grad.addColorStop(1, color.length === 7 ? `${color}00` : 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    const tex = new THREE.CanvasTexture(c);
    glowCache[color] = tex;
    return tex;
  };

  // ---- Fallback ------------------------------------------------------------
  Orbit.fallback = (why) => {
    console.warn('Orbit: falling back to the static page.', why || '');
    Orbit.state.staticView = true;
    Orbit.stop();
    root.classList.add('static-view');
    root.dispatchEvent(new CustomEvent('orbit:static', { detail: { on: true, forced: true } }));
  };

  if (!THREE) {
    Orbit.stop = () => {};
    Orbit.start = () => {};
    Orbit.fallback('three.min.js did not load');
    return;
  }

  // ---- Loop ----------------------------------------------------------------
  let raf = 0;
  let last = 0;

  const frame = (now) => {
    raf = window.requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    if (document.hidden || dt <= 0) return;

    const s = Orbit.state;
    s.ambientK += ((s.ambient ? 1 : 0) - s.ambientK) * (1 - Math.exp(-dt * 3));
    Orbit.time += dt * s.ambientK; // shader time freezes when ambient motion is off
    Orbit.uniforms.uTime.value = Orbit.time;

    Orbit.hooks.forEach((hook) => {
      try {
        hook(dt, Orbit.time);
      } catch (error) {
        console.error('A frame hook failed and was removed.', error);
        Orbit.hooks.delete(hook);
      }
    });
    Orbit.renderer.render(Orbit.scene, Orbit.camera);
  };

  Orbit.start = () => {
    if (raf || !Orbit.renderer) return;
    last = performance.now();
    raf = window.requestAnimationFrame(frame);
  };
  Orbit.stop = () => {
    window.cancelAnimationFrame(raf);
    raf = 0;
  };

  Orbit.setStatic = (on) => {
    if (!Orbit.renderer) return; // WebGL never came up: stay static
    Orbit.state.staticView = on;
    root.classList.toggle('static-view', on);
    if (on) Orbit.stop(); else Orbit.start();
    root.dispatchEvent(new CustomEvent('orbit:static', { detail: { on, forced: false } }));
  };

  // ---- Renderer, scene, camera --------------------------------------------
  Orbit.register('Opening the viewport', () => {
    const canvas = document.getElementById('scene');
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    renderer.setClearColor(0x04050c, 1);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.1, 900);
    camera.position.set(0, 0, 10);

    // Only the small moons use scene lights; every large body is a custom shader keyed to uSun.
    const sunLight = new THREE.DirectionalLight(0xffffff, 2.4);
    sunLight.position.copy(Orbit.sunDir).multiplyScalar(100);
    scene.add(sunLight, new THREE.AmbientLight(0x4a5088, 0.55));

    Orbit.renderer = renderer;
    Orbit.scene = scene;
    Orbit.camera = camera;

    const resize = () => {
      const maxDpr = innerWidth <= 760 ? 1.5 : 1.6;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr));
      renderer.setSize(innerWidth, innerHeight, false);
      camera.aspect = innerWidth / innerHeight;
      camera.updateProjectionMatrix();
      Orbit.resizers.forEach((fn) => fn());
    };
    resize();
    window.addEventListener('resize', resize);
  });
})();
