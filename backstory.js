/* ============================================
   BACKSTORY GENERATOR (F64): a player character's personality and past,
   one line at a time. Each line rolls from its own seed, so a 🔒 kept line
   stays put while the rest reroll. The address bar holds the seeds, so a
   reload or a shared link brings the same backstory back; nothing goes in
   localStorage except a character saved through cbSave (CB_KEY).
   Traits, ideals, bonds, flaws, and names come from npc-data.js.
   Needs rng.js, npc-data.js, character-data.js, and character-engine.js.
   ============================================ */

const BS_LINES = [
    ['name', 'Name'], ['trait', 'Personality'], ['ideal', 'Ideal'], ['bond', 'Bond'], ['flaw', 'Flaw'],
    ['upbringing', 'Grew up'], ['family', 'Family'], ['reason', 'Why I adventure'], ['secret', 'Secret'], ['hook', 'Hook for the DM']
];
const BS_IDS = BS_LINES.map(l => l[0]);
const BS_GENDERS = [['', 'Any names'], ['male', 'Masculine names'], ['female', 'Feminine names'], ['nonbinary', 'Neutral names']];

// The NPC name tables a builder race borrows; a half-elf or half-orc picks one of two.
const BS_NAME_RACES = {
    dwarf: ['dwarf'], elf: ['elf'], halfling: ['halfling'], human: ['human'], dragonborn: ['dragonborn'],
    gnome: ['gnome'], 'half-elf': ['human', 'elf'], 'half-orc': ['orc', 'human'], tiefling: ['tiefling']
};

const BS_UPBRINGING = [
    "In a fishing village where everyone could read the weather and nobody could read a book",
    "Above a busy tavern, falling asleep to other people's songs",
    "On a farm at the edge of the map, where the nearest neighbor was a day's walk",
    "In the back streets of a big city, running errands for coin",
    "At a temple, among priests who had more rules than smiles",
    "On the road with a traveling caravan, never in one place for a month",
    "In a noble house, as a servant's child who watched everything",
    "In a mining town where the bell meant someone wasn't coming up",
    "At a lonely crossroads inn that saw more strangers than locals",
    "In a border fort, with soldiers for babysitters",
    "In a river town that flooded every spring and rebuilt every summer",
    "At an orphanage that did its honest best",
    "In a mountain monastery, sweeping steps before dawn",
    "On a merchant ship, learning knots before letters",
    "In a market town, behind the counter of the family stall",
    "Deep in the woods with a hermit who never explained much",
    "In a scholar's household, surrounded by books I wasn't allowed to touch",
    "In a village that still talks about the year the dragon came",
    "In a quiet town where nothing happened, which was the whole problem",
    "In a refugee camp, after war took the home I barely remember",
    "In a shepherd's hut on the high moors",
    "In the shadow of a ruined castle that the local children dared each other into",
    "In a guild hall, as an apprentice from the age of seven",
    "In a city under siege for most of my childhood"
];
const BS_UPBRINGING_RACE = {
    dwarf: ["In a mountain hold where my clan's name is carved over the gate", "In a forge town where the hammers never stopped", "In a hold that fell when I was young; we live as guests in another"],
    elf: ["In a forest city where a century counts as a short memory", "Among humans, the one elf child in a market town", "In a quiet elven enclave that hasn't welcomed a stranger in two hundred years"],
    halfling: ["In a hillside village of round doors and long lunches", "With a wandering halfling family that sets up wherever the weather is good", "In a human city's halfling quarter, where everyone knows everyone's business"],
    human: ["In a crowded capital where three tongues are spoken in every street", "In a frontier town that was a camp when my grandparents came", "In a farming valley that has belonged to six different lords in my lifetime"],
    dragonborn: ["In a clan hall where my ancestors' deeds were recited every feast", "Far from any other dragonborn, in a town that stared", "In a clan that left its homeland before I was born"],
    gnome: ["In a burrow full of half-finished inventions", "In a gnome workshop town where something exploded most weeks", "Among the forest gnomes, learning the names of every beetle"],
    'half-elf': ["Between two homes, never quite at home in either", "With my elven parent's people, who were kind and patient and very slow", "With my human parent's people, who aged while I hardly changed"],
    'half-orc': ["In an orc camp until I was old enough to leave it", "In a human town that was quick to blame me for things", "With a mercenary company that didn't care who my parents were"],
    tiefling: ["In a city quarter where tieflings keep to themselves", "In a village that took me in after my family was run out of the last one", "With human parents who were as surprised by my horns as anyone"]
};

const BS_FAMILY = [
    "Both parents alive, and they write to me more than I write back",
    "Raised by my grandmother, who is tougher than any knight",
    "The youngest of nine; I learned to shout early",
    "An only child, and the whole of my parents' hopes",
    "My {kin} and I don't speak, and it's my fault",
    "My {kin} is famous, and I'm tired of hearing about it",
    "My parents died when I was young; {townsfolk} raised me",
    "I have a twin who took the other road",
    "A big, loud family that runs the family business without me",
    "I never knew my father; my mother never said a word about him",
    "Adopted, and I love them, and I still wonder",
    "My family is minor nobility with more pride than coin",
    "My {kin} is in debt to dangerous people, and so, by extension, am I",
    "My family disowned me, and I'm only a little sorry",
    "My {kin} disappeared on an adventure; I'm following the same road",
    "My parents are adventurers who retired to {place} and won't talk about why",
    "A blended family of four parents and more siblings than I can count",
    "My {kin} is a priest who prays for me loudly and often",
    "My family has served the same noble house for five generations",
    "No family to speak of; my friends from the street are my family",
    "My {kin} is the town's black sheep, and I'm the next in line",
    "My parents are dull, kind people, and I miss them more than I'll admit",
    "I have a child back home, safe with my {kin}",
    "My family thinks I'm a clerk in the city"
];

const BS_REASON = [
    "I need coin, and adventuring pays better than honest work",
    "I want to see what's past the edge of the map",
    "Someone has to stand between the monsters and the farms",
    "I'm running from something, and moving targets are hard to hit",
    "I want my name in a song, and a good song",
    "My home is gone; the road is all I have",
    "I made a promise to someone who died",
    "I'm looking for someone who left without a word",
    "I was bored, and that seemed like a terrible way to live",
    "A prophecy mentions me, and I'd like to know how it ends",
    "I owe a debt that only treasure will pay",
    "I want to prove my family wrong about me",
    "I lost a bet",
    "I'm hunting the one who wronged me",
    "I want to buy back the land my family lost",
    "A dream keeps showing me the same door, and I mean to find it",
    "My friends are going, and I'm not staying behind",
    "I want to do some good before my luck runs out",
    "I was hired as a guide and never stopped",
    "I'm looking for a cure for my {kin}"
];
const BS_REASON_CLASS = {
    barbarian: ["My tribe sent me to find out why the herds are dying", "The rage comes whether I want it or not; out here it's useful", "I was the strongest in my village and it wasn't enough", "The spirits of my ancestors want something, and they won't let me sleep"],
    bard: ["Every great song needs a great story, and I'm out of stories", "My college sent me to collect lore nobody's written down", "I owe a lot of people money in a lot of towns", "I want to write the ballad of a real hero, so I'm following some around"],
    cleric: ["My god sent me a vision, and I'm following it", "My temple wants a relic returned", "I lost my faith once and found it on the road", "Healing the sick at home wasn't enough; the sickness started somewhere"],
    druid: ["The land itself is ill, and I mean to find the cause", "My circle sent me to watch the civilized folk", "A grove I tended was burned, and I want to know by whom", "The seasons are turning wrong, and someone has to ask why"],
    fighter: ["I was a soldier, and peace didn't take", "I'm saving up for my own company of sellswords", "I'm the best with a blade in my town; I want to know if I'm the best anywhere", "My old captain died owing me pay, so I'm collecting it from the world"],
    monk: ["My monastery sent me out to learn what can't be taught inside its walls", "My master vanished, and the trail leads here", "I seek a perfect stillness, and I find it best in danger", "Someone stole our temple's scrolls"],
    paladin: ["I swore an oath, and oaths don't keep themselves", "Evil is real, and I've seen it up close", "My order was destroyed; I'm what's left of it", "I have something to atone for, and quiet prayer isn't enough"],
    ranger: ["Something is hunting in my forest, and I'm hunting it", "I know the wilds better than anyone, and people need guides", "A monster took my family; I've been tracking its kind ever since", "The roads are getting dangerous, and someone has to scout them"],
    rogue: ["The last job went wrong, and I need to be far away", "Dungeons are full of treasure nobody's using", "My guild wants something stolen, and I want out of the guild", "I'm good at getting into places, and adventurers pay well for that"],
    sorcerer: ["The magic in my blood is getting stronger, and I need answers", "I set something on fire by accident, and leaving seemed wise", "I want to find out where my power came from", "Something ancient is calling me, and the call gets louder"],
    warlock: ["My patron has given me a task, and I'd rather not find out what happens if I refuse", "I made a bargain to save someone, and now I pay it off", "I want to get out of my pact, and that takes knowledge or power", "My patron's enemies are my enemies now"],
    wizard: ["Books can only teach so much; the rest is out there", "I'm looking for a spellbook my master hid", "The academy expelled me, and I'll show them", "I need rare components that no shop sells"]
};

const BS_SECRET = [
    "I'm not who I say I am; I took a dead stranger's name",
    "I owe money to the thieves' guild, and they know where I sleep",
    "I ran from a battle, and my friend died because of it",
    "I'm the heir to a title I want nothing to do with",
    "I stole the thing that made my old party fall apart",
    "I can't read, and I've hidden it my whole life",
    "My {kin} was a criminal, and I helped",
    "I've been having dreams that come true",
    "I once made a deal with a fiend, and I don't know if it's over",
    "I'm wanted in another kingdom under another name",
    "I'm afraid of the dark, and I'm an adventurer",
    "I set the fire that burned down {place}",
    "I was once a member of a cult, and they want me back",
    "I'm slowly losing my memories, and I write everything down",
    "I'm in love with someone in this party",
    "I don't believe in the god I claim to serve",
    "My family's fortune was built on something terrible",
    "I took a bribe once that got someone hurt",
    "I carry a letter I was told to deliver years ago, and never did",
    "I have a child I've never met",
    "The {thing} I carry isn't mine; I took it from a body",
    "I'm far older than I look, and I don't know why",
    "I've seen the face of the villain everyone is hunting, and it was a friend",
    "I'm being paid to keep an eye on the rest of the party",
    "I was raised by something that wasn't human",
    "I faked a death once, and I may need to do it again",
    "I hear a voice that nobody else hears",
    "I'm the reason my village was attacked"
];

const BS_HOOK = [
    "An old friend turns up needing the favor this character promised long ago",
    "A debt collector from home arrives, with this character's name at the top of a list",
    "A wanted poster with this character's face appears in a town they've never visited",
    "Their {kin} sends a letter: come home, something is wrong",
    "Someone else is using this character's name, and committing crimes with it",
    "The {thing} from their past turns up for sale in a shop",
    "A stranger recognizes them and is terrified",
    "Their old mentor is now working for the villain",
    "A ghost from {place} starts following them",
    "A noble arrives claiming the character is their long-lost heir",
    "The person they've been looking for is found, and doesn't want to be",
    "A rival from childhood joins a competing adventuring party",
    "Their family's old enemy has just moved into the next town",
    "A dying stranger gives them a key and a single word",
    "The thing they ran away from has followed them",
    "Someone from their past needs them to testify at a trial",
    "A song about them is going around, and it isn't flattering",
    "Their secret is written on a note slipped under the door",
    "A priest says the character's soul has been promised to someone",
    "An old map they carried for years turns out to be real",
    "Their hometown sends for help, and they're the only one who answered",
    "Someone they thought was dead walks into the tavern",
    "A bounty hunter is following the party, and it's this character they want",
    "A monster from {place} has learned their name"
];

const BS_ROLL = {
    name: g => {
        const pool = BS_NAME_RACES[g.race] || NPC_RACES;
        const race = randomArray(pool);
        const gender = randomArray(NPC_GENDERS);
        return buildName(race, g.gender || gender).name;
    },
    trait: () => {
        const a = randomArray(npcData.traits);
        let b = randomArray(npcData.traits);
        for (let i = 0; b === a && i < 5; i++) b = randomArray(npcData.traits);
        return `${a}. ${b}.`;
    },
    ideal: () => randomArray(npcData.ideals),
    bond: () => fillTemplate(randomArray(npcData.bonds)),
    flaw: () => randomArray(npcData.flaws),
    upbringing: g => bsMix(BS_UPBRINGING, BS_UPBRINGING_RACE[g.race], 0.4),
    family: () => fillTemplate(randomArray(BS_FAMILY)),
    reason: g => fillTemplate(bsMix(BS_REASON, BS_REASON_CLASS[g.cls], 0.5)),
    secret: () => fillTemplate(randomArray(BS_SECRET)),
    hook: () => fillTemplate(randomArray(BS_HOOK))
};

// A race or class list replaces the shared one when there is one and the draw says so.
// Draws the same either way, so picking a race doesn't shift the rest of the line.
function bsMix(shared, own, chance) {
    const s = randomArray(shared), r = rand(), use = rand() < chance;
    return own && use ? own[Math.floor(r * own.length)] : s;
}

const bs = { seed: '', race: '', cls: '', gender: '', set: {}, lock: [] };

function esc(s) {
    return String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

let flashTimer = 0;
function flash(msg, bad = false) {
    const el = document.getElementById('bs-status');
    el.textContent = msg;
    el.classList.toggle('bs-bad', bad);
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => { el.textContent = ''; }, 4000);
}

const bsLineSeed = id => bs.set[id] || deriveSeed(bs.seed, id);
const bsLine = id => withSeed(bsLineSeed(id), () => BS_ROLL[id](bs));
const bsAll = () => Object.fromEntries(BS_IDS.map(id => [id, bsLine(id)]));

// ── Address bar ──────────────────────────────────────────
function bsParams() {
    const p = { seed: bs.seed };
    if (bs.race) p.race = bs.race;
    if (bs.cls) p.cls = bs.cls;
    if (bs.gender) p.g = bs.gender;
    const set = BS_IDS.filter(id => bs.set[id]).map(id => `${id}.${bs.set[id]}`);
    if (set.length) p.set = set.join(',');
    if (bs.lock.length) p.lock = bs.lock.join(',');
    return p;
}

function bsFromUrl() {
    const q = urlParams();
    bs.seed = parseSeed(q.get('seed')) || newSeed();
    bs.race = cbRace(q.get('race')) ? q.get('race') : '';
    bs.cls = cbClass(q.get('cls')) ? q.get('cls') : '';
    bs.gender = BS_GENDERS.some(g => g[0] && g[0] === q.get('g')) ? q.get('g') : '';
    bs.set = {};
    (q.get('set') || '').split(',').forEach(t => {
        const [id, seed] = t.split('.');
        if (BS_IDS.includes(id) && parseSeed(seed)) bs.set[id] = seed;
    });
    bs.lock = [...new Set((q.get('lock') || '').split(',').filter(id => BS_IDS.includes(id)))];
}

function bsChanged() {
    setUrlParams(bsParams(), false);
    render();
}

// ── Drawing ──────────────────────────────────────────────
function render() {
    document.getElementById('bs-race').value = bs.race;
    document.getElementById('bs-class').value = bs.cls;
    document.getElementById('bs-gender').value = bs.gender;
    const lines = bsAll();
    document.getElementById('bs-lines').innerHTML = BS_LINES.map(([id, label]) => {
        const locked = bs.lock.includes(id);
        return `<div class="bs-line${locked ? ' bs-locked' : ''}">
            <span class="bs-label">${label}</span>
            <span class="bs-text">${esc(lines[id])}</span>
            <span class="bs-tools">
              <button type="button" class="bs-icon" data-lock="${id}" aria-pressed="${locked}" aria-label="${locked ? 'Unlock' : 'Keep'} ${label}" title="${locked ? 'Kept: 🎲 Roll New Backstory leaves it alone' : 'Keep this line'}">${locked ? '🔒' : '🔓'}</button>
              <button type="button" class="bs-icon" data-reroll="${id}" aria-label="Reroll ${label}" title="Reroll this line">🎲</button>
            </span>
        </div>`;
    }).join('');
}

function renderChars() {
    const sel = document.getElementById('bs-char');
    const was = sel.value;
    const list = cbLoadAll();
    sel.innerHTML = '<option value="">A new character</option>' + list.map(c => {
        const k = cbClass(c.cls), r = cbRace(c.race);
        const about = [r && r.name, k && `${k.name} ${c.level}`].filter(Boolean).join(' ');
        return `<option value="${c.id}">${esc(c.name || 'Unnamed character')}${about ? ` (${esc(about)})` : ''}</option>`;
    }).join('');
    if (list.some(c => c.id === was)) sel.value = was;
}

// ── Actions ──────────────────────────────────────────────
function bsText(withName = true) {
    const lines = bsAll();
    return BS_LINES.filter(([id]) => withName || id !== 'name').map(([id, label]) => `${label}: ${lines[id]}`).join('\n');
}

let spellsLoading = null;
function loadSpells() {
    if (typeof SPELLS_DATA !== 'undefined') return Promise.resolve();
    if (!spellsLoading) spellsLoading = new Promise((ok, fail) => {
        const s = document.createElement('script');
        s.src = 'spells-data.js';
        s.onload = ok;
        s.onerror = () => { spellsLoading = null; fail(); };
        document.head.appendChild(s);
    });
    return spellsLoading;
}

// Writes the backstory into a builder character's notes (after anything already
// there), and its name if the character has none. A new character also takes
// the race and class picked here. The builder opens the newest edit, so it lands on it.
async function useForCharacter() {
    const btn = document.getElementById('bs-use');
    btn.disabled = true;
    const fail = msg => { flash(msg, true); btn.disabled = false; };
    try {
        // Saving re-cleans every saved character, which drops spells it can't look up.
        await loadSpells();
    } catch (e) {
        return fail('Could not load the spell list; check your connection and try again.');
    }
    const id = document.getElementById('bs-char').value;
    const list = cbLoadAll();
    let c = id ? list.find(x => x.id === id) : null;
    if (id && !c) { renderChars(); return fail('That character is gone; pick another.'); }
    if (!c) {
        if (list.length >= CB_MAX) return fail(`You have ${CB_MAX} characters saved; delete one in the Character Builder first.`);
        c = cbBlank();
        const r = cbRace(bs.race);
        c.race = bs.race;
        c.subrace = r && r.subraces ? r.subraces[0].id : '';
        c.cls = bs.cls;
    }
    if (!c.name) c.name = bsLine('name').slice(0, 60);
    const block = 'Backstory\n' + bsText(false);
    const notes = c.notes.trim() ? `${c.notes.trimEnd()}\n\n${block}` : block;
    if (notes.length > 4000) return fail('That character\'s notes are nearly full (4,000 characters); trim them in the builder first.');
    c.notes = notes;
    if (!cbSave(c)) return fail('Could not save: this browser\'s storage is full or blocked.');
    location.href = 'character-builder';
}

function rollNew() {
    bs.seed = newSeed();
    BS_IDS.forEach(id => { if (!bs.lock.includes(id)) delete bs.set[id]; });
    bsChanged();
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('year').textContent = new Date().getFullYear();
    document.getElementById('bs-race').innerHTML = '<option value="">Any race</option>' + CB_RACES.map(r => `<option value="${r.id}">${r.icon} ${esc(r.name)}</option>`).join('');
    document.getElementById('bs-class').innerHTML = '<option value="">Any class</option>' + CB_CLASSES.map(k => `<option value="${k.id}">${k.icon} ${esc(k.name)}</option>`).join('');
    document.getElementById('bs-gender').innerHTML = BS_GENDERS.map(([v, t]) => `<option value="${v}">${t}</option>`).join('');

    bsFromUrl();
    setUrlParams(bsParams(), false);
    render();
    renderChars();

    document.getElementById('bs-lines').addEventListener('click', e => {
        const b = e.target.closest('button');
        if (!b) return;
        const id = b.dataset.lock || b.dataset.reroll;
        if (b.dataset.lock) {
            if (bs.lock.includes(id)) bs.lock = bs.lock.filter(x => x !== id);
            else { bs.lock.push(id); bs.set[id] = bsLineSeed(id); }
        } else {
            bs.set[id] = newSeed();
        }
        bsChanged();
        const again = document.querySelector(`#bs-lines [data-${b.dataset.lock ? 'lock' : 'reroll'}="${id}"]`);
        if (again) again.focus();
    });
    document.getElementById('bs-roll').addEventListener('click', rollNew);
    // Name and grew-up follow the race, and why-I-adventure the class; a kept line keeps
    // its seed, so it can still change with them.
    ['race', 'class', 'gender'].forEach(f => document.getElementById('bs-' + f).addEventListener('change', e => {
        bs[f === 'class' ? 'cls' : f] = e.target.value;
        bsChanged();
    }));
    document.getElementById('bs-copy').addEventListener('click', () => {
        const text = bsText();
        (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject())
            .then(() => flash('📋 Backstory copied.'), () => flash('Could not copy; select the text and copy it by hand.', true));
    });
    document.getElementById('bs-link').addEventListener('click', () => copyPageLink(ok => flash(ok === false ? 'Could not copy the link.' : '🔗 Link copied.', ok === false)));
    document.getElementById('bs-print').addEventListener('click', () => window.print());
    document.getElementById('bs-use').addEventListener('click', useForCharacter);
    window.addEventListener('popstate', () => { bsFromUrl(); render(); });
    window.addEventListener('storage', e => { if (e.key === CB_KEY || e.key === null) renderChars(); });
});
