/* ============================================
   CAMPAIGN MEMORY & ANALYTICS
   ============================================ */

const MEMORY_KEY = 'beholders_campaign_memory';

// Campaign memory structure
let campaignMemory = {
    encounters: [],
    partyResources: {
        spellSlots: {},
        hitDice: {},
        potions: 0
    },
    npckilled: [],
    locations: [],
    lastSession: null
};

// Load memory
function loadCampaignMemory() {
    const saved = localStorage.getItem(MEMORY_KEY);
    if (saved) {
        campaignMemory = JSON.parse(saved);
    }
    return campaignMemory;
}

// Save memory
function saveCampaignMemory() {
    localStorage.setItem(MEMORY_KEY, JSON.stringify(campaignMemory));
}

// Save encounter to memory
function saveEncounterToMemory(encounter) {
    loadCampaignMemory();
    
    const encounterRecord = {
        id: Date.now(),
        date: new Date().toISOString(),
        monsters: encounter.monsters.map(m => ({ name: m.name, cr: m.cr, killed: m.dead })),
        rounds: encounter.round,
        tension: encounter.tension,
        terrain: encounter.terrain.map(t => t.name),
        xpAwarded: encounter.monsters.reduce((sum, m) => sum + m.xp, 0),
        casualties: encounter.initiative.filter(c => c.dead).length,
        log: encounter.combatLog.slice(0, 10) // Last 10 entries
    };
    
    campaignMemory.encounters.unshift(encounterRecord);
    if (campaignMemory.encounters.length > 50) {
        campaignMemory.encounters.pop();
    }
    
    saveCampaignMemory();
}

// Get contextual suggestions
function getContextualSuggestions() {
    loadCampaignMemory();
    
    const suggestions = [];
    
    // Check for revenge encounters
    const recentKills = campaignMemory.encounters
        .slice(0, 5)
        .flatMap(e => e.monsters.filter(m => m.killed).map(m => m.name));
    
    const killCounts = {};
    recentKills.forEach(name => {
        killCounts[name] = (killCounts[name] || 0) + 1;
    });
    
    Object.entries(killCounts).forEach(([name, count]) => {
        if (count >= 3) {
            suggestions.push({
                type: 'revenge',
                text: `Players have killed ${count} ${name}s. Consider a revenge encounter!`,
                priority: 'high'
            });
        }
    });
    
    // Check resource burn
    const recentEncounters = campaignMemory.encounters.slice(0, 3);
    const avgRounds = recentEncounters.reduce((sum, e) => sum + e.rounds, 0) / recentEncounters.length || 0;
    
    if (avgRounds > 5) {
        suggestions.push({
            type: 'resources',
            text: 'Recent encounters are lasting too long. Consider shorter combats or more rest opportunities.',
            priority: 'medium'
        });
    }
    
    // Check for variety
    const recentTypes = recentEncounters.flatMap(e => e.monsters.map(m => m.name));
    const uniqueTypes = new Set(recentTypes).size;
    
    if (uniqueTypes < 3 && recentEncounters.length >= 3) {
        suggestions.push({
            type: 'variety',
            text: 'Monster variety is low. Consider different enemy types.',
            priority: 'medium'
        });
    }
    
    return suggestions;
}

// Resource tracking
function trackPartyResource(type, amount, change) {
    loadCampaignMemory();
    
    if (!campaignMemory.partyResources[type]) {
        campaignMemory.partyResources[type] = 0;
    }
    
    campaignMemory.partyResources[type] += change;
    saveCampaignMemory();
}

// Get resource burn report
function getResourceBurnReport() {
    loadCampaignMemory();
    
    const recent = campaignMemory.encounters.slice(0, 5);
    
    return {
        avgRounds: recent.reduce((sum, e) => sum + e.rounds, 0) / recent.length || 0,
        avgTension: recent.reduce((sum, e) => sum + e.tension, 0) / recent.length || 0,
        totalXp: recent.reduce((sum, e) => sum + e.xpAwarded, 0),
        totalCasualties: recent.reduce((sum, e) => sum + e.casualties, 0),
        encounterCount: recent.length
    };
}

// Export campaign data
function exportCampaignData() {
    loadCampaignMemory();
    
    const dataStr = JSON.stringify(campaignMemory, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `campaign-memory-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
}

// Import campaign data
function importCampaignData(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        campaignMemory = JSON.parse(e.target.result);
        saveCampaignMemory();
        alert('Campaign data imported!');
    };
    reader.readAsText(file);
}

// Clear memory
function clearCampaignMemory() {
    if (confirm('Clear all campaign memory? This cannot be undone!')) {
        localStorage.removeItem(MEMORY_KEY);
        campaignMemory = {
            encounters: [],
            partyResources: {},
            npckilled: [],
            locations: [],
            lastSession: null
        };
        alert('Campaign memory cleared!');
    }
}

// Display memory modal
function showMemoryModal() {
    loadCampaignMemory();
    
    const content = document.getElementById('memory-content');
    
    content.innerHTML = `
        <div style="margin-bottom: 20px;">
            <h4>📊 Recent Encounters</h4>
            <p>${campaignMemory.encounters.length} encounters recorded</p>
        </div>
        
        <div style="margin-bottom: 20px;">
            <h4>💡 Contextual Suggestions</h4>
            ${getContextualSuggestions().map(s => `
                <div style="padding: 10px; background: #252529; border-radius: 4px; margin-bottom: 10px; border-left: 3px solid ${s.priority === 'high' ? '#f44336' : '#ffeb3b'};">
                    ${s.text}
                </div>
            `).join('')}
        </div>
        
        <div style="display: flex; gap: 10px;">
            <button class="action-btn" onclick="exportCampaignData()">📤 Export</button>
            <button class="action-btn" onclick="clearCampaignMemory()">🗑️ Clear</button>
        </div>
    `;
    
    document.getElementById('memory-modal').style.display = 'flex';
}

// Auto-save on interval
setInterval(() => {
    if (currentEncounter && currentEncounter.monsters.length > 0) {
        saveCampaignMemory();
    }
}, 60000); // Every minute

// Initialize
loadCampaignMemory();
