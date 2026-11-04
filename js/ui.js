// DOM-side widgets. Pure functions of content; no knowledge of three.js.
import { SECTIONS } from './content.js';

export const $ = s => document.querySelector(s);
const ENT = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = s => String(s).replace(/[&<>"']/g, c => ENT[c]);
// Visible AND focusable together: opacity-0 panels must not stay in the tab order.
const setLayer = (el, cls, on) => { el.classList.toggle(cls, on); el.inert = !on; };

export function mountChips(box, ids, onSelect) {
  const btns = ids.map(id => {
    const b = document.createElement('button');
    Object.assign(b, { className: 'chip', type: 'button', textContent: SECTIONS[id].label, onclick: () => onSelect(id) });
    b.dataset.id = id; box.append(b); return b;
  });
  return { setActive: id => btns.forEach(b => b.classList.toggle('on', b.dataset.id === id)) };
}

const badge = b => `<span class="b${b.accent ? ' e' : ''}">${esc(b.text)}</span>`;
const panelHtml = s => [
  `<div class="eb">${esc(s.kicker)}</div><h2>${esc(s.title)}</h2><p class="lead">${esc(s.lead)}</p>`,
  ...(s.paragraphs || []).map(t => `<p>${esc(t)}</p>`),
  ...(s.items || []).map(i => `<div class="pj"><b>${esc(i.title)}</b><span>${esc(i.text)}</span></div>`),
  ...(s.links || []).map(([t, href]) => `<a class="lk" rel="noopener" href="${esc(href)}">${esc(t)}</a>`),
  s.badges ? `<div class="bd">${s.badges.map(badge).join('')}</div>` : '',
  '<button class="btn" type="button" data-back>← Back to desk</button>',
].join('');

export function mountPanel(el, onBack) {
  setLayer(el, 'open', false);
  el.addEventListener('click', e => { if (e.target.closest('[data-back]')) onBack(); });
  return {
    show: id => { el.innerHTML = panelHtml(SECTIONS[id]); setLayer(el, 'open', true); },
    hide: () => setLayer(el, 'open', false),
  };
}

export function mountNav({ onBack, onFlip }) {
  const back = $('#hback'), book = $('#bnav'), pg = $('#pg');
  back.onclick = onBack; $('#pv').onclick = () => onFlip(-1); $('#nx').onclick = () => onFlip(1);
  return {
    showBack: on => setLayer(back, 'on', on),
    showBook: on => setLayer(book, 'on', on),
    setPage: (i, n) => { pg.textContent = `${i + 1} / ${n}`; },
  };
}

export function mountTooltip() {
  const el = $('#tip');
  return {
    show: (text, x, y) => { el.textContent = text; el.style.left = x + 'px'; el.style.top = y + 'px'; el.style.opacity = 1; },
    hide: () => { el.style.opacity = 0; },
  };
}
