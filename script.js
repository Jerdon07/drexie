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

if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      document.documentElement.classList.add('intro-playing');
    });
  });
}

const ambientMount = document.querySelector('.ambient-icons');
const ambientCanvas = document.querySelector('.ambient-canvas');

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
      context.roundRect(32, 24, 192, 208, 28);
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
        baseY: 0,
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
      addRenderCallback(callback) {
        renderCallbacks.add(callback);
        callback(0);
        return () => renderCallbacks.delete(callback);
      },
    };

    const render = (time = 0) => {
      if (document.hidden) {
        window.requestAnimationFrame(render);
        return;
      }

      if (!reducedMotion) {
        const seconds = time * .001;
        icons.forEach((sprite) => {
          sprite.position.y = sprite.userData.baseY
            + Math.sin(seconds * .45 + sprite.userData.phase) * sprite.userData.drift;
          sprite.material.rotation = Math.sin(seconds * .28 + sprite.userData.phase) * .08;
        });
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
