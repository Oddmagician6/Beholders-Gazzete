/* ============================================
   FORGOTTEN REALMS NAMES (ROADMAP L4 D2)
   An opt-in "World" picker for the Pantheon, Faction, Town, Tavern, Side Quest, NPC,
   and Rumor generators: with 🐉 Forgotten Realms picked, they use the Realms' gods,
   factions, cities, and names in place of the Gazette's own. Names and story only,
   under Wizards of the Coast's Fan Content Policy: no mechanics (no cleric domains as
   rules, no renown ranks, no backgrounds), and every description here is the Gazette's
   own wording. The Pathfinder pages never show the picker.
   The picker is a <select> whose default option ('') is the Gazette's own world, so it
   stays out of links until picked (URL key: world=realms). realmsPicker() hides it on
   other systems and starts it on the reader's last choice for that tool.
   Realms draws come from their own seeds (realmsWith), so turning the option on or off
   never changes the rest of a roll. Needs rng.js and rules-system.js.
   ============================================ */

// theme: the Pantheon tab's domain key the god fills (for its icon and tables; never shown
// as a cleric domain). form: goddess, god, or deity. a: alignment. p: what they rule over. s: holy symbol.
const REALMS_GODS = [
    { n: 'Oghma', t: 'the Binder of What Is Known', theme: 'knowledge', form: 'god', a: 'N', p: ['knowledge', 'ideas', 'invention'], s: 'a scroll with nothing yet written on it' },
    { n: 'Deneir', t: 'the Lord of All Glyphs', theme: 'knowledge', form: 'god', a: 'NG', p: ['writing', 'scribes', 'art'], s: 'a lit candle above an open eye' },
    { n: 'Mystra', t: 'the Lady of Mysteries', theme: 'knowledge', form: 'goddess', a: 'NG', p: ['magic', 'spellcraft', 'the Weave'], s: 'seven stars in a ring' },
    { n: 'Azuth', t: 'the High One', theme: 'knowledge', form: 'god', a: 'LN', p: ['wizards', 'spell study', 'patience'], s: 'a raised hand with fire at the fingertip' },
    { n: 'Gond', t: 'the Wonderbringer', theme: 'knowledge', form: 'god', a: 'N', p: ['inventors', 'crafts', 'clockwork'], s: 'a toothed wheel with four spokes' },
    { n: 'Savras', t: 'the All-Seeing', theme: 'knowledge', form: 'god', a: 'LN', p: ['foresight', 'scrying', 'truth'], s: 'a crystal ball full of eyes' },
    { n: 'Moradin', t: 'the Soul Forger', theme: 'knowledge', form: 'god', a: 'LG', p: ['dwarves', 'the forge', 'oaths'], s: 'a hammer laid across an anvil' },
    { n: 'Chauntea', t: 'the Great Mother', theme: 'life', form: 'goddess', a: 'NG', p: ['farms', 'harvests', 'growing things'], s: 'a rose blooming from a sheaf of wheat' },
    { n: 'Ilmater', t: 'the Crying God', theme: 'life', form: 'god', a: 'LG', p: ['endurance', 'mercy', 'the suffering'], s: 'two hands bound at the wrist with red cord' },
    { n: 'Lliira', t: 'Our Lady of Joy', theme: 'life', form: 'goddess', a: 'CG', p: ['joy', 'dancing', 'festivals'], s: 'three six-pointed stars' },
    { n: 'Sune', t: 'Lady Firehair', theme: 'life', form: 'goddess', a: 'CG', p: ['love', 'beauty', 'passion'], s: 'the face of a woman with flowing red hair' },
    { n: 'Yondalla', t: 'the Protector and Provider', theme: 'life', form: 'goddess', a: 'LG', p: ['halflings', 'home', 'plenty'], s: 'a shield marked with a horn of plenty' },
    { n: 'Lathander', t: 'the Morninglord', theme: 'light', form: 'god', a: 'NG', p: ['dawn', 'new beginnings', 'hope'], s: 'a road running into a sunrise' },
    { n: 'Selûne', t: 'Our Lady of Silver', theme: 'light', form: 'goddess', a: 'CG', p: ['the moon', 'navigators', 'lost souls'], s: 'two eyes ringed by seven silver stars' },
    { n: 'Amaunator', t: 'the Keeper of the Eternal Sun', theme: 'light', form: 'god', a: 'LN', p: ['the sun', 'law', 'order'], s: 'a golden sun' },
    { n: 'Corellon Larethian', t: 'the Creator of the Elves', theme: 'light', form: 'deity', a: 'CG', p: ['elves', 'art', 'magic'], s: 'a crescent moon' },
    { n: 'Silvanus', t: 'Oak Father', theme: 'nature', form: 'god', a: 'N', p: ['wild places', 'the balance of nature', 'old forests'], s: 'a green oak leaf' },
    { n: 'Mielikki', t: 'Our Lady of the Forest', theme: 'nature', form: 'goddess', a: 'NG', p: ['forests', 'rangers', 'woodland creatures'], s: 'the head of a gold-horned unicorn' },
    { n: 'Eldath', t: 'the Quiet One', theme: 'nature', form: 'goddess', a: 'NG', p: ['peace', 'quiet pools', 'waterfalls'], s: 'a waterfall spilling into a still pool' },
    { n: 'Malar', t: 'the Beastlord', theme: 'nature', form: 'god', a: 'CE', p: ['the hunt', 'bloodlust', 'savage beasts'], s: 'a clawed paw' },
    { n: 'Talos', t: 'the Storm Lord', theme: 'tempest', form: 'god', a: 'CE', p: ['storms', 'destruction', 'wildfire'], s: 'three lightning bolts striking out from one point' },
    { n: 'Umberlee', t: 'the Queen of the Depths', theme: 'tempest', form: 'goddess', a: 'CE', p: ['the sea', 'drowning', 'sea storms'], s: 'a wave curling both ways' },
    { n: 'Auril', t: 'the Frostmaiden', theme: 'tempest', form: 'goddess', a: 'NE', p: ['winter', 'cold', 'killing frost'], s: 'a six-pointed snowflake' },
    { n: 'Valkur', t: 'the Mighty', theme: 'tempest', form: 'god', a: 'CG', p: ['sailors', 'fair winds', 'ships at sea'], s: 'a storm cloud blowing a ship homeward' },
    { n: 'Tymora', t: 'Lady Luck', theme: 'trickery', form: 'goddess', a: 'CG', p: ['good luck', 'adventurers', 'bold chances'], s: 'a coin, face up' },
    { n: 'Beshaba', t: 'the Maid of Misfortune', theme: 'trickery', form: 'goddess', a: 'CE', p: ['bad luck', 'accidents', 'curses'], s: 'a pair of black antlers' },
    { n: 'Mask', t: 'the Master of All Thieves', theme: 'trickery', form: 'god', a: 'CN', p: ['thieves', 'shadows', 'intrigue'], s: 'a black velvet mask' },
    { n: 'Leira', t: 'the Lady of the Mists', theme: 'trickery', form: 'goddess', a: 'CN', p: ['illusion', 'deception', 'mist'], s: 'a triangle full of swirling mist' },
    { n: 'Garl Glittergold', t: 'the Joker', theme: 'trickery', form: 'god', a: 'LG', p: ['gnomes', 'pranks', 'gems'], s: 'a gold nugget' },
    { n: 'Cyric', t: 'the Prince of Lies', theme: 'trickery', form: 'god', a: 'CE', p: ['lies', 'strife', 'madness'], s: 'a white skull on a dark sunburst' },
    { n: 'Tempus', t: 'the Foehammer', theme: 'war', form: 'god', a: 'N', p: ['war', 'soldiers', 'battle'], s: 'an upright flaming sword' },
    { n: 'Torm', t: 'the True', theme: 'war', form: 'god', a: 'LG', p: ['loyalty', 'courage', 'duty'], s: 'a white right-hand gauntlet' },
    { n: 'Helm', t: 'the Vigilant One', theme: 'war', form: 'god', a: 'LN', p: ['guardians', 'protection', 'watchfulness'], s: 'an open eye on an upright gauntlet' },
    { n: 'the Red Knight', t: 'the Lady of Strategy', theme: 'war', form: 'goddess', a: 'LN', p: ['strategy', 'planning', 'tactics'], s: 'a red knight chess piece with stars for eyes' },
    { n: 'Bane', t: 'the Black Hand', theme: 'war', form: 'god', a: 'LE', p: ['tyranny', 'fear', 'conquest'], s: 'an upright black hand, fingers pressed together' },
    { n: 'Gruumsh', t: 'One-Eye', theme: 'war', form: 'god', a: 'CE', p: ['orcs', 'slaughter', 'raids'], s: 'a single unblinking eye' },
    { n: 'Kelemvor', t: 'the Lord of the Dead', theme: 'death', form: 'god', a: 'LN', p: ['the dead', 'a fair judgment', 'a peaceful end'], s: 'a skeletal arm holding balanced scales' },
    { n: 'Myrkul', t: 'the Lord of Bones', theme: 'death', form: 'god', a: 'NE', p: ['decay', 'old age', 'the restless dead'], s: 'a white skull on black' },
    { n: 'Shar', t: 'the Mistress of the Night', theme: 'death', form: 'goddess', a: 'NE', p: ['darkness', 'loss', 'secrets'], s: 'a black disk ringed in deep purple' },
    { n: 'Bhaal', t: 'the Lord of Murder', theme: 'death', form: 'god', a: 'NE', p: ['murder', 'violent death', 'dread'], s: 'a skull ringed by drops of blood' },
    { n: 'Jergal', t: 'the Final Scribe', theme: 'death', form: 'god', a: 'LN', p: ['the end of all things', 'records of the dead', 'fate'], s: 'a skull biting a quill' }
];

// type: the Factions tab's kind of faction this one stands in for (its leader, base, and
// secrets still come from that kind's tables). about: who they are. goal: what they want.
const REALMS_FACTIONS = [
    { n: 'the Harpers', type: 'order', about: 'a scattered network of bards, spies, and quiet do-gooders who work against tyrants', goal: 'keep any one power from ruling the rest', s: 'a silver harp cradling a crescent moon' },
    { n: 'the Order of the Gauntlet', type: 'order', about: 'holy warriors sworn to strike at evil before it strikes first', goal: 'root out evil wherever it hides', s: 'an upraised steel gauntlet' },
    { n: 'the Purple Dragon Knights', type: 'order', about: 'the royal knights of Cormyr', goal: 'guard the crown and its roads', s: 'a purple dragon rearing' },
    { n: "the Lords' Alliance", type: 'house', about: "a league of cities and their rulers that keeps the North safe and its coffers full", goal: 'keep the cities of the North strong, and their own city first among them', s: 'a crown above a ring of shields' },
    { n: 'the Emerald Enclave', type: 'circle', about: 'druids and rangers who keep the balance between the wild and the towns', goal: 'keep the wild from being tamed, and the towns from being overrun', s: 'a green ring around a stag\'s antlers' },
    { n: 'the Red Wizards of Thay', type: 'circle', about: 'shaven-headed mages from Thay who trade in magic and want a good deal more', goal: 'gather every scrap of magic they can buy, steal, or bargain for', s: 'a burning hand on a red field' },
    { n: 'the Zhentarim', type: 'thieves', about: 'the Black Network: smugglers, sellswords, and fixers who will sell anything to anyone', goal: 'make themselves the only people who can get things done', s: 'a black serpent with wings' },
    { n: 'the Xanathar Guild', type: 'thieves', about: 'a Waterdeep crime ring run by a beholder who trusts no one', goal: 'own every crooked deal under the city', s: 'a circle with ten spokes' },
    { n: 'the Shadow Thieves', type: 'thieves', about: 'an old guild of thieves and assassins out of Amn', goal: 'skim a share of every coin that changes hands', s: 'a black mask on a gold coin' },
    { n: 'the Cult of the Dragon', type: 'cult', about: 'worshippers who believe the dead dragons will one day rule the world', goal: 'raise dead dragons and serve them', s: 'a dragon\'s claw clutching a black gem' },
    { n: 'the Cult of the Elder Elemental Eye', type: 'cult', about: 'four cults of earth, air, fire, and water that serve one hungry, ancient thing', goal: 'tear the world open to the raw elements', s: 'an eye inside a ring of four points' },
    { n: 'the Flaming Fist', type: 'company', about: "Baldur's Gate's mercenary army, which also happens to be its watch", goal: 'keep the peace, for a fee', s: 'a gauntlet wreathed in flame' },
    { n: "Bregan D'aerthe", type: 'company', about: 'a band of drow mercenaries who work for whoever pays best', goal: 'get paid, get information, and get out', s: 'a spider hanging from a single thread' },
    { n: 'the Knights of the Shield', type: 'guild', about: 'a secret cabal of merchants and nobles who buy influence quietly', goal: 'steer every council vote toward their own trade', s: 'a plain shield with no device at all' }
];

// Cities and where they are. about: in a few words, for "a day's ride from …".
const REALMS_CITIES = [
    { n: 'Waterdeep', r: 'the Sword Coast', about: 'the City of Splendors, the richest port on the coast' },
    { n: "Baldur's Gate", r: 'the Sword Coast', about: 'a crowded port where everything is for sale' },
    { n: 'Neverwinter', r: 'the Sword Coast', about: 'a city rebuilt after its mountain woke and burned it' },
    { n: 'Luskan', r: 'the Sword Coast', about: 'a pirate city run by its ship captains' },
    { n: 'Daggerford', r: 'the Sword Coast', about: 'a small walled town at a ford south of Waterdeep' },
    { n: 'Phandalin', r: 'the Sword Coast', about: 'a frontier town built on older ruins' },
    { n: 'Silverymoon', r: 'the Silver Marches', about: 'a city of scholars and mages in the North' },
    { n: 'Mirabar', r: 'the North', about: 'a mining city where humans and dwarves dig side by side' },
    { n: 'Bryn Shander', r: 'Icewind Dale', about: 'the biggest of the Ten-Towns, cold all year' },
    { n: 'Candlekeep', r: 'the Sword Coast', about: 'a fortress library on a sea cliff' },
    { n: 'Suzail', r: 'Cormyr', about: 'the royal capital of Cormyr' },
    { n: 'Arabel', r: 'Cormyr', about: 'a trading city on the edge of Cormyr' },
    { n: 'Mulmaster', r: 'the Moonsea', about: 'a walled port on the cold Moonsea' },
    { n: 'Hillsfar', r: 'the Moonsea', about: 'a city behind high walls that does not welcome strangers' },
    { n: 'Shadowdale', r: 'the Dalelands', about: 'a farming dale with a famous tower' },
    { n: 'Athkatla', r: 'Amn', about: 'the merchant capital of Amn' },
    { n: 'Calimport', r: 'Calimshan', about: 'a sprawling desert port of pashas and guilds' },
    { n: 'Elturel', r: 'the Western Heartlands', about: 'a city of the faithful on the river Chionthar' },
    { n: 'Triboar', r: 'the North', about: 'a crossroads town of caravans and horse fairs' }
];

const REALMS_REGIONS = ['the Sword Coast', 'the North', 'the Dalelands', 'Cormyr', 'the Moonsea', 'Icewind Dale', 'the Western Heartlands', 'Amn', 'Calimshan', 'the Silver Marches', 'the Vast'];

// Human names in the Realms' style (the Gazette's own, not a book's list).
const REALMS_NAMES = {
    male: ['Thalmond', 'Orrin', 'Kessar', 'Malvek', 'Jhaeron', 'Dauner', 'Ulbrek', 'Rhovar', 'Halvor', 'Cendric', 'Ilmar', 'Barnath', 'Ostrum', 'Jharl', 'Faerus', 'Gerren', 'Varnis', 'Teodric', 'Kalvan', 'Haelar', 'Pellam', 'Druce', 'Sarvin', 'Esk', 'Ammon', 'Tarth', 'Rhenn', 'Zahir', 'Kadeem', 'Mortimer'],
    female: ['Imaera', 'Jhessa', 'Sarvanna', 'Ilyra', 'Merra', 'Dauna', 'Kethra', 'Amra', 'Elvyra', 'Lorna', 'Ysolde', 'Narra', 'Jhanna', 'Corra', 'Halia', 'Vessa', 'Myrna', 'Rhessa', 'Faela', 'Orla', 'Selda', 'Tamsin', 'Aubra', 'Shalia', 'Zarah', 'Nasreen', 'Brynna', 'Delphine', 'Kathra', 'Ondra'],
    nonbinary: ['Jhaen', 'Ash', 'Tavi', 'Rennick', 'Sorrel', 'Imri', 'Vale', 'Kesh', 'Morrow', 'Lark', 'Daelin', 'Zephyr'],
    surname: ['Ambergate', 'Coldwater', 'Ashmantle', 'Harrowmere', 'Duskwater', 'Raventhorne', 'Greycastle', 'Mossdale', 'Thornwick', 'Blackbarrow', 'Hammersmith', 'Oakhurst', 'Vandermere', 'Elmshade', 'Copperkettle', 'Highcliff', 'Stonebridge', 'Larkspur', 'Winterfall', 'Dunmoor', 'Merrowgate', 'Fallowmere', 'Brokenhelm', 'Ironwood', 'Velenor', 'Jhantar', 'Rhindaun', 'Kesteren', 'Ulmaster', 'Daerivar', 'Torsk', 'Halvanor', 'Marsk', 'Oszen', 'Saltmere', 'Brightbarrow', 'Wolfsong', 'Tallgrass', 'Fairwind', 'Embersky']
};

// Rumors for the Realms (the Gazette's own). category, truth, and followup as in rumors.json.
const REALMS_RUMORS = [
    { text: 'A Harper left a silver pin in the collection plate at the temple. Someone in town is being watched.', category: 'local', truth: 60, followup: 'The pin belonged to the temple\'s own cantor, who has been reporting on the choir for years. The choir was, it turns out, mostly smugglers.' },
    { text: 'The Zhentarim are buying every horse between here and Daggerford.', category: 'economics', truth: 70, followup: 'They were. Then they found out horses need feeding, and now they are selling every horse between here and Daggerford.' },
    { text: "Envoys from the Lords' Alliance are on their way to ask the town to pay for a new wall.", category: 'politics', truth: 55, followup: 'The envoys arrived, measured the old wall, and asked the town to pay for the measuring.' },
    { text: "A Red Wizard has been buying every candle in Baldur's Gate.", category: 'magic', truth: 40, followup: 'The candles were for a ritual. The ritual was a birthday. Nobody was invited.' },
    { text: 'Cultists of the Dragon are digging in the old barrow. They say a dead wyrm sleeps under it.', category: 'monsters', truth: 35, followup: 'The barrow held a very large lizard skeleton and a farmer\'s lost plow. The cult kept both.' },
    { text: "Waterdeep's harbor closed for three days because the merfolk went on strike.", category: 'economics', truth: 25, followup: 'The merfolk wanted fewer anchors dropped on their roofs. They got a sign.' },
    { text: 'Candlekeep is turning away anyone who doesn\'t bring a book they haven\'t got.', category: 'local', truth: 80, followup: 'One traveler got in with a cookbook of his grandmother\'s. The monks have been arguing about the stew recipe ever since.' },
    { text: 'Snow fell on Midsummer in Icewind Dale. They say the Frostmaiden is angry again.', category: 'magic', truth: 65, followup: 'It was snow. Whether it was anger is between the dale and its goddess.' },
    { text: 'The Flaming Fist is hiring anyone who can hold a sword and keep quiet.', category: 'adventures', truth: 75, followup: 'The holding a sword part was negotiable. The keeping quiet part was not.' },
    { text: "Tymora's priests flipped a coin to settle a lawsuit, and the coin landed on its edge.", category: 'local', truth: 30, followup: 'Both sides claimed it was a sign. The priests kept the coin, and the fee.' },
    { text: 'The beholder who runs the thieves of Waterdeep has a pet goldfish, and its tank needs cleaning.', category: 'monsters', truth: 50, followup: 'Three people took the job. One came back, with very clean hands and no wish to talk about it.' },
    { text: 'The Emerald Enclave has asked the lumber camp to stop cutting on the north ridge, politely, once.', category: 'politics', truth: 70, followup: 'The second request came from the trees themselves. The camp has moved.' },
    { text: 'A Purple Dragon knight is riding the roads looking for a stolen royal seal.', category: 'adventures', truth: 60, followup: 'The seal was found in a pie at a roadside inn. How it got there is still a matter for the crown.' },
    { text: 'Luskan\'s captains have all agreed on something. Nobody knows what, which is the worrying part.', category: 'politics', truth: 45, followup: 'They agreed to disagree. It lasted until lunch.' },
    { text: "A priest of Kelemvor says the graveyard's dead are leaving, one each night, all walking toward the hills.", category: 'monsters', truth: 55, followup: 'Something in the hills was calling them. The party who went to see is now calling for help too.' },
    { text: 'The Order of the Gauntlet is searching cellars for a hidden shrine to Bane.', category: 'adventures', truth: 50, followup: 'They found a shrine. It was to a very popular local cheese. They found the real one a week later, under the mayor\'s house.' },
    { text: 'A Selûnite sailor swears the moon had two shadows last night.', category: 'magic', truth: 35, followup: 'The second shadow was a dragon flying across the moon. That was not better news.' },
    { text: 'Shadow Thieves from Amn are in town, and the tax collector has not been seen since.', category: 'economics', truth: 40, followup: 'The tax collector had simply taken a holiday. The town has since asked the Shadow Thieves to take one too.' },
    { text: 'Gond\'s priests have built a clock that tells you when you\'re going to be late.', category: 'magic', truth: 65, followup: 'It works. It is always right. Nobody wants it.' },
    { text: 'Somebody in Neverwinter is selling maps to the old dwarven mines, and every map is different.', category: 'adventures', truth: 50, followup: 'All the maps were right. The mines are much bigger than anyone thought.' },
    { text: "Lady Luck's temple has run out of lucky coins, which the priests say is unlucky.", category: 'local', truth: 70, followup: 'A shipment arrived the next day, which the priests say proves the point.' },
    { text: "The Xanathar Guild is paying good coin for anyone who's seen an eye-shaped birthmark.", category: 'monsters', truth: 30, followup: 'The beholder was looking for a long-lost relative. It turned out to be a potato.' },
    { text: 'Every bard in town is suddenly singing about the same missing duchess. The Harpers are behind it.', category: 'politics', truth: 55, followup: 'The song worked: the duchess turned up, mainly to complain about the rhymes.' },
    { text: 'A caravan from Calimport is selling carpets. One of them keeps trying to leave.', category: 'magic', truth: 60, followup: 'The carpet got away. It was last seen over the Sword Coast, heading home.' }
];

// ── The picker ───────────────────────────────────────────
// Realms names are for D&D only: another system's page never offers them.
function realmsAllowed() {
    return typeof ruleSystemId !== 'function' || ruleSystemId() === '5e';
}

// Set up a tool's World <select> (id). Hidden (and kept on the Gazette's own world) where
// the system isn't D&D; otherwise it starts on the reader's last choice for this tool, so
// a link with world= still overrides it (the tool's URL code sets it after this).
function realmsPicker(id, tool) {
    const el = document.getElementById(id);
    if (!el) return null;
    const key = 'gazette-world-' + tool;
    if (!realmsAllowed()) {
        // Without the option, a link's world=realms can't set it either.
        [...el.options].filter(o => o.value === 'realms').forEach(o => o.remove());
        el.value = '';
        (el.closest('label, .control-group') || el).hidden = true;
        return el;
    }
    try {
        const v = localStorage.getItem(key);
        if (v !== null) setFieldValue(el, v);
    } catch (e) { /* storage off: start on the default */ }
    el.addEventListener('change', () => {
        try { localStorage.setItem(key, el.value); } catch (e) { /* not remembered */ }
    });
    return el;
}

// Whether the World <select> (id) is on the Realms.
function realmsOn(id) {
    const el = document.getElementById(id);
    return !!el && el.value === 'realms' && realmsAllowed();
}

// ── Draws ────────────────────────────────────────────────
function realmsPick(list) {
    return list[Math.floor(rand() * list.length)];
}

function realmsShuffle(list) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

// Run fn on a seed of its own for this key, so Realms draws never move the main roll.
function realmsWith(key, fn) {
    return withSeed(hashString('realms/' + key).toString(36), fn);
}

function realmsGod(name) {
    return REALMS_GODS.find(g => g.n === name) || null;
}

// A god for a believer: mostly the friendlier ones (evil gods have quieter followings).
function realmsFaithPick() {
    const kind = rand();
    const pool = REALMS_GODS.filter(g => kind < 0.8 ? !/E$/.test(g.a) : true);
    return realmsPick(pool);
}

// The Realms gods as a pantheon the Factions and Town tabs can draw from like a linked one.
// Each god carries the fields panSymbolText and facDeity read.
function realmsPantheon() {
    return {
        realms: true,
        gods: REALMS_GODS.map(g => ({ name: g.n, epithet: g.t, domain: g.theme, domain2: null, form: g.form, alignment: g.a,
            portfolio: g.p, symbolObj: g.s, symbolMod: '', symbolColor: '', realms: true }))
    };
}

// "Waterdeep, the City of Splendors…" or a city for a key.
function realmsCity(key) {
    return realmsWith('city/' + key, () => realmsPick(REALMS_CITIES));
}

// ── NPCs ─────────────────────────────────────────────────
// Give an NPC the Realms: a human gets a Realms-style name (a tiefling with a family name
// gets a Realms surname), and every NPC gets a home city, maybe a god, and now and then a
// faction they quietly belong to. key: a stable string for this NPC (its identity seed).
function realmsTouchNpc(npc, key) {
    return realmsWith('npc/' + key, () => {
        const first = realmsPick(REALMS_NAMES[npc.gender] || REALMS_NAMES.male);
        const surname = realmsPick(REALMS_NAMES.surname);
        const human = npc.race === 'human';
        const tiefSurname = npc.race === 'tiefling' && npc.surname && npc.firstName !== npc.name;
        if (human || tiefSurname) {
            const firstName = human ? first : npc.firstName;
            const quoted = npc.nickname ? `"${npc.nickname}" ` : '';
            Object.assign(npc, { firstName, surname, name: `${firstName} ${quoted}${surname}` });
        }
        const from = realmsPick(REALMS_CITIES);
        const faithRoll = rand(), faith = realmsFaithPick();
        const tieRoll = rand(), tie = realmsPick(REALMS_FACTIONS);
        npc.realms = {
            from: from.n,
            faith: npc.professionCategory === 'religious' || faithRoll < 0.5 ? faith.n : null,
            tie: tieRoll < 0.15 ? tie.n : null
        };
        return npc;
    });
}

// "From Waterdeep. Prays to Tymora. Quietly one of the Harpers." for an NPC touched above.
function realmsNpcLine(npc) {
    const r = npc && npc.realms;
    if (!r) return '';
    const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
    return [`From ${r.from}.`, r.faith ? `Prays to ${cap(r.faith)}.` : '', r.tie ? `Quietly one of ${r.tie}.` : ''].filter(Boolean).join(' ');
}

// A tool note's Forgotten Realms line (.realms-note) goes wherever the picker does.
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        if (!realmsAllowed()) document.querySelectorAll('.realms-note').forEach(n => { n.hidden = true; });
    });
}
