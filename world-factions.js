/* ============================================
   WORLDBUILDER: FACTIONS TAB (F35)
   Factions from faction-engine.js (rollFactions): a roster of the powers in a town,
   a city, or a kingdom, one faction's full page (leader and lieutenants open on the
   NPC page), and the rivalries and alliances between them. "Use the Pantheon tab's
   gods" links a pantheon, and then temples, orders, and some cults and houses follow
   one of its gods. Nothing is stored: the URL holds the factions. Each leader's 🌳 button rolls
   their family on the Families tab (F55).
   URL: ?tab=factions&seed=&count=&focus=&scale=&faction=<number>&gods=&gsize=&gshape=&gnaming=
   ============================================ */

const FAC_FIELDS = { count: 'fac-count', focus: 'fac-focus', scale: 'fac-scale' };
// The linked pantheon's URL keys → its option names (the same keys the Calendar uses).
const FAC_GOD_KEYS = { gsize: 'size', gshape: 'shape', gnaming: 'naming' };

let facState = { seed: null, data: null, view: 0, gods: null, pantheon: null };

function facOpts() {
    const v = id => document.getElementById(id).value;
    return { count: v('fac-count'), focus: v('fac-focus'), scale: v('fac-scale') };
}

function facCtx() {
    return { pantheon: facState.pantheon };
}

function facParams() {
    const params = {};
    Object.entries(FAC_FIELDS).forEach(([key, id]) => {
        const el = document.getElementById(id);
        params[key] = fieldValue(el) === defaultValue(el) ? null : el.value;
    });
    params.seed = facState.seed;
    params.faction = facState.data && facState.view ? facState.view + 1 : null;
    const g = facState.gods;
    params.gods = g ? g.seed : null;
    Object.entries(FAC_GOD_KEYS).forEach(([key, opt]) => { params[key] = g && g[opt] !== 'random' ? g[opt] : null; });
    return worldUrlFor('factions', params);
}

function facSetPantheon(g) {
    facState.gods = g;
    facState.pantheon = g ? rollPantheon(g.seed, g) : null;
}

// push: true = new history entry, false = replace, null = leave the URL alone.
// keepView: stay on the faction being read (when an option changes).
function rollFactionsFor(seed = newSeed(), push = true, keepView = false) {
    const prev = facState.view;
    facState.seed = seed;
    facState.data = rollFactions(seed, facOpts());
    facState.view = keepView && prev < facState.data.factions.length ? prev : 0;
    renderFactions();
    if (push !== null) setUrlParams(facParams(), push);
}

function applyFacUrl(p) {
    Object.entries(FAC_FIELDS).forEach(([key, id]) => {
        const el = document.getElementById(id);
        if (!setFieldValue(el, p.get(key))) el.value = defaultValue(el);
    });
    const gods = parseSeed(p.get('gods'));
    const g = gods ? { seed: gods } : null;
    if (g) Object.entries(FAC_GOD_KEYS).forEach(([key, opt]) => { g[opt] = p.get(key) || 'random'; });
    facSetPantheon(g);
    const seed = parseSeed(p.get('seed'));
    if (!seed) return false;
    rollFactionsFor(seed, null);
    const n = parseInt(p.get('faction'), 10);
    if (n >= 1 && n <= facState.data.factions.length) {
        facState.view = n - 1;
        renderFactions();
    }
    return true;
}

// Link the Pantheon tab's gods (rolling a pantheon there first if it has none), or unlink.
function facLinkPantheon(on) {
    if (on) {
        if (!WORLD_TABS.pantheon.rolled()) WORLD_TABS.pantheon.fresh(null);
        facSetPantheon({ seed: panState.seed, ...panOpts() });
    } else {
        facSetPantheon(null);
    }
    renderFactions();
    setUrlParams(facParams(), false);
}

// ── Render ────────────────────────────────────────────────
function facNpcLink(p) {
    const params = new URLSearchParams({ seed: p.seed, profession: p.cat });
    if (p.age) params.set('age', p.age);
    return 'npc-generator.html?' + params.toString();
}

function facPantheonLink(god) {
    const g = facState.gods;
    const params = new URLSearchParams({ tab: 'pantheon', seed: g.seed });
    ['size', 'shape', 'naming'].forEach(k => { if (g[k] !== 'random') params.set(k, g[k]); });
    if (god && god.index) params.set('god', god.index + 1);
    return 'worldbuilder.html?' + params.toString();
}

function facDl(lines) {
    return `<dl class="wb-dl">${lines.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>`;
}

function facRosterHTML(w, ctx) {
    return `<div class="pan-roster">${w.factions.map((f, i) => {
        const t = FAC_TYPES[f.type];
        return `<button type="button" class="pan-god${i === facState.view ? ' on' : ''}" data-fac="${i}" aria-pressed="${i === facState.view}">
            <span class="pan-god-icon" aria-hidden="true">${t.icon}</span>
            <span class="pan-god-name">${esc(facCap(facName(w, i, ctx)))}</span>
            <span class="pan-god-sub">${esc(t.label)} · ${'●'.repeat(f.influence + 1)}${'○'.repeat(4 - f.influence)}</span>
            <span class="pan-god-role">${esc(f.leader.title)} ${esc(f.leader.npc.firstName)}</span>
        </button>`;
    }).join('')}</div>`;
}

// The Families tab (F55), built around this faction's leader, linked back to these factions.
function facFamilyLink(w, i, ctx) {
    const f = w.factions[i], p = facParams();
    return famRootLink(f.leader, {
        title: f.leader.title,
        house: f.type === 'house' ? facCap(facName(w, i, ctx)) : '',
        extra: { facs: facState.seed, fcount: p.count, ffocus: p.focus, fscale: p.scale }
    });
}

function facPeopleLinks(f) {
    const people = [f.leader, ...f.lieutenants];
    return `<p class="pan-links">${people.map(p => `<a class="btn" href="${esc(facNpcLink(p))}">🎭 ${esc(p.npc.firstName)}</a>`).join(' ')}</p>`;
}

function facOneHTML(w, i, ctx) {
    const f = w.factions[i], t = FAC_TYPES[f.type];
    const god = facDeity(f, ctx.pantheon);
    return `<div class="wb-month-head">
            <button type="button" class="btn wb-arrow" data-step="-1" aria-label="Previous faction">◀</button>
            <h4>${t.icon} ${esc(facCap(facName(w, i, ctx)))}<small>${esc(t.label)} · faction ${i + 1} of ${w.factions.length}</small></h4>
            <button type="button" class="btn wb-arrow" data-step="1" aria-label="Next faction">▶</button>
        </div>
        ${facDl(facLines(w, i, ctx))}
        <h5 class="fac-sub">The people around the ${esc(f.leader.title.toLowerCase())}</h5>
        ${facDl(facLieutenantLines(w, i, ctx))}
        ${facPeopleLinks(f)}
        <p class="pan-links"><a class="btn" href="${esc(facFamilyLink(w, i, ctx))}">🌳 ${f.type === 'house' ? "The House's Family Tree" : `${esc(f.leader.npc.firstName)}'s Family Tree`}</a></p>
        ${god && god.linked ? `<p class="pan-links"><a class="btn" href="${esc(facPantheonLink(god))}">⛪ Read about ${esc(god.name)}</a></p>` : ''}`;
}

// Every faction in full, for printing.
function facAllHTML(w, ctx) {
    return w.factions.map((f, i) => `<section class="pan-print-god">
        <h4>${FAC_TYPES[f.type].icon} ${esc(facCap(facName(w, i, ctx)))}</h4>
        ${facDl(facLines(w, i, ctx).concat(facLieutenantLines(w, i, ctx)))}
    </section>`).join('');
}

function facTiesHTML(w, ctx) {
    const row = (t, icon, kind) => `<li>${icon} <b>${esc(facCap(facName(w, t.a, ctx)))} and ${esc(facName(w, t.b, ctx))}</b>: ${esc(facTieText(w, t, ctx, kind))}</li>`;
    return `<ul class="wb-list">${w.rivals.map(r => row(r, '⚔️', 'rival')).join('')}${w.allies.map(a => row(a, '🤝', 'ally')).join('')}</ul>`;
}

function facGodsHTML(w) {
    const followers = w.factions.filter(f => f.deity && !f.deity.outer).length;
    if (facState.pantheon) {
        return `<div class="wb-today">
            <p>⛪ The faithful here follow the gods of ${esc(facState.pantheon.name)}.</p>
            <p class="wb-small">${followers ? `${followers} of these factions ${followers === 1 ? 'follows' : 'follow'} one of its gods.` : 'None of these factions follows a god, but a reroll might.'}</p>
            <button type="button" class="btn" id="fac-unlink">✕ Use made-up gods instead</button>
        </div>`;
    }
    return `<div class="wb-today">
        <p>⛪ The temples here name their gods by title for now.</p>
        <p class="wb-small">Use the Pantheon tab's gods, and every temple, order, and god-fearing faction here follows one of them.</p>
        <button type="button" class="btn" id="fac-link-gods">⛪ Use the Pantheon tab's gods</button>
    </div>`;
}

function renderFactions() {
    const w = facState.data;
    if (!w) return;
    const ctx = facCtx();
    const s = FAC_SCALES[w.scale];
    document.getElementById('fac-card').innerHTML = `
        <header class="wb-head">
            <p class="wb-kicker">${s.icon} ${esc(s.label)} · ${w.factions.length} factions</p>
            <h3 class="wb-name">Who Runs the ${esc(facCap(s.place.replace(/^the /, '')))}</h3>
            <p class="wb-sub">${esc(facSummary(w, ctx))}</p>
        </header>
        ${facGodsHTML(w)}
        <section class="wb-block wb-wide pan-roster-block">
            <h4>🏛️ The factions</h4>
            ${facRosterHTML(w, ctx)}
            <p class="wb-legend">Dots show influence, from ● (a minor player) to ●●●●● (the power behind everything).</p>
        </section>
        <section class="wb-block wb-wide" id="fac-one">
            ${facOneHTML(w, facState.view, ctx)}
        </section>
        <section class="wb-block wb-wide pan-all">
            ${facAllHTML(w, ctx)}
        </section>
        <section class="wb-block wb-wide">
            <h4>⚔️ Rivals and allies</h4>
            ${facTiesHTML(w, ctx)}
        </section>`;
}

function showFaction(i, focusSel) {
    const n = facState.data.factions.length;
    facState.view = (i + n) % n;
    renderFactions();
    setUrlParams(facParams(), false);
    if (focusSel) { const el = document.querySelector(focusSel); if (el) el.focus(); }
}

function printFactions() {
    if (!facState.data) return;
    document.body.classList.add('print-fac');
    window.print();
}

function setupFactions() {
    const count = document.getElementById('fac-count');
    Object.entries(FAC_COUNTS).forEach(([key, c]) => count.add(new Option(c.label, key)));
    const focus = document.getElementById('fac-focus');
    Object.entries(FAC_TYPES).forEach(([key, t]) => focus.add(new Option(`${t.icon} ${t.label}`, key)));
    const scale = document.getElementById('fac-scale');
    Object.entries(FAC_SCALES).forEach(([key, s]) => scale.add(new Option(`${s.icon} ${s.label}`, key)));

    // Same seed: a new option keeps everything it doesn't touch.
    Object.values(FAC_FIELDS).forEach(id => document.getElementById(id).addEventListener('change', () => {
        if (facState.seed) rollFactionsFor(facState.seed, false, true);
    }));
    document.getElementById('fac-roll').addEventListener('click', () => rollFactionsFor());
    document.getElementById('fac-card').addEventListener('click', e => {
        const b = e.target.closest('.pan-god');
        if (b) { showFaction(Number(b.dataset.fac)); document.getElementById('fac-one').scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
        const a = e.target.closest('.wb-arrow');
        if (a) { showFaction(facState.view + Number(a.dataset.step), `#fac-one .wb-arrow[data-step="${a.dataset.step}"]`); return; }
        if (e.target.closest('#fac-link-gods')) { facLinkPantheon(true); return; }
        if (e.target.closest('#fac-unlink')) facLinkPantheon(false);
    });
    document.getElementById('fac-copy').addEventListener('click', () => {
        if (facState.data) copyText(factionsText(facState.data, facCtx()), 'fac-status', 'the factions');
    });
    document.getElementById('fac-print').addEventListener('click', printFactions);
    window.addEventListener('afterprint', () => document.body.classList.remove('print-fac'));
    document.getElementById('fac-link').addEventListener('click', () =>
        copyPageLink(ok => flash('fac-status', ok ? '🔗 Link copied. It opens these same factions.' : '⚠️ Copy blocked by the browser.')));
}

WORLD_TABS.factions = {
    setup: setupFactions,
    params: facParams,
    apply: applyFacUrl,
    fresh: push => rollFactionsFor(newSeed(), push),
    rolled: () => !!facState.seed,
    entry: () => {
        const w = facState.data;
        const ctx = facCtx(), place = facCap(FAC_SCALES[w.scale].place.replace(/^the /, ''));
        return { title: `${place}: ${facCap(facName(w, 0, ctx))} and ${w.factions.length - 1} more`, sub: facSummary(w, ctx) };
    }
};
