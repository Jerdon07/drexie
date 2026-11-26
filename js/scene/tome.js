import THREE from './three.js';
import { hex } from '../colors.js';
import { mat, box } from './primitives.js';

const clamp01 = t => Math.max(0, Math.min(1, t)), ease = t => t * t * (3 - 2 * t), PI = Math.PI;
const setMap = (m, tex) => { if (m.map !== tex) { m.map = tex; m.needsUpdate = true; } };

// An openable book built from real parts (boards and two page stacks) so it can open with NOTHING coplanar:
// every page is the top face of a box, like the desk, never an overlay plane, so it cannot z-fight. It shows ONE spread.
//
// LOCAL FRAME (before group.scale): lying flat, front cover up (+y), spine on the -x edge, head of the page toward -z, origin = centre of the
// CLOSED book. `w` = page width (x), `l` = page length (z), `t` = thickness (y).
//   setOpen(0..1)  swings the front cover over to the left; the left stack grows as it lands
//   setFaces(...)  hands over the textures (built lazily by the owner): cover, endpaper, pages [left, right] (flipY = false)
export function makeTome({ w: W, l: L, t: T, color, spineMap }) {
  const tc = .026, Tp = T - 2 * tc, pw = W - .04, pl = L - .06, X0 = -W / 2, base = -T / 2 + tc;
  const group = new THREE.Group();
  const board = mat(color, { roughness: .8 }), edge = mat(hex('--page-edge'), { roughness: .9 }), coverOut = mat(0xffffff, { roughness: .8 }), coverIn = mat(hex('--cover-in'), { roughness: .95 }); // endpaper: tinted down and desaturated so the warm key light doesn't blow it out to bright yellow
  const pgL = new THREE.MeshBasicMaterial({ color: 0xffffff }), pgR = pgL.clone(); // unlit, like the other readable surfaces
  const paper = [pgL, pgR]; // the scene dims these with the theme

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

  group.add(box(W + .02, tc, L + .03, board, .01, -T / 2 + tc / 2, 0, .01), spine, bR, bL, coverPivot);

  let openP = 0;
  function render() {
    const co = ease(openP); coverPivot.rotation.z = PI * co; spine.visible = openP < .02;
    const tL = Tp * .5 * co, tR = Tp - tL; // open, both stacks are equal, so the two photo pages sit level
    bR.scale.y = tR; bR.position.y = base + tR / 2; bL.scale.y = Math.max(tL, 1e-4); bL.position.y = base + tL / 2; bL.visible = tL > .004;
  }
  render();

  return {
    group, paper,
    setFaces({ cover, end, pages: [left, right] }) { setMap(coverOut, cover); setMap(coverIn, end); setMap(pgL, left); setMap(pgR, right); },
    setOpen(p) { p = clamp01(p); if (p !== openP) { openP = p; render(); } },
  };
}
