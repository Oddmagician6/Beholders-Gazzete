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
   ============================================ */

const AM_MAX_ROWS = 8;
const AM_DEFAULTS = { ac: 15, cover: 0, mode: '', crit: 20, bless: false, lucky: false, xcrit: 0, once: '', pen: 5, bon: 10 };
const amDefaultRow = () => ({ name: 'Longsword', n: 1, hit: 5, dmg: '1d8 + 3', gwf: false, trade: false });
const AM_MODES = { '': 'Normal', adv: 'Advantage', dis: 'Disadvantage' };

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
// and adds xcrit more of the first weapon die (Brutal Critical, Savage Attacks).
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
// in row order, and doubles its dice if that hit is a crit.
function amRound(o, ac, tradeOn) {
    const once = amParse(o.once);
    const onceAvg = once ? amAverages(once, false, 0, 0) : null;
    let total = 0, none = 1, hits = 0, rider = 0, attacks = 0;
    const rows = o.rows.map(r => {
        const roll = amParse(r.dmg);
        const trade = tradeOn && r.trade;
        const bonus = r.hit - (trade ? o.pen : 0);
        const odds = amOdds(bonus, ac, o);
        const avg = roll ? amAverages(roll, r.gwf, trade ? o.bon : 0, o.xcrit) : { hit: 0, crit: 0 };
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

const amTarget = () => am.ac + am.cover;
const amHasTrade = () => am.rows.some(r => r.trade && amParse(r.dmg) && r.n);

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
    const rows = am.rows.map(r => [r.hit, r.dmg.replace(/\|/g, '').trim(), r.n, (r.gwf ? 'g' : '') + (r.trade ? 't' : ''), r.name].join('|'));
    const def = amDefaultRow();
    if (rows.length !== 1 || rows[0] !== [def.hit, def.dmg, def.n, '', def.name].join('|')) p.a = rows;
    return p;
}

function amFromUrl() {
    const q = urlParams();
    am.ac = amClamp(q.get('ac'), 1, 40, AM_DEFAULTS.ac);
    am.cover = [2, 5].includes(Number(q.get('cov'))) ? Number(q.get('cov')) : 0;
    am.mode = AM_MODES[q.get('mode')] && q.get('mode') ? q.get('mode') : '';
    am.crit = [19, 18].includes(Number(q.get('crit'))) ? Number(q.get('crit')) : 20;
    am.bless = q.get('bless') === '1';
    am.lucky = q.get('lucky') === '1';
    am.xcrit = amClamp(q.get('xc'), 0, 6, 0);
    am.once = amParse(q.get('once')) ? q.get('once').trim().slice(0, 40) : '';
    am.pen = amClamp(q.get('pen'), 0, 10, AM_DEFAULTS.pen);
    am.bon = amClamp(q.get('bon'), 0, 20, AM_DEFAULTS.bon);
    const rows = q.getAll('a').slice(0, AM_MAX_ROWS).map(v => {
        const [hit, dmg, n, flags, ...name] = v.split('|');
        return {
            name: amName(name.join(' ')), hit: amClamp(hit, -10, 30, 0), dmg: String(dmg || '').trim().slice(0, 40),
            n: amClamp(n, 0, 10, 1), gwf: /g/.test(flags || ''), trade: /t/.test(flags || '')
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
            gwf: gwf && melee && /two-handed/.test(a.props), trade: false
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
function renderSettings() {
    document.getElementById('am-ac').value = am.ac;
    document.getElementById('am-cover').value = String(am.cover);
    document.getElementById('am-mode').value = am.mode;
    document.getElementById('am-crit').value = String(am.crit);
    document.getElementById('am-bless').checked = am.bless;
    document.getElementById('am-lucky').checked = am.lucky;
    document.getElementById('am-xcrit').value = am.xcrit;
    document.getElementById('am-once').value = am.once;
    document.getElementById('am-pen').value = am.pen;
    document.getElementById('am-bon').value = am.bon;
    markOnce();
}

function markOnce() {
    const el = document.getElementById('am-once');
    el.setAttribute('aria-invalid', el.value.trim() && !amParse(el.value) ? 'true' : 'false');
}

function renderRows() {
    const trade = `${amSign(-am.pen)} / ${amSign(am.bon)}`;
    document.getElementById('am-rows').innerHTML = am.rows.map((r, i) => `<div class="am-row">
        <label class="am-field am-f-name">Attack<input type="text" maxlength="40" value="${esc(r.name)}" data-i="${i}" data-k="name" placeholder="Name"></label>
        <label class="am-field am-f-n">Times<input type="number" min="0" max="10" inputmode="numeric" value="${r.n}" data-i="${i}" data-k="n"></label>
        <label class="am-field am-f-hit">To hit<input type="number" min="-10" max="30" inputmode="numeric" value="${r.hit}" data-i="${i}" data-k="hit"></label>
        <label class="am-field am-f-dmg">Damage<input type="text" maxlength="40" value="${esc(r.dmg)}" data-i="${i}" data-k="dmg" placeholder="1d8 + 3" spellcheck="false" aria-invalid="${amParse(r.dmg) ? 'false' : 'true'}"></label>
        <div class="am-row-end">
          <label class="am-check" title="Reroll a 1 or 2 on the weapon's damage dice"><input type="checkbox" data-i="${i}" data-k="gwf"${r.gwf ? ' checked' : ''}> Great Weapon Fighting</label>
          <label class="am-check" title="Take the penalty to hit for the extra damage"><input type="checkbox" data-i="${i}" data-k="trade"${r.trade ? ' checked' : ''}> ${trade}</label>
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
    const coverText = am.cover ? ` (AC ${am.ac} + ${am.cover} cover)` : '';
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

    out.push(`<div class="am-scroll"><table class="am-table"><thead><tr><th scope="col">Attack</th><th scope="col">Times</th><th scope="col">To hit</th><th scope="col">Hit</th><th scope="col">Crit</th><th scope="col">On a hit</th><th scope="col">On a crit</th><th scope="col">Per round</th></tr></thead><tbody>
        ${round.rows.map(x => `<tr${x.n ? '' : ' class="am-off"'}><td>${esc(x.r.name || 'Attack')}${x.trade ? ` <span class="am-tag">${amSign(-am.pen)}/${amSign(am.bon)}</span>` : ''}${x.r.gwf ? ' <span class="am-tag">GWF</span>' : ''}</td><td>×${x.n}</td><td>${amSign(x.bonus)}</td><td>${amPct(x.odds.hit)}</td><td>${amPct(x.odds.crit)}</td><td>${amNum(x.avg.hit)}</td><td>${amNum(x.avg.crit)}</td><td><b>${amNum(x.n * x.each)}</b></td></tr>`).join('')}
        ${round.onceAvg ? `<tr><td>Once per turn: ${esc(am.once)}</td><td colspan="2" class="am-dim">first hit</td><td>${amPct(round.any)}</td><td></td><td>${amNum(round.onceAvg.hit)}</td><td>${amNum(round.onceAvg.crit)}</td><td><b>${amNum(round.rider)}</b></td></tr>` : ''}
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

    const lo = Math.max(1, ac - 6), hi = Math.min(40, lo + 12);
    const rowsAc = [];
    for (let a = lo; a <= hi; a++) {
        const on = amRound(am, a, true), off = trading ? amRound(am, a, false) : on;
        const firstOff = off.rows.find(x => x.n) || off.rows[0];
        const better = trading ? (on.total > off.total + 1e-9 ? 'on' : 'off') : '';
        rowsAc.push(`<tr${a === ac ? ' class="am-now"' : ''}><th scope="row">${a}</th><td>${amPct(firstOff.odds.hit)}</td><td${better === 'off' ? ' class="am-best"' : ''}>${amNum(off.total)}</td>${trading ? `<td${better === 'on' ? ' class="am-best"' : ''}>${amNum(on.total)}</td>` : ''}</tr>`);
    }
    out.push(`<h3 class="am-h3">By armor class</h3>
      <div class="am-scroll"><table class="am-table am-ac-table"><thead><tr><th scope="col">AC</th><th scope="col">First attack hits</th><th scope="col">${trading ? 'Without trade-off' : 'Damage per round'}</th>${trading ? `<th scope="col">With ${amSign(-am.pen)}/${amSign(am.bon)}</th>` : ''}</tr></thead><tbody>${rowsAc.join('')}</tbody></table></div>
      <p class="am-small-text am-dim">Rows use cover as set; the target's own AC is the number minus cover.${trading ? ' The better choice at each AC is in gold.' : ''}</p>`);

    document.getElementById('am-results').innerHTML = out.join('');
}

function amText() {
    const ac = amTarget();
    const round = amRound(am, ac, true);
    const opts = [AM_MODES[am.mode], am.crit < 20 ? `crit ${am.crit}–20` : '', am.bless ? 'Bless' : '', am.lucky ? 'Lucky' : '', am.xcrit ? `${am.xcrit} extra crit dice` : ''].filter(Boolean);
    const lines = [`Attack math against AC ${ac}${am.cover ? ` (${am.ac} + ${am.cover} cover)` : ''}: ${opts.join(', ')}`];
    round.rows.filter(x => x.n).forEach(x => {
        lines.push(`${x.r.name || 'Attack'} ×${x.n}: ${amSign(x.bonus)} to hit, ${x.r.dmg}${x.trade ? ` ${amSign(am.bon)}` : ''}${x.r.gwf ? ' (GWF)' : ''}. Hits ${amPct(x.odds.hit)}, crits ${amPct(x.odds.crit)}, ${amNum(x.n * x.each)} a round`);
    });
    if (round.onceAvg) lines.push(`Once per turn ${am.once}: ${amNum(round.rider)} a round`);
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
        else if (k === 'hit') r.hit = amClamp(el.value, -10, 30, r.hit);
        else r[k] = el.checked;
        return amChanged();
    }
    switch (el.id) {
        case 'am-ac': am.ac = amClamp(el.value, 1, 40, am.ac); break;
        case 'am-cover': am.cover = Number(el.value) || 0; break;
        case 'am-mode': am.mode = el.value; break;
        case 'am-crit': am.crit = Number(el.value) || 20; break;
        case 'am-bless': am.bless = el.checked; break;
        case 'am-lucky': am.lucky = el.checked; break;
        case 'am-xcrit': am.xcrit = amClamp(el.value, 0, 6, am.xcrit); break;
        case 'am-once': am.once = el.value.slice(0, 40); markOnce(); break;
        case 'am-pen': am.pen = amClamp(el.value, 0, 10, am.pen); break;
        case 'am-bon': am.bon = amClamp(el.value, 0, 20, am.bon); break;
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
    const list = cbLoadAll().filter(c => cbClass(c.cls));
    sel.innerHTML = `<option value="">${list.length ? 'Load attacks from a saved character…' : 'No saved characters yet'}</option>`
        + list.map(c => `<option value="${esc(c.id)}">${esc(c.name || 'Unnamed')} (${esc(cbClass(c.cls).name)} ${c.level})</option>`).join('');
    sel.disabled = !list.length;
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('year').textContent = new Date().getFullYear();
    const charId = urlParams().get('char');
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
    document.getElementById('am-load').addEventListener('change', e => {
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
    window.addEventListener('storage', e => { if (e.key === CB_KEY) fillCharacters(); });
});
