/* ============================================
   WORLDBUILDER: HISTORY TAB (F36)
   A history from history-engine.js (rollHistory): a timeline of ages, one age in full
   (what happened, who mattered, the faith of the day, and what it left behind), and
   the loose threads it leaves for play. Two links: the Pantheon tab's gods (who the
   ages name), and the Factions tab's factions (each gets the age it was founded in).
   Nothing is stored: the URL holds the history.
   URL: ?tab=history&seed=&ages=&span=&start=&age=<number>
        &gods=&gsize=&gshape=&gnaming=  (a linked pantheon)
        &facs=&fcount=&ffocus=&fscale=  (linked factions)
   ============================================ */

const HIS_FIELDS = { ages: 'his-ages', span: 'his-span', start: 'his-start' };
const HIS_GOD_KEYS = { gsize: 'size', gshape: 'shape', gnaming: 'naming' };
const HIS_FAC_KEYS = { fcount: 'count', ffocus: 'focus', fscale: 'scale' };

let hisState = { seed: null, data: null, view: 0, gods: null, pantheon: null, facs: null, factions: null };

function hisOpts() {
    const v = id => document.getElementById(id).value;
    return { ages: v('his-ages'), span: v('his-span'), start: v('his-start') };
}

function hisCtx() {
    return { pantheon: hisState.pantheon, factions: hisState.factions, facCtx: { pantheon: hisState.pantheon } };
}

function hisParams() {
    const params = {};
    Object.entries(HIS_FIELDS).forEach(([key, id]) => {
        const el = document.getElementById(id);
        params[key] = fieldValue(el) === defaultValue(el) ? null : el.value;
    });
    params.seed = hisState.seed;
    params.age = hisState.data && hisState.view ? hisState.view + 1 : null;
    const g = hisState.gods, f = hisState.facs;
    params.gods = g ? g.seed : null;
    Object.entries(HIS_GOD_KEYS).forEach(([key, opt]) => { params[key] = g && g[opt] !== 'random' ? g[opt] : null; });
    params.facs = f ? f.seed : null;
    Object.entries(HIS_FAC_KEYS).forEach(([key, opt]) => { params[key] = f && f[opt] !== 'random' ? f[opt] : null; });
    return worldUrlFor('history', params);
}

function hisSetLinks(g, f) {
    hisState.gods = g;
    hisState.pantheon = g ? rollPantheon(g.seed, g) : null;
    hisState.facs = f;
    hisState.factions = f ? rollFactions(f.seed, f) : null;
}

// push: true = new history entry, false = replace, null = leave the URL alone.
function rollHistoryFor(seed = newSeed(), push = true, keepView = false) {
    const prev = hisState.view;
    hisState.seed = seed;
    hisState.data = rollHistory(seed, hisOpts());
    hisState.view = keepView && prev < hisState.data.list.length ? prev : 0;
    renderHistory();
    if (push !== null) setUrlParams(hisParams(), push);
}

function hisLinkFrom(p, seedKey, keys) {
    const seed = parseSeed(p.get(seedKey));
    if (!seed) return null;
    const o = { seed };
    Object.entries(keys).forEach(([key, opt]) => { o[opt] = p.get(key) || 'random'; });
    return o;
}

function applyHisUrl(p) {
    Object.entries(HIS_FIELDS).forEach(([key, id]) => {
        const el = document.getElementById(id);
        if (!setFieldValue(el, p.get(key))) el.value = defaultValue(el);
    });
    hisSetLinks(hisLinkFrom(p, 'gods', HIS_GOD_KEYS), hisLinkFrom(p, 'facs', HIS_FAC_KEYS));
    const seed = parseSeed(p.get('seed'));
    if (!seed) return false;
    rollHistoryFor(seed, null);
    const n = parseInt(p.get('age'), 10);
    if (n >= 1 && n <= hisState.data.list.length) {
        hisState.view = n - 1;
        renderHistory();
    }
    return true;
}

// Link (or unlink) the Pantheon tab's gods or the Factions tab's factions, rolling one there first if needed.
function hisLink(what, on) {
    let g = hisState.gods, f = hisState.facs;
    if (what === 'gods') {
        if (on && !WORLD_TABS.pantheon.rolled()) WORLD_TABS.pantheon.fresh(null);
        g = on ? { seed: panState.seed, ...panOpts() } : null;
    } else {
        if (on && !WORLD_TABS.factions.rolled()) WORLD_TABS.factions.fresh(null);
        f = on ? { seed: facState.seed, ...facOpts() } : null;
        // The factions' own gods come along when this history has none yet.
        if (on && !g && facState.gods) g = { ...facState.gods };
    }
    hisSetLinks(g, f);
    renderHistory();
    setUrlParams(hisParams(), false);
}

// ── Render ────────────────────────────────────────────────
function hisDl(lines) {
    return `<dl class="wb-dl">${lines.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>`;
}

function hisTimelineHTML(h) {
    return `<ol class="his-line">${h.list.map((age, i) => `<li>
        <button type="button" class="his-age${i === hisState.view ? ' on' : ''}" data-age="${i}" aria-pressed="${i === hisState.view}">
            <span class="his-icon" aria-hidden="true">${HIS_KINDS[age.kind].icon}</span>
            <span class="his-name">${esc(hisCap(age.name))}</span>
            <span class="his-when">${esc(HIS_KINDS[age.kind].label)} · ${esc(hisWhen(age))}</span>
        </button>
    </li>`).join('')}</ol>`;
}

function hisAgeHTML(h, i, ctx) {
    const age = h.list[i];
    return `<div class="wb-month-head">
            <button type="button" class="btn wb-arrow" data-step="-1" aria-label="Earlier age">◀</button>
            <h4>${HIS_KINDS[age.kind].icon} ${esc(hisCap(age.name))}<small>${esc(HIS_KINDS[age.kind].label)} · age ${i + 1} of ${h.list.length}</small></h4>
            <button type="button" class="btn wb-arrow" data-step="1" aria-label="Later age">▶</button>
        </div>
        ${hisDl(hisAgeLines(h, i, ctx))}
        <p class="pan-links"><a class="btn" href="${esc(hisSiteLink(h, i))}">🏚️ Explore a ruin from this age</a></p>`;
}

// The Sites tab, on a site built in age i of this history (its own seed per age, so it stays put).
function hisSiteLink(h, i) {
    const params = new URLSearchParams({ tab: 'sites', seed: deriveSeed(h.seed, 'site.' + i), his: h.seed });
    Object.entries(HIS_FIELDS).forEach(([key, id]) => {
        const el = document.getElementById(id);
        if (fieldValue(el) !== defaultValue(el)) params.set('h' + key, el.value);
    });
    params.set('hage', i + 1);
    return 'worldbuilder.html?' + params.toString();
}

function hisAllHTML(h, ctx) {
    return h.list.map((age, i) => `<section class="pan-print-god">
        <h4>${HIS_KINDS[age.kind].icon} Age ${i + 1}: ${esc(hisCap(age.name))}</h4>
        ${hisDl(hisAgeLines(h, i, ctx))}
    </section>`).join('');
}

function hisLinksHTML() {
    const gods = hisState.pantheon
        ? `<p>⛪ The gods in these ages are ${esc(hisCap(hisState.pantheon.name))}.</p>`
        : `<p>⛪ The gods here are known by their titles.</p>`;
    const facs = hisState.factions
        ? `<p class="wb-small">🏛️ The ${hisState.factions.factions.length} factions from the Factions tab are each shown in the age they were founded in.</p>`
        : `<p class="wb-small">Link the Pantheon tab's gods and the Factions tab's factions to tie this history to them.</p>`;
    return `<div class="wb-today">
        ${gods}${facs}
        <p class="wb-holy-actions">
            ${hisState.pantheon ? '<button type="button" class="btn" data-link="gods" data-on="0">✕ Unlink the gods</button>' : '<button type="button" class="btn" data-link="gods" data-on="1">⛪ Use the Pantheon tab\'s gods</button>'}
            ${hisState.factions ? '<button type="button" class="btn" data-link="facs" data-on="0">✕ Unlink the factions</button>' : '<button type="button" class="btn" data-link="facs" data-on="1">🏛️ Use the Factions tab\'s factions</button>'}
        </p>
    </div>`;
}

function renderHistory() {
    const h = hisState.data;
    if (!h) return;
    const ctx = hisCtx();
    document.getElementById('his-card').innerHTML = `
        <header class="wb-head">
            <p class="wb-kicker">${HIS_STARTS[h.start].icon} ${esc(HIS_STARTS[h.start].label)} · ${h.list.length} ages · ${hisYears(h.total)} years</p>
            <h3 class="wb-name">The Chronicle of Ages</h3>
            <p class="wb-sub">${esc(hisSummary(h))}</p>
        </header>
        ${hisLinksHTML()}
        <section class="wb-block wb-wide his-line-block">
            <h4>📜 The ages, oldest first</h4>
            ${hisTimelineHTML(h)}
        </section>
        <section class="wb-block wb-wide" id="his-one">
            ${hisAgeHTML(h, hisState.view, ctx)}
        </section>
        <section class="wb-block wb-wide pan-all">
            ${hisAllHTML(h, ctx)}
        </section>
        <section class="wb-block wb-wide">
            <h4>🧵 Loose threads</h4>
            <ul class="wb-list">${hisThreads(h, ctx).map(t => `<li>${HIS_LEGACY_ICONS[t.kind]} ${esc(t.text)} <span class="wb-tag">${esc(hisCap(t.from))}</span></li>`).join('')}</ul>
        </section>`;
}

function showHisAge(i, focusSel) {
    const n = hisState.data.list.length;
    hisState.view = (i + n) % n;
    renderHistory();
    setUrlParams(hisParams(), false);
    if (focusSel) { const el = document.querySelector(focusSel); if (el) el.focus(); }
}

function setupHistory() {
    const ages = document.getElementById('his-ages');
    Object.entries(HIS_AGES).forEach(([key, a]) => ages.add(new Option(a.label, key)));
    const span = document.getElementById('his-span');
    Object.entries(HIS_SPANS).forEach(([key, s]) => span.add(new Option(s.label, key)));
    const start = document.getElementById('his-start');
    Object.entries(HIS_STARTS).forEach(([key, s]) => start.add(new Option(`${s.icon} ${s.label}`, key)));

    Object.values(HIS_FIELDS).forEach(id => document.getElementById(id).addEventListener('change', () => {
        if (hisState.seed) rollHistoryFor(hisState.seed, false, true);
    }));
    document.getElementById('his-roll').addEventListener('click', () => rollHistoryFor());
    document.getElementById('his-card').addEventListener('click', e => {
        const b = e.target.closest('.his-age');
        if (b) { showHisAge(Number(b.dataset.age)); document.getElementById('his-one').scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
        const a = e.target.closest('.wb-arrow');
        if (a) { showHisAge(hisState.view + Number(a.dataset.step), `#his-one .wb-arrow[data-step="${a.dataset.step}"]`); return; }
        const l = e.target.closest('[data-link]');
        if (l) hisLink(l.dataset.link, l.dataset.on === '1');
    });
    document.getElementById('his-copy').addEventListener('click', () => {
        if (hisState.data) copyText(historyText(hisState.data, hisCtx()), 'his-status', 'the history');
    });
    document.getElementById('his-print').addEventListener('click', () => {
        if (!hisState.data) return;
        document.body.classList.add('print-his');
        window.print();
    });
    window.addEventListener('afterprint', () => document.body.classList.remove('print-his'));
    document.getElementById('his-link').addEventListener('click', () =>
        copyPageLink(ok => flash('his-status', ok ? '🔗 Link copied. It opens this same history.' : '⚠️ Copy blocked by the browser.')));
}

WORLD_TABS.history = {
    setup: setupHistory,
    params: hisParams,
    apply: applyHisUrl,
    fresh: push => rollHistoryFor(newSeed(), push),
    rolled: () => !!hisState.seed,
    entry: () => {
        const h = hisState.data;
        return { title: `From ${h.list[0].name} to ${h.list[h.list.length - 1].name}`, sub: hisSummary(h) };
    }
};
