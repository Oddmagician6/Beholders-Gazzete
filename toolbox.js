/* ============================================
   DM TOOLBOX
   Small table tools on one page, one tab each (?tab=).
   Names (F21): tavern and shop names, rolled by names-data.js (rollPlaceNames).
   Seeds and the shareable URL: rng.js.
   ============================================ */

const TOOLBOX_TABS = ['names'];
const KEPT_KEY = 'gazette-kept-names';
const KEPT_MAX = 100;

let names = { seed: null, list: [] };
let kept = [];

function esc(text) {
    return String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function flash(id, text) {
    const el = document.getElementById(id);
    el.textContent = text;
    clearTimeout(el._t);
    el._t = setTimeout(() => { el.textContent = ''; }, 2500);
}

function copyText(text, statusId, what) {
    navigator.clipboard.writeText(text)
        .then(() => flash(statusId, `📋 Copied ${what}.`))
        .catch(() => flash(statusId, '⚠️ Copy blocked by the browser.'));
}

// ── Tabs ──────────────────────────────────────────────────
function currentTab() {
    const t = urlParams().get('tab');
    return TOOLBOX_TABS.includes(t) ? t : TOOLBOX_TABS[0];
}

function showTab(tab) {
    document.querySelectorAll('.tool-tab').forEach(b => {
        const on = b.dataset.tab === tab;
        b.classList.toggle('active', on);
        b.setAttribute('aria-selected', on);
    });
    document.querySelectorAll('.tool-panel').forEach(p => { p.hidden = p.id !== 'tab-' + tab; });
}

// The URL params of the tab on screen (the default tab stays out of the URL).
function urlFor(tab, params) {
    return { ...(tab === TOOLBOX_TABS[0] ? {} : { tab }), ...params };
}

// ── Names (F21) ───────────────────────────────────────────
function typeLabel(type) {
    const t = NAME_TABLES.types[type];
    return t ? `${t.icon} ${t.label}` : '';
}

function setupNamePicker() {
    const sel = document.getElementById('name-for');
    Object.entries(NAME_TABLES.types).forEach(([key, t]) => {
        if (key === 'tavern') return;   // already the first option
        sel.add(new Option(`${t.icon} ${t.label}`, key));
    });
}

function nameParams() {
    const sel = document.getElementById('name-for');
    return urlFor('names', { for: fieldValue(sel) === defaultValue(sel) ? null : sel.value, seed: names.seed });
}

function rollNamesFor(seed = newSeed(), push = true) {
    const type = document.getElementById('name-for').value;
    names = { seed, list: withSeed(seed, () => rollPlaceNames(type, 10)) };
    renderNames();
    if (push !== null) setUrlParams(nameParams(), push);
}

function isKept(name) {
    return kept.some(k => k.name === name);
}

function renderNames() {
    const any = document.getElementById('name-for').value === 'random';
    document.getElementById('name-list').innerHTML = names.list.map((n, i) => `
        <li>
            <button type="button" class="name-pick" data-i="${i}" title="Copy this name">${esc(n.name)}</button>
            ${any ? `<span class="name-type">${esc(typeLabel(n.type))}</span>` : ''}
            <button type="button" class="name-keep${isKept(n.name) ? ' on' : ''}" data-i="${i}"
                aria-pressed="${isKept(n.name)}" aria-label="Keep ${esc(n.name)}" title="Keep this name">${isKept(n.name) ? '★' : '☆'}</button>
        </li>`).join('');
}

function onNameListClick(e) {
    const btn = e.target.closest('button');
    if (!btn) return;
    const n = names.list[Number(btn.dataset.i)];
    if (!n) return;
    if (btn.classList.contains('name-pick')) copyText(n.name, 'names-status', `“${n.name}”`);
    else toggleKeep(n);
}

// ── Kept names (localStorage) ─────────────────────────────
function loadKept() {
    try {
        const saved = JSON.parse(localStorage.getItem(KEPT_KEY));
        if (Array.isArray(saved)) kept = saved.filter(k => k && typeof k.name === 'string');
    } catch (e) {}
}

function saveKept() {
    try { localStorage.setItem(KEPT_KEY, JSON.stringify(kept)); } catch (e) {}
}

function toggleKeep(n) {
    if (isKept(n.name)) kept = kept.filter(k => k.name !== n.name);
    else {
        if (kept.length >= KEPT_MAX) { flash('names-status', `⚠️ The ledger holds ${KEPT_MAX} names. Remove some first.`); return; }
        kept.push({ name: n.name, type: n.type });
    }
    saveKept();
    renderNames();
    renderKept();
}

function renderKept() {
    const box = document.getElementById('kept');
    box.hidden = !kept.length;
    document.getElementById('kept-count').textContent = kept.length;
    document.getElementById('kept-list').innerHTML = kept.map((k, i) => `
        <li>
            <span class="kept-name">${esc(k.name)}</span>
            <span class="name-type">${esc(typeLabel(k.type))}</span>
            <button type="button" class="kept-remove" data-i="${i}" aria-label="Remove ${esc(k.name)}" title="Remove">✕</button>
        </li>`).join('');
}

function onKeptClick(e) {
    const btn = e.target.closest('.kept-remove');
    if (!btn) return;
    kept.splice(Number(btn.dataset.i), 1);
    saveKept();
    renderKept();
    renderNames();
}

// Two clicks: the first arms the button for a few seconds.
function clearKept() {
    const btn = document.getElementById('kept-clear');
    if (!kept.length) return;
    if (!btn.dataset.armed) {
        btn.dataset.armed = '1';
        btn.textContent = '⚠️ Click again to clear';
        btn._t = setTimeout(() => { delete btn.dataset.armed; btn.textContent = '🧹 Clear'; }, 3000);
        return;
    }
    clearTimeout(btn._t);
    delete btn.dataset.armed;
    btn.textContent = '🧹 Clear';
    const count = kept.length;
    kept = [];
    saveKept();
    renderKept();
    renderNames();
    flash('names-status', `🧹 Cleared ${count} kept name${count === 1 ? '' : 's'}.`);
}

// ── URL: ?tab=&for=<type>&seed= ───────────────────────────
// Rebuild the page from the address bar. Returns true when it held a roll.
function applyUrl() {
    const tab = currentTab();
    showTab(tab);
    const p = urlParams();
    const sel = document.getElementById('name-for');
    if (!setFieldValue(sel, p.get('for'))) sel.value = defaultValue(sel);
    const seed = parseSeed(p.get('seed'));
    if (seed) { rollNamesFor(seed, null); return true; }
    return false;
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('year').textContent = new Date().getFullYear();
    setupNamePicker();
    loadKept();
    renderKept();

    document.querySelectorAll('.tool-tab').forEach(b => b.addEventListener('click', () => {
        showTab(b.dataset.tab);
        setUrlParams(b.dataset.tab === 'names' ? nameParams() : urlFor(b.dataset.tab, {}), true);
    }));
    document.getElementById('roll-names').addEventListener('click', () => rollNamesFor());
    document.getElementById('name-for').addEventListener('change', () => rollNamesFor());
    document.getElementById('name-list').addEventListener('click', onNameListClick);
    document.getElementById('kept-list').addEventListener('click', onKeptClick);
    document.getElementById('kept-copy').addEventListener('click', () =>
        copyText(kept.map(k => k.name).join('\n'), 'names-status', `${kept.length} kept name${kept.length === 1 ? '' : 's'}`));
    document.getElementById('kept-clear').addEventListener('click', clearKept);
    document.getElementById('names-link').addEventListener('click', () =>
        copyPageLink(ok => flash('names-status', ok ? '🔗 Link copied. It rolls these same ten names.' : '⚠️ Copy blocked by the browser.')));

    if (!applyUrl()) rollNamesFor(newSeed(), false);
    // Back/Forward step through earlier rolls.
    window.addEventListener('popstate', () => { if (!applyUrl()) rollNamesFor(newSeed(), false); });
});
