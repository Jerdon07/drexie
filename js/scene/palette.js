import THREE from './three.js';
import { SCENE_THEME } from '../config.js';
import { hex } from '../colors.js';
const pairs = {}; // slot -> [darkColor, lightColor], built on first use so the stylesheet is certainly loaded
const get = slot => pairs[slot] ||= SCENE_THEME[slot].map(t => new THREE.Color(hex(t)));
// Write the dark->light blend of a palette slot into `out`.
export const mixTheme = (slot, t, out) => { const [d, l] = get(slot); return out.copy(d).lerp(l, t); };
