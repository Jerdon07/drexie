// Every tunable constant lives here. No magic numbers elsewhere.
export const REDUCED_MOTION = matchMedia('(prefers-reduced-motion: reduce)').matches;

export const FONT = { mono: 'ui-monospace,Menlo,monospace', sans: 'Inter,system-ui,sans-serif', serif: 'Georgia,serif' };
export const font = (size, family, style = '') => `${style} ${size}px ${family}`.trim();

// Canvas-texture palette (mirrors css/tokens.css; textures can't read CSS vars)
export const P = {
  em: '#34d399', emSoft: '#86efc4', sap: '#3b82f6', pine: '#0f6b4f', cobalt: '#1d4ed8',
  mute: '#9aa7b4', text: '#f4f7fa',
  screenBg: '#0b1118', panel: '#121b26', sidebar: '#0f1620',
  paper: '#f1ece0', page: '#f4efe3', ink: '#1d2530', body: '#2b3541', sub: '#4a5663', folio: '#8a8374',
  margin: 'rgba(180,60,60,.35)', traffic: ['#ff5f57', '#febc2e', '#28c840'],
};
export const BARS = [.5, .8, .6, .95, .7, .85];

// Portrait images. Each file is probed in IMG_DIRS order; if none loads, a generated silhouette (tinted per person) is used instead.
export const IMG_DIRS = ['images/', ''];
export const IMAGES = {
  mother:  { file: 'mother.png',  tint: '#d4789b' },
  father:  { file: 'father.png',  tint: '#4f86d6' },
  profile: { file: 'profile.png', tint: '#34d399' },
};
export const FOG = { near: 14, far: 34 };
// Smoothness knobs. ROUND = edge radius (world units) for boxes/cylinders; ENV.intensity = how strongly the procedural
// reflection environment lights materials (metals scale it up automatically). If everything looks washed out, lower it.
export const ROUND = { box: .05, cyl: .03 };
export const ENV = { intensity: .35 };
// World units the home camera is raised so the desk renders lower on screen (clears the title block). Raise to push objects down.
export const HOME_LIFT = .85;
// World units the home camera pans right so the desk sits left of centre and the ID overlay has room. Fades out below ~1.3 aspect (see camera.js).
export const HOME_SHIFT = 2.5;
export const SCENE_THEME = {
  dark:  { bg: 0x140d08, desk: 0xd8c4b0, pad: 0x2b1d14 },
  light: { bg: 0xcdbba3, desk: 0xffffff, pad: 0x7a6450 },
};