// Every tunable constant lives here. No magic numbers elsewhere. (Colours live in css/tokens.css only.)
import { hex, rgba } from './colors.js';
export const REDUCED_MOTION = matchMedia('(prefers-reduced-motion: reduce)').matches;

export const FONT = { mono: 'ui-monospace,Menlo,monospace', sans: 'Inter,system-ui,sans-serif', serif: 'Georgia,serif' };
export const font = (size, family, style = '') => `${style} ${size}px ${family}`.trim();

// Canvas-texture palette. NO colours live here: every entry is a lazy read of a css/tokens.css variable (see js/colors.js).
const lazy = map => Object.defineProperties({}, Object.fromEntries(Object.entries(map).map(([k, f]) => [k, { get: f, enumerable: true }])));
export const P = lazy({
  em: () => hex('--em'), emSoft: () => hex('--em-soft'), sap: () => hex('--sap'), pine: () => hex('--pine'), cobalt: () => hex('--cobalt'),
  mute: () => hex('--p-mute'), text: () => hex('--p-text'),
  screenBg: () => hex('--p-screen'), panel: () => hex('--p-panel'), sidebar: () => hex('--p-sidebar'),
  paper: () => hex('--paper'), page: () => hex('--page'), ink: () => hex('--ink'), body: () => hex('--body'), sub: () => hex('--sub'), folio: () => hex('--folio'),
  margin: () => rgba('--margin', .35), traffic: () => ['--traffic-1', '--traffic-2', '--traffic-3'].map(hex),
});
export const BARS = [.5, .8, .6, .95, .7, .85];

// Portrait images. Each file is probed in IMG_DIRS order; if none loads, a generated silhouette (tinted per person) is used instead.
export const IMG_DIRS = ['images/', ''];
export const IMAGES = {
  mother:  { file: 'mother.png',  get tint() { return hex('--ph-mother'); } },
  father:  { file: 'father.png',  get tint() { return hex('--ph-father'); } },
  profile: { file: 'profile.png', get tint() { return hex('--em'); } },
  uc:      { file: 'uc.png',      get tint() { return hex('--em'); } }, // university logo on the school ID (textures.js idFrontTex); the generated emblem shows until the file exists
  // Certificates (Achievements sheet): drop the JPGs into public/images/. `ratio` = width / height of the scan; it sizes the frame on the sheet
  // (landscape vs portrait) and the placeholder shown until the file exists. Add one: entry here + an item in content.js SECTIONS.folders.
  graduation: cert('graduation-recognition.jpg', 1.5),
  movingup:   cert('moving-up-recognition.jpg', .667),
  wika:       cert('buwan-ng-wika.jpg', 1.5),
};
function cert(file, ratio) { return { file, ratio, kind: 'cert', get tint() { return hex('--folio'); } }; }
// Achievements sheet: ONE landscape page (all achievements visible at once). World size (it must stay clear of the laptop, glasses and the
// shelf's open book: x -2.7 ± 1.4, z 1.7 ± 1), and texture width in px (height follows the aspect).
export const SHEET = { w: 2.8, h: 2, px: 1680 };
// Education book on the shelf (scene/tome.js, objects/shelf.js, textures.js). w = page width, l = page length, t = thickness of the CLOSED book
// (a shelf miniature); `grow` scales it (along the book's own axes) on its way to the desk, so the pages you read are bigger. PX = texture px per world unit.
export const EDU_BOOK = { w: .6, l: .92, t: .42, grow: { x: 1.7, y: .9, z: 1.35 }, px: 1040 };
export const FOG = { near: 14, far: 34 };
// Smoothness knobs. ROUND = edge radius (world units) for boxes/cylinders; ENV.intensity = how strongly the procedural
// reflection environment lights materials (metals scale it up automatically). If everything looks washed out, lower it.
export const ROUND = { box: .05, cyl: .03 };
export const ENV = { intensity: .35 };
// World units the home camera is raised so the desk renders lower on screen (clears the title block). Raise to push objects down.
export const HOME_LIFT = -.15;
// World units the home camera pans right so the desk sits left of centre and the ID overlay has room. Fades out below ~1.3 aspect (see camera.js).
export const HOME_SHIFT = 2.5;
// Scene colours that blend with the lamp toggle: token name pairs, resolved lazily (scene/palette.js).
export const SCENE_THEME = { bg: ['--scene-bg-dark', '--scene-bg-light'], desk: ['--scene-desk-dark', '--scene-desk-light'], pad: ['--scene-pad-dark', '--scene-pad-light'] };
