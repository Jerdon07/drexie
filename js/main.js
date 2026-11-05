// Composition root: wires content, UI and (optionally) the 3D scene. No rendering logic here.
import { SECTIONS, ORDER, PROFILE } from './content.js';
import { $, esc, mountChips, mountPanel, mountNav, mountTooltip } from './ui.js';
import { toggleTheme } from './theme.js';

let scene = null, current = null;
const action = id => SECTIONS[id].action;

async function boot() {
  const tip = mountTooltip();
  try {
    if (!window.THREE) throw new Error('three.js did not load');
    const { createScene } = await import('./scene/index.js'); // dynamic: a scene failure must not kill the UI
    scene = createScene($('#c'), {
      onPick: id => {
        if (!id) return current && focus(null);
        if (action(id) === 'play') scene.play(id);
        else if (action(id) === 'theme' || id !== current) activate(id);
      },
      onHover: (id, x, y) => id ? tip.show(SECTIONS[id].label, x, y) : tip.hide(),
    });
  } catch (err) {
    console.warn('3D scene unavailable, using fallback UI.', err);
    document.documentElement.classList.add('no-3d');
    $('#intro').append($('#chips'));
  }

  // Home UI (title + description, top center) is shown on every path, not just the fallback.
  const intro = $('#intro'), chipBox = $('#chips');
  intro.querySelector('h1').innerHTML = `${esc(PROFILE.first)} <span>${esc(PROFILE.last)}</span>`;
  intro.querySelector('.tag').textContent = PROFILE.headline;

  // Bottom nav: every interactive object except coffee (a 3D-only 'play' action).
  const chips = mountChips(chipBox, ORDER.filter(id => action(id) !== 'play'), activate);
  const panel = mountPanel($('#panel'), () => focus(null));
  const nav = mountNav({ onBack: () => focus(null), onFlip: d => scene?.bookOf(current)?.flip(d) });

  ORDER.forEach(id => { const b = scene?.bookOf(id); if (b) { b.onChange = nav.setPage; nav.setPage(b.index, b.count); } });

  function activate(id) { action(id) === 'theme' ? toggleTheme() : focus(id); }

  function focus(id) {
    current = id;
    const away = !!(scene && id);
    document.documentElement.classList.toggle('focused', away);
    intro.inert = chipBox.inert = away;
    chips.setActive(id);
    id && !scene?.hasView(id) ? panel.show(id) : panel.hide(); // sections without a 3D "view" use the HTML panel
    nav.showBack(!!id);
    nav.showBook(!!(id && scene?.bookOf(id)));
    scene?.focus(id);
  }

  addEventListener('keydown', e => {
    if (e.key === 'Escape') focus(null);
    const book = scene?.bookOf(current);
    if (book && e.key === 'ArrowRight') book.flip(1);
    if (book && e.key === 'ArrowLeft') book.flip(-1);
  });
}
boot();