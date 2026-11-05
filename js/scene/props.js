// Non-interactive scene furniture. Contract: () => { group, x?, z?, ry?, cast?, onTheme?(t), update?(dt) }
import THREE from './three.js';
import { mat, box } from './primitives.js';
import { mixTheme } from './palette.js';
import { woodTex } from './textures.js';
import glasses from './decor/glasses.js';
import plush from './decor/plush.js';
import penStand from './decor/penstand.js';
import chair from './decor/chair.js';

function lighting() {
  const group = new THREE.Group();
  const hemi = new THREE.HemisphereLight(0xd9b896, 0x1c120b, .55);
  const sun = new THREE.DirectionalLight(0xffe6c8, .9); sun.position.set(-4, 9, 6); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 6, bottom: -6, near: 1, far: 26 });
  const l1 = new THREE.PointLight(0xffb27a, .9, 16); l1.position.set(-5, 3, -2);
  const l2 = new THREE.PointLight(0xd9a066, .9, 16); l2.position.set(5, 3, 3);
  const glow = new THREE.PointLight(0xffcf9a, .8, 14); glow.position.set(0, 4.5, .5); // the "light in the centre"
  group.add(hemi, sun, l1, l2, glow);
  return { group, onTheme(t) { hemi.intensity = .55 + .6 * t; sun.intensity = .9 + .5 * t; l1.intensity = l2.intensity = .9 * (1 - t) + .1; glow.intensity = .8 * (1 - t) + .15; } };
}

function desk() {
  const group = new THREE.Group();
  const topMat = mat(0xffffff, { map: woodTex(), roughness: .55, metalness: .05 }), side = mat(0x6a4126, { roughness: .6 });
  const top = new THREE.Mesh(new THREE.BoxGeometry(14, .3, 6.6), [side, side, topMat, side, side, side]); // only the +Y face gets the grain
  top.position.y = -.15; top.receiveShadow = true;
  const pad = box(8.6, .02, 3.8, mat(0x2b1d14, { roughness: .9 }), 0, .01, .4); pad.receiveShadow = true;
  group.add(top, pad);
  [[-6.5, -2.9], [6.5, -2.9], [-6.5, 2.9], [6.5, 2.9]].forEach(([x, z]) => group.add(box(.6, 5, .6, side, x, -2.8, z)));
  return { group, onTheme(t) { mixTheme('desk', t, topMat.color); mixTheme('pad', t, pad.material.color); } };
}

export default [lighting, desk, glasses, plush, penStand, chair];