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
    // People keep their 5e keys (names and ages are rolled by them); this is what they're called.
    words: {
        race: { tiefling: 'nephilim', tieflings: 'nephilim', dragonborn: 'dragonblood' },
        class: { paladin: 'champion', warlock: 'witch', artificer: 'inventor' },
        // The pantheon's domains, as Pathfinder's cleric domains
        domain: { life: 'healing', light: 'sun', tempest: 'air', war: 'might' }
    }
};
