// Registers the offline service worker (sw.js) on every page. Loaded from the site-meta block.
// On a local preview it stays off, so edited files show up on reload. Add ?sw=on to a local URL to
// test it (remembered in this browser), and ?sw=off to turn it back off and remove it.
(function () {
  if (!('serviceWorker' in navigator)) return;
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
  if (local) {
    const flag = new URLSearchParams(location.search).get('sw');
    try {
      if (flag === 'on') localStorage.setItem('gazette-sw-dev', '1');
      if (flag === 'off') localStorage.removeItem('gazette-sw-dev');
      if (localStorage.getItem('gazette-sw-dev') !== '1') {
        // Clear caches after load: until then the old worker still serves (and refills) this page
        window.addEventListener('load', async () => {
          const regs = await navigator.serviceWorker.getRegistrations();
          await Promise.all(regs.map(r => r.unregister()));
          for (const k of await caches.keys()) if (k.startsWith('gazette-')) await caches.delete(k);
        });
        return;
      }
    } catch (e) { return; }
  }
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(new URL('sw.js', document.baseURI)).catch(() => {});
  });
})();
