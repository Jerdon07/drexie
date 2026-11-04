import THREE from './three.js';
import { SCENE_THEME } from '../config.js';
const toColors = o => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, new THREE.Color(v)]));
const dark = toColors(SCENE_THEME.dark), light = toColors(SCENE_THEME.light);
// Write the dark→light blend of a palette slot into `out`.
export const mixTheme = (slot, t, out) => out.copy(dark[slot]).lerp(light[slot], t);
