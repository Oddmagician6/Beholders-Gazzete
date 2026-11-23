/* ============================================
   REALM MARKET EXCHANGE: page logic for economy.html
   Item list and price model live in market-data.js (shared with the homepage).
   ============================================ */

let marketSlot = null;
let marketItems = [];

function escapeHTML(text) {
    return String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function getChangeHTML(changePercent) {
    if (changePercent > 0.5) {
        return `<span class="change-cell up">▲ +${changePercent.toFixed(2)}%</span>`;
    } else if (changePercent < -0.5) {
        return `<span class="change-cell down">▼ ${changePercent.toFixed(2)}%</span>`;
    }
    return `<span class="change-cell stable">● ${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%</span>`;
}

// Seven daily points as a small SVG line, green if the week ended higher, red if lower.
function getSparkline(history) {
    const w = 84, h = 24, pad = 2;
    const min = Math.min(...history), max = Math.max(...history);
    const range = max - min || 1;
    const points = history.map((p, i) => {
        const x = pad + i * (w - pad * 2) / (history.length - 1);
        const y = h - pad - (p - min) / range * (h - pad * 2);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
    const first = history[0], last = history[history.length - 1];
    const dir = last > first * 1.005 ? 'up' : last < first * 0.995 ? 'down' : 'stable';
    const pct = ((last - first) / first * 100).toFixed(1);
    return `<svg class="sparkline ${dir}" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="Change across the 7 daily prices (since 6 days ago) ${pct}%">
        <polyline points="${points}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/>
    </svg>`;
}

function renderTable(items) {
    const tbody = document.getElementById('items-table-body');
    if (!tbody) return;

    if (items.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px;">No items found</td></tr>';
        return;
    }

    tbody.innerHTML = items.map(item => `
        <tr>
            <td class="item-name-cell">${escapeHTML(item.name)}${item.level !== undefined ? `<span class="item-level">Lv ${item.level}</span>` : ''}</td>
            <td class="item-category">${MARKET_CATEGORIES[item.category] || item.category}</td>
            <td class="price-cell">${formatCoins(item.basePrice, true)}</td>
            <td class="price-cell">${formatCoins(item.currentPrice, true)}</td>
            <td>${getChangeHTML(item.changePercent)}</td>
            <td>${getSparkline(item.history)}</td>
        </tr>
    `).join('');
}

function updateOverview(items) {
    const up = items.filter(i => i.changePercent > 0.5).length;
    const down = items.filter(i => i.changePercent < -0.5).length;

    document.getElementById('total-items').textContent = items.length;
    document.getElementById('items-up').textContent = up;
    document.getElementById('items-down').textContent = down;
    document.getElementById('items-stable').textContent = items.length - up - down;

    const avgChange = items.reduce((sum, i) => sum + i.changePercent, 0) / items.length;
    const statusEl = document.getElementById('market-status');
    if (avgChange > 1) {
        statusEl.innerHTML = '<span class="dot" style="background: #4caf50;"></span><span class="text">Bullish</span>';
    } else if (avgChange < -1) {
        statusEl.innerHTML = '<span class="dot" style="background: #f44336;"></span><span class="text">Bearish</span>';
    } else {
        statusEl.innerHTML = '<span class="dot" style="background: #888;"></span><span class="text">Stable</span>';
    }
}

function updateCountdown(now = Date.now()) {   // one clock reading: two could straddle a slot change (-1:-1)
    // Whole seconds rounded up: 00:00 only shows as the new slot starts (B950).
    const left = Math.ceil(Math.max(0, marketSlotStart(now) + MARKET_SLOT_MS - now) / 1000);
    const minutes = Math.floor(left / 60);
    const seconds = left % 60;
    document.getElementById('countdown').textContent =
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function updateAnalysis(items) {
    const sorted = [...items].sort((a, b) => b.changePercent - a.changePercent);

    document.getElementById('hot-items').innerHTML = sorted.slice(0, 5).map(item =>
        `<li><span>${escapeHTML(item.name)}</span><span class="up">+${item.changePercent.toFixed(2)}%</span></li>`
    ).join('');

    document.getElementById('cold-items').innerHTML = sorted.slice(-5).reverse().map(item =>
        `<li><span>${escapeHTML(item.name)}</span><span class="down">${item.changePercent.toFixed(2)}%</span></li>`
    ).join('');

    const avgChange = items.reduce((sum, i) => sum + i.changePercent, 0) / items.length;
    const weekly = i => (i.history[6] - i.history[0]) / i.history[0];
    const bestWeek = [...items].sort((a, b) => weekly(b) - weekly(a))[0];
    const worstWeek = [...items].sort((a, b) => weekly(a) - weekly(b))[0];

    document.getElementById('market-insights').innerHTML = `
        <li><span>Avg 24h Change:</span><span>${avgChange > 0 ? '+' : ''}${avgChange.toFixed(2)}%</span></li>
        <li><span>Best Week:</span><span>${escapeHTML(bestWeek.name)}</span></li>
        <li><span>Worst Week:</span><span>${escapeHTML(worstWeek.name)}</span></li>
    `;
}

const catLabel = item => MARKET_CATEGORIES[item.category] || item.category;

function filterAndSort(items) {
    let result = [...items];

    const searchTerm = document.getElementById('search-input').value.trim().toLowerCase();
    if (searchTerm) {
        result = result.filter(item => item.name.toLowerCase().includes(searchTerm));
    }

    const category = document.getElementById('category-filter').value;
    if (category !== 'all') {
        result = result.filter(item => item.category === category);
    }

    // Pathfinder's page adds a level filter (its items carry an item level)
    const level = document.getElementById('level-filter');
    if (level && level.value !== 'all') {
        const [lo, hi] = level.value.split('-').map(Number);
        result = result.filter(item => item.level >= lo && item.level <= hi);
    }

    switch (document.getElementById('sort-filter').value) {
        // Categories sort by the label the table shows, not the id (B948).
        case 'name':        result.sort((a, b) => a.name.localeCompare(b.name)); break;
        case 'name-desc':   result.sort((a, b) => b.name.localeCompare(a.name)); break;
        case 'category':    result.sort((a, b) => catLabel(a).localeCompare(catLabel(b)) || a.name.localeCompare(b.name)); break;
        case 'category-desc': result.sort((a, b) => catLabel(b).localeCompare(catLabel(a)) || a.name.localeCompare(b.name)); break;
        case 'base-low':    result.sort((a, b) => a.basePrice - b.basePrice || a.name.localeCompare(b.name)); break;
        case 'base-high':   result.sort((a, b) => b.basePrice - a.basePrice || a.name.localeCompare(b.name)); break;
        case 'price-low':   result.sort((a, b) => a.currentPrice - b.currentPrice); break;
        case 'price-high':  result.sort((a, b) => b.currentPrice - a.currentPrice); break;
        case 'change-up':   result.sort((a, b) => b.changePercent - a.changePercent); break;
        case 'change-down': result.sort((a, b) => a.changePercent - b.changePercent); break;
    }

    return result;
}

function renderList() {
    renderTable(filterAndSort(marketItems));
}

// Column headers set the sort dropdown, so the choice survives the next price update.
function sortTable(column) {
    const select = document.getElementById('sort-filter');
    const next = {
        name: select.value === 'name' ? 'name-desc' : 'name',
        category: select.value === 'category' ? 'category-desc' : 'category',
        basePrice: select.value === 'base-low' ? 'base-high' : 'base-low',
        currentPrice: select.value === 'price-low' ? 'price-high' : 'price-low',
        changePercent: select.value === 'change-up' ? 'change-down' : 'change-up',
    }[column];
    if (next) select.value = next;
    renderList();
}

// Recompute prices only when a new 15-minute slot starts; tick the countdown every second.
function tick() {
    const now = Date.now();   // one reading, so the slot and its prices agree (B950)
    const slot = marketSlotStart(now);
    if (slot !== marketSlot) {
        marketSlot = slot;
        marketItems = marketSnapshot(now);
        renderList();
        updateOverview(marketItems);
        updateAnalysis(marketItems);
    }
    updateCountdown(now);
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('year').textContent = new Date().getFullYear();

    const categorySelect = document.getElementById('category-filter');
    categorySelect.innerHTML = '<option value="all">All Categories</option>' +
        Object.entries(MARKET_CATEGORIES).map(([id, label]) => `<option value="${id}">${label}</option>`).join('');

    document.getElementById('search-input').addEventListener('input', renderList);
    categorySelect.addEventListener('change', renderList);
    const levelSelect = document.getElementById('level-filter');
    if (levelSelect) levelSelect.addEventListener('change', renderList);
    document.getElementById('sort-filter').addEventListener('change', renderList);

    tick();
    setInterval(tick, 1000);
});
