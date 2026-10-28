/* ============================================
   DICE ENGINE (F23)
   Used by the DM Toolbox Dice and Initiative tabs and the floating dice button
   (dice-fab.js) on the tool pages.
   - parseDice(formula): "2d6+3", "4d6kh3", "d20 + 5 - 1d4", "d%", "8d6dl2".
     Keep/drop: kh/kl (keep highest/lowest n, default 1), dh/dl (drop), k = kh.
     Throws an Error with a reader-friendly message when the formula is bad.
   - rollDice(formula, mode): mode 'adv' / 'dis' rolls the formula's first single
     d20 twice and keeps the higher / lower.
   - Roll history (shared by the Dice tab and the floating button) lives in
     localStorage DICE_HISTORY_KEY; saving fires a 'gazette-dice' window event.
   Rolls call rand() from rng.js when the page has it, else Math.random.
   ============================================ */

const DICE_LIMITS = { dice: 100, sides: 1000, terms: 12, length: 80 };
const DICE_HISTORY_KEY = 'gazette-dice-history';
const DICE_HISTORY_MAX = 50;

function diceRand() {
    return typeof rand === 'function' ? rand() : Math.random();
}

function rollDie(sides) {
    return 1 + Math.floor(diceRand() * sides);
}

// → { clean, terms: [{ sign, count, sides, keep: { how, n } | null } | { sign, value }] }
function parseDice(formula) {
    const raw = String(formula || '').toLowerCase().replace(/[−–]/g, '-');
    // "2d6 3" must not quietly become "2d63".
    if (/[\dd%]\s+[\dd]/.test(raw)) throw new Error('Put + or − between the parts of a roll, like 2d6 + 3.');
    const src = raw.replace(/\s+/g, '');
    if (!src) throw new Error('Type a roll, like 2d6+3.');
    if (src.length > DICE_LIMITS.length) throw new Error(`That formula is too long (${DICE_LIMITS.length} characters at most).`);
    const re = /([+-])?(?:(\d*)d(\d+|%)(?:(kh|kl|dh|dl|k)(\d*))?|(\d+))/y;
    const terms = [];
    let pos = 0;
    while (pos < src.length) {
        re.lastIndex = pos;
        const m = re.exec(src);
        if (!m || m[0] === '' || (terms.length && !m[1])) throw new Error(`Can't read "${src.slice(pos)}". Try something like 2d6+3 or 4d6kh3.`);
        pos = re.lastIndex;
        const sign = m[1] === '-' ? -1 : 1;
        if (m[6] !== undefined) {
            const value = Number(m[6]);
            if (value > 100000) throw new Error('That number is too big.');
            terms.push({ sign, value });
        } else {
            const count = m[2] === '' ? 1 : Number(m[2]);
            const sides = m[3] === '%' ? 100 : Number(m[3]);
            if (count < 1 || count > DICE_LIMITS.dice) throw new Error(`Roll between 1 and ${DICE_LIMITS.dice} dice at a time.`);
            if (sides < 2 || sides > DICE_LIMITS.sides) throw new Error(`Dice need 2 to ${DICE_LIMITS.sides} sides.`);
            let keep = null;
            if (m[4]) {
                const how = m[4] === 'k' ? 'kh' : m[4];
                const n = m[5] === '' ? 1 : Number(m[5]);
                const drop = how[0] === 'd';
                if (n < (drop ? 0 : 1) || n > (drop ? count - 1 : count)) throw new Error(`Can't ${drop ? 'drop' : 'keep'} ${n} of ${count} dice.`);
                keep = { how, n };
            }
            terms.push({ sign, count, sides, keep });
        }
        if (terms.length > DICE_LIMITS.terms) throw new Error(`Use ${DICE_LIMITS.terms} parts at most.`);
    }
    return { terms, clean: terms.map((t, i) => (t.sign < 0 ? '-' : i ? '+' : '') + termText(t)).join('') };
}

function termText(t) {
    if (t.value !== undefined) return String(t.value);
    return `${t.count > 1 ? t.count : ''}d${t.sides}${t.keep ? t.keep.how + (t.keep.n !== 1 || t.keep.how[0] === 'd' ? t.keep.n : '') : ''}`;
}

// Which of the rolled values count, per the keep/drop rule.
function keptFlags(values, keep) {
    if (!keep) return values.map(() => true);
    const order = values.map((v, i) => i).sort((a, b) => values[a] - values[b] || a - b);   // low → high
    const n = keep.how === 'kh' || keep.how === 'kl' ? keep.n : values.length - keep.n;
    const chosen = new Set(keep.how === 'kh' || keep.how === 'dl' ? order.slice(order.length - n) : order.slice(0, n));
    return values.map((v, i) => chosen.has(i));
}

// → { formula, mode, total, parts: [{ text, sign, rolls: [{ v, kept }], value }], crit: 'nat20'|'nat1'|null, note }
function rollDice(formula, mode = 'normal') {
    const parsed = parseDice(formula);
    const terms = parsed.terms.map(t => ({ ...t }));
    let note = '';
    let d20 = -1;
    if (mode === 'adv' || mode === 'dis') {
        d20 = terms.findIndex(t => t.sides === 20 && t.count === 1 && !t.keep);
        if (d20 < 0) note = `No single d20 in this roll, so ${diceModeLabel('adv')} and ${diceModeLabel('dis')} don't apply.`;
        else terms[d20] = { ...terms[d20], count: 2, keep: { how: mode === 'adv' ? 'kh' : 'kl', n: 1 } };
    }
    const parts = terms.map(t => {
        if (t.value !== undefined) return { text: String(t.value), sign: t.sign, rolls: [], value: t.sign * t.value };
        const values = Array.from({ length: t.count }, () => rollDie(t.sides));
        const kept = keptFlags(values, t.keep);
        const sum = values.reduce((a, v, i) => a + (kept[i] ? v : 0), 0);
        return { text: termText(t), sign: t.sign, rolls: values.map((v, i) => ({ v, kept: kept[i] })), value: t.sign * sum, sides: t.sides };
    });
    // A natural 20 or 1 when the roll has exactly one d20 that counts (a check, attack, or save).
    let crit = null;
    const d20s = parts.filter(p => p.sides === 20);
    if (d20s.length === 1) {
        const kept = d20s[0].rolls.filter(r => r.kept);
        if (kept.length === 1) crit = kept[0].v === 20 ? 'nat20' : kept[0].v === 1 ? 'nat1' : null;
    }
    const total = parts.reduce((a, p) => a + p.value, 0);
    return { formula: parsed.clean, mode: d20 >= 0 ? mode : 'normal', total, parts, crit, note };
}

// "4d6kh3 [6, 5, 4, (2)] + 3", with dropped dice in parentheses.
function diceDetail(r) {
    return r.parts.map((p, i) => {
        const sign = p.sign < 0 ? (i ? ' − ' : '−') : i ? ' + ' : '';
        if (!p.rolls.length) return sign + p.text;
        return `${sign}${p.text} [${p.rolls.map(x => (x.kept ? x.v : `(${x.v})`)).join(', ')}]`;
    }).join('');
}

// Pathfinder calls them fortune and misfortune (a page without the system layer is 5e).
function diceModeLabel(mode) {
    const word = mode === 'adv' ? '{alt:advantage|fortune}' : mode === 'dis' ? '{alt:disadvantage|misfortune}' : '';
    return typeof ruleText === 'function' ? ruleText(word) : word.replace(/^\{alt:([^|]*)\|.*\}$/, '$1');
}

// ── History (localStorage) ───────────────────────────────
function loadDiceHistory() {
    try {
        const saved = JSON.parse(localStorage.getItem(DICE_HISTORY_KEY));
        return Array.isArray(saved) ? saved.filter(h => h && typeof h.f === 'string' && typeof h.total === 'number') : [];
    } catch (e) { return []; }
}

function saveDiceHistory(list) {
    try { localStorage.setItem(DICE_HISTORY_KEY, JSON.stringify(list.slice(0, DICE_HISTORY_MAX))); } catch (e) {}
    window.dispatchEvent(new Event('gazette-dice'));
}

// Roll and put it at the top of the history. label: optional ("Goblin 2 initiative").
function rollAndRecord(formula, mode = 'normal', label = '') {
    const r = rollDice(formula, mode);
    const entry = { f: r.formula, mode: r.mode, total: r.total, detail: diceDetail(r), crit: r.crit, t: Date.now() };
    if (label) entry.label = String(label).slice(0, 60);
    saveDiceHistory([entry, ...loadDiceHistory()]);
    return r;
}

function clearDiceHistory() {
    saveDiceHistory([]);
}
