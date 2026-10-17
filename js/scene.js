// The hideout: a low-poly Three.js scene with momoimoimi, crystals and fireflies.
// Listens for "radio:step" from radio.js: kicks make momoimoimi hop, notes light the crystals.
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const canvas = document.getElementById('scene');
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true }); }
  catch (e) { canvas.style.background = 'radial-gradient(circle at 50% 60%, #3a3254, #15121f 70%)'; }

  const scene = new THREE.Scene();
  const NIGHT = 0x15121f;
  scene.background = new THREE.Color(NIGHT);
  scene.fog = new THREE.Fog(NIGHT, 9, 24);
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  camera.position.set(0, 2.3, 7.6);

  scene.add(new THREE.HemisphereLight(0xa99cff, 0x1d1830, 0.75));
  const sun = new THREE.DirectionalLight(0xffc6b6, 0.85);
  sun.position.set(3, 6, 4); scene.add(sun);
  const lantern = new THREE.PointLight(0xff9f8c, 0.9, 9);
  lantern.position.set(-2.2, 1.6, 1.2); scene.add(lantern);

  const flat = OTL.flat;

  // Ground: a faceted bowl that rises into cave walls
  const ground = new THREE.PlaneGeometry(34, 34, 26, 26);
  ground.rotateX(-Math.PI / 2);
  const gp = ground.attributes.position;
  for (let i = 0; i < gp.count; i++) {
    const x = gp.getX(i), z = gp.getZ(i);
    const d = Math.hypot(x, z * 1.15);
    let y = (Math.random() - 0.5) * (d < 3 ? 0.12 : 0.5);
    if (d > 4.5) y += Math.pow(d - 4.5, 1.5) * 0.55;
    gp.setY(i, y);
  }
  ground.computeVertexNormals();
  scene.add(new THREE.Mesh(ground, flat(0x2b2442)));

  // Rocks around the walls (none in the front arc, so they never block the camera)
  const rockMat = flat(0x3a3254);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + Math.random() * 0.3;
    if (Math.sin(a) > 0.2) continue;
    const r = 5 + Math.random() * 2.5;
    const s = 0.4 + Math.random() * 0.9;
    const m = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), rockMat);
    m.position.set(Math.cos(a) * r, s * 0.5 + (r - 4.5) * 0.4, Math.sin(a) * r - 1);
    m.rotation.set(Math.random() * 3, Math.random() * 3, 0);
    scene.add(m);
  }

  // The hiding rock: sits between the camera and momoimoimi on purpose.
  // Only the leaf tip shows over the top until you look around it.
  const hideout = new THREE.Group();
  const big = new THREE.Mesh(new THREE.DodecahedronGeometry(0.95, 0), flat(0x433a60));
  big.scale.set(1.35, 1.7, 0.95); big.rotation.set(0.3, 0.5, 0.1);
  const small = new THREE.Mesh(new THREE.DodecahedronGeometry(0.55, 0), flat(0x3a3254));
  small.position.set(1.1, -0.7, 0.3); small.rotation.set(1, 0.2, 0.4);
  hideout.add(big, small);
  hideout.position.set(0, 0.93, 4.4);
  scene.add(hideout);

  // Crystals: one per melody row of the radio
  const crystalColors = [0xff9f8c, 0xffc2a8, 0x9d8cff, 0x7fb4ff, 0x6fd6b8];
  const crystalSpots = [[-2.9, -0.6], [-1.7, -1.9], [0.2, -2.6], [2.0, -1.8], [3.0, -0.4]];
  const crystals = crystalSpots.map(([x, z], i) => {
    const c = crystalColors[i];
    const mat = flat(c, { emissive: c, emissiveIntensity: 0.15, roughness: 0.4 });
    const g = new THREE.Group();
    [[0, 0, 0, 1], [0.28, 0, 0.1, 0.6], [-0.22, 0, 0.15, 0.5]].forEach(([dx, , dz, s]) => {
      const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.32 * s, 0), mat);
      m.scale.y = 2.6;
      m.position.set(dx, 0.75 * s, dz);
      m.rotation.z = dx * 0.6;
      g.add(m);
    });
    g.position.set(x, 0, z);
    scene.add(g);
    const light = new THREE.PointLight(c, 0, 3.5);
    light.position.set(x, 1, z + 0.4);
    scene.add(light);
    return { mat, light, pulse: 0 };
  });

  // Lantern prop
  const lamp = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), flat(0xffd2c6, { emissive: 0xff9f8c, emissiveIntensity: 0.9 }));
  lamp.position.copy(lantern.position);
  scene.add(lamp);
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 1.4, 5), flat(0x4a4064));
  post.position.set(-2.2, 0.7, 1.2); scene.add(post);

  // Momoimoimi, with its real polygon count on the ID card
  const polyEl = document.getElementById('polycount');
  const { group: momo, body } = OTL.createMomo(({ tris }) => {
    if (polyEl) polyEl.textContent = tris.toLocaleString('ja-JP') + ' 枚（実測）';
  });
  momo.position.set(0, 0.98, 0.4);
  scene.add(momo);

  // Fireflies
  const ffCount = 70, ffPos = new Float32Array(ffCount * 3), ffSeed = [];
  for (let i = 0; i < ffCount; i++) {
    ffSeed.push([Math.random() * 12 - 6, Math.random() * 3.5 + 0.3, Math.random() * 8 - 5, Math.random() * 6.28]);
  }
  const ffGeo = new THREE.BufferGeometry();
  ffGeo.setAttribute('position', new THREE.BufferAttribute(ffPos, 3));
  scene.add(new THREE.Points(ffGeo, new THREE.PointsMaterial({ color: 0xffc2b4, size: 0.06, transparent: true, opacity: 0.85 })));

  // Sizing
  function resize() {
    if (!renderer) return;
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.position.z = w < 600 ? 9.6 : 7.6;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(canvas);
  resize();

  // Peeking: move the pointer across the hero (or drag / tap on a phone) to look around the rock.
  // peek runs -1..1; at 0 the camera faces the rock and momoimoimi stays hidden.
  const hero = canvas.parentElement;
  let peekTarget = 0, peek = 0, my = 0, tapTimer = null;
  const sideOf = e => {
    const r = hero.getBoundingClientRect();
    return Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width - 0.5) * 2.4));
  };
  hero.addEventListener('pointermove', e => {
    if (e.pointerType === 'touch') return;
    peekTarget = sideOf(e);
    my = (e.clientY - hero.getBoundingClientRect().top) / hero.clientHeight - 0.5;
  });
  hero.addEventListener('pointerleave', e => { if (e.pointerType !== 'touch') { peekTarget = 0; my = 0; } });
  hero.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'touch') return;
    peekTarget = sideOf(e) < 0 ? -1 : 1;
    clearTimeout(tapTimer);
    tapTimer = setTimeout(() => { peekTarget = 0; }, 3500);
  });

  // React to the radio: while it plays, momoimoimi edges out from behind the rock
  let kickPulse = 0, lastStepAt = -10;
  window.addEventListener('radio:step', e => {
    lastStepAt = performance.now() / 1000;
    if (e.detail.kicked) kickPulse = 1;
    e.detail.notes.forEach((on, i) => { if (on && crystals[i]) crystals[i].pulse = 1; });
  });

  // Now and then it sneaks a look by itself
  let sneak = 0, nextSneak = 6 + Math.random() * 4;

  // By day it sleeps behind the rock: z's drift up over the top. The radio wakes it.
  const phase = OTL.time ? OTL.time.phase : 'night';
  const zzz = OTL.createZzz();
  scene.add(zzz.group);
  const idleGlow = phase === 'deep' ? 0.4 : 0.15;   // late at night the crystals stay a little lit
  const sneakCurve = u => (u <= 0 || u >= 1) ? 0 : Math.sin(Math.PI * u) ** 0.6;

  /* ---------- Render loop ---------- */
  const clock = new THREE.Clock();
  function frame() {
    const t = clock.getElapsedTime();
    kickPulse *= 0.86;
    const sway = reduce ? 0 : 1;
    peek += (peekTarget - peek) * 0.06;

    // Sneaking out: a short look on its own, or a steady half-step out while the radio plays
    const listening = performance.now() / 1000 - lastStepAt < 0.6 ? 1 : 0;
    const asleep = phase === 'day' && !listening;
    if (!reduce && !asleep && t > nextSneak) { sneak = t; nextSneak = t + 9 + Math.random() * 6; }
    const outX = Math.max(sneakCurve((t - sneak) / 2.6) * 1.15, listening * 0.75);
    momo.position.x += (outX - momo.position.x) * 0.08;

    const breathe = asleep ? Math.sin(t * 0.9) * 0.025 : Math.sin(t * 2) * 0.04;
    momo.position.y = 0.98 + breathe * sway + kickPulse * 0.16;
    body.scale.y = 1 - kickPulse * 0.06;
    // Face whoever is looking; lean toward the open side when sneaking; nod off when asleep
    momo.rotation.y += ((peek * 0.6 + Math.sin(t * 0.5) * 0.12 * sway) - momo.rotation.y) * 0.05;
    const lean = asleep ? 0.28 : Math.sin(t * 1.6) * 0.04 * sway - momo.position.x * 0.12;
    momo.rotation.z += (lean - momo.rotation.z) * 0.05;
    zzz.group.position.set(momo.position.x + 0.35, 1.95, momo.position.z);
    zzz.update(t, asleep && !reduce);

    crystals.forEach(c => {
      c.pulse *= 0.92;
      c.mat.emissiveIntensity = idleGlow + c.pulse * 1.1;
      c.light.intensity = c.pulse * 1.4;
    });
    lantern.intensity = 0.8 + Math.sin(t * 3.1) * 0.08 + kickPulse * 0.4;

    for (let i = 0; i < ffCount; i++) {
      const [x, y, z, p] = ffSeed[i];
      ffPos[i * 3] = x + Math.sin(t * 0.3 + p) * 0.4 * sway;
      ffPos[i * 3 + 1] = y + Math.sin(t * 0.7 + p * 2) * 0.25 * sway;
      ffPos[i * 3 + 2] = z;
    }
    ffGeo.attributes.position.needsUpdate = true;

    camera.position.x = peek * 3.6;
    camera.position.y += ((2.3 - my * 0.6) - camera.position.y) * 0.05;
    camera.lookAt(momo.position.x * 0.5, 0.9, 0.4);
    if (renderer) renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  frame();
})();
