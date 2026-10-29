/* ============================================
   DM TOOLBOX: MONSTER STAT BLOCKS
   The SRD 5.1 stat block of a monster (monsters-data.js id), drawn from
   monster-statblocks.js. That file and the spell text (spells-data.js) load the first
   time a stat block is needed: call loadMonsterBlocks(), then draw again.
   A homebrew monster (homebrew.js) carries its own block in m.block, in the same shape.
   Used by the Encounter tab (toolbox-encounter.js) and the Initiative tab
   (toolbox-table.js). Spell buttons open cards through spell-detail.js.
   On a Pathfinder page (ENC_PF2E) the blocks are Pathfinder's instead: pf2e-creature-blocks.js,
   drawn in the Pathfinder layout by sbPf2eHtml and sbPf2eText (end of this file), with
   spell cards from pf2e-spells-data.js.
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

function sbPf2e() {
    return typeof ENC_PF2E !== 'undefined' && ENC_PF2E;
}

function blocksReady() {
    return sbPf2e() ? typeof PF2E_BLOCKS !== 'undefined' : typeof MONSTER_BLOCKS !== 'undefined';
}

// Loads the stat blocks and spell text once; after a failed load the next call tries again.
function loadMonsterBlocks() {
    if (!sbLoading) {
        sbLoading = Promise.all(sbPf2e() ? [
            blocksReady() ? null : loadScript('pf2e-creature-blocks.js'),
            typeof PF2E_SPELLS !== 'undefined' ? null : loadScript('pf2e-spells-data.js')
        ] : [
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
    if (sbPf2e()) return sbPf2eHtml(m);
    if (!m.block && !blocksReady()) return '<p class="sb-note">Loading the stat block…</p>';
    const b = sbBlockOf(m);
    if (!b) return '<p class="sb-note">No stat block for this monster.</p>';
    const spells = [...new Set((b.tr || []).flatMap(([, t]) => [...t.matchAll(/\[\[(.+?)\]\]/g)].map(x => x[1])))];
    const book = spells.length && `spellbook?${paramsQuery({ spells: spells.map(spellSlug).join('.'), list: `${m.name} spells`.slice(0, 40) })}`;
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
    if (sbPf2e()) return sbPf2eText(m);
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

/* ---------- Pathfinder stat blocks ---------- */

const SB_PF2E_ABILITIES = ['Str', 'Dex', 'Con', 'Int', 'Wis', 'Cha'];
const SB_PF2E_SIZES = { T: 'Tiny', S: 'Small', M: 'Medium', L: 'Large', H: 'Huge', G: 'Gargantuan' };
const SB_PF2E_RARITY = { u: 'uncommon', r: 'rare', q: 'unique' };
const SB_PF2E_COST = { 1: '◆', 2: '◆◆', 3: '◆◆◆', r: '⤾', f: '◇' };
const SB_PF2E_COST_WORDS = { 1: '[one action]', 2: '[two actions]', 3: '[three actions]', r: '[reaction]', f: '[free action]' };

function sbSigned(n) {
    return n >= 0 ? `+${n}` : `−${-n}`;
}

function sbOrdinal(n) {
    return n + (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th');
}

// "6" → "6th", "Cantrips (7)" → "Cantrips (7th)", "4 (3 slots)" → "4th (3 slots)".
function sbPf2eRank(label) {
    return label.replace(/^(\d+)/, (_, n) => sbOrdinal(+n)).replace(/\((\d+)\)/, (_, n) => `(${sbOrdinal(+n)})`);
}

// A Strike's bonus with its multiple attack penalties: +7 [+2/−3], or +7 [+3/−1] when agile.
function sbPf2eMap(bonus, traits) {
    const step = traits.includes('agile') ? 4 : 5;
    return `${sbSigned(bonus)} [${sbSigned(bonus - step)}/${sbSigned(bonus - 2 * step)}]`;
}

function sbPf2eTraits(m) {
    return [SB_PF2E_RARITY[m.rarity], SB_PF2E_SIZES[m.size], ...m.traits].filter(Boolean);
}

// The blocks' text: **bold**, {g:Key} for a universal ability's summary.
function sbPf2eInline(text) {
    return esc(text)
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\{g:(\w+)\}/g, (_, k) => `<span class="sb-gloss">${esc(PF2E_GLOSSARY[k] || '')}</span>`);
}

function sbPf2ePlain(text) {
    return text.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\{g:(\w+)\}/g, (_, k) => PF2E_GLOSSARY[k] || '');
}

function sbPf2eCost(cost) {
    return cost ? ` <span class="sb-act" title="${SB_PF2E_COST_WORDS[cost]}" aria-label="${SB_PF2E_COST_WORDS[cost]}">${SB_PF2E_COST[cost]}</span>` : '';
}

// An ability: its name, action cost, and traits run into the first line; "- " lines make a list.
function sbPf2eAbility([name, cost, traits, text]) {
    const head = `<strong>${esc(name)}</strong>${sbPf2eCost(cost)}${traits.length ? ` (${esc(traits.join(', '))})` : ''}`;
    const out = [];
    let list = [];
    const flush = () => {
        if (list.length) out.push(`<ul class="sb-spells">${list.join('')}</ul>`);
        list = [];
    };
    (text ? text.split('\n') : []).forEach(line => {
        if (line.startsWith('- ')) { list.push(`<li>${sbPf2eInline(line.slice(2))}</li>`); return; }
        flush();
        out.push(`<p class="sb-feat">${out.length ? '' : head + ' '}${sbPf2eInline(line)}</p>`);
    });
    flush();
    if (!out.length || out[0].startsWith('<ul')) out.unshift(`<p class="sb-feat">${head}</p>`);
    return `<div class="sb-feature">${out.join('')}</div>`;
}

function sbPf2eStrike([ranged, name, bonus, traits, dmg]) {
    return { kind: ranged ? 'Ranged' : 'Melee', text: `${name.toLowerCase()} ${sbPf2eMap(bonus, traits)}${traits.length ? ` (${traits.join(', ')})` : ''}`, dmg };
}

// A rank's spell list ("fireball (×2), invisibility (at will, self only)"): each spell with a
// card becomes a button, its notes left after it.
function sbPf2eSpellList(list) {
    const names = [];
    let depth = 0, cur = '';
    for (const ch of list) {
        depth += ch === '(' ? 1 : ch === ')' ? -1 : 0;
        if (ch === ',' && !depth) { names.push(cur.trim()); cur = ''; } else cur += ch;
    }
    names.push(cur.trim());
    return names.map(n => {
        const bare = spellBareName(n);
        return spellByName(n) ? `<button type="button" class="sb-spell" data-spell="${esc(bare)}" aria-expanded="false">${esc(bare)}</button>${esc(n.slice(bare.length))}` : esc(n);
    }).join(', ');
}

function sbPf2eSpells([name, dc, atk, note, ranks]) {
    return { name, head: `DC ${dc}${atk ? `, attack ${sbSigned(atk)}` : ''}${note ? `, ${note}` : ''}`, ranks: ranks.map(([r, list]) => [sbPf2eRank(r), list]) };
}

function sbPf2ePerception(m, b) {
    return `${sbSigned(m.per)}${b.pd ? ` ${b.pd}` : ''}${b.sn ? `; ${b.sn}` : ''}`;
}

function sbPf2eDefenses(m, b) {
    return {
        ac: `${m.ac}${b.acd ? ` (${b.acd})` : ''}`,
        saves: [['Fort', m.fort], ['Ref', m.ref], ['Will', m.will]],
        saveNote: b.svd || '',
        hp: [`${m.hp}${b.hpd ? `, ${b.hpd}` : ''}`, ['Hardness', b.hd], ['Immunities', b.im], ['Weaknesses', b.we], ['Resistances', b.re]]
    };
}

function sbPf2eHtml(m) {
    if (!blocksReady()) return '<p class="sb-note">Loading the stat block…</p>';
    const b = PF2E_BLOCKS[m.id];
    if (!b) return '<p class="sb-note">No stat block for this creature.</p>';
    const line = (k, v) => v ? `<p><strong>${k}</strong> ${esc(String(v))}</p>` : '';
    const abilities = list => (list || []).map(sbPf2eAbility).join('');
    const d = sbPf2eDefenses(m, b);
    return `
        <p class="sb-type">Creature ${String(m.level).replace("-", "−")} <span class="sb-traits">${sbPf2eTraits(m).map(t => `<span>${esc(t)}</span>`).join('')}</span></p>
        <div class="sb-props">
            ${line('Perception', sbPf2ePerception(m, b))}
            ${line('Languages', b.la)}
            ${line('Skills', b.sk)}
            <p>${b.ab.map((v, i) => `<strong>${SB_PF2E_ABILITIES[i]}</strong> ${sbSigned(v)}`).join(', ')}</p>
            ${line('Items', b.it)}
            ${abilities(b.ia)}
        </div>
        <div class="sb-props">
            <p><strong>AC</strong> ${esc(d.ac)}; ${d.saves.map(([k, v]) => `<strong>${k}</strong> ${sbSigned(v)}`).join(', ')}${d.saveNote ? `; ${esc(d.saveNote)}` : ''}</p>
            <p><strong>HP</strong> ${esc(d.hp[0])}${d.hp.slice(1).filter(([, v]) => v).map(([k, v]) => `; <strong>${k}</strong> ${esc(String(v))}`).join('')}</p>
            ${abilities(b.da)}
        </div>
        <div class="sb-props">
            ${line('Speed', b.sp)}
            ${(b.st || []).map(sbPf2eStrike).map(s => `<p class="sb-feat"><strong>${s.kind}</strong>${sbPf2eCost('1')} ${esc(s.text)}, <strong>Damage</strong> ${esc(s.dmg)}</p>`).join('')}
            ${(b.sc || []).map(sbPf2eSpells).map(s => `<div class="sb-feature"><p class="sb-feat"><strong>${esc(s.name)}</strong> ${esc(s.head)}; ${s.ranks.map(([r, l]) => `<strong>${esc(r)}</strong> ${sbPf2eSpellList(l)}`).join('; ')}</p><div class="sb-spell-detail" hidden></div></div>`).join('')}
            ${abilities(b.oa)}
        </div>`;
}

function sbPf2eText(m) {
    const b = blocksReady() && PF2E_BLOCKS[m.id];
    if (!b) return '';
    const ability = ([name, cost, traits, text]) =>
        `${name}${cost ? ` ${SB_PF2E_COST_WORDS[cost]}` : ''}${traits.length ? ` (${traits.join(', ')})` : ''} ${sbPf2ePlain(text).replace(/\n+/g, ' ')}`.trim();
    const d = sbPf2eDefenses(m, b);
    return [
        `${m.name.toUpperCase()} (CREATURE ${String(m.level).replace("-", "−")})`, sbPf2eTraits(m).join(', '),
        `Perception ${sbPf2ePerception(m, b)}`,
        b.la && `Languages ${b.la}`, b.sk && `Skills ${b.sk}`,
        b.ab.map((v, i) => `${SB_PF2E_ABILITIES[i]} ${sbSigned(v)}`).join(', '),
        b.it && `Items ${b.it}`, ...(b.ia || []).map(ability),
        `AC ${d.ac}; ${d.saves.map(([k, v]) => `${k} ${sbSigned(v)}`).join(', ')}${d.saveNote ? `; ${d.saveNote}` : ''}`,
        `HP ${d.hp[0]}${d.hp.slice(1).filter(([, v]) => v).map(([k, v]) => `; ${k} ${v}`).join('')}`,
        ...(b.da || []).map(ability),
        `Speed ${b.sp}`,
        ...(b.st || []).map(sbPf2eStrike).map(s => `${s.kind} [one action] ${s.text}, Damage ${s.dmg}`),
        ...(b.sc || []).map(sbPf2eSpells).map(s => `${s.name} ${s.head}; ${s.ranks.map(([r, l]) => `${r} ${l}`).join('; ')}`),
        ...(b.oa || []).map(ability)
    ].filter(Boolean).join('\n');
}
