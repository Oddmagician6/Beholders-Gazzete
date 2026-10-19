/* ============================================
   COMPREHENSIVE NPC GENERATOR
   ============================================ */

// Data and the roller live in npc-data.js (shared with the Session Kit); the stat
// block comes from npc-statblock.js.

// ==================== NPC GENERATION ====================

let currentNPC = null;

// URL param -> picker. The pickers plus a seed (rng.js) rebuild the same NPC.
const NPC_FIELDS = { race: 'npc-race', profession: 'npc-profession', age: 'npc-age', gender: 'npc-gender', cls: 'npc-class', level: 'npc-level' };

// Locked parts (NPC_PARTS in npc-data.js) keep their seed when the rest rerolls.
const locks = new Set();

// A kept part: its seed, plus the resolved values it was rolled with, so it replays
// the same whatever the pickers say now.
function pinOf(npc, part) {
    const extra = { identity: [npc.race, npc.gender], age: [npc.ageBucket], job: [npc.professionCategory],
        stats: npc.block ? [npc.block.cls, npc.block.level] : [] }[part]
        || (NPC_JOB_PARTS.includes(part) ? [(npc.partCategories && npc.partCategories[part]) || npc.professionCategory] : []);
    return { seed: npc.seeds[part], extra };
}

// seed: replay a roll. push: true = new history entry, false = replace, null = leave the URL alone.
// pinned: { part: { seed, extra } } to keep; defaults to the locked parts of the current NPC.
// given: a name and role from a link ({ name, role }, F69). Without one, a reroll keeps the given
// name while the identity is locked, and the given role while the job is.
function generateNPC(seed = newSeed(), push = true, pinned = null, given = null) {
    if (!pinned) {
        pinned = {};
        if (currentNPC && currentNPC.seeds) locks.forEach(part => { pinned[part] = pinOf(currentNPC, part); });
    }
    if (!given) {
        const was = (currentNPC && currentNPC.given) || {};
        given = { name: pinned.identity ? was.name : '', role: pinned.job ? was.role : '' };
    }
    const opts = Object.fromEntries(Object.entries(NPC_FIELDS).map(([k, id]) => [k, document.getElementById(id).value]));
    const npc = { ...rollNpcPinned({ ...opts, ...given }, seed, pinned), rolledWith: opts };
    const seeds = npc.seeds;
    // The stat block follows the stats seed, so the stats lock keeps it; a kept block
    // also keeps its class and level.
    const force = { cls: opts.cls, level: parseInt(opts.level, 10) };
    if (pinned.stats && pinned.stats.extra.length === 2) [force.cls, force.level] = [pinned.stats.extra[0], +pinned.stats.extra[1]];
    npc.block = withSeed(deriveSeed(seeds.stats, 'block'), () => rollStatBlock(npc, force));
    currentNPC = npc;
    if (push !== null) setUrlParams(npcParams(), push);

    displayNPC(
        document.getElementById('include-stats').checked,
        document.getElementById('include-secrets').checked,
        document.getElementById('include-quest').checked
    );

    // Animate
    animateCard();
}

function displayNPC(includeStats, includeSecrets, includeQuest) {
    if (!currentNPC) return;
    renderLocks();

    // Show card
    document.getElementById('npc-card').style.display = 'block';

    // Header
    document.getElementById('portrait-icon').textContent = currentNPC.portraitIcon;
    const portrait = npcPortraitSrc(currentNPC.race, currentNPC.gender);
    const portraitImg = document.getElementById('portrait-img');
    portraitImg.hidden = !portrait;
    if (portrait) { portraitImg.src = portrait; portraitImg.alt = `Portrait of ${currentNPC.name}`; }
    document.getElementById('portrait-icon').hidden = !!portrait;
    document.getElementById('npc-portrait').classList.toggle('has-img', !!portrait);
    document.getElementById('npc-name').textContent = currentNPC.name;
    document.getElementById('npc-race-display').textContent = currentNPC.race.charAt(0).toUpperCase() + currentNPC.race.slice(1);
    document.getElementById('npc-age-display').textContent = currentNPC.age;
    document.getElementById('npc-gender-display').textContent = currentNPC.gender.charAt(0).toUpperCase() + currentNPC.gender.slice(1);
    document.getElementById('npc-profession-display').textContent = currentNPC.profession;
    // Alignment, first impression, and pockets came later; older saves don't have them.
    document.getElementById('npc-alignment-display').parentElement.hidden = !currentNPC.alignment;
    document.getElementById('npc-alignment-display').textContent = currentNPC.alignment || '';
    document.getElementById('impression-section').hidden = !currentNPC.doing;
    document.getElementById('npc-doing').textContent = currentNPC.doing || '';
    document.getElementById('npc-pockets').textContent = pocketsText(currentNPC);

    // Stats
    document.getElementById('stats-section').style.display = includeStats ? 'block' : 'none';
    if (includeStats) renderStatBlock(currentNPC);

    // Personality
    document.getElementById('npc-trait').textContent = currentNPC.trait;
    document.getElementById('npc-ideal').textContent = currentNPC.ideal;
    document.getElementById('npc-bond').textContent = currentNPC.bond;
    document.getElementById('npc-flaw').textContent = currentNPC.flaw;
    document.getElementById('npc-quirks-list').innerHTML = currentNPC.quirks.map(q => `<li>${q}</li>`).join('');

    // Appearance
    document.getElementById('npc-build').textContent = currentNPC.build;
    document.getElementById('npc-hair').textContent = currentNPC.beard ? `${currentNPC.hair}, with ${currentNPC.beard}` : currentNPC.hair;
    document.getElementById('npc-hair-label').textContent = currentNPC.hairLabel || 'Hair';
    document.getElementById('npc-eyes').textContent = currentNPC.eyes;
    document.getElementById('npc-feature').textContent = currentNPC.feature;
    document.getElementById('npc-clothing').textContent = currentNPC.clothing;

    // Dialogue
    document.getElementById('npc-dialogue').textContent = `"${currentNPC.dialogue}"`;
    document.getElementById('npc-voice').textContent = currentNPC.voice;

    // Secrets & Quests
    document.getElementById('secrets-section').style.display = includeSecrets ? 'block' : 'none';
    if (includeSecrets) {
        document.getElementById('npc-secret-text').textContent = currentNPC.secret;
        document.getElementById('npc-quest-section').style.display = includeQuest ? 'block' : 'none';
        if (includeQuest) {
            document.getElementById('npc-quest-text').textContent = currentNPC.questHook;
        }
    }

    // Relationships
    document.getElementById('npc-relationship-text').textContent = currentNPC.relationship;
}

// ==================== STAT BLOCK ====================

// Saves from before stat blocks keep the old quick stats (abilities, HP, AC, speed).
function renderStatBlock(npc) {
    const b = npc.block;
    const stats = b ? b.stats : npc.stats;
    ['str', 'dex', 'con', 'int', 'wis', 'cha'].forEach(k => {
        document.getElementById(`stat-${k}`).textContent = stats[k];
        document.getElementById(`mod-${k}`).textContent = b ? `(${sbSigned(npcMod(stats[k]))})` : '';
    });
    document.getElementById('sb-head').hidden = !b;
    document.getElementById('npc-combat-legacy').hidden = !!b;
    const core = document.getElementById('sb-core');
    const body = document.getElementById('sb-body');
    if (!b) {
        document.getElementById('npc-hp').textContent = npc.hp;
        document.getElementById('npc-ac').textContent = npc.ac;
        document.getElementById('npc-speed').textContent = npc.speed;
        core.innerHTML = body.innerHTML = '';
        return;
    }
    document.getElementById('sb-title').textContent = b.title;
    document.getElementById('sb-type').textContent = b.typeLine;
    core.innerHTML = `
        <span><strong>Armor Class</strong> ${b.ac}${b.acText ? ` (${esc(b.acText)})` : ''}</span>
        <span><strong>Hit Points</strong> ${b.hp} (${esc(b.hitDice)})</span>
        <span><strong>Speed</strong> ${esc(b.speed)}</span>`;

    const prop = (label, list) => list.length ? `<p><strong>${label}</strong> ${esc(list.join(', '))}</p>` : '';
    const feats = list => list.map(f => `<p class="sb-feat"><strong>${esc(f.name)}.</strong> ${esc(f.text)}</p>`).join('');
    const section = (title, list) => list.length ? `<div class="sb-section"><h4>${title}</h4>${feats(list)}</div>` : '';
    body.innerHTML = `
        <div class="sb-props">
            ${prop('Saving Throws', b.saves)}${prop('Skills', b.skills)}${prop('Damage Resistances', b.resist)}
            ${prop('Senses', b.senses)}${prop('Languages', b.langs)}
            <p><strong>Challenge</strong> <span class="sb-cr" title="A rough guide for a classed NPC, not an official rating">≈ ${esc(b.cr)} (${b.xp.toLocaleString()} XP)</span>
                &nbsp; <strong>Proficiency Bonus</strong> +${b.prof}</p>
        </div>
        ${section('Traits', b.traits)}
        ${spellcastingHtml(npc)}
        ${section('Actions', b.actions)}
        ${section('Bonus Actions', b.bonusActions)}
        ${section('Reactions', b.reactions)}
        <div class="sb-section"><h4>Equipment</h4>
            <p class="sb-feat">${esc(b.gear.join(', ').replace(/^./, c => c.toUpperCase()))}.${b.magicItem ? ` <strong>Magic item:</strong> ${esc(b.magicItem)}.` : ''}</p>
        </div>`;
}

function spellcastingHtml(npc) {
    const s = npc.block.spellcasting;
    if (!s) return '';
    const [he, his] = sbPronouns(npc.gender);
    const cap = w => w.charAt(0).toUpperCase() + w.slice(1);
    const all = s.lines.flatMap(l => l.spells);
    const lines = s.lines.map(l => `<li><span class="sb-lvl">${esc(l.label)}:</span> ${l.spells.map(n =>
        `<button type="button" class="sb-spell" data-spell="${esc(n)}" aria-expanded="false">${esc(n)}</button>${(l.marked || []).includes(n) ? '<span class="sb-mark">*</span>' : ''}`).join(', ')}</li>`).join('');
    const marked = s.lines.some(l => (l.marked || []).length);
    const listName = `${npc.firstName || npc.name}'s spells`.slice(0, 40);
    const book = `spellbook?${paramsQuery({ spells: all.map(spellSlug).join('.'), list: listName })}`;
    const verb = he === 'they' ? 'have' : 'has';
    return `<div class="sb-section"><h4>Spellcasting</h4>
        <p class="sb-feat"><strong>Spellcasting.</strong> ${esc(npc.firstName || npc.name)} is a ${sbOrdinal(npc.block.level)}-level spellcaster.
            ${cap(his)} spellcasting ability is ${s.ability} (spell save DC ${s.dc}, ${sbSigned(s.attack)} to hit with spell attacks).
            ${cap(he)} ${verb} the following ${npc.block.cls.toLowerCase()} spells ${s.prepared ? 'prepared' : 'known'}${s.note ? ` and ${s.note.replace('its', his)}` : ''}:</p>
        <ul class="sb-spells">${lines}</ul>
        ${marked ? `<p class="sb-note">* ${esc(s.markWhy)}</p>` : ''}
        <div class="sb-spell-detail" id="sb-spell-detail" hidden></div>
        <a class="sb-book" href="${esc(book)}">📖 Open these spells in the Spellbook</a>
    </div>`;
}

function showSpell(btn) {
    toggleSpellDetail(btn, document.getElementById('sb-spell-detail'));
}

// "a tin whistle, a dried frog; purse: 3 gp, 4 sp"
function pocketsText(npc) {
    const items = (npc.pockets || []).join(', ');
    const out = [items && items.charAt(0).toUpperCase() + items.slice(1), npc.purse && `Purse: ${npc.purse}`].filter(Boolean);
    return out.join('. ');
}

// Hair for running text; saves from before hairLook build it the old way.
function hairText(npc) {
    if (npc.hairLook) return npc.hairLook;
    return npc.hairLabel === 'Scales' || npc.hair === 'Bald' ? npc.hair : `${npc.hair} hair`;
}

function animateCard() {
    const card = document.getElementById('npc-card');
    card.style.opacity = '0';
    card.style.transform = 'scale(0.95)';

    setTimeout(() => {
        card.style.transition = 'all 0.3s ease';
        card.style.opacity = '1';
        card.style.transform = 'scale(1)';
    }, 50);
}

function regenerateNPC() {
    generateNPC();
}

// ==================== SHAREABLE LINK ====================

// ?seed=…&race=elf&lock=trait.<seed>&lock=identity.<seed>.elf.female (&name=…&role=… for a given name and role)
// A part whose seed isn't the one the base seed gives (it was kept through a reroll)
// rides along as a lock= token.
function npcParams() {
    if (!currentNPC || !currentNPC.seed || !currentNPC.seeds || !currentNPC.rolledWith) return {};
    const p = { seed: currentNPC.seed };
    Object.entries(NPC_FIELDS).forEach(([k, id]) => {
        if (currentNPC.rolledWith[k] !== defaultValue(document.getElementById(id))) p[k] = currentNPC.rolledWith[k];
    });
    p.lock = NPC_PARTS.filter(part => currentNPC.seeds[part] !== deriveSeed(currentNPC.seed, part))
        .map(part => { const pin = pinOf(currentNPC, part); return [part, pin.seed, ...pin.extra].join('.'); });
    if (currentNPC.given) Object.assign(p, currentNPC.given);
    return p;
}

// lock= token -> [part, { seed, extra }], or null if it doesn't make sense (parseNpcLock, npc-data.js).
function parseLock(token) {
    return parseNpcLock(token, ([cls, level]) => Object.hasOwn(SB_CLASSES, cls) && /^\d+$/.test(level) && +level >= 1 && +level <= 20);
}

// Roll the NPC named in the address bar. Returns false when there's no seed in it.
// Parts kept in the link come back locked.
function applyUrl(push) {
    const p = urlParams();
    const seed = parseSeed(p.get('seed'));
    if (!seed) return false;
    Object.entries(NPC_FIELDS).forEach(([k, id]) => {
        const el = document.getElementById(id);
        if (!setFieldValue(el, p.get(k))) el.value = defaultValue(el);
    });
    const pinned = Object.fromEntries(p.getAll('lock').map(parseLock).filter(Boolean));
    locks.clear();
    Object.keys(pinned).forEach(part => locks.add(part));
    generateNPC(seed, push, pinned, { name: p.get('name'), role: p.get('role') });
    return true;
}

// ==================== LOCKS ====================

function renderLocks() {
    document.querySelectorAll('.lock-btn').forEach(btn => {
        const on = locks.has(btn.dataset.lock);
        btn.setAttribute('aria-pressed', on);
        btn.textContent = on ? '🔒' : '🔓';
        btn.title = btn.title.replace(/^(Lock|Unlock)/, on ? 'Unlock' : 'Lock');
    });
    document.getElementById('unlock-all').hidden = !locks.size;
}

function toggleLock(part) {
    if (!currentNPC || !currentNPC.seeds) return;
    locks.has(part) ? locks.delete(part) : locks.add(part);
    renderLocks();
}

function copyLink() {
    const btn = document.getElementById('copy-link-btn');
    const say = text => { btn.textContent = text; setTimeout(() => { btn.textContent = '🔗 Copy Link'; }, 2500); };
    if (!currentNPC || !currentNPC.seed) { say('⚠️ Saved before links; reroll to share'); return; }
    copyPageLink(ok => say(ok ? '✅ Link copied!' : '⚠️ Copy blocked'));
}

// ==================== CLIPBOARD & SAVE ====================

function copyNPC() {
    if (!currentNPC) return;
    // Same "include" boxes as the card and Print Selected.
    const showStats = document.getElementById('include-stats').checked;
    const showSecrets = document.getElementById('include-secrets').checked;
    const showQuest = showSecrets && document.getElementById('include-quest').checked;

    const text = `
${currentNPC.name} (${currentNPC.race}, ${currentNPC.profession})
Age: ${currentNPC.age} | Gender: ${currentNPC.gender}${currentNPC.alignment ? ` | ${currentNPC.alignment}` : ''}
${currentNPC.doing ? `
WHEN YOU MEET THEM: ${currentNPC.doing}
POCKETS: ${pocketsText(currentNPC)}
` : ''}
${showStats ? (currentNPC.block ? `STAT BLOCK
${statBlockText(currentNPC.block)}

` : `STATS: STR ${currentNPC.stats.str} | DEX ${currentNPC.stats.dex} | CON ${currentNPC.stats.con} | INT ${currentNPC.stats.int} | WIS ${currentNPC.stats.wis} | CHA ${currentNPC.stats.cha}
HP: ${currentNPC.hp} | AC: ${currentNPC.ac} | Speed: ${currentNPC.speed}

`) : ''}PERSONALITY:
Trait: ${currentNPC.trait}
Ideal: ${currentNPC.ideal}
Bond: ${currentNPC.bond}
Flaw: ${currentNPC.flaw}
Quirks: ${currentNPC.quirks.join(', ')}

APPEARANCE: ${currentNPC.build}, ${hairText(currentNPC)}, ${currentNPC.eyes} eyes
Feature: ${currentNPC.feature}
Clothing: ${currentNPC.clothing}

VOICE: ${currentNPC.voice}
DIALOGUE: "${currentNPC.dialogue}"

${showSecrets ? `SECRET: ${currentNPC.secret}\n` : ''}${showQuest ? `QUEST: ${currentNPC.questHook}\n` : ''}RELATIONSHIP: ${currentNPC.relationship}
`.trim();

    navigator.clipboard.writeText(text).then(() => {
        alert('NPC copied to clipboard!');
    }).catch(err => {
        console.error('Failed to copy:', err);
        alert('Failed to copy. Check console.');
    });
}

function saveNPC() {
    if (!currentNPC) return;

    const saved = readSaved();

    saved.unshift(currentNPC);
    if (saved.length > 20) saved.pop();

    localStorage.setItem('saved_npcs', JSON.stringify(saved));
    renderSavedNPCs();
    alert('NPC saved to favorites!');
}

// The Worldbuilder's campaign notebook (notebook.js) keeps the NPC's link, not the NPC.
function saveToNotebook() {
    const btn = document.getElementById('notebook-btn');
    const say = text => { btn.textContent = text; setTimeout(() => { btn.textContent = '📓 Save to Notebook'; }, 2500); };
    if (!currentNPC || !currentNPC.seed) { say('⚠️ Reroll to save this one'); return; }
    const cap = s => String(s || '').charAt(0).toUpperCase() + String(s || '').slice(1);
    const r = nbAdd({
        kind: 'npc',
        title: currentNPC.name,
        sub: [cap(currentNPC.race), currentNPC.profession].filter(Boolean).join(' ') + (currentNPC.block ? `, ${currentNPC.block.title.replace(/ \(.*\)$/, '')}` : '') + (currentNPC.trait ? `. ${currentNPC.trait}` : ''),
        href: 'npc-generator?' + paramsQuery(npcParams())
    });
    say(!r ? '⚠️ Storage is off' : r.full ? '⚠️ Notebook is full' : r.existed ? '📓 Already saved' : '✅ Saved to the notebook');
}

// The Handout Maker (F48) rebuilds this NPC from its link: a wanted poster first, a letter one click away.
function makeHandout() {
    if (!currentNPC || !currentNPC.seed) {
        const btn = document.getElementById('handout-btn');
        btn.textContent = '⚠️ Reroll to make one';
        setTimeout(() => { btn.textContent = '📜 Make a Handout'; }, 2500);
        return;
    }
    location.href = 'handouts?' + paramsQuery({ t: 'wanted', from: 'npc', ...npcParams() });
}

// Grimoire NPCs ticked for Print Selected, by savedKey().
const pickedSaved = new Set();

function readSaved() {
    // Drop anything that isn't a saved NPC object, so a damaged save can't break the page.
    try {
        const saved = JSON.parse(localStorage.getItem('saved_npcs'));
        return Array.isArray(saved) ? saved.filter(n => n && typeof n === 'object' && !Array.isArray(n)) : [];
    } catch (e) { return []; }
}

function savedKey(npc, index) {
    return npc.generatedAt ? `${npc.generatedAt}|${npc.name}` : `#${index}`;
}

function esc(t) {
    return String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function renderSavedNPCs() {
    const container = document.getElementById('saved-list');
    const saved = readSaved();
    const keys = saved.map(savedKey);
    [...pickedSaved].forEach(k => { if (!keys.includes(k)) pickedSaved.delete(k); });
    document.getElementById('saved-tools').hidden = !saved.length;

    if (saved.length === 0) {
        container.innerHTML = '<p style="color: #888; font-style: italic;">No NPCs saved yet...</p>';
        updateSavedTools(0);
        return;
    }

    container.innerHTML = saved.map((npc, index) => {
        const picked = pickedSaved.has(keys[index]);
        return `
        <div class="saved-item${picked ? ' picked' : ''}" onclick="loadSavedNPC(${index})">
            <input type="checkbox" class="saved-pick" data-key="${esc(keys[index])}" ${picked ? 'checked' : ''}
                aria-label="Pick ${esc(npc.name)} for printing" onclick="event.stopPropagation()" onchange="togglePicked(this)">
            <div class="saved-text">
                <h4>${esc(npc.name)}</h4>
                <p>${esc(npc.race)} ${esc(npc.profession)}${npc.block ? ` · ${esc(npc.block.title.replace(/ \(.*\)$/, ''))}` : ''}</p>
                <div class="saved-meta">${new Date(npc.generatedAt).toLocaleDateString()}</div>
            </div>
        </div>`;
    }).join('');
    updateSavedTools(saved.length);
}

function updateSavedTools(total) {
    const n = pickedSaved.size;
    const printBtn = document.getElementById('print-saved');
    printBtn.disabled = !n;
    printBtn.textContent = n ? `🖨️ Print Selected (${n})` : '🖨️ Print Selected';
    document.getElementById('select-all-saved').textContent = total && n === total ? '☐ Select None' : '☑ Select All';
}

function togglePicked(box) {
    box.checked ? pickedSaved.add(box.dataset.key) : pickedSaved.delete(box.dataset.key);
    box.closest('.saved-item').classList.toggle('picked', box.checked);
    updateSavedTools(readSaved().length);
}

function selectAllSaved() {
    const saved = readSaved();
    if (pickedSaved.size === saved.length) pickedSaved.clear();
    else saved.forEach((npc, i) => pickedSaved.add(savedKey(npc, i)));
    renderSavedNPCs();
}

// One compact block per NPC; follows the Stats / Secrets / Quest Hook toggles.
function sheetBlock(npc) {
    const showStats = document.getElementById('include-stats').checked;
    const showSecrets = document.getElementById('include-secrets').checked;
    const showQuest = showSecrets && document.getElementById('include-quest').checked;
    const cap = s => String(s ?? '').charAt(0).toUpperCase() + String(s ?? '').slice(1);
    const line = (label, value) => value ? `<p><strong>${label}:</strong> ${esc(value)}</p>` : '';
    const s = npc.stats || {};
    return `
        <div class="sheet-npc">
            <h4>${esc(npc.name)}</h4>
            <div class="sheet-sub">${esc([cap(npc.race), cap(npc.gender), npc.age, npc.profession, npc.alignment].filter(Boolean).join(' · '))}</div>
            ${showStats && npc.block ? sheetStatBlock(npc.block) : showStats && npc.stats ? `<div class="sheet-stats">
                ${['str', 'dex', 'con', 'int', 'wis', 'cha'].map(k => `<span><strong>${k.toUpperCase()}</strong> ${esc(s[k])}</span>`).join('')}
                <span><strong>HP</strong> ${esc(npc.hp)}</span><span><strong>AC</strong> ${esc(npc.ac)}</span><span><strong>Speed</strong> ${esc(npc.speed)}</span>
            </div>` : ''}
            ${line('Meet them', npc.doing)}
            ${line('Trait', npc.trait)}${line('Ideal', npc.ideal)}${line('Bond', npc.bond)}${line('Flaw', npc.flaw)}
            ${line('Quirks', (npc.quirks || []).join('; '))}
            ${line('Look', [npc.build, npc.hair && hairText(npc), npc.eyes && `${npc.eyes} eyes`, npc.feature].filter(Boolean).join(', '))}
            ${line('Clothing', npc.clothing)}
            ${line('Pockets', npc.doing ? pocketsText(npc) : '')}
            ${line('Voice', npc.voice)}
            ${npc.dialogue ? `<p><strong>Says:</strong> “${esc(npc.dialogue)}”</p>` : ''}
            ${showSecrets ? line('Secret', npc.secret) : ''}
            ${showQuest ? line('Quest hook', npc.questHook) : ''}
            ${line('Relationship', npc.relationship)}
        </div>`;
}

// The cast sheet's short stat block: numbers, attacks, and spells; traits by name only.
function sheetStatBlock(b) {
    const line = (label, value) => value ? `<p><strong>${label}:</strong> ${esc(value)}</p>` : '';
    return `<div class="sheet-sb">
            <p><strong>${esc(b.title)}</strong></p>
            <div class="sheet-stats">
                ${['str', 'dex', 'con', 'int', 'wis', 'cha'].map(k => `<span><strong>${k.toUpperCase()}</strong> ${esc(b.stats[k])}</span>`).join('')}
                <span><strong>AC</strong> ${esc(b.ac)}</span><span><strong>HP</strong> ${esc(b.hp)}</span><span><strong>Speed</strong> ${esc(b.speed)}</span>
            </div>
            ${line('Saves', b.saves.join(', '))}${line('Skills', b.skills.join(', '))}
            ${line('Traits', [...b.traits, ...b.bonusActions, ...b.reactions].map(f => f.name).join(', '))}
            ${b.actions.map(a => `<p><strong>${esc(a.name)}.</strong> ${esc(a.text)}</p>`).join('')}
            ${b.spellcasting ? `<p><strong>Spells</strong> (DC ${b.spellcasting.dc}, ${esc(sbSigned(b.spellcasting.attack))}): ${esc(b.spellcasting.lines.map(l => `${l.label.replace(/ \(.*\)$/, '')}: ${l.spells.join(', ')}`).join('; '))}</p>` : ''}
        </div>`;
}

function printSelected() {
    const saved = readSaved();
    const picked = saved.filter((npc, i) => pickedSaved.has(savedKey(npc, i)));
    if (!picked.length) return;
    document.getElementById('print-sheet').innerHTML =
        `<h2 class="sheet-title">🎭 Cast of Characters</h2><div class="sheet-grid">${picked.map(sheetBlock).join('')}</div>` +
        `<p class="sheet-foot">The Beholder's Gazette · Town Square NPC Generator</p>`;
    document.body.classList.add('printing-sheet');
    window.print();
}

// ==================== JUST A NAME ====================

let rolledNames = [];

function rollNameList() {
    rolledNames = rollNames(10, {
        race: document.getElementById('npc-race').value,
        gender: document.getElementById('npc-gender').value
    });
    document.getElementById('name-list').innerHTML = rolledNames.map((n, i) => `
        <li><button type="button" class="name-chip" data-i="${i}" title="Copy ${esc(n.name)}">
            <strong>${esc(n.name)}</strong><span>${esc(n.race)} · ${n.gender === 'nonbinary' ? 'non-binary' : esc(n.gender)}</span>
        </button></li>`).join('');
    document.getElementById('copy-names').disabled = !rolledNames.length;
    document.getElementById('name-status').textContent = '';
}

function copyText(text, done) {
    navigator.clipboard.writeText(text)
        .then(() => done(true))
        .catch(() => done(false));
}

function nameStatus(msg) {
    document.getElementById('name-status').textContent = msg;
}

function loadSavedNPC(index) {
    const saved = readSaved();

    if (saved[index]) {
        currentNPC = saved[index];
        locks.clear();
        displayNPC(true, true, true);
        // An NPC saved before links has no seed; its history entry carries it instead.
        setUrlParams(npcParams(), true, currentNPC.seed ? null : { npc: currentNPC });
        document.getElementById('npc-card').scrollIntoView({ behavior: 'smooth' });
    }
}

// Back/Forward onto an entry with no seed: a saved NPC from before links, or the empty page.
function showUnlinkedNPC() {
    const npc = history.state && history.state.npc;
    locks.clear();
    if (npc && typeof npc === 'object') {
        currentNPC = npc;
        displayNPC(true, true, true);
        return;
    }
    currentNPC = null;
    renderLocks();
    document.getElementById('npc-card').style.display = 'none';
}

function clearSaved() {
    if (confirm('Clear all saved NPCs?')) {
        localStorage.removeItem('saved_npcs');
        renderSavedNPCs();
    }
}

// ==================== INITIALIZE ====================

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('year').textContent = new Date().getFullYear();
    renderSavedNPCs();
    document.querySelectorAll('.lock-btn').forEach(btn => btn.addEventListener('click', () => toggleLock(btn.dataset.lock)));
    document.getElementById('unlock-all').addEventListener('click', () => { locks.clear(); renderLocks(); });
    document.getElementById('roll-names').addEventListener('click', rollNameList);
    document.getElementById('copy-names').addEventListener('click', () => {
        if (!rolledNames.length) return;
        copyText(rolledNames.map(n => n.name).join('\n'),
            ok => nameStatus(ok ? `📋 ${rolledNames.length} names copied, one per line.` : 'Copy failed. Your browser blocked clipboard access.'));
    });
    document.getElementById('name-list').addEventListener('click', e => {
        const chip = e.target.closest('.name-chip');
        if (!chip) return;
        const n = rolledNames[+chip.dataset.i];
        copyText(n.name, ok => nameStatus(ok ? `📋 Copied “${n.name}”.` : 'Copy failed. Your browser blocked clipboard access.'));
    });
    document.getElementById('sb-body').addEventListener('click', e => {
        const btn = e.target.closest('.sb-spell');
        if (btn) showSpell(btn);
    });
    document.getElementById('select-all-saved').addEventListener('click', selectAllSaved);
    document.getElementById('print-saved').addEventListener('click', printSelected);
    window.addEventListener('afterprint', () => document.body.classList.remove('printing-sheet'));
    applyUrl(false);
    // Back/Forward step through earlier rolls.
    window.addEventListener('popstate', () => { if (!applyUrl(null)) showUnlinkedNPC(); });
});
