/* ============================================
   PATHFINDER ARCHETYPE HELPER (ROADMAP L3 P5.6): the archetypes of Player Core 1
   and 2, each with its dedication and the feats that follow it, by level. With a
   saved Character Builder character (?char=<id>) it checks the prerequisites it can
   read, the two-feat rule (two more feats from an archetype before the next
   dedication), and a multiclass dedication of your own class, and takes a feat into
   an open slot that fits: a class feat slot, a Free Archetype slot (the variant
   rule, c.fa), or a skill or general slot for an archetype skill feat. The picks
   save onto the character in PC_KEY. ?a=<archetype> opens one archetype, ?k= a
   filter (mc, other, mine). Rules come from pf2e-character.js; needs
   pf2e-character-data.js and pf2e-items-data.js (pcClean) before it, and loads
   pf2e-character-text.js for the feat text.
   ============================================ */

const PA_ACTION = { 1: '◆', 2: '◆◆', 3: '◆◆◆', r: '⤾', f: '◇' };
const PA_RARITY = { u: 'uncommon', r: 'rare', q: 'unique' };
const PA_KINDS = { all: 'All', mc: '🔀 Multiclass', other: '🗡️ Other archetypes', mine: '🧝 Yours' };

const pa = { charId: '', c: null, arch: '', q: '', kind: 'all' };

function esc(s) {
    return String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

let flashTimer = 0;
function flash(msg, bad = false) {
    const el = document.getElementById('pa-status');
    el.textContent = msg;
    el.classList.toggle('pa-bad', bad);
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => { el.textContent = ''; }, 6000);
}

const F = k => PF2E_FEATS[k];
const paSlotLevel = slot => Number(slot.replace(/^\D+/, ''));
const paSlotName = slot => {
    const s = pcFeatSlots(pa.c).find(x => x.slot === slot);
    return s ? `level ${s.level} ${s.label.toLowerCase()}` : `level ${paSlotLevel(slot)}`;
};

// ── Address bar ──────────────────────────────────────────
function paFromUrl() {
    const q = urlParams();
    const id = q.get('char') || '';
    const saved = id && pcLoadAll().find(c => c.id === id);
    pa.charId = saved ? id : '';
    pa.c = saved || null;
    pa.arch = Object.hasOwn(pcArchetypes(), q.get('a')) ? q.get('a') : '';
    pa.kind = Object.hasOwn(PA_KINDS, q.get('k')) && (q.get('k') !== 'mine' || pa.c) ? q.get('k') : 'all';
}

function paWriteUrl(push = false) {
    setUrlParams({ char: pa.charId, a: pa.arch, k: pa.kind === 'all' ? '' : pa.kind }, push);
}

// Save the feats and the Free Archetype switch onto the builder character.
function paSave() {
    const fresh = pcLoadAll().find(x => x.id === pa.charId);
    if (!fresh) {
        pa.charId = '';
        pa.c = null;
        flash('That character is gone (deleted in another tab?).', true);
        return;
    }
    fresh.feats = { ...pa.c.feats };
    fresh.fa = pa.c.fa;
    if (!pcSave(fresh)) flash('Could not save: this browser\'s storage is full or blocked.', true);
    pa.c = fresh;
}

// ── Rules text ───────────────────────────────────────────
// Rules text (**bold**, "- " items, "| a | b |" rows, one paragraph a line) -> HTML, as the builder draws it.
function rulesHtml(t) {
    if (!t) return '';
    const out = [];
    let list = null, table = null;
    const flush = () => {
        if (list) { out.push(`<ul>${list.join('')}</ul>`); list = null; }
        if (table) { out.push(`<div class="pa-scroll"><table class="pa-table">${table.join('')}</table></div>`); table = null; }
    };
    const inline = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
    String(t).split('\n').forEach(line => {
        if (/^- /.test(line)) { if (table) flush(); (list = list || []).push(`<li>${inline(line.slice(2))}</li>`); return; }
        if (/^\|.*\|$/.test(line)) {
            if (list) flush();
            const cells = line.slice(1, -1).split('|').map(x => x.trim());
            const tag = table ? 'td' : 'th';
            (table = table || []).push(`<tr>${cells.map(x => `<${tag}>${inline(x)}</${tag}>`).join('')}</tr>`);
            return;
        }
        flush();
        out.push(`<p>${inline(line)}</p>`);
    });
    flush();
    return out.join('');
}

function textBody(key) {
    if (pcTextState !== 2) return '<p class="pa-dim">Loading the rules text…</p>';
    return rulesHtml(pcText(key)) || '<p class="pa-dim">No text.</p>';
}

function textBox(key, summary, open = false) {
    return `<details class="pa-text" data-text="${esc(key)}"${open ? ' open' : ''}><summary>${summary}</summary><div class="pa-text-body">${open ? textBody(key) : ''}</div></details>`;
}

// Fill the open text boxes, loading the text file the first time.
function fillTexts() {
    if (!document.querySelector('details.pa-text[open]')) return;
    pcLoadText(ok => {
        document.querySelectorAll('details.pa-text[open]').forEach(b => {
            b.querySelector('.pa-text-body').innerHTML = ok ? textBody(b.dataset.text) : '<p class="pa-dim">The rules text could not load. Check your connection and reload.</p>';
        });
    });
}

// ── Checks ───────────────────────────────────────────────
// For each open slot, the archetype feats that fit it: { slot: Set }.
function paOpenSlots() {
    const out = {};
    if (!pa.c) return out;
    pcFeatSlots(pa.c).filter(s => !pa.c.feats[s.slot]).forEach(s => {
        out[s.slot] = new Set(pcFeatsFor(pa.c, s.slot, { archetype: true }).filter(x => x.feat.ar && !x.taken).map(x => x.key));
    });
    return out;
}

function paPrereqs(f, stats) {
    if (!f.pr || !f.pr.length) return '';
    return `<span class="pa-pre">Prerequisites: ${f.pr.map(p => {
        const ok = stats ? pcPrereqMet(pa.c, p, stats) : null;
        return `<span class="${ok === true ? 'pa-ok' : ok === false ? 'pa-no' : ''}">${ok === false ? '✗ ' : ok === true ? '✓ ' : ''}${esc(p)}</span>`;
    }).join('; ')}</span>`;
}

// ✓ every prerequisite the sheet can read is met, ✗ one isn't, '' it can't tell.
function paPrereqMark(f, stats) {
    if (!stats || !f.pr || !f.pr.length) return '';
    const ok = f.pr.map(p => pcPrereqMet(pa.c, p, stats));
    if (ok.includes(false)) return '<span class="pa-no" title="A prerequisite isn\'t met">✗</span>';
    return ok.every(x => x === true) ? '<span class="pa-ok" title="Prerequisites met">✓</span>' : '';
}

// ── Drawing ──────────────────────────────────────────────
function renderChars() {
    const sel = document.getElementById('pa-char');
    const list = pcLoadAll();
    sel.innerHTML = '<option value="">📖 Just browsing (no character)</option>'
        + list.map(c => `<option value="${esc(c.id)}"${c.id === pa.charId ? ' selected' : ''}>🧝 ${esc(c.name || 'Unnamed hero')} (${esc(pcLine(c))})</option>`).join('');
    sel.title = list.length ? 'Pick a saved Character Builder character' : 'Characters you save in the Character Builder show up here';
}

function renderSummary(check) {
    const el = document.getElementById('pa-summary');
    const c = pa.c;
    if (!c) {
        el.innerHTML = '<p class="pa-hint">Pick a character saved in the <a href="pathfinder-character-builder">Character Builder</a> to check prerequisites and the two-feat rule, and to take feats into open slots.</p>';
        return;
    }
    const A = pcArchetypes();
    if (!pcParts(c).cls) {
        el.innerHTML = `<p class="pa-hint">${esc(c.name || 'This character')} has no class yet, so there are no feat slots. Pick one in the <a href="pathfinder-character-builder">Character Builder</a>.</p>`;
        return;
    }
    const open = pcFeatSlots(c).filter(s => !c.feats[s.slot] && (s.kind === 'cls' || s.kind === 'arc'));
    let h = `<label class="pa-check"><input type="checkbox" id="pa-fa"${c.fa ? ' checked' : ''}> Free Archetype (a variant rule, with your GM's say-so): an extra archetype feat at every even level</label>`;
    h += `<div class="pa-yours">`;
    if (check.list.length) {
        h += check.list.map(a => `<button type="button" class="pa-chip${a.key === pa.arch ? ' on' : ''}" data-arch="${a.key}">${esc(A[a.key].n)} <small>level ${a.level} · ${a.feats.length} more</small></button>`).join('');
    } else h += '<span class="pa-dim">No archetype yet. A dedication takes a class feat slot from level 2.</span>';
    h += '</div>';
    if (check.need) h += `<p class="pa-rule">📏 Two-feat rule: take ${check.need} more ${esc(A[check.current].n)} feat${check.need === 1 ? '' : 's'} before another dedication.</p>`;
    else if (check.list.length) h += `<p class="pa-rule">📏 You can take a new dedication now (you have two feats after your last one).</p>`;
    check.issues.forEach(x => { h += `<p class="pa-warn">⚠️ ${esc(paSlotName(x.slot))}: ${esc(x.text)}</p>`; });
    h += `<p class="pa-dim pa-small">${open.length ? `${open.length} open class${c.fa ? ' or free archetype' : ''} feat slot${open.length === 1 ? '' : 's'} up to level ${c.level}.` : `No open class feat slots up to level ${c.level}.`} Raise the level in the Builder to plan ahead. <button type="button" class="pa-btn pa-small" id="pa-open-builder">🧝 Open in the Builder</button></p>`;
    el.innerHTML = h;
}

function paMatches(key, a, check) {
    if (pa.kind === 'mc' && !a.mc) return false;
    if (pa.kind === 'other' && a.mc) return false;
    if (pa.kind === 'mine' && !(check && check.list.some(x => x.key === key))) return false;
    const q = pa.q.trim().toLowerCase();
    if (!q) return true;
    return a.n.toLowerCase().includes(q) || a.feats.some(k => F(k).n.toLowerCase().includes(q));
}

function renderList(check, stats) {
    const A = pcArchetypes();
    document.getElementById('pa-kinds').innerHTML = Object.entries(PA_KINDS).filter(([k]) => k !== 'mine' || pa.c)
        .map(([k, label]) => `<button type="button" class="pa-chip${pa.kind === k ? ' on' : ''}" data-kind="${k}" aria-pressed="${pa.kind === k}">${label}</button>`).join('');
    const keys = Object.keys(A).filter(k => paMatches(k, A[k], check)).sort((x, y) => A[x].n.localeCompare(A[y].n));
    document.getElementById('pa-count').textContent = `${keys.length} of ${Object.keys(A).length} archetypes`;
    document.getElementById('pa-list').innerHTML = keys.length ? keys.map(k => {
        const a = A[k], d = F(a.ded);
        const mine = check && check.list.some(x => x.key === k);
        const own = pa.c && a.mc === pa.c.cls;
        return `<button type="button" class="pa-card${k === pa.arch ? ' on' : ''}${own ? ' pa-off' : ''}" data-arch="${k}" aria-pressed="${k === pa.arch}">
            <b>${esc(a.n)}</b> ${mine ? '<span class="pa-ok" title="You have this dedication">✔</span>' : paPrereqMark(d, stats)}
            <span class="pa-meta">${a.mc ? 'multiclass · ' : ''}${d.ra ? PA_RARITY[d.ra] + ' · ' : ''}level ${a.l} · ${a.feats.length} feats</span>
            ${own ? '<span class="pa-meta">your own class</span>' : ''}</button>`;
    }).join('') : '<p class="pa-dim">No archetype matches. Clear the search or pick another filter.</p>';
}

const featLine = f => `${f.a ? `<span class="pa-act">${PA_ACTION[f.a]}</span> ` : ''}<b>${esc(f.n)}</b> <span class="pa-tag">${f.tr.includes('dedication') ? 'dedication' : f.c === 'skill' ? 'skill' : 'class'} feat ${f.l}${f.ra ? ' · ' + PA_RARITY[f.ra] : ''}</span>`;

// One feat: its line, prerequisites, text, and (with a character) where it is or a slot to take it into.
function featRow(key, ctx) {
    const f = F(key);
    const c = pa.c;
    let act = '';
    if (c && pcParts(c).cls) {
        const at = pcFeatSlots(c).filter(s => c.feats[s.slot] === key);
        act = at.map(s => `<span class="pa-taken">✔ Taken: ${esc(paSlotName(s.slot))} <button type="button" class="pa-x" data-drop="${s.slot}" aria-label="Remove ${esc(f.n)} from the ${esc(paSlotName(s.slot))}" title="Remove">✕</button></span>`).join('');
        if (!at.length || f.mx > 1) {
            const slots = Object.entries(ctx.open).filter(([, set]) => set.has(key)).map(([slot]) => slot);
            if (slots.length) {
                act += `<label class="pa-take">Take it in<select data-take="${key}"><option value="">Pick a slot</option>${slots.map(s => `<option value="${s}">${esc(paSlotName(s))}</option>`).join('')}</select></label>`;
            } else if (!at.length) {
                act += `<span class="pa-dim pa-small">${f.l > c.level ? `From level ${f.l}.` : 'No open slot fits it.'}</span>`;
            }
        }
    }
    return `<li class="pa-feat">${paPrereqs(f, ctx.stats)}${textBox(`ft:${key}`, `${featLine(f)}${f.tr.filter(t => !['archetype', 'dedication', 'multiclass'].includes(t)).length ? ` <span class="pa-tag">${esc(f.tr.filter(t => !['archetype', 'dedication', 'multiclass'].includes(t)).join(', '))}</span>` : ''}`, ctx.openText)}${act ? `<div class="pa-act-row">${act}</div>` : ''}</li>`;
}

function renderDetail(check, stats) {
    const el = document.getElementById('pa-detail');
    const A = pcArchetypes();
    const a = A[pa.arch];
    if (!a) {
        el.innerHTML = '<p class="pa-dim">Pick an archetype above to see its dedication and the feats after it.</p>';
        return;
    }
    const ctx = { open: paOpenSlots(), stats, openText: false };
    const c = pa.c;
    let h = `<div class="pa-top"><h2 class="pa-h" id="pa-detail-h" tabindex="-1">${esc(a.n)} Archetype</h2><button type="button" class="pa-btn pa-small" id="pa-link">🔗 Copy Link</button></div>`;
    if (a.mc) h += `<p class="pa-note">A multiclass archetype: a taste of the ${esc(a.n.toLowerCase())} class. Its dedication's attribute prerequisites are all required.${c && c.cls === a.mc ? ` <b class="pa-no">You're already a ${esc(a.n.toLowerCase())}, so you can't take it.</b>` : ''}</p>`;
    const mine = check && check.list.find(x => x.key === pa.arch);
    if (c && !mine && check.need) h += `<p class="pa-warn">📏 Before this dedication, take ${check.need} more ${esc(A[check.current].n)} feat${check.need === 1 ? '' : 's'} (the two-feat rule).</p>`;
    if (mine) h += `<p class="pa-rule">✔ You took the dedication at level ${mine.level}, and ${mine.feats.length} feat${mine.feats.length === 1 ? '' : 's'} after it.</p>`;
    h += `<h3 class="pa-lvh">Dedication</h3><ul class="pa-feats">${featRow(a.ded, { ...ctx, openText: true })}</ul>`;
    const byLevel = {};
    a.feats.forEach(k => { (byLevel[F(k).l] = byLevel[F(k).l] || []).push(k); });
    Object.keys(byLevel).sort((x, y) => x - y).forEach(l => {
        h += `<h3 class="pa-lvh">Level ${l}</h3><ul class="pa-feats">${byLevel[l].map(k => featRow(k, ctx)).join('')}</ul>`;
    });
    h += '<p class="pa-dim pa-small">✓ and ✗ mark the prerequisites the sheet can read; the rest are up to you and your GM. Feats change your numbers only as text.</p>';
    el.innerHTML = h;
}

function render() {
    const check = pa.c && pcParts(pa.c).cls ? pcArchetypeCheck(pa.c) : null;
    const stats = pa.c ? pcStats(pa.c) : null;
    renderChars();
    renderSummary(check || { list: [], issues: [], need: 0 });
    renderList(check, stats);
    renderDetail(check, stats);
    fillTexts();
}

// ── Actions ──────────────────────────────────────────────
function paCopy(text, done) {
    return (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject())
        .then(() => flash(done), () => flash('Could not copy; select the address and copy it by hand.', true));
}

function paPick(key) {
    pa.arch = key;
    paWriteUrl(true);
    render();
    const h = document.getElementById('pa-detail-h');
    if (h) { h.focus({ preventScroll: true }); h.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
}

function paTake(key, slot) {
    const before = pcArchetypeCheck(pa.c).issues.length;
    pa.c.feats[slot] = key;
    paSave();
    const after = pa.c ? pcArchetypeCheck(pa.c).issues : [];
    render();
    if (after.length > before) flash(`⚠️ ${after[after.length - 1].text}`, true);
    else flash(`✔ ${F(key).n} taken as your ${paSlotName(slot)}.${pcSubFeat(key, paSlotLevel(slot)) ? ' Pick the class feat it gives in the Character Builder.' : ''}`);
}

function onClick(e) {
    const b = e.target.closest('button');
    if (!b || b.disabled) return;
    const d = b.dataset;
    if (d.arch) return paPick(d.arch);
    if (d.kind) { pa.kind = d.kind; paWriteUrl(); return render(); }
    if (d.drop) {
        const name = F(pa.c.feats[d.drop]).n;
        delete pa.c.feats[d.drop];
        delete pa.c.feats['x' + d.drop];   // the class feat a Basic or Advanced X feat gave
        paSave();
        render();
        return flash(`${name} removed. Feats that needed it stay until you change them.`);
    }
    if (b.id === 'pa-link') {
        const p = { a: pa.arch };
        return paCopy(location.origin + location.pathname + '?' + paramsQuery(p), '🔗 Link copied: it opens this archetype without your character.');
    }
    if (b.id === 'pa-open-builder') {
        const c = pcLoadAll().find(x => x.id === pa.charId);
        if (c) pcSave(c);   // newest first, so the builder opens on it
        location.href = 'pathfinder-character-builder';
    }
}

function onChange(e) {
    const el = e.target;
    if (el.dataset.take && el.value) return paTake(el.dataset.take, el.value);
    if (el.id === 'pa-fa') {
        pa.c.fa = el.checked;
        paSave();
        render();
        return flash(el.checked ? '🔀 Free Archetype on: an archetype feat slot at every even level.' : 'Free Archetype off. Feats in those slots are kept on the character but no longer count.');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('year').textContent = new Date().getFullYear();
    paFromUrl();
    paWriteUrl();
    render();

    const tool = document.getElementById('pa-tool');
    tool.addEventListener('click', onClick);
    tool.addEventListener('change', onChange);
    tool.addEventListener('toggle', e => { if (e.target.matches && e.target.matches('details.pa-text') && e.target.open) fillTexts(); }, true);
    document.getElementById('pa-q').addEventListener('input', e => {
        pa.q = e.target.value;
        renderList(pa.c && pcParts(pa.c).cls ? pcArchetypeCheck(pa.c) : null, pa.c ? pcStats(pa.c) : null);
    });
    document.getElementById('pa-char').addEventListener('change', e => {
        pa.charId = e.target.value;
        if (!pa.charId && pa.kind === 'mine') pa.kind = 'all';
        paWriteUrl(true);
        paFromUrl();
        render();
    });
    window.addEventListener('popstate', () => { paFromUrl(); render(); });
    window.addEventListener('storage', e => {
        if (e.key !== PC_KEY) return;
        paFromUrl();
        render();
    });
});
