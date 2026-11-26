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
  s.fields ? `<dl class="kv">${s.fields.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>` : '',
  ...(s.photos || []).map(p => `<figure class="ph album ${esc(p.shape)}"><img data-photo="${esc(p.image)}" alt="${esc(p.text)}"><figcaption>${esc(p.text)}</figcaption></figure>`),
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

export function mountNav({ onBack, onStep }) {
  const back = $('#hback'), steps = $('#onav'), pv = $('#pv'), nx = $('#nx');
  back.onclick = onBack; pv.onclick = () => onStep(-1); nx.onclick = () => onStep(1);
  const name = (b, text) => { b.title = text; b.setAttribute('aria-label', text); };
  return {
    showBack: on => setLayer(back, 'on', on),
    // `prev` / `next` = neighbouring object ids (tooltip + screen-reader name); null hides both buttons.
    showSteps: (prev, next) => {
      if (prev) { name(pv, `Previous: ${SECTIONS[prev].label}`); name(nx, `Next: ${SECTIONS[next].label}`); }
      setLayer(steps, 'on', !!prev);
    },
  };
}

export function mountTooltip() {
  const el = $('#tip');
  return {
    show: (text, x, y, color) => { el.textContent = text; el.style.setProperty('--tc', color || ''); el.style.left = x + 'px'; el.style.top = y + 'px'; el.style.opacity = 1; },
    hide: () => { el.style.opacity = 0; },
  };
}