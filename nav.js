// Main nav: mobile hamburger plus the "DM Tools" dropdown (every page).
(function() {
  const nav = document.querySelector('.main-nav');
  if (!nav) return;
  const btn = document.getElementById('nav-hamburger');
  const ul = nav.querySelector(':scope > ul');
  const groups = Array.from(nav.querySelectorAll('.nav-group'));

  function setGroup(group, open) {
    group.classList.toggle('open', open);
    group.querySelector('.nav-group-toggle').setAttribute('aria-expanded', open);
  }
  function closeGroups(except) {
    groups.forEach(function(g) { if (g !== except) setGroup(g, false); });
  }
  function closeMenu() {
    if (!btn || !ul) return;
    ul.classList.remove('nav-open');
    btn.textContent = '☰';
    btn.setAttribute('aria-expanded', 'false');
  }

  groups.forEach(function(group) {
    const toggle = group.querySelector('.nav-group-toggle');
    toggle.addEventListener('click', function(e) {
      e.stopPropagation();
      const open = !group.classList.contains('open');
      closeGroups(group);
      setGroup(group, open);
    });
    // Keyboard users tabbing past the last tool close the dropdown
    group.addEventListener('focusout', function(e) {
      if (!group.contains(e.relatedTarget)) setGroup(group, false);
    });
  });

  if (btn && ul) {
    btn.setAttribute('aria-expanded', 'false');
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      const open = ul.classList.toggle('nav-open');
      btn.textContent = open ? '✕' : '☰';
      btn.setAttribute('aria-expanded', open);
      // On a tool page, open its group so the current page is visible
      if (open) groups.forEach(function(g) { if (g.querySelector('a.active')) setGroup(g, true); });
    });
    // Close when a link is tapped
    ul.addEventListener('click', function(e) {
      if (e.target.closest('a')) { closeMenu(); closeGroups(); }
    });
  }

  // Close when tapping outside
  document.addEventListener('click', function(e) {
    if (!e.target.closest('.main-nav')) { closeMenu(); closeGroups(); }
  });

  document.addEventListener('keydown', function(e) {
    if (e.key !== 'Escape') return;
    const open = groups.find(function(g) { return g.classList.contains('open'); });
    if (open) {
      setGroup(open, false);
      open.querySelector('.nav-group-toggle').focus();
    } else if (ul && ul.classList.contains('nav-open')) {
      closeMenu();
      btn.focus();
    }
  });
})();
