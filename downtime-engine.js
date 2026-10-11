/* ============================================
   DOWNTIME ENGINE (F28): what a stretch of downtime costs each character.
   Lifestyle costs per day and the downtime activities (crafting, practicing a
   profession, recuperating, researching) follow the SRD 5.1 (tagged 'SRD').
   Where the SRD is silent, the Gazette makes a ruling (tagged 'ruling').
   Carousing is not in the SRD: it is a Gazette house rule with original
   outcome tables (tagged 'house').
   Amounts are in gp; show them with formatCoins() (coins.js). Carousing
   outcomes roll from deriveSeed(seed, ...) (rng.js), so a link replays them.
   ============================================ */

// SRD 5.1 Lifestyle Expenses, per day. Aristocratic is "10 gp minimum".
const DOWNTIME_LIFESTYLES = {
    wretched:     { label: 'Wretched',     icon: '🥀', gp: 0 },
    squalid:      { label: 'Squalid',      icon: '🪳', gp: 0.1 },
    poor:         { label: 'Poor',         icon: '🕯️', gp: 0.2 },
    modest:       { label: 'Modest',       icon: '🍺', gp: 1 },
    comfortable:  { label: 'Comfortable',  icon: '🔥', gp: 2 },
    wealthy:      { label: 'Wealthy',      icon: '🍷', gp: 4 },
    aristocratic: { label: 'Aristocratic', icon: '👑', gp: 10 }
};
const DOWNTIME_LIFE_KEYS = Object.keys(DOWNTIME_LIFESTYLES);

const DOWNTIME_ACTIVITIES = {
    none:     { label: 'Just living', icon: '🛏️' },
    craft:    { label: 'Crafting', icon: '🔨' },
    work:     { label: 'Working for pay', icon: '💼' },
    research: { label: 'Researching', icon: '📚' },
    recup:    { label: 'Recuperating', icon: '🩹' },
    carouse:  { label: 'Carousing (house rule)', icon: '🍻' }
};

// Practicing a profession (SRD 5.1): the lifestyle the work pays for.
const DOWNTIME_WORK = {
    trade:   { label: 'A trade or odd jobs', covers: 'modest' },
    org:     { label: 'For an organization (temple, guild)', covers: 'comfortable' },
    perform: { label: 'Performing (proficient in Performance)', covers: 'wealthy' }
};

const CRAFT_GP_PER_DAY = 5;      // SRD 5.1: 5 gp of progress per crafter per day
const RESEARCH_GP_PER_DAY = 1;   // SRD 5.1: 1 gp of expenses per day of research
const DOWNTIME_MAX_DAYS = 365;
const CAROUSE_SHOWN = 8;         // outcomes listed (one per week)

// Carousing (house rule, original): one outcome per week, from the circle your lifestyle moves in.
const CAROUSE_CIRCLES = {
    low: { label: 'dockside dives and back-alley taverns', from: ['wretched', 'squalid', 'poor'] },
    middle: { label: 'respectable taverns and guild halls', from: ['modest', 'comfortable'] },
    high: { label: 'salons, galas, and private clubs', from: ['wealthy', 'aristocratic'] }
};
const CAROUSE_OUTCOMES = {
    low: [
        { k: 'good', t: 'You win an arm-wrestling match against a sailor named Brine, who now insists you are his best friend and will vouch for you at any dock in the city.' },
        { k: 'good', t: 'A one-eyed fence takes a liking to you and offers to buy "anything shiny, no questions" at a fair-ish price.' },
        { k: 'good', t: 'You hear a drunk mumble about a smuggler\'s cache under the old fish market. It might even be true.' },
        { k: 'good', t: 'You split a bottle with a retired adventurer who sketches you a map of a dungeon she never finished.' },
        { k: 'bad', t: 'You wake up in a cell at the watch house. The fine is 1 gp per level, or a night\'s work scrubbing the barracks.' },
        { k: 'bad', t: 'Someone lifted your coin purse. You lose whatever you were carrying, up to 2d10 gp.' },
        { k: 'bad', t: 'You insulted the wrong gang boss\'s cousin. Their crew now glares at you whenever you pass.' },
        { k: 'bad', t: 'You bet your boots on a rat race. You lost. You are now bootless and the rat is smug.' },
        { k: 'odd', t: 'You have a new tattoo. Nobody, including the tattoo artist, can say what it is supposed to be.' },
        { k: 'odd', t: 'You are now the owner of a goat. The goat has not been told it is owned.' },
        { k: 'odd', t: 'You agreed to be best man (or maid of honor) at a wedding next tenday. You do not know either party.' },
        { k: 'odd', t: 'A street preacher is convinced you are the prophesied one. He has started following you around.' },
        { k: 'good', t: 'A dockhand you bought a drink for turns out to run the night shift. Your cargo now goes through without anyone looking.' },
        { k: 'bad', t: 'You got into a knife-throwing contest and lost. The scar is small, but the story told about it is not.' },
        { k: 'odd', t: 'You woke up as the new captain of a small, leaky fishing boat. The crew of two is delighted.' }
    ],
    middle: [
        { k: 'good', t: 'You make friends with a guild journeyman who can get you trade goods at a tenth off for the next month.' },
        { k: 'good', t: 'You sing so well (or so badly) that the tavern offers you a standing free drink if you come back on market days.' },
        { k: 'good', t: 'A merchant in her cups mentions a caravan that needs guards and pays well. She gives you her card.' },
        { k: 'good', t: 'You win a game of dragonchess against a city clerk, who now owes you a favor with the paperwork.' },
        { k: 'bad', t: 'You ran up a tab you can\'t remember. The barkeep can: 3d6 gp, payable before you\'re welcome back.' },
        { k: 'bad', t: 'You started a brawl over a card game. The tavern bans you, and the other player swears revenge.' },
        { k: 'bad', t: 'You promised to sponsor a local festival. The organizers expect 10 gp and are already printing your name.' },
        { k: 'bad', t: 'You told a fellow drinker far too much about your party\'s plans. Someone who wasn\'t drinking was listening.' },
        { k: 'odd', t: 'You joined a secret society. The password is "turnip." You have no memory of what the society does.' },
        { k: 'odd', t: 'You are engaged. Your betrothed is lovely, very enthusiastic, and has already told their parents.' },
        { k: 'odd', t: 'A gnome inventor bought you drinks all night and now considers you a business partner in a flying bathtub.' },
        { k: 'good', t: 'You helped a lost courier find the right guildhall. The guild sends a thank-you, a discount, and a standing invitation.' },
        { k: 'bad', t: 'You loaned a new friend 2d6 gp for a sure thing. The sure thing was not sure, and the friend has left town.' },
        { k: 'odd', t: 'You won a raffle. The prize is a share in a racehorse that has never finished a race.' },
        { k: 'odd', t: 'You entered a pie-eating contest and won a trophy shaped like a pie. It is real silver and smells faintly of pie.' }
    ],
    high: [
        { k: 'good', t: 'A minor noble finds you charming and invites you to her hunting lodge next season, along with your friends.' },
        { k: 'good', t: 'You impress a wealthy patron of the arts, who offers to fund one expedition "for the stories."' },
        { k: 'good', t: 'Over brandy, a councilor lets slip which guild is about to lose its charter. Knowledge like that is worth money.' },
        { k: 'good', t: 'You win a fencing exhibition and a jeweled pin. Wearing it gets you through doors that were closed before.' },
        { k: 'bad', t: 'You lost heavily at the card tables: 4d10 gp, owed to a duke who smiles a little too much.' },
        { k: 'bad', t: 'You offended the hostess by mistaking her for a servant. You won\'t be invited anywhere decent for a month.' },
        { k: 'bad', t: 'A rival spread a rumor that you cheat at cards. Half the room believes it. The other half wants lessons.' },
        { k: 'bad', t: 'You challenged a lord to a duel at dawn. It is now nearly dawn, and he has brought his champion.' },
        { k: 'odd', t: 'You were briefly crowned King or Queen of the Masquerade. The crown is real and someone wants it back.' },
        { k: 'odd', t: 'A fortune teller at the gala read your palm, went pale, and refused your coin.' },
        { k: 'odd', t: 'You commissioned a portrait of yourself while tipsy. It is enormous. The painter delivers next week, with the bill.' },
        { k: 'odd', t: 'You agreed to adopt a noble family\'s prize-winning peacock. It is loud, vain, and now yours.' },
        { k: 'good', t: 'A retired general enjoyed your company and offers you the use of her library and her cellar, in that order.' },
        { k: 'bad', t: 'You mistook a famous poet\'s new work for a drinking song and sang along. The poet will not forget.' },
        { k: 'odd', t: 'You agreed to a masked dance with a stranger who left at midnight and one glass slipper. The slipper is your size.' }
    ]
};

function lifeIndex(key) {
    return DOWNTIME_LIFE_KEYS.indexOf(key);
}

function carouseCircle(life) {
    return Object.keys(CAROUSE_CIRCLES).find(c => CAROUSE_CIRCLES[c].from.includes(life)) || 'middle';
}

// Total days of downtime from weeks plus days, clamped to 0..365.
function downtimeDays(weeks, days) {
    const d = Math.floor(Number(weeks) || 0) * 7 + Math.floor(Number(days) || 0);
    return Math.min(DOWNTIME_MAX_DAYS, Math.max(0, d));
}

// One character's downtime. c = { name, life, act, val, done, help, work }; i = row index (for the carousing seed).
// Returns { days, life, lifeGp, extraGp, totalGp, lines: [{ text, src }], craft?, carouse? }.
function downtimeFor(c, days, seed, i = 0) {
    const L = DOWNTIME_LIFESTYLES[c.life] || DOWNTIME_LIFESTYLES.modest;
    const life = DOWNTIME_LIFESTYLES[c.life] ? c.life : 'modest';
    const lines = [];
    const out = { days, life, lifeGp: 0, extraGp: 0, totalGp: 0, lines };
    const full = L.gp;
    let lifeGp = days * full;

    if (c.act === 'craft') {
        const value = Math.max(0, Number(c.val) || 0);
        const done = Math.min(value, Math.max(0, Number(c.done) || 0));
        const helpers = Math.max(0, Math.floor(Number(c.help) || 0));
        const perDay = CRAFT_GP_PER_DAY * (1 + helpers);
        const left = value - done;
        const craftDays = left > 0 ? Math.min(days, Math.ceil(left / perDay)) : 0;
        const made = Math.min(left, craftDays * perDay);
        const finished = value > 0 && done + made >= value;
        // SRD 5.1: while crafting, a modest lifestyle is free and a comfortable one costs half.
        const rate = lifeIndex(life) <= lifeIndex('modest') ? 0 : life === 'comfortable' ? full / 2 : full;
        lifeGp = craftDays * rate + (days - craftDays) * full;
        const materials = made / 2;
        out.extraGp += materials;
        out.craft = { value, done, made, perDay, craftDays, finished, materials,
            daysLeft: finished || !value ? 0 : Math.ceil((value - done - made) / perDay) };
        if (!value) lines.push({ text: 'Enter the item\'s market value to track crafting progress.', src: 'ruling' });
        else {
            lines.push({ text: `Crafting at ${formatCoins(perDay)} of progress a day${helpers ? ` (with ${helpers} helper${helpers === 1 ? '' : 's'})` : ''}: ${formatCoins(done + made)} of ${formatCoins(value)}${finished ? ', finished' : ''}.`, src: 'SRD' });
            if (finished) lines.push({ text: `Done after ${craftDays} day${craftDays === 1 ? '' : 's'} of work.`, src: 'SRD' });
            else lines.push({ text: `${formatCoins(value - done - made)} of work left: about ${out.craft.daysLeft} more day${out.craft.daysLeft === 1 ? '' : 's'}.`, src: 'SRD' });
            if (made) lines.push({ text: `Raw materials: ${formatCoins(materials)} (half the value of the progress made).`, src: 'SRD' });
        }
        if (craftDays && rate < full) lines.push({ text: life === 'comfortable' ? 'Comfortable lifestyle at half cost while crafting.' : 'Lifestyle paid for while crafting (modest or less is free).', src: 'SRD' });
        else if (craftDays && lifeIndex(life) > lifeIndex('comfortable')) lines.push({ text: 'Crafting doesn\'t cover a lifestyle this lavish, so it costs full price.', src: 'ruling' });
        if (helpers) lines.push({ text: 'Helpers need the right tool proficiency and must work in the same place.', src: 'SRD' });
    } else if (c.act === 'work') {
        const w = DOWNTIME_WORK[c.work] || DOWNTIME_WORK.trade;
        const cov = DOWNTIME_LIFESTYLES[w.covers];
        if (lifeIndex(life) <= lifeIndex(w.covers)) {
            lifeGp = 0;
            lines.push({ text: `The work pays for up to a ${cov.label.toLowerCase()} lifestyle, so living costs nothing.`, src: 'SRD' });
        } else {
            lifeGp = days * (full - cov.gp);
            lines.push({ text: `The work pays for a ${cov.label.toLowerCase()} lifestyle (${formatCoins(cov.gp)} a day).`, src: 'SRD' });
            lines.push({ text: 'Living above it, the character pays the difference.', src: 'ruling' });
        }
    } else if (c.act === 'research') {
        out.extraGp += days * RESEARCH_GP_PER_DAY;
        lines.push({ text: `Research expenses: ${formatCoins(RESEARCH_GP_PER_DAY)} a day. The DM decides what can be learned and how long it takes.`, src: 'SRD' });
    } else if (c.act === 'recup') {
        const tries = Math.floor(days / 3);
        lines.push({ text: tries
            ? `${tries} recovery attempt${tries === 1 ? '' : 's'} (one per 3 days): DC 15 Constitution save. On a success, end one effect that stops hit point recovery, or gain advantage on saves against one disease or poison for 24 hours.`
            : 'Recuperating takes 3 days of downtime before the DC 15 Constitution save.', src: 'SRD' });
    } else if (c.act === 'carouse') {
        // House rule: carousing costs the lifestyle's daily price again on top (at least 1 sp a day).
        out.extraGp += days * Math.max(0.1, full);
        const circle = carouseCircle(life);
        const weeks = days ? Math.max(1, Math.floor(days / 7)) : 0;
        const table = CAROUSE_OUTCOMES[circle];
        out.carouse = { circle, weeks, outcomes: [] };
        for (let wk = 0; wk < Math.min(weeks, CAROUSE_SHOWN); wk++) {
            out.carouse.outcomes.push(withSeed(deriveSeed(seed || '0', `carouse.${i}.${wk}`), () => table[Math.floor(rand() * table.length)]));
        }
        lines.push({ text: `Carousing in ${CAROUSE_CIRCLES[circle].label} costs the lifestyle's price again each day, and brings one outcome per week.`, src: 'house' });
    }

    if (life === 'aristocratic') lines.push({ text: 'Aristocratic is 10 gp a day at the least; the grandest households spend far more.', src: 'SRD' });
    out.lifeGp = Math.round(lifeGp * 100) / 100;
    out.extraGp = Math.round(out.extraGp * 100) / 100;
    out.totalGp = Math.round((out.lifeGp + out.extraGp) * 100) / 100;
    return out;
}

// Plain text for the clipboard.
function downtimeText(chars, results, days) {
    const lines = [`Downtime: ${days} day${days === 1 ? '' : 's'}`];
    let party = 0;
    chars.forEach((c, i) => {
        const r = results[i];
        party += r.totalGp;
        const L = DOWNTIME_LIFESTYLES[r.life];
        lines.push('', `${c.name || 'Character ' + (i + 1)}: ${L.label} lifestyle, ${DOWNTIME_ACTIVITIES[c.act] ? DOWNTIME_ACTIVITIES[c.act].label : 'Just living'}`);
        lines.push(`  Living: ${formatCoins(r.lifeGp)}${r.extraGp ? ` + extras ${formatCoins(r.extraGp)}` : ''} = ${formatCoins(r.totalGp)}`);
        r.lines.forEach(l => lines.push(`  - ${l.text}`));
        if (r.carouse) r.carouse.outcomes.forEach((o, wk) => lines.push(`  Week ${wk + 1}: ${o.t}`));
    });
    lines.push('', `Party total: ${formatCoins(Math.round(party * 100) / 100)}`);
    return lines.join('\n');
}
