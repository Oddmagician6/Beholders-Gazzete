/* ============================================
   ENCOUNTER ENGINE (F25): party XP budgets, difficulty, and a seeded encounter roll.
   Budgets: the XP Budget per Character table of the System Reference Document 5.2
   (CC-BY 4.0): add up each character's number for the difficulty, then spend it on monsters.
   Monster XP and CR: monsters-data.js (SRD 5.1). Rolls use rand() from rng.js.
   ============================================ */

// Level → [Low, Moderate, High] XP per character.
const ENCOUNTER_BUDGET = [null,
    [50, 75, 100], [100, 150, 200], [150, 225, 400], [250, 375, 500], [500, 750, 1100],
    [600, 1000, 1400], [750, 1300, 1700], [1000, 1700, 2100], [1300, 2000, 2600], [1600, 2300, 3100],
    [1900, 2900, 4100], [2200, 3700, 4700], [2600, 4200, 5400], [2900, 4900, 6200], [3300, 5400, 7800],
    [3800, 6100, 9800], [4500, 7200, 11700], [5000, 8700, 14200], [5500, 10700, 17200], [6400, 13200, 22000]];

const ENCOUNTER_LEVELS = {
    low: { label: 'Low', icon: '🟢', text: 'A scary moment or two, but the party should win without losing anyone. Some may need healing afterwards.' },
    moderate: { label: 'Moderate', icon: '🟡', text: 'Could go badly without healing and other resources. Weaker characters may drop, and someone could die.' },
    high: { label: 'High', icon: '🔴', text: 'Could be lethal for one or more characters. The party needs smart tactics, quick thinking, and some luck.' },
    over: { label: 'Beyond High', icon: '💀', text: 'More XP than the High budget. Expect deaths, or give the party a way to run, parley, or even the odds.' }
};

const MONSTER_BY_ID = Object.fromEntries(MONSTERS.map(m => [m.id, m]));

function crValue(cr) {
    const [a, b] = String(cr).split('/').map(Number);
    return b ? a / b : a;
}

// groups: [{ count, level }] → each difficulty's budget for the whole party.
function partyBudget(groups) {
    const b = { low: 0, moderate: 0, high: 0, chars: 0, levels: 0 };
    groups.forEach(({ count, level }) => {
        const row = ENCOUNTER_BUDGET[level];
        if (!row || count < 1) return;
        b.low += row[0] * count; b.moderate += row[1] * count; b.high += row[2] * count;
        b.chars += count; b.levels += level * count;
    });
    b.avgLevel = b.chars ? b.levels / b.chars : 0;
    return b;
}

// list: [{ m, count }]
function encounterXp(list) {
    return list.reduce((t, e) => t + e.m.xp * e.count, 0);
}

function rateEncounter(xp, budget) {
    if (!xp || !budget.chars) return null;
    return xp <= budget.low ? 'low' : xp <= budget.moderate ? 'moderate' : xp <= budget.high ? 'high' : 'over';
}

// Warnings in the spirit of the SRD 5.2 troubleshooting advice (the wording is the Gazette's).
function encounterNotes(list, budget) {
    const notes = [];
    const creatures = list.reduce((t, e) => t + e.count, 0);
    if (!creatures || !budget.chars) return notes;
    if (creatures > budget.chars * 2) notes.push(`${creatures} creatures against ${budget.chars} character${budget.chars === 1 ? '' : 's'}: more than two each makes the fight swingy. Mix in weaker foes the party can drop quickly.`);
    const big = list.filter(e => crValue(e.m.cr) > budget.avgLevel);
    if (big.length) notes.push(`${big.map(e => e.m.name).join(', ')} ${big.length === 1 ? 'has' : 'have'} a CR above the party's level, so one hit could drop a character outright.`);
    const zero = list.filter(e => crValue(e.m.cr) === 0).reduce((t, e) => t + e.count, 0);
    if (zero > budget.chars) notes.push('A crowd of CR 0 creatures mostly slows the table down. A swarm does the same job with one stat block.');
    if (list.length > 3) notes.push(`${list.length} different stat blocks to run. Two or three is easier to manage at the table.`);
    return notes;
}

function pick(arr) {
    return arr[Math.floor(rand() * arr.length)];
}

// A random encounter that spends most of the budget and rates at the difficulty asked for:
// a lead monster (now and then a lone boss) plus up to two kinds of weaker support,
// no CR above the party's level, at most two creatures per character.
function rollEncounter(budget, diff, type = '') {
    const target = budget[diff];
    const maxCr = Math.max(0.125, Math.floor(budget.avgLevel));
    const pool = MONSTERS.filter(m => m.xp > 0 && m.xp <= target && crValue(m.cr) <= maxCr && (!type || m.type === type));
    if (!pool.length) return [];
    const cap = Math.max(2, budget.chars * 2);
    const floor = diff === 'high' ? budget.moderate : diff === 'moderate' ? budget.low : 0;
    let best = [], bestXp = 0;
    for (let t = 0; t < 120 && !(bestXp > floor && bestXp >= target * 0.8); t++) {
        const kinds = 1 + (rand() < 0.45 ? 1 : 0) + (rand() < 0.25 ? 1 : 0);
        const top = budget.chars <= 2 || rand() < 0.2 ? 1 : 0.7;
        const leads = pool.filter(m => m.xp >= target * 0.15 && m.xp <= target * top);
        const lead = pick(leads.length ? leads : pool);
        const list = [{ m: lead, count: 1 }];
        let spent = lead.xp, count = 1;
        const room = () => Math.min(cap - count, Math.floor((target - spent) / lead.xp));
        // A lone kind fills the budget with more of the same; a lead may bring a twin.
        const more = kinds === 1 ? room() : rand() < 0.3 ? Math.min(1, room()) : 0;
        if (more > 0) { list[0].count += more; spent += lead.xp * more; count += more; }
        for (let k = 1; k < kinds && count < cap; k++) {
            const left = target - spent;
            const support = pool.filter(m => m.xp < lead.xp && m.xp <= left && !list.some(e => e.m === m));
            if (!support.length) break;
            const m = pick(support);
            const most = Math.min(cap - count, Math.floor(left / m.xp));
            const n = Math.max(1, Math.ceil(most * (0.5 + rand() * 0.5)));
            list.push({ m, count: n });
            spent += m.xp * n; count += n;
        }
        if (spent > bestXp) { best = list; bestXp = spent; }
    }
    return best;
}
