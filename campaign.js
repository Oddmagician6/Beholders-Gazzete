/* ============================================
   CAMPAIGN GENERATOR (F74): the page for campaign-engine.js.
   The campaign's outline (the villain and the scheme, the front, the world, the cast, and the
   chapters in short), then one chapter at a time as a full one-shot module (oneshot-view.js).
   The world, the arc, and each chapter have 🔒 keep and 🎲 reroll; Roll New Campaign leaves kept
   parts alone. A new campaign reads the world from the Campaign Notebook (its latest pantheon,
   factions, and history) when there is one there.
   The address bar holds it all, so a reload or a shared link rebuilds the same campaign:
     ?seed=&level=&party=&len=&tone=&set=part.seed,…&lock=part,…&ch=<chapter, from 1>
      &gods=&gsize=&gshape=&gnaming=  &facs=&fcount=&ffocus=&fscale=  &his=&hages=&hspan=&hstart=
   (the world's links, the same keys as the Worldbuilder's, so saving links it to those entries).
   Nothing is stored except what Save to Notebook writes (notebook.js).
   ============================================ */

const CP_PART_LABELS = { world: 'World', arc: 'Villain & arc' };
const CP_WORLD_KEYS = Object.keys(CP_USES);

const cps = { seed: '', level: 1, party: 4, len: 'standard', tone: '', links: {}, set: {}, lock: [], ch: 0, data: null };

function cpLabel(id) {
    return CP_PART_LABELS[id] || `Chapter ${Number(id.slice(2)) + 1}`;
}

let cpFlashTimer = 0;
function flash(msg, bad = false) {
    const el = document.getElementById('cp-status');
    el.textContent = msg;
    el.classList.toggle('os-bad', bad);
    clearTimeout(cpFlashTimer);
    cpFlashTimer = setTimeout(() => { el.textContent = ''; }, 5000);
}

// ── The world's links ────────────────────────────────────
// One part of the world from a link's keys (key: gods, facs, his), or null.
function cpLinkFrom(q, key) {
    const keys = CP_USES[key].keys, seed = parseSeed(q.get(Object.keys(keys)[0]));
    if (!seed) return null;
    const o = { seed };
    Object.entries(keys).slice(1).forEach(([mine, theirs]) => { if (q.get(mine)) o[theirs] = q.get(mine); });
    return o;
}

// The notebook's latest pantheon, factions, and history, as links (the factions' own pantheon first,
// then the history's, so the gods they name are the ones the campaign uses).
function cpNotebookWorld() {
    const nb = nbLoad();
    const latest = kind => nb.entries.filter(e => e.kind === kind && e.href && nbQuery(e.href).get('seed'))
        .sort((a, b) => String(b.added || '').localeCompare(String(a.added || '')))[0] || null;
    const own = (e, key) => {
        const q = nbQuery(e.href), first = Object.keys(CP_USES[key].keys)[0];
        const p = new URLSearchParams({ [first]: q.get('seed') });
        Object.entries(CP_USES[key].keys).slice(1).forEach(([mine, theirs]) => { if (q.get(theirs)) p.set(mine, q.get(theirs)); });
        return cpLinkFrom(p, key);
    };
    const fe = latest('factions'), pe = latest('pantheon'), he = latest('history');
    const links = { facs: fe ? own(fe, 'facs') : null, his: he ? own(he, 'his') : null };
    links.gods = (fe && cpLinkFrom(nbQuery(fe.href), 'gods')) || (he && cpLinkFrom(nbQuery(he.href), 'gods')) || (pe ? own(pe, 'gods') : null);
    return links;
}

function cpHasLinks(links) {
    return CP_WORLD_KEYS.some(k => links[k]);
}

// ── Address bar ──────────────────────────────────────────
function cpParams(withChapter = true) {
    const p = { seed: cps.seed, level: cps.level, party: cps.party };
    if (cps.len !== 'standard') p.len = cps.len;
    if (cps.tone) p.tone = cps.tone;
    const set = CP_PARTS.filter(id => cps.set[id]).map(id => `${id}.${cps.set[id]}`);
    if (set.length) p.set = set.join(',');
    if (cps.lock.length) p.lock = cps.lock.join(',');
    if (withChapter && cps.ch) p.ch = cps.ch + 1;
    CP_WORLD_KEYS.forEach(k => { if (cps.links[k]) Object.assign(p, cpLinkParams(cps.links[k], k)); });
    return p;
}

function cpFromUrl() {
    const q = urlParams();
    const fresh = !parseSeed(q.get('seed'));
    cps.seed = parseSeed(q.get('seed')) || newSeed();
    cps.level = q.get('level') ? osClamp(q.get('level'), 1, 20, 0) : 0;
    cps.party = q.get('party') ? osClamp(q.get('party'), 1, 8, 0) : 0;
    if (!cps.level || !cps.party) {
        const list = typeof loadParty === 'function' && fresh ? loadParty() : [];
        cps.level = cps.level || (list.length ? partyLevel(list) : 1);
        cps.party = cps.party || (list.length ? Math.min(8, list.length) : 4);
    }
    cps.len = Object.hasOwn(CP_LENGTHS, q.get('len')) ? q.get('len') : 'standard';
    cps.tone = Object.hasOwn(OS_TONES, q.get('tone')) ? q.get('tone') : '';
    cps.set = {};
    (q.get('set') || '').split(',').forEach(t => {
        const [id, seed] = t.split('.');
        if (CP_PARTS.includes(id) && parseSeed(seed)) cps.set[id] = seed;
    });
    cps.lock = [...new Set((q.get('lock') || '').split(',').filter(id => CP_PARTS.includes(id)))];
    cps.links = Object.fromEntries(CP_WORLD_KEYS.map(k => [k, cpLinkFrom(q, k)]));
    // A new campaign starts on the notebook's world, when it has one.
    if (fresh && !cpHasLinks(cps.links)) cps.links = cpNotebookWorld();
    cps.ch = Math.max(0, osClamp(q.get('ch'), 1, CP_MAX, 1) - 1);
}

function cpRoll() {
    cps.data = rollCampaign(cps.seed, { level: cps.level, party: cps.party, length: cps.len, tone: cps.tone, world: cps.links }, cps.set);
    cps.ch = Math.min(cps.ch, cps.data.n - 1);
}

function cpChanged(push = false) {
    cpRoll();
    setUrlParams(cpParams(), push);
    render();
}

// ── Drawing ──────────────────────────────────────────────
function cpTools(id) {
    const locked = cps.lock.includes(id), label = cpLabel(id);
    return `<span class="os-tools">
        <button type="button" class="os-icon" data-lock="${id}" aria-pressed="${locked}" aria-label="${locked ? 'Unlock' : 'Keep'} ${label}" title="${locked ? `Kept: Roll New Campaign leaves ${label.toLowerCase()} alone` : `Keep ${label.toLowerCase()}`}">${locked ? '🔒' : '🔓'}</button>
        <button type="button" class="os-icon" data-reroll="${id}" aria-label="Reroll ${label}" title="Reroll ${label.toLowerCase()}">🎲</button>
    </span>`;
}

function cpHead(tag, title, part, cls = '') {
    return `<header class="os-act-head${part && cps.lock.includes(part) ? ' os-locked' : ''}"><span class="os-act-tag${cls}">${esc(tag)}</span><h3>${esc(title)}</h3>${part ? cpTools(part) : ''}</header>`;
}

function cpFactionHtml(cp, i, role) {
    const W = cp.world, w = W.factions, f = w.factions[i], t = FAC_TYPES[f.type];
    const keep = ['What they are', 'Goal', 'Right now', 'God', 'Leader', 'Base', 'Symbol', 'Secret'];
    const lines = facLines(w, i, W.ctx).filter(([k]) => keep.includes(k)).map(([k, v]) => [k, osCap(v)]);
    return `<div class="cp-fac">
        <h4>${t.icon} ${esc(osCap(facName(w, i, W.ctx)))} <span class="wb-tag">${esc(role)}</span></h4>
        ${osDl(lines)}
    </div>`;
}

function cpChapterList(cp) {
    return cp.chapters.map(ch => {
        const o = ch.o, K = SITE_KINDS[ch.kind], id = 'ch' + ch.i, open = ch.i === cps.ch;
        return `<li class="cp-card${open ? ' cp-open' : ''}${cps.lock.includes(id) ? ' os-locked' : ''}">
            <span class="cp-n">${ch.i + 1}</span>
            <div class="cp-card-body">
                <h4>${esc(o.title)}</h4>
                <p class="os-dim">Level ${ch.level} · ${K.icon} ${esc(o.site.name)} · hired by ${esc(o.patron.name)}</p>
                <p>${esc(ch.serves)}</p>
                ${ch.reveal ? `<p class="cp-reveal">👁️ ${esc(ch.reveal)}</p>` : ''}
            </div>
            <div class="cp-card-tools">
                <button type="button" class="os-btn${open ? ' os-gold' : ''}" data-ch="${ch.i}" aria-pressed="${open}">📖 ${open ? 'Reading' : 'Read'}</button>
                ${cpTools(id)}
            </div>
        </li>`;
    }).join('');
}

function cpOverviewHtml(cp) {
    const T = OS_TONES[cp.tone], v = cp.villain, W = cp.world;
    const read = CP_WORLD_KEYS.filter(k => W[k].read).map(k => ({ gods: 'pantheon', facs: 'factions', his: 'history' }[k]));
    const worldNote = read.length ? `📒 From your Campaign Notebook: the ${read.length > 2 ? read.join(', ').replace(/, ([^,]*)$/, ', and $1') : read.join(' and ')}${read.length < 3 ? `; the rest is rolled for this campaign` : ''}.`
        : '🎲 Rolled for this campaign. Save it to the notebook to keep this world, or roll your own in the Worldbuilder first.';
    const wb = tab => `<a class="os-btn" href="${esc(cpWorldHref(W, tab))}">${{ factions: '🏛️ Factions', pantheon: '⛪ Pantheon', history: '📜 History' }[tab]} in the Worldbuilder</a>`;
    const fac = cp.factions;
    const contactsUsed = new Map();
    cp.chapters.forEach(ch => { const k = ch.contact.name; contactsUsed.set(k, [...(contactsUsed.get(k) || []), ch.i + 1]); });
    const chs = list => list && list.length ? `chapter${list.length > 1 ? 's' : ''} ${list.join(', ')}` : '';
    const cast = [
        ['The villain', `${v.name}, ${v.title.toLowerCase()} of ${v.faction} (${osCap(v.race)}, ${parseInt(v.age, 10)}). ${v.style} Play them: ${v.trait}. Voice: ${v.voice}.`],
        ...cp.lts.map(l => [osCap(l.role), `${l.name} (${osCap(l.race)}), ${cpPoss(v.faction)} ${l.role.toLowerCase()}. ${osCap(l.motive)} ${l.chapter !== null ? `Runs chapter ${l.chapter + 1}.` : 'Not met in any chapter yet: use them where you need a face.'}`]),
        ...cp.contacts.map(p => [p === cp.contacts[cp.contacts.length - 1] ? 'Patron' : 'Contact', `${p.name} (${osCap(p.race)}), ${p.role}. Hires the party in ${chs(contactsUsed.get(p.name)) || 'no chapter yet'}.`])
    ];
    return `
        <header class="os-title">
            <p class="os-kicker">${T.icon} ${esc(T.label)} · ${cp.n} chapters · party of ${cp.party}, levels ${cp.start} to ${cp.end}</p>
            <h2>${esc(cp.title)}</h2>
            <p class="os-pitch">${esc(cp.pitch)}</p>
        </header>

        <section class="os-act os-truth">
            ${cpHead('For the DM', 'The villain and the scheme', 'arc')}
            ${osDl([
                ['The villain', `${v.name}, ${v.title.toLowerCase()} of ${v.faction}.`],
                ['The scheme', `${osCap(v.name)} ${v.scheme}.`],
                ['What everyone wants', `${osCap(cp.relic.text)}. ${cp.relic.about}`],
                cp.wound ? ['The old wound', `${cp.wound.text} (It goes back to ${cp.wound.from}.)`] : null,
                ['Their god', cp.deity ? `${v.faction} follow${facIsPlural(v.faction) ? '' : 's'} ${cp.deity.full || cp.god}.` : `${osCap(cp.god)} looks kindly on the scheme, or ${v.name} says so.`],
                ['A false name', `${osCap(cpPoss(v.faction))} people call ${v.name} only ${cp.alias}. The party learns the real name in chapter ${cp.reveal + 1}.`],
                ['Both sides', cp.wildText],
                ['The secret', v.secret],
                ['The doom', cp.doom]
            ])}
        </section>

        <section class="os-act">
            ${cpHead('The front', `${cp.n} segments to the doom`, '')}
            <p>Tick one segment after every chapter, and a second when the party fails a chapter or walks away from it. When the last one fills, the doom happens. Read the next segment's line at the start of each chapter, as news.</p>
            <ol class="cp-front">${cp.front.map((t, i) => `<li${i === cp.front.length - 1 ? ' class="cp-doom"' : ''}><span class="cp-seg" aria-hidden="true"></span><span><strong>${i === cp.front.length - 1 ? 'Doom' : `After chapter ${i + 1}`}:</strong> ${esc(t)}</span></li>`).join('')}</ol>
        </section>

        <section class="os-act">
            ${cpHead('The world', 'Who is in play', 'world')}
            <p class="os-dim">${esc(worldNote)}</p>
            ${cpFactionHtml(cp, fac.villain, 'the villain')}
            ${cpFactionHtml(cp, fac.patron, 'the patron')}
            ${fac.wild !== null ? cpFactionHtml(cp, fac.wild, 'both sides') : ''}
            <p class="os-links">${wb('factions')} ${wb('pantheon')} ${wb('history')}</p>
        </section>

        <section class="os-act">
            ${cpHead('The cast', 'Who keeps coming back', '')}
            ${osDl(cast)}
        </section>

        <section class="os-act">
            ${cpHead('The chapters', `${cp.n} adventures, level ${cp.start} to ${cp.end}`, '')}
            <ol class="cp-list">${cpChapterList(cp)}</ol>
        </section>`;
}

// What ties a chapter to the campaign, above its module.
function cpGlueHtml(cp, ch, tools) {
    const next = cp.chapters[ch.i + 1];
    const head = tools ? cpHead(`Chapter ${ch.i + 1} of ${cp.n}`, ch.o.title, 'ch' + ch.i) : osPlainHead(`Chapter ${ch.i + 1} of ${cp.n}`, ch.o.title);
    return `<section class="os-act cp-glue">
        ${head}
        <p class="os-kicker">${SITE_KINDS[ch.kind].icon} ${esc(SITE_KINDS[ch.kind].label)} · ${esc(OS_LENGTHS[ch.o.length].label)} · party of ${cp.party}, level ${ch.level}</p>
        <p class="os-pitch">${esc(ch.o.pitch)}</p>
        ${osDl([
            ['In the campaign', ch.serves],
            ch.i > 0 ? ['The news', `Since the last chapter: ${cp.front[ch.i - 1]}`] : ['The start', `Nobody has heard of ${cp.villain.name} yet. ${osCap(cp.villain.faction)} ${facIsPlural(cp.villain.faction) ? 'are' : 'is'} just one more power in ${cp.realm}.`],
            ch.reveal ? ['The reveal', ch.reveal] : null,
            ch.lead ? ['The way on', ch.lead] : null,
            next ? ['Afterward', `Tick the front. ${next.level > ch.level ? `The party reaches level ${next.level} before chapter ${ch.i + 2}.` : `The party stays at level ${ch.level}.`}`]
                : ['Afterward', `If they win, the scheme dies with ${cp.villain.name}'s hopes. If they fail: ${cp.doom}`]
        ])}
    </section>`;
}

function cpChapterHtml(cp) {
    const ch = cp.chapters[cps.ch];
    const nav = `<nav class="cp-nav" aria-label="Chapters">
        <button type="button" class="os-btn" data-ch="${ch.i - 1}"${ch.i === 0 ? ' disabled' : ''}>◀ ${ch.i === 0 ? 'Back' : `Chapter ${ch.i}`}</button>
        <span class="os-dim">Chapter ${ch.i + 1} of ${cp.n}</span>
        <button type="button" class="os-btn" data-ch="${ch.i + 1}"${ch.i === cp.n - 1 ? ' disabled' : ''}>${ch.i === cp.n - 1 ? 'Next' : `Chapter ${ch.i + 2}`} ▶</button>
    </nav>`;
    return `${nav}${cpGlueHtml(cp, ch, true)}${oneShotBodyHtml(ch.o)}${nav}`;
}

function render() {
    const cp = cps.data;
    document.getElementById('cp-level').value = cps.level;
    document.getElementById('cp-party').value = cps.party;
    document.getElementById('cp-len').value = cps.len;
    document.getElementById('cp-tone').value = cps.tone;
    const nbWorld = cpHasLinks(cpNotebookWorld());
    const worldSel = document.getElementById('cp-world');
    worldSel.querySelector('option[value="nb"]').disabled = !nbWorld && !cpHasLinks(cps.links);
    worldSel.value = cpHasLinks(cps.links) ? 'nb' : 'roll';
    document.getElementById('cp-overview').innerHTML = cpOverviewHtml(cp);
    document.getElementById('cp-chapter').innerHTML = cpChapterHtml(cp);
}

// The whole campaign for print: every chapter, then one appendix of every monster.
function cpBookHtml(cp) {
    const seen = new Set();
    const all = [];
    cp.chapters.forEach(ch => osMonsters(ch.o).forEach(m => { if (!seen.has(m.id)) { seen.add(m.id); all.push(m); } }));
    all.sort((a, b) => b.xp - a.xp || a.name.localeCompare(b.name));
    return cp.chapters.map(ch => `<div class="cp-book-ch">${cpGlueHtml(cp, ch, false)}${oneShotBodyHtml(ch.o, { appendix: false })}</div>`).join('')
        + `<section class="os-act os-appendix">${osPlainHead('Appendix', 'Stat blocks')}${all.map(m => `<details class="os-sb" open>
            <summary>${esc(m.name)} <span class="os-dim">CR ${esc(m.cr)} · ${m.xp.toLocaleString('en-US')} XP</span></summary>
            <div class="sb-box">${monsterBlockHtml(m)}</div></details>`).join('')}</section>`;
}

// ── Actions ──────────────────────────────────────────────
function rollNew() {
    cps.seed = newSeed();
    CP_PARTS.forEach(id => { if (!cps.lock.includes(id)) delete cps.set[id]; });
    cps.ch = 0;
    cpChanged(true);
}

function cpPrint(all) {
    const book = document.getElementById('cp-book');
    if (all) book.innerHTML = cpBookHtml(cps.data);
    document.body.classList.add(all ? 'cp-print-all' : 'cp-print-ch');
    document.querySelectorAll('.os-sb').forEach(d => { d.open = true; });
    window.print();
}

window.addEventListener('afterprint', () => {
    document.body.classList.remove('cp-print-all', 'cp-print-ch');
    document.getElementById('cp-book').innerHTML = '';
});

// The world entries for a rolled world, titled as the Worldbuilder's own tabs title them.
function cpWorldEntry(W, tab) {
    if (tab === 'pantheon') return { title: osCap(W.pantheon.name), sub: panSummary(W.pantheon) };
    if (tab === 'factions') {
        const w = W.factions, place = osCap(FAC_SCALES[w.scale].place.replace(/^the /, ''));
        return { title: `${place}: ${osCap(facName(w, 0, W.ctx))} and ${w.factions.length - 1} more`, sub: facSummary(w, W.ctx) };
    }
    const h = W.history;
    return { title: `From ${h.list[0].name} to ${h.list[h.list.length - 1].name}`, sub: hisSummary(h) };
}

// The campaign as a quest, each chapter as a quest of its own, and the world they stand on, all linked.
function saveToNotebook() {
    const cp = cps.data, v = cp.villain;
    const href = 'dnd-campaign-generator?' + paramsQuery(cpParams(false));
    // The scheme and the front are the DM's alone, as on the page: the 🔒 notes, never the players' ones.
    const dm = [`The scheme: ${osCap(v.name)} ${v.scheme}.`, `What everyone wants: ${cp.relic.text}.`,
        'The front:', ...cp.front.map((t, i) => `${i + 1}. ${t}`), `Secret: ${v.secret}`, `Their people call ${v.name} ${cp.alias}.`].join('\n');
    const main = nbAdd({ kind: 'quest', title: cp.title, sub: `Campaign · ${cp.n} chapters · levels ${cp.start} to ${cp.end}`, href, notes: cp.pitch,
        dm, giver: cp.contacts[cp.contacts.length - 1].name, status: 'open' });
    if (!main || main.full) return flash(main && main.full ? 'The notebook is full; delete some entries first.' : 'Could not save: this browser\'s storage is full or blocked.', true);
    const ids = [];
    let added = 0, missed = 0;
    const tally = r => {
        if (!r || !r.entry) { missed++; return; }
        ids.push(r.entry.id);
        if (!r.existed) added++;
    };
    cp.chapters.forEach(ch => {
        const o = ch.o;
        const r = nbAdd({ kind: 'quest', title: `${cp.title}, chapter ${ch.i + 1}: ${o.title}`, sub: `Level ${ch.level} · ${o.site.name}`,
            href: 'dnd-campaign-generator?' + paramsQuery({ ...cpParams(false), ch: ch.i + 1 }),
            notes: [o.pitch, `In the campaign: ${ch.serves}`, ch.lead ? `The way on: ${ch.lead}` : ''].filter(Boolean).join('\n'),
            dm: `Twist: ${o.twist}\nPatron's secret: ${o.patron.secret}`, giver: o.patron.name, reward: formatCoins(o.reward), status: 'open' });
        tally(r);
    });
    // A rolled world goes in as the Worldbuilder's own entries; a read one is already there (nbAdd links it).
    ['pantheon', 'factions', 'history'].forEach(tab => {
        const key = { pantheon: 'gods', factions: 'facs', history: 'his' }[tab];
        if (cp.world[key].read) return;
        tally(nbAdd({ kind: tab, ...cpWorldEntry(cp.world, tab), href: cpWorldHref(cp.world, tab) }));
    });
    const nb = nbLoad();
    let changed = false;
    ids.forEach(id => { changed = nbLink(nb, main.entry.id, id) || changed; });
    if (changed) nbStore(nb);
    if (missed) return flash(`📒 Saved the campaign, but ${missed} of its chapters and world entries didn't fit (the notebook or this browser's storage is full). Make room and save again to add them.`, true);
    flash(!main.existed ? `📒 Saved the campaign, its ${cp.n} chapters${cp.world.facs.read ? '' : ', and its world'} to the Campaign Notebook.`
        : added ? '📒 Added what was missing to the campaign already in the notebook.' : '📒 Already in the notebook.');
}

function cpShowChapter(i, scroll) {
    cps.ch = Math.max(0, Math.min(cps.data.n - 1, i));
    setUrlParams(cpParams(), true);
    render();
    if (scroll) document.getElementById('cp-chapter').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('year').textContent = new Date().getFullYear();
    const level = document.getElementById('cp-level');
    for (let l = 1; l <= 20; l++) level.add(new Option(`Level ${l}`, String(l)));
    const party = document.getElementById('cp-party');
    for (let n = 1; n <= 8; n++) party.add(new Option(`${n} character${n === 1 ? '' : 's'}`, String(n)));
    document.getElementById('cp-len').innerHTML = Object.entries(CP_LENGTHS).map(([k, v]) => `<option value="${k}">${esc(v.label)}</option>`).join('');
    document.getElementById('cp-tone').innerHTML = '<option value="">🎲 Any tone</option>' + Object.entries(OS_TONES).map(([k, v]) => `<option value="${k}">${v.icon} ${esc(v.label)}</option>`).join('');

    cpFromUrl();
    cpRoll();
    setUrlParams(cpParams(), false);
    render();
    loadMonsterBlocks().then(render, () => {});

    partyChip(document.getElementById('cp-party-chip'), {
        label: 'Use the Party', title: "Set the first chapter's level and the party size to the Toolbox Party tab's",
        act: list => { cps.level = partyLevel(list); cps.party = Math.min(8, list.length); cpChanged(); }
    });

    [['level', 'level'], ['party', 'party'], ['len', 'len'], ['tone', 'tone']].forEach(([id, key]) =>
        document.getElementById('cp-' + id).addEventListener('change', e => {
            cps[key] = key === 'level' || key === 'party' ? Number(e.target.value) : e.target.value;
            cpChanged();
        }));
    document.getElementById('cp-world').addEventListener('change', e => {
        cps.links = e.target.value === 'nb' ? cpNotebookWorld() : {};
        cpChanged();
        flash(e.target.value === 'nb' ? '📒 The world now comes from your Campaign Notebook.' : '🎲 This campaign rolls a world of its own.');
    });

    const page = document.querySelector('.os-main');
    page.addEventListener('click', e => {
        const k = e.target.closest('.sm-key');
        if (k) {
            const el = document.getElementById('site-r' + k.dataset.room);
            if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); el.focus({ preventScroll: true }); }
            return;
        }
        const sp = e.target.closest('.sb-spell');
        if (sp) { sbSpellClick(sp, sp.closest('.sb-box')); return; }
        const c = e.target.closest('button[data-ch]');
        if (c) { cpShowChapter(Number(c.dataset.ch), true); return; }
        const b = e.target.closest('button[data-lock], button[data-reroll]');
        if (!b) return;
        const id = b.dataset.lock || b.dataset.reroll;
        if (b.dataset.lock) {
            if (cps.lock.includes(id)) cps.lock = cps.lock.filter(x => x !== id);
            else {
                cps.lock.push(id);
                cps.set[id] = cps.data.seeds[id];
                // The villain and the patron are people of the world's factions, so keeping them keeps the world.
                if (id === 'arc' && !cps.lock.includes('world')) {
                    cps.lock.push('world');
                    cps.set.world = cps.data.seeds.world;
                    flash('🔒 Kept the world too: the villain and the patron come from its factions.');
                }
            }
        } else {
            cps.set[id] = newSeed();
            // A new world means new links: the reroll leaves the notebook's world for a rolled one.
            if (id === 'world') cps.links = {};
        }
        cpChanged(!b.dataset.lock);
        const again = document.querySelector(`.os-main [data-${b.dataset.lock ? 'lock' : 'reroll'}="${id}"]`);
        if (again) again.focus({ preventScroll: true });
    });
    page.addEventListener('keydown', e => {
        const k = e.target.closest('.sm-key');
        if (k && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); k.dispatchEvent(new MouseEvent('click', { bubbles: true })); }
    });
    document.getElementById('cp-roll').addEventListener('click', rollNew);
    document.getElementById('cp-copy').addEventListener('click', () => {
        (navigator.clipboard ? navigator.clipboard.writeText(campaignText(cps.data)) : Promise.reject())
            .then(() => flash('📋 Campaign outline copied.'), () => flash('Could not copy; select the text and copy it by hand.', true));
    });
    document.getElementById('cp-link').addEventListener('click', () => copyPageLink(ok => flash(ok === false ? 'Could not copy the link.' : '🔗 Link copied. It opens this same campaign.', ok === false)));
    document.getElementById('cp-print').addEventListener('click', () => cpPrint(true));
    document.getElementById('cp-print-ch').addEventListener('click', () => cpPrint(false));
    document.getElementById('cp-save').addEventListener('click', saveToNotebook);
    window.addEventListener('popstate', () => {
        cpFromUrl();
        cpRoll();
        render();
    });
});
