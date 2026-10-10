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
    const extra = { identity: [npc.race, npc.gender], age: [npc.ageBucket], job: [npc.professionCategory] }[part] || [];
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
    document.getElementById('npc-hair').textContent = currentNPC.hair;
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
    }[part] || (() => extra.length === 0);
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
Age: ${currentNPC.age} | Gender: ${currentNPC.gender}

STATS: STR ${currentNPC.stats.str} | DEX ${currentNPC.stats.dex} | CON ${currentNPC.stats.con} | INT ${currentNPC.stats.int} | WIS ${currentNPC.stats.wis} | CHA ${currentNPC.stats.cha}
HP: ${currentNPC.hp} | AC: ${currentNPC.ac} | Speed: ${currentNPC.speed}

PERSONALITY:
Trait: ${currentNPC.trait}
Ideal: ${currentNPC.ideal}
Bond: ${currentNPC.bond}
Flaw: ${currentNPC.flaw}
Quirks: ${currentNPC.quirks.join(', ')}

APPEARANCE: ${currentNPC.build}, ${currentNPC.hairLabel === 'Scales' || currentNPC.hair === 'Bald' ? currentNPC.hair : currentNPC.hair + ' hair'}, ${currentNPC.eyes} eyes
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

function renderSavedNPCs() {
    const container = document.getElementById('saved-list');
    let saved = localStorage.getItem('saved_npcs');
    saved = saved ? JSON.parse(saved) : [];

    if (saved.length === 0) {
        container.innerHTML = '<p style="color: #888; font-style: italic;">No NPCs saved yet...</p>';
        return;
    }

    container.innerHTML = saved.map((npc, index) => `
        <div class="saved-item" onclick="loadSavedNPC(${index})">
            <h4>${npc.name}</h4>
            <p>${npc.race} ${npc.profession}</p>
            <div class="saved-meta">${new Date(npc.generatedAt).toLocaleDateString()}</div>
        </div>
    `).join('');
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
    applyUrl(false);
    // Back/Forward step through earlier rolls.
    window.addEventListener('popstate', () => applyUrl(null));
});
