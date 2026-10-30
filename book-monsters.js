/* ============================================
   BRING YOUR OWN BOOK (ROADMAP L4 D1): monsters from the 2014 Monster Manual that aren't in
   SRD 5.1, by name only. Each row is the name, size, type, and the page that holds the stat
   block; nothing else. The Fan Content Policy lets the site use the names but not the numbers,
   so the DM types CR, AC, HP, and the initiative bonus from their own copy, and the monster
   is saved as a homebrew monster (homebrew.js, the notebook's 'monster' kind, with `book` set
   to the page). Once saved under the same name, it drops off this list and the homebrew row
   takes its place, so the budget math, stat blocks, and backups work as for any homebrew.
   Row: [name, size (T/S/M/L/H/G), type, page]. Names and pages from the 2014 Monster Manual;
   monsters in SRD 5.1 (monsters-data.js) left out.
   - bookRows: the rows not yet saved, as { id: 'book-<slug>', name, size, type, page, byob }.
   - bookNamed(name): the row by name, saved or not, or null.
   - bookFormHtml(row): the small form; bookSave(row, form) saves it and returns the
     homebrew row (MONSTER_BY_ID) or throws an Error with a message for the DM.
   Needs homebrew.js and notebook.js. 5e only: the Pathfinder pages never call it.
   ============================================ */

const BOOK_TITLE = 'Monster Manual (2014)';
const BOOK_PREFIX = 'book-';
const BOOK_MONSTERS = [
    ["Aarakocra", "M", "humanoid", 12],
    ["Abominable Yeti", "H", "monstrosity", 306],
    ["Adult Blue Dracolich", "H", "undead", 84],
    ["Allosaurus", "L", "beast", 79],
    ["Ankylosaurus", "H", "beast", 79],
    ["Arcanaloth", "M", "fiend", 313],
    ["Banshee", "M", "undead", 23],
    ["Barlgura", "L", "fiend", 56],
    ["Beholder", "L", "aberration", 28],
    ["Beholder Zombie", "L", "undead", 316],
    ["Blue Slaad", "L", "aberration", 276],
    ["Bone Naga", "L", "undead", 233],
    ["Bugbear Chief", "M", "humanoid", 33],
    ["Bullywug", "M", "humanoid", 35],
    ["Cambion", "M", "fiend", 36],
    ["Carrion Crawler", "L", "monstrosity", 37],
    ["Chasme", "L", "fiend", 57],
    ["Crawling Claw", "T", "undead", 44],
    ["Cyclops", "H", "giant", 45],
    ["Dao", "L", "elemental", 143],
    ["Death Knight", "M", "undead", 47],
    ["Death Slaad", "M", "aberration", 278],
    ["Death Tyrant", "L", "undead", 29],
    ["Demilich", "T", "undead", 48],
    ["Demilich (Acererak)", "T", "undead", 49],
    ["Displacer Beast", "L", "monstrosity", 81],
    ["Drow Elite Warrior", "M", "humanoid", 128],
    ["Drow Mage", "M", "humanoid", 129],
    ["Drow Priestess of Lolth", "M", "humanoid", 129],
    ["Duodrone", "M", "construct", 225],
    ["Empyrean", "H", "celestial", 130],
    ["Faerie Dragon (blue)", "T", "dragon", 133],
    ["Faerie Dragon (green)", "T", "dragon", 133],
    ["Faerie Dragon (indigo)", "T", "dragon", 133],
    ["Faerie Dragon (orange)", "T", "dragon", 133],
    ["Faerie Dragon (red)", "T", "dragon", 133],
    ["Faerie Dragon (violet)", "T", "dragon", 133],
    ["Faerie Dragon (yellow)", "T", "dragon", 133],
    ["Fire Snake", "M", "elemental", 265],
    ["Flameskull", "T", "undead", 134],
    ["Flumph", "S", "aberration", 135],
    ["Fomorian", "H", "giant", 136],
    ["Galeb Duhr", "M", "elemental", 139],
    ["Gas Spore", "L", "plant", 138],
    ["Githyanki Knight", "M", "humanoid", 160],
    ["Githyanki Warrior", "M", "humanoid", 160],
    ["Githzerai Monk", "M", "humanoid", 161],
    ["Githzerai Zerth", "M", "humanoid", 161],
    ["Gnoll Fang of Yeenoghu", "M", "fiend", 163],
    ["Gnoll Pack Lord", "M", "humanoid", 163],
    ["Goblin Boss", "S", "humanoid", 166],
    ["Goristro", "H", "fiend", 59],
    ["Gray Slaad", "M", "aberration", 277],
    ["Green Slaad", "L", "aberration", 277],
    ["Grell", "M", "aberration", 172],
    ["Grick Alpha", "L", "monstrosity", 173],
    ["Half-Ogre", "L", "giant", 238],
    ["Helmed Horror", "M", "construct", 183],
    ["Hobgoblin Captain", "M", "humanoid", 186],
    ["Hobgoblin Warlord", "M", "humanoid", 187],
    ["Hook Horror", "L", "monstrosity", 189],
    ["Intellect Devourer", "T", "aberration", 191],
    ["Jackalwere", "M", "humanoid", 193],
    ["Kenku", "M", "humanoid", 194],
    ["Kuo-toa", "M", "humanoid", 199],
    ["Kuo-toa Archpriest", "M", "humanoid", 200],
    ["Kuo-toa Monitor", "M", "humanoid", 198],
    ["Kuo-toa Whip", "M", "humanoid", 200],
    ["Lizard King/Queen", "M", "humanoid", 205],
    ["Lizardfolk Shaman", "M", "humanoid", 205],
    ["Manes", "S", "fiend", 60],
    ["Marid", "L", "elemental", 146],
    ["Mezzoloth", "M", "fiend", 313],
    ["Mind Flayer", "M", "aberration", 222],
    ["Mind Flayer Arcanist", "M", "aberration", 222],
    ["Monodrone", "M", "construct", 224],
    ["Mud Mephit", "S", "elemental", 216],
    ["Myconid Adult", "M", "plant", 232],
    ["Myconid Sovereign", "L", "plant", 232],
    ["Myconid Sprout", "S", "plant", 230],
    ["Needle Blight", "M", "plant", 32],
    ["Nothic", "M", "aberration", 236],
    ["Nycaloth", "L", "fiend", 314],
    ["Orc Eye of Gruumsh", "M", "humanoid", 247],
    ["Orc War Chief", "M", "humanoid", 246],
    ["Orog", "M", "humanoid", 247],
    ["Pentadrone", "L", "construct", 226],
    ["Peryton", "L", "monstrosity", 251],
    ["Piercer", "M", "monstrosity", 252],
    ["Pixie", "T", "fey", 253],
    ["Poltergeist", "M", "undead", 279],
    ["Pteranodon", "M", "beast", 80],
    ["Quadrone", "M", "construct", 226],
    ["Quaggoth", "M", "humanoid", 256],
    ["Quaggoth Spore Servant", "M", "plant", 230],
    ["Quaggoth Thonot", "M", "humanoid", 256],
    ["Red Slaad", "L", "aberration", 276],
    ["Revenant", "M", "undead", 259],
    ["Sahuagin Baron", "L", "humanoid", 264],
    ["Sahuagin Priestess", "M", "humanoid", 264],
    ["Scarecrow", "M", "construct", 268],
    ["Shadow Demon", "M", "fiend", 64],
    ["Slaad Tadpole", "T", "aberration", 276],
    ["Smoke Mephit", "S", "elemental", 217],
    ["Spectator", "M", "aberration", 30],
    ["Spined Devil", "S", "fiend", 78],
    ["Thri-kreen", "M", "humanoid", 288],
    ["Tridrone", "M", "construct", 225],
    ["Troglodyte", "M", "humanoid", 290],
    ["Twig Blight", "S", "plant", 32],
    ["Ultroloth", "M", "fiend", 314],
    ["Umber Hulk", "L", "monstrosity", 292],
    ["Vampire Spellcaster", "M", "undead", 298],
    ["Vampire Warrior", "M", "undead", 298],
    ["Vine Blight", "M", "plant", 32],
    ["Water Weird", "L", "elemental", 299],
    ["Winged Kobold", "S", "humanoid", 195],
    ["Yeti", "L", "monstrosity", 305],
    ["Yochlol", "M", "fiend", 65],
    ["Young Red Shadow Dragon", "L", "dragon", 85],
    ["Young Remorhaz", "L", "monstrosity", 258],
    ["Yuan-ti Abomination", "L", "monstrosity", 308],
    ["Yuan-ti Malison", "M", "monstrosity", 309],
    ["Yuan-ti Pureblood", "M", "humanoid", 310]
];

let bookRows = [];

function bookSlug(name) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function bookRow(r) {
    return { id: BOOK_PREFIX + bookSlug(r[0]), name: r[0], size: r[1], type: r[2], page: r[3], byob: true };
}

// The rows whose name no saved homebrew monster has yet. Runs on load and after every notebook change.
function bookRefresh() {
    const saved = new Set(hbRows.map(m => m.name.toLowerCase()));
    bookRows = BOOK_MONSTERS.filter(r => !saved.has(r[0].toLowerCase())).map(bookRow);
    return bookRows;
}

function bookNamed(name) {
    const key = String(name).trim().toLowerCase();
    const r = BOOK_MONSTERS.find(x => x[0].toLowerCase() === key);
    return r ? bookRow(r) : null;
}

// "Large aberration · Monster Manual (2014), p. 28"
function bookLine(row) {
    return `${HB_SIZES[row.size][0]} ${row.type} · ${BOOK_TITLE}, p. ${row.page}`;
}

function bookEsc(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function bookFormHtml(row) {
    const crs = HB_CRS.map(c => `<option value="${c}">${c}</option>`).join('');
    return `<form class="bk-form" data-book="${bookEsc(row.id)}">
            <p class="bk-head">📖 <b>${bookEsc(row.name)}</b>: ${bookEsc(bookLine(row))}. Type its numbers from your own copy of the Monster Manual.</p>
            <div class="bk-fields">
                <label>CR <select name="cr" required><option value="">—</option>${crs}</select></label>
                <label>AC <input type="number" name="ac" min="1" max="30" step="1" required inputmode="numeric"></label>
                <label>HP <input type="number" name="hp" min="1" max="9999" step="1" required inputmode="numeric"></label>
                <label>Init bonus <input type="number" name="init" min="-5" max="10" step="1" value="0" inputmode="numeric"></label>
                <button type="submit" class="btn btn-gold">💾 Save</button>
                <button type="button" class="btn bk-cancel">Cancel</button>
            </div>
            <p class="bk-note">Saved to your campaign notebook as a homebrew monster, on this device only. The Gazette doesn't print the book's stats.</p>
        </form>`;
}

function bookSave(row, form) {
    const f = form.elements;
    const cr = f.cr.value;
    const ac = hbInt(f.ac.value, 1, 30, null), hp = hbInt(f.hp.value, 1, 9999, null), init = hbInt(f.init.value, -5, 10, 0);
    if (!HB_CRS.includes(cr) || ac === null || hp === null) throw new Error('Fill in CR, AC, and HP from the book.');
    const mon = hbClean({ name: row.name, size: row.size, type: row.type, align: 'unaligned', ac, hd: 1, hpFlat: hp,
        ab: [10, 10 + 2 * init, 10, 10, 10, 10], cr, book: row.page });
    const res = nbAdd({ kind: 'monster', title: mon.name, sub: hbSummary(mon), href: '', mon });
    if (!res) throw new Error("This browser wouldn't save it (storage full or blocked).");
    if (res.full) throw new Error(`The notebook is full (${NB_LIMITS.entries} entries). Remove some in the Worldbuilder first.`);
    return MONSTER_BY_ID[HB_PREFIX + res.entry.id];
}

if (typeof nbOnChange === 'function' && typeof hbRows !== 'undefined') {
    bookRefresh();
    nbOnChange(bookRefresh);
}
