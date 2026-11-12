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
  // Key tags on the desk keys (scene/decor/keys.js): drop images/keytag1.png and images/keytag2.png (.jpg works too). Until then each tag shows an empty plate.
  keytag1: { file: ['keytag1.png', 'keytag1.jpg'], get tint() { return hex('--folio'); } },
  keytag2: { file: ['keytag2.png', 'keytag2.jpg'], get tint() { return hex('--folio'); } },
  // Certificates (Achievements sheet): drop images/cert1.jpg … cert6.jpg (.png works too). Until then a landscape placeholder is drawn.
  ...Object.fromEntries([1, 2, 3, 4, 5, 6].map(n => [`cert${n}`, { file: [`cert${n}.jpg`, `cert${n}.png`], get tint() { return hex('--folio'); }, kind: 'cert' }])),
};
// Achievements sheet: world size (A4 ratio), texture width in px, `content` = fraction of its height the camera frames at once
// (scene/camera.js, view.top), `pitch` = px between page blocks down the sheet. It must exceed the block height + the camera's top
// padding (~640 px) so that when the camera slides to block 2, block 1 has scrolled out of view.
export const SHEET = { w: 1.8, h: 2.55, px: 1240, content: .34, pitch: 700 };
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
