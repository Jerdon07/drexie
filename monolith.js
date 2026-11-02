(() => {
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

  const shape = new THREE.Shape();
  shape.moveTo(-.48, -1.12);
  shape.lineTo(.48, -1.12);
  shape.lineTo(.38, 1.12);
  shape.lineTo(-.38, 1.12);
  shape.closePath();

  const shellGeometry = new THREE.ExtrudeGeometry(shape, {
    depth: .72,
    bevelEnabled: true,
    bevelSegments: 5,
    steps: 1,
    bevelSize: .09,
    bevelThickness: .09,
    curveSegments: 12,
  });
  shellGeometry.center();

  const glassMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xaeb8ff,
    metalness: 0,
    roughness: .05,
    transmission: .95,
    thickness: 1.1,
    ior: 1.5,
    iridescence: .12,
    iridescenceIOR: 1.3,
    iridescenceThicknessRange: [120, 240],
    clearcoat: .8,
    clearcoatRoughness: .04,
    attenuationColor: new THREE.Color(0x776bff),
    attenuationDistance: 3.2,
    envMapIntensity: 1.35,
  });
  if ('dispersion' in glassMaterial) glassMaterial.dispersion = .08;

  const shell = new THREE.Mesh(shellGeometry, glassMaterial);
  artifact.add(shell);

  const shellEdges = new THREE.EdgesGeometry(shellGeometry, 24);
  // WebGL in this Three.js release lacks spectral dispersion, so offset edge tints add a subtle prism fringe.
  const dispersionEdges = [
    { color: 0x8be4ff, x: -.014 },
    { color: 0xc3a3ff, x: .014 },
  ];
  dispersionEdges.forEach(({ color, x }) => {
    const edge = new THREE.LineSegments(
      shellEdges,
      new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity: .38,
        depthWrite: false,
      }),
    );
    edge.position.x = x;
    artifact.add(edge);
  });

  const core = new THREE.Group();
  core.position.z = .16;
  artifact.add(core);

  const coreGeometry = new THREE.IcosahedronGeometry(.49, 3);
  const coreWire = new THREE.LineSegments(
    new THREE.EdgesGeometry(coreGeometry),
    new THREE.LineBasicMaterial({
      color: 0xd3f2ff,
      transparent: true,
      opacity: .98,
      blending: THREE.AdditiveBlending,
    }),
  );
  core.add(coreWire);

  const coreRings = [
    { radius: .38, rotation: [Math.PI / 2, 0, 0], color: 0x83d9ff },
    { radius: .44, rotation: [.35, .9, .2], color: 0xb69bff },
  ];
  coreRings.forEach(({ radius, rotation, color }) => {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(radius, .008, 8, 72),
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

  const particleCount = 1100;
  const particlePositions = new Float32Array(particleCount * 3);
  const particleColors = new Float32Array(particleCount * 3);
  const violet = new THREE.Color(0xb9a2ff);
  const blue = new THREE.Color(0x75dfff);
  for (let index = 0; index < particleCount; index += 1) {
    const radius = Math.cbrt(Math.random()) * .45;
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
      size: .052,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      sizeAttenuation: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  ));

  const coreGlow = new THREE.Mesh(
    new THREE.SphereGeometry(.28, 24, 24),
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

  const targetRotation = { x: 0, y: 0 };
  const rotationVelocity = { x: 0, y: 0 };
  const springRotation = { x: 0, y: 0 };

  const resize = () => {
    const bounds = stage.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    camera.aspect = bounds.width / bounds.height;
    camera.updateProjectionMatrix();
    root.position.set(window.innerWidth > 760 ? 2.2 : 1.75, .28, 0);
    const scale = Math.min(bounds.height / 390, 1.12) * (window.innerWidth > 760 ? .58 : .65);
    root.scale.setScalar(scale);
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

    if (!reducedMotion) {
      const seconds = time / 1000;
      artifact.position.y = Math.sin(seconds * .8) * .075;
      artifact.rotation.y += delta * .24;
      artifact.rotation.x = Math.sin(seconds * .38) * .045;
      core.rotation.y -= delta * .42;
      core.rotation.x += delta * .19;

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
      renderer.render(scene, camera);
    } finally {
      renderer.setScissorTest(false);
      renderer.setViewport(0, 0, window.innerWidth, window.innerHeight);
    }
  };

  addRenderCallback(render);
})();
