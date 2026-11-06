import { makeNotebook } from './notebook.js';
import { eduTex, eduPreviewTex } from '../textures.js';

// Second notebook (cobalt cover, emerald pen) so it reads as a different book from About at a glance.
export default () => makeNotebook({ id: 'education', x: -5.5, z: -1.7, ry: .12, cover: 0x1e4fa8, spine: 0x153a7a, pen: 0x34d399, preview: eduPreviewTex, full: eduTex });