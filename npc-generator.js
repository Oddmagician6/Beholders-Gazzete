/* ============================================
   COMPREHENSIVE NPC GENERATOR
   ============================================ */

// Data and the roller live in npc-data.js (shared with the Session Kit).

// ==================== NPC GENERATION ====================

let currentNPC = null;

// URL param -> picker. The pickers plus a seed (rng.js) rebuild the same NPC.
const NPC_FIELDS = { race: 'npc-race', profession: 'npc-profession', age: 'npc-age', gender: 'npc-gender' };

// Locked parts (NPC_PARTS in npc-data.js) keep their seed when the rest rerolls.
const locks = new Set();

// A kept part: its seed, plus the resolved values it was rolled with, so it replays
// the same whatever the pickers say now.
function pinOf(npc, part) {
    const extra = { identity: [npc.race, npc.gender], age: [npc.ageBucket], job: [npc.professionCategory] }[part]
        || (NPC_JOB_PARTS.includes(part) ? [(npc.partCategories && npc.partCategories[part]) || npc.professionCategory] : []);
    return { seed: npc.seeds[part], extra };
}

// seed: replay a roll. push: true = new history entry, false = replace, null = leave the URL alone.
// pinned: { part: { seed, extra } } to keep; defaults to the locked parts of the current NPC.
function generateNPC(seed = newSeed(), push = true, pinned = null) {
    if (!pinned) {
        pinned = {};
        if (currentNPC && currentNPC.seeds) locks.forEach(part => { pinned[part] = pinOf(currentNPC, part); });
    }
    const opts = Object.fromEntries(Object.entries(NPC_FIELDS).map(([k, id]) => [k, document.getElementById(id).value]));
    const rollOpts = { race: opts.race, professionType: opts.profession, age: opts.age, gender: opts.gender };
    if (pinned.identity) [rollOpts.race, rollOpts.gender] = pinned.identity.extra;
    if (pinned.age) [rollOpts.age] = pinned.age.extra;
    if (pinned.job) [rollOpts.professionType] = pinned.job.extra;
    rollOpts.partCategory = Object.fromEntries(NPC_JOB_PARTS.filter(p => pinned[p] && pinned[p].extra.length).map(p => [p, pinned[p].extra[0]]));
    const seeds = Object.fromEntries(NPC_PARTS.map(part => [part, pinned[part] ? pinned[part].seed : deriveSeed(seed, part)]));
    currentNPC = { ...rollNPC(rollOpts, seeds), seed, seeds, rolledWith: opts };
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
    if (includeStats) {
        document.getElementById('stat-str').textContent = currentNPC.stats.str;
        document.getElementById('stat-dex').textContent = currentNPC.stats.dex;
        document.getElementById('stat-con').textContent = currentNPC.stats.con;
        document.getElementById('stat-int').textContent = currentNPC.stats.int;
        document.getElementById('stat-wis').textContent = currentNPC.stats.wis;
        document.getElementById('stat-cha').textContent = currentNPC.stats.cha;
        document.getElementById('npc-hp').textContent = currentNPC.hp;
        document.getElementById('npc-ac').textContent = currentNPC.ac;
        document.getElementById('npc-speed').textContent = currentNPC.speed;
    }

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

// ?seed=…&race=elf&lock=trait.<seed>&lock=identity.<seed>.elf.female
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
    return p;
}

// lock= token -> [part, { seed, extra }], or null if it doesn't make sense.
function parseLock(token) {
    const [part, seed, ...extra] = String(token).split('.');
    if (!NPC_PARTS.includes(part) || !parseSeed(seed)) return null;
    const valid = {
        identity: () => extra.length === 2 && NPC_RACES.includes(extra[0]) && NPC_GENDERS.includes(extra[1]),
        age: () => extra.length === 1 && ['young', 'adult', 'middle', 'old', 'ancient'].includes(extra[0]),
        job: () => extra.length === 1 && Object.hasOwn(npcData.professions, extra[0])
    }[part] || (NPC_JOB_PARTS.includes(part)
        ? () => extra.length === 0 || (extra.length === 1 && Object.hasOwn(npcData.professions, extra[0]))
        : () => extra.length === 0);
    return valid() ? [part, { seed, extra }] : null;
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
    generateNPC(seed, push, pinned);
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

    const text = `
${currentNPC.name} (${currentNPC.race}, ${currentNPC.profession})
Age: ${currentNPC.age} | Gender: ${currentNPC.gender}${currentNPC.alignment ? ` | ${currentNPC.alignment}` : ''}
${currentNPC.doing ? `
WHEN YOU MEET THEM: ${currentNPC.doing}
POCKETS: ${pocketsText(currentNPC)}
` : ''}
STATS: STR ${currentNPC.stats.str} | DEX ${currentNPC.stats.dex} | CON ${currentNPC.stats.con} | INT ${currentNPC.stats.int} | WIS ${currentNPC.stats.wis} | CHA ${currentNPC.stats.cha}
HP: ${currentNPC.hp} | AC: ${currentNPC.ac} | Speed: ${currentNPC.speed}

PERSONALITY:
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

SECRET: ${currentNPC.secret}
QUEST: ${currentNPC.questHook}
RELATIONSHIP: ${currentNPC.relationship}
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

    let saved = localStorage.getItem('saved_npcs');
    saved = saved ? JSON.parse(saved) : [];

    saved.unshift(currentNPC);
    if (saved.length > 20) saved.pop();

    localStorage.setItem('saved_npcs', JSON.stringify(saved));
    renderSavedNPCs();
    alert('NPC saved to favorites!');
}

// Grimoire NPCs ticked for Print Selected, by savedKey().
const pickedSaved = new Set();

function readSaved() {
    try { return JSON.parse(localStorage.getItem('saved_npcs')) || []; } catch (e) { return []; }
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
                <p>${esc(npc.race)} ${esc(npc.profession)}</p>
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
            ${showStats && npc.stats ? `<div class="sheet-stats">
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
    let saved = localStorage.getItem('saved_npcs');
    saved = saved ? JSON.parse(saved) : [];

    if (saved[index]) {
        currentNPC = saved[index];
        locks.clear();
        displayNPC(true, true, true);
        setUrlParams(npcParams(), true);
        document.getElementById('npc-card').scrollIntoView({ behavior: 'smooth' });
    }
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
    document.getElementById('select-all-saved').addEventListener('click', selectAllSaved);
    document.getElementById('print-saved').addEventListener('click', printSelected);
    window.addEventListener('afterprint', () => document.body.classList.remove('printing-sheet'));
    applyUrl(false);
    // Back/Forward step through earlier rolls.
    window.addEventListener('popstate', () => applyUrl(null));
});
