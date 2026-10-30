/* ============================================
   PATHFINDER 2E (REMASTER) FOR THE SYSTEM LAYER
   Load after rules-system.js on Pathfinder pages (<html data-system="pf2e">).
   Mechanics from Paizo's ORC-licensed Remaster books; see pathfinder-license.
   ============================================ */

// 5e skills that Pathfinder folds into another one.
const PF2E_SKILL_SWAP = {
    'insight': 'perception',
    'investigation': 'perception',
    'animal-handling': 'nature',
    'history': 'society',
    'persuasion': 'diplomacy',
    'sleight-of-hand': 'thievery'
};

// A plain 5e ability check becomes the skill that usually covers it.
const PF2E_ABILITY_CHECK = { str: 'athletics', dex: 'acrobatics', con: 'fortitude', int: 'society', wis: 'perception', cha: 'diplomacy' };

const PF2E_SAVES = { str: 'Fortitude', con: 'Fortitude', dex: 'Reflex', int: 'Will', wis: 'Will', cha: 'Will' };

RULE_SYSTEMS.pf2e = {
    name: 'Pathfinder 2e',
    // The 5e numbers in the generators assume low-level parties; a level-1 standard DC in
    // Pathfinder is 15 (GM Core), three above 5e's usual 12. Level-scaled DCs come with the
    // Pathfinder encounter engine.
    dc: n => `DC ${n + 3}`,
    skill: (abil, skill, other) => ruleTitle(other || PF2E_SKILL_SWAP[skill] || skill),
    save: (abil, other) => other ? ruleTitle(other) : PF2E_SAVES[abil],
    ability: (abil, other) => ruleTitle(other || PF2E_ABILITY_CHECK[abil]),
    alt: (five, other) => other,
    // The Remaster dropped alignment; gods keep edicts and anathema instead.
    alignment: false,
    // NPC stat blocks come with the Pathfinder rules tools (ROADMAP L3 P4).
    statBlocks: false,
    // Pathfinder runs on silver: its goods cost about a tenth of 5e's (a longsword is 1 gp, not 15),
    // so a price the generators wrote in 5e gold is worth this much here.
    coinScale: 0.1,
    // 5e terms in the generators' text, in Pathfinder's words.
    phrases: [
        [/\bsaving throws\b/g, 'saves'], [/\bsaving throw\b/g, 'save'],
        [/\blightly obscured\b/g, 'concealed'], [/\bheavily obscured\b/g, 'hidden from sight'],
        [/\bthree-quarters cover\b/g, 'greater cover'], [/\bhalf cover\b/g, 'standard cover'],
        [/\bpassive Perception\b/g, 'Perception DC'],
        [/\bDashes\b/g, 'runs'], [/\bDash again\b/g, 'run again'],
        [/\bbloodied\b/g, 'badly hurt'],
        [/\bhas disadvantage\b/g, 'takes a −2 penalty'], [/\broll with disadvantage\b/g, 'take a −2 penalty']
    ],
    // People keep their 5e keys (names and ages are rolled by them); this is what they're called.
    words: {
        race: { tiefling: 'nephilim', tieflings: 'nephilim', dragonborn: 'dragonblood' },
        class: { paladin: 'champion', warlock: 'witch', artificer: 'inventor' },
        // The pantheon's domains, as Pathfinder's cleric domains
        domain: { life: 'healing', light: 'sun', tempest: 'air', war: 'might' }
    }
};

// The conditions the Initiative tab tracks (Player Core), in the Gazette's own short words.
// max: the highest value a condition takes (frightened 2); 0 for one with no value.
const PF2E_CONDITIONS = {
    'Blinded': { max: 0, text: "Can't see. What you could only see is undetected to you, Perception checks that need sight fail, other Perception checks take a −4 status penalty, and visual effects can't touch you." },
    'Clumsy': { max: 4, text: 'A status penalty equal to the value on Dexterity-based rolls and DCs: AC, Reflex saves, ranged attacks, Acrobatics, Stealth, and Thievery.' },
    'Concealed': { max: 0, text: 'Hard to make out (fog, dim light). Anyone targeting you rolls a DC 5 flat check; on a failure the attack or effect misses you.' },
    'Confused': { max: 0, text: "Off-guard, no reactions, no Delay or Ready. You spend your actions attacking whoever the dice pick. Damage from an attack or spell gives a DC 11 flat check to snap out of it." },
    'Controlled': { max: 0, text: 'Someone else chooses your actions.' },
    'Dazzled': { max: 0, text: 'Your eyes are overwhelmed: everything you see is concealed to you.' },
    'Deafened': { max: 0, text: "Can't hear. Checks that need hearing fail, Perception for initiative and checks that mix sound with sight take a −2 status penalty, and auditory actions need a DC 5 flat check." },
    'Doomed': { max: 3, text: 'You die at dying 4 minus this value. It drops by 1 after a full night\'s rest.' },
    'Drained': { max: 4, text: 'A status penalty on Constitution-based rolls and DCs (Fortitude saves), and your HP and maximum HP drop by your level times the value. It drops by 1 after a full night\'s rest.' },
    'Dying': { max: 4, text: "At 0 HP, unconscious, and close to death. Roll a recovery check (flat check, DC 10 + the value) at the start of each turn. You die at dying 4, less your doomed value." },
    'Encumbered': { max: 0, text: 'Carrying too much: clumsy 1 and a 10-foot penalty to all your Speeds.' },
    'Enfeebled': { max: 4, text: 'A status penalty equal to the value on Strength-based rolls and DCs: melee attacks and their damage, and Athletics.' },
    'Fascinated': { max: 0, text: "A −2 status penalty to Perception and skill checks, and no concentrate actions except about what holds your attention. Ends when anyone turns hostile toward you or your allies." },
    'Fatigued': { max: 0, text: 'A −1 status penalty to AC and saves, and no exploration activities while traveling. A full night\'s rest ends it.' },
    'Fleeing': { max: 0, text: 'You spend your actions getting away from the source, and you can\'t Delay or Ready.' },
    'Frightened': { max: 4, text: 'A status penalty equal to the value on all checks and DCs. It drops by 1 at the end of each of your turns (the tracker does this for you).' },
    'Grabbed': { max: 0, text: 'Held in place: off-guard and immobilized, and a manipulate action needs a DC 5 flat check or it\'s lost.' },
    'Hidden': { max: 0, text: "They know which square you're in but can't see you: you're off-guard to them, and they roll a DC 11 flat check to target you." },
    'Immobilized': { max: 0, text: "You can't use actions with the move trait." },
    'Invisible': { max: 0, text: "No one can see you: you're undetected until someone works out where you are, and hidden after that." },
    'Off-Guard': { max: 0, text: 'A −2 circumstance penalty to AC.' },
    'Paralyzed': { max: 0, text: "Off-guard, and you can't act, apart from Recall Knowledge and other purely mental actions." },
    'Petrified': { max: 0, text: "Turned to stone: you can't act or sense anything, and you count as an object." },
    'Prone': { max: 0, text: 'On the ground: off-guard, a −2 circumstance penalty to attack rolls, and Crawl and Stand are your only move actions.' },
    'Quickened': { max: 0, text: 'One extra action at the start of each turn, for whatever the effect allows.' },
    'Restrained': { max: 0, text: "Tied up or pinned: off-guard and immobilized, and no attack or manipulate actions except to Escape or Force Open." },
    'Sickened': { max: 4, text: "A status penalty equal to the value on all checks and DCs, and you can't willingly eat or drink. Spend an action retching for a Fortitude save to lower it." },
    'Slowed': { max: 3, text: 'Lose this many actions at the start of each of your turns.' },
    'Stunned': { max: 9, text: 'Lose this many actions as you regain them; each one lost lowers the value. A stun with a duration costs every action for that long instead.' },
    'Stupefied': { max: 4, text: 'A status penalty equal to the value on Intelligence-, Wisdom-, and Charisma-based rolls and DCs (Will saves, spell attacks and DCs), and casting a spell needs a DC 5 + value flat check.' },
    'Unconscious': { max: 0, text: "Asleep or knocked out: you can't act, you're blinded and off-guard, you take a −4 status penalty to AC, Perception, and Reflex saves, and you fall prone and drop what you hold." },
    'Undetected': { max: 0, text: "They don't know which square you're in: they have to guess, and even a right guess needs a DC 11 flat check." },
    'Wounded': { max: 3, text: "You've come back from dying. The next time you're dying, add this value. Treat Wounds that heals you, or full HP and 10 minutes' rest, ends it." }
};

// The rest of Player Core's and Player Core 2's conditions, for the Conditions page only (the tracker leaves them out).
const PF2E_CONDITION_EXTRA = {
    'Broken': { max: 0, text: "Objects only: at or below its Broken Threshold, an item can't do its job or give its bonuses. Broken armor still gives its item bonus to AC, with a −1 (light), −2 (medium), or −3 (heavy) status penalty to AC, and keeps its drawbacks." },
    'Cursebound': { max: 4, text: "Oracles only: the price of leaning on your mystery. Your own oracular curse says what each value does to you. Only Refocusing clears it." },
    'Friendly': { max: 0, text: "An attitude: they like you and will say yes to simple, safe Requests that don't cost them much. Hostile acts against them sour it." },
    'Helpful': { max: 0, text: "An attitude: they want to help you and take on reasonable Requests that don't hurt their own goals or way of life. Hostile acts against them sour it." },
    'Hostile': { max: 0, text: "An attitude: they want to harm you, though not always with a weapon, and refuse your Requests. Only magic can make a PC hostile." },
    'Indifferent': { max: 0, text: "An attitude: they don't care about you either way. Every creature starts here unless told otherwise." },
    'Observed': { max: 0, text: "In plain view, or found by another precise sense. Hide and Sneak can turn it into hidden or undetected; Seek with only imprecise senses finds you hidden, not observed." },
    'Persistent Damage': { max: 0, text: 'Ongoing damage, such as burning: you take it again at the end of each of your turns, rerolling the dice, then roll a DC 15 flat check. A success ends it.' },
    'Unfriendly': { max: 0, text: "An attitude: they dislike and distrust you, and refuse your Requests." },
    'Unnoticed': { max: 0, text: "They have no idea you're there. You're undetected too; some abilities work only on a foe who hasn't noticed you." }
};
