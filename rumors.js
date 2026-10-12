/* ============================================
   TAVERN RUMOR GENERATOR
   ============================================ */

let allRumors = { rumors: [] };
let currentCategory = 'all';
let recentRumors = [];
let baseCount = 0;   // rumors from rumors.json; reader-added ones come after and can't be shared
let currentIdx = -1;

// Rumor text can come from the reader (Contribute form), so never inject it raw.
function escapeHTML(text) {
    return String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// truth: 0-100 = percent true; null = unknown (quest hooks and reader-added rumors)
function truthLabel(truth) {
    return truth === null || truth === undefined ? 'Unknown' : `${truth}% True`;
}

// Load rumors from JSON
async function loadRumors() {
    try {
        const response = await fetch('rumors.json');
        allRumors = await response.json();
        baseCount = allRumors.rumors.length;
        console.log(`Loaded ${allRumors.rumors.length} rumors`);
    } catch (error) {
        console.error('Error loading rumors:', error);
        document.getElementById('rumor-display').innerHTML = 
            '<p style="color: #f44336;">Failed to load rumors. Check console.</p>';
    }
}

// Generate a random rumor
function generateRumor() {
    if (!allRumors.rumors.length) {
        document.getElementById('rumor-display').innerHTML = 
            '<p style="color: #f44336;">Rumors not loaded yet. Please wait...</p>';
        return;
    }

    // Deal from the category's deck (rumor-deck.js): no repeats until it runs out
    const deal = dealRumor(allRumors.rumors, baseCount, currentCategory, currentIdx);
    if (deal.idx < 0) return;
    currentIdx = deal.idx;
    const rumor = allRumors.rumors[currentIdx];
    updateDeckCount(deal.reshuffled);

    // Display rumor
    displayRumor(rumor);
    syncUrl(true);

    // Add to recent
    addToRecent(rumor);

    // Animate
    animateDisplay();
}

// ── Deck counter: "N of M left in the deck" ─────────────
function updateDeckCount(reshuffled) {
    const { left, total } = rumorDeckCount(allRumors.rumors, baseCount, currentCategory);
    if (!total) return;
    document.getElementById('deck-left').textContent = reshuffled
        ? `The deck ran dry, so the bard reshuffled. ${left} of ${total} left.`
        : left ? `${left} of ${total} rumors left in this deck.` : `All ${total} told. The next draw reshuffles the deck.`;
    document.getElementById('deck-count').hidden = false;
}

function reshuffleDeck() {
    reshuffleRumorDeck(baseCount, currentCategory);
    updateDeckCount();
}

// ── Shareable link: ?rumor=<index in rumors.json> ─────────
function syncUrl(push) {
    const shareable = currentIdx >= 0 && currentIdx < baseCount;
    // A reader-added rumor can't go in a link, so its history entry carries it instead.
    setUrlParams(shareable ? { rumor: currentIdx } : {}, push, shareable ? null : { reader: currentIdx });
    document.getElementById('rumor-link').hidden = !shareable;
}

// Show the rumor named in the address bar (or, on Back/Forward, a reader-added one kept
// in the history entry). Returns false when there isn't one.
function applyUrl() {
    const v = urlParams().get('rumor');
    let idx = /^\d+$/.test(v || '') ? Number(v) : -1;
    const shareable = idx >= 0 && idx < baseCount;
    if (!shareable) {
        // Reader rumors last until a refresh, so an older entry can point past the end.
        const reader = history.state && history.state.reader;
        if (v !== null || !Number.isInteger(reader) || reader < baseCount || !allRumors.rumors[reader]) return false;
        idx = reader;
    }
    currentIdx = idx;
    displayRumor(allRumors.rumors[idx]);
    document.getElementById('rumor-link').hidden = !shareable;
    animateDisplay();
    return true;
}

function copyLink() {
    const btn = document.getElementById('rumor-link');
    copyPageLink(ok => {
        btn.textContent = ok ? '✅ Link copied!' : '⚠️ Copy blocked';
        setTimeout(() => { btn.textContent = '🔗 Copy Link'; }, 2000);
    });
}

// Display rumor in the box
function displayRumor(rumor) {
    const categoryNames = {
        'local': '🏘️ Local Gossip',
        'politics': '👑 Politics',
        'economics': '💰 Economics',
        'adventures': '⚔️ Adventures',
        'monsters': '🐉 Monsters',
        'magic': '✨ Magic & Weird'
    };

    document.getElementById('rumor-display').innerHTML = `
        <div class="rumor-text">"${escapeHTML(rumor.text)}"</div>
        <div class="rumor-meta">
            <span class="category-tag">${categoryNames[rumor.category]}</span>
        </div>
    `;

    // Update truth meter
    updateTruthMeter(rumor.truth);
    showFollowup(rumor);
}

// Rumor chains: rumors.json entries carry a `followup` that pays the rumor off.
// It stays hidden until asked for; reader-added rumors have none.
function showFollowup(rumor) {
    const box = document.getElementById('rumor-next');
    const btn = document.getElementById('next-btn');
    const text = document.getElementById('next-text');
    box.hidden = !rumor.followup;
    text.hidden = true;
    btn.hidden = false;
    btn.setAttribute('aria-expanded', 'false');
    text.innerHTML = rumor.followup
        ? `<span class="next-when">A week later…</span>${escapeHTML(rumor.followup)}`
        : '';
}

function revealFollowup() {
    document.getElementById('next-text').hidden = false;
    const btn = document.getElementById('next-btn');
    btn.setAttribute('aria-expanded', 'true');
    btn.hidden = true;
}

// Update truth meter
function updateTruthMeter(truth) {
    const truthValue = document.getElementById('truth-value');
    const truthFill = document.getElementById('truth-fill');

    if (truth === null || truth === undefined) {
        truthValue.textContent = '??? (Roll Investigation)';
        truthValue.style.color = '';
        truthFill.style.width = '50%';
    } else {
        truthValue.textContent = `${truth}% True`;
        truthFill.style.width = `${truth}%`;

        // Color based on truth level
        if (truth < 30) {
            truthValue.style.color = '#f44336';
        } else if (truth < 70) {
            truthValue.style.color = '#ffeb3b';
        } else {
            truthValue.style.color = '#4caf50';
        }
    }
}

// Animate the display
function animateDisplay() {
    const display = document.getElementById('rumor-display');
    display.style.opacity = '0';
    display.style.transform = 'scale(0.95)';

    setTimeout(() => {
        display.style.transition = 'all 0.3s ease';
        display.style.opacity = '1';
        display.style.transform = 'scale(1)';
    }, 50);
}

// Add to recent list
function addToRecent(rumor) {
    recentRumors.unshift(rumor);
    if (recentRumors.length > 10) {
        recentRumors.pop();
    }
    renderRecent();
    saveRecent();
}

// Render recent list
function renderRecent() {
    const container = document.getElementById('recent-list');

    if (recentRumors.length === 0) {
        container.innerHTML = '<p style="color: #888; font-style: italic;">No rumors generated yet...</p>';
        return;
    }

    const categoryNames = {
        'local': '🏘️',
        'politics': '👑',
        'economics': '💰',
        'adventures': '⚔️',
        'monsters': '🐉',
        'magic': '✨'
    };

    container.innerHTML = recentRumors.map((rumor, index) => `
        <div class="recent-item">
            <p>"${escapeHTML(rumor.text)}"</p>
            <div class="meta">
                ${categoryNames[rumor.category] || ''} ${escapeHTML(rumor.category)} •
                ${truthLabel(rumor.truth)}
            </div>
        </div>
    `).join('');
}

// Clear recent history
function clearRecent() {
    recentRumors = [];
    renderRecent();
    try { localStorage.removeItem('tavern_recent_rumors'); } catch (e) {}
}

// Save to localStorage
function saveRecent() {
    try { localStorage.setItem('tavern_recent_rumors', JSON.stringify(recentRumors)); } catch (e) {}
}

// Load from localStorage
function loadRecent() {
    try {
        const saved = localStorage.getItem('tavern_recent_rumors');
        if (saved) {
            // Older saves used truth 0 for "unknown"
            recentRumors = JSON.parse(saved).map(r => r.truth === 0 ? { ...r, truth: null } : r);
            renderRecent();
        }
    } catch (e) {}
}

// Add custom rumor
function addRumor() {
    const text = document.getElementById('new-rumor-text').value.trim();
    const category = document.getElementById('new-rumor-category').value;

    const status = document.getElementById('new-rumor-status');
    if (!text) {
        status.textContent = 'The bard waits. Whisper something first.';
        return;
    }

    const newRumor = {
        text: text,
        category: category,
        truth: null // Unknown truth value
    };

    // Add to local array (not saved to JSON)
    allRumors.rumors.push(newRumor);

    // Clear input
    document.getElementById('new-rumor-text').value = '';

    addToRumorDecks(allRumors.rumors, baseCount, allRumors.rumors.length - 1);
    updateDeckCount();

    status.textContent = 'Added to tonight\'s mill. It can now come up when you draw rumors, until you refresh the page.';

    // Display it (reader-added rumors stay out of the URL)
    currentIdx = allRumors.rumors.length - 1;
    displayRumor(newRumor);
    syncUrl(true);
    addToRecent(newRumor);
}

// Category selection
function setupCategoryButtons() {
    const buttons = document.querySelectorAll('.category-btn');

    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active from all
            buttons.forEach(b => b.classList.remove('active'));
            // Add active to clicked
            btn.classList.add('active');
            // Set current category
            currentCategory = btn.dataset.category;
            updateDeckCount();
        });
    });
}

// Town crier banner (town-crier.js): a recent Gazette headline, shouted in-world
async function setupCrier() {
    let pool;
    try {
        ({ pool } = await loadCrierPool());
    } catch (error) {
        console.error('Error loading headlines:', error);
        return;
    }
    if (!pool.length) return;
    let current = null;
    const shout = () => {
        current = pickCrier(pool, current && current.id);
        document.getElementById('crier-shout').innerHTML =
            `<span class="crier-opener">${escapeHTML(current.opener)}</span> <a href="${crierHref(current.id)}">${escapeHTML(current.title)}</a>`;
    };
    document.getElementById('crier-again').addEventListener('click', shout);
    shout();
    document.getElementById('crier-banner').hidden = false;
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    document.getElementById('year').textContent = new Date().getFullYear();

    setupCrier();
    await loadRumors();
    loadRecent();
    setupCategoryButtons();
    document.getElementById('rumor-link').addEventListener('click', copyLink);
    document.getElementById('next-btn').addEventListener('click', revealFollowup);
    document.getElementById('deck-shuffle').addEventListener('click', reshuffleDeck);
    updateDeckCount();
    applyUrl();
    // Back/Forward step through earlier draws.
    window.addEventListener('popstate', applyUrl);
});
