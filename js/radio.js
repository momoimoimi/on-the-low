// Base radio: a 16-step sequencer that synthesizes lo-fi drums and keys with Web Audio.
// On every step that sounds, it fires a "radio:step" event on window so the 3D scene can react.
(() => {
  const NOTES = [
    { name: 'D5', f: 587.33 }, { name: 'B4', f: 493.88 }, { name: 'A4', f: 440.0 },
    { name: 'G4', f: 392.0 }, { name: 'E4', f: 329.63 }
  ];
  const DRUMS = ['HAT', 'SNARE', 'KICK'];
  const ROWS = NOTES.length + DRUMS.length, STEPS = 16;
  const preset = [
    '..........x.....',
    '......x.......x.',
    '...x.......x....',
    '.x......x.......',
    'x.........x.....',
    '..x...x...x...xx',
    '....x.......x...',
    'x......x..x.....'
  ];
  let grid = preset.map(r => [...r].map(c => c === 'x'));

  /* ---------- Sequencer grid ---------- */
  const seqEl = document.getElementById('seq');
  const pads = [];
  for (let r = 0; r < ROWS; r++) {
    const isDrum = r >= NOTES.length;
    const lbl = document.createElement('div');
    lbl.className = 'lbl' + (isDrum ? ' drum' : '');
    lbl.textContent = isDrum ? DRUMS[r - NOTES.length] : NOTES[r].name;
    seqEl.appendChild(lbl);
    pads.push([]);
    for (let s = 0; s < STEPS; s++) {
      const b = document.createElement('button');
      b.type = 'button';
      b.id = `pad-${r}-${s}`;
      b.className = 'pad' + (isDrum ? ' drum' : '') + (s % 4 === 0 ? ' beat' : '');
      b.setAttribute('aria-label', `${lbl.textContent} ${s + 1}拍目`);
      b.addEventListener('click', () => { grid[r][s] = !grid[r][s]; paint(); });
      seqEl.appendChild(b);
      pads[r].push(b);
    }
  }
  function paint() { pads.forEach((row, r) => row.forEach((b, s) => b.setAttribute('aria-pressed', grid[r][s] ? 'true' : 'false'))); }
  paint();

  /* ---------- Sounds ---------- */
  let ac = null, master, noiseBuf, wobble;
  function initAudio() {
    ac = new (window.AudioContext || window.webkitAudioContext)();
    const comp = ac.createDynamicsCompressor();
    comp.threshold.value = -16; comp.ratio.value = 4;
    const tone = ac.createBiquadFilter();
    tone.type = 'lowpass'; tone.frequency.value = 4200;   // keep it low and soft
    master = ac.createGain(); master.gain.value = 0.7;
    master.connect(tone); tone.connect(comp); comp.connect(ac.destination);
    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    // tape wobble shared by the keys
    wobble = ac.createOscillator(); wobble.frequency.value = 0.35;
    const wg = ac.createGain(); wg.gain.value = 9; wobble.connect(wg); wobble.start();
    wobble.out = wg;
  }
  function noise(t, dur, hp, vol) {
    const src = ac.createBufferSource(); src.buffer = noiseBuf;
    const f = ac.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp;
    const g = ac.createGain();
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t); src.stop(t + dur + 0.02);
  }
  function kick(t) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.14);
    g.gain.setValueAtTime(1, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.42);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.45);
  }
  function snare(t) {
    noise(t, 0.2, 1400, 0.45);
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = 'triangle'; o.frequency.value = 190;
    g.gain.setValueAtTime(0.25, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.12);
  }
  function hat(t) { noise(t, 0.05, 7500, 0.16); }
  function key(t, f) {
    const g = ac.createGain(), lp = ac.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.setValueAtTime(2400, t); lp.frequency.exponentialRampToValueAtTime(700, t + 0.6);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.22, t + 0.012); g.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
    [['triangle', 0], ['sine', 7], ['sine', -1200]].forEach(([type, det]) => {
      const o = ac.createOscillator(); o.type = type; o.frequency.value = f; o.detune.value = det;
      wobble.out.connect(o.detune);
      o.connect(lp); o.start(t); o.stop(t + 0.95);
    });
    lp.connect(g); g.connect(master);
  }

  /* ---------- Scheduler ---------- */
  let playing = false, step = 0, nextT = 0, timer = null, bpm = 82;
  const events = [];
  const stepDur = () => 60 / bpm / 4;
  function schedule() {
    while (nextT < ac.currentTime + 0.12) {
      const swing = step % 2 ? stepDur() * 0.14 : 0;
      const t = nextT + swing;
      let kicked = false;
      for (let r = 0; r < ROWS; r++) {
        if (!grid[r][step]) continue;
        if (r < NOTES.length) key(t, NOTES[r].f);
        else if (r === ROWS - 3) hat(t);
        else if (r === ROWS - 2) snare(t);
        else { kick(t); kicked = true; }
      }
      events.push({ t, step, kicked, notes: NOTES.map((_, r) => grid[r][step]) });
      nextT += stepDur();
      step = (step + 1) % STEPS;
    }
  }

  /* ---------- Controls ---------- */
  const playBtn = document.getElementById('play'), onair = document.getElementById('onair');
  playBtn.addEventListener('click', async () => {
    if (!ac) initAudio();
    if (ac.state === 'suspended') await ac.resume();
    playing = !playing;
    if (playing) {
      step = 0; nextT = ac.currentTime + 0.06;
      timer = setInterval(schedule, 25); schedule();
    } else {
      clearInterval(timer); events.length = 0; markStep(-1);
    }
    playBtn.textContent = playing ? '■ 停止' : '▶ 再生';
    onair.classList.toggle('live', playing);
    onair.lastChild.textContent = playing ? 'ON AIR' : 'OFF AIR';
  });
  document.getElementById('clear').addEventListener('click', () => { grid = grid.map(r => r.map(() => false)); paint(); });
  document.getElementById('shuffle').addEventListener('click', () => {
    grid = grid.map((row, r) => row.map((_, s) => {
      if (r < NOTES.length) return Math.random() < 0.08;
      if (r === ROWS - 1) return s % 8 === 0 || Math.random() < 0.08;   // kick
      if (r === ROWS - 2) return s % 8 === 4;                           // snare on 2 & 4
      return s % 2 === 0 && Math.random() < 0.75;                        // hats
    }));
    paint();
  });
  const tempo = document.getElementById('tempo'), bpmval = document.getElementById('bpmval');
  tempo.addEventListener('input', () => { bpm = +tempo.value; bpmval.textContent = bpm; });

  let lastStep = -1;
  function markStep(s) {
    if (lastStep >= 0) pads.forEach(row => row[lastStep].classList.remove('now'));
    if (s >= 0) pads.forEach(row => row[s].classList.add('now'));
    lastStep = s;
  }

  // Release each step's visuals when its sound actually plays
  function tick() {
    if (ac && playing) {
      while (events.length && events[0].t <= ac.currentTime) {
        const ev = events.shift();
        markStep(ev.step);
        window.dispatchEvent(new CustomEvent('radio:step', { detail: { kicked: ev.kicked, notes: ev.notes } }));
      }
    }
    requestAnimationFrame(tick);
  }
  tick();
})();
