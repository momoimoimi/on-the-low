// B3 explore: a ring of cave rooms around the camera. Turn between rooms, look closely, and find
// six hidden things. Playing the crystal password opens the secret room; its tape unlocks in B2.
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const flat = OTL.flat;
  const finds = OTL.finds;

  /* ---------- Data ---------- */
  const ROOMS = [
    { id: 'corridor', name: '入口の通路', deg: 0 },
    { id: 'crystal', name: 'クリスタル洞', deg: 72 },
    { id: 'radio', name: 'ラジオブース', deg: 144 },
    { id: 'bed', name: 'ももいもいみの寝床', deg: 216 },
    { id: 'secret', name: '隠し部屋', deg: 288, locked: true }
  ];
  const FINDS = [
    { id: 'memo1', name: '通路のメモ', title: '通路のメモ', text: 'きょうも地上はまぶしかった。ヘッドホンをして、いちばん下まで降りてきた。ここなら、だれにも見つからない。' },
    { id: 'leaf', name: '落ちていた葉っぱ', title: '葉っぱ', text: 'ももいもいみの葉っぱが落ちてた。寝相がわるいらしい。' },
    { id: 'memo2', name: 'ラジオのメモ', title: 'ラジオのメモ', text: 'クリスタルの合言葉。入口のラジオが、さいしょに鳴らす4つの音。忘れそうだから、ここに書いておく。' },
    { id: 'momo', name: 'かくれんぼ中のももいもいみ', title: 'みつかった', text: 'ももいもいみは、ちょっと照れている。' },
    { id: 'melody', name: 'クリスタルの合言葉', title: '合言葉', text: 'どこか遠くで、岩が転がる音がした。' },
    { id: 'tape', name: 'ひみつのテープ', title: 'ひみつのテープ', text: 'B2の音源ルームの棚に、このテープを並べておいたよ。', link: true }
  ];
  const PASSWORD = ['E4', 'G4', 'A4', 'B4'];   // the first four melody notes of the B1 radio

  /* ---------- HUD ---------- */
  const $ = id => document.getElementById(id);
  const roomName = $('room-name'), hint = $('hint'), count = $('count'), dots = $('dots');
  const memo = $('memo'), memoTitle = $('memo-title'), memoText = $('memo-text'), memoLink = $('memo-link'), memoClose = $('memo-close');
  const list = $('found-list');

  function renderFinds() {
    count.textContent = FINDS.filter(f => finds.has(f.id)).length;
    list.innerHTML = '';
    FINDS.forEach(f => {
      const li = document.createElement('li');
      const got = finds.has(f.id);
      li.className = got ? 'got' : '';
      li.textContent = got ? f.name : '？？？';
      list.appendChild(li);
    });
  }
  let lastFocus = null;
  function openMemo(f) {
    lastFocus = document.activeElement;
    memoTitle.textContent = f.title;
    memoText.textContent = f.text;
    memoLink.hidden = !f.link;
    memo.hidden = false;
    memoClose.focus();
  }
  function closeMemo() {
    memo.hidden = true;
    if (lastFocus && lastFocus.focus) lastFocus.focus();
    if (FINDS.every(f => finds.has(f.id))) hint.textContent = 'ぜんぶ見つけた。ここはもう、あなたの秘密基地。';
  }
  memoClose.addEventListener('click', closeMemo);
  function discover(id) {
    const f = FINDS.find(x => x.id === id);
    const fresh = finds.add(id);
    if (fresh) OTL.synth.chime();
    renderFinds();
    openMemo(f);
  }

  /* ---------- Scene ---------- */
  const canvas = $('cave');
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true }); }
  catch (e) {
    canvas.style.background = 'radial-gradient(circle at 50% 60%, #3a3254, #15121f 70%)';
    hint.textContent = 'このブラウザでは3Dを表示できませんでした。';
    renderFinds();
    return;
  }
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x15121f);
  scene.fog = new THREE.Fog(0x15121f, 7, 19);
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 60);
  scene.add(new THREE.HemisphereLight(0xa99cff, 0x1d1830, 0.55));
  const torch = new THREE.PointLight(0xffc6b6, 0.7, 12);   // follows the camera
  scene.add(torch);

  const R = 7.5;
  const rad = d => d * Math.PI / 180;
  const dir = a => new THREE.Vector3(Math.sin(a), 0, -Math.cos(a));
  const right = a => new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
  // Place in a room's own frame: x to the right, y up, z toward the camera
  function at(room, x, y, z) {
    const a = rad(room.deg);
    return dir(a).multiplyScalar(R - z).add(right(a).multiplyScalar(x)).setY(y);
  }
  function put(obj, room, x, y, z, turn = 0) {
    obj.position.copy(at(room, x, y, z));
    obj.rotation.y = -rad(room.deg) + turn;
    scene.add(obj);
    return obj;
  }
  const room = id => ROOMS.find(r => r.id === id);

  // Floor, ceiling teeth and the outer wall
  const floor = new THREE.CircleGeometry(16, 40, 0, Math.PI * 2);
  floor.rotateX(-Math.PI / 2);
  const fp = floor.attributes.position;
  for (let i = 1; i < fp.count; i++) fp.setY(i, (Math.random() - 0.5) * 0.18);
  floor.computeVertexNormals();
  scene.add(new THREE.Mesh(floor, flat(0x2b2442)));
  const wallMat = flat(0x3a3254), darkMat = flat(0x2c2640);
  for (let i = 0; i < 34; i++) {
    const a = (i / 34) * Math.PI * 2;
    const s = 1.4 + Math.random() * 1.4;
    const m = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), wallMat);
    m.position.copy(dir(a).multiplyScalar(R + 3 + Math.random() * 1.5)).setY(s * 0.7 + Math.random());
    m.rotation.set(Math.random() * 3, Math.random() * 3, 0);
    scene.add(m);
  }
  for (let i = 0; i < 40; i++) {
    const a = Math.random() * Math.PI * 2, r = 3 + Math.random() * 9;
    const h = 0.6 + Math.random() * 1.6;
    const m = new THREE.Mesh(new THREE.ConeGeometry(0.18 + Math.random() * 0.25, h, 5), darkMat);
    m.rotation.x = Math.PI;
    m.position.copy(dir(a).multiplyScalar(r)).setY(5.2 - h / 2 + Math.random() * 0.4);
    scene.add(m);
  }

  // Interactive things
  const clickables = [];
  function clickable(obj, opts) {
    obj.traverse(o => { if (o.isMesh) { o.userData.item = opts; clickables.push(o); } });
    opts.obj = obj;
    return opts;
  }
  // Hidden finds glow when the pointer comes near, and twinkle now and then
  const hiddenItems = [];
  function hiddenFind(obj, id, label, mat) {
    const item = clickable(obj, { id, label, hidden: true, mat, onClick: () => { discover(id); } });
    hiddenItems.push(item);
    // A larger invisible target around small finds, so they can be tapped with a finger
    const hit = new THREE.Mesh(new THREE.SphereGeometry(0.42, 6, 4), new THREE.MeshBasicMaterial());
    hit.visible = false;
    hit.position.copy(obj.position);
    hit.userData.item = item;
    scene.add(hit); clickables.push(hit);
    return item;
  }

  /* Corridor: lanterns, path stones and a memo tucked under a rock */
  const corridor = room('corridor');
  [-2.2, 2.2].forEach((x, i) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 1.6, 5), flat(0x4a4064));
    put(post, corridor, x, 0.8, 0.5);
    const lamp = new THREE.Mesh(new THREE.OctahedronGeometry(0.2, 0), flat(0xffd2c6, { emissive: 0xff9f8c, emissiveIntensity: 0.9 }));
    put(lamp, corridor, x, 1.75, 0.5);
    const light = new THREE.PointLight(0xff9f8c, 0.7, 5);
    light.position.copy(at(corridor, x, 1.8, 0.8)); scene.add(light);
  });
  for (let i = 0; i < 6; i++) {
    const st = new THREE.Mesh(new THREE.DodecahedronGeometry(0.28, 0), wallMat);
    st.scale.y = 0.25;
    put(st, corridor, (i % 2 ? 0.25 : -0.25), 0.05, 3.2 - i * 0.9);
  }
  const memoRock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.55, 0), wallMat);
  put(memoRock, corridor, 1.5, 0.35, 2.2);
  const memo1Mat = flat(0xece6f6, { emissive: 0xece6f6, emissiveIntensity: 0 });
  const memo1 = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.02, 0.24), memo1Mat);
  put(memo1, corridor, 1.05, 0.04, 2.55, 0.4);
  hiddenFind(memo1, 'memo1', 'なにか落ちてる…', memo1Mat);

  /* Crystal cave: five crystals, each a note. Play the password to open the secret room. */
  const crystalRoom = room('crystal');
  const CRYSTALS = [
    { note: 'A4', color: 0x9d8cff, x: -2.0 }, { note: 'E4', color: 0x6fd6b8, x: -1.0 },
    { note: 'D5', color: 0xff9f8c, x: 0 }, { note: 'G4', color: 0x7fb4ff, x: 1.0 }, { note: 'B4', color: 0xffc2a8, x: 2.0 }
  ];
  const noteF = Object.fromEntries(OTL.synth.NOTES.map(n => [n.name, n.f]));
  let played = [];
  const crystals = CRYSTALS.map((c, i) => {
    const mat = flat(c.color, { emissive: c.color, emissiveIntensity: 0.2, roughness: 0.4 });
    const g = new THREE.Group();
    const h = 1 + (i % 2 ? 0.4 : 0.8);
    const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.42, 0), mat);
    m.scale.y = h * 2.2; m.position.y = h * 0.9;
    const m2 = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), mat);
    m2.scale.y = 2.4; m2.position.set(0.32, 0.5, 0.1); m2.rotation.z = -0.4;
    g.add(m, m2);
    put(g, crystalRoom, c.x, 0, 0.6);
    const light = new THREE.PointLight(c.color, 0, 3.5);
    light.position.copy(at(crystalRoom, c.x, 1.2, 1.2)); scene.add(light);
    const item = { mat, light, pulse: 0 };
    clickable(g, {
      label: `クリスタル（${c.note[0]}）`,
      onClick: async () => {
        await OTL.synth.ensure();
        OTL.synth.key(OTL.synth.ctx.currentTime + 0.01, noteF[c.note], 0.26);
        item.pulse = 1;
        played = [...played, c.note].slice(-PASSWORD.length);
        if (!finds.has('melody') && played.join() === PASSWORD.join()) {
          setTimeout(() => { unlockSecret(true); discover('melody'); }, 500);
        }
      }
    });
    return item;
  });

  /* Radio booth: an old radio that plays, and a memo on the shelf */
  const radioRoom = room('radio');
  const radio = new THREE.Group();
  const cab = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.0, 0.8), flat(0x6b4f5c));
  cab.position.y = 0.5;
  const grill = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.06, 8), flat(0x2c2640));
  grill.rotation.x = Math.PI / 2; grill.position.set(-0.4, 0.55, 0.42);
  const dial = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.06), flat(0xffd2c6, { emissive: 0xff9f8c, emissiveIntensity: 0.3 }));
  dial.position.set(0.35, 0.65, 0.42);
  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.2, 4), flat(0x9a90b8));
  antenna.position.set(0.6, 1.5, 0); antenna.rotation.z = -0.35;
  radio.add(cab, grill, dial, antenna);
  put(radio, radioRoom, -0.6, 0, 0.8, 0.15);
  const radioSeq = new OTL.Sequencer({
    bpm: 80,
    getGrid: () => radioGrid
  });
  const radioGrid = OTL.parsePattern([
    '..........x.....', '......x.......x.', '...x.......x....', '.x......x.......', 'x.........x.....',
    '..x...x...x...xx', '....x.......x...', 'x......x..x.....'
  ]);
  clickable(radio, {
    label: 'ふるいラジオ',
    onClick: async () => {
      if (radioSeq.playing) { radioSeq.stop(); hint.textContent = 'ラジオを止めた。'; }
      else { await radioSeq.start(); hint.textContent = 'ラジオから、入口で聴いたのと同じ音が流れてきた。'; }
    }
  });
  const shelf = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.6, 0.6), flat(0x4a3a4c));
  put(shelf, radioRoom, 1.7, 0.8, 0.3);
  const memo2Mat = flat(0xece6f6, { emissive: 0xece6f6, emissiveIntensity: 0 });
  const memo2 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.02, 0.22), memo2Mat);
  put(memo2, radioRoom, 1.85, 1.62, 0.35, -0.3);
  hiddenFind(memo2, 'memo2', 'たなの上に、なにかある…', memo2Mat);

  /* Bed: a low-poly bed and a fallen leaf */
  const bedRoom = room('bed');
  const bed = new THREE.Group();
  const frame = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.4, 1.3), flat(0x4a3a4c)); frame.position.y = 0.2;
  const mattress = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.22, 1.2), flat(0x9d8cff)); mattress.position.y = 0.5;
  const pillow = new THREE.Mesh(new THREE.DodecahedronGeometry(0.32, 0), flat(0xece6f6)); pillow.scale.set(1.2, 0.5, 1); pillow.position.set(-0.75, 0.7, 0);
  const blanket = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.1, 1.25), flat(0xff9f8c)); blanket.position.set(0.35, 0.66, 0); blanket.rotation.z = 0.03;
  bed.add(frame, mattress, pillow, blanket);
  put(bed, bedRoom, 0.3, 0, 0.5, 0.1);
  const leafMat = flat(0x6fd6b8, { emissive: 0x6fd6b8, emissiveIntensity: 0 });
  const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.42, 4), leafMat);
  leaf.scale.z = 0.3; leaf.rotation.set(Math.PI / 2, 0, 0.9);
  put(leaf, bedRoom, -1.6, 0.04, 2.0);
  hiddenFind(leaf, 'leaf', '床に、緑のものが…', leafMat);

  /* Secret room: blocked by a boulder until the crystal password is played */
  const secretRoom = room('secret');
  const boulder = new THREE.Mesh(new THREE.DodecahedronGeometry(2.2, 0), flat(0x433a60));
  put(boulder, secretRoom, 0, 1.6, 1.6);
  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 0.9, 6), flat(0x3a3254));
  put(pedestal, secretRoom, 0, 0.45, 0.2);
  const tapeMat = flat(0xece6f6, { emissive: 0xff9f8c, emissiveIntensity: 0.4 });
  const tape = new THREE.Group();
  const shell = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.38, 0.1), tapeMat);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.06, 0.11), flat(0xff9f8c)); stripe.position.y = 0.12;
  tape.add(shell, stripe);
  put(tape, secretRoom, 0, 1.15, 0.2);
  const tapeLight = new THREE.PointLight(0xff9f8c, 0, 4);
  tapeLight.position.copy(at(secretRoom, 0, 1.8, 1)); scene.add(tapeLight);
  clickable(tape, { label: 'カセットテープ', onClick: () => { if (!secretRoom.locked) discover('tape'); } });

  let boulderT = 0, boulderMoving = false;
  function unlockSecret(animate) {
    secretRoom.locked = false;
    tapeLight.intensity = 1.2;
    if (animate && !reduce) boulderMoving = true;
    else boulderT = 1;
    buildDots();
  }
  if (finds.has('melody')) unlockSecret(false);

  /* Momoimoimi plays hide-and-seek in one of three spots */
  const { group: momo, body } = OTL.createMomo();
  momo.scale.setScalar(0.55);
  const HIDES = [
    { room: corridor, hide: [1.5, 0.48, 1.7], out: [0.9, 0.5, 2.7] },       // behind the memo rock
    { room: radioRoom, hide: [-0.6, 0.55, 0.15], out: [-0.6, 0.5, 2.0] },   // behind the radio
    { room: bedRoom, hide: [0.9, 0.55, -0.35], out: [1.4, 0.5, 1.9] }       // behind the bed
  ];
  // By day it is always asleep behind its bed, with z's giving it away
  const phase = OTL.time ? OTL.time.phase : 'night';
  const spot = phase === 'day' ? HIDES[2] : HIDES[Math.floor(Math.random() * HIDES.length)];
  const zzz = OTL.createZzz();
  scene.add(zzz.group);
  const hidePos = at(spot.room, ...spot.hide), outPos = at(spot.room, ...spot.out);
  momo.rotation.y = -rad(spot.room.deg);
  scene.add(momo);
  let momoOut = finds.has('momo') ? 1 : 0, momoComing = false;
  clickable(momo, {
    label: '……だれか、いる？',
    onClick: () => { if (!momoOut) momoComing = true; discover('momo'); }
  });

  /* ---------- Navigation ---------- */
  let current = 0;
  let camA = rad(ROOMS[0].deg);
  const open = () => ROOMS.filter(r => !r.locked);
  function buildDots() {
    dots.innerHTML = '';
    open().forEach(r => {
      const li = document.createElement('li');
      li.className = ROOMS[current] === r ? 'on' : '';
      li.title = r.name;
      dots.appendChild(li);
    });
  }
  function goTo(i) {
    current = i;
    roomName.textContent = ROOMS[i].name;
    hovered = null;
    hint.textContent = '気になるところを押してみて。';
    buildDots();
  }
  function step(dirn) {
    const rooms = open();
    const k = rooms.indexOf(ROOMS[current]);
    goTo(ROOMS.indexOf(rooms[(k + dirn + rooms.length) % rooms.length]));
  }
  $('prev').addEventListener('click', () => step(-1));
  $('next').addEventListener('click', () => step(1));
  window.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !memo.hidden) closeMemo();
    if (!memo.hidden) return;
    if (e.key === 'ArrowLeft') step(-1);
    if (e.key === 'ArrowRight') step(1);
  });

  /* ---------- Pointer ---------- */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(9, 9);
  let hovered = null, look = { x: 0, y: 0 };
  // Solid things block the pointer, so whatever hides behind them stays hidden
  const blockers = [...clickables, memoRock, shelf, boulder, ...bed.children];
  const pick = () => {
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(blockers, false)[0];
    return hit && hit.distance < 11 ? hit.object.userData.item || null : null;
  };
  function setNdc(e) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  }
  canvas.addEventListener('pointermove', e => {
    setNdc(e);
    if (e.pointerType !== 'touch') { look.x = ndc.x; look.y = ndc.y; }
  });
  canvas.addEventListener('pointerleave', () => { ndc.set(9, 9); look.x = look.y = 0; });
  let downAt = null;
  canvas.addEventListener('pointerdown', e => { downAt = [e.clientX, e.clientY]; });
  canvas.addEventListener('pointerup', e => {
    if (!downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 10 || !memo.hidden) return;
    setNdc(e);
    const item = pick();
    if (item) item.onClick();
  });

  let camBack = 0.5;
  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setPixelRatio(OTL.pixelRatio());
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w < 600 ? 66 : 55;
    camBack = w < 600 ? 2.6 : 0.5;   // step back on narrow screens so a whole room fits
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(canvas);
  resize();

  /* ---------- Loop ---------- */
  window.addEventListener('radio:step', e => {
    e.detail.notes.forEach((on, i) => { if (on) crystals[[2, 4, 0, 3, 1][i]].pulse = Math.max(crystals[[2, 4, 0, 3, 1][i]].pulse, 0.6); });
  });
  const clock = new THREE.Clock();
  const target = new THREE.Vector3();
  OTL.renderLoop(canvas, function frame() {
    const t = clock.getElapsedTime();

    // Turn toward the current room along the short way round
    const goal = rad(ROOMS[current].deg);
    let diff = ((goal - camA + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    camA += diff * (reduce ? 1 : 0.08);
    const d = dir(camA), rgt = right(camA);
    camera.position.copy(d.clone().multiplyScalar(-camBack)).setY(1.7);
    target.copy(d.clone().multiplyScalar(R)).add(rgt.multiplyScalar(look.x * 1.2)).setY(1.0 + look.y * 0.6);
    camera.lookAt(target);
    torch.position.copy(camera.position).add(d.clone().multiplyScalar(1.5));

    // Hover
    const item = memo.hidden ? pick() : null;
    if (item !== hovered) {
      hovered = item;
      canvas.style.cursor = item ? 'pointer' : '';
      if (item) hint.textContent = item.hidden && finds.has(item.id) ? '見つけたもの' : item.label;
    }
    hiddenItems.forEach(h => {
      const twinkle = reduce ? 0 : Math.max(0, Math.sin(t * 0.9 + h.id.length)) ** 24 * 0.8;
      const near = hovered === h ? 0.9 : 0;
      h.mat.emissiveIntensity += (Math.max(near, twinkle) - h.mat.emissiveIntensity) * 0.15;
    });

    crystals.forEach(c => {
      c.pulse *= 0.93;
      c.mat.emissiveIntensity = (phase === 'deep' ? 0.45 : 0.2) + c.pulse * 1.2;
      c.light.intensity = c.pulse * 1.6;
    });

    if (boulderMoving) { boulderT = Math.min(1, boulderT + 0.012); if (boulderT >= 1) boulderMoving = false; }
    const bp = at(secretRoom, 3.2 * boulderT, 1.6 - boulderT * 0.2, 1.6 + boulderT * 0.6);
    boulder.position.copy(bp);
    boulder.rotation.z = -boulderT * 2.4;

    tape.rotation.y = -rad(secretRoom.deg) + Math.sin(t * 0.8) * 0.4;
    tape.position.y = 1.15 + Math.sin(t * 1.4) * 0.05;

    if (momoComing) { momoOut = Math.min(1, momoOut + 0.03); if (momoOut >= 1) momoComing = false; }
    momo.position.lerpVectors(hidePos, outPos, momoOut);
    momo.position.y += Math.sin(t * 2) * 0.02 + (momoComing ? Math.abs(Math.sin(momoOut * Math.PI * 3)) * 0.35 : 0);
    if (!momoOut && !reduce) momo.position.y += Math.max(0, Math.sin(t * 0.7)) ** 12 * 0.25;   // a quick peek now and then
    body.scale.y = 1 + Math.sin(t * 3) * 0.015;
    zzz.group.position.copy(momo.position).setY(momo.position.y + 0.75);
    zzz.update(t, phase === 'day' && !momoOut && !reduce);

    renderer.render(scene, camera);
  });

  /* ---------- Reset ---------- */
  const reset = $('reset');
  let armed = false;
  reset.addEventListener('click', () => {
    if (!armed) { armed = true; reset.textContent = 'ほんとうに消す？ もう一度押す'; setTimeout(() => { armed = false; reset.textContent = 'はじめからやりなおす'; }, 4000); return; }
    finds.reset();
    location.reload();
  });

  goTo(0);
  renderFinds();
})();
