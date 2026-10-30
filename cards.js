/* ============================================
   CUT-OUT CARDS (F61 spell cards; F67 feature, attack, and item cards):
   poker-size cards, 63 × 88 mm, nine to a page on Letter or A4. These return
   HTML, and cards.css draws it (the same look on screen and on paper).
   spellCardHtml needs a SPELLS_DATA row, spellSummary() (spell-summaries.js),
   and spellSlug() (spell-detail.js). gcFlow (item and feature cards) measures
   in a page element to carry long text onto more cards.
   ============================================ */

const GC_SITE = 'gazette.ashforgestudio.com';
const GC_SCHOOL_COLORS = {
    Abjuration: '#4080c9', Conjuration: '#2f9a63', Divination: '#b08a2a', Enchantment: '#c940a0',
    Evocation: '#c94040', Illusion: '#9040c9', Necromancy: '#4f8f2f', Transmutation: '#c97040'
};

function gcEsc(s) {
    return String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const gcNth = n => n + (['th', 'st', 'nd', 'rd'][n] || 'th');

// "V, S, M (a bit of fur)" → ['V, S, M', 'a bit of fur']
function gcComponents(text) {
    const m = String(text || '').match(/^([^(]*?)\s*\((.*)\)\s*$/);
    return m ? [m[1], m[2].charAt(0).toLowerCase() + m[2].slice(1)] : [String(text || ''), ''];
}

// One spell card. tag: the small line at the bottom left ("Cleric · prepared").
function spellCardHtml(s, tag = '') {
    const slug = spellSlug(s.name);
    const [comp, mat] = gcComponents(s.components);
    const level = s.level === 0 ? `${s.school} cantrip` : `${gcNth(s.level)}-level ${s.school.toLowerCase()}`;
    const marks = [s.ritual && 'ritual', s.concentration && 'concentration'].filter(Boolean);
    const stat = (k, v) => `<div><dt>${k}</dt><dd>${gcEsc(v)}</dd></div>`;
    return `<div class="gc-card" style="--gc-color:${GC_SCHOOL_COLORS[s.school] || '#8a6a2a'}">
        <div class="gc-head"><h3 class="gc-name">${gcEsc(s.name)}</h3>${s.level ? `<span class="gc-lv" title="${gcNth(s.level)} level">${s.level}</span>` : ''}</div>
        <p class="gc-sub">${gcEsc(level)}${marks.length ? ` · ${marks.join(' · ')}` : ''}</p>
        <dl class="gc-stats">${stat('Casting time', s.cast)}${stat('Range', s.range)}${stat('Components', comp)}${stat('Duration', s.duration)}</dl>
        ${mat ? `<p class="gc-mat">M: ${gcEsc(mat)}</p>` : ''}
        <p class="gc-text">${gcEsc(spellSummary(s))}</p>
        ${s.higher ? '<p class="gc-up">⬆ Stronger from a higher slot</p>' : ''}
        <p class="gc-foot"><span>${gcEsc(tag)}</span><span>${s.hb ? gcEsc(['Homebrew', s.book].filter(Boolean).join(' · ')) : s.v52 ? 'SRD 5.2.1 · CC BY 4.0' : `${GC_SITE}/spell/${slug}`}</span></p>
    </div>`;
}

// Cards (HTML strings) in pages of nine, for printing. backs: each card's back, one per card
// ('spell', 'feature', 'attack', 'magic-item', or 'npc': img/card/<back>.webp). With it, each page of
// fronts is followed by a page of backs, each row mirrored so a back lands behind its own front when
// the sheet is printed on both sides and flipped on the long edge.
function gcPages(cards, per = 9, backs = null) {
    const out = [];
    for (let i = 0; i < cards.length; i += per) {
        const end = Math.min(i + per, cards.length);
        out.push(`<div class="gc-page">${cards.slice(i, end).join('')}</div>`);
        if (!backs) continue;
        const cells = [];
        for (let r = i; r < end; r += 3) {
            cells.push(...[r, r + 1, r + 2].map(j => j < end
                ? `<div class="gc-card gc-back" style="background-image:url('img/card/${backs[j]}.webp')"></div>`
                : '<div class="gc-gap"></div>').reverse());
        }
        out.push(`<div class="gc-page">${cells.join('')}</div>`);
    }
    return out.join('');
}

// Resolves once the back pictures have loaded, so they make it onto the printout.
function gcBacksReady(backs) {
    return Promise.all([...new Set(backs || [])].map(b => {
        const im = new Image();
        im.src = `img/card/${b}.webp`;
        return im.decode().catch(() => {});
    }));
}

// The @page rule for a paper size ('letter' or 'a4').
function gcPageCss(paper) {
    return `@page { size: ${paper === 'a4' ? 'A4' : 'letter'} portrait; margin: 6mm; }`;
}

/* ---------- F67: feature, attack, and magic item cards ---------- */

const GC_RARITY_COLORS = {
    common: '#7a7468', uncommon: '#2f8a4a', rare: '#3a6fc0', 'very rare': '#8a3fc0', legendary: '#c06a1a', artifact: '#b0302a'
};
// Feature cards by where the feature comes from.
const GC_KIND_COLORS = { class: '#8a6a2a', option: '#a0782a', feat: '#7a4a9a', race: '#2f7a5a', background: '#3a6a9a', attack: '#a03a30' };

// "Wondrous item, very rare (requires attunement by a wizard)" → 'very rare'
function gcRarity(typeLine) {
    const m = String(typeLine || '').toLowerCase().match(/\b(very rare|uncommon|common|rare|legendary|artifact)\b/);
    return m ? m[1] : '';
}

// SRD inline marks: ***Heading.*** and **bold**.
function gcInline(text) {
    return gcEsc(text).replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

// Text → blocks for gcFlow: { p: 'a paragraph' } and { rows: ['| a | b |', ...] } (markdown tables, as in magic-items-data.js).
function gcBlocks(text) {
    const out = [];
    String(text || '').split('\n').forEach(line => {
        const t = line.trim();
        if (!t) return;
        if (t.startsWith('|')) {
            if (/^\|[\s|:-]+\|$/.test(t)) return;
            const last = out[out.length - 1];
            if (last && last.rows) last.rows.push(t); else out.push({ rows: [t] });
        } else out.push({ p: t });
    });
    return out;
}

function gcBlockHtml(b) {
    if (b.p !== undefined) return `<p>${gcInline(b.p)}</p>`;
    const cells = r => r.replace(/^\||\|$/g, '').split('|').map(c => gcInline(c.trim()));
    const [head, ...body] = b.rows;
    return `<table><tr>${cells(head).map(c => `<th>${c}</th>`).join('')}</tr>${body.map(r => `<tr>${cells(r).map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</table>`;
}

// Words of a paragraph, keeping a bold run (which may hold spaces) in one piece.
const gcWords = text => String(text).match(/\*\*\*.+?\*\*\*\S*|\*\*.+?\*\*\S*|\S+/g) || [];

/* Flow text over as many cards as it needs. make(bodyHtml, part, total, tight) returns
   one card's HTML, with the body inside its .gc-text. Tries one card at normal type,
   then one card at tight type, then splits at tight type: whole blocks while they fit,
   a paragraph by words, a table by rows (the header row repeats). host: an element in
   the page (a .gc-deck kept out of sight) where cards are measured; fonts should be loaded. */
function gcFlow(host, blocks, make) {
    const fits = (body, part, total, tight) => {
        host.innerHTML = make(body, part, total, tight);
        const t = host.querySelector('.gc-text');
        return !t || t.scrollHeight <= t.clientHeight + 1;
    };
    const all = blocks.map(gcBlockHtml).join('');
    if (fits(all, 1, 1, false)) return [make(all, 1, 1, false)];
    if (fits(all, 1, 1, true)) return [make(all, 1, 1, true)];

    const bodies = [];
    let cur = '';
    const queue = blocks.slice();
    // A later part (no sub line) with a two-digit count, so the measure never beats the real card.
    const ok = body => fits(body, bodies.length ? 10 : 1, 10, true);
    while (queue.length) {
        const b = queue.shift();
        const whole = gcBlockHtml(b);
        if (ok(cur + whole)) { cur += whole; continue; }
        // The largest head of this block that still fits after cur.
        let head = null, rest = null;
        if (b.p !== undefined) {
            const words = gcWords(b.p);
            let lo = 0, hi = words.length - 1;
            while (lo < hi) {
                const mid = Math.ceil((lo + hi) / 2);
                if (ok(cur + gcBlockHtml({ p: words.slice(0, mid).join(' ') }))) lo = mid; else hi = mid - 1;
            }
            if (lo > 0 && (lo >= 4 || !cur)) { head = { p: words.slice(0, lo).join(' ') }; rest = { p: words.slice(lo).join(' ') }; }
        } else if (b.rows.length > 2) {
            let n = 0;
            while (n + 2 < b.rows.length && ok(cur + gcBlockHtml({ rows: b.rows.slice(0, n + 2) }))) n++;
            if (n > 0) { head = { rows: b.rows.slice(0, n + 1) }; rest = { rows: [b.rows[0], ...b.rows.slice(n + 1)] }; }
        }
        if (head) {
            bodies.push(cur + gcBlockHtml(head));
            cur = '';
            queue.unshift(rest);
        } else if (cur) {
            bodies.push(cur);
            cur = '';
            queue.unshift(b);
        } else {
            bodies.push(whole); // can't split further; the card cuts it off at its foot
        }
    }
    if (cur) bodies.push(cur);
    host.innerHTML = '';
    return bodies.map((body, i) => make(body, i + 1, bodies.length, true));
}

// A card with a name, a sub line, optional stats, and a rich-text body; later parts say "continued".
function gcTextCard({ color, name, sub = '', badge = '', stats = '', body, part = 1, total = 1, tight = false, tag = '', link = GC_SITE, cls = '' }) {
    const of = total > 1 ? ` · ${part}/${total}` : '';
    return `<div class="gc-card${cls ? ' ' + cls : ''}${tight ? ' gc-tight' : ''}" style="--gc-color:${color}">
        <div class="gc-head"><h3 class="gc-name">${gcEsc(name)}${part > 1 ? ' <span class="gc-cont">(continued)</span>' : ''}</h3>${badge}</div>
        ${part === 1 && sub ? `<p class="gc-sub">${gcEsc(sub)}</p>` : ''}
        ${part === 1 ? stats : ''}
        <div class="gc-text gc-rich">${body}</div>
        <p class="gc-foot"><span>${gcEsc(tag)}${of}</span><span>${gcEsc(link)}</span></p>
    </div>`;
}

// A magic item by its SRD name and [type line, text] (MAGIC_ITEM_TEXT). One card, or more for long text.
function itemCards(host, name, info, tag = 'Magic item') {
    const rarity = gcRarity(info[0]);
    const badge = /requires attunement/i.test(info[0]) ? '<span class="gc-badge" title="Requires attunement">A</span>' : '';
    return gcFlow(host, gcBlocks(info[1]), (body, part, total, tight) => gcTextCard({
        color: GC_RARITY_COLORS[rarity] || '#8a6a2a', name, sub: info[0], badge, body, part, total, tight, tag
    }));
}

// A feature or trait: { name, text, sub, kind } (kind picks the color). One card, or more for long text.
function featureCards(host, f, tag = '') {
    return gcFlow(host, gcBlocks(f.text), (body, part, total, tight) => gcTextCard({
        color: GC_KIND_COLORS[f.kind] || GC_KIND_COLORS.class, name: f.name, sub: f.sub, body, part, total, tight,
        tag, link: `${GC_SITE}/character-builder`, cls: 'gc-feature'
    }));
}

// An attack: { name, sub, hit, hitLabel, dmg, dmgType, more: [[label, value]], notes: [lines] }. One card.
function attackCardHtml(a, tag = '') {
    const stat = (k, v) => `<div><dt>${k}</dt><dd>${gcEsc(v)}</dd></div>`;
    const dmg = `<div><dt>Damage</dt><dd>${gcEsc(a.dmg)}${a.dmgType ? `<small>${gcEsc(a.dmgType)}</small>` : ''}</dd></div>`;
    const stats = `<dl class="gc-stats gc-big">${stat(a.hitLabel || 'To hit', a.hit)}${dmg}</dl>`
        + (a.more && a.more.length ? `<dl class="gc-stats">${a.more.map(([k, v]) => stat(k, v)).join('')}</dl>` : '');
    return gcTextCard({
        color: GC_KIND_COLORS.attack, name: a.name, sub: a.sub, stats,
        body: (a.notes || []).map(n => `<p>${gcInline(n)}</p>`).join(''), tag, link: `${GC_SITE}/character-builder`
    });
}
