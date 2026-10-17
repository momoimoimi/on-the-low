// The lift between floors: following a floor link closes the doors and counts down to the next
// floor, and the next page opens them. Skipped with reduced motion. Pages work without it.
(() => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const FLOORS = { 'index.html': [1, '入口'], 'music.html': [2, '音源ルーム'], 'explore.html': [3, '探検'] };
  const pageOf = href => {
    const name = new URL(href, location.href).pathname.split('/').pop() || 'index.html';
    return FLOORS[name] ? name : null;
  };
  const here = pageOf(location.href);
  const KEY = 'otl-lift';

  function build(floor, label, dirn) {
    const el = document.createElement('div');
    el.className = 'lift';
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = `<div class="lift-door left"></div><div class="lift-door right"></div>
      <div class="lift-panel"><span class="lift-arrow">${dirn < 0 ? '▲' : '▼'}</span><b class="lift-floor">B${floor}</b><span class="lift-name"></span></div>`;
    el.querySelector('.lift-name').textContent = label;
    document.body.appendChild(el);
    return el;
  }

  // Arriving: start closed on this floor, then open
  let arrive = null;
  try { arrive = JSON.parse(sessionStorage.getItem(KEY) || 'null'); sessionStorage.removeItem(KEY); } catch (e) {}
  if (arrive && here && arrive.to === here) {
    const [n, label] = FLOORS[here];
    const el = build(n, label, arrive.dirn);
    el.classList.add('closed', 'arrived');
    requestAnimationFrame(() => requestAnimationFrame(() => {
      setTimeout(() => el.classList.remove('closed'), 260);
      setTimeout(() => el.remove(), 1100);
    }));
  }

  // Leaving: close the doors, count floors, then go
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || a.target) return;
    const to = pageOf(a.href);
    if (!to || !here || to === here || new URL(a.href, location.href).origin !== location.origin) return;
    e.preventDefault();
    const from = FLOORS[here][0], dest = FLOORS[to][0], dirn = Math.sign(dest - from);
    const el = build(from, FLOORS[here][1], dirn);
    const floorEl = el.querySelector('.lift-floor'), nameEl = el.querySelector('.lift-name');
    requestAnimationFrame(() => el.classList.add('closed'));
    let f = from;
    const tick = setInterval(() => {
      if (f === dest) return;
      f += dirn;
      floorEl.textContent = 'B' + f;
      nameEl.textContent = Object.values(FLOORS).find(v => v[0] === f)[1];
    }, 260);
    try { sessionStorage.setItem(KEY, JSON.stringify({ to, dirn })); } catch (e2) {}
    setTimeout(() => { clearInterval(tick); location.href = a.href; }, 420 + Math.abs(dest - from) * 260);
  });

  // Coming back with the browser's back button can restore a closed lift; clear it
  window.addEventListener('pageshow', e => { if (e.persisted) document.querySelectorAll('.lift').forEach(l => l.remove()); });
})();
