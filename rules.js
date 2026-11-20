/* ============================================
   RULES QUICK-REFERENCE PAGE (F42)
   Draws RULES_CARDS (rules-data.js), filters them as you type, and keeps the
   search in the address bar (?q=) so a link shares it. Print prints what's on screen.
   The Rules picker (srd52.js, text-only) redraws the cards in 2014 or 2024 wording.
   ============================================ */

function renderRules(q) {
    // rules-data.js didn't arrive: the prerendered cards stay as they are.
    if (typeof RULES_CARDS === 'undefined') return;
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
    // Print and Copy Link first: they work on the cards already on the page whatever happens below.
    document.getElementById('rules-print').addEventListener('click', () => window.print());
    document.getElementById('rules-link').addEventListener('click', () => {
        // Write the search through setUrlParams first: it adds the rules= the page shows (srd52.js),
        // which an address opened by hand doesn't have yet.
        if (typeof setUrlParams === 'function') setUrlParams({ q: box.value.trim() || null }, false);
        copyPageLink(ok => rulesFlash(ok ? '🔗 Link copied.' : '⚠️ Copy blocked by the browser.'));
    });
    box.value = (urlParams().get('q') || '').slice(0, 40);
    // The 2014/2024 picker (srd52.js): three cards have 2024 versions.
    if (typeof srd52Toggle === 'function') {
        document.getElementById('rules-version').innerHTML = srd52Toggle();
        srd52OnChange(() => renderRules(box.value));
    }
    renderRules(box.value);
    // A link to a card (#cover) lands on it once the cards exist.
    if (location.hash && document.getElementById(location.hash.slice(1))) document.getElementById(location.hash.slice(1)).scrollIntoView();

    box.addEventListener('input', () => {
        renderRules(box.value);
        setUrlParams({ q: box.value.trim() || null }, false);
    });
    window.addEventListener('popstate', () => {
        box.value = (urlParams().get('q') || '').slice(0, 40);
        renderRules(box.value);
    });
});
