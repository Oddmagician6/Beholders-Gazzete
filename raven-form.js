// Sends any <form data-raven> to its Formspree action in the background, so the reader stays on
// the site. On success it goes to data-next (if set) or shows the form's .raven-status message.
// Without JavaScript the form still posts normally to Formspree.
document.querySelectorAll('form[data-raven]').forEach(form => {
  const status = form.querySelector('.raven-status');
  const button = form.querySelector('button[type="submit"]');
  const say = (msg, ok) => {
    if (!status) return;
    status.textContent = msg;
    status.className = 'raven-status ' + (ok ? 'raven-ok' : 'raven-err');
  };

  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (form.querySelector('input[name="_gotcha"]')?.value) return; // bots fill the hidden field
    const label = button?.textContent;
    if (button) { button.disabled = true; button.textContent = 'Sending raven…'; }
    try {
      const res = await fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' }
      });
      if (!res.ok) throw new Error(res.status);
      if (form.dataset.next) { window.location.href = form.dataset.next; return; }
      form.reset();
      say(form.dataset.success || 'Your raven is on its way.', true);
    } catch {
      say('The raven turned back. Please try again in a moment.', false);
    } finally {
      if (button) { button.disabled = false; button.textContent = label; }
    }
  });
});
