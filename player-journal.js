/* ============================================
   PLAYER JOURNAL (F65): a player's own notes, one journal per character.
   A journal belongs to a Character Builder character (char = its id) or to
   nobody but its name (a character kept on paper or somewhere else):
     { id, name, char, entries: [entry], updated }
   An entry is a session, a quest, a person, a place, or loot:
     { id, kind, title, text, tags: [], sn, added, updated, ...its kind's fields }
   where sn is the session it came up in (not on sessions, which have num).
   Journals live in localStorage JN_KEY (a list, newest edit first). A journal
   opened from the builder (?char=<id>) with no journal yet is a draft: it is
   saved once it gets an entry, a name change, or a link change.
   Export writes one journal as JSON; import only parses JSON and keeps what
   passes jnClean (plain text in known fields), so nothing in a file ever runs.
   Reading builder characters only parses CB_KEY ('gazette-characters'), so
   the page needs no character data.
   ============================================ */

const JN_KEY = 'gazette-journals';
const JN_MAX = 30;
const JN_LIMITS = { entries: 400, name: 80, title: 120, text: 4000, field: 200, tags: 12, tag: 30 };
const JN_CB_KEY = 'gazette-characters';

const JN_KINDS = {
    session: { icon: '📖', label: 'Session', many: 'Sessions' },
    quest: { icon: '❗', label: 'Quest', many: 'Quests' },
    person: { icon: '🧑', label: 'Person', many: 'People' },
    place: { icon: '📍', label: 'Place', many: 'Places' },
    loot: { icon: '💰', label: 'Loot', many: 'Loot' }
};
const JN_QUEST = { open: '🟡 Open', done: '✅ Done', failed: '❌ Failed' };
const JN_ATTITUDE = { '': 'Unsure', ally: '🤝 Friendly', neutral: '😐 Neutral', foe: '⚔️ Hostile' };

// Each kind's own fields: [key, label, kind of input, placeholder].
const JN_FIELDS = {
    session: [['num', 'Session no.', 'num', ''], ['date', 'Played on', 'date', '']],
    quest: [['status', 'Status', 'quest', ''], ['giver', 'Given by', 'text', 'Who asked'], ['reward', 'Reward', 'text', 'What they offered']],
    person: [['role', 'Who they are', 'text', 'e.g. Innkeeper in Greywater'], ['attitude', 'Toward us', 'attitude', '']],
    place: [['region', 'Where it is', 'text', 'e.g. Two days north of the river']],
    loot: [['value', 'Worth', 'text', 'e.g. 50 gp'], ['gone', 'Sold, spent, or lost', 'check', '']]
};

const jnText = (v, max) => (typeof v === 'string' ? v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, max) : '');
const jnLine = (v, max) => jnText(v, max).replace(/\s+/g, ' ');
const jnNewId = p => p + Date.now().toString(36) + Math.floor(Math.random() * 1296).toString(36);
const jnIdOk = (v, re) => typeof v === 'string' && re.test(v);

// A session number: 1 to 9999, or null.
function jnNum(v) {
    const n = typeof v === 'string' && /^\d{1,4}$/.test(v.trim()) ? Number(v) : v;
    return Number.isInteger(n) && n >= 1 && n <= 9999 ? n : null;
}

// A date as YYYY-MM-DD, or ''.
function jnDate(v) {
    return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(new Date(v + 'T00:00:00Z')) ? v : '';
}

// "Waterdeep, Villain , waterdeep" or a list → ['waterdeep', 'villain'].
function jnTags(v) {
    const list = Array.isArray(v) ? v : typeof v === 'string' ? v.split(',') : [];
    const out = [];
    list.forEach(t => {
        const tag = jnLine(t, JN_LIMITS.tag).replace(/^#/, '').toLowerCase();
        if (tag && !out.includes(tag) && out.length < JN_LIMITS.tags) out.push(tag);
    });
    return out;
}

function jnCleanEntry(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw) || !Object.hasOwn(JN_KINDS, raw.kind)) return null;
    const e = {
        id: jnIdOk(raw.id, /^e[a-z0-9]{1,16}$/) ? raw.id : jnNewId('e'),
        kind: raw.kind,
        title: jnLine(raw.title, JN_LIMITS.title),
        text: jnText(raw.text, JN_LIMITS.text),
        tags: jnTags(raw.tags)
    };
    if (e.kind === 'session') {
        e.num = jnNum(raw.num);
        e.date = jnDate(raw.date);
    } else {
        e.sn = jnNum(raw.sn);
    }
    if (e.kind === 'quest') {
        e.status = Object.hasOwn(JN_QUEST, raw.status) ? raw.status : 'open';
        e.giver = jnLine(raw.giver, JN_LIMITS.field);
        e.reward = jnLine(raw.reward, JN_LIMITS.field);
    }
    if (e.kind === 'person') {
        e.role = jnLine(raw.role, JN_LIMITS.field);
        e.attitude = Object.hasOwn(JN_ATTITUDE, raw.attitude) ? raw.attitude : '';
    }
    if (e.kind === 'place') e.region = jnLine(raw.region, JN_LIMITS.field);
    if (e.kind === 'loot') {
        e.value = jnLine(raw.value, 100);
        e.gone = raw.gone === true;
    }
    e.added = Number.isFinite(raw.added) && raw.added > 0 ? raw.added : Date.now();
    e.updated = Number.isFinite(raw.updated) && raw.updated > 0 ? raw.updated : e.added;
    return e;
}

function jnClean(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const seen = new Set();
    const entries = (Array.isArray(raw.entries) ? raw.entries : []).map(jnCleanEntry).filter(e => {
        if (!e) return false;
        if (seen.has(e.id)) e.id = jnNewId('e');
        seen.add(e.id);
        return true;
    }).slice(0, JN_LIMITS.entries);
    return {
        id: jnIdOk(raw.id, /^j[a-z0-9]{1,16}$/) ? raw.id : jnNewId('j'),
        name: jnLine(raw.name, JN_LIMITS.name),
        char: jnIdOk(raw.char, /^[a-z0-9]{1,16}$/) ? raw.char : '',
        entries,
        updated: Number.isFinite(raw.updated) && raw.updated > 0 ? raw.updated : Date.now()
    };
}

function jnBlank(name = '', char = '') {
    return { id: jnNewId('j'), name, char, entries: [], updated: Date.now() };
}

// ── Storage ──────────────────────────────────────────────
function jnLoadAll() {
    try {
        const saved = JSON.parse(localStorage.getItem(JN_KEY));
        if (Array.isArray(saved)) return saved.map(jnClean).filter(Boolean).slice(0, JN_MAX);
    } catch (e) {}
    return [];
}

// Writes the list; false when the browser refuses (storage full or blocked).
function jnStore(list) {
    try { localStorage.setItem(JN_KEY, JSON.stringify(list.slice(0, JN_MAX))); return true; } catch (e) { return false; }
}

// The builder's characters, read only: { id, name, line } for the picker.
function jnCharacters() {
    let list = [];
    try { list = JSON.parse(localStorage.getItem(JN_CB_KEY)); } catch (e) {}
    if (!Array.isArray(list)) return [];
    const word = s => String(s).split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('-');
    return list.filter(c => c && typeof c === 'object' && jnIdOk(c.id, /^[a-z0-9]{1,16}$/)).map(c => {
        const level = Number.isInteger(c.level) && c.level >= 1 && c.level <= 20 ? c.level : 1;
        const bits = [typeof c.race === 'string' && /^[a-z-]{1,20}$/.test(c.race) ? word(c.race) : '',
            typeof c.cls === 'string' && /^[a-z-]{1,20}$/.test(c.cls) ? word(c.cls) : ''].filter(Boolean);
        return { id: c.id, name: jnLine(c.name, 60) || 'Unnamed character', line: bits.length ? `Level ${level} ${bits.join(' ')}` : '' };
    });
}

// ── Sorting, search, text ────────────────────────────────
// Sessions by number (then date), open quests first, everything else newest first.
function jnSorted(entries, kind) {
    const list = entries.slice();
    const byAdded = (a, b) => b.added - a.added;
    if (kind === 'session') return list.sort((a, b) => (b.num || 0) - (a.num || 0) || (b.date || '').localeCompare(a.date || '') || byAdded(a, b));
    if (kind === 'quest') {
        const rank = { open: 0, done: 1, failed: 2 };
        return list.sort((a, b) => rank[a.status] - rank[b.status] || byAdded(a, b));
    }
    return list.sort(byAdded);
}

function jnHaystack(e) {
    return [e.title, e.text, e.tags.join(' '), e.giver, e.reward, e.role, e.region, e.value,
        e.kind === 'session' && e.num ? `session ${e.num}` : '', e.sn ? `session ${e.sn}` : ''].filter(Boolean).join('\n').toLowerCase();
}

// Every word of the search must be somewhere in the entry.
function jnMatches(e, q, tag) {
    if (tag && !e.tags.includes(tag)) return false;
    const words = String(q || '').toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return true;
    const hay = jnHaystack(e);
    return words.every(w => hay.includes(w));
}

function jnTitle(e) {
    if (e.title) return e.title;
    if (e.kind === 'session') return e.num ? `Session ${e.num}` : 'A session';
    return `Untitled ${JN_KINDS[e.kind].label.toLowerCase()}`;
}

function jnFmtDate(d) {
    if (!d) return '';
    return new Date(d + 'T00:00:00Z').toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
}

// The small facts under an entry's title, as plain strings.
function jnFacts(e) {
    const out = [];
    if (e.kind === 'session') {
        if (e.title && e.num) out.push(`Session ${e.num}`);
        if (e.date) out.push(jnFmtDate(e.date));
    }
    if (e.kind === 'quest') {
        out.push(JN_QUEST[e.status]);
        if (e.giver) out.push(`From ${e.giver}`);
        if (e.reward) out.push(`Reward: ${e.reward}`);
    }
    if (e.kind === 'person') {
        if (e.role) out.push(e.role);
        if (e.attitude) out.push(JN_ATTITUDE[e.attitude]);
    }
    if (e.kind === 'place' && e.region) out.push(e.region);
    if (e.kind === 'loot') {
        if (e.value) out.push(e.value);
        if (e.gone) out.push('Gone');
    }
    if (e.sn) out.push(`Session ${e.sn}`);
    return out;
}

function jnPlainText(journal, entries, charLine) {
    const head = [journal.name || 'Player journal', charLine].filter(Boolean).join(' · ');
    const blocks = entries.map(e => {
        const facts = jnFacts(e);
        return [`${JN_KINDS[e.kind].icon} ${jnTitle(e)}`, facts.length ? facts.join(' · ') : '', e.text, e.tags.length ? 'Tags: ' + e.tags.join(', ') : '']
            .filter(Boolean).join('\n');
    });
    return [head, ...blocks].join('\n\n');
}

// ── The page ─────────────────────────────────────────────
let jns = [];          // every journal, saved ones plus at most one draft
let cur = null;        // the open journal
let chars = [];        // builder characters (read only)
const view = { kind: '', q: '', tag: '' };
let editing = null;    // { id } of the entry in the editor, or { kind } for a new one

function esc(s) {
    return String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

let flashTimer = 0;
function flash(msg, bad = false) {
    const el = document.getElementById('jn-status');
    el.textContent = msg;
    el.classList.toggle('jn-bad', bad);
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => { el.textContent = ''; }, 6000);
}

// Saved journals: the ones with an entry, or that the player started or changed by hand.
function persist() {
    if (cur) {
        cur.kept = true;
        cur.updated = Date.now();
        jns = [cur, ...jns.filter(j => j !== cur)];
    }
    const list = jns.filter(j => j.kept || j.entries.length).map(({ kept, ...j }) => j);
    if (!jnStore(list)) flash('Your browser would not save that: its storage may be full.', true);
}

function charFor(j) {
    return j && j.char ? chars.find(c => c.id === j.char) || null : null;
}

function charLine(j) {
    const c = charFor(j);
    return c ? [c.name, c.line].filter(Boolean).join(', ') : '';
}

function setUrl() {
    const p = new URLSearchParams();
    if (cur) p.set('j', cur.id);
    if (view.kind) p.set('kind', view.kind);
    if (view.q) p.set('q', view.q);
    if (view.tag) p.set('tag', view.tag);
    const qs = p.toString();
    history.replaceState(null, '', location.pathname + (qs ? '?' + qs : '') + location.hash);
}

function openJournal(j) {
    cur = j;
    editing = null;
    view.tag = '';
    render();
    renderEditor();
}

function newJournal(name, charId) {
    if (jns.filter(j => j.kept || j.entries.length).length >= JN_MAX) { flash(`You have ${JN_MAX} journals; delete one first.`, true); return null; }
    jns = jns.filter(j => j.kept || j.entries.length);
    const c = chars.find(x => x.id === charId);
    const j = jnBlank(jnLine(name, JN_LIMITS.name) || (c ? c.name : ''), c ? c.id : '');
    jns.unshift(j);
    cur = j;
    persist();
    openJournal(j);
    return j;
}

// ── Rendering ────────────────────────────────────────────
function render() {
    renderBar();
    renderBody();
    setUrl();
}

function renderBar() {
    const pick = document.getElementById('jn-pick');
    pick.innerHTML = jns.length
        ? jns.map(j => `<option value="${esc(j.id)}"${j === cur ? ' selected' : ''}>📓 ${esc(j.name || 'Untitled journal')}${j.kept || j.entries.length ? '' : ' (not saved yet)'}</option>`).join('')
        : '<option value="">No journals yet</option>';
    pick.disabled = !jns.length;
    const has = !!cur;
    ['jn-export', 'jn-print', 'jn-copy', 'jn-delete'].forEach(id => { document.getElementById(id).disabled = !has || (id !== 'jn-delete' && !cur.entries.length); });
    document.getElementById('jn-settings').hidden = !has;
    if (!has) return;
    document.getElementById('jn-name').value = cur.name;
    const linked = cur.char && !charFor(cur);
    document.getElementById('jn-char').innerHTML = '<option value="">No builder character (just the name)</option>'
        + chars.map(c => `<option value="${esc(c.id)}"${c.id === cur.char ? ' selected' : ''}>🧝 ${esc(c.name)}${c.line ? ' · ' + esc(c.line) : ''}</option>`).join('')
        + (linked ? `<option value="${esc(cur.char)}" selected>A deleted character</option>` : '');
    const c = charFor(cur);
    document.getElementById('jn-char-line').innerHTML = c
        ? `🧝 ${esc(c.name)}${c.line ? ' · ' + esc(c.line) : ''} · <a href="character-builder?char=${encodeURIComponent(c.id)}">Open in the Character Builder</a>`
        : linked ? 'Its Character Builder character was deleted; the journal stays. Pick another or keep it on its own.' : '';
}

function renderBody() {
    const body = document.getElementById('jn-body');
    const start = document.getElementById('jn-start');
    if (!cur) {
        body.hidden = true;
        start.hidden = false;
        fillStartChars();
        return;
    }
    start.hidden = !startOpen;
    body.hidden = false;
    document.getElementById('jn-print-head').innerHTML = `<b>${esc(cur.name || 'Player journal')}</b>${charLine(cur) ? ' · ' + esc(charLine(cur)) : ''}`;

    const counts = { '': cur.entries.length };
    Object.keys(JN_KINDS).forEach(k => { counts[k] = cur.entries.filter(e => e.kind === k).length; });
    document.getElementById('jn-kinds').innerHTML = [['', '📚', 'All'], ...Object.entries(JN_KINDS).map(([k, d]) => [k, d.icon, d.many])]
        .map(([k, icon, label]) => `<button type="button" class="jn-chip${view.kind === k ? ' jn-on' : ''}" data-kind="${k}" aria-pressed="${view.kind === k}">${icon} ${label} <span>${counts[k]}</span></button>`).join('');

    const tagCount = {};
    cur.entries.forEach(e => e.tags.forEach(t => { tagCount[t] = (tagCount[t] || 0) + 1; }));
    const tags = Object.keys(tagCount).sort((a, b) => tagCount[b] - tagCount[a] || a.localeCompare(b)).slice(0, 40);
    if (view.tag && !tagCount[view.tag]) view.tag = '';
    document.getElementById('jn-tags').innerHTML = tags.length
        ? '<span class="jn-dim">Tags:</span> ' + tags.map(t => `<button type="button" class="jn-tag${view.tag === t ? ' jn-on' : ''}" data-tag="${esc(t)}" aria-pressed="${view.tag === t}">#${esc(t)} <span>${tagCount[t]}</span></button>`).join('')
        : '';

    const shown = jnSorted(cur.entries.filter(e => (!view.kind || e.kind === view.kind) && jnMatches(e, view.q, view.tag)), view.kind);
    const list = document.getElementById('jn-list');
    // The entry in the editor stays out of the list until it is saved or cancelled.
    let html = shown.filter(e => !(editing && editing.id === e.id)).map(entryHtml).join('');
    if (!shown.length) {
        html += `<p class="jn-empty">${cur.entries.length
            ? 'Nothing here matches. Try another search, tag, or section.'
            : 'This journal is empty. Add your first session, or anyone and anything worth remembering, with the buttons above.'}</p>`;
    }
    list.innerHTML = html;
    document.getElementById('jn-shown').textContent = cur.entries.length
        ? (shown.length === cur.entries.length ? `${shown.length} ${shown.length === 1 ? 'entry' : 'entries'}` : `Showing ${shown.length} of ${cur.entries.length}`)
        : '';
}

// The editor has its own slot above the list, so a search or a tag click never wipes it.
function renderEditor() {
    const slot = document.getElementById('jn-editor-slot');
    const e = editing && editing.id ? cur.entries.find(x => x.id === editing.id) : null;
    if (editing && editing.id && !e) editing = null;
    slot.innerHTML = editing ? editorHtml(e, e ? e.kind : editing.kind) : '';
    const box = slot.querySelector('.jn-editor');
    if (box) {
        box.scrollIntoView({ block: 'nearest' });
        box.querySelector('[name="title"]').focus({ preventScroll: true });
    }
}

function setEditing(next) {
    editing = next;
    renderEditor();
    renderBody();
    setUrl();
}

function entryHtml(e) {
    const k = JN_KINDS[e.kind];
    const facts = jnFacts(e).map(f => `<span class="jn-fact">${esc(f)}</span>`).join('');
    const text = e.text ? `<div class="jn-text">${esc(e.text).replace(/\n/g, '<br>')}</div>` : '';
    const tags = e.tags.length ? `<div class="jn-entry-tags">${e.tags.map(t => `<button type="button" class="jn-tag" data-tag="${esc(t)}">#${esc(t)}</button>`).join('')}</div>` : '';
    const quick = e.kind === 'quest' && e.status === 'open' ? `<button type="button" class="jn-btn jn-small" data-act="done" data-id="${e.id}">✅ Done</button>` : '';
    return `<article class="jn-entry jn-k-${e.kind}${e.gone || (e.kind === 'quest' && e.status !== 'open') ? ' jn-faded' : ''}" data-id="${e.id}">
        <header class="jn-entry-head">
          <h3 class="jn-entry-title"><span aria-hidden="true">${k.icon}</span> ${esc(jnTitle(e))}</h3>
          <div class="jn-entry-acts">${quick}
            <button type="button" class="jn-btn jn-small" data-act="edit" data-id="${e.id}" aria-label="Edit ${esc(jnTitle(e))}">✏️ Edit</button>
            <button type="button" class="jn-btn jn-small" data-act="del" data-id="${e.id}" aria-label="Delete ${esc(jnTitle(e))}">🗑️</button>
          </div>
        </header>
        ${facts ? `<div class="jn-facts"><span class="jn-kind">${k.label}</span>${facts}</div>` : `<div class="jn-facts"><span class="jn-kind">${k.label}</span></div>`}
        ${text}${tags}
      </article>`;
}

function fieldHtml(e, [key, label, type, ph]) {
    const v = e ? e[key] : undefined;
    if (type === 'num') return `<label class="jn-field jn-narrow">${label}<input type="number" name="${key}" min="1" max="9999" inputmode="numeric" value="${v || ''}"></label>`;
    if (type === 'date') return `<label class="jn-field jn-mid">${label}<input type="date" name="${key}" value="${esc(v || '')}"></label>`;
    if (type === 'quest' || type === 'attitude') {
        const opts = type === 'quest' ? JN_QUEST : JN_ATTITUDE;
        return `<label class="jn-field jn-mid">${label}<select name="${key}">${Object.entries(opts).map(([k, l]) => `<option value="${k}"${(v || '') === k ? ' selected' : ''}>${l}</option>`).join('')}</select></label>`;
    }
    if (type === 'check') return `<label class="jn-check"><input type="checkbox" name="${key}"${v ? ' checked' : ''}> ${label}</label>`;
    return `<label class="jn-field">${label}<input type="text" name="${key}" maxlength="${key === 'value' ? 100 : JN_LIMITS.field}" placeholder="${esc(ph)}" value="${esc(v || '')}"></label>`;
}

const JN_TITLE_PH = { session: 'e.g. The road to Greywater', quest: 'e.g. Find the miller\'s daughter', person: 'e.g. Brother Aldous', place: 'e.g. The Sunken Chapel', loot: 'e.g. Silver locket' };
const JN_TEXT_PH = {
    session: 'What happened, who we met, what we found, and what is still open.',
    quest: 'What we know so far, and what we promised.',
    person: 'What they look like, what they want, what they told us.',
    place: 'What it looks like, who is there, what we left behind.',
    loot: 'What it does, who carries it, where it came from.'
};

function editorHtml(e, kind) {
    const k = JN_KINDS[kind];
    const fresh = !e;
    const draft = fresh ? newDefaults(kind) : e;
    const sn = kind === 'session' ? '' : `<label class="jn-field jn-narrow">Session<input type="number" name="sn" min="1" max="9999" inputmode="numeric" value="${draft.sn || ''}" title="The session it came up in"></label>`;
    return `<form class="jn-editor" data-id="${fresh ? '' : e.id}" data-kind="${kind}" aria-label="${fresh ? 'New' : 'Edit'} ${k.label.toLowerCase()}">
        <p class="jn-editor-head">${k.icon} ${fresh ? 'New' : 'Edit'} ${k.label.toLowerCase()}</p>
        <div class="jn-form-row">
          <label class="jn-field jn-wide">Title<input type="text" name="title" maxlength="${JN_LIMITS.title}" placeholder="${esc(JN_TITLE_PH[kind])}" value="${esc(draft.title || '')}"></label>
          ${JN_FIELDS[kind].map(f => fieldHtml(draft, f)).join('')}${sn}
        </div>
        <label class="jn-field">Notes<textarea name="text" rows="${kind === 'session' ? 7 : 4}" maxlength="${JN_LIMITS.text}" placeholder="${esc(JN_TEXT_PH[kind])}">${esc(draft.text || '')}</textarea></label>
        <label class="jn-field">Tags<input type="text" name="tags" maxlength="400" placeholder="Separate with commas, e.g. greywater, cult, owes us" value="${esc((draft.tags || []).join(', '))}"></label>
        <div class="jn-form-acts">
          <button type="submit" class="jn-btn jn-gold">✓ Save</button>
          <button type="button" class="jn-btn" data-act="cancel">✕ Cancel</button>
          <span class="jn-dim">Ctrl + Enter saves</span>
        </div>
      </form>`;
}

// A new session gets the next number and today's date; anything else the latest session's number.
function newDefaults(kind) {
    const last = Math.max(0, ...cur.entries.filter(e => e.kind === 'session').map(e => e.num || 0));
    if (kind === 'session') {
        const d = new Date();
        const pad = n => String(n).padStart(2, '0');
        return { num: last + 1, date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, tags: [] };
    }
    return { sn: last || null, tags: [] };
}

// ── Editing ──────────────────────────────────────────────
function startEntry(kind) {
    if (cur.entries.length >= JN_LIMITS.entries) { flash(`A journal holds ${JN_LIMITS.entries} entries; start another journal for the next chapter.`, true); return; }
    if (view.kind && view.kind !== kind) view.kind = kind;
    setEditing({ kind });
}

function saveEditor(form) {
    const kind = form.dataset.kind;
    const raw = { kind, tags: form.elements.tags.value };
    ['title', 'text', 'sn'].forEach(k => { if (form.elements[k]) raw[k] = form.elements[k].value; });
    JN_FIELDS[kind].forEach(([key, , type]) => {
        const el = form.elements[key];
        raw[key] = type === 'check' ? el.checked : el.value;
    });
    const old = form.dataset.id ? cur.entries.find(x => x.id === form.dataset.id) : null;
    if (old) { raw.id = old.id; raw.added = old.added; }
    raw.updated = Date.now();
    const e = jnCleanEntry(raw);
    if (!e.title && !e.text && !(kind === 'session' && e.num)) { flash('Give it a title or some notes first.', true); return; }
    if (old) cur.entries[cur.entries.indexOf(old)] = e;
    else cur.entries.unshift(e);
    editing = null;
    persist();
    render();
    renderEditor();
    flash(`${JN_KINDS[kind].icon} ${old ? 'Saved' : 'Added'}: ${jnTitle(e)}.`);
}

let armedDel = { id: '', at: 0 };
function deleteEntry(id, btn) {
    if (armedDel.id !== id || Date.now() - armedDel.at > 3000) {
        armedDel = { id, at: Date.now() };
        btn.textContent = '🗑️ Really?';
        setTimeout(() => { if (btn.isConnected) btn.textContent = '🗑️'; }, 3000);
        return;
    }
    const e = cur.entries.find(x => x.id === id);
    cur.entries = cur.entries.filter(x => x.id !== id);
    armedDel = { id: '', at: 0 };
    persist();
    render();
    if (e) flash(`🗑️ Deleted: ${jnTitle(e)}.`);
}

let armedJournal = 0;
function deleteJournal(btn) {
    if (Date.now() - armedJournal > 3000) {
        armedJournal = Date.now();
        btn.textContent = '🗑️ Really delete it?';
        setTimeout(() => { btn.textContent = '🗑️ Delete Journal'; }, 3000);
        return;
    }
    armedJournal = 0;
    btn.textContent = '🗑️ Delete Journal';
    const name = cur.name || 'The journal';
    jns = jns.filter(j => j !== cur);
    cur = null;
    persist();
    openJournal(jns[0] || null);
    flash(`🗑️ ${name} deleted.`);
}

// ── Export, import, copy ─────────────────────────────────
const jnFileName = j => (j.name || 'journal').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) + '-journal.json';

function exportJournal() {
    const { kept, ...j } = cur;
    const blob = new Blob([JSON.stringify({ gazetteJournal: 1, journal: j }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = jnFileName(cur);
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    flash('⬇️ Exported.');
}

function importJournal(file) {
    if (!file) return;
    if (file.size > 2000000) { flash('That file is too big to be a journal.', true); return; }
    const reader = new FileReader();
    reader.onload = () => {
        let data;
        try { data = JSON.parse(reader.result); } catch (e) { flash('That file isn\'t JSON.', true); return; }
        const j = jnClean(data && data.gazetteJournal ? data.journal : data);
        if (!j || (!j.entries.length && !j.name)) { flash('That file isn\'t a journal from this page.', true); return; }
        const saved = jns.filter(x => x.kept || x.entries.length);
        if (saved.length >= JN_MAX) { flash(`You have ${JN_MAX} journals; delete one first.`, true); return; }
        if (jns.some(x => x.id === j.id)) j.id = jnNewId('j');
        jns = [j, ...saved];
        cur = j;
        persist();
        openJournal(j);
        flash(`⬆️ Imported ${j.name || 'a journal'} (${j.entries.length} ${j.entries.length === 1 ? 'entry' : 'entries'}).`);
    };
    reader.readAsText(file);
}

function shownEntries() {
    return jnSorted(cur.entries.filter(e => (!view.kind || e.kind === view.kind) && jnMatches(e, view.q, view.tag)), view.kind);
}

function copyText() {
    const text = jnPlainText(cur, shownEntries(), charLine(cur));
    const done = () => flash('📋 Copied.');
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, () => flash('Could not copy.', true));
    else flash('Could not copy.', true);
}

// ── The start form ───────────────────────────────────────
let startOpen = false;

function fillStartChars() {
    const sel = document.getElementById('jn-new-char');
    const was = sel.value;
    sel.innerHTML = '<option value="">No builder character (just a name)</option>'
        + chars.map(c => `<option value="${esc(c.id)}">🧝 ${esc(c.name)}${c.line ? ' · ' + esc(c.line) : ''}</option>`).join('');
    if (chars.some(c => c.id === was)) sel.value = was;
}

function toggleStart(open) {
    startOpen = open;
    const box = document.getElementById('jn-start');
    box.hidden = !open && !!cur;
    document.getElementById('jn-new').setAttribute('aria-expanded', String(open));
    document.getElementById('jn-new-cancel').hidden = !cur;
    if (open || !cur) {
        fillStartChars();
        document.getElementById('jn-new-name').focus();
    }
}

// ── Setup ────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('year').textContent = new Date().getFullYear();
    chars = jnCharacters();
    jns = jnLoadAll();
    jns.forEach(j => { j.kept = true; });

    const p = new URLSearchParams(location.search);
    view.kind = Object.hasOwn(JN_KINDS, p.get('kind')) ? p.get('kind') : '';
    view.q = jnLine(p.get('q'), 80);
    view.tag = jnTags(p.get('tag') || '')[0] || '';
    document.getElementById('jn-q').value = view.q;

    // From the builder's sheet: that character's journal, or a draft for it.
    const askedChar = p.get('char');
    const askedJournal = p.get('j');
    let open = jns.find(j => j.id === askedJournal) || null;
    if (!open && askedChar) {
        open = jns.find(j => j.char === askedChar) || null;
        const c = chars.find(x => x.id === askedChar);
        if (!open && c && jns.length < JN_MAX) {
            open = jnBlank(c.name, c.id);
            open.kept = false;
            jns.unshift(open);
        }
    }
    cur = open || jns[0] || null;
    render();

    document.getElementById('jn-pick').addEventListener('change', e => {
        const j = jns.find(x => x.id === e.target.value);
        if (j) openJournal(j);
    });
    document.getElementById('jn-new').addEventListener('click', () => toggleStart(!startOpen));
    document.getElementById('jn-new-cancel').addEventListener('click', () => toggleStart(false));
    document.getElementById('jn-new-char').addEventListener('change', e => {
        const name = document.getElementById('jn-new-name');
        const c = chars.find(x => x.id === e.target.value);
        if (c && !name.value.trim()) name.value = c.name;
    });
    document.getElementById('jn-start').addEventListener('submit', e => {
        e.preventDefault();
        const name = document.getElementById('jn-new-name');
        const charId = document.getElementById('jn-new-char').value;
        if (!name.value.trim() && !charId) { flash('Give the journal a name, or pick a character.', true); name.focus(); return; }
        if (newJournal(name.value, charId)) {
            name.value = '';
            toggleStart(false);
            flash('📓 Journal started.');
        }
    });

    document.getElementById('jn-name').addEventListener('change', e => {
        cur.name = jnLine(e.target.value, JN_LIMITS.name);
        persist();
        renderBar();
        document.getElementById('jn-print-head').innerHTML = `<b>${esc(cur.name || 'Player journal')}</b>${charLine(cur) ? ' · ' + esc(charLine(cur)) : ''}`;
    });
    document.getElementById('jn-char').addEventListener('change', e => {
        cur.char = e.target.value;
        const c = charFor(cur);
        if (c && !cur.name) cur.name = c.name;
        persist();
        render();
    });

    document.getElementById('jn-add').addEventListener('click', e => {
        const b = e.target.closest('[data-add]');
        if (b) startEntry(b.dataset.add);
    });
    document.getElementById('jn-kinds').addEventListener('click', e => {
        const b = e.target.closest('[data-kind]');
        if (!b) return;
        view.kind = b.dataset.kind;
        renderBody();
        setUrl();
    });
    let qTimer = 0;
    document.getElementById('jn-q').addEventListener('input', e => {
        clearTimeout(qTimer);
        qTimer = setTimeout(() => { view.q = jnLine(e.target.value, 80); renderBody(); setUrl(); }, 150);
    });
    const tagClick = e => {
        const b = e.target.closest('[data-tag]');
        if (!b) return false;
        view.tag = view.tag === b.dataset.tag ? '' : b.dataset.tag;
        renderBody();
        setUrl();
        return true;
    };
    document.getElementById('jn-tags').addEventListener('click', tagClick);

    const list = document.getElementById('jn-list');
    list.addEventListener('click', e => {
        if (tagClick(e)) return;
        const b = e.target.closest('[data-act]');
        if (!b) return;
        const act = b.dataset.act;
        if (act === 'edit') { setEditing({ id: b.dataset.id }); return; }
        if (act === 'del') { deleteEntry(b.dataset.id, b); return; }
        if (act === 'done') {
            const q = cur.entries.find(x => x.id === b.dataset.id);
            if (!q) return;
            q.status = 'done';
            q.updated = Date.now();
            persist();
            render();
            flash(`✅ Quest done: ${jnTitle(q)}.`);
        }
    });
    const slot = document.getElementById('jn-editor-slot');
    slot.addEventListener('click', e => { if (e.target.closest('[data-act="cancel"]')) setEditing(null); });
    slot.addEventListener('submit', e => {
        e.preventDefault();
        saveEditor(e.target);
    });
    slot.addEventListener('keydown', e => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            saveEditor(e.target.closest('.jn-editor'));
        }
        if (e.key === 'Escape') setEditing(null);
    });

    document.getElementById('jn-export').addEventListener('click', exportJournal);
    document.getElementById('jn-import').addEventListener('click', () => document.getElementById('jn-file').click());
    document.getElementById('jn-file').addEventListener('change', e => { importJournal(e.target.files[0]); e.target.value = ''; });
    document.getElementById('jn-print').addEventListener('click', () => window.print());
    document.getElementById('jn-copy').addEventListener('click', copyText);
    document.getElementById('jn-delete').addEventListener('click', e => deleteJournal(e.currentTarget));

    // Another tab saved a journal or a character: pick up the change unless an editor is open.
    window.addEventListener('storage', e => {
        if (e.key !== JN_KEY && e.key !== JN_CB_KEY) return;
        chars = jnCharacters();
        if (e.key === JN_KEY && !editing) {
            const draft = jns.find(j => !j.kept && !j.entries.length);
            jns = jnLoadAll();
            jns.forEach(j => { j.kept = true; });
            if (draft && !jns.some(j => j.char === draft.char)) jns.unshift(draft);
            cur = (cur && jns.find(j => j.id === cur.id)) || jns[0] || null;
        }
        render();
    });
});
