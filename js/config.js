// Every tunable constant lives here. No magic numbers elsewhere.
export const REDUCED_MOTION = matchMedia('(prefers-reduced-motion: reduce)').matches;

export const FONT = { mono: 'ui-monospace,Menlo,monospace', sans: 'Inter,system-ui,sans-serif', serif: 'Georgia,serif' };
export const font = (size, family, style = '') => `${style} ${size}px ${family}`.trim();

// Canvas-texture palette (mirrors css/tokens.css; textures can't read CSS vars)
export const P = {
  em: '#34d399', emSoft: '#86efc4', sap: '#3b82f6', pine: '#0f6b4f',
  mute: '#9aa7b4', text: '#f4f7fa',
  screenBg: '#0b1118', panel: '#121b26', sidebar: '#0f1620',
  paper: '#f1ece0', page: '#f4efe3', ink: '#1d2530', body: '#2b3541', sub: '#4a5663', folio: '#8a8374',
  margin: 'rgba(180,60,60,.35)', traffic: ['#ff5f57', '#febc2e', '#28c840'],
};
export const BARS = [.5, .8, .6, .95, .7, .85];
export const FOG = { near: 14, far: 34 };
export const SCENE_THEME = {
  dark:  { bg: 0x0a0e13, desk: 0x1a222c, pad: 0x10161d },
  light: { bg: 0xdfe6ee, desk: 0xa9b4c2, pad: 0x8e9bab },
};
