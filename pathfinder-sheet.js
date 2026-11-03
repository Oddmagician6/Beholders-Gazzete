/* ============================================
   PATHFINDER PLAY SHEET PAGE (ROADMAP L3 P5.4)
   A Pathfinder Character Builder character at the table: Hit Points, dying and wounded with
   recovery checks, Hero Points, conditions with their values (and the penalties they put on the
   sheet's numbers), Focus Points and Refocus, spell slots (a repertoire's by count, prepared ones
   slot by slot), the cleric's divine font, counters of the player's own, a night's rest with daily
   preparations, and rolls from the sheet: Perception, saves, skills, Lores, every Strike at each
   multiple attack penalty, damage, critical damage (doubled, with deadly and fatal), and spell
   attacks. Rules live in pf2e-play.js; the session state is the character's c.play, saved through
   pcSave (PC_KEY) on every change. Rolls go through the shared roll history (dice-engine.js).
   Every save also pushes the state to the GM's tools (party.js partyPushLive) when the character
   is in the party, so the Party Tracker and Initiative tracker follow the sheet on this browser.
   ============================================ */

let chars = [];
let cur = null;
let mode = 'normal';         // fortune / misfortune for d20 rolls; stays until switched back
let amount = '';             // the damage/heal box, kept across redraws
let lastRoll = null;         // { label, f, mode, d20, r, hero } shown in the roll bar
let notice = null;           // { text, ok } after damage, a recovery check, or a rest
let restArmed = 0;
let addForm = { n: '', max: '1', day: true };   // the Counters box, kept across redraws

const PS_NO_GRANTS = { list: [], curr: {}, focus: [] };

function esc(s) {
    return String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

let flashTimer = 0;
function flash(msg, bad = false) {
    const el = document.getElementById('cs-status');
    el.textContent = msg;
    el.classList.toggle('cs-bad', bad);
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => { el.textContent = ''; }, 5000);
}

const plus = n => (n ? (n > 0 ? '+' : '') + n : '');
const who = () => (cur && cur.name) || 'Unnamed hero';
const spellsReady = () => typeof PF2E_SPELLS !== 'undefined';
const S = k => PF2E_SPELLS[k];
const ord = n => n + (n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th');

// What the sheet draws from: the stats, the spell rules, and the granted spells (once the text has loaded).
function derive(c) {
    const s = pcStats(c);
    const r = spellsReady() ? pcSpellRules(c) : null;
    const grants = spellsReady() && pcTextState === 2 ? pcSpellGrants(c) : PS_NO_GRANTS;
    const focus = spellsReady() ? pcFocus(c, grants) : { list: [], points: 0 };
    return { s, r, grants, focus };
}

function save() {
    const list = pcSave(cur);
    if (!list) { flash('Could not save: this browser\'s storage is full or blocked.', true); return; }
    chars = list;
    pushLive();
}

// Sends the sheet's state to the GM's tools, and says so when the browser won't store it.
function pushLive() {
    if (partyPushLive(cur.id, ppPartyLive(cur)) === null) flash("The GM's tools couldn't be updated: this browser's storage is full.", true);
}

// Adds the character to the party (or updates its row), like the Builder's 👥 Add to Party.
function addToParty() {
    const row = cleanPartyMember({ ...pcPartyRow(cur), live: ppPartyLive(cur) });
    const party = loadParty();
    const at = party.findIndex(p => p.id === row.id);
    if (at >= 0) party[at] = row;
    else if (party.length >= PARTY_MAX) { flash(`The party already has ${PARTY_MAX} characters. Remove one on the Party Tracker.`, true); return; }
    else party.push(row);
    if (!saveParty(party)) { flash("Could not add to the party: this browser's storage is full or blocked.", true); return; }
    pushLive();
    renderBar();
    flash('👥 In the party. The Party Tracker and Initiative tracker follow this sheet in this browser.');
}

// Change the open character's play state, save, and redraw.
function change(fn) {
    if (!cur) return;
    const d = derive(cur);
    fn(cur.play, d);
    ppFit(cur, pcStats(cur), pcTextState === 2 ? d.focus.points : null);
    save();
    render();
}

// ── Rolling ──────────────────────────────────────────────
function doRoll(formula, label, d20 = true, hero = false) {
    let r;
    const m = d20 ? mode : 'normal';
    try { r = rollAndRecord(formula, m, `${who()}: ${label}`); } catch (e) { flash(e.message, true); return null; }
    lastRoll = { label, f: formula, mode: m, d20, r, hero };
    renderRollbar();
    return r;
}

// A roll the dice engine can't write as one formula (critical damage): put in the history by hand.
function recordRoll(label, total, detail, f) {
    saveDiceHistory([{ f, mode: 'normal', total, detail, crit: null, t: Date.now(), label: `${who()}: ${label}`.slice(0, 60) }, ...loadDiceHistory()]);
    lastRoll = { label, f, mode: 'normal', d20: false, r: { total, mode: 'normal', crit: null, detail } };
    renderRollbar();
}

// "1d8 + 4 S" → { f: '1d8+4', type: 'S' }
function dmgParts(dmg) {
    const m = /^(.*?)\s*([A-Za-z]+)$/.exec(dmg);
    const f = (m ? m[1] : dmg).replace(/\s+/g, '').replace(/−/g, '-');
    return { f, type: m ? m[2] : '' };
}

// A Strike's damage with the enfeebled penalty on Strength-based damage.
function strikeDamage(c, d, x) {
    const { f, type } = dmgParts(x.dmg);
    const strDmg = !x.ranged || x.traits.some(t => /^thrown/.test(t) || t === 'propulsive');
    const pen = strDmg ? ppPenalty(c, { kind: 'damage', abil: 'str' }) : { n: 0, why: [] };
    return { f: f + (pen.n ? String(pen.n) : ''), type, pen };
}

// Critical damage: the whole roll doubled, then deadly's extra dice (1, 2 with greater striking,
// 3 with major) or fatal's (the weapon's dice turn to the fatal size, and one more of them).
function critRoll(c, d, x) {
    const { f, type } = strikeDamage(c, d, x);
    const fatal = (x.traits.find(t => /^fatal-d\d+$/.test(t)) || '').slice(6);
    const deadly = (x.traits.find(t => /^deadly-d\d+$/.test(t)) || '').slice(7);
    const base = fatal ? f.replace(/^(\d+)d\d+/, `$1${fatal}`) : f;
    let r;
    try { r = rollDice(base); } catch (e) { flash(e.message, true); return; }
    let total = r.total * 2, detail = `(${diceDetail(r)}) × 2`;
    const extraN = fatal ? 1 : deadly ? (/major striking/.test(x.name) ? 3 : /greater striking/.test(x.name) ? 2 : 1) : 0;
    if (extraN) {
        const e = rollDice(`${extraN}${fatal || deadly}`);
        total += e.total;
        detail += ` + ${diceDetail(e)} ${fatal ? 'fatal' : 'deadly'}`;
    }
    recordRoll(`${x.name} critical damage${type ? ` (${type})` : ''}`, Math.max(1, total), detail, `(${base})×2`);
}

// ── Drawing ──────────────────────────────────────────────
function pips(n, on, act, extra = '', cls = '') {
    return `<span class="cs-pips">${Array.from({ length: n }, (_, i) => {
        const filled = i < on;
        return `<button type="button" class="cs-pip ${cls}${filled ? '' : ' cs-used'}" data-act="${act}" data-f="${filled ? 1 : 0}" data-i="${i}"${extra} aria-label="${filled ? 'Mark one used' : 'Get one back'}"></button>`;
    }).join('')}</span>`;
}

// A number with the conditions' penalty taken off, and a note saying why.
function adj(c, n, what) {
    const p = ppPenalty(c, what);
    return { v: n + p.n, why: p.why.join(', ') };
}
const penNote = a => (a.why ? `<small class="pp-pen" title="${esc(a.why)}">${esc(a.why)}</small>` : '');

function renderRollbar() {
    const el = document.getElementById('cs-rollbar');
    if (!el || !cur) return;
    const p = cur.play;
    const warn = p.cond.filter(x => /^(Frightened|Sickened|Clumsy|Enfeebled|Drained|Stupefied|Fatigued|Off-Guard|Prone|Blinded|Encumbered)/.test(x));
    let last = '<small>Click a skill, save, or Strike to roll it.</small>';
    if (lastRoll) {
        const r = lastRoll.r;
        const tag = r.crit === 'nat20' ? ' <span class="cs-crit">Natural 20!</span>' : r.crit === 'nat1' ? ' <span class="cs-fumble">Natural 1</span>' : '';
        last = `<b>${r.total}</b><span>${esc(lastRoll.label)}${r.mode !== 'normal' ? ' (' + diceModeLabel(r.mode) + ')' : ''}${lastRoll.hero ? ' (Hero Point reroll)' : ''}${tag}</span><small>${esc(r.detail || diceDetail(r))}</small>`;
    }
    const reroll = lastRoll && lastRoll.d20 && !lastRoll.hero && p.hero > 0
        ? `<button type="button" class="cs-btn cs-mini" data-act="reroll" title="Spend a Hero Point to roll it again and take the new result">⭐ Reroll (Hero Point)</button>` : '';
    el.innerHTML = `<div class="cs-modes" role="group" aria-label="Roll d20s with">${[['normal', 'Normal'], ['adv', 'Fortune'], ['dis', 'Misfortune']].map(([v, t]) => `<button type="button" class="cs-btn cs-mini" data-act="mode" data-v="${v}" aria-pressed="${mode === v}">${t}</button>`).join('')}</div>
        <div class="cs-last" aria-live="polite">${last}</div>${reroll}
        ${warn.length ? `<span class="cs-dim">⚠️ ${esc(warn.join(', ').toLowerCase())}: already taken off the numbers</span>` : ''}`;
}

function hpPanel(c, d) {
    const p = c.play, s = d.s, max = ppMax(c, s), hp = ppHp(c, s);
    const state = hp === 0 ? ' cs-zero' : hp <= max / 4 ? ' cs-low' : '';
    const drained = ppCond(c, 'Drained');
    let h = `<section class="cs-panel" aria-labelledby="cs-hp-h"><h2 id="cs-hp-h">❤️ Hit Points</h2>
        <div class="cs-hp"><div class="cs-hp-num${state}"><b>${hp}</b><span> / ${max}</span></div>
        ${p.temp ? `<div class="cs-temp">+${p.temp} temporary</div>` : ''}
        ${drained ? `<div class="cs-dim">Maximum lowered by drained ${drained} (normally ${s.hp})</div>` : ''}</div>
        <div class="cs-meter${state}"><i style="width:${max ? Math.round(100 * hp / max) : 0}%"></i></div>
        <div class="cs-amount"><input type="number" id="cs-amt" min="0" max="999" inputmode="numeric" aria-label="Amount of damage or healing" placeholder="0" value="${esc(amount)}">
          <button type="button" class="cs-btn cs-red" data-act="damage">🗡️ Damage</button>
          <button type="button" class="cs-btn cs-red" data-act="damage" data-v="crit" title="Damage from a critical hit: dying 2 instead of 1 if it knocks you out">💥 From a Crit</button>
          <button type="button" class="cs-btn cs-green" data-act="heal">💚 Heal</button>
          <button type="button" class="cs-btn" data-act="temp">🛡️ Temp HP</button></div>`;
    if (notice) {
        h += `<div class="cs-banner${notice.ok ? ' cs-ok' : ''}"><p>${esc(notice.text)}</p>
            <div class="cs-btnrow"><button type="button" class="cs-btn cs-mini" data-act="notice-off">✕ Dismiss</button></div></div>`;
    }
    const dying = ppCond(c, 'Dying'), wounded = ppCond(c, 'Wounded'), doomed = ppCond(c, 'Doomed');
    if (hp === 0 || dying) {
        const dead = ppDead(c);
        const bits = [wounded ? `wounded ${wounded}` : '', doomed ? `doomed ${doomed}: you die at dying ${ppDeathAt(c)}` : ''].filter(Boolean).join(' · ');
        h += `<div class="cs-banner${!dying && !dead ? ' cs-ok' : ''}">
            <p><b>${dead ? '💀 Dead.' : dying ? `🩸 Dying ${dying}.` : '😮‍💨 Stable at 0 Hit Points.'}</b>
            ${dead ? 'Magic that returns the dead can bring you back: heal what it gives.' : dying ? `Roll a recovery check at the start of each turn: a DC ${10 + dying} flat check. Any healing brings you back (and adds 1 to wounded).` : 'You stay unconscious until healed, or wake after 10 minutes to an hour with 1 Hit Point.'}</p>
            ${bits ? `<p class="cs-dim">${esc(bits)}</p>` : ''}
            ${dying && !dead ? `<div class="cs-btnrow"><button type="button" class="cs-btn cs-gold" data-act="recovery">🎲 Recovery Check (DC ${10 + dying})</button>
              ${p.hero ? `<button type="button" class="cs-btn" data-act="heroic" title="Spend all your Hero Points: lose dying and stay at 0 HP, without adding to wounded">⭐ Heroic Recovery (all ${p.hero} Hero Point${p.hero > 1 ? 's' : ''})</button>` : ''}</div>` : ''}</div>`;
    }
    const restHp = Math.max(1, s.mods.con) * c.level;
    h += `<h3>Rest &amp; Refocus</h3>
        <div class="cs-btnrow">
          ${d.focus.points ? `<button type="button" class="cs-btn" data-act="refocus"${p.focus ? '' : ' disabled'}>🧘 Refocus (10 min)</button>` : ''}
          <button type="button" class="cs-btn" data-act="rest">${Date.now() - restArmed < 3000 ? '🛌 Really? Tap again' : '🛌 Rest &amp; Daily Preparations'}</button>
          <button type="button" class="cs-btn" data-act="session" title="A new session starts each player at 1 Hero Point">⭐ New Session</button></div>
        <p class="cs-dim" style="margin:8px 0 0">A night's rest heals ${restHp} HP (Constitution modifier, at least 1, × level), lowers drained and doomed by 1, ends fatigued, and refills spell slots${s.cast && s.cast.font ? ', the font' : ''}${d.focus.points ? ', Focus Points' : ''}, and daily counters. Wounded stays until Treat Wounds heals you or you rest 10 minutes at full HP.</p>`;
    return h + '</section>';
}

function statusPanel(c) {
    const p = c.play;
    const names = Object.keys(PF2E_CONDITIONS);
    const effects = p.cond.map(x => {
        const k = x.replace(/ \d$/, '');
        return PF2E_CONDITIONS[k] ? `<li><b>${esc(x)}:</b> ${esc(PF2E_CONDITIONS[k].text)}</li>` : '';
    });
    return `<section class="cs-panel" aria-labelledby="cs-st-h"><h2 id="cs-st-h">✨ Status</h2>
        <ul class="cs-rows">
          <li><span class="cs-name">Hero Points<small>Spend 1 to reroll a check (the ⭐ in the roll bar), or all of them to avoid death.</small></span>
            ${pips(3, p.hero, 'hero', '', 'pp-hero')}</li>
          <li><span class="cs-name">End of your turn<small>Frightened drops by 1. Persistent damage, if any: take it, then a DC 15 flat check.</small></span>
            <button type="button" class="cs-btn" data-act="endturn">⏭️ End Turn</button></li>
        </ul>
        <h3>Conditions</h3>
        <div class="cs-chips" role="group" aria-label="Conditions">${names.map(n => {
            const v = ppCond(c, n), max = PF2E_CONDITIONS[n].max;
            const chip = `<button type="button" class="cs-chip" data-act="cond" data-v="${n}" aria-pressed="${!!v}" title="${esc(PF2E_CONDITIONS[n].text)}">${n}${max && v ? ' ' + v : ''}</button>`;
            return max && v ? `<span class="pp-cv"><button type="button" class="cs-chip pp-step" data-act="cstep" data-v="${n}" data-n="-1" aria-label="Lower ${n}">−</button>${chip}<button type="button" class="cs-chip pp-step" data-act="cstep" data-v="${n}" data-n="1" aria-label="Raise ${n}"${v >= max ? ' disabled' : ''}>+</button></span>` : chip;
        }).join('')}</div>
        ${effects.length ? `<ul class="cs-effects">${effects.join('')}</ul>` : ''}
    </section>`;
}

function countersPanel(c) {
    const list = c.play.res;
    return `<section class="cs-panel" aria-labelledby="cs-re-h"><h2 id="cs-re-h">🔥 Counters</h2>
        ${list.length ? `<ul class="cs-rows">${list.map((r, i) => {
            const left = r.max - r.used;
            const ctl = r.max <= 10 ? pips(r.max, left, 'res', ` data-v="${i}"`)
                : `<span class="cs-step"><button type="button" class="cs-btn" data-act="resn" data-v="${i}" data-n="1" aria-label="Use one"${left ? '' : ' disabled'}>−</button><span>${left}</span><button type="button" class="cs-btn" data-act="resn" data-v="${i}" data-n="-1" aria-label="Get one back"${r.used ? '' : ' disabled'}>＋</button></span>`;
            return `<li><span class="cs-name">${esc(r.n)}<small>${left} of ${r.max} left</small></span>${ctl}<span class="cs-recharge">${r.day ? 'daily' : 'by hand'}</span>
                <button type="button" class="cs-btn cs-mini" data-act="res-del" data-v="${i}" aria-label="Remove ${esc(r.n)}">✕</button></li>`;
        }).join('')}</ul>` : '<p class="cs-dim">Track anything with uses: an alchemist\'s reagents, a once-a-day item, wand charges, a feat you can use a few times a day.</p>'}
        <div class="cs-add">
          <label class="cs-field" style="flex:1 1 160px">Name<input type="text" id="pp-res-n" maxlength="40" autocomplete="off" placeholder="Infused reagents" value="${esc(addForm.n)}"></label>
          <label class="cs-field cs-narrow">Uses<input type="number" id="pp-res-max" min="1" max="99" inputmode="numeric" value="${esc(addForm.max)}"></label>
          <label class="pp-check"><input type="checkbox" id="pp-res-day"${addForm.day ? ' checked' : ''}> Refills each day</label>
          <button type="button" class="cs-btn" data-act="res-add"${list.length >= 12 ? ' disabled' : ''}>➕ Add</button>
        </div>
    </section>`;
}

function rollsPanel(c, d) {
    const s = d.s;
    const ac = adj(c, s.ac.ac, { kind: 'ac' });
    const per = adj(c, s.per, { kind: 'per' });
    const speed = ppSpeed(c, s);
    const dc = (n, abil) => adj(c, n, { kind: 'spell', abil });
    const cls = s.classdc !== null ? dc(s.classdc, s.key) : null;
    const spell = s.cast ? dc(s.spellDc, s.cast.attr) : null;
    const rank = r => `<span class="pb-rank pb-r${r}" title="${PC_RANKS[r]}">${PC_RANK_LETTER[r]}</span>`;
    const skillRow = (id, name, abil, total, r) => {
        const a = adj(c, total, { kind: 'skill', abil });
        return `<li class="${r ? 'p' : ''}"><button type="button" data-act="skill" data-v="${esc(id)}"${a.why ? ` title="${esc(a.why)}"` : ''}><span class="cs-dot">${rank(r)}</span><span class="cs-val">${pcSign(a.v)}${a.why ? '*' : ''}</span><span>${esc(name)} <small>${abil.toUpperCase()}</small></span></button></li>`;
    };
    return `<section class="cs-panel" aria-labelledby="cs-ro-h"><h2 id="cs-ro-h">🎲 Checks &amp; Saves</h2>
        <div class="cs-vitals">
          <div class="cs-vital"><span>Armor Class</span><b>${ac.v}</b><small>${esc(s.ac.armor ? s.ac.armor.n : 'unarmored')}</small>${penNote(ac)}</div>
          <div class="cs-vital"><span>Speed</span><b>${speed}</b><small>${speed !== s.speed ? `normally ${s.speed} ft.` : 'feet'}</small></div>
          <button type="button" class="cs-vital" data-act="init"><span>Perception</span><b>${pcSign(per.v)}</b><small>🎲 initiative</small>${penNote(per)}</button>
          ${cls ? `<div class="cs-vital"><span>Class DC</span><b>${cls.v}</b>${penNote(cls)}</div>` : ''}
          ${spell ? `<button type="button" class="cs-vital" data-act="spellatk"><span>Spell DC</span><b>${spell.v}</b><small>🎲 attack ${pcSign(spell.v - 10)}</small>${penNote(spell)}</button>` : ''}
        </div>
        <div class="pp-saves">${Object.entries(PC_SAVES).map(([k, [n]]) => {
            const a = adj(c, s.saves[k], { kind: k });
            return `<button type="button" class="cs-roll cs-prof" data-act="save" data-v="${k}" aria-label="${n} save ${pcSign(a.v)}"><b>${n}</b> ${pcSign(a.v)} ${rank(s.prof[k])}${penNote(a)}</button>`;
        }).join('')}</div>
        <p class="cs-dim pp-mods">${PC_ABILS.map(a => `${a.toUpperCase()} ${pcSign(s.mods[a])}`).join(' · ')}</p>
        <h3>Skills</h3>
        <ul class="cs-skills">${Object.keys(PC_SKILLS).map(k => skillRow(k, pcCap(k), PC_SKILLS[k], s.skills[k], s.ranks[k])).join('')}
          ${Object.keys(s.lores).map(n => skillRow('lore:' + n, n, 'int', s.loreMods[n], s.lores[n])).join('')}</ul>
        <p class="cs-tag" style="margin-top:6px">U untrained · T trained · E expert · M master · L legendary${Object.keys(PC_SKILLS).some(k => ppPenalty(c, { kind: 'skill', abil: PC_SKILLS[k] }).n) ? ' · * a condition lowers it (hover to see)' : ''}</p>
    </section>`;
}

function strikesPanel(c, d) {
    const s = d.s;
    const rows = s.strikes.map((x, i) => {
        const a = adj(c, 0, { kind: 'attack', abil: ppStrikeAbil(c, s, x) });
        const dm = strikeDamage(c, d, x);
        const why = [a.why, dm.pen.why.length ? dm.pen.why.join(', ') + ' to damage' : ''].filter(Boolean).join('; ');
        return `<tr><td>${esc(x.name)}<small>${esc(x.traits.join(', '))}${x.range ? ` · range ${x.range} ft.` : ''}${why ? ` · ${esc(why)}` : ''}</small></td>
            <td class="cs-acts">${x.atk.map((n, m) => `<button type="button" class="cs-btn cs-mini" data-act="atk" data-i="${i}" data-n="${m}" aria-label="${esc(x.name)} Strike, ${['first', 'second', 'third'][m]} attack">${pcSign(n + a.v)}</button>`).join(' ')}</td>
            <td class="cs-acts">${x.dmg ? `<button type="button" class="cs-btn cs-mini" data-act="dmg" data-i="${i}" aria-label="${esc(x.name)} damage">💥 ${esc(x.dmg)}</button>
              <button type="button" class="cs-btn cs-mini" data-act="crit" data-i="${i}" aria-label="${esc(x.name)} critical damage">Crit</button>` : ''}</td></tr>`;
    });
    return `<section class="cs-panel" aria-labelledby="cs-at-h"><h2 id="cs-at-h">⚔️ Strikes</h2>
        <div class="cs-scroll"><table class="cs-table"><thead><tr><th>Strike</th><th style="text-align:right">1st / 2nd / 3rd</th><th style="text-align:right">Damage</th></tr></thead><tbody>${rows.join('')}</tbody></table></div>
        <p class="cs-tag" style="margin-top:6px">The 2nd and 3rd buttons carry the multiple attack penalty (less for agile weapons). Crit doubles the damage${s.strikes.some(x => x.traits.some(t => /^(deadly|fatal)-/.test(t))) ? ' and adds deadly or fatal dice' : ''}.</p></section>`;
}

const spellLink = (k, tag = '') => `<a href="pf2e/spell/${k}" target="_blank" rel="noopener" title="Open ${esc(S(k).n)} in a new tab">${esc(S(k).n)}</a>${tag ? ` <span class="cs-tag">${esc(tag)}</span>` : ''}`;

function spellsPanel(c, d) {
    const { s, r, grants, focus } = d;
    if (!spellsReady() || (!s.cast && !focus.list.length)) return '';
    const p = c.play, sp = c.spells;
    const top = Math.ceil(c.level / 2);
    let h = `<section class="cs-panel" aria-labelledby="cs-sp-h"><h2 id="cs-sp-h">🔮 Spells</h2>`;
    if (r && r.type !== 'focus') {
        const rows = [];
        r.slots.forEach((n, i) => {
            const rank = i + 1;
            if (!n) return;
            if (r.type === 'rep') {
                const used = p.slots[rank] || 0;
                const known = [...grants.list.filter(g => g.to === 'rep' && g.rank === rank).map(g => g.key), ...(sp.rep[rank] || [])];
                rows.push(`<li><div class="pp-rank"><span>Rank ${rank}</span>${pips(n, n - used, 'slot', ` data-v="${rank}"`)}<span class="cs-tag">${n - used} of ${n}</span></div>
                    ${known.length ? `<p class="pp-known">${[...new Set(known)].map(k => spellLink(k, sp.sig[rank] === k ? '★ signature' : '')).join(', ')}</p>` : ''}</li>`);
            } else {
                const list = sp.prep[rank] || [];
                const cast = p.cast[rank] || [];
                rows.push(`<li><div class="pp-rank"><span>Rank ${rank}</span><span class="cs-tag">${n - cast.length} of ${n} left</span></div>
                    <ul class="pp-prep">${Array.from({ length: n }, (_, j) => {
                        const k = list[j] || '';
                        const done = cast.includes(j);
                        const curr = r.curr && rank <= 9 && j === n - 1;
                        return `<li class="${done ? 'pp-cast' : ''}"><button type="button" class="cs-pip${done ? ' cs-used' : ''}" data-act="prep" data-v="${rank}" data-i="${j}" aria-label="${done ? 'Mark not cast' : 'Mark cast'}"></button>
                            ${k ? spellLink(k, curr ? 'curriculum' : '') : `<span class="cs-dim">empty slot${curr ? ' (curriculum)' : ''}</span>`}</li>`;
                    }).join('')}</ul></li>`);
            }
        });
        if (r.font) {
            const fn = r.font.n;
            rows.push(`<li><div class="pp-rank"><span>Font</span>${pips(fn, fn - p.font, 'font')}<span class="cs-tag">rank ${r.font.rank} ${r.font.spell ? esc(pcCap(r.font.spell)) : 'heal or harm'} only</span></div></li>`);
        }
        const cts = [...new Set([...grants.list.filter(g => g.to === 'rep' && g.rank === 0).map(g => g.key), ...sp.ct])];
        h += `<ul class="pp-ranks">${rows.join('')}</ul>`;
        h += `<p><b class="pp-label">Cantrips</b> ${cts.length ? cts.map(k => spellLink(k)).join(', ') : '<span class="cs-dim">none picked yet</span>'} <span class="cs-tag">· rank ${top}, no slot</span></p>`;
    }
    if (focus.list.length) {
        h += `<h3>Focus spells</h3>`;
        if (focus.points) h += `<div class="pp-rank"><span>Focus Points</span>${pips(focus.points, focus.points - p.focus, 'focus')}<span class="cs-tag">Refocus for 1 back</span></div>`;
        h += `<p>${focus.list.map(f => spellLink(f.key, S(f.key).k === 'c' ? 'cantrip, free' : '')).join(', ')} <span class="cs-tag">· rank ${top}</span></p>`;
    }
    h += `<p class="cs-tag" style="margin-top:6px">Change the spells themselves in the <a href="pathfinder-spell-planner?char=${encodeURIComponent(c.id)}">🃏 Spell Planner</a>.${pcTextState === 1 ? ' Loading granted spells…' : ''}</p>`;
    return h + '</section>';
}

function renderLog() {
    const el = document.getElementById('cs-log');
    if (!el) return;
    const list = loadDiceHistory().slice(0, 10);
    el.innerHTML = list.length
        ? list.map(h => `<li><b>${h.total}</b><span>${esc(h.label || h.f)}${h.mode && h.mode !== 'normal' ? ' (' + diceModeLabel(h.mode) + ')' : ''}${h.crit === 'nat20' ? ' · natural 20' : h.crit === 'nat1' ? ' · natural 1' : ''} <small>${esc(h.detail)}</small></span></li>`).join('')
        : '<li><span class="cs-dim">No rolls yet.</span></li>';
}

function render() {
    const sheet = document.getElementById('cs-sheet');
    renderBar();
    if (!cur) {
        sheet.innerHTML = `<div class="cs-panel cs-empty"><p>No Pathfinder characters in this browser yet.</p><p><a class="cs-btn cs-gold" href="pathfinder-character-builder">🧝 Build a Character</a></p></div>`;
        return;
    }
    const c = cur, d = derive(c), p = d.s.parts;
    if (!p.cls) {
        sheet.innerHTML = `<div class="cs-panel cs-empty"><p>${esc(who())} has no class yet.</p><p><a class="cs-btn cs-gold" href="pathfinder-character-builder?char=${encodeURIComponent(c.id)}">✏️ Finish in the Builder</a></p></div>`;
        return;
    }
    const focusEl = focusKey(document.activeElement);
    const todo = pcTodo(c);
    sheet.innerHTML = `<div class="cs-head"><img class="cs-portrait" src="img/class/${{ alchemist: 'wizard', investigator: 'rogue', oracle: 'sorcerer', swashbuckler: 'fighter', witch: 'warlock', champion: 'paladin' }[c.cls] || c.cls}-sm.webp" alt="" width="64" height="64" onerror="this.remove()">
        <div class="cs-title"><h2>${esc(who())}</h2><p>${esc(pcLine(c))}${p.her ? ' · ' + esc(p.her.n) : ''}${p.bg ? ' · ' + esc(p.bg.n) : ''}${c.player ? ' · played by ' + esc(c.player) : ''}</p>
        ${todo.length ? `<p class="cs-dim">⚠️ ${todo.length} pick${todo.length > 1 ? 's' : ''} still to make in the <a href="pathfinder-character-builder?char=${encodeURIComponent(c.id)}">builder</a>.</p>` : ''}</div></div>
        <div class="cs-rollbar" id="cs-rollbar"></div>
        <div class="cs-grid"><div class="cs-col">${hpPanel(c, d)}${statusPanel(c)}${countersPanel(c)}</div>
        <div class="cs-col">${rollsPanel(c, d)}${strikesPanel(c, d)}${spellsPanel(c, d)}
          <section class="cs-panel" aria-labelledby="cs-lg-h"><h2 id="cs-lg-h">📜 Recent Rolls</h2><ul class="cs-log" id="cs-log"></ul></section></div></div>`;
    renderRollbar();
    renderLog();
    if (focusEl) { const el = sheet.querySelector(focusEl); if (el) el.focus(); }
}

function focusKey(el) {
    if (!el || !el.closest || !el.closest('#cs-sheet')) return '';
    if (el.id) return '#' + el.id;
    const keys = ['act', 'v', 'i', 'n'].filter(k => el.dataset[k] !== undefined);
    return keys.length ? keys.map(k => `[data-${k}="${CSS.escape(el.dataset[k])}"]`).join('') : '';
}

function renderBar() {
    const pick = document.getElementById('cs-pick');
    pick.innerHTML = chars.length
        ? chars.map(c => `<option value="${esc(c.id)}"${cur && c.id === cur.id ? ' selected' : ''}>${esc(c.name || 'Unnamed hero')} · ${esc(pcLine(c))}</option>`).join('')
        : '<option value="">No characters yet</option>';
    pick.disabled = !chars.length;
    const id = cur ? encodeURIComponent(cur.id) : '';
    document.getElementById('cs-links').innerHTML = cur ? `<a class="cs-btn" href="pathfinder-character-builder?char=${id}">✏️ Edit in Builder</a>
        ${pcCasting(cur) ? `<a class="cs-btn" href="pathfinder-spell-planner?char=${id}">🃏 Spell Planner</a>` : ''}
        <button type="button" class="cs-btn" data-act="print">🖨️ Print</button>
        ${!pcParts(cur).cls ? '' : loadParty().some(m => m.id === cur.id)
            ? `<span class="cs-linked" title="Hit Points and conditions show on the Party Tracker and in the Initiative tracker when they're open in this browser">👥 In the party: the GM's tools follow this sheet</span>`
            : `<button type="button" class="cs-btn" data-act="party" title="Put this character on the Party Tracker, where the GM's tools follow this sheet">👥 Add to Party</button>`}` : '';
}

// Open a character and fit its play state (saving only if that changed anything).
function openChar(c) {
    cur = c;
    notice = null;
    lastRoll = null;
    if (cur) {
        const before = JSON.stringify(cur.play);
        ppFit(cur);
        if (JSON.stringify(cur.play) !== before) save();
        else pushLive();
        try { history.replaceState(null, '', location.pathname + '?char=' + encodeURIComponent(cur.id)); } catch (e) {}
        // Granted spells (bloodline, mystery, school...) come from the rules text: load it, then redraw.
        if (pcCasting(cur) || Object.keys(cur.feats).length) pcLoadText(() => {
            if (!cur) return;
            const fp = derive(cur).focus.points;
            if (cur.play.focus > fp) { cur.play.focus = fp; save(); }
            render();
        });
    }
    render();
}

function readAmount() {
    const n = Math.round(Number(amount));
    return Number.isFinite(n) && n > 0 ? Math.min(999, n) : 0;
}

// ── Clicks ───────────────────────────────────────────────
function onClick(e) {
    const b = e.target.closest('[data-act]');
    if (!b || b.disabled || !cur) return;
    const act = b.dataset.act, v = b.dataset.v, i = Number(b.dataset.i), n = Number(b.dataset.n);
    const d = derive(cur), s = d.s;
    const filled = b.dataset.f === '1';

    if (act === 'mode') { mode = v; renderRollbar(); return; }
    if (act === 'print') { window.print(); return; }
    if (act === 'party') { addToParty(); return; }
    if (act === 'init') { doRoll(`1d20${plus(adj(cur, s.per, { kind: 'per' }).v)}`, 'initiative (Perception)'); return; }
    if (act === 'save') { doRoll(`1d20${plus(adj(cur, s.saves[v], { kind: v }).v)}`, `${PC_SAVES[v][0]} save`); return; }
    if (act === 'skill') {
        const lore = v.startsWith('lore:') ? v.slice(5) : '';
        const total = lore ? s.loreMods[lore] : s.skills[v];
        if (total === undefined) return;
        doRoll(`1d20${plus(adj(cur, total, { kind: 'skill', abil: lore ? 'int' : PC_SKILLS[v] }).v)}`, lore || pcCap(v));
        return;
    }
    if (act === 'spellatk') { doRoll(`1d20${plus(adj(cur, s.spellAtk, { kind: 'spell', abil: s.cast.attr }).v)}`, 'spell attack'); return; }
    if (act === 'atk') {
        const x = s.strikes[i];
        const hit = x.atk[n] + ppPenalty(cur, { kind: 'attack', abil: ppStrikeAbil(cur, s, x) }).n;
        doRoll(`1d20${plus(hit)}`, `${x.name} Strike${n ? ` (${ord(n + 1)} attack)` : ''}`);
        return;
    }
    if (act === 'dmg') { const x = s.strikes[i], dm = strikeDamage(cur, d, x); doRoll(dm.f, `${x.name} damage${dm.type ? ` (${dm.type})` : ''}`, false); return; }
    if (act === 'crit') { critRoll(cur, d, s.strikes[i]); return; }
    if (act === 'reroll') {
        if (!lastRoll || !cur.play.hero) return;
        const { f, label, mode: m } = lastRoll;
        cur.play.hero -= 1;
        save();
        const keep = mode;
        mode = m;
        doRoll(f, label, true, true);
        mode = keep;
        render();
        return;
    }
    if (act === 'notice-off') { notice = null; render(); return; }

    if (act === 'damage' || act === 'heal' || act === 'temp') {
        const amt = readAmount();
        if (!amt) { flash('Type an amount first.', true); document.getElementById('cs-amt').focus(); return; }
        amount = '';
        change(() => {
            if (act === 'temp') { ppTempHp(cur, amt); notice = null; return; }
            if (act === 'heal') {
                const got = ppHeal(cur, s, amt);
                notice = got ? { text: `💚 +${got} Hit Points.${ppCond(cur, 'Wounded') ? ` Wounded ${ppCond(cur, 'Wounded')}.` : ''}`, ok: true } : { text: ppDead(cur) ? 'The dead can\'t be healed.' : 'Already at full Hit Points.', ok: false };
                return;
            }
            const r = ppDamage(cur, s, amt, v === 'crit');
            const bits = [];
            if (r.temp) bits.push(`${r.temp} taken by temporary HP`);
            if (r.hp) bits.push(`−${r.hp} HP`);
            let text = `🗡️ ${amt} damage${bits.length ? ': ' + bits.join(', ') : ''}.`;
            if (r.massive) text += ' Massive damage (double your maximum in one blow): dead.';
            else if (r.dead) text += ` Dying ${r.dying}: dead.`;
            else if (r.down) text += ` Knocked out: dying ${r.dying}, unconscious.`;
            else if (r.dying) text += ` Hurt while dying: dying ${r.dying}.`;
            notice = { text, ok: false };
        });
        return;
    }
    if (act === 'recovery') {
        const roll = doRoll('1d20', `recovery check (DC ${10 + ppCond(cur, 'Dying')})`, false);
        if (!roll) return;
        change(() => {
            const r = ppRecovery(cur, roll.total);
            const what = r.dead ? 'dead.' : r.stable ? `stable at 0 HP, wounded ${ppCond(cur, 'Wounded')}.` : `dying ${r.dying}.`;
            notice = { text: `🎲 ${roll.total}: ${PP_DEGREES[r.degree].toLowerCase()}, ${what}`, ok: r.stable };
        });
        return;
    }
    if (act === 'heroic') {
        change(() => { if (ppHeroicRecovery(cur)) notice = { text: '⭐ Heroic Recovery: no longer dying, stable at 0 HP. Wounded didn\'t go up.', ok: true }; });
        return;
    }
    if (act === 'refocus') { change(() => { ppRefocus(cur); }); flash('🧘 Refocused: 1 Focus Point back.'); return; }
    if (act === 'rest') {
        if (Date.now() - restArmed > 3000) { restArmed = Date.now(); render(); setTimeout(render, 3100); return; }
        restArmed = 0;
        let back = [];
        change(() => { back = ppRest(cur, s); });
        notice = { text: `🛌 Rested and prepared. ${back.length ? 'Back: ' + back.join(', ') + '.' : 'Nothing needed restoring.'}`, ok: true };
        render();
        return;
    }
    if (act === 'session') { change(p => { p.hero = 1; }); flash('⭐ New session: 1 Hero Point.'); return; }
    if (act === 'hero') { change(p => { p.hero = Math.max(0, Math.min(3, p.hero + (filled ? -1 : 1))); }); return; }
    if (act === 'endturn') {
        let what = '';
        change(() => { what = ppEndTurn(cur); });
        flash(what ? `⏭️ Turn over: ${what}.` : '⏭️ Turn over.');
        return;
    }
    if (act === 'cond') {
        change(() => {
            const on = !ppCond(cur, v);
            ppSetCond(cur, v, on ? 1 : 0);
            // Unconscious knocks you prone; dying makes you unconscious.
            if (on && v === 'Unconscious') ppSetCond(cur, 'Prone', 1);
            if (on && v === 'Dying') ppSetCond(cur, 'Unconscious', 1);
        });
        return;
    }
    if (act === 'cstep') { change(() => { ppSetCond(cur, v, ppCond(cur, v) + n); }); return; }
    if (act === 'slot') { change(p => { const r = Number(v); p.slots[r] = Math.max(0, (p.slots[r] || 0) + (filled ? 1 : -1)); if (!p.slots[r]) delete p.slots[r]; }); return; }
    if (act === 'prep') {
        change(p => {
            const list = new Set(p.cast[v] || []);
            if (list.has(i)) list.delete(i); else list.add(i);
            p.cast[v] = [...list].sort((a, b) => a - b);
            if (!p.cast[v].length) delete p.cast[v];
        });
        return;
    }
    if (act === 'font') { change(p => { p.font = Math.max(0, p.font + (filled ? 1 : -1)); }); return; }
    if (act === 'focus') { change(p => { p.focus = Math.max(0, Math.min(3, p.focus + (filled ? 1 : -1))); }); return; }
    if (act === 'res') { change(p => { const r = p.res[Number(v)]; if (r) r.used = Math.max(0, Math.min(r.max, r.used + (filled ? 1 : -1))); }); return; }
    if (act === 'resn') { change(p => { const r = p.res[Number(v)]; if (r) r.used = Math.max(0, Math.min(r.max, r.used + n)); }); return; }
    if (act === 'res-del') { change(p => { p.res.splice(Number(v), 1); }); return; }
    if (act === 'res-add') {
        const name = addForm.n.trim().slice(0, 40);
        const max = Math.min(99, Math.max(1, Math.round(Number(addForm.max)) || 1));
        if (!name) { flash('Give the counter a name.', true); document.getElementById('pp-res-n').focus(); return; }
        change(p => { p.res.push({ n: name, max, used: 0, day: addForm.day }); });
        addForm = { n: '', max: '1', day: addForm.day };
        render();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    chars = pcLoadAll();
    const asked = new URLSearchParams(location.search).get('char');
    openChar(chars.find(c => c.id === asked) || chars[0] || null);

    const sheet = document.getElementById('cs-sheet');
    sheet.addEventListener('click', onClick);
    document.getElementById('cs-links').addEventListener('click', onClick);
    sheet.addEventListener('input', e => {
        if (e.target.id === 'cs-amt') amount = e.target.value.slice(0, 4);
        if (e.target.id === 'pp-res-n') addForm.n = e.target.value.slice(0, 40);
        if (e.target.id === 'pp-res-max') addForm.max = e.target.value.slice(0, 3);
    });
    sheet.addEventListener('change', e => { if (e.target.id === 'pp-res-day') addForm.day = e.target.checked; });
    sheet.addEventListener('keydown', e => {
        if (e.key !== 'Enter') return;
        if (e.target.id === 'pp-res-n' || e.target.id === 'pp-res-max') { e.preventDefault(); sheet.querySelector('[data-act="res-add"]').click(); }
        if (e.target.id === 'cs-amt') e.preventDefault();
    });
    document.getElementById('cs-pick').addEventListener('change', e => {
        const c = chars.find(x => x.id === e.target.value);
        if (c) openChar(c);
    });

    // The roll bar sticks just under the nav when the nav sticks too.
    const navOffset = () => {
        const nav = document.querySelector('.main-nav');
        const h = nav && getComputedStyle(nav).position === 'sticky' ? nav.offsetHeight : 0;
        document.documentElement.style.setProperty('--cs-nav', h + 'px');
    };
    navOffset();
    window.addEventListener('resize', navOffset);

    window.addEventListener('gazette-dice', renderLog);
    window.addEventListener('storage', e => {
        if (e.key === DICE_HISTORY_KEY) { renderLog(); return; }
        if (e.key === PARTY_KEY) { renderBar(); return; }
        if (e.key !== PC_KEY && e.key !== null) return;
        chars = pcLoadAll();
        const same = cur && chars.find(x => x.id === cur.id);
        if (same) { cur = same; ppFit(cur); render(); } else openChar(chars[0] || null);
    });
});
