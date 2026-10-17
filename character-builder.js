/* ============================================
   CHARACTER BUILDER PAGE (F58)
   The step tabs, the sheet, and the character bar. Rules live in
   character-engine.js; this file only draws and edits the open character,
   which saves to localStorage (CB_KEY) on every change.
   ============================================ */

const CB_STEPS = [
    ['race', 'Race'], ['class', 'Class'], ['abilities', 'Abilities'], ['background', 'Background'],
    ['skills', 'Skills'], ['equipment', 'Equipment'], ['spells', 'Spells'], ['details', 'Details'], ['sheet', '📜 Sheet']
];

let chars = [];
let cur = null;
let step = 'race';
let lastLevelUp = null;      // { level, features } after Level Up, shown once on the sheet
let lastRollDice = null;     // the dice behind the last 4d6 roll, shown until the page reloads
let showAllSpells = false;   // bards with Magical Secrets, warlocks with the Tome

function esc(s) {
    return String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

let flashTimer = 0;
function flash(msg, bad = false) {
    const el = document.getElementById('cb-status');
    el.textContent = msg;
    el.classList.toggle('cb-bad', bad);
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => { el.textContent = ''; }, 4000);
}

const getPath = (o, p) => p.split('.').reduce((v, k) => (v ? v[k] : undefined), o);
function setPath(o, p, val) {
    const keys = p.split('.');
    const last = keys.pop();
    const t = keys.reduce((v, k) => v[k], o);
    t[last] = val;
}

function save() {
    const list = cbSave(cur);
    if (!list) { flash('Could not save: this browser\'s storage is full or blocked.', true); return; }
    chars = list;
}

// Change the open character, save, and redraw (keeping focus on the control that was used).
function change(fn) {
    if (!cur) return;
    fn(cur);
    save();
    render();
}

function bonusText(b) {
    if (!b) return '';
    const keys = Object.keys(b);
    if (keys.length === 6) return '+1 to all';
    return keys.map(a => `${cbSign(b[a])} ${a.toUpperCase()}`).join(', ');
}

function raceLabel(c) {
    const sub = cbSubrace(c), race = cbRace(c.race);
    return sub ? sub.name : race ? race.name : '';
}

function charLabel(c) {
    const k = cbClass(c.cls);
    const what = [raceLabel(c), k ? k.name : ''].filter(Boolean).join(' ');
    return `${c.name || 'Unnamed character'} · level ${c.level}${what ? ' ' + what : ''}`;
}

// ── Small builders ───────────────────────────────────────
// Toggle chips for an array at `path`; max picks; locked: { id: 'from X' } shown but not pickable.
function chips(path, options, selected, max, locked = {}) {
    const full = selected.length >= max;
    return `<div class="cb-chips">${options.map(([id, label, small]) => {
        if (locked[id]) return `<span class="cb-chip cb-locked" title="Already from ${esc(locked[id])}">✓ ${esc(label)}<small>${esc(locked[id])}</small></span>`;
        const on = selected.includes(id);
        return `<button type="button" class="cb-chip" data-act="toggle" data-f="${esc(path)}" data-v="${esc(id)}" data-max="${max}" aria-pressed="${on}"${!on && full && max > 1 ? ' disabled' : ''}>${esc(label)}${small ? `<small>${esc(small)}</small>` : ''}</button>`;
    }).join('')}</div>`;
}

function countTag(have, need) {
    return `<span class="cb-count ${have === need ? 'full' : have > need ? 'over' : ''}">${have} of ${need}</span>`;
}

function select(path, options, value, label, cls = 'cb-field') {
    return `<label class="${cls}">${esc(label)}<select data-f="${esc(path)}">${options.map(([v, t]) => `<option value="${esc(v)}"${String(v) === String(value) ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select></label>`;
}

function nextButtons() {
    const i = CB_STEPS.findIndex(s => s[0] === step);
    const prev = CB_STEPS[i - 1], next = CB_STEPS[i + 1];
    return `<div class="cb-next">${prev ? `<button type="button" class="cb-btn" data-act="goto" data-v="${prev[0]}">← ${esc(prev[1])}</button>` : '<span></span>'}
        ${next ? `<button type="button" class="cb-btn cb-gold" data-act="goto" data-v="${next[0]}">${esc(next[1])} →</button>` : ''}</div>`;
}

function stepTodo(id) {
    const list = cbTodo(cur).filter(t => t.step === id);
    return list.length ? `<ul class="cb-todo">${list.map(t => `<li>• ${esc(t.text)}</li>`).join('')}</ul>` : '';
}

function spellLink(name) {
    return `<a href="spell/${spellSlug(name)}" target="_blank" rel="noopener" title="Open ${esc(name)} in a new tab">${esc(name)}</a>`;
}

// ── Steps ────────────────────────────────────────────────
function renderRace() {
    const c = cur, race = cbRace(c.race), sub = cbSubrace(c), d = cbDerive(c);
    let h = `<h2>Race</h2><p class="cb-lead">Your race sets your size, speed, some ability score bonuses, and a few traits.</p>
        <div class="cb-cards">${CB_RACES.map(r => {
            const s = r.subraces ? r.subraces[0] : null;
            const b = { ...r.abil };
            if (s) Object.keys(s.abil).forEach(a => { b[a] = (b[a] || 0) + s.abil[a]; });
            return `<button type="button" class="cb-card" data-act="race" data-v="${r.id}" aria-pressed="${c.race === r.id}"><b>${r.icon} ${esc(s ? s.name : r.name)}</b>${esc(bonusText(b))}${r.choose && r.choose.abil ? ', +1 to two' : ''} · ${r.speed} ft.</button>`;
        }).join('')}</div>`;
    if (race) {
        h += `<h3>${race.icon} ${esc(sub ? `${sub.name} (${race.name})` : race.name)}</h3>
            <p>${esc(race.size)}, speed ${race.speed} ft. Languages: ${esc(race.langs.join(', '))}.</p>
            <ul class="cb-list">${d.raceTraits.map(t => `<li><b>${esc(t.name)}.</b> ${esc(t.text)}</li>`).join('')}</ul>`;
        const ch = race.choose || {}, sch = (sub && sub.choose) || {};
        if (ch.abil) {
            h += `<h4>+1 to two abilities ${countTag(c.raceOpt.abil.length, ch.abil)}</h4>` +
                chips('raceOpt.abil', CB_ABILITIES.filter(a => a !== ch.abilNot).map(a => [a, CB_ABILITY_NAMES[a]]), c.raceOpt.abil, ch.abil);
        }
        if (ch.skill) {
            h += `<h4>Skill Versatility ${countTag(c.raceOpt.skills.length, ch.skill)}</h4>` +
                chips('raceOpt.skills', Object.entries(CB_SKILLS).map(([id, s]) => [id, s[0]]), c.raceOpt.skills, ch.skill);
        }
        const row = [];
        if (ch.tool) row.push(select('raceOpt.tool', [['', 'Pick a tool…'], ...ch.tool.map(t => [t, t])], c.raceOpt.tool, 'Tool proficiency'));
        if (ch.ancestry) row.push(select('raceOpt.ancestry', [['', 'Pick a dragon…'], ...Object.entries(CB_DRAGONS).map(([id, x]) => [id, `${x.name}: ${x.dmg}, ${x.area}`])], c.raceOpt.ancestry, 'Draconic ancestry'));
        if (sch.cantrip) row.push(select('raceOpt.cantrip', [['', 'Pick a wizard cantrip…'], ...cbSpellsFor('Wizard', 0).map(s => [s.name, s.name])], c.raceOpt.cantrip, 'High Elf cantrip'));
        if (row.length) h += `<div class="cb-row">${row.join('')}</div>`;
        const langN = (ch.lang || 0) + (sch.lang || 0);
        if (langN) {
            h += `<h4>Extra language${langN > 1 ? 's' : ''} ${countTag(c.raceOpt.langs.length, langN)}</h4>` +
                chips('raceOpt.langs', CB_LANGUAGES.filter(l => !race.langs.includes(l)).map(l => [l, l]), c.raceOpt.langs, langN);
        }
    }
    return h + stepTodo('race') + nextButtons();
}

function renderClass() {
    const c = cur, k = cbClass(c.cls), d = cbDerive(c);
    let h = `<h2>Class</h2><p class="cb-lead">Your class is what you do: it sets your hit points, proficiencies, and features at every level.</p>
        <div class="cb-cards">${CB_CLASSES.map(x => `<button type="button" class="cb-card" data-act="class" data-v="${x.id}" aria-pressed="${c.cls === x.id}"><b>${x.icon} ${esc(x.name)}</b>d${x.hd} · ${x.primary.map(a => a.toUpperCase()).join(', ')}${x.cast ? ' · spells' : ''}</button>`).join('')}</div>`;
    if (!k) return h + stepTodo('class') + nextButtons();
    const lv = Array.from({ length: 20 }, (_, i) => [i + 1, `Level ${i + 1}`]);
    h += `<h3>${k.icon} ${esc(k.name)}: ${esc(k.sub.name)}</h3>
        <div class="cb-row">${select('level', lv, c.level, 'Level', 'cb-field cb-narrow')}
        ${select('hpMode', [['avg', `Average (${k.hd / 2 + 1} per level)`], ['roll', `Roll a d${k.hd} per level`]], c.hpMode, 'Hit points after 1st level')}</div>
        <ul class="cb-list">
          <li><b>Hit dice:</b> d${k.hd}. Hit points: ${d.hp} at level ${c.level} (${k.hd} + CON at 1st level).</li>
          <li><b>Saving throws:</b> ${k.saves.map(a => CB_ABILITY_NAMES[a]).join(', ')}.</li>
          <li><b>Armor:</b> ${esc(d.armorProfs.length ? d.armorProfs.map(a => a === 'shield' ? 'shields' : a + ' armor').join(', ') : 'none')}${k.armorNote ? ` (${esc(k.armorNote)})` : ''}. <b>Weapons:</b> ${esc(d.weaponProfs.join(', '))}.</li>
          <li><b>${esc(k.sub.kind)}:</b> ${esc(k.sub.name)}, from level ${k.sub.at}.</li>
        </ul>`;
    if (c.hpMode === 'roll' && c.level > 1) {
        const con = d.m.con;
        h += `<h4>Hit point rolls (d${k.hd} ${cbSign(con)} CON each)</h4><div class="cb-chips">` +
            Array.from({ length: c.level - 1 }, (_, i) => {
                const r = c.hpRolls[i];
                return `<button type="button" class="cb-chip" data-act="hp-roll" data-v="${i}" title="Roll level ${i + 2}" aria-pressed="${!!r}">Lv ${i + 2}: ${r ? r : '🎲'}</button>`;
            }).join('') + `</div><button type="button" class="cb-btn cb-mini" data-act="hp-roll-all">🎲 Roll the missing ones</button>`;
    }
    cbClassChoices(c).forEach(ch => {
        const have = cbChoiceValue(c, ch.key).filter(v => ch.options[v]);
        h += `<h4>${esc(ch.label)} ${countTag(have.length, ch.n)}</h4>`;
        if (ch.skills) {
            const src = cbSkillSources({ ...c, opts: { ...c.opts, loreSkills: [] } });
            h += chips('opts.loreSkills', Object.entries(CB_SKILLS).map(([id, s]) => [id, s[0]]), c.opts.loreSkills, 3, src);
            return;
        }
        const full = have.length >= ch.n;
        h += `<div class="cb-chips">${Object.entries(ch.options).map(([id, o]) => {
            const on = have.includes(id);
            return `<button type="button" class="cb-chip" data-act="choice" data-key="${esc(ch.key)}" data-v="${esc(id)}" data-n="${ch.n}" data-single="${ch.single ? 1 : ''}" aria-pressed="${on}"${!on && full && !ch.single && ch.n > 1 ? ' disabled' : ''}>${esc(o[0])}${o[1] ? `<small>${esc(o[1])}</small>` : ''}</button>`;
        }).join('')}</div>`;
        if (ch.key === 'invocations') {
            const locked = Object.entries(CB_INVOCATIONS).filter(([id]) => !ch.options[id]).length;
            if (locked) h += `<p class="cb-faint">${locked} more unlock with level, a pact boon, or the eldritch blast cantrip.</p>`;
        }
    });
    const asi = ((k.asi) || CB_ASI_LEVELS);
    h += `<h3>Features by level</h3><ul class="cb-list">` +
        k.features.map(([lv, n, t]) => {
            const text = typeof t === 'function' ? t(d.x) : t;
            return `<li${lv > c.level ? ' class="cb-later"' : ''}><span class="cb-lv">Lv ${lv}</span><b>${esc(n)}.</b> ${esc(text)}</li>`;
        }).join('') +
        `<li${asi[0] > c.level ? ' class="cb-later"' : ''}><span class="cb-lv">Lv ${asi.join(', ')}</span><b>Ability Score Improvement.</b> +2 to one score, +1 to two, or a feat (set on the Abilities step).</li></ul>`;
    return h + stepTodo('class') + nextButtons();
}

function renderAbilities() {
    const c = cur, k = cbClass(c.cls), d = cbDerive(c), race = cbRacialBonus(c);
    const methods = [['array', 'Standard array'], ['point', 'Point buy'], ['roll', 'Roll 4d6'], ['manual', 'Enter my own']];
    let h = `<h2>Ability Scores</h2><p class="cb-lead">${k ? `${esc(k.name)}s lean on ${k.primary.map(a => CB_ABILITY_NAMES[a]).join(' and ')}.` : 'Pick a class first to see which scores matter most.'} Race bonuses and improvements are added for you.</p>
        <div class="cb-btns" role="group" aria-label="How to set scores">${methods.map(([m, t]) => `<button type="button" class="cb-btn" data-act="method" data-v="${m}" aria-pressed="${c.assigned && c.method === m}">${t}</button>`).join('')}</div>`;
    if (!c.assigned && c.method !== 'roll') return h + `<p class="cb-faint" style="margin-top:14px">Choose a method to start.</p>` + stepTodo('abilities') + nextButtons();
    let pool = null;
    if (c.method === 'array') { h += `<p style="margin-top:12px">Assign 15, 14, 13, 12, 10, and 8. Picking a number swaps it with the score that had it.</p>`; pool = CB_STANDARD_ARRAY; }
    if (c.method === 'point') {
        const spent = cbPointSpent(c.base);
        h += `<p style="margin-top:12px">Scores start at 8 and cost more as they rise (15 at most before race). <b>${CB_POINT_BUDGET - spent}</b> of ${CB_POINT_BUDGET} points left.</p>`;
    }
    if (c.method === 'roll') {
        h += `<p style="margin-top:12px"><button type="button" class="cb-btn cb-gold" data-act="roll-scores">🎲 ${c.pool && c.pool.length === 6 ? 'Roll Again' : 'Roll 4d6, Drop the Lowest'}</button></p>`;
        if (!c.pool || c.pool.length !== 6) return h + stepTodo('abilities') + nextButtons();
        h += `<p>Rolled: ${c.pool.map((n, i) => `<b>${n}</b>${lastRollDice ? ` <span class="cb-tag">[${lastRollDice[i].map((v, j) => j === lastRollDice[i].indexOf(Math.min(...lastRollDice[i])) ? `(${v})` : v).join(', ')}]</span>` : ''}`).join(' · ')}. Picking a number swaps it with the score that had it.</p>`;
        pool = c.pool;
    }
    if (c.method === 'manual') h += `<p style="margin-top:12px">Type the scores you rolled at the table (before race bonuses).</p>`;
    h += `<div class="cb-abil-grid">${CB_ABILITIES.map(a => {
        let ctl;
        if (pool) ctl = `<select data-assign="${a}" aria-label="${CB_ABILITY_NAMES[a]} base score">${[...new Set(pool)].sort((x, y) => y - x).map(v => `<option${v === c.base[a] ? ' selected' : ''}>${v}</option>`).join('')}</select>`;
        else if (c.method === 'point') ctl = `<div class="cb-pm"><button type="button" class="cb-btn" data-act="pt" data-v="${a}" data-d="-1" aria-label="Lower ${CB_ABILITY_NAMES[a]}"${c.base[a] <= 8 ? ' disabled' : ''}>−</button><span>${c.base[a]}</span><button type="button" class="cb-btn" data-act="pt" data-v="${a}" data-d="1" aria-label="Raise ${CB_ABILITY_NAMES[a]}"${c.base[a] >= 15 || cbPointSpent({ ...c.base, [a]: c.base[a] + 1 }) > CB_POINT_BUDGET ? ' disabled' : ''}>+</button></div>`;
        else ctl = `<input type="number" min="3" max="20" data-manual="${a}" value="${c.base[a]}" aria-label="${CB_ABILITY_NAMES[a]} base score">`;
        const extra = d.s[a] - c.base[a] - race[a];
        const from = [race[a] ? `${cbSign(race[a])} race` : '', extra ? `${cbSign(extra)} ASI` : ''].filter(Boolean).join(', ');
        return `<div class="cb-abil"><b title="${CB_ABILITY_NAMES[a]}">${a.toUpperCase()}${k && k.primary[0] === a ? ' ★' : ''}</b>${ctl}<span class="cb-from">${esc(from)}</span><div class="cb-total">${d.s[a]}</div><span class="cb-mod">${cbSign(d.m[a])}</span></div>`;
    }).join('')}</div>`;
    const lvls = cbAsiLevels(c);
    if (k && lvls.length) {
        h += `<h3>Ability Score Improvements</h3><p class="cb-lead">At each of these levels: +2 to one score, +1 to two, or the Grappler feat. Scores stop at 20.</p>`;
        lvls.forEach(lv => {
            const p = c.asi[lv] || {};
            const mode = p.feat ? 'feat' : p.a ? (p.a === p.b ? 'two' : 'split') : '';
            const abil = (part, v) => `<select data-asi="${lv}" data-part="${part}" aria-label="Level ${lv} ability ${part === 'a' ? 'one' : 'two'}">${CB_ABILITIES.map(a => `<option value="${a}"${a === v ? ' selected' : ''}>${CB_ABILITY_NAMES[a]}</option>`).join('')}</select>`;
            h += `<div class="cb-opt"><span class="cb-lv">Level ${lv}</span>
                <select data-asi="${lv}" data-part="mode" aria-label="Level ${lv} improvement"><option value="">Choose…</option><option value="two"${mode === 'two' ? ' selected' : ''}>+2 to one score</option><option value="split"${mode === 'split' ? ' selected' : ''}>+1 to two scores</option><option value="feat"${mode === 'feat' ? ' selected' : ''}>Feat: Grappler</option></select>
                ${mode === 'two' ? abil('a', p.a) : mode === 'split' ? abil('a', p.a) + abil('b', p.b) : mode === 'feat' ? `<span class="cb-tag">${esc(CB_FEATS.grappler.text)} Needs STR 13.</span>` : ''}</div>`;
        });
    }
    return h + stepTodo('abilities') + nextButtons();
}

function renderBackground() {
    const c = cur;
    let h = `<h2>Background</h2><p class="cb-lead">Where you came from: two skills, a couple of languages or tools, and a little gear. The SRD has one background, the Acolyte; or make up your own.</p>
        <div class="cb-cards">
          <button type="button" class="cb-card" data-act="bg" data-v="acolyte" aria-pressed="${c.bg === 'acolyte'}"><b>🕯️ Acolyte</b>Insight, Religion · 2 languages</button>
          <button type="button" class="cb-card" data-act="bg" data-v="custom" aria-pressed="${c.bg === 'custom'}"><b>✍️ Your own</b>Any 2 skills · 2 tools or languages</button>
        </div>`;
    const known = cbLanguages({ ...c, bgOpt: { ...c.bgOpt, langs: [], extras: [] } });
    const fromRace = {};
    Object.entries(cbSkillSources({ ...c, bg: '', skills: [] })).forEach(([s, f]) => { fromRace[s] = f; });
    if (c.bg === 'acolyte') {
        const bg = CB_BACKGROUNDS.acolyte;
        h += `<h3>🕯️ Acolyte</h3><ul class="cb-list">
            <li><b>Skills:</b> Insight, Religion.</li>
            <li><b>${esc(bg.feature[0])}.</b> ${esc(bg.feature[1])}</li>
            <li><b>Gear:</b> ${esc(bg.gear.join(', ').toLowerCase())}, and ${bg.gold} gp.</li></ul>
            <h4>Two languages ${countTag(c.bgOpt.langs.length, 2)}</h4>` +
            chips('bgOpt.langs', CB_LANGUAGES.filter(l => !known.includes(l)).map(l => [l, l]), c.bgOpt.langs, 2);
    }
    if (c.bg === 'custom') {
        h += `<h3>✍️ Your own background</h3>
            <div class="cb-row"><label class="cb-field">Name it<input type="text" data-f="bgOpt.name" maxlength="40" value="${esc(c.bgOpt.name)}" placeholder="Caravan guard, hedge scholar, ferry pilot…" autocomplete="off"></label></div>
            <h4>Two skills ${countTag(c.bgOpt.skills.length, 2)}</h4>` +
            chips('bgOpt.skills', Object.entries(CB_SKILLS).map(([id, s]) => [id, s[0]]), c.bgOpt.skills, 2, fromRace) +
            `<h4>Two tools or languages ${countTag(c.bgOpt.extras.length, 2)}</h4>` +
            chips('bgOpt.extras', CB_LANGUAGES.filter(l => !known.includes(l)).map(l => [l, l]), c.bgOpt.extras, 2) +
            chips('bgOpt.extras', CB_TOOLS.filter(t => !cbTools({ ...c, bg: '' }).includes(t)).map(t => [t, t]), c.bgOpt.extras, 2) +
            `<p class="cb-faint">You start with common clothes and 10 gp; add anything your story needs on the Equipment step.</p>`;
    }
    return h + stepTodo('background') + nextButtons();
}

function renderSkills() {
    const c = cur, k = cbClass(c.cls), d = cbDerive(c);
    let h = `<h2>Skills &amp; Tools</h2>`;
    if (!k) return h + '<p class="cb-faint">Pick a class first.</p>' + nextButtons();
    const others = cbSkillSources({ ...c, skills: [] });
    const fromList = cbClassSkillChoices(c);
    h += `<p class="cb-lead">Proficiency adds +${d.prof} to a skill. Skills you already have from your race or background are marked.</p>
        <h4>${esc(k.name)} skills ${countTag(c.skills.length, k.skills.n)}</h4>` +
        chips('skills', fromList.map(id => [id, CB_SKILLS[id][0], CB_SKILLS[id][1].toUpperCase()]), c.skills, k.skills.n, others);
    if (k.toolPick) {
        const from = k.toolPick.from === 'instrument' ? CB_INSTRUMENTS : [...CB_ARTISAN_TOOLS, ...CB_INSTRUMENTS];
        h += `<h4>${k.toolPick.from === 'instrument' ? 'Musical instruments' : "An artisan's tool or instrument"} ${countTag(c.tools.length, k.toolPick.n)}</h4>` +
            chips('tools', from.map(t => [t, t]), c.tools, k.toolPick.n);
    }
    const ex = cbExpertiseCount(c);
    if (ex) {
        const profs = d.skills.filter(s => s.prof).map(s => [s.id, s.name]);
        if (c.cls === 'rogue') profs.push(["Thieves' tools", "Thieves' tools"]);
        h += `<h4>Expertise: double proficiency ${countTag(c.expertise.length, ex)}</h4>` + chips('expertise', profs, c.expertise, ex);
    }
    h += `<h3>All skills</h3><div class="cb-scroll"><table class="cb-table"><thead><tr><th>Skill</th><th>Ability</th><th class="cb-num">Bonus</th><th>From</th></tr></thead><tbody>` +
        d.skills.map(s => `<tr><td>${s.prof ? (s.expert ? '◆ ' : '● ') : '○ '}${esc(s.name)}</td><td>${s.a.toUpperCase()}</td><td class="cb-num">${cbSign(s.total)}</td><td>${esc(s.from)}${s.expert ? ' (expertise)' : ''}</td></tr>`).join('') +
        `</tbody></table></div>
        <p style="margin-top:10px"><b>Tools:</b> ${esc(d.tools.join(', ') || 'none')}. <b>Languages:</b> ${esc(d.langs.join(', ') || 'none')}.</p>`;
    return h + stepTodo('skills') + nextButtons();
}

function tokenLabel(t) {
    const [kind, rest] = t.split(/:(.+)/);
    const [what, n] = rest.split('*');
    const qty = Number(n) || 1;
    if (kind === 'w') { const w = cbWeapon(what); return qty > 1 ? `${qty} ${w.name.toLowerCase()}s` : w.name; }
    if (kind === 'a') return cbArmor(what).name;
    if (kind === 'pick') return { simple: 'any simple weapon', martial: 'any martial weapon', 'simple-melee': 'any simple melee weapon', 'martial-melee': 'any martial melee weapon', instrument: 'any musical instrument' }[what];
    return qty > 1 ? `${qty} × ${what}` : what;
}

function renderEquipment() {
    const c = cur, k = cbClass(c.cls), d = cbDerive(c);
    let h = `<h2>Equipment</h2>`;
    if (!k) return h + '<p class="cb-faint">Pick a class first.</p>' + nextButtons();
    const [dice, mult] = k.gold;
    h += `<p class="cb-lead">Take your class's starting gear, or roll for gold and shop. Your background's gear comes either way.</p>
        <div class="cb-btns" role="group" aria-label="Starting equipment"><button type="button" class="cb-btn" data-act="equip-mode" data-v="class" aria-pressed="${c.equipMode === 'class'}">🎒 Class gear</button><button type="button" class="cb-btn" data-act="equip-mode" data-v="gold" aria-pressed="${c.equipMode === 'gold'}">💰 Starting gold</button></div>`;
    if (c.equipMode === 'class') {
        h += `<div class="cb-opts" style="margin-top:12px">${k.equip.map((group, gi) => {
            const chosen = Math.min(group.length - 1, c.equip.choice[gi] || 0);
            return `<div class="cb-opt-group">${group.map((opt, oi) => {
                const parts = opt.map((t, i) => {
                    if (!t.startsWith('pick:')) return esc(tokenLabel(t));
                    const key = `${gi}-${oi}-${i}`;
                    const list = cbPickList(t.slice(5), c);
                    return `<select data-pick="${key}" aria-label="${esc(tokenLabel(t))}"${oi !== chosen ? ' disabled' : ''}><option value="">${esc(tokenLabel(t))}…</option>${list.map(w => `<option value="${esc(w)}"${c.equip.picks[key] === w ? ' selected' : ''}>${esc(CB_WEAPONS[w] ? CB_WEAPONS[w][0] + (cbWeaponProf(c, w) ? '' : ' (not proficient)') : w)}</option>`).join('')}</select>`;
                }).join(', ');
                return group.length > 1
                    ? `<label class="cb-opt"><input type="radio" name="eq-${gi}" data-eq="${gi}" value="${oi}"${oi === chosen ? ' checked' : ''}> ${parts}</label>`
                    : `<div class="cb-opt">✓ ${parts}</div>`;
            }).join('')}</div>`;
        }).join('')}</div>
        <p style="margin-top:12px"><button type="button" class="cb-btn cb-gold" data-act="use-gear">🎒 ${c.gearSet ? 'Replace My Gear With This' : 'Take This Gear'}</button></p>`;
    } else {
        h += `<p style="margin-top:12px"><button type="button" class="cb-btn cb-gold" data-act="roll-gold">🎲 ${c.gearSet ? 'Start Over: ' : ''}Roll ${dice}d4${mult > 1 ? ' × ' + mult : ''} gp</button> <span class="cb-tag">plus ${cbBackgroundGear(c).gold} gp from your background</span></p>`;
    }
    if (c.gearSet || c.gear.length) {
        const armors = c.gear.filter(g => g.a);
        const hasShield = c.gear.some(g => g.name === 'Shield');
        h += `<h3>Your gear</h3>
            <div class="cb-row"><label class="cb-field cb-narrow">Coins (gp)<input type="number" min="0" step="0.01" data-f="coins" value="${c.coins}"></label><p style="margin:0 0 8px"><b>${esc(formatCoins(c.coins, true))}</b></p></div>
            <div class="cb-scroll"><table class="cb-table cb-gear"><thead><tr><th>Item</th><th>Qty</th><th></th></tr></thead><tbody>` +
            (c.gear.length ? c.gear.map((g, i) => {
                const pack = CB_PACKS[g.name];
                return `<tr><td>${esc(g.name)}${pack ? `<br><span class="cb-tag">${esc(pack[1])}</span>` : ''}</td><td><input type="number" min="1" max="9999" data-gear-qty="${i}" value="${g.qty}" aria-label="How many ${esc(g.name)}"></td><td><button type="button" class="cb-btn cb-mini" data-act="gear-del" data-v="${i}" aria-label="Remove ${esc(g.name)}">✕</button></td></tr>`;
            }).join('') : '<tr><td colspan="3" class="cb-faint">Nothing yet.</td></tr>') +
            `</tbody></table></div>
            <h4>Buy or add</h4>
            <div class="cb-row"><label class="cb-field">Item<select id="cb-buy">${buyOptions(c)}</select></label>
              <div class="cb-btns"><button type="button" class="cb-btn" data-act="buy">💰 Buy</button><button type="button" class="cb-btn" data-act="buy" data-v="free">➕ Add free</button></div></div>
            <div class="cb-row"><label class="cb-field">Something else<input type="text" id="cb-custom-item" maxlength="80" placeholder="A locket, a lucky coin, a letter…" autocomplete="off"></label>
              <div class="cb-btns"><button type="button" class="cb-btn" data-act="add-item">➕ Add</button></div></div>
            <h4>Wearing</h4>
            <div class="cb-row">${select('wear.armor', [['', 'No armor'], ...armors.map(g => [g.a, g.name])], c.wear.armor, 'Armor')}
              ${hasShield ? `<label class="cb-opt"><input type="checkbox" data-f="wear.shield"${c.wear.shield ? ' checked' : ''}> Shield</label>` : ''}
              <p style="margin:0 0 8px">AC <b>${d.ac}</b> <span class="cb-tag">(${esc(d.acHow)})</span></p></div>` +
            d.notes.map(n => `<p class="cb-warn">⚠️ ${esc(n)}</p>`).join('');
    }
    return h + stepTodo('equipment') + nextButtons();
}

function buyOptions(c) {
    const price = gp => formatCoins(gp);
    const w = Object.keys(CB_WEAPONS).map(id => { const x = cbWeapon(id); return `<option value="w:${id}">${esc(x.name)} (${price(x.cost)})${cbWeaponProf(c, id) ? '' : ' ✗'}</option>`; }).join('');
    const a = Object.keys(CB_ARMOR).map(id => { const x = cbArmor(id); return `<option value="a:${id}">${esc(x.name)}, AC ${x.base}${x.type === 'heavy' ? '' : x.cap === 2 ? ' + DEX (max 2)' : ' + DEX'} (${price(x.cost)})${cbArmorProfs(c).includes(x.type) ? '' : ' ✗'}</option>`; }).join('');
    const p = Object.entries(CB_PACKS).map(([n, v]) => `<option value="g:${esc(n)}">${esc(n)} (${price(v[0])})</option>`).join('');
    const g = CB_GOODS.map(([n, v]) => `<option value="g:${esc(n)}">${esc(n)} (${price(v)})</option>`).join('');
    return `<optgroup label="Weapons (✗ = not proficient)">${w}</optgroup><optgroup label="Armor">${a}</optgroup><optgroup label="Packs">${p}</optgroup><optgroup label="Gear">${g}</optgroup>`;
}

function itemPrice(val) {
    const [kind, id] = val.split(/:(.+)/);
    if (kind === 'w') { const w = cbWeapon(id); return { item: { name: w.name, qty: 1, w: id }, cost: w.cost }; }
    if (kind === 'a') { const a = cbArmor(id); return { item: { name: a.name, qty: 1, a: id }, cost: a.cost }; }
    const pack = CB_PACKS[id], good = CB_GOODS.find(x => x[0] === id);
    return { item: { name: id, qty: 1 }, cost: pack ? pack[0] : good ? good[1] : 0 };
}

function renderSpells() {
    const c = cur, r = cbSpellRules(c), d = cbDerive(c);
    let h = `<h2>Spells</h2>`;
    const racial = cbRaceSpells(c);
    const racialHtml = racial.length ? `<h4>From your race</h4><ul class="cb-list">${racial.map(s => `<li>${spellLink(s.name)} <span class="cb-tag">${esc(s.note)}</span></li>`).join('')}</ul>` : '';
    if (!r || (!r.cantrips && !r.list && !r.slots.length && !r.pact)) {
        const k = cbClass(c.cls);
        h += `<p class="cb-lead">${k && k.cast ? `${esc(k.name)}s start casting at level 2.` : k ? `${esc(k.name)}s don't cast spells.` : 'Pick a class first.'}</p>`;
        return h + racialHtml + nextButtons();
    }
    const slotText = r.pact ? `${r.pact[0]} × ${cbOrd(r.pact[1])}-level (short rest)` : r.slots.map((n, i) => `${n}×${cbOrd(i + 1)}`).join(' · ');
    h += `<div class="cb-spell-head"><span><b>${CB_ABILITY_NAMES[r.ability]}</b> casting</span><span>Save DC <b>${d.magic.dc}</b></span><span>Spell attack <b>${cbSign(d.magic.attack)}</b></span><span>Slots: ${esc(slotText)}</span></div>
        <p style="margin-top:10px"><input type="search" class="cb-filter" id="cb-spell-filter" placeholder="Filter spells…" aria-label="Filter spells" autocomplete="off"></p>`;
    if (r.offList || r.offCantrips) {
        h += `<p><label class="cb-opt"><input type="checkbox" data-act="show-all"${showAllSpells ? ' checked' : ''}> Show every class's spells (${r.offList ? `${r.offList} spells` : ''}${r.offList && r.offCantrips ? ' and ' : ''}${r.offCantrips ? `${r.offCantrips} cantrips` : ''} may come from any list)</label></p>`;
    }
    h += racialHtml;
    const always = d.magic.always;
    if (always.length) h += `<h4>Always prepared (${esc(cbClass(c.cls).sub.name)}${c.cls === 'druid' ? ', ' + esc(c.opts.land) : ''})</h4><p>${always.map(spellLink).join(', ')}</p>`;
    const k = cbClass(c.cls);
    const alwaysLow = always.map(n => n.toLowerCase());
    const listSpells = (level, kind, chosen, max, offOk) => {
        let pool = cbClassSpells(c, level);
        if (offOk && showAllSpells) {
            const names = new Set(pool.map(s => s.name));
            pool = [...pool, ...SPELLS_DATA.filter(s => s.level === level && !names.has(s.name))];
        }
        pool = pool.filter(s => !alwaysLow.includes(s.name.toLowerCase()));
        const full = chosen.length >= max;
        return `<div class="cb-spells">${pool.map(s => {
            const on = chosen.includes(s.name);
            const off = !s.classes.includes(k.name) && !(k.sub.expanded && Object.values(k.sub.expanded).flat().includes(s.name));
            const tags = [s.school, s.concentration ? 'conc.' : '', s.ritual ? 'ritual' : '', off ? 'other class' : ''].filter(Boolean).join(' · ');
            return `<label class="cb-spell${on ? ' on' : ''}${!on && full ? ' cb-dim' : ''}" data-name="${esc(s.name.toLowerCase())}"><input type="checkbox" data-sk="${kind}" value="${esc(s.name)}"${on ? ' checked' : ''}${!on && full ? ' disabled' : ''}><span>${esc(s.name)}<a href="spell/${spellSlug(s.name)}" target="_blank" rel="noopener" aria-label="Open ${esc(s.name)} in a new tab">↗</a><small>${esc(tags)}</small></span></label>`;
        }).join('')}</div>`;
    };
    if (r.cantrips) h += `<h3>Cantrips ${countTag(c.spells.cantrips.length, r.cantrips)}</h3>` + listSpells(0, 'cantrips', c.spells.cantrips, r.cantrips, r.offCantrips > 0);
    const word = r.type === 'prepared' ? 'Prepared spells' : r.type === 'book' ? 'Spellbook' : 'Spells known';
    if (r.list) {
        h += `<h3>${word} ${countTag(c.spells.list.length, r.list)}</h3>`;
        if (r.type === 'prepared') h += `<p class="cb-lead">You can change these after each long rest.</p>`;
        if (r.type === 'book') h += `<p class="cb-lead">Six at 1st level and two more each level; you can also copy spells you find into it.</p>`;
        for (let lv = 1; lv <= r.maxLevel; lv++) {
            h += `<h4>${cbOrd(lv)} level</h4>` + listSpells(lv, 'list', c.spells.list, r.list, r.offList > 0);
        }
    }
    if (r.type === 'book' && c.spells.list.length) {
        const max = r.prepared, chosen = c.spells.prepared, full = chosen.length >= max;
        h += `<h3>Prepared from your book ${countTag(chosen.length, max)}</h3><div class="cb-spells">` +
            c.spells.list.map(n => cbSpell(n)).filter(Boolean).sort((a, b) => a.level - b.level || a.name.localeCompare(b.name)).map(s => {
                const on = chosen.includes(s.name);
                return `<label class="cb-spell${on ? ' on' : ''}${!on && full ? ' cb-dim' : ''}" data-name="${esc(s.name.toLowerCase())}"><input type="checkbox" data-sk="prepared" value="${esc(s.name)}"${on ? ' checked' : ''}${!on && full ? ' disabled' : ''}><span>${esc(s.name)}<small>${cbOrd(s.level)} level</small></span></label>`;
            }).join('') + '</div>';
    }
    if (r.arcanum.length) {
        h += `<h3>Mystic Arcanum</h3><div class="cb-row">` + r.arcanum.map(lv =>
            `<label class="cb-field">${cbOrd(lv)} level<select data-arcanum="${lv}"><option value="">Pick a spell…</option>${cbClassSpells(c, lv).map(s => `<option${c.spells.arcanum[lv] === s.name ? ' selected' : ''}>${esc(s.name)}</option>`).join('')}</select></label>`).join('') + '</div>';
    }
    return h + stepTodo('spells') + nextButtons();
}

function portraitSrc(c) {
    if (typeof npcPortraitSrc !== 'function') return '';
    const g = { male: 'male', female: 'female', nonbinary: 'nonbinary' }[String(c.gender).toLowerCase()];
    return g ? npcPortraitSrc(CB_NPC_RACE[c.race], g) : '';
}

function renderDetails() {
    const c = cur;
    const pic = portraitSrc(c);
    return `<h2>Details</h2><p class="cb-lead">The parts no rule decides.</p>
        <div class="cb-sheet-head">${pic ? `<img class="cb-portrait" src="${pic}" alt="" width="76" height="76">` : ''}
        <div class="cb-row" style="flex:1">
          <label class="cb-field">Character name<input type="text" data-f="name" maxlength="60" value="${esc(c.name)}" autocomplete="off"></label>
          <label class="cb-field">Player<input type="text" data-f="player" maxlength="60" value="${esc(c.player)}" autocomplete="off"></label>
        </div></div>
        <div class="cb-row">
          ${select('gender', [['', '—'], ['Female', 'Female'], ['Male', 'Male'], ['Nonbinary', 'Nonbinary']], c.gender, 'Gender (sets the portrait)')}
          <label class="cb-field cb-narrow">Age<input type="text" data-f="age" maxlength="20" value="${esc(c.age)}" autocomplete="off"></label>
          ${select('alignment', [['', '—'], ...CB_ALIGNMENTS.map(a => [a, a])], c.alignment, 'Alignment')}
        </div>
        <label class="cb-field">Appearance, personality, backstory, notes<textarea data-f="notes" rows="8" maxlength="4000">${esc(c.notes)}</textarea></label>
        <p style="margin-top:12px"><button type="button" class="cb-btn" data-act="random-name">🎲 Random name</button></p>` + nextButtons();
}

function renderSheet() {
    const c = cur, d = cbDerive(c);
    const todo = cbTodo(c);
    const stepName = id => (CB_STEPS.find(s => s[0] === id) || [id, id])[1];
    let h = '';
    if (todo.length) h += `<ul class="cb-todo"><li><b>Still to pick:</b></li>${todo.map(t => `<li>• ${esc(t.text)} <button type="button" data-act="goto" data-v="${t.step}">${esc(stepName(t.step))} →</button></li>`).join('')}</ul>`;
    if (lastLevelUp && lastLevelUp.id === c.id) {
        h += `<div class="cb-levelup"><p><b>⬆️ Level ${lastLevelUp.level}!</b> ${lastLevelUp.features.length ? 'New: ' + esc(lastLevelUp.features.join(', ')) + '.' : 'No new features this level, but more hit points' + (cbSpellRules(c) ? ' and maybe spells' : '') + '.'}</p>${lastLevelUp.hp ? `<p class="cb-tag">Hit points ${lastLevelUp.hp}</p>` : ''}</div>`;
    }
    const pic = portraitSrc(c);
    const k = d.k;
    const bgName = c.bg === 'custom' ? (c.bgOpt.name || 'Custom background') : c.bg ? CB_BACKGROUNDS[c.bg].name : '';
    h += `<div class="cb-sheet-head">${pic ? `<img class="cb-portrait" src="${pic}" alt="" width="76" height="76">` : ''}
        <div class="cb-sheet-title"><h2>${esc(c.name || 'Unnamed character')}</h2>
        <p>Level ${c.level} ${esc(raceLabel(c))} ${k ? esc(k.name) + ' (' + esc(k.sub.name) + ')' : ''}${bgName ? ' · ' + esc(bgName) : ''}${c.alignment ? ' · ' + esc(c.alignment) : ''}${c.player ? ' · played by ' + esc(c.player) : ''}</p></div></div>
        <div class="cb-sheet-btns">
          <button type="button" class="cb-btn cb-gold" data-act="levelup"${c.level >= 20 || !k ? ' disabled' : ''}>⬆️ Level Up to ${Math.min(20, c.level + 1)}</button>
          <button type="button" class="cb-btn" data-act="print">🖨️ Print</button>
          <button type="button" class="cb-btn" data-act="party"${!k ? ' disabled' : ''}>👥 Add to Party</button>
          <button type="button" class="cb-btn" data-act="copy">📋 Copy Summary</button>
        </div>
        <div class="cb-vitals">
          <div class="cb-vital"><span>Armor Class</span><b>${d.ac}</b><small>${esc(d.acHow)}</small></div>
          <div class="cb-vital"><span>Hit Points</span><b>${d.hp}</b><small>hit dice ${esc(d.hd)}</small></div>
          <div class="cb-vital"><span>Speed</span><b>${d.speed}</b><small>feet</small></div>
          <div class="cb-vital"><span>Initiative</span><b>${cbSign(d.init)}</b></div>
          <div class="cb-vital"><span>Proficiency</span><b>${cbSign(d.prof)}</b></div>
          <div class="cb-vital"><span>Passive Perc.</span><b>${d.passive}</b></div>
          ${d.magic ? `<div class="cb-vital"><span>Spell DC</span><b>${d.magic.dc}</b><small>attack ${cbSign(d.magic.attack)}</small></div>` : ''}
        </div>` + d.notes.map(n => `<p class="cb-warn">⚠️ ${esc(n)}</p>`).join('') + `
        <div class="cb-abil-grid" style="margin:10px 0 4px">${CB_ABILITIES.map(a => {
            const sv = d.saves.find(x => x.a === a);
            return `<div class="cb-abil"><b>${a.toUpperCase()}</b><div class="cb-total">${d.s[a]}</div><span class="cb-mod">${cbSign(d.m[a])}</span><span class="cb-from">save ${sv.prof ? '●' : '○'} ${cbSign(sv.total)}</span></div>`;
        }).join('')}</div>
        <div class="cb-cols"><div>
          <h3>Skills</h3><ul class="cb-skill-list">${d.skills.map(s => `<li class="${s.prof ? 'p' : ''}"><span class="cb-dot">${s.expert ? '◆' : s.prof ? '●' : '○'}</span><span class="cb-val">${cbSign(s.total)}</span><span>${esc(s.name)} <small>${s.a.toUpperCase()}</small></span></li>`).join('')}</ul>
          <h3>Proficiencies &amp; Languages</h3><ul class="cb-list">
            <li><b>Armor:</b> ${esc(d.armorProfs.map(a => a === 'shield' ? 'shields' : a).join(', ') || 'none')}</li>
            <li><b>Weapons:</b> ${esc(d.weaponProfs.join(', ') || 'none')}</li>
            <li><b>Tools:</b> ${esc(d.tools.join(', ') || 'none')}</li>
            <li><b>Languages:</b> ${esc(d.langs.join(', ') || 'none')}</li>
            <li><b>Senses:</b> ${esc(d.senses.join(', '))}</li></ul>
          <h3>Equipment</h3><p>${c.gear.length ? esc(c.gear.map(g => g.qty > 1 ? `${g.name} (${g.qty})` : g.name).join(', ')) : '<span class="cb-faint">None yet.</span>'}</p>
          <p><b>Coins:</b> ${esc(formatCoins(c.coins, true))}</p>
          ${c.notes ? `<h3>Notes</h3><p style="white-space:pre-wrap">${esc(c.notes)}</p>` : ''}
        </div><div>
          <h3>Attacks</h3><div class="cb-scroll"><table class="cb-table"><thead><tr><th>Name</th><th class="cb-num">Hit</th><th>Damage</th><th>Notes</th></tr></thead><tbody>
          ${d.attacks.map(a => `<tr><td>${esc(a.name)}</td><td class="cb-num">${cbSign(a.hit)}</td><td>${esc(a.dmg)} ${esc(a.type)}</td><td><span class="cb-tag">${esc(a.props)}${a.prof ? '' : (a.props ? ', ' : '') + 'not proficient'}</span></td></tr>`).join('')}
          ${d.breath ? `<tr><td>Breath weapon</td><td class="cb-num">DC ${d.x.dc('con')}</td><td>${esc(d.breath.dice)} ${esc(d.breath.dmg)}</td><td><span class="cb-tag">${esc(d.breath.area)}, ${d.breath.save.toUpperCase()} save for half</span></td></tr>` : ''}
          </tbody></table></div>
          ${sheetSpells(c, d)}
          <h3>Features &amp; Traits</h3><ul class="cb-list">
          ${d.classFeatures.map(f => `<li><b>${esc(f.name)}</b> <span class="cb-tag">${esc(k.name)} ${f.level}</span><br>${esc(f.text)}</li>`).join('')}
          ${d.picked.map(f => `<li><b>${esc(f.name)}.</b> ${esc(f.text)}</li>`).join('')}
          ${d.feats.map(f => `<li><b>${esc(f.name)}</b> <span class="cb-tag">feat</span><br>${esc(f.text)}</li>`).join('')}
          ${d.raceTraits.map(f => `<li><b>${esc(f.name)}</b> <span class="cb-tag">${esc(raceLabel(c))}</span><br>${esc(f.text)}</li>`).join('')}
          ${d.bgFeature ? `<li><b>${esc(d.bgFeature.name)}</b> <span class="cb-tag">${esc(bgName)}</span><br>${esc(d.bgFeature.text)}</li>` : ''}
          </ul>
        </div></div>
        <p class="print-only cb-tag" style="margin-top:8pt">The Beholder's Gazette Character Builder · gazette.ashforgestudio.com/character-builder · SRD 5.1, CC BY 4.0</p>`;
    return h;
}

function sheetSpells(c, d) {
    const racial = cbRaceSpells(c);
    if (!d.magic && !racial.length) return '';
    let h = `<h3>Spells</h3>`;
    if (d.magic) {
        const r = d.magic.rules;
        h += `<p>${d.magic.pact ? `<span class="cb-slot">${d.magic.pact[0]} pact slot${d.magic.pact[0] > 1 ? 's' : ''}, ${cbOrd(d.magic.pact[1])} level</span>` : d.magic.slots.map((n, i) => `<span class="cb-slot">${cbOrd(i + 1)}: ${'○'.repeat(n)}</span>`).join('')}</p>`;
        const byLevel = {};
        const add = (name, tag) => { const s = cbSpell(name); if (!s) return; (byLevel[s.level] = byLevel[s.level] || []).push(spellLink(s.name) + (tag ? ` <span class="cb-tag">${tag}</span>` : '')); };
        c.spells.cantrips.forEach(n => add(n));
        const prepared = r.type === 'book' ? new Set(c.spells.prepared) : null;
        c.spells.list.forEach(n => add(n, prepared ? (prepared.has(n) ? '●' : '') : ''));
        d.magic.always.forEach(n => add(n, 'always'));
        Object.values(c.spells.arcanum).forEach(n => add(n, 'arcanum'));
        h += `<ul class="cb-spell-lines">${Object.keys(byLevel).sort((a, b) => a - b).map(lv => `<li><b>${lv === '0' ? 'Cantrips' : cbOrd(Number(lv)) + ' level'}</b> ${byLevel[lv].join(', ')}</li>`).join('')}</ul>`;
        if (prepared) h += `<p class="cb-tag">● prepared today</p>`;
    }
    if (racial.length) h += `<p>${racial.map(s => `${spellLink(s.name)} <span class="cb-tag">${esc(s.note)}</span>`).join(', ')}</p>`;
    return h;
}

// ── Render ───────────────────────────────────────────────
function renderBar() {
    const pick = document.getElementById('cb-pick');
    pick.innerHTML = chars.length
        ? chars.map(c => `<option value="${c.id}"${cur && c.id === cur.id ? ' selected' : ''}>${esc(charLabel(c))}</option>`).join('')
        : '<option value="">No characters yet</option>';
    pick.disabled = !chars.length;
    ['cb-dup', 'cb-del', 'cb-export'].forEach(id => { document.getElementById(id).disabled = !cur; });
    document.getElementById('cb-count').textContent = chars.length ? `${chars.length} of ${CB_MAX} characters saved in this browser` : '';
}

function renderSteps() {
    const el = document.getElementById('cb-steps');
    if (!cur) { el.innerHTML = ''; return; }
    const todo = cbTodo(cur);
    el.innerHTML = CB_STEPS.map(([id, label], i) => {
        const n = todo.filter(t => t.step === id).length;
        const badge = id === 'sheet' ? '' : n ? `<span class="cb-badge" aria-label="${n} to do">${n}</span>` : '<span class="cb-badge ok" aria-label="done">✓</span>';
        return `<button type="button" class="cb-step" role="tab" id="cb-tab-${id}" data-step="${id}" aria-selected="${step === id}" aria-controls="cb-panel">${id === 'sheet' ? '' : `<span class="cb-n">${i + 1}</span>`}${esc(label)}${badge}</button>`;
    }).join('');
}

const RENDER = { race: renderRace, class: renderClass, abilities: renderAbilities, background: renderBackground, skills: renderSkills, equipment: renderEquipment, spells: renderSpells, details: renderDetails, sheet: renderSheet };

function focusKey(el) {
    if (!el || !el.dataset) return '';
    const d = el.dataset;
    return [d.act, d.f, d.v, d.key, d.assign, d.manual, d.asi, d.part, d.pick, d.eq, d.sk, d.arcanum, d.gearQty, el.type === 'radio' || el.type === 'checkbox' ? el.value : ''].join('|');
}

function renderPanel() {
    const panel = document.getElementById('cb-panel');
    if (!cur) {
        panel.setAttribute('aria-labelledby', '');
        panel.innerHTML = `<div class="cb-empty"><h2>No character yet</h2><p>Build one step by step, or roll a whole character in one click.</p>
            <div class="cb-btns"><button type="button" class="cb-btn cb-gold" data-act="new">➕ Start a Character</button><button type="button" class="cb-btn" data-act="quick">⚡ Quick Build</button></div></div>`;
        return;
    }
    const active = document.activeElement;
    const key = panel.contains(active) ? focusKey(active) : '';
    const filter = document.getElementById('cb-spell-filter');
    const filterText = filter ? filter.value : '';
    panel.setAttribute('aria-labelledby', 'cb-tab-' + step);
    panel.innerHTML = RENDER[step]();
    const f2 = document.getElementById('cb-spell-filter');
    if (f2 && filterText) { f2.value = filterText; filterSpells(filterText); }
    if (key) {
        const match = [...panel.querySelectorAll('button, input, select, textarea')].find(el => focusKey(el) === key);
        if (match && !match.disabled) match.focus({ preventScroll: true });
        else if (active === filter && f2) f2.focus({ preventScroll: true });
    }
}

function render() {
    renderBar();
    renderSteps();
    renderPanel();
}

function goStep(id, scroll = true) {
    step = id;
    renderSteps();
    renderPanel();
    if (scroll) {
        const top = document.getElementById('cb-steps').getBoundingClientRect().top + window.scrollY - 70;
        if (window.scrollY > top) window.scrollTo({ top });
    }
}

function openChar(c, toStep) {
    cur = c;
    lastRollDice = null;
    showAllSpells = false;
    step = toStep || (c && cbTodo(c).length ? (cbTodo(c)[0].step) : 'sheet');
    render();
}

function filterSpells(text) {
    const q = text.trim().toLowerCase();
    document.querySelectorAll('#cb-panel .cb-spell').forEach(el => { el.hidden = !!q && !el.dataset.name.includes(q); });
}

// ── Actions ──────────────────────────────────────────────
function newChar() {
    if (chars.length >= CB_MAX) { flash(`You have ${CB_MAX} characters saved; delete one first.`, true); return; }
    cur = cbBlank();
    save();
    openChar(cur, 'race');
}

function quickBuild(opts) {
    if (chars.length >= CB_MAX) { flash(`You have ${CB_MAX} characters saved; delete one first.`, true); return; }
    cur = cbQuickBuild(opts);
    save();
    openChar(cur, 'sheet');
    flash(`⚡ Rolled ${cur.name}.`);
}

function rollHp(c, i) {
    const k = cbClass(c.cls);
    c.hpRolls[i] = cbRollDie(k.hd);
}

function onClick(e) {
    const el = e.target.closest('[data-act]');
    if (!el || el.disabled) return;
    const v = el.dataset.v;
    switch (el.dataset.act) {
        case 'new': return newChar();
        case 'quick': return toggleQuick(true);
        case 'goto': return goStep(v);
        case 'race': return change(c => {
            if (c.race === v) return;
            const r = cbRace(v);
            c.race = v; c.subrace = r.subraces ? r.subraces[0].id : '';
            c.raceOpt = { langs: [], skills: [], abil: [], tool: '', cantrip: '', ancestry: '' };
        });
        case 'class': return change(c => {
            if (c.cls === v) return;
            const had = !!c.cls;
            c.cls = v;
            c.skills = []; c.tools = []; c.expertise = []; c.asi = {}; c.hpRolls = [];
            c.opts = cbBlank().opts;
            c.equip = { choice: [], picks: {} };
            c.spells = { cantrips: [], list: [], prepared: [], arcanum: {} };
            if (had && c.gearSet && c.equipMode === 'class') { c.gear = []; c.coins = 0; c.gearSet = false; c.wear = { armor: '', shield: false }; }
            if (c.method === 'array' && c.assigned) assignByClass(c, CB_STANDARD_ARRAY);
            if (had) flash('Class changed: pick its skills, gear, and spells again.');
        });
        case 'toggle': return change(c => {
            const max = Number(el.dataset.max) || 1;
            let list = getPath(c, el.dataset.f).slice();
            if (list.includes(v)) list = list.filter(x => x !== v);
            else if (list.length < max) list.push(v);
            else if (max === 1) list = [v];
            setPath(c, el.dataset.f, list);
        });
        case 'choice': return change(c => {
            const key = el.dataset.key, n = Number(el.dataset.n) || 1;
            let list = cbChoiceValue(c, key).slice();
            if (list.includes(v)) list = list.filter(x => x !== v);
            else if (el.dataset.single || n === 1) list = [v];
            else if (list.length < n) list.push(v);
            cbSetChoice(c, key, list);
            if (key === 'pact' || key === 'land') cbFitToLevel(c);
        });
        case 'method': return change(c => {
            c.method = v;
            if (v === 'array') { assignByClass(c, CB_STANDARD_ARRAY); c.assigned = true; }
            if (v === 'point') { CB_ABILITIES.forEach(a => { c.base[a] = 8; }); c.assigned = true; }
            if (v === 'roll') { c.assigned = !!(c.pool && c.pool.length === 6); if (c.assigned) assignByClass(c, c.pool); }
            if (v === 'manual') c.assigned = true;
        });
        case 'pt': return change(c => {
            const a = v, n = c.base[a] + Number(el.dataset.d);
            if (n < 8 || n > 15) return;
            if (cbPointSpent({ ...c.base, [a]: n }) > CB_POINT_BUDGET) return;
            c.base[a] = n;
        });
        case 'roll-scores': return change(c => {
            const rolls = cbRollScores();
            c.pool = rolls.map(r => r.total);
            lastRollDice = rolls.map(r => r.dice);
            assignByClass(c, c.pool);
            c.assigned = true;
        });
        case 'bg': return change(c => {
            if (c.bg === v) return;
            c.bg = v;
            c.bgOpt = { name: c.bgOpt.name, skills: [], extras: [], langs: [] };
        });
        case 'hp-roll': return change(c => rollHp(c, Number(v)));
        case 'hp-roll-all': return change(c => { for (let i = 0; i < c.level - 1; i++) if (!c.hpRolls[i]) rollHp(c, i); });
        case 'equip-mode': return change(c => { c.equipMode = v; });
        case 'use-gear': {
            const missing = cbMissingPicks(cur);
            if (missing.length) { flash('Pick the weapon or instrument in each chosen option first.', true); return; }
            return change(c => {
                const start = cbClassGear(c);
                c.gear = start.gear; c.coins = start.coins; c.gearSet = true;
                cbAutoWear(c);
                flash('🎒 Gear packed.');
            });
        }
        case 'roll-gold': return change(c => {
            const k = cbClass(c.cls);
            const r = rollDice(`${k.gold[0]}d4`);
            const bg = cbBackgroundGear(c);
            c.coins = r.total * k.gold[1] + bg.gold;
            c.gear = bg.gear; c.gearSet = true; c.wear = { armor: '', shield: false };
            flash(`🎲 ${k.gold[0]}d4 [${r.parts[0].rolls.map(x => x.v).join(', ')}]${k.gold[1] > 1 ? ' × ' + k.gold[1] : ''} = ${r.total * k.gold[1]} gp, plus ${bg.gold} gp.`);
        });
        case 'buy': {
            const sel = document.getElementById('cb-buy');
            const { item, cost } = itemPrice(sel.value);
            if (v !== 'free' && cost > cur.coins + 1e-9) { flash(`Not enough coin: ${item.name} costs ${formatCoins(cost)}.`, true); return; }
            const keep = sel.value;
            change(c => {
                cbAddGear(c.gear, item);
                if (v !== 'free') c.coins = Math.round((c.coins - cost) * 100) / 100;
                c.gearSet = true;
                if (item.a && !c.wear.armor) cbAutoWear(c);
                if (item.name === 'Shield') cbAutoWear(c);
            });
            const again = document.getElementById('cb-buy');
            if (again) again.value = keep;
            flash(`${v === 'free' ? 'Added' : 'Bought'} ${item.name}.`);
            return;
        }
        case 'add-item': {
            const input = document.getElementById('cb-custom-item');
            const name = input.value.replace(/\s+/g, ' ').trim().slice(0, 80);
            if (!name) { input.focus(); return; }
            return change(c => { cbAddGear(c.gear, { name, qty: 1 }); c.gearSet = true; });
        }
        case 'gear-del': return change(c => {
            const [g] = c.gear.splice(Number(v), 1);
            if (g && g.a === c.wear.armor) c.wear.armor = '';
            if (g && g.name === 'Shield') c.wear.shield = false;
        });
        case 'random-name': return change(c => {
            const g = { Male: 'male', Female: 'female', Nonbinary: 'nonbinary' }[c.gender] || cbPick(['male', 'female', 'nonbinary']);
            if (typeof buildName === 'function' && c.race) c.name = buildName(CB_NPC_RACE[c.race], g).name.replace(/\s+/g, ' ').slice(0, 60);
            else flash('Pick a race first.', true);
        });
        case 'levelup': {
            const before = cbHitPoints(cur);
            let up;
            change(c => { up = cbLevelUp(c); });
            if (up) {
                lastLevelUp = { id: cur.id, level: cur.level, features: up.features, hp: `${before} → ${cbHitPoints(cur)}` };
                renderPanel();
                flash(`⬆️ ${cur.name || 'Your character'} is level ${cur.level}.`);
            }
            return;
        }
        case 'print': return window.print();
        case 'party': return addToParty();
        case 'copy': return copySummary();
    }
}

function assignByClass(c, pool) {
    const k = cbClass(c.cls);
    const prio = [...new Set([...(k ? k.primary : []), 'con', 'dex', 'wis', 'str', 'int', 'cha'])];
    const sorted = pool.slice().sort((a, b) => b - a);
    prio.forEach((a, i) => { c.base[a] = sorted[i]; });
}

function onChange(e) {
    const el = e.target;
    if (!cur) return;
    const d = el.dataset;
    if (d.act === 'show-all') { showAllSpells = el.checked; renderPanel(); return; }
    if (d.f) {
        const path = d.f;
        if (el.type === 'checkbox') return change(c => setPath(c, path, el.checked));
        if (path === 'level') return change(c => { c.level = Number(el.value); cbFitToLevel(c); });
        if (path === 'coins') return change(c => { c.coins = Math.max(0, Math.round(Number(el.value) * 100) / 100 || 0); });
        if (el.tagName === 'SELECT') return change(c => setPath(c, path, el.value));
        // Text fields save on input; a change just redraws the bar.
        renderBar();
        renderSteps();
        return;
    }
    if (d.assign) return change(c => {
        const a = d.assign, val = Number(el.value);
        const other = CB_ABILITIES.find(b => b !== a && c.base[b] === val);
        if (other) c.base[other] = c.base[a];
        c.base[a] = val;
    });
    if (d.manual) return change(c => { c.base[d.manual] = Math.min(20, Math.max(3, Math.round(Number(el.value)) || 10)); });
    if (d.asi) return change(c => {
        const lv = d.asi, p = c.asi[lv] || {};
        if (d.part === 'mode') {
            const k = cbClass(c.cls);
            const first = k ? k.primary[0] : 'str';
            const second = k ? k.primary[1] : 'con';
            if (!el.value) delete c.asi[lv];
            else if (el.value === 'feat') c.asi[lv] = { feat: 'grappler' };
            else if (el.value === 'two') c.asi[lv] = { a: p.a || first, b: p.a || first };
            else c.asi[lv] = { a: p.a || first, b: p.b && p.b !== p.a ? p.b : (p.a || first) === second ? first : second };
        } else if (p.a) {
            const two = p.a === p.b;
            if (d.part === 'a') { p.a = el.value; if (two) p.b = el.value; }
            else p.b = el.value;
            if (!two && p.a === p.b) flash('Pick two different scores, or choose +2 to one.', true);
            c.asi[lv] = p;
        }
    });
    if (d.eq) return change(c => { c.equip.choice[Number(d.eq)] = Number(el.value); });
    if (d.pick) return change(c => { if (el.value) c.equip.picks[d.pick] = el.value; else delete c.equip.picks[d.pick]; });
    if (d.sk) return change(c => {
        const list = c.spells[d.sk];
        const name = el.value;
        if (el.checked && !list.includes(name)) list.push(name);
        if (!el.checked) c.spells[d.sk] = list.filter(n => n !== name);
        if (d.sk === 'list') c.spells.prepared = c.spells.prepared.filter(n => c.spells.list.includes(n));
        if (c.cls === 'warlock') cbFitToLevel(c);
    });
    if (d.arcanum) return change(c => { if (el.value) c.spells.arcanum[d.arcanum] = el.value; else delete c.spells.arcanum[d.arcanum]; });
    if (d.gearQty !== undefined) return change(c => { const g = c.gear[Number(d.gearQty)]; if (g) g.qty = Math.min(9999, Math.max(1, Math.round(Number(el.value)) || 1)); });
}

function onInput(e) {
    const el = e.target;
    if (el.id === 'cb-spell-filter') { filterSpells(el.value); return; }
    if (!cur || !el.dataset.f || el.tagName === 'SELECT' || el.type === 'checkbox' || el.type === 'number') return;
    setPath(cur, el.dataset.f, el.value);
    save();
}

function addToParty() {
    const row = cleanPartyMember(cbPartyRow(cur));
    const party = loadParty();
    const at = party.findIndex(p => p.id === row.id);
    if (at >= 0) party[at] = row;
    else if (party.length >= PARTY_MAX) { flash(`The party already has ${PARTY_MAX} characters. Remove one on the Toolbox's Party tab.`, true); return; }
    else party.push(row);
    saveParty(party);
    flash(at >= 0 ? '👥 Updated this character in the party.' : '👥 Added to the party (Toolbox → Party).');
}

function copySummary() {
    const text = cbSummary(cur);
    const done = () => flash('📋 Copied.');
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, () => flash('Could not copy.', true));
    else flash('Could not copy.', true);
}

function exportChar() {
    const blob = new Blob([JSON.stringify({ gazetteCharacter: 1, character: cur }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = (cur.name || 'character').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) + '.json';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    flash('⬇️ Exported.');
}

function importChar(file) {
    if (!file) return;
    if (file.size > 200000) { flash('That file is too big to be a character.', true); return; }
    const reader = new FileReader();
    reader.onload = () => {
        let data;
        try { data = JSON.parse(reader.result); } catch (e) { flash('That file isn\'t JSON.', true); return; }
        const raw = data && data.gazetteCharacter ? data.character : data;
        const c = cbClean(raw);
        if (!c || (!c.race && !c.cls && !c.name)) { flash('That file isn\'t a character from this builder.', true); return; }
        if (chars.length >= CB_MAX) { flash(`You have ${CB_MAX} characters saved; delete one first.`, true); return; }
        if (chars.some(x => x.id === c.id)) c.id = cbNewId();
        cur = c;
        save();
        openChar(cur);
        flash(`⬆️ Imported ${c.name || 'a character'}.`);
    };
    reader.readAsText(file);
}

function toggleQuick(open) {
    const form = document.getElementById('cb-quick');
    const btn = document.getElementById('cb-quick-open');
    form.hidden = !open;
    btn.setAttribute('aria-expanded', String(open));
    if (open) document.getElementById('cb-q-level').focus();
}

// ── Setup ────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('year').textContent = new Date().getFullYear();
    document.getElementById('cb-q-level').innerHTML = Array.from({ length: 20 }, (_, i) => `<option value="${i + 1}">${i + 1}</option>`).join('');
    document.getElementById('cb-q-class').innerHTML = '<option value="">Any class</option>' + CB_CLASSES.map(k => `<option value="${k.id}">${k.icon} ${esc(k.name)}</option>`).join('');
    document.getElementById('cb-q-race').innerHTML = '<option value="">Any race</option>' + CB_RACES.map(r => `<option value="${r.id}">${r.icon} ${esc(r.subraces ? r.subraces[0].name : r.name)}</option>`).join('');

    chars = cbLoadAll();
    openChar(chars[0] || null);

    const panel = document.getElementById('cb-panel');
    panel.addEventListener('click', onClick);
    panel.addEventListener('change', onChange);
    panel.addEventListener('input', onInput);
    document.getElementById('cb-steps').addEventListener('click', e => {
        const b = e.target.closest('[data-step]');
        if (b) goStep(b.dataset.step, false);
    });
    document.getElementById('cb-steps').addEventListener('keydown', e => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
        const ids = CB_STEPS.map(s => s[0]);
        let i = ids.indexOf(step);
        i = e.key === 'Home' ? 0 : e.key === 'End' ? ids.length - 1 : (i + (e.key === 'ArrowRight' ? 1 : -1) + ids.length) % ids.length;
        goStep(ids[i], false);
        document.getElementById('cb-tab-' + ids[i]).focus();
        e.preventDefault();
    });
    document.getElementById('cb-pick').addEventListener('change', e => {
        const c = chars.find(x => x.id === e.target.value);
        if (c) openChar(c);
    });
    document.getElementById('cb-new').addEventListener('click', newChar);
    document.getElementById('cb-quick-open').addEventListener('click', () => toggleQuick(document.getElementById('cb-quick').hidden));
    document.getElementById('cb-quick').addEventListener('submit', e => {
        e.preventDefault();
        quickBuild({ level: document.getElementById('cb-q-level').value, cls: document.getElementById('cb-q-class').value, race: document.getElementById('cb-q-race').value });
    });
    document.getElementById('cb-dup').addEventListener('click', () => {
        if (!cur) return;
        if (chars.length >= CB_MAX) { flash(`You have ${CB_MAX} characters saved; delete one first.`, true); return; }
        const copy = cbClean(JSON.parse(JSON.stringify(cur)));
        copy.id = cbNewId();
        copy.name = (cur.name || 'Unnamed character').slice(0, 52) + ' (copy)';
        cur = copy;
        save();
        openChar(cur, step);
        flash('⧉ Duplicated.');
    });
    let armed = 0;
    const del = document.getElementById('cb-del');
    del.addEventListener('click', () => {
        if (!cur) return;
        if (Date.now() - armed > 3000) {
            armed = Date.now();
            del.textContent = '🗑️ Really delete?';
            setTimeout(() => { del.textContent = '🗑️ Delete'; }, 3000);
            return;
        }
        armed = 0;
        del.textContent = '🗑️ Delete';
        const name = cur.name || 'The character';
        chars = cbDelete(cur.id);
        openChar(chars[0] || null);
        flash(`🗑️ ${name} deleted.`);
    });
    document.getElementById('cb-export').addEventListener('click', () => { if (cur) exportChar(); });
    document.getElementById('cb-import').addEventListener('change', e => { importChar(e.target.files[0]); e.target.value = ''; });

    // Another tab changed the saved characters.
    window.addEventListener('storage', e => {
        if (e.key !== CB_KEY && e.key !== null) return;
        chars = cbLoadAll();
        const same = cur && chars.find(x => x.id === cur.id);
        const typing = document.activeElement && document.activeElement.matches('#cb-panel input[type="text"], #cb-panel textarea');
        if (same && !typing) { cur = same; render(); } else if (!same) openChar(chars[0] || null); else renderBar();
    });
});
