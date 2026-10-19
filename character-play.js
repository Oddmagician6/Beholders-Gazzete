/* ============================================
   CHARACTER PLAY RULES (F59): page-free rules for the Play Sheet.
   A character's session state is c.play (shape in cbPlayBlank, cleaned by
   cbPlayClean in character-engine.js), so it saves, exports, and backs up
   with the character. cbResources lists the class and race resources the
   character has at its level (SRD 5.1); cbPlayFit trims the state to what the
   level allows after a level change; the rest of this file is hit points,
   death saves, hit dice, and the two rests.
   Needs character-data.js and character-engine.js; rolls use rollDice() (dice-engine.js).
   ============================================ */

const CB_EXHAUSTION = ['', 'Disadvantage on ability checks.', 'Speed halved.', 'Disadvantage on attack rolls and saving throws.', 'Hit point maximum halved.', 'Speed reduced to 0.', 'Death.'];

// [{ id, name, max, recharge: 'short' | 'long' | 'none', note, pool, heal, dc }]
// pool: spent a point at a time (ki, sorcery points, lay on hands).
// heal: a formula the resource heals the character by when used.
// dc: counts uses that raise a DC (Relentless Rage) rather than spending a charge.
function cbResources(c, d = cbDerive(c)) {
    const L = c.level, m = d.m, out = [];
    const add = (id, name, max, recharge, note = '', more = {}) => { if (max > 0) out.push({ id, name, max, recharge, note, ...more }); };
    const at = (cls, lv) => c.cls === cls && L >= lv;

    if (at('barbarian', 1) && L < 20) add('rage', 'Rage', d.x.rages, 'long', `+${d.x.rageDmg} melee damage, 1 minute`);
    if (at('barbarian', 11)) add('relentless', 'Relentless Rage', 6, 'short', 'CON save at 0 hit points while raging', { dc: true });
    if (at('bard', 1)) add('inspiration', 'Bardic Inspiration', Math.max(1, m.cha), L >= 5 ? 'short' : 'long', `d${L >= 15 ? 12 : L >= 10 ? 10 : L >= 5 ? 8 : 6}`);
    if (at('cleric', 2)) add('channel', 'Channel Divinity', L >= 18 ? 3 : L >= 6 ? 2 : 1, 'short', `Turn Undead (DC ${d.x.dc('wis')}) or Preserve Life (${5 * L} HP)`);
    if (at('cleric', 10)) add('intervention', 'Divine Intervention', 1, 'none', L >= 20 ? 'Always works; once per 7 days' : `${L}% chance; 7 days if it works, a long rest if not`);
    if (at('druid', 2) && L < 20) add('wild-shape', 'Wild Shape', 2, 'short', `CR ${L >= 8 ? 1 : L >= 4 ? '1/2' : '1/4'}, up to ${Math.floor(L / 2)} hours`);
    if (at('druid', 2)) add('natural-recovery', 'Natural Recovery', 1, 'long', `On a short rest: regain spent slots totaling up to ${Math.ceil(L / 2)} levels (none 6th+). Tap the used slots to get them back.`);
    if (at('fighter', 1)) add('second-wind', 'Second Wind', 1, 'short', `Bonus action: regain 1d10 + ${L} HP`, { heal: `1d10+${L}` });
    if (at('fighter', 2)) add('action-surge', 'Action Surge', L >= 17 ? 2 : 1, 'short', L >= 17 ? 'Once per turn' : 'One more action');
    if (at('fighter', 9)) add('indomitable', 'Indomitable', L >= 17 ? 3 : L >= 13 ? 2 : 1, 'long', 'Reroll a failed save');
    if (at('monk', 2)) add('ki', 'Ki Points', L, 'short', `Save DC ${d.x.dc('wis')}`, { pool: true });
    if (at('monk', 6)) add('wholeness', 'Wholeness of Body', 1, 'long', `Action: regain ${3 * L} HP`, { heal: String(3 * L) });
    if (at('paladin', 1)) add('divine-sense', 'Divine Sense', 1 + Math.max(0, m.cha), 'long', 'Sense celestials, fiends, and undead within 60 ft.');
    if (at('paladin', 1)) add('lay-on-hands', 'Lay on Hands', 5 * L, 'long', 'Heal by touch; 5 points cure a disease or poison', { pool: true });
    if (at('paladin', 3)) add('channel', 'Channel Divinity', 1, 'short', `Sacred Weapon (+${Math.max(1, m.cha)} to hit) or Turn the Unholy (DC ${d.x.dc('cha')})`);
    if (at('paladin', 14)) add('cleansing', 'Cleansing Touch', Math.max(1, m.cha), 'long', 'End one spell on a willing creature');
    if (at('paladin', 20)) add('nimbus', 'Holy Nimbus', 1, 'long', '1 minute of sunlight that burns enemies');
    if (at('rogue', 20)) add('stroke-of-luck', 'Stroke of Luck', 1, 'short', 'A miss becomes a hit, or a check becomes a 20');
    if (at('sorcerer', 2)) add('sorcery', 'Sorcery Points', L, 'long', L >= 20 ? 'Sorcerous Restoration: 4 back on a short rest' : 'Font of Magic: trade for slots', { pool: true });
    if (at('warlock', 6)) add('own-luck', "Dark One's Own Luck", 1, 'short', 'Add a d10 to a check or save');
    if (at('warlock', 14)) add('hurl', 'Hurl Through Hell', 1, 'long', '10d10 psychic to a creature you hit');
    if (at('warlock', 20)) add('eldritch-master', 'Eldritch Master', 1, 'long', 'Spend a minute to regain all pact slots');
    if (d.magic && d.magic.rules.arcanum.length) d.magic.rules.arcanum.forEach(lv => add('arcanum-' + lv, `Mystic Arcanum (${cbOrd(lv)})`, 1, 'long', c.spells.arcanum[lv] || 'No spell picked yet'));
    if (at('wizard', 1)) add('arcane-recovery', 'Arcane Recovery', 1, 'long', `On a short rest: regain spent slots totaling up to ${Math.ceil(L / 2)} levels (none 6th+). Tap the used slots to get them back.`);
    if (at('wizard', 20)) add('signature', 'Signature Spells', 2, 'short', 'Each 3rd-level signature spell once, without a slot');

    if (c.race === 'dragonborn' && d.breath) add('breath', 'Breath Weapon', 1, 'short', `${d.breath.dice} ${d.breath.dmg}, DC ${d.x.dc('con')} ${d.breath.save.toUpperCase()}`);
    if (c.race === 'half-orc') add('relentless-endurance', 'Relentless Endurance', 1, 'long', 'Drop to 1 hit point instead of 0');
    if (c.race === 'tiefling' && L >= 3) add('hellish-rebuke', 'Hellish Rebuke', 1, 'long', 'Cast it at 2nd level without a slot');
    if (c.race === 'tiefling' && L >= 5) add('darkness', 'Darkness', 1, 'long', 'Cast it without a slot');
    return out;
}

// Hit point maximum after exhaustion (level 4 halves it).
function cbPlayMax(c, d) {
    return c.play.exh >= 4 ? Math.max(1, Math.floor(d.hp / 2)) : d.hp;
}

function cbPlayHp(c, d) {
    const max = cbPlayMax(c, d);
    return c.play.hp === null ? max : Math.min(max, c.play.hp);
}

// Speed after exhaustion and conditions that stop movement.
function cbPlaySpeed(c, d) {
    const p = c.play;
    if (p.exh >= 5 || ['Grappled', 'Restrained', 'Paralyzed', 'Petrified', 'Stunned', 'Unconscious'].some(n => p.cond.includes(n))) return 0;
    return p.exh >= 2 ? Math.floor(d.speed / 2) : d.speed;
}

// Trim the state to the character's level now (after a level change or an edit in the builder).
function cbPlayFit(c, d = cbDerive(c)) {
    const p = c.play;
    p.hd = Math.min(p.hd, c.level);
    const slots = d.magic && !d.magic.pact ? d.magic.slots : [];
    p.slots = p.slots.map((used, i) => Math.min(used, slots[i] || 0));
    p.pact = Math.min(p.pact, d.magic && d.magic.pact ? d.magic.pact[0] : 0);
    const res = {};
    cbResources(c, d).forEach(r => { if (p.res[r.id]) res[r.id] = Math.min(p.res[r.id], r.max); });
    p.res = res;
    if (p.hp !== null && p.hp >= cbPlayMax(c, d)) p.hp = null;
    if (p.conc && !cbSpellsKnownAll(c).concat(d.magic ? d.magic.always : [], Object.values(c.spells.arcanum), cbRaceSpells(c).map(s => s.name)).includes(p.conc)) p.conc = '';
    return c;
}

// ── Hit points ───────────────────────────────────────────
// → { temp: absorbed by temporary HP, hp: lost, down, dead, failed, conc: DC or 0 }
function cbDamage(c, d, n) {
    const p = c.play, max = cbPlayMax(c, d);
    n = Math.max(0, Math.round(n));
    const out = { temp: Math.min(p.temp, n), hp: 0, down: false, dead: false, failed: false, conc: 0 };
    if (!n) return out;
    p.temp -= out.temp;
    const rest = n - out.temp;
    const before = cbPlayHp(c, d);
    if (p.conc) out.conc = Math.max(10, Math.floor(n / 2));
    if (before === 0) {
        // Damage at 0 hit points is a failed death save (massive damage kills outright).
        if (rest >= max) { out.dead = true; p.ds = [0, 3]; }
        else if (rest > 0) { p.ds[1] = Math.min(3, p.ds[1] + 1); out.failed = true; }
        if (p.ds[1] >= 3) out.dead = true;
        return out;
    }
    out.hp = Math.min(before, rest);
    p.hp = before - out.hp;
    if (p.hp === 0) {
        out.down = true;
        p.ds = [0, 0];
        if (rest - out.hp >= max) { out.dead = true; p.ds = [0, 3]; }
    }
    return out;
}

// → hit points actually regained
function cbHeal(c, d, n) {
    const p = c.play, max = cbPlayMax(c, d), before = cbPlayHp(c, d);
    n = Math.max(0, Math.round(n));
    if (!n) return 0;
    if (before === 0) p.ds = [0, 0];
    const after = Math.min(max, before + n);
    p.hp = after >= max ? null : after;
    return after - before;
}

// Temporary hit points don't stack: keep whichever is higher.
function cbTempHp(c, n) {
    c.play.temp = Math.max(c.play.temp, Math.min(9999, Math.max(0, Math.round(n))));
}

// A death save from a rolled d20 → 'revived' | 'stable' | 'dead' | 'success' | 'fail'
function cbDeathSave(c, d, v) {
    const p = c.play;
    if (v === 20) { p.ds = [0, 0]; p.hp = Math.min(1, cbPlayMax(c, d)); return 'revived'; }
    if (v >= 10) p.ds[0] = Math.min(3, p.ds[0] + 1);
    else p.ds[1] = Math.min(3, p.ds[1] + (v === 1 ? 2 : 1));
    if (p.ds[1] >= 3) return 'dead';
    if (p.ds[0] >= 3) return 'stable';
    return v >= 10 ? 'success' : 'fail';
}

// ── Rests ────────────────────────────────────────────────
// Spend one hit die → { roll, healed } or null when none are left.
// roll: formula → a rollDice() result (the page passes one that records the roll).
function cbSpendHitDie(c, d, roll = f => rollDice(f)) {
    if (!d.k || c.play.hd >= c.level) return null;
    const con = d.m.con;
    const r = roll(`1d${d.k.hd}${con ? (con > 0 ? '+' : '') + con : ''}`);
    c.play.hd += 1;
    return { roll: r, healed: cbHeal(c, d, Math.max(0, r.total)) };
}

// → the names of what came back
function cbShortRest(c, d = cbDerive(c)) {
    const p = c.play, back = [];
    if (p.pact) { back.push('pact slots'); p.pact = 0; }
    cbResources(c, d).forEach(r => {
        if (!p.res[r.id]) return;
        if (r.recharge === 'short') { delete p.res[r.id]; back.push(r.name); }
        else if (r.id === 'sorcery' && c.level >= 20) { p.res[r.id] = Math.max(0, p.res[r.id] - 4); back.push('4 sorcery points'); }
    });
    return back;
}

function cbLongRest(c, d = cbDerive(c)) {
    const p = c.play, back = [];
    const hdBack = Math.min(p.hd, Math.max(1, Math.floor(c.level / 2)));
    if (p.exh) { p.exh -= 1; back.push('one level of exhaustion'); }
    if (cbPlayHp(c, d) < cbPlayMax(c, d) || p.hp !== null) back.push('hit points');
    p.hp = null;
    p.temp = 0;
    p.ds = [0, 0];
    if (hdBack) { p.hd -= hdBack; back.push(`${hdBack} hit ${hdBack > 1 ? 'dice' : 'die'}`); }
    if (p.slots.some(Boolean) || p.pact) back.push('spell slots');
    p.slots = p.slots.map(() => 0);
    p.pact = 0;
    cbResources(c, d).forEach(r => { if (p.res[r.id] && r.recharge !== 'none') { delete p.res[r.id]; back.push(r.name); } });
    p.conc = '';
    return back;
}
