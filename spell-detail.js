/* ============================================
   SPELL DETAIL: the inline spell card that opens from a stat block's spell list
   (NPC Generator, DM Toolbox encounters). Reads SPELLS_DATA (spells-data.js) and
   the page's esc(). On a Pathfinder page (rules-system.js says pf2e) the cards come from
   PF2E_SPELLS (pf2e-spells-data.js) and are drawn in the Pathfinder layout.
   ============================================ */

function spellSlug(name) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function spellPf2e() {
    return typeof ruleSystemId === 'function' && ruleSystemId() === 'pf2e';
}

// A creature's spell name without its notes: "invisibility (at will, self only)" → "invisibility".
function spellBareName(name) {
    return name.replace(/(\s*\([^()]*\))+\s*$/, '').trim();
}

function spellByName(name) {
    if (spellPf2e()) {
        if (typeof PF2E_SPELLS === 'undefined') return null;
        const bare = spellBareName(name).toLowerCase();
        return PF2E_SPELLS[PF2E_SPELL_ALIAS[bare] || spellSlug(bare)] || null;
    }
    if (typeof SPELLS_DATA === 'undefined') return null;
    const key = name.toLowerCase();
    return SPELLS_DATA.find(s => s.name.toLowerCase() === key) || null;
}

// Spell text: paragraphs, ***bold*** run-ins, and "| a | b |" tables (same format as the Spellbook).
function spellTextHtml(text) {
    const out = [];
    let rows = [];
    const flush = () => {
        if (!rows.length) return;
        const cells = rows.filter(r => !/^\|[\s:|-]+\|$/.test(r)).map(r => r.replace(/^\||\|$/g, '').split('|').map(c => esc(c.trim())));
        out.push(`<table>${cells.map((c, i) => `<tr>${c.map(x => i ? `<td>${x}</td>` : `<th>${x}</th>`).join('')}</tr>`).join('')}</table>`);
        rows = [];
    };
    String(text || '').split('\n').forEach(line => {
        if (line.trim().startsWith('|')) { rows.push(line.trim()); return; }
        flush();
        if (line.trim()) out.push(`<p>${esc(line).replace(/\*\*\*(.+?)\*\*\*/g, '<strong>$1</strong>')}</p>`);
    });
    flush();
    return out.join('');
}

const SPELL_PF2E_KIND = { c: 'Cantrip', s: 'Spell', f: 'Focus', r: 'Ritual' };
const SPELL_PF2E_RARITY = { u: 'uncommon', r: 'rare', q: 'unique' };
const SPELL_PF2E_ACTS = { '◆◆◆': '[three actions]', '◆◆': '[two actions]', '◆': '[one action]', '⤾': '[reaction]', '◇': '[free action]' };
const SPELL_PF2E_CAST = { 1: '◆', 2: '◆◆', 3: '◆◆◆', reaction: '⤾', free: '◇' };
const SPELL_PF2E_BOOK = { PC: 'Player Core', PC2: 'Player Core 2', GMC: 'GM Core', MC: 'Monster Core', MC2: 'Monster Core 2', NC: 'NPC Core' };

// Action symbols in escaped text, with words for screen readers.
function spellPf2eActs(html) {
    return html.replace(/◆◆◆|◆◆|◆|⤾|◇/g, a => `<span class="sb-act" role="img" aria-label="${SPELL_PF2E_ACTS[a]}">${a}</span>`);
}

// Pathfinder spell text: paragraphs, **bold**, "- " list items, and "| a | b |" tables.
function spellPf2eTextHtml(text) {
    const out = [];
    let list = [], rows = [];
    const inline = s => spellPf2eActs(esc(s)).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    const flushList = () => {
        if (list.length) out.push(`<ul>${list.map(l => `<li>${inline(l)}</li>`).join('')}</ul>`);
        list = [];
    };
    const flushRows = () => {
        if (rows.length) out.push(spellTextHtml(rows.join('\n')));
        rows = [];
    };
    text.split('\n').forEach(line => {
        if (line.startsWith('| ')) { flushList(); rows.push(line); return; }
        flushRows();
        if (line.startsWith('- ')) { list.push(line.slice(2)); return; }
        flushList();
        out.push(`<p>${inline(line)}</p>`);
    });
    flushList();
    flushRows();
    return out.join('');
}

function spellPf2eCast(t) {
    return SPELL_PF2E_CAST[t] || t.replace(/^(\d) (to|or) (\d)$/, (_, a, w, b) => `${SPELL_PF2E_CAST[a]} ${w} ${SPELL_PF2E_CAST[b]}`);
}

function spellPf2eDetailHtml(sp) {
    const traits = [SPELL_PF2E_RARITY[sp.ra], ...(sp.tr || [])].filter(Boolean);
    const line = (k, v) => v ? `<strong>${k}</strong> ${esc(String(v))}` : '';
    const rows = [
        [line('Traditions', (sp.td || []).join(', '))],
        [`<strong>Cast</strong> ${spellPf2eActs(esc(spellPf2eCast(sp.t)))}`, line('Cost', sp.co), line('Requirements', sp.rq)],
        [line('Range', sp.rg), line('Area', sp.ar), line('Targets', sp.tg)],
        [line('Defense', sp.df), line('Duration', sp.du)],
        [line('Primary Check', sp.pc)],
        sp.sc ? [line('Secondary Casters', sp.sc[0]), line('Secondary Checks', sp.sc[1])] : []
    ].map(r => r.filter(Boolean).join('; ')).filter(Boolean);
    return `<h5>${esc(sp.n)} <span class="sb-spell-rank">${SPELL_PF2E_KIND[sp.k]} ${sp.r}</span></h5>
        ${traits.length ? `<p class="sb-traits">${traits.map(t => `<span>${esc(t)}</span>`).join('')}</p>` : ''}
        ${rows.map(r => `<p class="sb-spell-meta">${r}</p>`).join('')}
        ${spellPf2eTextHtml(sp.x)}
        <p class="sb-spell-meta">${esc(SPELL_PF2E_BOOK[sp.b] || '')}</p>`;
}

function spellDetailHtml(sp) {
    if (spellPf2e()) return spellPf2eDetailHtml(sp);
    const nth = n => n + (['th', 'st', 'nd', 'rd'][n] || 'th');
    const level = sp.level === 0 ? `${sp.school} cantrip` : `${nth(sp.level)}-level ${sp.school.toLowerCase()}${sp.ritual ? ' (ritual)' : ''}`;
    return `<h5>${esc(sp.name)}</h5>
        <p class="sb-spell-meta">${esc(level)} · ${esc(sp.cast)} · ${esc(sp.range)} · ${esc(sp.components)} · ${esc(sp.duration)}</p>
        ${spellTextHtml(sp.desc)}${sp.higher ? `<p><strong>At Higher Levels.</strong> ${esc(sp.higher)}</p>` : ''}`;
}

// Toggle a spell button's card in `box`; any other open spell button in `scope` closes.
function toggleSpellDetail(btn, box, scope = document) {
    const open = btn.getAttribute('aria-expanded') === 'true';
    scope.querySelectorAll('.sb-spell[aria-expanded="true"]').forEach(b => b.setAttribute('aria-expanded', 'false'));
    const sp = !open && spellByName(btn.dataset.spell);
    if (!sp) { box.hidden = true; return; }
    btn.setAttribute('aria-expanded', 'true');
    box.innerHTML = spellDetailHtml(sp);
    box.hidden = false;
}
