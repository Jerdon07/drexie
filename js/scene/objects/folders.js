import THREE from '../three.js';
import { hex } from '../../colors.js';
import { mat, box } from '../primitives.js';
import { blank, certSheetTex, certCoverTex } from '../textures.js';
import { BOOK_PAGES } from '../../content.js';
import { SHEET } from '../../config.js';

// One long résumé-style sheet lying on the desk. The texture goes on the box's own top face (material array, like the desk),
// so there are no overlay planes and nothing to z-fight. On click the camera frames only the TOP of the sheet with its width fitted
// to the screen (camera.js, view.top); the rest runs off the bottom edge. Each achievement is its own block down the sheet: the book's "page"
// is the camera's scroll position, so ↓ / ↑ (buttons or keys) slide the camera down / up to the next block.
export default function folders() {
  const T = .04, n = BOOK_PAGES.length, edge = mat(hex('--page-edge'), { roughness: .9 }), face = new THREE.MeshBasicMaterial({ map: blank() });
  const group = new THREE.Group();
  group.add(box(SHEET.w, T, SHEET.h, [edge, edge, face, edge, edge, edge], 0, T / 2, 0)); // face order: +x, -x, +y (top), -y, +z, -z

  const PITCH = SHEET.pitch * SHEET.w / SHEET.px; // world distance the camera slides per block
  const view = { type: 'flat', w: SHEET.w, h: SHEET.h, y: T, top: SHEET.h * SHEET.content, scroll: 0 }; // camera.js reads `scroll` live
  const book = { // onChange: pager (main.js); onMove: set by the scene to re-aim the camera
    index: 0, count: n, onChange: null, onMove: null,
    go(i) { i = Math.max(0, Math.min(n - 1, i)); if (i === this.index) return; this.index = i; view.scroll = i * PITCH; this.onMove?.(); this.onChange?.(i, n); },
    flip(d) { this.go(this.index + d); },
  };
  return { id: 'folders', group, x: -2.6, z: 1.55, ry: .08, dist: 5, // z: the sheet is 3.2 long, so it spans -.05…3.15 (+.07 yaw): inside the desk edge at 3.3
    view, paper: [face], surfaces: [{ material: face, rest: face.map, preview: certCoverTex, full: certSheetTex }],
    book, onBlur: () => book.go(0) }; // re-enter at the top
}
