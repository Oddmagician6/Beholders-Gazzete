/* ============================================================
   D&D 5E LOOT GENERATOR — Fixed & Comprehensive
   ============================================================ */

let currentLoot = null;
let currentTab  = 'individual';
// The Pathfinder page loads loot-pf2e.js: the same tabs, rolled by level from GM Core's treasure.
const LOOT_PF2E = typeof pf2eRollTreasure === 'function';
const LOOT_KEY = ruleKey('gazette_loot');

// Rolling logic lives in loot-engine.js (shared with the Session Kit).

// ── TAB SWITCHING ──────────────────────────────────────────
const LOOT_TABS = ['individual', 'hoard', 'magic', 'custom'];

function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.toggle('active', c.id === 'tab-' + tab));
  currentTab = tab;
}

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

// ── SHAREABLE LINK ─────────────────────────────────────────
// ?tab=hoard&hoard-cr=5-10&seed=… : the tab, its fields that differ from the
// defaults, and the seed (rng.js) rebuild the same treasure.
const tabFields = tab => [...document.querySelectorAll(`#tab-${tab} select, #tab-${tab} input`)];

function changedFields(tab) {
  return Object.fromEntries(tabFields(tab).filter(el => fieldValue(el) !== defaultValue(el)).map(el => [el.id, fieldValue(el)]));
}

function lootParams() {
  if (!currentLoot || !currentLoot.seed) return {};
  return { tab: currentLoot.tab === 'individual' ? null : currentLoot.tab, ...currentLoot.fields, seed: currentLoot.seed };
}

// Roll the treasure named in the address bar. Returns false when there's no seed in it.
function applyUrl(push) {
  const p = urlParams();
  const seed = parseSeed(p.get('seed'));
  if (!seed) return false;
  switchTab(LOOT_TABS.includes(p.get('tab')) ? p.get('tab') : 'individual');
  tabFields(currentTab).forEach(el => {
    if (!setFieldValue(el, p.get(el.id))) setFieldValue(el, defaultValue(el));
  });
  generateLoot(seed, push);
  return true;
}

function copyLink() {
  if (!currentLoot || !currentLoot.seed) { flashBtn('link-btn', '⚠️ Saved before links; reroll to share'); return; }
  copyPageLink(ok => flashBtn('link-btn', ok ? '✅ Link copied!' : '⚠️ Copy blocked'));
}

// ── HOMEBREW ITEMS (L4 D3) ─────────────────────────────────
// The 🧪 box shows once the notebook holds a homebrew item; ticking it is remembered in this browser.
const LOOT_HB_KEY = 'gazette_loot_homebrew';

function lootHomebrewOn() {
  const box = document.getElementById('hb-loot');
  return !!box && box.checked && typeof hbmItems !== 'undefined' && hbmItems.length > 0;
}

function setupLootHomebrew() {
  const row = document.getElementById('hb-loot-row'), box = document.getElementById('hb-loot');
  if (!row || typeof hbmOnChange !== 'function') return;
  const show = () => { row.hidden = LOOT_PF2E || !hbmItems.length; };
  try { box.checked = localStorage.getItem(LOOT_HB_KEY) === '1'; } catch (e) {}
  box.addEventListener('change', () => { try { localStorage.setItem(LOOT_HB_KEY, box.checked ? '1' : '0'); } catch (e) {} });
  show();
  hbmOnChange(show);
}

// ── MAIN GENERATE ──────────────────────────────────────────
// seed: replay a roll. push: true = new history entry, false = replace, null = leave the URL alone.
function generateLoot(seed = newSeed(), push = true) {
  let coins = { cp:0, sp:0, ep:0, gp:0, pp:0 };
  let gems  = [], art = [], magic = [];
  let magicNote = '';
  let found = null; // rollTreasure/decorateTreasure result: the treasure plus the find

  const luckSelect = { individual: 'ind-luck', hoard: 'hoard-luck' }[currentTab];
  const luck = (luckSelect && document.getElementById(luckSelect) || { value: 'normal' }).value;
  const luckMult = luck === 'generous' ? 1.5 : luck === 'stingy' ? 0.5 : 1;

  withSeed(seed, () => { if (LOOT_PF2E) { ({ found = null, magic = [], magicNote = '' } = pf2eGenerateTab(currentTab, luckMult)); return; } switch (currentTab) {

    case 'individual': {
      const cr = document.getElementById('ind-cr').value;
      found = rollTreasure('individual', cr, luckMult, true, document.getElementById('ind-source').value);
      break;
    }

    case 'hoard': {
      const cr  = document.getElementById('hoard-cr').value;
      const inc = document.getElementById('hoard-magic').value !== 'no';
      found = rollTreasure('hoard', cr, luckMult, inc, document.getElementById('hoard-source').value);
      break;
    }

    case 'magic': {
      const rarity = document.getElementById('magic-rarity').value;
      const mtype  = document.getElementById('magic-type').value;
      const cnt    = Math.min(20, Math.max(1, parseInt(document.getElementById('magic-count').value) || 1));
      // Pick from the pool already filtered by rarity and type, so you get exactly cnt items.
      magic = Array.from({ length: cnt }, () => getMagicItem(rarity, mtype)).filter(Boolean);
      magic.forEach(m => { const f = magicFlavor(m); if (f) m.flavor = f; });
      if (!magic.length) {
        const sel = id => document.getElementById(id).selectedOptions[0].textContent;
        magicNote = `The vault holds no ${sel('magic-type').toLowerCase()} items of ${rarity === 'random' ? 'any' : sel('magic-rarity').toLowerCase()} rarity. Try another combination.`;
      }
      break;
    }

    case 'custom': {
      const cr = document.getElementById('custom-cr').value;
      const t  = lootData.treasureTables.individual[cr];
      if (document.getElementById('custom-coins').checked) coins = generateCoins(t, luckMult);
      if (document.getElementById('custom-gems').checked)  gems  = generateGems(100, t.gemTier, [1,6], luckMult);
      if (document.getElementById('custom-art').checked)   art   = generateArt (100, t.artTier, [1,4], luckMult);
      if (document.getElementById('custom-magic').checked) {
        const cnt = lootRoll(1, 3);
        magic = generateMagicItems(t.magicTable, cnt);
      }
      found = decorateTreasure({ coins, gems, art, magic }, 'individual', cr,
        { luckMult, goods: document.getElementById('custom-goods').checked });
      break;
    }
  } });

  if (found) ({ coins, gems, art, magic } = found);
  // Homebrew items (homebrew-magic.js, opt-in): swapped in from a stream of their own, so the rest of the roll stays the same.
  if (!LOOT_PF2E && lootHomebrewOn()) {
    const mixed = hbmLootSwap(magic, seed, currentTab === 'magic' ? document.getElementById('magic-type').value : 'any');
    if (mixed !== magic && mixed.some(m => m.hb)) {
      magic = mixed;
      if (found) { found.magic = magic; found.totalValue = totalGP(coins, gems, art, magic, found.goods || []); }
    }
  }
  currentLoot = {
    ...(found || {}),
    coins, gems, art, magic, magicNote,
    totalValue: found ? found.totalValue : totalGP(coins, gems, art, magic),
    tab: currentTab,
    seed,
    fields: changedFields(currentTab),
    generatedAt: new Date().toISOString()
  };

  displayLoot();
  if (push !== null) setUrlParams(lootParams(), push);
}

// Pathfinder: the tab's fields are levels (ind-cr, hoard-cr, custom-cr hold a level there).
function pf2eGenerateTab(tab, luckMult) {
  const val = id => document.getElementById(id).value;
  if (tab === 'individual') return { found: pf2eRollTreasure('individual', Number(val('ind-cr')), { luckMult, source: val('ind-source') }) };
  if (tab === 'hoard') {
    return { found: pf2eRollTreasure('hoard', Number(val('hoard-cr')), {
      luckMult, source: val('hoard-source'), share: PF2E_SHARES[val('hoard-share')], items: val('hoard-magic') !== 'no', pcs: Number(val('hoard-pcs'))
    }) };
  }
  if (tab === 'magic') {
    const level = val('magic-level') === 'any' ? 'any' : Number(val('magic-level'));
    const cnt = Math.min(20, Math.max(1, parseInt(val('magic-count')) || 1));
    const magic = Array.from({ length: cnt }, () => pf2eRollItem(level, val('magic-type'), val('magic-rarity'))).filter(Boolean);
    magic.forEach(m => { const f = magicFlavor(m); if (f) m.flavor = f; });
    const sel = id => document.getElementById(id).selectedOptions[0].textContent.toLowerCase();
    return { magic, magicNote: magic.length ? '' : `The vault holds no ${sel('magic-type')} of ${sel('magic-rarity')} rarity at ${level === 'any' ? 'any level' : 'level ' + level} or below. Try another combination.` };
  }
  // Custom: a small find for the level, keeping only the parts that are ticked.
  const t = pf2eRollTreasure('hoard', Number(val('custom-cr')), { luckMult, share: 0.25, goods: document.getElementById('custom-goods').checked });
  const on = id => document.getElementById(id).checked;
  if (!on('custom-coins')) t.coins = { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 };
  if (!on('custom-gems')) t.gems = [];
  if (!on('custom-art')) t.art = [];
  if (!on('custom-magic')) t.magic = [];
  t.totalValue = totalGP(t.coins, t.gems, t.art, t.magic, t.goods);
  return { found: t };
}

// ── DISPLAY ────────────────────────────────────────────────
function displayLoot() {
  const loot = currentLoot;
  if (!loot) return;

  const el = document.getElementById('loot-display');
  el.style.display = 'block';

  // Summary
  const hasArtifact = loot.magic.some(m => m.rarity === 'artifact');
  document.getElementById('total-value').textContent  = hasArtifact && !loot.totalValue
    ? 'Priceless'
    : formatCoins(loot.totalValue) + (hasArtifact ? ' + priceless' : '');
  const coinSum = Object.values(loot.coins).reduce((a,b) => a+b, 0);
  document.getElementById('total-coins').textContent  = coinSum.toLocaleString();
  const goods = loot.goods || [], trinkets = loot.trinkets || [];
  document.getElementById('total-gems').textContent   = (loot.gems.length + loot.art.length + goods.length).toString();

  // The find: who carried it or where it lay, how it was kept, lock, trap, story (older saves have none)
  const find = lootFindLines(loot);
  document.getElementById('find-section').style.display = find.length ? 'block' : 'none';
  document.getElementById('find-list').innerHTML = find.map(([label, text]) =>
    `<div class="find-row${label === 'Trapped' ? ' find-trap' : ''}"><dt>${label}</dt><dd>${esc(text)}</dd></div>`).join('');
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
          <div class="coin-value">= ${formatCoins(amount * info.value)}</div>
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
        ${g.look ? `<p class="item-look">${esc(g.look)}</p>` : ''}
        <div class="item-value">💰 ${formatCoins(g.value)}</div>
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
        ${a.note ? `<p class="item-look">${esc(a.note)}</p>` : ''}
        <div class="item-value">💰 ${formatCoins(a.value)}</div>
      </div>`
    ).join('');
  }

  // Trade goods
  document.getElementById('goods-section').style.display = goods.length ? 'block' : 'none';
  if (goods.length) {
    document.getElementById('goods-grid').innerHTML = goods.map(g =>
      `<div class="item-card">
        <div class="item-header">
          <span class="item-name">${esc(g.name)}</span>
          <span class="item-rarity rarity-goods">Goods</span>
        </div>
        <div class="item-value">💰 ${formatCoins(g.value)}</div>
      </div>`
    ).join('');
  }

  // Magic
  document.getElementById('magic-section').style.display = loot.magic.length || loot.magicNote ? 'block' : 'none';
  if (!loot.magic.length && loot.magicNote) {
    document.getElementById('magic-grid').innerHTML =
      `<p style="color:var(--text-dim);font-style:italic;grid-column:1/-1;">${loot.magicNote}</p>`;
  }
  if (loot.magic.length) {
    document.getElementById('magic-grid').innerHTML = loot.magic.map(item => {
      const rarityClass = item.rarity === 'unique' ? 'legendary' : item.rarity.replace(' ', '-');
      const info = item.pf ? pf2eItemInfo(item.pf) : magicItemInfo(item.name);
      const kind = item.img || (item.type === 'wondrous' ? 'wondrous-item' : item.type);
      const holds = item.spell && typeof PF2E_SPELLS !== 'undefined' && PF2E_SPELLS[item.spell];
      const etched = item.on && PF2E_ITEMS[item.on] && PF2E_ITEMS[item.pf];
      return `<div class="magic-card">
        <div class="item-header">
          <span class="item-name">${esc(item.name)}${item.hb ? ' <span class="hb-tag">🧪 Homebrew</span>' : ''}</span>
          <span class="item-rarity rarity-${rarityClass}">${item.rarity}</span>
        </div>
        <img class="magic-art" src="img/item/${kind}.webp" alt="" width="72" height="72" loading="lazy" decoding="async">
        <div class="item-meta">
          <span class="item-type">${item.level !== undefined ? `Level ${item.level} · ` : ''}${item.type}</span>
          ${item.attune ? '<span class="attune-badge">⚡ Attunement</span>' : item.invested ? '<span class="attune-badge">⚡ Invested</span>' : ''}
        </div>
        ${etched ? `<p class="item-look">A ${esc(PF2E_ITEMS[item.pf].n.toLowerCase())} rune etched on a ${esc(PF2E_ITEMS[item.on].n.toLowerCase())}.</p>` : ''}
        ${holds ? `<p class="item-look">Holds <a href="pf2e/spell/${item.spell}">${esc(holds.n)}</a>.</p>` : ''}
        ${item.flavor ? `<p class="item-look">${esc(item.flavor)}</p>` : ''}
        <div class="item-value">${item.value > 0 ? '💰 ' + (item.pf ? formatCoins(item.value) : '~' + item.value.toLocaleString() + ' gp') : '✨ Priceless'}</div>
        ${info ? `<button type="button" class="item-toggle" aria-expanded="false" onclick="toggleItem(this)">Read item ▼</button>
        <div class="item-desc"><p class="item-srd-type">${esc(info.meta)}</p>${formatSrdText(info.text)}</div>` : ''}
      </div>`;
    }).join('');
  }

  // Cut-out cards for the SRD items (Feature & Item Cards page)
  const srd = LOOT_PF2E ? [] : [...new Set(loot.magic.map(m => magicItemInfo(m.name)).filter(Boolean).map(i => magicItemSlug(i.srdName)))];
  const cardsBtn = document.getElementById('cards-btn');
  cardsBtn.hidden = !srd.length;
  cardsBtn.href = 'dnd-character-cards?items=' + srd.slice(0, 40).join(',');

  // Odds and ends (no value)
  document.getElementById('trinkets-section').style.display = trinkets.length ? 'block' : 'none';
  document.getElementById('trinkets-list').innerHTML = trinkets.map(t => `<li>${esc(lootCap(t))}</li>`).join('');

  // Notes
  const noteEl = document.getElementById('loot-notes-content');
  if (noteEl) {
    noteEl.innerHTML = `
      <p><strong>Method:</strong> ${currentTab.charAt(0).toUpperCase() + currentTab.slice(1)} Treasure</p>
      <p><strong>Coins:</strong> ${coinSum.toLocaleString()} total pieces</p>
      <p><strong>Valuables:</strong> ${loot.gems.length} gems, ${loot.art.length} art objects${goods.length ? `, ${goods.length} lot${goods.length === 1 ? '' : 's'} of trade goods` : ''}</p>
      <p><strong>Magic Items:</strong> ${loot.magic.length} items found</p>
      <p><strong>Total Value:</strong> ${formatCoins(loot.totalValue)}${hasArtifact ? ' (plus artifacts, which have no market price)' : ''}</p>
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

// SRD text on a magic card (magic-items-data.js); the card spans the grid row while open.
function toggleItem(btn) {
  const open = btn.closest('.magic-card').classList.toggle('expanded');
  btn.textContent = open ? 'Show less ▲' : 'Read item ▼';
  btn.setAttribute('aria-expanded', open);
}

// ── ACTIONS ────────────────────────────────────────────────
function regenerateLoot() { generateLoot(); }

// Coins plus gems, art, and trade goods (what the party sells) go to the DM Toolbox splitter (F24).
function splitLoot() {
  if (!currentLoot) return;
  location.href = splitLink(currentLoot.coins, lootSellValue(currentLoot), lootPartySize());
}

function lootPartySize() {
  return partySize(document.getElementById('party-size').value);
}

function copyLoot() {
  if (!currentLoot) return;
  const { coins, gems, art, magic, totalValue } = currentLoot;
  const goods = currentLoot.goods || [], trinkets = currentLoot.trinkets || [];
  let txt = '🏆 TREASURE LOOT 🏆\n\n';
  const priceless = magic.some(m => m.rarity === 'artifact') ? ' + priceless artifact' : '';
  txt += `Total Value: ~${formatCoins(totalValue)}${priceless}\n`;
  // The same coins, gems, art, and goods the Split button sends (F29).
  const split = splitLine(coins, lootSellValue(currentLoot), lootPartySize());
  if (split) txt += `${split}${magic.length ? ' (magic items not included)' : ''}\n`;
  txt += '\n';

  const find = lootFindLines(currentLoot);
  if (find.length) txt += '📜 THE FIND:\n' + find.map(([label, text]) => `  ${label}: ${text}`).join('\n') + '\n\n';

  const coinLines = Object.entries(coins).filter(([,v]) => v > 0)
    .map(([t,v]) => `  ${v.toLocaleString()} ${lootData.coins[t].name}`).join('\n');
  if (coinLines) txt += `🪙 CURRENCY:\n${coinLines}\n\n`;

  if (gems.length) {
    txt += '💎 GEMS:\n' + gems.map(g => `  • ${g.name} (${formatCoins(g.value)})${g.look ? ': ' + g.look : ''}`).join('\n') + '\n\n';
  }
  if (art.length) {
    txt += '🎨 ART OBJECTS:\n' + art.map(a => `  • ${a.name} (${formatCoins(a.value)})${a.note ? '. ' + a.note : ''}`).join('\n') + '\n\n';
  }
  if (goods.length) {
    txt += '📦 TRADE GOODS:\n' + goods.map(g => `  • ${g.name} (${formatCoins(g.value)})`).join('\n') + '\n\n';
  }
  if (magic.length) {
    txt += (LOOT_PF2E ? '✨ ITEMS:\n' : '✨ MAGIC ITEMS:\n') + magic.map(m =>
      `  • ${m.name} [${m.level !== undefined ? `level ${m.level}, ` : ''}${m.rarity}]${m.attune ? ' (Attunement Required)' : m.invested ? ' (Invested)' : ''}${m.flavor ? '\n    ' + m.flavor : ''}`
    ).join('\n') + '\n\n';
  }
  if (trinkets.length) {
    txt += '🧷 ODDS & ENDS:\n' + trinkets.map(t => `  • ${lootCap(t)}`).join('\n') + '\n';
  }

  navigator.clipboard.writeText(txt)
    .then(() => flashBtn('copy-btn', '✅ Copied!'))
    .catch(() => alert('Copy failed — check browser permissions.'));
}

// Drop anything that isn't a saved hoard object, so a damaged save can't break the page.
function readLoot() {
  try {
    const saved = JSON.parse(localStorage.getItem(LOOT_KEY) || '[]');
    return Array.isArray(saved) ? saved.filter(l => l && typeof l === 'object' && !Array.isArray(l)) : [];
  } catch(e) { return []; }
}

function saveLoot() {
  if (!currentLoot) return;
  try {
    const saved = readLoot();
    saved.unshift(currentLoot);
    if (saved.length > 20) saved.pop();
    localStorage.setItem(LOOT_KEY, JSON.stringify(saved));
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
  const saved = readLoot();

  if (!saved.length) {
    container.innerHTML = '<p style="color:var(--text-dim);font-style:italic;text-align:center;padding:20px;">Your vault is empty, adventurer.</p>';
    return;
  }

  container.innerHTML = saved.map((loot, i) => `
    <div class="saved-item" onclick="loadSaved(${i})">
      <h4>Hoard #${i + 1} — ${formatCoins(loot.totalValue)}</h4>
      <p>${(loot.magic || []).length} magic · ${(loot.gems || []).length + (loot.art || []).length + (loot.goods || []).length} valuables · ${loot.tab}${LOOT_SOURCES[loot.source] ? ' · ' + LOOT_SOURCES[loot.source].label.toLowerCase() : ''}</p>
      <div class="saved-meta">${new Date(loot.generatedAt).toLocaleDateString()}</div>
    </div>
  `).join('');
}

function loadSaved(i) {
  try {
    const saved = readLoot();
    // A hoard saved before links has no seed; its history entry carries it instead.
    if (saved[i]) { currentLoot = saved[i]; displayLoot(); setUrlParams(lootParams(), true, currentLoot.seed ? null : { loot: currentLoot }); }
  } catch(e) {}
}

// Back/Forward onto an entry with no seed: a hoard saved before links, or the empty page.
function showUnlinkedLoot() {
  const loot = history.state && history.state.loot;
  if (loot && typeof loot === 'object') { currentLoot = loot; displayLoot(); return; }
  currentLoot = null;
  document.getElementById('loot-display').style.display = 'none';
}

function clearSaved() {
  if (confirm('Clear all saved treasure?')) {
    localStorage.removeItem(LOOT_KEY);
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

// Text from the tables goes into HTML.
function esc(s) {
  return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
}

// "Carried by" / "Found in" pickers: Random plus the sources in loot-engine.js.
function setupSourcePickers() {
  [['ind-source', 'individual'], ['hoard-source', 'hoard']].forEach(([id, kind]) => {
    const el = document.getElementById(id);
    lootSourcesFor(kind).forEach(([key, s]) => el.add(new Option(`${s.icon} ${s.label}`, key)));
  });
}

// ── INIT ───────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
  renderSaved();
  setupSourcePickers();
  setupLootHomebrew();
  // A system with no splitter page hides the button.
  if (!ruleLinkOk('toolbox?tab=split')) document.getElementById('split-btn').hidden = true;
  applyUrl(false);
  // Back/Forward step through earlier rolls.
  window.addEventListener('popstate', () => { if (!applyUrl(null)) showUnlinkedLoot(); });
});
