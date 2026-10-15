/* ============================================
   HANDOUT MAKER (F48): four player handouts, page-free.
   Wanted posters, letters and sealed notes, bounty boards (up to 6 notices), and shop
   price lists. A handout is { t, ...fields }; HANDOUT_FIELDS says which fields each one
   has, handoutClean() trims anything (a save, a backup) to that shape, handoutSheetHtml()
   draws it in the parchment style of handouts.css (escaped, so typed text is safe), and
   handoutText() is the plain text for Copy.
   Filling from a roll: handoutFromSource(t, src) turns a rolled NPC, quest, or shop
   (replayed from its link by handoutSource()) into a handout. The extra words it adds
   (crime, reward, letter lines, other notices) roll from deriveSeed(source seed, t), so a
   link always fills the same handout. Coin amounts are gp numbers shown with formatCoins().
   Needs rng.js, coins.js, npc-data.js; quests need monsters-data.js, encounter-engine.js,
   quest-engine.js; shops need market-data.js, names-data.js, shop-engine.js.
   The tables here are the Gazette's own.
   ============================================ */

const HANDOUT_TYPES = {
    wanted: { icon: '🪧', label: 'Wanted Poster' },
    letter: { icon: '✉️', label: 'Letter' },
    board: { icon: '📌', label: 'Bounty Board' },
    prices: { icon: '🏷️', label: 'Price List' }
};

// Wanted-poster sketches in img/wanted/, one per race and gender (plus a lone half-orc),
// as [value, label] picker options. A poster filled from an NPC picks theirs.
const HANDOUT_LIKENESSES = [['', 'None (an empty box)'], ...[
    ...['human', 'elf', 'dwarf', 'halfling', 'gnome', 'orc', 'tiefling', 'dragonborn', 'aasimar']
        .flatMap(r => ['male', 'female', 'nonbinary'].map(g => [r, g])),
    ['half-orc', 'nonbinary']
].map(([r, g]) => [`${r}-${g}`, `${r.charAt(0).toUpperCase() + r.slice(1)}, ${g}`])];

const HANDOUT_SEALS = { red: '#8b1d1d', black: '#26211c', green: '#2f5a35', blue: '#24406b', gold: '#a37c1c' };

// k: field, label, max: length, area: a textarea, gp: a coin amount, check: a tick box,
// options: [value, label] pairs for a picker (the first is the default).
const HANDOUT_FIELDS = {
    wanted: [
        { k: 'terms', label: 'Wanted', options: [['Dead or Alive', 'Dead or Alive'], ['Alive', 'Alive'], ['Alive, Preferably', 'Alive, preferably'], ['For Questioning', 'For questioning'], ['', '(nothing)']] },
        { k: 'name', label: 'Name', max: 60 },
        { k: 'alias', label: 'Also known as', max: 60 },
        { k: 'crime', label: 'For the crime of', max: 240, area: true },
        { k: 'look', label: 'Description', max: 400, area: true },
        { k: 'portrait', label: 'Leave a box for a portrait', check: true },
        { k: 'likeness', label: 'Sketch in the box', options: HANDOUT_LIKENESSES },
        { k: 'reward', label: 'Reward (gp)', gp: true },
        { k: 'paid', label: 'Reward note', max: 100 },
        { k: 'issuer', label: 'Issued by', max: 140 }
    ],
    letter: [
        { k: 'style', label: 'Style', options: [['letter', 'Letter (a full sheet)'], ['note', 'Sealed note (small)']] },
        { k: 'to', label: 'To', max: 100 },
        { k: 're', label: 'Re', max: 120 },
        { k: 'body', label: 'Letter', max: 2400, area: true, rows: 8 },
        { k: 'close', label: 'Sign-off', max: 60 },
        { k: 'from', label: 'Signed', max: 60 },
        { k: 'title', label: 'Under the name', max: 80 },
        { k: 'seal', label: 'Wax seal', options: [['red', 'Red wax'], ['black', 'Black wax'], ['green', 'Green wax'], ['blue', 'Blue wax'], ['gold', 'Gold wax'], ['', 'No seal']] }
    ],
    board: [
        { k: 'title', label: 'Board heading', max: 60 }
    ],
    prices: [
        { k: 'name', label: 'Shop name', max: 80 },
        { k: 'sub', label: 'Under the name', max: 120 },
        { k: 'note', label: 'Notice', max: 240, area: true },
        { k: 'foot', label: 'Small print', max: 160 }
    ]
};

// The repeating parts: a board's notices and a price list's items.
const HANDOUT_LISTS = {
    board: { key: 'notices', min: 1, max: 6, add: '➕ Add a Notice', one: 'Notice', fields: [
        { k: 'head', label: 'Heading', max: 70 },
        { k: 'text', label: 'Notice', max: 320, area: true },
        { k: 'reward', label: 'Reward (gp)', gp: true },
        { k: 'contact', label: 'Contact', max: 90 }
    ] },
    prices: { key: 'items', min: 1, max: 30, add: '➕ Add an Item', one: 'Item', fields: [
        { k: 'name', label: 'Item', max: 70 },
        { k: 'price', label: 'Price (gp)', gp: true },
        { k: 'note', label: 'Note', max: 40 }
    ] }
};

const HANDOUT_GP_MAX = 10000000;

function hoEsc(text) {
    return String(text ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const hoCap = s => String(s || '').charAt(0).toUpperCase() + String(s || '').slice(1);

// ── Shape ─────────────────────────────────────────────────
function hoField(f, v) {
    if (f.check) return v === true;
    if (f.gp) {
        const n = Math.round(Number(v) * 100) / 100;
        return Number.isFinite(n) && n > 0 ? Math.min(HANDOUT_GP_MAX, n) : 0;
    }
    if (f.options) return f.options.some(([o]) => o === v) ? v : f.options[0][0];
    return typeof v === 'string' ? v.replace(/\r\n?/g, '\n').slice(0, f.max) : '';
}

function hoRow(fields, o) {
    o = o && typeof o === 'object' && !Array.isArray(o) ? o : {};
    return Object.fromEntries(fields.map(f => [f.k, hoField(f, o[f.k])]));
}

// Any value -> a handout of type t with every field present and in range.
// src (the link it was filled from, a query string) is kept when it looks like one.
function handoutClean(t, o) {
    o = o && typeof o === 'object' && !Array.isArray(o) ? o : {};
    const h = { t, ...hoRow(HANDOUT_FIELDS[t], o) };
    const list = HANDOUT_LISTS[t];
    if (list) {
        const rows = Array.isArray(o[list.key]) ? o[list.key].slice(0, list.max).map(r => hoRow(list.fields, r)) : [];
        while (rows.length < list.min) rows.push(hoRow(list.fields, {}));
        h[list.key] = rows;
    }
    if (typeof o.src === 'string' && o.src.length <= 600 && /^[\w.=&%+-]*$/.test(o.src)) h.src = o.src;
    return h;
}

// An empty handout, with the friendly defaults a blank one starts from.
function handoutBlank(t) {
    const start = {
        wanted: { terms: 'Dead or Alive', portrait: true, issuer: 'By order of the Watch' },
        letter: { close: 'Yours,', seal: 'red' },
        board: { title: 'Notices & Bounties' },
        prices: { foot: 'Prices change with the market bell.' }
    }[t];
    return handoutClean(t, start);
}

// ── Sources: a rolled NPC, quest, or shop, replayed from its link ──
// from -> the handouts it can fill (the first is where its "Make a Handout" link lands)
// and the URL keys its link uses besides the seed.
const HANDOUT_SOURCES = {
    npc: { icon: '🎭', label: 'NPC', fills: ['wanted', 'letter'], keys: ['race', 'profession', 'age', 'gender', 'cls', 'level', 'lock'], page: 'npc-generator' },
    quest: { icon: '📜', label: 'quest', fills: ['board', 'letter'], keys: ['lvl', 'n', 'job'], page: 'toolbox?tab=quest' },
    shop: { icon: '🏪', label: 'shop', fills: ['prices'], keys: ['type', 'wealth'], page: 'shop' }
};

// URLSearchParams -> { from, seed, query } with the source's own keys only, or null.
// query is the canonical link (from=…&seed=…&…), which a filled handout keeps as src.
function handoutSourceParams(p) {
    const from = p.get('from'), def = HANDOUT_SOURCES[from], seed = parseSeed(p.get('seed'));
    if (!def || !seed) return null;
    const q = new URLSearchParams({ from, seed });
    def.keys.forEach(k => p.getAll(k).slice(0, NPC_PARTS.length).forEach(v => { if (/^[\w.-]{1,40}$/.test(v)) q.append(k, v); }));
    return { from, seed, p: q, query: q.toString() };
}

const hoPick = (v, list, def = 'random') => list.includes(v) ? v : def;

// The roll a source names: { from, seed, query, npc | quest | shop, title }, or null.
function handoutSource(src) {
    if (!src) return null;
    const p = src.p;
    try {
        if (src.from === 'npc') {
            const fields = {
                race: hoPick(p.get('race'), NPC_RACES), profession: hoPick(p.get('profession'), Object.keys(npcData.professions)),
                age: hoPick(p.get('age'), NPC_AGE_BUCKETS), gender: hoPick(p.get('gender'), NPC_GENDERS)
            };
            const pinned = Object.fromEntries(p.getAll('lock').map(t => parseNpcLock(t)).filter(Boolean));
            const npc = rollNpcPinned(fields, src.seed, pinned);
            return { ...src, npc, title: npc.name };
        }
        if (src.from === 'quest') {
            const job = p.get('job');
            const quest = rollQuest(src.seed, {
                level: Number(p.get('lvl')) || 3, size: Number(p.get('n')) || 4,
                job: Object.hasOwn(QUEST_JOBS, job) ? job : 'random'
            });
            return { ...src, quest, title: quest.title };
        }
        if (src.from === 'shop') {
            const opts = { type: hoPick(p.get('type'), Object.keys(SHOP_TYPES)), wealth: hoPick(p.get('wealth'), Object.keys(SHOP_WEALTH)) };
            const shop = { ...withSeed(src.seed, () => rollShop(opts)), seed: src.seed };
            return { ...src, shop, title: shop.name };
        }
    } catch (e) {
        return null;
    }
    return null;
}

// The roll's own page, opened on the same roll.
function handoutSourceLink(src) {
    const q = new URLSearchParams(src.p);
    q.delete('from');
    const page = HANDOUT_SOURCES[src.from].page;
    return page + (page.includes('?') ? '&' : '?') + q.toString();
}

// ── Tables ────────────────────────────────────────────────
// [crime, tier]: tier 1 pays pocket money, 3 pays a fortune.
const HANDOUT_CRIMES = [
    ['Highway robbery on the north road', 2], ['Horse theft (three horses, one of them the magistrate\'s)', 2],
    ['Counterfeiting coin, badly', 2], ['Arson. The granary. Twice.', 3], ['Smuggling owlbear cubs in hatboxes', 2],
    ['Selling "dragon eggs" that hatched into chickens', 1], ['Forging writs of passage and one marriage certificate', 2],
    ['Stealing the temple bell', 2], ['Impersonating a member of the Watch', 2], ['Poaching in the baron\'s woods', 1],
    ['Unlicensed necromancy in a residential district', 3], ['Murder on the Mill Road', 3], ['Breaking out of the town gaol', 2],
    ['Cheating at cards with a fifth ace', 1], ['Desertion from the militia, with the militia\'s payroll', 3],
    ['Selling potions of healing that were mostly pond water', 1], ['Grave robbing', 2], ['Kidnapping a merchant\'s heir', 3],
    ['Releasing the menagerie\'s animals "as a statement"', 1], ['Treason against the crown', 3], ['Piracy on the river', 3],
    ['Assault on a tax collector (cheered by onlookers)', 1], ['Running an unlicensed fighting pit', 2],
    ['Theft of a wizard\'s spellbook', 3], ['Burglary of the guildhall', 2], ['Extortion of the market stalls', 2],
    ['Poisoning the well at the crossroads', 3], ['Pickpocketing at the harvest fair', 1], ['Bribing a judge, and then robbing him', 2],
    ['Selling maps to treasure that does not exist', 1], ['Summoning something in the cellar of the Crooked Lantern', 3],
    ['Stealing the mayor\'s prize pig', 1], ['Hiring out as a bodyguard and then guarding nobody', 1],
    ['Vandalizing the statue of the town founder', 1], ['Waylaying pilgrims on the old pilgrim road', 2],
    ['Black-market trade in cursed goods', 2], ['Spying for a foreign power', 3], ['Leading a jailbreak', 3],
    ['Insulting a noble in verse, in public, at length', 1], ['Theft from the temple poor box', 1]
];
const HANDOUT_REWARDS = { 1: [5, 10, 12.5, 15, 20, 25, 30, 40], 2: [50, 75, 100, 120, 150, 200, 250], 3: [300, 400, 500, 750, 1000, 1500, 2500] };
const HANDOUT_ISSUERS = [
    'By order of the Captain of the Watch', 'By order of the Magistrate\'s Court', 'By order of the Town Council',
    'By authority of the Baron, his seal attached', 'Posted by the Merchants\' Guild', 'By order of the Harbormaster',
    'Posted by the Temple, with the gods watching', 'By decree of the Sheriff of the shire', 'By order of the Road Wardens',
    'Posted by a private party who prefers not to be named'
];
const HANDOUT_PAID = [
    'Paid on delivery to the Watch House.', 'Paid in full at the Magistrate\'s office. Bring the prisoner, not just the head.',
    'Half again if taken alive.', 'Paid on proof. Ears are not proof.', 'Collect from the sheriff, weekdays before noon.',
    'Paid in coin, no questions asked.', 'No reward for information already known.', 'Paid at the town hall, after the paperwork.'
];

const HANDOUT_LETTER_TO = [
    'To the adventurers lodging upstairs', 'To whoever finds this', 'To the bearer of this letter', 'To the brave and the broke',
    'To the party with the loud dwarf', 'To you, the one reading this', 'To the hired swords at the corner table', 'To my new friends'
];
const HANDOUT_LETTER_OPEN = [
    'I will be brief, as the matter is pressing.', 'Forgive the plain paper. The good stationery would draw attention.',
    'We have not met, but I know your reputation, or at least the version of it told in taverns.',
    'I am not in the habit of writing to strangers, so you will understand how desperate I am.',
    'Read this somewhere private.', 'I write in haste and in poor light, so forgive the hand.',
    'A friend of a friend says you can be trusted. I hope they are a better judge than they are a friend.'
];
const HANDOUT_LETTER_ASK = [
    'I am told you solve problems for coin. I have a problem, and I have coin.',
    'I cannot go to the Watch with this. I am coming to you instead.',
    'I need help, discreetly and soon.', 'There is work in it for you, and pay to match.',
    'You will want to hear the rest in person.', 'I would sooner ask anyone else, but there is no one else.'
];
const HANDOUT_LETTER_END = [
    'Burn this after reading. I mean it.', 'Come alone, or at least come quietly.', 'Tell no one you had this from me.',
    'If you are not interested, forget you read this.', 'I will know you by the look of you. Do not be late.',
    'Ask for me by name, and only by name.'
];
const HANDOUT_LETTER_CLOSE = ['Yours,', 'Yours in haste,', 'With hope,', 'Sincerely,', 'Your servant,', 'Until we meet,', 'In confidence,'];

// Small public notices that fill out a board between the jobs.
const HANDOUT_FILLER_NOTICES = [
    { head: 'Lost: One Cat', text: 'Grey, answers to Biscuit, does not answer to Biscuit. Last seen chasing a mimic.', reward: 1, contact: 'Ask at the bakery' },
    { head: 'Room to Let', text: 'Clean, dry, only slightly haunted. Breakfast included. Ghost not included in breakfast.', reward: 0, contact: 'Widow Harrow, Tallow Lane' },
    { head: 'Found: One Boot', text: 'Left foot. Still warm. Owner may collect it from the well, where the rest of them was not.', reward: 0, contact: 'The Watch House' },
    { head: 'Apprentice Wanted', text: 'Alchemist seeks apprentice. Must have eyebrows to spare.', reward: 0, contact: 'The green door on Kiln Street' },
    { head: 'Notice of Toll', text: 'The bridge toll is now 2 cp a head, 5 cp a cart, and 1 sp for anything with more than four legs.', reward: 0, contact: 'By order of the Bridgewarden' },
    { head: 'Choir Practice', text: 'The temple choir meets at dusk. Tone-deaf welcome. Bards discouraged.', reward: 0, contact: 'Brother Aldous' },
    { head: 'Stolen: Prize Turnip', text: 'Weighed a full stone. Has sentimental value. Questions will be asked.', reward: 2, contact: 'Farmer Gudrun, east field' },
    { head: 'For Sale: Cart', text: 'One cart, three wheels. The fourth wheel is negotiable.', reward: 0, contact: 'Ask for Pell at the stables' },
    { head: 'Missing Dog', text: 'Brown, friendly, the size of a pony. Do not let it lick you. Ask why later.', reward: 5, contact: 'The tanner\'s yard' },
    { head: 'Wrestling Tonight', text: 'Beat the Ox and win a purse. Healers on hand. Most nights.', reward: 0, contact: 'The Bent Nail, back room' },
    { head: 'Curfew', text: 'No one on the streets after the second bell, by order of the Watch. Yes, that means you.', reward: 0, contact: 'The Watch Captain' },
    { head: 'Lessons Offered', text: 'Swordplay, letters, and sums. Swordplay extra on Tuesdays.', reward: 0, contact: 'Master Ilse, by the fountain' },
    { head: 'Lost: Spectacles', text: 'Wire rims, cracked lens. Owner cannot read this notice. Please read it to him.', reward: 1, contact: 'The scribe\'s stall' },
    { head: 'Warning', text: 'Do not feed the geese by the mill. Do not look the geese in the eye. Do not go near the mill.', reward: 0, contact: 'A concerned citizen' }
];
const HANDOUT_BOARD_TITLES = ['Notices & Bounties', 'Help Wanted', 'Town Notice Board', 'Work for Willing Hands', 'Public Notices', 'Jobs Going'];
// Jobs fit to pin up in public (no stealing or sabotage on the town board).
const HANDOUT_PUBLIC_JOBS = ['fetch', 'escort', 'hunt', 'rescue', 'deliver', 'investigate', 'clear', 'guard', 'collect', 'parley', 'scout', 'bounty', 'cleanse'];
const HANDOUT_SHOP_FOOT = [
    'No credit. No exceptions. No, not even for heroes.', 'Prices change with the market bell.', 'You break it, you bought it, at double.',
    'Haggling welcome. Winning not guaranteed.', 'No refunds on anything that has been cursed, eaten, or set on fire.',
    'Payment in coin only. Teeth, scales, and promises are not coin.'
];

// ── From a roll ───────────────────────────────────────────
function hoNpcLook(n) {
    const sentence = t => { t = hoCap(String(t || '').trim()); return t && !/[.!?]$/.test(t) ? t + '.' : t; };
    return [`${hoCap(n.race)} ${String(n.profession || '').toLowerCase()}, ${n.age} old`, n.build, n.hairLook, n.eyes && `${n.eyes} eyes`, n.feature]
        .filter(Boolean).map(sentence).join(' ');
}

function hoQuestNotice(q) {
    const g = q.giver;
    return {
        head: q.title,
        text: `${q.task} ${/^(within|before|by|no rush|whenever|yesterday|tonight)/i.test(q.deadline) ? `Wanted ${q.deadline.charAt(0).toLowerCase() + q.deadline.slice(1)}.` : `Deadline: ${q.deadline}.`}`,
        reward: q.reward.gp,
        contact: `Ask for ${g.name}, ${String(g.profession).toLowerCase()}`
    };
}

// The handout of type t that a source fills, or null when it can't fill that type.
function handoutFromSource(t, src) {
    if (!src || !HANDOUT_SOURCES[src.from].fills.includes(t)) return null;
    return withSeed(deriveSeed(src.seed, 'handout-' + t), () => {
        let h = null;
        if (src.npc && t === 'wanted') {
            const n = src.npc;
            const [crime, tier] = randomArray(HANDOUT_CRIMES);
            h = {
                terms: randomArray(['Dead or Alive', 'Dead or Alive', 'Alive', 'Alive, Preferably', 'For Questioning']),
                name: n.name, alias: n.nickname || '', crime, look: hoNpcLook(n), portrait: true, likeness: `${n.race}-${n.gender}`,
                reward: randomArray(HANDOUT_REWARDS[tier]), paid: randomArray(HANDOUT_PAID), issuer: randomArray(HANDOUT_ISSUERS)
            };
        } else if (src.npc && t === 'letter') {
            const n = src.npc;
            h = {
                style: rand() < 0.5 ? 'letter' : 'note', to: randomArray(HANDOUT_LETTER_TO), re: hoCap(n.questHook),
                body: [randomArray(HANDOUT_LETTER_OPEN), randomArray(HANDOUT_LETTER_ASK), randomArray(HANDOUT_LETTER_END)].join('\n\n'),
                close: randomArray(HANDOUT_LETTER_CLOSE), from: n.name, title: n.profession, seal: randomArray(Object.keys(HANDOUT_SEALS))
            };
        } else if (src.quest && t === 'letter') {
            const q = src.quest, g = q.giver;
            const pay = `I will pay ${formatCoins(q.reward.gp)} for the job. ${questRewardText(q.reward)}`;
            h = {
                style: 'letter', to: randomArray(HANDOUT_LETTER_TO), re: q.title,
                body: [randomArray(HANDOUT_LETTER_OPEN), q.task, `When: ${q.deadline}.`, pay, randomArray(HANDOUT_LETTER_END)].join('\n\n'),
                close: randomArray(HANDOUT_LETTER_CLOSE), from: g.name, title: g.profession, seal: randomArray(Object.keys(HANDOUT_SEALS))
            };
        } else if (src.quest && t === 'board') {
            // The quest itself, then 2–4 more public jobs from the same seed, then 1–2 small notices.
            const q = src.quest;
            const more = randomInt(2, 4), fill = randomInt(1, 2);
            const jobs = Array.from({ length: more }, (_, i) =>
                hoQuestNotice(rollQuest(deriveSeed(src.seed, 'board' + i), { level: q.level, size: q.size, job: randomArray(HANDOUT_PUBLIC_JOBS) })));
            const pool = [...HANDOUT_FILLER_NOTICES];
            const small = Array.from({ length: fill }, () => ({ ...pool.splice(Math.floor(rand() * pool.length), 1)[0] }));
            const notices = [hoQuestNotice(q), ...jobs, ...small].slice(0, HANDOUT_LISTS.board.max);
            h = { title: randomArray(HANDOUT_BOARD_TITLES), notices };
        } else if (src.shop && t === 'prices') {
            const s = src.shop, def = SHOP_TYPES[s.type];
            h = {
                name: s.name, sub: `${def.label} · Prop. ${s.keeper.name}`, note: `"${s.greeting}"`, foot: randomArray(HANDOUT_SHOP_FOOT),
                items: shopPrices(s).slice(0, HANDOUT_LISTS.prices.max).map(p => ({ name: p.name, price: p.price, note: p.sale ? 'Today only' : '' }))
            };
        }
        return h && handoutClean(t, { ...h, src: src.query });
    });
}

// ── Drawing ───────────────────────────────────────────────
// Blank lines (or single line breaks) split paragraphs.
function hoParas(text, cls = '') {
    return String(text || '').split(/\n+/).map(s => s.trim()).filter(Boolean)
        .map(s => `<p${cls ? ` class="${cls}"` : ''}>${hoEsc(s)}</p>`).join('');
}

function hoSealSvg(color, initial) {
    const fill = HANDOUT_SEALS[color];
    if (!fill) return '';
    // A blobby wax edge: 18 bumps around a circle.
    const pts = Array.from({ length: 36 }, (_, i) => {
        const a = i / 36 * Math.PI * 2, r = i % 2 ? 44 : 48;
        return `${(50 + r * Math.cos(a)).toFixed(1)},${(50 + r * Math.sin(a)).toFixed(1)}`;
    }).join(' ');
    return `<svg class="ho-seal" viewBox="0 0 100 100" aria-hidden="true">
        <polygon points="${pts}" fill="${fill}"/>
        <circle cx="50" cy="50" r="33" fill="none" stroke="rgba(255,255,255,0.28)" stroke-width="2.5"/>
        <circle cx="50" cy="50" r="38" fill="none" stroke="rgba(0,0,0,0.25)" stroke-width="1.5"/>
        <text x="50" y="52" text-anchor="middle" dominant-baseline="middle" fill="rgba(255,240,215,0.85)" font-family="Cinzel Decorative, serif" font-weight="700" font-size="34">${hoEsc(initial)}</text>
    </svg>`;
}

const hoInitial = name => (String(name || '').trim().match(/\p{L}/u) || [''])[0].toUpperCase();

// The handout as a sheet. ink: a plain white sheet that saves printer ink.
function handoutSheetHtml(h, ink = false) {
    const sheet = (cls, inner) => `<div class="ho-sheet ho-${cls}${ink ? ' ho-ink' : ''}">${inner}</div>`;
    if (h.t === 'wanted') {
        return sheet('wanted', `
            <div class="ho-wanted-head">Wanted</div>
            ${h.terms ? `<div class="ho-wanted-terms">${hoEsc(h.terms)}</div>` : ''}
            ${!h.portrait ? '' : h.likeness
                ? `<div class="ho-portrait ho-has-sketch"><img src="img/wanted/${hoEsc(h.likeness)}.webp" alt="A sketched likeness"></div>`
                : '<div class="ho-portrait"><span>Likeness</span></div>'}
            <div class="ho-wanted-name">${hoEsc(h.name || 'Name Unknown')}</div>
            ${h.alias ? `<div class="ho-wanted-alias">also known as “${hoEsc(h.alias)}”</div>` : ''}
            ${h.crime ? `<div class="ho-rule"></div><div class="ho-wanted-label">For the crime of</div><div class="ho-wanted-crime">${hoEsc(h.crime)}</div>` : ''}
            ${h.look ? `<div class="ho-wanted-look">${hoEsc(h.look)}</div>` : ''}
            ${h.reward ? `<div class="ho-wanted-reward"><span>Reward</span>${hoEsc(formatCoins(h.reward))}</div>` : ''}
            ${h.paid ? `<div class="ho-wanted-paid">${hoEsc(h.paid)}</div>` : ''}
            ${h.issuer ? `<div class="ho-wanted-issuer">${hoEsc(h.issuer)}</div>` : ''}`);
    }
    if (h.t === 'letter') {
        return sheet(`letter${h.style === 'note' ? ' ho-note' : ''}`, `
            ${h.to ? `<p class="ho-letter-to">${hoEsc(h.to)},</p>` : ''}
            ${h.re ? `<p class="ho-letter-re">Re: ${hoEsc(h.re)}</p>` : ''}
            <div class="ho-letter-body">${hoParas(h.body) || '<p class="ho-faint">…</p>'}</div>
            <div class="ho-letter-sign">
                ${h.close ? `<p class="ho-letter-close">${hoEsc(h.close)}</p>` : ''}
                ${h.from ? `<p class="ho-letter-from">${hoEsc(h.from)}</p>` : ''}
                ${h.title ? `<p class="ho-letter-title">${hoEsc(h.title)}</p>` : ''}
            </div>
            ${hoSealSvg(h.seal, hoInitial(h.from) || '✦')}`);
    }
    if (h.t === 'board') {
        const tilts = [-1.6, 1.1, -0.6, 1.8, -1.2, 0.7];
        return sheet('board', `
            <div class="ho-board-title">${hoEsc(h.title || 'Notices')}</div>
            <div class="ho-board-grid">${h.notices.map((n, i) => `
                <div class="ho-notice" style="--tilt:${tilts[i % tilts.length]}deg">
                    <span class="ho-pin" aria-hidden="true"></span>
                    ${n.head ? `<div class="ho-notice-head">${hoEsc(n.head)}</div>` : ''}
                    ${hoParas(n.text, 'ho-notice-text')}
                    ${n.reward ? `<div class="ho-notice-reward">Reward: ${hoEsc(formatCoins(n.reward))}</div>` : ''}
                    ${n.contact ? `<div class="ho-notice-contact">${hoEsc(n.contact)}</div>` : ''}
                </div>`).join('')}
            </div>`);
    }
    if (h.t === 'prices') {
        return sheet('prices', `
            <div class="ho-prices-name">${hoEsc(h.name || 'Price List')}</div>
            ${h.sub ? `<div class="ho-prices-sub">${hoEsc(h.sub)}</div>` : ''}
            ${h.note ? `<p class="ho-prices-note">${hoEsc(h.note)}</p>` : ''}
            <ul class="ho-prices-list">${h.items.filter(i => i.name || i.price).map(i => `
                <li><span class="ho-item">${hoEsc(i.name)}${i.note ? ` <em>${hoEsc(i.note)}</em>` : ''}</span><span class="ho-dots"></span><span class="ho-price">${i.price ? hoEsc(formatCoins(i.price)) : ''}</span></li>`).join('')}
            </ul>
            ${h.foot ? `<div class="ho-prices-foot">${hoEsc(h.foot)}</div>` : ''}`);
    }
    return '';
}

// ── Plain text for Copy ───────────────────────────────────
function handoutText(h) {
    const lines = [];
    if (h.t === 'wanted') {
        lines.push(`WANTED${h.terms ? `: ${h.terms.toUpperCase()}` : ''}`, h.name || 'Name unknown');
        if (h.alias) lines.push(`Also known as "${h.alias}"`);
        if (h.crime) lines.push(`For the crime of: ${h.crime}`);
        if (h.look) lines.push(`Description: ${h.look}`);
        if (h.reward) lines.push(`Reward: ${formatCoins(h.reward)}.${h.paid ? ` ${h.paid}` : ''}`);
        else if (h.paid) lines.push(h.paid);
        if (h.issuer) lines.push(h.issuer);
    } else if (h.t === 'letter') {
        if (h.to) lines.push(`${h.to},`, '');
        if (h.re) lines.push(`Re: ${h.re}`, '');
        if (h.body) lines.push(h.body.trim(), '');
        [h.close, h.from, h.title].filter(Boolean).forEach(l => lines.push(l));
    } else if (h.t === 'board') {
        lines.push((h.title || 'Notices').toUpperCase());
        h.notices.forEach(n => {
            lines.push('', `- ${n.head || 'Notice'}${n.text ? `: ${n.text.replace(/\s*\n+\s*/g, ' ')}` : ''}`);
            if (n.reward) lines.push(`  Reward: ${formatCoins(n.reward)}`);
            if (n.contact) lines.push(`  ${n.contact}`);
        });
    } else if (h.t === 'prices') {
        lines.push(h.name || 'Price List');
        if (h.sub) lines.push(h.sub);
        if (h.note) lines.push(h.note);
        lines.push('');
        h.items.filter(i => i.name || i.price).forEach(i => lines.push(`- ${i.name}${i.note ? ` (${i.note})` : ''}: ${i.price ? formatCoins(i.price) : 'ask'}`));
        if (h.foot) lines.push('', h.foot);
    }
    return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}
