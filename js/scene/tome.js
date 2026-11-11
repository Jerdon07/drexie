import THREE from './three.js';
import { mat, box } from './primitives.js';

const clamp01 = t => Math.max(0, Math.min(1, t)), ease = t => t * t * (3 - 2 * t), PI = Math.PI, FLIP_SECONDS = .9;
const setMap = (m, tex) => { if (m.map !== tex) { const first = !m.map; m.map = tex; if (first || !tex) m.needsUpdate = true; } };

// An openable book built from real parts (boards, two page stacks, one turning leaf) so it can open and turn pages with NOTHING coplanar:
// every page is the top face of a box, like the desk, never an overlay plane, so it cannot z-fight.
//
// LOCAL FRAME (before group.scale): lying flat, front cover up (+y), spine on the -x edge, head of the page toward -z, origin = centre of the
// CLOSED book. `w` = page width (x), `l` = page length (z), `t` = thickness (y).
//   setOpen(0..1)  swings the front cover over to the left; the left stack grows as it lands
//   turn(i)        animates a leaf from the current spread to spread i (page 2i = left, 2i+1 = right); update(dt) advances it
//   setFaces(...)  hands over the textures (built lazily by the owner): cover, endpaper, pages[] (portrait canvases, flipY = false)
export function makeTome({ w: W, l: L, t: T, color, spineMap }) {
  const tc = .026, Tp = T - 2 * tc, pw = W - .04, pl = L - .06, eps = .006, X0 = -W / 2, base = -T / 2 + tc;
  const group = new THREE.Group();
  const board = mat(color, { roughness: .8 }), edge = mat(0xe8e4d8, { roughness: .9 }), coverOut = mat(0xffffff, { roughness: .8 }), coverIn = mat(0x8a8478, { roughness: .95 }); // endpaper: tinted down and desaturated so the warm key light doesn't blow it out to bright yellow
  const pgL = new THREE.MeshBasicMaterial({ color: 0xffffff }), pgR = pgL.clone(), leafF = pgL.clone(), leafB = pgL.clone(); // unlit, like the other readable surfaces
  const paper = [pgL, pgR, leafF, leafB]; // the scene dims these with the theme

  // Spine: strip + label plane, shown only while the book is closed (open, it disappears into the gutter). Its top/bottom sit 1 mm inside the boards.
  const spine = new THREE.Group();
  const label = new THREE.Mesh(new THREE.PlaneGeometry(T - .004, L + .02), new THREE.MeshStandardMaterial({ map: spineMap, roughness: .8 }));
  label.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, -1), new THREE.Vector3(-1, 0, 0))); // plane x -> +y, plane y -> -z (head), normal -> -x
  label.position.set(X0 - tc * .72 - .002, 0, 0);
  spine.add(box(tc * 1.2, T - .002, L + .03, board, X0 - tc * .1, 0, 0, .01), label);

  // Cover leaf: hinged on the spine axis (x = X0, y = 0 = mid-thickness), so after a half turn it lies exactly level with the back board.
  const coverPivot = new THREE.Group(); coverPivot.position.set(X0, 0, 0);
  coverPivot.add(box(W + .02, tc, L + .03, [board, board, coverOut, coverIn, board, board], W / 2 + .01, T / 2 - tc / 2, 0, .01));

  const blk = (m, x) => box(pw, 1, pl, [edge, edge, m, edge, edge, edge], x, 0, 0, .004); // unit-height block, scaled in y by the stack thickness
  const bR = blk(pgR, 0), bL = blk(pgL, X0 - W / 2);

  // Turning leaf: its centre is offset so it starts flush on the right stack and lands flush on the left one (see render()).
  const leafPivot = new THREE.Group(); leafPivot.position.set(X0, 0, 0); leafPivot.visible = false;
  const leaf = box(pw, eps, pl, [edge, edge, leafF, leafB, edge, edge], W / 2, 0, 0, .002); leafPivot.add(leaf);

  group.add(box(W + .02, tc, L + .03, board, .01, -T / 2 + tc / 2, 0, .01), spine, bR, bL, coverPivot, leafPivot);

  let pages = [], mirrors = [], n = 1, openP = 0, spread = 0, flip = null;
  const page = i => pages[i] || null;
  const mirror = i => { // the leaf's back face is seen upside-down-left after a half turn: mirror its texture (separate Texture, same canvas)
    if (!pages[i]) return null;
    return mirrors[i] ||= (() => { const m = pages[i].clone(); m.wrapS = THREE.RepeatWrapping; m.repeat.x = -1; m.offset.x = 1; m.needsUpdate = true; return m; })();
  };
  const lf = s => (n > 1 ? .08 + .84 * s / (n - 1) : .08); // share of the page stack that sits on the left at (fractional) spread s

  function render() {
    const co = ease(openP); coverPivot.rotation.z = PI * co; spine.visible = openP < .02;
    let s = spread, from = spread, to = spread, p = 1;
    if (flip) { ({ from, to, p } = flip); s = from + (to - from) * ease(p); }
    const tL = Tp * lf(s) * co, tR = Tp - tL, yR = base + tR, yL = base + tL;
    bR.scale.y = tR; bR.position.y = base + tR / 2; bL.scale.y = Math.max(tL, 1e-4); bL.position.y = base + tL / 2; bL.visible = tL > .004;

    let L_ = page(2 * spread), R_ = page(2 * spread + 1);
    if (flip) {
      const lo = Math.min(from, to), hi = Math.max(from, to), fwd = to > from;
      setMap(leafF, page(2 * lo + 1)); setMap(leafB, mirror(2 * hi)); // leaf: right page of the lower spread on top, left page of the higher one underneath
      if (fwd) { R_ = page(2 * hi + 1); L_ = page(2 * lo); } else { L_ = page(2 * lo); R_ = page(2 * hi + 1); } // the new page under the lifting leaf shows at once; the old one stays until it lands
    }
    setMap(pgL, L_); setMap(pgR, R_);

    leafPivot.visible = !!flip;
    if (flip) {
      leafPivot.position.y = (yR + yL) / 2 + eps / 2; leaf.position.y = (yR - yL) / 2; // start centre = yR + eps/2, end centre = yL + eps/2
      leafPivot.rotation.z = to > from ? PI * ease(p) : PI * (1 - ease(p));
    }
  }
  render();

  return {
    group, paper, spineX: X0, get count() { return n; }, get spread() { return spread; }, get busy() { return !!flip; },
    setFaces({ cover, end, list }) { pages = list; mirrors = []; n = Math.max(1, Math.ceil(list.length / 2)); setMap(coverOut, cover); setMap(coverIn, end); render(); },
    setOpen(p) { p = clamp01(p); if (p !== openP) { openP = p; render(); } },
    show(i) { spread = i; flip = null; render(); },
    turn(to) { if (flip || to === spread || to < 0 || to >= n) return false; flip = { from: spread, to, p: 0 }; render(); return true; },
    update(dt) { if (!flip) return; flip.p += dt / FLIP_SECONDS; if (flip.p >= 1) { spread = flip.to; flip = null; } render(); },
  };
}
