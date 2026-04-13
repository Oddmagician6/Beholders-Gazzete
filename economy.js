const dndItems = [
    { name: "Healing Potion", basePrice: 50, unit: "gp" },
    { name: "Longsword", basePrice: 15, unit: "gp" },
    { name: "Chain Mail", basePrice: 75, unit: "gp" },
    { name: "Longbow", basePrice: 50, unit: "gp" },
    { name: "Arrows (20)", basePrice: 1, unit: "gp" },
    { name: "Plate Armor", basePrice: 1500, unit: "gp" },
    { name: "Magic Wand", basePrice: 500, unit: "gp" },
    { name: "Spell Scroll (1st)", basePrice: 50, unit: "gp" },
    { name: "Rope (50 ft)", basePrice: 1, unit: "gp" },
    { name: "Torches (10)", basePrice: 1, unit: "gp" },
    { name: "Rations (1 day)", basePrice: 5, unit: "sp" },
    { name: "Horse (Riding)", basePrice: 75, unit: "gp" },
    { name: "Cart", basePrice: 15, unit: "gp" },
    { name: "Climber's Kit", basePrice: 25, unit: "gp" },
    { name: "Thieves' Tools", basePrice: 25, unit: "gp" },
    { name: "Holy Symbol", basePrice: 5, unit: "gp" },
    { name: "Component Pouch", basePrice: 25, unit: "gp" },
    { name: "Spellbook", basePrice: 50, unit: "gp" },
    { name: "Iron Pot", basePrice: 2, unit: "gp" },
    { name: "Bedroll", basePrice: 1, unit: "gp" },
    { name: "Backpack", basePrice: 2, unit: "gp" },
    { name: "Caltrops", basePrice: 1, unit: "gp" },
    { name: "Crowbar", basePrice: 2, unit: "gp" },
    { name: "Hammer", basePrice: 1, unit: "gp" },
    { name: "Lantern", basePrice: 5, unit: "gp" },
    { name: "Oil (flask)", basePrice: 1, unit: "sp" },
    { name: "Tent (2-person)", basePrice: 2, unit: "gp" },
    { name: "Whetstone", basePrice: 1, unit: "cp" },
    { name: "Manacles", basePrice: 2, unit: "gp" },
    { name: "Lock", basePrice: 10, unit: "gp" }
];

const STORAGE_KEY = 'dnd_economy_data';
const FLUCTUATION_PERCENT = 15;
const UPDATE_INTERVAL = 15 * 60 * 1000;

function initEconomy() {
    let economyData = localStorage.getItem(STORAGE_KEY);
    if (!economyData) {
        economyData = {
            lastUpdate: Date.now(),
            items: dndItems.map(item => ({
                ...item,
                currentPrice: item.basePrice,
                previousPrice: item.basePrice,
                changePercent: 0
            }))
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(economyData));
    } else {
        economyData = JSON.parse(economyData);
    }
    return economyData;
}

function fluctuatePrices(economyData) {
    economyData.items = economyData.items.map(item => {
        const fluctuation = (Math.random() * 2 - 1) * (FLUCTUATION_PERCENT / 100);
        const newPrice = item.basePrice * (1 + fluctuation);
        const changePercent = ((newPrice - item.currentPrice) / item.currentPrice) * 100;
        return {
            ...item,
            previousPrice: item.currentPrice,
            currentPrice: Math.max(0.01, parseFloat(newPrice.toFixed(2))),
            changePercent: parseFloat(changePercent.toFixed(2))
        };
    });
    economyData.lastUpdate = Date.now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(economyData));
    return economyData;
}

function formatPrice(price, unit) {
    if (unit === 'cp') return `${price} cp`;
    if (unit === 'sp') return `${price} sp`;
    return `${price} gp`;
}

function getChangeIndicator(changePercent) {
    if (changePercent > 0.5) return `<span class="price-change up">▲ +${changePercent}%</span>`;
    if (changePercent < -0.5) return `<span class="price-change down">▼ ${changePercent}%</span>`;
    return `<span class="price-change stable">● 0%</span>`;
}

function getPriceChangeClass(changePercent) {
    if (changePercent > 0.5) return 'price-up';
    if (changePercent < -0.5) return 'price-down';
    return '';
}

function getMarketTrend(items) {
    const avgChange = items.reduce((sum, item) => sum + item.changePercent, 0) / items.length;
    if (avgChange > 1) return { text: "Bullish Market - Prices Rising", class: "trend-up" };
    if (avgChange < -1) return { text: "Bearish Market - Prices Falling", class: "trend-down" };
    return { text: "Stable Market - Minimal Change", class: "trend-stable" };
}

function renderEconomyWidget(economyData) {
    const widget = document.getElementById('economy-tracker');
    if (!widget) return;
    const trend = getMarketTrend(economyData.items);
    const timeSinceUpdate = Math.floor((Date.now() - economyData.lastUpdate) / 60000);
    const minutesUntilUpdate = Math.max(0, 15 - timeSinceUpdate);
    
    widget.innerHTML = `
        <div class="economy-header">
            <div class="economy-title">⚖️ Waterdeep Market</div>
            <div style="display: flex; align-items: center; gap: 10px;">
                <div class="economy-timer">Update: ${minutesUntilUpdate}m</div>
                <button class="refresh-btn" onclick="forceEconomyUpdate()">↻</button>
            </div>
        </div>
        <div class="economy-grid">
            ${economyData.items.slice(0, 10).map(item => `
                <div class="economy-item ${getPriceChangeClass(item.changePercent)}">
                    <div class="item-name">${item.name}</div>
                    <div class="item-price">
                        ${formatPrice(item.currentPrice, item.unit)}
                        ${getChangeIndicator(item.changePercent)}
                    </div>
                </div>
            `).join('')}
        </div>
        <div class="market-trend">
            <span class="trend-indicator ${trend.class}"></span>
            ${trend.text}
        </div>
    `;
}

function forceEconomyUpdate() {
    const economyData = initEconomy();
    const updatedData = fluctuatePrices(economyData);
    renderEconomyWidget(updatedData);
}

function checkAndUpdateEconomy() {
    const economyData = initEconomy();
    const timeSinceUpdate = Date.now() - economyData.lastUpdate;
    if (timeSinceUpdate >= UPDATE_INTERVAL) {
        const updatedData = fluctuatePrices(economyData);
        renderEconomyWidget(updatedData);
    } else {
        renderEconomyWidget(economyData);
    }
    setTimeout(checkAndUpdateEconomy, 60000);
}

document.addEventListener('DOMContentLoaded', () => {
    checkAndUpdateEconomy();
});
