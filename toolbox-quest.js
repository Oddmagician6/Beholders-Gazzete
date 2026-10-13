/* ============================================
   DM TOOLBOX: QUEST TAB (F32)
   A side quest from quest-engine.js (rollQuest): a title, the giver, the job, the place
   and what's there, a first lead, what's in the way, a twist, what's at stake, a deadline,
   a reward scaled to the party, and sometimes a foe that opens in the Encounter tab. Nothing is stored: the URL holds the quest.
   URL: ?tab=quest&seed=&lvl=&n=&job=
   A new quest (no seed in the URL) starts at the Party tab's level and size (party.js); a shared
   one keeps its own (a missing lvl or n means level 3, party of 4).
   ============================================ */

const QUEST_FIELDS = { lvl: 'qs-level', n: 'qs-size', job: 'qs-job' };

let quest = { seed: null, data: null };

function questOpts() {
    return {
        level: Number(document.getElementById('qs-level').value),
        size: Number(document.getElementById('qs-size').value),
        job: document.getElementById('qs-job').value
    };
}

function questParams() {
    const params = {};
    Object.entries(QUEST_FIELDS).forEach(([key, id]) => {
        const el = document.getElementById(id);
        params[key] = fieldValue(el) === defaultValue(el) ? null : el.value;
    });
    params.seed = quest.seed;
    return urlFor('quest', params);
}

// push: true = new history entry, false = replace, null = leave the URL alone.
function rollQuestFor(seed = newSeed(), push = true) {
    quest.seed = seed;
    quest.data = rollQuest(seed, questOpts());
    renderQuest();
    if (push !== null) setUrlParams(questParams(), push);
}

function applyQuestUrl(p) {
    Object.entries(QUEST_FIELDS).forEach(([key, id]) => {
        const el = document.getElementById(id);
        if (!setFieldValue(el, p.get(key))) el.value = defaultValue(el);
    });
    const seed = parseSeed(p.get('seed'));
    if (!seed && !p.has('lvl') && !p.has('n')) questUseParty();
    if (!seed) return false;
    rollQuestFor(seed, null);
    return true;
}

// ── Render ────────────────────────────────────────────────
function questFoeHTML(q) {
    if (!q.foe) return `<p class="tv-muted">No fight is planned. Whether it stays that way is up to the party.</p>`;
    const lvl = ENCOUNTER_LEVELS[q.foe.rating];
    return `<ul class="qs-foes">${q.foe.list.map(e => `
            <li><b>${e.count} × ${esc(e.m.name)}</b> <span class="tv-npc-sub">CR ${esc(e.m.cr)} · AC ${e.m.ac} · HP ${e.m.hp}</span></li>`).join('')}
        </ul>
        <p class="tv-small">${q.foe.xp.toLocaleString('en-US')} XP${lvl ? `: ${lvl.icon} ${esc(lvl.label)} for a party of ${q.size} at level ${q.level}` : ''}.</p>
        <a class="btn qs-enc" href="${esc(questEncounterLink(q))}">👹 Open in Encounter</a>`;
}

function renderQuest() {
    const q = quest.data;
    if (!q) return;
    const j = QUEST_JOBS[q.job], g = q.giver;
    document.getElementById('quest-card').innerHTML = `
        <header class="tv-head">
            <div class="tv-tier">${j.icon} ${esc(j.label)} · party of ${q.size}, level ${q.level}</div>
            <h3 class="tv-name">${esc(q.title)}</h3>
            <p class="qs-task">${esc(q.task)}</p>
        </header>
        <div class="tv-grid">
            <section class="tv-block">
                <h4>🗣️ Quest giver</h4>
                <div class="tv-npc">
                    <span class="tv-icon" aria-hidden="true">${g.portraitIcon}</span>
                    <div>
                        <div class="tv-npc-name">${esc(g.name)}</div>
                        <div class="tv-npc-sub">${npcSub(g, g.profession)}</div>
                    </div>
                </div>
                <p>${esc(g.trait)}. ${esc(g.voice)}.</p>
                <p class="tv-quote">"${esc(g.dialogue)}"</p>
                <p><b class="qs-b">Why you:</b> ${esc(g.why)}</p>
                <p class="tv-secret"><b>Secret:</b> ${esc(g.secret)}</p>
            </section>
            <section class="tv-block">
                <h4>📍 The job</h4>
                <p><b class="qs-b">Where:</b> ${esc(capWord(q.place))}</p>
                <p><b class="qs-b">What's there:</b> ${esc(q.feature)}</p>
                <p><b class="qs-b">Where to start:</b> ${esc(q.lead)}</p>
                <p><b class="qs-b">Deadline:</b> ${esc(q.deadline)}</p>
                <h4 class="tv-h-gap">💰 Reward</h4>
                <p class="qs-reward">${esc(formatCoins(q.reward.gp))} <span class="tv-npc-sub">for the party</span></p>
                <p>${esc(questRewardText(q.reward))}</p>
            </section>
        </div>
        <section class="tv-block tv-wide">
            <h4>🌀 The twist</h4>
            <p>${esc(q.twist)}</p>
            ${q.obstacle ? `<h4 class="tv-h-gap">🚧 In the way</h4>
            <p>${esc(q.obstacle)}</p>` : ''}
            <h4 class="tv-h-gap">⏳ If it fails</h4>
            <p>${esc(q.stakes)}</p>
            <h4 class="tv-h-gap">⚔️ The foe</h4>
            ${questFoeHTML(q)}
        </section>`;
}

// The Party tab's level and size, when a party is saved.
function questUseParty() {
    return partyFillLevelSize(document.getElementById('qs-level'), document.getElementById('qs-size'));
}

function printQuest() {
    if (!quest.data) return;
    document.body.classList.add('print-quest');
    window.print();
}

function setupQuest() {
    const lvl = document.getElementById('qs-level');
    for (let n = 1; n <= 20; n++) lvl.add(new Option(`Level ${n}`, n, n === 3, n === 3));
    const size = document.getElementById('qs-size');
    for (let n = 1; n <= 8; n++) size.add(new Option(`Party of ${n}`, n, n === 4, n === 4));
    const job = document.getElementById('qs-job');
    Object.entries(QUEST_JOBS).forEach(([key, j]) => job.add(new Option(`${j.icon} ${j.label}`, key)));
    questUseParty();
    partyChip(document.getElementById('qs-party-chip'), {
        label: 'Use the Party', title: "Set the level and party size to the Party tab's",
        act: () => { if (questUseParty() && quest.seed) rollQuestFor(quest.seed, false); }
    });

    // Same seed: a new level or size rescales the reward and the foe; a new job keeps the giver.
    Object.values(QUEST_FIELDS).forEach(id => document.getElementById(id).addEventListener('change', () => {
        if (quest.seed) rollQuestFor(quest.seed, false);
    }));
    document.getElementById('qs-roll').addEventListener('click', () => rollQuestFor());
    document.getElementById('qs-copy').addEventListener('click', () => {
        if (quest.data) copyText(questText(quest.data), 'quest-status', 'the quest');
    });
    document.getElementById('qs-print').addEventListener('click', printQuest);
    window.addEventListener('afterprint', () => document.body.classList.remove('print-quest'));
    document.getElementById('qs-link').addEventListener('click', () =>
        copyPageLink(ok => flash('quest-status', ok ? '🔗 Link copied. It opens this same quest.' : '⚠️ Copy blocked by the browser.')));
}
