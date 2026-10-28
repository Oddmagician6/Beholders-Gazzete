/* ============================================
   DM TOOLBOX: DOWNTIME TAB (F28)
   Each character's lifestyle and downtime activity for a stretch of weeks and days,
   worked out by downtime-engine.js (downtimeFor). The party is remembered in
   localStorage (gazette-downtime) and also lives in the URL, so a link shares it.
   URL: ?tab=down&wk=<weeks>&d=<days>&c=<life~act~val~done~help~work~name>&c=…&ev=0&seed=
   (seed whenever anything rolls: lodging, settings, and the weekly log, or carousing
   and gambling; ev=0 turns the week-by-week extras off). For gambling, the work slot
   holds the game.
   With nothing saved and no party in the URL, the characters are the Party tab's (party.js).
   ============================================ */

const DOWNTIME_KEY = ruleKey('gazette-downtime');
const DOWNTIME_MAX_CHARS = 8;
const DT_VALUE_MAX = 1000000;

let dt = { seed: null, events: true, chars: [], results: [] };

// What the shared value and done fields mean for each activity that uses them.
const DT_FIELD_TEXT = {
    craft:  { val: ["Item's value (gp)", 'e.g. 50'], done: ['Done so far (gp)', '0'] },
    train:  { val: ['Days needed', 'e.g. 100'], done: ['Days done so far', '0'] },
    gamble: { val: ['Stake per week (gp)', 'e.g. 10'], done: ['Check bonus', '0'] }
};

function dtBlankChar() {
    return { name: '', life: 'modest', act: 'none', val: '', done: '', help: '0', work: 'trade' };
}

function dtNum(v, max) {
    const n = Math.round((Number(v) || 0) * 100) / 100;
    return Math.min(max, Math.max(0, n));
}

// A character as stored and shared: unknown keys fall back to the defaults.
function dtClean(c) {
    const b = dtBlankChar();
    return {
        name: String(c.name || '').slice(0, 40),
        life: DOWNTIME_LIFESTYLES[c.life] ? c.life : b.life,
        act: DOWNTIME_ACTIVITIES[c.act] ? c.act : b.act,
        val: c.val === '' || c.val === undefined ? '' : String(dtNum(c.val, DT_VALUE_MAX)),
        done: c.done === '' || c.done === undefined ? '' : String(dtNum(c.done, DT_VALUE_MAX)),
        help: String(Math.min(DOWNTIME_MAX_CHARS - 1, Math.floor(dtNum(c.help, 99)))),
        work: DOWNTIME_WORK[c.work] || DOWNTIME_GAMES[c.work] ? c.work : b.work
    };
}

function dtEncode(c) {
    return [c.life, c.act, c.val, c.done, c.help === '0' ? '' : c.help, c.work === 'trade' ? '' : c.work, c.name].join('~');
}

function dtDecode(s) {
    const p = String(s).split('~');
    return dtClean({ life: p[0], act: p[1], val: p[2] || '', done: p[3] || '', help: p[4] || '0', work: p[5] || 'trade', name: p.slice(6).join('~') });
}

// Anything on the page that comes from the seed.
function dtRolls() {
    return dt.events || dt.chars.some(c => c.act === 'carouse' || c.act === 'gamble');
}

function dtDays() {
    return downtimeDays(document.getElementById('dt-weeks').value, document.getElementById('dt-days').value);
}

function downParams() {
    const wk = document.getElementById('dt-weeks'), d = document.getElementById('dt-days');
    return urlFor('down', {
        wk: wk.value.trim() !== '' && wk.value !== defaultValue(wk) ? wk.value.trim() : null,
        d: d.value.trim() !== '' && d.value !== defaultValue(d) ? d.value.trim() : null,
        c: dt.chars.map(dtEncode),
        ev: dt.events ? null : '0',
        seed: dtRolls() ? dt.seed : null
    });
}

// ── Storage ───────────────────────────────────────────────
function saveDowntime() {
    try {
        localStorage.setItem(DOWNTIME_KEY, JSON.stringify({
            weeks: document.getElementById('dt-weeks').value, days: document.getElementById('dt-days').value,
            chars: dt.chars, seed: dt.seed, events: dt.events
        }));
    } catch (e) {}
}

function loadDowntime() {
    try {
        const s = JSON.parse(localStorage.getItem(DOWNTIME_KEY));
        if (s && Array.isArray(s.chars) && s.chars.length) return s;
    } catch (e) {}
    return null;
}

// ── Rows ──────────────────────────────────────────────────
function dtOptions(table, selected, label) {
    return Object.entries(table).map(([k, t]) =>
        `<option value="${k}"${k === selected ? ' selected' : ''}>${esc(label ? label(k, t) : `${t.icon ? t.icon + ' ' : ''}${t.label}`)}</option>`).join('');
}

function lifeLabel(k, t) {
    const day = k === 'wretched' ? 'free' : `${formatCoins(t.gp)}${k === 'aristocratic' ? '+' : ''} a day, ${formatCoins(t.gp * 7)}${k === 'aristocratic' ? '+' : ''} a week`;
    return `${t.icon} ${t.label} (${day})`;
}

function buildDowntimeRows() {
    document.getElementById('dt-chars').innerHTML = dt.chars.map((c, i) => `
        <div class="dt-char" data-i="${i}">
            <div class="dt-fields">
                <label class="dt-f-name">Character <input type="text" class="dt-name" maxlength="40" autocomplete="off" placeholder="Character ${i + 1}" value="${esc(c.name)}"></label>
                <label>Lifestyle <select class="dt-life">${dtOptions(DOWNTIME_LIFESTYLES, c.life, lifeLabel)}</select></label>
                <label>Activity <select class="dt-act">${dtOptions(DOWNTIME_ACTIVITIES, c.act)}</select></label>
                <label class="dt-only" data-for="craft train gamble"><span class="dt-l-val">Item's value (gp)</span> <input type="number" class="dt-val" min="0" max="${DT_VALUE_MAX}" step="0.01" inputmode="decimal" placeholder="e.g. 50" value="${esc(c.val)}"></label>
                <label class="dt-only" data-for="craft train gamble"><span class="dt-l-done">Done so far (gp)</span> <input type="number" class="dt-done" min="0" max="${DT_VALUE_MAX}" step="0.01" inputmode="decimal" placeholder="0" value="${esc(c.done)}"></label>
                <label class="dt-only" data-for="craft">Helpers <input type="number" class="dt-help" min="0" max="${DOWNTIME_MAX_CHARS - 1}" step="1" inputmode="numeric" value="${esc(c.help)}"></label>
                <label class="dt-only dt-f-wide" data-for="work">Work <select class="dt-work">${dtOptions(DOWNTIME_WORK, c.work)}</select></label>
                <label class="dt-only" data-for="gamble">Game <select class="dt-game">${dtOptions(DOWNTIME_GAMES, c.work, (k, g) => `${g.label} (DC ${g.dc})`)}</select></label>
            </div>
            <button type="button" class="dt-remove" aria-label="Remove this character" title="Remove"${dt.chars.length === 1 ? ' hidden' : ''}>✕</button>
            <div class="dt-res" aria-live="polite"></div>
        </div>`).join('');
    document.getElementById('dt-add').disabled = dt.chars.length >= DOWNTIME_MAX_CHARS;
}

function readDowntimeRows() {
    dt.chars = [...document.querySelectorAll('#dt-chars .dt-char')].map(row => {
        const v = cls => row.querySelector('.' + cls).value;
        const act = v('dt-act');
        return dtClean({ name: v('dt-name').trim(), life: v('dt-life'), act, val: v('dt-val'), done: v('dt-done'), help: v('dt-help'), work: v(act === 'gamble' ? 'dt-game' : 'dt-work') });
    });
}

// ── Results ───────────────────────────────────────────────
const DT_SRC = { SRD: ['SRD', ' srd'], ruling: ['ruling', ''], house: ['house rule', ' house'] };

function renderDowntimeResults() {
    const days = dtDays();
    const rows = document.querySelectorAll('#dt-chars .dt-char');
    let party = 0;
    dt.results.forEach((r, i) => {
        const c = dt.chars[i], row = rows[i];
        party += r.totalGp;
        row.querySelectorAll('.dt-only').forEach(el => { el.hidden = !el.dataset.for.split(' ').includes(c.act); });
        const ft = DT_FIELD_TEXT[c.act];
        if (ft) {
            row.querySelector('.dt-l-val').textContent = ft.val[0];
            row.querySelector('.dt-val').placeholder = ft.val[1];
            row.querySelector('.dt-l-done').textContent = ft.done[0];
            row.querySelector('.dt-done').placeholder = ft.done[1];
        }
        const extraName = { craft: 'materials', research: 'research', carouse: 'carousing', train: 'tutor', gamble: 'losses' }[c.act] || 'extras';
        const parts = [`living ${formatCoins(r.lifeGp)}`];
        if (r.extraGp) parts.push(`${extraName} ${formatCoins(r.extraGp)}`);
        if (r.winGp) parts.push(`winnings −${formatCoins(r.winGp)}`);
        const bar = (pct, label) => `<div class="dt-bar" role="progressbar" aria-label="${label}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><span style="width:${pct}%"></span></div>`;
        const weeks = r.weeks || [];
        row.querySelector('.dt-res').innerHTML = `
            <div class="dt-cost"><b>${esc(downtimeMoney(r.totalGp))}</b><span>for ${days} day${days === 1 ? '' : 's'}${r.extraGp || r.winGp ? ` (${esc(parts.join(' + '))})` : ''}</span></div>
            ${r.craft && r.craft.value ? bar(Math.round((r.craft.done + r.craft.made) / r.craft.value * 100), 'Crafting progress') : ''}
            ${r.train && r.train.need ? bar(Math.round((r.train.had + r.train.used) / r.train.need * 100), 'Training progress') : ''}
            ${downtimeSceneLines(r).length ? `<dl class="dt-scene">${downtimeSceneLines(r).map(([label, text]) => `<div><dt>${esc(label)}</dt><dd>${esc(text)}</dd></div>`).join('')}</dl>` : ''}
            ${r.lines.length ? `<ul class="dt-lines">${r.lines.map(l => `<li>${esc(l.text)}<span class="fx-src${DT_SRC[l.src][1]}">${DT_SRC[l.src][0]}</span></li>`).join('')}</ul>` : ''}
            ${weeks.length ? `<ol class="dt-carouse">${weeks.map((w, wk) => `<li class="dt-${w.k}"><b>Week ${wk + 1}</b>${w.roll ? ` <span class="dt-roll">${esc(gambleRollText(w.roll))}</span>` : ''} ${esc(w.t)}</li>`).join('')}</ol>
                ${r.weeksTotal > weeks.length ? `<p class="dt-more">…and ${r.weeksTotal - weeks.length} more weeks${c.act === 'gamble' && r.gamble && r.gamble.stake ? ' (counted in the total above)' : ''}. Roll the rest at the table.</p>` : ''}` : ''}`;
    });
    document.getElementById('dt-total').innerHTML = `
        <div class="split-total">Party total for ${days} day${days === 1 ? '' : 's'} of downtime</div>
        <div class="split-each">${esc(downtimeMoney(Math.round(party * 100) / 100))}</div>
        ${dt.chars.length > 1 ? `<ul class="split-list">${dt.chars.map((c, i) => `
            <li><b>${esc(c.name || `Character ${i + 1}`)}</b><span>${esc(downtimeMoney(dt.results[i].totalGp))}</span></li>`).join('')}</ul>` : ''}`;
    document.getElementById('dt-reroll').disabled = !dtRolls();
}

// push: true = new history entry, false = replace, null = leave the URL alone.
function showDowntime(push) {
    readDowntimeRows();
    const days = dtDays();
    dt.events = document.getElementById('dt-events').checked;
    dt.results = dt.chars.map((c, i) => downtimeFor(c, days, dt.seed, i, { events: dt.events }));
    renderDowntimeResults();
    saveDowntime();
    if (push !== null) setUrlParams(downParams(), push);
}

function setDowntime(state) {
    const wk = document.getElementById('dt-weeks'), d = document.getElementById('dt-days');
    if (!setFieldValue(wk, state.weeks)) wk.value = defaultValue(wk);
    if (!setFieldValue(d, state.days)) d.value = defaultValue(d);
    dt.chars = (state.chars && state.chars.length ? state.chars : [dtBlankChar()]).slice(0, DOWNTIME_MAX_CHARS).map(dtClean);
    dt.seed = parseSeed(state.seed) || newSeed();
    document.getElementById('dt-events').checked = state.events !== false;
    buildDowntimeRows();
}

// The Party tab's characters, by name (party.js), or none.
function dtPartyChars() {
    return loadParty().map((m, i) => ({ ...dtBlankChar(), name: partyMemberName(m, i) }));
}

// First visit to the tab with no party in the URL: the saved downtime, the Party tab's
// characters, or one blank character.
function initDowntime(push) {
    setDowntime(loadDowntime() || { chars: dtPartyChars() });
    showDowntime(push);
}

// The Party tab's characters replace the rows; each keeps the lifestyle and activity of the row in its place.
function dtUseParty(list) {
    readDowntimeRows();
    const last = dt.chars[dt.chars.length - 1];
    dt.chars = list.slice(0, DOWNTIME_MAX_CHARS).map((m, i) =>
        dtClean({ ...(dt.chars[i] || { ...dtBlankChar(), life: last ? last.life : 'modest' }), name: partyMemberName(m, i) }));
    buildDowntimeRows();
    showDowntime(true);
    flash('downtime-status', `👥 ${dt.chars.length} character${dt.chars.length === 1 ? '' : 's'} from the party.`);
}

function applyDownUrl(p) {
    const cs = p.getAll('c');
    if (!cs.length) { initDowntime(false); return true; }
    setDowntime({ weeks: p.get('wk'), days: p.get('d'), chars: cs.map(dtDecode), seed: p.get('seed'), events: p.get('ev') !== '0' });
    showDowntime(null);
    // A link without a seed (or from before F28's weekly log) gets one now, so it replays.
    if (!p.get('seed') && dtRolls()) setUrlParams(downParams(), false);
    return true;
}

function clearDowntime() {
    setDowntime({ chars: dtPartyChars() });
    showDowntime(true);
}

function setupDowntime() {
    partyChip(document.getElementById('dt-party-chip'), { label: 'Use the Party', title: "Name the rows after the Party tab's characters", act: dtUseParty });
    const box = document.getElementById('dt-chars');
    box.addEventListener('input', () => showDowntime(false));
    box.addEventListener('change', e => { if (e.target.tagName === 'SELECT') showDowntime(false); });
    box.addEventListener('click', e => {
        const btn = e.target.closest('.dt-remove');
        if (!btn) return;
        readDowntimeRows();
        dt.chars.splice(Number(btn.closest('.dt-char').dataset.i), 1);
        buildDowntimeRows();
        showDowntime(true);
    });
    ['dt-weeks', 'dt-days'].forEach(id => document.getElementById(id).addEventListener('input', () => showDowntime(false)));
    document.getElementById('dt-events').addEventListener('change', () => showDowntime(true));
    document.getElementById('dt-add').addEventListener('click', () => {
        readDowntimeRows();
        if (dt.chars.length >= DOWNTIME_MAX_CHARS) return;
        const last = dt.chars[dt.chars.length - 1];
        dt.chars.push({ ...dtBlankChar(), life: last ? last.life : 'modest' });
        buildDowntimeRows();
        showDowntime(true);
        const names = box.querySelectorAll('.dt-name');
        names[names.length - 1].focus();
    });
    document.getElementById('dt-reroll').addEventListener('click', () => { dt.seed = newSeed(); showDowntime(true); });
    document.getElementById('dt-clear').addEventListener('click', clearDowntime);
    document.getElementById('dt-copy').addEventListener('click', () =>
        copyText(downtimeText(dt.chars, dt.results, dtDays()), 'downtime-status', 'the downtime'));
    document.getElementById('dt-link').addEventListener('click', () =>
        copyPageLink(ok => flash('downtime-status', ok ? '🔗 Link copied. It opens this party and its downtime.' : '⚠️ Copy blocked by the browser.')));
}
