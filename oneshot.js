/* ============================================
   ONE-SHOT GENERATOR (F73): the page for oneshot-engine.js.
   A whole adventure as one printable module: the truth, three acts, the site's map and key,
   the hoard, the ending, and every monster's stat block at the back. Each part (OS_PARTS)
   has 🔒 keep and 🎲 reroll; Roll New Adventure leaves kept parts alone.
   The address bar holds it all, so a reload or a shared link rebuilds the same adventure:
     ?seed=&level=&party=&len=&tone=&kind=&set=part.seed,…&lock=part,…&art=<article id>
   art: an article's "Use This in My Campaign" block (articles.json `campaign`) gives the
   title, the job, the patron, the town, and a clue; with no seed, the seed follows the id.
   A new adventure (no seed in the URL) starts at the Toolbox Party tab's level and size.
   Nothing is stored except what Save to Notebook writes (notebook.js).
   ============================================ */

const OS_PART_LABELS = { site: 'Site & villain', plot: 'Plot & twist', hook: 'Town & patron', road: 'Road', hoard: 'Hoard' };

const os = { seed: '', level: 3, party: 4, len: 'standard', tone: '', kind: '', set: {}, lock: [], art: '', given: null, data: null };

function esc(s) {
    return String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

let flashTimer = 0;
function flash(msg, bad = false) {
    const el = document.getElementById('os-status');
    el.textContent = msg;
    el.classList.toggle('os-bad', bad);
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => { el.textContent = ''; }, 5000);
}

// ── Address bar ──────────────────────────────────────────
function osParams() {
    const p = { seed: os.seed, level: os.level, party: os.party };
    if (os.len !== 'standard') p.len = os.len;
    if (os.tone) p.tone = os.tone;
    if (os.kind) p.kind = os.kind;
    const set = OS_PARTS.filter(id => os.set[id]).map(id => `${id}.${os.set[id]}`);
    if (set.length) p.set = set.join(',');
    if (os.lock.length) p.lock = os.lock.join(',');
    if (os.art) p.art = os.art;
    return p;
}

function osFromUrl() {
    const q = urlParams();
    os.art = /^[a-z0-9][a-z0-9-]{0,99}$/.test(q.get('art') || '') ? q.get('art') : '';
    os.seed = parseSeed(q.get('seed')) || (os.art ? hashString(os.art + '/oneshot').toString(36) : newSeed());
    os.level = q.get('level') ? osClamp(q.get('level'), 1, 20, 0) : 0;
    os.party = q.get('party') ? osClamp(q.get('party'), 1, 8, 0) : 0;
    if (!os.level || !os.party) {
        const list = typeof loadParty === 'function' && !q.get('seed') ? loadParty() : [];
        os.level = os.level || (list.length ? partyLevel(list) : 3);
        os.party = os.party || (list.length ? Math.min(8, list.length) : 4);
    }
    os.len = OS_LENGTHS[q.get('len')] ? q.get('len') : 'standard';
    os.tone = OS_TONES[q.get('tone')] ? q.get('tone') : '';
    os.kind = SITE_KINDS[q.get('kind')] ? q.get('kind') : '';
    os.set = {};
    (q.get('set') || '').split(',').forEach(t => {
        const [id, seed] = t.split('.');
        if (OS_PARTS.includes(id) && parseSeed(seed)) os.set[id] = seed;
    });
    os.lock = [...new Set((q.get('lock') || '').split(',').filter(id => OS_PARTS.includes(id)))];
}

// An article's campaign block as the engine's `given` (null when it has none).
async function osLoadArticle(id) {
    if (!id) return null;
    try {
        const res = await fetch('articles.json');
        const list = await res.json();
        const a = (Array.isArray(list) ? list : list.articles || []).find(x => x.id === id);
        const c = a && !a.real && a.campaign;
        if (!c) return null;
        return {
            article: { id: a.id, title: a.title },
            title: c.hook && c.hook.title, hook: c.hook && c.hook.text,
            npc: c.npc || null, place: c.location && c.location.name, placeText: c.location && c.location.text, tavern: !!(c.location && c.location.tavern),
            rumor: c.rumor
        };
    } catch (e) {
        return null;
    }
}

function osRoll() {
    os.data = rollOneShot(os.seed, { level: os.level, party: os.party, length: os.len, tone: os.tone, kind: os.kind, given: os.given }, os.set);
}

function osChanged(push = false) {
    setUrlParams(osParams(), push);
    osRoll();
    render();
}

// ── Drawing (the module itself is oneShotBodyHtml in oneshot-view.js) ──
function osPartTools(id) {
    const locked = os.lock.includes(id), label = OS_PART_LABELS[id];
    return `<span class="os-tools">
        <button type="button" class="os-icon" data-lock="${id}" aria-pressed="${locked}" aria-label="${locked ? 'Unlock' : 'Keep'} ${label}" title="${locked ? `Kept: Roll New Adventure leaves the ${label.toLowerCase()} alone` : `Keep the ${label.toLowerCase()}`}">${locked ? '🔒' : '🔓'}</button>
        <button type="button" class="os-icon" data-reroll="${id}" aria-label="Reroll ${label}" title="Reroll the ${label.toLowerCase()}">🎲</button>
    </span>`;
}

function osHead(tag, title, part) {
    return `<header class="os-act-head${os.lock.includes(part) ? ' os-locked' : ''}"><span class="os-act-tag">${tag}</span><h3>${esc(title)}</h3>${part ? osPartTools(part) : ''}</header>`;
}

function render() {
    const o = os.data;
    document.getElementById('os-level').value = os.level;
    document.getElementById('os-party').value = os.party;
    document.getElementById('os-len').value = os.len;
    document.getElementById('os-tone').value = os.tone;
    document.getElementById('os-kind').value = os.kind;
    const T = OS_TONES[o.tone], K = SITE_KINDS[o.kind];
    const art = os.given && os.given.article;
    document.getElementById('os-module').innerHTML = `
        <header class="os-title">
            <p class="os-kicker">${T.icon} ${esc(T.label)} · ${K.icon} ${esc(K.label)} · ${esc(OS_LENGTHS[o.length].label)} · party of ${o.party}, level ${o.level}</p>
            <h2>${esc(o.title)}</h2>
            <p class="os-pitch">${esc(o.pitch)}</p>
            ${art ? `<p class="os-from">📰 From the Gazette: <a href="a/${esc(art.id)}">${esc(art.title)}</a></p>` : ''}
        </header>

        ${oneShotBodyHtml(o, { head: osHead, tools: osPartTools })}`;
}

// ── Actions ──────────────────────────────────────────────
function rollNew() {
    os.seed = newSeed();
    OS_PARTS.forEach(id => { if (!os.lock.includes(id)) delete os.set[id]; });
    osChanged(true);
}

// A quest (linked to this page) and the site (the Worldbuilder's Sites tab), linked to each other.
function saveToNotebook() {
    const o = os.data;
    const href = 'dnd-one-shot-generator?' + paramsQuery(osParams());
    const notes = [o.pitch, `Truth: ${o.truth}`, `Patron: ${o.patron.name}, ${o.patron.role}, at ${o.tavern.name} in ${o.town}.`,
        `The job: ${o.job}`, `Site: ${o.site.name}.`, ...o.threads.map(t => `Thread: ${t}`)].join('\n');
    const quest = nbAdd({ kind: 'quest', title: o.title, sub: `One-shot · ${OS_TONES[o.tone].label} · level ${o.level}`, href, notes,
        dm: `Twist: ${o.twist}\nPatron's secret: ${o.patron.secret}`, giver: o.patron.name, reward: formatCoins(o.reward), status: 'open' });
    if (!quest || quest.full) return flash(quest && quest.full ? 'The notebook is full; delete some entries first.' : 'Could not save: this browser\'s storage is full or blocked.', true);
    const site = nbAdd({ kind: 'sites', title: o.site.name, sub: siteSummary(o.site), href: osSiteLink(o) });
    if (site && site.entry && quest.entry) {
        const nb = nbLoad();
        if (nbLink(nb, quest.entry.id, site.entry.id)) nbStore(nb);
    }
    flash(quest.existed ? '📒 Already in the notebook.' : '📒 Saved the quest and the site to the Campaign Notebook.');
}

function osPrint() {
    document.querySelectorAll('.os-sb').forEach(d => { d.open = true; });
    window.print();
}

document.addEventListener('DOMContentLoaded', async () => {
    document.getElementById('year').textContent = new Date().getFullYear();
    const level = document.getElementById('os-level');
    for (let l = 1; l <= 20; l++) level.add(new Option(`Level ${l}`, String(l)));
    const party = document.getElementById('os-party');
    for (let n = 1; n <= 8; n++) party.add(new Option(`${n} character${n === 1 ? '' : 's'}`, String(n)));
    document.getElementById('os-len').innerHTML = Object.entries(OS_LENGTHS).map(([k, v]) => `<option value="${k}">${esc(v.label)}</option>`).join('');
    document.getElementById('os-tone').innerHTML = '<option value="">🎲 Any tone</option>' + Object.entries(OS_TONES).map(([k, v]) => `<option value="${k}">${v.icon} ${esc(v.label)}</option>`).join('');
    document.getElementById('os-kind').innerHTML = '<option value="">🎲 Any site</option>' + Object.entries(SITE_KINDS).map(([k, v]) => `<option value="${k}">${v.icon} ${esc(v.label)}</option>`).join('');

    osFromUrl();
    os.given = await osLoadArticle(os.art);
    if (os.art && !os.given) { os.art = ''; flash('That article has no campaign block, so this adventure is all rolled.', true); }
    setUrlParams(osParams(), false);
    osRoll();
    render();
    loadMonsterBlocks().then(render, () => {});

    partyChip(document.getElementById('os-party-chip'), {
        label: 'Use the Party', title: "Set the party level and size to the Toolbox Party tab's",
        act: list => { os.level = partyLevel(list); os.party = Math.min(8, list.length); osChanged(); }
    });

    [['level', 'level'], ['party', 'party'], ['len', 'len'], ['tone', 'tone'], ['kind', 'kind']].forEach(([id, key]) =>
        document.getElementById('os-' + id).addEventListener('change', e => {
            os[key] = key === 'level' || key === 'party' ? Number(e.target.value) : e.target.value;
            osChanged();
        }));

    const mod = document.getElementById('os-module');
    mod.addEventListener('click', e => {
        const k = e.target.closest('.sm-key');
        if (k) {
            const el = document.getElementById('site-r' + k.dataset.room);
            if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); el.focus({ preventScroll: true }); }
            return;
        }
        const sp = e.target.closest('.sb-spell');
        if (sp) { sbSpellClick(sp, sp.closest('.sb-box')); return; }
        const b = e.target.closest('button[data-lock], button[data-reroll]');
        if (!b) return;
        const id = b.dataset.lock || b.dataset.reroll;
        if (b.dataset.lock) {
            if (os.lock.includes(id)) os.lock = os.lock.filter(x => x !== id);
            else { os.lock.push(id); os.set[id] = os.data.seeds[id]; }
        } else {
            os.set[id] = newSeed();
        }
        osChanged(!b.dataset.lock);
        const again = document.querySelector(`#os-module [data-${b.dataset.lock ? 'lock' : 'reroll'}="${id}"]`);
        if (again) again.focus({ preventScroll: true });
    });
    mod.addEventListener('keydown', e => {
        const k = e.target.closest('.sm-key');
        if (k && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); k.dispatchEvent(new MouseEvent('click', { bubbles: true })); }
    });
    document.getElementById('os-roll').addEventListener('click', rollNew);
    document.getElementById('os-copy').addEventListener('click', () => {
        (navigator.clipboard ? navigator.clipboard.writeText(oneShotText(os.data)) : Promise.reject())
            .then(() => flash('📋 Adventure copied.'), () => flash('Could not copy; select the text and copy it by hand.', true));
    });
    document.getElementById('os-link').addEventListener('click', () => copyPageLink(ok => flash(ok === false ? 'Could not copy the link.' : '🔗 Link copied. It opens this same adventure.', ok === false)));
    document.getElementById('os-print').addEventListener('click', osPrint);
    document.getElementById('os-save').addEventListener('click', saveToNotebook);
    document.getElementById('os-site').addEventListener('click', () => { location.href = osSiteLink(os.data); });
    window.addEventListener('popstate', async () => {
        const art = os.art;
        osFromUrl();
        if (os.art !== art) os.given = await osLoadArticle(os.art);
        osRoll();
        render();
    });
});
