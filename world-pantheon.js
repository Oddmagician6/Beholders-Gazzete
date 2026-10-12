/* ============================================
   WORLDBUILDER: PANTHEON TAB (F34)
   A pantheon from pantheon-engine.js (rollPantheon): the pantheon's name, home,
   creation story and afterlife, a roster of gods, one god's full page, and the
   feuds and friendships between them. "Put the holy days on the calendar" links
   this pantheon to the Calendar tab, which then marks every holy day; while the
   two are linked, this tab gives each holy day its date. Nothing is stored.
   URL: ?tab=pantheon&seed=&size=&shape=&naming=&god=<god number>
   ============================================ */

const PAN_FIELDS = { size: 'pan-size', shape: 'pan-shape', naming: 'pan-naming' };

let panState = { seed: null, data: null, god: 0 };

function panOpts() {
    const v = id => document.getElementById(id).value;
    return { size: v('pan-size'), shape: v('pan-shape'), naming: v('pan-naming') };
}

function panParams() {
    const params = {};
    Object.entries(PAN_FIELDS).forEach(([key, id]) => {
        const el = document.getElementById(id);
        params[key] = fieldValue(el) === defaultValue(el) ? null : el.value;
    });
    params.seed = panState.seed;
    params.god = panState.data && panState.god ? panState.god + 1 : null;
    return worldUrlFor('pantheon', params);
}

// The calendar these holy days are on, if the Calendar tab is linked to this exact pantheon.
function panLinkedCalendar() {
    if (typeof calLinkedPantheon !== 'function') return null;
    const g = calLinkedPantheon();
    if (!g || !calState.data) return null;
    const o = panOpts();
    return g.seed === panState.seed && g.size === o.size && g.shape === o.shape && g.naming === o.naming ? calState.data : null;
}

// push: true = new history entry, false = replace, null = leave the URL alone.
// keepGod: stay on the god being read (when an option changes).
function rollPantheonFor(seed = newSeed(), push = true, keepGod = false) {
    const prev = panState.god;
    panState.seed = seed;
    panState.data = rollPantheon(seed, panOpts());
    panState.god = keepGod && prev < panState.data.gods.length ? prev : 0;
    renderPantheon();
    if (push !== null) setUrlParams(panParams(), push);
}

function applyPanUrl(p) {
    Object.entries(PAN_FIELDS).forEach(([key, id]) => {
        const el = document.getElementById(id);
        if (!setFieldValue(el, p.get(key))) el.value = defaultValue(el);
    });
    const seed = parseSeed(p.get('seed'));
    if (!seed) return false;
    rollPantheonFor(seed, null);
    const god = parseInt(p.get('god'), 10);
    if (god >= 1 && god <= panState.data.gods.length) {
        panState.god = god - 1;
        renderPantheon();
    }
    return true;
}

// ── Render ────────────────────────────────────────────────
function panPriestLink(p, i) {
    const params = new URLSearchParams({ seed: deriveSeed(p.seed, 'priest.' + i), profession: 'religious' });
    return 'npc-generator.html?' + params.toString();
}

function panRosterHTML(p) {
    return `<div class="pan-roster">${p.gods.map((g, i) => {
        const d = PAN_DOMAINS[g.domain];
        return `<button type="button" class="pan-god${i === panState.god ? ' on' : ''}" data-god="${i}" aria-pressed="${i === panState.god}">
            <span class="pan-god-icon" aria-hidden="true">${d.icon}</span>
            <span class="pan-god-name">${esc(panCap(g.name))}</span>
            <span class="pan-god-sub">${esc(d.label)} · ${esc(g.alignment)}${i === p.leader && p.shape !== 'many' ? ' · 👑' : ''}</span>
            <span class="pan-god-role">${esc(g.role)}</span>
        </button>`;
    }).join('')}</div>`;
}

function panGodHTML(p, i, cal) {
    const g = p.gods[i], d = PAN_DOMAINS[g.domain];
    return `<div class="wb-month-head">
            <button type="button" class="btn wb-arrow" data-step="-1" aria-label="Previous god">◀</button>
            <h4>${d.icon} ${esc(panCap(g.name))}<small>${esc(panCap(g.epithet))} · god ${i + 1} of ${p.gods.length}</small></h4>
            <button type="button" class="btn wb-arrow" data-step="1" aria-label="Next god">▶</button>
        </div>
        <dl class="wb-dl">${panGodLines(p, i, cal).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
        <p class="pan-links"><a class="btn" href="${esc(panPriestLink(p, i))}">🎭 Meet one of the ${esc(g.priests.replace(/^the /, ''))}</a></p>`;
}

// Every god in full, for printing.
function panAllHTML(p, cal) {
    return p.gods.map((g, i) => `<section class="pan-print-god">
        <h4>${PAN_DOMAINS[g.domain].icon} ${esc(panCap(panTitleLine(g)))}</h4>
        <dl class="wb-dl">${panGodLines(p, i, cal).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
    </section>`).join('');
}

function panTiesHTML(p) {
    const row = (t, icon) => `<li>${icon} <b>${esc(panCap(p.gods[t.a].name))} and ${esc(p.gods[t.b].name)}</b>: ${esc(t.why)} ${esc(t.effect)}</li>`;
    return `<ul class="wb-list">${p.feuds.map(f => row(f, '⚔️')).join('')}${p.bonds.map(b => row(b, '🤝')).join('')}</ul>`;
}

function panCalendarHTML(p, cal) {
    if (cal) {
        return `<div class="wb-today">
            <p>📅 These holy days are on the calendar: ${esc(calCap(cal.era.name))}, year ${cal.year.toLocaleString('en-US')} ${esc(cal.era.abbr)}.</p>
            <p class="wb-small">Each god's holy day below shows its date this year.</p>
            <button type="button" class="btn" id="pan-to-cal">📅 Open the calendar</button>
        </div>`;
    }
    return `<div class="wb-today">
        <p>📅 Holy days follow the seasons, so they fit any calendar.</p>
        <p class="wb-small">Put them on the Calendar tab to see the dates, marked in the month view.</p>
        <button type="button" class="btn" id="pan-to-cal">📅 Put the holy days on the calendar</button>
    </div>`;
}

function renderPantheon() {
    const p = panState.data;
    if (!p) return;
    const sh = PAN_SHAPES[p.shape], nm = PAN_NAMING[p.naming];
    const cal = panLinkedCalendar();
    document.getElementById('pan-card').innerHTML = `
        <header class="wb-head">
            <p class="wb-kicker">${sh.icon} ${esc(sh.label)} · ${p.gods.length} gods · ${nm.icon} ${esc(nm.label.toLowerCase())} names</p>
            <h3 class="wb-name">${esc(panCap(p.name))}</h3>
            <p class="wb-sub">${esc(panSummary(p))}</p>
            <p class="wb-note">${esc(sh.about)}</p>
        </header>
        ${panCalendarHTML(p, cal)}
        <div class="wb-grid">
            <section class="wb-block">
                <h4>🌌 In the beginning</h4>
                <p>${esc(p.creation)}</p>
                <p><b>Where they live:</b> ${esc(panCap(p.home))}.</p>
            </section>
            <section class="wb-block">
                <h4>⚰️ Death and the gods</h4>
                <p>${esc(p.afterlife)}</p>
                <p>${esc(p.walks)}</p>
            </section>
        </div>
        <section class="wb-block wb-wide pan-roster-block">
            <h4>⛪ The gods</h4>
            ${panRosterHTML(p)}
        </section>
        <section class="wb-block wb-wide" id="pan-god">
            ${panGodHTML(p, panState.god, cal)}
        </section>
        <section class="wb-block wb-wide pan-all">
            ${panAllHTML(p, cal)}
        </section>
        <section class="wb-block wb-wide">
            <h4>⚔️ Feuds and friendships</h4>
            ${panTiesHTML(p)}
        </section>`;
}

function showPanGod(i, focusSel) {
    const n = panState.data.gods.length;
    panState.god = (i + n) % n;
    renderPantheon();
    setUrlParams(panParams(), false);
    if (focusSel) { const el = document.querySelector(focusSel); if (el) el.focus(); }
}

function printPantheon() {
    if (!panState.data) return;
    document.body.classList.add('print-pan');
    window.print();
}

function setupPantheon() {
    const size = document.getElementById('pan-size');
    Object.entries(PAN_SIZES).forEach(([key, s]) => size.add(new Option(s.label, key)));
    const shape = document.getElementById('pan-shape');
    Object.entries(PAN_SHAPES).forEach(([key, s]) => shape.add(new Option(`${s.icon} ${s.label}`, key)));
    const naming = document.getElementById('pan-naming');
    Object.entries(PAN_NAMING).forEach(([key, s]) => naming.add(new Option(`${s.icon} ${s.label}`, key)));

    // Same seed: a new option keeps everything it doesn't touch.
    Object.values(PAN_FIELDS).forEach(id => document.getElementById(id).addEventListener('change', () => {
        if (panState.seed) rollPantheonFor(panState.seed, false, true);
    }));
    document.getElementById('pan-roll').addEventListener('click', () => rollPantheonFor());
    document.getElementById('pan-card').addEventListener('click', e => {
        const g = e.target.closest('.pan-god');
        if (g) { showPanGod(Number(g.dataset.god)); document.getElementById('pan-god').scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
        const a = e.target.closest('.wb-arrow');
        if (a) { showPanGod(panState.god + Number(a.dataset.step), `#pan-god .wb-arrow[data-step="${a.dataset.step}"]`); return; }
        if (e.target.closest('#pan-to-cal')) {
            calLinkPantheon({ seed: panState.seed, ...panOpts() });
            switchWorldTab('calendar');
            window.scrollTo({ top: document.querySelector('.tool-tabs').offsetTop - 20, behavior: 'smooth' });
        }
    });
    document.getElementById('pan-copy').addEventListener('click', () => {
        if (panState.data) copyText(pantheonText(panState.data, panLinkedCalendar()), 'pan-status', 'the pantheon');
    });
    document.getElementById('pan-print').addEventListener('click', printPantheon);
    window.addEventListener('afterprint', () => document.body.classList.remove('print-pan'));
    document.getElementById('pan-link').addEventListener('click', () =>
        copyPageLink(ok => flash('pan-status', ok ? '🔗 Link copied. It opens this same pantheon.' : '⚠️ Copy blocked by the browser.')));
}

WORLD_TABS.pantheon = {
    setup: setupPantheon,
    params: panParams,
    apply: applyPanUrl,
    fresh: push => rollPantheonFor(newSeed(), push),
    rolled: () => !!panState.seed,
    entry: () => ({ title: panCap(panState.data.name), sub: panSummary(panState.data) }),
    // The Calendar tab calls this when its link changes, so the dates here stay right.
    refresh: () => renderPantheon()
};
