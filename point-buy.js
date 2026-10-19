/* ============================================
   POINT BUY CALCULATOR (F62): ability scores four ways (27-point buy, the
   standard array, 4d6 drop lowest, or your own numbers), with SRD racial
   bonuses and modifiers. The address bar holds the scores, so a reload or a
   shared link brings them back; nothing goes in localStorage except a
   character sent to the Character Builder (CB_KEY, through cbSave).
   Needs rng.js, dice-engine.js, character-data.js, and character-engine.js.
   ============================================ */

const PB_METHODS = [['point', '🧮 Point Buy'], ['array', '📊 Standard Array'], ['roll', '🎲 Roll 4d6'], ['manual', '✍️ Your Own Numbers']];
const PB_METHOD_NAMES = { point: 'Point buy', array: 'Standard array', roll: '4d6 drop lowest', manual: 'Own numbers' };
const PB_ORDER = ['con', 'dex', 'wis', 'str', 'int', 'cha'];   // after the class's key abilities, like the builder

const pb = { method: 'point', base: {}, pool: [], dice: null, race: '', abil: [], cls: '' };

function esc(s) {
    return String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

let flashTimer = 0;
function flash(msg, bad = false) {
    const el = document.getElementById('pb-status');
    el.textContent = msg;
    el.classList.toggle('pb-bad', bad);
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => { el.textContent = ''; }, 4000);
}

// The builder's rules want a character; this is just enough of one.
const pbChar = () => ({ race: pb.race, subrace: '', raceOpt: { abil: pb.abil } });
const pbRaceName = r => (r.subraces ? r.subraces[0].name : r.name);
const pbBonusText = b => CB_ABILITIES.filter(a => b[a]).map(a => `+${b[a]} ${a.toUpperCase()}`).join(', ');

function pbRaceBonusFixed(r) {
    const out = {};
    [r.abil, r.subraces && r.subraces[0].abil].forEach(b => { if (b) Object.keys(b).forEach(a => { out[a] = (out[a] || 0) + b[a]; }); });
    return out;
}

function pbPrio() {
    const k = cbClass(pb.cls);
    return [...new Set([...(k ? k.primary : []), ...PB_ORDER])];
}

function pbAssign(values) {
    const sorted = values.slice().sort((a, b) => b - a);
    pbPrio().forEach((a, i) => { pb.base[a] = sorted[i]; });
}

function pbReset(method) {
    pb.method = method;
    if (method === 'point') CB_ABILITIES.forEach(a => { pb.base[a] = 8; });
    if (method === 'array') pbAssign(CB_STANDARD_ARRAY);
    if (method === 'roll') { if (pb.pool.length === 6) pbAssign(pb.pool); else CB_ABILITIES.forEach(a => { pb.base[a] = 8; }); }
    if (method === 'manual') CB_ABILITIES.forEach(a => { pb.base[a] = Math.min(20, Math.max(3, pb.base[a] || 10)); });
}

// Point-buy value of any six scores, or null when one is outside 8–15.
function pbWorth(base) {
    return CB_ABILITIES.every(a => CB_POINT_COST[base[a]] !== undefined) ? cbPointSpent(base) : null;
}

function pbRoll() {
    const rolls = Array.from({ length: 6 }, () => {
        const r = rollAndRecord('4d6dl1', 'normal', 'Ability score');
        return { total: r.total, dice: r.parts[0].rolls };
    });
    pb.pool = rolls.map(r => r.total);
    pb.dice = rolls.map(r => r.dice);
    pbAssign(pb.pool);
}

// ── Address bar ──────────────────────────────────────────
function pbParams() {
    const p = {};
    if (pb.method !== 'point') p.m = pb.method;
    if (CB_ABILITIES.some(a => pb.base[a] !== 8)) p.s = CB_ABILITIES.map(a => pb.base[a]).join('.');
    if (pb.method === 'roll' && pb.pool.length === 6) p.pool = pb.pool.join('.');
    if (pb.race) p.race = pb.race;
    if (pb.abil.length) p.plus = pb.abil.join('.');
    if (pb.cls) p.cls = pb.cls;
    return p;
}

function pbFromUrl() {
    const q = urlParams();
    const m = q.get('m');
    pb.method = PB_METHODS.some(x => x[0] === m) ? m : 'point';
    pb.race = cbRace(q.get('race')) ? q.get('race') : '';
    pb.cls = cbClass(q.get('cls')) ? q.get('cls') : '';
    const r = cbRace(pb.race);
    const ch = r && r.choose && r.choose.abil;
    pb.abil = ch ? [...new Set((q.get('plus') || '').split('.').filter(a => CB_ABILITIES.includes(a) && a !== r.choose.abilNot))].slice(0, ch) : [];
    const pool = (q.get('pool') || '').split('.').map(Number).filter(n => Number.isInteger(n) && n >= 3 && n <= 18);
    pb.pool = pool.length === 6 ? pool : [];
    pb.dice = null;
    pbReset(pb.method);
    const s = (q.get('s') || '').split('.').map(Number);
    if (s.length !== 6 || !s.every(Number.isInteger)) return;
    const base = {};
    CB_ABILITIES.forEach((a, i) => { base[a] = s[i]; });
    // Only scores the method could give are kept; anything else starts the method fresh.
    const same = (vals, want) => vals.slice().sort((x, y) => x - y).join() === want.slice().sort((x, y) => x - y).join();
    const ok = pb.method === 'point' ? (pbWorth(base) !== null && cbPointSpent(base) <= CB_POINT_BUDGET)
        : pb.method === 'array' ? same(s, CB_STANDARD_ARRAY)
            : pb.method === 'roll' ? pb.pool.length === 6 && same(s, pb.pool)
                : s.every(n => n >= 3 && n <= 20);
    if (ok) pb.base = base;
}

function pbChanged() {
    setUrlParams(pbParams(), false);
    render();
}

// ── Drawing ──────────────────────────────────────────────
function renderBar() {
    document.querySelectorAll('#pb-methods [data-m]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.m === pb.method)));
    document.getElementById('pb-race').value = pb.race;
    document.getElementById('pb-class').value = pb.cls;
    const r = cbRace(pb.race), ch = r && r.choose && r.choose.abil;
    const pick = document.getElementById('pb-plus');
    pick.hidden = !ch;
    if (ch) {
        pick.innerHTML = `<span class="pb-label">${esc(r.name)}: +1 to two abilities <span class="pb-count${pb.abil.length === ch ? ' full' : ''}">${pb.abil.length}/${ch}</span></span>`
            + CB_ABILITIES.filter(a => a !== r.choose.abilNot).map(a => `<button type="button" class="pb-chip" data-plus="${a}" aria-pressed="${pb.abil.includes(a)}">${CB_ABILITY_NAMES[a]}</button>`).join('');
    }
}

function renderMeter() {
    const el = document.getElementById('pb-meter');
    if (pb.method === 'point') {
        const spent = cbPointSpent(pb.base), left = CB_POINT_BUDGET - spent;
        el.innerHTML = `<div class="pb-meter-row"><b>${spent}</b> of ${CB_POINT_BUDGET} points spent · <span class="${left ? '' : 'pb-full'}">${left ? `${left} left` : 'all spent ✓'}</span></div>`
            + `<div class="pb-track" role="progressbar" aria-label="Points spent" aria-valuemin="0" aria-valuemax="${CB_POINT_BUDGET}" aria-valuenow="${spent}"><div style="width:${Math.min(100, spent / CB_POINT_BUDGET * 100)}%"></div></div>`;
        return;
    }
    if (pb.method === 'array') { el.innerHTML = '<div class="pb-meter-row">Assign 15, 14, 13, 12, 10, and 8. Picking a number swaps it with the score that had it.</div>'; return; }
    if (pb.method === 'roll') {
        const again = pb.pool.length === 6;
        let h = `<div class="pb-meter-row"><button type="button" class="pb-btn pb-gold" data-act="roll">🎲 ${again ? 'Roll Again' : 'Roll 4d6, Drop the Lowest'}</button>`;
        if (again) h += ` <span>Rolled ${pb.dice ? pb.dice.map(d => `<b>${d.filter(x => x.kept).reduce((t, x) => t + x.v, 0)}</b> <span class="pb-dice">[${d.map(x => (x.kept ? x.v : `(${x.v})`)).join(', ')}]</span>`).join(' · ') : pb.pool.map(n => `<b>${n}</b>`).join(' · ')}. Picking a number swaps it with the score that had it.</span>`;
        el.innerHTML = h + '</div>';
        return;
    }
    el.innerHTML = '<div class="pb-meter-row">Type the scores your table gave you (3 to 20, before racial bonuses).</div>';
}

function renderGrid() {
    const bonus = cbRacialBonus(pbChar());
    const key = cbClass(pb.cls) ? cbClass(pb.cls).primary : [];
    const r = cbRace(pb.race);
    const pool = pb.method === 'array' ? CB_STANDARD_ARRAY : pb.method === 'roll' && pb.pool.length === 6 ? pb.pool : null;
    document.getElementById('pb-grid').innerHTML = CB_ABILITIES.map(a => {
        const base = pb.base[a], total = base + bonus[a], mod = cbMod(total);
        let ctl;
        if (pb.method === 'point') {
            const cost = CB_POINT_COST[base], next = CB_POINT_COST[base + 1];
            const canUp = next !== undefined && cbPointSpent(pb.base) - cost + next <= CB_POINT_BUDGET;
            ctl = `<div class="pb-pm"><button type="button" class="pb-btn" data-pt="${a}" data-d="-1" aria-label="Lower ${CB_ABILITY_NAMES[a]}"${base <= 8 ? ' disabled' : ''}>−</button><span>${base}</span><button type="button" class="pb-btn" data-pt="${a}" data-d="1" aria-label="Raise ${CB_ABILITY_NAMES[a]}"${canUp ? '' : ' disabled'}>+</button></div>`
                + `<span class="pb-from">costs ${cost}${next !== undefined ? ` · next +${next - cost}` : ' · max'}</span>`;
        } else if (pool) {
            ctl = `<select data-assign="${a}" aria-label="${CB_ABILITY_NAMES[a]} base score">${[...new Set(pool)].sort((x, y) => y - x).map(v => `<option${v === base ? ' selected' : ''}>${v}</option>`).join('')}</select><span class="pb-from">base</span>`;
        } else if (pb.method === 'manual') {
            ctl = `<input type="number" min="3" max="20" inputmode="numeric" value="${base}" data-manual="${a}" aria-label="${CB_ABILITY_NAMES[a]} base score"><span class="pb-from">base</span>`;
        } else {
            ctl = `<div class="pb-pm"><span>—</span></div><span class="pb-from">roll first</span>`;
        }
        const from = bonus[a] ? `+${bonus[a]} ${esc(r ? r.name : '')}` : '';
        return `<div class="pb-abil${key.includes(a) ? ' pb-key' : ''}">
            <b>${a.toUpperCase()}${key.includes(a) ? ' <span title="A key ability for this class">★</span>' : ''}</b>
            <span class="pb-name">${CB_ABILITY_NAMES[a]}</span>
            ${ctl}
            <span class="pb-from pb-race-from">${from || '&nbsp;'}</span>
            <span class="pb-total">${pool || pb.method !== 'roll' ? total : '—'}</span>
            <span class="pb-mod">${pool || pb.method !== 'roll' ? cbSign(mod) : ''}</span>
        </div>`;
    }).join('');
}

function renderSummary() {
    const el = document.getElementById('pb-summary');
    if (pb.method === 'roll' && pb.pool.length !== 6) { el.innerHTML = ''; return; }
    const bonus = cbRacialBonus(pbChar());
    const total = CB_ABILITIES.reduce((t, a) => t + pb.base[a] + bonus[a], 0);
    const mods = CB_ABILITIES.reduce((t, a) => t + cbMod(pb.base[a] + bonus[a]), 0);
    const worth = pbWorth(pb.base);
    const bits = [`Scores add up to <b>${total}</b>`, `modifiers to <b>${cbSign(mods)}</b>`];
    if (pb.method !== 'point') {
        if (worth === null) bits.push('outside point buy (a base score above 15 or below 8)');
        else bits.push(`worth <b>${worth}</b> points in point buy${worth === CB_POINT_BUDGET ? ', exactly the same' : worth > CB_POINT_BUDGET ? `, ${worth - CB_POINT_BUDGET} more than the usual 27` : `, ${CB_POINT_BUDGET - worth} fewer than the usual 27`}`);
    }
    const over = CB_ABILITIES.filter(a => pb.base[a] + bonus[a] > 20);
    let h = `<p>${bits.join(' · ')}.</p>`;
    if (over.length) h += `<p class="pb-warn">${over.map(a => a.toUpperCase()).join(', ')} goes over 20, the most a score can be without magic.</p>`;
    const r = cbRace(pb.race), ch = r && r.choose && r.choose.abil;
    if (ch && pb.abil.length < ch) h += `<p class="pb-warn">Pick ${ch - pb.abil.length} more ${ch - pb.abil.length === 1 ? 'ability' : 'abilities'} for ${esc(r.name)}'s +1.</p>`;
    el.innerHTML = h;
}

function render() {
    renderBar();
    renderMeter();
    renderGrid();
    renderSummary();
    document.getElementById('pb-send').disabled = pb.method === 'roll' && pb.pool.length !== 6;
}

// ── Actions ──────────────────────────────────────────────
function pbText() {
    const bonus = cbRacialBonus(pbChar());
    const r = cbRace(pb.race), k = cbClass(pb.cls);
    const head = [r ? pbRaceName(r) : '', k ? k.name : ''].filter(Boolean).join(' ');
    const how = PB_METHOD_NAMES[pb.method] + (pb.method === 'point' ? ` (${cbPointSpent(pb.base)}/${CB_POINT_BUDGET})` : '');
    const lines = CB_ABILITIES.map(a => {
        const t = pb.base[a] + bonus[a];
        return `${a.toUpperCase()} ${t} (${cbSign(cbMod(t))})${bonus[a] ? ` = ${pb.base[a]} + ${bonus[a]}` : ''}`;
    });
    return [(head ? head + ' · ' : '') + how, ...lines].join('\n');
}

let spellsLoading = null;
function loadSpells() {
    if (typeof SPELLS_DATA !== 'undefined') return Promise.resolve();
    if (!spellsLoading) spellsLoading = new Promise((ok, fail) => {
        const s = document.createElement('script');
        s.src = 'spells-data.js';
        s.onload = ok;
        s.onerror = () => { spellsLoading = null; fail(); };
        document.head.appendChild(s);
    });
    return spellsLoading;
}

// A new builder character with these scores (and the race and class, if picked).
// The builder opens the newest character, so it lands on this one.
async function sendToBuilder() {
    const btn = document.getElementById('pb-send');
    btn.disabled = true;
    try {
        // Saving re-cleans every saved character, which drops spells it can't look up.
        await loadSpells();
    } catch (e) {
        flash('Could not load the spell list; check your connection and try again.', true);
        btn.disabled = false;
        return;
    }
    if (cbLoadAll().length >= CB_MAX) {
        flash(`You have ${CB_MAX} characters saved; delete one in the Character Builder first.`, true);
        btn.disabled = false;
        return;
    }
    const c = cbBlank();
    const r = cbRace(pb.race);
    c.race = pb.race;
    c.subrace = r && r.subraces ? r.subraces[0].id : '';
    c.raceOpt.abil = pb.abil.slice();
    c.cls = pb.cls;
    c.method = pb.method;
    CB_ABILITIES.forEach(a => { c.base[a] = pb.base[a]; });
    c.assigned = true;
    if (pb.method === 'roll') c.pool = pb.pool.slice();
    if (!cbSave(c)) {
        flash('Could not save: this browser\'s storage is full or blocked.', true);
        btn.disabled = false;
        return;
    }
    location.href = 'character-builder';
}

function onClick(e) {
    const b = e.target.closest('button');
    if (!b || b.disabled) return;
    if (b.dataset.m) {
        if (b.dataset.m === pb.method) return;
        pb.dice = null;
        pbReset(b.dataset.m);
        return pbChanged();
    }
    if (b.dataset.pt) {
        const a = b.dataset.pt, n = pb.base[a] + Number(b.dataset.d);
        if (CB_POINT_COST[n] === undefined) return;
        const was = pb.base[a];
        pb.base[a] = n;
        if (cbPointSpent(pb.base) > CB_POINT_BUDGET) { pb.base[a] = was; return; }
        return pbChanged();
    }
    if (b.dataset.plus) {
        const r = cbRace(pb.race), max = r.choose.abil, a = b.dataset.plus;
        if (pb.abil.includes(a)) pb.abil = pb.abil.filter(x => x !== a);
        else if (pb.abil.length < max) pb.abil.push(a);
        else pb.abil = [...pb.abil.slice(1), a];
        return pbChanged();
    }
    if (b.dataset.act === 'roll') { pbRoll(); return pbChanged(); }
}

function onChange(e) {
    const el = e.target;
    if (el.dataset.assign) {
        const a = el.dataset.assign, v = Number(el.value);
        const other = CB_ABILITIES.find(x => x !== a && pb.base[x] === v);
        if (other) pb.base[other] = pb.base[a];
        pb.base[a] = v;
        return pbChanged();
    }
    if (el.dataset.manual) {
        const n = Math.round(Number(el.value));
        pb.base[el.dataset.manual] = Number.isFinite(n) ? Math.min(20, Math.max(3, n)) : 10;
        return pbChanged();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('year').textContent = new Date().getFullYear();
    document.getElementById('pb-methods').innerHTML = PB_METHODS.map(([m, t]) => `<button type="button" class="pb-btn" data-m="${m}" aria-pressed="false">${t}</button>`).join('');
    document.getElementById('pb-race').innerHTML = '<option value="">No race yet</option>' + CB_RACES.map(r => {
        const b = pbBonusText(pbRaceBonusFixed(r));
        const extra = r.choose && r.choose.abil ? `${b ? ', ' : ''}+1 to two others` : '';
        return `<option value="${r.id}">${r.icon} ${esc(pbRaceName(r))} (${b}${extra})</option>`;
    }).join('');
    document.getElementById('pb-class').innerHTML = '<option value="">Any class</option>' + CB_CLASSES.map(k => `<option value="${k.id}">${k.icon} ${esc(k.name)} (${k.primary.map(a => a.toUpperCase()).join(', ')})</option>`).join('');
    document.getElementById('pb-cost').innerHTML = `<tr><th scope="row">Score</th>${Object.keys(CB_POINT_COST).map(s => `<td>${s}</td>`).join('')}</tr><tr><th scope="row">Cost</th>${Object.values(CB_POINT_COST).map(c => `<td>${c}</td>`).join('')}</tr>`;

    pbFromUrl();
    setUrlParams(pbParams(), false);
    render();

    const main = document.getElementById('pb-tool');
    main.addEventListener('click', onClick);
    main.addEventListener('change', onChange);
    document.getElementById('pb-race').addEventListener('change', e => {
        pb.race = e.target.value;
        pb.abil = [];
        pbChanged();
    });
    document.getElementById('pb-class').addEventListener('change', e => {
        pb.cls = e.target.value;
        pbChanged();
    });
    document.getElementById('pb-arrange').addEventListener('click', () => {
        if (pb.method === 'roll' && pb.pool.length !== 6) { flash('Roll the scores first.', true); return; }
        const vals = pb.method === 'array' ? CB_STANDARD_ARRAY
            : pb.method === 'point' && cbPointSpent(pb.base) === 0 ? CB_STANDARD_ARRAY
                : CB_ABILITIES.map(a => pb.base[a]);
        pbAssign(vals);
        pbChanged();
        const k = cbClass(pb.cls);
        flash(k ? `⚖️ Highest scores in ${k.primary.map(a => CB_ABILITY_NAMES[a]).join(' and ')}, then Constitution and Dexterity.` : '⚖️ Highest scores in Constitution and Dexterity. Pick a class to put its key abilities first.');
    });
    document.getElementById('pb-reset').addEventListener('click', () => {
        pb.dice = null;
        if (pb.method === 'roll') pb.pool = [];
        pbReset(pb.method);
        pbChanged();
        flash('↺ Scores reset.');
    });
    document.getElementById('pb-copy').addEventListener('click', () => {
        const text = pbText();
        (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject())
            .then(() => flash('📋 Scores copied.'), () => flash('Could not copy; select the scores and copy them by hand.', true));
    });
    document.getElementById('pb-link').addEventListener('click', () => copyPageLink(ok => flash(ok === false ? 'Could not copy the link.' : '🔗 Link copied.', ok === false)));
    document.getElementById('pb-send').addEventListener('click', sendToBuilder);
    window.addEventListener('popstate', () => { pbFromUrl(); render(); });
});
