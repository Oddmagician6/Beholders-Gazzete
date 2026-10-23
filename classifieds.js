/* ============================================
   CLASSIFIEDS (F70)
   A fixed deck of newspaper ads, dealt by the date: every reader gets the same ads
   on the same day, and each kind runs through its whole deck before one repeats.
   Invented businesses only, never a real brand, even renamed.
   A display ad with `shop` opens the Shop generator on a fixed seed, under the ad's sign.
   Needs rng.js (withSeed, hashString). Page-free, so F71 and F72 can deal ads too.
   ============================================ */

// art: the kind's woodcut, img/woodcut/<art>.webp
const CLASSIFIED_KINDS = {
    hire:    { label: 'For Hire',      icon: '⚔️', art: 'ad-for-hire' },
    wanted:  { label: 'Wanted',        icon: '📜', art: 'ad-wanted' },
    sale:    { label: 'For Sale',      icon: '🪙', art: 'ad-for-sale' },
    lost:    { label: 'Lost & Found',  icon: '🔍', art: 'ad-lost' },
    display: { label: 'Advertisement', icon: '📯', art: 'ad-display' }
};

// k: kind · h: headline · t: text · by: the sign-off (small ads)
// shop: { type, wealth } for a business with a storefront (the ad's headline is its sign)
const CLASSIFIEDS = [
    // ── For Hire ──
    { k: 'hire', h: 'Experienced Torchbearer', t: 'Eleven dungeons, zero fires I started. Bring my own torches. Will not go first.', by: 'Ask for Pell at the Drowned Rat' },
    { k: 'hire', h: 'Bard, Lightly Used', t: 'Knows four songs and one of them is good. Inspiration guaranteed or your silence back.', by: 'Leave a note under the third stool' },
    { k: 'hire', h: 'Retired Adventurer Seeks Quiet Work', t: 'No caves. No tombs. No "just one more room." Good with ledgers and very good with doors.', by: 'Write to Box 14, the Gazette' },
    { k: 'hire', h: 'Mimic Inspector', t: 'Chests, wardrobes, suspicious stairs. I poke it with a long stick so you do not have to. Stick included.', by: 'Bartholomew, Tanner Lane' },
    { k: 'hire', h: 'Henchman, Moderately Loyal', t: 'Will hold the rope, carry the loot, and say "aye" on cue. Hazard pay negotiable. Betrayal extra.', by: 'Ask at the docks for Two-Boots' },
    { k: 'hire', h: 'Tutoring in Common, Elvish, and Goblin', t: 'Learn to order ale, ask directions, and apologize in three tongues. Goblin lessons held outdoors.', by: 'Mistress Ondry, by the well' },
    { k: 'hire', h: 'Rat Catcher, Giant Rats a Specialty', t: 'Small rats half price. Swarms by quote. I do not handle anything that talks back.', by: 'Look for the cart with the cat on it' },
    { k: 'hire', h: 'Map Drawn From Your Description', t: 'You tell me where you went, I draw it nicely. Accuracy depends on your memory, not my pen.', by: 'Ferrin the Cartographer, upstairs' },
    { k: 'hire', h: 'Professional Mourner', t: 'Weeping, wailing, and a moving eulogy for a hero I never met. Discount if they come back.', by: 'Sister Ama, behind the chapel' },
    { k: 'hire', h: 'Hireling Available, Has Own Ten-Foot Pole', t: 'The pole is the main draw. I come with it. We are a set.', by: 'Grub, at the gate most mornings' },
    { k: 'hire', h: 'Cleric for Small Parties', t: 'Healing word, bless, and a firm talking-to. No resurrections on credit. No exceptions, Gerald.', by: 'Brother Tamsin, east shrine' },
    { k: 'hire', h: 'Night Watch, Two Eyes Open', t: 'Darkvision, light sleeper, loud voice. I will wake you for owlbears and not for owls.', by: 'Inquire with the half-orc by the stables' },
    { k: 'hire', h: 'Familiar Sitting', t: 'Cats, toads, owls, and one imp at a time. Your familiar is fed, walked, and kept out of trouble.', by: 'Wren, the house with the birdbaths' },
    { k: 'hire', h: 'Haggler for Hire', t: 'Shopkeepers fear me. I take a tenth of what I save you, so it is in my interest to be cruel.', by: 'Ask for "Discount" Dovi at the market' },
    { k: 'hire', h: 'Trap Tester', t: 'I step on the tiles you are unsure about. Rates go up with each tile. My knees are not what they were.', by: 'Halvard, Old Mill Road' },
    { k: 'hire', h: 'Dragon Negotiator (Junior)', t: 'Small dragons only for now. Have talked a wyrmling out of a sheep twice. References singed but legible.', by: 'Box 22, the Gazette' },
    { k: 'hire', h: 'Scribe Will Write Your Will', t: 'Going into a dungeon this week? Leave the boots to someone who deserves them. Wax seal included.', by: 'Oswin at Inkwell & Seal' },
    { k: 'hire', h: 'Muscle, Polite', t: 'Big enough to stand in a doorway, nice enough to apologize while doing it. Debt collection by the hour.', by: 'Big Hollen, the Iron Pot' },
    { k: 'hire', h: 'Druid Will Talk to Your Garden', t: 'Find out what your turnips want. Usually rain. Sometimes revenge on the slugs.', by: 'Find me in the hedge. I am the hedge.' },
    { k: 'hire', h: 'Lantern Lit, Dungeon Lit', t: 'Continual flame cast on lanterns, swords, and hats. Hat customers sign a waiver.', by: 'Apprentice Mirel, the Seventh Sigil' },

    // ── Wanted ──
    { k: 'wanted', h: 'Brave Souls for Short Errand', t: 'Fetch a ring from my late uncle\'s crypt. He is mostly late. Pay in gold and gratitude.', by: 'Lord Pembry, the manor on the hill' },
    { k: 'wanted', h: 'Someone to Return a Library Book', t: 'Overdue forty years. The librarian is a lich and remembers. I would rather not go myself.', by: 'Anonymous, Box 7' },
    { k: 'wanted', h: 'Goats, Any Condition', t: 'For a reason I am not prepared to explain in print. Paying 3 sp a goat, 5 sp if it has a name.', by: 'The tower with no door' },
    { k: 'wanted', h: 'Roommate', t: 'Quiet tower room, good light, shared alchemy bench. Must not mind the occasional small explosion.', by: 'Tilda, the round house with scorch marks' },
    { k: 'wanted', h: 'Information on the Red Lantern Gang', t: 'They took my cart, my horse, and my good hat. I can live without the cart and the horse.', by: 'Cobb, the Wayfarer\'s Rest' },
    { k: 'wanted', h: 'A Wizard Who Can Undo This', t: 'You will know it when you see it. Please come quickly. Please knock gently.', by: 'The baker on Fen Street' },
    { k: 'wanted', h: 'Escort Through the Bramblewood', t: 'Merchant with two wagons of pickles needs four swords. The pickles are not cursed. Probably.', by: 'Ask at the caravan yard' },
    { k: 'wanted', h: 'Choir Members', t: 'All voices welcome. Undead voices welcome too, but please rehearse in the cellar.', by: 'The Temple of the Ever-Open Door' },
    { k: 'wanted', h: 'Spare Owlbear Feathers', t: 'For a pillow. A very brave pillow. Will pay by the handful, more for the fluffy ones.', by: 'Nell the Upholsterer' },
    { k: 'wanted', h: 'Dungeon, Gently Used', t: 'Young necromancer seeks starter dungeon. Two to three rooms, good drainage, no existing tenants.', by: 'Box 31, the Gazette' },
    { k: 'wanted', h: 'Witness to the Bridge Incident', t: 'Did you see what happened to the troll? The troll would like to know. The troll is not angry.', by: 'The troll, under the bridge' },
    { k: 'wanted', h: 'Someone to Feed the Basilisk', t: 'One week, while I am away. Food left out. Do not make eye contact. Mirrors in the hall are for you.', by: 'Mistress Varn, the house with all the statues' },
    { k: 'wanted', h: 'Dice, Lucky Only', t: 'My last set rolled ones at every wedding I attended. Will trade for unlucky dice, slightly used.', by: 'A gambler who would rather not say' },
    { k: 'wanted', h: 'Heir', t: 'Elderly baron seeks heir. Must be related, or good at pretending. Castle comes with a ghost and a moat.', by: 'The steward, Castle Morrow' },
    { k: 'wanted', h: 'Quiet Neighbors', t: 'The last three were adventurers. Two left, one exploded. Seeking a nice potter, or a monk.', by: 'Widow Hale, Lark Street' },
    { k: 'wanted', h: 'A Second Opinion on My Prophecy', t: 'My seer says I will "fall with the leaves." I am a gardener. Is this good or bad?', by: 'Box 9, the Gazette' },
    { k: 'wanted', h: 'Barrels, Empty', t: 'I had full ones. That was the problem. Looking for empty barrels to make a raft out of. Long story.', by: 'Jory, on the riverbank' },
    { k: 'wanted', h: 'Volunteer for Potion Testing', t: 'Mostly harmless. The last tester can now see sounds and says it is lovely. 2 gp a sip.', by: 'Bubble & Fume Apothecary' },
    { k: 'wanted', h: 'Missing Bridge', t: 'The bridge over Cold Creek is gone. Not broken. Gone. If you have it, please put it back.', by: 'The village council of Lowmere' },
    { k: 'wanted', h: 'Pen Pal', t: 'Lonely lighthouse keeper seeks correspondence. Will reply by gull. Gull may eat letter.', by: 'The lighthouse, Gull Point' },

    // ── For Sale ──
    { k: 'sale', h: 'Bag of Holding (Holds One Thing)', t: 'It holds one thing. I do not know what. It will not come out. 40 gp or best offer.', by: 'Pim, the cart by the fountain' },
    { k: 'sale', h: 'Wedding Dress, Never Worn', t: 'Groom turned out to be a doppelganger. So did the second groom. Fits a medium humanoid.', by: 'Box 18, the Gazette' },
    { k: 'sale', h: 'Haunted Armoire', t: 'Solid oak, lovely carving, sobs on Tuesdays. Free delivery. Please take it away.', by: 'Mrs. Bellweather, Rose Court' },
    { k: 'sale', h: 'Horse, Opinionated', t: 'Healthy mare, eight years old, will only go left. Good for circular journeys.', by: 'Hoof & Halter Livery' },
    { k: 'sale', h: 'Ten-Foot Pole, Nine Feet', t: 'Lost a foot to a gelatinous cube. Still pokes. Priced to reflect the missing foot.', by: 'Grub, at the gate' },
    { k: 'sale', h: 'Map to Buried Treasure', t: 'Selling because I have not the time to dig. Definitely not because I already dug there.', by: 'Captain Ross, the docks' },
    { k: 'sale', h: 'Cottage, One Owner', t: 'Two rooms, thatched roof, garden, well. Witch\'s gingerbread trim, mostly removed. Very low price.', by: 'Ask at the Glade Road inn' },
    { k: 'sale', h: 'Spellbook, Lightly Annotated', t: 'Every margin full of doodles of the previous owner\'s cat. Spells still work. Cat drawings excellent.', by: 'The Seventh Sigil, back table' },
    { k: 'sale', h: 'Chainmail, Barely Rusted', t: 'Was in a lake for a short time. Some fish still living in the sleeves. They come with it.', by: 'The Honest Anvil' },
    { k: 'sale', h: 'Goat Cart', t: 'Cart only. Goat sold separately. Goat strongly prefers to be sold separately.', by: 'Farmer Dunn, past the mill' },
    { k: 'sale', h: 'Crown, Slightly Cursed', t: 'Gold, five rubies, whispers advice. Advice not good. 300 gp firm, which the crown says is too low.', by: 'Box 40, the Gazette' },
    { k: 'sale', h: 'Dice Collection', t: 'Two hundred dice. Owner retired after a natural one on a very important day. Will not discuss it.', by: 'Box 2, the Gazette' },
    { k: 'sale', h: 'Signed Copy of a Bard\'s Memoir', t: '"My Life in Song, Volume Three." Signed, smudged, and only lightly cried on. A collector\'s item, says the bard.', by: 'The bard, at most taverns' },
    { k: 'sale', h: 'Cauldron, Witch-Grade', t: 'Cast iron, holds twenty gallons, one small hole the shape of a newt. Easily patched.', by: 'The cottage at the end of the path' },
    { k: 'sale', h: 'Boat, Floats Most Days', t: 'Rowboat, oars included, bailing bucket included and you will need it. Good for short trips.', by: 'Saltrope Chandlery' },
    { k: 'sale', h: 'Portrait of a Lord', t: 'Oil on canvas. The eyes follow you. So does the rest of him, at night. Frame worth the price alone.', by: 'Oddments & Ends' },
    { k: 'sale', h: 'Fireworks, Gnomish', t: 'Bright, loud, and only a little unpredictable. Do not light indoors, near hay, or near gnomes.', by: 'Cogwhistle Repairs' },
    { k: 'sale', h: 'Saddle for a Griffon', t: 'I do not have a griffon anymore. The griffon has me, in a way. Saddle in good order.', by: 'Box 26, the Gazette' },
    { k: 'sale', h: 'Half a Treasure Map', t: 'The half with the X. You will need the other half to know where the X is. Good luck.', by: 'A man named Sev, the Crooked Mast' },
    { k: 'sale', h: 'Lute, Out of Tune With Reality', t: 'Plays notes that do not exist. Listeners report hearing colors. Strings new.', by: 'The bard\'s former roommate' },

    // ── Lost & Found ──
    { k: 'lost', h: 'Lost: One Cat, Invisible', t: 'Answers to Smudge. Last heard near the bakery. If you trip over nothing, that may be him.', by: 'Reward offered, ask for Lena' },
    { k: 'lost', h: 'Found: A Very Small Door', t: 'Wooden, four inches tall, on the path behind the mill. Knocking gets a reply. Owner please collect.', by: 'The miller' },
    { k: 'lost', h: 'Lost: My Shadow', t: 'Wandered off during a sunny afternoon. Medium height, slightly stooped. It knows the way home.', by: 'Old Tobin, the cooper' },
    { k: 'lost', h: 'Found: Sword in a Stone', t: 'Behind the inn. Several people have tried. The stone has a waiting list now. Owner please advise.', by: 'The innkeeper, the Sleeping Ogre' },
    { k: 'lost', h: 'Lost: Party Member', t: 'Halfling rogue, name of Fig. Last seen "scouting ahead," three days ago. If found, he owes us 12 gp.', by: 'The rest of the party, the Iron Pot' },
    { k: 'lost', h: 'Found: Glove, Moving', t: 'Left glove, leather, crawling along the market wall. It seems friendly. Owner may want the rest of the hand back.', by: 'The fishmonger' },
    { k: 'lost', h: 'Lost: Memory of Last Tuesday', t: 'If you know what I did, please tell me gently. The fine has been paid but nobody will say what for.', by: 'Box 13, the Gazette' },
    { k: 'lost', h: 'Found: Egg, Large, Warm', t: 'Found in the town square, getting warmer. Owner please collect soon. Very soon.', by: 'The town watch' },
    { k: 'lost', h: 'Lost: Apprentice', t: 'Answers to Olf. Last seen testing a teleportation circle. May be anywhere, or several places.', by: 'Master Quell, the Seventh Sigil' },
    { k: 'lost', h: 'Found: Wand, Unknown Function', t: 'Pointed it at a chicken. The chicken is fine. The chicken now speaks Dwarvish. Owner please explain.', by: 'Farmer Dunn' },
    { k: 'lost', h: 'Lost: Gold Ring, Inscribed', t: 'Plain gold, some writing inside that glows near fire. Sentimental value. Also some other value.', by: 'Reward, ask at the Wayfarer\'s Rest' },
    { k: 'lost', h: 'Found: Skeleton, Ambulatory', t: 'Was standing in my field. Seems lost and a bit embarrassed. Has been helping with the harvest.', by: 'The Brannock farm' },
    { k: 'lost', h: 'Lost: Bet on the Joust', t: 'Not lost so much as gone. If you saw me place it, please do not tell my wife.', by: 'Name withheld' },
    { k: 'lost', h: 'Found: One Boot, Seven-League', t: 'Just the left one. Wearer will travel very far in circles. Owner please hop by.', by: 'The cobbler, Market Row' },
    { k: 'lost', h: 'Lost: Spell Component Pouch', t: 'Brown leather. Contains bat guano, a feather, and my lunch. Please return the lunch, keep the guano.', by: 'Mirel, the Seventh Sigil' },

    // ── Display ads (a business; most open the Shop generator) ──
    { k: 'display', h: 'Temple of the Ever-Open Door', t: 'Now with 37% more holy. Healing, blessings, and a firm hand with curses. Resurrection by appointment.', shop: { type: 'temple', wealth: 'wealthy' } },
    { k: 'display', h: 'The Honest Anvil', t: 'Blades sharpened while you wait. Armor fitted while you complain. We do not ask what the dents are from.', shop: { type: 'blacksmith', wealth: 'modest' } },
    { k: 'display', h: 'Bubble & Fume Apothecary', t: 'Potions brewed fresh daily. If it changes color in the bottle, bring it back. Please do not drink it first.', shop: { type: 'alchemist', wealth: 'modest' } },
    { k: 'display', h: 'The Seventh Sigil', t: 'Scrolls, wands, and arcane sundries for the discerning caster. Browsing welcome. Touching, less so.', shop: { type: 'arcane', wealth: 'wealthy' } },
    { k: 'display', h: 'Hoof & Halter Livery', t: 'Horses, mules, and one very good donkey. Rent by the day, buy for life. Saddles fitted free.', shop: { type: 'stable', wealth: 'modest' } },
    { k: 'display', h: 'The Full Pack Provisioners', t: 'Rope, rations, torches, and the one thing you always forget. Ask us what it is. We know.', shop: { type: 'provisioner', wealth: 'modest' } },
    { k: 'display', h: 'Cogwhistle Repairs', t: 'Clockwork mended, locks improved, music boxes made to play the right song. Nothing explodes on purpose.', shop: { type: 'tinker', wealth: 'modest' } },
    { k: 'display', h: 'Oddments & Ends', t: 'Curios from a hundred dungeons. Every item comes with a story, and some come with a ghost. No refunds on ghosts.', shop: { type: 'curio', wealth: 'modest' } },
    { k: 'display', h: 'The Mended Cloak', t: 'Tailoring for adventurers. We patch the arrow holes and do not judge the bloodstains. Hems while you wait.', shop: { type: 'tailor', wealth: 'modest' } },
    { k: 'display', h: 'Tannery Row Leathers', t: 'Boots that last ten dungeons. Packs that hold more than they should. The smell fades in a week.', shop: { type: 'leatherworker', wealth: 'poor' } },
    { k: 'display', h: 'The Sober Gem', t: 'Fine jewelry, honestly appraised. If a dragon wanted it, we can tell you why. Engagement rings, no curses.', shop: { type: 'jeweler', wealth: 'wealthy' } },
    { k: 'display', h: 'Inkwell & Seal', t: 'Letters, contracts, and wills. Copied neatly, sealed properly, and read aloud to the illiterate at no charge.', shop: { type: 'scribe', wealth: 'modest' } },
    { k: 'display', h: 'Saltrope Chandlery', t: 'Everything for the ship and the sailor. Rope, tar, lanterns, and charms against the deep. Open at every tide.', shop: { type: 'docks', wealth: 'modest' } },
    { k: 'display', h: 'Everything Barrel Mercantile', t: 'If it fits in a barrel, we sell it. If it does not, we know a fellow. Fair prices since before the flood.', shop: { type: 'general', wealth: 'poor' } },
    { k: 'display', h: 'True Flight Bowyers', t: 'Bows strung, arrows fletched, and quivers that never tangle. Free lesson with every longbow.', shop: { type: 'bowyer', wealth: 'modest' } },
    { k: 'display', h: 'The Gilded Anvil', t: 'For the knight who wants to be seen. Engraved plate, gilded hilts, and armor that shines brighter than your record.', shop: { type: 'blacksmith', wealth: 'wealthy' } },
    { k: 'display', h: 'Mother Ashby\'s Remedies', t: 'Tonics for the cough, salves for the bruise, and something for the heart. Cash or chickens.', shop: { type: 'alchemist', wealth: 'poor' } },
    { k: 'display', h: 'The Bargain Grimoire', t: 'Secondhand spellbooks, scrolls past their best, and wands with a few charges left. Slightly singed, deeply discounted.', shop: { type: 'arcane', wealth: 'poor' } },
    { k: 'display', h: 'Shrine of the Quiet Candle', t: 'A small shrine with a big heart. Blessings at fair prices, and no sermon unless you ask for one.', shop: { type: 'temple', wealth: 'poor' } },
    { k: 'display', h: 'The Velvet Needle', t: 'Gowns and doublets for the court, the ball, and the coronation you were not invited to. Fittings by appointment.', shop: { type: 'tailor', wealth: 'wealthy' } },
    { k: 'display', h: 'Ironhoof Cart & Carriage', t: 'Wagons for hire, horses for sale, and a coach with real springs. Your back will thank us.', shop: { type: 'stable', wealth: 'wealthy' } },
    { k: 'display', h: 'The Lucky Rat', t: 'Curios, charms, and things found in the sewers. Some lucky, some cursed, all cheap. Ask about the jar.', shop: { type: 'curio', wealth: 'poor' } },
    { k: 'display', h: 'Dungeon Survivors\' Guild', t: 'Lost a friend to a mimic? Lost a leg to a trap? Lost your nerve? Meetings every Moonday at the Iron Pot. Tea provided.' },
    { k: 'display', h: 'Grimhold Adventurers\' Insurance', t: 'Fire, flood, dragon, curse. Our policies cover everything except the things that actually happen to adventurers.' },
    { k: 'display', h: 'The Beholder\'s Gazette Wants You', t: 'Seen something strange? Heard a rumor worth spreading? Our bards are listening. Ravens accepted, pigeons tolerated.', href: 'rumors' }
];

// Day number of a date (or a 'YYYY-MM-DD' string), on the reader's calendar.
function classifiedsDay(date) {
    let y, m, d;
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) [y, m, d] = date.split('-').map(Number);
    else { const t = date instanceof Date ? date : new Date(); y = t.getFullYear(); m = t.getMonth() + 1; d = t.getDate(); }
    return Math.floor(Date.UTC(y, m - 1, d) / 864e5);
}

// Each kind's ads in a fixed shuffled order, so neighbors in the list don't run on neighboring days.
const classifiedDecks = {};
function classifiedDeck(kind) {
    if (!classifiedDecks[kind]) {
        const ads = CLASSIFIEDS.filter(a => a.k === kind);
        classifiedDecks[kind] = withSeed(hashString('classifieds/' + kind).toString(36), () => {
            const a = ads.slice();
            for (let i = a.length - 1; i > 0; i--) {
                const j = Math.floor(rand() * (i + 1));
                [a[i], a[j]] = [a[j], a[i]];
            }
            return a;
        });
    }
    return classifiedDecks[kind];
}

// The ads for a date: one of each small kind, and `displays` display ads.
// The same date always deals the same ads; each kind cycles its whole deck before a repeat.
function dealClassifieds(date, displays = 3) {
    const day = classifiedsDay(date);
    const pick = (kind, i, per) => {
        const deck = classifiedDeck(kind);
        return deck[(((day * per + i) % deck.length) + deck.length) % deck.length];
    };
    const n = Math.min(displays, classifiedDeck('display').length);
    return {
        small: ['hire', 'wanted', 'sale', 'lost'].map(k => pick(k, 0, 1)),
        display: Array.from({ length: n }, (_, i) => pick('display', i, n))
    };
}

// The Shop generator link for an ad's business: a fixed seed from its name, under its sign.
function classifiedShopHref(ad) {
    if (!ad.shop) return '';
    const seed = hashString('classifieds/shop/' + ad.h).toString(36);
    return 'shop?' + new URLSearchParams({ type: ad.shop.type, wealth: ad.shop.wealth, seed, name: ad.h }).toString();
}
