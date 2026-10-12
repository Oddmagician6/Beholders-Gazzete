/* ============================================
   RULES QUICK-REFERENCE PAGE (F42)
   Draws RULES_CARDS (rules-data.js), filters them as you type, and keeps the
   search in the address bar (?q=) so a link shares it. Print prints what's on screen.
   ============================================ */

function renderRules(q) {
    const html = RULES_CARDS.map(c => rulesCardHtml(c, q)).filter(Boolean);
    document.getElementById('rules-grid').innerHTML = html.join('');
    document.getElementById('rules-empty').hidden = html.length > 0;
    document.getElementById('rules-jump').innerHTML = RULES_CARDS
        .filter(c => document.getElementById(c.id))
        .map(c => `<li><a href="#${c.id}">${c.icon} ${rulesEsc(c.title)}</a></li>`).join('');
    const status = document.getElementById('rules-status');
    status.textContent = q.trim() ? `${html.length} of ${RULES_CARDS.length} cards match “${q.trim()}”.` : '';
}

function rulesFlash(text) {
    const el = document.getElementById('rules-status');
    el.textContent = text;
    clearTimeout(el._t);
    el._t = setTimeout(() => renderRules(document.getElementById('rules-q').value), 2500);
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('year').textContent = new Date().getFullYear();
    const box = document.getElementById('rules-q');
    box.value = (urlParams().get('q') || '').slice(0, 40);
    renderRules(box.value);
    // A link to a card (#cover) lands on it once the cards exist.
    if (location.hash && document.getElementById(location.hash.slice(1))) document.getElementById(location.hash.slice(1)).scrollIntoView();

    box.addEventListener('input', () => {
        renderRules(box.value);
        setUrlParams({ q: box.value.trim() || null }, false);
    });
    document.getElementById('rules-print').addEventListener('click', () => window.print());
    document.getElementById('rules-link').addEventListener('click', () =>
        copyPageLink(ok => rulesFlash(ok ? '🔗 Link copied.' : '⚠️ Copy blocked by the browser.')));
    window.addEventListener('popstate', () => {
        box.value = (urlParams().get('q') || '').slice(0, 40);
        renderRules(box.value);
    });
});
