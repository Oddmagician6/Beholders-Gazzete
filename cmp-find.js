(function () {
  // The Pathfinder lists' find box: hide links that don't match, and the sections left empty
  var q = document.getElementById('cmp-q');
  if (!q) return;
  var sections = [].slice.call(document.querySelectorAll('section.cmp-more[id]')).map(function (sec) {
    var count = sec.querySelector('.cmp-count');
    return { sec: sec, count: count, total: count ? count.textContent : '', items: [].slice.call(sec.querySelectorAll('.cmp-links li')).map(function (li) {
      return { li: li, text: (li.textContent + ' ' + (li.getAttribute('data-q') || '')).toLowerCase() };
    }) };
  });
  var jump = document.querySelector('.cmp-jump'), jumpLabel = document.querySelector('.cmp-jump-label');
  function run() {
    var words = q.value.toLowerCase().split(/\s+/).filter(Boolean), any = false;
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
