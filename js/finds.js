// What the visitor has found while exploring B3. Kept in this browser only (localStorage),
// so other pages can react, e.g. the secret tape showing up in the B2 music room.
(() => {
  const OTL = (window.OTL = window.OTL || {});
  const KEY = 'otl-found';

  const read = () => {
    try { return new Set(JSON.parse(localStorage.getItem(KEY) || '[]')); }
    catch (e) { return new Set(); }
  };
  let found = read();
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify([...found])); } catch (e) {} };

  OTL.finds = {
    has: id => found.has(id),
    add: id => {
      if (found.has(id)) return false;
      found.add(id); save();
      return true;
    },
    all: () => [...found],
    reset: () => { found = new Set(); save(); }
  };
})();
