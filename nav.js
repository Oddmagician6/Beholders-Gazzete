// Main nav: mobile hamburger plus the dropdown groups: Sections and the 5e and Pathfinder toolkits (every page).
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
    // Desktop dropdown: fit it into the space below the nav (it scrolls past that).
    // Opened by a click, it first makes room; hovering never scrolls the page.
    group.addEventListener('mouseenter', fitSub);
    toggle.addEventListener('click', function() {
      if (group.classList.contains('open') && !(ul && ul.classList.contains('nav-open'))) makeRoom(212);
      fitSub();
    });
  });

  // With less than `need` px below the nav, scroll the page (at most until the nav sticks at the
  // top) so a menu opened by a click or tap fits.
  function makeRoom(need) {
    const r = nav.getBoundingClientRect();
    const short = need - (window.innerHeight - r.bottom);
    if (short > 0 && r.top > 0) window.scrollBy({ top: Math.min(short, r.top), behavior: 'instant' });
  }

  function fitSub() {
    const room = window.innerHeight - nav.getBoundingClientRect().bottom - 12;
    nav.style.setProperty('--nav-sub-max', Math.max(room, 80) + 'px');
  }
  window.addEventListener('resize', fitSub);
  window.addEventListener('scroll', fitSub, { passive: true });

  // Fit the open mobile menu into the space below the nav so it scrolls
  // instead of running off the bottom of the screen
  function fitMenu() {
    if (!ul || !ul.classList.contains('nav-open')) return;
    const room = window.innerHeight - nav.getBoundingClientRect().bottom;
    ul.style.setProperty('--nav-menu-max', Math.max(room, 80) + 'px');
  }
  window.addEventListener('resize', fitMenu);
  window.addEventListener('scroll', fitMenu, { passive: true });

  if (btn && ul) {
    btn.setAttribute('aria-expanded', 'false');
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      const open = ul.classList.toggle('nav-open');
      btn.textContent = open ? '✕' : '☰';
      btn.setAttribute('aria-expanded', open);
      // On a tool page, open its group so the current page is visible
      if (open) groups.forEach(function(g) { if (g.querySelector('a.active')) setGroup(g, true); });
      if (open) makeRoom(200);
      fitMenu();
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
