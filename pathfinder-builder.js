/* ============================================
   PATHFINDER CHARACTER BUILDER PAGE (ROADMAP L3 P5.2)
   The step tabs, the sheet, and the character bar of pathfinder-character-builder.html.
   Rules live in pf2e-character.js; this file only draws and edits the open character,
   which saves to localStorage (PC_KEY) on every change. Rules text (feats, class
   features, class choices) comes from pf2e-character-text.js, loaded the first time
   a step or the sheet shows some.
   ============================================ */

const PB_STEPS = [
    ['ancestry', 'Ancestry'], ['background', 'Background'], ['class', 'Class'], ['attributes', 'Attributes'],
    ['skills', 'Skills'], ['feats', 'Feats'], ['gear', 'Gear'], ['details', 'Details'], ['sheet', '📜 Sheet']
];
const PB_TRAD_SKILL = { arcane: 'arcana', divine: 'religion', occult: 'occultism', primal: 'nature' };
const PB_ACTION = { 1: '◆', 2: '◆◆', 3: '◆◆◆', r: '⤾', f: '◇' };

let chars = [];
let cur = null;
let step = 'ancestry';
let showArchetype = false;

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

function save() {
    const list = pcSave(cur);
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

// Rules text (**bold**, "- " items, "| a | b |" rows, one paragraph a line) -> HTML.
function rulesHtml(t) {
    if (!t) return '';
    const out = [];
    let list = null, table = null;
    const flush = () => {
        if (list) { out.push(`<ul>${list.join('')}</ul>`); list = null; }
        if (table) { out.push(`<div class="cb-scroll"><table class="cb-table">${table.join('')}</table></div>`); table = null; }
    };
    const inline = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
    String(t).split('\n').forEach(line => {
        if (/^- /.test(line)) { if (table) flush(); (list = list || []).push(`<li>${inline(line.slice(2))}</li>`); return; }
        if (/^\|.*\|$/.test(line)) {
            if (list) flush();
            const cells = line.slice(1, -1).split('|').map(x => x.trim());
            const tag = table ? 'td' : 'th';
            (table = table || []).push(`<tr>${cells.map(x => `<${tag}>${inline(x)}</${tag}>`).join('')}</tr>`);
            return;
        }
        flush();
        out.push(`<p>${inline(line)}</p>`);
    });
    flush();
    return out.join('');
}

// A <details> whose rules text fills in when it opens (data-text = the text key).
function textBox(key, summary, open = false) {
    return `<details class="pb-text" data-text="${esc(key)}"${open ? ' open' : ''}><summary>${summary}</summary><div class="pb-text-body">${open ? textBody(key) : ''}</div></details>`;
}

function textBody(key) {
    if (pcTextState !== 2) return '<p class="cb-faint">Loading the rules text…</p>';
    return rulesHtml(pcText(key)) || '<p class="cb-faint">No text.</p>';
}

// Fill the open text boxes, loading the text file the first time.
function fillTexts(scope = document) {
    const boxes = [...scope.querySelectorAll('details.pb-text[open]')];
    if (!boxes.length) return;
    if (pcTextState === 2) { boxes.forEach(b => { b.querySelector('.pb-text-body').innerHTML = textBody(b.dataset.text); }); return; }
    pcLoadText(ok => {
        document.querySelectorAll('details.pb-text[open]').forEach(b => {
            b.querySelector('.pb-text-body').innerHTML = ok ? textBody(b.dataset.text) : '<p class="cb-faint">The rules text could not load. Check your connection and reload.</p>';
        });
    });
}

const abilShort = a => a.toUpperCase();
const boostSetText = sets => sets.map(s => (s[0] === 'free' ? 'free' : s.map(abilShort).join(' or '))).join(', ');
const skillName = k => pcCap(k);
const rankTag = r => `<span class="pb-rank pb-r${r}" title="${PC_RANKS[r]}">${PC_RANK_LETTER[r]}</span>`;
const featLine = f => `${f.a ? `<span class="pb-act">${PB_ACTION[f.a]}</span> ` : ''}<b>${esc(f.n)}</b> <span class="cb-tag">${f.c === 'class' && f.ar ? 'archetype ' : ''}feat ${f.l}${f.ra ? ' · ' + { u: 'uncommon', r: 'rare', q: 'unique' }[f.ra] : ''}</span>`;

// ── Prerequisites: a quick check of the plain ones (rank in a skill, Perception, a feat) ─
function prereqMet(c, text, stats) {
    return pcPrereqMet(c, text, stats);
}

function prereqHtml(c, f, stats) {
    if (!f.pr) return '';
    return `<span class="pb-pre">Prerequisites: ${f.pr.map(p => {
        const ok = prereqMet(c, p, stats);
        return `<span class="${ok === true ? 'pb-ok' : ok === false ? 'pb-no' : ''}">${ok === false ? '✗ ' : ok === true ? '✓ ' : ''}${esc(p)}</span>`;
    }).join('; ')}</span>`;
}

// ── The character bar ────────────────────────────────────
function renderBar() {
    const pick = document.getElementById('cb-pick');
    pick.innerHTML = chars.length
        ? chars.map(c => `<option value="${esc(c.id)}"${cur && c.id === cur.id ? ' selected' : ''}>${esc(c.name || 'Unnamed hero')} · ${esc(pcLine(c))}</option>`).join('')
        : '<option value="">No characters yet</option>';
    pick.disabled = !chars.length;
    const lv = document.getElementById('pb-level');
    lv.innerHTML = Array.from({ length: 20 }, (_, i) => `<option value="${i + 1}"${cur && cur.level === i + 1 ? ' selected' : ''}>${i + 1}</option>`).join('');
    lv.disabled = !cur;
    ['cb-dup', 'cb-del', 'cb-export'].forEach(id => { document.getElementById(id).disabled = !cur; });
    document.getElementById('cb-count').textContent = `${chars.length} of ${PC_MAX} characters saved in this browser`;
}

function renderSteps() {
    const todo = cur ? pcTodo(cur) : [];
    document.getElementById('cb-steps').innerHTML = PB_STEPS.map(([id, label], i) => {
        const n = todo.filter(t => t[0] === id).length;
        const badge = id === 'sheet' || id === 'gear' || id === 'details' ? '' : n ? `<span class="cb-badge">${n}</span>` : cur ? '<span class="cb-badge ok">✓</span>' : '';
        return `<button type="button" class="cb-step" role="tab" id="tab-${id}" aria-selected="${id === step}" aria-controls="cb-panel" data-step="${id}"${cur ? '' : ' disabled'}><span class="cb-n">${i + 1}</span>${label}${badge}</button>`;
    }).join('');
}

function render() {
    const focus = document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.focus : null;
    renderBar();
    renderSteps();
    const panel = document.getElementById('cb-panel');
    panel.setAttribute('aria-labelledby', `tab-${step}`);
    if (!cur) {
        panel.innerHTML = `<div class="cb-empty"><p>No Pathfinder character open yet.</p><div class="cb-btns"><button type="button" class="cb-btn cb-gold" data-act="new">➕ New Character</button></div></div>`;
        return;
    }
    panel.innerHTML = ({ ancestry: stepAncestry, background: stepBackground, class: stepClass, attributes: stepAttributes,
        skills: stepSkills, feats: stepFeats, gear: stepGear, details: stepDetails, sheet: stepSheet })[step]() + nextButtons();
    fillTexts(panel);
    if (focus) {
        const el = panel.querySelector(`[data-focus="${CSS.escape(focus)}"]`);
        if (el) el.focus();
    }
}

function nextButtons() {
    const i = PB_STEPS.findIndex(s => s[0] === step);
    const prev = PB_STEPS[i - 1], next = PB_STEPS[i + 1];
    return `<div class="cb-next">${prev ? `<button type="button" class="cb-btn" data-go="${prev[0]}">← ${prev[1]}</button>` : '<span></span>'}${next ? `<button type="button" class="cb-btn cb-gold" data-go="${next[0]}">${next[1]} →</button>` : ''}</div>`;
}

function todoBox(id) {
    const items = pcTodo(cur).filter(t => t[0] === id);
    return items.length ? `<ul class="cb-todo">${items.map(t => `<li>${esc(t[1])}</li>`).join('')}</ul>` : '';
}

const card = (attrs, pressed, title, body) => `<button type="button" class="cb-card" ${attrs} aria-pressed="${pressed}"><b>${esc(title)}</b>${body}</button>`;

// ── Step: ancestry and heritage ──────────────────────────
function stepAncestry() {
    const p = pcParts(cur);
    let h = `<h2>Ancestry</h2><p class="cb-lead">Your people: Hit Points, size, Speed, attribute boosts, and the feats you can pick at levels 1, 5, 9, 13, and 17.</p>${todoBox('ancestry')}`;
    h += `<div class="cb-cards">${Object.entries(PF2E_ANCESTRIES).map(([id, a]) => card(`data-set="race" data-val="${id}" data-focus="race-${id}"`, cur.race === id, a.n,
        `${a.hp} HP · ${PC_SIZES[a.sz]} · ${a.sp} ft<br>${boostSetText(a.bo)}${a.fl ? `<br>flaw ${a.fl.map(abilShort).join(', ')}` : ''}`)).join('')}</div>`;
    if (!p.anc) return h;
    const a = p.anc;
    h += `<h3>${esc(a.n)}</h3><ul class="cb-list">
        <li><b>Hit Points</b> ${a.hp} · <b>Size</b> ${PC_SIZES[a.sz]} · <b>Speed</b> ${a.sp} feet${a.vi ? ` · <b>${pcCap(a.vi.replace(/-/g, ' '))}</b>` : ''}</li>
        <li><b>Attribute boosts</b> ${boostSetText(a.bo)}${a.fl ? ` · <b>flaw</b> ${a.fl.map(a2 => PC_ABIL_NAMES[a2]).join(', ')}` : ''} <span class="cb-tag">(placed on the Attributes step)</span></li>
        <li><b>Languages</b> ${a.la.map(pcCap).join(', ')}${a.lo.length ? ` · <b>more from</b> ${a.lo.map(pcCap).join(', ')}` : ''}</li>
        <li><b>Traits</b> ${a.tr.join(', ')}</li>
        ${(a.f || []).map(([n, t]) => `<li><b>${esc(n)}</b>${rulesHtml(t)}</li>`).join('')}</ul>`;
    const own = Object.entries(PF2E_HERITAGES).filter(([, x]) => x.a === cur.race);
    const versatile = Object.entries(PF2E_HERITAGES).filter(([, x]) => !x.a);
    const herCards = list => `<div class="cb-cards pb-wide">${list.map(([id, x]) => card(`data-set="her" data-val="${id}" data-focus="her-${id}"`, cur.her === id, x.n, '')).join('')}</div>`;
    h += `<h3>Heritage</h3><p class="cb-lead">Pick one of your ancestry's heritages, or a versatile heritage (any ancestry can have one).</p>${herCards(own)}<h4>Versatile heritages</h4>${herCards(versatile)}`;
    if (p.her) h += `<div class="pb-chosen"><b>${esc(p.her.n)}</b>${rulesHtml(p.her.x)}</div>`;
    return h;
}

// ── Step: background ────────────────────────────────────
function stepBackground() {
    const p = pcParts(cur);
    let h = `<h2>Background</h2><p class="cb-lead">What you did before adventuring: two attribute boosts, a trained skill and a Lore, and a skill feat.</p>${todoBox('background')}`;
    h += `<input type="search" class="cb-filter" id="pb-bg-filter" placeholder="Filter backgrounds…" aria-label="Filter backgrounds" data-focus="bg-filter"><div class="cb-cards pb-wide" id="pb-bg-cards">${Object.entries(PF2E_BACKGROUNDS).map(([id, b]) => card(`data-set="bg" data-val="${id}" data-focus="bg-${id}" data-name="${esc(b.n.toLowerCase())} ${esc(b.sk.join(' '))}"`, cur.bg === id, b.n,
        `${boostSetText(b.bo)}<br>${b.sk.map(skillName).join(', ')}${b.ra ? ` · <i>${{ u: 'uncommon', r: 'rare' }[b.ra] || ''}</i>` : ''}`)).join('')}</div>`;
    if (!p.bg) return h;
    const b = p.bg;
    h += `<div class="pb-chosen"><b>${esc(b.n)}</b>${rulesHtml(b.x)}<ul class="cb-list">
        <li><b>Attribute boosts</b> ${boostSetText(b.bo)} <span class="cb-tag">(placed on the Attributes step)</span></li>
        <li><b>Trained in</b> ${[...b.sk.map(skillName), ...b.lo].join(', ') || 'none'}</li>
        <li><b>Skill feat</b> ${(b.ft || []).map(n => esc(n) + (pcFeatKey(n) ? '' : ' <span class="cb-tag">(from another book)</span>')).join(', ') || 'none'}</li></ul>
        ${(b.ft || []).filter(pcFeatKey).map(n => textBox(`ft:${pcFeatKey(n)}`, `📖 ${esc(n)}`)).join('')}</div>`;
    return h;
}

// ── Step: class ─────────────────────────────────────────
function stepClass() {
    const p = pcParts(cur);
    let h = `<h2>Class</h2><p class="cb-lead">Your training: Hit Points per level, your key attribute, proficiencies, and class feats.</p>${todoBox('class')}`;
    h += `<div class="cb-cards">${Object.entries(PF2E_CLASSES).map(([id, c]) => card(`data-set="cls" data-val="${id}" data-focus="cls-${id}"`, cur.cls === id, c.n,
        `${c.hp} HP + Con / level<br>key ${c.key.map(abilShort).join(' or ')}${c.cast ? `<br>${c.cast[1] === 'focus' ? 'focus spells' : `${c.cast[1]} caster`}` : ''}`)).join('')}</div>`;
    if (!p.cls) return h;
    const c = p.cls;
    const prof = pcProfs(cur, 1);
    const pr = (k, label) => `${label} ${PC_RANKS[prof[k]].toLowerCase()}`;
    h += `<h3>${esc(c.n)}</h3><ul class="cb-list">
        <li><b>Hit Points</b> ${c.hp} + Constitution modifier each level · <b>Key attribute</b> ${c.key.map(a => PC_ABIL_NAMES[a]).join(' or ')}</li>
        <li><b>At 1st level</b> ${[pr('per', 'Perception'), pr('fort', 'Fortitude'), pr('ref', 'Reflex'), pr('will', 'Will')].join(', ')}</li>
        <li><b>Attacks</b> ${['unarmed', 'simple', 'martial', 'advanced'].filter(k => prof[k]).map(k => `${k} ${PC_RANKS[prof[k]].toLowerCase()}`).join(', ')}${c.atko ? `, ${esc(c.atko[0])} ${PC_RANKS[c.atko[1]].toLowerCase()}` : ''}</li>
        <li><b>Defenses</b> ${['unarmored', 'light', 'medium', 'heavy'].filter(k => prof[k]).map(k => `${k === 'unarmored' ? 'unarmored defense' : k + ' armor'} ${PC_RANKS[prof[k]].toLowerCase()}`).join(', ')}</li>
        <li><b>Skills</b> ${[...c.sk.fixed.map(skillName), `${c.sk.extra} more plus your Intelligence modifier`].join(', ')}</li>
        ${c.cast ? `<li><b>Spells</b> ${c.cast[1] === 'focus' ? 'focus spells' : `${c.cast[0] ? c.cast[0] + ' ' : ''}${c.cast[1]} spellcasting`}</li>` : ''}</ul>`;
    const keys = pcKeyOptions(cur);
    if (keys.length > 1) h += `<h4>Key attribute</h4><div class="cb-chips">${keys.map(k => `<button type="button" class="cb-chip" data-key="${k}" aria-pressed="${pcKey(cur) === k}" data-focus="key-${k}">${PC_ABIL_NAMES[k]}</button>`).join('')}</div>`;
    [['ch', c.ch], ['ch2', c.ch2]].forEach(([field, spec]) => {
        if (!spec) return;
        const opts = Object.entries(PF2E_CHOICES).filter(([, x]) => x.t === spec[0] && (x.c === cur.cls));
        h += `<h3>${esc(spec[1])}</h3><div class="cb-cards pb-wide">${opts.map(([id, x]) => card(`data-set="${field}" data-val="${id}" data-focus="${field}-${id}"`, cur[field] === id, x.n.replace(/^Bloodline: /, ''),
            [x.sk ? `trained ${x.sk.map(skillName).join(', ')}` : '', x.tr && x.tr !== 'choice' ? `${x.tr} spells` : '', x.sa ? x.sa : ''].filter(Boolean).join(' · '))).join('')}</div>`;
        const ch = PF2E_CHOICES[cur[field]];
        if (ch && ch.c === cur.cls) {
            h += `<div class="pb-chosen">`;
            if (ch.skc) h += `<h4>Trained skill from ${esc(ch.n)}</h4><div class="cb-chips">${ch.skc.map(k => `<button type="button" class="cb-chip" data-chskill="${k}" aria-pressed="${cur.skills.ch === k}" data-focus="chs-${k}">${skillName(k)}</button>`).join('')}</div>`;
            if (ch.tr === 'choice') h += `<h4>Tradition</h4><div class="cb-chips">${PC_TRADITIONS.map(t => `<button type="button" class="cb-chip" data-sub="${t}" aria-pressed="${cur.sub === t}" data-focus="sub-${t}">${pcCap(t)} <small>trained in ${skillName(PB_TRAD_SKILL[t])}</small></button>`).join('')}</div>`;
            if (cur[field] === 'bloodline-elemental') h += `<h4>Elemental influence</h4><div class="cb-chips">${PC_ELEMENTS.map(t => `<button type="button" class="cb-chip" data-sub="${t}" aria-pressed="${cur.sub === t}" data-focus="sub-${t}">${pcCap(t)}</button>`).join('')}</div>`;
            if (ch.ft) h += `<p><b>Grants</b> ${ch.ft.map(esc).join(', ')}</p>`;
            h += textBox(`ch:${cur[field]}`, `📖 ${esc(ch.n)}: the rules`, true) + '</div>';
        }
    });
    if (cur.cls === 'cleric' || cur.cls === 'champion') {
        const weapons = Object.entries(PF2E_ITEMS).filter(([, w]) => w.k === 'w' && !w.l).sort((a, b) => a[1].n.localeCompare(b[1].n));
        h += `<h3>Deity</h3><p class="cb-lead">The Gazette lists no gods by name: write your own, or one from your setting, and pick what its followers get.</p>
        <div class="cb-row">
          <label class="cb-field">Deity's name<input type="text" maxlength="60" data-f="deity.name" value="${esc(cur.deity.name)}" placeholder="e.g. the Lantern of Dawn" data-focus="deity-name"></label>
          <label class="cb-field">Divine skill<select data-sel="deity.skill" data-focus="deity-skill"><option value="">Pick a skill</option>${Object.keys(PC_SKILLS).map(k => `<option value="${k}"${cur.deity.skill === k ? ' selected' : ''}>${skillName(k)}</option>`).join('')}</select></label>
          <label class="cb-field">Favored weapon<select data-sel="deity.weapon" data-focus="deity-weapon"><option value="">None</option>${weapons.map(([id, w]) => `<option value="${id}"${cur.deity.weapon === id ? ' selected' : ''}>${esc(w.n)}</option>`).join('')}</select></label>
          ${cur.cls === 'cleric' ? `<label class="cb-field">Divine font<select data-sel="deity.font" data-focus="deity-font"><option value="">Pick one</option>${Object.entries(PC_DIVINE_FONTS).map(([k, v]) => `<option value="${k}"${cur.deity.font === k ? ' selected' : ''}>${v}</option>`).join('')}</select></label>` : ''}
        </div>`;
    }
    if (c.pp) {
        h += `<h3>Paths to Perfection</h3><div class="cb-row">${Object.entries(c.pp).map(([lv, rank]) => `<label class="cb-field">Level ${lv} (${PC_RANKS[rank].toLowerCase()})<select data-path="${lv}" data-focus="path-${lv}"${Number(lv) > cur.level ? ' disabled' : ''}><option value="">Pick a save</option>${Object.entries(PC_SAVES).map(([k, [n]]) => `<option value="${k}"${cur.paths[lv] === k ? ' selected' : ''}>${n}</option>`).join('')}</select></label>`).join('')}</div>`;
    }
    h += `<h3>Class features</h3><div class="pb-feats">${c.f.map(([l, n, key]) => `<div class="${l > cur.level ? 'cb-later' : ''}">${textBox(`cf:${key}`, `<span class="cb-lv">Level ${l}</span>${esc(n)}`)}</div>`).join('')}</div>`;
    return h;
}

// ── Step: attributes ────────────────────────────────────
function boostRow(label, sets, field, note = '') {
    return `<div class="pb-boost-row"><div class="pb-boost-label">${label}${note ? `<small>${note}</small>` : ''}</div>${sets.map(([opts, picked], i) => {
        if (opts.length === 1) return `<div class="cb-chips"><span class="cb-chip cb-locked" aria-pressed="true">${abilShort(opts[0])}</span></div>`;
        const taken = sets.filter((s, j) => j !== i).map(s => s[1]);
        return `<div class="cb-chips" role="group" aria-label="${esc(label)} boost ${i + 1}">${opts.map(a => `<button type="button" class="cb-chip" data-boost="${field}" data-i="${i}" data-val="${a}" aria-pressed="${picked === a}" data-focus="b-${field}-${i}-${a}"${taken.includes(a) ? ' disabled' : ''}>${abilShort(a)}</button>`).join('')}</div>`;
    }).join('')}</div>`;
}

function stepAttributes() {
    const p = pcParts(cur);
    const { mods, partial } = pcAttrs(cur);
    let h = `<h2>Attributes</h2><p class="cb-lead">Every attribute starts at +0. Each boost adds 1 (once an attribute is +4, it takes two boosts at a level-up to add 1), and a flaw takes 1 away. One source can't boost the same attribute twice.</p>${todoBox('attributes')}`;
    h += `<div class="cb-abil-grid">${PC_ABILS.map(a => `<div class="cb-abil"><b>${abilShort(a)}</b><span class="cb-total">${pcSign(mods[a])}</span><span class="cb-from">${PC_ABIL_NAMES[a]}${partial[a] ? ' · ½' : ''}</span></div>`).join('')}</div>`;
    if (p.anc) {
        h += boostRow(`Ancestry: ${esc(p.anc.n)}`, pcAncSets(cur), 'anc', cur.boosts.ancFree ? 'two free boosts, no flaw' : p.anc.fl ? `flaw: ${p.anc.fl.map(abilShort).join(', ')}` : '');
        h += `<label class="pb-check"><input type="checkbox" data-anc-free data-focus="anc-free"${cur.boosts.ancFree ? ' checked' : ''}> Take two free boosts instead of the ancestry's boosts and flaw</label>`;
    } else h += '<p class="cb-faint">Pick an ancestry for its boosts.</p>';
    if (p.bg) h += boostRow(`Background: ${esc(p.bg.n)}`, pcBgSets(cur), 'bg');
    else h += '<p class="cb-faint">Pick a background for its boosts.</p>';
    const keys = pcKeyOptions(cur);
    if (keys.length) h += boostRow(`Class: ${esc(p.cls.n)}`, [[keys, pcKey(cur)]], 'key', 'key attribute');
    else h += '<p class="cb-faint">Pick a class for its key attribute.</p>';
    const free = n => Array.from({ length: 4 }, (_, i) => [PC_ABILS, (cur.boosts[n] || [])[i] || '']);
    h += boostRow('Level 1', free('l1'), 'l1', 'four free boosts');
    PC_BOOST_LEVELS.forEach(l => {
        if (l <= cur.level) h += boostRow(`Level ${l}`, free(l), String(l), 'four free boosts');
    });
    if (cur.level < 20) h += `<p class="cb-faint">More boosts come at levels ${PC_BOOST_LEVELS.filter(l => l > cur.level).join(', ')}.</p>`;
    return h;
}

// ── Step: skills ────────────────────────────────────────
function stepSkills() {
    const p = pcParts(cur);
    if (!p.cls) return `<h2>Skills</h2><p class="cb-faint">Pick a class first: it sets how many skills you're trained in.</p>`;
    const given = pcGivenSkills(cur);
    const givenSet = new Set(given.map(([k]) => k));
    const picks = pcSkillPicks(cur);
    const { ranks, lores } = pcSkillRanks(cur);
    const stats = pcStats(cur);
    let h = `<h2>Skills</h2>${todoBox('skills')}<h3>Trained skills</h3>`;
    h += `<p class="cb-lead">Already trained: ${given.length ? given.map(([k, from]) => `${skillName(k)} <span class="cb-tag">(${esc(from)})</span>`).join(', ') : 'none'}.${given.length !== givenSet.size ? ' Two sources gave the same skill, so you pick one more.' : ''}</p>`;
    const n = cur.skills.cls.filter(k => !givenSet.has(k)).length;
    h += `<h4>Pick ${picks} <span class="cb-count ${n === picks ? 'full' : n > picks ? 'over' : ''}">${n} of ${picks}</span></h4>`;
    h += `<div class="cb-chips">${Object.keys(PC_SKILLS).map(k => givenSet.has(k)
        ? `<span class="cb-chip cb-locked">${skillName(k)}</span>`
        : `<button type="button" class="cb-chip" data-skill="${k}" aria-pressed="${cur.skills.cls.includes(k)}" data-focus="sk-${k}"${!cur.skills.cls.includes(k) && n >= picks ? ' disabled' : ''}>${skillName(k)}</button>`).join('')}</div>`;
    h += `<h4>Lores</h4><p class="cb-lead">${Object.keys(lores).length ? Object.keys(lores).map(esc).join(', ') : 'None yet.'} Add a Lore if a feat or your GM gives you one.</p>
        <div class="cb-row"><label class="cb-field">New Lore<input type="text" id="pb-lore" maxlength="40" placeholder="e.g. Sailing Lore" data-focus="lore-new"></label><button type="button" class="cb-btn" data-act="add-lore">➕ Add Lore</button>${cur.skills.lore.map((l, i) => `<button type="button" class="cb-btn cb-mini" data-del-lore="${i}">✕ ${esc(l)}</button>`).join('')}</div>`;
    const inc = p.cls.lv.inc;
    h += `<h3>Skill increases</h3><p class="cb-lead">Each one raises a trained skill one rank: to expert at any level, to master from level 7, to legendary from level 15.</p><div class="cb-row">`;
    inc.forEach(l => {
        const later = l > cur.level;
        const before = pcSkillRanks({ ...cur, skills: { ...cur.skills, inc: Object.fromEntries(Object.entries(cur.skills.inc).filter(([lv]) => Number(lv) < l)) } }, l - 1);
        const opts = [...Object.keys(PC_SKILLS).filter(k => before.ranks[k] >= 1 && before.ranks[k] < pcRankCap(l)).map(k => [k, `${skillName(k)} → ${PC_RANKS[before.ranks[k] + 1].toLowerCase()}`]),
            ...Object.entries(before.lores).filter(([, r]) => r < pcRankCap(l)).map(([name, r]) => [`lore:${name}`, `${name} → ${PC_RANKS[r + 1].toLowerCase()}`])];
        const v = cur.skills.inc[l] || '';
        h += `<label class="cb-field pb-inc${later ? ' cb-later' : ''}">Level ${l}<select data-inc="${l}" data-focus="inc-${l}"${later ? ' disabled' : ''}><option value="">Pick a skill</option>${opts.map(([k, t]) => `<option value="${esc(k)}"${v === k ? ' selected' : ''}>${esc(t)}</option>`).join('')}${v && !opts.some(o => o[0] === v) ? `<option value="${esc(v)}" selected>${esc(v.replace(/^lore:/, ''))} (can't go higher)</option>` : ''}</select></label>`;
    });
    h += '</div>';
    h += `<h3>Your skills at level ${cur.level}</h3><ul class="cb-skill-list">${Object.keys(PC_SKILLS).map(k => `<li class="${ranks[k] ? 'p' : ''}">${rankTag(ranks[k])}<span class="cb-val">${pcSign(stats.skills[k])}</span> ${skillName(k)} <small>${abilShort(PC_SKILLS[k])}</small></li>`).join('')}
        ${Object.entries(lores).map(([name, r]) => `<li class="p">${rankTag(r)}<span class="cb-val">${pcSign(stats.loreMods[name])}</span> ${esc(name)} <small>INT</small></li>`).join('')}</ul>`;
    return h;
}

// ── Step: feats ─────────────────────────────────────────
function stepFeats() {
    const p = pcParts(cur);
    if (!p.cls) return `<h2>Feats</h2><p class="cb-faint">Pick a class first: it sets your feat levels.</p>`;
    const stats = pcStats(cur);
    let h = `<h2>Feats</h2><p class="cb-lead">A feat at each feat level, from lists that fit the slot. Prerequisites show ✓ when the sheet can tell you meet them and ✗ when it can tell you don't; the rest are up to you and your GM. Feats change your numbers only as text: apply their effects yourself.</p>${todoBox('feats')}`;
    h += `<label class="pb-check"><input type="checkbox" data-archetype data-focus="archetype"${showArchetype ? ' checked' : ''}> Show archetype feats in class feat slots (dedications and the feats after them)</label>`;
    h += `<label class="pb-check"><input type="checkbox" data-fa data-focus="fa"${cur.fa ? ' checked' : ''}> Free Archetype (a variant rule, with your GM's say-so): an archetype feat at every even level</label>`;
    const arch = pcArchetypeCheck(cur);
    if (arch.list.length || arch.issues.length) {
        const names = pcArchetypes();
        h += `<p class="cb-faint">Archetypes: ${arch.list.map(a => `${esc(names[a.key].n)} (${a.feats.length} feat${a.feats.length === 1 ? '' : 's'} after the dedication)`).join(', ') || 'none yet'}${arch.need ? `. Take ${arch.need} more ${esc(names[arch.current].n)} feat${arch.need === 1 ? '' : 's'} before another dedication` : ''}. Plan them in the <a href="pathfinder-archetype-helper?char=${encodeURIComponent(cur.id)}">🔀 Archetype Helper</a>.</p>`;
        arch.issues.forEach(x => { h += `<p class="cb-warn">⚠️ Level ${esc(x.slot.replace(/^\D+/, ''))}: ${esc(x.text)}</p>`; });
    } else h += `<p class="cb-faint">Browse dedications and plan the feats after them in the <a href="pathfinder-archetype-helper?char=${encodeURIComponent(cur.id)}">🔀 Archetype Helper</a>.</p>`;
    const deds = pcDedications(cur);
    if (deds.length) h += `<h3>Dedications</h3><div class="pb-slots">${deds.map(d => dedicationBox(d, stats)).join('')}</div>`;
    const granted = pcGrantedFeats(cur);
    if (granted.length) h += `<h3>Granted</h3><div class="pb-feats">${granted.map(g => g.key
        ? `<div>${textBox(`ft:${g.key}`, `${featLine(PF2E_FEATS[g.key])} <span class="cb-tag">from ${esc(g.from)}</span>`)}</div>`
        : `<div class="pb-noref"><b>${esc(g.name)}</b> <span class="cb-tag">from ${esc(g.from)} (another book: not listed here)</span></div>`).join('')}</div>`;
    h += `<h3>By level</h3><div class="pb-slots">`;
    pcFeatSlots(cur).forEach(s => {
        const list = pcFeatsFor(cur, s.slot, { archetype: showArchetype });
        const pickedKey = cur.feats[s.slot];
        const picked = pickedKey ? PF2E_FEATS[pickedKey] : null;
        const byLevel = {};
        list.forEach(x => { (byLevel[x.feat.l] = byLevel[x.feat.l] || []).push(x); });
        const opts = Object.keys(byLevel).sort((a, b) => b - a).map(l => `<optgroup label="Level ${l}">${byLevel[l].map(x => `<option value="${x.key}"${x.key === pickedKey ? ' selected' : ''}${x.taken ? ' disabled' : ''}>${esc(x.feat.n)}${x.feat.ar ? ' (archetype)' : ''}${x.taken ? ' (taken)' : ''}</option>`).join('')}</optgroup>`).join('');
        const missing = pickedKey && !list.some(x => x.key === pickedKey) ? `<option value="${pickedKey}" selected>${esc(picked.n)} (doesn't fit this slot now)</option>` : '';
        h += `<div class="pb-slot"><label class="cb-field"><span><span class="cb-lv">Level ${s.level}</span>${s.label}</span><select data-feat="${s.slot}" data-focus="feat-${s.slot}"><option value="">Pick a feat (${list.filter(x => !x.taken).length})</option>${missing}${opts}</select></label>`;
        if (picked) h += `<div class="pb-feat-pick">${prereqHtml(cur, picked, stats)}${textBox(`ft:${pickedKey}`, `${featLine(picked)}${picked.tr.length ? ` <span class="cb-tag">${esc(picked.tr.join(', '))}</span>` : ''}`)}</div>`;
        h += '</div>';
    });
    h += '</div>';
    const nextLv = [...new Set(Object.values(p.cls.lv).flat())].filter(l => l > cur.level).sort((a, b) => a - b)[0];
    if (nextLv) h += `<p class="cb-faint">More feats come at level ${nextLv}. Raise the level in the bar above to plan ahead.</p>`;
    return h;
}

// A multiclass dedication's picks (its class choice, a tradition, skills) and what it gives the sheet.
function dedicationBox(d, stats) {
    const m = PC_MC[d.cls], mine = pcMcPick(cur, d.cls), tag = PF2E_CLASSES[d.cls].ch;
    const sel = (attr, label, opts, v, empty) => `<label class="cb-field">${label}<select ${attr} data-focus="${attr.replace(/[^a-z0-9-]/gi, '')}"><option value="">${empty}</option>${opts.map(([k, t]) => `<option value="${esc(k)}"${k === v ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select></label>`;
    let h = `<div class="pb-slot"><p><span class="cb-lv">Level ${d.level}</span><b>${esc(d.n)} Dedication</b></p><div class="cb-row">`;
    if (tag) {
        const opts = Object.entries(PF2E_CHOICES).filter(([, x]) => x.c === d.cls && x.t === tag[0]).sort((a, b) => a[1].n.localeCompare(b[1].n)).map(([k, x]) => [k, x.n.replace(/^Bloodline: /, '')]);
        h += sel(`data-mc-ch="${d.cls}"`, tag[1], opts, d.ch ? mine.ch : '', `Pick your ${tag[1].toLowerCase()}`);
    }
    if (m.cast && d.ch && d.ch.tr === 'choice') h += sel(`data-mc-tr="${d.cls}"`, 'Tradition', PC_TRADITIONS.map(t => [t, pcCap(t)]), d.tr, 'Pick one');
    d.picks.forEach((pk, i) => {
        const opts = (pk.opts || Object.keys(PC_SKILLS).filter(k => !stats.ranks[k] || pk.v === k)).map(k => [k, skillName(k)]);
        h += sel(`data-mc-sk="${d.cls}" data-i="${i}"`, `Trained skill <small>(${esc(pk.hint)})</small>`, opts, pk.v, 'Pick a skill');
    });
    h += '</div>';
    const gives = [];
    if (d.skills.length) gives.push(`trained in ${d.skills.map(skillName).join(', ')}`);
    const dc = stats.mcDc.find(x => x.cls === d.cls);
    if (dc) gives.push(`${d.n.toLowerCase()} class DC ${dc.dc}`);
    if (m.wp) gives.push(`${m.wp} weapons`);
    if (m.ar === 'light') gives.push('light armor');
    if (m.ar === 'champion') gives.push('light and medium armor (heavy too if you had both)');
    const arc = stats.arcs.find(x => x.arc === d.cls);
    if (arc) gives.push(`${arc.trad ? pcCap(arc.trad) + ' ' : ''}spells with ${PC_ABIL_NAMES[arc.attr]}: DC ${arc.dc}, attack ${pcSign(arc.atk)}, ${arc.cantrips} cantrip${arc.cantrips === 1 ? '' : 's'}${arc.slots.length ? `, slots ${arc.slots.map((n, i) => `${n}× rank ${i + 1}`).join(', ')}` : ' (slots come with Basic ' + esc(d.n) + ' Spellcasting)'}`);
    h += `<p class="cb-faint">${gives.length ? 'Gives you: ' + gives.join('; ') + '.' : ''} The rest of the feat (class features, anathema) is in its text.</p>`;
    d.todo.forEach(t => { h += `<p class="cb-warn">⚠️ Still to do: ${esc(t)}.</p>`; });
    return h + '</div>';
}

// ── Step: gear ──────────────────────────────────────────
function stepGear() {
    const items = Object.entries(PF2E_ITEMS);
    const armors = items.filter(([, a]) => a.k === 'a' && ['light', 'medium', 'heavy'].includes(a.ct) && !(a.tr || []).includes('companion')).sort((a, b) => a[1].l - b[1].l || a[1].n.localeCompare(b[1].n));
    const shields = items.filter(([, s]) => s.k === 's').sort((a, b) => a[1].l - b[1].l || a[1].n.localeCompare(b[1].n));
    const weapons = items.filter(([, w]) => w.k === 'w').sort((a, b) => a[1].l - b[1].l || a[1].n.localeCompare(b[1].n));
    const prof = pcProfs(cur);
    const ac = pcAC(cur);
    const potency = (field, v, i = '') => `<select data-rune="${field}"${i !== '' ? ` data-i="${i}"` : ''} data-focus="rune-${field}-${i}">${[0, 1, 2, 3].map(n => `<option value="${n}"${v === n ? ' selected' : ''}>${n ? `+${n}` : 'none'}</option>`).join('')}</select>`;
    let h = `<h2>Gear</h2><p class="cb-lead">What you wear and wield, for your AC and Strikes. Prices and Bulk are in the <a href="pathfinder-shop-generator">Shop Generator</a>.</p>`;
    h += `<h3>Armor</h3><div class="cb-row">
        <label class="cb-field">Armor<select data-sel="gear.armor" data-focus="armor"><option value="">None (unarmored, ${PC_RANKS[prof.unarmored].toLowerCase()})</option>${['light', 'medium', 'heavy'].map(cat => `<optgroup label="${pcCap(cat)} armor (${PC_RANKS[prof[cat]].toLowerCase()})">${armors.filter(([, a]) => a.ct === cat).map(([id, a]) => `<option value="${id}"${cur.gear.armor === id ? ' selected' : ''}>${esc(a.n)} (+${a.ac}${Number.isFinite(a.dx) ? `, Dex cap +${a.dx}` : ''}${a.l ? `, level ${a.l}` : ''})</option>`).join('')}</optgroup>`).join('')}</select></label>
        <label class="cb-field cb-narrow">Potency rune${potency('arPot', cur.gear.arPot)}</label>
        <label class="cb-field">Shield<select data-sel="gear.shield" data-focus="shield"><option value="">None</option>${shields.map(([id, s]) => `<option value="${id}"${cur.gear.shield === id ? ' selected' : ''}>${esc(s.n)} (+${s.ac || 0}${s.hd ? `, Hardness ${s.hd[0]}` : ''})</option>`).join('')}</select></label></div>`;
    h += `<p>AC <b>${ac.ac}</b> = 10 + Dex ${pcSign(ac.dex)} + ${PC_RANKS[ac.rank].toLowerCase()} ${pcSign(pcBonus(ac.rank, cur.level))} + item ${pcSign(ac.item)}${ac.armor && prof[ac.cat] === 0 ? ' <span class="cb-warn">(untrained in this armor)</span>' : ''}${cur.gear.shield ? ` · raised shield +${PF2E_ITEMS[cur.gear.shield].ac || 0}` : ''}</p>`;
    h += `<h3>Weapons</h3><div class="cb-row"><label class="cb-field">Add a weapon<select id="pb-add-weapon" data-focus="add-weapon"><option value="">Pick one</option>${['simple', 'martial', 'advanced', 'unarmed'].map(cat => `<optgroup label="${pcCap(cat)} (${PC_RANKS[prof[cat]].toLowerCase()})">${weapons.filter(([, w]) => w.ct === cat).map(([id, w]) => `<option value="${id}">${esc(w.n)} (${esc(w.dm || '')}${w.l ? `, level ${w.l}` : ''})</option>`).join('')}</optgroup>`).join('')}</select></label><button type="button" class="cb-btn" data-act="add-weapon">➕ Add</button></div>`;
    if (cur.gear.weapons.length) {
        h += `<div class="cb-scroll"><table class="cb-table"><thead><tr><th>Weapon</th><th>Potency</th><th>Striking</th><th></th></tr></thead><tbody>${cur.gear.weapons.map((w, i) => `<tr><td>${esc(PF2E_ITEMS[w.id].n)}</td><td>${potency('pot', w.pot, i)}</td><td><select data-rune="str" data-i="${i}" data-focus="rune-str-${i}">${['none', 'striking', 'greater', 'major'].map((t, n) => `<option value="${n}"${w.str === n ? ' selected' : ''}>${t}</option>`).join('')}</select></td><td><button type="button" class="cb-btn cb-mini" data-del-weapon="${i}" aria-label="Remove ${esc(PF2E_ITEMS[w.id].n)}">✕</button></td></tr>`).join('')}</tbody></table></div>`;
    } else h += '<p class="cb-faint">No weapons yet: the sheet shows your fist.</p>';
    return h;
}

// ── Step: details ───────────────────────────────────────
function stepDetails() {
    const p = pcParts(cur);
    const known = p.anc ? p.anc.la.map(pcCap) : [];
    const extra = p.anc ? (p.anc.lc || 0) + Math.max(0, pcAttrs(cur).mods.int) : 0;
    let h = `<h2>Details</h2><div class="cb-row">
        <label class="cb-field">Character name<input type="text" maxlength="80" data-f="name" value="${esc(cur.name)}" placeholder="e.g. Brakka Ironvein" data-focus="name"></label>
        <label class="cb-field">Player<input type="text" maxlength="60" data-f="player" value="${esc(cur.player)}" data-focus="player"></label></div>`;
    h += `<h3>Languages</h3><p class="cb-lead">${known.length ? `You speak ${known.join(', ')}.` : 'Pick an ancestry for its languages.'}${extra ? ` You learn ${extra} more${p.anc && p.anc.lo.length ? `, such as ${p.anc.lo.map(pcCap).join(', ')}` : ' (any common language)'}.` : ''}</p>
        <label class="cb-field">Other languages<input type="text" maxlength="200" data-langs value="${esc(cur.langs.join(', '))}" placeholder="separate them with commas" data-focus="langs"></label>`;
    h += `<h3>Notes</h3><label class="cb-field">Appearance, backstory, anything else<textarea rows="6" maxlength="4000" data-f="notes" data-focus="notes">${esc(cur.notes)}</textarea></label>`;
    h += `<p class="cb-faint">Short on ideas? Roll a past in the <a href="pathfinder-backstory-generator">🪶 Backstory Generator</a>; its 🧝 Use for My Character button adds it here.</p>`;
    return h;
}

// ── Step: the sheet ─────────────────────────────────────
function stepSheet() {
    const s = pcStats(cur);
    const p = s.parts;
    const L = cur.level;
    const todo = pcTodo(cur);
    let h = '';
    if (todo.length) h += `<ul class="cb-todo">${todo.map(t => `<li><button type="button" data-go="${t[0]}">${esc(t[1])}</button></li>`).join('')}</ul>`;
    h += `<div class="cb-sheet-head"><div class="cb-sheet-title"><h2>${esc(cur.name || 'Unnamed hero')}</h2><p>${esc(pcLine(cur))}${p.her ? ` · ${esc(p.her.n)}` : ''}${p.bg ? ` · ${esc(p.bg.n)}` : ''}${p.ch ? ` · ${esc(p.ch.n)}` : ''}${cur.player ? ` · played by ${esc(cur.player)}` : ''}</p></div></div>`;
    h += `<div class="cb-sheet-btns"><a class="cb-btn cb-gold" href="pathfinder-play-sheet?char=${encodeURIComponent(cur.id)}">▶️ Play Sheet</a><button type="button" class="cb-btn" data-act="print">🖨️ Print</button><a class="cb-btn" href="pathfinder-character-cards?char=${encodeURIComponent(cur.id)}">🎴 Cards</a><a class="cb-btn" href="pathfinder-player-journal?char=${encodeURIComponent(cur.id)}">📓 Journal</a><button type="button" class="cb-btn" data-act="party">👥 Add to Party</button><button type="button" class="cb-btn" data-act="copy">📋 Copy Summary</button></div>`;
    const vital = (v, label, sub = '') => `<div class="cb-vital"><b>${v}</b><span>${label}</span>${sub ? `<small>${sub}</small>` : ''}</div>`;
    h += `<div class="cb-vitals">${vital(s.hp, 'Hit Points')}${vital(s.ac.ac, 'AC', s.ac.armor ? esc(s.ac.armor.n) : 'unarmored')}${vital(pcSign(s.per), 'Perception', PC_RANKS[s.prof.per])}${vital(s.speed + ' ft', 'Speed')}
        ${Object.entries(PC_SAVES).map(([k, [n]]) => vital(pcSign(s.saves[k]), n, PC_RANKS[s.prof[k]])).join('')}${s.classdc !== null ? vital(s.classdc, 'Class DC', PC_RANKS[s.prof.classdc]) : ''}${s.cast ? vital(s.spellDc, 'Spell DC', `attack ${pcSign(s.spellAtk)}`) : ''}
        ${s.mcDc.map(x => vital(x.dc, `${esc(x.n)} DC`, 'archetype')).join('')}${s.arcs.map(x => vital(x.dc, `${esc(x.n)} spell DC`, `attack ${pcSign(x.atk)}`)).join('')}</div>`;
    h += `<div class="cb-abil-grid">${PC_ABILS.map(a => `<div class="cb-abil"><b>${abilShort(a)}</b><span class="cb-total">${pcSign(s.mods[a])}</span><span class="cb-from">${PC_ABIL_NAMES[a]}${s.partial[a] ? ' · ½' : ''}</span></div>`).join('')}</div>`;
    h += '<div class="cb-cols"><div>';
    h += `<h3>Skills</h3><ul class="cb-skill-list">${Object.keys(PC_SKILLS).map(k => `<li class="${s.ranks[k] ? 'p' : ''}">${rankTag(s.ranks[k])}<span class="cb-val">${pcSign(s.skills[k])}</span> ${skillName(k)}</li>`).join('')}${Object.entries(s.lores).map(([n, r]) => `<li class="p">${rankTag(r)}<span class="cb-val">${pcSign(s.loreMods[n])}</span> ${esc(n)}</li>`).join('')}</ul>`;
    const pr = (keys, f) => keys.filter(k => s.prof[k]).map(k => `${f(k)} ${PC_RANKS[s.prof[k]].toLowerCase()}`).join(', ');
    h += `<h3>Proficiencies</h3><ul class="cb-list"><li><b>Attacks</b> ${pr(['unarmed', 'simple', 'martial', 'advanced'], k => k)}${cur.deity.weapon && pcFavoredRank(cur) ? `, ${esc(PF2E_ITEMS[cur.deity.weapon].n)} (favored) ${PC_RANKS[pcFavoredRank(cur)].toLowerCase()}` : ''}</li>
        <li><b>Defenses</b> ${pr(['unarmored', 'light', 'medium', 'heavy'], k => (k === 'unarmored' ? 'unarmored' : k + ' armor'))}</li>
        ${p.cls ? [...Object.entries(p.cls.nt || {}), ...Object.entries((p.ch && p.ch.nt) || {})].filter(([lv]) => Number(lv) <= L).map(([, t]) => `<li class="cb-faint">${esc(t)}</li>`).join('') : ''}</ul>`;
    const langs = [...(p.anc ? p.anc.la.map(pcCap) : []), ...cur.langs];
    h += `<h3>Languages</h3><p>${langs.length ? langs.map(esc).join(', ') : '—'}</p>`;
    if (s.cast) {
        h += `<h3>Spellcasting</h3><p>${s.cast.kind === 'focus' ? 'Focus spells' : `${pcCap(s.cast.trad || 'any')} ${s.cast.kind} spells`} · ${PC_ABIL_NAMES[s.cast.attr] || ''} · DC ${s.spellDc}, attack ${pcSign(s.spellAtk)} (${PC_RANKS[s.prof.spell].toLowerCase()})</p>`;
        if (s.cast.slots.length) h += `<p>${s.cast.cantrips ? `<span class="cb-slot">Cantrips ${s.cast.cantrips}</span>` : ''}${s.cast.slots.map((n, i) => (n ? `<span class="cb-slot">Rank ${i + 1}: ${n}</span>` : '')).join('')}</p>`;
        h += `<p class="cb-faint">Pick the spells themselves in the <a href="pathfinder-spell-planner?char=${encodeURIComponent(cur.id)}">🃏 Spell Planner</a>; they save onto this character.</p>`;
    }
    if (s.arcs.length) {
        h += `<h3>Archetype spellcasting</h3>${s.arcs.map(x => `<p><b>${esc(x.n)}</b> · ${pcCap(x.trad || 'any')} ${x.kind} spells · ${PC_ABIL_NAMES[x.attr]} · DC ${x.dc}, attack ${pcSign(x.atk)} (${PC_RANKS[s.prof.spell].toLowerCase()})</p>
            <p><span class="cb-slot">Cantrips ${x.cantrips}</span>${x.slots.map((n, i) => `<span class="cb-slot">Rank ${i + 1}: ${n}</span>`).join('')}</p>`).join('')}`;
        h += `<p class="cb-faint">Plan these spells in the <a href="pathfinder-spell-planner?char=${encodeURIComponent(cur.id)}&amp;arc=${s.arcs[0].arc}">🃏 Spell Planner</a> too.</p>`;
    }
    h += '</div><div>';
    h += `<h3>Strikes</h3><div class="cb-scroll"><table class="cb-table"><thead><tr><th>Strike</th><th class="cb-num">Attack</th><th>Damage</th></tr></thead><tbody>${s.strikes.map(x => `<tr><td>${esc(x.name)}${x.traits.length ? `<br><span class="cb-tag">${esc(x.traits.join(', '))}${x.range ? ` · range ${x.range} ft` : ''}</span>` : ''}</td><td class="cb-num">${x.atk.map(pcSign).join(' / ')}</td><td>${esc(x.dmg)}</td></tr>`).join('')}</tbody></table></div>`;
    const feats = [...pcGrantedFeats(cur).filter(g => g.key).map(g => ({ level: 1, key: g.key, label: `from ${g.from}` })),
        ...pcFeatSlots(cur).filter(x => cur.feats[x.slot]).map(x => ({ level: x.level, key: cur.feats[x.slot], label: x.label.toLowerCase() }))];
    h += `<h3>Feats</h3>${feats.length ? `<div class="pb-feats">${feats.map(f => `<div>${textBox(`ft:${f.key}`, `<span class="cb-lv">Level ${f.level}</span>${featLine(PF2E_FEATS[f.key])} <span class="cb-tag">${esc(f.label)}</span>`)}</div>`).join('')}</div>` : '<p class="cb-faint">None picked yet.</p>'}`;
    h += `<h3>Class features</h3><div class="pb-feats">${pcFeatures(cur).map(f => `<div>${textBox(`cf:${f.key}`, `<span class="cb-lv">Level ${f.level}</span>${esc(f.name)}`)}</div>`).join('')}${p.ch ? `<div>${textBox(`ch:${cur.ch}`, `<span class="cb-lv">Level 1</span>${esc(p.ch.n)}`)}</div>` : ''}</div>`;
    if (p.anc && p.anc.f) h += `<h3>Ancestry</h3><ul class="cb-list">${p.anc.f.map(([n]) => `<li><b>${esc(n)}</b></li>`).join('')}${p.anc.vi ? `<li><b>${pcCap(p.anc.vi.replace(/-/g, ' '))}</b></li>` : ''}</ul>`;
    if (p.her) h += `<details class="pb-text-plain"><summary>${esc(p.her.n)}</summary>${rulesHtml(p.her.x)}</details>`;
    h += '</div></div>';
    if (cur.notes) h += `<h3>Notes</h3><p class="pb-notes">${esc(cur.notes)}</p>`;
    return h;
}

function summaryText(c) {
    const s = pcStats(c);
    const lines = [`${c.name || 'Unnamed hero'}: ${pcLine(c)}`,
        `HP ${s.hp} · AC ${s.ac.ac} · Perception ${pcSign(s.per)} · Speed ${s.speed} ft`,
        `Fort ${pcSign(s.saves.fort)} · Ref ${pcSign(s.saves.ref)} · Will ${pcSign(s.saves.will)}${s.classdc !== null ? ` · Class DC ${s.classdc}` : ''}${s.cast ? ` · Spell DC ${s.spellDc}` : ''}${s.mcDc.map(x => ` · ${x.n} DC ${x.dc}`).join('')}${s.arcs.map(x => ` · ${x.n} spell DC ${x.dc}`).join('')}`,
        PC_ABILS.map(a => `${abilShort(a)} ${pcSign(s.mods[a])}`).join(' '),
        'Skills: ' + Object.keys(PC_SKILLS).filter(k => s.ranks[k]).map(k => `${skillName(k)} ${pcSign(s.skills[k])}`).join(', '),
        ...s.strikes.map(x => `${x.name} ${x.atk.map(pcSign).join('/')} (${x.dmg})`)];
    return lines.join('\n');
}

// ── Actions ─────────────────────────────────────────────
function openChar(c) {
    cur = c;
    if (cur) {
        const u = new URL(location.href);
        u.searchParams.set('char', cur.id);
        history.replaceState(null, '', u);
    }
    render();
}

function newChar() {
    if (chars.length >= PC_MAX) { flash(`You have ${PC_MAX} characters already: delete one first.`, true); return; }
    cur = pcBlank();
    save();
    step = 'ancestry';
    openChar(cur);
    flash('➕ New character. Start with an ancestry.');
}

function addToParty() {
    const row = cleanPartyMember(pcPartyRow(cur));
    const party = loadParty();
    const at = party.findIndex(p => p.id === row.id);
    if (at >= 0) party[at] = { ...row, live: party[at].live };
    else if (party.length >= PARTY_MAX) { flash(`The party already has ${PARTY_MAX} characters. Remove one on the Party Tracker.`, true); return; }
    else party.push(row);
    if (!saveParty(party)) { flash("Could not add to the party: this browser's storage is full or blocked.", true); return; }
    flash(at >= 0 ? '👥 Updated this character in the party.' : '👥 Added to the party (Party Tracker).');
}

function exportChar() {
    const blob = new Blob([JSON.stringify({ gazettePf2eCharacter: 1, character: cur }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = (cur.name || 'character').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) + '-pf2e.json';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 0);
}

function importChar(file) {
    if (!file) return;
    if (file.size > 200000) { flash('That file is too big to be a character.', true); return; }
    const reader = new FileReader();
    reader.onload = () => {
        let data = null;
        try { data = JSON.parse(reader.result); } catch (e) {}
        const c = pcClean(data && data.character);
        if (!c || !(data && data.gazettePf2eCharacter)) { flash('That isn\'t a Pathfinder character file from this builder.', true); return; }
        if (chars.some(x => x.id === c.id)) c.id = pcNewId();
        if (chars.length >= PC_MAX) { flash(`You have ${PC_MAX} characters already: delete one first.`, true); return; }
        cur = c;
        save();
        step = 'sheet';
        openChar(cur);
        flash(`⬆️ Imported ${c.name || 'a character'}.`);
    };
    reader.readAsText(file);
}

function onClick(e) {
    const t = e.target.closest('button, [data-go]');
    if (!t || t.disabled) return;
    const d = t.dataset;
    if (d.step) { step = d.step; render(); document.getElementById('cb-panel').focus({ preventScroll: true }); return; }
    if (d.go) { step = d.go; render(); document.getElementById('cb-panel').scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    if (d.act === 'new') return newChar();
    if (!cur) return;
    if (d.set) {
        const field = d.set, val = d.val;
        return change(c => {
            if (c[field] === val) return;
            c[field] = val;
            if (field === 'race') { c.boosts.anc = []; if (PF2E_HERITAGES[c.her] && PF2E_HERITAGES[c.her].a) c.her = ''; }
            if (field === 'bg') c.boosts.bg = [];
            if (field === 'cls') { c.ch = ''; c.ch2 = ''; c.sub = ''; c.skills.ch = ''; c.boosts.key = ''; c.paths = {}; Object.keys(c.feats).filter(s => /^cls/.test(s)).forEach(s => delete c.feats[s]); }
            if (field === 'ch') { c.skills.ch = ''; c.sub = ''; }
        });
    }
    if (d.key) return change(c => { c.boosts.key = d.key; });
    if (d.chskill) return change(c => { c.skills.ch = d.chskill; });
    if (d.sub) return change(c => { c.sub = d.sub; });
    if (d.boost) {
        return change(c => {
            const f = d.boost;
            if (f === 'key') { c.boosts.key = d.val; return; }
            const arr = (c.boosts[f] = (c.boosts[f] || []).slice());
            arr[Number(d.i)] = arr[Number(d.i)] === d.val ? '' : d.val;
            for (let i = 0; i < arr.length; i++) if (arr[i] === undefined) arr[i] = '';
        });
    }
    if (d.skill) {
        return change(c => {
            const k = d.skill;
            c.skills.cls = c.skills.cls.includes(k) ? c.skills.cls.filter(x => x !== k) : [...c.skills.cls, k];
        });
    }
    if (d.act === 'add-lore') {
        const v = document.getElementById('pb-lore').value.trim().replace(/\s+/g, ' ').slice(0, 40);
        if (!v) return;
        const name = /lore$/i.test(v) ? v.replace(/lore$/i, 'Lore') : `${v} Lore`;
        return change(c => { if (!pcLores(c).includes(name) && c.skills.lore.length < 6) c.skills.lore.push(name); });
    }
    if (d.delLore !== undefined) return change(c => { c.skills.lore.splice(Number(d.delLore), 1); });
    if (d.act === 'add-weapon') {
        const id = document.getElementById('pb-add-weapon').value;
        if (!id) return;
        if (cur.gear.weapons.length >= 8) { flash('Eight weapons is the most the sheet keeps.', true); return; }
        return change(c => { c.gear.weapons.push({ id, pot: 0, str: 0 }); });
    }
    if (d.delWeapon !== undefined) return change(c => { c.gear.weapons.splice(Number(d.delWeapon), 1); });
    if (d.act === 'print') return window.print();
    if (d.act === 'party') return addToParty();
    if (d.act === 'copy') {
        const done = () => flash('📋 Copied.');
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(summaryText(cur)).then(done, () => flash('Could not copy.', true));
        else flash('Could not copy.', true);
    }
}

function onChange(e) {
    const el = e.target;
    const d = el.dataset;
    if (el.id === 'cb-pick') { const c = chars.find(x => x.id === el.value); if (c) openChar(c); return; }
    if (el.id === 'pb-level') return change(c => { c.level = Number(el.value); });
    if (!cur) return;
    if (d.sel) return change(c => { const [a, b] = d.sel.split('.'); c[a][b] = el.value; });
    if (d.inc) return change(c => { if (el.value) c.skills.inc[d.inc] = el.value; else delete c.skills.inc[d.inc]; });
    if (d.feat) return change(c => { if (el.value) c.feats[d.feat] = el.value; else delete c.feats[d.feat]; });
    if (d.path) return change(c => { if (el.value) c.paths[d.path] = el.value; else delete c.paths[d.path]; });
    if (d.rune) {
        return change(c => {
            const n = Number(el.value);
            if (d.rune === 'arPot') c.gear.arPot = n;
            else c.gear.weapons[Number(d.i)][d.rune] = n;
        });
    }
    if (d.ancFree !== undefined) return change(c => { c.boosts.ancFree = el.checked; c.boosts.anc = []; });
    if (d.archetype !== undefined) { showArchetype = el.checked; render(); return; }
    if (d.fa !== undefined) return change(c => { c.fa = el.checked; });
    const mcCls = d.mcCh || d.mcTr || d.mcSk;
    if (mcCls) {
        return change(c => {
            const m = c.mc[mcCls] = { ch: '', tr: '', sk: [], ...c.mc[mcCls] };
            if (d.mcCh) { m.ch = el.value; m.tr = ''; }
            if (d.mcTr) m.tr = el.value;
            if (d.mcSk) { m.sk = m.sk.slice(); m.sk[Number(d.i)] = el.value; for (let i = 0; i < m.sk.length; i++) m.sk[i] = m.sk[i] || ''; }
        });
    }
    if (d.langs !== undefined) return change(c => { c.langs = el.value.split(',').map(x => x.trim().slice(0, 30)).filter(Boolean).slice(0, 12); });
}

// Text fields save as you type, without redrawing (the sheet picks them up next time).
function onInput(e) {
    const el = e.target;
    if (el.id === 'pb-bg-filter') {
        const q = el.value.trim().toLowerCase();
        document.querySelectorAll('#pb-bg-cards .cb-card').forEach(b => { b.hidden = q && !b.dataset.name.includes(q); });
        return;
    }
    if (!cur || !el.dataset.f) return;
    const [a, b] = el.dataset.f.split('.');
    if (b) cur[a][b] = el.value.slice(0, Number(el.maxLength) > 0 ? Number(el.maxLength) : 4000);
    else cur[a] = el.value;
    save();
    if (a === 'name') renderBar();
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('year').textContent = new Date().getFullYear();
    chars = pcLoadAll();
    const asked = new URLSearchParams(location.search).get('char');
    cur = chars.find(c => c.id === asked) || chars[0] || null;
    if (cur && asked === cur.id) step = 'sheet';
    render();
    const main = document.querySelector('.cb-main');
    main.addEventListener('click', onClick);
    main.addEventListener('change', onChange);
    main.addEventListener('input', onInput);
    main.addEventListener('toggle', e => { if (e.target.matches && e.target.matches('details.pb-text') && e.target.open) fillTexts(e.target.parentElement); }, true);
    document.getElementById('cb-new').addEventListener('click', newChar);
    document.getElementById('cb-dup').addEventListener('click', () => {
        if (!cur) return;
        if (chars.length >= PC_MAX) { flash(`You have ${PC_MAX} characters already: delete one first.`, true); return; }
        const copy = pcClean(JSON.parse(JSON.stringify(cur)));
        copy.id = pcNewId();
        copy.name = (cur.name || 'Unnamed hero') + ' (copy)';
        cur = copy;
        save();
        openChar(cur);
        flash('⧉ Duplicated.');
    });
    document.getElementById('cb-del').addEventListener('click', e => {
        if (!cur) return;
        const btn = e.currentTarget;
        if (btn.dataset.armed !== '1') {
            btn.dataset.armed = '1';
            btn.textContent = '🗑️ Click again to delete';
            setTimeout(() => { btn.dataset.armed = ''; btn.textContent = '🗑️ Delete'; }, 4000);
            return;
        }
        btn.dataset.armed = '';
        btn.textContent = '🗑️ Delete';
        const name = cur.name || 'Unnamed hero';
        chars = pcDelete(cur.id);
        openChar(chars[0] || null);
        flash(`🗑️ Deleted ${name}.`);
    });
    document.getElementById('cb-export').addEventListener('click', () => { if (cur) exportChar(); });
    document.getElementById('cb-import').addEventListener('change', e => { importChar(e.target.files[0]); e.target.value = ''; });
    // Another tab saved a character: pick it up.
    window.addEventListener('storage', e => {
        if (e.key !== PC_KEY && e.key !== null) return;
        chars = pcLoadAll();
        cur = (cur && chars.find(c => c.id === cur.id)) || chars[0] || null;
        render();
    });
});
