/* ============================================
   HANDOUT MAKER PAGE (F48)
   The form and live preview for handout-engine.js. One handout of each type is kept
   in localStorage (gazette-handouts = { t, ink, forms: { wanted, letter, board, prices } }),
   so switching types or reloading keeps what you typed.
   URL: ?t=<type>[&from=npc|quest|shop&seed=…&<that tool's own keys>]. A link with a roll
   fills the handout from it, unless that handout was already filled from the same roll
   (then your edits stay). A filled handout keeps its roll as src, and the address bar
   shows it, so 🔗 Copy Link shares the roll.
   ============================================ */

const HO_KEY = 'gazette-handouts';
const HO_TYPES = Object.keys(HANDOUT_TYPES);

let ho = { t: 'wanted', ink: false, forms: {} };

function hoLoad() {
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(HO_KEY)); } catch (e) { saved = null; }
    saved = saved && typeof saved === 'object' ? saved : {};
    const forms = saved.forms && typeof saved.forms === 'object' ? saved.forms : {};
    ho = {
        t: HO_TYPES.includes(saved.t) ? saved.t : 'wanted',
        ink: saved.ink === true,
        forms: Object.fromEntries(HO_TYPES.map(t => [t, forms[t] ? handoutClean(t, forms[t]) : handoutBlank(t)]))
    };
}

function hoSave() {
    try { localStorage.setItem(HO_KEY, JSON.stringify(ho)); } catch (e) {
        // The page still works; say the typing won't survive a refresh (after any message of the caller's).
        queueMicrotask(() => hoFlash("⚠️ This browser wouldn't save your handouts (storage full or blocked)."));
    }
}

const hoForm = () => ho.forms[ho.t];

function hoIsBlank(t) {
    const { src, ...a } = ho.forms[t];
    const { src: s2, ...b } = handoutBlank(t);
    return JSON.stringify(a) === JSON.stringify(b);
}

function hoFlash(text) {
    const el = document.getElementById('ho-status');
    el.textContent = text;
    clearTimeout(el._t);
    el._t = setTimeout(() => { el.textContent = ''; }, 3500);
}

// Two clicks for anything that throws away typing.
function hoArmed(btn, action, needed = true) {
    if (!needed) { action(); return; }
    if (!btn.dataset.armed) {
        btn.dataset.armed = btn.textContent;
        btn.textContent = '⚠️ Click again to replace';
        btn._t = setTimeout(() => { btn.textContent = btn.dataset.armed; delete btn.dataset.armed; }, 3000);
        return;
    }
    clearTimeout(btn._t);
    btn.textContent = btn.dataset.armed;
    delete btn.dataset.armed;
    action();
}

// ── URL ───────────────────────────────────────────────────
function hoParams() {
    const p = { t: ho.t };
    const src = hoForm().src;
    if (src) new URLSearchParams(src).forEach((v, k) => { p[k] = p[k] ? [].concat(p[k], v) : v; });
    return p;
}

// Read the address bar: pick the type, and fill it from the roll in the link if that's new.
function hoApplyUrl() {
    const p = urlParams();
    const src = handoutSourceParams(p);
    const fills = src ? HANDOUT_SOURCES[src.from].fills : [];
    let t = p.get('t');
    if (!HO_TYPES.includes(t)) t = fills[0] || ho.t;
    ho.t = t;
    if (src && fills.includes(t) && ho.forms[t].src !== src.query) {
        const h = handoutFromSource(t, handoutSource(src));
        if (h) ho.forms[t] = h;
        else hoFlash('⚠️ That link names a roll this page could not rebuild.');
    }
}

// ── Form ──────────────────────────────────────────────────
function hoFieldHtml(f, v, id) {
    const label = `<label for="${id}">${hoEsc(f.label)}</label>`;
    if (f.check) return `<div class="ho-f"><label class="ho-f-check"><input type="checkbox" id="${id}" data-k="${f.k}"${v ? ' checked' : ''}> ${hoEsc(f.label)}</label></div>`;
    if (f.options) return `<div class="ho-f">${label}<select id="${id}" data-k="${f.k}">${f.options.map(([o, l]) => `<option value="${hoEsc(o)}"${o === v ? ' selected' : ''}>${hoEsc(l)}</option>`).join('')}</select></div>`;
    if (f.gp) return `<div class="ho-f">${label}<input type="number" id="${id}" data-k="${f.k}" min="0" max="${HANDOUT_GP_MAX}" step="any" inputmode="decimal" value="${v || ''}" placeholder="0"><span class="ho-coins" data-coins="${id}">${v ? '= ' + formatCoins(v) : ''}</span></div>`;
    if (f.area) return `<div class="ho-f">${label}<textarea id="${id}" data-k="${f.k}" maxlength="${f.max}" rows="${f.rows || 3}">${hoEsc(v)}</textarea></div>`;
    return `<div class="ho-f">${label}<input type="text" id="${id}" data-k="${f.k}" maxlength="${f.max}" value="${hoEsc(v)}"></div>`;
}

function hoRenderForm() {
    const h = hoForm(), list = HANDOUT_LISTS[ho.t];
    let html = `<h2>${HANDOUT_TYPES[ho.t].icon} ${HANDOUT_TYPES[ho.t].label}</h2>`
        + HANDOUT_FIELDS[ho.t].map(f => hoFieldHtml(f, h[f.k], `ho-${f.k}`)).join('');
    if (list) {
        const rows = h[list.key];
        html += `<div class="ho-${list.key}">${rows.map((r, i) => `
            <fieldset class="ho-row" data-i="${i}">
                <legend>${list.one} ${i + 1}
                    <button type="button" data-move="-1" data-i="${i}" title="Move up" aria-label="Move ${list.one.toLowerCase()} ${i + 1} up"${i ? '' : ' disabled'}>▲</button>
                    <button type="button" data-move="1" data-i="${i}" title="Move down" aria-label="Move ${list.one.toLowerCase()} ${i + 1} down"${i < rows.length - 1 ? '' : ' disabled'}>▼</button>
                    <button type="button" data-drop="${i}" title="Remove" aria-label="Remove ${list.one.toLowerCase()} ${i + 1}"${rows.length > list.min ? '' : ' disabled'}>✕</button>
                </legend>
                ${list.fields.map(f => hoFieldHtml(f, r[f.k], `ho-${list.key}-${i}-${f.k}`)).join('')}
            </fieldset>`).join('')}</div>
            <button type="button" class="btn ho-add" id="ho-add"${rows.length >= list.max ? ' disabled' : ''}>${rows.length >= list.max ? `${list.max} is the most that fit` : list.add}</button>`;
    }
    document.getElementById('ho-form').innerHTML = html;
}

function hoRenderPreview() {
    document.getElementById('ho-preview').innerHTML = handoutSheetHtml(hoForm(), ho.ink);
}

function hoRenderSource() {
    const box = document.getElementById('ho-source');
    const sp = hoForm().src ? handoutSourceParams(new URLSearchParams(hoForm().src)) : null;
    const src = sp && handoutSource(sp);
    if (!src) { box.hidden = true; box.innerHTML = ''; return; }
    const def = HANDOUT_SOURCES[src.from];
    const others = def.fills.filter(t => t !== ho.t);
    box.hidden = false;
    box.innerHTML = `<span>Filled from the ${def.icon} ${def.label} <a href="${hoEsc(handoutSourceLink(src))}">${hoEsc(src.title)}</a>.</span>
        <button type="button" class="btn" id="ho-refill" title="Throw away your edits and fill it from the roll again">↩️ Refill</button>
        ${others.map(t => `<button type="button" class="btn" data-also="${t}">Also make a ${HANDOUT_TYPES[t].icon} ${HANDOUT_TYPES[t].label}</button>`).join('')}`;
}

function hoRenderTypes() {
    document.querySelectorAll('#ho-types button').forEach(b => b.setAttribute('aria-pressed', b.dataset.t === ho.t));
    const roll = document.getElementById('ho-roll');
    if (!roll.dataset.armed) roll.textContent = `🎲 Roll a ${HANDOUT_TYPES[ho.t].label}`;
}

// push: true = new history entry, false = replace, null = leave the URL alone.
function hoRender(push = false) {
    hoRenderTypes();
    hoRenderForm();
    hoRenderPreview();
    hoRenderSource();
    document.getElementById('ho-ink').checked = ho.ink;
    if (push !== null) setUrlParams(hoParams(), push);
    hoSave();
}

// ── Actions ───────────────────────────────────────────────
function hoSetType(t) {
    if (t === ho.t) return;
    ho.t = t;
    hoRender(true);
}

// A new roll of the kind this handout is filled from.
function hoRoll() {
    const party = typeof loadParty === 'function' ? loadParty() : [];
    const from = { wanted: 'npc', letter: 'quest', board: 'quest', prices: 'shop' }[ho.t];
    const q = new URLSearchParams({ from, seed: newSeed() });
    if (from === 'quest' && party.length) { q.set('lvl', partyLevel(party)); q.set('n', Math.min(8, party.length)); }
    const h = handoutFromSource(ho.t, handoutSource(handoutSourceParams(q)));
    if (!h) { hoFlash('⚠️ The roll failed. Try again.'); return; }
    ho.forms[ho.t] = h;
    hoRender(true);
}

function hoFillFrom(t, src) {
    const h = handoutFromSource(t, handoutSource(handoutSourceParams(new URLSearchParams(src))));
    if (h) ho.forms[t] = h;
    return !!h;
}

function hoPrint() {
    window.print();
}

function hoCopy() {
    navigator.clipboard.writeText(handoutText(hoForm()))
        .then(() => hoFlash('📋 Copied as plain text.'))
        .catch(() => hoFlash('⚠️ Copy blocked by the browser.'));
}

function hoCopyLink() {
    const filled = !!hoForm().src;
    copyPageLink(ok => hoFlash(!ok ? '⚠️ Copy blocked by the browser.'
        : filled ? (hoIsEdited() ? '🔗 Link copied. It opens this handout as it was filled from the roll; your edits stay here.' : '🔗 Link copied. It opens this same handout.')
        : '🔗 Link copied, but this one was typed by hand, so the link opens a blank one. Use 📋 Copy Text to share the words.'));
}

function hoIsEdited() {
    const h = hoForm();
    if (!h.src) return true;
    const fresh = handoutFromSource(ho.t, handoutSource(handoutSourceParams(new URLSearchParams(h.src))));
    return !fresh || JSON.stringify(fresh) !== JSON.stringify(h);
}

// Typing: change the field, redraw the sheet (not the form, so the cursor stays put).
function hoOnInput(e) {
    const el = e.target;
    if (!el.dataset.k) return;
    const h = hoForm(), list = HANDOUT_LISTS[ho.t];
    const row = el.closest('.ho-row');
    const target = row ? h[list.key][+row.dataset.i] : h;
    const fields = row ? list.fields : HANDOUT_FIELDS[ho.t];
    const f = fields.find(x => x.k === el.dataset.k);
    if (!f || !target) return;
    target[f.k] = hoField(f, f.check ? el.checked : el.value);
    if (f.gp) {
        const hint = document.querySelector(`[data-coins="${el.id}"]`);
        if (hint) hint.textContent = target[f.k] ? '= ' + formatCoins(target[f.k]) : '';
    }
    hoRenderPreview();
    hoSave();
}

function hoOnClick(e) {
    const b = e.target.closest('button');
    if (!b) return;
    const list = HANDOUT_LISTS[ho.t];
    const rows = list && hoForm()[list.key];
    if (b.id === 'ho-add' && rows.length < list.max) {
        rows.push(handoutClean(ho.t, { [list.key]: [{}] })[list.key][0]);
    } else if (b.dataset.move) {
        const i = +b.dataset.i, j = i + +b.dataset.move;
        if (j < 0 || j >= rows.length) return;
        [rows[i], rows[j]] = [rows[j], rows[i]];
    } else if (b.dataset.drop) {
        if (rows.length <= list.min) return;
        rows.splice(+b.dataset.drop, 1);
    } else {
        return;
    }
    hoRender(null);
    const focus = b.id === 'ho-add' ? document.querySelector('.ho-row:last-of-type input') : null;
    if (focus) focus.focus();
}

function hoOnSourceClick(e) {
    const b = e.target.closest('button');
    if (!b) return;
    const src = hoForm().src;
    if (b.id === 'ho-refill') {
        hoArmed(b, () => { if (hoFillFrom(ho.t, src)) { hoRender(null); hoFlash('↩️ Filled from the roll again.'); } }, hoIsEdited());
    } else if (b.dataset.also) {
        const t = b.dataset.also;
        const go = () => {
            if (ho.forms[t].src !== src) hoFillFrom(t, src);
            ho.t = t;
            hoRender(true);
        };
        hoArmed(b, go, ho.forms[t].src !== src && !hoIsBlank(t));
    }
}

// ── Init ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('year').textContent = new Date().getFullYear();
    document.getElementById('ho-types').innerHTML = HO_TYPES.map(t =>
        `<button type="button" data-t="${t}" aria-pressed="false">${HANDOUT_TYPES[t].icon} ${HANDOUT_TYPES[t].label}</button>`).join('');

    hoLoad();
    hoApplyUrl();
    hoRender(false);

    document.getElementById('ho-types').addEventListener('click', e => {
        const b = e.target.closest('button[data-t]');
        if (b) hoSetType(b.dataset.t);
    });
    const form = document.getElementById('ho-form');
    form.addEventListener('input', hoOnInput);
    form.addEventListener('change', hoOnInput);
    form.addEventListener('click', hoOnClick);
    document.getElementById('ho-source').addEventListener('click', hoOnSourceClick);
    const roll = document.getElementById('ho-roll');
    roll.addEventListener('click', () => hoArmed(roll, hoRoll, !hoIsBlank(ho.t) && hoIsEdited()));
    document.getElementById('ho-print').addEventListener('click', hoPrint);
    document.getElementById('ho-copy').addEventListener('click', hoCopy);
    document.getElementById('ho-link').addEventListener('click', hoCopyLink);
    const clear = document.getElementById('ho-clear');
    clear.addEventListener('click', () => hoArmed(clear, () => {
        ho.forms[ho.t] = handoutBlank(ho.t);
        hoRender(true);
        hoFlash('🧽 Cleared.');
    }, !hoIsBlank(ho.t)));
    document.getElementById('ho-ink').addEventListener('change', e => {
        ho.ink = e.target.checked;
        hoRenderPreview();
        hoSave();
    });

    // Back/Forward: another type, or another roll.
    window.addEventListener('popstate', () => {
        hoApplyUrl();
        hoRender(null);
    });
    // Another tab saved: pick it up unless we're mid-typing here.
    window.addEventListener('storage', e => {
        if (e.key !== HO_KEY || document.activeElement && document.activeElement.closest('#ho-form')) return;
        const t = ho.t;
        hoLoad();
        ho.t = t;
        hoRender(null);
    });
});
