/* ============================================
   RULES QUICK-REFERENCE (F42)
   Cheat-sheet cards summarizing SRD 5.1 rules (CC-BY 4.0) in the Gazette's
   own short wording. The mechanics follow the SRD; the phrasing is ours.
   SRD_CONDITION_TEXT is also the Initiative tab's condition list (toolbox-table.js),
   so the two always agree. rulesCardHtml() needs no page, so the DM screen (F57)
   can show any card. Lifestyle costs go through formatCoins() (coins.js).
   ============================================ */

const SRD_CONDITION_TEXT = {
    Blinded: ['Can\'t see; fails any check that needs sight.', 'Attacks against it have advantage; its own attacks have disadvantage.'],
    Charmed: ['Can\'t attack the charmer or aim harmful abilities or magic at them.', 'The charmer has advantage on social checks against it.'],
    Deafened: ['Can\'t hear; fails any check that needs hearing.'],
    Exhaustion: ['Six levels, each adding to the ones below. See the Exhaustion card.'],
    Frightened: ['Disadvantage on checks and attacks while the source of its fear is in sight.', 'Can\'t willingly move closer to that source.'],
    Grappled: ['Speed 0, and no bonuses to speed apply.', 'Ends if the grappler is incapacitated, or if something moves it out of the grappler\'s reach.'],
    Incapacitated: ['No actions and no reactions.'],
    Invisible: ['Can\'t be seen without magic or a special sense; counts as heavily obscured for hiding.', 'Noise or tracks can still give away where it is.', 'Attacks against it have disadvantage; its own attacks have advantage.'],
    Paralyzed: ['Incapacitated; can\'t move or speak.', 'Fails Strength and Dexterity saves.', 'Attacks against it have advantage, and a hit from within 5 feet is a critical hit.'],
    Petrified: ['Turned to stone (or similar) with its nonmagical gear; weighs ten times as much and stops aging.', 'Incapacitated, can\'t move or speak, and unaware of its surroundings.', 'Fails Strength and Dexterity saves; attacks against it have advantage.', 'Resistant to all damage; immune to poison and disease (any already in it are paused, not cured).'],
    Poisoned: ['Disadvantage on attack rolls and ability checks.'],
    Prone: ['Can only crawl until it stands up, which ends the condition.', 'Its attacks have disadvantage.', 'Attacks against it have advantage from within 5 feet, and disadvantage from farther away.'],
    Restrained: ['Speed 0, and no bonuses to speed apply.', 'Attacks against it have advantage; its own attacks have disadvantage.', 'Disadvantage on Dexterity saves.'],
    Stunned: ['Incapacitated; can\'t move, and can barely speak.', 'Fails Strength and Dexterity saves; attacks against it have advantage.'],
    Unconscious: ['Incapacitated, can\'t move or speak, and unaware of its surroundings.', 'Drops what it holds and falls prone.', 'Fails Strength and Dexterity saves.', 'Attacks against it have advantage, and a hit from within 5 feet is a critical hit.']
};

// Lifestyle costs per day (SRD 5.1 Lifestyle Expenses); null = free.
const RULES_LIFESTYLES = [
    ['Wretched', null, 'Sleeping rough, with nothing to call your own.'],
    ['Squalid', 0.1, 'A leaky room or a flophouse cot, among the desperate.'],
    ['Poor', 0.2, 'Plain food and a shared room; little comfort, but safe enough.'],
    ['Modest', 1, 'A clean room or a small home, and decent food.'],
    ['Comfortable', 2, 'A private room in a good inn, and good meals.'],
    ['Wealthy', 4, 'Fine lodgings, servants, and a seat at the best tables.'],
    ['Aristocratic', 10, 'A mansion, a household staff, and the company of the powerful (10 gp a day at least).']
];

// Card blocks: { p }, { note }, { list: [] }, { defs: [[term, text | [lines]]] }, { table: { head, rows } }.
const RULES_CARDS = [
    {
        id: 'conditions', icon: '🩸', title: 'Conditions', keys: 'status effect',
        blocks: [{ defs: Object.entries(SRD_CONDITION_TEXT) }]
    },
    {
        id: 'exhaustion', icon: '😩', title: 'Exhaustion', keys: 'tired fatigue starvation forced march levels',
        blocks: [
            { p: 'Effects stack: a creature suffers its current level and every level below it.' },
            { table: { head: ['Level', 'Effect'], rows: [
                ['1', 'Disadvantage on ability checks'],
                ['2', 'Speed halved'],
                ['3', 'Disadvantage on attack rolls and saving throws'],
                ['4', 'Hit point maximum halved'],
                ['5', 'Speed reduced to 0'],
                ['6', 'Death']
            ] } },
            { list: [
                'A new source of exhaustion raises the level by the amount it says.',
                'A long rest with food and drink lowers the level by 1.',
                'All effects end once the level drops below 1.'
            ] }
        ]
    },
    {
        id: 'cover', icon: '🧱', title: 'Cover', keys: 'ac dexterity save wall obstacle',
        blocks: [
            { p: 'Cover only counts against attacks and effects from the far side of it. Use the best cover the target has; degrees don\'t add up.' },
            { defs: [
                ['Half cover', ['+2 to AC and Dexterity saves.', 'At least half the body is blocked: a low wall, big furniture, a thin tree, another creature (friend or foe).']],
                ['Three-quarters cover', ['+5 to AC and Dexterity saves.', 'About three-quarters is blocked: a portcullis, an arrow slit, a thick tree trunk.']],
                ['Total cover', ['Can\'t be targeted directly by an attack or spell, though an area effect can still reach it.', 'Completely hidden behind an obstacle.']]
            ] }
        ]
    },
    {
        id: 'vision', icon: '🔦', title: 'Light & Vision', keys: 'darkness dim bright obscured darkvision blindsight truesight torch lantern candle lamp',
        blocks: [
            { defs: [
                ['Bright light', 'Normal sight. Daylight (even overcast) and the inner radius of a torch, lantern, or fire.'],
                ['Dim light', 'Lightly obscured: disadvantage on Wisdom (Perception) checks that rely on sight. The edge of a light source, twilight and dawn, a very bright full moon.'],
                ['Darkness', 'Heavily obscured: effectively blinded when trying to see into it. Night outdoors (most moonlit nights too), an unlit dungeon, magical darkness.'],
                ['Lightly obscured', 'Dim light, patchy fog, moderate foliage.'],
                ['Heavily obscured', 'Darkness, thick fog, dense foliage.'],
                ['Darkvision', 'Within its range, dim light counts as bright and darkness as dim. No colors in darkness, only grays.'],
                ['Blindsight', 'Perceives its surroundings within its range without needing sight.'],
                ['Truesight', 'Within its range: sees through normal and magical darkness, sees invisible things, sees through illusions (and auto-saves against them), sees a shapechanger\'s true form, and sees into the Ethereal Plane.']
            ] },
            { table: { head: ['Light source', 'Bright', 'Dim (beyond)', 'Lasts'], rows: [
                ['Candle', '5 ft', '+5 ft', '1 hour'],
                ['Torch', '20 ft', '+20 ft', '1 hour'],
                ['Lamp', '15 ft', '+30 ft', '6 hours a flask of oil'],
                ['Hooded lantern', '30 ft', '+30 ft', '6 hours a flask (hood down: 5 ft dim)'],
                ['Bullseye lantern', '60-ft cone', '+60 ft', '6 hours a flask of oil']
            ] } }
        ]
    },
    {
        id: 'travel', icon: '🥾', title: 'Travel Pace', keys: 'miles distance march overland journey stealth perception gallop mount',
        blocks: [
            { table: { head: ['Pace', 'Minute', 'Hour', 'Day', 'Effect'], rows: [
                ['Fast', '400 ft', '4 miles', '30 miles', '−5 to passive Wisdom (Perception)'],
                ['Normal', '300 ft', '3 miles', '24 miles', '—'],
                ['Slow', '200 ft', '2 miles', '18 miles', 'Can move stealthily']
            ] } },
            { defs: [
                ['Forced march', 'A day is 8 hours of travel. Each extra hour covers an hour\'s distance, then every traveler makes a Constitution save, DC 10 + 1 per hour past 8, or gains a level of exhaustion.'],
                ['Mounts', 'A mount can gallop at twice the fast pace for about an hour.'],
                ['Difficult terrain', 'Half speed: every foot of movement costs 2 feet.']
            ] }
        ]
    },
    {
        id: 'dcs', icon: '🎯', title: 'Typical DCs', keys: 'difficulty class check ability easy hard',
        blocks: [
            { table: { head: ['Task', 'DC'], rows: [
                ['Very easy', '5'],
                ['Easy', '10'],
                ['Medium', '15'],
                ['Hard', '20'],
                ['Very hard', '25'],
                ['Nearly impossible', '30']
            ] } }
        ]
    },
    {
        id: 'lifestyle', icon: '🏠', title: 'Lifestyle Expenses', keys: 'cost per day living downtime upkeep wretched squalid poor modest comfortable wealthy aristocratic',
        blocks: [
            { table: { head: ['Lifestyle', 'Per day', 'What it buys'], rows: RULES_LIFESTYLES.map(([name, gp, what]) =>
                [name, gp === null ? '—' : (typeof formatCoins === 'function' ? formatCoins(gp) : gp + ' gp'), what]) } },
            { note: 'The short descriptions are the Gazette\'s.' }
        ]
    }
];

// ── Rendering ─────────────────────────────────────────────
function rulesEsc(text) {
    return String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Escape the text and wrap each match of q in <mark>.
function rulesMark(text, q) {
    const s = String(text);
    if (!q) return rulesEsc(s);
    const low = s.toLowerCase();
    let out = '', i = 0, at;
    while ((at = low.indexOf(q, i)) !== -1) {
        out += rulesEsc(s.slice(i, at)) + '<mark>' + rulesEsc(s.slice(at, at + q.length)) + '</mark>';
        i = at + q.length;
    }
    return out + rulesEsc(s.slice(i));
}

function rulesHit(q, ...parts) {
    return parts.flat().some(t => String(t).toLowerCase().includes(q));
}

// A card's HTML, filtered by q (lower case): '' when nothing in it matches.
// A match on the title or keywords shows the whole card.
function rulesCardHtml(card, q = '') {
    q = q.trim().toLowerCase();
    const all = !q || rulesHit(q, card.title, card.keys);
    const m = t => rulesMark(t, q);
    const body = card.blocks.map(b => {
        if (b.p) return all || rulesHit(q, b.p) ? `<p>${m(b.p)}</p>` : '';
        if (b.note) return all ? `<p class="rules-note">${m(b.note)}</p>` : '';
        if (b.list) {
            const items = b.list.filter(t => all || rulesHit(q, t));
            return items.length ? `<ul>${items.map(t => `<li>${m(t)}</li>`).join('')}</ul>` : '';
        }
        if (b.defs) {
            const defs = b.defs.filter(([term, text]) => all || rulesHit(q, term, text));
            return defs.length ? `<dl>${defs.map(([term, text]) => `<div><dt>${m(term)}</dt>${
                Array.isArray(text) ? text.map(t => `<dd>${m(t)}</dd>`).join('') : `<dd>${m(text)}</dd>`}</div>`).join('')}</dl>` : '';
        }
        if (b.table) {
            const rows = b.table.rows.filter(r => all || rulesHit(q, r));
            return rows.length ? `<div class="rules-table"><table><thead><tr>${b.table.head.map(h => `<th>${rulesEsc(h)}</th>`).join('')}</tr></thead>
                <tbody>${rows.map(r => `<tr>${r.map(c => `<td>${m(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` : '';
        }
        return '';
    }).join('');
    if (!body) return '';
    return `<section class="rules-card" id="${card.id}"><h2>${card.icon} ${m(card.title)}</h2>${body}</section>`;
}
