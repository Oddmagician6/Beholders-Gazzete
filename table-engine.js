/* ============================================
   CUSTOM RANDOM TABLES (F49)
   A table is { name, src, die }: src is what the reader typed, die is 'auto' or a die size.
   - parseTable(src, die): one entry per line, or die ranges ("1-3 | text", "| 4 | text |",
     "5. text", "00" = 100). Throws an Error with a reader-friendly message.
   - rollTable(tables, name): rolls it with rand() (so withSeed works), expanding
     [[Other table]] (nested rolls, TABLE_LIMITS.depth deep at most) and {2d4} (dice-engine.js).
     Returns plain text: escape it before drawing.
   - tablesShareCode(list) / tablesFromShareCode(code): a list of tables as one URL-safe
     string, deflated when the browser has CompressionStream (async).
   Needs dice-engine.js (rollDie, rollDice) and, for seeds, rng.js. No page needed,
   so the DM screen's table card can use it.
   ============================================ */

const TABLE_LIMITS = { name: 60, src: 20000, entries: 200, text: 500, die: 1000, depth: 10, rolls: 100, share: 6000, shareTables: 10 };
const TABLE_DICE = [4, 6, 8, 10, 12, 20, 100];
const TABLE_REF = /\[\[([^\[\]\n]{1,60})\]\]|\{([^{}\n]{1,80})\}/g;

function tableKey(name) {
    return String(name || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

// The first table with this name (names match without case or extra spaces).
function tableFind(tables, name) {
    const k = tableKey(name);
    return k ? tables.find(t => tableKey(t.name) === k) || null : null;
}

// A table as the tools keep it, or null.
function tableClean(t) {
    if (!t || typeof t !== 'object' || typeof t.src !== 'string') return null;
    const die = TABLE_DICE.includes(Number(t.die)) ? Number(t.die) : 'auto';
    return {
        name: typeof t.name === 'string' ? t.name.replace(/\s+/g, ' ').trim().slice(0, TABLE_LIMITS.name) : '',
        src: t.src.slice(0, TABLE_LIMITS.src),
        die
    };
}

// ── Parsing ───────────────────────────────────────────────
// A line with a die range: "1-3 | text", "| 4 | text |", "5. text", "6) text", "00 | text".
const TABLE_RANGE_LINE = /^\|?\s*(\d{1,4})(?:\s*[-–—]\s*(\d{1,4}))?\s*(?:\||[.):]\s)\s*(.*)$/;
const TABLE_DIVIDER = /^\|?[\s:|-]*-{2,}[\s:|-]*$/;

function tableNum(s, d100) {
    const n = Number(s);
    return n === 0 && /^0+$/.test(s) && d100 ? 100 : n;
}

// The text of a range line: the rest of a markdown row's cells, joined.
function tableCells(rest) {
    return rest.replace(/\|\s*$/, '').split('|').map(c => c.trim()).filter(Boolean).join(' — ');
}

// → { entries: [{ lo, hi, text }], die, ranged }
function parseTable(src, die = 'auto') {
    const lines = String(src || '').split(/\r?\n/).map(l => l.trim()).filter(l => l && !TABLE_DIVIDER.test(l));
    if (!lines.length) throw new Error('Add some entries, one per line.');
    const matches = lines.map(l => l.match(TABLE_RANGE_LINE));
    let ranged = matches.filter(Boolean).length;
    // A markdown header ("d8 | Weather") above ranged rows.
    if (ranged && !matches[0] && ranged === lines.length - 1) { lines.shift(); matches.shift(); }
    ranged = matches.filter(Boolean).length;
    if (ranged && ranged < lines.length) {
        const bad = matches.map((m, i) => (m ? 0 : i + 1)).filter(Boolean);
        throw new Error(`Some lines have a die range and some don't (no range: "${lines[bad[0] - 1].slice(0, 40)}"). Give every line a range, or none.`);
    }
    if (lines.length > TABLE_LIMITS.entries) throw new Error(`${TABLE_LIMITS.entries} entries at most (this has ${lines.length}).`);
    const fit = text => {
        if (!text) throw new Error('An entry is empty.');
        return text.slice(0, TABLE_LIMITS.text);
    };

    if (!ranged) {
        const n = lines.length;
        const d = die === 'auto' ? n : Number(die);
        if (d < n) throw new Error(`A d${d} can't pick from ${n} entries. Pick a bigger die, or Auto.`);
        // Spread the die over the entries as evenly as it goes (6 entries on a d20: 1–3, 4–6, 7–10…).
        const entries = lines.map((l, i) => ({ lo: Math.floor(i * d / n) + 1, hi: Math.floor((i + 1) * d / n), text: fit(l.replace(/^[-*•]\s+/, '')) }));
        return { entries, die: d, ranged: false };
    }

    const d100 = matches.some(m => /^0+$/.test(m[1]) || /^0+$/.test(m[2] || ''));
    const entries = matches.map(m => {
        const lo = tableNum(m[1], d100), hi = m[2] === undefined ? lo : tableNum(m[2], d100);
        if (lo < 1 || hi < lo) throw new Error(`The range ${m[1]}${m[2] === undefined ? '' : '-' + m[2]} runs backwards or starts below 1.`);
        return { lo, hi, text: fit(tableCells(m[3])) };
    }).sort((a, b) => a.lo - b.lo);
    if (entries[0].lo !== 1) throw new Error(`The ranges start at ${entries[0].lo}; they need to start at 1.`);
    for (let i = 1; i < entries.length; i++) {
        const prev = entries[i - 1].hi, lo = entries[i].lo;
        if (lo <= prev) throw new Error(`Two entries both cover ${lo}.`);
        if (lo > prev + 1) throw new Error(`Nothing covers ${prev + 1 === lo - 1 ? prev + 1 : `${prev + 1}-${lo - 1}`}.`);
    }
    const top = entries[entries.length - 1].hi;
    if (top < 2 || top > TABLE_LIMITS.die) throw new Error(`The ranges need to end between 2 and ${TABLE_LIMITS.die} (they end at ${top}).`);
    return { entries, die: top, ranged: true };
}

// The names a table's entries roll ([[Name]]), in order, without repeats.
function tableRefs(src) {
    const seen = new Map();
    for (const m of String(src || '').matchAll(TABLE_REF)) {
        if (m[1] !== undefined && !seen.has(tableKey(m[1]))) seen.set(tableKey(m[1]), m[1].trim());
    }
    return [...seen.values()];
}

// ── Rolling ───────────────────────────────────────────────
// Dice inside braces only when it reads like a formula, so "{the king}" stays as it is.
const TABLE_DICE_LIKE = /^[\d\sdD%+\-−–khlKHL]+$/;

// → { name, die, roll, index, text, steps: [{ kind: 'table', name, die, roll, depth } | { kind: 'dice', f, total, depth }], warnings }
function rollTable(tables, name) {
    const ctx = { tables, steps: [], warnings: [], count: 0 };
    const warn = w => { if (!ctx.warnings.includes(w)) ctx.warnings.push(w); };
    const one = (t, depth) => {
        ctx.count++;
        let parsed;
        try { parsed = parseTable(t.src, t.die); } catch (e) {
            warn(`${t.name || 'A table'}: ${e.message}`);
            return { text: `[[${t.name}]]`, roll: 0, index: -1, die: 0 };
        }
        const roll = rollDie(parsed.die);
        const index = parsed.entries.findIndex(e => e.lo <= roll && roll <= e.hi);
        ctx.steps.push({ kind: 'table', name: t.name, die: parsed.die, roll, depth });
        return { text: expand(parsed.entries[index].text, depth), roll, index, die: parsed.die };
    };
    const expand = (text, depth) => text.replace(TABLE_REF, (m, ref, dice) => {
        if (ref !== undefined) {
            const t = tableFind(ctx.tables, ref);
            if (!t) { warn(`There's no table called "${ref.trim()}".`); return m; }
            if (depth >= TABLE_LIMITS.depth) { warn(`Tables nest ${TABLE_LIMITS.depth} deep at most (does a table roll itself?).`); return '…'; }
            if (ctx.count >= TABLE_LIMITS.rolls) { warn(`One roll can roll ${TABLE_LIMITS.rolls} tables at most.`); return '…'; }
            return one(t, depth + 1).text;
        }
        if (!TABLE_DICE_LIKE.test(dice)) return m;
        try {
            const r = rollDice(dice);
            ctx.steps.push({ kind: 'dice', f: r.formula, total: r.total, depth });
            return String(r.total);
        } catch (e) {
            warn(`{${dice}}: ${e.message}`);
            return m;
        }
    });
    const t = typeof name === 'object' ? name : tableFind(tables, name);
    if (!t) throw new Error(`There's no table called "${name}".`);
    const r = one(t, 0);
    return { name: t.name, die: r.die, roll: r.roll, index: r.index, text: r.text, steps: ctx.steps, warnings: ctx.warnings };
}

// "Weather d8: 3 · 2d4: 5", nested rolls in parentheses.
function tableStepsText(steps) {
    return steps.map(s => (s.kind === 'table' ? `${s.name || 'Untitled'} d${s.die}: ${s.roll}` : `${s.f}: ${s.total}`)).join(' · ');
}

// A table and every table it rolls (the ones found in tables), for a share link.
function tablesWithRefs(tables, t) {
    const out = [t];
    for (let i = 0; i < out.length && out.length < TABLE_LIMITS.shareTables; i++) {
        tableRefs(out[i].src).forEach(ref => {
            const sub = tableFind(tables, ref);
            if (sub && !out.includes(sub) && !tableFind(out, sub.name) && out.length < TABLE_LIMITS.shareTables) out.push(sub);
        });
    }
    return out;
}

// ── Share codes (packShareCode / unpackShareCode in rng.js) ──
async function tablesShareCode(list) {
    const code = await packShareCode({ v: 1, t: list.map(t => [t.name, t.src, t.die]) });
    if (code.length > TABLE_LIMITS.share) {
        throw new Error(`That's too long for a link (${code.length.toLocaleString()} characters; ${TABLE_LIMITS.share.toLocaleString()} at most). Shorten the table${list.length > 1 ? ' or the tables it rolls' : ''}.`);
    }
    return code;
}

// → a list of clean tables. Throws a reader-friendly Error.
async function tablesFromShareCode(code) {
    const broken = new Error("That table link is broken or cut short. Ask for it again, and copy the whole link.");
    let data;
    try {
        data = await unpackShareCode(code, TABLE_LIMITS.share + 10, TABLE_LIMITS.src * TABLE_LIMITS.shareTables * 4);
    } catch (e) {
        throw e.browser ? new Error("This browser can't open compressed table links. Try a newer browser.") : broken;
    }
    if (!data || data.v !== 1 || !Array.isArray(data.t)) throw broken;
    const list = data.t.slice(0, TABLE_LIMITS.shareTables)
        .map(r => (Array.isArray(r) ? tableClean({ name: r[0], src: r[1], die: r[2] }) : null))
        .filter(Boolean);
    list.forEach(t => { if (!t.name) t.name = 'Shared table'; });
    // One table to a name, as tablesWithRefs makes them ([[Name]] rolls the first anyway).
    const named = list.filter((t, i) => list.findIndex(o => tableKey(o.name) === tableKey(t.name)) === i);
    if (!named.length) throw broken;
    return named;
}
