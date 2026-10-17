// Renders 基地だより (news/news.js) into any element with data-news. data-news="3" shows only the latest three.
(() => {
  const list = Array.isArray(window.OTL_NEWS) ? window.OTL_NEWS : [];
  const fmt = d => {
    const [y, m, day] = d.split('-').map(Number);
    return `${y}.${String(m).padStart(2, '0')}.${String(day).padStart(2, '0')}`;
  };
  document.querySelectorAll('[data-news]').forEach(el => {
    const n = parseInt(el.dataset.news, 10);
    const items = n > 0 ? list.slice(0, n) : list;
    if (!items.length) {
      const p = document.createElement('p');
      p.className = 'lead';
      p.textContent = 'まだ、お知らせはありません。';
      el.appendChild(p);
      return;
    }
    items.forEach(item => {
      const art = document.createElement('article');
      art.className = 'news-item';
      const time = document.createElement('time');
      time.dateTime = item.date; time.textContent = fmt(item.date);
      const h = document.createElement('h3'); h.textContent = item.title;
      art.append(time, h);
      String(item.body || '').split('\n').forEach(line => {
        const p = document.createElement('p'); p.textContent = line; art.appendChild(p);
      });
      el.appendChild(art);
    });
  });
})();
