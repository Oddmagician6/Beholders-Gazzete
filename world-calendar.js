/* ============================================
   WORLDBUILDER: CALENDAR TAB (F33)
   A world calendar from calendar-engine.js (rollCalendar): the reckoning, today's date,
   the week, the seasons, the moons, every month with its festival, and a month view
   with moon phases and festival days. Nothing is stored: the URL holds the calendar.
   A pantheon from the Pantheon tab can be linked (gods=<its seed> plus its options),
   and then every god's holy day is listed and marked in the month view.
   URL: ?seed=&style=&months=&week=&moons=&climate=&view=<month number>&gods=&gsize=&gshape=&gnaming=&gworld=
   ============================================ */

const CAL_FIELDS = { style: 'cal-style', months: 'cal-months', week: 'cal-week', moons: 'cal-moons', climate: 'cal-climate' };

// The linked pantheon's URL keys → its option names.
const CAL_GOD_KEYS = { gsize: 'size', gshape: 'shape', gnaming: 'naming', gworld: 'world' };

let calState = { seed: null, data: null, view: 0, gods: null, pantheon: null };

// The pantheon these holy days come from: { seed, size, shape, naming }, or null.
function calLinkedPantheon() {
    return calState.gods;
}

function calSetPantheon(g) {
    calState.gods = g;
    calState.pantheon = g ? rollPantheon(g.seed, g) : null;
}

// Link a pantheon (or null to unlink) and redraw both tabs.
function calLinkPantheon(g) {
    calSetPantheon(g);
    if (calState.data) {
        renderCalendar();
        if (currentWorldTab() === 'calendar') setUrlParams(calParams(), false);
    }
    if (WORLD_TABS.pantheon && WORLD_TABS.pantheon.rolled()) WORLD_TABS.pantheon.refresh();
}

function calOpts() {
    const v = id => document.getElementById(id).value;
    return { style: v('cal-style'), months: v('cal-months'), week: v('cal-week'), moons: v('cal-moons'), climate: v('cal-climate') };
}

function calParams() {
    const params = {};
    Object.entries(CAL_FIELDS).forEach(([key, id]) => {
        const el = document.getElementById(id);
        params[key] = fieldValue(el) === defaultValue(el) ? null : el.value;
    });
    params.seed = calState.seed;
    const c = calState.data;
    params.view = c && calState.view !== c.today.month ? calState.view + 1 : null;
    const g = calState.gods;
    params.gods = g ? g.seed : null;
    Object.entries(CAL_GOD_KEYS).forEach(([key, opt]) => { params[key] = g && g[opt] && g[opt] !== 'random' ? g[opt] : null; });
    return worldUrlFor('calendar', params);
}

// push: true = new history entry, false = replace, null = leave the URL alone.
// keepView: stay on the month being viewed (when an option changes).
function rollCalendarFor(seed = newSeed(), push = true, keepView = false) {
    const prev = calState.view;
    calState.seed = seed;
    calState.data = rollCalendar(seed, calOpts());
    const n = calState.data.months.length;
    calState.view = keepView && prev < n ? prev : calState.data.today.month;
    renderCalendar();
    if (push !== null) setUrlParams(calParams(), push);
    // A linked pantheon shows this calendar's dates for its holy days (and drops them once unlinked).
    if (WORLD_TABS.pantheon && WORLD_TABS.pantheon.rolled()) WORLD_TABS.pantheon.refresh();
}

function applyCalUrl(p) {
    Object.entries(CAL_FIELDS).forEach(([key, id]) => {
        const el = document.getElementById(id);
        if (!setFieldValue(el, p.get(key))) el.value = defaultValue(el);
    });
    const gods = parseSeed(p.get('gods'));
    const g = gods ? { seed: gods } : null;
    if (g) Object.entries(CAL_GOD_KEYS).forEach(([key, opt]) => { g[opt] = p.get(key) || 'random'; });
    calSetPantheon(g);
    const seed = parseSeed(p.get('seed'));
    if (!seed) return false;
    rollCalendarFor(seed, null);
    const view = parseInt(p.get('view'), 10);
    if (view >= 1 && view <= calState.data.months.length) {
        calState.view = view - 1;
        renderCalendar();
    }
    return true;
}

// ── Holy days ─────────────────────────────────────────────
// The linked pantheon's holy days this year, in date order: [{ i, god, month, day }].
function calHolyDays(c) {
    const p = calState.pantheon;
    if (!p) return [];
    return p.gods.map((god, i) => ({ i, god, ...(panHolyDate(god, c) || {}) }))
        .filter(h => h.month !== undefined)
        .sort((a, b) => a.month - b.month || a.day - b.day);
}

function calHolyText(c) {
    const holy = calHolyDays(c);
    if (!holy.length) return '';
    const out = ['', '', `Holy days (${calCap(calState.pantheon.name)}):`];
    holy.forEach(h => out.push(`- The ${calOrdinal(h.day)} of ${c.months[h.month].name}: ${calCap(h.god.holyName)}, for ${h.god.name} (${panHolyWhen(h.god.holy)}). ${h.god.rite}`));
    return out.join('\n');
}

function calPantheonLink() {
    const g = calState.gods;
    const params = new URLSearchParams({ tab: 'pantheon', seed: g.seed });
    ['size', 'shape', 'naming', 'world'].forEach(k => { if (g[k] && g[k] !== 'random') params.set(k, g[k]); });
    return 'worldbuilder?' + params.toString();
}

function calHolyHTML(c) {
    const holy = calHolyDays(c);
    return `<section class="wb-block wb-wide">
        <h4>⛪ Holy days of ${esc(calState.pantheon.name)}</h4>
        <ul class="wb-list">${holy.map(h => `<li><b>${esc(calCap(h.god.holyName))}</b> <span class="wb-tag">${PAN_DOMAINS[h.god.domain].icon} ${esc(h.god.name)}</span><br>The ${calOrdinal(h.day)} of ${esc(c.months[h.month].name)}: ${esc(panHolyWhen(h.god.holy))}.</li>`).join('')}</ul>
        <p class="wb-holy-actions"><a class="btn" href="${esc(calPantheonLink())}">⛪ Open the pantheon</a> <button type="button" class="btn" id="cal-unlink">✕ Take the holy days off</button></p>
    </section>`;
}

// ── Render ────────────────────────────────────────────────
function calTravelLink(c) {
    const season = c.months[c.today.month].season;
    const params = new URLSearchParams({ tab: 'travel', climate: c.climate, season });
    return 'toolbox?' + params.toString();
}

function calWeekHTML(c) {
    return `<ul class="wb-list">${c.week.names.map((n, i) => `
        <li><b>${esc(n)}</b>${i === c.week.rest ? '<span class="wb-tag">day of rest</span>' : ''}${i === c.week.market ? '<span class="wb-tag">market day</span>' : ''}</li>`).join('')}
    </ul>`;
}

function calSeasonsHTML(c) {
    return `<ul class="wb-list">${calSeasonSpans(c).map(s => {
        const range = s.from === s.to ? c.months[s.from].name : `${c.months[s.from].name} to ${c.months[s.to].name}`;
        return `<li><b>${TRAVEL_SEASONS[s.season].icon} ${esc(calSeasonLabel(c, s.season))}</b>: ${esc(range)}.<br>${esc(s.note)}</li>`;
    }).join('')}</ul>`;
}

function calMoonsHTML(c) {
    const t = c.today, abs = calAbsDay(c, t.year, t.month, t.day);
    const conj = calConjunctions(c);
    return `<div class="wb-moons">${c.moons.map(mo => {
        const ph = MOON_PHASES[calMoonPhase(mo, abs)];
        const every = mo.cycle === 29.5 ? 'Full every 29 or 30 days; each month begins at its new moon.' : `Full every ${mo.cycle} days.`;
        return `<div class="wb-moon">
            <div class="wb-moon-name">${moonArtHtml(calMoonPhase(mo, abs))} ${esc(mo.name)} <small>${esc(mo.epithet)}</small></div>
            <p class="wb-small">${esc(calCap(mo.color))}, ${esc(mo.size)}. ${every} Tonight: ${esc(ph.label.toLowerCase())}.</p>
            <p>${esc(mo.lore)}</p>
            <p><b>When it's full:</b> ${esc(mo.full)}</p>
        </div>`;
    }).join('')}</div>
    ${conj.length ? `<p class="wb-small">Full together this year: ${conj.map(x => `the ${calOrdinal(x.day)} of ${esc(c.months[x.month].name)} (${x.moons.map(esc).join(' and ')})`).join('; ')}.</p>` : ''}`;
}

function calMonthsHTML(c) {
    const rows = [];
    c.months.forEach((m, i) => {
        const f = calFestivalLines(c, i);
        rows.push(`<tr class="${i === calState.view ? 'on' : ''}">
            <td class="num">${i + 1}</td>
            <td><button type="button" class="wb-mbtn" data-month="${i}">${esc(calMonthLabel(m))}</button><span class="wb-nick">${esc(m.nickname)}</span></td>
            <td>${m.days}</td>
            <td class="season">${TRAVEL_SEASONS[m.season].icon} ${esc(TRAVEL_SEASONS[m.season].label)}</td>
            <td>${f.icon} ${esc(f.name)} <span class="wb-nick">the ${calOrdinal(m.festival.day)}${m.festival.length > 1 ? `, ${m.festival.length} days` : ''}</span></td>
        </tr>`);
        if (c.gap && c.gap.after === i) {
            rows.push(`<tr class="wb-gaprow"><td class="num">·</td><td colspan="4">${esc(calCap(c.gap.name))}: ${c.gap.days} day${c.gap.days === 1 ? '' : 's'} outside the months</td></tr>`);
        }
    });
    return `<table class="wb-months">
        <thead><tr><th></th><th>Month</th><th>Days</th><th class="season">Season</th><th>Festival</th></tr></thead>
        <tbody>${rows.join('')}</tbody>
    </table>`;
}

function calMonthViewHTML(c) {
    const i = calState.view, m = c.months[i], f = m.festival, w = c.week.names.length;
    const fl = calFestivalLines(c, i);
    const holy = calHolyDays(c).filter(h => h.month === i);
    const first = calWeekday(c, c.year, i, 1);
    const cells = [];
    for (let k = 0; k < first; k++) cells.push('<div class="wb-pad" aria-hidden="true"></div>');
    for (let d = 1; d <= m.days; d++) {
        const abs = calAbsDay(c, c.year, i, d);
        const wd = calWeekday(c, c.year, i, d);
        const cls = ['wb-day'];
        if (wd === c.week.rest) cls.push('rest');
        const fest = d >= f.day && d < f.day + f.length;
        if (fest) cls.push('fest');
        if (i === c.today.month && d === c.today.day) cls.push('today');
        // The first moon's main phases on the day they begin; other moons only when they turn full.
        let ph = '';
        if (c.moons[0]) {
            const p = calMoonPhase(c.moons[0], abs);
            if (p % 2 === 0 && calMoonPhase(c.moons[0], abs - 1) !== p) ph = `<span class="ph" title="${esc(c.moons[0].name)}: ${esc(MOON_PHASES[p].label)}">${moonArtHtml(p)}</span>`;
        }
        const others = c.moons.slice(1).filter(mo => calMoonPhase(mo, abs) === 4 && calMoonPhase(mo, abs - 1) !== 4);
        const holyHere = holy.filter(h => h.day === d);
        if (holyHere.length) cls.push('holy');
        const title = [fest ? fl.name : '', ...holyHere.map(h => `${calCap(h.god.holyName)} (${h.god.name})`), ...others.map(mo => `${mo.name} full`)].filter(Boolean).join('; ');
        const marks = (fest ? fl.icon : '') + (holyHere.length ? '✨' : '');
        cells.push(`<div class="${cls.join(' ')}"${title ? ` title="${esc(title)}"` : ''}><b>${d}</b>${ph}${marks ? `<span class="fi" aria-label="${esc(title)}">${marks}</span>` : ''}${holyHere.map(h => `<span class="mo">✨ ${esc(h.god.name)}</span>`).join('')}${others.map(mo => `<span class="mo">🌕 ${esc(mo.name)}</span>`).join('')}</div>`);
    }
    const heads = c.week.names.map((n, k) => `<div class="wb-wd${k === c.week.rest ? ' rest' : ''}" title="${esc(n)}">${esc(n.slice(0, 3))}</div>`).join('');
    const gap = c.gap && c.gap.after === i
        ? `<p class="wb-gapline"><b>Then ${esc(c.gap.name)}</b>: ${c.gap.days} day${c.gap.days === 1 ? '' : 's'} that belong${c.gap.days === 1 ? 's' : ''} to no month and no week. ${esc(c.gap.custom)}</p>` : '';
    return `<img class="wb-season-art" src="img/calendar/${m.season}.webp" alt="" width="1600" height="400" decoding="async">
        <div class="wb-month-head">
            <button type="button" class="btn wb-arrow" data-step="-1" aria-label="Previous month">◀</button>
            <h4>${esc(calMonthLabel(m))}<small>${esc(m.nickname)} · ${m.days} days · ${TRAVEL_SEASONS[m.season].icon} ${esc(calSeasonLabel(c, m.season))} · month ${i + 1} of ${c.months.length}</small></h4>
            <button type="button" class="btn wb-arrow" data-step="1" aria-label="Next month">▶</button>
        </div>
        <div class="wb-days" style="grid-template-columns: repeat(${w}, minmax(0, 1fr));">${heads}${cells.join('')}</div>
        <p class="wb-legend">${c.moons[0] ? `Moon icons: ${esc(c.moons[0].name)}'s new, quarter, and full moons. ` : ''}${fl.icon} festival days.${calState.pantheon ? ' ✨ holy days.' : ''} The outlined day is today.</p>
        ${gap}
        <section class="wb-fest">
            <h4>${fl.icon} ${esc(fl.name)}</h4>
            <dl class="wb-dl">${fl.lines.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
        </section>
        ${holy.map(h => `<section class="wb-fest">
            <h4>✨ ${esc(calCap(h.god.holyName))}</h4>
            <dl class="wb-dl">
                <div><dt>When</dt><dd>The ${calOrdinal(h.day)} of ${esc(m.name)}: ${esc(panHolyWhen(h.god.holy))}</dd></div>
                <div><dt>Whose</dt><dd>${esc(calCap(h.god.name))}, ${esc(h.god.epithet)} (${esc(PAN_DOMAINS[h.god.domain].label)})</dd></div>
                <div><dt>What happens</dt><dd>${esc(h.god.rite)}</dd></div>
            </dl>
        </section>`).join('')}`;
}

function renderCalendar() {
    const c = calState.data;
    if (!c) return;
    const st = CAL_STYLES[c.style];
    const today = calTodayLines(c);
    document.getElementById('cal-card').innerHTML = `
        <header class="wb-head">
            <p class="wb-kicker">${st.icon} ${esc(st.label)} · ${c.months.length} months · ${c.week.names.length}-day week · ${c.moons.length} moon${c.moons.length === 1 ? '' : 's'} · ${calYearDays(c)} days a year</p>
            <h3 class="wb-name">${esc(calCap(c.era.name))}</h3>
            <p class="wb-sub">Year ${c.year.toLocaleString('en-US')} ${esc(c.era.abbr)}, ${esc(c.yearName)}</p>
            <p class="wb-note">${esc(c.era.note)} ${esc(CAL_STARTS[c.start].text)}</p>
        </header>
        <div class="wb-today">
            ${today.map(t => `<p>${esc(t)}</p>`).join('')}
            ${ruleLinkOk(calTravelLink(c)) ? `<a class="btn" href="${esc(calTravelLink(c))}">🗺️ Travel in this season</a>` : ''}
        </div>
        <div class="wb-grid">
            <section class="wb-block">
                <h4>📆 The week</h4>
                ${calWeekHTML(c)}
                <p class="wb-small">${esc(st.about)}</p>
            </section>
            <section class="wb-block">
                <h4>🌦️ The seasons</h4>
                ${calSeasonsHTML(c)}
            </section>
        </div>
        <section class="wb-block wb-wide">
            <h4>${c.moons.length === 1 ? '🌙 The moon' : '🌙 The moons'}</h4>
            ${calMoonsHTML(c)}
        </section>
        ${calState.pantheon ? calHolyHTML(c) : ''}
        <section class="wb-block wb-wide">
            <h4>🗓️ The months</h4>
            ${calMonthsHTML(c)}
        </section>
        <section class="wb-block wb-wide" id="cal-month">
            ${calMonthViewHTML(c)}
        </section>`;
}

function showCalMonth(i, focusSel) {
    const n = calState.data.months.length;
    calState.view = (i + n) % n;
    renderCalendar();
    setUrlParams(calParams(), false);
    if (focusSel) { const el = document.querySelector(focusSel); if (el) el.focus(); }
}

function printCalendar() {
    if (!calState.data) return;
    document.body.classList.add('print-cal');
    window.print();
}

function setupCalendar() {
    const style = document.getElementById('cal-style');
    Object.entries(CAL_STYLES).forEach(([key, s]) => style.add(new Option(`${s.icon} ${s.label}`, key)));
    const months = document.getElementById('cal-months');
    [10, 11, 12, 13].forEach(n => months.add(new Option(`${n} months`, n)));
    const week = document.getElementById('cal-week');
    for (let n = 5; n <= 10; n++) week.add(new Option(`${n}-day week`, n));
    const moons = document.getElementById('cal-moons');
    [1, 2, 3].forEach(n => moons.add(new Option(n === 1 ? '1 moon' : `${n} moons`, n)));
    const climate = document.getElementById('cal-climate');
    Object.entries(TRAVEL_CLIMATES).forEach(([key, cl]) =>
        climate.add(new Option(`${cl.icon} ${cl.label}`, key, key === 'temperate', key === 'temperate')));

    // Same seed: a new option keeps everything it doesn't touch.
    Object.values(CAL_FIELDS).forEach(id => document.getElementById(id).addEventListener('change', () => {
        if (calState.seed) rollCalendarFor(calState.seed, false, true);
    }));
    document.getElementById('cal-roll').addEventListener('click', () => rollCalendarFor());
    document.getElementById('cal-card').addEventListener('click', e => {
        const m = e.target.closest('.wb-mbtn');
        if (m) { showCalMonth(Number(m.dataset.month)); document.getElementById('cal-month').scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
        const a = e.target.closest('.wb-arrow');
        if (a) { showCalMonth(calState.view + Number(a.dataset.step), `#cal-month .wb-arrow[data-step="${a.dataset.step}"]`); return; }
        if (e.target.closest('#cal-unlink')) {
            calLinkPantheon(null);
            flash('cal-status', 'The holy days are off the calendar.');
        }
    });
    document.getElementById('cal-copy').addEventListener('click', () => {
        if (calState.data) copyText(calendarText(calState.data) + calHolyText(calState.data), 'cal-status', 'the calendar');
    });
    document.getElementById('cal-print').addEventListener('click', printCalendar);
    window.addEventListener('afterprint', () => document.body.classList.remove('print-cal'));
    document.getElementById('cal-link').addEventListener('click', () =>
        copyPageLink(ok => flash('cal-status', ok ? '🔗 Link copied. It opens this same calendar.' : '⚠️ Copy blocked by the browser.')));
}

WORLD_TABS.calendar = {
    setup: setupCalendar,
    params: calParams,
    apply: applyCalUrl,
    fresh: push => rollCalendarFor(newSeed(), push),
    rolled: () => !!calState.seed,
    // How the Notebook files this roll.
    entry: () => {
        const c = calState.data;
        return { title: calCap(c.era.name), sub: `Year ${c.year.toLocaleString('en-US')} ${c.era.abbr}, ${c.yearName}. ${c.months.length} months, ${c.moons.length} moon${c.moons.length === 1 ? '' : 's'}.` };
    }
};
