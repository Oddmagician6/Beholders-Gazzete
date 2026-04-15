/* ============================================
   D&D 5E LOOT GENERATOR
   ============================================ */

let currentLoot = null;
let currentTab = 'individual';

// Tab switching
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        
        btn.classList.add('active');
        document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
        currentTab = btn.dataset.tab;
    });
});

// Random utility functions
function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomArray(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function rollPercentile() {
    return randomInt(1, 100);
}

// Generate coins
function generateCoins(table, luck = 'normal') {
    const multiplier = luck === 'generous' ? 1.5 : luck === 'stingy' ? 0.5 : 1;
    
    const coins = {};
    ['cp', 'sp', 'ep', 'gp', 'pp'].forEach(type => {
        if (table[type][1] > 0) {
            const amount = randomInt(table[type][0], table[type][1]) * multiplier;
            coins[type] = Math.floor(amount);
        } else {
            coins[type] = 0;
        }
    });
    
    return coins;
}

// Generate gems
function generateGems(table, luck = 'normal') {
    if (rollPercentile() > table.gems.chance) return [];
    
    const multiplier = luck === 'generous' ? 1.5 : luck === 'stingy' ? 0.5 : 1;
    const count = Math.floor(randomInt(table.gems.count[0], table.gems.count[1]) * multiplier);
    
    const gems = [];
    for (let i = 0; i < count; i++) {
        const gemType = randomArray(lootData.gems[table.gems.value]);
        const value = parseInt(table.gems.value);
        gems.push({
            name: gemType,
            value: value,
            type: 'gem',
            description: `${gemType} (${value} gp)`
        });
    }
    
    return gems;
}

// Generate art objects
function generateArt(table, luck = 'normal') {
    if (rollPercentile() > table.art.chance) return [];
    
    const multiplier = luck === 'generous' ? 1.5 : luck === 'stingy' ? 0.5 : 1;
    const count = Math.floor(randomInt(table.art.count[0], table.art.count[1]) * multiplier);
    
    const art = [];
    for (let i = 0; i < count; i++) {
        const artType = randomArray(lootData.art[table.art.value]);
        const value = parseInt(table.art.value);
        art.push({
            name: artType,
            value: value,
            type: 'art',
            description: `${artType} (${value} gp)`
        });
    }
    
    return art;
}

// Generate magic items
function generateMagicItems(rarity, count = 1) {
    const items = [];
    
    for (let i = 0; i < count; i++) {
        let itemRarity = rarity;
        if (rarity === 'random') {
            const roll = rollPercentile();
            if (roll <= 40) itemRarity = 'common';
            else if (roll <= 70) itemRarity = 'uncommon';
            else if (roll <= 85) itemRarity = 'rare';
            else if (roll <= 95) itemRarity = 'very-rare';
            else if (roll <= 99) itemRarity = 'legendary';
            else itemRarity = 'artifact';
        }
        
        const itemPool = lootData.magicItems[itemRarity] || lootData.magicItems.common;
        const item = randomArray(itemPool);
        
        items.push({
            name: item.name,
            rarity: itemRarity,
            type: item.type,
            attunement: item.attunement || false,
            description: lootData.magicDescriptions[item.name] || 'Magical properties vary.',
            value: getMagicItemValue(itemRarity)
        });
    }
    
    return items;
}

// Get magic item value (DMG guidelines)
function getMagicItemValue(rarity) {
    const values = {
        'common': 100,
        'uncommon': 250,
        'rare': 1500,
        'very-rare': 8000,
        'legendary': 50000,
        'artifact': 0 // Priceless
    };
    return values[rarity] || 0;
}

// Calculate total value
function calculateTotalValue(coins, gems, art, magic, useEconomy = false) {
    let total = 0;
    
    // Coins
    total += (coins.cp || 0) * 0.01;
    total += (coins.sp || 0) * 0.1;
    total += (coins.ep || 0) * 0.5;
    total += (coins.gp || 0) * 1;
    total += (coins.pp || 0) * 10;
    
    // Gems
    gems.forEach(gem => total += gem.value);
    
    // Art
    art.forEach(art => total += art.value);
    
    // Magic
    magic.forEach(item => total += item.value);
    
    // Apply economy modifier
    if (useEconomy) {
        const economyMod = 1 + (Math.random() * 0.3 - 0.15); // +/- 15%
        total *= economyMod;
    }
    
    return Math.floor(total);
}

// Main generation function
function generateLoot() {
    const showMarketValue = document.getElementById('show-market-value').checked;
    const includeDescriptions = document.getElementById('include-descriptions').checked;
    const useEconomyPrices = document.getElementById('use-economy-prices').checked;
    
    let coins = {};
    let gems = [];
    let art = [];
    let magic = [];
    let table = null;
    let luck = 'normal';
    
    switch (currentTab) {
        case 'individual':
            const crRange = document.getElementById('ind-cr').value;
            luck = document.getElementById('ind-luck').value;
            table = lootData.treasureTables.individual[crRange];
            
            coins = generateCoins(table, luck);
            gems = generateGems(table, luck);
            art = generateArt(table, luck);
            
            if (rollPercentile() <= table.magic.chance) {
                magic = generateMagicItems(table.magic.rarity, 1);
            }
            break;
            
        case 'hoard':
            const hoardCount = parseInt(document.getElementById('hoard-count').value) || 1;
            const includeMagic = document.getElementById('hoard-magic').value === 'yes';
            const hoardTable = lootData.treasureTables.hoard['11-16']; // Default to mid-tier
            
            for (let i = 0; i < hoardCount; i++) {
                const hoardCoins = generateCoins(hoardTable, 'generous');
                Object.keys(hoardCoins).forEach(key => {
                    coins[key] = (coins[key] || 0) + hoardCoins[key];
                });
                
                gems = gems.concat(generateGems(hoardTable, 'generous'));
                art = art.concat(generateArt(hoardTable, 'generous'));
                
                if (includeMagic && rollPercentile() <= hoardTable.magic.chance) {
                    magic = magic.concat(generateMagicItems(hoardTable.magic.rarity, randomInt(1, 3)));
                }
            }
            break;
            
        case 'magic':
            const rarity = document.getElementById('magic-rarity').value;
            const magicType = document.getElementById('magic-type').value;
            const magicCount = parseInt(document.getElementById('magic-count').value) || 1;
            
            magic = generateMagicItems(rarity, magicCount);
            
            // Filter by type if specified
            if (magicType !== 'random') {
                magic = magic.filter(item => item.type === magicType);
            }
            break;
            
        case 'custom':
            const minCR = parseInt(document.getElementById('custom-min-cr').value) || 0;
            const maxCR = parseInt(document.getElementById('custom-max-cr').value) || 10;
            const avgCR = Math.floor((minCR + maxCR) / 2);
            
            // Determine table based on avg CR
            if (avgCR <= 4) table = lootData.treasureTables.individual['0-4'];
            else if (avgCR <= 10) table = lootData.treasureTables.individual['5-10'];
            else if (avgCR <= 16) table = lootData.treasureTables.individual['11-16'];
            else table = lootData.treasureTables.individual['17+'];
            
            if (document.getElementById('custom-coins').checked) {
                coins = generateCoins(table, 'normal');
            }
            if (document.getElementById('custom-gems').checked) {
                gems = generateGems(table, 'normal');
            }
            if (document.getElementById('custom-art').checked) {
                art = generateArt(table, 'normal');
            }
            if (document.getElementById('custom-magic').checked) {
                magic = generateMagicItems('random', randomInt(1, 3));
            }
            break;
    }
    
    // Build loot object
    currentLoot = {
        coins,
        gems,
        art,
        magic,
        totalValue: calculateTotalValue(coins, gems, art, magic, useEconomyPrices),
        generatedAt: new Date().toISOString(),
        tab: currentTab
    };
    
    // Display
    displayLoot(showMarketValue, includeDescriptions, useEconomyPrices);
    animateDisplay();
}

// Display loot
function displayLoot(showMarketValue, includeDescriptions, useEconomyPrices) {
    if (!currentLoot) return;
    
    document.getElementById('loot-display').style.display = 'block';
    
    // Summary
    document.getElementById('total-value').textContent = `${currentLoot.totalValue.toLocaleString()} gp`;
    document.getElementById('total-coins').textContent = Object.values(currentLoot.coins).reduce((a, b) => a + b, 0).toLocaleString();
    document.getElementById('total-gems').textContent = (currentLoot.gems.length + currentLoot.art.length).toLocaleString();
    document.getElementById('total-magic').textContent = currentLoot.magic.length.toLocaleString();
    
    // Coins
    const coinsGrid = document.getElementById('coins-grid');
    const hasCoins = Object.values(currentLoot.coins).some(v => v > 0);
    document.getElementById('coins-section').style.display = hasCoins ? 'block' : 'none';
    
    if (hasCoins) {
        coinsGrid.innerHTML = Object.entries(currentLoot.coins)
            .filter(([_, amount]) => amount > 0)
            .map(([type, amount]) => `
                <div class="coin-box">
                    <div class="coin-icon">${lootData.coins[type].icon}</div>
                    <div class="coin-amount">${amount.toLocaleString()}</div>
                    <div class="coin-type">${lootData.coins[type].name}</div>
                    ${showMarketValue ? `<div class="coin-value">=${(amount * lootData.coins[type].value).toLocaleString()} gp</div>` : ''}
                </div>
            `).join('');
    }
    
    // Gems
    const gemsGrid = document.getElementById('gems-grid');
    document.getElementById('gems-section').style.display = currentLoot.gems.length > 0 ? 'block' : 'none';
    
    if (currentLoot.gems.length > 0) {
        gemsGrid.innerHTML = currentLoot.gems.map(gem => `
            <div class="item-card">
                <div class="item-header">
                    <span class="item-name">${gem.name}</span>
                    <span class="item-rarity rarity-common">Gem</span>
                </div>
                ${includeDescriptions ? `<div class="item-description">${gem.description}</div>` : ''}
                ${showMarketValue ? `<div class="item-value">💰 ${gem.value.toLocaleString()} gp</div>` : ''}
            </div>
        `).join('');
    }
    
    // Art
    const artGrid = document.getElementById('art-grid');
    document.getElementById('art-section').style.display = currentLoot.art.length > 0 ? 'block' : 'none';
    
    if (currentLoot.art.length > 0) {
        artGrid.innerHTML = currentLoot.art.map(art => `
            <div class="item-card">
                <div class="item-header">
                    <span class="item-name">${art.name}</span>
                    <span class="item-rarity rarity-uncommon">Art</span>
                </div>
                ${includeDescriptions ? `<div class="item-description">${art.description}</div>` : ''}
                ${showMarketValue ? `<div class="item-value">💰 ${art.value.toLocaleString()} gp</div>` : ''}
            </div>
        `).join('');
    }
    
    // Magic Items
    const magicGrid = document.getElementById('magic-grid');
    document.getElementById('magic-section').style.display = currentLoot.magic.length > 0 ? 'block' : 'none';
    
    if (currentLoot.magic.length > 0) {
        magicGrid.innerHTML = currentLoot.magic.map(item => `
            <div class="magic-card ${item.attunement ? 'requires-attunement' : ''}">
                ${item.attunement ? '<span class="attunement-badge">Requires Attunement</span>' : ''}
                <div class="item-header">
                    <span class="item-name">${item.name}</span>
                    <span class="item-rarity rarity-${item.rarity}">${item.rarity}</span>
                </div>
                ${includeDescriptions ? `<div class="item-description">${item.description}</div>` : ''}
                <div class="item-value">💰 ${item.value > 0 ? item.value.toLocaleString() : 'Priceless'} gp</div>
            </div>
        `).join('');
    }
    
    // Notes
    document.getElementById('loot-notes').innerHTML = `
        <p><strong>Generation Method:</strong> ${currentTab.charAt(0).toUpperCase() + currentTab.slice(1)} Treasure</p>
        <p><strong>DMG Compliance:</strong> Follows Dungeon Master's Guide treasure tables</p>
        ${useEconomyPrices ? '<p><strong>Economy Adjustment:</strong> Prices adjusted by current market fluctuations (±15%)</p>' : ''}
        <p><strong>Total Value:</strong> ${currentLoot.totalValue.toLocaleString()} gp ${useEconomyPrices ? '(with market adjustments)' : '(base value)'}</p>
    `;
}

function animateDisplay() {
    const display = document.getElementById('loot-display');
    display.style.opacity = '0';
    display.style.transform = 'translateY(30px)';
    
    setTimeout(() => {
        display.style.transition = 'all 0.5s ease';
        display.style.opacity = '1';
        display.style.transform = 'translateY(0)';
    }, 50);
}

function regenerateLoot() {
    generateLoot();
}

// Copy to clipboard
function copyLoot() {
    if (!currentLoot) return;
    
    let text = `🏆 TREASURE LOOT 🏆\n\n`;
    text += `Total Value: ${currentLoot.totalValue.toLocaleString()} gp\n\n`;
    
    // Coins
    text += `🪙 CURRENCY:\n`;
    Object.entries(currentLoot.coins).forEach(([type, amount]) => {
        if (amount > 0) {
            text += `  ${amount.toLocaleString()} ${lootData.coins[type].name}\n`;
        }
    });
    
    // Gems
    if (currentLoot.gems.length > 0) {
        text += `\n💎 GEMS:\n`;
        currentLoot.gems.forEach(gem => {
            text += `  • ${gem.name} (${gem.value} gp)\n`;
        });
    }
    
    // Art
    if (currentLoot.art.length > 0) {
        text += `\n🎨 ART OBJECTS:\n`;
        currentLoot.art.forEach(art => {
            text += `  • ${art.name} (${art.value} gp)\n`;
        });
    }
    
    // Magic
    if (currentLoot.magic.length > 0) {
        text += `\n✨ MAGIC ITEMS:\n`;
        currentLoot.magic.forEach(item => {
            text += `  • ${item.name} [${item.rarity}]${item.attunement ? ' (Attunement)' : ''}\n`;
        });
    }
    
    navigator.clipboard.writeText(text).then(() => {
        alert('Loot copied to clipboard!');
    }).catch(err => {
        console.error('Failed to copy:', err);
        alert('Failed to copy. Check console.');
    });
}

// Save loot
function saveLoot() {
    if (!currentLoot) return;
    
    let saved = localStorage.getItem('saved_loot');
    saved = saved ? JSON.parse(saved) : [];
    
    saved.unshift(currentLoot);
    if (saved.length > 20) saved.pop();
    
    localStorage.setItem('saved_loot', JSON.stringify(saved));
    renderSavedLoot();
    alert('Treasure saved to favorites!');
}

// Render saved loot
function renderSavedLoot() {
    const container = document.getElementById('saved-list');
    let saved = localStorage.getItem('saved_loot');
    saved = saved ? JSON.parse(saved) : [];
    
    if (saved.length === 0) {
        container.innerHTML = '<p style="color: #888; font-style: italic;">No treasure saved yet...</p>';
        return;
    }
    
    container.innerHTML = saved.map((loot, index) => `
        <div class="saved-item" onclick="loadSavedLoot(${index})">
            <h4>Treasure #${index + 1}</h4>
            <p>${loot.totalValue.toLocaleString()} gp total value</p>
            <p>${loot.magic.length} magic items | ${loot.gems.length + loot.art.length} gems/art</p>
            <div class="saved-meta">${new Date(loot.generatedAt).toLocaleDateString()}</div>
        </div>
    `).join('');
}

function loadSavedLoot(index) {
    let saved = localStorage.getItem('saved_loot');
    saved = saved ? JSON.parse(saved) : [];
    
    if (saved[index]) {
        currentLoot = saved[index];
        displayLoot(true, true, false);
        document.getElementById('loot-display').scrollIntoView({ behavior: 'smooth' });
    }
}

function clearSaved() {
    if (confirm('Clear all saved treasure?')) {
        localStorage.removeItem('saved_loot');
        renderSavedLoot();
    }
}

// Export to JSON
function exportLoot() {
    if (!currentLoot) return;
    
    const dataStr = JSON.stringify(currentLoot, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `loot-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
}

// Keyboard shortcut
function setupKeyboardShortcut() {
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'SELECT') {
            e.preventDefault();
            generateLoot();
        }
    });
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('year').textContent = new Date().getFullYear();
    renderSavedLoot();
    setupKeyboardShortcut();
});
