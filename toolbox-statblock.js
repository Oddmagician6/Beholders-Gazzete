/* ============================================
   DM TOOLBOX: MONSTER STAT BLOCKS
   The SRD 5.1 stat block of a monster (monsters-data.js id), drawn from
   monster-statblocks.js. That file and the spell text (spells-data.js) load the first
   time a stat block is needed: call loadMonsterBlocks(), then draw again.
   A homebrew monster (homebrew.js) carries its own block in m.block, in the same shape.
   2024 blocks (ROADMAP L1T T4): a block with an `init` (SRD 5.2 rows from srd52.js, or a homebrew
   monster set to the 2024 style) is drawn in the 2024 layout: AC and Initiative up top, each
   ability's save beside it, "CR 5 (XP 1,800; PB +3)", and its spell lists split into lines with
   spell buttons.
   Used by the Encounter tab (toolbox-encounter.js) and the Initiative tab
   (toolbox-table.js). Spell buttons open cards through spell-detail.js.
   On a Pathfinder page (ENC_PF2E) the blocks are Pathfinder's instead: pf2e-creature-blocks.js,
   drawn in the Pathfinder layout by sbPf2eHtml and sbPf2eText (end of this file), with
   spell cards from pf2e-spells-data.js. Pathfinder hazards (pf2e-hazards-data.js) are drawn
   by sbPf2eHazardHtml and sbPf2eHazardText; monsterBlockHtml/Text draw one for an encounter's hazard (m.hz).
   ============================================ */

const SB_ABILITIES = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];
const SB_SECTIONS = [['tr', 'Traits'], ['ac2', 'Actions'], ['ba', 'Bonus Actions'], ['re', 'Reactions'], ['le', 'Legendary Actions']];
let sbLoading = null;

// One request per file: a retry while the last one is still on its way waits for it instead of
// adding the script twice (its top-level consts would clash). A failed file can be tried again.
const sbScripts = new Map();
function loadScript(src) {
    if (!sbScripts.has(src)) {
        sbScripts.set(src, new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = src;
            s.onload = resolve;
            s.onerror = () => { sbScripts.delete(src); s.remove(); reject(new Error(src)); };
            document.head.appendChild(s);
        }));
    }
    return sbScripts.get(src);
}

// The spell text the spell buttons open (loads with the blocks; it can fail on its own).
function sbSpellsReady() {
    return sbPf2e() ? typeof PF2E_SPELLS !== 'undefined' : typeof SPELLS_DATA !== 'undefined';
}

// A block's own entry: never one an id like "constructor" finds on Object.prototype.
function sbOwn(table, id) {
    return Object.prototype.hasOwnProperty.call(table, id) ? table[id] : undefined;
}

// A page without the encounter engine (the Pathfinder NPC page) goes by its system.
function sbPf2e() {
    return typeof ENC_PF2E !== 'undefined' ? ENC_PF2E : ruleSystemId() === 'pf2e';
}

function blocksReady() {
    return sbPf2e() ? typeof PF2E_BLOCKS !== 'undefined' : typeof MONSTER_BLOCKS !== 'undefined';
}

// Loads the stat blocks and spell text once; after a failed load the next call tries again.
function loadMonsterBlocks() {
    if (!sbLoading) {
        sbLoading = Promise.all(sbPf2e() ? [
            blocksReady() ? null : loadScript('pf2e-creature-blocks.js'),
            sbSpellsReady() ? null : loadScript('pf2e-spells-data.js')
        ] : [
            blocksReady() ? null : loadScript('monster-statblocks.js'),
            sbSpellsReady() ? null : loadScript('spells-data.js')
        ]).then(() => {
            // spells-data.js came late: in 2024 mode, swap its 5.2 text in (srd52.js).
            if (typeof srd52Register === 'function') srd52Register();
        }).catch(err => { sbLoading = null; throw err; });
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
        .replace(/^((?:Melee or Ranged|Melee|Ranged) (?:(?:Weapon|Spell) Attack|Attack Roll):|(?:Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) Saving Throw:|Trigger:)/, '<em>$1</em>')
        .replace(/ (Failure or Success:|Hit or Miss:|Hit:|Failure:|Success:|Response:|(?:First|Second) Failure:)/g, ' <em>$1</em>');
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

/* ---------- 2024 (SRD 5.2) stat blocks ---------- */
const SB_ABIL_SHORT = ['Str', 'Dex', 'Con', 'Int', 'Wis', 'Cha'];

function sb2024(b) {
    return !!b && b.init !== undefined && b.init !== null && !b.book;
}

// Each ability's save: the Saving Throws line's bonus, else its modifier. [bonus, proficient]
function sbSaves(b) {
    const line = ((b.pr || []).find(([k]) => k === 'Saving Throws') || [])[1] || '';
    return b.ab.map((v, i) => {
        const m = line.match(new RegExp(`${SB_ABIL_SHORT[i]} ([+−-]\\d+)`));
        return m ? [Number(m[1].replace('−', '-')), true] : [Math.floor((v - 10) / 2), false];
    });
}

// "10 (5,900 XP)" -> "10 (XP 5,900; PB +4)"
function sbCr2024(b) {
    const m = String(b.cr).match(/^(\S+) \((.+?) XP(.*)\)$/);
    return m ? `${m[1]} (XP ${m[2]}${m[3]}; PB +${b.pb})` : `${b.cr} (PB +${b.pb})`;
}

function sbInit(b) {
    return `${b.init >= 0 ? '+' : '−'}${Math.abs(b.init)} (${10 + b.init})`;
}

// A list of spells ("Detect Magic, Fireball (level 4 version)") with [[ ]] round the ones the
// spell list knows, so they get buttons.
function sbMarkSpells(list) {
    if (typeof spellByName !== 'function') return list;
    const names = [];
    let depth = 0, cur = '';
    for (const ch of list) {
        depth += ch === '(' ? 1 : ch === ')' ? -1 : 0;
        if (ch === ',' && !depth) { names.push(cur.trim()); cur = ''; } else cur += ch;
    }
    names.push(cur.trim());
    return names.map(n => {
        const bare = spellBareName(n);
        return bare && spellByName(bare) ? `[[${bare}]]${n.slice(bare.length)}` : n;
    }).join(', ');
}

// A 2024 Spellcasting feature runs its lists together ("... DC 14): At Will: A, B 2/Day Each: C");
// this splits them into "- At Will: ..." lines, which sbFeatureHtml draws as a spell list.
const SB_USES_SPLIT = /(?:^|\s)(At Will|\d+\/Day(?: Each)?): /;
function sbSpellLines(text) {
    if (text.includes('[[') || !SB_USES_SPLIT.test(text)) return text;
    const parts = text.split(new RegExp(SB_USES_SPLIT.source));
    let out = parts[0].trim();
    for (let i = 1; i < parts.length; i += 2) out += `\n- ${parts[i]}: ${sbMarkSpells((parts[i + 1] || '').trim())}`;
    return out;
}

function sbFeatures2024(list) {
    return list.map(([name, text]) => [name, sbSpellLines(text)]);
}

// The spells a block's features name (for the Spellbook link).
function sbBlockSpells(b, sections) {
    return [...new Set(sections.flatMap(k => (b[k] || []).flatMap(([, t]) => [...t.matchAll(/\[\[(.+?)\]\]/g)].map(x => x[1]))))];
}

// The Spellbook link's slugs: each spell by the name the spell list knows it by now (a homebrew
// [[Feeblemind]] is Befuddlement in 2024), so the Spellbook finds it.
function sbBookSlugs(spells) {
    return [...new Set(spells.map(n => spellSlug((typeof spellByName === 'function' && spellByName(n) || { name: n }).name)))].join('.');
}

function sb2024Html(m, b) {
    const sec = Object.fromEntries(SB_SECTIONS.filter(([k]) => b[k]).map(([k]) => [k, sbFeatures2024(b[k])]));
    const spells = sbBlockSpells(sec, Object.keys(sec));
    const book = spells.length && `spellbook?${paramsQuery({ spells: sbBookSlugs(spells), list: `${m.name} spells`.slice(0, 40) })}`;
    const saves = sbSaves(b);
    return `
        <p class="sb-type">${esc(b.t)}</p>
        <div class="sb-core">
            <span><strong>AC</strong> ${esc(b.ac)}</span>
            <span><strong>Initiative</strong> ${sbInit(b)}</span>
            <span><strong>HP</strong> ${esc(b.hp)}</span>
            <span><strong>Speed</strong> ${esc(b.sp)}</span>
        </div>
        <div class="sb-abil sb-abil-2024">${b.ab.map((v, i) => `<div><b>${SB_ABILITIES[i]}</b> ${v} (${sbMod(v)})<br><small title="Saving throw${saves[i][1] ? ' (proficient)' : ''}">save ${saves[i][1] ? `<strong>${sbSigned(saves[i][0])}</strong>` : sbSigned(saves[i][0])}</small></div>`).join('')}</div>
        <div class="sb-props">
            ${b.pr.filter(([k]) => k !== 'Saving Throws').map(([k, v]) => `<p><strong>${esc(k)}</strong> ${esc(v)}</p>`).join('')}
            <p><strong>CR</strong> ${esc(sbCr2024(b))}</p>
        </div>
        ${SB_SECTIONS.filter(([k]) => sec[k]).map(([k, title]) => `<div class="sb-section"><h4>${title}</h4>
            ${k === 'le' && b.li ? `<p class="sb-feat">${esc(b.li)}</p>` : ''}${sec[k].map(sbFeatureHtml).join('')}</div>`).join('')}
        ${book ? `<a class="sb-book" href="${esc(book)}">📖 Open these spells in the Spellbook</a>` : ''}`;
}

function sb2024Text(m, b) {
    const saves = sbSaves(b);
    const lines = [m.name.toUpperCase(), b.t,
        `AC ${b.ac} | Initiative ${sbInit(b)} | HP ${b.hp} | Speed ${b.sp}`,
        b.ab.map((v, i) => `${SB_ABILITIES[i]} ${v} (${sbMod(v)}, save ${sbSigned(saves[i][0])})`).join(' | '),
        ...b.pr.filter(([k]) => k !== 'Saving Throws').map(([k, v]) => `${k} ${v}`),
        `CR ${sbCr2024(b)}`];
    SB_SECTIONS.filter(([k]) => b[k]).forEach(([k, title]) => {
        lines.push(title.toUpperCase());
        if (k === 'le' && b.li) lines.push(b.li);
        b[k].forEach(([name, text]) => lines.push(`${name}. ${text.replace(/\[\[(.+?)\]\]/g, '$1').replace(/\n+/g, '\n')}`));
    });
    return lines.join('\n');
}

// The block to draw: a homebrew monster's own, else the SRD one (undefined until loaded).
function sbBlockOf(m) {
    return m.block || (blocksReady() ? sbOwn(MONSTER_BLOCKS, m.id) : undefined);
}

function monsterBlockHtml(m) {
    if (m.hz) return sbPf2eHazardHtml(m.hz);
    if (sbPf2e()) return sbPf2eHtml(m);
    if (!m.block && !blocksReady()) return '<p class="sb-note">Loading the stat block…</p>';
    const b = sbBlockOf(m);
    if (!b) return '<p class="sb-note">No stat block for this monster.</p>';
    if (sb2024(b)) return sb2024Html(m, b);
    const spells = sbBlockSpells(b, ['tr', 'ac2', 'ba', 're', 'le']);
    const book = spells.length && `spellbook?${paramsQuery({ spells: sbBookSlugs(spells), list: `${m.name} spells`.slice(0, 40) })}`;
    if (b.book) return `
        <p class="sb-type">${esc(b.t)}</p>
        <div class="sb-core">
            <span><strong>Armor Class</strong> ${esc(b.ac)}</span>
            <span><strong>Hit Points</strong> ${esc(b.hp)}</span>
            <span><strong>Initiative</strong> ${b.init >= 0 ? '+' : ''}${b.init}</span>
            <span><strong>Challenge</strong> ${esc(b.cr)}</span>
        </div>
        <p class="sb-note">📖 The full stat block is in the ${esc(b.book)}. These numbers are the ones you typed in.</p>`;
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
    if (m.hz) return sbPf2eHazardText(m.hz);
    if (sbPf2e()) return sbPf2eText(m);
    const b = sbBlockOf(m);
    if (!b) return '';
    if (sb2024(b)) return sb2024Text(m, b);
    if (b.book) return [m.name.toUpperCase(), b.t, `Armor Class ${b.ac} | Hit Points ${b.hp} | Initiative ${b.init >= 0 ? '+' : ''}${b.init}`,
        `Challenge ${b.cr}`, `Full stat block: ${b.book}`].join('\n');
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

// A click on a [[spell]] button: open its card inside the same feature. When the spell text
// didn't load with the blocks (it failed, or a homebrew block drew first), it's fetched first.
function sbSpellClick(btn, scope) {
    const open = () => toggleSpellDetail(btn, btn.closest('.sb-feature').querySelector('.sb-spell-detail'), scope);
    if (sbSpellsReady() || btn.getAttribute('aria-expanded') === 'true') { open(); return; }
    loadMonsterBlocks().then(open, () => {});
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
    // A few entries carry no DC in the data (0): left out rather than printed as "DC 0".
    const head = [dc ? `DC ${dc}` : '', atk ? `attack ${sbSigned(atk)}` : '', note || ''].filter(Boolean).join(', ');
    return { name, head, ranks: ranks.map(([r, list]) => [sbPf2eRank(r), list]) };
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

// block: the text to draw in place of PF2E_BLOCKS[m.id] (an adjusted NPC, npc-statblock-pf2e.js).
function sbPf2eHtml(m, block = null) {
    if (!block && !blocksReady()) return '<p class="sb-note">Loading the stat block…</p>';
    const b = block || sbOwn(PF2E_BLOCKS, m.id);
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
            ${(b.sc || []).map(sbPf2eSpells).map(s => `<div class="sb-feature"><p class="sb-feat"><strong>${esc(s.name)}</strong> ${s.head ? `${esc(s.head)}; ` : ''}${s.ranks.map(([r, l]) => `<strong>${esc(r)}</strong> ${sbPf2eSpellList(l)}`).join('; ')}</p><div class="sb-spell-detail" hidden></div></div>`).join('')}
            ${abilities(b.oa)}
        </div>`;
}

function sbPf2eText(m, block = null) {
    const b = block || (blocksReady() && sbOwn(PF2E_BLOCKS, m.id));
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
        ...(b.sc || []).map(sbPf2eSpells).map(s => `${s.name} ${s.head ? `${s.head}; ` : ''}${s.ranks.map(([r, l]) => `${r} ${l}`).join('; ')}`),
        ...(b.oa || []).map(ability)
    ].filter(Boolean).join('\n');
}

// ── Pathfinder hazards (pf2e-hazards-data.js) ─────────────
// A hazard's Strike: no multiple attack penalty unless the hazard has one.
function sbPf2eHazardStrike([ranged, name, bonus, traits, dmg, note, map]) {
    const kind = ranged ? 'Ranged' : 'Melee';
    const atk = map ? sbPf2eMap(bonus, traits) : sbSigned(bonus);
    const extra = [...traits, ...(note && !/^no multiple attack penalty$/i.test(note) ? [note] : [])];
    return { kind, text: `${name.toLowerCase()} ${atk}${extra.length ? ` (${extra.join(', ')})` : ''}`, dmg };
}

// Its parts in the book's order: the abilities a Strike names (a poison) come after the Strikes.
function sbPf2eHazardParts(h) {
    const named = a => (h.sk || []).some(s => s[4].includes(a[0]));
    const saves = (h.sv || []).map((v, i) => [['Fort', 'Ref', 'Will'][i], v]).filter(([, v]) => v != null);
    return {
        level: `${h.cx ? 'Complex hazard' : 'Hazard'} ${String(h.l).replace('-', '−')}`,
        traits: [SB_PF2E_RARITY[h.ra], ...h.tr].filter(Boolean),
        // A complex hazard rolls initiative on its Stealth modifier (the DC − 10), so it shows both.
        stealth: h.st != null ? `DC ${h.st}${h.cx ? ` (initiative ${sbSigned(h.st - 10)})` : ''}${h.sd ? ` ${h.sd}` : ''}` : h.sd || '',
        defense: h.ac != null ? { ac: h.ac, saves } : null,
        // A hazard with Hardness breaks at half its HP (GM Core prints the BT; the data leaves it out).
        hp: [h.hd ? ['Hardness', h.hd] : null, h.hp ? ['HP', `${h.hp}${h.hd ? ` (BT ${Math.floor(h.hp / 2)})` : ''}${h.hpd ? ` (${h.hpd})` : ''}`] : null,
            ['Immunities', h.im], ['Weaknesses', h.we], ['Resistances', h.re]].filter(x => x && x[1]),
        before: (h.ab || []).filter(a => !named(a)),
        after: (h.ab || []).filter(named),
        strikes: (h.sk || []).map(sbPf2eHazardStrike)
    };
}

function sbPf2eHazardHtml(h) {
    const p = sbPf2eHazardParts(h);
    const line = (k, v) => v ? `<p class="sb-feat"><strong>${k}</strong> ${sbPf2eInline(v).replace(/\n/g, '<br>')}</p>` : '';
    return `
        <p class="sb-type">${p.level} <span class="sb-traits">${p.traits.map(t => `<span>${esc(t)}</span>`).join('')}</span></p>
        <div class="sb-props">
            ${line('Stealth', p.stealth)}
            ${line('Description', h.ds)}
        </div>
        <div class="sb-props">
            ${line('Disable', h.dis)}
            ${p.defense ? `<p><strong>AC</strong> ${p.defense.ac}${p.defense.saves.map(([k, v], i) => `${i ? ',' : ';'} <strong>${k}</strong> ${sbSigned(v)}`).join('')}</p>` : ''}
            ${p.hp.length ? `<p>${p.hp.map(([k, v]) => `<strong>${k}</strong> ${esc(String(v))}`).join('; ')}</p>` : ''}
            ${p.before.map(sbPf2eAbility).join('')}
        </div>${h.ro || p.strikes.length || p.after.length || h.rs ? `
        <div class="sb-props">
            ${line('Routine', h.ro)}
            ${p.strikes.map(s => `<p class="sb-feat"><strong>${s.kind}</strong>${sbPf2eCost('1')} ${esc(s.text)}, <strong>Damage</strong> ${esc(s.dmg)}</p>`).join('')}
            ${p.after.map(sbPf2eAbility).join('')}
            ${line('Reset', h.rs)}
        </div>` : ''}`;
}

function sbPf2eHazardText(h) {
    const p = sbPf2eHazardParts(h);
    const flat = t => sbPf2ePlain(t).replace(/\n+/g, ' ');
    const ability = ([name, cost, traits, text]) =>
        `${name}${cost ? ` ${SB_PF2E_COST_WORDS[cost]}` : ''}${traits.length ? ` (${traits.join(', ')})` : ''} ${flat(text)}`.trim();
    return [
        `${h.n.toUpperCase()} (${p.level.toUpperCase()})`, p.traits.join(', '),
        p.stealth && `Stealth ${flat(p.stealth)}`, h.ds && `Description ${flat(h.ds)}`, h.dis && `Disable ${flat(h.dis)}`,
        p.defense && `AC ${p.defense.ac}${p.defense.saves.map(([k, v], i) => `${i ? ',' : ';'} ${k} ${sbSigned(v)}`).join('')}`,
        p.hp.length && p.hp.map(([k, v]) => `${k} ${v}`).join('; '),
        ...p.before.map(ability),
        h.ro && `Routine ${flat(h.ro)}`,
        ...p.strikes.map(s => `${s.kind} [one action] ${s.text}, Damage ${s.dmg}`),
        ...p.after.map(ability),
        h.rs && `Reset ${flat(h.rs)}`
    ].filter(Boolean).join('\n');
}
