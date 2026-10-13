/* ============================================
   DM TOOLBOX: MONSTER STAT BLOCKS
   The SRD 5.1 stat block of a monster (monsters-data.js id), drawn from
   monster-statblocks.js. That file and the spell text (spells-data.js) load the first
   time a stat block is needed: call loadMonsterBlocks(), then draw again.
   A homebrew monster (homebrew.js) carries its own block in m.block, in the same shape.
   Used by the Encounter tab (toolbox-encounter.js) and the Initiative tab
   (toolbox-table.js). Spell buttons open cards through spell-detail.js.
   ============================================ */

const SB_ABILITIES = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];
const SB_SECTIONS = [['tr', 'Traits'], ['ac2', 'Actions'], ['ba', 'Bonus Actions'], ['re', 'Reactions'], ['le', 'Legendary Actions']];
let sbLoading = null;

function loadScript(src) {
    return new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = src;
        s.onload = resolve;
        s.onerror = () => reject(new Error(src));
        document.head.appendChild(s);
    });
}

function blocksReady() {
    return typeof MONSTER_BLOCKS !== 'undefined';
}

// Loads the stat blocks and spell text once; after a failed load the next call tries again.
function loadMonsterBlocks() {
    if (!sbLoading) {
        sbLoading = Promise.all([
            blocksReady() ? null : loadScript('monster-statblocks.js'),
            typeof SPELLS_DATA !== 'undefined' ? null : loadScript('spells-data.js')
        ]).catch(err => { sbLoading = null; throw err; });
    }
    return sbLoading;
}

function sbMod(score) {
    const m = Math.floor((score - 10) / 2);
    return m >= 0 ? `+${m}` : `−${-m}`;
}

// One line of SRD text: [[spell]] buttons, and attack labels in italics.
function sbInline(text) {
    return esc(text)
        .replace(/\[\[(.+?)\]\]/g, (_, n) => `<button type="button" class="sb-spell" data-spell="${n}" aria-expanded="false">${n}</button>`)
        .replace(/^((?:Melee or Ranged|Melee|Ranged) (?:Weapon|Spell) Attack:)/, '<em>$1</em>')
        .replace(/ (Hit:)/g, ' <em>$1</em>');
}

// A feature: the bold name and first paragraph, more paragraphs ("Fire Breath. ..." run-ins
// in bold), and "- Label: spells" lines as a spell list with a card for the clicked spell.
function sbFeatureHtml([name, text]) {
    const out = [];
    let list = [];
    const flush = () => {
        if (list.length) out.push(`<ul class="sb-spells">${list.join('')}</ul>`);
        list = [];
    };
    text.split('\n').filter(l => l.trim()).forEach((line, i) => {
        const item = line.match(/^- ([^:]+): (.*)$/);
        if (item) { list.push(`<li><span class="sb-lvl">${esc(item[1])}:</span> ${sbInline(item[2])}</li>`); return; }
        flush();
        const runIn = i > 0 && line.match(/^((?:[A-Z][\w'-]*)(?: (?:[A-Z][\w'-]*|of|the|and|to|by|in|on|from|with))*)\. (.*)$/);
        out.push(i === 0 ? `<p class="sb-feat"><strong>${esc(name)}.</strong> ${sbInline(line)}</p>`
            : runIn ? `<p class="sb-feat"><strong>${esc(runIn[1])}.</strong> ${sbInline(runIn[2])}</p>`
            : `<p class="sb-feat">${sbInline(line)}</p>`);
    });
    flush();
    if (text.includes('[[')) out.push('<div class="sb-spell-detail" hidden></div>');
    return `<div class="sb-feature">${out.join('')}</div>`;
}

// The block to draw: a homebrew monster's own, else the SRD one (undefined until loaded).
function sbBlockOf(m) {
    return m.block || (blocksReady() ? MONSTER_BLOCKS[m.id] : undefined);
}

function monsterBlockHtml(m) {
    if (!m.block && !blocksReady()) return '<p class="sb-note">Loading the stat block…</p>';
    const b = sbBlockOf(m);
    if (!b) return '<p class="sb-note">No stat block for this monster.</p>';
    const spells = [...new Set((b.tr || []).flatMap(([, t]) => [...t.matchAll(/\[\[(.+?)\]\]/g)].map(x => x[1])))];
    const book = spells.length && `spellbook.html?${paramsQuery({ spells: spells.map(spellSlug).join('.'), list: `${m.name} spells`.slice(0, 40) })}`;
    return `
        <p class="sb-type">${esc(b.t)}</p>
        <div class="sb-core">
            <span><strong>Armor Class</strong> ${esc(b.ac)}</span>
            <span><strong>Hit Points</strong> ${esc(b.hp)}</span>
            <span><strong>Speed</strong> ${esc(b.sp)}</span>
        </div>
        <div class="sb-abil">${b.ab.map((v, i) => `<div><b>${SB_ABILITIES[i]}</b> ${v} (${sbMod(v)})</div>`).join('')}</div>
        <div class="sb-props">
            ${b.pr.map(([k, v]) => `<p><strong>${esc(k)}</strong> ${esc(v)}</p>`).join('')}
            <p><strong>Challenge</strong> ${esc(b.cr)} &nbsp; <strong>Proficiency Bonus</strong> +${b.pb}</p>
        </div>
        ${SB_SECTIONS.filter(([k]) => b[k]).map(([k, title]) => `<div class="sb-section"><h4>${title}</h4>
            ${k === 'le' ? `<p class="sb-feat">${esc(b.li)}</p>` : ''}${b[k].map(sbFeatureHtml).join('')}</div>`).join('')}
        ${book ? `<a class="sb-book" href="${esc(book)}">📖 Open these spells in the Spellbook</a>` : ''}`;
}

function monsterBlockText(m) {
    const b = sbBlockOf(m);
    if (!b) return '';
    const lines = [m.name.toUpperCase(), b.t,
        `Armor Class ${b.ac} | Hit Points ${b.hp} | Speed ${b.sp}`,
        b.ab.map((v, i) => `${SB_ABILITIES[i]} ${v} (${sbMod(v)})`).join(' | '),
        ...b.pr.map(([k, v]) => `${k} ${v}`),
        `Challenge ${b.cr} | Proficiency Bonus +${b.pb}`];
    SB_SECTIONS.filter(([k]) => b[k]).forEach(([k, title]) => {
        if (k !== 'tr') lines.push(title.toUpperCase());
        if (k === 'le') lines.push(b.li);
        b[k].forEach(([name, text]) => lines.push(`${name}. ${text.replace(/\[\[(.+?)\]\]/g, '$1').replace(/\n+/g, '\n')}`));
    });
    return lines.join('\n');
}

// A click on a [[spell]] button: open its card inside the same feature.
function sbSpellClick(btn, scope) {
    toggleSpellDetail(btn, btn.closest('.sb-feature').querySelector('.sb-spell-detail'), scope);
}
