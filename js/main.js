// Composition root: wires content, UI and (optionally) the 3D scene. No rendering logic here.
import { SECTIONS, NAV, PROFILE, ACCENTS } from './content.js';
import { $, esc, mountChips, mountPanel, mountNav, mountTooltip } from './ui.js';
import { toggleTheme } from './theme.js';

let scene = null, current = null, chips = null; // chips is assigned after boot wiring; hover callbacks may fire earlier, so they use chips?.
const action = id => SECTIONS[id].action;

async function boot() {
  performance.mark('boot');
  const loader = $('#loader');
  const hideLoader = () => {
    if (!loader) return;
    loader.classList.add('done');
    setTimeout(() => { loader.hidden = true; }, 600);
  };
  const tip = mountTooltip();

  // Start both downloads now; they used to run one after the other.
  const sceneMod = import('./scene/index.js');
  const idMod = import('./idcard.js'); idMod.catch(() => {}); // handled below; stops an unhandled-rejection warning if the scene fails first

  try {
    if (!window.THREE) throw new Error('three.js did not load');
    const { createScene } = await sceneMod;
    scene = createScene($('#c'), {
      accents: ACCENTS,
      onPick: id => {
        if (!id) return current && focus(null);
        if (action(id) === 'play') scene.play(id);
        else if (action(id) === 'theme' || id !== current) activate(id);
      },
      onHover: (id, x, y) => { chips?.setHover(id); id ? tip.show(SECTIONS[id].label, x, y, ACCENTS[id]) : tip.hide(); },
    });
  } catch (err) {
    console.warn('3D scene unavailable, using fallback UI.', err);
    document.documentElement.classList.add('no-3d');
    $('#intro').append($('#chips'));
    hideLoader();
  }

  const intro = $('#intro'), chipBox = $('#chips');
  intro.querySelector('h1').innerHTML = `${esc(PROFILE.first)} <span>${esc(PROFILE.last)}</span>`;
  intro.querySelector('.tag').textContent = PROFILE.headline;

  let idCard = null;
  // The ID card builds a second WebGL context and big textures: do it AFTER the desk is visible, not before.
  if (scene) scene.ready.then(async () => {
    try { const { mountIdCard } = await idMod; idCard = mountIdCard($('#portrait')); idCard.setActive(!current); }
    catch (err) { console.warn('School ID unavailable:', err); $('#portrait').hidden = true; }
    hideLoader();
  });

  // Bottom nav: exactly NAV, in order. Coffee, lamp and the school ID are 3D-only (not nav targets).
  chips = mountChips(chipBox, NAV, activate, id => scene?.highlight(id));
  const panel = mountPanel($('#panel'), () => focus(null));
  const nav = mountNav({ onBack: () => focus(null), onStep: d => step(d) });
  // The object `d` places from `id` in NAV order, wrapping at both ends.
  const neighbour = (id, d) => NAV[(NAV.indexOf(id) + d + NAV.length) % NAV.length];
  function step(d) { if (current) focus(neighbour(current, d)); }

  function activate(id) { action(id) === 'theme' ? toggleTheme() : focus(id); }

  function focus(id) {
    current = id;
    const root = document.documentElement.style; // --c drives the kicker, panel edge, Back button; unset = default emerald
    id && ACCENTS[id] ? root.setProperty('--c', ACCENTS[id]) : root.removeProperty('--c');
    const away = !!(scene && id);
    document.documentElement.classList.toggle('focused', away);
    intro.inert = chipBox.inert = away;
    idCard?.setActive(!away); // the ID fades out on focus and must stop catching drags
    chips.setActive(id);
    id && !scene?.hasView(id) ? panel.show(id) : panel.hide(); // sections without a 3D "view" use the HTML panel
    nav.showBack(!!id);
    id ? nav.showSteps(neighbour(id, -1), neighbour(id, 1)) : nav.showSteps(null);
    scene?.focus(id);
  }

  addEventListener('keydown', e => {
    if (e.key === 'Escape') focus(null);
    if (e.altKey || e.ctrlKey || e.metaKey) return; // leave browser shortcuts (e.g. Alt+← = back) alone
    if (e.key === 'ArrowRight') step(1);
    if (e.key === 'ArrowLeft') step(-1);
  });
}
boot();