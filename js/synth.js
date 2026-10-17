// Shared lo-fi sound engine for every page: Web Audio drums and keys, a step sequencer,
// and an analyser that visuals can read. Exposed as window.OTL.synth and window.OTL.Sequencer.
(() => {
  const OTL = (window.OTL = window.OTL || {});

  // E minor pentatonic, high to low: the melody rows of every sequencer
  const NOTES = [
    { name: 'D5', f: 587.33 }, { name: 'B4', f: 493.88 }, { name: 'A4', f: 440.0 },
    { name: 'G4', f: 392.0 }, { name: 'E4', f: 329.63 }
  ];
  const DRUMS = ['HAT', 'SNARE', 'KICK'];

  let ac = null, master, analyser, noiseBuf, wobble;

  function init() {
    ac = new (window.AudioContext || window.webkitAudioContext)();
    const comp = ac.createDynamicsCompressor();
    comp.threshold.value = -16; comp.ratio.value = 4;
    const tone = ac.createBiquadFilter();
    tone.type = 'lowpass'; tone.frequency.value = 4200;   // keep it low and soft
    master = ac.createGain(); master.gain.value = 0.7;
    analyser = ac.createAnalyser(); analyser.fftSize = 256; analyser.smoothingTimeConstant = 0.82;
    master.connect(tone); tone.connect(comp); comp.connect(analyser); analyser.connect(ac.destination);
    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    // tape wobble shared by the keys
    wobble = ac.createOscillator(); wobble.frequency.value = 0.35;
    const wg = ac.createGain(); wg.gain.value = 9; wobble.connect(wg); wobble.start();
    wobble.out = wg;
  }

  // Call from a click: creates or resumes the audio context
  async function ensure() {
    if (!ac) init();
    if (ac.state === 'suspended') await ac.resume();
    return ac;
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
  function key(t, f, vol = 0.22) {
    const g = ac.createGain(), lp = ac.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.setValueAtTime(2400, t); lp.frequency.exponentialRampToValueAtTime(700, t + 0.6);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
    [['triangle', 0], ['sine', 7], ['sine', -1200]].forEach(([type, det]) => {
      const o = ac.createOscillator(); o.type = type; o.frequency.value = f; o.detune.value = det;
      wobble.out.connect(o.detune);
      o.connect(lp); o.start(t); o.stop(t + 0.95);
    });
    lp.connect(g); g.connect(master);
  }
  // A soft single tone for UI moments (finding something, opening a door)
  async function chime(notes = [3, 1, 0]) {
    await ensure();
    const t = ac.currentTime + 0.02;
    notes.forEach((n, i) => key(t + i * 0.09, NOTES[n].f, 0.14));
  }

  // Route an <audio> element through the same chain so the visuals react to real tracks too
  const mediaNodes = new WeakMap();
  async function connectMedia(el) {
    await ensure();
    if (!mediaNodes.has(el)) {
      const src = ac.createMediaElementSource(el);
      src.connect(analyser);
      mediaNodes.set(el, src);
    }
  }

  // 0..1 loudness of the low end, for visuals
  const bins = new Uint8Array(128);
  function level() {
    if (!analyser) return 0;
    analyser.getByteFrequencyData(bins);
    let s = 0;
    for (let i = 1; i < 12; i++) s += bins[i];
    return s / (11 * 255);
  }

  OTL.synth = {
    NOTES, DRUMS, ensure, kick, snare, hat, key, chime, connectMedia, level,
    get ctx() { return ac; }
  };

  // Step sequencer. rows: NOTES then HAT, SNARE, KICK. getGrid() is read live, so edits apply while playing.
  // onStep(ev) fires when each step actually sounds: { step, kicked, notes:[bool x5] }.
  class Sequencer {
    constructor({ getGrid, bpm = 82, swing = 0.14, onStep = () => {} }) {
      this.getGrid = getGrid; this.bpm = bpm; this.swing = swing; this.onStep = onStep;
      this.playing = false; this.events = [];
      this._tick = this._tick.bind(this);
    }
    get stepDur() { return 60 / this.bpm / 4; }
    async start() {
      await ensure();
      if (this.playing) return;
      this.playing = true; this.step = 0; this.nextT = ac.currentTime + 0.06;
      this.timer = setInterval(() => this._schedule(), 25);
      this._schedule();
      requestAnimationFrame(this._tick);
    }
    stop() {
      this.playing = false;
      clearInterval(this.timer);
      this.events.length = 0;
    }
    _schedule() {
      const grid = this.getGrid(), rows = grid.length, steps = grid[0].length;
      while (this.nextT < ac.currentTime + 0.12) {
        const s = this.step;
        const t = this.nextT + (s % 2 ? this.stepDur * this.swing : 0);
        let kicked = false;
        for (let r = 0; r < rows; r++) {
          if (!grid[r][s]) continue;
          if (r < NOTES.length) key(t, NOTES[r].f);
          else if (r === rows - 3) hat(t);
          else if (r === rows - 2) snare(t);
          else { kick(t); kicked = true; }
        }
        this.events.push({ t, step: s, kicked, notes: NOTES.map((_, r) => !!grid[r][s]) });
        this.nextT += this.stepDur;
        this.step = (s + 1) % steps;
      }
    }
    _tick() {
      if (!this.playing) return;
      while (this.events.length && this.events[0].t <= ac.currentTime) {
        const ev = this.events.shift();
        this.onStep(ev);
        window.dispatchEvent(new CustomEvent('radio:step', { detail: ev }));
      }
      requestAnimationFrame(this._tick);
    }
  }
  OTL.Sequencer = Sequencer;

  // Turn pattern strings ('x' = on) into a grid
  OTL.parsePattern = rows => rows.map(r => [...r].map(c => c === 'x'));
})();
