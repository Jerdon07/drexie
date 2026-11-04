import THREE from './three.js';
export const mat = (c, o) => new THREE.MeshStandardMaterial({ color: c, roughness: .55, metalness: .1, ...o });
export const box = (w, h, d, m, x = 0, y = 0, z = 0) => { const s = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); s.position.set(x, y, z); return s; };
export const cyl = (r, h, m, x = 0, y = 0, z = 0, r2) => { const s = new THREE.Mesh(new THREE.CylinderGeometry(r, r2 || r, h, 32), m); s.position.set(x, y, z); return s; };
export const screen = (w, h, map) => new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map }));
