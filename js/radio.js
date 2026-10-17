// Base radio on the top page: an editable 16-step grid played by the shared sequencer (synth.js).
// Every sounding step fires "radio:step" on window, which the 3D scene reacts to.
(() => {
  const { NOTES, DRUMS } = OTL.synth;
  const ROWS = NOTES.length + DRUMS.length, STEPS = 16;
  let grid = OTL.parsePattern([
    '..........x.....',
    '......x.......x.',
    '...x.......x....',
    '.x......x.......',
    'x.........x.....',
    '..x...x...x...xx',
    '....x.......x...',
    'x......x..x.....'
  ]);

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

  let lastStep = -1;
  function markStep(s) {
    if (lastStep >= 0) pads.forEach(row => row[lastStep].classList.remove('now'));
    if (s >= 0) pads.forEach(row => row[s].classList.add('now'));
    lastStep = s;
  }

  const seq = new OTL.Sequencer({ getGrid: () => grid, bpm: 82, onStep: ev => markStep(ev.step) });

  /* ---------- Controls ---------- */
  const playBtn = document.getElementById('play'), onair = document.getElementById('onair');
  playBtn.addEventListener('click', async () => {
    if (seq.playing) { seq.stop(); markStep(-1); }
    else await seq.start();
    playBtn.textContent = seq.playing ? '■ 停止' : '▶ 再生';
    onair.classList.toggle('live', seq.playing);
    onair.lastChild.textContent = seq.playing ? 'ON AIR' : 'OFF AIR';
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
  const setBpm = v => { seq.bpm = v; tempo.value = v; bpmval.textContent = v; };
  tempo.addEventListener('input', () => setBpm(+tempo.value));

  /* ---------- Sharing a beat ---------- */
  // The grid is 8 x 16 on/off = 16 bytes, written as base64url in ?beat=, with ?bpm= beside it
  const encode = g => {
    const bytes = new Uint8Array(ROWS * STEPS / 8);
    g.flat().forEach((on, i) => { if (on) bytes[i >> 3] |= 1 << (i & 7); });
    return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  };
  const decode = s => {
    const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
    if (bin.length !== ROWS * STEPS / 8) throw new Error('bad beat');
    return Array.from({ length: ROWS }, (_, r) => Array.from({ length: STEPS }, (_, c) => {
      const i = r * STEPS + c;
      return !!(bin.charCodeAt(i >> 3) & (1 << (i & 7)));
    }));
  };

  const params = new URLSearchParams(location.search);
  if (params.get('beat')) {
    try {
      grid = decode(params.get('beat'));
      paint();
      const b = +params.get('bpm');
      if (b >= +tempo.min && b <= +tempo.max) setBpm(b);
      document.getElementById('beat-from').hidden = false;
    } catch (e) { /* a broken link just keeps the house beat */ }
  }

  const shareOut = document.getElementById('share-out'), shareUrl = document.getElementById('share-url'), shareMsg = document.getElementById('share-msg');
  document.getElementById('share').addEventListener('click', async () => {
    const url = `${location.origin}${location.pathname}?beat=${encode(grid)}&bpm=${seq.bpm}#radio`;
    shareUrl.value = url;
    shareOut.hidden = false;
    try {
      await navigator.clipboard.writeText(url);
      shareMsg.textContent = 'リンクをコピーしたよ';
    } catch (e) {
      shareUrl.focus(); shareUrl.select();
      shareMsg.textContent = 'リンクを選んだよ。コピーして送ってね';
    }
  });
  shareUrl.addEventListener('focus', () => shareUrl.select());
})();
