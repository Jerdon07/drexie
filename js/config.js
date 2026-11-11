// Every tunable constant lives here. No magic numbers elsewhere.
export const REDUCED_MOTION = matchMedia('(prefers-reduced-motion: reduce)').matches;

export const FONT = { mono: 'ui-monospace,Menlo,monospace', sans: 'Inter,system-ui,sans-serif', serif: 'Georgia,serif' };
export const font = (size, family, style = '') => `${style} ${size}px ${family}`.trim();

// Canvas-texture palette (mirrors css/tokens.css; textures can't read CSS vars)
export const P = {
  em: '#42b883', emSoft: '#8ee3bf', sap: '#6b9bd1', pine: '#14704f', cobalt: '#1f4f82', // Vue-inspired: mint green on navy
  mute: '#9bb0c4', text: '#f2f7fa',
  screenBg: '#0a1424', panel: '#0f1f35', sidebar: '#0b172a',
  paper: '#f1ece0', page: '#f4efe3', ink: '#1d2530', body: '#2b3541', sub: '#4a5663', folio: '#8a8374',
  margin: 'rgba(180,60,60,.35)', traffic: ['#ff5f57', '#febc2e', '#28c840'],
};
export const BARS = [.5, .8, .6, .95, .7, .85];

// Portrait images. Each file is probed in IMG_DIRS order; if none loads, a generated silhouette (tinted per person) is used instead.
export const IMG_DIRS = ['images/', ''];
export const IMAGES = {
  mother:  { file: 'mother.png',  tint: '#d4789b' },
  father:  { file: 'father.png',  tint: '#4f86d6' },
  profile: { file: 'profile.png', tint: '#42b883' },
  // Certificates (Achievements sheet): drop images/cert1.jpg … cert6.jpg (.png works too). Until then a landscape placeholder is drawn.
  ...Object.fromEntries([1, 2, 3, 4, 5, 6].map(n => [`cert${n}`, { file: [`cert${n}.jpg`, `cert${n}.png`], tint: '#8a8374', kind: 'cert' }])),
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
export const SCENE_THEME = {
  dark:  { bg: 0x0a1424, desk: 0xb4c4d8, pad: 0x0c1a2e },
  light: { bg: 0xcfe6dc, desk: 0xffffff, pad: 0x3d5f7a },
};