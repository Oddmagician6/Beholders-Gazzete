/* ============================================
   WORLDBUILDER: NOTEBOOK TAB (F38)
   The campaign notebook from notebook.js: every saved roll (Worldbuilder tabs and the
   NPC page), newest first, each with its link back, notes, and links to other entries.
   Export downloads the whole world as JSON; Import folds a notebook file into this one.
   Nothing here rolls, and the URL holds only the tab: the notebook lives in this browser.
   URL: ?tab=notebook
   ============================================ */

const nbView = { open: new Set(), removing: null, clearing: false };
let nbNoteTimer = null;

function nbKindOpt(kind) {
    return NB_KINDS[kind] || { icon: '📄', label: kind };
}

function nbMatches(e, kind, q) {
    if (kind !== 'all' && e.kind !== kind) return false;
    return !q || `${e.title} ${e.sub} ${e.notes}`.toLowerCase().includes(q);
}

function nbChipsHTML(nb, e) {
    if (!e.links.length) return '';
    return `<p class="nb-chips">🔗 ${e.links.map(l => {
        const o = nbFind(nb, l);
        return o ? `<span class="nb-chip"><button type="button" class="nb-jump" data-to="${esc(o.id)}">${nbKindOpt(o.kind).icon} ${esc(o.title)}</button><button type="button" class="nb-unlink" data-id="${esc(e.id)}" data-to="${esc(o.id)}" aria-label="Unlink ${esc(o.title)}" title="Unlink">✕</button></span>` : '';
    }).join('')}</p>`;
}

function nbEntryHTML(nb, e) {
    const k = nbKindOpt(e.kind);
    const others = nb.entries.filter(o => o.id !== e.id && !e.links.includes(o.id));
    const removing = nbView.removing === e.id;
    return `<article class="nb-entry" id="nb-e-${esc(e.id)}">
        <div class="nb-top">
            <span class="nb-icon" aria-hidden="true">${k.icon}</span>
            <div class="nb-main">
                <a class="nb-title" href="${esc(e.href)}">${esc(e.title)}</a><span class="wb-tag">${esc(k.label)}</span>
                ${e.sub ? `<p class="nb-sub">${esc(e.sub)}</p>` : ''}
                ${nbChipsHTML(nb, e)}
            </div>
        </div>
        <details class="nb-more" data-id="${esc(e.id)}"${nbView.open.has(e.id) ? ' open' : ''}>
            <summary>📝 Notes${e.notes ? ' ✓' : ''} and links</summary>
            <textarea class="nb-notes" data-id="${esc(e.id)}" rows="4" maxlength="${NB_LIMITS.notes}" aria-label="Notes on ${esc(e.title)}"
                placeholder="What happened here, who the party met, what you changed…">${esc(e.notes)}</textarea>
            <div class="nb-row">
                ${others.length ? `<label class="nb-linkto">🔗 Link to <select class="nb-addlink" data-id="${esc(e.id)}">
                    <option value="">Choose an entry…</option>
                    ${others.map(o => `<option value="${esc(o.id)}">${nbKindOpt(o.kind).icon} ${esc(o.title)}</option>`).join('')}
                </select></label>` : ''}
                <span class="nb-row-actions">
                    <a class="btn" href="${esc(e.href)}">Open →</a>
                    <button type="button" class="btn nb-remove" data-id="${esc(e.id)}">${removing ? '⚠️ Click again to remove' : '🗑️ Remove'}</button>
                </span>
            </div>
            <p class="wb-small">Saved ${esc(new Date(e.added).toLocaleDateString())}</p>
        </details>
    </article>`;
}

function renderNotebook(nb = nbLoad()) {
    const name = document.getElementById('nb-name');
    if (document.activeElement !== name) name.value = nb.name;
    const kind = document.getElementById('nb-kind').value;
    const q = document.getElementById('nb-search').value.trim().toLowerCase();
    const shown = nb.entries.filter(e => nbMatches(e, kind, q)).sort((a, b) => b.added.localeCompare(a.added));
    const links = nb.entries.reduce((n, e) => n + e.links.length, 0) / 2;
    document.getElementById('nb-count').textContent = nb.entries.length
        ? `${nb.entries.length} ${nb.entries.length === 1 ? 'entry' : 'entries'} · ${links} ${links === 1 ? 'link' : 'links'}${shown.length < nb.entries.length ? ` · showing ${shown.length}` : ''}`
        : '';
    const list = document.getElementById('nb-list');
    if (!nb.entries.length) {
        list.innerHTML = `<div class="nb-empty">
            <p>📓 The notebook is empty.</p>
            <p class="wb-small">Roll something on any tab and press 📓 Save to Notebook (NPCs save from the <a href="npc-generator.html">Town Square</a>). Saved rolls land here, where you can add notes and link them together. Or import a notebook file below.</p>
        </div>`;
    } else if (!shown.length) {
        list.innerHTML = '<p class="nb-empty wb-small">Nothing in the notebook matches.</p>';
    } else {
        list.innerHTML = shown.map(e => nbEntryHTML(nb, e)).join('');
    }
    document.getElementById('nb-clear').textContent = nbView.clearing ? '⚠️ Click again to clear everything' : '🗑️ Clear';
    ['nb-export', 'nb-copy', 'nb-clear'].forEach(id => { document.getElementById(id).disabled = !nb.entries.length; });
}

// Change the stored notebook and redraw.
function nbEdit(fn) {
    const nb = nbLoad();
    fn(nb);
    if (!nbStore(nb)) flash('nb-status', "⚠️ This browser won't keep a notebook (storage is off).");
}

function nbJump(id) {
    let el = document.getElementById('nb-e-' + id);
    if (!el) {
        document.getElementById('nb-kind').value = 'all';
        document.getElementById('nb-search').value = '';
        renderNotebook();
        el = document.getElementById('nb-e-' + id);
    }
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.remove('nb-flash');
    void el.offsetWidth;
    el.classList.add('nb-flash');
}

function nbAsText(nb) {
    const out = [nb.name || 'Campaign notebook', ''];
    nb.entries.slice().sort((a, b) => a.added.localeCompare(b.added)).forEach(e => {
        out.push(`${nbKindOpt(e.kind).label}: ${e.title}`);
        if (e.sub) out.push(e.sub);
        if (e.notes) out.push('Notes: ' + e.notes);
        const linked = e.links.map(l => nbFind(nb, l)).filter(Boolean).map(o => o.title);
        if (linked.length) out.push('Linked to: ' + linked.join('; '));
        out.push(new URL(e.href, location.href).href, '');
    });
    return out.join('\n').trim();
}

function nbExport() {
    const nb = nbLoad();
    if (!nb.entries.length) return;
    const url = URL.createObjectURL(new Blob([nbExportText(nb)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = nbFileName(nb);
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    flash('nb-status', '💾 Notebook exported. Import that file to bring the world back, here or in another browser.');
}

function nbImport(file) {
    if (!file) return;
    if (file.size > NB_LIMITS.file) { flash('nb-status', '⚠️ That file is too big to be a notebook.'); return; }
    file.text().then(text => {
        const { nb: incoming, dropped } = nbParseFile(text);
        const nb = nbLoad();
        const r = nbMerge(nb, incoming);
        if (!nbStore(nb)) throw new Error("This browser won't keep a notebook (storage is off).");
        const bits = [`📂 Imported ${r.added} ${r.added === 1 ? 'entry' : 'entries'}`];
        if (r.merged) bits.push(`${r.merged} already here`);
        if (dropped) bits.push(`${dropped} skipped as unreadable`);
        if (r.full) bits.push(`${r.full} left out (the notebook is full)`);
        flash('nb-status', bits.join(', ') + '.');
    }).catch(err => flash('nb-status', '⚠️ ' + (err && err.message ? err.message : "That file couldn't be read.")));
}

function setupNotebook() {
    const kind = document.getElementById('nb-kind');
    Object.entries(NB_KINDS).forEach(([key, k]) => kind.add(new Option(`${k.icon} ${k.label}`, key)));
    kind.addEventListener('change', () => renderNotebook());
    document.getElementById('nb-search').addEventListener('input', () => renderNotebook());

    const name = document.getElementById('nb-name');
    name.addEventListener('input', () => {
        const nb = nbLoad();
        nb.name = nbText(name.value, NB_LIMITS.name);
        nbStore(nb, true);
    });

    const list = document.getElementById('nb-list');
    list.addEventListener('click', e => {
        const jump = e.target.closest('.nb-jump');
        if (jump) { nbJump(jump.dataset.to); return; }
        const unlink = e.target.closest('.nb-unlink');
        if (unlink) { nbEdit(nb => nbUnlink(nb, unlink.dataset.id, unlink.dataset.to)); return; }
        const remove = e.target.closest('.nb-remove');
        if (remove) {
            const id = remove.dataset.id;
            if (nbView.removing === id) {
                nbView.removing = null;
                nbView.open.delete(id);
                nbEdit(nb => nbRemove(nb, id));
            } else {
                nbView.removing = id;
                renderNotebook();
                setTimeout(() => { if (nbView.removing === id) { nbView.removing = null; renderNotebook(); } }, 4000);
            }
        }
    });
    list.addEventListener('change', e => {
        const sel = e.target.closest('.nb-addlink');
        if (sel && sel.value) nbEdit(nb => nbLink(nb, sel.dataset.id, sel.value));
    });
    // Notes save as you type (without a redraw, so the cursor stays put).
    list.addEventListener('input', e => {
        const box = e.target.closest('.nb-notes');
        if (!box) return;
        clearTimeout(nbNoteTimer);
        nbNoteTimer = setTimeout(() => {
            const nb = nbLoad();
            const entry = nbFind(nb, box.dataset.id);
            if (!entry) return;
            entry.notes = nbText(box.value, NB_LIMITS.notes);
            if (!nbStore(nb, true)) flash('nb-status', "⚠️ This browser won't keep a notebook (storage is off).");
        }, 400);
    });
    list.addEventListener('toggle', e => {
        const d = e.target;
        if (!d.classList || !d.classList.contains('nb-more')) return;
        d.open ? nbView.open.add(d.dataset.id) : nbView.open.delete(d.dataset.id);
    }, true);

    document.getElementById('nb-export').addEventListener('click', nbExport);
    const file = document.getElementById('nb-file');
    document.getElementById('nb-import').addEventListener('click', () => file.click());
    file.addEventListener('change', () => { nbImport(file.files[0]); file.value = ''; });
    document.getElementById('nb-copy').addEventListener('click', () => {
        const nb = nbLoad();
        if (nb.entries.length) copyText(nbAsText(nb), 'nb-status', 'the notebook');
    });
    document.getElementById('nb-clear').addEventListener('click', () => {
        if (!nbView.clearing) {
            nbView.clearing = true;
            renderNotebook();
            setTimeout(() => { if (nbView.clearing) { nbView.clearing = false; renderNotebook(); } }, 4000);
            return;
        }
        nbView.clearing = false;
        nbView.open.clear();
        const name = nbLoad().name;
        if (nbStore({ name, entries: [] })) flash('nb-status', '🗑️ Notebook cleared.');
    });

    nbOnChange(nb => renderNotebook(nb));
    renderNotebook();
}

WORLD_TABS.notebook = {
    setup: setupNotebook,
    params: () => worldUrlFor('notebook', {}),
    apply: () => { renderNotebook(); return true; },
    fresh: () => renderNotebook(),
    rolled: () => true
};
