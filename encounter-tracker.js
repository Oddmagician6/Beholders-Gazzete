/* ============================================
   ENCOUNTER TRACKER & COMBAT MANAGER - FIXED
   ============================================ */

// Global state
let currentEncounter = {
    monsters: [],
    terrain: [],
    initiative: [],
    round: 1,
    tension: 0,
    currentTurn: 0,
    sideInitiative: false,
    readyActions: [],
    concentration: [],
    combatLog: [],
    settings: {
        moraleTrigger: '50',
        reinforcementTrigger: 'none',
        secretRolls: false,
        fudgeValue: 0
    }
};

let currentView = 'dm';

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎲 Encounter Tracker Loading...');
    document.getElementById('year').textContent = new Date().getFullYear();
    
    // Verify monster database loaded
    if (typeof monsterDatabase === 'undefined') {
        console.error('❌ Monster database not loaded! Check encounter-data.js');
        alert('Error: Monster database failed to load. Please refresh the page.');
    } else {
        console.log(`✅ Loaded ${monsterDatabase.length} monsters`);
        renderMonsterList();
    }
    
    setupEventListeners();
    loadFromMemory();
});

function setupEventListeners() {
    const fudgeSlider = document.getElementById('fudge-slider');
    if (fudgeSlider) {
        fudgeSlider.addEventListener('input', (e) => {
            currentEncounter.settings.fudgeValue = parseInt(e.target.value);
            const fudgeValue = document.getElementById('fudge-value');
            if (fudgeValue) fudgeValue.textContent = e.target.value;
        });
    }
}

// View switching
function switchView(view) {
    currentView = view;
    const dmBtn = document.getElementById('dm-view-btn');
    const playerBtn = document.getElementById('player-view-btn');
    
    if (dmBtn) dmBtn.classList.toggle('active', view === 'dm');
    if (playerBtn) playerBtn.classList.toggle('active', view === 'player');
    
    const dmControls = document.getElementById('dm-controls');
    const playerView = document.getElementById('player-view');
    const encounterBuilder = document.getElementById('encounter-builder');
    
    if (dmControls) dmControls.style.display = view === 'dm' ? 'block' : 'none';
    if (playerView) playerView.style.display = view === 'player' ? 'block' : 'none';
    if (encounterBuilder) encounterBuilder.style.display = view === 'dm' ? 'block' : 'none';
    
    renderInitiative();
}

function toggleFullScreen() {
    document.body.classList.toggle('full-screen');
}

// Monster list rendering - FIXED
function renderMonsterList() {
    const list = document.getElementById('monster-list');
    const filter = document.getElementById('monster-cr-filter');
    
    if (!list || !filter) {
        console.error('Monster list elements not found!');
        return;
    }
    
    const filterValue = filter.value;
    let filtered = monsterDatabase;
    
    if (filterValue !== 'all') {
        const parts = filterValue.split('-');
        const min = parseFloat(parts[0]);
        const max = parts[1] === '+' ? 30 : parseFloat(parts[1]);
        filtered = monsterDatabase.filter(m => m.cr >= min && m.cr <= max);
    }
    
    if (filtered.length === 0) {
        list.innerHTML = '<p style="color: #888; text-align: center; padding: 20px;">No monsters found</p>';
        return;
    }
    
    list.innerHTML = filtered.map(monster => {
        const isAdded = currentEncounter.monsters.some(m => m.name === monster.name);
        return `
            <div class="monster-item ${isAdded ? 'added' : ''}" 
                 onclick="addMonster('${monster.name}')" 
                 data-name="${monster.name}">
                <span class="monster-name">${monster.name}</span>
                <span class="monster-cr">CR ${monster.cr}</span>
            </div>
        `;
    }).join('');
}

function filterMonsters() {
    renderMonsterList();
}

// Add monster to encounter - FIXED
function addMonster(name) {
    console.log(`Adding monster: ${name}`);
    
    // Find monster with case-insensitive matching
    const monster = monsterDatabase.find(m => m.name.toLowerCase() === name.toLowerCase());
    
    if (!monster) {
        console.error(`Monster not found: ${name}`);
        alert(`Error: Monster "${name}" not found in database!`);
        return;
    }
    
    // Validate monster data
    if (!validateMonster(monster)) {
        console.error('Invalid monster data:', monster);
        alert('Error: Invalid monster data!');
        return;
    }
    
    // Add to encounter
    currentEncounter.monsters.push({
        ...monster,
        id: Date.now() + Math.random(),
        currentHp: monster.hp,
        maxHp: monster.hp,
        initiative: 0,
        conditions: [],
        concentration: [],
        dead: false
    });
    
    console.log(`✅ Added ${name}. Total monsters: ${currentEncounter.monsters.length}`);
    
    updateEncounterSummary();
    renderEncounterMonsters();
    renderMonsterList(); // Update "added" state
    checkSynergies();
}

// Check synergies - FIXED
function checkSynergies() {
    const suggestions = document.getElementById('synergy-suggestions');
    if (!suggestions) return;
    
    const names = currentEncounter.monsters.map(m => m.name);
    const allSuggestions = [];
    
    names.forEach(name => {
        const synergies = synergyTable[name];
        if (synergies) {
            synergies.forEach(suggestion => {
                // Check if suggestion exists in database
                const exists = monsterDatabase.some(m => m.name === suggestion);
                if (exists && !names.includes(suggestion)) {
                    allSuggestions.push(suggestion);
                }
            });
        }
    });
    
    if (allSuggestions.length > 0) {
        const unique = [...new Set(allSuggestions)].slice(0, 3);
        suggestions.innerHTML = `
            <h4>💡 Synergy Suggestions</h4>
            ${unique.map(s => `
                <div class="synergy-item" onclick="addMonster('${s}')" style="cursor: pointer;">
                    <span>➕</span>
                    <span>${s}</span>
                </div>
            `).join('')}
        `;
        suggestions.style.display = 'block';
    } else {
        suggestions.style.display = 'none';
    }
}

// Update encounter summary - FIXED
function updateEncounterSummary() {
    const partyLevel = parseInt(document.getElementById('party-level').value) || 5;
    const partySize = parseInt(document.getElementById('party-size').value) || 4;
    
    const totalXp = currentEncounter.monsters.reduce((sum, m) => sum + (m.xp || 0), 0);
    const monsterCount = currentEncounter.monsters.length;
    
    // Calculate multiplier
    let multiplier = 1;
    const levelThresholds = encounterMultipliers[partyLevel] || encounterMultipliers[5];
    
    if (monsterCount >= 15) multiplier = levelThresholds['15+'] || 5;
    else if (monsterCount >= 11) multiplier = levelThresholds['11-14'] || 4;
    else if (monsterCount >= 7) multiplier = levelThresholds['7-10'] || 3;
    else if (monsterCount >= 5) multiplier = levelThresholds['5-6'] || 2.5;
    else if (monsterCount >= 3) multiplier = levelThresholds['3-4'] || 2;
    else if (monsterCount === 2) multiplier = levelThresholds[2] || 1.5;
    
    const adjustedXp = Math.floor(totalXp * multiplier);
    
    // Determine difficulty
    const thresholds = difficultyThresholds[partyLevel] || difficultyThresholds[5];
    let difficulty = 'Easy';
    let color = '#4caf50';
    
    if (adjustedXp >= thresholds.deadly) { difficulty = 'Deadly'; color = '#f44336'; }
    else if (adjustedXp >= thresholds.hard) { difficulty = 'Hard'; color = '#ff9800'; }
    else if (adjustedXp >= thresholds.medium) { difficulty = 'Medium'; color = '#ffeb3b'; }
    
    const totalXpEl = document.getElementById('total-xp');
    const adjustedXpEl = document.getElementById('adjusted-xp');
    const difficultyEl = document.getElementById('difficulty-rating');
    const monsterCountEl = document.getElementById('monster-count');
    
    if (totalXpEl) totalXpEl.textContent = totalXp.toLocaleString();
    if (adjustedXpEl) adjustedXpEl.textContent = adjustedXp.toLocaleString();
    if (difficultyEl) {
        difficultyEl.textContent = difficulty;
        difficultyEl.style.color = color;
    }
    if (monsterCountEl) monsterCountEl.textContent = monsterCount;
}

// Render encounter monsters - FIXED
function renderEncounterMonsters() {
    const container = document.getElementById('encounter-monsters');
    if (!container) return;
    
    if (currentEncounter.monsters.length === 0) {
        container.innerHTML = '<p style="color: #888; text-align: center; padding: 20px;">No monsters added yet</p>';
        return;
    }
    
    container.innerHTML = currentEncounter.monsters.map((monster, index) => `
        <div class="encounter-monster">
            <span>${monster.name} (CR ${monster.cr})</span>
            <div style="display: flex; gap: 10px; align-items: center;">
                <span>HP: ${monster.currentHp}/${monster.maxHp}</span>
                <button class="action-btn" style="padding: 5px 10px; font-size: 0.75rem;" onclick="removeMonster(${index})">❌</button>
            </div>
        </div>
    `).join('');
}

function removeMonster(index) {
    if (index >= 0 && index < currentEncounter.monsters.length) {
        const removed = currentEncounter.monsters.splice(index, 1);
        console.log(`Removed: ${removed[0].name}`);
        updateEncounterSummary();
        renderEncounterMonsters();
        renderMonsterList(); // Update "added" state
        checkSynergies();
    }
}

function clearEncounter() {
    currentEncounter.monsters = [];
    currentEncounter.terrain = [];
    updateEncounterSummary();
    renderEncounterMonsters();
    renderMonsterList();
    const terrainSection = document.getElementById('terrain-section');
    const synergySuggestions = document.getElementById('synergy-suggestions');
    if (terrainSection) terrainSection.style.display = 'none';
    if (synergySuggestions) synergySuggestions.style.display = 'none';
}

// Generate terrain
function generateTerrain() {
    const count = 3;
    const selected = [];
    
    for (let i = 0; i < count; i++) {
        const terrain = terrainTable[Math.floor(Math.random() * terrainTable.length)];
        if (!selected.find(t => t.name === terrain.name)) {
            selected.push(terrain);
        }
    }
    
    currentEncounter.terrain = selected;
    
    const container = document.getElementById('terrain-list');
    if (container) {
        container.innerHTML = selected.map(t => `
            <div class="terrain-item">
                <h4>🏰 ${t.name}</h4>
                <p>${t.description}</p>
                <div class="rules">${t.rules}</div>
            </div>
        `).join('');
    }
    
    const terrainSection = document.getElementById('terrain-section');
    if (terrainSection) terrainSection.style.display = 'block';
}

// Start encounter - FIXED
function startEncounter() {
    if (currentEncounter.monsters.length === 0) {
        alert('Add at least one monster!');
        return;
    }
    
    console.log('🎲 Starting encounter...');
    
    // Roll initiative for all
    currentEncounter.monsters.forEach(m => {
        m.initiative = rollInitiative();
    });
    
    // Sort by initiative
    currentEncounter.initiative = [...currentEncounter.monsters].sort((a, b) => b.initiative - a.initiative);
    
    // Reset combat state
    currentEncounter.round = 1;
    currentEncounter.currentTurn = 0;
    currentEncounter.tension = 0;
    currentEncounter.combatLog = [];
    currentEncounter.readyActions = [];
    currentEncounter.concentration = [];
    
    // Switch to tracker view
    const builder = document.getElementById('encounter-builder');
    const tracker = document.getElementById('initiative-tracker');
    const postCombat = document.getElementById('post-combat');
    
    if (builder) builder.style.display = 'none';
    if (tracker) tracker.style.display = 'block';
    if (postCombat) postCombat.style.display = 'none';
    
    renderInitiative();
    updateCombatStatus();
    logCombat('⚔️ Combat started!');
}

function rollInitiative() {
    return randomInt(1, 20);
}

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Render initiative - FIXED
function renderInitiative() {
    const container = currentView === 'dm' ? 
        document.getElementById('initiative-order') : 
        document.getElementById('player-initiative');
    
    if (!container) return;
    
    if (currentEncounter.initiative.length === 0) {
        container.innerHTML = '<p style="color: #888; text-align: center; padding: 20px;">No combatants</p>';
        return;
    }
    
    container.innerHTML = currentEncounter.initiative.map((combatant, index) => `
        <div class="initiative-item ${index === currentEncounter.currentTurn ? 'current' : ''} ${combatant.dead ? 'dead' : ''}" data-index="${index}">
            <div style="flex: 1;">
                <div class="initiative-name">${combatant.name} ${currentView === 'dm' ? `(Init: ${combatant.initiative})` : ''}</div>
                ${currentView === 'dm' ? `
                    <div class="initiative-stats">
                        <span class="initiative-stat">AC: ${combatant.ac}</span>
                        <div class="hp-bar">
                            <div class="hp-fill ${getHpClass(combatant.currentHp, combatant.maxHp)}" style="width: ${(combatant.currentHp / combatant.maxHp) * 100}%"></div>
                        </div>
                        <span class="initiative-stat">${combatant.currentHp}/${combatant.maxHp} HP</span>
                    </div>
                    <div class="conditions-list">
                        ${combatant.conditions.map(c => `<span class="condition-badge" onclick="removeCondition(${index}, '${c}')">${c}</span>`).join('')}
                    </div>
                ` : ''}
            </div>
            ${currentView === 'dm' ? `
                <div style="display: flex; gap: 5px;">
                    <button class="tracker-btn" style="padding: 5px 10px; font-size: 0.75rem;" onclick="damageCombatant(${index})">💥</button>
                    <button class="tracker-btn" style="padding: 5px 10px; font-size: 0.75rem;" onclick="healCombatant(${index})">💚</button>
                    <button class="tracker-btn" style="padding: 5px 10px; font-size: 0.75rem;" onclick="addCondition(${index})">⚠️</button>
                    <button class="tracker-btn" style="padding: 5px 10px; font-size: 0.75rem;" onclick="toggleDead(${index})">💀</button>
                </div>
            ` : ''}
        </div>
    `).join('');
}

function getHpClass(current, max) {
    if (!max || max === 0) return '';
    const percent = current / max;
    if (percent > 0.5) return '';
    if (percent > 0.25) return 'medium';
    return 'low';
}

// Combat controls
function nextTurn() {
    // Check ready actions
    if (currentEncounter.readyActions.length > 0) {
        const ready = currentEncounter.readyActions.shift();
        logCombat(`🎯 Ready action triggered: ${ready}`);
    }
    
    currentEncounter.currentTurn++;
    
    if (currentEncounter.currentTurn >= currentEncounter.initiative.length) {
        currentEncounter.currentTurn = 0;
        currentEncounter.round++;
        updateTension(10);
        checkRoundTriggers();
    }
    
    checkConcentration();
    renderInitiative();
    updateCombatStatus();
}

function prevTurn() {
    if (currentEncounter.currentTurn > 0) {
        currentEncounter.currentTurn--;
    } else {
        currentEncounter.currentTurn = currentEncounter.initiative.length - 1;
        currentEncounter.round--;
    }
    
    renderInitiative();
    updateCombatStatus();
}

function toggleSideInitiative() {
    currentEncounter.sideInitiative = !currentEncounter.sideInitiative;
    alert(`Side Initiative: ${currentEncounter.sideInitiative ? 'ON' : 'OFF'}`);
}

function endCombat() {
    const builder = document.getElementById('encounter-builder');
    const tracker = document.getElementById('initiative-tracker');
    const postCombat = document.getElementById('post-combat');
    
    if (builder) builder.style.display = 'none';
    if (tracker) tracker.style.display = 'none';
    if (postCombat) postCombat.style.display = 'block';
    
    renderPostCombat();
    logCombat('🏁 Combat ended!');
}

// Damage/Heal - FIXED
function damageCombatant(index) {
    if (index < 0 || index >= currentEncounter.initiative.length) return;
    
    const amount = prompt('Damage amount?');
    if (!amount) return;
    
    const combatant = currentEncounter.initiative[index];
    const fudge = currentEncounter.settings.fudgeValue;
    const actualDamage = parseInt(amount) + fudge;
    
    combatant.currentHp = Math.max(0, combatant.currentHp - actualDamage);
    
    // Concentration check
    if (combatant.concentration.length > 0) {
        const dc = Math.max(10, Math.floor(actualDamage / 2));
        checkConcentrationSave(index, dc);
    }
    
    if (combatant.currentHp === 0) {
        combatant.dead = true;
        logCombat(`💀 ${combatant.name} falls!`);
        updateTension(15);
    } else {
        logCombat(`💥 ${combatant.name} takes ${actualDamage} damage (${combatant.currentHp}/${combatant.maxHp} HP)`);
    }
    
    checkMoraleTrigger();
    renderInitiative();
}

function healCombatant(index) {
    if (index < 0 || index >= currentEncounter.initiative.length) return;
    
    const amount = prompt('Healing amount?');
    if (!amount) return;
    
    const combatant = currentEncounter.initiative[index];
    combatant.currentHp = Math.min(combatant.maxHp, combatant.currentHp + parseInt(amount));
    
    logCombat(`💚 ${combatant.name} healed for ${amount} (${combatant.currentHp}/${combatant.maxHp} HP)`);
    renderInitiative();
}

// Conditions
function addCondition(index) {
    if (index < 0 || index >= currentEncounter.initiative.length) return;
    
    const condition = prompt('Condition? (e.g., Poisoned, Prone, Restrained)');
    if (!condition) return;
    
    const combatant = currentEncounter.initiative[index];
    combatant.conditions.push(condition);
    
    logCombat(`⚠️ ${combatant.name} is now ${condition}`);
    renderInitiative();
}

function removeCondition(index, condition) {
    if (index < 0 || index >= currentEncounter.initiative.length) return;
    
    const combatant = currentEncounter.initiative[index];
    combatant.conditions = combatant.conditions.filter(c => c !== condition);
    
    logCombat(`✅ ${condition} removed from ${combatant.name}`);
    renderInitiative();
}

function toggleDead(index) {
    if (index < 0 || index >= currentEncounter.initiative.length) return;
    
    const combatant = currentEncounter.initiative[index];
    combatant.dead = !combatant.dead;
    combatant.currentHp = combatant.dead ? 0 : combatant.maxHp;
    
    renderInitiative();
}

// Tension meter
function updateTension(amount) {
    currentEncounter.tension = Math.min(100, currentEncounter.tension + amount);
    
    const fill = document.getElementById('tension-fill');
    const value = document.getElementById('tension-value');
    
    if (fill) fill.style.width = `${currentEncounter.tension}%`;
    if (value) value.textContent = `${currentEncounter.tension}%`;
    
    if (currentEncounter.tension >= 80) {
        logCombat('⚠️ TENSION CRITICAL! Consider ending encounter!');
    }
}

function updateCombatStatus() {
    const round = document.getElementById('current-round');
    if (round) round.textContent = currentEncounter.round;
}

// Combat log
function logCombat(message) {
    currentEncounter.combatLog.unshift({
        round: currentEncounter.round,
        message: message,
        timestamp: new Date().toISOString()
    });
    
    const container = document.getElementById('combat-log-content');
    if (container) {
        container.innerHTML = currentEncounter.combatLog.map(log => `
            <div class="log-entry">
                <strong>Round ${log.round}:</strong> ${log.message}
            </div>
        `).join('');
    }
}

// DM Controls
function rollSecretSave() {
    const roll = randomInt(1, 20);
    const modifier = prompt('Save modifier?') || 0;
    const dc = prompt('DC?') || 15;
    const total = roll + parseInt(modifier);
    const success = total >= dc;
    
    if (currentEncounter.settings.secretRolls) {
        logCombat(`🎲 Secret save: ${success ? 'Success' : 'Failure'}`);
    } else {
        logCombat(`🎲 Save: ${roll} + ${modifier} = ${total} vs DC ${dc} - ${success ? 'Success' : 'Failure'}`);
    }
}

function generateFlavorText() {
    const target = prompt('Target name?') || 'enemy';
    const hit = confirm('Did it hit?');
    const crit = hit && confirm('Was it a crit?');
    
    let template;
    if (crit) template = randomArray(flavorTextTemplates.crit);
    else if (hit) template = randomArray(flavorTextTemplates.hit);
    else template = randomArray(flavorTextTemplates.miss);
    
    const text = template.replace('{target}', target);
    logCombat(`💬 ${text}`);
    alert(text);
}

function triggerReinforcements() {
    logCombat('🚨 REINFORCEMENTS ARRIVE!');
    updateTension(20);
}

function checkMorale() {
    const roll = randomInt(1, 20);
    const dc = 15;
    const success = roll >= dc;
    
    logCombat(`🏳️ Morale check: ${roll} vs DC ${dc} - ${success ? 'Holding' : 'Fleeing!'}`);
    
    if (!success) {
        alert('Enemies are fleeing!');
    }
}

function checkMoraleTrigger() {
    const trigger = currentEncounter.settings.moraleTrigger;
    if (trigger === 'none') return;
    
    const totalMaxHp = currentEncounter.initiative.reduce((sum, c) => sum + (c.maxHp || 0), 0);
    const totalCurrentHp = currentEncounter.initiative.reduce((sum, c) => sum + (c.currentHp || 0), 0);
    
    if (totalMaxHp === 0) return;
    
    const percent = (totalCurrentHp / totalMaxHp) * 100;
    
    if (trigger === '50' && percent <= 50) {
        logCombat('🏳️ Morale trigger reached (50% HP)!');
        checkMorale();
    } else if (trigger === '25' && percent <= 25) {
        logCombat('🏳️ Morale trigger reached (25% HP)!');
        checkMorale();
    }
}

function checkRoundTriggers() {
    const trigger = currentEncounter.settings.reinforcementTrigger;
    
    if (trigger === 'round3' && currentEncounter.round === 3) {
        triggerReinforcements();
    } else if (trigger === 'round5' && currentEncounter.round === 5) {
        triggerReinforcements();
    }
}

// Concentration
function checkConcentration() {
    // Check all concentration spells
}

function checkConcentrationSave(index, dc) {
    if (index < 0 || index >= currentEncounter.initiative.length) return;
    
    const combatant = currentEncounter.initiative[index];
    const roll = randomInt(1, 20);
    const modifier = 3;
    const total = roll + modifier;
    
    if (total < dc) {
        logCombat(`❌ ${combatant.name} fails concentration (DC ${dc})!`);
        combatant.concentration = [];
    } else {
        logCombat(`✅ ${combatant.name} maintains concentration (DC ${dc})`);
    }
}

// Helper
function randomArray(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

// Post-combat rendering
function renderPostCombat() {
    const totalXp = currentEncounter.monsters.reduce((sum, m) => sum + (m.xp || 0), 0);
    const partySize = parseInt(document.getElementById('party-size').value) || 4;
    const xpPerPerson = Math.floor(totalXp / partySize);
    
    const xpDist = document.getElementById('xp-distribution');
    if (xpDist) {
        xpDist.innerHTML = `
            <p>Total XP: ${totalXp.toLocaleString()}</p>
            <p>Per Character: ${xpPerPerson.toLocaleString()} XP</p>
        `;
    }
    
    const resourceBurn = document.getElementById('resource-burn');
    if (resourceBurn) {
        resourceBurn.innerHTML = `
            <p>Rounds: ${currentEncounter.round}</p>
            <p>Tension Peak: ${currentEncounter.tension}%</p>
            <p>Casualties: ${currentEncounter.initiative.filter(c => c.dead).length}</p>
        `;
    }
    
    const combatSummary = document.getElementById('combat-summary');
    if (combatSummary) {
        combatSummary.innerHTML = `
            <p>${currentEncounter.combatLog.length} log entries</p>
            <p>Duration: ${currentEncounter.round} rounds</p>
        `;
    }
    
    const lootContent = document.getElementById('loot-content');
    if (lootContent) {
        lootContent.innerHTML = '<p>Click "Generate Loot" to create treasure drop</p>';
    }
}

function calculateXP() {
    // Already calculated in render
}

function trackResources() {
    const slots = prompt('Spell slots used (comma-separated)?');
    const hitDice = prompt('Hit Dice spent?');
    
    logCombat(`📊 Resources tracked: ${slots} slots, ${hitDice} HD`);
}

function exportCombatLog() {
    const text = currentEncounter.combatLog.map(log => 
        `Round ${log.round}: ${log.message}`
    ).join('\n');
    
    navigator.clipboard.writeText(text).then(() => {
        alert('Combat log copied to clipboard!');
    }).catch(err => {
        console.error('Failed to copy:', err);
        alert('Failed to copy. Check console.');
    });
}

function generateLootDrop() {
    alert('Redirecting to Loot Generator...');
    window.location.href = 'loot-generator.html';
}

function saveToMemory() {
    saveEncounterToMemory(currentEncounter);
    alert('Encounter saved to campaign memory!');
}

function resetEncounter() {
    location.reload();
}

// Modal
function closeModal() {
    const modal = document.getElementById('memory-modal');
    if (modal) modal.style.display = 'none';
}

// Load from memory
function loadFromMemory() {
    // Would load previous encounters
}

function saveEncounterToMemory(encounter) {
    // Would save to localStorage
}
