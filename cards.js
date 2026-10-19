/* ============================================
   CUT-OUT CARDS (F61; F67 adds feature and item cards): poker-size cards,
   63 × 88 mm, nine to a page on Letter or A4. Page-free: these return HTML,
   and cards.css draws it (the same look on screen and on paper).
   spellCardHtml needs a SPELLS_DATA row, spellSummary() (spell-summaries.js),
   and spellSlug() (spell-detail.js).
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
        <p class="gc-foot"><span>${gcEsc(tag)}</span><span>${GC_SITE}/spell/${slug}</span></p>
    </div>`;
}

// Cards (HTML strings) in pages of nine, for printing.
function gcPages(cards, per = 9) {
    const out = [];
    for (let i = 0; i < cards.length; i += per) out.push(`<div class="gc-page">${cards.slice(i, i + per).join('')}</div>`);
    return out.join('');
}

// The @page rule for a paper size ('letter' or 'a4').
function gcPageCss(paper) {
    return `@page { size: ${paper === 'a4' ? 'A4' : 'letter'} portrait; margin: 6mm; }`;
}
