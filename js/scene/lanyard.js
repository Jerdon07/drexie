// Lanyard: a Verlet ribbon chain hanging from a fixed anchor, plus one rigid link for the swivel hardware + card.
// The strap is simulated and drawn in the screen plane (z = 0), face to the viewer, like a real strap hanging flat against a wall.
// What changes shape: the strap's centreline (it bends, swings and lengthens under pull, up to STRETCH). What never does: its width,
// its thickness, and the hardware + card (one rigid pose that is only translated/rotated).
// Units: 1 unit = 140 mm, so gravity 9.8 m/s² = 70 units/s².
import THREE from './three.js';

const V = THREE.Vector3;
const N = 16, ITER = 60, STEP = 1 / 120, MAX_STEPS = 4, G = -70; // many iterations on a short chain: the card's weight must not stretch the strap at rest
const R = 2 * N;                     // render sections: Catmull-Rom between the simulated particles keeps bends smooth
const SOFT = 1.03, STRETCH = 1.4;    // hangs at ≈5% strain under the card's weight; gives up to 40% when pulled, stiffening toward the cap
const TH = .006;                     // half thickness (~1.7 mm flat polyester ribbon)
const Z = new V(0, 0, 1);

// Cross-section faces: [width side, thickness side] for the two vertices of each face edge. Same winding for all four faces.
const FACES = [[[-1, 1], [1, 1]], [[1, -1], [-1, -1]], [[1, 1], [1, -1]], [[-1, -1], [-1, 1]]];
const FACE_U = [[0, 1], [0, 1], [.97, .97], [.03, .03]];

export function createLanyard({ anchor, length, width, rigid, tile, material, damp = .988 }) {
  const SEG = length / N, hw = width / 2;
  const p = Array.from({ length: N + 2 }, (_, i) => {
    const pos = new V(anchor.x, anchor.y - (i <= N ? i * SEG : N * SEG + rigid), 0);
    return { pos, prev: pos.clone(), w: i === 0 ? 0 : i === N + 1 ? .25 : 1 }; // w = inverse mass; the card end is 4x heavier
  });

  /* ribbon mesh: (R+1) sections × 8 verts (4 faces × 2 so each face keeps its own normal + UV) */
  const nv = (R + 1) * 8, pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), uv = new Float32Array(nv * 2), idx = [];
  for (let i = 0; i < R; i++) for (let k = 0; k < 4; k++) { const a = i * 8 + k * 2, b = a + 1, c = a + 8, d = c + 1; idx.push(a, c, b, b, c, d); }
  // v is tied to the REST length, so the weave and print stretch with the fabric (and never slide along it)
  for (let i = 0; i <= R; i++) for (let k = 0; k < 4; k++) for (let e = 0; e < 2; e++) uv.set([FACE_U[k][e], -(i * SEG / 2) / tile], (i * 8 + k * 2 + e) * 2);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); geo.setIndex(idx);
  const ribbon = new THREE.Mesh(geo, material); ribbon.frustumCulled = false; // the anchor is above the viewport

  const rp = Array.from({ length: R + 1 }, () => new V()), T = Array.from({ length: R + 1 }, () => new V()), B = Array.from({ length: R + 1 }, () => new V()), Nn = Array.from({ length: R + 1 }, () => new V());
  function sample() { // particles at even sections, Catmull-Rom midpoints (t = .5) at odd ones
    for (let j = 0; j <= R; j++) {
      const i = j >> 1; if (!(j & 1)) { rp[j].copy(p[i].pos); continue; }
      rp[j].set(0, 0, 0).addScaledVector(p[Math.max(i - 1, 0)].pos, -1).addScaledVector(p[i].pos, 9).addScaledVector(p[i + 1].pos, 9).addScaledVector(p[Math.min(i + 2, N + 1)].pos, -1).multiplyScalar(1 / 16);
    }
  }
  function frames() {
    for (let i = 0; i <= R; i++) {
      T[i].subVectors(rp[Math.min(i + 1, R)], rp[Math.max(i - 1, 0)]).normalize();
      B[i].crossVectors(Z, T[i]); if (B[i].lengthSq() < 1e-8) B[i].set(1, 0, 0); // width axis lies in the screen plane, ⟂ to the strap
      B[i].normalize(); Nn[i].crossVectors(T[i], B[i]);                          // face normal ≈ +z (toward the viewer)
    }
  }
  function writeGeometry() {
    for (let i = 0; i <= R; i++) {
      const q = rp[i], b = B[i], n = Nn[i];
      for (let k = 0; k < 4; k++) for (let e = 0; e < 2; e++) {
        const [sb, sn] = FACES[k][e], o = (i * 8 + k * 2 + e) * 3, nb = k === 2 ? 1 : k === 3 ? -1 : 0, nn = k === 0 ? 1 : k === 1 ? -1 : 0;
        pos[o] = q.x + b.x * sb * hw + n.x * sn * TH; pos[o + 1] = q.y + b.y * sb * hw + n.y * sn * TH; pos[o + 2] = q.z + b.z * sb * hw + n.z * sn * TH;
        nor[o] = b.x * nb + n.x * nn; nor[o + 1] = b.y * nb + n.y * nn; nor[o + 2] = b.z * nb + n.z * nn;
      }
    }
    geo.attributes.position.needsUpdate = geo.attributes.normal.needsUpdate = true; geo.computeBoundingSphere(); // raycasts use the sphere
  }

  /* rigid pose of crimp + swivel hardware + card (origin = strap end). A swivel lets the card turn independently of the strap,
     so the card always faces the viewer and only tilts to follow the strap's direction. */
  const pose = { pos: new V(), r: new V(1, 0, 0), u: new V(0, 1, 0), f: new V(0, 0, 1) };
  function updatePose() {
    pose.pos.copy(p[N].pos); pose.u.subVectors(p[N].pos, p[N + 1].pos).normalize();
    pose.r.crossVectors(pose.u, Z); if (pose.r.lengthSq() < 1e-8) pose.r.set(1, 0, 0); pose.r.normalize(); pose.f.crossVectors(pose.r, pose.u);
  }

  /* constraints. mode 0: rigid rod. 1: strap (progressive give). 2: minimum distance (bending stiffness). */
  const d = new V(), tmp = new V();
  function link(a, b, rest, mode, k = 1) {
    const A = p[a], Q = p[b], ws = A.w + Q.w; d.subVectors(Q.pos, A.pos); const len = d.length(); if (len < 1e-9) return;
    let to = rest, f = k;
    if (mode === 1) {
      const s = len / rest;
      if (s > STRETCH) to = rest * STRETCH;                                               // hard cap
      else if (s > SOFT) { const t = (s - SOFT) / (STRETCH - SOFT); to = rest * SOFT; f = .6 + .4 * t * t; } // elastic: soft at first, stiffer as it nears the cap
    } else if (mode === 2) { if (len >= rest) return; }
    d.multiplyScalar((len - to) / len * f / ws);
    A.pos.addScaledVector(d, A.w); Q.pos.addScaledVector(d, -Q.w);
  }

  let drag = null, acc = 0;
  const reach = j => j <= N ? j * SEG * STRETCH : N * SEG * STRETCH + rigid; // the rigid hardware link never stretches
  function substep() {
    for (let i = 1; i <= N + 1; i++) {
      const q = p[i]; if (!q.w) continue; // the dragged particle is placed below
      const vx = (q.pos.x - q.prev.x) * damp, vy = (q.pos.y - q.prev.y) * damp;
      q.prev.copy(q.pos); q.pos.x += vx; q.pos.y += vy + G * STEP * STEP;
    }
    if (drag) { // follow the pointer, but never farther than the strap can reach from the anchor
      const q = p[drag.j]; q.prev.copy(q.pos);
      tmp.subVectors(drag.target, anchor); const m = tmp.length(), lim = reach(drag.j); if (m > lim) tmp.multiplyScalar(lim / m);
      q.pos.lerp(tmp.add(anchor), .6);
    }
    for (let it = 0; it < ITER; it++) {
      for (let i = 0; i < N; i++) link(i, i + 1, SEG, 1);
      link(N, N + 1, rigid, 0);
      for (let i = 1; i < N; i++) link(i - 1, i + 1, SEG * 1.9, 2, .25);
      link(N - 1, N + 1, SEG + rigid * .985, 2, .5); // the strap end can't fold sharply against the crimp
    }
    for (let i = 1; i <= N + 1; i++) { p[i].pos.z = p[i].prev.z = 0; } // planar
  }

  function step(dt) {
    acc = Math.min(acc + dt, STEP * MAX_STEPS);
    while (acc >= STEP) { substep(); acc -= STEP; }
    sample(); frames(); updatePose(); writeGeometry();
  }
  sample(); frames(); updatePose(); writeGeometry();

  return {
    ribbon, pose, step,
    get dragging() { return !!drag; },
    energy() { let e = 0; for (let i = 1; i <= N + 1; i++) e += p[i].pos.distanceTo(p[i].prev); return e; }, // sleep test for the render loop
    strain() { let m = 0; for (let i = 0; i < N; i++) m = Math.max(m, p[i].pos.distanceTo(p[i + 1].pos) / SEG); return m; },
    // Grab the card particle if the card was hit, else the strap particle nearest the hit point. `point` is in world space.
    grab(point, onCard) {
      let j = N + 1;
      if (!onCard) { let best = 1e9; for (let i = 1; i <= N; i++) { const dd = p[i].pos.distanceToSquared(point); if (dd < best) { best = dd; j = i; } } }
      drag = { j, w0: p[j].w, off: p[j].pos.clone().sub(point), target: p[j].pos.clone() }; p[j].w = 0;
    },
    move(point) { if (drag) drag.target.copy(point).add(drag.off); },
    release() {
      if (!drag) return;
      const q = p[drag.j]; q.w = drag.w0; drag = null;
      tmp.subVectors(q.pos, q.prev); const m = tmp.length(); if (m > .06) q.prev.copy(q.pos).addScaledVector(tmp, -.06 / m); // cap fling speed
    },
  };
}