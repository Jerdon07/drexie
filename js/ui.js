// DOM-side widgets. Pure functions of content; no knowledge of three.js.
import { SECTIONS } from './content.js';
import { portraitSrc } from './images.js';
import { IMAGES } from './config.js';

export const $ = s => document.querySelector(s);
const ENT = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = s => String(s).replace(/[&<>"']/g, c => ENT[c]);
// Visible AND focusable together: opacity-0 panels must not stay in the tab order.
const setLayer = (el, cls, on) => { el.classList.toggle(cls, on); el.inert = !on; };

// Each chip owns its colour via --c (CSS does the rest). `onHover(id|null)` fires on pointer + keyboard focus so the 3D object can glow.
// `setHover(id)` is the reverse direction: the 3D object under the pointer lights its chip (.hot).
export function mountChips(box, ids, onSelect, onHover) {
  const btns = ids.map(id => {
    const b = document.createElement('button');
    Object.assign(b, { className: 'chip', type: 'button', textContent: SECTIONS[id].label, onclick: () => onSelect(id) });
    b.dataset.id = id; b.style.setProperty('--c', SECTIONS[id].accent);
    for (const [on, off] of [['pointerenter', 'pointerleave'], ['focus', 'blur']]) {
      b.addEventListener(on, () => onHover?.(id)); b.addEventListener(off, () => onHover?.(null));
    }
    box.append(b); return b;
  });
  return {
    setActive: id => btns.forEach(b => b.classList.toggle('on', b.dataset.id === id)),
    setHover: id => btns.forEach(b => b.classList.toggle('hot', b.dataset.id === id)),
  };
}

const badge = b => `<span class="b${b.accent ? ' e' : ''}">${esc(b.text)}</span>`;
// Every field a section can have maps to one block here, so the no-3D fallback shows the same content as the 3D screens.
const panelHtml = s => [
  s.photo ? `<figure class="ph"><img data-photo="${esc(s.photo)}" alt="${esc(s.title)}"></figure>` : '',
  `<div class="eb">${esc(s.kicker)}</div><h2>${esc(s.title)}</h2><p class="lead">${esc(s.lead)}</p>`,
  ...(s.paragraphs || []).map(t => `<p>${esc(t)}</p>`),
  ...(s.people || []).map(p => `<section class="pp"><figure class="ph person"><img data-photo="${esc(p.photo)}" alt="${esc(p.role)}"></figure><div class="eb sub">${esc(p.role)}</div><h3>${esc(p.name)}</h3><p>${esc(p.note)}</p></section>`),
  s.fields ? `<dl class="kv">${s.fields.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>` : '',
  ...(s.entries || []).map(e => `<div class="pj${e.todo ? ' todo' : ''}"><em>${esc(e.tag)}</em><b>${esc(e.title)}</b><strong>${esc(e.school)}</strong><span>${esc(e.meta)}</span></div>`),
  s.coursework ? `<div class="eb sub">Coursework &amp; focus</div><div class="bd">${s.coursework.map(t => `<span class="b">${esc(t)}</span>`).join('')}</div>` : '',
  ...(s.items || []).map(i => `<div class="pj">${i.image ? `<figure class="ph cert${IMAGES[i.image].ratio < 1 ? ' port' : ''}"><img data-photo="${esc(i.image)}" alt="${esc(i.title)}"></figure>` : ''}${i.year || i.tag ? `<em>${esc([i.year, i.tag].filter(Boolean).join(' · '))}</em>` : ''}<b>${esc(i.title)}</b>${i.text ? `<span>${esc(i.text)}</span>` : ''}${i.highlights ? `<ul class="hl">${i.highlights.map(h => `<li>${esc(h)}</li>`).join('')}</ul>` : ''}</div>`),
  ...(s.contacts || []).map(c => `<a class="lk" rel="noopener" href="${esc(c.href)}"><span class="k">${esc(c.label)}</span><span class="v">${esc(c.value)}</span></a>`),
  s.badges ? `<div class="bd">${s.badges.map(badge).join('')}</div>` : '',
  '<button class="btn" type="button" data-back>← Back to desk</button>',
].join('');

export function mountPanel(el, onBack) {
  setLayer(el, 'open', false);
  el.addEventListener('click', e => { if (e.target.closest('[data-back]')) onBack(); });
  return {
    show: id => {
      el.innerHTML = panelHtml(SECTIONS[id]);
      el.querySelectorAll('img[data-photo]').forEach(async img => { img.src = await portraitSrc(img.dataset.photo); }); // real file, else generated silhouette
      setLayer(el, 'open', true);
    },
    hide: () => setLayer(el, 'open', false),
  };
}

export function mountNav({ onBack, onFlip }) {
  const back = $('#hback'), book = $('#bnav'), pg = $('#pg');
  back.onclick = onBack; $('#pv').onclick = () => onFlip(-1); $('#nx').onclick = () => onFlip(1);
  return {
    showBack: on => setLayer(back, 'on', on),
    showBook: (on, axis = 'y') => { // 'y' = the sheet scrolls (↑ ↓), 'x' = pages turn (‹ ›)
      const [a, b] = axis === 'x' ? [['‹', 'Previous page'], ['›', 'Next page']] : [['↑', 'Scroll up'], ['↓', 'Scroll down']];
      if (on) { $('#pv').textContent = a[0]; $('#pv').setAttribute('aria-label', a[1]); $('#nx').textContent = b[0]; $('#nx').setAttribute('aria-label', b[1]); }
      setLayer(book, 'on', on);
    },
    setPage: (i, n) => { pg.textContent = `${i + 1} / ${n}`; $('#pv').disabled = i <= 0; $('#nx').disabled = i >= n - 1; },
  };
}

export function mountTooltip() {
  const el = $('#tip');
  return {
    show: (text, x, y, color) => { el.textContent = text; el.style.setProperty('--tc', color || ''); el.style.left = x + 'px'; el.style.top = y + 'px'; el.style.opacity = 1; },
    hide: () => { el.style.opacity = 0; },
  };
}