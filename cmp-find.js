(function () {
  // The Pathfinder lists' find box: hide links that don't match, and the sections left empty
  var q = document.getElementById('cmp-q');
  if (!q) return;
  // Accents, apostrophes and dashes don't count: "deja vu" finds Déjà Vu; "reapers", "reaper's" and
  // "reaper’s" all find Reaper's Lantern (B845).
  function fold(s) {
    return s.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[\u2018\u2019\u02bc`']/g, '').replace(/[\u2010-\u2015\u2212]/g, '-');
  }
  // "Rain-Caller" is found as "rain caller", "rain-caller" and "raincaller" (B993).
  function index(s) {
    var t = fold(s);
    return t + ' ' + t.replace(/-/g, '');
  }
  var sections = [].slice.call(document.querySelectorAll('section.cmp-more[id]')).map(function (sec) {
    var count = sec.querySelector('.cmp-count');
    return { sec: sec, count: count, total: count ? count.textContent : '', items: [].slice.call(sec.querySelectorAll('.cmp-links li')).map(function (li) {
      return { li: li, text: index(li.textContent + ' ' + (li.getAttribute('data-q') || '')) };
    }) };
  });
  var jump = document.querySelector('.cmp-jump'), jumpLabel = document.querySelector('.cmp-jump-label');
  function run() {
    var words = fold(q.value).split(/\s+/).filter(Boolean), any = false;
    sections.forEach(function (g) {
      var shown = 0;
      g.items.forEach(function (it) {
        var ok = words.every(function (w) { return it.text.indexOf(w) >= 0; });
        it.li.hidden = !ok;
        if (ok) shown++;
      });
      g.sec.hidden = !shown;
      if (g.count) g.count.textContent = words.length ? shown + ' of ' + g.total : g.total;
      if (shown) any = true;
    });
    if (jump) jump.hidden = jumpLabel.hidden = !!words.length;
    document.getElementById('cmp-none').hidden = any;
  }
  q.addEventListener('input', run);
  var start = new URLSearchParams(location.search).get('q');
  if (start) { q.value = start.slice(0, 40); run(); }
})();
