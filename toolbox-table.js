/* ============================================
   DM TOOLBOX: AT THE TABLE (F23)
   Dice tab: formula roller, advantage/disadvantage, ability scores, and the
   shared roll history (dice-engine.js).
   Initiative tab: the fight, kept in localStorage INIT_KEY so a refresh keeps it.
   A combatant that is an SRD monster (sent from the Encounter tab, or added by its
   name) keeps its monster id and opens its stat block (toolbox-statblock.js).
   ?tab=init&add=<monster id>.<count> (the Bestiary's links) adds monsters to the saved fight once.
   ➕ Add the Party (party.js) adds the Party tab's characters as player characters (pc: true):
   their passive Perception shows, and at 0 HP they stay in the fight for their death saves.
   F68: one that came from a Play Sheet character keeps its party id (party), and the Play Sheet
   writes its HP, temporary HP (temp, which damage here takes first), conditions, exhaustion (exh),
   concentration (conc), and death saves (ds) straight into the saved fight (party.js
   partyPushLive); the 'storage' listener below redraws it. Damage or conditions set here hold
   until the player's sheet next changes.
   📺 Player View (F47) opens player-view.html: init-view.js turns the fight into what the players
   may see, and saveFight() posts it on INIT_VIEW_CHANNEL. Other creatures' names stay hidden
   there until the DM reveals them (shown: true; 🙈/👁️ on each row).
   Pathfinder pages (INIT_PF2E, ROADMAP L3 P4): Pathfinder's conditions (rules-pf2e.js), the valued
   ones saved with their value ("Frightened 2") and stepped with − and +; frightened drops by 1 at the
   end of its owner's turn; a character dropped to 0 HP becomes dying (1 + wounded) and unconscious,
   and healing clears dying and adds wounded; creatures come from ENC_MONSTERS, with no stat blocks.
   Loads after toolbox.js (uses its esc() and flash()).
   ============================================ */

const INIT_KEY = ruleKey('gazette-initiative');
const INIT_FOLLOW_KEY = ruleKey('gazette-init-follow');
const INIT_MAX = 40;
// The SRD 5.1 conditions, from rules-data.js (the Rules page uses the same list). On a Pathfinder
// page, Pathfinder's (rules-pf2e.js): some carry a value, stored with it ("Frightened 2").
const INIT_PF2E = ruleSystemId() === 'pf2e' && typeof PF2E_CONDITIONS !== 'undefined';
const SRD_CONDITIONS = INIT_PF2E ? Object.keys(PF2E_CONDITIONS) : Object.keys(SRD_CONDITION_TEXT);
const condTip = k => INIT_PF2E ? PF2E_CONDITIONS[k].text : SRD_CONDITION_TEXT[k].join(' ');
const condMax = k => INIT_PF2E ? PF2E_CONDITIONS[k].max : 0;
const condBase = s => s.replace(/ \d+$/, '');
const condValue = s => Number((s.match(/ (\d+)$/) || [0, 0])[1]);
// Stat blocks open from the tracker (none for Pathfinder creatures yet).
const INIT_BLOCKS = ruleHasStatBlocks();

// A saved condition: one of the list's, with a value from 1 to its max when it takes one.
function condOk(s) {
    if (typeof s !== 'string') return false;
    const k = condBase(s);
    if (!SRD_CONDITIONS.includes(k)) return false;
    const v = condValue(s);
    return condMax(k) ? s === `${k} ${v}` && v >= 1 && v <= condMax(k) : s === k;
}

// c's value for condition k: 0 without it, 1 for a condition with no value.
function condOf(c, k) {
    const s = c.conds.find(x => condBase(x) === k);
    return s ? (condMax(k) ? condValue(s) : 1) : 0;
}

// Gives c condition k at value v (0 takes it away).
function setCond(c, k, v) {
    c.conds = c.conds.filter(x => condBase(x) !== k);
    if (v > 0) c.conds.push(condMax(k) ? `${k} ${Math.min(v, condMax(k))}` : k);
    c.conds.sort();
}

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

// An SRD monster first, then homebrew (homebrew.js) by that name. Pathfinder: its creatures
// (encounter-engine.js ENC_MONSTERS, with Perception as the bonus) and no homebrew.
function monsterNamed(name) {
    const key = name.replace(/\s+\d+$/, '').toLowerCase();
    return [...ENC_MONSTERS, ...(INIT_PF2E ? [] : hbRows)].find(m => m.name.toLowerCase() === key) || null;
}

function fillMonsterNames() {
    document.getElementById('ia-monsters').innerHTML = [...(INIT_PF2E ? [] : hbRows), ...ENC_MONSTERS].map(m => `<option value="${esc(m.name)}"></option>`).join('');
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
                pc: c.pc === true, pp: num(c.pp), shown: c.shown === true,
                conds: Array.isArray(c.conds) ? c.conds.filter(condOk) : [],
                party: typeof c.party === 'string' && /^[a-z0-9]{1,16}$/.test(c.party) ? c.party : null,
                temp: Math.max(0, num(c.temp) ?? 0), exh: Math.min(6, Math.max(0, num(c.exh) ?? 0)),
                conc: typeof c.conc === 'string' ? c.conc.slice(0, 40) : '',
                ds: Array.isArray(c.ds) ? [0, 1].map(i => Math.min(3, Math.max(0, num(c.ds[i]) ?? 0))) : [0, 0]
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
    try {
        localStorage.setItem(INIT_KEY, JSON.stringify(fight));
    } catch (e) {
        // After the caller's own message ("rolls in", "takes 5"), so this one stays on screen.
        queueMicrotask(() => flash('init-status', "⚠️ This browser wouldn't save the fight (storage full or blocked). A refresh will lose this change."));
    }
    postPlayerView();
}

// The player view window (player-view.html) hears every change, and asks for the fight when it opens.
let viewChannel = null;
try { viewChannel = new BroadcastChannel(INIT_VIEW_CHANNEL); } catch (e) {}
function postPlayerView() {
    if (viewChannel) try { viewChannel.postMessage({ type: 'view', view: initPlayerView(fight) }); } catch (e) {}
}

function sortFight() {
    fight.list.sort((a, b) => b.init - a.init || b.mod - a.mod || a.id - b.id);
}

function rollInit(mod) {
    return rollDie(20) + mod;
}

// Adds count combatants (numbered when more than one) and returns them; [] when the tracker is full.
// Also used by the Encounter tab (toolbox-encounter.js). The caller saves and renders.
// pc: a player character from the Party tab (pp: its passive Perception).
function addToFight({ name, mod = 0, fixed = null, hp = null, ac = null, count = 1, monster = null, pc = false, pp = null }) {
    count = Math.min(count, INIT_MAX - fight.list.length);
    if (count < 1) return [];
    // Numbering carries on from any "Goblin 2" already in the fight; a plain "Goblin" there counts as 1.
    // The base is cut to 36 so the number survives loadFight's 40 (homebrew names run to 60).
    const base = name.replace(/\s+\d+$/, '').slice(0, 36).trim();
    const taken = fight.list.map(c => c.name.toLowerCase() === base.toLowerCase() ? [, 1]
        : c.name.match(new RegExp('^' + base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ' (\\d+)$', 'i'))).filter(Boolean).map(m => Number(m[1]));
    let n = taken.length ? Math.max(...taken) : 0;
    const added = [];
    for (let i = 0; i < count; i++) {
        const c = {
            id: fight.nextId++, name: count > 1 || taken.length ? `${base} ${++n}` : name.length > 36 ? base : name,
            init: fixed !== null && count === 1 ? fixed : rollInit(mod), mod,
            hp: hp !== null ? Math.max(0, hp) : null, max: hp !== null ? Math.max(0, hp) : null, ac, monster, pc, pp, shown: false, conds: [],
            party: null, temp: 0, exh: 0, conc: '', ds: [0, 0]
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
        name, mod: Math.max(-10, Math.min(INIT_PF2E ? 40 : 20, m && mod === 0 ? m.dex : mod)), fixed: num(v('ia-init')),
        hp: num(v('ia-hp')) ?? (m ? m.hp : null), ac: num(v('ia-ac')) ?? (m ? m.ac : null),
        count: Math.max(1, Math.min(20, num(v('ia-count')) ?? 1)), monster: m ? m.id : null
    });
    if (!added.length) { flash('init-status', `⚠️ The tracker holds ${INIT_MAX} combatants.`); return; }
    sortFight();
    saveFight();
    renderFight();
    flash('init-status', (added.length === 1 ? `➕ ${added[0].name} rolls in at ${added[0].init}.` : `➕ Added ${added.length}: ${added.map(c => `${c.name} (${c.init})`).join(', ')}.`)
        + (m && INIT_BLOCKS ? ' 📜 Click the name for its stat block.' : ''));
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
    if (!INIT_BLOCKS || !followTurns() || !c || !c.monster || openBlocks.has(c.id)) return;
    openBlocks.add(c.id);
    autoBlock = c.id;
}

function nextTurn() {
    if (!fight.list.length) return;
    const i = current();
    if (i < 0) fight.turn = fight.list[0].id;
    else if (i === fight.list.length - 1) { fight.turn = fight.list[0].id; fight.round++; }
    else fight.turn = fight.list[i + 1].id;
    const note = INIT_PF2E ? pf2eTurnNote(fight.list[i], fight.list.find(c => c.id === fight.turn)) : '';
    saveFight();
    followTurn();
    renderFight(true);
    if (note) flash('init-status', note);
}

// Pathfinder, as a turn passes: frightened drops by 1 at the end of its owner's turn, and a dying
// character starts theirs with a recovery check. Returns what to say ('' for nothing).
function pf2eTurnNote(ended, now) {
    const notes = [];
    const fear = ended ? condOf(ended, 'Frightened') : 0;
    if (fear) {
        setCond(ended, 'Frightened', fear - 1);
        notes.push(fear > 1 ? `😨 ${ended.name} is frightened ${fear - 1} now.` : `😌 ${ended.name} is no longer frightened.`);
    }
    const dying = now ? condOf(now, 'Dying') : 0;
    if (dying && !pf2eDead(now)) notes.push(`🎲 ${now.name} rolls a recovery check: DC ${10 + dying} flat check.`);
    return notes.join(' ');
}

// Pathfinder: dying has reached 4, less the doomed value.
function pf2eDead(c) {
    const d = condOf(c, 'Dying');
    return d > 0 && d >= Math.max(1, 4 - condOf(c, 'Doomed'));
}

// Pathfinder: a character dropped to 0 HP is dying (1 plus their wounded value) and unconscious;
// healed from 0, they lose dying, wake, and gain wounded 1 (or 1 more). Returns what to say.
function pf2eKnockout(c, wasUp) {
    if (!INIT_PF2E || !c.pc) return '';
    if (wasUp && c.hp === 0) {
        setCond(c, 'Dying', 1 + condOf(c, 'Wounded'));
        setCond(c, 'Unconscious', 1);
        return pf2eDead(c) ? ` ${c.name} dies.` : ` Dying ${condOf(c, 'Dying')} (a critical hit makes it 1 more: press +).`;
    }
    if (!wasUp && c.hp > 0 && condOf(c, 'Dying')) {
        setCond(c, 'Dying', 0);
        setCond(c, 'Unconscious', 0);
        setCond(c, 'Wounded', condOf(c, 'Wounded') + 1);
        return ` They wake up, wounded ${condOf(c, 'Wounded')}.`;
    }
    return '';
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
    // Temporary hit points take damage first.
    const soak = sign < 0 ? Math.min(c.temp, amt) : 0;
    const wasUp = c.hp > 0;
    c.temp -= soak;
    c.hp = sign < 0 ? Math.max(0, c.hp - (amt - soak)) : Math.min(c.max ?? Infinity, c.hp + amt);
    const ko = pf2eKnockout(c, wasUp);
    saveFight();
    renderFight();
    flash('init-status', (sign < 0 ? `🩸 ${c.name} takes ${amt}${soak ? ` (${soak} off temporary HP)` : ''}${c.hp === 0 ? ' and falls' : ''}.` : `💚 ${c.name} heals ${amt}.`)
        + ko + (c.party ? ' Their Play Sheet decides from its next change.' : ''));
    const again = document.querySelector(`.hp-amt[data-id="${id}"]`);
    if (again) again.focus();
}

// Shows or hides a creature's name in the player view.
function toggleShown(id) {
    const c = fight.list.find(x => x.id === id);
    if (!c || c.pc) return;
    c.shown = !c.shown;
    saveFight();
    renderFight();
}

// On or off, or (step: ±1) a valued condition up or down; down from 1 takes it away.
function toggleCond(id, cond, step = 0) {
    const c = fight.list.find(x => x.id === id);
    if (!c || !SRD_CONDITIONS.includes(cond)) return;
    const have = condOf(c, cond);
    setCond(c, cond, step ? have + step : have ? 0 : 1);
    saveFight();
    renderFight();
}

// A player character at 0 HP: its death saves, from its Play Sheet when it has one.
function deathSaveText(c) {
    if (INIT_PF2E) return pf2eDead(c) ? '💀 dead' : condOf(c, 'Dying') ? `🩸 dying ${condOf(c, 'Dying')}` : '🩸 at 0 HP';
    if (c.ds[1] >= 3) return '💀 dead';
    if (c.ds[0] >= 3) return '🩹 stable';
    return c.party ? `🩸 death saves ${c.ds[0]}✓ ${c.ds[1]}✗` : '🩸 death saves';
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
        return `<li class="init-row${c.id === fight.turn ? ' current' : ''}${down ? ' down' : ''}${c.pc ? ' init-pc' : ''}" data-id="${c.id}"${c.id === fight.turn ? ' aria-current="true"' : ''}>
            <div class="init-score"><input type="number" class="init-val" data-id="${c.id}" value="${c.init}" min="-10" max="50" aria-label="Initiative for ${esc(c.name)}"></div>
            <div class="init-main">
                <div class="init-top">
                    ${c.monster && INIT_BLOCKS ? `<button type="button" class="sb-toggle" data-act="sb" data-id="${c.id}" aria-expanded="${openBlocks.has(c.id)}" title="Show or hide the stat block"><span class="init-who sb-name">${esc(c.name)}</span> <span class="sb-hint" aria-hidden="true">📜</span></button>`
                        : `<span class="init-who">${esc(c.name)}</span>`}
                    ${c.pc ? '' : `<button type="button" class="init-reveal${c.shown ? ' on' : ''}" data-act="reveal" data-id="${c.id}" aria-pressed="${c.shown}" title="${c.shown ? 'The player view shows this name. Click to hide it again.' : 'The player view calls this one an unknown creature. Click to show its name.'}">${c.shown ? '👁️ Name shown' : '🙈 Name hidden'}</button>`}
                    <span class="init-meta">${c.pc ? '👤 PC · ' : ''}${c.party ? '<span title="Follows this character&#39;s Play Sheet in this browser">🔗 sheet</span> · ' : ''}${c.ac !== null ? `🛡️ AC ${c.ac} · ` : ''}bonus ${c.mod >= 0 ? '+' + c.mod : '−' + -c.mod}${c.pp !== null ? ` · 👁️ passive ${c.pp}` : ''}${c.exh ? ` · 😩 exhaustion ${c.exh}` : ''}${c.conc ? ` · 🧠 ${esc(c.conc)}` : ''}${down ? (c.pc ? ` · ${deathSaveText(c)}` : ' · 💀 down') : ''}</span>
                </div>
                <div class="init-conds">
                    ${c.conds.map(s => {
                        const k = condBase(s);
                        const chip = `<button type="button" class="init-cond" data-id="${c.id}" data-cond="${k}" title="Remove ${k}">${s} ✕</button>`;
                        return condMax(k) ? `<span class="init-cond-v"><button type="button" class="init-cond-step" data-id="${c.id}" data-cond="${k}" data-step="-1" aria-label="Lower ${k}">−</button>${chip}<button type="button" class="init-cond-step" data-id="${c.id}" data-cond="${k}" data-step="1" aria-label="Raise ${k}"${condValue(s) >= condMax(k) ? ' disabled' : ''}>+</button></span>` : chip;
                    }).join('')}
                    <details class="init-cond-add" data-id="${c.id}"${openConds === c.id ? ' open' : ''}>
                        <summary>+ condition</summary>
                        <div class="init-cond-menu">${SRD_CONDITIONS.map(k => `<button type="button" data-id="${c.id}" data-cond="${k}" title="${esc(condTip(k))}" class="${condOf(c, k) ? 'on' : ''}" aria-pressed="${condOf(c, k) > 0}">${k}</button>`).join('')}</div>
                    </details>
                </div>
            </div>
            <div class="init-hp">
                ${c.hp === null ? '<span title="No HP tracked">HP —</span>' : `
                <span><span class="hp-now${low || down ? ' hp-low' : ''}">${c.hp}</span> / ${c.max}${c.temp ? ` <span class="hp-temp" title="Temporary hit points">+${c.temp}</span>` : ''}</span>
                <input type="number" class="hp-amt" data-id="${c.id}" min="0" max="9999" placeholder="amt" aria-label="Damage or healing for ${esc(c.name)}">
                <button type="button" data-act="dmg" data-id="${c.id}" title="Damage" aria-label="Damage ${esc(c.name)}">−</button>
                <button type="button" data-act="heal" data-id="${c.id}" title="Heal" aria-label="Heal ${esc(c.name)}">+</button>`}
            </div>
            <button type="button" class="init-x" data-act="remove" data-id="${c.id}" title="Remove" aria-label="Remove ${esc(c.name)}">✕</button>
            ${c.monster && INIT_BLOCKS && openBlocks.has(c.id) ? `<div class="sb-box">${MONSTER_BY_ID[c.monster] ? monsterBlockHtml(MONSTER_BY_ID[c.monster]) : '<p class="sb-note">This homebrew monster is no longer in the notebook.</p>'}</div>` : ''}
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
    else if (b.dataset.cond) toggleCond(id, b.dataset.cond, Number(b.dataset.step) || 0);
    else if (b.dataset.act === 'dmg') changeHp(id, -1);
    else if (b.dataset.act === 'heal') changeHp(id, 1);
    else if (b.dataset.act === 'remove') removeCombatant(id);
    else if (b.dataset.act === 'reveal') toggleShown(id);
}

function setupInitiative() {
    loadFight();
    renderFight();
    document.getElementById('init-add').addEventListener('submit', addCombatants);
    partyChip(document.getElementById('init-party'), { label: '➕ Add the Party', title: 'Add every character not already in the fight, rolling d20 + their initiative bonus', act: addPartyToFight });
    fillMonsterNames();
    nbOnChange(fillMonsterNames);
    const follow = document.getElementById('init-follow');
    if (!INIT_BLOCKS) follow.closest('label').style.display = 'none';
    if (INIT_PF2E) document.getElementById('ia-mod').max = 40;
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
    document.getElementById('init-reveal-all').addEventListener('click', () => {
        const hidden = fight.list.filter(c => !c.pc && !c.shown);
        if (!hidden.length) { flash('init-status', fight.list.some(c => !c.pc) ? '👁️ Every name is already shown.' : 'There are no creatures to reveal.'); return; }
        hidden.forEach(c => { c.shown = true; });
        saveFight();
        renderFight();
        flash('init-status', `👁️ The player view now names ${hidden.map(c => c.name).join(', ')}.`);
    });
    // A player view that just opened asks for the fight.
    if (viewChannel) viewChannel.addEventListener('message', e => { if (e.data && e.data.type === 'hello') postPlayerView(); });
    document.getElementById('init-defeated').addEventListener('click', () => {
        // Player characters at 0 HP are making death saves, so they stay.
        const fallen = fight.list.filter(c => !c.pc && c.hp !== null && c.hp <= 0);
        if (!fallen.length) { flash('init-status', fight.list.some(c => c.pc && c.hp === 0) ? ruleText("No {alt:monster|creature} is down. Characters at 0 HP stay {alt:for their death saves|while they're dying}.") : 'No one is down.'); return; }
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

// The Party tab's characters (party.js) join the fight, skipping any whose name is already in it.
function addPartyToFight(list = loadParty()) {
    if (!list.length) { flash('init-status', 'No party is saved yet. Enter it on the 👥 Party tab.'); return; }
    const here = new Set(fight.list.map(c => c.name.toLowerCase()));
    const todo = list.map((m, i) => ({ m, name: partyMemberName(m, i).slice(0, 36) })).filter(x => !here.has(x.name.toLowerCase()));
    const skipped = list.length - todo.length;
    if (!todo.length) { flash('init-status', '👥 The whole party is already in the fight.'); return; }
    const added = todo.flatMap(x => addToFight({ name: x.name, mod: x.m.init, hp: x.m.hp, ac: x.m.ac, pc: true, pp: x.m.pp }).map(c => {
        // A character from the Play Sheet comes in as the sheet stands (F68).
        // (One typed in on the Party tab has no sheet; its row is the name match partyPushLive falls back on.)
        if (x.m.live) { c.party = x.m.id; partyLiveToCombatant(c, x.m.live); }
        return c;
    }));
    if (!added.length) { flash('init-status', `⚠️ The tracker holds ${INIT_MAX} combatants. Clear some first.`); return; }
    sortFight();
    saveFight();
    renderFight();
    flash('init-status', `👥 ${added.map(c => `${c.name} (${c.init})`).join(', ')} ${added.length === 1 ? 'rolls' : 'roll'} in.`
        + (added.length < todo.length ? ` The tracker holds ${INIT_MAX}, so ${todo.length - added.length} didn't fit.` : '')
        + (skipped ? ` ${skipped} ${skipped === 1 ? 'was' : 'were'} already in the fight.` : ''));
}

// Monsters sent from the Bestiary or the Monster Maker (?add=goblin.3, repeatable) join the saved fight once, then
// leave the address bar so a reload or Back doesn't add them again.
function applyInitAdds() {
    const p = urlParams();
    const adds = p.getAll('add');
    if (!adds.length) return;
    p.delete('add');
    setUrlParams(urlFor(currentTab(), Object.fromEntries(p)), false);
    if (currentTab() !== 'init') return;
    let want = 0;
    const added = adds.slice(0, 12).flatMap(s => {
        const [id, n] = s.split('.');
        const m = Object.hasOwn(MONSTER_BY_ID, id) ? MONSTER_BY_ID[id] : null;
        if (!m) return [];
        const count = Math.max(1, Math.min(INIT_MAX, parseInt(n, 10) || 1));
        want += count;
        return addToFight({ name: m.name, mod: m.dex, hp: m.hp, ac: m.ac, count, monster: m.id });
    });
    if (!want) {
        flash('init-status', adds.some(s => s.startsWith(HB_PREFIX))
            ? "⚠️ That homebrew monster isn't in this browser's notebook, so nothing was added. Save it in the Monster Maker here first."
            : "⚠️ That link names no monster the tracker knows, so nothing was added.");
        return;
    }
    if (!added.length) { flash('init-status', `⚠️ The tracker holds ${INIT_MAX} combatants. Clear some first.`); return; }
    sortFight();
    saveFight();
    renderFight();
    const from = adds.every(s => s.startsWith(HB_PREFIX)) ? 'the Monster Maker' : 'the Bestiary';
    flash('init-status', added.length < want
        ? `⚔️ Added ${added.length} of ${want} monsters from ${from}; the tracker holds ${INIT_MAX}.`
        : `⚔️ Added ${added.length} monster${added.length === 1 ? '' : 's'} from ${from}. Add the party, then Start Combat.`);
}

document.addEventListener('DOMContentLoaded', () => {
    setupDice();
    setupInitiative();
    applyInitAdds();
    // Another tab of the site changed the history or the fight.
    window.addEventListener('storage', e => {
        if (e.key === DICE_HISTORY_KEY) renderDiceHistory();
        if (e.key === INIT_KEY) { loadFight(); renderFight(); }
    });
});
