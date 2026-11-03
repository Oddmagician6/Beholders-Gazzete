/* ============================================
   PATHFINDER PLAY RULES (ROADMAP L3 P5.4): page-free rules for the Pathfinder Play Sheet.
   A character's session state is c.play (shape in pcBlankPlay, cleaned by pcCleanPlay in
   pf2e-character.js), so it saves, exports, and backs up with the character. Conditions are
   kept the way the Initiative tracker keeps them ("Frightened 2"), so the party push copies them
   as they are. Player Core rules: knocked out at 0 HP (dying 1, 2 on a critical hit, plus
   wounded), recovery checks, death at dying 4 less doomed, massive damage at double the HP
   maximum, drained lowering the maximum, Heroic Recovery, Refocus, and a night's rest with daily
   preparations. ppPenalty works out the status and circumstance penalties conditions put on a
   roll or DC (only the worst of each kind counts).
   Needs pf2e-character.js (pcStats, pcCasting) and PF2E_CONDITIONS (rules-pf2e.js).
   ============================================ */

// Conditions that leave you no Speed to use.
const PP_NO_MOVE = ['Grabbed', 'Immobilized', 'Paralyzed', 'Petrified', 'Restrained', 'Unconscious'];
// Conditions that make you off-guard on top of their own effect.
const PP_OFF_GUARD = ['Off-Guard', 'Confused', 'Grabbed', 'Paralyzed', 'Prone', 'Restrained', 'Unconscious'];
// The attribute each kind of roll uses (skills, Strikes, and spells pass their own).
const PP_KIND_ABIL = { ac: 'dex', fort: 'con', ref: 'dex', will: 'wis', per: 'wis' };

// A condition's value: its number, 1 for one without a value, 0 when you don't have it.
function ppCond(c, name) {
    const s = c.play.cond.find(x => x === name || x.startsWith(name + ' '));
    if (!s) return 0;
    const m = / (\d)$/.exec(s);
    return m ? Number(m[1]) : 1;
}

// Set a condition's value (0 takes it off), capped at its maximum.
function ppSetCond(c, name, v) {
    const def = PF2E_CONDITIONS[name];
    if (!def) return;
    const list = c.play.cond.filter(x => x !== name && !x.startsWith(name + ' '));
    v = Math.max(0, Math.round(v));
    if (v > 0) list.push(def.max ? `${name} ${Math.min(v, def.max)}` : name);
    c.play.cond = list.sort();
}

// ── Hit points ───────────────────────────────────────────
// The HP maximum, less level × drained.
function ppMax(c, s = pcStats(c)) {
    return Math.max(1, s.hp - c.level * ppCond(c, 'Drained'));
}

function ppHp(c, s = pcStats(c)) {
    const max = ppMax(c, s);
    return c.play.hp === null ? max : Math.min(max, c.play.hp);
}

// You die at dying 4, less your doomed value.
function ppDeathAt(c) {
    return Math.max(1, 4 - ppCond(c, 'Doomed'));
}

function ppDead(c) {
    return ppCond(c, 'Dying') >= ppDeathAt(c);
}

// Knocked out: dying 1 (2 from a critical hit) plus your wounded value, and unconscious.
function ppKnockOut(c, crit) {
    ppSetCond(c, 'Dying', (crit ? 2 : 1) + ppCond(c, 'Wounded'));
    ppSetCond(c, 'Unconscious', 1);
}

// Losing dying (by healing or a recovery check) makes you wounded 1, or 1 more.
function ppEndDying(c, wound = true) {
    if (!ppCond(c, 'Dying')) return;
    ppSetCond(c, 'Dying', 0);
    if (wound) ppSetCond(c, 'Wounded', ppCond(c, 'Wounded') + 1);
}

// → { temp: absorbed by temporary HP, hp: lost, down, dead, dying: value after, massive }
function ppDamage(c, s, n, crit = false) {
    const p = c.play, max = ppMax(c, s);
    n = Math.max(0, Math.round(n));
    const out = { temp: Math.min(p.temp, n), hp: 0, down: false, dead: false, dying: ppCond(c, 'Dying'), massive: false };
    if (!n) return out;
    p.temp -= out.temp;
    const rest = n - out.temp;
    const before = ppHp(c, s);
    if (rest >= 2 * max) {
        // Massive damage: double the HP maximum in one blow kills outright.
        p.hp = 0;
        ppSetCond(c, 'Dying', ppDeathAt(c));
        Object.assign(out, { hp: before, down: before > 0, dead: true, massive: true, dying: ppCond(c, 'Dying') });
        return out;
    }
    if (!rest) return out;
    out.hp = Math.min(before, rest);
    p.hp = before - out.hp;
    if (p.hp === 0) {
        // Hurt while dying: 1 more (2 on a critical hit). At 0 HP but stable: knocked out again.
        if (before === 0 && ppCond(c, 'Dying')) ppSetCond(c, 'Dying', ppCond(c, 'Dying') + (crit ? 2 : 1));
        else ppKnockOut(c, crit);
        out.down = before > 0;
    }
    out.dying = ppCond(c, 'Dying');
    out.dead = ppDead(c);
    return out;
}

// → HP actually regained. Healing from 0 HP ends dying (wounded goes up) and wakes you.
function ppHeal(c, s, n) {
    const p = c.play, max = ppMax(c, s), before = ppHp(c, s);
    n = Math.max(0, Math.round(n));
    if (!n || ppDead(c)) return 0;
    const after = Math.min(max, before + n);
    p.hp = after >= max ? null : after;
    if (before === 0) {
        ppEndDying(c);
        ppSetCond(c, 'Unconscious', 0);
    }
    return after - before;
}

// Temporary HP don't stack: keep whichever is higher.
function ppTempHp(c, n) {
    c.play.temp = Math.max(c.play.temp, Math.min(9999, Math.max(0, Math.round(n))));
}

// A degree of success from a d20 roll's total against a DC, with a natural 20 one step
// better and a natural 1 one step worse. 3 critical success, 2 success, 1 failure, 0 critical failure.
function ppDegree(total, dc, nat) {
    let d = total >= dc + 10 ? 3 : total >= dc ? 2 : total <= dc - 10 ? 0 : 1;
    if (nat === 20) d = Math.min(3, d + 1);
    if (nat === 1) d = Math.max(0, d - 1);
    return d;
}
const PP_DEGREES = ['Critical failure', 'Failure', 'Success', 'Critical success'];

// A recovery check (flat check, DC 10 + dying) from the d20 → { degree, dying, dead, stable }.
// Critical success: dying 2 less; success 1 less; failure 1 more; critical failure 2 more.
function ppRecovery(c, v) {
    const dying = ppCond(c, 'Dying');
    const degree = ppDegree(v, 10 + dying, v);
    const next = dying + [2, 1, -1, -2][degree];
    if (next <= 0) ppEndDying(c);
    else ppSetCond(c, 'Dying', next);
    return { degree, dying: ppCond(c, 'Dying'), dead: ppDead(c), stable: next <= 0 };
}

// Heroic Recovery: spend every Hero Point (at least 1) to lose dying, at 0 HP, with no wounded for it.
function ppHeroicRecovery(c) {
    if (!c.play.hero || !ppCond(c, 'Dying') || ppDead(c)) return false;
    c.play.hero = 0;
    ppEndDying(c, false);
    return true;
}

// ── What conditions do to a roll ──────────────────────────
// what: { kind: 'ac' | 'fort' | 'ref' | 'will' | 'per' | 'skill' | 'attack' | 'spell' | 'damage', abil }
// → { n: the total penalty (0 or less), why: ['frightened 2', ...] }. Status penalties don't stack
// with each other, nor circumstance penalties: only the worst of each kind counts.
function ppPenalty(c, what) {
    const { kind } = what;
    const abil = what.abil || PP_KIND_ABIL[kind] || '';
    const v = n => ppCond(c, n);
    const status = [], circ = [];
    const add = (list, n, why) => { if (n > 0) list.push([n, why]); };
    if (kind !== 'damage') {
        add(status, v('Frightened'), `frightened ${v('Frightened')}`);
        add(status, v('Sickened'), `sickened ${v('Sickened')}`);
    }
    if (abil === 'dex' && kind !== 'damage') {
        add(status, v('Clumsy'), `clumsy ${v('Clumsy')}`);
        if (v('Encumbered')) add(status, 1, 'encumbered (clumsy 1)');
    }
    if (abil === 'str') add(status, v('Enfeebled'), `enfeebled ${v('Enfeebled')}`);
    if (abil === 'con' && kind !== 'damage') add(status, v('Drained'), `drained ${v('Drained')}`);
    if (['int', 'wis', 'cha'].includes(abil) && kind !== 'damage') add(status, v('Stupefied'), `stupefied ${v('Stupefied')}`);
    if (['ac', 'fort', 'ref', 'will'].includes(kind)) add(status, v('Fatigued'), 'fatigued');
    if (['ac', 'per', 'ref'].includes(kind)) add(status, v('Unconscious') * 4, 'unconscious');
    if (kind === 'per') add(status, v('Blinded') * 4, 'blinded');
    if (kind === 'per' || kind === 'skill') add(status, v('Fascinated') * 2, 'fascinated');
    if (kind === 'ac') {
        const og = PP_OFF_GUARD.find(n => v(n));
        if (og) add(circ, 2, og === 'Off-Guard' ? 'off-guard' : `off-guard (${og.toLowerCase()})`);
    }
    if (kind === 'attack') add(circ, v('Prone') * 2, 'prone');
    const worst = list => list.reduce((a, b) => (b[0] > a[0] ? b : a), [0, '']);
    const s = worst(status), k = worst(circ);
    return { n: -(s[0] + k[0]), why: [s, k].filter(x => x[0]).map(x => `−${x[0]} ${x[1]}`) };
}

// The attribute a Strike's attack roll uses (pcStrikes picks the same one).
function ppStrikeAbil(c, s, x) {
    if (x.ranged) return 'dex';
    return x.traits.includes('finesse') && s.mods.dex > s.mods.str ? 'dex' : 'str';
}

// Speed after conditions and encumbrance.
function ppSpeed(c, s = pcStats(c)) {
    if (PP_NO_MOVE.some(n => ppCond(c, n))) return 0;
    return Math.max(5, s.speed - (ppCond(c, 'Encumbered') ? 10 : 0));
}

// ── Turns and rests ───────────────────────────────────────
// The end of your turn: frightened drops by 1. → what changed, or ''.
function ppEndTurn(c) {
    const f = ppCond(c, 'Frightened');
    if (!f) return '';
    ppSetCond(c, 'Frightened', f - 1);
    return f > 1 ? `frightened ${f - 1}` : 'no longer frightened';
}

// Refocus (10 minutes): 1 Focus Point back. → false when the pool is full.
function ppRefocus(c) {
    if (!c.play.focus) return false;
    c.play.focus -= 1;
    return true;
}

// A full night's rest and daily preparations → the names of what came back.
// HP: Constitution modifier (at least 1) × level. Drained and doomed drop by 1, fatigued ends,
// and slots, the font, Focus Points, and daily counters refill. Wounded stays (Treat Wounds or full HP and rest end it).
function ppRest(c, s = pcStats(c)) {
    const p = c.play, back = [];
    ['Drained', 'Doomed'].forEach(n => { const v = ppCond(c, n); if (v) { ppSetCond(c, n, v - 1); back.push(`${n.toLowerCase()} ${v} → ${v - 1 || 'gone'}`); } });
    if (ppCond(c, 'Fatigued')) { ppSetCond(c, 'Fatigued', 0); back.push('fatigue'); }
    if (!ppDead(c)) {
        const got = ppHeal(c, s, Math.max(1, s.mods.con) * c.level);
        if (got) back.push(`${got} HP`);
    }
    if (Object.keys(p.slots).length || Object.keys(p.cast).length) back.push('spell slots');
    if (p.font) back.push('divine font');
    if (p.focus) back.push('Focus Points');
    p.slots = {};
    p.cast = {};
    p.font = 0;
    p.focus = 0;
    p.res.forEach(r => { if (r.day && r.used) { r.used = 0; back.push(r.n); } });
    return back;
}

// Trim the state to what the character has now (after a level change or an edit in the builder).
// focusMax: the pool's size (pcFocus), which needs the spell data; left out, focus stays as it is.
function ppFit(c, s = pcStats(c), focusMax = null) {
    const p = c.play, cast = s.cast;
    const slots = cast ? cast.slots : [];
    const slotsOut = {}, castOut = {};
    Object.entries(p.slots).forEach(([r, n]) => { const m = Math.min(n, slots[r - 1] || 0); if (m) slotsOut[r] = m; });
    Object.entries(p.cast).forEach(([r, list]) => { const keep = list.filter(i => i < (slots[r - 1] || 0)); if (keep.length) castOut[r] = keep; });
    p.slots = slotsOut;
    p.cast = castOut;
    p.font = Math.min(p.font, cast && cast.font ? cast.font.n : 0);
    if (focusMax !== null) p.focus = Math.min(p.focus, focusMax);
    if (p.hp !== null && p.hp >= ppMax(c, s)) p.hp = null;
    return c;
}

// What the Play Sheet pushes to the GM's tools (party.js partyPushLive). Dying and wounded ride
// in the conditions, as the Initiative tracker keeps them; there are no death saves to send.
function ppPartyLive(c, s = pcStats(c)) {
    const p = c.play;
    return { hp: ppHp(c, s), max: ppMax(c, s), temp: p.temp, conds: p.cond.slice(), exh: 0, conc: '', ds: [0, 0], at: Date.now() };
}
