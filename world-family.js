/* ============================================
   WORLDBUILDER: FAMILIES TAB (F55)
   A family tree from family-engine.js (rollFamily), drawn by family-tree.js (famLayout,
   famSvg): generations in rows, partners side by side, children under each marriage.
   Click anyone to read and edit them: name, title, age, death, notes, a notebook NPC they
   are, and their marriages; add partners, children, brothers and sisters, or parents;
   remove them. The first change files the family in the notebook (kind 'family', the whole
   family in `fam`), found again by its seed and options, so the same link brings the edited
   family back; "Back to the rolled family" undoes every change. A family can also be
   started by hand (no link: ?tab=family&fam=<entry id>).
   The Factions and Town tabs link here with a root= person (famRootLink), and the tree is
   then built around that same NPC.
   URL: ?tab=family&seed=&gens=&size=&race=&root=&rcat=&rage=&rtitle=&house=&facs=&fcount=&ffocus=&fscale=
        or ?tab=family&fam=<notebook entry id>
   ============================================ */

const FAM_FIELDS = { gens: 'fam-gens', size: 'fam-size', race: 'fam-race' };
// A linked faction roll's URL keys (they link the saved family to the saved factions, NB_USES).
const FAM_FROM_KEYS = ['facs', 'fcount', 'ffocus', 'fscale'];

let famState = { seed: null, roll: null, root: null, from: {}, entry: '', sel: '', fit: false, removing: '', backing: false, filing: false };
const famTimers = {};

function famOpts() {
    const v = id => document.getElementById(id).value;
    return { gens: v('fam-gens'), size: v('fam-size'), race: famState.root ? 'random' : v('fam-race') };
}

// The roll's URL params (also its notebook link and signature).
function famRollParams() {
    const params = {};
    Object.entries(FAM_FIELDS).forEach(([key, id]) => {
        const el = document.getElementById(id);
        params[key] = fieldValue(el) === defaultValue(el) || (key === 'race' && famState.root) ? null : el.value;
    });
    params.seed = famState.seed;
    const r = famState.root;
    Object.assign(params, { root: r ? r.seed : null, rcat: r ? r.cat : null, rage: r && r.age ? r.age : null, rtitle: r && r.title ? r.title : null, house: r && r.house ? r.house : null });
    FAM_FROM_KEYS.forEach(k => { params[k] = famState.from[k] || null; });
    return params;
}

function famParams() {
    if (famState.entry) return worldUrlFor('family', { fam: famState.entry });
    return worldUrlFor('family', famRollParams());
}

function famHref() {
    return 'worldbuilder?' + paramsQuery(worldUrlFor('family', famRollParams()));
}

// The person a root= link names, or null.
function famRootFrom(p) {
    const seed = parseSeed(p.get('root'));
    const cat = p.get('rcat');
    if (!seed || !cat || !Object.hasOwn(npcData.professions, cat)) return null;
    const age = NPC_AGE_BUCKETS.includes(p.get('rage')) ? p.get('rage') : '';
    return { seed, cat, age, title: famLine(p.get('rtitle'), FAM_LIMITS.title), house: famLine(p.get('house'), FAM_LIMITS.name) };
}

// push: true = new history entry, false = replace, null = leave the URL alone.
function rollFamilyFor(seed = newSeed(), push = true) {
    famState.seed = seed;
    famState.entry = '';
    famState.roll = rollFamily(seed, { ...famOpts(), root: famState.root });
    famState.sel = '';
    famState.removing = '';
    famState.backing = false;
    renderFamily();
    if (push !== null) setUrlParams(famParams(), push);
}

function applyFamUrl(p) {
    Object.entries(FAM_FIELDS).forEach(([key, id]) => {
        const el = document.getElementById(id);
        if (!setFieldValue(el, p.get(key))) el.value = defaultValue(el);
    });
    famState.root = famRootFrom(p);
    famState.from = {};
    if (parseSeed(p.get('facs'))) FAM_FROM_KEYS.forEach(k => { const v = p.get(k); if (v && /^[a-z0-9]{1,12}$/.test(v)) famState.from[k] = v; });
    famState.sel = '';
    famState.removing = '';
    famState.backing = false;
    const id = p.get('fam');
    if (id && /^[a-z0-9]{1,16}$/.test(id)) {
        famState.entry = id;
        famState.seed = null;
        famState.roll = null;
        renderFamily();
        return true;
    }
    famState.entry = '';
    const seed = parseSeed(p.get('seed'));
    if (!seed) return false;
    rollFamilyFor(seed, null);
    return true;
}

// ── The family on screen ──────────────────────────────────
// Its notebook entry: the one opened by id, or the saved copy of this roll. Null when there is none.
function famEntry(nb) {
    if (famState.entry) {
        const e = nbFind(nb, famState.entry);
        return e && e.kind === 'family' ? e : null;
    }
    if (!famState.seed) return null;
    const p = famRollParams();
    return nbFindRoll(nb, 'family', famState.seed, k => p[k] || '');
}

// { e, fam }: the saved family (with its edits) when there is one, else the roll.
function famNow(nb = nbLoad()) {
    const e = famEntry(nb);
    if (e && e.fam) return { e, fam: e.fam };
    return { e: null, fam: !famState.entry && famState.roll ? famState.roll.fam : null };
}

// Change the family: fn(fam) edits a copy (return false to skip). The first change files it in the notebook.
// quiet: store without redrawing (a name being typed). Returns true when kept.
function famEdit(fn, quiet = false) {
    let nb = nbLoad(), e = famEntry(nb), filed = false;
    if (!e) {
        if (famState.entry || !famState.roll) return false;
        famState.filing = true;
        const r = nbAdd({ kind: 'family', title: famState.roll.fam.name, sub: famSummary(famState.roll.fam), href: famHref(), fam: famState.roll.fam });
        famState.filing = false;
        if (!r || r.full) {
            flash('fam-status', r ? '⚠️ The notebook is full, and your changes are kept there. Remove an entry first.' : "⚠️ This browser won't keep a notebook (storage is off), so it can't keep your changes.");
            return false;
        }
        nb = nbLoad();
        e = famEntry(nb);
        if (!e) return false;
        filed = true;
    }
    famState.filing = false;
    const fam = JSON.parse(JSON.stringify(e.fam));
    if (fn(fam) === false) return false;
    fam.edited = new Date().toISOString();
    const clean = famClean(fam);
    if (!clean) return false;
    famSetLinks(clean, new Set(nb.entries.map(x => x.id)), e.id);
    clean.people.forEach(p => { if (p.to) nbLink(nb, e.id, p.to); });
    if (e.title === e.fam.name && clean.name !== e.fam.name) e.title = nbText(clean.name, NB_LIMITS.title) || e.title;
    e.fam = clean;
    e.sub = nbText(famSummary(clean), NB_LIMITS.sub);
    if (!nbStore(nb, quiet)) { flash('fam-status', "⚠️ This browser won't keep a notebook (storage is off), so it can't keep your changes."); return false; }
    if (filed) flash('fam-status', '📓 This family is in your notebook now. Open this link again and your changes come back.');
    return true;
}

// ── Render ────────────────────────────────────────────────
function famTreeHTML(fam) {
    return famSvg(fam, famLayout(fam), { sel: famState.sel });
}

function famRaceLabel(race) {
    return `${NPC_PORTRAITS[race] || '👤'} ${famCapital(race)}`;
}

function famOptionsHTML(map, value) {
    return Object.entries(map).map(([k, label]) => `<option value="${esc(k)}"${k === value ? ' selected' : ''}>${esc(label)}</option>`).join('');
}

// The notebook's NPC entries a person can be.
function famNpcChoices(nb, p) {
    const list = nb.entries.filter(x => x.kind === 'npc').sort((a, b) => a.title.localeCompare(b.title));
    return `<option value="">Nobody in the notebook</option>${list.map(x => `<option value="${esc(x.id)}"${x.id === p.to ? ' selected' : ''}>🎭 ${esc(x.title)}</option>`).join('')}`;
}

function famRelHTML(fam, p) {
    const bits = [];
    const parents = famParents(fam, p);
    if (parents.length) bits.push(`<p>👪 Child of ${parents.map(x => `<button type="button" class="fam-go" data-go="${esc(x.id)}">${esc(x.name)}</button>`).join(' and ')}.</p>`);
    const marriages = famIsBlood(fam, p) ? famUnionsOf(fam, p.id) : [famMarriedInto(fam, p.id)].filter(Boolean);
    marriages.forEach(u => {
        const other = famPerson(fam, u.a === p.id ? u.b : u.a);
        const kids = famKids(fam, u.id);
        bits.push(`<div class="fam-union">
            <label>${other ? `With <button type="button" class="fam-go" data-go="${esc(other.id)}">${esc(other.name)}</button>` : 'With someone not named'}
                <select class="fam-u" data-u="${esc(u.id)}" aria-label="${esc(other ? `${p.name} and ${other.name}` : `${p.name}'s other parent`)}">${Object.entries(FAM_UNIONS).map(([k, x]) =>
                    `<option value="${k}"${k === u.kind ? ' selected' : ''}>${x.icon} ${x.label}</option>`).join('')}</select></label>
            <span class="wb-small">${kids.length ? `${kids.length} ${kids.length === 1 ? 'child' : 'children'}: ${kids.map(k => esc(k.name.split(' ')[0])).join(', ')}` : 'No children'}</span>
        </div>`);
    });
    return bits.join('');
}

function famPersonHTML(nb, fam, e) {
    const p = famState.sel && famPerson(fam, famState.sel);
    if (!p) return `<h4>👤 Someone in the family</h4><p class="wb-small">Click or tap anyone in the tree (or focus them and press Enter) to read about them and change them.</p>`;
    const blood = famIsBlood(fam, p);
    const to = p.to && nbFind(nb, p.to);
    const own = famUnionsOf(fam, p.id);
    const gone = famRemoval(fam, p.id);
    const childOf = blood && own.length ? `<select id="fam-child-of" aria-label="Which marriage the child is born to">${own.map(u => {
        const o = u.b && famPerson(fam, u.b);
        return `<option value="${esc(u.id)}">with ${esc(o ? o.name.split(' ')[0] : 'someone not named')}</option>`;
    }).join('')}<option value="">with someone not named</option></select>` : '';
    const f = (key, label, value, attrs = '') => `<label>${label} <input type="text" class="fam-f" data-f="${key}" value="${esc(value)}"${attrs}></label>`;
    return `<h4>👤 <span id="fam-p-name">${esc(p.name)}</span> <small>${blood ? (p.id === fam.top ? 'the oldest ancestor shown' : 'born into the family') : 'married into the family'}${p.id === fam.root ? ' · the one this family is about' : ''}</small></h4>
        <div class="fam-fields">
            ${f('name', 'Name', p.name, ` maxlength="${FAM_LIMITS.name}"`)}
            ${f('title', 'Title', p.title, ` maxlength="${FAM_LIMITS.title}" placeholder="Heir, Knight, the black sheep"`)}
            <label>Gender <select class="fam-f" data-f="gender">${famOptionsHTML(FAM_GENDERS, p.gender)}</select></label>
            <label>Race <select class="fam-f" data-f="race">${famOptionsHTML(Object.fromEntries(FAM_RACES.map(r => [r, famRaceLabel(r)])), p.race)}</select></label>
            ${f('age', p.dead ? 'Age at death' : 'Age', String(p.age), ' inputmode="numeric" maxlength="4"')}
            <label class="fam-check"><input type="checkbox" class="fam-f" data-f="dead"${p.dead ? ' checked' : ''}> ✝ Dead</label>
            ${p.dead ? `${f('ago', 'Years ago', String(p.ago), ' inputmode="numeric" maxlength="4"')}${f('cause', 'How they died', p.cause, ` maxlength="${FAM_LIMITS.cause}" placeholder="of a fever"`)}` : ''}
            <label class="fam-wide">Note <textarea class="fam-f" data-f="note" rows="2" maxlength="${FAM_LIMITS.note}" placeholder="What they want, who they hate, what they know">${esc(p.note)}</textarea></label>
            <label class="fam-wide">In your notebook <select class="fam-f" data-f="to">${famNpcChoices(nb, p)}</select></label>
        </div>
        <div class="fam-rel">${famRelHTML(fam, p)}</div>
        <p class="pan-links">
            ${p.npc ? `<a class="btn fam-npc" href="npc-generator?${esc(p.npc)}">🎭 Open as an NPC</a>` : ''}
            ${p.npc && !to ? '<button type="button" class="btn fam-npc" id="fam-npc-save">📓 Save as an NPC</button>' : ''}
            ${to ? `<button type="button" class="btn" id="fam-npc-go">🎭 ${esc(to.title)} in the Notebook</button>` : ''}
            ${p.id !== fam.root ? '<button type="button" class="btn" id="fam-head">👑 Make This the One It\'s About</button>' : ''}
        </p>
        <p class="pan-links fam-adds">
            ${blood ? '<button type="button" class="btn" data-add="spouse">➕ Partner</button>' : ''}
            <button type="button" class="btn" data-add="child">➕ Child</button>${childOf}
            ${p.of ? '<button type="button" class="btn" data-add="sibling">➕ Brother or Sister</button>' : ''}
            ${famCanAddParents(fam, p) ? '<button type="button" class="btn" data-add="parent">➕ Parents</button>' : ''}
            ${gone ? `<button type="button" class="btn" id="fam-remove">${famState.removing === p.id ? `⚠️ Sure? ${gone.length > 1 ? `${gone.length} people go` : 'Click again'}` : '🗑️ Remove'}</button>` : ''}
        </p>
        <p class="wb-small">${p.npc ? 'The 🎭 NPC page rolls them as they are here. Changing their name, race, gender, or age leaves it behind.' : "Not on the NPC page: it can only roll people as they were rolled here (and old enough). Link them to someone in your notebook instead."}</p>`;
}

function famSecretsHTML(fam) {
    return `<h4>🤫 Family secrets</h4>
        ${fam.scandals.length ? `<ul class="wb-list fam-secret-list">${fam.scandals.map((s, i) =>
            `<li><span>${esc(famScandalText(fam, s))}</span> <button type="button" class="fam-x" data-scandal="${i}" aria-label="Remove this secret" title="Remove">✕</button></li>`).join('')}</ul>`
            : '<p class="wb-small">No secrets yet. Every family has one.</p>'}
        <div class="fam-secret-add">
            <input type="text" id="fam-secret" maxlength="${FAM_LIMITS.scandal}" placeholder="Write one of your own" aria-label="A family secret of your own">
            <button type="button" class="btn" id="fam-secret-add">➕ Add</button>
            <button type="button" class="btn" id="fam-secret-roll">🎲 Roll Another</button>
        </div>
        <p class="wb-small">On a player sheet from the notebook, these start hidden.</p>`;
}

// The kicker and summary (redrawn alone while a name is typed).
function famHeadHTML(fam) {
    const g = famGenerations(fam);
    return `<p class="wb-kicker">🌳 ${g} ${g === 1 ? 'generation' : 'generations'} · ${fam.people.length} ${fam.people.length === 1 ? 'person' : 'people'} · ${famRaceLabel(famRace(fam))}</p>
        <h3 class="wb-name">${esc(fam.name)}</h3>
        <p class="wb-sub">${esc(famSummary(fam))}</p>`;
}

function famBannerHTML(e, fam) {
    const r = famState.root;
    const head = famPerson(fam, fam.root);
    const root = r && !famState.entry ? `<div class="wb-today">
            <p>${r.house ? '🏰' : '🏛️'} The family of ${esc(r.title ? r.title + ' ' : '')}${esc(head ? head.name : 'someone')}, rolled on another tab.</p>
            <p class="wb-small">Everyone old enough opens on the NPC page as the same person, family name and all.</p>
            <button type="button" class="btn" id="fam-unroot">✕ Roll a House of Its Own Instead</button>
        </div>` : '';
    if (!e) return root + '<p class="wb-small fam-hint">Click anyone to read about them. Change anything (a name, a death, a new child) and the family goes into your notebook with your changes.</p>';
    const back = e.href && fam.edited ? ` <button type="button" class="btn" id="fam-back">${famState.backing ? '⚠️ Click again to undo every change' : '↺ Back to the Rolled Family'}</button>` : '';
    return `${root}<p class="wb-small fam-hint">📓 Kept in your <button type="button" class="fam-go-nb">notebook</button>${fam.edited ? ' with your changes' : ''}. Changes save as you make them.${back}</p>`;
}

function famPrintHTML(fam) {
    return `<section class="fam-print">
        <h4>Who's who</h4>
        <ul>${fam.people.map(p => `<li><b>${esc(p.name)}</b>: ${esc(famPersonLine(fam, p))}${p.note ? ' ' + esc(p.note) : ''}</li>`).join('')}</ul>
    </section>`;
}

function renderFamily(nb = nbLoad()) {
    const card = document.getElementById('fam-card');
    const { e, fam } = famNow(nb);
    if (!fam) {
        card.innerHTML = `<header class="wb-head"><p class="wb-kicker">🌳 Families</p><h3 class="wb-name">Not in this notebook</h3>
            <p class="wb-sub">This family was kept in a notebook, and it isn't in this browser's. Import that notebook, or roll a new family.</p></header>`;
        return;
    }
    if (famState.sel && !famPerson(fam, famState.sel)) famState.sel = '';
    const active = document.activeElement;
    const refocus = active && card.contains(active)
        ? (active.dataset && active.dataset.f ? `.fam-f[data-f="${active.dataset.f}"]` : active.dataset && active.dataset.person ? `g[data-person="${active.dataset.person}"]`
            : active.dataset && active.dataset.add ? `[data-add="${active.dataset.add}"]` : active.id ? '#' + active.id : null) : null;
    const wrap = card.querySelector('.fam-wrap');
    const scroll = wrap ? [wrap.scrollLeft, wrap.scrollTop] : null;
    card.innerHTML = `
        <header class="wb-head" id="fam-head-block">${famHeadHTML(fam)}</header>
        ${famBannerHTML(e, fam)}
        <section class="wb-block wb-wide">
            <div class="fam-bar">
                <button type="button" class="btn fam-fit" aria-pressed="${famState.fit}">${famState.fit ? '🔍 Full Size' : '⤢ Fit to Width'}</button>
                <span class="wb-small">✝ the dead · ═ married · dashed: parted · dotted: in secret · gold: the one it's about</span>
            </div>
            <div class="fam-wrap${famState.fit ? ' fam-fitted' : ''}">${famTreeHTML(fam)}</div>
        </section>
        <section class="wb-block wb-wide" id="fam-person">${famPersonHTML(nb, fam, e)}</section>
        <section class="wb-block wb-wide" id="fam-secrets">${famSecretsHTML(fam)}</section>
        ${famPrintHTML(fam)}`;
    const w2 = card.querySelector('.fam-wrap');
    if (scroll) [w2.scrollLeft, w2.scrollTop] = scroll;
    if (refocus) { const el = card.querySelector(refocus); if (el) el.focus({ preventScroll: true }); }
}

// Only the tree, the heading, and the person's name (a name being typed). A dropped NPC link takes its buttons along.
function famRenderTree() {
    const { fam } = famNow();
    const wrap = document.querySelector('#fam-card .fam-wrap');
    if (!fam || !wrap) return;
    const [x, y] = [wrap.scrollLeft, wrap.scrollTop];
    wrap.innerHTML = famTreeHTML(fam);
    [wrap.scrollLeft, wrap.scrollTop] = [x, y];
    document.getElementById('fam-head-block').innerHTML = famHeadHTML(fam);
    const p = famState.sel && famPerson(fam, famState.sel), name = document.getElementById('fam-p-name');
    if (p && name) name.textContent = p.name;
    if (p && !p.npc) document.querySelectorAll('#fam-person .fam-npc').forEach(el => el.remove());
}

// ── Actions ───────────────────────────────────────────────
function famSelect(id, focus) {
    famState.sel = famState.sel === id && !focus ? '' : id;
    famState.removing = '';
    renderFamily();
    if (focus) {
        const g = document.querySelector(`#fam-card g[data-person="${id}"]`);
        if (g) { g.focus({ preventScroll: true }); g.scrollIntoView({ block: 'nearest', inline: 'center' }); }
    }
}

// A field of the selected person. Name, race, gender, and age changes drop the NPC link (the NPC page couldn't roll them).
function famSetField(id, key, value) {
    return fam => {
        const p = famPerson(fam, id);
        if (!p) return false;
        if (key === 'dead') {
            p.dead = !!value;
            if (!p.dead) { p.age = famBorn(p); p.ago = 0; p.cause = ''; }
            p.npc = '';
        } else if (key === 'age' || key === 'ago') {
            p[key] = famAge(value);
            p.npc = '';
        } else {
            if (['name', 'race', 'gender'].includes(key) && p[key] !== value) p.npc = '';
            p[key] = value;
        }
    };
}

function famAddPerson(rel) {
    const { fam } = famNow();
    const anchor = fam && famPerson(fam, famState.sel);
    if (!anchor) return;
    const sel = document.getElementById('fam-child-of');
    const uid = rel === 'child' && sel ? sel.value : '';
    let added = null, why = '';
    const ok = famEdit(f => {
        const a = famPerson(f, anchor.id);
        const u = rel === 'child' && (famIsBlood(f, a) ? uid && famUnion(f, uid) : famMarriedInto(f, a.id));
        const other = u ? famPerson(f, u.a === a.id ? u.b : u.a) : null;
        const np = famNewPerson(f, a, rel, other);
        const partner = rel === 'parent' ? famNewPerson(f, { ...np, id: '' }, 'spouse') : null;
        if (rel === 'parent') { partner.age = np.age; }
        const r = famAdd(f, a.id, rel, np, uid, partner);
        if (typeof r !== 'string') { why = r.why; return false; }
        added = r;
    });
    if (!ok) { if (why) flash('fam-status', '⚠️ ' + why); return; }
    const { fam: now } = famNow();
    const p = famPerson(now, added);
    flash('fam-status', `➕ ${p.name} joins the family. Rename them, or change anything, below.`);
    famSelect(added, true);
}

function famRemoveSel() {
    const id = famState.sel;
    if (!id) return;
    if (famState.removing !== id) {
        famState.removing = id;
        renderFamily();
        setTimeout(() => { if (famState.removing === id) { famState.removing = ''; renderFamily(); } }, 4000);
        return;
    }
    famState.removing = '';
    let n = 0;
    famState.sel = '';
    if (famEdit(f => { n = famRemove(f, id); return n > 0 ? undefined : false; })) flash('fam-status', `🗑️ ${n === 1 ? 'They are' : `${n} people are`} gone from the family.`);
    else renderFamily();
}

function famSaveNpc() {
    const { fam } = famNow();
    const p = fam && famPerson(fam, famState.sel);
    if (!p || !p.npc) return;
    const r = nbAdd({ kind: 'npc', title: p.name, sub: `${famCapital(p.race)}${p.title ? ', ' + p.title : ''}, of ${fam.name}`, href: 'npc-generator?' + p.npc });
    if (!r || r.full) { flash('fam-status', r ? '⚠️ The notebook is full. Remove an entry first.' : "⚠️ This browser won't keep a notebook (storage is off)."); return; }
    if (famEdit(f => { const q = famPerson(f, p.id); if (!q) return false; q.to = r.entry.id; }))
        flash('fam-status', `📓 ${p.name} is ${r.existed ? 'already' : 'now'} in the notebook, linked to this family.`);
}

function famBack() {
    if (!famState.backing) {
        famState.backing = true;
        renderFamily();
        setTimeout(() => { if (famState.backing) { famState.backing = false; renderFamily(); } }, 4000);
        return;
    }
    famState.backing = false;
    const nb = nbLoad(), e = famEntry(nb);
    if (!e || !famState.roll) return;
    e.fam = famState.roll.fam;
    e.sub = nbText(famSummary(e.fam), NB_LIMITS.sub);
    famState.sel = '';
    if (nbStore(nb)) flash('fam-status', '↺ Back to the family as it was rolled. It stays in your notebook.');
}

function famStartBlank() {
    const fam = famBlank(document.getElementById('fam-race').value);
    const r = nbAdd({ kind: 'family', title: fam.name, sub: famSummary(fam), href: '', fam });
    if (!r || r.full) { flash('fam-status', r ? '⚠️ The notebook is full. Remove an entry first.' : "⚠️ This browser won't keep a notebook (storage is off), and a family made by hand lives there."); return; }
    famState = { ...famState, entry: r.entry.id, seed: null, roll: null, root: null, from: {}, sel: fam.top, removing: '', backing: false };
    renderFamily();
    setUrlParams(famParams(), true);
    flash('fam-status', '✏️ A family of one, in your notebook. Add partners, children, and parents from here.');
}

function famSave(statusId) {
    const nb = nbLoad();
    if (famEntry(nb)) { flash(statusId, '📓 This family is already in the notebook.'); return; }
    if (!famState.roll) return;
    const fam = famState.roll.fam;
    const r = nbAdd({ kind: 'family', title: fam.name, sub: famSummary(fam), href: famHref(), fam });
    if (!r) flash(statusId, "⚠️ This browser won't keep a notebook (storage is off).");
    else if (r.full) flash(statusId, '⚠️ The notebook is full. Remove an entry first.');
    else flash(statusId, `📓 Saved to the notebook${r.linked ? `, linked to ${r.linked} saved ${r.linked === 1 ? 'entry' : 'entries'}` : ''}.`);
}

function printFamily() {
    if (!famNow().fam) return;
    document.body.classList.add('print-fam');
    window.print();
}

function setupFamily() {
    const gens = document.getElementById('fam-gens');
    Object.entries(FAM_GENS).forEach(([key, g]) => gens.add(new Option(g.label, key)));
    const size = document.getElementById('fam-size');
    Object.entries(FAM_SIZES).forEach(([key, s]) => size.add(new Option(`${s.icon} ${s.label}`, key)));
    const race = document.getElementById('fam-race');
    NPC_RACES.forEach(r => race.add(new Option(famRaceLabel(r), r)));

    // A new option rerolls the same seed.
    Object.values(FAM_FIELDS).forEach(id => document.getElementById(id).addEventListener('change', () => {
        if (famState.seed) rollFamilyFor(famState.seed, false);
    }));
    document.getElementById('fam-roll').addEventListener('click', () => rollFamilyFor());
    document.getElementById('fam-blank').addEventListener('click', famStartBlank);

    const card = document.getElementById('fam-card');
    card.addEventListener('click', e => {
        const g = e.target.closest('g[data-person]');
        if (g) { famSelect(g.dataset.person); return; }
        const t = e.target.closest('button');
        if (!t) return;
        if (t.classList.contains('fam-fit')) { famState.fit = !famState.fit; renderFamily(); return; }
        if (t.classList.contains('fam-go')) { famSelect(t.dataset.go, true); return; }
        if (t.classList.contains('fam-go-nb')) { const en = famEntry(nbLoad()); if (en) switchWorldTab('notebook').then(ok => ok && nbJump(en.id)); return; }
        if (t.dataset.add) { famAddPerson(t.dataset.add); return; }
        if (t.classList.contains('fam-x')) {
            const i = Number(t.dataset.scandal);
            famEdit(f => { if (!f.scandals[i]) return false; f.scandals.splice(i, 1); });
            return;
        }
        switch (t.id) {
            case 'fam-remove': famRemoveSel(); break;
            case 'fam-npc-save': famSaveNpc(); break;
            case 'fam-npc-go': { const { fam } = famNow(); const p = fam && famPerson(fam, famState.sel); if (p && p.to) switchWorldTab('notebook').then(ok => ok && nbJump(p.to)); break; }
            case 'fam-head': famEdit(f => { if (!famPerson(f, famState.sel)) return false; f.root = famState.sel; }); break;
            case 'fam-back': famBack(); break;
            case 'fam-unroot': famState.root = null; famState.from = {}; rollFamilyFor(); break;
            case 'fam-secret-add': {
                const box = document.getElementById('fam-secret'), text = famText(box.value, FAM_LIMITS.scandal).replace(/[{}]/g, '');
                if (!text) { box.focus(); break; }
                if (famEdit(f => { if (f.scandals.length >= FAM_LIMITS.scandals) { flash('fam-status', `⚠️ A family keeps ${FAM_LIMITS.scandals} secrets at most.`); return false; } f.scandals.push({ text, who: [] }); })) {
                    const b = document.getElementById('fam-secret');
                    if (b) b.focus();
                }
                break;
            }
            case 'fam-secret-roll': {
                let got = false;
                famEdit(f => {
                    if (f.scandals.length >= FAM_LIMITS.scandals) { flash('fam-status', `⚠️ A family keeps ${FAM_LIMITS.scandals} secrets at most.`); return false; }
                    const s = famRollScandal(f);
                    if (!s) { flash('fam-status', 'No new secret fits this family as it is. Add a few more people, or write one of your own.'); return false; }
                    f.scandals.push(s);
                    got = true;
                });
                if (got) flash('fam-status', '🤫 Another secret.');
                break;
            }
        }
    });
    card.addEventListener('keydown', e => {
        const g = e.target.closest('g[data-person]');
        if (g && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); famSelect(g.dataset.person, true); return; }
        if (e.key === 'Enter' && e.target.id === 'fam-secret') { e.preventDefault(); document.getElementById('fam-secret-add').click(); }
    });
    card.addEventListener('change', e => {
        const u = e.target.closest('.fam-u');
        if (u) { famEdit(f => { const x = famUnion(f, u.dataset.u); if (!x) return false; x.kind = u.value; }); return; }
        const box = e.target.closest('.fam-f');
        if (!box || !['gender', 'race', 'dead', 'to'].includes(box.dataset.f)) return;
        const id = famState.sel;
        famEdit(famSetField(id, box.dataset.f, box.type === 'checkbox' ? box.checked : box.value));
    });
    // Text saves as you type, redrawing only the tree.
    card.addEventListener('input', e => {
        const box = e.target.closest('.fam-f');
        if (!box || ['gender', 'race', 'dead', 'to'].includes(box.dataset.f)) return;
        const id = famState.sel, key = box.dataset.f, t = id + '|' + key;
        clearTimeout(famTimers[t]);
        famTimers[t] = setTimeout(() => {
            delete famTimers[t];
            if (famEdit(famSetField(id, key, box.value), true)) famRenderTree();
        }, 400);
    });
    // Leaving a text box saves what's still waiting.
    card.addEventListener('focusout', e => {
        const box = e.target.closest('.fam-f');
        if (!box || ['gender', 'race', 'dead', 'to'].includes(box.dataset.f)) return;
        const id = famState.sel, key = box.dataset.f, t = id + '|' + key;
        if (famTimers[t]) { clearTimeout(famTimers[t]); delete famTimers[t]; if (famEdit(famSetField(id, key, box.value), true)) famRenderTree(); }
    });

    document.getElementById('fam-copy').addEventListener('click', () => {
        const { fam } = famNow();
        if (fam) copyText(famAsText(fam), 'fam-status', 'the family');
    });
    document.getElementById('fam-print').addEventListener('click', printFamily);
    window.addEventListener('afterprint', () => document.body.classList.remove('print-fam'));
    document.getElementById('fam-link').addEventListener('click', () => {
        const by = famState.entry && !(famEntry(nbLoad()) || {}).href;
        copyPageLink(ok => flash('fam-status', !ok ? '⚠️ Copy blocked by the browser.' : by
            ? "🔗 Link copied. This family was made by hand, so the link opens it only in this browser's notebook."
            : '🔗 Link copied. It rolls this same family (your changes stay in your notebook).'));
    });
    // Another tab (or browser tab) changed the notebook. Filing this family mid-edit doesn't redraw: the edit does.
    nbOnChange(nb => { if (!famState.filing && currentWorldTab() === 'family' && (famState.seed || famState.entry)) renderFamily(nb); });
}

WORLD_TABS.family = {
    setup: setupFamily,
    params: famParams,
    apply: applyFamUrl,
    fresh: push => rollFamilyFor(newSeed(), push),
    rolled: () => !!(famState.seed || famState.entry),
    save: famSave,
    entry: () => {
        const { fam } = famNow();
        return { title: fam.name, sub: famSummary(fam), fam };
    }
};
