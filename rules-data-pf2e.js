/* ============================================
   RULES QUICK-REFERENCE, PATHFINDER (ROADMAP L3 P4)
   The rules cards on a Pathfinder page (the GM Screen and its player view): loaded after
   rules-data.js, it swaps RULES_CARDS in place, so the screen's pickers and renderer need no
   changes. The rules are Player Core's and GM Core's (Paizo Inc., ORC License); the wording
   is the Gazette's own. Conditions come from PF2E_CONDITIONS (rules-pf2e.js), the Initiative
   tab's list, so the two always agree.
   ============================================ */

// GM Core's DC by level, 0–25 (ENC_PF2E_LEVEL_DC in encounter-engine.js has 0–20; the player view doesn't load it).
const RULES_PF2E_LEVEL_DC = [14, 15, 16, 18, 19, 20, 22, 23, 24, 26, 27, 28, 30, 31, 32, 34, 35, 36, 38, 39, 40, 42, 44, 46, 48, 50];

// Player Core's Cost of Living, in gp: week, month, year.
const RULES_PF2E_LIVING = [
    ['Subsistence', 0.4, 2, 24, 'Getting by on odd jobs, foraging, or charity: shelter, but no comfort.'],
    ['Comfortable', 1, 4, 52, 'A room of your own and decent meals.'],
    ['Fine', 30, 130, 1600, 'Good lodgings, fine food, and clothes fit for polite company.'],
    ['Extravagant', 100, 430, 5200, 'A grand house or suite, servants, and the best of everything.']
];

const RULES_CARDS_PF2E = [
    {
        id: 'conditions', icon: '🩸', title: 'Conditions', keys: 'status effect value',
        blocks: [
            { p: 'A condition with a value (frightened 2) takes the higher value when it\'s gained again; the values don\'t add up.' },
            { defs: Object.entries(PF2E_CONDITIONS).map(([name, c]) => [c.max ? `${name} (value)` : name, c.text]) }
        ]
    },
    {
        id: 'degrees', icon: '🎯', title: 'Degrees of Success', keys: 'critical crit natural 20 nat 1 check dc',
        blocks: [
            { table: { head: ['Result', 'Degree'], rows: [
                ['Beat the DC by 10 or more', 'Critical success'],
                ['Meet or beat the DC', 'Success'],
                ['Below the DC', 'Failure'],
                ['Below the DC by 10 or more', 'Critical failure']
            ] } },
            { list: [
                'A natural 20 makes the result one degree better; a natural 1, one degree worse.',
                'A Strike that critically succeeds deals double damage.',
                'A flat check has no modifiers at all: a d20 against the DC.'
            ] }
        ]
    },
    {
        id: 'actions', icon: '⚡', title: 'Actions & Attacks', keys: 'turn three actions reaction free map multiple attack penalty agile stride step strike',
        blocks: [
            { p: 'Each turn you get 3 actions, and 1 reaction to use before your next turn. Free actions cost nothing.' },
            { table: { head: ['Attack this turn', 'Penalty', 'Agile weapon'], rows: [
                ['First', '—', '—'],
                ['Second', '−5', '−4'],
                ['Third and later', '−10', '−8']
            ] } },
            { note: 'Every check with the attack trait counts toward the multiple attack penalty: Strikes, spell attacks, Grapple, Shove, Trip, Disarm.' },
            { defs: [
                ['Stride', 'Move up to your Speed.'],
                ['Step', 'Move 5 feet without triggering reactions that react to moving.'],
                ['Interact', 'Draw, stow, pick up, open, or use an object.'],
                ['Raise a Shield', 'The shield\'s bonus to AC until your next turn.'],
                ['Take Cover', 'Standard cover becomes greater; next to a wall or obstacle, or prone, you get standard cover. It lasts until you leave your space, attack, or fall unconscious.'],
                ['Seek', 'A Perception check to find hidden or undetected creatures and objects.'],
                ['Delay / Ready', 'Delay moves your turn later in the order; Ready (2 actions) sets up a reaction with a trigger.'],
                ['Stand, Drop Prone, Crawl', 'Get up, go down, or move 5 feet while prone.']
            ] }
        ]
    },
    {
        id: 'cover', icon: '🧱', title: 'Cover', keys: 'ac reflex stealth hide wall obstacle take cover',
        blocks: [
            { table: { head: ['Cover', 'Bonus (circumstance)', 'Can Hide'], rows: [
                ['Lesser', '+1 to AC', 'No'],
                ['Standard', '+2 to AC, Reflex saves against areas, and Stealth', 'Yes'],
                ['Greater', '+4 to AC, Reflex saves against areas, and Stealth', 'Yes']
            ] } },
            { list: [
                'Draw a line between the centers of the two spaces. Through an object or terrain that would block it: standard cover. Through a creature: lesser cover.',
                'Take Cover turns standard cover into greater (or gives standard cover by a wall or while prone). An extreme obstruction, like an arrow slit, is greater cover too.',
                'Against an area effect, draw the line from the effect\'s point of origin.',
                'Entirely behind a wall: no line of effect, so it usually can\'t be targeted at all.'
            ] }
        ]
    },
    {
        id: 'vision', icon: '🔦', title: 'Light & Senses', keys: 'darkness dim bright darkvision low-light concealed hidden undetected flat check torch lantern candle precise imprecise',
        blocks: [
            { defs: [
                ['Bright light', 'Everyone with ordinary sight sees clearly.'],
                ['Dim light', 'Concealed to anyone without low-light vision, darkvision, or another precise sense.'],
                ['Darkness', 'Hidden or undetected to anyone without darkvision or another precise sense; a creature that can\'t see in it is blinded while inside, though it can still see into lit areas.'],
                ['Low-light vision', 'Dim light counts as bright.'],
                ['Darkvision', 'Sees in darkness and dim light as in bright, in black and white. Strong magical darkness blocks it; greater darkvision sees through that too.'],
                ['Concealed', 'DC 5 flat check to target it, or the attack or effect misses.'],
                ['Hidden', 'Its square is known but not its exact spot: DC 11 flat check to target it, and anyone it\'s hidden from is off-guard to it.'],
                ['Undetected', 'Its square isn\'t known: guess a square, then DC 11 flat check if the guess is right.'],
                ['Senses', 'Sight is precise. Hearing is imprecise: a creature heard but not seen is hidden. Smell is vague: at best it makes an unnoticed creature undetected.']
            ] },
            { note: 'Area effects skip the flat checks.' },
            { table: { head: ['Light source', 'Bright', 'Dim (beyond)', 'Lasts'], rows: [
                ['Candle', '—', '10 ft', '8 hours'],
                ['Torch', '20 ft', '+20 ft', '1 hour'],
                ['Hooded lantern', '30 ft', '+30 ft', '6 hours a pint of oil'],
                ['Bull\'s-eye lantern', '60-ft cone', '+60 ft', '6 hours a pint of oil']
            ] } }
        ]
    },
    {
        id: 'dying', icon: '💀', title: 'Dying & Hero Points', keys: 'knocked out 0 hp death wounded doomed recovery check hero point stabilize',
        blocks: [
            { list: [
                'At 0 HP a character is knocked out: their initiative moves to just before the turn that dropped them, and they gain dying 1 (dying 2 from a critical hit or their own critical failure), plus their wounded value.',
                'Nonlethal damage leaves them unconscious at 0 HP instead, with no dying.',
                'Dying 4 is death (dying 4 minus doomed, for the doomed).',
                'Healing to 1 HP or more ends dying and wakes them; they act normally on their next turn.',
                'Losing dying, any way at all, gives wounded 1, or raises wounded by 1.'
            ] },
            { table: { head: ['Recovery check (start of turn)', 'Flat check, DC 10 + dying value'], rows: [
                ['Critical success', 'Dying −2'],
                ['Success', 'Dying −1'],
                ['Failure', 'Dying +1'],
                ['Critical failure', 'Dying +2']
            ] } },
            { defs: [
                ['Hero Points', ['Each character usually starts a session with 1, earns more for heroic deeds, and holds 3 at most; the rest are lost at the session\'s end.',
                    'Spend 1 to reroll a check and keep the second result (a fortune effect).',
                    'Spend all of them (1 at least) when dying would go up: dying ends, they stabilize at 0 HP, and wounded doesn\'t rise.']]
            ] }
        ]
    },
    {
        id: 'rest', icon: '🛏️', title: 'Rest & Healing', keys: 'sleep night treat wounds medicine heal hp fatigued drained doomed',
        blocks: [
            { defs: [
                ['A night\'s rest', ['8 hours, once a day: regain Constitution modifier (at least 1) × level HP; half without shelter or comfort, at the GM\'s call.',
                    'Ends fatigued, and lowers doomed and drained by 1. Sleeping in armor wakes you fatigued.',
                    '16 hours or more without sleep: fatigued.']],
                ['Treat Wounds', '10 minutes with a healer\'s toolkit and a Medicine check; the patient can\'t be treated again for an hour. Treating them for a full hour doubles the healing.']
            ] },
            { table: { head: ['Rank', 'DC', 'Success', 'Critical success'], rows: [
                ['Trained', '15', '2d8', '4d8'],
                ['Expert', '20', '2d8+10', '4d8+10'],
                ['Master', '30', '2d8+30', '4d8+30'],
                ['Legendary', '40', '2d8+50', '4d8+50']
            ] } },
            { note: 'A success or better also removes wounded; a critical failure deals 1d8 damage. A higher DC is optional.' }
        ]
    },
    {
        id: 'exploration', icon: '🧭', title: 'Exploration Activities', keys: 'travel initiative avoid notice defend detect magic follow the expert hustle investigate scout search stealth',
        blocks: [
            { p: 'What each character does on the move, and what it gives them when a fight starts.' },
            { defs: [
                ['Avoid Notice', 'Half speed. Roll Stealth for initiative, which also decides whether the foes notice them.'],
                ['Defend', 'Half speed, shield up: they start the fight with their shield raised.'],
                ['Detect Magic', 'Half speed or slower, casting detect magic as they go.'],
                ['Follow the Expert', 'Copy an ally who is at least an expert: add their level to the check even untrained, plus +2 (expert), +3 (master), or +4 (legendary).'],
                ['Hustle', 'Double speed, for Constitution modifier × 10 minutes (10 at least); a group uses its lowest.'],
                ['Investigate', 'Half speed. Secret Recall Knowledge checks for clues along the way.'],
                ['Scout', 'Half speed. The whole party gets +1 to initiative in the next fight.'],
                ['Search', 'Half speed. The GM rolls a secret check when they pass something hidden.']
            ] }
        ]
    },
    {
        id: 'travel', icon: '🥾', title: 'Travel Speed', keys: 'miles distance march overland journey speed per day hour',
        blocks: [
            { table: { head: ['Speed', 'Minute', 'Hour', 'Day (8 hours)'], rows: [10, 15, 20, 25, 30, 35, 40, 50, 60].map(s =>
                [`${s} ft`, `${s * 10} ft`, `${s / 10} miles`, `${s * 0.8} miles`]) } },
            { list: [
                'The group moves at its slowest member\'s Speed.',
                'Difficult terrain halves the distance; greater difficult terrain cuts it to a third.',
                'A day on the road is 8 hours; longer marches leave travelers fatigued, at the GM\'s call.'
            ] }
        ]
    },
    {
        id: 'dcs', icon: '📏', title: 'DCs', keys: 'difficulty class level simple untrained trained expert master legendary hard easy adjust',
        blocks: [
            { table: { head: ['Simple DC', 'DC'], rows: [
                ['Untrained', '10'], ['Trained', '15'], ['Expert', '20'], ['Master', '30'], ['Legendary', '40']
            ] } },
            { table: { head: ['Level', 'DC', 'Level', 'DC', 'Level', 'DC'], rows: Array.from({ length: 9 }, (_, i) =>
                [i, i + 9, i + 18].flatMap(l => (l < RULES_PF2E_LEVEL_DC.length ? [String(l), String(RULES_PF2E_LEVEL_DC[l])] : ['', '']))) } },
            { table: { head: ['Adjustment', 'DC'], rows: [
                ['Incredibly easy', '−10'], ['Very easy', '−5'], ['Easy', '−2'], ['Hard', '+2'], ['Very hard', '+5'], ['Incredibly hard', '+10']
            ] } },
            { note: 'A spell or item uses the DC for its level: a spell of rank r is level 2r − 1. Rare things are harder: uncommon +2, rare +5, unique +10.' }
        ]
    },
    {
        id: 'lifestyle', icon: '🏠', title: 'Cost of Living', keys: 'cost week month year living downtime upkeep subsistence comfortable fine extravagant',
        blocks: [
            { table: { head: ['Standard', 'Week', 'Month', 'Year', 'What it buys'], rows: RULES_PF2E_LIVING.map(([name, w, m, y, what]) =>
                [name, ...[w, m, y].map(gp => (typeof formatCoins === 'function' ? formatCoins(gp) : gp + ' gp')), what]) } },
            { note: 'Subsisting covers subsistence living for free. The short descriptions are the Gazette\'s.' }
        ]
    }
];

if (ruleSystemId() === 'pf2e') RULES_CARDS.splice(0, RULES_CARDS.length, ...RULES_CARDS_PF2E);
