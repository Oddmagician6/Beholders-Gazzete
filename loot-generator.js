/* ============================================================
   D&D 5E LOOT GENERATOR — Fixed & Comprehensive
   ============================================================ */

let currentLoot = null;
let currentTab  = 'individual';

// ── UTILITIES ──────────────────────────────────────────────
const roll = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick  = arr => arr[Math.floor(Math.random() * arr.length)];
const d100  = ()   => roll(1, 100);

// Safely resolve a coin entry: [min,max] or 0
function resolveCoin(entry, multiplier = 1, luckMult = 1) {
  if (!entry || entry === 0) return 0;
  if (Array.isArray(entry)) return Math.floor(roll(entry[0], entry[1]) * multiplier * luckMult);
  return 0;
}

// ── TAB SWITCHING ──────────────────────────────────────────
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    const panel = document.getElementById('tab-' + btn.dataset.tab);
    if (panel) panel.classList.add('active');
    currentTab = btn.dataset.tab;
  });
});

// ── COIN GENERATION ────────────────────────────────────────
function generateCoins(table, luckMult = 1) {
  const cpMult = table.cpMult || 1;
  const spMult = table.spMult || 1;
  const gpMult = table.gpMult || 1;
  const ppMult = table.ppMult || 1;
  return {
    cp: resolveCoin(table.cp, cpMult, luckMult),
    sp: resolveCoin(table.sp, spMult, luckMult),
    ep: resolveCoin(table.ep, 1,      luckMult),
    gp: resolveCoin(table.gp, gpMult, luckMult),
    pp: resolveCoin(table.pp, ppMult, luckMult)
  };
}

// ── GEM GENERATION ─────────────────────────────────────────
function generateGems(chance, tier, countRange, luckMult = 1) {
  if (d100() > chance) return [];
  const count = Math.max(1, Math.floor(roll(countRange[0], countRange[1]) * luckMult));
  const pool  = lootData.gems[tier] || lootData.gems['10'];
  const value = parseInt(tier);
  return Array.from({ length: count }, () => ({
    name: pick(pool), value, type: 'gem'
  }));
}

// ── ART GENERATION ─────────────────────────────────────────
function generateArt(chance, tier, countRange, luckMult = 1) {
  if (d100() > chance) return [];
  const count = Math.max(1, Math.floor(roll(countRange[0], countRange[1]) * luckMult));
  const pool  = lootData.art[tier] || lootData.art['25'];
  const value = parseInt(tier);
  return Array.from({ length: count }, () => ({
    name: pick(pool), value, type: 'art'
  }));
}

// ── MAGIC ITEM GENERATION ──────────────────────────────────
function getMagicItem(rarity) {
  if (rarity === 'random') {
    const r = d100();
    if (r <= 30)      rarity = 'common';
    else if (r <= 55) rarity = 'uncommon';
    else if (r <= 75) rarity = 'rare';
    else if (r <= 90) rarity = 'very-rare';
    else if (r <= 98) rarity = 'legendary';
    else              rarity = 'artifact';
  }
  const pool = lootData.magicItems[rarity] || lootData.magicItems.uncommon;
  const item = pick(pool);
  return {
    name:      item.name,
    rarity,
    type:      item.type,
    attune:    item.attune || false,
    value:     magicItemGP(rarity)
  };
}

function generateMagicItems(tableCode, count = 1) {
  const rarity = lootData.magicTables[tableCode] || 'uncommon';
  return Array.from({ length: count }, () => getMagicItem(rarity));
}

function magicItemGP(rarity) {
  return { common:100, uncommon:500, rare:5000, 'very-rare':50000, legendary:500000, artifact:0 }[rarity] || 0;
}

// ── TOTAL VALUE ────────────────────────────────────────────
function totalGP(coins, gems, art, magic) {
  let t = 0;
  t += (coins.cp || 0) * 0.01;
  t += (coins.sp || 0) * 0.1;
  t += (coins.ep || 0) * 0.5;
  t += (coins.gp || 0);
  t += (coins.pp || 0) * 10;
  gems.forEach(g  => t += g.value);
  art.forEach(a   => t += a.value);
  magic.forEach(m => t += m.value);
  return Math.floor(t);
}

// ── MAIN GENERATE ──────────────────────────────────────────
function generateLoot() {
  let coins = { cp:0, sp:0, ep:0, gp:0, pp:0 };
  let gems  = [], art = [], magic = [];

  const luck = (document.getElementById('ind-luck')
    || document.getElementById('hoard-luck')
    || { value: 'normal' }).value;
  const luckMult = luck === 'generous' ? 1.5 : luck === 'stingy' ? 0.5 : 1;

  switch (currentTab) {

    case 'individual': {
      const cr    = document.getElementById('ind-cr').value;
      const t     = lootData.treasureTables.individual[cr];
      coins = generateCoins(t, luckMult);
      gems  = d100() <= t.gemChance   ? generateGems(100, t.gemTier,  [2,6],  luckMult) : [];
      art   = d100() <= t.artChance   ? generateArt (100, t.artTier,  [1,4],  luckMult) : [];
      if (d100() <= t.magicChance) magic = generateMagicItems(t.magicTable, 1);
      break;
    }

    case 'hoard': {
      const cr   = document.getElementById('hoard-cr').value;
      const t    = lootData.treasureTables.hoard[cr];
      const inc  = document.getElementById('hoard-magic').value !== 'no';
      coins = generateCoins(t, luckMult);
      gems  = generateGems(t.gemChance, t.gemTier, [2, 8], luckMult);
      art   = generateArt (t.artChance, t.artTier, [1, 6], luckMult);
      if (inc && d100() <= t.magicChance) {
        const cnt = roll(t.magicCount[0], t.magicCount[1]);
        magic = generateMagicItems(t.magicTable, cnt);
      }
      break;
    }

    case 'magic': {
      const rarity = document.getElementById('magic-rarity').value;
      const mtype  = document.getElementById('magic-type').value;
      const cnt    = Math.min(20, Math.max(1, parseInt(document.getElementById('magic-count').value) || 1));
      magic = Array.from({ length: cnt }, () => getMagicItem(rarity));
      if (mtype !== 'any') magic = magic.filter(m => m.type === mtype);
      if (!magic.length)   magic = [getMagicItem(rarity)]; // always show something
      break;
    }

    case 'custom': {
      const cr = document.getElementById('custom-cr').value;
      const t  = lootData.treasureTables.individual[cr];
      if (document.getElementById('custom-coins').checked) coins = generateCoins(t, luckMult);
      if (document.getElementById('custom-gems').checked)  gems  = generateGems(100, t.gemTier, [1,6], luckMult);
      if (document.getElementById('custom-art').checked)   art   = generateArt (100, t.artTier, [1,4], luckMult);
      if (document.getElementById('custom-magic').checked) {
        const cnt = roll(1, 3);
        magic = generateMagicItems(t.magicTable, cnt);
      }
      break;
    }
  }

  currentLoot = {
    coins, gems, art, magic,
    totalValue: totalGP(coins, gems, art, magic),
    tab: currentTab,
    generatedAt: new Date().toISOString()
  };

  displayLoot();
}

// ── DISPLAY ────────────────────────────────────────────────
function displayLoot() {
  const loot = currentLoot;
  if (!loot) return;

  const el = document.getElementById('loot-display');
  el.style.display = 'block';

  // Summary
  document.getElementById('total-value').textContent  = loot.totalValue.toLocaleString() + ' gp';
  const coinSum = Object.values(loot.coins).reduce((a,b) => a+b, 0);
  document.getElementById('total-coins').textContent  = coinSum.toLocaleString();
  document.getElementById('total-gems').textContent   = (loot.gems.length + loot.art.length).toString();
  document.getElementById('total-magic').textContent  = loot.magic.length.toString();

  // Coins
  const hasCoins = coinSum > 0;
  document.getElementById('coins-section').style.display = hasCoins ? 'block' : 'none';
  if (hasCoins) {
    document.getElementById('coins-grid').innerHTML = Object.entries(loot.coins)
      .filter(([,v]) => v > 0)
      .map(([type, amount]) => {
        const info = lootData.coins[type];
        return `<div class="coin-box">
          <div class="coin-icon">${info.icon}</div>
          <div class="coin-amount">${amount.toLocaleString()}</div>
          <div class="coin-type">${info.name}</div>
          <div class="coin-value">= ${(amount * info.value).toFixed(1)} gp</div>
        </div>`;
      }).join('');
  }

  // Gems
  document.getElementById('gems-section').style.display = loot.gems.length ? 'block' : 'none';
  if (loot.gems.length) {
    document.getElementById('gems-grid').innerHTML = loot.gems.map(g =>
      `<div class="item-card">
        <div class="item-header">
          <span class="item-name">${g.name}</span>
          <span class="item-rarity rarity-common">Gem</span>
        </div>
        <div class="item-value">💰 ${g.value.toLocaleString()} gp</div>
      </div>`
    ).join('');
  }

  // Art
  document.getElementById('art-section').style.display = loot.art.length ? 'block' : 'none';
  if (loot.art.length) {
    document.getElementById('art-grid').innerHTML = loot.art.map(a =>
      `<div class="item-card">
        <div class="item-header">
          <span class="item-name">${a.name}</span>
          <span class="item-rarity rarity-uncommon">Art</span>
        </div>
        <div class="item-value">💰 ${a.value.toLocaleString()} gp</div>
      </div>`
    ).join('');
  }

  // Magic
  document.getElementById('magic-section').style.display = loot.magic.length ? 'block' : 'none';
  if (loot.magic.length) {
    document.getElementById('magic-grid').innerHTML = loot.magic.map(item => {
      const rarityClass = item.rarity.replace(' ', '-');
      return `<div class="magic-card">
        <div class="item-header">
          <span class="item-name">${item.name}</span>
          <span class="item-rarity rarity-${rarityClass}">${item.rarity}</span>
        </div>
        <div class="item-meta">
          <span class="item-type">${item.type}</span>
          ${item.attune ? '<span class="attune-badge">⚡ Attunement</span>' : ''}
        </div>
        <div class="item-value">${item.value > 0 ? '💰 ~' + item.value.toLocaleString() + ' gp' : '✨ Priceless'}</div>
      </div>`;
    }).join('');
  }

  // Notes
  const noteEl = document.getElementById('loot-notes-content');
  if (noteEl) {
    noteEl.innerHTML = `
      <p><strong>Method:</strong> ${currentTab.charAt(0).toUpperCase() + currentTab.slice(1)} Treasure</p>
      <p><strong>Coins:</strong> ${coinSum.toLocaleString()} total pieces</p>
      <p><strong>Valuables:</strong> ${loot.gems.length} gems, ${loot.art.length} art objects</p>
      <p><strong>Magic Items:</strong> ${loot.magic.length} items found</p>
      <p><strong>Total GP Equivalent:</strong> ${loot.totalValue.toLocaleString()} gp</p>
    `;
  }

  // Animate
  el.style.opacity = '0';
  el.style.transform = 'translateY(20px)';
  requestAnimationFrame(() => {
    el.style.transition = 'all 0.45s ease';
    el.style.opacity = '1';
    el.style.transform = 'translateY(0)';
  });

  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── ACTIONS ────────────────────────────────────────────────
function regenerateLoot() { generateLoot(); }

function copyLoot() {
  if (!currentLoot) return;
  const { coins, gems, art, magic, totalValue } = currentLoot;
  let txt = '🏆 TREASURE LOOT 🏆\n\n';
  txt += `Total Value: ~${totalValue.toLocaleString()} gp\n\n`;

  const coinLines = Object.entries(coins).filter(([,v]) => v > 0)
    .map(([t,v]) => `  ${v.toLocaleString()} ${lootData.coins[t].name}`).join('\n');
  if (coinLines) txt += `🪙 CURRENCY:\n${coinLines}\n\n`;

  if (gems.length) {
    txt += '💎 GEMS:\n' + gems.map(g => `  • ${g.name} (${g.value} gp)`).join('\n') + '\n\n';
  }
  if (art.length) {
    txt += '🎨 ART OBJECTS:\n' + art.map(a => `  • ${a.name} (${a.value} gp)`).join('\n') + '\n\n';
  }
  if (magic.length) {
    txt += '✨ MAGIC ITEMS:\n' + magic.map(m =>
      `  • ${m.name} [${m.rarity}]${m.attune ? ' (Attunement Required)' : ''}`
    ).join('\n') + '\n';
  }

  navigator.clipboard.writeText(txt)
    .then(() => flashBtn('copy-btn', '✅ Copied!'))
    .catch(() => alert('Copy failed — check browser permissions.'));
}

function saveLoot() {
  if (!currentLoot) return;
  try {
    const saved = JSON.parse(localStorage.getItem('gazette_loot') || '[]');
    saved.unshift(currentLoot);
    if (saved.length > 20) saved.pop();
    localStorage.setItem('gazette_loot', JSON.stringify(saved));
    renderSaved();
    flashBtn('save-btn', '✅ Saved!');
  } catch(e) { console.error(e); }
}

function exportLoot() {
  if (!currentLoot) return;
  const blob = new Blob([JSON.stringify(currentLoot, null, 2)], { type: 'application/json' });
  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(blob);
  a.download = `loot-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function renderSaved() {
  const container = document.getElementById('saved-list');
  let saved = [];
  try { saved = JSON.parse(localStorage.getItem('gazette_loot') || '[]'); } catch(e) {}

  if (!saved.length) {
    container.innerHTML = '<p style="color:var(--text-dim);font-style:italic;text-align:center;padding:20px;">Your vault is empty, adventurer.</p>';
    return;
  }

  container.innerHTML = saved.map((loot, i) => `
    <div class="saved-item" onclick="loadSaved(${i})">
      <h4>Hoard #${i + 1} — ${loot.totalValue.toLocaleString()} gp</h4>
      <p>${loot.magic.length} magic · ${loot.gems.length + loot.art.length} valuables · ${loot.tab}</p>
      <div class="saved-meta">${new Date(loot.generatedAt).toLocaleDateString()}</div>
    </div>
  `).join('');
}

function loadSaved(i) {
  try {
    const saved = JSON.parse(localStorage.getItem('gazette_loot') || '[]');
    if (saved[i]) { currentLoot = saved[i]; displayLoot(); }
  } catch(e) {}
}

function clearSaved() {
  if (confirm('Clear all saved treasure?')) {
    localStorage.removeItem('gazette_loot');
    renderSaved();
  }
}

function flashBtn(id, text) {
  const btn = document.getElementById(id);
  if (!btn) return;
  const orig = btn.textContent;
  btn.textContent = text;
  setTimeout(() => btn.textContent = orig, 2000);
}

// ── KEYBOARD SHORTCUT ──────────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.code === 'Space' && !['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName)) {
    e.preventDefault();
    generateLoot();
  }
});

// ── INIT ───────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
  renderSaved();
});
