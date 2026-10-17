// B2 music room: the author's tracks (music/tracks.js), base tapes played live by the synth,
// a secret tape unlocked in B3, and a 3D listening room that reacts to whatever is playing.
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const P = OTL.parsePattern;

  /* ---------- Tapes ---------- */
  // Each tape alternates its parts every 16 steps. Rows: D5 B4 A4 G4 E4 / HAT SNARE KICK
  const TAPES = [
    {
      id: 'b3-night', title: 'B3の夜', bpm: 76, color: 'var(--momo)', note: '基地にいちばん長く流れているテープ',
      parts: [
        P(['................', '.......x........', '....x.......x...', '..x.......x.....', 'x.......x.......',
           'x.x.x.x.x.x.x.x.', '....x.......x...', 'x.....x...x.....']),
        P(['..........x.....', '........x.......', '......x.....x...', '...x............', 'x...............',
           'x.x.x.x.x.x.x.xx', '....x.......x...', 'x.....x...x...x.'])
      ]
    },
    {
      id: 'crystal-street', title: 'クリスタル通り', bpm: 90, color: 'var(--glow)', note: 'クリスタルを順番にたたいて録った',
      parts: [
        P(['x.......x.....x.', '..x.......x.....', '....x.......x...', '......x.........', '................',
           'xx.xxx.xxx.xxx.x', '....x.......x..x', 'x..x....x.x.....']),
        P(['....x.......x...', '..x.......x.....', 'x.......x.......', '......x.......x.', '................',
           'xx.xxx.xxx.xxx.x', '....x.......x...', 'x..x....x.x..x..'])
      ]
    },
    {
      id: 'hissori', title: 'ひっそり', bpm: 68, color: 'var(--moss)', note: '寝る前に、音を小さくして聴く',
      parts: [
        P(['................', '............x...', '........x.......', '....x...........', 'x...............',
           '..x...x...x...x.', '................', 'x.......x.......']),
        P(['................', '................', '....x.......x...', '........x.......', 'x...............',
           '..x...x...x...x.', '............x...', 'x.......x.......'])
      ]
    }
  ];
  const SECRET = {
    id: 'secret', title: 'ひみつのテープ', bpm: 84, color: 'var(--fog)', note: 'B3の隠し部屋で見つけた。入口のラジオの、もとの録音',
    parts: [
      P(['..........x.....', '......x.......x.', '...x.......x....', '.x......x.......', 'x.........x.....',
         '..x...x...x...xx', '....x.......x...', 'x......x..x.....']),
      P(['x.........x.....', '....x.........x.', '......x....x....', '.x..............', '........x.......',
         'x.x.x.x.x.x.x.xx', '....x.......x...', 'x......x..x..x..'])
    ]
  };

  /* ---------- Player ---------- */
  const toggle = document.getElementById('toggle');
  const nowTitle = document.getElementById('now-title'), nowMeta = document.getElementById('now-meta'), nowKind = document.getElementById('now-kind');
  const progress = document.getElementById('progress');
  const audio = document.getElementById('audio');

  let current = null;       // { kind: 'tape' | 'track', item, el }
  let part = 0;
  const seq = new OTL.Sequencer({
    getGrid: () => current.item.parts[part],
    onStep: ev => { if (ev.step === 15) part = (part + 1) % current.item.parts.length; }
  });

  const isPlaying = () => current && (current.kind === 'tape' ? seq.playing : !audio.paused);
  function refresh() {
    toggle.disabled = !current;
    toggle.textContent = isPlaying() ? '■ 停止' : '▶ 再生';
    document.querySelectorAll('.tape').forEach(el => el.classList.toggle('playing', !!current && el === current.el && isPlaying()));
  }
  function stopAll() { seq.stop(); audio.pause(); }

  async function play(kind, item, el) {
    stopAll();
    current = { kind, item, el };
    nowKind.textContent = kind === 'tape' ? 'NOW PLAYING / 基地テープ' : 'NOW PLAYING / 作者の曲';
    nowTitle.textContent = item.title;
    nowMeta.textContent = item.note || '';
    if (kind === 'tape') {
      part = 0; seq.bpm = item.bpm;
      await seq.start();
    } else {
      audio.src = item.file;
      if (location.protocol !== 'file:') await OTL.synth.connectMedia(audio);
      try { await audio.play(); }
      catch (e) { nowMeta.textContent = '曲を読みこめませんでした。ファイルの場所を確かめてね。'; }
    }
    refresh();
  }
  toggle.addEventListener('click', async () => {
    if (!current) return;
    if (isPlaying()) stopAll();
    else if (current.kind === 'tape') { part = 0; await seq.start(); }
    else { try { await audio.play(); } catch (e) {} }
    refresh();
  });
  audio.addEventListener('ended', refresh);

  // Progress: through the loop for tapes, through the song for tracks
  (function tickProgress() {
    let p = 0;
    if (current && isPlaying()) {
      if (current.kind === 'tape') p = (part * 16 + (seq.step || 0)) / (current.item.parts.length * 16);
      else if (audio.duration) p = audio.currentTime / audio.duration;
    }
    progress.style.width = (p * 100).toFixed(1) + '%';
    requestAnimationFrame(tickProgress);
  })();

  /* ---------- Shelves ---------- */
  function tapeEl({ label, title, meta, color, onPlay, locked }) {
    const el = document.createElement(onPlay ? 'button' : 'div');
    el.className = 'tape' + (locked ? ' locked' : '');
    if (onPlay) { el.type = 'button'; el.addEventListener('click', () => onPlay(el)); }
    el.style.setProperty('--tape', color);
    el.innerHTML = `
      <span class="tape-label">${label}</span>
      <span class="tape-title"></span>
      <span class="tape-reels" aria-hidden="true"><i></i><i></i></span>
      <span class="tape-meta"></span>`;
    el.querySelector('.tape-title').textContent = title;
    el.querySelector('.tape-meta').textContent = meta;
    return el;
  }

  const tracksShelf = document.getElementById('shelf-tracks');
  const tracks = Array.isArray(window.OTL_TRACKS) ? window.OTL_TRACKS : [];
  if (tracks.length) {
    tracks.forEach((t, i) => tracksShelf.appendChild(tapeEl({
      label: `TRACK ${String(i + 1).padStart(2, '0')}`, title: t.title, meta: t.note || '作者の曲', color: 'var(--momo)',
      onPlay: el => play('track', t, el)
    })));
  } else {
    for (let i = 1; i <= 3; i++) tracksShelf.appendChild(tapeEl({
      label: `TRACK 0${i}`, title: '録音中…', meta: 'もうすぐ届く', color: 'var(--rock)', locked: true
    }));
  }

  const tapesShelf = document.getElementById('shelf-tapes');
  TAPES.forEach((t, i) => tapesShelf.appendChild(tapeEl({
    label: `TAPE ${String(i + 1).padStart(2, '0')}`, title: t.title, meta: `${t.bpm} BPM`, color: t.color,
    onPlay: el => play('tape', t, el)
  })));
  if (OTL.finds.has('tape')) {
    tapesShelf.appendChild(tapeEl({
      label: 'TAPE ??', title: SECRET.title, meta: `${SECRET.bpm} BPM / B3で発見`, color: SECRET.color,
      onPlay: el => play('tape', SECRET, el)
    }));
  } else {
    const locked = tapeEl({ label: 'TAPE ??', title: '？？？', meta: 'B3のどこかに隠されている', color: 'var(--rock)', locked: true });
    tapesShelf.appendChild(locked);
  }

  /* ---------- 3D listening room ---------- */
  const canvas = document.getElementById('room');
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true }); }
  catch (e) { canvas.style.background = 'radial-gradient(circle at 50% 60%, #3a3254, #15121f 70%)'; return; }
  const flat = OTL.flat;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x15121f);
  scene.fog = new THREE.Fog(0x15121f, 8, 20);
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 60);
  scene.add(new THREE.HemisphereLight(0xa99cff, 0x1d1830, 0.7));
  const key = new THREE.DirectionalLight(0xffc6b6, 0.8); key.position.set(-3, 5, 4); scene.add(key);
  const glowLight = new THREE.PointLight(0x9d8cff, 0.6, 6); glowLight.position.set(1.4, 1.8, 0.8); scene.add(glowLight);

  // Floor and back wall
  const floor = new THREE.PlaneGeometry(24, 14, 18, 10);
  floor.rotateX(-Math.PI / 2);
  const fp = floor.attributes.position;
  for (let i = 0; i < fp.count; i++) {
    const z = fp.getZ(i);
    fp.setY(i, (Math.random() - 0.5) * 0.15 + (z < -2.5 ? (-2.5 - z) * 0.9 : 0));
  }
  floor.computeVertexNormals();
  scene.add(new THREE.Mesh(floor, flat(0x2b2442)));
  for (let i = 0; i < 9; i++) {
    const s = 0.8 + Math.random() * 1.2;
    const m = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), flat(0x3a3254));
    m.position.set(-8 + i * 2 + Math.random(), s * 0.6, -4 - Math.random() * 1.5);
    m.rotation.set(Math.random() * 3, Math.random() * 3, 0);
    scene.add(m);
  }

  // Speaker stack with cones that pump
  const cones = [];
  const speaker = (x, y, w, h) => {
    const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.9), flat(0x2c2640));
    box.position.set(x, y + h / 2, -0.6); scene.add(box);
    const r = Math.min(w, h) * 0.32;
    const cone = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.55, 0.12, 8), flat(0x4a4064));
    cone.rotation.x = Math.PI / 2; cone.position.set(x, y + h / 2, -0.12);
    scene.add(cone); cones.push(cone);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.3, r * 0.3, 0.06, 6), flat(0xff9f8c));
    cap.rotation.x = Math.PI / 2; cap.position.set(x, y + h / 2, -0.04);
    scene.add(cap); cones.push(cap);
  };
  speaker(-2.6, 0, 1.4, 1.5);
  speaker(-2.6, 1.5, 1.4, 1.1);
  speaker(-1.2, 0, 1.0, 1.0);

  // The listening stone: a faceted crystal whose facets spread with the sound
  const stoneGeo = new THREE.IcosahedronGeometry(0.62, 1);
  const base = stoneGeo.attributes.position.array.slice();
  const faceN = [];
  for (let i = 0; i < base.length; i += 9) {
    const cx = (base[i] + base[i + 3] + base[i + 6]) / 3, cy = (base[i + 1] + base[i + 4] + base[i + 7]) / 3, cz = (base[i + 2] + base[i + 5] + base[i + 8]) / 3;
    const l = Math.hypot(cx, cy, cz);
    faceN.push([cx / l, cy / l, cz / l, Math.random()]);
  }
  const stone = new THREE.Mesh(stoneGeo, flat(0x9d8cff, { emissive: 0x9d8cff, emissiveIntensity: 0.25, roughness: 0.4, side: THREE.DoubleSide }));
  stone.position.set(1.5, 1.7, 0.2);
  scene.add(stone);

  // Momoimoimi, listening next to the speakers
  const { group: momo, body } = OTL.createMomo();
  momo.scale.setScalar(0.62);
  momo.position.set(0, 0.6, 0.6);
  momo.rotation.y = -0.35;
  scene.add(momo);

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const narrow = w < 600;
    camera.position.set(narrow ? -0.4 : 0, 2.2, narrow ? 8.6 : 6.4);
    camera.lookAt(narrow ? -0.4 : 0, 1.0, 0);
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(canvas);
  resize();

  let hop = 0;
  window.addEventListener('radio:step', e => { if (e.detail.kicked) hop = 1; });

  const clock = new THREE.Clock();
  let lvl = 0;
  (function frame() {
    const t = clock.getElapsedTime();
    lvl += (OTL.synth.level() - lvl) * 0.25;
    hop *= 0.86;
    const sway = reduce ? 0 : 1;

    const pos = stoneGeo.attributes.position.array;
    for (let f = 0; f < faceN.length; f++) {
      const [nx, ny, nz, seed] = faceN[f];
      const d = lvl * (0.25 + seed * 0.45) + Math.sin(t * 1.3 + seed * 6) * 0.015 * sway;
      for (let v = 0; v < 3; v++) {
        const i = f * 9 + v * 3;
        pos[i] = base[i] + nx * d; pos[i + 1] = base[i + 1] + ny * d; pos[i + 2] = base[i + 2] + nz * d;
      }
    }
    stoneGeo.attributes.position.needsUpdate = true;
    stone.rotation.y = t * 0.25 * sway;
    stone.position.y = 1.7 + Math.sin(t * 0.9) * 0.08 * sway;
    stone.material.emissiveIntensity = 0.25 + lvl * 1.6;
    glowLight.intensity = 0.5 + lvl * 2.2;

    cones.forEach(c => { c.scale.y = 1 + lvl * 2.2; });
    momo.position.y = 0.6 + hop * 0.1 + Math.sin(t * 2) * 0.02 * sway;
    body.scale.y = 1 - hop * 0.06;
    momo.rotation.z = Math.sin(t * 3.2) * lvl * 0.25;

    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  })();
})();
