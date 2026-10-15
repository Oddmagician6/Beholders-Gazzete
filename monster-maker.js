/* ============================================
   MONSTER MAKER PAGE (F52)
   A form for one homebrew monster (homebrew.js) with its stat block drawn beside it as you
   type (toolbox-statblock.js) and the CR estimate's working under that.
   The monster being worked on is kept in localStorage MM_DRAFT_KEY:
     { v: 1, mon, nb: <notebook entry id it was opened from or saved as> | null, dirty, prev }
   `prev` is the draft a link or a Load replaced while it had unsaved changes, so it can be
   brought back. 💾 saves to the campaign notebook (notebook.js) as a 'monster' entry, which
   is how the Toolbox's Encounter and Initiative tabs find it (ids 'hb-<entry id>').
   URL (read once, then cleared so a reload keeps your edits):
     ?from=<SRD monster id>  start from that SRD stat block (the Bestiary's 🐲 button)
     ?nb=<entry id>          open a saved monster from the notebook
     ?mon=<share code>       a monster someone sent (🔗 Copy Link)
   ============================================ */

const MM_DRAFT_KEY = 'gazette-monster-draft';
const MM_ALIGNS = ['unaligned', 'any alignment', 'lawful good', 'neutral good', 'chaotic good', 'lawful neutral', 'neutral', 'chaotic neutral', 'lawful evil', 'neutral evil', 'chaotic evil', 'any evil alignment', 'any chaotic alignment', 'any non-good alignment', 'any non-lawful alignment'];
const MM_CONDS = ['blinded', 'charmed', 'deafened', 'exhaustion', 'frightened', 'grappled', 'incapacitated', 'invisible', 'paralyzed', 'petrified', 'poisoned', 'prone', 'restrained', 'stunned', 'unconscious'];
const MM_SECTION_TIPS = {
    tr: 'Things it always is or does: Pack Tactics, Magic Resistance, Spellcasting.',
    ac2: 'What it does on its turn. ⚔️ Add an Attack writes the to-hit and damage from its scores.',
    ba: 'Quick extras on its turn.',
    re: 'What it does on someone else\'s turn.',
    le: 'Options it picks between other creatures\' turns.'
};
const MM_PRESETS = {
    tr: [
        ['Amphibious', '{Name} can breathe air and water.'],
        ['Keen Senses', '{Name} has advantage on Wisdom (Perception) checks that rely on sight, hearing, or smell.'],
        ['Magic Resistance', '{Name} has advantage on saving throws against spells and other magical effects.'],
        ['Pack Tactics', "{Name} has advantage on an attack roll against a creature if at least one of its allies is within 5 feet of the creature and the ally isn't incapacitated."],
        ['Legendary Resistance (3/Day)', 'If {name} fails a saving throw, it can choose to succeed instead.'],
        ['Regeneration', '{Name} regains 10 hit points at the start of its turn if it has at least 1 hit point.'],
        ['Spider Climb', '{Name} can climb difficult surfaces, including upside down on ceilings, without needing to make an ability check.'],
        ['Sunlight Sensitivity', 'While in sunlight, {name} has disadvantage on attack rolls, as well as on Wisdom (Perception) checks that rely on sight.'],
        ['Innate Spellcasting', "{Name}'s innate spellcasting ability is Charisma (spell save DC {dc:cha}). It can innately cast the following spells, requiring no material components:\n- At will: [[mage hand]], [[minor illusion]]\n- 1/day each: [[invisibility]]"]
    ],
    ac2: [
        ['Multiattack', '{Name} makes two attacks.'],
        ['Breath Weapon (Recharge 5–6)', '{Name} exhales fire in a 30-foot cone. Each creature in that area must make a DC {dc:con} Dexterity saving throw, taking {dmg:8d6} fire damage on a failed save, or half as much damage on a successful one.'],
        ['Frightful Presence', '{Name} roars. Each creature of its choice within 60 feet that can hear it must succeed on a DC {dc:cha} Wisdom saving throw or be frightened for 1 minute. A creature can repeat the saving throw at the end of each of its turns, ending the effect on itself on a success.']
    ],
    ba: [
        ['Nimble Escape', '{Name} takes the Disengage or Hide action.']
    ],
    re: [
        ['Parry', '{Name} adds 2 to its AC against one melee attack that would hit it. To do so, it must see the attacker and be wielding a melee weapon.']
    ],
    le: [
        ['Detect', '{Name} makes a Wisdom (Perception) check.'],
        ['Attack', '{Name} makes one attack.'],
        ['Move', '{Name} moves up to half its speed without provoking opportunity attacks.']
    ]
};

let draft = { mon: hbBlank(), nb: null, dirty: false };
let prev = null;
let storeTimer = null;

function esc(text) {
    return String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

function mmFlash(text) {
    const el = document.getElementById('mm-status');
    el.textContent = text;
    clearTimeout(el._t);
    el._t = setTimeout(() => { el.textContent = ''; }, 3500);
}

// Two clicks for anything that throws work away; the first only warns.
function armed(btn, warn, action) {
    if (btn.dataset.armed) {
        delete btn.dataset.armed;
        btn.textContent = btn.dataset.label;
        action();
        return;
    }
    btn.dataset.label = btn.textContent;
    btn.dataset.armed = '1';
    btn.textContent = warn;
    clearTimeout(btn._t);
    btn._t = setTimeout(() => { delete btn.dataset.armed; btn.textContent = btn.dataset.label; }, 3000);
}

function hasWork(mon) {
    return !!(mon.name || HB_SECTIONS.some(([k]) => mon[k].length));
}

// ── The draft ─────────────────────────────────────────────
function cleanDraftPart(d) {
    const mon = d && hbClean(d.mon);
    return mon ? { mon, nb: typeof d.nb === 'string' && /^[a-z0-9]{1,16}$/.test(d.nb) ? d.nb : null, dirty: d.dirty === true } : null;
}

function loadDraft() {
    try {
        const raw = JSON.parse(localStorage.getItem(MM_DRAFT_KEY));
        const cur = cleanDraftPart(raw);
        if (cur) draft = cur;
        prev = raw && cleanDraftPart(raw.prev);
    } catch (e) {}
}

function storeDraft() {
    clearTimeout(storeTimer);
    storeTimer = null;
    try {
        localStorage.setItem(MM_DRAFT_KEY, JSON.stringify({ v: 1, ...draft, prev }));
    } catch (e) {
        mmFlash('⚠️ This browser would not keep the draft. Save it to the notebook before you leave.');
    }
}

function storeSoon() {
    clearTimeout(storeTimer);
    storeTimer = setTimeout(storeDraft, 400);
}

// The entry the draft was opened from or saved as, if it is still in the notebook.
function draftEntry(nb = nbLoad()) {
    const e = draft.nb && nbFind(nb, draft.nb);
    return e && e.kind === 'monster' ? e : null;
}

// Put a new monster in the form. Unsaved work goes to `prev`, so it can come back.
function replaceDraft(mon, nb, said) {
    if (draft.dirty && hasWork(draft.mon)) prev = { ...draft };
    draft = { mon, nb, dirty: false };
    storeDraft();
    fillForm();
    renderAll();
    if (said) mmFlash(said);
}

function bringBack() {
    if (!prev) return;
    const was = draft;
    draft = prev;
    prev = was.dirty || hasWork(was.mon) ? was : null;
    storeDraft();
    fillForm();
    renderAll();
    mmFlash(`↩️ Back to ${draft.mon.name || 'the unnamed monster'}.`);
}

// ── Form setup ────────────────────────────────────────────
function setupForm() {
    const opts = (list, label = x => x) => list.map(x => `<option value="${esc(x)}">${esc(label(x))}</option>`).join('');
    document.getElementById('mm-size').innerHTML = Object.entries(HB_SIZES).map(([k, [name, die]]) => `<option value="${k}">${name} (d${die})</option>`).join('');
    document.getElementById('mm-hdie').innerHTML = '<option value="0">By size</option>' + [4, 6, 8, 10, 12, 20].map(d => `<option value="${d}">d${d}</option>`).join('');
    document.getElementById('mm-types').innerHTML = opts(HB_TYPES);
    document.getElementById('mm-aligns').innerHTML = opts(MM_ALIGNS);
    document.getElementById('mm-dmg').innerHTML = opts([...HB_DAMAGE, 'bludgeoning, piercing, and slashing from nonmagical attacks',
        "bludgeoning, piercing, and slashing from nonmagical attacks that aren't silvered", "bludgeoning, piercing, and slashing from nonmagical attacks that aren't adamantine"]);
    document.getElementById('mm-conds').innerHTML = opts(MM_CONDS);
    document.getElementById('mm-cr-pick').innerHTML = '<option value="auto">Auto (the estimate)</option>'
        + HB_CRS.map((c, i) => `<option value="${c}">CR ${c} (${HB_XP[i].toLocaleString('en-US')} XP)</option>`).join('');
    document.getElementById('mm-abils').innerHTML = HB_ABIL_NAMES.map((n, i) => `
        <div class="mm-abil">
            <label for="mm-ab-${i}">${n.toUpperCase()}</label>
            <input type="number" id="mm-ab-${i}" data-f="ab.${i}" min="1" max="30" step="1" inputmode="numeric">
            <span class="mm-mod" id="mm-mod-${i}"></span>
            <label class="mm-check" title="Proficient in ${n} saving throws"><input type="checkbox" data-f="saves.${i}"> Save <span id="mm-save-${i}"></span></label>
        </div>`).join('');
    document.getElementById('mm-skills').innerHTML = Object.entries(HB_SKILLS).map(([k, [name, ab]]) => `
        <label class="mm-skill" id="mm-sk-${k.replace(/ /g, '-')}">
            <span>${name} <small>(${HB_ABIL_NAMES[ab]})</small></span>
            <select data-f="skills.${k}" aria-label="${name}"><option value="0">—</option><option value="1">Proficient</option><option value="2">Expertise</option></select>
            <span class="mm-bonus"></span>
        </label>`).join('');
    document.getElementById('mm-sections').innerHTML = HB_SECTIONS.map(([k, title]) => `
        <section class="mm-set" data-sec="${k}">
            <h2>${{ tr: '✨', ac2: '⚔️', ba: '⚡', re: '↩️', le: '👑' }[k]} ${title}${k === 'le' ? ` <label class="mm-h-note">a round: <select data-f="legN" aria-label="Legendary actions a round">${[1, 2, 3, 4, 5].map(n => `<option value="${n}">${n}</option>`).join('')}</select></label>` : ''}</h2>
            <p class="mm-tip">${esc(MM_SECTION_TIPS[k])}</p>
            <ol class="mm-feats" id="mm-feats-${k}"></ol>
            <div class="mm-adds">
                <button type="button" class="btn" data-add="${k}">➕ Add ${k === 'tr' ? 'a Trait' : k === 'le' ? 'an Option' : 'One'}</button>
                ${k === 'ac2' ? '<button type="button" class="btn btn-gold" data-add="atk">⚔️ Add an Attack</button>' : ''}
                <select data-preset="${k}" aria-label="Add a common ${title.toLowerCase().replace(/s$/, '')}">
                    <option value="">Common ${title.toLowerCase()}…</option>
                    ${MM_PRESETS[k].map(([n], i) => `<option value="${i}">${esc(n)}</option>`).join('')}
                </select>
            </div>
        </section>`).join('');
    document.querySelector('[data-sec="tr"] .mm-tip').insertAdjacentHTML('afterend',
        '<p class="mm-tip">Text can use <code>{name}</code> / <code>{Name}</code> (the monster), <code>{atk:str}</code> (attack bonus), <code>{dc:wis}</code> (save DC), and <code>{dmg:2d6+str}</code> (damage); they follow the scores. <code>[[fireball]]</code> links a spell.</p>');
}

function setPath(obj, path, value) {
    const keys = path.split('.');
    const last = keys.pop();
    const target = keys.reduce((o, k) => o[k], obj);
    target[last] = value;
}

function getPath(obj, path) {
    return path.split('.').reduce((o, k) => (o === undefined || o === null ? o : o[k]), obj);
}

// The form from draft.mon (on load and after a Load, Blank, or bring-back).
function fillForm() {
    const mon = draft.mon;
    document.querySelectorAll('#mm-form [data-f]').forEach(el => {
        const v = getPath(mon, el.dataset.f);
        if (el.type === 'checkbox') el.checked = v === true;
        else el.value = v === null || v === undefined ? '' : String(v);
    });
    HB_SECTIONS.forEach(([k]) => renderFeats(k));
}

// ── Features ──────────────────────────────────────────────
function featInput(k, i, f, label, value, attrs = '') {
    return `<div class="mm-f"><label for="mm-${k}-${i}-${f.replace('.', '-')}">${label}</label><input type="text" id="mm-${k}-${i}-${f.replace('.', '-')}" data-ff="${f}" value="${esc(value)}"${attrs}></div>`;
}

function attackFieldsHtml(k, i, a) {
    const [, melee, ranged] = HB_ATTACKS[a.kind];
    const kinds = { mw: 'Melee weapon', rw: 'Ranged weapon', mrw: 'Melee or ranged weapon', ms: 'Melee spell', rs: 'Ranged spell' };
    const abils = [[0, 'Str'], [1, 'Dex'], [-1, 'Str or Dex (finesse)'], [2, 'Con'], [3, 'Int'], [4, 'Wis'], [5, 'Cha']];
    const id = f => `mm-${k}-${i}-${f}`;
    return `<div class="mm-atk">
        <div class="mm-f mm-half"><label for="${id('kind')}">Attack</label><select id="${id('kind')}" data-ff="atk.kind">${Object.entries(kinds).map(([v, l]) => `<option value="${v}"${v === a.kind ? ' selected' : ''}>${l}</option>`).join('')}</select></div>
        <div class="mm-f"><label for="${id('abil')}">Uses</label><select id="${id('abil')}" data-ff="atk.abil">${abils.map(([v, l]) => `<option value="${v}"${v === a.abil ? ' selected' : ''}>${l}</option>`).join('')}</select></div>
        ${melee ? `<div class="mm-f"><label for="${id('reach')}">Reach (ft.)</label><input type="number" id="${id('reach')}" data-ff="atk.reach" min="0" max="300" step="5" value="${a.reach}" inputmode="numeric"></div>` : ''}
        ${ranged ? featInput(k, i, 'atk.range', 'Range (ft.)', a.range, ' maxlength="20" placeholder="80/320"') : ''}
        ${featInput(k, i, 'atk.target', 'Target', a.target, ' maxlength="60"')}
        ${featInput(k, i, 'atk.dice', 'Damage dice', a.dice, ' maxlength="20" placeholder="1d8"')}
        ${featInput(k, i, 'atk.type', 'Damage type', a.type, ' maxlength="30" list="mm-dmg-types"')}
        ${featInput(k, i, 'atk.dice2', 'Plus dice', a.dice2, ' maxlength="20" placeholder="1d6 (optional)"')}
        ${featInput(k, i, 'atk.type2', 'Plus type', a.type2, ' maxlength="30" list="mm-dmg-types" placeholder="fire"')}
    </div>`;
}

function renderFeats(k) {
    const list = draft.mon[k];
    document.getElementById(`mm-feats-${k}`).innerHTML = list.map((f, i) => `
        <li class="mm-feat" data-sec="${k}" data-i="${i}">
            <div class="mm-feat-top">
                <input type="text" data-ff="name" value="${esc(f.name)}" maxlength="${HB_LIMITS.featName}" aria-label="Name" placeholder="${f.atk ? 'Bite, Longsword, Spit Acid' : k === 'tr' ? 'Pack Tactics' : 'Name'}">
                <button type="button" data-act="up" aria-label="Move up" title="Move up"${i ? '' : ' disabled'}>▲</button>
                <button type="button" data-act="down" aria-label="Move down" title="Move down"${i < list.length - 1 ? '' : ' disabled'}>▼</button>
                <button type="button" data-act="del" aria-label="Remove ${esc(f.name || 'this one')}" title="Remove">✕</button>
            </div>
            ${f.atk ? attackFieldsHtml(k, i, f.atk) : ''}
            <div class="mm-f"><textarea data-ff="text" rows="${f.atk ? 1 : 2}" maxlength="${HB_LIMITS.text}" aria-label="${f.atk ? 'After the hit' : 'What it does'}"
                placeholder="${f.atk ? 'After the hit (optional): If the target is a creature, it must succeed on a DC {dc:con} Constitution saving throw or be poisoned for 1 minute.' : 'What it does…'}">${esc(f.text)}</textarea></div>
            ${f.atk ? '<p class="mm-atk-line"></p>' : ''}
        </li>`).join('');
    updateAttackLines();
}

function addFeat(k, feat, focus = true) {
    if (draft.mon[k].length >= HB_LIMITS.feats) { mmFlash(`⚠️ ${HB_LIMITS.feats} is the most in one section.`); return; }
    draft.mon[k].push(feat);
    changed();
    renderFeats(k);
    if (focus) {
        const li = document.querySelector(`#mm-feats-${k} > li:last-child`);
        const el = li && li.querySelector(feat.name ? (feat.atk ? '[data-ff="atk.dice"]' : 'textarea') : 'input');
        if (el) el.focus();
    }
}

function onSectionsClick(e) {
    const add = e.target.closest('[data-add]');
    if (add) {
        if (add.dataset.add === 'atk') addFeat('ac2', { name: '', text: '', atk: hbCleanAtk({ kind: 'mw', abil: 0, dice: '1d6', type: 'bludgeoning' }) });
        else addFeat(add.dataset.add, { name: '', text: '' });
        return;
    }
    const btn = e.target.closest('.mm-feat-top button[data-act]');
    if (!btn) return;
    const li = btn.closest('.mm-feat');
    const k = li.dataset.sec, i = Number(li.dataset.i), list = draft.mon[k];
    if (btn.dataset.act === 'del') list.splice(i, 1);
    else {
        const j = btn.dataset.act === 'up' ? i - 1 : i + 1;
        if (j < 0 || j >= list.length) return;
        [list[i], list[j]] = [list[j], list[i]];
    }
    changed();
    renderFeats(k);
}

function onPreset(e) {
    const sel = e.target.closest('select[data-preset]');
    if (!sel || sel.value === '') return;
    const [name, text] = MM_PRESETS[sel.dataset.preset][Number(sel.value)];
    sel.value = '';
    addFeat(sel.dataset.preset, { name, text });
}

// ── Typing ────────────────────────────────────────────────
function readField(el) {
    return el.type === 'checkbox' ? el.checked : el.value;
}

function onFormInput(e) {
    const el = e.target;
    if (el.dataset.f) {
        const path = el.dataset.f;
        if (path.startsWith('skills.')) {
            const key = path.slice(7);
            if (Number(el.value)) draft.mon.skills[key] = Number(el.value);
            else delete draft.mon.skills[key];
        } else setPath(draft.mon, path, readField(el));
    } else if (el.dataset.ff) {
        const li = el.closest('.mm-feat');
        if (!li) return;
        const f = draft.mon[li.dataset.sec][Number(li.dataset.i)];
        setPath(f, el.dataset.ff, el.dataset.ff === 'atk.abil' ? Number(el.value) : el.value);
        if (el.dataset.ff === 'atk.kind') {
            // Spells use a mental score; weapons keep theirs.
            if (HB_ATTACKS[el.value][3] && f.atk.abil < 3) f.atk.abil = 5;
            draft.mon = hbClean(draft.mon);
            changed(false);
            renderFeats(li.dataset.sec);
            return;
        }
    } else return;
    draft.mon = hbClean(draft.mon);
    changed(false);
}

// A finished field shows what was kept (a clamped number, a bad dice formula put back).
function onFormChange(e) {
    onFormInput(e);
    const el = e.target;
    if (el.dataset.f && el.type !== 'checkbox' && !el.dataset.f.startsWith('skills.')) {
        const v = getPath(draft.mon, el.dataset.f);
        el.value = v === null || v === undefined ? '' : String(v);
    } else if (el.dataset.ff && el.tagName === 'INPUT') {
        const li = el.closest('.mm-feat');
        const f = li && draft.mon[li.dataset.sec][Number(li.dataset.i)];
        if (f) el.value = String(getPath(f, el.dataset.ff) ?? '');
    }
}

// After any edit. clean: false when the caller has just cleaned the monster itself.
function changed(clean = true) {
    if (clean) draft.mon = hbClean(draft.mon);
    draft.dirty = true;
    storeSoon();
    renderAll();
}

// ── Drawing ───────────────────────────────────────────────
function updateAttackLines() {
    const cr = hbCr(draft.mon), pb = hbPb(cr);
    document.querySelectorAll('.mm-feat').forEach(li => {
        const line = li.querySelector('.mm-atk-line');
        const f = draft.mon[li.dataset.sec][Number(li.dataset.i)];
        if (line && f && f.atk) line.textContent = hbAttackText(draft.mon, f, pb);
    });
}

function renderAll() {
    const mon = draft.mon;
    const est = hbEstimateCr(mon);
    const cr = mon.cr === 'auto' ? est.cr : mon.cr;
    const pb = hbPb(cr);
    const row = hbRow(mon, 'preview');
    // The numbers beside the inputs.
    const hp = hbHp(mon);
    document.getElementById('mm-hp-calc').innerHTML = `Hit points <b>${esc(hp.text)}</b>${mon.hpFlat ? ' (fixed; clear it to use the dice)' : `: ${mon.hd} × d${hbDie(mon)}, plus ${hbSigned(hbMod(mon.ab[2]))} Con each`}`;
    mon.ab.forEach((v, i) => {
        document.getElementById(`mm-mod-${i}`).textContent = hbSigned(hbMod(v));
        document.getElementById(`mm-save-${i}`).textContent = hbSigned(hbSaveBonus(mon, i, pb));
    });
    Object.keys(HB_SKILLS).forEach(k => {
        const el = document.getElementById(`mm-sk-${k.replace(/ /g, '-')}`);
        el.classList.toggle('on', !!mon.skills[k]);
        el.querySelector('.mm-bonus').textContent = hbSigned(hbSkillBonus(mon, k, pb));
    });
    const read = hbReadOffense(mon, pb);
    document.getElementById('mm-dpr').placeholder = String(read.dpr);
    document.getElementById('mm-atkb').placeholder = read.atk === null ? '—' : hbSigned(read.atk).replace('−', '-');
    document.getElementById('mm-dcv').placeholder = read.dc === null ? '—' : String(read.dc);
    updateAttackLines();
    // The stat block.
    const art = `img/creature/${HB_TYPES.includes(row.type) ? row.type : row.type === 'swarm' ? 'beast' : 'monstrosity'}.webp`;
    const artEl = document.getElementById('mm-art');
    if (artEl.getAttribute('src') !== art) artEl.src = art;
    document.getElementById('mm-block').innerHTML = `<h3 class="mm-sb-name">${esc(row.name)}</h3>${monsterBlockHtml(row)}`;
    document.getElementById('mm-sum').innerHTML = `<span>🐲 <b>${esc(row.name)}</b> · CR ${esc(cr)} · AC ${mon.ac} · HP ${hp.avg}</span><a href="#mm-preview">📜 Stat block ↓</a>`;
    // The estimate's working.
    const same = mon.cr === 'auto' || mon.cr === est.cr;
    document.getElementById('mm-cr').innerHTML = `
        <summary>⚖️ ${mon.cr === 'auto' ? `Estimated <b>CR ${esc(est.cr)}</b> (${hbXp(est.cr).toLocaleString('en-US')} XP)` : `You set <b>CR ${esc(mon.cr)}</b>; ${same ? 'the numbers agree' : `the numbers say <b>CR ${esc(est.cr)}</b>`}`}</summary>
        <div class="mm-cr-cols">
            <div><h3>🛡️ Defensive: CR ${esc(est.defensive)}</h3><ol>${est.def.map(s => `<li>${esc(s)}</li>`).join('')}</ol></div>
            <div><h3>⚔️ Offensive: CR ${esc(est.offensive)}</h3><ol>${est.off.map(s => `<li>${esc(s)}</li>`).join('')}</ol></div>
        </div>
        <p>The average of CR ${esc(est.defensive)} and CR ${esc(est.offensive)}, to the nearest CR (a tie rounds up), is CR ${esc(est.cr)}. Proficiency bonus ${hbSigned(pb)}. Every 2 points of AC or attack bonus above or below the usual moves a CR one step. It doesn't read every trait (an aura, a swallow, a summon); when one matters, set the damage above or the CR yourself.</p>`;
    renderSource();
    document.getElementById('mm-copy-new').hidden = !draftEntry();
}

function renderSource() {
    const box = document.getElementById('mm-source');
    const e = draftEntry();
    const parts = [];
    if (e) parts.push(`<span>📓 ${draft.dirty ? 'Unsaved changes to' : 'Saved in your notebook:'} <b>${esc(e.title)}</b>.</span>`);
    else if (draft.dirty && hasWork(draft.mon)) parts.push('<span>✏️ Not saved yet. 💾 Save to Notebook to use it in the Toolbox.</span>');
    if (prev) parts.push(`<span>The draft you had before: <b>${esc(prev.mon.name || 'an unnamed monster')}</b>.</span><button type="button" class="btn" id="mm-back">↩️ Bring It Back</button>`);
    box.hidden = !parts.length;
    box.innerHTML = parts.join('');
}

function renderSaved() {
    const nb = nbLoad();
    const list = hbSaved(nb).sort((a, b) => a.title.localeCompare(b.title));
    document.getElementById('mm-saved-empty').hidden = list.length > 0;
    document.getElementById('mm-saved').innerHTML = list.map(e => `
        <li data-id="${esc(e.id)}"${e.id === draft.nb ? ' class="on"' : ''}>
            <span class="mm-sv-name">🐲 ${esc(e.title)}</span>
            <span class="mm-sv-sub">${esc(hbSummary(e.mon))}</span>
            <span class="mm-sv-acts">
                <button type="button" class="btn" data-act="open">✏️ Open</button>
                <a class="btn" href="toolbox?${esc(paramsQuery({ tab: 'init', add: `${HB_PREFIX}${e.id}.1` }))}">🎲 Initiative</a>
                <a class="btn" href="toolbox?${esc(paramsQuery({ tab: 'enc', m: `${HB_PREFIX}${e.id}.1` }))}">⚔️ Encounter</a>
                <button type="button" class="btn" data-act="remove">🗑️ Remove</button>
            </span>
        </li>`).join('');
    const names = [...hbSaved(nb).map(e => e.title), ...MONSTERS.map(m => m.name)];
    document.getElementById('mm-from-list').innerHTML = names.map(n => `<option value="${esc(n)}"></option>`).join('');
}

// ── Actions ───────────────────────────────────────────────
function openEntry(id, said = true) {
    const e = nbFind(nbLoad(), id);
    if (!e || e.kind !== 'monster' || !e.mon) { mmFlash("⚠️ That monster isn't in this browser's notebook."); return false; }
    replaceDraft(hbClean(e.mon), e.id, said ? `✏️ Opened ${e.title} from your notebook.` : '');
    return true;
}

function startFromSrd(id) {
    const m = MONSTER_BY_ID[id];
    if (!m || m.hb) return;
    mmFlash(`📂 Loading the ${m.name}…`);
    loadMonsterBlocks().then(() => {
        const mon = hbFromSrd(id);
        if (!mon) { mmFlash(`⚠️ No stat block for the ${m.name}.`); return; }
        replaceDraft(mon, null, `📂 Started from the SRD ${m.name}. Change anything, then 💾 save it.`);
        draft.dirty = true;
        storeDraft();
        renderAll();
    }).catch(() => mmFlash('⚠️ The SRD stat blocks did not load. Check the connection and try again.'));
}

function loadByName() {
    const q = document.getElementById('mm-from').value.trim().toLowerCase();
    if (!q) { document.getElementById('mm-from').focus(); return; }
    const saved = hbSaved().find(e => e.title.toLowerCase() === q);
    if (saved) { openEntry(saved.id); return; }
    const m = MONSTERS.find(x => x.name.toLowerCase() === q) || MONSTERS.find(x => x.name.toLowerCase().startsWith(q))
        || MONSTERS.find(x => x.name.toLowerCase().includes(q));
    if (!m) { mmFlash('⚠️ No SRD monster or saved homebrew by that name.'); return; }
    document.getElementById('mm-from').value = '';
    startFromSrd(m.id);
}

// Save to the notebook: the entry it came from, or a new one. Returns the entry or null.
function saveToNotebook(asCopy = false) {
    const mon = draft.mon;
    if (!mon.name) {
        mmFlash('⚠️ Give it a name first.');
        document.getElementById('mm-name').focus();
        return null;
    }
    const nb = nbLoad();
    const old = !asCopy && draftEntry(nb);
    if (old) {
        old.title = nbText(mon.name, NB_LIMITS.title);
        old.sub = hbSummary(mon);
        old.mon = mon;
        if (!nbStore(nb)) { mmFlash('⚠️ This browser would not save it.'); return null; }
        draft.dirty = false;
        storeDraft();
        renderAll();
        mmFlash(`💾 Saved the changes to ${old.title}.`);
        return old;
    }
    const res = nbAdd({ kind: 'monster', title: mon.name, sub: hbSummary(mon), href: '', mon });
    if (!res) { mmFlash('⚠️ This browser would not save it.'); return null; }
    if (res.full) { mmFlash(`⚠️ The notebook is full (${NB_LIMITS.entries} entries). Remove some in the Worldbuilder first.`); return null; }
    draft.nb = res.entry.id;
    draft.dirty = false;
    storeDraft();
    renderAll();
    mmFlash(asCopy ? `📑 Saved a copy of ${res.entry.title} to the notebook.` : `💾 Saved ${res.entry.title} to the notebook. It's in the Toolbox now too.`);
    return res.entry;
}

// The Toolbox needs a saved monster: save first if there are changes.
function sendToToolbox(tab) {
    const e = !draft.dirty && draftEntry() || saveToNotebook();
    if (!e) return;
    const id = `${HB_PREFIX}${e.id}.1`;
    location.href = `toolbox?${paramsQuery(tab === 'init' ? { tab, add: id } : { tab, m: id })}`;
}

function copyBlock() {
    const row = hbRow(draft.mon, 'preview');
    navigator.clipboard.writeText(monsterBlockText(row))
        .then(() => mmFlash(`📋 Copied the ${row.name} stat block.`))
        .catch(() => mmFlash('⚠️ Copy blocked by the browser.'));
}

async function copyLink() {
    try {
        const code = await hbShareCode(draft.mon);
        await navigator.clipboard.writeText(`${location.origin}${location.pathname}?${paramsQuery({ mon: code })}`);
        mmFlash('🔗 Link copied. It carries the whole monster, so anyone can open it.');
    } catch (e) {
        mmFlash(e && e.message && !/clipboard|denied|document is not focused/i.test(e.message) ? `⚠️ ${e.message}` : '⚠️ Copy blocked by the browser.');
    }
}

function onSavedClick(e) {
    const btn = e.target.closest('button[data-act]');
    const li = e.target.closest('li[data-id]');
    if (!btn || !li) return;
    const id = li.dataset.id;
    if (btn.dataset.act === 'open') { openEntry(id); window.scrollTo({ top: document.getElementById('mm-form').getBoundingClientRect().top + scrollY - 80, behavior: 'smooth' }); return; }
    armed(btn, '⚠️ Click again', () => {
        const nb = nbLoad();
        const entry = nbFind(nb, id);
        if (!entry) return;
        nbRemove(nb, id);
        if (!nbStore(nb)) { mmFlash('⚠️ This browser would not save the change.'); return; }
        if (draft.nb === id) { draft.nb = null; draft.dirty = true; storeDraft(); renderAll(); }
        mmFlash(`🗑️ Removed ${entry.title} from the notebook. The form still has it if you want it back.`);
    });
}

// ── The URL (read once) ───────────────────────────────────
async function applyUrl() {
    const p = urlParams();
    const from = p.get('from'), nbId = p.get('nb'), code = p.get('mon');
    if (!from && !nbId && !code) return;
    setUrlParams({}, false);
    if (code) {
        try {
            replaceDraft(await hbFromShareCode(code), null, '📨 Opened a monster from a link. 💾 Save it to keep it.');
            draft.dirty = true;
            storeDraft();
            renderAll();
        } catch (e) {
            mmFlash(`⚠️ ${e.message}`);
        }
    } else if (nbId) {
        if (!(draft.nb === nbId && draft.dirty)) openEntry(nbId);
        else mmFlash('✏️ Your unsaved changes to this monster are still here.');
    } else startFromSrd(from);
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('year').textContent = new Date().getFullYear();
    document.body.insertAdjacentHTML('beforeend', `<datalist id="mm-dmg-types">${HB_DAMAGE.map(d => `<option value="${d}"></option>`).join('')}</datalist>`);
    setupForm();
    loadDraft();
    fillForm();
    renderAll();
    renderSaved();
    applyUrl();

    const form = document.getElementById('mm-form');
    form.addEventListener('input', onFormInput);
    form.addEventListener('change', e => { if (e.target.closest('select[data-preset]')) onPreset(e); else onFormChange(e); });
    document.getElementById('mm-sections').addEventListener('click', onSectionsClick);
    document.getElementById('mm-block').addEventListener('click', e => {
        const spell = e.target.closest('.sb-spell');
        if (!spell) return;
        loadMonsterBlocks().catch(() => {}).then(() => sbSpellClick(spell, document.getElementById('mm-block')));
    });
    document.getElementById('mm-load').addEventListener('click', loadByName);
    document.getElementById('mm-from').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); loadByName(); } });
    document.getElementById('mm-blank').addEventListener('click', e => {
        const go = () => replaceDraft(hbBlank(), null, '🆕 A blank monster. Name it, then fill in what you need.');
        if (draft.dirty && hasWork(draft.mon)) armed(e.currentTarget, '⚠️ Click again to start over', go);
        else go();
    });
    document.getElementById('mm-save').addEventListener('click', () => saveToNotebook());
    document.getElementById('mm-copy-new').addEventListener('click', () => saveToNotebook(true));
    document.getElementById('mm-copy').addEventListener('click', copyBlock);
    document.getElementById('mm-link').addEventListener('click', copyLink);
    document.getElementById('mm-print').addEventListener('click', () => window.print());
    document.getElementById('mm-to-init').addEventListener('click', () => sendToToolbox('init'));
    document.getElementById('mm-to-enc').addEventListener('click', () => sendToToolbox('enc'));
    document.getElementById('mm-source').addEventListener('click', e => { if (e.target.closest('#mm-back')) bringBack(); });
    document.getElementById('mm-saved').addEventListener('click', onSavedClick);
    // The notebook changed (here or in another tab): the list, and the form's saved state.
    nbOnChange(() => { renderSaved(); renderSource(); document.getElementById('mm-copy-new').hidden = !draftEntry(); });
    window.addEventListener('storage', e => {
        if (e.key !== MM_DRAFT_KEY) return;
        loadDraft();
        fillForm();
        renderAll();
    });
    window.addEventListener('pagehide', () => { if (storeTimer) storeDraft(); });
});
