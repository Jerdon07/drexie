import THREE from '../three.js';
import { hex } from '../../colors.js';
import { mat, box } from '../primitives.js';
import { spineTex, albumPageTexes, albumCoverTex, albumEndTex } from '../textures.js';
import { makeTome } from '../tome.js';
import { SECTIONS } from '../../content.js';
import { ALBUM_BOOK as BK, REDUCED_MOTION } from '../../config.js';

// Desk bookcase, two levels of books. Focusing it PULLS the first top-shelf book out, lays it on the desk and opens it: the family & friends
// photos are on that single spread. Leaving the view reverses it and puts the book back.
const W = 2.6, D = .8, T = .08, LEVEL = 1.08, H = 2 * LEVEL + T; // LEVEL = board-to-board spacing; clear height per level = LEVEL - T
const spines = () => [1, 2, 3, 4, 5, 6].map(n => hex(`--book-${n}`)); // colours come from css/tokens.css
const SHELF = { x: -5.4, z: -.8, ry: .25 };  // where the scene puts this object (returned below)
const READ = { x: -5.3, z: 1.5 };            // WORLD xz of the open book's spine (= centre of the spread): clear desk in front of the shelf
const PULL = .75, LIFT_ARC = .35;            // slide-out distance along the spine direction; extra height at mid-flight so it clears the boards
const DUR = { pull: .5, lift: 1, open: .9 }, TOTAL = DUR.pull + DUR.lift + DUR.open;
const ease = t => t * t * (3 - 2 * t), clamp01 = t => Math.max(0, Math.min(1, t));

export default function shelf() {
  const group = new THREE.Group(), wood = mat(hex('--wood'), { roughness: .6 }), backWood = mat(hex('--wood-deep'), { roughness: .7 }), pages = mat(hex('--page-edge'), { roughness: .9 });
  const { shelfBooks, title } = SECTIONS.album, SPINES = spines();

  // Carcass: 3 boards (bottom, middle, cap), 2 sides, a recessed back.
  for (let i = 0; i < 3; i++) group.add(box(W, T, D, wood, 0, i * LEVEL + T / 2, 0));
  for (const s of [-1, 1]) group.add(box(T, H, D, wood, s * (W / 2 - T / 2), H / 2, 0));
  group.add(box(W - 2 * T, H - T, T * .75, backWood, 0, H / 2, -D / 2 + T * .4));

  // Books stand on a board, spine to +z (the only face with a texture). Face order: +x, -x, +y, -y, +z, -z.
  // `skip` leaves that slot empty and reports its centre: that is where the openable book stands.
  const slot = new THREE.Vector3();
  const row = (level, items, size, skip = -1) => {
    let x = -W / 2 + T + .12; const y0 = level * LEVEL + T;
    items.forEach((label, i) => {
      const [w, h] = size(i), col = SPINES[i % SPINES.length], d = D - .2 - (i % 2) * .05;
      if (i === skip) slot.set(x + w / 2, y0 + h / 2, .04);
      else {
        const cover = mat(col, { roughness: .8 }), spine = mat(0xffffff, { map: spineTex(label, col), roughness: .8 });
        group.add(box(w, h, d, [cover, cover, pages, pages, spine, pages], x + w / 2, y0 + h / 2, .04));
      }
      x += w + .025;
    });
  };
  row(1, [title, ...shelfBooks.top], i => [.42, .92 - i * .06], 0);
  row(0, shelfBooks.bottom, i => [.26 + (i * 5 % 3) * .04, .7 + (i * 7 % 4) * .06]);

  // ---- the openable book: closed on the shelf (slot) -> pulled out -> flat on the desk (grown) -> open ----
  const tome = makeTome({ w: BK.w, l: BK.l, t: BK.t, color: SPINES[0], spineMap: spineTex(title, SPINES[0]) });
  group.add(tome.group);
  const toLocal = (wx, wz) => { const dx = wx - SHELF.x, dz = wz - SHELF.z, c = Math.cos(SHELF.ry), s = Math.sin(SHELF.ry); return [dx * c - dz * s, dx * s + dz * c]; }; // world -> shelf-local (yaw only)
  const [sx, sz] = toLocal(READ.x, READ.z), half = BK.w * BK.grow.x / 2, rest = BK.t * BK.grow.y / 2 + .002; // rest: origin height when lying on the desk
  const pulled = slot.clone().add(new THREE.Vector3(0, 0, PULL));
  const flatAt = new THREE.Vector3(sx + half * Math.cos(SHELF.ry), rest, sz + half * Math.sin(SHELF.ry)); // origin sits half a (grown) page right of the spine
  const q0 = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 0, -1), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, -1, 0))); // standing: spine -> +z, cover -> +x, head -> +y
  const q1 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -SHELF.ry); // flat and square to the screen (cancels the shelf's own yaw)
  const g = BK.grow;

  // Camera anchor = the centre of the open spread, in the shelf's frame but square to the world (so the page's top is screen-up).
  const anchor = new THREE.Object3D(); anchor.position.set(sx, rest, sz); anchor.rotation.y = -SHELF.ry; group.add(anchor);

  let Tm = 0, goal = 0, built = false; // Tm = timeline position (0 = on the shelf, TOTAL = open on the desk)
  function pose() {
    const a = ease(clamp01(Tm / DUR.pull)), b = ease(clamp01((Tm - DUR.pull) / DUR.lift)), c = ease(clamp01((Tm - DUR.pull - DUR.lift) / DUR.open));
    tome.group.position.lerpVectors(slot, pulled, a).lerp(flatAt, b).y += Math.sin(Math.PI * b) * LIFT_ARC;
    tome.group.quaternion.slerpQuaternions(q0, q1, b);
    tome.group.scale.set(1 + (g.x - 1) * b, 1 + (g.y - 1) * b, 1 + (g.z - 1) * b);
    tome.setOpen(c);
  }
  pose();
  function ensure() { // textures are big; make them the first time the book is wanted
    if (built) return; built = true;
    tome.setFaces({ cover: albumCoverTex(), end: albumEndTex(), pages: albumPageTexes() });
  }
  const move = to => { goal = to; if (REDUCED_MOTION) { Tm = goal; pose(); } };

  return {
    id: 'album', group, x: SHELF.x, z: SHELF.z, ry: SHELF.ry,
    // Centred and narrower than a widescreen window, so the corner buttons sit beside it: no need for the vertical gutter.
    view: { type: 'flat', node: anchor, w: 2 * BK.w * g.x, h: (BK.l - .06) * g.z, fill: { w: .98, h: .95 } },
    paper: tome.paper,
    onFocus() { ensure(); move(TOTAL); },
    onBlur() { move(0); },
    update(dt) {
      if (Tm !== goal) { Tm = goal > Tm ? Math.min(goal, Tm + dt) : Math.max(goal, Tm - dt * 1.6); pose(); }
    },
  };
}
