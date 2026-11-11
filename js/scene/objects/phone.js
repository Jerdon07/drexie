import THREE from '../three.js';
import { mat, box, cyl, screen } from '../primitives.js';
import { blank, phoneTex, phonePreviewTex, PHONE } from '../textures.js';
import { SECTIONS } from '../../content.js';

// Phone leaning back in a desk cradle. Focus = the camera faces the SCREEN and the content is shown on it, like picking a phone up:
// the contact rows are tappable (hover highlights, a tap opens the link).
const open = href => (href.startsWith('mailto:') ? (location.href = href) : window.open(href, '_blank', 'noopener'));

export default function phone() {
  const group = new THREE.Group(), metal = mat(0x2b3038, { metalness: .7, roughness: .3 }), stand = mat(0x1e3453, { metalness: .2, roughness: .5 }), dark = mat(0x0b0d10);
  group.add(box(1.2, .08, .85, stand, 0, .04, 0), box(.9, .14, .1, stand, 0, .12, .3), box(.14, 1, .06, stand, 0, .52, -.02));
  group.children[2].rotation.x = -.28;

  const ph = new THREE.Group(); ph.position.set(0, .17, .18); ph.rotation.x = -.28; group.add(ph);
  const scr = screen(.7, 1.5, blank()); scr.position.set(0, .8, .041); // texture assigned by the scene (preview now, full when focused)
  const bump = cyl(.11, .03, dark, -.2, 1.3, -.055); bump.rotation.x = Math.PI / 2;
  ph.add(box(.8, 1.6, .08, metal, 0, .8, 0), scr, bump, box(.02, .22, .03, metal, .41, 1.1, 0));

  let full = null, row = -1;
  // Which contact row (index) the ray hit on the screen is over, or -1. uv.y is bottom-up; canvas rows are top-down.
  const rowAt = hit => {
    if (!hit || hit.object !== scr || !hit.uv) return -1;
    const px = hit.uv.x * PHONE.w, py = (1 - hit.uv.y) * PHONE.h;
    return SECTIONS.phone.contacts.slice(0, PHONE.rows).findIndex((_, i) => { const r = PHONE.row(i); return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h; });
  };
  return { id: 'phone', group, x: 4.1, z: 1.1, ry: -.35, view: { type: 'screen', mesh: scr },
    surfaces: [{ material: scr.material, rest: scr.material.map, preview: phonePreviewTex, full: () => full ||= phoneTex() }],
    hover(hit) { const i = rowAt(hit); if (i !== row) { row = i; full?.redraw(i); } return i >= 0; },
    onClick(hit) { const k = SECTIONS.phone.contacts[rowAt(hit)]; if (k) open(k.href); },
    onBlur() { row = -1; full?.redraw(-1); } };
}
