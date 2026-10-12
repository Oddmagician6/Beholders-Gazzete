/* ============================================
   DM TOOLBOX: AT THE TABLE (F23)
   Dice tab: formula roller, advantage/disadvantage, ability scores, and the
   shared roll history (dice-engine.js).
   Initiative tab: the fight, kept in localStorage INIT_KEY so a refresh keeps it.
   A combatant that is an SRD monster (sent from the Encounter tab, or added by its
   name) keeps its monster id and opens its stat block (toolbox-statblock.js).
   Loads after toolbox.js (uses its esc() and flash()).
   ============================================ */

const INIT_KEY = 'gazette-initiative';
const INIT_FOLLOW_KEY = 'gazette-init-follow';
const INIT_MAX = 40;
const SRD_CONDITIONS = ['Blinded', 'Charmed', 'Deafened', 'Exhaustion', 'Frightened', 'Grappled', 'Incapacitated',
    'Invisible', 'Paralyzed', 'Petrified', 'Poisoned', 'Prone', 'Restrained', 'Stunned', 'Unconscious'];

// Two clicks: the first arms the button for a few seconds.
function armedClick(btn, label, action) {
    if (!btn.dataset.armed) {
        btn.dataset.armed = '1';
        btn.textContent = '⚠️ Click again';
        btn._t = setTimeout(() => { delete btn.dataset.armed; btn.textContent = label; }, 3000);
        return;
    }
    clearTimeout(btn._t);
    delete btn.dataset.armed;
    btn.textContent = label;
    action();
}

// ── Dice ──────────────────────────────────────────────────
function diceMode() {
    const on = document.querySelector('input[name="dice-mode"]:checked');
    return on ? on.value : 'normal';
}

function critBadge(crit) {
    return crit === 'nat20' ? '<span class="dice-crit hit">Natural 20!</span>'
        : crit === 'nat1' ? '<span class="dice-crit miss">Natural 1</span>' : '';
}

function rollFormula(formula, mode = diceMode()) {
    const out = document.getElementById('dice-result');
    try {
        const r = rollAndRecord(formula, mode);
        document.getElementById('dice-formula').value = r.formula;
        out.innerHTML = `
            <div class="dice-total">${r.total}</div>
            <div class="dice-detail">${esc(diceDetail(r))}${r.mode !== 'normal' ? ` · ${diceModeLabel(r.mode)}` : ''} ${critBadge(r.crit)}</div>
            ${r.note ? `<div class="dice-note">${esc(r.note)}</div>` : ''}`;
    } catch (err) {
        out.innerHTML = `<div class="dice-note">⚠️ ${esc(err.message)}</div>`;
    }
}

function abilityMod(score) {
    const m = Math.floor((score - 10) / 2);
    return m >= 0 ? '+' + m : '−' + -m;
}

// Six ability scores (4d6, keep the highest 3), saved as one history entry.
function rollStats() {
    const rolls = Array.from({ length: 6 }, () => rollDice('4d6kh3'));
    const scores = rolls.map(r => r.total);
    saveDiceHistory([{ f: '4d6kh3', stats: true, label: 'Ability scores', mode: 'normal', total: scores.reduce((a, b) => a + b, 0),
        detail: scores.join(', '), crit: null, t: Date.now() }, ...loadDiceHistory()]);
    document.getElementById('dice-result').innerHTML = `
        <div class="dice-stats">${rolls.map(r => `<div><b>${r.total}</b><small>${abilityMod(r.total)}<br>${esc(diceDetail(r).replace(/^4d6kh3 /, ''))}</small></div>`).join('')}</div>
        <div class="dice-note">Six ability scores, 4d6 keep the highest 3 each. Total ${scores.reduce((a, b) => a + b, 0)}.</div>`;
}

function renderDiceHistory() {
    const list = loadDiceHistory();
    document.getElementById('dice-count').textContent = list.length;
    document.getElementById('dice-empty').hidden = list.length > 0;
    document.getElementById('dice-log').innerHTML = list.map((h, i) => {
        const time = new Date(h.t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const what = (h.label ? `${h.label} (${h.f})` : h.f) + (h.mode && h.mode !== 'normal' ? `, ${diceModeLabel(h.mode)}` : '');
        return `<li><button type="button" data-i="${i}" title="Roll this again">
            <time>${esc(time)}</time>
            <span class="dl-what">${esc(what)} ${critBadge(h.crit)}<small>${esc(h.detail || '')}</small></span>
            <b>${h.total}</b>
        </button></li>`;
    }).join('');
}

function setupDice() {
    document.getElementById('dice-form').addEventListener('submit', e => {
        e.preventDefault();
        rollFormula(document.getElementById('dice-formula').value);
    });
    document.getElementById('dice-quick').addEventListener('click', e => {
        const b = e.target.closest('button');
        if (!b) return;
        if (b.dataset.stats) rollStats();
        else rollFormula(b.dataset.f);
    });
    document.getElementById('dice-log').addEventListener('click', e => {
        const b = e.target.closest('button[data-i]');
        const h = b && loadDiceHistory()[Number(b.dataset.i)];
        if (!h) return;
        if (h.stats) rollStats();
        else rollFormula(h.f, h.mode || 'normal');
    });
    const clear = document.getElementById('dice-clear');
    clear.addEventListener('click', () => {
        if (!loadDiceHistory().length) return;
        armedClick(clear, '🧹 Clear', () => { clearDiceHistory(); document.getElementById('dice-result').innerHTML = ''; });
    });
    const fabBox = document.getElementById('dice-fab-on');
    const syncFabBox = () => {
        try { fabBox.checked = localStorage.getItem(DICE_FAB_KEY) !== 'off'; } catch (e) {}
    };
    syncFabBox();
    fabBox.addEventListener('change', () => window.setDiceFab && window.setDiceFab(fabBox.checked));
    window.addEventListener('gazette-dice-fab', syncFabBox);
    window.addEventListener('gazette-dice', renderDiceHistory);
    renderDiceHistory();
}

// ── Initiative ────────────────────────────────────────────
let fight = { round: 1, turn: null, nextId: 1, list: [] };
let openConds = null;   // id whose condition menu is open, kept across re-renders
let openBlocks = new Set();   // ids whose stat block is open (this page only)
let autoBlock = null;   // the id whose block opened because its turn came up

function monsterNamed(name) {
    const key = name.replace(/\s+\d+$/, '').toLowerCase();
    return MONSTERS.find(m => m.name.toLowerCase() === key) || null;
}

function followTurns() {
    try { return localStorage.getItem(INIT_FOLLOW_KEY) !== 'off'; } catch (e) { return true; }
}

function num(v) {
    return v === '' || v === null || v === undefined || !isFinite(Number(v)) ? null : Math.round(Number(v));
}

function loadFight() {
    try {
        const saved = JSON.parse(localStorage.getItem(INIT_KEY));
        if (saved && Array.isArray(saved.list)) {
            const list = saved.list.filter(c => c && typeof c.name === 'string' && typeof c.id === 'number').map(c => ({
                id: c.id, name: c.name.slice(0, 40), init: num(c.init) ?? 0, mod: num(c.mod) ?? 0,
                hp: num(c.hp), max: num(c.max), ac: num(c.ac),
                monster: typeof c.monster === 'string' && Object.hasOwn(MONSTER_BY_ID, c.monster) ? c.monster : null,
                conds: Array.isArray(c.conds) ? c.conds.filter(x => SRD_CONDITIONS.includes(x)) : []
            }));
            fight = {
                round: Math.max(1, num(saved.round) || 1),
                turn: list.some(c => c.id === saved.turn) ? saved.turn : null,
                nextId: Math.max(num(saved.nextId) || 1, ...list.map(c => c.id + 1)),
                list
            };
        }
    } catch (e) {}
    sortFight();
}

function saveFight() {
    try { localStorage.setItem(INIT_KEY, JSON.stringify(fight)); } catch (e) {}
}

function sortFight() {
    fight.list.sort((a, b) => b.init - a.init || b.mod - a.mod || a.id - b.id);
}

function rollInit(mod) {
    return rollDie(20) + mod;
}

// Adds count combatants (numbered when more than one) and returns them; [] when the tracker is full.
// Also used by the Encounter tab (toolbox-encounter.js). The caller saves and renders.
function addToFight({ name, mod = 0, fixed = null, hp = null, ac = null, count = 1, monster = null }) {
    count = Math.min(count, INIT_MAX - fight.list.length);
    if (count < 1) return [];
    // Numbering carries on from any "Goblin 2" already in the fight.
    const base = name.replace(/\s+\d+$/, '');
    const taken = fight.list.map(c => c.name.match(new RegExp('^' + base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ' (\\d+)$', 'i'))).filter(Boolean).map(m => Number(m[1]));
    let n = taken.length ? Math.max(...taken) : 0;
    const added = [];
    for (let i = 0; i < count; i++) {
        const c = {
            id: fight.nextId++, name: count > 1 || taken.length ? `${base} ${++n}` : name,
            init: fixed !== null && count === 1 ? fixed : rollInit(mod), mod,
            hp: hp !== null ? Math.max(0, hp) : null, max: hp !== null ? Math.max(0, hp) : null, ac, monster, conds: []
        };
        fight.list.push(c);
        added.push(c);
    }
    return added;
}

function addCombatants(e) {
    e.preventDefault();
    const v = id => document.getElementById(id).value;
    const name = v('ia-name').trim().replace(/\s+/g, ' ').slice(0, 36);
    if (!name) return;
    // An SRD monster's name brings its stat block, and fills a blank HP or AC and a bonus left at 0.
    const m = monsterNamed(name);
    const mod = num(v('ia-mod')) ?? 0;
    const added = addToFight({
        name, mod: Math.max(-10, Math.min(20, m && mod === 0 ? m.dex : mod)), fixed: num(v('ia-init')),
        hp: num(v('ia-hp')) ?? (m ? m.hp : null), ac: num(v('ia-ac')) ?? (m ? m.ac : null),
        count: Math.max(1, Math.min(20, num(v('ia-count')) ?? 1)), monster: m ? m.id : null
    });
    if (!added.length) { flash('init-status', `⚠️ The tracker holds ${INIT_MAX} combatants.`); return; }
    sortFight();
    saveFight();
    renderFight();
    flash('init-status', (added.length === 1 ? `➕ ${added[0].name} rolls in at ${added[0].init}.` : `➕ Added ${added.length}: ${added.map(c => `${c.name} (${c.init})`).join(', ')}.`)
        + (m ? ' 📜 Click the name for its stat block.' : ''));
    document.getElementById('ia-name').value = '';
    document.getElementById('ia-mod').value = '0';
    document.getElementById('ia-init').value = '';
    document.getElementById('ia-hp').value = '';
    document.getElementById('ia-ac').value = '';
    document.getElementById('ia-count').value = '1';
    document.getElementById('ia-name').focus();
}

function current() {
    return fight.list.findIndex(c => c.id === fight.turn);
}

// With "follow" on, the monster whose turn it is shows its stat block; the one the turn
// left closes again unless it was opened by hand.
function followTurn() {
    if (autoBlock !== null) openBlocks.delete(autoBlock);
    autoBlock = null;
    const c = fight.list.find(x => x.id === fight.turn);
    if (!followTurns() || !c || !c.monster || openBlocks.has(c.id)) return;
    openBlocks.add(c.id);
    autoBlock = c.id;
}

function nextTurn() {
    if (!fight.list.length) return;
    const i = current();
    if (i < 0) fight.turn = fight.list[0].id;
    else if (i === fight.list.length - 1) { fight.turn = fight.list[0].id; fight.round++; }
    else fight.turn = fight.list[i + 1].id;
    saveFight();
    followTurn();
    renderFight(true);
}

function prevTurn() {
    const i = current();
    if (i < 0) return;
    if (i > 0) fight.turn = fight.list[i - 1].id;
    else if (fight.round > 1) { fight.round--; fight.turn = fight.list[fight.list.length - 1].id; }
    else fight.turn = null;
    saveFight();
    followTurn();
    renderFight(true);
}

function toggleFightBlock(id) {
    if (!openBlocks.delete(id)) openBlocks.add(id);
    if (autoBlock === id) autoBlock = null;
    renderFight();
}

function removeCombatant(id) {
    const i = fight.list.findIndex(c => c.id === id);
    if (i < 0) return;
    if (fight.turn === id) {
        // The turn passes to whoever was next.
        const next = fight.list[i + 1] || fight.list[0];
        if (!fight.list[i + 1] && fight.list.length > 1) fight.round++;
        fight.turn = next && next.id !== id ? next.id : null;
    }
    fight.list.splice(i, 1);
    openBlocks.delete(id);
    if (!fight.list.length) { fight.round = 1; fight.turn = null; }
    saveFight();
    followTurn();
    renderFight();
}

function changeHp(id, sign) {
    const c = fight.list.find(x => x.id === id);
    const box = document.querySelector(`.hp-amt[data-id="${id}"]`);
    const amt = Math.abs(num(box && box.value) ?? 0);
    if (!c) return;
    if (c.hp === null) { flash('init-status', `${c.name} has no HP tracked. Add them again with HP to track it.`); return; }
    if (!amt) { flash('init-status', 'Type an amount in the HP box first.'); if (box) box.focus(); return; }
    c.hp = sign < 0 ? Math.max(0, c.hp - amt) : Math.min(c.max ?? Infinity, c.hp + amt);
    saveFight();
    renderFight();
    flash('init-status', sign < 0 ? `🩸 ${c.name} takes ${amt}${c.hp === 0 ? ' and falls' : ''}.` : `💚 ${c.name} heals ${amt}.`);
    const again = document.querySelector(`.hp-amt[data-id="${id}"]`);
    if (again) again.focus();
}

function toggleCond(id, cond) {
    const c = fight.list.find(x => x.id === id);
    if (!c) return;
    c.conds = c.conds.includes(cond) ? c.conds.filter(x => x !== cond) : [...c.conds, cond].sort();
    saveFight();
    renderFight();
}

function renderFight(scroll = false) {
    const list = document.getElementById('init-list');
    document.getElementById('init-empty').hidden = fight.list.length > 0;
    document.getElementById('init-round').textContent = fight.turn === null ? (fight.list.length ? 'Ready' : '') : `Round ${fight.round}`;
    document.getElementById('init-next').textContent = fight.turn === null ? '⚔️ Start Combat' : 'Next Turn ▶';
    document.getElementById('init-next').disabled = !fight.list.length;
    document.getElementById('init-prev').disabled = fight.turn === null;
    list.innerHTML = fight.list.map(c => {
        const down = c.hp !== null && c.hp <= 0;
        const low = c.hp !== null && c.max && c.hp > 0 && c.hp <= c.max / 2;
        return `<li class="init-row${c.id === fight.turn ? ' current' : ''}${down ? ' down' : ''}" data-id="${c.id}"${c.id === fight.turn ? ' aria-current="true"' : ''}>
            <div class="init-score"><input type="number" class="init-val" data-id="${c.id}" value="${c.init}" min="-10" max="50" aria-label="Initiative for ${esc(c.name)}"></div>
            <div class="init-main">
                <div class="init-top">
                    ${c.monster ? `<button type="button" class="sb-toggle" data-act="sb" data-id="${c.id}" aria-expanded="${openBlocks.has(c.id)}" title="Show or hide the stat block"><span class="init-who sb-name">${esc(c.name)}</span> <span class="sb-hint" aria-hidden="true">📜</span></button>`
                        : `<span class="init-who">${esc(c.name)}</span>`}
                    <span class="init-meta">${c.ac !== null ? `🛡️ AC ${c.ac} · ` : ''}bonus ${c.mod >= 0 ? '+' + c.mod : '−' + -c.mod}${down ? ' · 💀 down' : ''}</span>
                </div>
                <div class="init-conds">
                    ${c.conds.map(k => `<button type="button" class="init-cond" data-id="${c.id}" data-cond="${k}" title="Remove ${k}">${k} ✕</button>`).join('')}
                    <details class="init-cond-add" data-id="${c.id}"${openConds === c.id ? ' open' : ''}>
                        <summary>+ condition</summary>
                        <div class="init-cond-menu">${SRD_CONDITIONS.map(k => `<button type="button" data-id="${c.id}" data-cond="${k}" class="${c.conds.includes(k) ? 'on' : ''}" aria-pressed="${c.conds.includes(k)}">${k}</button>`).join('')}</div>
                    </details>
                </div>
            </div>
            <div class="init-hp">
                ${c.hp === null ? '<span title="No HP tracked">HP —</span>' : `
                <span><span class="hp-now${low || down ? ' hp-low' : ''}">${c.hp}</span> / ${c.max}</span>
                <input type="number" class="hp-amt" data-id="${c.id}" min="0" max="9999" placeholder="amt" aria-label="Damage or healing for ${esc(c.name)}">
                <button type="button" data-act="dmg" data-id="${c.id}" title="Damage" aria-label="Damage ${esc(c.name)}">−</button>
                <button type="button" data-act="heal" data-id="${c.id}" title="Heal" aria-label="Heal ${esc(c.name)}">+</button>`}
            </div>
            <button type="button" class="init-x" data-act="remove" data-id="${c.id}" title="Remove" aria-label="Remove ${esc(c.name)}">✕</button>
            ${c.monster && openBlocks.has(c.id) ? `<div class="sb-box">${monsterBlockHtml(MONSTER_BY_ID[c.monster])}</div>` : ''}
        </li>`;
    }).join('');
    // Open blocks say "Loading…" until the data arrives, then draw again.
    if (!blocksReady() && fight.list.some(c => c.monster && openBlocks.has(c.id))) {
        loadMonsterBlocks().then(() => renderFight())
            .catch(() => flash('init-status', '⚠️ The stat blocks did not load. Check the connection and try again.'));
    }
    if (scroll) {
        const row = list.querySelector('.init-row.current');
        if (row) row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
}

function onFightClick(e) {
    const spell = e.target.closest('.sb-spell');
    if (spell) { sbSpellClick(spell, spell.closest('.init-row')); return; }
    const b = e.target.closest('button[data-id]');
    if (!b) return;
    const id = Number(b.dataset.id);
    if (b.dataset.act === 'sb') toggleFightBlock(id);
    else if (b.dataset.cond) toggleCond(id, b.dataset.cond);
    else if (b.dataset.act === 'dmg') changeHp(id, -1);
    else if (b.dataset.act === 'heal') changeHp(id, 1);
    else if (b.dataset.act === 'remove') removeCombatant(id);
}

function setupInitiative() {
    loadFight();
    renderFight();
    document.getElementById('init-add').addEventListener('submit', addCombatants);
    const names = document.getElementById('ia-monsters');
    names.innerHTML = MONSTERS.map(m => `<option value="${esc(m.name)}"></option>`).join('');
    const follow = document.getElementById('init-follow');
    follow.checked = followTurns();
    follow.addEventListener('change', () => {
        try { localStorage.setItem(INIT_FOLLOW_KEY, follow.checked ? 'on' : 'off'); } catch (e) {}
        followTurn();
        renderFight();
    });
    document.getElementById('init-next').addEventListener('click', nextTurn);
    document.getElementById('init-prev').addEventListener('click', prevTurn);
    const list = document.getElementById('init-list');
    list.addEventListener('click', onFightClick);
    list.addEventListener('toggle', e => {
        const d = e.target;
        if (!d.matches || !d.matches('.init-cond-add')) return;
        if (d.open) openConds = Number(d.dataset.id);
        else if (openConds === Number(d.dataset.id)) openConds = null;
    }, true);
    list.addEventListener('change', e => {
        if (!e.target.matches('.init-val')) return;
        const c = fight.list.find(x => x.id === Number(e.target.dataset.id));
        const v = num(e.target.value);
        if (!c || v === null) { renderFight(); return; }
        c.init = Math.max(-10, Math.min(50, v));
        sortFight();
        saveFight();
        renderFight();
    });
    list.addEventListener('keydown', e => {
        if (e.key === 'Enter' && e.target.matches('.hp-amt')) { e.preventDefault(); changeHp(Number(e.target.dataset.id), -1); }
    });
    document.getElementById('init-reroll').addEventListener('click', () => {
        if (!fight.list.length) return;
        fight.list.forEach(c => { c.init = rollInit(c.mod); });
        sortFight();
        fight.round = 1;
        fight.turn = null;
        saveFight();
        followTurn();
        renderFight();
        flash('init-status', '🎲 Everyone rolled again. Start combat when ready.');
    });
    document.getElementById('init-defeated').addEventListener('click', () => {
        const fallen = fight.list.filter(c => c.hp !== null && c.hp <= 0);
        if (!fallen.length) { flash('init-status', 'No one is down.'); return; }
        fallen.forEach(c => removeCombatant(c.id));
        flash('init-status', `💀 Removed ${fallen.map(c => c.name).join(', ')}.`);
    });
    const clear = document.getElementById('init-clear');
    clear.addEventListener('click', () => {
        if (!fight.list.length) return;
        armedClick(clear, '🧹 Clear All', () => {
            fight = { round: 1, turn: null, nextId: 1, list: [] };
            openBlocks = new Set();
            autoBlock = null;
            saveFight();
            renderFight();
            flash('init-status', '🧹 The battlefield is empty.');
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    setupDice();
    setupInitiative();
    // Another tab of the site changed the history or the fight.
    window.addEventListener('storage', e => {
        if (e.key === DICE_HISTORY_KEY) renderDiceHistory();
        if (e.key === INIT_KEY) { loadFight(); renderFight(); }
    });
});
