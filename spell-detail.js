/* ============================================
   SPELL DETAIL: the inline spell card that opens from a stat block's spell list
   (NPC Generator, DM Toolbox encounters). Reads SPELLS_DATA (spells-data.js) and
   the page's esc().
   ============================================ */

function spellSlug(name) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function spellByName(name) {
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

function spellDetailHtml(sp) {
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
