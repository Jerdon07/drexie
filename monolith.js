const initMonolith = () => {
  const stage = document.querySelector('.monolith-stage');
  const portfolioThree = window.portfolioThree;

  if (!stage || !portfolioThree) return;

  const { THREE, renderer, addRenderCallback } = portfolioThree;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, .1, 100);
  camera.position.set(0, 0, 8);

  const root = new THREE.Group();
  const artifact = new THREE.Group();
  root.add(artifact);
  scene.add(root);
  // Looking slightly down on the stack so each layer reads as a plate, not an edge-on line.
  artifact.rotation.set(.5, .62, 0);

  // ---- The ERP stack: four glass layers with one core running through them ----
  const roundedRect = (width, height, radius) => {
    const outline = new THREE.Shape();
    const x = -width / 2;
    const y = -height / 2;
    outline.moveTo(x + radius, y);
    outline.lineTo(x + width - radius, y);
    outline.quadraticCurveTo(x + width, y, x + width, y + radius);
    outline.lineTo(x + width, y + height - radius);
    outline.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    outline.lineTo(x + radius, y + height);
    outline.quadraticCurveTo(x, y + height, x, y + height - radius);
    outline.lineTo(x, y + radius);
    outline.quadraticCurveTo(x, y, x + radius, y);
    return outline;
  };

  const plateGeometry = new THREE.ExtrudeGeometry(roundedRect(1.15, .85, .12), {
    depth: .06,
    bevelEnabled: true,
    bevelSegments: 3,
    steps: 1,
    bevelSize: .02,
    bevelThickness: .02,
    curveSegments: 8,
  });
  plateGeometry.rotateX(-Math.PI / 2); // extrude along y: the plate lies flat
  plateGeometry.center();

  const glassMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xaeb8ff,
    metalness: 0,
    roughness: .08,
    transmission: .9,
    thickness: .3,
    ior: 1.5,
    iridescence: .15,
    iridescenceIOR: 1.3,
    iridescenceThicknessRange: [120, 240],
    clearcoat: .8,
    clearcoatRoughness: .04,
    attenuationColor: new THREE.Color(0x776bff),
    attenuationDistance: 1.6,
    envMapIntensity: 1.35,
  });
  if ('dispersion' in glassMaterial) glassMaterial.dispersion = .08;

  // Transmission is the least portable thing here: it needs WebGL2 and an extra full-scene render
  // pass, which phones pay for in battery and frame rate (and some GPUs render it black).
  // Phones and WebGL1 get tinted translucent glass instead; the stack is small there anyway.
  const cheapGlass = !renderer.capabilities.isWebGL2
    || (window.matchMedia('(pointer: coarse)').matches && window.innerWidth <= 900);
  const glassRest = cheapGlass ? { transparent: true, opacity: .32 } : { transparent: false, opacity: 1 };
  if (cheapGlass) {
    glassMaterial.transmission = 0;
    glassMaterial.depthWrite = false;
  }
  glassMaterial.transparent = glassRest.transparent;
  glassMaterial.opacity = glassRest.opacity;

  // Thin glass vanishes without an outline, so the edges carry more weight than before.
  const EDGE_OPACITY = .6;
  const plateEdges = new THREE.EdgesGeometry(plateGeometry, 24);
  // Offset edge tints fake a subtle prism fringe (this Three.js release has no spectral dispersion).
  const edgeTints = [
    { material: new THREE.LineBasicMaterial({ color: 0x8be4ff, transparent: true, opacity: EDGE_OPACITY, depthWrite: false }), x: -.012 },
    { material: new THREE.LineBasicMaterial({ color: 0xc3a3ff, transparent: true, opacity: EDGE_OPACITY, depthWrite: false }), x: .012 },
  ];

  const edgeLines = [];
  const stack = new THREE.Group();
  artifact.add(stack);
  const plates = [-.78, -.26, .26, .78].map((y) => {
    const plate = new THREE.Group();
    plate.position.y = y;
    plate.userData.baseY = y;
    plate.add(new THREE.Mesh(plateGeometry, glassMaterial));
    edgeTints.forEach(({ material, x }) => {
      const line = new THREE.LineSegments(plateEdges, material);
      line.position.x = x;
      plate.add(line);
      edgeLines.push(line);
    });
    stack.add(plate);
    return plate;
  });

  // ---- The core: sits in the middle gap; a beam passes through every layer ----
  const core = new THREE.Group();
  artifact.add(core);

  core.add(new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(.2, 2)),
    new THREE.LineBasicMaterial({
      color: 0xd3f2ff,
      transparent: true,
      opacity: .98,
      blending: THREE.AdditiveBlending,
    }),
  ));

  [
    { radius: .16, rotation: [Math.PI / 2, 0, 0], color: 0x83d9ff },
    { radius: .2, rotation: [.35, .9, .2], color: 0xb69bff },
  ].forEach(({ radius, rotation, color }) => {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(radius, .006, 8, 72),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: .92,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    ring.rotation.set(...rotation);
    core.add(ring);
  });

  // The vertical beam: data flowing through every layer. Symmetric around y, so spinning the core is seamless.
  core.add(new THREE.Mesh(
    new THREE.CylinderGeometry(.007, .007, 1.7, 8),
    new THREE.MeshBasicMaterial({
      color: 0x83d9ff,
      transparent: true,
      opacity: .55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  ));

  const particleCount = 500;
  const particlePositions = new Float32Array(particleCount * 3);
  const particleColors = new Float32Array(particleCount * 3);
  const violet = new THREE.Color(0xb9a2ff);
  const blue = new THREE.Color(0x75dfff);
  for (let index = 0; index < particleCount; index += 1) {
    const radius = Math.cbrt(Math.random()) * .24;
    const theta = Math.random() * Math.PI * 2;
    const z = (Math.random() * 2) - 1;
    const planarRadius = Math.sqrt(1 - (z * z));
    const offset = index * 3;
    particlePositions[offset] = radius * planarRadius * Math.cos(theta);
    particlePositions[offset + 1] = radius * z;
    particlePositions[offset + 2] = radius * planarRadius * Math.sin(theta);
    const color = violet.clone().lerp(blue, Math.random());
    particleColors[offset] = color.r;
    particleColors[offset + 1] = color.g;
    particleColors[offset + 2] = color.b;
  }

  const particleGeometry = new THREE.BufferGeometry();
  particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
  particleGeometry.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));
  core.add(new THREE.Points(
    particleGeometry,
    new THREE.PointsMaterial({
      size: .03,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      sizeAttenuation: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  ));

  const coreGlow = new THREE.Mesh(
    new THREE.SphereGeometry(.14, 24, 24),
    new THREE.MeshBasicMaterial({
      color: 0x9875ff,
      transparent: true,
      opacity: .38,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  core.add(coreGlow);

  const environmentFaces = Array.from({ length: 6 }, (_, index) => {
    const face = document.createElement('canvas');
    face.width = 128;
    face.height = 128;
    const context = face.getContext('2d');

    if (!context) throw new Error('Unable to create the glass environment texture.');

    context.fillStyle = '#090b1a';
    context.fillRect(0, 0, 128, 128);
    const hue = index % 2 === 0 ? '#9a7aff' : '#71dfff';
    const glow = context.createRadialGradient(64, 46 + (index * 7), 2, 64, 64, 76);
    glow.addColorStop(0, `${hue}b0`);
    glow.addColorStop(.28, `${hue}32`);
    glow.addColorStop(1, '#080a1900');
    context.fillStyle = glow;
    context.fillRect(0, 0, 128, 128);
    return face;
  });
  const environment = new THREE.CubeTexture(environmentFaces);
  environment.encoding = THREE.sRGBEncoding;
  environment.needsUpdate = true;
  scene.environment = environment;

  scene.add(new THREE.HemisphereLight(0xb7c9ff, 0x21133d, 1.35));
  const keyLight = new THREE.PointLight(0x91dcff, 18, 12);
  keyLight.position.set(-2.2, 2.6, 3.5);
  scene.add(keyLight);
  const rimLight = new THREE.PointLight(0x9c75ff, 22, 10);
  rimLight.position.set(2.4, -.7, -1.8);
  scene.add(rimLight);

  // Layout: the stack starts CENTERED in the stage (intro) and glides to a "dock" flush
  // with the stage's right edge. The dock is computed from the visible width, so it can
  // never fall outside the stage, whatever the screen size. `dock` 0 = centered, 1 = docked.
  const introPending = document.documentElement.classList.contains('intro-pending');
  const layout = {
    dock: introPending ? 0 : 1,
    dockTarget: introPending ? 0 : 1,
    dockX: 0,
    centerScale: 1,
    dockScale: 1,
    spin: 0, // extra yaw (radians), driven by intro.js while the stack spins in
    rippleAge: 10, // seconds since a data pulse hit the core; hub.js resets it to 0
  };
  const HALF_SHAPE_WIDTH = .72; // half-diagonal of a plate (~.69) plus margin
  const lerp = (from, to, amount) => from + (to - from) * amount;
  const applyLayout = () => {
    root.position.set(layout.dockX * layout.dock, lerp(0, .28, layout.dock), 0);
    root.scale.setScalar(lerp(layout.centerScale, layout.dockScale, layout.dock));
  };

  // Handles for intro.js, hub.js and any future scene choreography.
  portfolioThree.monolith = {
    scene,
    camera,
    root,
    artifact,
    shell: stack,
    glassMaterial,
    glassRest, // what the glass settles to once the intro is over
    edges: edgeLines,
    edgeOpacity: EDGE_OPACITY,
    core,
    coreGlow,
    layout,
  };

  const targetRotation = { x: 0, y: 0 };
  const rotationVelocity = { x: 0, y: 0 };
  const springRotation = { x: 0, y: 0 };

  const resize = () => {
    const bounds = stage.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    camera.aspect = bounds.width / bounds.height;
    camera.updateProjectionMatrix();
    const isDesktop = window.innerWidth > 760;
    const fit = Math.min(bounds.height / 390, 1.12);
    layout.centerScale = fit * 1.05;
    // Docked beside the photo, so it has to fit the free strip on phones.
    layout.dockScale = fit * (isDesktop ? .8 : .5);
    const halfVisibleWidth = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z * camera.aspect;
    layout.dockX = Math.max(0, halfVisibleWidth - HALF_SHAPE_WIDTH * layout.dockScale - .05);
    applyLayout();
  };

  const updatePointer = (event) => {
    if (reducedMotion) return;
    const pointerX = THREE.MathUtils.clamp((event.clientX / window.innerWidth - .5) * 2, -1, 1);
    const pointerY = THREE.MathUtils.clamp((event.clientY / window.innerHeight - .5) * 2, -1, 1);
    targetRotation.y = pointerX * .22;
    targetRotation.x = pointerY * .16;
  };

  const updateDeviceTilt = (event) => {
    if (reducedMotion || event.beta === null || event.gamma === null) return;
    targetRotation.y = THREE.MathUtils.clamp(event.gamma / 50, -.2, .2);
    targetRotation.x = THREE.MathUtils.clamp((event.beta - 35) / 90, -.16, .16);
  };

  window.addEventListener('pointermove', updatePointer);
  window.addEventListener('deviceorientation', updateDeviceTilt);
  window.addEventListener('resize', resize);
  resize();

  let previousTime = 0;
  const render = (time = 0) => {
    const delta = Math.min((time - previousTime) / 1000, .05);
    previousTime = time;

    if (layout.dock !== layout.dockTarget) {
      layout.dock += (layout.dockTarget - layout.dock) * (1 - Math.exp(-delta * 2.2));
      if (Math.abs(layout.dockTarget - layout.dock) < .001) layout.dock = layout.dockTarget;
      applyLayout();
    }

    if (!reducedMotion) {
      const seconds = time / 1000;
      artifact.position.y = Math.sin(seconds * .8) * .06;
      // A slow sway keeps the stack readable; a constant spin would just be decoration.
      artifact.rotation.x = .5 + Math.sin(seconds * .3) * .04;
      artifact.rotation.y = .62 + Math.sin(seconds * .4) * .38 + layout.spin;
      core.rotation.y -= delta * .42;

      // A data pulse reached the core: each layer lifts in turn, bottom to top.
      layout.rippleAge += delta;
      plates.forEach((plate, index) => {
        const local = layout.rippleAge - index * .08;
        const bump = local > 0 && local < .55 ? Math.sin((local / .55) * Math.PI) : 0;
        plate.position.y = plate.userData.baseY + bump * .05;
      });

      const spring = 18;
      const damping = 8;
      ['x', 'y'].forEach((axis) => {
        const acceleration = (targetRotation[axis] - springRotation[axis]) * spring
          - rotationVelocity[axis] * damping;
        rotationVelocity[axis] += acceleration * delta;
        springRotation[axis] += rotationVelocity[axis] * delta;
      });
      root.rotation.x = springRotation.x;
      root.rotation.y = springRotation.y;
    }

    const bounds = stage.getBoundingClientRect();
    if (!bounds.width || !bounds.height || document.hidden) return;

    try {
      renderer.setScissorTest(true);
      renderer.setViewport(
        bounds.left,
        window.innerHeight - bounds.bottom,
        bounds.width,
        bounds.height,
      );
      renderer.setScissor(
        bounds.left,
        window.innerHeight - bounds.bottom,
        bounds.width,
        bounds.height,
      );
      // Don't wipe the icon scene (links, pulses, icons) that was just drawn under the stage;
      // clear depth only so the glass renders cleanly on top of it.
      renderer.autoClear = false;
      renderer.clearDepth();
      renderer.render(scene, camera);
    } finally {
      renderer.autoClear = true;
      renderer.setScissorTest(false);
      renderer.setViewport(0, 0, window.innerWidth, window.innerHeight);
    }
  };

  addRenderCallback(render);
};

// If anything in the monolith fails on some device, degrade to the icons-only page
// (intro.js sees no `monolith` handle and reveals the hero immediately) instead of dying silently.
try {
  initMonolith();
} catch (error) {
  console.error('The monolith failed to initialise; continuing without it.', error);
  if (window.portfolioThree) delete window.portfolioThree.monolith;
}