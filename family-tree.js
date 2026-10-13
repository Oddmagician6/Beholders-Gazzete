/* ============================================
   FAMILY TREES (F55): the data side
   A family is one tree that grows down from its oldest ancestor (`top`). Everyone
   born into it hangs from a union of their parents (`of`); everyone who married in
   stands beside their partner as a union's `b` and has no parents shown:
     { name, top, root, people: [person], unions: [union], scandals: [scandal], edited }
     person:  { id, name, gender, race, age, dead, ago, cause, title, note, npc, to, of }
              age is their age now, or the age they died at (then `ago` is how many years
              ago that was); npc is the NPC page's query string that rolls them (rolled people
              only); to is a notebook NPC entry they are; of is the union they were born to.
     union:   { id, a, b, kind } a is born into the family (or is `top`), b married in (or '');
              kind: wed, apart (the marriage ended), secret.
     scandal: { text, who: [person ids] } text names people as {0}, {1}, … so a rename follows.
   root is the person the family is about (the head of the house). Families are rolled by
   family-engine.js and kept in the notebook (kind 'family', the whole family in `fam`),
   so this file is page-free: every page that loads notebook.js loads it too, and an
   imported or restored family goes through famClean like everything else.
   The page side lives in world-family.js.
   ============================================ */

const FAM_LIMITS = { people: 150, unions: 150, scandals: 12, name: 80, title: 60, note: 600, cause: 80, scandal: 400, age: 2000 };
const FAM_GENDERS = { male: 'Male', female: 'Female', nonbinary: 'Nonbinary' };
// The NPC page's races (npc-data.js isn't on every page that cleans a family).
const FAM_RACES = ['human', 'elf', 'dwarf', 'halfling', 'gnome', 'orc', 'tiefling', 'dragonborn'];
const FAM_UNIONS = {
    wed: { label: 'Married', icon: '💍' },
    apart: { label: 'Parted', icon: '💔' },
    secret: { label: 'In secret', icon: '🤫' }
};
const FAM_ID = /^[a-z0-9]{1,12}$/;
// An NPC page query string, as a notebook link may hold one.
const FAM_NPC = /^[A-Za-z0-9_.~%+=&*-]{1,1000}$/;
// The tree's boxes: width, height, gap between partners, between siblings, between generations.
const FAM_BOX = { w: 168, h: 62, spouse: 30, gap: 22, row: 58, pad: 16 };

function famText(v, max) {
    return typeof v === 'string' ? v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, max) : '';
}

function famLine(v, max) {
    return famText(typeof v === 'string' ? v.replace(/\s+/g, ' ') : v, max);
}

function famAge(v) {
    const n = typeof v === 'string' && /^\d{1,4}$/.test(v.trim()) ? Number(v) : v;
    return Number.isInteger(n) && n >= 0 ? Math.min(n, FAM_LIMITS.age) : 0;
}

function famCapital(s) {
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

// ── Cleaning ──────────────────────────────────────────────
// A clean family from untrusted data, or null. Only people the tree reaches from `top` stay:
// a partner stands in one union, never someone's child as well, so nobody is drawn twice.
function famClean(raw) {
    if (!raw || typeof raw !== 'object' || !Array.isArray(raw.people) || !Array.isArray(raw.unions)) return null;
    const people = [], byId = new Map();
    raw.people.forEach(p => {
        if (!p || typeof p !== 'object' || typeof p.id !== 'string' || !FAM_ID.test(p.id) || byId.has(p.id) || people.length >= FAM_LIMITS.people) return;
        const dead = p.dead === true;
        const person = {
            id: p.id,
            name: famLine(p.name, FAM_LIMITS.name) || 'Someone',
            gender: typeof p.gender === 'string' && Object.hasOwn(FAM_GENDERS, p.gender) ? p.gender : 'nonbinary',
            race: FAM_RACES.includes(p.race) ? p.race : 'human',
            age: famAge(p.age),
            dead,
            ago: dead ? famAge(p.ago) : 0,
            cause: dead ? famLine(p.cause, FAM_LIMITS.cause) : '',
            title: famLine(p.title, FAM_LIMITS.title),
            note: famText(p.note, FAM_LIMITS.note),
            npc: typeof p.npc === 'string' && FAM_NPC.test(p.npc) ? p.npc : '',
            to: typeof p.to === 'string' && /^[a-z0-9]{1,16}$/.test(p.to) ? p.to : '',
            of: typeof p.of === 'string' ? p.of : ''
        };
        people.push(person);
        byId.set(person.id, person);
    });
    const unions = [], uById = new Map();
    raw.unions.forEach(u => {
        if (!u || typeof u !== 'object' || typeof u.id !== 'string' || !FAM_ID.test(u.id) || uById.has(u.id) || unions.length >= FAM_LIMITS.unions) return;
        if (typeof u.a !== 'string' || !byId.has(u.a)) return;
        const union = {
            id: u.id,
            a: u.a,
            b: typeof u.b === 'string' && byId.has(u.b) && u.b !== u.a ? u.b : '',
            kind: typeof u.kind === 'string' && Object.hasOwn(FAM_UNIONS, u.kind) ? u.kind : 'wed'
        };
        unions.push(union);
        uById.set(union.id, union);
    });
    const top = typeof raw.top === 'string' && byId.get(raw.top);
    if (!top) return null;
    top.of = '';

    // Walk the tree from the top: each person's unions, their partners, and their children.
    const keepP = new Set(), keepU = new Set();
    const isA = new Set(unions.map(u => u.a));
    const walk = id => {
        if (keepP.has(id)) return;
        keepP.add(id);
        unions.forEach(u => {
            if (u.a !== id || keepU.has(u.id)) return;
            const b = u.b && byId.get(u.b);
            if (b && (keepP.has(b.id) || isA.has(b.id) || (b.of && uById.has(b.of)) || b.id === top.id)) u.b = '';
            if (u.b) { keepP.add(u.b); byId.get(u.b).of = ''; }
            keepU.add(u.id);
            people.forEach(k => { if (k.of === u.id && !keepP.has(k.id)) walk(k.id); });
        });
    };
    walk(top.id);
    const fam = {
        name: famLine(raw.name, FAM_LIMITS.name) || 'A family',
        top: top.id,
        root: typeof raw.root === 'string' && keepP.has(raw.root) ? raw.root : top.id,
        people: people.filter(p => keepP.has(p.id)),
        unions: unions.filter(u => keepU.has(u.id)),
        scandals: [],
        edited: ''
    };
    fam.people.forEach(p => { if (p.of && !keepU.has(p.of)) p.of = ''; });
    if (Array.isArray(raw.scandals)) {
        raw.scandals.forEach(s => {
            if (!s || typeof s !== 'object' || fam.scandals.length >= FAM_LIMITS.scandals) return;
            const text = famText(s.text, FAM_LIMITS.scandal);
            const who = Array.isArray(s.who) ? s.who.filter(id => typeof id === 'string').slice(0, 6) : [];
            // Every name the text uses must still be in the family.
            const used = [...text.matchAll(/\{(\d)\}/g)].map(m => Number(m[1]));
            if (!text || who.some(id => !keepP.has(id)) || used.some(n => n >= who.length)) return;
            fam.scandals.push({ text, who });
        });
    }
    const edited = new Date(typeof raw.edited === 'string' ? raw.edited : NaN);
    if (!isNaN(edited)) fam.edited = edited.toISOString();
    return fam;
}

// People may only point at notebook entries that exist (ids), never at the family's own entry.
function famSetLinks(fam, ids, self) {
    fam.people.forEach(p => { if (p.to && (!ids.has(p.to) || p.to === self)) p.to = ''; });
}

// ── Reading a family ──────────────────────────────────────
function famPerson(fam, id) {
    return fam.people.find(p => p.id === id) || null;
}

function famUnion(fam, id) {
    return fam.unions.find(u => u.id === id) || null;
}

// Years since they were born.
function famBorn(p) {
    return p.age + (p.dead ? p.ago : 0);
}

// Born into the family (or its oldest ancestor), rather than married in.
function famIsBlood(fam, p) {
    return p.id === fam.top || !!p.of;
}

// Their own unions (as the one born into the family), in order.
function famUnionsOf(fam, id) {
    return fam.unions.filter(u => u.a === id);
}

// The union they married into, or null.
function famMarriedInto(fam, id) {
    return fam.unions.find(u => u.b === id) || null;
}

// A union's children, eldest first.
function famKids(fam, uid) {
    return fam.people.filter(p => p.of === uid).sort((x, y) => famBorn(y) - famBorn(x));
}

function famParents(fam, p) {
    const u = p.of && famUnion(fam, p.of);
    return u ? [u.a, u.b].filter(Boolean).map(id => famPerson(fam, id)).filter(Boolean) : [];
}

function famPartners(fam, p) {
    const own = famUnionsOf(fam, p.id).filter(u => u.b).map(u => ({ u, other: famPerson(fam, u.b) }));
    const into = famMarriedInto(fam, p.id);
    return into ? [{ u: into, other: famPerson(fam, into.a) }] : own;
}

function famGenerations(fam) {
    const depth = (id, d) => Math.max(d, ...famUnionsOf(fam, id).flatMap(u => famKids(fam, u.id).map(k => depth(k.id, d + 1))));
    return depth(fam.top, 1);
}

// "aged 54", "a baby", "died at 61".
function famAgeShort(p) {
    if (p.dead) return `✝ died at ${p.age}`;
    return p.age ? `aged ${p.age}` : 'a baby';
}

function famAgeText(p) {
    if (!p.dead) return p.age ? `Aged ${p.age}.` : 'A baby, not a year old.';
    const when = p.ago ? `${p.ago} ${p.ago === 1 ? 'year' : 'years'} ago` : 'this year';
    return `Died at ${p.age}${p.cause ? ', ' + p.cause : ''}, ${when}.`;
}

// The house's own race: the oldest ancestor's.
function famRace(fam) {
    const t = famPerson(fam, fam.top);
    return t ? t.race : 'human';
}

function famScandalText(fam, s) {
    return s.text.replace(/\{(\d)\}/g, (m, n) => { const p = famPerson(fam, s.who[Number(n)]); return p ? p.name : 'someone'; });
}

function famSummary(fam) {
    const head = famPerson(fam, fam.root);
    const n = fam.people.length, g = famGenerations(fam);
    const lead = head ? ` ${head.dead ? 'At its head was' : 'At its head:'} ${head.title ? head.title + ' ' : ''}${head.name}${head.dead ? '' : head.age ? `, aged ${head.age}` : ''}.` : '';
    return `${n} ${n === 1 ? 'person' : 'people'} over ${g} ${g === 1 ? 'generation' : 'generations'}.${lead}`;
}

// One line about a person: who they are to the family, their age or death, their partners and parents.
function famPersonLine(fam, p) {
    const bits = [];
    if (p.title) bits.push(p.title + '.');
    if (p.race !== famRace(fam)) bits.push(famCapital(p.race) + '.');
    bits.push(famAgeText(p));
    const partners = famPartners(fam, p).filter(x => x.other);
    if (partners.length) {
        bits.push(partners.map(({ u, other }) => `${u.kind === 'apart' ? 'Once married to' : u.kind === 'secret' ? 'Secretly with' : 'Married to'} ${other.name}.`).join(' '));
    }
    const parents = famParents(fam, p);
    if (parents.length) bits.push(`Child of ${parents.map(x => x.name).join(' and ')}.`);
    return bits.join(' ');
}

// The whole family as text (Copy, the notebook's Copy All), generation by generation.
function famAsText(fam) {
    const out = [fam.name, famSummary(fam), ''];
    const rows = [];
    const walk = (id, d) => {
        (rows[d] = rows[d] || []).push(id);
        famUnionsOf(fam, id).forEach(u => {
            if (u.b) rows[d].push(u.b);
            famKids(fam, u.id).forEach(k => walk(k.id, d + 1));
        });
    };
    walk(fam.top, 0);
    rows.forEach((ids, d) => {
        out.push(`Generation ${d + 1}`);
        ids.forEach(id => {
            const p = famPerson(fam, id);
            out.push(`- ${p.name}: ${famPersonLine(fam, p)}${p.note ? ' Note: ' + p.note : ''}`);
        });
        out.push('');
    });
    if (fam.scandals.length) {
        out.push('Family secrets');
        fam.scandals.forEach(s => out.push('- ' + famScandalText(fam, s)));
    }
    return out.join('\n').trim();
}

// ── Editing ───────────────────────────────────────────────
function famNewId(fam, prefix) {
    const taken = new Set([...fam.people.map(p => p.id), ...fam.unions.map(u => u.id)]);
    for (let n = fam.people.length + fam.unions.length; ; n++) {
        const id = prefix + n.toString(36);
        if (!taken.has(id)) return id;
    }
}

// Add a person (a plain object with the person fields) as someone's partner, child, sibling, or parent.
// rel: 'spouse' | 'child' | 'sibling' | 'parent'. uid: the union a child is born to ('' = a new one, no partner named).
// Returns the new person's id, or a reason it can't be done ({ why }).
function famAdd(fam, id, rel, person, uid = '', partner = null) {
    const p = famPerson(fam, id);
    if (!p) return { why: 'They are no longer in the family.' };
    if (fam.people.length + (partner ? 2 : 1) > FAM_LIMITS.people) return { why: `A family holds ${FAM_LIMITS.people} people at most.` };
    if (fam.unions.length >= FAM_LIMITS.unions) return { why: 'This family has as many marriages as it can hold.' };
    const np = { ...person, id: famNewId(fam, 'p'), of: '' };
    if (rel === 'spouse') {
        if (!famIsBlood(fam, p)) return { why: 'Partners who married in are shown in one marriage only. Add the new partner to someone born into the family.' };
        fam.people.push(np);
        fam.unions.push({ id: famNewId(fam, 'u'), a: p.id, b: np.id, kind: 'wed' });
    } else if (rel === 'child') {
        let u = uid && famUnion(fam, uid);
        if (!famIsBlood(fam, p)) u = famMarriedInto(fam, p.id);
        else if (!u || u.a !== p.id) {
            u = { id: famNewId(fam, 'u'), a: p.id, b: '', kind: 'wed' };
            fam.unions.push(u);
        }
        np.of = u.id;
        fam.people.push(np);
    } else if (rel === 'sibling') {
        if (!p.of) return { why: "Add their parents first: a brother or sister hangs from the same parents." };
        np.of = p.of;
        fam.people.push(np);
    } else if (rel === 'parent') {
        if (!famCanAddParents(fam, p)) return { why: 'Only the oldest ancestor can get parents: the tree grows from one line at the top.' };
        // Their partner at the top swaps places with them, so the line runs through them.
        const into = famMarriedInto(fam, p.id);
        if (into) { into.b = into.a; into.a = p.id; }
        const u = { id: famNewId(fam, 'u'), a: np.id, b: '', kind: 'wed' };
        fam.people.push(np);
        if (partner) {
            const other = { ...partner, id: famNewId(fam, 'p'), of: '' };
            fam.people.push(other);
            u.b = other.id;
        }
        fam.unions.push(u);
        p.of = u.id;
        fam.top = np.id;
    } else {
        return { why: 'Unknown relation.' };
    }
    return np.id;
}

// The oldest ancestor, or the one partner of an oldest ancestor with no other marriage.
function famCanAddParents(fam, p) {
    if (p.id === fam.top) return true;
    const into = famMarriedInto(fam, p.id);
    return !!into && into.a === fam.top && famUnionsOf(fam, fam.top).length === 1;
}

// Who goes when a person is removed: someone born into the family takes their own marriages,
// partners, and descendants along; a partner who married in goes alone. Returns ids, or null
// when they can't go (the oldest ancestor with no one to take their place).
function famRemoval(fam, id) {
    const p = famPerson(fam, id);
    if (!p) return null;
    if (!famIsBlood(fam, p)) return [id];
    if (id === fam.top) {
        const own = famUnionsOf(fam, id);
        if (own.length !== 1) return null;
        const u = own[0], kids = famKids(fam, u.id);
        if (!u.b && kids.length !== 1) return null;
        return [id];
    }
    const out = [];
    const walk = pid => {
        out.push(pid);
        famUnionsOf(fam, pid).forEach(u => {
            if (u.b) out.push(u.b);
            famKids(fam, u.id).forEach(k => walk(k.id));
        });
    };
    walk(id);
    return out;
}

// Remove them (see famRemoval). Returns how many people went, or 0 when they can't go.
function famRemove(fam, id) {
    const gone = famRemoval(fam, id);
    if (!gone) return 0;
    const p = famPerson(fam, id);
    if (id === fam.top) {
        const u = famUnionsOf(fam, id)[0];
        if (u.b) {
            // Their partner becomes the oldest ancestor.
            u.a = u.b;
            u.b = '';
            fam.top = u.a;
        } else {
            const kid = famKids(fam, u.id)[0];
            kid.of = '';
            fam.top = kid.id;
            fam.unions = fam.unions.filter(x => x !== u);
        }
    } else if (!famIsBlood(fam, p)) {
        fam.unions.forEach(u => { if (u.b === id) u.b = ''; });
    }
    const set = new Set(gone);
    fam.people = fam.people.filter(x => !set.has(x.id));
    fam.unions = fam.unions.filter(u => set.has(u.a) ? false : true);
    fam.scandals = fam.scandals.filter(s => !s.who.some(w => set.has(w)));
    if (set.has(fam.root)) fam.root = fam.top;
    return gone.length;
}

// ── Layout and drawing ────────────────────────────────────
// Generations in rows: each person born into the family with their partners beside them
// (one partner on the right; with two or more, the first on the left), their children
// centred below, a line from each marriage (or from a lone parent) to a bar over its children.
function famLayout(fam) {
    const B = FAM_BOX;
    const width = new Map(), boxes = [], marriages = [], drops = [];
    const unitOf = id => {
        const partners = famUnionsOf(fam, id).filter(u => u.b).map(u => u.b);
        return partners.length >= 2 ? [partners[0], id, ...partners.slice(1)] : [id, ...partners];
    };
    const kidsOf = id => famUnionsOf(fam, id).flatMap(u => famKids(fam, u.id));
    const measure = id => {
        const unit = unitOf(id).length * B.w + (unitOf(id).length - 1) * B.spouse;
        const kids = kidsOf(id);
        const kw = kids.reduce((s, k) => s + measure(k.id), 0) + Math.max(0, kids.length - 1) * B.gap;
        const w = Math.max(unit, kw);
        width.set(id, w);
        return w;
    };
    const xs = new Map();
    let depthMax = 0;
    const place = (id, left, d) => {
        depthMax = Math.max(depthMax, d);
        const w = width.get(id), unit = unitOf(id);
        const unitW = unit.length * B.w + (unit.length - 1) * B.spouse;
        const y = B.pad + d * (B.h + B.row);
        let x = left + (w - unitW) / 2;
        unit.forEach(pid => { xs.set(pid, x); boxes.push({ id: pid, x, y, blood: pid === id }); x += B.w + B.spouse; });
        const kids = kidsOf(id);
        const kw = kids.reduce((s, k) => s + width.get(k.id), 0) + Math.max(0, kids.length - 1) * B.gap;
        let cx = left + (w - kw) / 2;
        kids.forEach(k => { place(k.id, cx, d + 1); cx += width.get(k.id) + B.gap; });
        const own = famUnionsOf(fam, id), withKids = own.filter(u => famKids(fam, u.id).length);
        own.forEach(u => {
            const px = xs.get(id);
            let from;
            if (u.b) {
                const sx = xs.get(u.b), lo = Math.min(px, sx), hi = Math.max(px, sx);
                const next = Math.abs(sx - px) <= B.w + B.spouse + 1;
                // A partner further along than the next box: the line goes over the boxes between.
                marriages.push({ x1: lo + B.w, x2: hi, y: y + B.h / 2, kind: u.kind, over: !next, ox1: px + B.w / 2, ox2: sx + B.w / 2, oy: y });
                from = next ? { x: (lo + B.w + hi) / 2, y: y + B.h / 2 } : { x: sx + B.w / 2, y: y + B.h };
            } else {
                from = { x: px + B.w / 2, y: y + B.h };
            }
            const kids = famKids(fam, u.id);
            if (!kids.length) return;
            const k = withKids.indexOf(u), spread = (k - (withKids.length - 1) / 2) * 8;
            const bar = y + B.h + B.row / 2 + spread;
            drops.push({ from, bar, kids: kids.map(c => xs.get(c.id) + B.w / 2), kidY: y + B.h + B.row });
        });
    };
    measure(fam.top);
    place(fam.top, B.pad, 0);
    const W = Math.ceil(B.pad * 2 + width.get(fam.top));
    const H = Math.ceil(B.pad * 2 + depthMax * (B.h + B.row) + B.h);
    return { W, H, boxes, marriages, drops };
}

function famClip(s, n) {
    return s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s;
}

// The tree as an SVG string. o: { sel: selected id, cls: class prefix ('ft'), label }
function famSvg(fam, lay, o = {}) {
    const B = FAM_BOX, c = o.cls || 'ft', race = famRace(fam);
    const e = s => String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
    const lines = [];
    lay.marriages.forEach(m => {
        const cls = `${c}-wed ${c}-${m.kind}`;
        if (m.over) lines.push(`<path class="${cls}" d="M${m.ox1} ${m.oy}V${m.oy - 10}H${m.ox2}V${m.oy}"/>`);
        else lines.push(`<path class="${cls}" d="M${m.x1} ${m.y - 3}H${m.x2}M${m.x1} ${m.y + 3}H${m.x2}"/>`);
    });
    lay.drops.forEach(d => {
        const lo = Math.min(d.from.x, ...d.kids), hi = Math.max(d.from.x, ...d.kids);
        lines.push(`<path class="${c}-line" d="M${d.from.x} ${d.from.y}V${d.bar}M${lo} ${d.bar}H${hi}${d.kids.map(x => `M${x} ${d.bar}V${d.kidY}`).join('')}"/>`);
    });
    const boxes = lay.boxes.map(b => {
        const p = famPerson(fam, b.id);
        const second = p.title || (p.race !== race ? famCapital(p.race) : b.blood ? '' : 'Married in');
        const label = `${p.name}${p.title ? ', ' + p.title : ''}. ${famAgeText(p)}`;
        const cls = [`${c}-p`, b.blood ? `${c}-blood` : `${c}-in`, p.dead ? `${c}-dead` : '', p.id === fam.root ? `${c}-root` : '', p.id === o.sel ? `${c}-sel` : ''].filter(Boolean).join(' ');
        return `<g class="${cls}" data-person="${e(p.id)}" tabindex="0" role="button" aria-label="${e(label)}" aria-pressed="${p.id === o.sel}">
            <title>${e(label)}</title>
            <rect class="${c}-box" x="${b.x}" y="${b.y}" width="${B.w}" height="${B.h}" rx="6"/>
            <text class="${c}-n" x="${b.x + B.w / 2}" y="${b.y + 19}">${e(famClip(p.name, 22))}</text>
            <text class="${c}-t" x="${b.x + B.w / 2}" y="${b.y + 36}">${e(famClip(second, 26))}</text>
            <text class="${c}-a" x="${b.x + B.w / 2}" y="${b.y + 52}">${e(famAgeShort(p))}</text>
        </g>`;
    }).join('');
    return `<svg class="${c}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${lay.W} ${lay.H}" width="${lay.W}" height="${lay.H}" role="group" aria-label="${e(o.label || 'Family tree of ' + fam.name)}">${lines.join('')}${boxes}</svg>`;
}
