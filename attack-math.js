/* ============================================
   ATTACK MATH (F66): hit chance against an AC (advantage or disadvantage,
   crit range, Bless, halfling Lucky), average damage per round for a set of
   attacks plus a once-per-turn rider like Sneak Attack, and whether a
   "take a penalty to hit for extra damage" trade-off pays against each AC.
   The address bar holds it all (ac, cov, mode, crit, bless, lucky, xc, once,
   pen, bon, and a = hit|damage|times|flags|name per attack), so a reload or a
   shared link brings it back; nothing goes in localStorage. Loading a saved
   Character Builder character (from the picker or ?char=<id>) only reads CB_KEY.
   Needs rng.js, character-data.js, and character-engine.js.
   On a Pathfinder page (AM_PF2E) it runs Player Core's Strike rules instead:
   degrees of success (beat the AC by 10 to crit, a natural 20 or 1 moves a
   degree), the multiple attack penalty strike by strike (agile, flurry), a
   crit doubling all the damage plus deadly or fatal, fortune and misfortune,
   off-guard, lesser/standard/greater cover, a status bonus, and precision
   damage on every hit or the first; no builder characters (og, sb, ev in the
   address; a row's flags are a, f, d<die>, x<die>).
   ============================================ */

const AM_PF2E = ruleSystemId() === 'pf2e';
const AM_MAX_ROWS = 8;
const AM_AC_MAX = AM_PF2E ? 60 : 40;
const AM_HIT_MAX = AM_PF2E ? 50 : 30;
const AM_DEFAULTS = { ac: AM_PF2E ? 16 : 15, cover: 0, mode: '', crit: 20, bless: false, lucky: false, xcrit: 0, once: '', pen: 5, bon: 10, offGuard: false, status: 0, every: false };
const amDefaultRow = () => (AM_PF2E
    ? { name: 'Longsword', n: 2, hit: 9, dmg: '1d8 + 4', gwf: false, trade: false, ranged: false, map: '', deadly: 0, fatal: 0 }
    : { name: 'Longsword', n: 1, hit: 5, dmg: '1d8 + 3', gwf: false, trade: false, ranged: false });
const AM_MODES = AM_PF2E ? { '': 'Normal', adv: 'Fortune', dis: 'Misfortune' } : { '': 'Normal', adv: 'Advantage', dis: 'Disadvantage' };
const AM_COVERS = AM_PF2E ? [1, 2, 4] : [2, 5];
// Multiple attack penalty for a row's weapon: [second strike, third and later]
const AM_MAPS = { '': [5, 10], a: [4, 8], f: [3, 6], af: [2, 4] };
const AM_MAP_LABELS = { '': '−5 / −10', a: 'Agile −4 / −8', f: 'Flurry −3 / −6', af: 'Agile flurry −2 / −4' };
const AM_TRAITS = ['', 'd6', 'd8', 'd10', 'd12', 'x8', 'x10', 'x12'];
const amTraitKey = r => (r.deadly ? 'd' + r.deadly : r.fatal ? 'x' + r.fatal : '');
const amTraitLabel = k => (!k ? 'None' : (k[0] === 'd' ? 'Deadly d' : 'Fatal d') + k.slice(1));
const amOrdinal = k => ['1st', '2nd', '3rd'][k] || `${k + 1}th`;

const am = { ...AM_DEFAULTS, rows: [amDefaultRow()] };

function esc(s) {
    return String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

let flashTimer = 0;
function flash(msg, bad = false) {
    const el = document.getElementById('am-status');
    el.textContent = msg;
    el.classList.toggle('am-bad', bad);
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => { el.textContent = ''; }, 6000);
}

// A whole number in [lo, hi], or def for anything blank or not a number.
function amClamp(v, lo, hi, def) {
    if (v === null || v === undefined || String(v).trim() === '') return def;
    const n = Math.round(Number(v));
    return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : def;
}
const amName = s => String(s || '').replace(/[\x00-\x1f<>|]/g, '').trim().slice(0, 40);
const amPct = p => `${Math.round(p * 1000) / 10}%`;
const amNum = x => (Math.round(x * 10) / 10).toFixed(1);
const amSign = n => (n < 0 ? '−' + Math.abs(n) : '+' + n);

// ── The math ─────────────────────────────────────────────
// "2d6 + 1d4 - 1" → { dice: [[2, 6], [1, 4]], flat: -1 }, or null if it isn't a damage roll.
function amParse(text) {
    const s = String(text || '').replace(/\s+/g, '').toLowerCase().replace(/[−–]/g, '-');
    if (!s || s.length > 40 || !/^[+-]?(\d*d\d+|\d+)([+-](\d*d\d+|\d+))*$/.test(s)) return null;
    const out = { dice: [], flat: 0 };
    for (const [, sign, count, size, num] of s.matchAll(/([+-]?)(?:(\d*)d(\d+)|(\d+))/g)) {
        const k = sign === '-' ? -1 : 1;
        if (num !== undefined) { out.flat += k * Math.min(999, Number(num)); continue; }
        const c = count === '' ? 1 : Number(count), z = Number(size);
        if (c < 1 || c > 100 || z < 1 || z > 100) return null;
        out.dice.push([k * c, z]);
    }
    return out;
}

// Average of one die; Great Weapon Fighting rerolls a 1 or 2 once and keeps the new roll.
const amDieAvg = (z, gwf) => (z < 2 || !gwf ? (z + 1) / 2 : (z * (z + 1) / 2 - 3 + (z + 1)) / z);

// Average damage on a hit and on a crit: a crit doubles the dice (not the flat bonus)
// and adds xcrit more of the first weapon die (Brutal Critical, Savage Attacks; melee rows only).
function amAverages(roll, gwf, extraFlat, xcrit) {
    let dice = 0;
    roll.dice.forEach(([c, z]) => { dice += c * amDieAvg(z, gwf && c > 0); });
    const flat = roll.flat + extraFlat;
    const first = roll.dice.find(([c]) => c > 0);
    const more = first && xcrit ? xcrit * amDieAvg(first[1], gwf) : 0;
    return { hit: Math.max(0, dice + flat), crit: Math.max(0, 2 * dice + flat + more) };
}

// Chance of each natural d20 result (index 1–20) for the roll mode; Lucky rerolls a 1 once.
function amNaturals(mode, lucky) {
    const one = [0], cdf = [0], out = [0];
    for (let n = 1; n <= 20; n++) {
        one[n] = lucky ? (n === 1 ? 1 / 400 : 21 / 400) : 1 / 20;
        cdf[n] = cdf[n - 1] + one[n];
    }
    for (let n = 1; n <= 20; n++) {
        out[n] = mode === 'adv' ? cdf[n] ** 2 - cdf[n - 1] ** 2
            : mode === 'dis' ? (1 - cdf[n - 1]) ** 2 - (1 - cdf[n]) ** 2
            : one[n];
    }
    return out;
}

// { hit, crit } for an attack bonus against an AC; hit includes crits. A natural 1 always
// misses, and a natural roll in the crit range always hits. Bless adds a d4.
function amOdds(bonus, ac, o) {
    const nat = amNaturals(o.mode, o.lucky);
    const extra = o.bless ? [1, 2, 3, 4] : [0];
    let hit = 0, crit = 0;
    for (let n = 2; n <= 20; n++) {
        if (n >= o.crit) { hit += nat[n]; crit += nat[n]; continue; }
        hit += nat[n] * extra.filter(b => n + bonus + b >= ac).length / extra.length;
    }
    return { hit, crit };
}

// One round against a target AC (cover already added). tradeOn uses the trade-off on the
// attacks marked for it. The once-per-turn rider lands on the first attack that hits,
// in row order, and doubles its dice if that hit is a crit. Pathfinder pages: amRoundPf.
function amRound(o, ac, tradeOn) {
    if (AM_PF2E) return amRoundPf(o, ac);
    const once = amParse(o.once);
    const onceAvg = once ? amAverages(once, false, 0, 0) : null;
    let total = 0, none = 1, hits = 0, rider = 0, attacks = 0;
    const rows = o.rows.map(r => {
        const roll = amParse(r.dmg);
        const trade = tradeOn && r.trade;
        const bonus = r.hit - (trade ? o.pen : 0);
        const odds = amOdds(bonus, ac, o);
        const avg = roll ? amAverages(roll, r.gwf, trade ? o.bon : 0, r.ranged ? 0 : o.xcrit) : { hit: 0, crit: 0 };
        const each = (odds.hit - odds.crit) * avg.hit + odds.crit * avg.crit;
        const n = roll ? r.n : 0;
        for (let i = 0; i < n; i++) {
            if (onceAvg) rider += none * ((odds.hit - odds.crit) * onceAvg.hit + odds.crit * onceAvg.crit);
            none *= 1 - odds.hit;
        }
        total += n * each;
        hits += n * odds.hit;
        attacks += n;
        return { r, roll, trade, bonus, odds, avg, each, n };
    });
    return { rows, rider, onceAvg, total: total + rider, any: attacks ? 1 - none : 0, hits, attacks };
}

// ── Pathfinder Strikes ───────────────────────────────────
// { hit, crit } by degree of success: a critical success beats the AC by 10, a natural 20
// is one degree better and a natural 1 one degree worse.
function amOddsPf(bonus, ac, mode) {
    const nat = amNaturals(mode, false);
    let hit = 0, crit = 0;
    for (let n = 1; n <= 20; n++) {
        const t = n + bonus;
        let deg = t >= ac + 10 ? 3 : t >= ac ? 2 : t <= ac - 10 ? 0 : 1;
        if (n === 20) deg = Math.min(3, deg + 1);
        if (n === 1) deg = Math.max(0, deg - 1);
        if (deg >= 2) hit += nat[n];
        if (deg === 3) crit += nat[n];
    }
    return { hit, crit };
}

// A crit doubles all the damage. Fatal makes the weapon dice (the first dice in the roll) its
// size and adds one more; deadly adds one die (two with three weapon dice, three with four).
// Neither extra die is doubled.
function amAveragesPf(roll, deadly, fatal) {
    let dice = 0, fdice = 0;
    const first = roll.dice.findIndex(([c]) => c > 0);
    roll.dice.forEach(([c, z], i) => {
        dice += c * amDieAvg(z, false);
        fdice += c * amDieAvg(fatal && i === first ? fatal : z, false);
    });
    const count = first < 0 ? 0 : roll.dice[first][0];
    const extra = fatal && first >= 0 ? amDieAvg(fatal, false)
        : deadly && first >= 0 ? (count >= 4 ? 3 : count === 3 ? 2 : 1) * amDieAvg(deadly, false) : 0;
    return { hit: Math.max(0, dice + roll.flat), crit: Math.max(0, 2 * (fdice + roll.flat) + extra) };
}

// One turn: the strikes go in row order, and each after the first takes the multiple attack
// penalty of the weapon making it. The extra damage (precision) lands on every hit, or on
// the first hit only, and doubles on a crit like the rest.
function amRoundPf(o, ac) {
    const once = amParse(o.once);
    const onceAvg = once ? amAveragesPf(once, 0, 0) : null;
    let total = 0, none = 1, hits = 0, rider = 0, k = 0;
    const rows = o.rows.map(r => {
        const roll = amParse(r.dmg);
        const avg = roll ? amAveragesPf(roll, r.deadly, r.fatal) : { hit: 0, crit: 0 };
        const n = roll ? r.n : 0;
        const strikes = [];
        for (let i = 0; i < n; i++, k++) {
            const pen = k === 0 ? 0 : AM_MAPS[r.map || ''][k === 1 ? 0 : 1];
            const bonus = r.hit + o.status - pen;
            const odds = amOddsPf(bonus, ac, o.mode);
            const each = (odds.hit - odds.crit) * avg.hit + odds.crit * avg.crit;
            if (onceAvg) rider += (o.every ? 1 : none) * ((odds.hit - odds.crit) * onceAvg.hit + odds.crit * onceAvg.crit);
            none *= 1 - odds.hit;
            hits += odds.hit;
            total += each;
            strikes.push({ k, pen, bonus, odds, each });
        }
        const lead = strikes[0] || { bonus: r.hit + o.status, odds: amOddsPf(r.hit + o.status, ac, o.mode) };
        return { r, roll, trade: false, bonus: lead.bonus, odds: lead.odds, avg, each: strikes.reduce((s, x) => s + x.each, 0) / (n || 1), n, strikes };
    });
    return { rows, rider, onceAvg, total: total + rider, any: k ? 1 - none : 0, hits, attacks: k };
}

const amTarget = () => am.ac + am.cover - (AM_PF2E && am.offGuard ? 2 : 0);
const amHasTrade = () => !AM_PF2E && am.rows.some(r => r.trade && amParse(r.dmg) && r.n);

// The AC ranges (1–30) where the trade-off adds damage, as [[lo, hi], …]. It usually pays
// against low AC, stops paying in the middle, and pays again once only the crit range can
// hit (a crit hits whatever the penalty).
function amTradeRanges() {
    const out = [];
    for (let ac = 1; ac <= 30; ac++) {
        if (!(amRound(am, ac, true).total > amRound(am, ac, false).total + 1e-9)) continue;
        const last = out[out.length - 1];
        if (last && last[1] === ac - 1) last[1] = ac;
        else out.push([ac, ac]);
    }
    return out;
}

function amTradeVerdict() {
    const ranges = amTradeRanges();
    if (!ranges.length) return 'It costs damage at every AC: leave it off.';
    if (ranges.length === 1 && ranges[0][0] === 1 && ranges[0][1] === 30) return 'It adds damage at every AC.';
    const text = ranges.map(([lo, hi]) => (lo === 1 ? `AC ${hi} or lower` : hi === 30 ? `AC ${lo} or higher` : lo === hi ? `AC ${lo}` : `AC ${lo}–${hi}`));
    const crit = ranges.length > 1 && ranges[ranges.length - 1][1] === 30 ? ' (up there only the crit range hits, and a crit lands whatever the penalty)' : '';
    return `It adds damage against ${text.join(' and ')}${crit}, and costs damage everywhere else.`;
}

// ── Address bar ──────────────────────────────────────────
function amParams() {
    const p = {};
    if (am.ac !== AM_DEFAULTS.ac) p.ac = am.ac;
    if (am.cover) p.cov = am.cover;
    if (am.mode) p.mode = am.mode;
    if (am.crit !== 20) p.crit = am.crit;
    if (am.bless) p.bless = 1;
    if (am.lucky) p.lucky = 1;
    if (am.xcrit) p.xc = am.xcrit;
    if (am.once.trim()) p.once = am.once.trim();
    if (am.pen !== AM_DEFAULTS.pen) p.pen = am.pen;
    if (am.bon !== AM_DEFAULTS.bon) p.bon = am.bon;
    if (am.offGuard) p.og = 1;
    if (am.status) p.sb = am.status;
    if (am.every) p.ev = 1;
    const flags = r => (AM_PF2E ? (r.map || '') + amTraitKey(r) : (r.gwf ? 'g' : '') + (r.trade ? 't' : '') + (r.ranged ? 'r' : ''));
    const rows = am.rows.map(r => [r.hit, r.dmg.replace(/\|/g, '').trim(), r.n, flags(r), r.name].join('|'));
    const def = amDefaultRow();
    if (rows.length !== 1 || rows[0] !== [def.hit, def.dmg, def.n, '', def.name].join('|')) p.a = rows;
    return p;
}

function amFromUrl() {
    const q = urlParams();
    am.ac = amClamp(q.get('ac'), 1, AM_AC_MAX, AM_DEFAULTS.ac);
    am.cover = AM_COVERS.includes(Number(q.get('cov'))) ? Number(q.get('cov')) : 0;
    am.mode = AM_MODES[q.get('mode')] && q.get('mode') ? q.get('mode') : '';
    am.crit = !AM_PF2E && [19, 18].includes(Number(q.get('crit'))) ? Number(q.get('crit')) : 20;
    am.bless = !AM_PF2E && q.get('bless') === '1';
    am.lucky = !AM_PF2E && q.get('lucky') === '1';
    am.xcrit = AM_PF2E ? 0 : amClamp(q.get('xc'), 0, 6, 0);
    am.offGuard = AM_PF2E && q.get('og') === '1';
    am.status = AM_PF2E ? amClamp(q.get('sb'), 0, 3, 0) : 0;
    am.every = AM_PF2E && q.get('ev') === '1';
    am.once = amParse(q.get('once')) ? q.get('once').trim().slice(0, 40) : '';
    am.pen = amClamp(q.get('pen'), 0, 10, AM_DEFAULTS.pen);
    am.bon = amClamp(q.get('bon'), 0, 20, AM_DEFAULTS.bon);
    const rows = q.getAll('a').slice(0, AM_MAX_ROWS).map(v => {
        const [hit, dmg, n, flags, ...name] = v.split('|');
        const row = {
            name: amName(name.join(' ')), hit: amClamp(hit, -10, AM_HIT_MAX, 0), dmg: String(dmg || '').trim().slice(0, 40),
            n: amClamp(n, 0, 10, 1), gwf: /g/.test(flags || ''), trade: /t/.test(flags || ''), ranged: /r/.test(flags || '')
        };
        if (!AM_PF2E) return row;
        const f = flags || '', trait = (f.match(/[dx]\d+/) || [''])[0];
        return {
            ...row, gwf: false, trade: false, ranged: false,
            map: (/a/.test(f) ? 'a' : '') + (/f/.test(f) ? 'f' : ''),
            deadly: AM_TRAITS.includes(trait) && trait[0] === 'd' ? Number(trait.slice(1)) : 0,
            fatal: AM_TRAITS.includes(trait) && trait[0] === 'x' ? Number(trait.slice(1)) : 0
        };
    });
    am.rows = rows.length ? rows : [amDefaultRow()];
}

// ── A builder character ──────────────────────────────────
// Fills the attacks and the rules they bring from a saved character. Returns what it set.
function amFromCharacter(c) {
    const d = cbDerive(c), L = c.level;
    const extra = c.cls === 'fighter' ? (L >= 20 ? 4 : L >= 11 ? 3 : L >= 5 ? 2 : 1)
        : ['barbarian', 'monk', 'paladin', 'ranger'].includes(c.cls) && L >= 5 ? 2 : 1;
    const gwf = !!CB_CLASS_STYLES[c.cls] && c.opts.styles.includes('great-weapon');
    const smite = c.cls === 'paladin' && L >= 11;
    const said = [];
    am.rows = d.attacks.slice(0, AM_MAX_ROWS).map((a, i) => {
        const w = Object.values(CB_WEAPONS).find(x => x[0] === a.name);
        const melee = !!w && w[2] === 'melee';
        return {
            name: amName(a.name), n: i ? 0 : extra, hit: a.hit,
            dmg: a.dmg + (smite && melee ? ' + 1d8' : ''),
            gwf: gwf && melee && /two-handed/.test(a.props), trade: false, ranged: !!w && !melee
        };
    });
    if (extra > 1) said.push(`Extra Attack (${extra} on the first row)`);
    am.crit = c.cls === 'fighter' && L >= 15 ? 18 : c.cls === 'fighter' && L >= 3 ? 19 : 20;
    if (am.crit < 20) said.push(`Improved Critical (${am.crit}–20)`);
    am.lucky = c.race === 'halfling';
    if (am.lucky) said.push('Lucky');
    const brutal = c.cls === 'barbarian' ? (L >= 17 ? 3 : L >= 13 ? 2 : L >= 9 ? 1 : 0) : 0;
    am.xcrit = brutal + (c.race === 'half-orc' ? 1 : 0);
    if (am.xcrit) said.push(`${am.xcrit} extra crit ${am.xcrit > 1 ? 'dice' : 'die'}`);
    am.once = c.cls === 'rogue' ? `${Math.ceil(L / 2)}d6` : '';
    if (am.once) said.push(`Sneak Attack ${am.once}`);
    if (smite) said.push('Improved Divine Smite +1d8');
    if (am.rows.some(r => r.gwf)) said.push('Great Weapon Fighting');
    const tips = [];
    if (c.cls === 'barbarian') tips.push(`Raging? Add + ${L >= 16 ? 4 : L >= 9 ? 3 : 2} to a Strength melee row's damage.`);
    if (c.cls === 'monk' && L >= 2) tips.push('Flurry of Blows: set the Unarmed strike row to 2 more times.');
    if (c.cls === 'rogue') tips.push('Sneak Attack needs advantage or an ally next to the target, and a finesse or ranged weapon.');
    return { said, tips };
}

// ── Drawing ──────────────────────────────────────────────
// The Pathfinder page has its own settings (off-guard, status bonus, every hit) in place of
// the 5e ones (crit range, Bless, Lucky, extra crit dice, trade-off); missing fields are skipped.
function renderSettings() {
    const set = (id, k, v) => { const el = document.getElementById(id); if (el) el[k] = v; };
    set('am-ac', 'value', am.ac);
    set('am-cover', 'value', String(am.cover));
    set('am-mode', 'value', am.mode);
    set('am-crit', 'value', String(am.crit));
    set('am-bless', 'checked', am.bless);
    set('am-lucky', 'checked', am.lucky);
    set('am-xcrit', 'value', am.xcrit);
    set('am-once', 'value', am.once);
    set('am-pen', 'value', am.pen);
    set('am-bon', 'value', am.bon);
    set('am-offguard', 'checked', am.offGuard);
    set('am-sb', 'value', String(am.status));
    set('am-every', 'value', am.every ? '1' : '');
    markOnce();
}

function markOnce() {
    const el = document.getElementById('am-once');
    el.setAttribute('aria-invalid', el.value.trim() && !amParse(el.value) ? 'true' : 'false');
}

function renderRows() {
    const trade = `${amSign(-am.pen)} / ${amSign(am.bon)}`;
    const opts = (list, label, now) => list.map(v => `<option value="${v}"${v === now ? ' selected' : ''}>${label(v)}</option>`).join('');
    const end = (r, i) => (AM_PF2E ? `
          <label class="am-field am-f-map" title="The multiple attack penalty this weapon's Strike takes as your second, then third or later, attack in the turn">Attack penalty<select data-i="${i}" data-k="map">${opts(Object.keys(AM_MAP_LABELS), v => AM_MAP_LABELS[v], r.map || '')}</select></label>
          <label class="am-field am-f-trait" title="Deadly and fatal add damage on a critical hit">Crit trait<select data-i="${i}" data-k="trait">${opts(AM_TRAITS, amTraitLabel, amTraitKey(r))}</select></label>` : `
          <label class="am-check" title="Reroll a 1 or 2 on the weapon's damage dice"><input type="checkbox" data-i="${i}" data-k="gwf"${r.gwf ? ' checked' : ''}> Great Weapon Fighting</label>
          <label class="am-check" title="Take the penalty to hit for the extra damage"><input type="checkbox" data-i="${i}" data-k="trade"${r.trade ? ' checked' : ''}> ${trade}</label>
          <label class="am-check" title="Brutal Critical and Savage Attacks add no dice to a ranged attack"><input type="checkbox" data-i="${i}" data-k="ranged"${r.ranged ? ' checked' : ''}> Ranged</label>`);
    document.getElementById('am-rows').innerHTML = am.rows.map((r, i) => `<div class="am-row">
        <label class="am-field am-f-name">${AM_PF2E ? 'Strike' : 'Attack'}<input type="text" maxlength="40" value="${esc(r.name)}" data-i="${i}" data-k="name" placeholder="Name"></label>
        <label class="am-field am-f-n">Times<input type="number" min="0" max="10" inputmode="numeric" value="${r.n}" data-i="${i}" data-k="n"></label>
        <label class="am-field am-f-hit">To hit<input type="number" min="-10" max="${AM_HIT_MAX}" inputmode="numeric" value="${r.hit}" data-i="${i}" data-k="hit"></label>
        <label class="am-field am-f-dmg">Damage<input type="text" maxlength="40" value="${esc(r.dmg)}" data-i="${i}" data-k="dmg" placeholder="${AM_PF2E ? '1d8 + 4' : '1d8 + 3'}" spellcheck="false" aria-invalid="${amParse(r.dmg) ? 'false' : 'true'}"></label>
        <div class="am-row-end">${end(r, i)}
          <button type="button" class="am-btn am-small" data-del="${i}" aria-label="Remove ${esc(r.name || 'this attack')}"${am.rows.length < 2 ? ' disabled' : ''}>✕</button>
        </div>
    </div>`).join('');
    document.getElementById('am-add').disabled = am.rows.length >= AM_MAX_ROWS;
}

function renderResults() {
    const ac = amTarget();
    const trading = amHasTrade();
    const round = amRound(am, ac, true);
    const first = round.rows.find(x => x.n) || round.rows[0];
    const coverText = ac !== am.ac ? ` (AC ${am.ac}${am.cover ? ` + ${am.cover} cover` : ''}${AM_PF2E && am.offGuard ? ' − 2 off-guard' : ''})` : '';
    const out = [];

    out.push(`<h2 class="am-h">Against AC ${ac}${coverText}</h2>`);
    out.push(`<div class="am-stats">
        <div class="am-stat am-big"><span>Damage per round</span><b>${amNum(round.total)}</b></div>
        <div class="am-stat"><span>First attack hits</span><b>${amPct(first.odds.hit)}</b> <span class="am-dim">crit ${amPct(first.odds.crit)}</span></div>
        <div class="am-stat"><span>Hits at least once</span><b>${amPct(round.any)}</b></div>
        <div class="am-stat"><span>Hits a round</span><b>${amNum(round.hits)}</b> <span class="am-dim">of ${round.attacks}</span></div>
    </div>`);

    const bad = round.rows.map((x, i) => (x.roll ? '' : `row ${i + 1}`)).filter(Boolean);
    if (bad.length) out.push(`<p class="am-warn">Damage not understood on ${bad.join(', ')}: write it like 1d8 + 3 or 2d6 + 1d4 + 5. That row counts as 0.</p>`);

    // Pathfinder: a line per Strike, each with its own multiple attack penalty
    const tags = x => (amTraitKey(x.r) ? ` <span class="am-tag">${amTraitLabel(amTraitKey(x.r))}</span>` : '');
    const pfRows = x => (x.strikes.length
        ? x.strikes.map(st => `<tr><td>${esc(x.r.name || 'Strike')} <span class="am-dim">${amOrdinal(st.k)}</span>${st.pen ? ` <span class="am-tag">${amSign(-st.pen)}</span>` : ''}${tags(x)}</td><td>×1</td><td>${amSign(st.bonus)}</td><td>${amPct(st.odds.hit)}</td><td>${amPct(st.odds.crit)}</td><td>${amNum(x.avg.hit)}</td><td>${amNum(x.avg.crit)}</td><td><b>${amNum(st.each)}</b></td></tr>`).join('')
        : `<tr class="am-off"><td>${esc(x.r.name || 'Strike')}${tags(x)}</td><td>×0</td><td>${amSign(x.bonus)}</td><td>${amPct(x.odds.hit)}</td><td>${amPct(x.odds.crit)}</td><td>${amNum(x.avg.hit)}</td><td>${amNum(x.avg.crit)}</td><td><b>0.0</b></td></tr>`);
    const every = AM_PF2E && am.every;
    const riderLabel = AM_PF2E ? (every ? 'Every hit' : 'First hit') : 'Once per turn';

    out.push(`<div class="am-scroll"><table class="am-table"><thead><tr><th scope="col">${AM_PF2E ? 'Strike' : 'Attack'}</th><th scope="col">Times</th><th scope="col">To hit</th><th scope="col">Hit</th><th scope="col">Crit</th><th scope="col">On a hit</th><th scope="col">On a crit</th><th scope="col">Per round</th></tr></thead><tbody>
        ${AM_PF2E ? round.rows.map(pfRows).join('') : round.rows.map(x => `<tr${x.n ? '' : ' class="am-off"'}><td>${esc(x.r.name || 'Attack')}${x.trade ? ` <span class="am-tag">${amSign(-am.pen)}/${amSign(am.bon)}</span>` : ''}${x.r.gwf ? ' <span class="am-tag">GWF</span>' : ''}</td><td>×${x.n}</td><td>${amSign(x.bonus)}</td><td>${amPct(x.odds.hit)}</td><td>${amPct(x.odds.crit)}</td><td>${amNum(x.avg.hit)}</td><td>${amNum(x.avg.crit)}</td><td><b>${amNum(x.n * x.each)}</b></td></tr>`).join('')}
        ${round.onceAvg ? `<tr><td>${riderLabel}: ${esc(am.once)}</td><td colspan="2" class="am-dim">${every ? 'each hit' : 'first hit'}</td><td>${every ? `${amNum(round.hits)} hits` : amPct(round.any)}</td><td></td><td>${amNum(round.onceAvg.hit)}</td><td>${amNum(round.onceAvg.crit)}</td><td><b>${amNum(round.rider)}</b></td></tr>` : ''}
    </tbody></table></div>`);

    const modes = Object.keys(AM_MODES).map(m => {
        const t = amRound({ ...am, mode: m }, ac, true).total;
        return `<span class="am-mode${m === am.mode ? ' am-now' : ''}">${AM_MODES[m]} <b>${amNum(t)}</b></span>`;
    });
    out.push(`<p class="am-line"><span class="am-dim">Damage per round by roll:</span> ${modes.join(' ')}</p>`);

    if (trading) {
        const off = amRound(am, ac, false).total;
        const diff = round.total - off;
        out.push(`<div class="am-trade${diff > 1e-9 ? ' am-yes' : ' am-no'}"><b>${amSign(-am.pen)} to hit / ${amSign(am.bon)} damage:</b> ${amNum(round.total)} a round with it, ${amNum(off)} without (${diff >= 0 ? '+' : '−'}${amNum(Math.abs(diff))}). ${amTradeVerdict()}</div>`);
    }

    const lo = Math.max(1, ac - 6), hi = Math.min(AM_AC_MAX, lo + 12);
    const rowsAc = [];
    for (let a = lo; a <= hi; a++) {
        const on = amRound(am, a, true), off = trading ? amRound(am, a, false) : on;
        const firstOff = off.rows.find(x => x.n) || off.rows[0];
        const better = trading ? (on.total > off.total + 1e-9 ? 'on' : 'off') : '';
        rowsAc.push(`<tr${a === ac ? ' class="am-now"' : ''}><th scope="row">${a}</th><td>${amPct(firstOff.odds.hit)}</td><td${better === 'off' ? ' class="am-best"' : ''}>${amNum(off.total)}</td>${trading ? `<td${better === 'on' ? ' class="am-best"' : ''}>${amNum(on.total)}</td>` : ''}</tr>`);
    }
    out.push(`<h3 class="am-h3">By armor class</h3>
      <div class="am-scroll"><table class="am-table am-ac-table"><thead><tr><th scope="col">AC</th><th scope="col">First attack hits</th><th scope="col">${trading ? 'Without trade-off' : 'Damage per round'}</th>${trading ? `<th scope="col">With ${amSign(-am.pen)}/${amSign(am.bon)}</th>` : ''}</tr></thead><tbody>${rowsAc.join('')}</tbody></table></div>
      <p class="am-small-text am-dim">${AM_PF2E ? 'Rows use cover and off-guard as set; the target\'s own AC is the number minus cover, plus 2 if off-guard.' : 'Rows use cover as set; the target\'s own AC is the number minus cover.'}${trading ? ' The better choice at each AC is in gold.' : ''}</p>`);

    document.getElementById('am-results').innerHTML = out.join('');
}

function amText() {
    const ac = amTarget();
    const round = amRound(am, ac, true);
    const opts = [AM_MODES[am.mode], am.crit < 20 ? `crit ${am.crit}–20` : '', am.bless ? 'Bless' : '', am.lucky ? 'Lucky' : '', am.xcrit ? `${am.xcrit} extra crit dice` : '',
        am.status ? `+${am.status} status bonus` : ''].filter(Boolean);
    const lines = [`Attack math against AC ${ac}${ac !== am.ac ? ` (${am.ac}${am.cover ? ` + ${am.cover} cover` : ''}${AM_PF2E && am.offGuard ? ' − 2 off-guard' : ''})` : ''}: ${opts.join(', ')}`];
    if (AM_PF2E) round.rows.forEach(x => x.strikes.forEach(st => {
        lines.push(`${x.r.name || 'Strike'} (${amOrdinal(st.k)}): ${amSign(st.bonus)} to hit, ${x.r.dmg}${amTraitKey(x.r) ? ` (${amTraitLabel(amTraitKey(x.r))})` : ''}. Hits ${amPct(st.odds.hit)}, crits ${amPct(st.odds.crit)}, ${amNum(st.each)} a round`);
    }));
    else round.rows.filter(x => x.n).forEach(x => {
        lines.push(`${x.r.name || 'Attack'} ×${x.n}: ${amSign(x.bonus)} to hit, ${x.r.dmg}${x.trade ? ` ${amSign(am.bon)}` : ''}${x.r.gwf ? ' (GWF)' : ''}. Hits ${amPct(x.odds.hit)}, crits ${amPct(x.odds.crit)}, ${amNum(x.n * x.each)} a round`);
    });
    if (round.onceAvg) lines.push(`${AM_PF2E ? (am.every ? 'Every hit' : 'First hit') : 'Once per turn'} ${am.once}: ${amNum(round.rider)} a round`);
    lines.push(`Total: ${amNum(round.total)} damage a round; hits at least once ${amPct(round.any)}`);
    return lines.join('\n');
}

function amChanged() {
    setUrlParams(amParams(), false);
    renderResults();
}

function render() {
    renderSettings();
    renderRows();
    renderResults();
}

// ── Events ───────────────────────────────────────────────
function onInput(e) {
    const el = e.target;
    if (el.dataset.k) {
        const r = am.rows[Number(el.dataset.i)];
        if (!r) return;
        const k = el.dataset.k;
        if (k === 'name') r.name = amName(el.value);
        else if (k === 'dmg') { r.dmg = el.value.replace(/\|/g, '').slice(0, 40); el.setAttribute('aria-invalid', amParse(r.dmg) ? 'false' : 'true'); }
        else if (k === 'n') r.n = amClamp(el.value, 0, 10, r.n);
        else if (k === 'hit') r.hit = amClamp(el.value, -10, AM_HIT_MAX, r.hit);
        else if (k === 'map') r.map = AM_MAPS[el.value] ? el.value : '';
        else if (k === 'trait') {
            const t = AM_TRAITS.includes(el.value) ? el.value : '';
            r.deadly = t[0] === 'd' ? Number(t.slice(1)) : 0;
            r.fatal = t[0] === 'x' ? Number(t.slice(1)) : 0;
        }
        else r[k] = el.checked;
        return amChanged();
    }
    switch (el.id) {
        case 'am-ac': am.ac = amClamp(el.value, 1, AM_AC_MAX, am.ac); break;
        case 'am-cover': am.cover = Number(el.value) || 0; break;
        case 'am-mode': am.mode = el.value; break;
        case 'am-crit': am.crit = Number(el.value) || 20; break;
        case 'am-bless': am.bless = el.checked; break;
        case 'am-lucky': am.lucky = el.checked; break;
        case 'am-xcrit': am.xcrit = amClamp(el.value, 0, 6, am.xcrit); break;
        case 'am-once': am.once = el.value.slice(0, 40); markOnce(); break;
        case 'am-pen': am.pen = amClamp(el.value, 0, 10, am.pen); break;
        case 'am-bon': am.bon = amClamp(el.value, 0, 20, am.bon); break;
        case 'am-offguard': am.offGuard = el.checked; break;
        case 'am-sb': am.status = amClamp(el.value, 0, 3, 0); break;
        case 'am-every': am.every = el.value === '1'; break;
        default: return;
    }
    amChanged();
}

// On leaving a number field, show the value actually used; the trade-off labels follow pen/bon.
function onChange(e) {
    const el = e.target;
    if (el.type !== 'number') return;
    if (el.dataset.k) { el.value = am.rows[Number(el.dataset.i)][el.dataset.k]; return; }
    if (el.id === 'am-pen' || el.id === 'am-bon') renderRows();
    renderSettings();
}

function loadCharacter(c) {
    const { said, tips } = amFromCharacter(c);
    setUrlParams(amParams(), false);
    render();
    flash(`🧝 Loaded ${c.name || 'the character'}'s attacks${said.length ? ': ' + said.join(', ') : ''}. ${tips.join(' ')}`.trim());
}

function fillCharacters() {
    const sel = document.getElementById('am-load');
    if (!sel) return;
    const list = cbLoadAll().filter(c => cbClass(c.cls));
    sel.innerHTML = `<option value="">${list.length ? 'Load attacks from a saved character…' : 'No saved characters yet'}</option>`
        + list.map(c => `<option value="${esc(c.id)}">${esc(c.name || 'Unnamed')} (${esc(cbClass(c.cls).name)} ${c.level})</option>`).join('');
    sel.disabled = !list.length;
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('year').textContent = new Date().getFullYear();
    const charId = AM_PF2E ? null : urlParams().get('char');
    amFromUrl();
    const c = charId && cbLoadAll().find(x => x.id === charId);
    if (c) loadCharacter(c);
    else {
        setUrlParams(amParams(), false);
        render();
        if (charId) flash('That character isn\'t saved in this browser.', true);
    }
    fillCharacters();

    const tool = document.getElementById('am-tool');
    tool.addEventListener('input', onInput);
    tool.addEventListener('change', onChange);
    tool.addEventListener('click', e => {
        const b = e.target.closest('button[data-del]');
        if (!b || b.disabled) return;
        am.rows.splice(Number(b.dataset.del), 1);
        renderRows();
        amChanged();
    });
    document.getElementById('am-add').addEventListener('click', () => {
        if (am.rows.length >= AM_MAX_ROWS) return;
        const last = am.rows[am.rows.length - 1];
        am.rows.push(last ? { ...last, name: '', n: 1 } : amDefaultRow());
        renderRows();
        amChanged();
        const names = document.querySelectorAll('#am-rows input[data-k="name"]');
        names[names.length - 1].focus();
    });
    if (!AM_PF2E) document.getElementById('am-load').addEventListener('change', e => {
        const ch = cbLoadAll().find(x => x.id === e.target.value);
        e.target.value = '';
        if (ch) loadCharacter(ch);
    });
    document.getElementById('am-reset').addEventListener('click', () => {
        Object.assign(am, AM_DEFAULTS, { rows: [amDefaultRow()] });
        setUrlParams(amParams(), false);
        render();
        flash('↺ Cleared.');
    });
    document.getElementById('am-copy').addEventListener('click', () => {
        (navigator.clipboard ? navigator.clipboard.writeText(amText()) : Promise.reject())
            .then(() => flash('📋 Numbers copied.'), () => flash('Could not copy; select the text and copy it by hand.', true));
    });
    document.getElementById('am-link').addEventListener('click', () => copyPageLink(ok => flash(ok === false ? 'Could not copy the link.' : '🔗 Link copied.', ok === false)));
    window.addEventListener('popstate', () => { amFromUrl(); render(); });
    if (!AM_PF2E) window.addEventListener('storage', e => { if (e.key === CB_KEY) fillCharacters(); });
});
