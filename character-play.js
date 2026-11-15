/* ============================================
   CHARACTER PLAY RULES (F59): page-free rules for the Play Sheet.
   A character's session state is c.play (shape in cbPlayBlank, cleaned by
   cbPlayClean in character-engine.js), so it saves, exports, and backs up
   with the character. cbResources lists the class and race resources the
   character has at its level (SRD 5.1, or SRD 5.2 for a 2024 character: cbResources24, where
   recharge 'one' means one use back on a short rest and all on a long rest; 2024 exhaustion is
   −2 to d20 Tests and −5 ft. speed a level, and a long rest gives back every hit die); cbPlayFit trims the state to what the
   level allows after a level change; the rest of this file is hit points,
   death saves, hit dice, the two rests, and (F60) what the character carries:
   weight, encumbrance, packs, magic items and attunement, and the coin purse.
   Needs character-data.js and character-engine.js; rolls use rollDice() (dice-engine.js),
   the purse COIN_CP (coins.js), and magic items MAGIC_ITEM_TEXT (magic-items-data.js).
   ============================================ */

const CB_EXHAUSTION = ['', 'Disadvantage on ability checks.', 'Speed halved.', 'Disadvantage on attack rolls and saving throws.', 'Hit point maximum halved.', 'Speed reduced to 0.', 'Death.'];

// [{ id, name, max, recharge: 'short' | 'long' | 'none', note, pool, heal, dc }]
// pool: spent a point at a time (ki, sorcery points, lay on hands).
// heal: a formula the resource heals the character by when used.
// dc: counts uses that raise a DC (Relentless Rage) rather than spending a charge.
function cbResources(c, d = cbDerive(c)) {
    if (cbIs24(c)) return cbResources24(c, d);
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

// 2024 rules (SRD 5.2): the same idea, with the 2024 classes' resources and their recharges.
function cbResources24(c, d) {
    const L = c.level, m = d.m, out = [];
    const add = (id, name, max, recharge, note = '', more = {}) => { if (max > 0) out.push({ id, name, max, recharge, note, ...more }); };
    const at = (cls, lv) => c.cls === cls && L >= lv;
    const pb = d.prof;

    if (at('barbarian', 1)) add('rage', 'Rage', d.x.rages, 'one', `+${d.x.rageDmg} damage on STR attacks${L >= 15 ? '; all back once per long rest when you roll initiative' : ''}`);
    if (at('barbarian', 11)) add('relentless', 'Relentless Rage', 6, 'short', 'CON save at 0 hit points while raging', { dc: true });
    if (at('barbarian', 14)) add('presence', 'Intimidating Presence', 1, 'long', `Frighten foes within 30 ft. (DC ${d.x.dc('str')}); a rage buys it back`);
    if (at('bard', 1)) add('inspiration', 'Bardic Inspiration', Math.max(1, m.cha), L >= 5 ? 'short' : 'long', `d${L >= 15 ? 12 : L >= 10 ? 10 : L >= 5 ? 8 : 6}`);
    if (at('cleric', 2)) add('channel', 'Channel Divinity', L >= 18 ? 4 : L >= 6 ? 3 : 2, 'one', `Divine Spark, Turn Undead${L >= 3 ? ', or Preserve Life' : ''} (DC ${d.x.dc('wis')})`);
    if (at('cleric', 10)) add('intervention', 'Divine Intervention', 1, L >= 20 ? 'none' : 'long', L >= 20 ? 'Wish takes 2d4 long rests to come back' : 'A cleric spell of 5th level or lower, no slot');
    if (at('druid', 2)) add('wild-shape', 'Wild Shape', L >= 17 ? 4 : L >= 6 ? 3 : 2, 'one', `CR ${L >= 8 ? 1 : L >= 4 ? '1/2' : '1/4'}, ${Math.floor(L / 2)} hours, ${L} temporary HP`);
    if (at('druid', 5)) add('resurgence', 'Wild Resurgence slot', 1, 'long', 'Turn a Wild Shape use into a 1st-level slot');
    if (at('druid', 6)) add('natural-recovery', 'Natural Recovery', 1, 'long', `On a short rest: regain spent slots totaling up to ${Math.ceil(L / 2)} levels (none 6th+). Tap the used slots to get them back.`);
    if (at('druid', 6)) add('circle-cast', 'Circle spell without a slot', 1, 'long', 'One of your circle spells');
    if (at('fighter', 1)) add('second-wind', 'Second Wind', L >= 10 ? 4 : L >= 4 ? 3 : 2, 'one', `Bonus action: regain 1d10 + ${L} HP`, { heal: `1d10+${L}` });
    if (at('fighter', 2)) add('action-surge', 'Action Surge', L >= 17 ? 2 : 1, 'short', L >= 17 ? 'Once per turn' : 'One more action');
    if (at('fighter', 9)) add('indomitable', 'Indomitable', L >= 17 ? 3 : L >= 13 ? 2 : 1, 'long', `Reroll a failed save with +${L}`);
    if (at('monk', 2)) add('ki', 'Focus Points', L, 'short', `Save DC ${d.x.dc('wis')}`, { pool: true });
    if (at('monk', 2)) add('metabolism', 'Uncanny Metabolism', 1, 'long', `On initiative: all focus back and 1d${d.x.martial} + ${L} HP`, { heal: `1d${d.x.martial}+${L}` });
    if (at('monk', 6)) add('wholeness', 'Wholeness of Body', Math.max(1, m.wis), 'long', `Bonus action: regain 1d${d.x.martial} + ${Math.max(1, m.wis)} HP`, { heal: `1d${d.x.martial}+${Math.max(1, m.wis)}` });
    if (at('paladin', 1)) add('lay-on-hands', 'Lay On Hands', 5 * L, 'long', 'Heal by touch; 5 points end poisoned', { pool: true });
    if (at('paladin', 2)) add('free-smite', "Paladin's Smite", 1, 'long', 'Divine smite without a slot');
    if (at('paladin', 3)) add('channel', 'Channel Divinity', L >= 11 ? 3 : 2, 'one', `Divine Sense, Sacred Weapon${L >= 9 ? ', or Abjure Foes' : ''} (DC ${d.x.dc('cha')})`);
    if (at('paladin', 5)) add('free-steed', 'Faithful Steed', 1, 'long', 'Find steed without a slot');
    if (at('paladin', 20)) add('nimbus', 'Holy Nimbus', 1, 'long', '10 minutes of sunlight; a 5th-level slot buys it back');
    if (at('ranger', 1)) add('favored-enemy', "Hunter's Mark (free)", L >= 17 ? 6 : L >= 13 ? 5 : L >= 9 ? 4 : L >= 5 ? 3 : 2, 'long', 'Cast it without a slot');
    if (at('ranger', 10)) add('tireless', 'Tireless', Math.max(1, m.wis), 'long', `Gain 1d8 + ${Math.max(1, m.wis)} temporary HP`);
    if (at('ranger', 14)) add('natures-veil', "Nature's Veil", Math.max(1, m.wis), 'long', 'Invisible until the end of your next turn');
    if (at('rogue', 20)) add('stroke-of-luck', 'Stroke of Luck', 1, 'short', 'A failed D20 Test becomes a 20');
    if (at('sorcerer', 1)) add('innate', 'Innate Sorcery', 2, 'long', `1 minute: spell DC ${d.x.dc('cha') + 1}, advantage on spell attacks`);
    if (at('sorcerer', 2)) add('sorcery', 'Sorcery Points', L, 'long', 'Font of Magic: trade for slots', { pool: true });
    if (at('sorcerer', 5)) add('restoration', 'Sorcerous Restoration', 1, 'long', `On a short rest: up to ${Math.floor(L / 2)} sorcery points back (tap them off the pool)`);
    if (at('sorcerer', 14)) add('wings', 'Dragon Wings', 1, 'long', '60 ft. flying for 1 hour; 3 sorcery points buy it back');
    if (at('sorcerer', 18)) add('dragon-companion', 'Dragon Companion', 1, 'long', 'Summon dragon without a slot');
    if (at('warlock', 2)) add('cunning', 'Magical Cunning', 1, 'long', L >= 20 ? 'A 1-minute rite: all pact slots back' : 'A 1-minute rite: half your pact slots back (round up)');
    if (at('warlock', 6)) add('own-luck', "Dark One's Own Luck", Math.max(1, m.cha), 'long', 'Add a d10 to a check or save');
    if (at('warlock', 9)) add('contact', 'Contact Patron', 1, 'long', 'Contact other plane without a slot');
    if (at('warlock', 14)) add('hurl', 'Hurl Through Hell', 1, 'long', '8d10 psychic; a pact slot buys it back');
    if (d.magic && d.magic.rules.arcanum.length) d.magic.rules.arcanum.forEach(lv => add('arcanum-' + lv, `Mystic Arcanum (${cbOrd(lv)})`, 1, 'long', c.spells.arcanum[lv] || 'No spell picked yet'));
    if (at('wizard', 1)) add('arcane-recovery', 'Arcane Recovery', 1, 'long', `On a short rest: regain spent slots totaling up to ${Math.ceil(L / 2)} levels (none 6th+). Tap the used slots to get them back.`);
    if (at('wizard', 20)) add('signature', 'Signature Spells', 2, 'short', 'Each 3rd-level signature spell once, without a slot');

    const sub = cbSubrace(c);
    if (c.race === 'dragonborn' && d.breath) add('breath', 'Breath Weapon', pb, 'long', `${d.breath.dice} ${d.breath.dmg}, DC ${d.x.dc('con')} DEX`);
    if (c.race === 'dragonborn' && L >= 5) add('flight', 'Draconic Flight', 1, 'long', 'Fly at your speed for 10 minutes');
    if (c.race === 'dwarf') add('stonecunning', 'Stonecunning', pb, 'long', 'Tremorsense 60 ft. on stone for 10 minutes');
    if (c.race === 'goliath' && sub) add('giant', sub.name, pb, 'long', sub.traits[0] ? '' : '');
    if (c.race === 'goliath' && L >= 5) add('large-form', 'Large Form', 1, 'long', 'Large for 10 minutes: advantage on STR checks, +10 ft.');
    if (c.race === 'orc') add('adrenaline', 'Adrenaline Rush', pb, 'short', `Dash as a bonus action, gain ${pb} temporary HP`);
    if (c.race === 'orc') add('relentless-endurance', 'Relentless Endurance', 1, 'long', 'Drop to 1 hit point instead of 0');
    if (c.race === 'gnome' && c.subrace === 'forest-gnome') add('animals', 'Speak with Animals', pb, 'long', 'Without a slot');
    ((sub && sub.spells) || []).forEach(([lv, n]) => {
        const s = cbSpell(n);
        if (L >= lv && lv > 1 && s && s.level) add('lineage-' + lv, n, 1, 'long', 'Once without a slot');
    });
    cbFeatSlots(c).forEach(slot => { if (slot.feat === 'magic-initiate' && slot.opt.spell) add('mi-' + slot.key.replace('.', '-'), slot.opt.spell, 1, 'long', 'Magic Initiate: once without a slot'); });
    return out;
}

// Hit point maximum after exhaustion (level 4 halves it; not in the 2024 rules).
function cbPlayMax(c, d) {
    return c.play.exh >= 4 && !cbIs24(c) ? Math.max(1, Math.floor(d.hp / 2)) : d.hp;
}

// What exhaustion level n does, in the character's rules (rules-data.js has the text when the page loads it).
function cbExhaustionText(c, n) {
    if (typeof srdExhaustionText === 'function') return srdExhaustionText(n, cbIs24(c) ? '2024' : '2014');
    if (cbIs24(c)) return n >= 6 ? 'Death.' : `−${2 * n} to every d20 Test; Speed −${5 * n} ft.`;
    return CB_EXHAUSTION.slice(1, n + 1).join(' ');
}

function cbPlayHp(c, d) {
    const max = cbPlayMax(c, d);
    return c.play.hp === null ? max : Math.min(max, c.play.hp);
}

// What the Play Sheet pushes to the DM's tools (F68: party.js partyPushLive).
function cbPartyLive(c, d = cbDerive(c)) {
    const p = c.play;
    return { hp: cbPlayHp(c, d), max: cbPlayMax(c, d), temp: p.temp, conds: p.cond, exh: p.exh, conc: p.conc, ds: p.ds, at: Date.now() };
}

// Speed after what's carried, exhaustion, and conditions that stop movement.
function cbPlaySpeed(c, d) {
    const p = c.play;
    const v24 = cbIs24(c);
    if ((p.exh >= 5 && !v24) || p.exh >= 6 || ['Grappled', 'Restrained', 'Paralyzed', 'Petrified', 'Stunned', 'Unconscious'].some(n => p.cond.includes(n))) return 0;
    const load = cbLoad(c, d).state;
    const speed = load === 'over' ? Math.min(5, d.speed) : Math.max(0, d.speed - (load === 'heavy' ? 20 : load === 'encumbered' ? 10 : 0));
    if (v24) return Math.max(0, speed - 5 * p.exh);
    return p.exh >= 2 ? Math.floor(speed / 2) : speed;
}

// ── Inventory and coins (F60) ────────────────────────────
// Pounds for one: the player's own weight, else a pack's contents, else the SRD weight (0 if unknown).
function cbItemWeight(g) {
    if (g.lb !== undefined) return g.lb;
    const pack = CB_PACK_ITEMS[g.name];
    if (pack) return Math.round(pack.reduce((t, [n, q]) => t + (CB_WEIGHTS[n] || 0) * q, 0) * 100) / 100;
    return CB_WEIGHTS[g.name] || 0;
}

// Carrying capacity is STR × 15 lb (every SRD race is Small or Medium, so no size change; a 2024
// goliath's Powerful Build carries as Large, twice that).
// The variant rule (c.play.enc): over STR × 5 is encumbered (−10 ft.), over STR × 10 heavily (−20 ft.
// and disadvantage on STR, DEX, and CON rolls and on attacks). Past capacity you can only push or drag it.
// → { lb, cap, state: '' | 'encumbered' | 'heavy' | 'over' }
function cbLoad(c, d) {
    const lb = Math.round(c.gear.reduce((t, g) => t + cbItemWeight(g) * g.qty, 0) * 100) / 100;
    const str = d.s.str, cap = str * 15 * (d.race && d.race.carryAs ? 2 : 1);
    const state = lb > cap ? 'over' : c.play.enc && lb > str * 10 ? 'heavy' : c.play.enc && lb > str * 5 ? 'encumbered' : '';
    return { lb, cap, state };
}

// Every gear name the add box knows, for its suggestions.
function cbGearNames() {
    const names = [...Object.values(CB_WEAPONS).map(w => w[0]), ...Object.values(CB_ARMOR).map(a => a[0]), ...CB_GOODS.map(g => g[0]),
        ...Object.keys(CB_PACKS), ...CB_TOOLS, ...Object.keys(CB_WEIGHTS)];
    return [...new Set(names)].sort((a, b) => a.localeCompare(b));
}

// A typed name → a gear row: weapons and armor get their ids (so they show in Attacks and AC), and
// a known name takes its usual spelling.
function cbGearItem(name, qty = 1) {
    const n = cbStr(name, 80).trim(), low = n.toLowerCase();
    if (!n) return null;
    const w = Object.keys(CB_WEAPONS).find(id => CB_WEAPONS[id][0].toLowerCase() === low);
    if (w) return { name: CB_WEAPONS[w][0], qty, w };
    const a = Object.keys(CB_ARMOR).find(id => CB_ARMOR[id][0].toLowerCase() === low);
    if (a) return { name: CB_ARMOR[a][0], qty, a };
    return { name: cbGearNames().find(x => x.toLowerCase() === low) || n, qty };
}

// An SRD magic item's name, matched without case → its MAGIC_ITEM_TEXT key or ''.
function cbMagicName(name) {
    if (typeof MAGIC_ITEM_TEXT === 'undefined') return '';
    const low = String(name).trim().toLowerCase();
    return MAGIC_ITEM_TEXT[name] ? name : Object.keys(MAGIC_ITEM_TEXT).find(k => k.toLowerCase() === low) || '';
}

function cbNeedsAttune(g) {
    return !!g.mi && typeof MAGIC_ITEM_TEXT !== 'undefined' && !!MAGIC_ITEM_TEXT[g.name] && /requires attunement/i.test(MAGIC_ITEM_TEXT[g.name][0]);
}

const cbAttuned = c => c.gear.filter(g => g.att).length;

// Open the pack at c.gear[i] into its contents (merged with what's already there). → false if it can't.
function cbUnpack(c, i) {
    const g = c.gear[i], items = g && CB_PACK_ITEMS[g.name];
    if (!items || c.gear.length + items.length > CB_MAX_GEAR) return false;
    if (g.qty > 1) g.qty -= 1;
    else c.gear.splice(i, 1);
    items.forEach(([name, qty]) => cbAddGear(c.gear, { name, qty }));
    return true;
}

// Take the row out, and stop wearing it if it was worn.
function cbDropGear(c, i) {
    const [g] = c.gear.splice(i, 1);
    if (!g) return;
    if (g.a && g.a === c.wear.armor && !c.gear.some(x => x.a === g.a)) c.wear.armor = '';
    if (g.name === 'Shield' && !c.gear.some(x => x.name === 'Shield')) c.wear.shield = false;
}

// Add or spend n coins of one kind (cp, sp, ep, gp, pp; COIN_CP in coins.js). c.coins is kept in gp.
// → false when spending more than the purse holds.
function cbPurse(c, n, coin, spend) {
    const gp = Math.round(Math.max(0, n) * COIN_CP[coin]) / 100;
    if (spend && gp > c.coins + 1e-9) return false;
    c.coins = Math.min(1e7, Math.max(0, Math.round((c.coins + (spend ? -gp : gp)) * 100) / 100));
    return true;
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
        else if (r.recharge === 'one') { p.res[r.id] -= 1; if (!p.res[r.id]) delete p.res[r.id]; back.push(`one ${r.name}`); }
        else if (r.id === 'sorcery' && c.level >= 20 && !cbIs24(c)) { p.res[r.id] = Math.max(0, p.res[r.id] - 4); back.push('4 sorcery points'); }
    });
    if (cbIs24(c) && c.cls === 'ranger' && c.level >= 10 && p.exh) { p.exh -= 1; back.push('one level of exhaustion (Tireless)'); }
    return back;
}

function cbLongRest(c, d = cbDerive(c)) {
    const p = c.play, back = [];
    const hdBack = cbIs24(c) ? p.hd : Math.min(p.hd, Math.max(1, Math.floor(c.level / 2)));
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
