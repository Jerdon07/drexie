/*
 * ui.js — boot sequence, loader, HUD, chapter nav, settings, moon <-> card linking.
 *
 * Boot: runs every Orbit.register() stage one frame apart (so the loader bar actually
 * moves), force-compiles all shaders while every world is briefly visible (so scrolling
 * never hitches on a first-use compile), then fades the loader out.
 */
(() => {
  'use strict';

  const root = document.documentElement;
  const Orbit = window.Orbit;
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
  const nextFrame = () => new Promise((resolve) => window.requestAnimationFrame(resolve));

  const loader = $('#loader');
  const loaderLabel = $('#loader-label');

  // ---- Non-3D UI (works in static view too) --------------------------------
  const chapters = $$('[data-chapter]');
  const labels = chapters.map((el) => el.dataset.label || '');

  // Portrait: show it only if the file actually loads (otherwise keep the gradient placeholder).
  const photo = $('.profile-photo');
  const placeholder = $('.photo-placeholder');
  if (photo && placeholder) {
    const reveal = () => { photo.hidden = false; placeholder.hidden = true; };
    if (photo.complete && photo.naturalWidth > 0) reveal();
    else photo.addEventListener('load', reveal, { once: true });
  }

  // Chapter dots
  const dots = $('#chapter-nav');
  if (dots) {
    dots.innerHTML = chapters.map((el, i) => (
      `<a href="#${el.id}" aria-label="${labels[i]}" data-i="${i}"><span>${String(i + 1).padStart(2, '0')} ${labels[i]}</span></a>`
    )).join('');
  }

  const hudIndex = $('#hud-index');
  const hudName = $('#hud-name');
  const setChapter = (i) => {
    if (hudIndex) hudIndex.textContent = `${String(i + 1).padStart(2, '0')} / ${String(chapters.length).padStart(2, '0')}`;
    if (hudName) hudName.textContent = labels[i] || '';
    $$('a', dots || document.createElement('div')).forEach((a) => {
      if (Number(a.dataset.i) === i) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
    });
  };
  setChapter(0);
  root.addEventListener('orbit:chapter', (e) => setChapter(e.detail.index));

  // In static view there is no camera, so derive the HUD from scroll instead.
  const staticTracker = () => {
    if (!root.classList.contains('static-view')) return;
    const mid = window.scrollY + innerHeight * 0.4;
    let idx = 0;
    chapters.forEach((el, i) => { if (el.getBoundingClientRect().top + window.scrollY <= mid) idx = i; });
    setChapter(idx);
  };
  window.addEventListener('scroll', staticTracker, { passive: true });

  // Fade the fixed HUD/hint out while the footer is on screen so they never overlap it.
  const footer = $('.site-footer');
  if (footer && 'IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => root.classList.toggle('footer-visible', entry.isIntersecting), { threshold: 0.15 }).observe(footer);
  }

  // Settings
  const settingsBtn = $('#settings-toggle');
  const settingsPanel = $('#settings');
  const ambientSwitch = $('#set-ambient');
  const resetBtn = $('#set-reset');
  const staticSwitch = $('#set-static');

  const openSettings = (open) => {
    if (!settingsBtn || !settingsPanel) return;
    settingsBtn.setAttribute('aria-expanded', String(open));
    settingsPanel.hidden = !open;
  };
  if (settingsBtn && settingsPanel) {
    settingsBtn.addEventListener('click', () => openSettings(settingsBtn.getAttribute('aria-expanded') !== 'true'));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') openSettings(false); });
    document.addEventListener('pointerdown', (e) => {
      if (!settingsPanel.hidden && !e.target.closest('.settings')) openSettings(false);
    });
  }

  const syncSwitches = () => {
    if (ambientSwitch) ambientSwitch.setAttribute('aria-checked', String(Orbit.state.ambient));
    if (staticSwitch) staticSwitch.setAttribute('aria-checked', String(Orbit.state.staticView));
  };
  if (ambientSwitch) {
    ambientSwitch.addEventListener('click', () => { Orbit.state.ambient = !Orbit.state.ambient; syncSwitches(); });
  }
  if (resetBtn) {
    resetBtn.addEventListener('click', () => { if (Orbit.resetPositions) Orbit.resetPositions(); });
  }
  if (staticSwitch) {
    staticSwitch.addEventListener('click', () => {
      if (!Orbit.renderer) return; // 3D never started; page is already static
      Orbit.setStatic(!Orbit.state.staticView);
      syncSwitches();
      window.setTimeout(() => { if (Orbit.relayout) Orbit.relayout(); staticTracker(); }, 60);
    });
  }
  root.addEventListener('orbit:static', syncSwitches);
  syncSwitches();

  // ---- Failure paths -------------------------------------------------------
  const hideLoader = () => {
    if (!loader) return;
    root.classList.add('is-ready');
    loader.classList.add('is-done');
    window.setTimeout(() => { loader.hidden = true; }, 900);
  };

  if (!Orbit || !Orbit.THREE) {
    hideLoader(); // core.js already switched the page to static view
    return;
  }

  // ---- Boot ----------------------------------------------------------------
  (async () => {
    let failed = false;
    const failsafe = window.setTimeout(() => {
      Orbit.fallback('boot took longer than 12s');
      hideLoader();
    }, 12000);

    const total = Orbit.stages.length + 1;
    let done = 0;
    for (const stage of Orbit.stages) {
      if (loaderLabel) loaderLabel.textContent = stage.label;
      await nextFrame();
      try {
        stage.run();
      } catch (error) {
        console.error(`Boot stage "${stage.label}" failed.`, error);
        Orbit.fallback(error && error.message);
        failed = true;
        break;
      }
      done += 1;
      root.style.setProperty('--load', (done / total).toFixed(3));
    }

    if (!failed) {
      try {
        if (loaderLabel) loaderLabel.textContent = 'Compiling the cosmos';
        await nextFrame();
        // Compile with every world visible, then let rig.js hide the distant ones again.
        Orbit.planets.forEach((p) => { p.group.visible = true; });
        Orbit.renderer.compile(Orbit.scene, Orbit.camera);
        Orbit.start();
        await nextFrame();
        await nextFrame();
      } catch (error) {
        console.error('Shader compile failed.', error);
        Orbit.fallback(error && error.message);
        failed = true;
      }
    }

    window.clearTimeout(failsafe);
    root.style.setProperty('--load', '1');
    hideLoader();
    if (!failed) wireMoons();
    syncSwitches();
    if (failed) staticTracker();
  })();

  // ---- Moons <-> goal cards ------------------------------------------------
  function wireMoons() {
    const aurelia = Orbit.planets[2];
    const cards = $$('[data-moon]');
    if (!aurelia || !aurelia.moons || !cards.length) return;
    const canvas = $('#scene');
    let cardHover = -1;
    let pickHover = -1;
    let active = -1;

    const apply = () => aurelia.setHover(cardHover >= 0 ? cardHover : pickHover);
    const setActive = (i) => {
      active = active === i ? -1 : i;
      aurelia.setActive(active);
      cards.forEach((c) => c.classList.toggle('is-active', Number(c.dataset.moon) === active));
    };

    cards.forEach((card) => {
      const i = Number(card.dataset.moon);
      card.addEventListener('pointerenter', () => { cardHover = i; apply(); });
      card.addEventListener('pointerleave', () => { cardHover = -1; apply(); });
      card.addEventListener('click', () => setActive(i));
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActive(i); }
      });
    });

    window.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch' || e.target !== canvas) {
        if (pickHover !== -1) { pickHover = -1; apply(); canvas.classList.remove('is-pick'); }
        return;
      }
      const idx = Orbit.pickMoon(e.clientX, e.clientY);
      if (idx !== pickHover) {
        pickHover = idx;
        apply();
        canvas.classList.toggle('is-pick', idx >= 0);
      }
    });

    canvas.addEventListener('click', (e) => {
      if (Orbit.state.dragDist > 6) return; // that was a drag, not a tap
      const idx = Orbit.pickMoon(e.clientX, e.clientY);
      if (idx >= 0) setActive(idx);
    });
  }
})();
