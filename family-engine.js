/* ============================================
   FAMILY ENGINE (F55, Worldbuilder)
   A seeded family tree for a noble house or anyone's family: the head of the house,
   their parents and grandparents back to the oldest ancestor, brothers and sisters,
   aunts, uncles, and cousins, children and grandchildren, the partners who married in,
   the dead (when and of what), second marriages, and a scandal or two.
   The head can be someone rolled elsewhere (a faction leader, a town's ruler): the
   tree is then built around that same NPC (opts.root). Everyone else old enough is
   rolled the NPC page's way too, with their name and age kept (lock=identity and
   lock=age), so their 🎭 link opens the same person, family name included.
   Every person rolls from deriveSeed(seed, <their place in the tree>), so a change in
   one branch leaves the others alone. Returns a family in family-tree.js's shape.
   Needs rng.js, npc-data.js, faction-engine.js (facPick, facWeighted, facShuffle, facCap),
   and family-tree.js. The tables are the Gazette's own.
   ============================================ */

const FAM_GENS = {
    3: { label: 'Three generations' },
    4: { label: 'Four generations' },
    5: { label: 'Five generations' }
};
// kids: how many children a marriage on the main line has; cap: people at most.
const FAM_SIZES = {
    small: { label: 'A small family', icon: '🌱', kids: [[0, 1], [1, 4], [2, 4], [3, 2]], cap: 26 },
    big: { label: 'A big family', icon: '🌳', kids: [[1, 1], [2, 3], [3, 4], [4, 3], [5, 2], [6, 1]], cap: 55 }
};
// Children of a marriage off the main line (aunts, uncles, cousins, younger children).
const FAM_SIDE_KIDS = [[0, 3], [1, 4], [2, 3], [3, 1]];

// What the people born into the family do: an NPC category, and the line it puts under their name.
const FAM_CATS_NOBLE = [['noble', 70], ['guard', 9], ['religious', 8], ['magic', 6], ['adventurer', 4], ['merchant', 3]];
const FAM_CAT_TITLES = {
    guard: [['Knight', 'Knight', 'Knight'], ['Guard', 'Guard', 'Guard']],
    religious: [['Priest', 'Priestess', 'Priest'], ['Priest', 'Priestess', 'Priest']],
    magic: [['Mage', 'Mage', 'Mage'], ['Mage', 'Mage', 'Mage']],
    adventurer: [['Adventurer', 'Adventurer', 'Adventurer'], ['Adventurer', 'Adventurer', 'Adventurer']],
    merchant: [['In trade', 'In trade', 'In trade'], ['Merchant', 'Merchant', 'Merchant']],
    criminal: [['Black sheep', 'Black sheep', 'Black sheep'], ['Black sheep', 'Black sheep', 'Black sheep']]
};

// How people died, as it reads after "Died".
const FAM_CAUSES = {
    old: ['of old age', 'in their sleep', 'of a long illness', 'of a winter cough', 'after a fall on the stairs', 'of a broken heart, they say', 'peacefully'],
    young: ['of a fever', 'of the red pox', 'in the plague year', 'by drowning in the millpond', 'of a winter cough', 'in a fall from the walls'],
    adult: ['in a duel', 'in the war', 'at sea', 'of a fever', 'in a fall from a horse', 'in a hunting accident', 'in the plague year',
        'of poison, some say', 'fighting a monster in the hills', 'in a fire', 'on the road', 'in childbed', 'in a tavern brawl']
};

// Newer causes (E7), swapped in by their share from a later draw. None names poison, old age, sleep, or peace,
// so the poison scandal picks from the same dead as before.
const FAM_CAUSES_MORE = {
    old: ['of a stroke at the dinner table', 'of the shaking sickness', 'after a hard winter', 'of gout and stubbornness', 'with the whole family at the bedside',
        'of a chill caught at a funeral', 'of a weak heart', 'after a long decline', 'after a fall in the garden', 'of the wasting sickness'],
    young: ['of the spotted fever', 'of a snakebite', 'of the summer flux', 'in a fall through the ice', 'of a dog bite gone bad', 'of the coughing sickness',
        'in a cart accident', 'of a chill after a soaking'],
    adult: ['in a siege', 'in a shipwreck', 'at the hands of bandits', 'of a wound that festered', 'in a rockfall', 'of a wyvern sting', 'in the flood year',
        'on campaign in the north', 'in a magical accident', 'of an owlbear mauling', 'defending the gate', 'of a curse nobody could lift',
        'in a trial by combat', 'of a fever caught abroad', 'in a riding accident at the tourney']
};

const FAM_HIDDEN = ['a farmhouse outside town', 'a temple orphanage', 'the house of an old nurse', 'a fishing village down the coast', 'a convent school', "a blacksmith's family who ask no questions"];
const FAM_HIDDEN_MORE = ["a shepherd's hut in the hills", 'a dwarven hold that owed the family a favor', 'a traveling circus', 'a monastery in the mountains',
    "a ferryman's cottage on the river", 'the crew of a merchant ship that rarely comes to port', "a wizard's tower, as a servant",
    'an inn on the far side of the kingdom', 'a forester\'s lodge deep in the woods'];

// ── The NPC page's rolls ──────────────────────────────────
// An NPC from one seed, the NPC page's way (facNpc, with a race when one is set).
function famNpc(seed, cat, age, race) {
    const seeds = Object.fromEntries(NPC_PARTS.map(part => [part, deriveSeed(seed, part)]));
    return rollNPC({ professionType: cat, age: age || 'random', race: race || 'random' }, seeds);
}

function famNpcQuery(seed, cat, age, race) {
    return paramsQuery({ seed, profession: cat, age: age || null, race: race || null });
}

// The name rollNPC's identity part draws from a seed, for a fixed race and gender.
function famIdentity(seed, race, gender) {
    return withSeed(seed, () => {
        randomArray(NPC_RACES);
        randomArray(NPC_GENDERS);
        return buildName(race, gender);
    });
}

// The age rollNPC's age part draws from a seed for a fixed bucket.
function famAgeOf(seed, race, bucket) {
    return withSeed(seed, () => {
        const spots = NPC_AGE_BUCKETS.map(() => rand());
        randomArray(NPC_AGE_BUCKETS);
        const [lo, hi] = NPC_AGE_RANGES[race][bucket];
        return lo + Math.floor(spots[NPC_AGE_BUCKETS.indexOf(bucket)] * (hi - lo + 1));
    });
}

// An identity seed whose name fits: a first name not in the family yet, and the family name (surname null = any,
// but never avoid: someone marrying in doesn't already carry the family's name).
function famFindName(base, race, gender, surname, used, avoid = null) {
    let last = null;
    for (let k = 0; k < 3000; k++) {
        const seed = k ? deriveSeed(base, String(k)) : base;
        last = { seed, n: famIdentity(seed, race, gender) };
        if (used.has(last.n.first)) continue;
        if (surname !== null && last.n.surname !== surname) continue;
        if (avoid && last.n.surname === avoid) continue;
        return last;
    }
    return last;
}

// An age seed that rolls exactly this age, or null (too young for the NPC page, or none found).
function famFindAge(base, race, age) {
    const R = NPC_AGE_RANGES[race];
    const bucket = NPC_AGE_BUCKETS.find(b => age >= R[b][0] && age <= R[b][1]);
    if (!bucket) return null;
    for (let k = 0; k < 5000; k++) {
        const seed = k ? deriveSeed(base, String(k)) : base;
        if (famAgeOf(seed, race, bucket) === age) return { seed, bucket };
    }
    return null;
}

// ── Lives ─────────────────────────────────────────────────
// Alive or dead at w years since birth: { dead, age, ago, cause }. Four draws, always.
function famFate(w, R) {
    const r = [rand(), rand(), rand(), rand()];
    const old0 = R.old[0], end = R.ancient[1];
    const pDead = w > end ? 1 : w >= old0 ? 0.3 + 0.6 * (w - old0) / (end - old0) : w >= R.adult[0] ? 0.1 : w >= R.young[0] ? 0.06 : 0.04;
    if (r[0] >= pDead) return { dead: false, age: w, ago: 0, cause: '' };
    let age, kind;
    if (w >= old0 && (r[1] < 0.65 || w > end)) {
        age = old0 + Math.floor(r[2] * (Math.min(w, end) - old0 + 1));
        kind = 'old';
    } else {
        age = Math.min(w, end, Math.floor(w * (0.15 + 0.8 * r[2])));
        kind = age < R.young[0] ? 'young' : 'adult';
    }
    const list = FAM_CAUSES[kind];
    return { dead: true, age, ago: w - age, cause: list[Math.floor(r[3] * list.length)], kind };
}

// One of the newer lines in place of cur, by its share of the whole list (always two draws).
function famSwap(cur, old, more) {
    const newer = facPick(more);
    return rand() < more.length / (old.length + more.length) ? newer : cur;
}

// Causes the poison scandal never picks (and that never swap, so it picks from the same dead).
const FAM_NOT_POISON = /poison|old age|sleep|peacefully/;

function famGenderPick(partner) {
    if (partner === 'male') return facWeighted([['female', 85], ['male', 10], ['nonbinary', 5]]);
    if (partner === 'female') return facWeighted([['male', 85], ['female', 10], ['nonbinary', 5]]);
    if (partner === 'nonbinary') return facWeighted([['male', 45], ['female', 45], ['nonbinary', 10]]);
    return facWeighted([['male', 47], ['female', 47], ['nonbinary', 6]]);
}

// The house's name from its head: the Factions tab's rule for a noble house, "the X family" for anyone else.
function famHouseName(npc, noble, hereditary) {
    if (noble) {
        if (npc.race === 'dragonborn' && npc.surname) return `Clan ${npc.surname}`;
        return hereditary ? `House ${npc.surname}` : `the House of ${npc.firstName}`;
    }
    return hereditary ? `the ${npc.surname} family` : `the family of ${npc.firstName}`;
}

// ── Scandals ──────────────────────────────────────────────
// Each pick(c) returns { text, who } (text names people {0}, {1}…) or null when it doesn't fit.
// c: { fam, R, head, heir, noble, add(person, union) }
const FAM_SCANDALS = [
    {
        key: 'bastard',
        pick(c) {
            const kids = c.living(c.blood()).filter(p => p.of && p.age >= 1 && p.id !== c.head.id && famUnion(c.fam, p.of).b);
            if (!kids.length) return null;
            const k = facPick(kids), u = famUnion(c.fam, k.of);
            return { text: `{0} is not {1}'s child, whatever the family records say. {2} has kept that secret for ${k.age} ${k.age === 1 ? 'year' : 'years'}.`, who: [k.id, u.a, u.b] };
        }
    },
    {
        key: 'hidden',
        pick(c) {
            const list = c.living(c.blood()).filter(p => p.age >= c.R.adult[0] + 1);
            if (!list.length) return null;
            const p = facPick(list);
            const space = Math.max(1, Math.round(c.R.adult[0] / 26));
            const age = 1 + Math.floor(rand() * Math.max(1, Math.min(15 * space, p.age - c.R.young[0])));
            const k = c.add({ race: p.race, gender: famGenderPick(), w: age, surname: null, cat: 'commoner', alive: true }, { a: p.id, b: '', kind: 'secret' });
            if (!k) return null;
            const place = facPick(FAM_HIDDEN);
            return { text: `{0} has a child nobody in the family knows about: {1}, raised in ${place} and told nothing.`, who: [p.id, k.id], place };
        }
    },
    {
        key: 'poison',
        pick(c) {
            const space = Math.max(1, Math.round(c.R.adult[0] / 26));
            const dead = c.fam.people.filter(p => p.dead && p.cause && !FAM_NOT_POISON.test(p.cause) && p.ago >= 1 && p.ago <= 40 * space);
            if (!dead.length) return null;
            const d = facPick(dead);
            const who = c.living(c.fam.people).filter(p => p.id !== d.id && p.age >= d.ago + c.R.young[0]);
            if (!who.length) return null;
            return { text: `{0} did not die ${d.cause}. {1} poisoned them, and nobody has asked the right questions.`, who: [d.id, facPick(who).id] };
        }
    },
    {
        key: 'disinherited',
        pick(c) {
            const list = c.living(c.blood()).filter(p => p !== c.head && p !== c.heir && p.age >= c.R.adult[0]
                && famUnionsOf(c.fam, p.id).some(u => u.kind === 'wed' && u.b && !famPerson(c.fam, u.b).dead));
            if (!list.length) return null;
            const p = facPick(list), u = famUnionsOf(c.fam, p.id).find(x => x.kind === 'wed' && x.b && !famPerson(c.fam, x.b).dead);
            if (!p.title) p.title = 'Disinherited';
            return { text: '{0} was cut out of the will for marrying {1}, and still comes to every feast, smiling.', who: [p.id, u.b] };
        }
    },
    {
        key: 'debts',
        pick(c) {
            if (c.head.dead) return null;
            return { text: `{0} has borrowed against everything the family owns to pay gambling debts, and the lenders are getting impatient.`, who: [c.head.id] };
        }
    },
    {
        key: 'will',
        pick(c) {
            const pairs = [];
            c.fam.unions.forEach(u => {
                const parents = [u.a, u.b].filter(Boolean).map(id => famPerson(c.fam, id));
                if (!parents.some(p => p.dead)) return;
                const kids = c.living(famKids(c.fam, u.id)).filter(p => p.age >= c.R.adult[0]);
                for (let i = 0; i < kids.length; i++) for (let j = i + 1; j < kids.length; j++) pairs.push([kids[i], kids[j]]);
            });
            if (!pairs.length) return null;
            const [a, b] = facPick(pairs);
            return { text: "{0} and {1} have not spoken since their parent's will was read. Each says the other forged it.", who: [a.id, b.id] };
        }
    },
    {
        key: 'affair',
        pick(c) {
            const list = c.fam.unions.filter(u => u.kind === 'wed' && u.b && !famPerson(c.fam, u.a).dead && !famPerson(c.fam, u.b).dead);
            if (!list.length) return null;
            const u = facPick(list);
            return { text: '{0} is having an affair, and {1} is the last to know.', who: [u.b, u.a] };
        }
    },
    {
        key: 'heir',
        pick(c) {
            if (!c.heir) return null;
            const list = c.living(famKids(c.fam, c.heir.of)).filter(p => p !== c.heir && p.age >= c.R.young[0]);
            if (!list.length) return null;
            return { text: '{0} wants to inherit badly enough to arrange an accident for {1}.', who: [facPick(list).id, c.heir.id] };
        }
    },
    {
        key: 'cult',
        pick(c) {
            const list = c.living(c.blood()).filter(p => p.age >= c.R.young[0]);
            if (!list.length) return null;
            return { text: '{0} slips out at night to meet a cult under the old chapel. The family thinks it is a lover.', who: [facPick(list).id] };
        }
    },
    {
        key: 'claimant',
        pick(c) {
            const space = Math.max(1, Math.round(c.R.adult[0] / 26));
            const list = c.blood().filter(p => p.dead && p.age < c.R.adult[0] && p.ago >= 3 && p.ago <= 40 * space);
            if (!list.length) return null;
            const d = facPick(list);
            if (c.head.dead) return null;
            return { text: `A stranger claiming to be {0}, who died ${d.ago} years ago, has written to {1} asking for a share of the inheritance.`, who: [d.id, c.head.id] };
        }
    }
];

// Other ways to tell the scandals whose text is fixed (E7), swapped in by their share.
const FAM_SCANDAL_ALTS = {
    disinherited: ['{0} was disowned for marrying {1}, and has spent every year since working to buy back the family\'s favor.',
        '{0} lost their inheritance for marrying {1}. Neither of them has forgiven the family, and both are very polite about it.'],
    debts: ['{0} has been selling the family silver piece by piece and replacing it with tin. The next feast will give it away.',
        '{0} signed a contract with a moneylender who wants the family seat as payment, and the day is close.'],
    will: ["{0} and {1} are suing each other over their parent's will, and only the lawyers are getting rich.",
        "{0} hid their parent's last will before it could be read, and {1} has hired someone to find it."],
    affair: ['{0} has a lover in the next town over, and {1} has started to wonder about all the trips.',
        'Half the town knows {0} is unfaithful. {1} has just found out, and is planning something.'],
    heir: ["{0} has been slipping something into {1}'s wine, a little at a time.",
        '{0} is paying a hedge wizard to curse {1}, so far without much luck.'],
    cult: ['{0} has joined a cult that meets in the woods at the new moon, and has started bringing strangers home.',
        '{0} keeps a shrine to a forbidden god behind a loose panel in their room.']
};

// Newer scandals (E7). A rolled family draws its scandals from FAM_SCANDALS first, then a later draw may
// swap one for a newer kind. None of these adds anyone to the family or changes a title.
const famHouseLike = c => /^(House|Clan|The House of) /.test(c.fam.name);
const famAdults = c => c.living(c.blood()).filter(p => p.age >= c.R.adult[0]);
const famSingle = (c, p) => !famUnionsOf(c.fam, p.id).length && !famMarriedInto(c.fam, p.id);
const FAM_SCANDALS_MORE = [
    {
        key: 'heirloom',
        pick(c) {
            const list = famAdults(c);
            if (!list.length) return null;
            return { text: "{0} pawned the family's ancestral sword and had a copy made. The copy hangs over the hearth.", who: [facPick(list).id] };
        }
    },
    {
        key: 'spy',
        pick(c) {
            const list = c.fam.unions.filter(u => u.kind === 'wed' && u.b && !famPerson(c.fam, u.b).dead && famPerson(c.fam, u.b).age >= c.R.adult[0]);
            if (!list.length) return null;
            return { text: `{0} married into the family to spy on it for a rival ${famHouseLike(c) ? 'house' : 'family'}, and has been sending reports for years.`, who: [facPick(list).b] };
        }
    },
    {
        key: 'elope',
        pick(c) {
            const list = c.living(c.blood()).filter(p => p.age >= c.R.young[0] && p.age <= c.R.adult[1] && p !== c.head && famSingle(c, p));
            if (!list.length) return null;
            return { text: '{0} plans to run off with a stablehand on the next moonless night, and has already packed.', who: [facPick(list).id] };
        }
    },
    {
        key: 'ghost',
        pick(c) {
            const space = Math.max(1, Math.round(c.R.adult[0] / 26));
            const dead = c.blood().filter(p => p.dead && p.ago <= 30 * space);
            const alive = c.living(c.fam.people).filter(p => p.age >= c.R.young[0]);
            if (!dead.length || !alive.length) return null;
            return { text: '{0} still walks the halls at night. {1} has seen them twice and told no one.', who: [facPick(dead).id, facPick(alive).id] };
        }
    },
    {
        key: 'hag',
        pick(c) {
            if (c.head.dead) return null;
            return { text: "{0} made a bargain with a hag for the family's good fortune, and the hag is coming to collect.", who: [c.head.id] };
        }
    },
    {
        key: 'wolf',
        pick(c) {
            const list = famAdults(c);
            if (!list.length) return null;
            return { text: '{0} was bitten by a wolf on a hunt last autumn and has not been the same at the full moon.', who: [facPick(list).id] };
        }
    },
    {
        key: 'charter',
        pick(c) {
            if (c.head.dead) return null;
            const who = famAdults(c).concat(c.living(c.fam.people).filter(p => !famIsBlood(c.fam, p) && p.age >= c.R.adult[0])).filter(p => p !== c.head);
            if (!who.length) return null;
            return {
                text: famHouseLike(c) ? "The charter that gives {0}'s house its lands is a forgery. {1} knows, and is waiting for the right moment."
                    : "The money that set {0}'s family up came from a robbery nobody was ever hanged for. {1} has found out, and is waiting for the right moment.",
                who: [c.head.id, facPick(who).id]
            };
        }
    },
    {
        key: 'deserter',
        pick(c) {
            const list = famAdults(c).filter(p => p.age >= c.R.adult[0] + 5 * Math.max(1, Math.round(c.R.adult[0] / 26)));
            if (!list.length) return null;
            return { text: "{0} ran from the battle that made the family's name. Almost everyone who saw it is dead now.", who: [facPick(list).id] };
        }
    },
    {
        key: 'wed',
        pick(c) {
            const list = famAdults(c).filter(p => p !== c.head && famSingle(c, p));
            if (!list.length) return null;
            return { text: '{0} is secretly married to someone the family would never accept, and wears the ring on a cord under their shirt.', who: [facPick(list).id] };
        }
    },
    {
        key: 'duel',
        pick(c) {
            const list = famAdults(c);
            if (list.length < 2) return null;
            const a = facPick(list), b = facPick(list.filter(p => p !== a));
            return { text: '{0} killed a rival in a duel that was not quite fair, and {1} helped hide the body.', who: [a.id, b.id] };
        }
    },
    {
        key: 'blackmail',
        pick(c) {
            const list = c.living(c.fam.people).filter(p => p.age >= c.R.adult[0]);
            if (list.length < 2) return null;
            const a = facPick(list), b = facPick(list.filter(p => p !== a));
            return { text: '{0} has been blackmailing {1} for years over a letter that should have been burned.', who: [a.id, b.id] };
        }
    },
    {
        key: 'smuggling',
        pick(c) {
            if (c.head.dead) return null;
            return { text: "{0} has been letting smugglers use the family's cellars, and the Watch is getting curious.", who: [c.head.id] };
        }
    }
];

// A scandal's newer wording or hiding place, by share: two draws each, always.
function famScandalMore(s, key) {
    const alts = FAM_SCANDAL_ALTS[key];
    if (alts) s.text = famSwap(s.text, [s.text], alts);
    else rand(), rand();
    if (s.place) s.text = s.text.replace(s.place, famSwap(s.place, FAM_HIDDEN, FAM_HIDDEN_MORE));
    else rand(), rand();
    return s;
}

// ── The roll ─────────────────────────────────────────────
// opts: { gens: 'random'|3|4|5, size: 'random'|small|big, race: 'random'|race,
//         root: { seed, cat, age, title, house } (an NPC rolled elsewhere) or null }
// Returns { fam, gens, size, race, noble }.
function rollFamily(seed, opts = {}) {
    const part = (label, fn) => withSeed(deriveSeed(seed, label), fn);
    const gens = FAM_GENS[opts.gens] ? Number(opts.gens) : part('gens', () => facWeighted([[3, 3], [4, 4], [5, 2]]));
    const size = FAM_SIZES[opts.size] ? opts.size : part('size', () => facWeighted([['small', 1], ['big', 1]]));
    const S = FAM_SIZES[size];
    const root = opts.root || null;

    // The head of the house.
    const headSeed = root ? root.seed : deriveSeed(seed, 'head');
    const headCat = root ? root.cat : 'noble';
    const headAge = root ? root.age : part('head.age', () => facWeighted([['adult', 2], ['middle', 5], ['old', 3]]));
    const headRace = root ? null : (NPC_RACES.includes(opts.race) ? opts.race : null);
    const npc = famNpc(headSeed, headCat, headAge, headRace);
    const race = npc.race, R = NPC_AGE_RANGES[race];
    const noble = !root || root.cat === 'noble' || !!root.house;
    const hereditary = !!npc.surname && race !== 'orc' && !/^the /.test(npc.surname);
    const surname = hereditary ? npc.surname : null;
    const A0 = R.adult[0], Y0 = R.young[0];
    const gapLo = Math.max(Y0, Math.round(A0 * 0.8)), gapHi = Math.round(A0 * 1.35);
    const space = Math.max(1, Math.round(A0 / 26));
    const catsBlood = noble ? FAM_CATS_NOBLE : [[headCat, 60], ['commoner', 15], ['merchant', 8], ['guard', 6], ['religious', 5], ['magic', 3], ['adventurer', 3]];
    const catsWed = noble ? [['noble', 80], ['merchant', 10], ['guard', 10]] : [[headCat, 30], ['commoner', 40], ['merchant', 15], ['guard', 8], ['religious', 7]];

    const fam = { name: '', top: '', root: '', people: [], unions: [], scandals: [], edited: '' };
    const used = new Set();
    let pn = 0, un = 0;

    // Make a person. o: { race, gender, w (years since birth), surname (null = any), cat, alive, maxAgo }
    function person(label, o) {
        const fate = o.alive ? { dead: false, age: o.w, ago: 0, cause: '' } : part(label + '.fate', () => famFate(o.w, NPC_AGE_RANGES[o.race]));
        // A parent was alive when their eldest was born.
        if (fate.dead && o.maxAgo !== undefined && fate.ago > o.maxAgo) {
            fate.ago = part(label + '.late', () => Math.floor(rand() * (o.maxAgo + 1)));
            fate.age = o.w - fate.ago;
        }
        if (fate.dead && !FAM_NOT_POISON.test(fate.cause)) fate.cause = part(label + '.fate.more', () => famSwap(fate.cause, FAM_CAUSES[fate.kind], FAM_CAUSES_MORE[fate.kind]));
        // o.npc: someone rolled already (the head), who keeps their own name and link.
        const id = o.npc ? { n: { first: o.npc.firstName, name: o.npc.name } } : famFindName(deriveSeed(seed, label + '.id'), o.race, o.gender, o.surname, used, o.surname === null ? surname : null);
        used.add(id.n.first);
        const p = {
            id: 'p' + (pn++).toString(36), name: id.n.name, gender: o.gender, race: o.race,
            age: fate.age, dead: fate.dead, ago: fate.ago, cause: fate.cause,
            title: '', note: '', npc: '', to: '', of: '', _w: o.w, _cat: o.cat
        };
        if (!p.dead && !o.npc) {
            const ag = famFindAge(deriveSeed(seed, label + '.age'), o.race, p.age);
            if (ag) p.npc = paramsQuery({ seed: deriveSeed(seed, label + '.npc'), profession: o.cat, lock: [`identity.${id.seed}.${o.race}.${o.gender}`, `age.${ag.seed}.${ag.bucket}`] });
        }
        fam.people.push(p);
        return p;
    }

    function union(a, b, kind = 'wed') {
        const u = { id: 'u' + (un++).toString(36), a: a.id, b: b ? b.id : '', kind };
        fam.unions.push(u);
        return u;
    }

    // Someone marrying into the family, about the age of their partner (in their own race's years).
    function spouse(label, p, minW = 0) {
        return part(label, () => {
            const sRace = rand() < 0.85 ? p.race : facPick(NPC_RACES);
            const gender = famGenderPick(p.gender);
            const sA0 = NPC_AGE_RANGES[sRace].adult[0], sSpace = Math.max(1, Math.round(sA0 / 26));
            let w = Math.round(p._w * sA0 / NPC_AGE_RANGES[p.race].adult[0]);
            w += rand() < 0.15 ? -(5 + Math.floor(rand() * 16)) * sSpace : Math.round((rand() - 0.5) * 12 * sSpace);
            w = Math.max(NPC_AGE_RANGES[sRace].young[0], sRace === p.race ? Math.max(w, minW) : w);
            const cat = facWeighted(catsWed);
            return { race: sRace, gender, w, cat };
        });
    }

    function marry(label, p, minW = 0, kind = 'wed') {
        if (fam.people.length >= S.cap) return null;
        const s = spouse(label, p, minW);
        return union(p, person(label, { ...s, surname: null }), kind);
    }

    // A child born into the family. maxAgo: they died after their own eldest was born, if they have one later.
    function child(label, u, w, gender) {
        const a = famPerson(fam, u.a);
        const cat = part(label + '.cat', () => facWeighted(catsBlood));
        const k = person(label, { race: a.race, gender: gender || part(label + '.g', () => famGenderPick()), w, surname, cat });
        k.of = u.id;
        return k;
    }

    // Children of a union: the eldest born a generation after the younger parent, the rest a few years apart,
    // none before a parent was old enough or after one had died. main: the line runs on through the eldest.
    const queue = [];
    function haveKids(label, u, row, main, cap = Infinity) {
        if (row >= gens - 1) return;
        const a = famPerson(fam, u.a), b = u.b ? famPerson(fam, u.b) : null;
        const plan = part(label + '.kids', () => {
            const n = facWeighted(main ? S.kids : FAM_SIDE_KIDS);
            const gap = gapLo + Math.floor(rand() * (gapHi - gapLo + 1));
            const steps = Array.from({ length: 8 }, () => (1 + Math.floor(rand() * 3)) * space);
            return { n: main && !n ? 1 : n, gap, steps };
        });
        const youngest = b && b.race === a.race ? Math.min(a._w, b._w) : a._w;
        const latest = Math.max(a.dead ? a.ago : 0, b && b.dead && b.race === a.race ? b.ago : 0);
        let w = Math.min(youngest - plan.gap, cap), heir = main;
        // The main line goes on if it can: the eldest born as soon as the younger parent was old enough.
        if (main && w < latest) w = Math.min(youngest - gapLo, cap);
        for (let k = 0; k < plan.n && w >= latest && fam.people.length < S.cap; k++) {
            const kid = child(`${label}.k${k}`, u, w);
            // The line runs on through the eldest who lived to grow up.
            const grew = (kid.dead ? kid.age : kid._w) >= Y0;
            queue.push({ id: kid.id, label: `${label}.k${k}`, row: row + 1, main: heir && grew });
            if (grew) heir = false;
            w -= plan.steps[k];
        }
    }

    // A person born into the family: maybe a marriage (and a second one after a death or a parting), and children.
    function grow(item) {
        const p = famPerson(fam, item.id);
        const life = p.dead ? p.age : p._w;
        const chance = life >= A0 ? (item.main ? 0.9 : 0.7) : life >= Y0 ? 0.3 : 0;
        const plan = part(item.label + '.wed', () => ({ wed: rand() < chance, apart: rand() < 0.07, again: rand() < 0.4 }));
        if (!plan.wed && !(item.main && life >= Y0 && item.row < gens - 1)) return;
        const u1 = marry(item.label + '.s0', p, 0, plan.apart ? 'apart' : 'wed');
        if (!u1) return;
        haveKids(item.label + '.u0', u1, item.row, item.main);
        const s1 = famPerson(fam, u1.b);
        const ended = u1.kind === 'apart' ? Math.max(0, Math.floor((p.dead ? p.ago : 0) + (life - Y0) / 3)) : s1.dead ? s1.ago : -1;
        // A second marriage, after the first partner died (or the two parted), while they lived.
        if (ended > (p.dead ? p.ago : 0) + space && plan.again && life >= Y0) {
            const u2 = marry(item.label + '.s1', p);
            if (u2) haveKids(item.label + '.u1', u2, item.row, false, ended - 1);
        }
    }

    // The head, and how many generations below and above them the tree shows.
    const head = person('head', { race, gender: npc.gender, w: parseInt(npc.age, 10) || A0, surname: null, cat: headCat, alive: true, npc });
    head.npc = famNpcQuery(headSeed, headCat, headAge === 'random' ? null : headAge, headRace);
    // At least the head's parents above them; below, as many generations as the head is old enough for.
    // (Counted with the longest gap, so the generations below have room to be born.)
    const down = Math.max(0, Math.min(gens - 2, Math.floor((head._w - 1) / gapHi)));
    const up = gens - 1 - down;

    // Up the line: each ancestor a generation older, with a partner, and the line child's brothers and sisters.
    let kid = head;
    const sides = [];
    for (let i = 1; i <= up; i++) {
        const label = 'up' + i;
        const plan = part(label, () => ({
            gap: gapLo + Math.floor(rand() * (gapHi - gapLo + 1)),
            gender: famGenderPick(),
            n: Math.max(1, facWeighted(i === 1 ? S.kids : FAM_SIDE_KIDS)),
            at: rand(),
            steps: Array.from({ length: 8 }, () => (1 + Math.floor(rand() * 3)) * space)
        }));
        const pw = kid._w + plan.gap;
        const parent = person(label, { race, gender: plan.gender, w: pw, surname, cat: part(label + '.cat', () => facWeighted(catsBlood)), maxAgo: kid._w });
        const s = spouse(label + '.s', parent, kid._w + Y0);
        const sp = person(label + '.s', { ...s, surname: null, maxAgo: kid._w });
        const u = union(parent, sp);
        kid.of = u.id;
        // Brothers and sisters, older and younger, born while both parents lived.
        const youngest = s.race === race ? Math.min(pw, sp._w) : pw;
        const latest = Math.max(parent.dead ? parent.ago : 0, sp.dead && s.race === race ? sp.ago : 0);
        const j = Math.floor(plan.at * plan.n);
        let older = kid._w, younger = kid._w;
        for (let k = 0; k < plan.n - 1; k++) {
            const elder = k < j;
            const w = elder ? (older += plan.steps[k]) : (younger -= plan.steps[k]);
            if (w > youngest - Y0 || w < latest || fam.people.length >= S.cap) continue;
            const sib = child(`${label}.k${k}`, u, w);
            sides.push({ id: sib.id, label: `${label}.k${k}`, row: up - i + 1, main: false });
        }
        parent._line = true;
        kid = parent;
    }
    fam.top = kid.id;
    fam.root = head.id;

    // Down from the head first (their line gets the room), then their brothers and sisters, then the older branches.
    queue.push({ id: head.id, label: 'head', row: up, main: true }, ...sides);
    for (let q = 0; q < queue.length; q++) grow(queue[q]);

    // Titles: the head, the heir, the partner at the head's side, those before them, and what the rest do.
    const R0 = FAM_CAT_TITLES;
    head.title = root && root.title ? root.title : noble ? genderedTitle(['Lord', 'Lady', 'Liege'], head.gender) : 'Head of the family';
    const headKids = famUnionsOf(fam, head.id).flatMap(u => famKids(fam, u.id)).filter(p => !p.dead).sort((x, y) => y._w - x._w);
    const heir = headKids[0] || null;
    if (heir) heir.title = 'Heir';
    const consort = famUnionsOf(fam, head.id).find(u => u.kind === 'wed' && u.b && !famPerson(fam, u.b).dead);
    if (consort && noble) famPerson(fam, consort.b).title = 'Consort';
    fam.people.forEach(p => {
        if (p.title || p.id === head.id) return;
        if (p._line) { p.title = noble ? 'Former head of the house' : 'Former head of the family'; return; }
        const life = p.dead ? p.age : p._w;
        if (famIsBlood(fam, p) && life >= Y0 && R0[p._cat]) p.title = genderedTitle(R0[p._cat][noble ? 0 : 1], p.gender);
    });

    fam.name = facCap(root && root.house ? root.house : famHouseName(npc, noble, hereditary));

    // A scandal or two.
    const c = famScandalCtx(fam, (o, u) => {
        if (fam.people.length >= FAM_LIMITS.people) return null;
        const nu = union(famPerson(fam, u.a), null, u.kind);
        const k = person(`hidden.${nu.id}`, { ...o, surname: null });
        k.of = nu.id;
        return k;
    });
    part('scandals', () => {
        const want = 1 + (rand() < (size === 'big' ? 0.7 : 0.3) ? 1 : 0);
        for (const sc of facShuffle(FAM_SCANDALS)) {
            if (fam.scandals.length >= want) break;
            const s = sc.pick(c);
            if (s) fam.scandals.push({ ...s, key: sc.key });
        }
    });
    // A later draw (E7): a newer kind in place of one by its share (not one that added a child or a title),
    // and newer wording for the rest.
    part('scandals.more', () => {
        const share = FAM_SCANDALS_MORE.length / (FAM_SCANDALS.length + FAM_SCANDALS_MORE.length);
        const order = facShuffle(FAM_SCANDALS_MORE);
        const used = new Set();
        fam.scandals = fam.scandals.map(s => {
            const swap = rand() < share;
            if (swap && s.key !== 'hidden' && s.key !== 'disinherited') {
                for (const sc of order) {
                    if (used.has(sc.key)) continue;
                    const n = sc.pick(c);
                    if (n) { used.add(sc.key); return n; }
                }
            }
            return famScandalMore(s, s.key);
        });
    });

    return { fam: famClean(fam), gens, size, race, noble };
}

// What a scandal's pick() reads. add(o, union) adds a child to a new union of union.a.
function famScandalCtx(fam, add) {
    const head = famPerson(fam, fam.root) || famPerson(fam, fam.top);
    const heir = fam.people.find(p => p.title === 'Heir' && !p.dead && p.of)
        || famUnionsOf(fam, head.id).flatMap(u => famKids(fam, u.id)).find(p => !p.dead) || null;
    return {
        fam, R: NPC_AGE_RANGES[famRace(fam)], head, heir,
        blood: () => fam.people.filter(p => famIsBlood(fam, p)),
        living: list => list.filter(p => !p.dead),
        add
    };
}

// ── By hand ───────────────────────────────────────────────
// The family name people born into it carry (from the head, or the oldest ancestor), or null when names aren't handed down.
function famSurname(fam) {
    const p = famPerson(fam, fam.root) && famIsBlood(fam, famPerson(fam, fam.root)) ? famPerson(fam, fam.root) : famPerson(fam, fam.top);
    if (!p || p.race === 'orc') return null;
    const clan = p.name.match(/ of Clan (.+)$/);
    const s = clan ? clan[1] : p.name.replace(/^\S+\s*/, '').replace(/^"[^"]*"\s*/, '').trim();
    return s && !/^the /i.test(s) ? s : null;
}

function famFirstNames(fam) {
    return new Set(fam.people.map(p => p.name.split(' ')[0]));
}

// A new person with a rolled name: { race, gender, age } plus the family name when born into it.
// They get an NPC link when the NPC page can roll them as they are.
function famRolledPerson(fam, o) {
    const surname = o.blood ? famSurname(fam) : null;
    const found = famFindName(newSeed(), o.race, o.gender, surname, famFirstNames(fam), o.blood ? null : famSurname(fam));
    const exact = surname === null || found.n.surname === surname;
    const name = exact ? found.n.name : o.race === 'dragonborn' ? `${found.n.first} of Clan ${surname}` : `${found.n.first} ${surname}`;
    const cat = /^(House|Clan|the House of) /i.test(fam.name) ? 'noble' : 'commoner';
    const ag = exact && !o.dead ? famFindAge(newSeed(), o.race, o.age) : null;
    return {
        name, gender: o.gender, race: o.race, age: o.age, dead: false, ago: 0, cause: '', title: '', note: '', to: '',
        npc: ag ? paramsQuery({ seed: newSeed(), profession: cat, lock: [`identity.${found.seed}.${o.race}.${o.gender}`, `age.${ag.seed}.${ag.bucket}`] }) : ''
    };
}

// The person to add next to someone: a partner about their age, a child a generation younger
// (younger than the children they have, but born while the parents lived), a brother or sister, or a parent a generation older.
// other: the child's other parent, if named.
function famNewPerson(fam, anchor, rel, other = null) {
    const race = rel === 'spouse' ? anchor.race : famRace(fam);
    const R = NPC_AGE_RANGES[race], A0 = R.adult[0], space = Math.max(1, Math.round(A0 / 26));
    const born = famBorn(anchor);
    let age;
    if (rel === 'spouse') age = born;
    else if (rel === 'parent') age = born + A0;
    else if (rel === 'sibling') age = Math.max(0, born - 2 * space);
    else {
        const kids = famUnionsOf(fam, anchor.id).concat(famMarriedInto(fam, anchor.id) || []).flatMap(u => famKids(fam, u.id));
        age = kids.length ? Math.max(0, Math.min(...kids.map(famBorn)) - 2 * space) : Math.max(0, born - A0);
        age = Math.max(age, ...[anchor, other].filter(p => p && p.dead).map(p => p.ago));
    }
    const gender = rel === 'spouse' ? famGenderPick(anchor.gender) : famGenderPick();
    // Past a long life (or a parent of someone long dead): dead, of old age, at the middle of old age.
    const dead = age > R.old[1] || (rel === 'parent' && anchor.dead && anchor.ago + anchor.age + A0 > R.old[0]);
    const p = famRolledPerson(fam, { race, gender, age, blood: rel !== 'spouse', dead });
    if (dead) {
        const at = Math.min(age, Math.round((R.old[0] + R.old[1]) / 2));
        Object.assign(p, { dead: true, age: at, ago: age - at, cause: 'of old age' });
    }
    return p;
}

// One more scandal that fits the family as it is now (it may add a hidden child), or null.
function famRollScandal(fam) {
    const have = new Set(fam.scandals.map(s => famScandalText(fam, s)));
    const c = famScandalCtx(fam, (o, u) => {
        if (fam.people.length >= FAM_LIMITS.people || fam.unions.length >= FAM_LIMITS.unions) return null;
        const uid = famNewId(fam, 'u');
        fam.unions.push({ id: uid, a: u.a, b: '', kind: u.kind });
        const k = { ...famRolledPerson(fam, { race: o.race, gender: o.gender, age: o.w, blood: false }), id: famNewId(fam, 'p'), of: uid };
        fam.people.push(k);
        return k;
    });
    for (const sc of facShuffle(FAM_SCANDALS.concat(FAM_SCANDALS_MORE))) {
        const keep = JSON.stringify(fam);
        const got = sc.pick(c);
        // Not one the family has already, in any of its wordings.
        const said = got && [got.text, ...(FAM_SCANDAL_ALTS[sc.key] || [])].some(text => have.has(famScandalText(fam, { text, who: got.who })));
        if (got && !said) {
            const s = famScandalMore(got, sc.key);
            return { text: s.text, who: s.who };
        }
        // A pick that added someone but isn't used takes them back out.
        if (JSON.stringify(fam) !== keep) Object.assign(fam, JSON.parse(keep));
    }
    return null;
}

// A family of one, to build by hand.
function famBlank(race) {
    const r = NPC_RACES.includes(race) ? race : 'human';
    const gender = famGenderPick();
    const found = famFindName(newSeed(), r, gender, null, new Set());
    const n = found.n, R = NPC_AGE_RANGES[r];
    const hereditary = !!n.surname && r !== 'orc' && !/^the /.test(n.surname);
    const age = R.adult[0] + Math.floor(Math.random() * (R.middle[1] - R.adult[0]));
    const ag = famFindAge(newSeed(), r, age);
    const p = {
        id: 'p0', name: n.name, gender, race: r, age, dead: false, ago: 0, cause: '', title: genderedTitle(['Lord', 'Lady', 'Liege'], gender), note: '', to: '', of: '',
        npc: ag ? paramsQuery({ seed: newSeed(), profession: 'noble', lock: [`identity.${found.seed}.${r}.${gender}`, `age.${ag.seed}.${ag.bucket}`] }) : ''
    };
    return famClean({ name: facCap(famHouseName({ race: r, surname: n.surname, firstName: n.first }, true, hereditary)), top: 'p0', root: 'p0', people: [p], unions: [], scandals: [], edited: new Date().toISOString() });
}

// A link that rolls the family of someone rolled elsewhere (a faction leader, a town's ruler).
// p: { seed, cat, age } as facNpc makes them. o: { title, house, extra: more URL params }
function famRootLink(p, o = {}) {
    return 'worldbuilder?' + paramsQuery({
        tab: 'family', root: p.seed, rcat: p.cat, rage: p.age || null,
        rtitle: o.title || null, house: o.house || null, ...(o.extra || {})
    });
}
