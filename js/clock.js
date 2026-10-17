// The base keeps the visitor's local time.
//   day   5:00–16:59  momoimoimi is asleep
//   night 17:00–1:59  the base is awake
//   deep  2:00–4:59   late-night extras appear
// Add ?time=day, ?time=night or ?time=deep to the address to preview a phase.
(() => {
  const OTL = (window.OTL = window.OTL || {});
  const forced = new URLSearchParams(location.search).get('time');
  const h = new Date().getHours();
  const phase = ['day', 'night', 'deep'].includes(forced) ? forced : (h >= 2 && h < 5 ? 'deep' : h >= 5 && h < 17 ? 'day' : 'night');
  OTL.time = { phase, hour: h };
  document.documentElement.dataset.phase = phase;

  // Fill any element marked data-phase-text with the line for this phase
  const fill = () => document.querySelectorAll('[data-phase-text]').forEach(el => {
    const line = el.dataset['text' + phase[0].toUpperCase() + phase.slice(1)];
    if (line) el.textContent = line;
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fill);
  else fill();
})();
