/* ============================================
   FACTION ENGINE (F35, Worldbuilder)
   A seeded set of factions for a town, a city, or a kingdom: guilds, cults, noble
   houses, thieves' rings, knightly orders, temples, mages' circles, and mercenary
   companies. Each has a name, a goal and a method, a base, a symbol and colors,
   resources and a treasury, a secret, what it's doing right now, a leader and
   lieutenants (rolled by the NPC engine, so each one opens on the NPC page), and
   what it wants from the party. Between them: rivalries and alliances.
   Every part rolls from deriveSeed(seed, part), so changing one option keeps the rest:
   more factions keeps the ones already there; a new focus changes the first
   faction (and any faction of that kind it trades places with); a new scale changes only the numbers (members, treasury) and the place.
   Temples, orders, some cults, and some houses follow a god. With a linked pantheon
   (pantheon-engine.js, rollPantheon) that god is one of its gods; without one it's a
   god known by a title. Needs rng.js, coins.js, npc-data.js, pantheon-engine.js.
   The tables are the Gazette's own.
   ============================================ */

const FAC_COUNTS = {
    few:   { label: 'A few factions (3-4)', min: 3, max: 4 },
    full:  { label: 'A full roster (5-6)', min: 5, max: 6 },
    many:  { label: 'A crowded board (7-9)', min: 7, max: 9 }
};

// members: [low, high] for a mid-sized faction; treasury multiplies each faction's base.
const FAC_SCALES = {
    town:    { label: 'A town', icon: '🏘️', place: 'the town', members: 0.25, treasury: 0.3 },
    city:    { label: 'A city', icon: '🏙️', place: 'the city', members: 1, treasury: 1 },
    kingdom: { label: 'A kingdom', icon: '👑', place: 'the kingdom', members: 6, treasury: 5 }
};

// NPC categories (npc-data.js professions) and gendered titles: [male, female, other].
const FAC_TYPES = {
    guild: {
        label: 'Guild', icon: '⚒️',
        about: 'A trade guild: dues, rules, apprentices, and a monopoly it would kill to keep.',
        members: [40, 220], treasury: [800, 6000],
        leader: { cat: 'merchant', title: ['Guildmaster', 'Guildmistress', 'Guildmaster'] },
        lieutenants: [
            ['Treasurer', 'merchant'], ['Master of Apprentices', 'commoner'], ['Enforcer', 'criminal'],
            ['Clerk of the Rolls', 'commoner'], ['Envoy to the Council', 'noble'], ['Senior Journeyman', 'commoner', 'adult'],
            ['Inspector of Weights', 'guard']
        ],
        crafts: [
            ['Brewers', 'ale'], ['Masons', 'stone'], ['Weavers', 'cloth'], ['Chandlers', 'candles'], ['Smiths', 'iron'],
            ['Glassblowers', 'glass'], ['Tanners', 'leather'], ['Saddlers', 'saddles'], ['Bakers', 'bread'], ['Shipwrights', 'ships'],
            ['Apothecaries', 'medicine'], ['Scriveners', 'ink and paper'], ['Jewelers', 'gems'], ['Ratcatchers', 'rat poison'],
            ['Lamplighters', 'lamp oil'], ['Coopers', 'barrels'], ['Dyers', 'dye'], ['Fishmongers', 'fish'], ['Moneychangers', 'coin'],
            ['Carpenters', 'timber'], ['Vintners', 'wine'], ['Butchers', 'meat'], ['Ropemakers', 'rope'], ['Bookbinders', 'books']
        ],
        names: ["the {Crafters}' Guild", 'the Worshipful Company of {Crafters}', 'the Honorable Fellowship of {Crafters}', "the {Crafters}' Compact", 'the United {Crafters}', "the {Crafters}' Hall", 'the Free and Ancient {Crafters}'],
        goals: [
            'Hold every contract for {thing} in {place}, and break anyone who sells it without a guild seal.',
            'Buy a seat on the ruling council and keep it in the guild for good.',
            'Drive out the foreign traders who undersell them on {thing}.',
            'Get a royal charter that makes their monopoly law.',
            'Raise a new guildhall taller than the temple, out of spite.',
            'Find the old guild charter that proves they own half the market square.',
            'Win the war on prices before winter, whatever it costs.',
            'Keep the secret of how the best {thing} is made inside the guild.'
        ],
        methods: [
            'Fines, boycotts, and very long meetings.',
            'Bribes paid in kind, with the best {thing} in {place}.',
            'Lawsuits. They keep three lawyers on retainer and one in the cellar.',
            'Strikes: when the guild stops work, {place} goes without {thing}.',
            'Quiet visits from the Enforcer to anyone who works without a seal.',
            'Marriages between guild families and anyone with a vote.'
        ],
        bases: [
            'a guildhall on the market square with a brass sign the size of a door',
            'the upstairs room of an alehouse they bought so they would stop paying for it',
            'an old warehouse by the river, with the guild\'s books kept in an iron chest',
            'a grand timbered hall where every master has a carved chair and a grudge',
            'a row of workshops joined by doors knocked through the walls'
        ],
        resources: [
            'A monopoly on {thing}, at least on paper.', 'Dues from every master in the trade.', 'The ear of half the council.',
            'A warehouse of {thing} they can hold back to raise prices.', 'A strongroom full of contracts and debts owed.',
            'Apprentices who see everything and say nothing.', 'A militia of journeymen with hammers and opinions.',
            'Old trade routes and the merchants who still use them.'
        ],
        secrets: [
            'The guild\'s founding charter is a forgery; the real one gave the monopoly to someone else.',
            'The treasury is empty. The Treasurer has been paying old debts with new dues for years.',
            'Their best {thing} comes from a supplier nobody is allowed to name, for good reason.',
            'The guild started the fire that ruined their last rival, and two people died in it.',
            'The guild pays {rival} to keep the streets quiet around its warehouses.',
            'An apprentice found a cheaper way to make {thing}, and the guild buried it, and nearly the apprentice too.',
            'Half the masters want to break away and form a new guild; the vote is next month.',
            'The guildmaster sells the guild\'s secrets abroad to cover gambling debts.'
        ],
        now: [
            'Holding back a shipment of {thing} so the price doubles before the feast.',
            'Fining a widow who kept her husband\'s workshop open without a seal.',
            'Bribing a council member over a new tax.',
            'Hiring guards after a break-in at the guildhall.',
            'Planning a procession so grand it will block the main road for a day.',
            'Hunting for whoever is selling cheap {thing} in the back streets.'
        ],
        wants: [
            'Find out who is selling unsealed {thing} and make them stop, gently or not.',
            'Escort a cart of {thing} through country where {rival} {rival:has|have} been making trouble.',
            'Recover a stolen ledger before the council sees what is in it.',
            'Stand guard at the guildhall during a vote that might turn into a brawl.',
            'Persuade a stubborn master to sign the new price list.',
            'Find the missing apprentice who walked off with the guild\'s secret recipe.'
        ],
        perks: ['a guild discount on {thing}', 'a letter that opens doors at every guildhall on the coast', 'free lodging at the guildhall', 'a master\'s work, made to order'],
        join: ['Seven years as an apprentice, or one very large fee.', 'A masterwork piece judged by three masters who hate each other.', 'A dead member\'s place, bought from the widow.', 'Marry into a guild family.'],
        rep: ['Respected and resented in equal parts.', 'Seen as greedy, but nobody can do without them.', 'Loved by their own and hated by every outsider in the trade.', 'Old, dull, and more powerful than anyone remembers.', 'Feared by small traders, flattered by the council.'],
        mottos: ['Measure Twice.', 'By Hand and Seal.', 'Fair Weight, Fair Price.', 'The Work Endures.', 'Nothing Without the Guild.', 'Our Hands Built This.'],
        symbols: ['a hammer and a set of scales', 'a key crossed with a quill', 'a beehive', 'a gear with seven teeth', 'an open hand holding a coin', 'a lantern over a gate', 'a ship under full sail', 'a barrel bound in three hoops'],
        tension: 'guild'
    },

    cult: {
        label: 'Cult', icon: '🕯️',
        about: 'A secret congregation with one belief the temples would burn them for.',
        members: [8, 60], treasury: [100, 2500],
        leader: { cat: 'religious', title: ['Prophet', 'Prophetess', 'Prophet'] },
        lieutenants: [
            ['Recruiter', 'commoner'], ['Keeper of the Knife', 'criminal'], ['Dreamer', 'magic'], ['Respectable Patron', 'noble'],
            ['True Believer', 'commoner', 'young'], ['Scribe of Visions', 'magic'], ['Doorwarden', 'guard']
        ],
        adj: ['Pale', 'Hollow', 'Ninth', 'Drowned', 'Silent', 'Last', 'Weeping', 'Bright', 'Hungering', 'Unblinking', 'Smiling', 'Sleepless', 'Velvet', 'Thirteenth'],
        nouns: ['Choir', 'Hand', 'Circle', 'Lantern', 'Door', 'Congregation', 'Flame', 'Tide', 'Eye', 'Thread', 'Mouth', 'Bell', 'Star', 'Garden'],
        names: ['the {Adj} {Noun}', 'the Children of the {Adj} {Noun}', 'the Brotherhood of the {Adj} {Noun}', 'the Fellowship of the {Noun}', 'Those Who Wait Below', 'Those Who Listen', 'the Sleeper\'s Kin', 'the Keepers of the {Adj} {Noun}', 'the Gentle Society'],
        outer: [
            'something in the old well that answers questions',
            'a star only they can see, which they say is getting closer',
            'the Sleeper under the hill',
            'a demon who calls itself the Kind Man',
            'the sea, which they believe is alive and hungry',
            'a dead queen they expect back any day now',
            'the Ninth Door, which no one has opened yet',
            'a voice that speaks through the cracks in old mirrors'
        ],
        domains: ['death', 'trickery', 'tempest', 'nature', 'knowledge'],
        goals: [
            'Wake {god} before the next eclipse.',
            'Put one of their own on the council, and then another.',
            'Gather the seven pieces of a broken relic.',
            'Bring about the end of the world, but politely and on schedule.',
            'Win {place} over one family at a time, starting with the children.',
            'Open a door in the catacombs that was sealed for a reason.',
            'Prove that {god} is the true god and every temple is a lie.',
            'Make a member immortal, and they have chosen which one.'
        ],
        methods: [
            'Charity: free soup, warm beds, and a sermon you can\'t leave.',
            'Blackmail, gathered from confessions.',
            'Dreams. Members say they are told what to do while they sleep.',
            'Quiet disappearances, which the watch puts down to the river.',
            'Patience. They have been here longer than the walls.',
            'Gifts to the powerful, each with a small token they are asked to wear.'
        ],
        bases: [
            'a cellar under a respectable house, reached through the wine racks',
            'the catacombs below the old temple',
            'a burned-out chapel in the woods that is busier than it looks',
            'a dye works where the vats hide a stair going down',
            'a members-only reading room above a bookshop',
            'an island in the marsh, reached only at low tide'
        ],
        resources: [
            'Members in every household, from scullery to council chamber.', 'A relic that does something nobody likes to talk about.',
            'Money from a patron who wants to stay nameless.', 'Visions that are right a little too often.',
            'Poisons, and someone who knows how to use them.', 'Old maps of the tunnels under {place}.',
            'Fanatics who will not talk, whatever is done to them.', 'A forbidden book, and a member who can read it.'
        ],
        secrets: [
            'The {Leader} has never heard from {god}; the visions are written by the Scribe.',
            'The cult is funded by {rival}, who think they are using it.',
            'They are right. Something is coming, and they are the only ones getting ready.',
            'The Respectable Patron is the real leader and has never once attended a meeting.',
            'Three members have died this year, and the cult did not kill them. Something else is hunting them.',
            'The relic they guard is a fake; the real one was sold a generation ago.',
            'Half the cult are spies for the temple, reporting on the other half.',
            'Their sacred texts are a cookbook with a bad translation.'
        ],
        now: [
            'Recruiting among the dock workers, with bread and promises.',
            'Preparing a rite for the next dark moon.',
            'Looking for a child born on a particular night.',
            'Buying up candles, chalk, and an alarming number of goats.',
            'Following one of the party, for reasons of their own.',
            'Trying to get a member out of the jail before he talks.'
        ],
        wants: [
            'Fetch a "family heirloom" from a crypt outside town. Don\'t open the box.',
            'Find a runaway member before {rival} {rival:does|do}.',
            'Deliver a sealed letter to a councilor\'s house at midnight.',
            'Guard a meeting in the woods; ask no questions.',
            'Steal a book from the temple library. It belongs to them, they say.',
            'Find out who is killing their members.'
        ],
        perks: ['a vision of the party\'s future, mostly accurate', 'the name of someone in power who owes the cult', 'a blessing that works, and a cost that comes later', 'a safe house nobody else knows about'],
        join: ['Be found by them; nobody asks to join.', 'Survive a night alone in the catacombs.', 'Give up something you love, and tell no one what it was.', 'Have the dream. They will know when you do.'],
        rep: ['Most folk have never heard of them, and the ones who have keep quiet.', 'Thought to be a harmless charity.', 'Whispered about in taverns, mocked in daylight.', 'Hunted by the temple, which only makes them more popular.', 'A rumor the watch swears is not real.'],
        mottos: ['It Is Nearly Time.', 'We Listen.', 'Below, Above.', 'The Door Opens Inward.', 'Sleep Well.', 'Be Still and Be Counted.'],
        symbols: ['an eye inside an open hand', 'a closed door with no handle', 'a candle burning at both ends', 'a spiral of nine dots', 'a black star', 'a mouth sewn shut', 'a key with teeth at both ends', 'a crescent moon with a face'],
        tension: 'cult'
    },

    house: {
        label: 'Noble house', icon: '🏰',
        about: 'An old family with land, a title, a feud, and more pride than money.',
        members: [12, 80], treasury: [2000, 20000],
        leader: { cat: 'noble', title: ['Lord', 'Lady', 'Liege'] },
        lieutenants: [
            ['Steward', 'commoner', 'old'], ['Master-at-Arms', 'guard'], ['House Mage', 'magic'], ['Spymaster', 'criminal'],
            ['Chaplain', 'religious'], ['Castellan', 'guard'], ['Herald', 'guard']
        ],
        fallback: ['Ashgrove', 'Valcourt', 'Thornwall', 'Merrow', 'Blackwater', 'Corvain', 'Halloway', 'Stagmere', 'Redfern', 'Wyndham'],
        names: ['House {Surname}'],
        goals: [
            'Put an heir on the throne, or close enough to it.',
            'Win back the lands their grandfather lost at cards.',
            'Marry the heir into the richest house in {place}.',
            'Destroy {rival}, slowly, and be thanked for it.',
            'Pay off their debts before anyone finds out how large they are.',
            'Clear the family name of a crime from three generations back.',
            'Get the title of duke, which they believe was promised to them in a letter nobody can find.',
            'Hold the bridge, the toll, and the town that grew up around it.'
        ],
        methods: [
            'Marriages, arranged a generation in advance.',
            'Duels, fought by hired champions.',
            'Debts: they lend to everyone and collect in favors.',
            'Old law. They know every right their ancestors were ever granted.',
            'Parties so lavish that refusing an invitation is an insult.',
            'Knights, horses, and a willingness to use both.'
        ],
        bases: [
            'a keep on the hill above {place}, drafty and full of portraits',
            'a townhouse with a garden, a gate, and too many servants',
            'a fortified manor surrounded by orchards and tenants',
            'a crumbling castle the family cannot afford to repair or bear to sell',
            'a tower house with a private chapel and a crypt'
        ],
        resources: [
            'Land, and the farmers on it.', 'Twenty sworn knights, give or take the ones who are drunk.', 'A seat at court.',
            'Old family silver, most of it pawned.', 'A charter that lets them collect a toll on the main road.',
            'Cousins in every noble house worth knowing.', 'A family sword with a name and a temper.', 'The goodwill of the crown, for now.'
        ],
        secrets: [
            'The heir is not the {Leader}\'s child.',
            'The house is broke; the silver on the table is painted lead.',
            'The founder of the house was a bandit who bought the title.',
            'The {Leader} has been paying {rival} to keep a scandal buried.',
            'There is a sealed room in the keep, and the family knows what is in it.',
            'The house is secretly descended from the old royal line, and someone else knows it.',
            'A younger sibling believed dead is alive and living under another name in {place}.',
            'The house made a pact with something long ago, and the bill is due.'
        ],
        now: [
            'Preparing a wedding that half the family is against.',
            'Hosting a hunt that will be used to settle a dispute.',
            'Suing a neighbor over a boundary stone.',
            'Mourning a death that might not have been an accident.',
            'Hiring guards for the heir after a threat was nailed to the door.',
            'Courting {rival} in public and plotting against them in private.'
        ],
        wants: [
            'Escort the heir to a wedding in another town and keep them out of trouble.',
            'Find who sent the threatening letter.',
            'Retrieve a family heirloom from a pawnbroker without paying for it.',
            'Fight in a duel as the house\'s champion.',
            'Clear bandits off the house\'s land; the tenants have stopped paying.',
            'Find proof that {rival} cheated at the last tournament.'
        ],
        perks: ['a minor title, if the party does well', 'the house\'s favor at court', 'horses from the family stables', 'a parcel of land with a ruin on it'],
        join: ['Be born into it.', 'Marry into it.', 'Swear fealty and be granted land.', 'Save a family member\'s life, publicly.'],
        rep: ['Admired from a distance, avoided up close.', 'Known for fair dealing with their tenants.', 'Proud, prickly, and quick to take offense.', 'A great name in decline.', 'Feared, and they like it that way.'],
        mottos: ['We Do Not Kneel.', 'Steadfast.', 'Ours by Right.', 'Remember the Bridge.', 'First In, Last Out.', 'Honor Before Bread.'],
        symbols: ['a stag rampant', 'a tower with three windows', 'a black boar', 'a crowned fish', 'a silver hand', 'two crossed spears', 'a white rose', 'a hawk with a key'],
        tension: 'house'
    },

    thieves: {
        label: "Thieves' ring", icon: '🗝️',
        about: 'An organized gang of thieves, fences, and smugglers with rules of its own.',
        members: [20, 120], treasury: [500, 8000],
        leader: { cat: 'criminal', title: ['Boss', 'Boss', 'Boss'] },
        lieutenants: [
            ['Fence', 'criminal'], ['Second-Story Captain', 'criminal'], ['Bought Guard', 'guard'], ['Bookkeeper', 'merchant'],
            ['Informant', 'commoner'], ['Smuggler', 'criminal'], ['Street Captain', 'criminal', 'young']
        ],
        adj: ['Velvet', 'Grey', 'Sixpenny', 'Crooked', 'Silent', 'Copper', 'Midnight', 'Smiling', 'Gutter', 'Lantern', 'Brass', 'Quiet'],
        nouns: ['Glove', 'Hands', 'Court', 'Knives', 'Crows', 'Key', 'Ledger', 'Rats', 'Company', 'Masks', 'Cats', 'Moths'],
        names: ['the {Adj} {Noun}', 'the {Adj} {Noun}', 'the Night Market', 'the Tallymen', 'the Rat\'s Nest', 'the Underneath'],
        goals: [
            'Run every racket in {place}, and take a cut of the ones they don\'t run.',
            'Pull off the one big job that lets the {Leader} retire.',
            'Push {rival} out of the docks.',
            'Buy enough of the watch to stop worrying about the watch.',
            'Find the old royal treasury, which the {Leader} is sure is under the city.',
            'Go legitimate within a generation, and own the guilds that once hunted them.',
            'Keep the peace on the streets, because chaos is bad for business.',
            'Get a jailed founder out of the deepest cell in {place}.'
        ],
        methods: [
            'Protection money, collected politely the first time.',
            'Smuggling through tunnels nobody else has mapped.',
            'Burglary, by appointment.',
            'Fencing anything, no questions asked.',
            'Card games where the house always wins.',
            'A code: no killing, no stealing from the poor, and no snitching. Mostly.'
        ],
        bases: [
            'a tavern with a back room, a cellar, and a cellar under the cellar',
            'the old sewers, with a throne made from a broken bathtub',
            'a pawnshop that never seems to sell anything',
            'a bathhouse where business is done in the steam',
            'a warehouse on the docks owned by a man who does not exist'
        ],
        resources: [
            'Eyes and ears on every street.', 'A map of the sewers and smugglers\' tunnels.', 'Half the night watch on the payroll.',
            'A fence who can move anything, even a statue.', 'Safe houses all over {place}.', 'Forged papers, seals, and a forger who is very good.',
            'A boat that is not where anyone thinks it is.', 'Debts owed by people who matter.'
        ],
        secrets: [
            'The {Leader} is a member of the council by day.',
            'The ring is run by {rival}, and most of the members have no idea.',
            'The {Leader} is dead; the lieutenants have been faking orders for a month.',
            'They are holding a kidnapped noble in the sewers, and it has gone badly.',
            'The ring is an informant network for the crown, and has been from the start.',
            'Their famous vault is empty; the last big job went wrong and they have been bluffing since.',
            'One of the lieutenants sold the others out, and the watch is going to raid on the next feast day.',
            'The founder is not in jail. The founder is the jailer.'
        ],
        now: [
            'Planning a robbery during the next festival.',
            'Fighting {rival} over a corner of the market.',
            'Hunting a member who skipped town with the takings.',
            'Moving a crate nobody is allowed to open.',
            'Recruiting street children, who are better at it than the adults.',
            'Laying low after a job that made too much noise.'
        ],
        wants: [
            'Crack a vault the ring\'s own people can\'t open.',
            'Get a member out of jail before the hanging.',
            'Find out which lieutenant is talking to the watch.',
            'Deliver a crate across town, unopened, past {rival}.',
            'Steal back something that was stolen from them, which they find very insulting.',
            'Make a loan shark who works without permission go away.'
        ],
        perks: ['a cut of the next job', 'fenced goods at half price', 'a free pass on the streets; no one will rob the party', 'forged papers, on the house'],
        join: ['Steal something from a member without getting caught.', 'Be vouched for by two members.', 'Do one job for free.', 'Pay dues every month, on time, in person.'],
        rep: ['Feared on the streets, ignored in the halls of power.', 'Seen as folk heroes by the poor, since they rob the rich.', 'Everyone knows about them; nobody can prove anything.', 'Thought broken years ago, and happy to keep it that way.', 'Loathed by honest merchants, used by dishonest ones.'],
        mottos: ['Nothing Is Locked.', 'Hands Quick, Mouths Shut.', 'We Were Never Here.', 'Every Coin Has Two Sides.', 'The Night Provides.', 'Take Only What Is Owed.'],
        symbols: ['a glove with one finger missing', 'a key held in teeth', 'a crow with a coin', 'a closed eye', 'a rat wearing a crown', 'a moth on a lantern', 'a broken lock', 'two crossed lockpicks'],
        tension: 'thieves'
    },

    order: {
        label: 'Knightly order', icon: '🛡️',
        about: 'Sworn knights with a cause, a code, and a chapterhouse full of old banners.',
        members: [15, 90], treasury: [1500, 12000],
        leader: { cat: 'adventurer', title: ['Grand Master', 'Grand Mistress', 'Grand Master'] },
        lieutenants: [
            ['Marshal', 'guard'], ['Chaplain', 'religious'], ['Quartermaster', 'merchant'], ['Champion', 'adventurer'],
            ['Squiremaster', 'adventurer', 'old'], ['Seneschal', 'noble'], ['Youngest Knight', 'adventurer', 'young']
        ],
        things: ['Silver Rose', 'Broken Lance', 'Dawn', 'Ninth Gate', 'White Hart', 'Iron Oath', 'Lantern', 'Last Bridge', 'Golden Spur', 'Ember', 'Thorn', 'Long Watch', 'Morning Star', 'Shield Wall'],
        names: ['the Order of the {Thing}', 'the Knights of the {Thing}', 'the Brotherhood of the {Thing}', 'the Sworn Company of the {Thing}', 'the Knights of {God}'],
        domains: ['war', 'light', 'life', 'tempest'],
        goals: [
            'Guard the road and every traveler on it, as they swore to three hundred years ago.',
            'Hunt down the last servant of an evil they defeated long ago.',
            'Recover the order\'s lost banner from the place where it fell.',
            'Win back the respect they lost after a battle nobody talks about.',
            'Rebuild the old fortress on the border and man it again.',
            'Serve {god}, by fire if necessary.',
            'Find a worthy heir for the Grand Master, who is very old.',
            'Wipe out {rival}, whom they swear is a front for something worse.'
        ],
        methods: [
            'Patrols, charges, and very loud oaths.',
            'Challenges to single combat.',
            'Trials by ordeal, which they win more often than is fair.',
            'Charity: they run hospitals and soup kitchens and remind everyone of it.',
            'Old law: the order may arrest anyone on the king\'s roads.',
            'Pressure on the nobility, whose younger children fill their ranks.'
        ],
        bases: [
            'a chapterhouse with a chapel, a training yard, and stables',
            'a fortress on the border with a long view and a short supply of food',
            'a commandery outside the walls with its own mill and fields',
            'a hall in the old castle, lent by the crown on terms the order hates',
            'a hospital on the pilgrim road, with knights for orderlies'
        ],
        resources: [
            'Warhorses and the knights to ride them.', 'A royal charter granting them the road.', 'Hospitals and the gratitude of the poor.',
            'Holy relics in the chapel, one of them real.', 'Lands given by grateful lords over the centuries.',
            'Squires from the best families.', 'A treasury kept by the chaplain and counted twice.', 'An armory of old enchanted blades.'
        ],
        secrets: [
            'The order\'s great victory was a massacre, and the records were burned.',
            'The Grand Master is under a curse that the order is hiding.',
            'The order is broke and has quietly borrowed from {rival}.',
            'Their holy relic is a fake; the real one was lost in battle.',
            'One of the knights is not a knight at all but a deserter wearing a dead man\'s armor.',
            'The order\'s founder made a deal with a fiend to win the first battle.',
            'The order is planning to seize power if the king dies without an heir.',
            'The Champion has never lost a duel because the duels are fixed.'
        ],
        now: [
            'Holding a tournament to find new knights.',
            'Riding out after a monster seen on the road.',
            'Arguing with the council over who keeps the peace.',
            'Investigating a knight accused of murder.',
            'Escorting pilgrims to a shrine of {god}.',
            'Mustering for a war nobody has declared yet.'
        ],
        wants: [
            'Scout a ruin where something has been killing patrols.',
            'Carry a challenge to {rival}\'s leader, and survive the reply.',
            'Find a missing knight who rode out alone a month ago.',
            'Recover the order\'s banner from the ruin where it fell.',
            'Act as witnesses at a trial by combat.',
            'Protect a pilgrim caravan on the road.'
        ],
        perks: ['a horse from the order\'s stables', 'healing at the order\'s hospital, free for life', 'a writ of passage on every road', 'a chance at knighthood'],
        join: ['Serve seven years as a squire.', 'Swear the oath and give everything you own to the order.', 'Win a place at the tournament.', 'Be sponsored by a knight and pass a vigil.'],
        rep: ['Heroes to most, prigs to the rest.', 'Respected by the poor, distrusted by the crown.', 'Living off their old glory, and everyone can tell.', 'Feared by bandits, which is the point.', 'Admired, as long as you don\'t owe them a tithe.'],
        mottos: ['Hold the Line.', 'For the Weak.', 'Unbroken.', 'Light in the Dark.', 'No Retreat, No Surrender.', 'We Ride at Dawn.'],
        symbols: ['a silver rose on a shield', 'a broken lance', 'a rising sun', 'a white hart', 'a tower and a sword', 'a gauntlet holding a flame', 'a golden spur', 'a key and a sword crossed'],
        tension: 'order'
    },

    temple: {
        label: 'Temple', icon: '⛪',
        about: 'The organized faith of one god: priests, tithes, charity, and politics.',
        members: [10, 70], treasury: [1000, 15000],
        leader: { cat: 'religious', title: ['High Priest', 'High Priestess', 'High Cleric'] },
        lieutenants: [
            ['Almoner', 'religious'], ['Inquisitor', 'religious'], ['Treasurer', 'merchant'], ['Captain of the Temple Guard', 'guard'],
            ['Oracle', 'magic'], ['Choirmaster', 'religious'], ['Novice Mistress', 'religious', 'old']
        ],
        names: ['the Temple of {God}', 'the Church of {God}', 'the Faithful of {God}', 'the House of {God}', 'the Servants of {God}'],
        domains: null,
        goals: [
            'Make {god} the first faith of {place}.',
            'Build a cathedral, whatever it costs, whoever pays.',
            'Root out {rival}, whom they call heretics.',
            'Find a relic of {god} lost in the old wars.',
            'Get the council to make the holy day a day of rest for everyone.',
            'Choose the next high priest, which has split the clergy down the middle.',
            'Bring back a saint, and they think they know how.',
            'Keep {place} fed through a bad winter, and be thanked for it.'
        ],
        methods: [
            'Charity, sermons, and a long memory for who gave nothing.',
            'Tithes, collected by priests with clipboards and guards.',
            'Healing, for a donation.',
            'The confession box, and what is heard there.',
            'Inquisitors who ask questions slowly and repeat them.',
            'Festivals so loud and generous that nobody remembers the tithe until later.'
        ],
        bases: [
            'a great temple on the main square with bells you can hear in the next village',
            'a hilltop shrine with a long stair the faithful climb on their knees',
            'an old stone church with a graveyard and a crypt',
            'a temple-hospital where the priests heal and preach in the same breath',
            'a cathedral still half-built after sixty years'
        ],
        resources: [
            'Tithes from the faithful.', 'Healers who can raise the nearly dead.', 'The ear of the common folk.',
            'Holy relics, and pilgrims who pay to see them.', 'A library of sacred texts and a few unholy ones.',
            'Temple guards in white and gold.', 'Land left to the temple in wills.', 'A choir that can drown out a riot.'
        ],
        secrets: [
            'The miracles are staged; the real healer is a hedge witch paid in the back room.',
            'The {Leader} has lost faith and is going through the motions.',
            'The temple sold its holy relic years ago and keeps a copy on the altar.',
            'The Inquisitor is protecting the cult the temple claims to hunt.',
            '{god} has spoken to a beggar outside the temple and not to the priests, and the priests know it.',
            'The temple is the largest moneylender in {place}, under another name.',
            'A crypt under the temple holds a prisoner no one is meant to remember.',
            'The temple pays {rival} to leave its pilgrims alone.'
        ],
        now: [
            'Preparing for the holy day of {god}.',
            'Hearing the case of a novice accused of witchcraft.',
            'Collecting for a new roof, loudly.',
            'Sending priests to a village where a sickness has broken out.',
            'Arguing with the council over the right to bury the dead.',
            'Hunting for the thief who stole the offering plate.'
        ],
        wants: [
            'Escort a holy relic to a shrine in another town.',
            'Clear the undead from the old cemetery.',
            'Find a priest who went into the catacombs and did not come out.',
            'Investigate a "miracle" in a nearby village before word spreads.',
            'Bring back proof that {rival} {rival:is|are} up to no good.',
            'Guard the temple on the night of the holy day.'
        ],
        perks: ['healing at a discount', 'a blessing of {god} before the next fight', 'a bed at any temple of {god}', 'holy water by the barrel'],
        join: ['Take vows and give up your name.', 'Serve a year as a novice scrubbing floors.', 'Tithe a tenth of everything, forever.', 'Be chosen by a sign from {god}.'],
        rep: ['Loved by the poor it feeds.', 'Respected and quietly feared.', 'Seen as rich, smug, and too close to the council.', 'Thought to be the only honest power left.', 'Old, slow, and impossible to ignore.'],
        mottos: ['Blessed Are the Patient.', 'In {God} We Endure.', 'Feed the Hungry.', 'The Light Remains.', 'Ask, and Be Answered.', 'Kneel and Rise.'],
        symbols: null,
        tension: 'temple'
    },

    circle: {
        label: "Mages' circle", icon: '🔮',
        about: 'A society of wizards that guards its knowledge and argues about everything else.',
        members: [6, 40], treasury: [2000, 18000],
        leader: { cat: 'magic', title: ['Archmage', 'Archmage', 'Archmage'] },
        lieutenants: [
            ['Keeper of the Vault', 'magic'], ['Proctor', 'magic'], ['Patron', 'noble'], ['Promising Apprentice', 'magic', 'young'],
            ['Librarian', 'magic', 'old'], ['Familiar-keeper', 'magic'], ['Doorkeeper', 'guard']
        ],
        adj: ['Azure', 'Starlit', 'Hermetic', 'Ninefold', 'Invisible', 'Silver', 'Hidden', 'Seventh', 'Crimson', 'Emerald'],
        things: ['Astral Key', 'Open Eye', 'Third Moon', 'Quiet Word', 'Tangled Thread', 'Burning Book', 'Glass Crown'],
        names: ['the {Adj} Circle', 'the {Adj} Conclave', 'the College of the {Thing}', 'the Society of the {Thing}', 'the {Adj} Tower', 'the Fellowship of the {Thing}'],
        goals: [
            'License every spellcaster in {place}, and fine the rest.',
            'Find the lost spellbook of their founder.',
            'Finish a great working that has been going for forty years.',
            'Keep dangerous magic out of the wrong hands, by their definition of wrong.',
            'Win a seat at court, so the next war is fought their way.',
            'Open a door to another plane, carefully this time.',
            'Prove the temple\'s miracles are only magic.',
            'Choose the next Archmage without anyone getting turned into a newt.'
        ],
        methods: [
            'Licenses, fees, and spellbooks seized for "safekeeping".',
            'Divination: they know what you will do before you do.',
            'Favors: a spell cast now, a debt collected later.',
            'Duels of magic, held under rules nobody else understands.',
            'Quiet fear. Nobody wants to annoy a wizard.',
            'Experiments, some of them on purpose.'
        ],
        bases: [
            'a tower that is larger on the inside',
            'a college with lecture halls, a library, and a scorch mark on every ceiling',
            'a townhouse whose front door opens onto different rooms on different days',
            'an observatory on the cliffs',
            'a sealed library under the university, entered through a painting'
        ],
        resources: [
            'A library of spellbooks.', 'Magic items, catalogued and locked away.', 'Seers who read the future for the court.',
            'Apprentices who do the dull work.', 'A summoned guardian bound to the tower.', 'Alchemical labs and the ingredients to stock them.',
            'Teleportation circles to other towers.', 'Debts owed by nobles who needed a spell in a hurry.'
        ],
        secrets: [
            'The founder never died; he is in the tower, kept alive, and not entirely human now.',
            'The great working will destroy {place} if it is finished, and the Archmage knows it.',
            'The circle\'s vault was robbed last year, and they have been faking the inventory since.',
            'The Promising Apprentice is a demon in disguise, and the Proctor suspects.',
            'The Archmage cannot cast a single spell anymore.',
            'The circle sells spells to {rival}.',
            'They caused the plague twenty years ago with an experiment gone wrong.',
            'Their seers have foreseen the circle\'s end, and nobody will say how.'
        ],
        now: [
            'Testing new apprentices, two of whom are missing.',
            'Hunting an unlicensed wizard who stole from the vault.',
            'Arguing about whether to help the town with a monster.',
            'Preparing a ritual for the next eclipse.',
            'Cataloguing a dead wizard\'s collection, and finding things that move.',
            'Spying on {rival} with a scrying pool.'
        ],
        wants: [
            'Recover a stolen spellbook before it is read.',
            'Gather a rare ingredient from somewhere unpleasant.',
            'Escort an apprentice to a far tower.',
            'Find what escaped from the lower vault.',
            'Test a new spell. On the party. Safely, they say.',
            'Explore a wizard\'s tomb the circle can\'t enter for legal reasons.'
        ],
        perks: ['a spell scroll', 'identification of any magic item the party finds', 'access to the library', 'a teleport home, once'],
        join: ['Pass the Proctor\'s exams.', 'Bring the circle a spell it does not have.', 'Be apprenticed to a member for seven years.', 'Pay a fee that would buy a house.'],
        rep: ['Respected, feared, and never invited to parties.', 'Thought to be meddling old fools.', 'Blamed for every strange thing that happens.', 'Trusted by the crown, hated by the temple.', 'Mostly forgotten, which suits them.'],
        mottos: ['Know, Dare, Be Silent.', 'Knowledge Is Its Own Reward.', 'The Unseen Turns the Seen.', 'Everything Has a Price.', 'Ask Twice.', 'Mind the Circle.'],
        symbols: ['an eye inside a triangle', 'a book with a star on the cover', 'a key made of light', 'a tower crowned with a crescent', 'an hourglass on its side', 'a spiral of three snakes', 'a candle with a blue flame', 'an owl holding a wand'],
        tension: 'circle'
    },

    company: {
        label: 'Mercenary company', icon: '⚔️',
        about: 'Swords for hire with a banner, a contract, and a captain who counts every coin.',
        members: [30, 200], treasury: [300, 5000],
        leader: { cat: 'adventurer', title: ['Captain', 'Captain', 'Captain'] },
        lieutenants: [
            ['Lieutenant', 'adventurer'], ['Paymaster', 'merchant'], ['Sergeant', 'guard'], ['Surgeon', 'religious'],
            ['Scout', 'adventurer'], ['Standard-bearer', 'adventurer', 'young'], ['Old Veteran', 'guard', 'old']
        ],
        adj: ['Iron', 'Red', 'Free', 'Lucky', 'Grey', 'Black', 'Brass', 'Hundred-Year', 'Laughing', 'Golden'],
        nouns: ['Company', 'Banners', 'Wolves', 'Lances', 'Crows', 'Boots', 'Blades', 'Hounds', 'Shields', 'Spears'],
        names: ['the {Adj} {Noun}', 'the {Adj} {Noun}', "{Leader}'s Free Company", "{Leader}'s Lot"],
        goals: [
            'Win a contract big enough to buy land and stop fighting.',
            'Get paid for the last war, which the crown has not.',
            'Avenge the old captain, killed by {rival}.',
            'Become the city\'s official guard and push out the watch.',
            'Take a fort, keep it, and call it a kingdom.',
            'Stay alive, stay paid, and stay out of politics.',
            'Find the gold they buried after the last war, which someone moved.',
            'Clear their name after a village burned while they were paid to protect it.'
        ],
        methods: [
            'Contracts, signed in triplicate and enforced in blood.',
            'Switching sides when the other side pays more.',
            'Intimidation: they march through town once a month to remind everyone.',
            'Discipline: they are the best-drilled force in {place}.',
            'Raids, called "collecting arrears".',
            'Loans to lords who need an army fast.'
        ],
        bases: [
            'a camp outside the walls that has slowly become a village',
            'a rented fort on the border',
            'the upstairs of a tavern, the stables, and most of the tavern',
            'a walled farm with a drill yard and a forge',
            'a ship, when they can afford one; a dock warehouse when they can\'t'
        ],
        resources: [
            'Trained soldiers and the gear to go with them.', 'Siege engines, in pieces, in a barn.', 'Contracts with three lords at once.',
            'Veterans who know every road and ford.', 'A war chest, kept in a cart that never leaves the paymaster\'s sight.',
            'Horses and wagons.', 'A reputation that wins fights before they start.', 'Old friends in every army that hired them.'
        ],
        secrets: [
            'The company is broke; the war chest is full of stones.',
            'The captain\'s famous victory was won by someone else.',
            'The company has a contract to kill a noble in {place}.',
            'They are secretly working for {rival}.',
            'The old captain is not dead; she is in a cell under the company\'s camp.',
            'They burned the village. Everyone in the company knows it.',
            'Half the company is planning a mutiny on the next payday.',
            'The Surgeon is a necromancer, and some of the soldiers have been dead for a while.'
        ],
        now: [
            'Between contracts and getting restless.',
            'Training new recruits in the market square.',
            'Negotiating with two sides of the same feud.',
            'Hunting a deserter who took the company\'s banner.',
            'Collecting "fees" from merchants on the road.',
            'Celebrating a victory the town would rather they had won elsewhere.'
        ],
        wants: [
            'Join the company for one battle at double pay.',
            'Find the deserter who took the banner.',
            'Carry the company\'s pay through bandit country.',
            'Spy on {rival} before the company signs a contract.',
            'Clear out a monster so the company can claim the fort.',
            'Collect a debt from a lord who refuses to pay.'
        ],
        perks: ['soldiers on loan for a day', 'arms and armor at cost', 'a place in the company whenever the party needs work', 'a horse from the remounts'],
        join: ['Sign the contract and survive the first battle.', 'Beat the sergeant in a fistfight.', 'Bring your own sword and your own boots.', 'Be vouched for by a veteran.'],
        rep: ['Useful, dangerous, and expensive.', 'Seen as thugs with a banner.', 'Respected as soldiers who keep their word.', 'Feared since the village burned.', 'Popular in taverns, unpopular everywhere else.'],
        mottos: ['Paid in Full.', 'No Pay, No Fight.', 'We Hold.', 'Coin and Courage.', 'Last to Leave.', 'Iron Pays Its Debts.'],
        symbols: ['a wolf\'s head', 'a red banner with a black boot', 'three crossed spears', 'a skull with a coin in its teeth', 'a horse on fire', 'a crow on a helmet', 'a mailed fist', 'a broken sword mended in gold'],
        tension: 'company'
    }
};

const FAC_TYPE_KEYS = Object.keys(FAC_TYPES);

// Pairs that tend to clash, and pairs that tend to work together (added to a base weight of 1).
const FAC_TENSION = {
    'cult|temple': 5, 'guild|thieves': 3, 'order|thieves': 4, 'cult|order': 4, 'circle|temple': 3, 'house|house': 4,
    'guild|house': 2, 'company|house': 2, 'circle|cult': 2, 'guild|guild': 3, 'company|order': 2, 'thieves|thieves': 4,
    'temple|temple': 4, 'company|company': 3, 'circle|circle': 3, 'cult|cult': 2, 'order|order': 2
};
const FAC_AFFINITY = {
    'house|order': 3, 'house|temple': 2, 'guild|house': 1, 'company|thieves': 2, 'circle|house': 2, 'order|temple': 3,
    'company|guild': 1, 'cult|house': 1, 'guild|thieves': 1, 'company|house': 1, 'circle|guild': 1, 'guild|temple': 1
};

const FAC_COLORS = ['crimson', 'gold', 'black', 'white', 'silver', 'deep blue', 'forest green', 'purple', 'grey', 'orange', 'brown', 'sky blue', 'bone white', 'copper', 'scarlet', 'teal'];

const FAC_INFLUENCE = ['A minor player', 'Known in some streets', 'A real power', 'One of the great powers', 'The power behind everything'];

const FAC_LEADER_STYLES = [
    'Rules by fear and remembers every slight.',
    'Rules by charm; everyone thinks they are the favorite.',
    'Rules by the book and has written most of the book.',
    'Rarely seen; orders come by letter.',
    'Leads from the front and has the scars to show it.',
    'Old, tired, and looking for someone to hand it all to.',
    'New to the job and trying too hard.',
    'Clever, patient, and three moves ahead.',
    'Generous to friends and ruinous to enemies.',
    'Believes every word of the cause, which makes them dangerous.',
    'Holds on through debts and favors nobody else understands.',
    'Is beloved by the rank and file and despised by the lieutenants.'
];

const FAC_MOTIVES = [
    'Wants {leader}\'s seat and is patient about it.',
    'Loyal to {leader} past the point of sense.',
    'Is quietly selling the group\'s secrets to {rival}.',
    'Joined to find out who killed a sibling, and suspects someone inside.',
    'Owes a great deal of money to {rival}.',
    'Is the only one who knows where the money really goes.',
    'Is in love with {leader}, who has not noticed.',
    'Thinks the group has lost its way and keeps a list of who agrees.',
    'Is the real brains; {leader} is the face.',
    'Wants out, but knows too much to be allowed to leave.',
    'Is new, eager, and about to make a terrible mistake.',
    'Reports everything to the authorities in exchange for a pardon.',
    'Is being blackmailed by someone they can\'t name.',
    'Is the only one the rank and file actually like.',
    'Has a family to feed and does what is asked, no more.',
    'Is secretly a member of {rival} too.'
];

const FAC_RIVAL_WHY = [
    '{a} {a:blames|blame} {b} for a fire that burned down their old hall.',
    '{a} and {b} both claim the same piece of {place}, and neither has the paperwork.',
    'A member of {b} killed a member of {a} in a duel; neither side accepts the verdict.',
    '{b} {b:owes|owe} {a} a great deal of money and {b:has|have} decided not to pay it.',
    '{a} {a:wants|want} something {b} {b:keeps|keep} locked away.',
    'They were one group once, and split over who should lead.',
    '{a} {a:thinks|think} {b} {b:is|are} behind the recent disappearances.',
    'They are courting the same patron, and only one will win.',
    'Each has a spy in the other, and both know it.',
    '{b} took a contract that {a} {a:believes|believe} was theirs.',
    'An old insult at a feast, which neither side will say out loud.',
    'Their leaders were once close friends, which made it worse.'
];
const FAC_RIVAL_HEAT = [
    'It\'s a cold war: smiles in public, knives in private.',
    'It spills into the streets every few weeks.',
    'It is fought with lawsuits and letters.',
    'There is a truce, and nobody trusts it.',
    'Blood has been spilled this year, and more is coming.',
    'It is mostly gossip, for now.'
];
const FAC_ALLY_WHY = [
    'A marriage between their leaders\' families ties them together.',
    '{a} {a:hides|hide} money for {b}, and {a:keeps|keep} a small cut.',
    'An old debt of honor neither has forgotten.',
    '{a} {a:supplies|supply} {b} with what {b:it needs|they need}, at a discount.',
    'They fought side by side once and have not forgotten it.',
    'Their leaders meet in secret every new moon.',
    'Pure convenience; either would sell the other out for the right price.',
    '{b} {b:owes|owe} {a} a favor, and {a} {a:hasn\'t|haven\'t} called it in yet.',
    'They share an enemy, and that is enough.',
    'A member of {a} saved the life of {b}\'s leader.'
];

// ── Helpers ──────────────────────────────────────────────
function facPick(list) {
    return list[Math.floor(rand() * list.length)];
}

function facWeighted(pairs) {
    const total = pairs.reduce((s, p) => s + p[1], 0);
    let r = rand() * total;
    for (const p of pairs) { if ((r -= p[1]) < 0) return p[0]; }
    return pairs[pairs.length - 1][0];
}

function facShuffle(list) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function facCap(s) {
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function facPairKey(a, b) {
    return [a, b].sort().join('|');
}

// The NPC page's way of rolling an NPC from one seed, so a link opens the same person.
function facNpc(seed, cat, age) {
    const opts = { professionType: cat, age: age || 'random' };
    const seeds = Object.fromEntries(NPC_PARTS.map(part => [part, deriveSeed(seed, part)]));
    return { seed, cat, age: age || null, npc: rollNPC(opts, seeds) };
}

// ── One faction ──────────────────────────────────────────
// prev: the factions rolled before this one (for names and crafts that mustn't repeat).
function facRollFaction(seed, i, type, prev) {
    const t = FAC_TYPES[type];
    const f = { i, type };
    const sub = label => deriveSeed(seed, `faction.${i}.${type}.${label}`);

    f.leader = facNpc(sub('leader'), t.leader.cat);
    f.leader.title = genderedTitle(t.leader.title, f.leader.npc.gender);
    f.leader.style = facPick(FAC_LEADER_STYLES);
    const lts = facShuffle(t.lieutenants).slice(0, 2 + (rand() < 0.5 ? 1 : 0));
    f.lieutenants = lts.map(([role, cat, age], k) => ({ ...facNpc(sub('lt.' + k), cat, age), role, motive: facPick(FAC_MOTIVES) }));

    // The god a temple, order, cult, or house follows: domains it prefers, and a draw to pick one.
    const wantsGod = { temple: 1, order: 1, cult: 0.6, house: 0.3 }[type] || 0;
    const godRoll = rand(), godPick = rand(), godTitle = rand(), outer = facPick(t.outer || ['']);
    if (godRoll < wantsGod) {
        const doms = t.domains || PAN_DOMAIN_KEYS;
        f.deity = { domains: doms, pick: godPick, title: godTitle };
    } else if (type === 'cult') {
        f.deity = { outer };
    } else {
        f.deity = null;
    }

    if (type === 'guild') {
        const taken = new Set(prev.filter(p => p.craft).map(p => p.craft[0]));
        const crafts = t.crafts.filter(c => !taken.has(c[0]));
        f.craft = facPick(crafts.length ? crafts : t.crafts);
    }

    const takenNames = new Set(prev.map(p => p.nameRaw));
    for (let tries = 0; tries < 12; tries++) {
        f.nameRaw = facPick(t.names)
            .replace('{Adj}', () => facPick(t.adj || ['Old']))
            .replace('{Noun}', () => facPick(t.nouns || ['Company']))
            .replace('{Thing}', () => facPick(t.things || ['Dawn']));
        if (type === 'house') {
            const npc = f.leader.npc;
            // An epithet ("the Loud") isn't a family name: the house is named for its head instead.
            f.nameRaw = /^the /.test(npc.surname || '') ? `the House of ${npc.firstName} ${npc.surname}`
                : npc.race === 'dragonborn' && npc.surname ? `Clan ${npc.surname}` : `House ${npc.surname || facPick(t.fallback)}`;
        }
        if (!takenNames.has(f.nameRaw)) break;
    }

    f.goal = facPick(t.goals);
    f.method = facPick(t.methods);
    f.base = facPick(t.bases);
    f.resources = facShuffle(t.resources).slice(0, 2);
    f.secret = facPick(t.secrets);
    f.now = facPick(t.now);
    f.want = facPick(t.wants);
    f.perk = facPick(t.perks);
    f.reward = facWeighted([[50, 3], [100, 4], [250, 3], [500, 2], [1000, 1]]);
    f.join = facPick(t.join);
    f.rep = facPick(t.rep);
    f.motto = facPick(t.mottos);
    const colors = facShuffle(FAC_COLORS);
    f.colors = [colors[0], colors[1]];
    f.symbol = t.symbols ? facPick(t.symbols) : null;
    f.symbolDraw = rand();
    f.influence = facWeighted([[0, 2], [1, 3], [2, 4], [3, 2], [4, 1]]);
    // Numbers are drawn as fractions; the scale turns them into members and coin.
    f.memberRoll = rand();
    f.treasuryRoll = rand() * rand();
    return f;
}

// ── Allies and rivals ────────────────────────────────────
function facTies(factions) {
    const n = factions.length;
    const rivals = [], allies = [];
    const tied = new Set();
    const count = Array(n).fill(0);
    const allyCount = Array(n).fill(0);
    const key = (a, b) => Math.min(a, b) + '-' + Math.max(a, b);
    // Every faction gets a rival; nobody gets more than two.
    facShuffle(factions.map(f => f.i)).forEach(a => {
        if (count[a] > 0) return;
        const options = factions.filter(f => f.i !== a && count[f.i] < 2 && !tied.has(key(a, f.i)))
            .map(f => [f.i, 1 + (FAC_TENSION[facPairKey(factions[a].type, f.type)] || 0)]);
        if (!options.length) return;
        const b = facWeighted(options);
        tied.add(key(a, b));
        count[a]++; count[b]++;
        rivals.push({ a, b, why: facPick(FAC_RIVAL_WHY), heat: facPick(FAC_RIVAL_HEAT) });
    });
    // About half as many alliances as factions, between factions that aren't rivals.
    const want = Math.max(1, Math.floor(n / 2));
    for (let k = 0; k < want; k++) {
        const pairs = [];
        for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) {
            if (tied.has(key(a, b)) || allyCount[a] >= 2 || allyCount[b] >= 2) continue;
            pairs.push([[a, b], 1 + (FAC_AFFINITY[facPairKey(factions[a].type, factions[b].type)] || 0)]);
        }
        if (!pairs.length) break;
        const [a0, b0] = facWeighted(pairs);
        const [a, b] = rand() < 0.5 ? [a0, b0] : [b0, a0];
        tied.add(key(a, b));
        allyCount[a]++; allyCount[b]++;
        allies.push({ a, b, why: facPick(FAC_ALLY_WHY) });
    }
    return { rivals, allies };
}

// ── The roll ─────────────────────────────────────────────
// opts: { count: 'random'|few|full|many, focus: 'random'|type, scale: 'random'|town|city|kingdom }
function rollFactions(seed, opts = {}) {
    const part = (label, fn) => withSeed(deriveSeed(seed, label), fn);
    const count = FAC_COUNTS[opts.count] ? opts.count : part('count', () => facWeighted([['full', 5], ['few', 3], ['many', 2]]));
    const focus = FAC_TYPES[opts.focus] ? opts.focus : null;
    const scale = FAC_SCALES[opts.scale] ? opts.scale : part('scale', () => facWeighted([['city', 5], ['town', 3], ['kingdom', 2]]));
    const c = FAC_COUNTS[count];
    const n = part('n.' + count, () => c.min + Math.floor(rand() * (c.max - c.min + 1)));

    // The order of types: two shuffled decks, so every type shows up before any repeats.
    const order = part('types', () => facShuffle(FAC_TYPE_KEYS).concat(facShuffle(FAC_TYPE_KEYS)));
    if (focus && order[0] !== focus) {
        // The focus goes first; its first later slot (if any) takes the type it pushed out.
        const at = order.indexOf(focus, 1);
        if (at > 0 && at < n) order[at] = order[0];
        order[0] = focus;
    }

    const factions = [];
    for (let i = 0; i < n; i++) factions.push(part(`faction.${i}.${order[i]}`, () => facRollFaction(seed, i, order[i], factions)));
    const s = FAC_SCALES[scale];
    factions.forEach(f => {
        const t = FAC_TYPES[f.type];
        const members = (t.members[0] + f.memberRoll * (t.members[1] - t.members[0])) * s.members;
        f.members = Math.max(3, members >= 100 ? Math.round(members / 10) * 10 : Math.round(members));
        f.treasury = Math.max(10, Math.round((t.treasury[0] + f.treasuryRoll * (t.treasury[1] - t.treasury[0])) * s.treasury / 10) * 10);
    });
    const w = { seed, count, focus: focus || 'random', scale, factions };
    Object.assign(w, part(`ties.${n}.` + order.slice(0, n).join('.'), () => facTies(factions)));
    return w;
}

// ── Gods ─────────────────────────────────────────────────
// The god a faction follows: { name, full, linked, god? } or null. pantheon: a rollPantheon() result or null.
function facDeity(f, pantheon) {
    const d = f.deity;
    if (!d) return null;
    if (d.outer) return { name: d.outer, full: d.outer, outer: true };
    if (pantheon && pantheon.gods.length) {
        const fits = pantheon.gods.filter(g => d.domains.includes(g.domain) || (g.domain2 && d.domains.includes(g.domain2)));
        const pool = fits.length ? fits : pantheon.gods;
        const god = pool[Math.floor(d.pick * pool.length)];
        return { name: god.name, full: `${god.name}, ${god.epithet}`, linked: true, god, index: pantheon.gods.indexOf(god) };
    }
    const domain = d.domains[Math.floor(d.pick * d.domains.length)];
    const titles = PAN_TITLES[domain];
    const name = titles[Math.floor(d.title * titles.length)];
    const port = PAN_DOMAINS[domain].portfolio;
    return { name, full: `${name}, a god of ${port[Math.floor(d.title * port.length)]}`, linked: false, domain };
}

// ── Text ─────────────────────────────────────────────────
// ctx: { w, pantheon } — the roll and the linked pantheon (or null).
function facRivalsOf(w, i) {
    return w.rivals.filter(r => r.a === i || r.b === i).map(r => r.a === i ? r.b : r.a);
}

function facAlliesOf(w, i) {
    return w.allies.filter(r => r.a === i || r.b === i).map(r => r.a === i ? r.b : r.a);
}

function facName(w, i, ctx) {
    const f = w.factions[i];
    const god = facDeity(f, ctx && ctx.pantheon);
    return f.nameRaw
        .replace('{Crafters}', f.craft ? f.craft[0] : 'Crafters')
        .replace('{God}', god && !god.outer ? god.name : 'the Nameless')
        .replace('{Leader}', f.leader.npc.firstName);
}

// Whether a faction name takes a plural verb: "the Grey Moths think", "the Order of the Dawn thinks".
// The head noun is the last word before any " of ".
function facIsPlural(name) {
    const head = name.replace(/^the /i, '').split(' of ')[0];
    if (/^(House|Clan) /.test(head)) return false;
    if (/^Those /.test(head)) return true;
    return /([^s]s|men|^Children|Kin|Faithful)$/.test(head);
}

// Pick {key:singular|plural} by the name standing in for {key}.
function facAgree(text, key, name) {
    const plural = facIsPlural(name);
    return text.replace(new RegExp(`\\{${key}:([^|}]*)\\|([^}]*)\\}`, 'g'), (m, one, many) => plural ? many : one);
}

// Fill a table line: {place}, {thing}, {god}, {rival}, {leader}, {Leader} (the leader's title).
function facFill(text, w, i, ctx) {
    const f = w.factions[i];
    const god = facDeity(f, ctx && ctx.pantheon);
    const rivals = facRivalsOf(w, i);
    const rival = rivals.length ? facName(w, rivals[0], ctx) : 'their rivals';
    return facAgree(text, 'rival', rival)
        .replace(/\{place\}/g, FAC_SCALES[w.scale].place)
        .replace(/\{thing\}/g, f.craft ? f.craft[1] : 'their trade')
        .replace(/\{god\}/g, god ? god.name : 'their god')
        .replace(/\{God\}/g, god && !god.outer ? god.name : 'the Nameless')
        .replace(/\{rival\}/g, rival)
        .replace(/\{leader\}/g, f.leader.npc.firstName)
        .replace(/\{Leader\}/g, f.leader.title);
}

function facSymbolText(f, ctx) {
    if (f.symbol) return `${f.symbol}, ${f.colors[0]} on ${f.colors[1]}`;
    // A temple shows its god's holy symbol when there is one.
    const god = facDeity(f, ctx && ctx.pantheon);
    if (god && god.god && typeof panSymbolText === 'function') return panSymbolText(god.god) + ` (the holy symbol of ${god.name})`;
    const objs = ['a sunburst', 'an open hand', 'a circle of seven stars', 'a flame in a bowl', 'a tree with deep roots', 'a closed eye', 'a crescent and a star', 'a bell'];
    return `${objs[Math.floor(f.symbolDraw * objs.length)]}, ${f.colors[0]} on ${f.colors[1]}`;
}

function facPersonLine(p) {
    const n = p.npc;
    return `${n.name}, ${n.race} ${n.profession.toLowerCase()}, aged ${parseInt(n.age, 10)}`;
}

// The faction's facts as [label, text] pairs (the page, Copy, and print all use these).
function facLines(w, i, ctx) {
    const f = w.factions[i];
    const t = FAC_TYPES[f.type];
    const fill = s => facCap(facFill(s, w, i, ctx));
    const god = facDeity(f, ctx && ctx.pantheon);
    const rivals = facRivalsOf(w, i).map(k => facName(w, k, ctx));
    const allies = facAlliesOf(w, i).map(k => facName(w, k, ctx));
    const list = items => items.length < 2 ? items.join('') : items.slice(0, -1).join(', ') + (items.length > 2 ? ',' : '') + ' and ' + items[items.length - 1];
    const lines = [
        ['What they are', `${t.label}. ${t.about}`],
        ['Influence', `${FAC_INFLUENCE[f.influence]} in ${FAC_SCALES[w.scale].place}.`],
        ['Goal', fill(f.goal)],
        ['Method', fill(f.method)],
        ['Right now', fill(f.now)]
    ];
    if (god) {
        const verb = { temple: 'Worships', order: 'Sworn to', cult: 'Worships', house: 'Keeps a chapel to' }[f.type];
        lines.push(['God', god.outer ? `${verb} ${god.full}.` : f.type === 'cult'
            ? `${verb} ${god.full}, or a version of them the temples would not recognize.`
            : `${verb} ${god.full}.`]);
    }
    lines.push(
        ['Leader', `${f.leader.title} ${facPersonLine(f.leader)}. ${f.leader.style}`],
        ['Base', facCap(fill(f.base)) + '.'],
        ['Symbol', facCap(facSymbolText(f, ctx)) + `. Motto: "${fill(f.motto)}"`],
        ['Numbers', `About ${f.members.toLocaleString('en-US')} members. Treasury: ${formatCoins(f.treasury)}.`],
        ['Resources', f.resources.map(fill).join(' ')],
        ['Reputation', fill(f.rep)],
        ['Friends and foes', [allies.length ? `Allied with ${list(allies)}` : '', rivals.length ? `at odds with ${list(rivals)}` : ''].filter(Boolean).join('; ').replace(/^at/, 'At') + '.'],
        ['To join', fill(f.join)],
        ['For the party', `${fill(f.want)} Reward: ${formatCoins(f.reward)} and ${fill(f.perk)}.`],
        ['Secret', fill(f.secret)]
    );
    if (!allies.length && !rivals.length) lines.splice(lines.findIndex(l => l[0] === 'Friends and foes'), 1);
    return lines;
}

function facLieutenantLines(w, i, ctx) {
    const f = w.factions[i];
    return f.lieutenants.map(l => [l.role, `${facPersonLine(l)}. ${facCap(facFill(l.motive, w, i, ctx))}`]);
}

function facTieText(w, t, ctx, kind) {
    const a = facName(w, t.a, ctx), b = facName(w, t.b, ctx);
    const why = facAgree(facAgree(t.why, 'a', a), 'b', b).replace(/\{a\}/g, a).replace(/\{b\}/g, b).replace(/\{place\}/g, FAC_SCALES[w.scale].place);
    return kind === 'rival' ? `${facCap(why)} ${t.heat}` : facCap(why);
}

function facSummary(w, ctx) {
    const s = FAC_SCALES[w.scale];
    const top = w.factions.reduce((best, f) => f.influence > best.influence ? f : best, w.factions[0]);
    return `${w.factions.length} factions in ${s.place}. The strongest: ${facName(w, top.i, ctx)}.`;
}

function factionsText(w, ctx) {
    const out = [`Factions of ${FAC_SCALES[w.scale].place}`, facSummary(w, ctx), ''];
    w.factions.forEach((f, i) => {
        out.push(`${FAC_TYPES[f.type].icon} ${facCap(facName(w, i, ctx))}`);
        facLines(w, i, ctx).forEach(([k, v]) => out.push(`  ${k}: ${v}`));
        facLieutenantLines(w, i, ctx).forEach(([k, v]) => out.push(`  ${k}: ${v}`));
        out.push('');
    });
    if (w.rivals.length) {
        out.push('Rivalries:');
        w.rivals.forEach(r => out.push(`- ${facCap(facName(w, r.a, ctx))} and ${facName(w, r.b, ctx)}: ${facTieText(w, r, ctx, 'rival')}`));
    }
    if (w.allies.length) {
        out.push('Alliances:');
        w.allies.forEach(r => out.push(`- ${facCap(facName(w, r.a, ctx))} and ${facName(w, r.b, ctx)}: ${facTieText(w, r, ctx, 'ally')}`));
    }
    return out.join('\n').trim();
}
