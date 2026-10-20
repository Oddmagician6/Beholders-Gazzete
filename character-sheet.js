/* ============================================
   PLAY SHEET PAGE (F59)
   A Character Builder character at the table: hit points, death saves, hit
   dice, rests, spell slots, class resources, conditions, and rolls from the
   sheet, plus (F60) the inventory: gear with weights and encumbrance, packs,
   SRD magic items and attunement, and the coin purse (c.gear, c.coins, the
   same lists the builder fills). Rules live in character-play.js; the session state is the
   character's c.play, saved through cbSave (CB_KEY) on every change.
   Rolls go through rollAndRecord (dice-engine.js), so they land in the shared
   roll history with the 🎲 button and the Dice Roller.
   F68: every save also pushes the session state to the DM's tools (party.js partyPushLive)
   when the character is in the party, so the Toolbox's Party tab and Initiative tracker
   follow the sheet on this browser.
   ============================================ */

let chars = [];
let cur = null;
let mode = 'normal';         // advantage / disadvantage for d20 rolls; stays until switched back
let amount = '';             // the damage/heal box, kept across redraws
let lastRoll = null;         // { label, r } shown in the roll bar
let notice = null;           // { text, ok, conc: DC, endurance } after damage or a death save
let restOpen = false;
let longArmed = 0;
let addForm = { name: '', qty: '1', lb: '', mi: '', n: '', coin: 'gp' };   // the Inventory boxes, kept across redraws

function esc(s) {
    return String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

let flashTimer = 0;
function flash(msg, bad = false) {
    const el = document.getElementById('cs-status');
    el.textContent = msg;
    el.classList.toggle('cs-bad', bad);
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => { el.textContent = ''; }, 5000);
}

const plus = n => (n ? (n > 0 ? '+' : '') + n : '');
const who = () => (cur && cur.name) || 'Unnamed character';

function raceLabel(c) {
    const sub = cbSubrace(c), race = cbRace(c.race);
    return sub ? sub.name : race ? race.name : '';
}

function charLabel(c) {
    const k = cbClass(c.cls);
    const what = [raceLabel(c), k ? k.name : ''].filter(Boolean).join(' ');
    return `${c.name || 'Unnamed character'} · level ${c.level}${what ? ' ' + what : ''}`;
}

function portraitSrc(c) {
    if (typeof npcPortraitSrc !== 'function') return '';
    const g = { male: 'male', female: 'female', nonbinary: 'nonbinary' }[String(c.gender).toLowerCase()];
    return g ? npcPortraitSrc(CB_NPC_RACE[c.race], g) : '';
}

function spellLink(name) {
    return `<a href="spell/${spellSlug(name)}" target="_blank" rel="noopener" title="Open ${esc(name)} in a new tab">${esc(name)}</a>`;
}

function save() {
    const list = cbSave(cur);
    if (!list) { flash('Could not save: this browser\'s storage is full or blocked.', true); return; }
    chars = list;
    partyPushLive(cur.id, cbPartyLive(cur));
}

// Adds the character to the party (or updates its row), like the Builder's 👥 Add to Party.
function addToParty() {
    const row = cleanPartyMember({ ...cbPartyRow(cur), live: cbPartyLive(cur) });
    const party = loadParty();
    const at = party.findIndex(p => p.id === row.id);
    if (at >= 0) party[at] = row;
    else if (party.length >= PARTY_MAX) { flash(`The party already has ${PARTY_MAX} characters. Remove one on the Toolbox's Party tab.`, true); return; }
    else party.push(row);
    saveParty(party);
    partyPushLive(cur.id, cbPartyLive(cur));
    renderBar();
    flash("👥 In the party. The Toolbox's Party tab and Initiative tracker follow this sheet in this browser.");
}

// Change the open character's play state, save, and redraw.
function change(fn) {
    if (!cur) return;
    const d = cbDerive(cur);
    fn(cur.play, d);
    cbPlayFit(cur, d);
    save();
    render();
}

function setCond(name, on) {
    const list = cur.play.cond.filter(n => n !== name);
    if (on) list.push(name);
    cur.play.cond = list;
}

// ── Rolling ──────────────────────────────────────────────
function doRoll(formula, label, d20 = true) {
    let r;
    try { r = rollAndRecord(formula, d20 ? mode : 'normal', `${who()}: ${label}`); } catch (e) { flash(e.message, true); return null; }
    lastRoll = { label, r };
    renderRollbar();
    return r;
}

const critDice = dmg => dmg.replace(/(\d*)d(\d+)/g, (m, n, s) => `${(Number(n) || 1) * 2}d${s}`);
const dmgFormula = dmg => dmg.replace(/\s+/g, '').replace(/−/g, '-');

// ── Drawing ──────────────────────────────────────────────
function pips(n, on, act, extra = '', cls = '') {
    return `<span class="cs-pips">${Array.from({ length: n }, (_, i) => {
        const filled = i < on;
        return `<button type="button" class="cs-pip ${cls}${filled ? '' : ' cs-used'}" data-act="${act}" data-f="${filled ? 1 : 0}" data-i="${i}"${extra} aria-label="${filled ? 'Mark one used' : 'Get one back'}"></button>`;
    }).join('')}</span>`;
}

function rechargeTag(r) {
    return `<span class="cs-recharge">${r === 'short' ? 'short rest' : r === 'long' ? 'long rest' : 'by hand'}</span>`;
}

function renderRollbar() {
    const el = document.getElementById('cs-rollbar');
    if (!el || !cur) return;
    const p = cur.play;
    const load = cbLoad(cur, cbDerive(cur)).state;
    const warn = [...p.cond.filter(n => ['Poisoned', 'Frightened', 'Blinded', 'Prone', 'Restrained'].includes(n)), ...(p.exh ? [`Exhaustion ${p.exh}`] : []),
        ...(load === 'heavy' ? ['Heavily encumbered'] : load === 'over' ? ['Over carrying capacity'] : [])];
    let last = '<small>Click a skill, save, or attack to roll it.</small>';
    if (lastRoll) {
        const r = lastRoll.r;
        const tag = r.crit === 'nat20' ? ' <span class="cs-crit">Natural 20!</span>' : r.crit === 'nat1' ? ' <span class="cs-fumble">Natural 1</span>' : '';
        last = `<b>${r.total}</b><span>${esc(lastRoll.label)}${r.mode !== 'normal' ? ' (' + diceModeLabel(r.mode) + ')' : ''}${tag}</span><small>${esc(diceDetail(r))}</small>`;
    }
    el.innerHTML = `<div class="cs-modes" role="group" aria-label="Roll d20s with">${[['normal', 'Normal'], ['adv', 'Advantage'], ['dis', 'Disadvantage']].map(([v, t]) => `<button type="button" class="cs-btn cs-mini" data-act="mode" data-v="${v}" aria-pressed="${mode === v}">${t}</button>`).join('')}</div>
        <div class="cs-last" aria-live="polite">${last}</div>
        ${warn.length ? `<span class="cs-dim">⚠️ ${esc(warn.join(', '))}: see ${load === 'heavy' || load === 'over' ? 'Status and Inventory' : 'Status'}</span>` : ''}`;
}

function hpPanel(c, d) {
    const p = c.play, max = cbPlayMax(c, d), hp = cbPlayHp(c, d), L = c.level;
    const state = hp === 0 ? ' cs-zero' : hp <= max / 4 ? ' cs-low' : '';
    let h = `<section class="cs-panel" aria-labelledby="cs-hp-h"><h2 id="cs-hp-h">❤️ Hit Points</h2>
        <div class="cs-hp"><div class="cs-hp-num${state}"><b>${hp}</b><span> / ${max}</span></div>
        ${p.temp ? `<div class="cs-temp">+${p.temp} temporary</div>` : ''}
        ${max < d.hp ? `<div class="cs-dim">Maximum halved by exhaustion (normally ${d.hp})</div>` : ''}</div>
        <div class="cs-meter${state}"><i style="width:${max ? Math.round(100 * hp / max) : 0}%"></i></div>
        <div class="cs-amount"><input type="number" id="cs-amt" min="0" max="999" inputmode="numeric" aria-label="Amount of damage or healing" placeholder="0" value="${esc(amount)}">
          <button type="button" class="cs-btn cs-red" data-act="damage">🗡️ Damage</button>
          <button type="button" class="cs-btn cs-green" data-act="heal">💚 Heal</button>
          <button type="button" class="cs-btn" data-act="temp">🛡️ Temp HP</button></div>`;
    if (notice) {
        h += `<div class="cs-banner${notice.ok ? ' cs-ok' : ''}"><p>${esc(notice.text)}</p>
            ${notice.conc && p.conc ? `<p>Concentrating on <b>${esc(p.conc)}</b>: make a DC ${notice.conc} Constitution save.</p>` : ''}
            <div class="cs-btnrow">
              ${notice.conc && p.conc ? `<button type="button" class="cs-btn cs-gold cs-mini" data-act="conc-save">🎲 Roll CON Save</button>` : ''}
              ${notice.endurance ? `<button type="button" class="cs-btn cs-gold cs-mini" data-act="endurance">💪 Use Relentless Endurance (stay at 1 HP)</button>` : ''}
              <button type="button" class="cs-btn cs-mini" data-act="notice-off">✕ Dismiss</button></div></div>`;
    }
    if (hp === 0) {
        const dead = p.ds[1] >= 3, stable = !dead && p.ds[0] >= 3;
        h += `<div class="cs-banner${stable ? ' cs-ok' : ''}">
            <p><b>${dead ? '💀 Dead.' : stable ? '😮‍💨 Stable at 0 hit points.' : '🩸 Dying: roll a death save at the start of each turn.'}</b>
            ${dead ? 'A spell like revivify can bring you back: heal the hit points it gives.' : stable ? 'You stay unconscious, and wake with 1 hit point after 1d4 hours or as soon as you\'re healed.' : 'Any healing brings you back.'}</p>
            <div class="cs-ds"><span>Successes ${pips(3, p.ds[0], 'ds', ' data-v="0"', 'cs-succ')}</span><span>Failures ${pips(3, p.ds[1], 'ds', ' data-v="1"', 'cs-fail')}</span></div>
            ${dead || stable ? '' : '<button type="button" class="cs-btn cs-gold" data-act="deathsave">🎲 Roll Death Save</button>'}</div>`;
    }
    const left = L - p.hd;
    h += `<h3>Hit Dice &amp; Rests</h3>
        <p>Hit dice: <b>${left} of ${L}</b> d${d.k.hd} left <span class="cs-tag">(each heals 1d${d.k.hd} ${d.m.con >= 0 ? '+' : '−'} ${Math.abs(d.m.con)})</span></p>
        <div class="cs-btnrow">
          <button type="button" class="cs-btn" data-act="short" aria-expanded="${restOpen}">☕ Short Rest</button>
          <button type="button" class="cs-btn" data-act="long">${Date.now() - longArmed < 3000 ? '🛌 Really? Tap again' : '🛌 Long Rest'}</button></div>`;
    if (restOpen) {
        const back = ['pact slots', ...cbResources(c, d).filter(r => r.recharge === 'short').map(r => r.name)];
        if (!(d.magic && d.magic.pact)) back.shift();
        if (c.cls === 'sorcerer' && L >= 20) back.push('4 sorcery points');
        h += `<div class="cs-rest"><p><b>☕ Short rest</b> (at least an hour). Spend hit dice to heal, one at a time, then finish the rest.</p>
            <div class="cs-btnrow">
              <button type="button" class="cs-btn" data-act="hitdie"${left ? '' : ' disabled'}>🎲 Spend a Hit Die (${left} left)</button>
              <button type="button" class="cs-btn cs-gold" data-act="short-done">✓ Finish Short Rest</button>
              <button type="button" class="cs-btn" data-act="short-cancel">✕ Cancel</button></div>
            <p class="cs-dim" style="margin:8px 0 0">${back.length ? 'Comes back: ' + esc(back.join(', ')) + '.' : 'Nothing of yours recharges on a short rest, but hit dice still heal.'}</p></div>`;
    }
    return h + '</section>';
}

function concSpells(c, d) {
    const names = [...c.spells.cantrips, ...c.spells.list, ...(d.magic ? d.magic.always : []), ...Object.values(c.spells.arcanum), ...cbRaceSpells(c).map(s => s.name)];
    return [...new Set(names.map(n => cbSpell(n)).filter(s => s && s.concentration).map(s => s.name))].sort();
}

function statusPanel(c, d) {
    const p = c.play;
    const conc = concSpells(c, d);
    const conds = Object.keys(SRD_CONDITION_TEXT).filter(n => n !== 'Exhaustion');
    const effects = p.cond.map(n => `<li><b>${esc(n)}:</b> ${esc(SRD_CONDITION_TEXT[n].join(' '))}</li>`);
    if (p.exh) effects.unshift(`<li><b>Exhaustion ${p.exh}:</b> ${esc(CB_EXHAUSTION.slice(1, p.exh + 1).join(' '))}</li>`);
    return `<section class="cs-panel" aria-labelledby="cs-st-h"><h2 id="cs-st-h">✨ Status</h2>
        <ul class="cs-rows">
          <li><span class="cs-name">Inspiration<small>From the DM; spend it for advantage on one roll.</small></span>
            <button type="button" class="cs-btn" data-act="insp" aria-pressed="${p.insp}">${p.insp ? '⭐ Inspired' : '☆ None'}</button></li>
          <li><span class="cs-name">Exhaustion<small>${p.exh ? esc(CB_EXHAUSTION[p.exh]) : 'None. A long rest takes off one level.'}</small></span>
            <span class="cs-step"><button type="button" class="cs-btn" data-act="exh" data-n="-1" aria-label="One level less"${p.exh ? '' : ' disabled'}>−</button><span aria-label="Exhaustion level">${p.exh}</span><button type="button" class="cs-btn" data-act="exh" data-n="1" aria-label="One level more"${p.exh >= 6 ? ' disabled' : ''}>＋</button></span></li>
          <li><label class="cs-field">Concentrating on<select id="cs-conc" data-f="conc"${conc.length ? '' : ' disabled'}><option value="">${conc.length ? 'Nothing' : 'No concentration spells'}</option>${conc.map(n => `<option${n === p.conc ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select></label></li>
        </ul>
        <h3>Conditions</h3>
        <div class="cs-chips" role="group" aria-label="Conditions">${conds.map(n => `<button type="button" class="cs-chip" data-act="cond" data-v="${n}" aria-pressed="${p.cond.includes(n)}">${n}</button>`).join('')}</div>
        ${effects.length ? `<ul class="cs-effects">${effects.join('')}</ul>` : ''}
    </section>`;
}

function rollsPanel(c, d) {
    const speed = cbPlaySpeed(c, d);
    return `<section class="cs-panel" aria-labelledby="cs-ro-h"><h2 id="cs-ro-h">🎲 Checks &amp; Saves</h2>
        <div class="cs-vitals">
          <div class="cs-vital"><span>Armor Class</span><b>${d.ac}</b><small>${esc(d.acHow)}</small></div>
          <div class="cs-vital"><span>Speed</span><b>${speed}</b><small>${speed !== d.speed ? `normally ${d.speed} ft.` : 'feet'}</small></div>
          <button type="button" class="cs-vital" data-act="init"><span>Initiative</span><b>${cbSign(d.init)}</b><small>🎲 roll</small></button>
          <div class="cs-vital"><span>Proficiency</span><b>${cbSign(d.prof)}</b></div>
          <div class="cs-vital"><span>Passive Perc.</span><b>${d.passive}</b></div>
          ${d.magic ? `<div class="cs-vital"><span>Spell DC</span><b>${d.magic.dc}</b><small>attack ${cbSign(d.magic.attack)}</small></div>` : ''}
        </div>
        <div class="cs-abils">${CB_ABILITIES.map(a => {
            const sv = d.saves.find(x => x.a === a);
            return `<div class="cs-abil"><b>${a.toUpperCase()}</b><span class="cs-score">${d.s[a]}</span>
                <button type="button" class="cs-roll" data-act="check" data-v="${a}" aria-label="${CB_ABILITY_NAMES[a]} check ${cbSign(d.m[a])}">Check ${cbSign(d.m[a])}</button>
                <button type="button" class="cs-roll${sv.prof ? ' cs-prof' : ''}" data-act="save" data-v="${a}" aria-label="${CB_ABILITY_NAMES[a]} save ${cbSign(sv.total)}${sv.prof ? ', proficient' : ''}">Save ${cbSign(sv.total)}${sv.prof ? ' ●' : ''}</button></div>`;
        }).join('')}</div>
        <h3>Skills</h3>
        <ul class="cs-skills">${d.skills.map(s => `<li class="${s.prof ? 'p' : ''}"><button type="button" data-act="skill" data-v="${s.id}"><span class="cs-dot">${s.expert ? '◆' : s.prof ? '●' : '○'}</span><span class="cs-val">${cbSign(s.total)}</span><span>${esc(s.name)} <small>${s.a.toUpperCase()}</small></span></button></li>`).join('')}</ul>
        ${d.notes.map(n => `<p class="cs-dim" style="margin-top:8px">⚠️ ${esc(n)}</p>`).join('')}
    </section>`;
}

function attacksPanel(c, d) {
    const rows = d.attacks.map((a, i) => `<tr><td>${esc(a.name)}${a.props || !a.prof ? `<small>${esc(a.props)}${a.prof ? '' : (a.props ? ', ' : '') + 'not proficient'}</small>` : ''}</td>
        <td class="cs-acts"><button type="button" class="cs-btn cs-mini" data-act="atk" data-i="${i}" aria-label="${esc(a.name)} attack roll">🎯 ${cbSign(a.hit)}</button></td>
        <td class="cs-acts"><button type="button" class="cs-btn cs-mini" data-act="dmg" data-i="${i}" aria-label="${esc(a.name)} damage">💥 ${esc(a.dmg)} ${esc(a.type)}</button>
        ${/d/.test(a.dmg) ? `<button type="button" class="cs-btn cs-mini" data-act="crit" data-i="${i}" aria-label="${esc(a.name)} critical damage">Crit</button>` : ''}</td></tr>`);
    if (d.breath) rows.push(`<tr><td>Breath weapon<small>${esc(d.breath.area)}, DC ${d.x.dc('con')} ${d.breath.save.toUpperCase()} save for half</small></td><td class="cs-acts"></td>
        <td class="cs-acts"><button type="button" class="cs-btn cs-mini" data-act="breath">💥 ${esc(d.breath.dice)} ${esc(d.breath.dmg)}</button></td></tr>`);
    if (d.magic) rows.push(`<tr><td>Spell attack<small>Save DC ${d.magic.dc} (${d.magic.ability.toUpperCase()})</small></td>
        <td class="cs-acts"><button type="button" class="cs-btn cs-mini" data-act="spellatk" aria-label="Spell attack roll">🎯 ${cbSign(d.magic.attack)}</button></td><td class="cs-acts"></td></tr>`);
    return `<section class="cs-panel" aria-labelledby="cs-at-h"><h2 id="cs-at-h">⚔️ Attacks</h2>
        <div class="cs-scroll"><table class="cs-table"><thead><tr><th>Name</th><th style="text-align:right">Hit</th><th style="text-align:right">Damage</th></tr></thead><tbody>${rows.join('')}</tbody></table></div></section>`;
}

function spellsPanel(c, d) {
    const racial = cbRaceSpells(c);
    if (!d.magic && !racial.length) return '';
    const p = c.play;
    let h = `<section class="cs-panel" aria-labelledby="cs-sp-h"><h2 id="cs-sp-h">🔮 Spells</h2>`;
    if (d.magic) {
        const r = d.magic.rules;
        if (d.magic.pact) {
            const [n, lv] = d.magic.pact;
            h += `<ul class="cs-slots"><li><span>Pact (${cbOrd(lv)})</span>${pips(n, n - p.pact, 'pact')}<span class="cs-recharge">short rest</span></li></ul>`;
        } else if (d.magic.slots.length) {
            h += `<ul class="cs-slots">${d.magic.slots.map((n, i) => `<li><span>${cbOrd(i + 1)} level</span>${pips(n, n - p.slots[i], 'slot', ` data-v="${i}"`)}<span class="cs-tag">${n - p.slots[i]} of ${n}</span></li>`).join('')}</ul>`;
        }
        const byLevel = {};
        const add = (name, tag) => {
            const s = cbSpell(name);
            if (!s) return;
            const tags = [tag, s.concentration ? 'C' : '', s.ritual ? 'R' : ''].filter(Boolean).join(' ');
            (byLevel[s.level] = byLevel[s.level] || []).push(spellLink(s.name) + (tags ? ` <span class="cs-tag">${tags}</span>` : ''));
        };
        c.spells.cantrips.forEach(n => add(n));
        const prepared = r.type === 'book' ? new Set(c.spells.prepared) : null;
        c.spells.list.forEach(n => { if (!prepared || prepared.has(n)) add(n); });
        d.magic.always.forEach(n => add(n, 'always'));
        Object.values(c.spells.arcanum).forEach(n => add(n, 'arcanum'));
        h += `<ul class="cs-spell-lines">${Object.keys(byLevel).sort((a, b) => a - b).map(lv => `<li><b>${lv === '0' ? 'Cantrips' : cbOrd(Number(lv)) + ' level'}</b> ${byLevel[lv].join(', ')}</li>`).join('')}</ul>
            <p class="cs-tag" style="margin-top:6px">C concentration · R ritual${prepared ? ' · prepared spells only; change them in the builder or the <a href="dnd-spell-planner?char=' + encodeURIComponent(c.id) + '">Spell Planner</a>' : ''}</p>`;
    }
    if (racial.length) h += `<p>${racial.map(s => `${spellLink(s.name)} <span class="cs-tag">${esc(s.note)}</span>`).join(', ')}</p>`;
    return h + '</section>';
}

function resourcesPanel(c, d) {
    const list = cbResources(c, d);
    if (!list.length) return '';
    const p = c.play;
    return `<section class="cs-panel" aria-labelledby="cs-re-h"><h2 id="cs-re-h">🔥 Class &amp; Race Features</h2><ul class="cs-rows">${list.map(r => {
        const used = p.res[r.id] || 0, left = r.max - used;
        let ctl;
        if (r.dc) {
            ctl = `<span class="cs-count">DC ${10 + 5 * used}</span><button type="button" class="cs-btn cs-mini" data-act="res" data-id="${r.id}" data-n="1"${used >= r.max ? ' disabled' : ''}>＋ Used</button>${used ? `<button type="button" class="cs-btn cs-mini" data-act="res" data-id="${r.id}" data-n="-${used}">↺ Reset</button>` : ''}`;
        } else if (r.pool || r.max > 10) {
            const big = r.max > 20;
            ctl = `<span class="cs-step">${big ? `<button type="button" class="cs-btn cs-mini" data-act="res" data-id="${r.id}" data-n="5" aria-label="Spend 5"${left < 5 ? ' disabled' : ''}>−5</button>` : ''}<button type="button" class="cs-btn" data-act="res" data-id="${r.id}" data-n="1" aria-label="Spend 1"${left ? '' : ' disabled'}>−</button><span class="cs-count">${left} / ${r.max}</span><button type="button" class="cs-btn" data-act="res" data-id="${r.id}" data-n="-1" aria-label="Get 1 back"${used ? '' : ' disabled'}>＋</button>${big ? `<button type="button" class="cs-btn cs-mini" data-act="res" data-id="${r.id}" data-n="-5" aria-label="Get 5 back"${used < 5 ? ' disabled' : ''}>+5</button>` : ''}</span>`;
        } else {
            ctl = pips(r.max, left, 'res-pip', ` data-id="${r.id}"`);
        }
        if (r.heal) ctl += `<button type="button" class="cs-btn cs-mini cs-green" data-act="res-heal" data-id="${r.id}"${left ? '' : ' disabled'}>💚 Use &amp; heal</button>`;
        return `<li><span class="cs-name">${esc(r.name)}${rechargeTag(r.recharge)}<small>${esc(r.note)}</small></span>${ctl}</li>`;
    }).join('')}</ul></section>`;
}

const lbs = n => (Math.round(n * 100) / 100).toLocaleString('en-US');

function inventoryPanel(c, d) {
    const load = cbLoad(c, d), str = d.s.str, id = encodeURIComponent(c.id), att = cbAttuned(c);
    const state = load.state === 'over' ? ' cs-over' : load.state ? ' cs-low' : '';
    const say = {
        over: `Over your carrying capacity: you can push or drag up to ${lbs(str * 30)} lb., but your speed drops to 5 feet.`,
        heavy: `Heavily encumbered (over ${lbs(str * 10)} lb.): speed −20 ft., and disadvantage on ability checks, attack rolls, and saving throws that use Strength, Dexterity, or Constitution.`,
        encumbered: `Encumbered (over ${lbs(str * 5)} lb.): speed −10 ft.`,
        '': c.play.enc ? `Encumbered past ${lbs(str * 5)} lb., heavily past ${lbs(str * 10)} lb.` : 'Capacity is STR × 15. Coins aren\'t counted.'
    }[load.state];
    const rows = c.gear.map((g, i) => {
        const pack = CB_PACKS[g.name], mi = g.mi && typeof MAGIC_ITEM_TEXT !== 'undefined' ? MAGIC_ITEM_TEXT[g.name] : null;
        const notes = [];
        if (pack) notes.push(esc(pack[1]));
        if (mi) notes.push(`${esc(mi[0])} · <a href="dnd-character-cards?char=${id}&amp;items=${magicItemSlug(g.name)}">🎴 card</a>`);
        const acts = [];
        if (g.a) acts.push(`<button type="button" class="cs-btn cs-mini" data-act="wear" data-i="${i}" aria-pressed="${c.wear.armor === g.a}">${c.wear.armor === g.a ? '🛡️ Worn' : 'Wear'}</button>`);
        if (g.name === 'Shield') acts.push(`<button type="button" class="cs-btn cs-mini" data-act="shield" data-i="${i}" aria-pressed="${c.wear.shield}">${c.wear.shield ? '🛡️ Held' : 'Hold'}</button>`);
        if (cbNeedsAttune(g)) acts.push(`<button type="button" class="cs-btn cs-mini" data-act="attune" data-i="${i}" aria-pressed="${!!g.att}"${!g.att && att >= CB_ATTUNE_MAX ? ' disabled' : ''}>${g.att ? '✨ Attuned' : 'Attune'}</button>`);
        if (pack) acts.push(`<button type="button" class="cs-btn cs-mini" data-act="unpack" data-i="${i}">📦 Unpack</button>`);
        acts.push(`<button type="button" class="cs-btn cs-mini cs-red" data-act="drop" data-i="${i}" aria-label="Remove ${esc(g.name)}">✕</button>`);
        return `<tr><td>${esc(g.name)}${notes.length ? `<small>${notes.join(' · ')}</small>` : ''}</td>
            <td><span class="cs-step"><button type="button" class="cs-btn" data-act="qty" data-i="${i}" data-n="-1" aria-label="One fewer ${esc(g.name)}"${g.qty > 1 ? '' : ' disabled'}>−</button><span>${g.qty}</span><button type="button" class="cs-btn" data-act="qty" data-i="${i}" data-n="1" aria-label="One more ${esc(g.name)}"${g.qty < 9999 ? '' : ' disabled'}>＋</button></span></td>
            <td><input type="number" class="cs-lb" min="0" max="9999" step="0.25" data-gear-lb="${i}" value="${cbItemWeight(g)}" aria-label="Weight of one ${esc(g.name)} in pounds"></td>
            <td class="cs-acts">${acts.join(' ')}</td></tr>`;
    });
    const coins = Object.keys(COIN_CP);
    return `<section class="cs-panel" aria-labelledby="cs-in-h"><h2 id="cs-in-h">🎒 Inventory</h2>
        <div class="cs-inv"><div>
        <h3>Coin purse</h3>
        <p class="cs-coins"><b>${esc(formatCoins(c.coins, true))}</b></p>
        <div class="cs-add"><input type="number" id="cs-coin-n" min="0" max="1000000" inputmode="numeric" placeholder="0" aria-label="How many coins" value="${esc(addForm.n)}">
          <select id="cs-coin-kind" aria-label="Which coin">${coins.map(k => `<option${k === addForm.coin ? ' selected' : ''}>${k}</option>`).join('')}</select>
          <button type="button" class="cs-btn cs-green" data-act="coin" data-v="add">＋ Add</button>
          <button type="button" class="cs-btn cs-red" data-act="coin" data-v="spend">− Spend</button></div>
        <h3>Carrying</h3>
        <p><b>${lbs(load.lb)}</b> of ${lbs(load.cap)} lb.</p>
        <div class="cs-meter${state}"><i style="width:${Math.min(100, Math.round(100 * load.lb / Math.max(1, load.cap)))}%"></i></div>
        <p class="cs-dim">${load.state ? '⚠️ ' : ''}${esc(say)}</p>
        <div class="cs-btnrow"><button type="button" class="cs-btn cs-mini" data-act="enc" aria-pressed="${c.play.enc}">Variant: encumbrance ${c.play.enc ? 'on' : 'off'}</button>
          <span class="cs-dim">Attunement: <b>${att} of ${CB_ATTUNE_MAX}</b></span></div>
        </div><div>
        <h3>Gear</h3>
        <div class="cs-scroll"><table class="cs-table cs-gear"><thead><tr><th>Item</th><th>Qty</th><th>lb each</th><th></th></tr></thead><tbody>${rows.length ? rows.join('') : '<tr><td colspan="4" class="cs-dim">Nothing yet.</td></tr>'}</tbody></table></div>
        <div class="cs-add" style="margin-top:12px"><label class="cs-field">Add gear<input type="text" id="cs-add-name" list="cs-gear-list" maxlength="80" autocomplete="off" placeholder="Torch, rope, a lucky coin…" value="${esc(addForm.name)}"></label>
          <label class="cs-field cs-narrow">How many<input type="number" id="cs-add-qty" min="1" max="9999" inputmode="numeric" value="${esc(addForm.qty)}"></label>
          <label class="cs-field cs-narrow">lb each<input type="number" id="cs-add-lb" min="0" max="9999" step="0.25" placeholder="usual" value="${esc(addForm.lb)}"></label>
          <button type="button" class="cs-btn" data-act="add">➕ Add</button></div>
        <div class="cs-add"><label class="cs-field">Add an SRD magic item<input type="text" id="cs-add-mi" list="cs-mi-list" maxlength="80" autocomplete="off" placeholder="Bag of Holding, Cloak of Protection…" value="${esc(addForm.mi)}"></label>
          <button type="button" class="cs-btn" data-act="add-mi">✨ Add</button></div>
        </div></div>
    </section>`;
}

function renderLog() {
    const el = document.getElementById('cs-log');
    if (!el) return;
    const list = loadDiceHistory().slice(0, 10);
    el.innerHTML = list.length
        ? list.map(h => `<li><b>${h.total}</b><span>${esc(h.label || h.f)}${h.mode && h.mode !== 'normal' ? ' (' + diceModeLabel(h.mode) + ')' : ''}${h.crit === 'nat20' ? ' · natural 20' : h.crit === 'nat1' ? ' · natural 1' : ''} <small>${esc(h.detail)}</small></span></li>`).join('')
        : '<li><span class="cs-dim">No rolls yet.</span></li>';
}

function render() {
    const sheet = document.getElementById('cs-sheet');
    renderBar();
    if (!cur) {
        sheet.innerHTML = `<div class="cs-panel cs-empty"><p>No characters in this browser yet.</p><p><a class="cs-btn cs-gold" href="character-builder">🧝 Build a Character</a></p><p class="cs-dim">The builder's Quick Build makes a whole character in one click.</p></div>`;
        return;
    }
    const c = cur, d = cbDerive(c);
    if (!d.k) {
        sheet.innerHTML = `<div class="cs-panel cs-empty"><p>${esc(who())} has no class yet.</p><p><a class="cs-btn cs-gold" href="character-builder?char=${encodeURIComponent(c.id)}">✏️ Finish in the Builder</a></p></div>`;
        return;
    }
    const focus = focusKey(document.activeElement);
    const pic = portraitSrc(c);
    const bgName = c.bg === 'custom' ? (c.bgOpt.name || 'Custom background') : c.bg ? CB_BACKGROUNDS[c.bg].name : '';
    const todo = cbTodo(c);
    sheet.innerHTML = `<div class="cs-head">${pic ? `<img class="cs-portrait" src="${pic}" alt="" width="64" height="64">` : ''}
        <div class="cs-title"><h2>${esc(who())}</h2><p>Level ${c.level} ${esc(raceLabel(c))} ${esc(d.k.name)} (${esc(d.k.sub.name)})${bgName ? ' · ' + esc(bgName) : ''}${c.player ? ' · played by ' + esc(c.player) : ''}</p>
        ${todo.length ? `<p class="cs-dim">⚠️ ${todo.length} pick${todo.length > 1 ? 's' : ''} still to make in the <a href="character-builder?char=${encodeURIComponent(c.id)}">builder</a>.</p>` : ''}</div></div>
        <div class="cs-rollbar" id="cs-rollbar"></div>
        <div class="cs-grid"><div class="cs-col">${hpPanel(c, d)}${statusPanel(c, d)}${resourcesPanel(c, d)}</div>
        <div class="cs-col">${rollsPanel(c, d)}${attacksPanel(c, d)}${spellsPanel(c, d)}
          <section class="cs-panel" aria-labelledby="cs-lg-h"><h2 id="cs-lg-h">📜 Recent Rolls</h2><ul class="cs-log" id="cs-log"></ul></section></div></div>
        <div class="cs-wide">${inventoryPanel(c, d)}</div>`;
    renderRollbar();
    renderLog();
    if (focus) { const el = sheet.querySelector(focus); if (el) el.focus(); }
}

function focusKey(el) {
    if (!el || !el.closest || !el.closest('#cs-sheet')) return '';
    if (el.id) return '#' + el.id;
    const keys = ['act', 'v', 'i', 'id', 'n', 'f'].filter(k => el.dataset[k] !== undefined && k !== 'f');
    return keys.length ? keys.map(k => `[data-${k}="${CSS.escape(el.dataset[k])}"]`).join('') : '';
}

function renderBar() {
    const pick = document.getElementById('cs-pick');
    pick.innerHTML = chars.length
        ? chars.map(c => `<option value="${c.id}"${cur && c.id === cur.id ? ' selected' : ''}>${esc(charLabel(c))}</option>`).join('')
        : '<option value="">No characters yet</option>';
    pick.disabled = !chars.length;
    const id = cur ? encodeURIComponent(cur.id) : '';
    const items = cur ? [...new Set(cur.gear.filter(g => g.mi).map(g => magicItemSlug(g.name)))].join(',') : '';
    document.getElementById('cs-links').innerHTML = cur ? `<a class="cs-btn" href="character-builder?char=${id}">✏️ Edit in Builder</a>
        <a class="cs-btn" href="dnd-character-cards?char=${id}${items ? '&amp;items=' + items : ''}">🎴 Cards</a>
        <a class="cs-btn" href="dnd-player-journal?char=${id}">📓 Journal</a>
        ${!cbClass(cur.cls) ? '' : loadParty().some(m => m.id === cur.id)
            ? `<span class="cs-linked" title="Hit points, conditions, exhaustion, concentration, and death saves show on the Toolbox's Party tab and in the Initiative tracker when they're open in this browser">👥 In the party: the DM's tools follow this sheet</span>`
            : `<button type="button" class="cs-btn" data-act="party" title="Put this character on the Toolbox's Party tab, where the DM's tools follow this sheet">👥 Add to Party</button>`}` : '';
}

// Open a character and fit its play state to its level (saving only if that changed anything).
function openChar(c) {
    cur = c;
    notice = null;
    restOpen = false;
    lastRoll = null;
    if (cur) {
        const before = JSON.stringify(cur.play);
        cbPlayFit(cur);
        if (JSON.stringify(cur.play) !== before) save();
        else partyPushLive(cur.id, cbPartyLive(cur));
        try { history.replaceState(null, '', location.pathname + '?char=' + encodeURIComponent(cur.id)); } catch (e) {}
    }
    render();
}

function readAmount() {
    const n = Math.round(Number(amount));
    return Number.isFinite(n) && n > 0 ? Math.min(999, n) : 0;
}

// ── Clicks ───────────────────────────────────────────────
function onClick(e) {
    const b = e.target.closest('[data-act]');
    if (!b || b.disabled || !cur) return;
    const act = b.dataset.act, v = b.dataset.v, i = Number(b.dataset.i);
    const d = cbDerive(cur);
    const filled = b.dataset.f === '1';

    if (act === 'mode') { mode = v; renderRollbar(); return; }
    if (act === 'init') { doRoll(`1d20${plus(d.init)}`, 'initiative'); return; }
    if (act === 'check') { doRoll(`1d20${plus(d.m[v])}`, `${CB_ABILITY_NAMES[v]} check`); return; }
    if (act === 'save') { doRoll(`1d20${plus(d.saves.find(x => x.a === v).total)}`, `${CB_ABILITY_NAMES[v]} save`); return; }
    if (act === 'skill') { const s = d.skills.find(x => x.id === v); doRoll(`1d20${plus(s.total)}`, s.name); return; }
    if (act === 'atk') { const a = d.attacks[i]; doRoll(`1d20${plus(a.hit)}`, `${a.name} attack`); return; }
    if (act === 'dmg' || act === 'crit') {
        const a = d.attacks[i];
        const f = dmgFormula(a.dmg);
        doRoll(act === 'crit' ? critDice(f) : f, `${a.name} ${act === 'crit' ? 'critical ' : ''}damage (${a.type})`, false);
        return;
    }
    if (act === 'breath') { doRoll(d.breath.dice, `breath weapon (${d.breath.dmg})`, false); return; }
    if (act === 'spellatk') { doRoll(`1d20${plus(d.magic.attack)}`, 'spell attack'); return; }
    if (act === 'notice-off') { notice = null; render(); return; }

    if (act === 'damage' || act === 'heal' || act === 'temp') {
        const n = readAmount();
        if (!n) { flash('Type an amount first.', true); document.getElementById('cs-amt').focus(); return; }
        amount = '';
        change((p, d2) => {
            if (act === 'temp') { cbTempHp(cur, n); flash(`🛡️ ${p.temp} temporary hit points.`); return; }
            if (act === 'heal') {
                const was = cbPlayHp(cur, d2);
                const got = cbHeal(cur, d2, n);
                if (was === 0 && got) { setCond('Unconscious', false); notice = null; }
                flash(got ? `💚 +${got} hit points.` : 'Already at full hit points.');
                return;
            }
            const r = cbDamage(cur, d2, n);
            const parts = [`🗡️ ${n} damage`];
            if (r.temp) parts.push(`${r.temp} came off temporary hit points`);
            flash(parts.join('; ') + '.');
            const res = cbResources(cur, d2).find(x => x.id === 'relentless-endurance');
            notice = null;
            if (r.dead) notice = { text: r.failed ?'💀 A third death save failure: dead.' : '💀 Massive damage: what was left over is at least your hit point maximum, so that\'s instant death.' };
            else if (r.down) {
                setCond('Unconscious', true);
                notice = { text: '🩸 Down to 0 hit points: unconscious and dying.', endurance: res && !p.res[res.id] };
            } else if (r.failed) notice = { text: '🩸 Damage at 0 hit points: one death save failure (two for a critical hit; tap another failure).' };
            if (r.conc && p.conc) notice = Object.assign(notice || { text: `Took ${n} damage.` }, { conc: r.conc });
        });
        return;
    }
    if (act === 'endurance') {
        change(p => { p.hp = 1; p.res['relentless-endurance'] = 1; p.ds = [0, 0]; setCond('Unconscious', false); notice = null; });
        flash('💪 Relentless Endurance: you stay up at 1 hit point.');
        return;
    }
    if (act === 'conc-save') {
        const dc = notice.conc;
        const r = doRoll(`1d20${plus(d.saves.find(x => x.a === 'con').total)}`, `CON save to keep concentration (DC ${dc})`);
        if (!r) return;
        const spell = cur.play.conc;
        change(p => { if (r.total < dc) p.conc = ''; notice = null; });
        flash(r.total >= dc ? `🧠 ${r.total}: concentration on ${spell} holds.` : `💫 ${r.total}: concentration on ${spell} is broken.`, r.total < dc);
        return;
    }
    if (act === 'deathsave') {
        const r = doRoll('1d20', 'death save', false);
        if (!r) return;
        let out;
        change((p, d2) => {
            out = cbDeathSave(cur, d2, r.total);
            if (out === 'revived') setCond('Unconscious', false);
            notice = null;
        });
        flash({ revived: '✨ Natural 20: back up with 1 hit point!', stable: '😮‍💨 Third success: stable.', dead: '💀 Third failure: dead.', success: `✔️ ${r.total}: a success.`, fail: r.total === 1 ? '✖️ Natural 1: two failures.' : `✖️ ${r.total}: a failure.` }[out], out === 'dead' || out === 'fail');
        return;
    }
    if (act === 'ds') { change(p => { p.ds[Number(v)] = Math.max(0, Math.min(3, p.ds[Number(v)] + (filled ? -1 : 1))); }); return; }

    if (act === 'short') { restOpen = !restOpen; render(); return; }
    if (act === 'short-cancel') { restOpen = false; render(); return; }
    if (act === 'hitdie') {
        let got;
        change((p, d2) => { got = cbSpendHitDie(cur, d2, f => doRoll(f, 'hit die', false)); if (got && got.healed && cbPlayHp(cur, d2) > 0) setCond('Unconscious', false); });
        if (got) flash(`🎲 Hit die: ${got.roll.total}, healed ${got.healed}.`);
        return;
    }
    if (act === 'short-done') {
        let back;
        restOpen = false;
        change((p, d2) => { back = cbShortRest(cur, d2); });
        flash(`☕ Short rest done.${back.length ? ' Back: ' + back.join(', ') + '.' : ''}`);
        return;
    }
    if (act === 'long') {
        if (Date.now() - longArmed > 3000) {
            longArmed = Date.now();
            render();
            setTimeout(() => { if (Date.now() - longArmed >= 3000) render(); }, 3100);
            return;
        }
        longArmed = 0;
        let back;
        restOpen = false;
        notice = null;
        change((p, d2) => { back = cbLongRest(cur, d2); setCond('Unconscious', false); });
        flash(`🛌 Long rest done.${back.length ? ' Back: ' + back.join(', ') + '.' : ''}`);
        return;
    }

    // Inventory and coins (F60)
    const g = cur.gear[i];
    if (act === 'qty' && g) { change(() => { g.qty = Math.max(1, Math.min(9999, g.qty + Number(b.dataset.n))); }); return; }
    if (act === 'drop' && g) { change(() => cbDropGear(cur, i)); flash(`✕ ${g.name} removed.`); return; }
    if (act === 'unpack' && g) {
        let ok;
        change(() => { ok = cbUnpack(cur, i); });
        flash(ok ? `📦 Unpacked the ${g.name.toLowerCase()}.` : 'Too many items to unpack: remove a few first.', !ok);
        return;
    }
    if (act === 'wear' && g) { change(() => { cur.wear.armor = cur.wear.armor === g.a ? '' : g.a; }); return; }
    if (act === 'shield') { change(() => { cur.wear.shield = !cur.wear.shield; }); return; }
    if (act === 'attune' && g) {
        if (!g.att && cbAttuned(cur) >= CB_ATTUNE_MAX) { flash(`You can attune to ${CB_ATTUNE_MAX} items at once: end one first.`, true); return; }
        change(() => { if (g.att) delete g.att; else g.att = true; });
        return;
    }
    if (act === 'add' || act === 'add-mi') {
        if (cur.gear.length >= CB_MAX_GEAR) { flash(`That's ${CB_MAX_GEAR} kinds of thing already: remove a few first.`, true); return; }
        const lb = addForm.lb === '' ? NaN : Number(addForm.lb);
        let item;
        if (act === 'add-mi') {
            const name = cbMagicName(addForm.mi);
            if (!name) { flash('Pick an SRD magic item from the list.', true); document.getElementById('cs-add-mi').focus(); return; }
            item = { name, qty: 1, mi: true };
            addForm.mi = '';
        } else {
            item = cbGearItem(addForm.name, Math.max(1, Math.min(9999, Math.round(Number(addForm.qty)) || 1)));
            if (!item) { flash('Type what to add first.', true); document.getElementById('cs-add-name').focus(); return; }
            addForm.name = '';
            addForm.qty = '1';
        }
        if (Number.isFinite(lb) && lb >= 0) item.lb = Math.min(9999, Math.round(lb * 100) / 100);
        addForm.lb = '';
        change(() => { cbAddGear(cur.gear, item); });
        flash(`➕ ${item.qty > 1 ? item.qty + ' × ' : ''}${item.name} added.`);
        return;
    }
    if (act === 'coin') {
        const n = Math.round(Number(addForm.n));
        if (!(n > 0)) { flash('Type how many coins first.', true); document.getElementById('cs-coin-n').focus(); return; }
        const spend = v === 'spend';
        let ok;
        change(() => { ok = cbPurse(cur, n, addForm.coin, spend); });
        if (!ok) { flash(`Not enough coin: that's ${formatCoins(n * COIN_CP[addForm.coin] / 100)}, and the purse holds ${formatCoins(cur.coins, true)}.`, true); return; }
        addForm.n = '';
        render();
        flash(`${spend ? '− Spent' : '＋ Added'} ${n.toLocaleString('en-US')} ${addForm.coin}. Purse: ${formatCoins(cur.coins, true)}.`);
        return;
    }
    if (act === 'enc') { change(p => { p.enc = !p.enc; }); return; }

    if (act === 'insp') { change(p => { p.insp = !p.insp; }); return; }
    if (act === 'exh') { change(p => { p.exh = Math.max(0, Math.min(6, p.exh + Number(b.dataset.n))); }); return; }
    if (act === 'cond') { change(p => { setCond(v, !p.cond.includes(v)); }); return; }
    if (act === 'slot') { change(p => { p.slots[Number(v)] = Math.max(0, p.slots[Number(v)] + (filled ? 1 : -1)); }); return; }
    if (act === 'pact') { change(p => { p.pact = Math.max(0, p.pact + (filled ? 1 : -1)); }); return; }
    if (act === 'res-pip' || act === 'res') {
        const id = b.dataset.id;
        const r = cbResources(cur, d).find(x => x.id === id);
        if (!r) return;
        const step = act === 'res' ? Number(b.dataset.n) : filled ? 1 : -1;
        change(p => { p.res[id] = Math.max(0, Math.min(r.max, (p.res[id] || 0) + step)); });
        return;
    }
    if (act === 'res-heal') {
        const r = cbResources(cur, d).find(x => x.id === b.dataset.id);
        if (!r || (cur.play.res[r.id] || 0) >= r.max) return;
        const roll = /d/.test(r.heal) ? doRoll(r.heal, r.name, false) : null;
        const n = roll ? roll.total : Number(r.heal);
        let got = 0;
        change((p, d2) => {
            p.res[r.id] = (p.res[r.id] || 0) + 1;
            const was = cbPlayHp(cur, d2);
            got = cbHeal(cur, d2, n);
            if (was === 0 && got) setCond('Unconscious', false);
        });
        flash(`💚 ${r.name}: +${got} hit points${got < n ? ` (rolled ${n}; you were near full)` : ''}.`);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    chars = cbLoadAll();
    const asked = new URLSearchParams(location.search).get('char');
    openChar(chars.find(c => c.id === asked) || chars[0] || null);

    const sheet = document.getElementById('cs-sheet');
    sheet.addEventListener('click', onClick);
    document.getElementById('cs-links').addEventListener('click', e => { if (cur && e.target.closest('[data-act="party"]')) addToParty(); });
    const boxes = { 'cs-add-name': 'name', 'cs-add-qty': 'qty', 'cs-add-lb': 'lb', 'cs-add-mi': 'mi', 'cs-coin-n': 'n', 'cs-coin-kind': 'coin' };
    sheet.addEventListener('input', e => {
        if (e.target.id === 'cs-amt') amount = e.target.value.slice(0, 4);
        if (boxes[e.target.id]) addForm[boxes[e.target.id]] = e.target.value.slice(0, 80);
    });
    sheet.addEventListener('keydown', e => {
        if (e.key !== 'Enter' || !(e.target.id === 'cs-amt' || boxes[e.target.id])) return;
        e.preventDefault();
        const act = e.target.id === 'cs-add-mi' ? 'add-mi' : /^cs-add-/.test(e.target.id) ? 'add' : '';
        if (act) sheet.querySelector(`[data-act="${act}"]`).click();
    });
    sheet.addEventListener('change', e => {
        if (e.target.dataset.f === 'conc') change(p => { p.conc = e.target.value; });
        if (e.target.id === 'cs-coin-kind') addForm.coin = COIN_CP[e.target.value] ? e.target.value : 'gp';
        if (e.target.dataset.gearLb !== undefined) {
            const g = cur && cur.gear[Number(e.target.dataset.gearLb)], lb = Number(e.target.value);
            if (g && e.target.value !== '' && Number.isFinite(lb)) change(() => { g.lb = Math.min(9999, Math.max(0, Math.round(lb * 100) / 100)); });
            else render();
        }
    });
    // Suggestions for the Inventory's add boxes.
    document.body.insertAdjacentHTML('beforeend', `<datalist id="cs-gear-list">${cbGearNames().map(n => `<option value="${esc(n)}">`).join('')}</datalist>
        <datalist id="cs-mi-list">${Object.keys(MAGIC_ITEM_TEXT).sort((a, b) => a.localeCompare(b)).map(n => `<option value="${esc(n)}">`).join('')}</datalist>`);
    document.getElementById('cs-pick').addEventListener('change', e => {
        const c = chars.find(x => x.id === e.target.value);
        if (c) openChar(c);
    });

    // The roll bar sticks just under the nav when the nav sticks too.
    const navOffset = () => {
        const nav = document.querySelector('.main-nav');
        const h = nav && getComputedStyle(nav).position === 'sticky' ? nav.offsetHeight : 0;
        document.documentElement.style.setProperty('--cs-nav', h + 'px');
    };
    navOffset();
    window.addEventListener('resize', navOffset);

    window.addEventListener('gazette-dice', renderLog);
    window.addEventListener('storage', e => {
        if (e.key === DICE_HISTORY_KEY) { renderLog(); return; }
        if (e.key === PARTY_KEY) { renderBar(); return; }
        if (e.key !== CB_KEY && e.key !== null) return;
        chars = cbLoadAll();
        const same = cur && chars.find(x => x.id === cur.id);
        if (same) { cur = same; cbPlayFit(cur); render(); } else openChar(chars[0] || null);
    });
});
