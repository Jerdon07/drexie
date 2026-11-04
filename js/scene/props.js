// Non-interactive scene furniture. Contract: () => { group, onTheme?(t), update?(dt) }
import THREE from './three.js';
import { mat, box } from './primitives.js';
import { mixTheme } from './palette.js';
import { REDUCED_MOTION } from '../config.js';

function lighting() {
  const group = new THREE.Group();
  const hemi = new THREE.HemisphereLight(0x9bb4d4, 0x10151c, .55);
  const sun = new THREE.DirectionalLight(0xffffff, .9); sun.position.set(-4, 9, 6); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 6, bottom: -6, near: 1, far: 26 });
  const l1 = new THREE.PointLight(0x34d399, .9, 16); l1.position.set(-5, 3, -2);
  const l2 = new THREE.PointLight(0x3b82f6, .9, 16); l2.position.set(5, 3, 3);
  group.add(hemi, sun, l1, l2);
  return { group, onTheme(t) { hemi.intensity = .55 + .6 * t; sun.intensity = .9 + .5 * t; l1.intensity = l2.intensity = .9 * (1 - t) + .1; } };
}

function desk() {
  const group = new THREE.Group();
  const top = box(14, .3, 6.6, mat(0x1a222c, { roughness: .85 }), 0, -.15, 0);
  const pad = box(8.6, .02, 3.8, mat(0x10161d, { roughness: .95 }), 0, .01, .4);
  top.receiveShadow = pad.receiveShadow = true; group.add(top, pad);
  return { group, onTheme(t) { mixTheme('desk', t, top.material.color); mixTheme('pad', t, pad.material.color); } };
}

function dust() {
  const N = innerWidth < 700 ? 220 : 520, p = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { p[i * 3] = (Math.random() - .5) * 28; p[i * 3 + 1] = Math.random() * 10 - 1; p[i * 3 + 2] = (Math.random() - .5) * 22; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  const group = new THREE.Points(g, new THREE.PointsMaterial({ color: 0x34d399, size: .04, transparent: true, opacity: .55, depthWrite: false }));
  return { group, onTheme: t => { group.material.opacity = .55 * (1 - t) + .12; }, update: dt => { if (!REDUCED_MOTION) group.rotation.y += dt * .02; } };
}

export default [lighting, desk, dust];
