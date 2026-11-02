const menuToggle = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#primary-navigation');

if (menuToggle && navigation) {
  const closeMenu = () => {
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', 'Open navigation');
    navigation.classList.remove('is-open');
  };

  menuToggle.addEventListener('click', () => {
    const isOpen = menuToggle.getAttribute('aria-expanded') === 'true';
    menuToggle.setAttribute('aria-expanded', String(!isOpen));
    menuToggle.setAttribute('aria-label', isOpen ? 'Open navigation' : 'Close navigation');
    navigation.classList.toggle('is-open', !isOpen);
  });

  navigation.addEventListener('click', (event) => {
    if (event.target instanceof HTMLAnchorElement) closeMenu();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeMenu();
  });
}

const profilePhoto = document.querySelector('.profile-photo');
const photoPlaceholder = document.querySelector('.photo-placeholder');

if (profilePhoto && photoPlaceholder) {
  const revealProfilePhoto = () => {
    profilePhoto.hidden = false;
    photoPlaceholder.hidden = true;
  };

  if (profilePhoto.complete && profilePhoto.naturalWidth > 0) {
    revealProfilePhoto();
  } else {
    profilePhoto.addEventListener('load', revealProfilePhoto, { once: true });
  }
}

// Hero reveal. If the Three.js intro is running (`intro-pending`, set in <head>),
// the reveal waits for its `intro:reveal` event. Otherwise it plays immediately.
const rootElement = document.documentElement;
const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const revealHero = () => {
  // One synchronous swap: no frame where content is visible before its animation starts.
  if (!reducedMotionQuery) rootElement.classList.add('intro-playing');
  rootElement.classList.remove('intro-pending');
};

if (rootElement.classList.contains('intro-pending')) {
  window.addEventListener('intro:reveal', revealHero, { once: true });
} else if (!reducedMotionQuery) {
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(revealHero);
  });
}

const ambientMount = document.querySelector('.ambient-icons');
const ambientCanvas = document.querySelector('.ambient-canvas');

if (!window.THREE) {
  console.warn('Three.js did not load (blocked or offline?); the page falls back to the static layout.');
}

if (ambientMount && ambientCanvas && window.THREE) {
  const THREE = window.THREE;
  let renderer;

  try {
    renderer = new THREE.WebGLRenderer({
      canvas: ambientCanvas,
      alpha: true,
      antialias: true,
      powerPreference: 'low-power',
    });
  } catch (error) {
    console.warn('Three.js background unavailable; using the static icon fallback.', error);
  }

  if (renderer) {
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
    const renderCallbacks = new Set();
    const frameHooks = new Set(); // run once per frame, BEFORE anything renders
    const lateHooks = new Set(); // run after icon positions are final, right before render
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const iconData = [
      { symbol: '▦', label: 'ERP SYSTEMS', x: .08, y: .16, color: '#b7a5ff' },
      { symbol: '◉', label: 'BUSINESS DATA', x: .87, y: .29, color: '#83d9ff' },
      { symbol: '⌘', label: 'WORKFLOW', x: .18, y: .49, color: '#b7a5ff' },
      { symbol: '⬡', label: 'INVENTORY', x: .91, y: .68, color: '#83d9ff' },
      { symbol: '▥', label: 'ANALYTICS', x: .39, y: .86, color: '#b7a5ff' },
      { symbol: '▤', label: 'FINANCE', x: .67, y: .08, color: '#83d9ff' },
      { symbol: '☁', label: 'CLOUD ERP', x: .61, y: .42, color: '#b7a5ff' },
      { symbol: '⊞', label: 'INTEGRATION', x: .1, y: .76, color: '#83d9ff' },
    ];

    const makeIconTexture = ({ symbol, label, color }) => {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const context = canvas.getContext('2d');

      if (!context) {
        throw new Error('Canvas 2D context is unavailable for the Three.js icon texture.');
      }

      context.strokeStyle = `${color}66`;
      context.lineWidth = 2;
      context.beginPath();
      if (typeof context.roundRect === 'function') {
        context.roundRect(32, 24, 192, 208, 28);
      } else {
        // Fallback for iOS < 16, Chrome < 99, Firefox < 112: without it the whole scene silently dies.
        const [x, y, w, h, r] = [32, 24, 192, 208, 28];
        context.moveTo(x + r, y);
        context.arcTo(x + w, y, x + w, y + h, r);
        context.arcTo(x + w, y + h, x, y + h, r);
        context.arcTo(x, y + h, x, y, r);
        context.arcTo(x, y, x + w, y, r);
        context.closePath();
      }
      context.stroke();
      context.fillStyle = `${color}12`;
      context.fill();
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.shadowColor = color;
      context.shadowBlur = 20;
      context.fillStyle = color;
      context.font = '74px "Segoe UI Symbol", sans-serif';
      context.fillText(symbol, 128, 103);
      context.shadowBlur = 0;
      context.fillStyle = '#d7d4ff';
      context.font = '11px Consolas, monospace';
      context.letterSpacing = '2px';
      context.fillText(label, 128, 181);

      const texture = new THREE.CanvasTexture(canvas);
      texture.encoding = THREE.sRGBEncoding;
      return texture;
    };

    const icons = iconData.map((data, index) => {
      const material = new THREE.SpriteMaterial({
        map: makeIconTexture(data),
        transparent: true,
        opacity: .72,
        depthWrite: false,
      });
      const sprite = new THREE.Sprite(material);
      sprite.userData = {
        anchorX: data.x,
        anchorY: data.y,
        phase: index * 1.37,
        drift: .12 + (index % 3) * .035,
        baseX: 0,
        baseY: 0,
        offsetX: 0, // animated by intro.js
        offsetY: 0,
        opacity: .72,
      };
      sprite.scale.set(1.22, 1.22, 1);
      scene.add(sprite);
      return sprite;
    });

    const resize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const viewHeight = 10;
      const viewWidth = viewHeight * (width / height);

      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      renderer.setSize(width, height);
      camera.left = -viewWidth / 2;
      camera.right = viewWidth / 2;
      camera.top = viewHeight / 2;
      camera.bottom = -viewHeight / 2;
      camera.updateProjectionMatrix();

      icons.forEach((sprite) => {
        sprite.position.x = (sprite.userData.anchorX - .5) * viewWidth;
        sprite.position.y = (.5 - sprite.userData.anchorY) * viewHeight;
        sprite.userData.baseX = sprite.position.x;
        sprite.userData.baseY = sprite.position.y;
      });
    };

    camera.position.z = 10;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.setClearColor(0x000000, 0);
    resize();
    window.addEventListener('resize', resize);
    ambientMount.classList.add('has-three-background');
    window.portfolioThree = {
      THREE,
      renderer,
      icons,
      scene,
      frameHooks,
      lateHooks,
      addRenderCallback(callback) {
        renderCallbacks.add(callback);
        callback(0);
        return () => renderCallbacks.delete(callback);
      },
    };

    // One misbehaving hook must not kill the animation loop for everyone else.
    const runHooks = (hooks, time) => {
      hooks.forEach((hook) => {
        try {
          hook(time);
        } catch (error) {
          console.error('A Three.js frame hook failed and was removed.', error);
          hooks.delete(hook);
        }
      });
    };

    const render = (time = 0) => {
      if (document.hidden) {
        window.requestAnimationFrame(render);
        return;
      }

      if (!reducedMotion) {
        runHooks(frameHooks, time);

        const seconds = time * .001;
        icons.forEach((sprite) => {
          const data = sprite.userData;
          sprite.position.x = data.baseX + data.offsetX;
          sprite.position.y = data.baseY + data.offsetY
            + Math.sin(seconds * .45 + data.phase) * data.drift;
          sprite.material.opacity = data.opacity;
          sprite.material.rotation = Math.sin(seconds * .28 + data.phase) * .08;
        });

        runHooks(lateHooks, time);
      }

      renderer.render(scene, camera);
      renderCallbacks.forEach((callback) => {
        try {
          callback(time);
        } catch (error) {
          console.error('A Three.js scene callback failed.', error);
          renderCallbacks.delete(callback);
        }
      });
      if (!reducedMotion) window.requestAnimationFrame(render);
    };

    render();
  }
}