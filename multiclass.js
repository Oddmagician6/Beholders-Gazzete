/* ============================================
   MULTICLASS CALCULATOR (F63): pick classes and levels and see whether the
   ability score prerequisites are met, what proficiencies each class adds,
   the combined spell slots (Pact Magic apart), proficiency bonus, hit dice,
   hit points, and each class's features. The address bar holds the build
   (c = class.level,… with the starting class first; s = six scores), so a
   reload or a shared link brings it back; nothing goes in localStorage.
   Loading a saved Character Builder character only reads CB_KEY.
   Needs rng.js, character-data.js, and character-engine.js.
   ============================================ */

// SRD 5.1 multiclassing prerequisites: every group must be met; a group of two is either/or.
const MC_PREREQ = {
    barbarian: [['str']], bard: [['cha']], cleric: [['wis']], druid: [['wis']],
    fighter: [['str', 'dex']], monk: [['dex'], ['wis']], paladin: [['str'], ['cha']], ranger: [['dex'], ['wis']],
    rogue: [['dex']], sorcerer: [['cha']], warlock: [['cha']], wizard: [['int']]
};

// What a class gives when it isn't your first one.
const MC_PROFS = {
    barbarian: { armor: ['shield'], weapons: ['simple', 'martial'] },
    bard: { armor: ['light'], skills: 'any', tools: ['one musical instrument'] },
    cleric: { armor: ['light', 'medium', 'shield'] },
    druid: { armor: ['light', 'medium', 'shield'] },
    fighter: { armor: ['light', 'medium', 'shield'], weapons: ['simple', 'martial'] },
    monk: { weapons: ['simple', 'shortsword'] },
    paladin: { armor: ['light', 'medium', 'shield'], weapons: ['simple', 'martial'] },
    ranger: { armor: ['light', 'medium', 'shield'], weapons: ['simple', 'martial'], skills: 'class' },
    rogue: { armor: ['light'], skills: 'class', tools: ["Thieves' tools"] },
    sorcerer: {}, warlock: { armor: ['light'], weapons: ['simple'] }, wizard: {}
};

const MC_ARMOR_NAMES = { light: 'light armor', medium: 'medium armor', heavy: 'heavy armor', shield: 'shields' };
const MC_LEVEL_NAMES = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th'];

// tough: extra HP per level from the race (a hill dwarf's Dwarven Toughness), set by loading a character.
const mc = { rows: [{ cls: '', lv: 1 }], s: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }, tough: 0 };

function esc(s) {
    return String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

let flashTimer = 0;
function flash(msg, bad = false) {
    const el = document.getElementById('mc-status');
    el.textContent = msg;
    el.classList.toggle('mc-bad', bad);
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => { el.textContent = ''; }, 4000);
}

const mcPicked = () => mc.rows.filter(r => cbClass(r.cls));
const mcTotal = () => mcPicked().reduce((t, r) => t + r.lv, 0);
const mcMods = () => { const m = {}; CB_ABILITIES.forEach(a => { m[a] = cbMod(mc.s[a]); }); return m; };

// Just enough of a builder character for cbSpellRules and cbAsiLevels.
function mcChar(r) {
    const c = cbBlank();
    c.cls = r.cls;
    c.level = r.lv;
    CB_ABILITIES.forEach(a => { c.base[a] = mc.s[a]; });
    return c;
}

// ── The rules ────────────────────────────────────────────
// [{ text, ok }] for one class's prerequisites.
function mcPrereq(cls) {
    return (MC_PREREQ[cls] || []).map(group => ({
        text: group.map(a => `${a.toUpperCase()} 13`).join(' or '),
        ok: group.some(a => mc.s[a] >= 13)
    }));
}
const mcQualifies = cls => mcPrereq(cls).every(p => p.ok);

function mcWeaponText(list) {
    const out = [];
    if (list.includes('simple')) out.push('simple weapons');
    if (list.includes('martial')) out.push('martial weapons');
    list.filter(w => CB_WEAPONS[w] && !list.includes(CB_WEAPONS[w][1])).forEach(w => out.push(CB_WEAPONS[w][0].toLowerCase()));
    return [...new Set(out)];
}
const mcArmorText = list => ['light', 'medium', 'heavy', 'shield'].filter(a => list.includes(a)).map(a => MC_ARMOR_NAMES[a]);
const mcSkillName = id => (CB_SKILLS[id] ? CB_SKILLS[id][0] : id);

// What each picked class brings: { k, lv, first, saves, armor, weapons, tools, skills }.
function mcProfs() {
    return mcPicked().map((r, i) => {
        const k = cbClass(r.cls), first = i === 0;
        const subArmor = k.sub && k.sub.armor && r.lv >= k.sub.at ? k.sub.armor : [];
        if (first) {
            const tools = [...(k.tools || [])];
            if (k.toolPick) tools.push(k.toolPick.from === 'instrument' ? `${k.toolPick.n} musical instrument${k.toolPick.n > 1 ? 's' : ''}` : 'one artisan\'s tool or musical instrument');
            const skills = k.skills.from === 'any' ? `${k.skills.n} skills of your choice` : `${k.skills.n} from ${k.skills.from.map(mcSkillName).join(', ')}`;
            return { k, lv: r.lv, first, saves: k.saves, armor: [...k.armor, ...subArmor], weapons: k.weapons, tools, skills };
        }
        const p = MC_PROFS[r.cls];
        const skills = p.skills === 'any' ? 'one skill of your choice' : p.skills === 'class' ? `one from ${k.skills.from.map(mcSkillName).join(', ')}` : '';
        return { k, lv: r.lv, first, saves: [], armor: [...(p.armor || []), ...subArmor], weapons: p.weapons || [], tools: p.tools || [], skills };
    });
}

// Classes with the Spellcasting feature at their level (Pact Magic is apart).
function mcCasters() {
    return mcPicked().filter(r => {
        const k = cbClass(r.cls);
        return k.cast && (k.cast.prog === 'full' || (k.cast.prog === 'half' && r.lv >= 2));
    });
}

// { slots, casterLevel, one } : one = the single spellcasting class whose own table applies.
function mcSlots() {
    const casters = mcCasters();
    if (!casters.length) return { slots: [], casterLevel: 0, one: null };
    if (casters.length === 1) {
        const r = casters[0];
        return { slots: cbSlots(cbClass(r.cls), r.lv), casterLevel: 0, one: r };
    }
    const L = casters.reduce((t, r) => t + (cbClass(r.cls).cast.prog === 'full' ? r.lv : Math.floor(r.lv / 2)), 0);
    return { slots: L ? CB_FULL_SLOTS[L - 1] : [], casterLevel: L, one: null };
}

function mcHitPoints() {
    const rows = mcPicked();
    if (!rows.length) return 0;
    const con = cbMod(mc.s.con);
    let hp = 0;
    rows.forEach((r, i) => {
        const k = cbClass(r.cls);
        for (let lv = 1; lv <= r.lv; lv++) hp += Math.max(1, (i === 0 && lv === 1 ? k.hd : k.hd / 2 + 1) + con);
        if (r.cls === 'sorcerer') hp += r.lv;   // Draconic Resilience
    });
    return hp + mc.tough * mcTotal();
}

function mcHitDice() {
    const by = {};
    mcPicked().forEach(r => { const d = cbClass(r.cls).hd; by[d] = (by[d] || 0) + r.lv; });
    return Object.keys(by).map(Number).sort((a, b) => b - a).map(d => `${by[d]}d${d}`).join(' + ');
}

// Feature lines for one class at its level, worded for that class level.
function mcFeatures(r) {
    const k = cbClass(r.cls), L = r.lv, prof = cbProf(mcTotal()), m = mcMods();
    const x = { L, prof, m, dc: a => 8 + prof + m[a], ord: cbOrd, breath: {}, dragon: null,
        rages: [2, 2, 3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 6, 6, 6, 99][L - 1], rageDmg: L >= 16 ? 4 : L >= 9 ? 3 : 2,
        martial: L >= 17 ? 10 : L >= 11 ? 8 : L >= 5 ? 6 : 4, pact: CB_PACT_SLOTS[L - 1] };
    return k.features.filter(f => f[0] <= L).map(([lv, name, t]) => {
        let text = '';
        try { text = typeof t === 'function' ? t(x) : t; } catch (e) { text = ''; }
        return { lv, name, text };
    });
}

// Rules that only matter once the classes meet.
function mcNotes() {
    const rows = mcPicked(), has = id => rows.find(r => r.cls === id);
    const lvOf = id => (has(id) ? has(id).lv : 0);
    const out = [];
    const extra = rows.filter(r => ['barbarian', 'fighter', 'monk', 'paladin', 'ranger'].includes(r.cls) && r.lv >= 5);
    if (extra.length > 1) out.push(`<b>Extra Attack</b> doesn't add up: ${extra.map(r => cbClass(r.cls).name).join(' and ')} each give it, but they don't add up: you attack ${lvOf('fighter') >= 20 ? 'four times' : lvOf('fighter') >= 11 ? 'three times' : 'twice'} when you take the Attack action.`);
    if (lvOf('barbarian') && lvOf('monk')) out.push('<b>Unarmored Defense</b>: barbarian and monk each have one, and you can only use one of them. Once you have it, you can\'t gain it again from the other class.');
    if (lvOf('cleric') >= 2 && lvOf('paladin') >= 3) out.push('<b>Channel Divinity</b>: the cleric and paladin options are all yours, but taking the feature a second time doesn\'t give you more uses.');
    const casters = mcCasters();
    if (casters.length > 1) out.push('<b>Spells known and prepared</b> are worked out for each class on its own, as if you had only that class. Each class can only learn or prepare spells of a level it could cast on its own, but the shared slots can cast any of them, up-cast if you like.');
    if (has('warlock') && casters.length) out.push('<b>Pact Magic and Spellcasting</b>: your pact slots and your other slots are separate pools, but either kind can cast a spell from any of your classes.');
    if (rows.length > 1) out.push('<b>Cantrips</b> that grow with level (like <i>fire bolt</i>) use your character level, not one class\'s level.');
    return out;
}

// ── Address bar ──────────────────────────────────────────
function mcParams() {
    const p = {};
    const rows = mcPicked();
    if (rows.length) p.c = rows.map(r => `${r.cls}.${r.lv}`).join(',');
    if (CB_ABILITIES.some(a => mc.s[a] !== 10)) p.s = CB_ABILITIES.map(a => mc.s[a]).join('.');
    if (mc.tough) p.t = 1;
    return p;
}

function mcFromUrl() {
    const q = urlParams();
    const rows = [];
    let total = 0;
    (q.get('c') || '').split(',').forEach(part => {
        const [cls, lvText] = part.split('.');
        const lv = Math.round(Number(lvText));
        if (!cbClass(cls) || rows.some(r => r.cls === cls) || !(lv >= 1)) return;
        const fit = Math.min(lv, 20 - total);
        if (fit < 1) return;
        rows.push({ cls, lv: fit });
        total += fit;
    });
    mc.rows = rows.length ? rows : [{ cls: '', lv: 1 }];
    const s = (q.get('s') || '').split('.').map(Number);
    CB_ABILITIES.forEach((a, i) => { mc.s[a] = s.length === 6 && Number.isInteger(s[i]) ? Math.min(30, Math.max(1, s[i])) : 10; });
    mc.tough = q.get('t') === '1' ? 1 : 0;
}

function mcChanged() {
    setUrlParams(mcParams(), false);
    render();
}

// ── Drawing ──────────────────────────────────────────────
function renderScores() {
    document.getElementById('mc-scores').innerHTML = CB_ABILITIES.map(a => `<label class="mc-abil">
        <b>${a.toUpperCase()}</b>
        <span class="mc-name">${CB_ABILITY_NAMES[a]}</span>
        <input type="number" min="1" max="30" inputmode="numeric" value="${mc.s[a]}" data-score="${a}" aria-label="${CB_ABILITY_NAMES[a]} score">
        <span class="mc-mod">${cbSign(cbMod(mc.s[a]))}</span>
    </label>`).join('');
}

function renderRows() {
    const total = mcTotal();
    const used = mc.rows.map(r => r.cls);
    document.getElementById('mc-rows').innerHTML = mc.rows.map((r, i) => {
        const others = total - (cbClass(r.cls) ? r.lv : 0);
        const max = Math.max(1, 20 - others);
        const opts = CB_CLASSES.filter(k => k.id === r.cls || !used.includes(k.id))
            .map(k => `<option value="${k.id}"${k.id === r.cls ? ' selected' : ''}>${k.icon} ${esc(k.name)}</option>`).join('');
        const lvs = Array.from({ length: max }, (_, n) => `<option${n + 1 === r.lv ? ' selected' : ''}>${n + 1}</option>`).join('');
        const tag = i === 0 ? '<span class="mc-tag">Starting class</span>' : `<button type="button" class="mc-btn mc-small" data-first="${i}" title="Make this the class you took at 1st level">⭡ Started Here</button>`;
        return `<div class="mc-row">
            <label class="mc-field">Class<select data-row="${i}" data-k="cls" aria-label="Class ${i + 1}"><option value="">${i === 0 ? 'Pick your first class' : 'Pick a class'}</option>${opts}</select></label>
            <label class="mc-field mc-lv">Level<select data-row="${i}" data-k="lv" aria-label="Class ${i + 1} level">${lvs}</select></label>
            <div class="mc-row-end">${tag}${mc.rows.length > 1 ? `<button type="button" class="mc-btn mc-small" data-del="${i}" aria-label="Remove class ${i + 1}">✕</button>` : ''}</div>
        </div>`;
    }).join('');
    const canAdd = total < 20 && mc.rows.length < CB_CLASSES.length && mc.rows.every(r => cbClass(r.cls));
    document.getElementById('mc-add').disabled = !canAdd;
}

function renderSummary() {
    const rows = mcPicked(), L = mcTotal();
    const el = document.getElementById('mc-summary');
    if (!rows.length) { el.innerHTML = '<p class="mc-hint">Pick the class you started with, then add the others.</p>'; return; }
    const asi = rows.map(r => ({ r, lv: cbAsiLevels(mcChar(r)) })).filter(x => x.lv.length);
    const nAsi = asi.reduce((t, x) => t + x.lv.length, 0);
    const stats = [
        ['Character level', L],
        ['Proficiency bonus', cbSign(cbProf(L))],
        ['Hit dice', mcHitDice()],
        ['Hit points', `${mcHitPoints()} <span class="mc-dim">(average${mc.tough ? ', with Dwarven Toughness' : ''})</span>`],
        ['Ability Score Improvements', `${nAsi}${nAsi ? ` <span class="mc-dim">(${asi.map(x => `${esc(cbClass(x.r.cls).name)} ${x.lv.join(', ')}`).join('; ')})</span>` : ''}`]
    ];
    el.innerHTML = `<div class="mc-stats">${stats.map(([k, v]) => `<div class="mc-stat"><span>${k}</span><b>${v}</b></div>`).join('')}</div>`
        + `<p class="mc-dim mc-small-text">${esc(rows.map(r => `${cbClass(r.cls).name} ${r.lv}`).join(' / '))}. Hit points take the full die at 1st level of the starting class and the average after that, plus Constitution${rows.some(r => r.cls === 'sorcerer') ? ' and the Draconic Bloodline\'s +1 per sorcerer level' : ''}; a hill dwarf adds 1 more per level.</p>`;
}

function renderPrereq() {
    const rows = mcPicked();
    const el = document.getElementById('mc-prereq');
    if (!rows.length) { el.innerHTML = ''; return; }
    const line = (cls, why) => {
        const k = cbClass(cls), p = mcPrereq(cls), ok = p.every(x => x.ok);
        return `<li class="${ok ? 'mc-ok' : 'mc-no'}"><span class="mc-mark">${ok ? '✓' : '✗'}</span> <b>${k.icon} ${esc(k.name)}</b> needs ${p.map(x => `<span class="${x.ok ? '' : 'mc-miss'}">${x.text}</span>`).join(' and ')}${why ? ` <span class="mc-dim">${why}</span>` : ''}</li>`;
    };
    let h = '<h2 class="mc-h">Prerequisites</h2>';
    if (rows.length === 1) {
        h += `<ul class="mc-list">${line(rows[0].cls, '(to leave it for another class)')}</ul>`;
    } else {
        const bad = rows.filter(r => !mcQualifies(r.cls));
        h += bad.length
            ? `<p class="mc-warn">This build doesn't qualify: ${bad.map(r => cbClass(r.cls).name).join(' and ')} ${bad.length > 1 ? 'are' : 'is'} short. You need the scores for your current classes and the new one each time you add a class.</p>`
            : '<p class="mc-good">✓ This build qualifies: the scores meet every class\'s prerequisite.</p>';
        h += `<ul class="mc-list">${rows.map(r => line(r.cls)).join('')}</ul>`;
    }
    const total = mcTotal();
    const free = CB_CLASSES.filter(k => !mc.rows.some(r => r.cls === k.id));
    if (total < 20 && free.length && mc.rows.every(r => cbClass(r.cls))) {
        h += `<p class="mc-label">Add a level of:</p><div class="mc-chips">${free.map(k => {
            const ok = mcQualifies(k.id) && rows.every(r => mcQualifies(r.cls));
            return `<button type="button" class="mc-chip${ok ? ' mc-chip-ok' : ''}" data-addcls="${k.id}" title="${esc(mcPrereq(k.id).map(x => x.text).join(' and '))}">${ok ? '✓' : '✗'} ${k.icon} ${esc(k.name)}</button>`;
        }).join('')}</div>`;
    }
    el.innerHTML = h;
}

function renderProfs() {
    const el = document.getElementById('mc-profs');
    const list = mcProfs();
    if (!list.length) { el.innerHTML = ''; return; }
    const item = p => {
        const bits = [];
        if (p.saves.length) bits.push(`saves: ${p.saves.map(a => CB_ABILITY_NAMES[a]).join(', ')}`);
        const armor = mcArmorText(p.armor);
        if (armor.length) bits.push(armor.join(', ') + (p.first && p.k.armorNote ? ` (${p.k.armorNote})` : ''));
        const weapons = mcWeaponText(p.weapons);
        if (weapons.length) bits.push(weapons.join(', '));
        if (p.tools.length) bits.push(p.tools.join(', '));
        if (p.skills) bits.push(`skills: ${p.skills}`);
        return `<li><b>${p.k.icon} ${esc(p.k.name)}</b> <span class="mc-dim">${p.first ? '(starting class: everything)' : '(added later)'}</span>: ${bits.length ? esc(bits.join('; ')) : 'nothing new'}.</li>`;
    };
    const armor = mcArmorText(list.flatMap(p => p.armor));
    const weapons = mcWeaponText(list.flatMap(p => p.weapons));
    el.innerHTML = '<h2 class="mc-h">Proficiencies</h2>'
        + `<ul class="mc-list">${list.map(item).join('')}</ul>`
        + `<p class="mc-all"><b>Altogether:</b> saving throws in ${esc(list[0].saves.map(a => CB_ABILITY_NAMES[a]).join(' and '))} (only the starting class gives saves); ${esc(armor.length ? armor.join(', ') : 'no armor')}; ${esc(weapons.length ? weapons.join(', ') : 'no weapons')}.</p>`;
}

function renderMagic() {
    const el = document.getElementById('mc-magic');
    const rows = mcPicked().filter(r => cbClass(r.cls).cast);
    if (!rows.length) { el.innerHTML = ''; return; }
    const { slots, casterLevel, one } = mcSlots();
    const m = mcMods(), prof = cbProf(mcTotal());
    const lines = rows.map(r => {
        const k = cbClass(r.cls), rules = cbSpellRules(mcChar(r));
        const a = k.cast.ability;
        if (!rules || (k.cast.prog === 'half' && r.lv < 2)) return `<li><b>${k.icon} ${esc(k.name)} ${r.lv}</b>: no spells until ${k.name.toLowerCase()} level 2.</li>`;
        const bits = [`${a.toUpperCase()} (save DC ${8 + prof + m[a]}, attack ${cbSign(prof + m[a])})`];
        if (rules.cantrips) bits.push(`${rules.cantrips} cantrips`);
        if (rules.type === 'known') bits.push(`${rules.list} spells known`);
        if (rules.type === 'prepared') bits.push(`prepare ${rules.list}`);
        if (rules.type === 'book') bits.push(`${rules.list} in the spellbook, prepare ${rules.prepared}`);
        if (rules.maxLevel) bits.push(`spells up to ${MC_LEVEL_NAMES[rules.maxLevel - 1]} level`);
        if (rules.arcanum.length) bits.push(`Mystic Arcanum: ${rules.arcanum.map(l => MC_LEVEL_NAMES[l - 1]).join(', ')}`);
        return `<li><b>${k.icon} ${esc(k.name)} ${r.lv}</b>: ${bits.join(' · ')}</li>`;
    });
    let h = '<h2 class="mc-h">Spellcasting</h2>' + `<ul class="mc-list">${lines.join('')}</ul>`;
    if (slots.length) {
        const how = one
            ? `${cbClass(one.cls).name} is your only class with the Spellcasting feature, so its own table applies.`
            : `Spellcaster level <b>${casterLevel}</b>: ${mcCasters().map(r => { const k = cbClass(r.cls); return k.cast.prog === 'full' ? `${k.name} ${r.lv}` : `half of ${k.name} ${r.lv} (rounded down) = ${Math.floor(r.lv / 2)}`; }).join(' + ')}.`;
        h += `<p class="mc-all">${how}</p>`
            + `<div class="mc-slots-wrap"><table class="mc-slots"><caption>Spell slots</caption><thead><tr>${MC_LEVEL_NAMES.map(n => `<th scope="col">${n}</th>`).join('')}</tr></thead>`
            + `<tbody><tr>${MC_LEVEL_NAMES.map((n, i) => `<td>${slots[i] || '—'}</td>`).join('')}</tr></tbody></table></div>`;
    }
    const wl = mcPicked().find(r => r.cls === 'warlock');
    if (wl) {
        const [n, lv] = CB_PACT_SLOTS[wl.lv - 1];
        h += `<p class="mc-all"><b>Pact Magic</b> (warlock ${wl.lv}, kept apart): ${n} slot${n > 1 ? 's' : ''} of ${MC_LEVEL_NAMES[lv - 1]} level, back on a short rest.</p>`;
    }
    el.innerHTML = h;
}

function renderNotes() {
    const notes = mcNotes();
    document.getElementById('mc-notes').innerHTML = notes.length ? `<h2 class="mc-h">Rules that change</h2><ul class="mc-list">${notes.map(n => `<li>${n}</li>`).join('')}</ul>` : '';
}

function renderFeatures() {
    const el = document.getElementById('mc-features');
    const rows = mcPicked();
    if (!rows.length) { el.innerHTML = ''; return; }
    el.innerHTML = '<h2 class="mc-h">Class features</h2>' + rows.map((r, i) => {
        const k = cbClass(r.cls), sub = k.sub && r.lv >= k.sub.at ? `, ${esc(k.sub.name)}` : '';
        return `<details class="mc-feat"${i === 0 && rows.length === 1 ? ' open' : ''}><summary>${k.icon} ${esc(k.name)} ${r.lv}${sub} <span class="mc-dim">(d${k.hd} hit die)</span></summary><ul>${mcFeatures(r).map(f => `<li><span class="mc-lvl">${cbOrd(f.lv)}</span> <b>${esc(f.name)}</b>${f.text ? `: ${esc(f.text)}` : ''}</li>`).join('')}</ul></details>`;
    }).join('');
}

function render() {
    renderScores();
    renderRows();
    renderSummary();
    renderPrereq();
    renderProfs();
    renderMagic();
    renderNotes();
    renderFeatures();
}

// ── Actions ──────────────────────────────────────────────
function mcText() {
    const rows = mcPicked();
    if (!rows.length) return '';
    const L = mcTotal(), { slots, casterLevel } = mcSlots();
    const out = [rows.map(r => `${cbClass(r.cls).name} ${r.lv}`).join(' / ') + ` (level ${L})`,
        CB_ABILITIES.map(a => `${a.toUpperCase()} ${mc.s[a]}`).join(', '),
        `Proficiency ${cbSign(cbProf(L))} · Hit dice ${mcHitDice()} · HP ${mcHitPoints()}`,
        `Prerequisites: ${rows.every(r => mcQualifies(r.cls)) ? 'met' : 'NOT met (' + rows.filter(r => !mcQualifies(r.cls)).map(r => cbClass(r.cls).name).join(', ') + ')'}`];
    if (slots.length) out.push(`Spell slots${casterLevel ? ` (caster level ${casterLevel})` : ''}: ${slots.map((n, i) => `${MC_LEVEL_NAMES[i]} ${n}`).join(', ')}`);
    const wl = rows.find(r => r.cls === 'warlock');
    if (wl) { const [n, lv] = CB_PACT_SLOTS[wl.lv - 1]; out.push(`Pact slots: ${n} × ${MC_LEVEL_NAMES[lv - 1]}`); }
    return out.join('\n');
}

function mcAddClass(cls) {
    const total = mcTotal();
    if (total >= 20) return flash('Twenty levels is the most a character can have.', true);
    const blank = mc.rows.findIndex(r => !cbClass(r.cls));
    if (blank >= 0) mc.rows[blank] = { cls, lv: 1 };
    else mc.rows.push({ cls, lv: 1 });
    mcChanged();
}

function onClick(e) {
    const b = e.target.closest('button');
    if (!b || b.disabled) return;
    if (b.dataset.del) { mc.rows.splice(Number(b.dataset.del), 1); return mcChanged(); }
    if (b.dataset.first) {
        const [r] = mc.rows.splice(Number(b.dataset.first), 1);
        mc.rows.unshift(r);
        mcChanged();
        return flash(`⭡ ${cbClass(r.cls) ? cbClass(r.cls).name : 'That class'} is now the starting class.`);
    }
    if (b.dataset.addcls) return mcAddClass(b.dataset.addcls);
}

function onChange(e) {
    const el = e.target;
    if (el.dataset.score) {
        const n = Math.round(Number(el.value));
        mc.s[el.dataset.score] = Number.isFinite(n) ? Math.min(30, Math.max(1, n)) : 10;
        return mcChanged();
    }
    if (el.dataset.row) {
        const r = mc.rows[Number(el.dataset.row)];
        if (el.dataset.k === 'cls') r.cls = el.value;
        else r.lv = Number(el.value) || 1;
        if (cbClass(r.cls)) r.lv = Math.min(r.lv, 20 - (mcTotal() - r.lv));
        return mcChanged();
    }
}

function fillCharacters() {
    const sel = document.getElementById('mc-load');
    const list = cbLoadAll().filter(c => cbClass(c.cls));
    sel.innerHTML = `<option value="">${list.length ? 'Load scores from a saved character…' : 'No saved characters yet'}</option>`
        + list.map(c => `<option value="${esc(c.id)}">${esc(c.name || 'Unnamed')} (${esc(cbClass(c.cls).name)} ${c.level})</option>`).join('');
    sel.disabled = !list.length;
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('year').textContent = new Date().getFullYear();
    mcFromUrl();
    setUrlParams(mcParams(), false);
    render();
    fillCharacters();

    const tool = document.getElementById('mc-tool');
    tool.addEventListener('click', onClick);
    tool.addEventListener('change', onChange);
    document.getElementById('mc-add').addEventListener('click', () => {
        mc.rows.push({ cls: '', lv: 1 });
        render();
        const sels = document.querySelectorAll('#mc-rows select[data-k="cls"]');
        if (sels.length) sels[sels.length - 1].focus();
    });
    document.getElementById('mc-load').addEventListener('change', e => {
        const c = cbLoadAll().find(x => x.id === e.target.value);
        e.target.value = '';
        if (!c) return;
        const s = cbScores(c);
        CB_ABILITIES.forEach(a => { mc.s[a] = s[a]; });
        const sub = cbSubrace(c);
        mc.tough = sub && sub.hpPerLevel ? 1 : 0;
        mc.rows = [{ cls: c.cls, lv: c.level }];
        mcChanged();
        flash(`🧝 Loaded ${c.name || 'the character'}'s scores and class. Add a class to see where it could go.`);
    });
    document.getElementById('mc-reset').addEventListener('click', () => {
        mc.rows = [{ cls: '', lv: 1 }];
        CB_ABILITIES.forEach(a => { mc.s[a] = 10; });
        mc.tough = 0;
        mcChanged();
        flash('↺ Cleared.');
    });
    document.getElementById('mc-copy').addEventListener('click', () => {
        const text = mcText();
        if (!text) return flash('Pick a class first.', true);
        (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject())
            .then(() => flash('📋 Build copied.'), () => flash('Could not copy; select the text and copy it by hand.', true));
    });
    document.getElementById('mc-link').addEventListener('click', () => copyPageLink(ok => flash(ok === false ? 'Could not copy the link.' : '🔗 Link copied.', ok === false)));
    window.addEventListener('popstate', () => { mcFromUrl(); render(); });
    window.addEventListener('storage', e => { if (e.key === CB_KEY) fillCharacters(); });
});
