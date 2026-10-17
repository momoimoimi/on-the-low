// A small secret on every page: type "momo" (or tap the logo five times quickly) and momoimoimi
// peeks in from the bottom corner. Typing "mame" brings Mameyuki instead.
(() => {
  const FACES = {
    momo: {
      line: '……みつかった？',
      svg: `<svg viewBox="0 0 120 120" aria-hidden="true">
        <polygon points="58,22 66,22 68,40 56,40" fill="#7a5a48"/>
        <polygon points="64,26 98,10 80,40" fill="#6fd6b8"/>
        <polygon points="60,36 96,50 108,86 88,118 32,118 12,86 24,50" fill="#ff9f8c"/>
        <polygon points="60,36 96,50 64,70" fill="#ffc2b4"/><polygon points="12,86 32,118 40,84" fill="#e07d6c"/>
        <path d="M18 74 Q60 20 102 74" fill="none" stroke="#2c2640" stroke-width="7"/>
        <polygon points="6,66 22,62 26,88 10,92" fill="#9d8cff"/><polygon points="98,62 114,66 110,92 94,88" fill="#9d8cff"/>
        <circle cx="46" cy="80" r="5" fill="#1a1626"/><circle cx="74" cy="80" r="5" fill="#1a1626"/>
        <polygon points="30,90 40,88 40,96 30,96" fill="#ff7f86" opacity=".8"/><polygon points="80,88 90,90 90,96 80,96" fill="#ff7f86" opacity=".8"/>
      </svg>`
    },
    mame: {
      line: 'しーっ。',
      svg: `<svg viewBox="0 0 120 120" aria-hidden="true">
        <polygon points="64,14 72,30 58,32" fill="#6fd6b8"/>
        <polygon points="60,30 92,46 98,84 82,118 38,118 22,84 28,46" fill="#8fd47a"/>
        <polygon points="60,30 92,46 64,64" fill="#aee59c"/><polygon points="22,84 38,118 44,86" fill="#6cb85c"/>
        <circle cx="46" cy="76" r="7" fill="#1a1626"/><circle cx="74" cy="76" r="7" fill="#1a1626"/>
        <circle cx="48" cy="73" r="2" fill="#ece6f6"/><circle cx="76" cy="73" r="2" fill="#ece6f6"/>
      </svg>`
    }
  };

  let busy = false;
  function peek(who) {
    if (busy) return;
    busy = true;
    const el = document.createElement('div');
    el.className = 'peeker';
    el.setAttribute('role', 'status');
    el.innerHTML = `${FACES[who].svg}<span class="peeker-line"></span>`;
    el.querySelector('.peeker-line').textContent = FACES[who].line;
    document.body.appendChild(el);
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('in')));
    setTimeout(() => el.classList.remove('in'), 2600);
    setTimeout(() => { el.remove(); busy = false; }, 3300);
  }

  let typed = '';
  document.addEventListener('keydown', e => {
    if (e.target.closest && e.target.closest('input, textarea, [contenteditable]')) return;
    if (e.key.length !== 1) return;
    typed = (typed + e.key.toLowerCase()).slice(-4);
    if (typed === 'momo') { typed = ''; peek('momo'); }
    if (typed === 'mame') { typed = ''; peek('mame'); }
  });

  // On a phone: tap the logo five times within two seconds
  const mark = document.querySelector('.mark');
  let taps = [];
  if (mark) mark.addEventListener('click', e => {
    const now = Date.now();
    taps = [...taps.filter(t => now - t < 2000), now];
    if (taps.length >= 2) e.preventDefault();   // keep the page still while tapping
    if (taps.length >= 5) { taps = []; peek('momo'); }
  });
})();
