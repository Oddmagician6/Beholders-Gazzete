/* ============================================
   DM TOOLBOX: PARTY TAB (F46)
   Enter the player characters once: name, player, class, level, AC, max HP, passive
   Perception, and initiative bonus. party.js keeps them (localStorage gazette-party) and
   the other tabs start from them. Typing saves as you go, without redrawing the cards.
   Loads after toolbox.js, toolbox-table.js, and toolbox-encounter.js
   (uses esc(), flash(), copyText(), armedClick(), addPartyToFight(), encUseParty()).
   ============================================ */

let party = [];

// Number fields: their party.js limits.
const PARTY_NUMS = { ac: [0, 40], hp: [1, 999], pp: [1, 40], init: [-10, 20] };

function partyCardHtml(c, i) {
    const levels = Array.from({ length: 20 }, (_, l) => `<option value="${l + 1}"${l + 1 === c.level ? ' selected' : ''}>${l + 1}</option>`).join('');
    const num = (key, label, ph) => `<label>${label} <input type="number" class="pt-f" data-k="${key}" min="${PARTY_NUMS[key][0]}" max="${PARTY_NUMS[key][1]}" step="1" inputmode="numeric" placeholder="${ph}" value="${c[key] ?? ''}"></label>`;
    return `<li class="pt-char" data-i="${i}">
        <div class="pt-tools">
            <button type="button" class="clk-mini" data-act="up" aria-label="Move ${esc(partyMemberName(c, i))} up"${i ? '' : ' disabled'}>▲</button>
            <button type="button" class="clk-mini" data-act="down" aria-label="Move ${esc(partyMemberName(c, i))} down"${i < party.length - 1 ? '' : ' disabled'}>▼</button>
            <button type="button" class="clk-mini clk-x" data-act="remove" aria-label="Remove ${esc(partyMemberName(c, i))}">✕</button>
        </div>
        <div class="pt-row pt-who">
            <label>Character <input type="text" class="pt-f" data-k="name" maxlength="40" autocomplete="off" placeholder="Character ${i + 1}" value="${esc(c.name)}"></label>
            <label>Player <input type="text" class="pt-f" data-k="player" maxlength="40" autocomplete="off" placeholder="optional" value="${esc(c.player)}"></label>
            <label>Class <input type="text" class="pt-f" data-k="cls" maxlength="40" autocomplete="off" list="pt-classes" placeholder="Fighter" value="${esc(c.cls)}"></label>
        </div>
        <div class="pt-row pt-stats">
            <label>Level <select class="pt-f" data-k="level">${levels}</select></label>
            ${num('ac', 'AC', '—')}
            ${num('hp', 'Max HP', '—')}
            ${num('pp', 'Passive Perception', '—')}
            ${num('init', 'Init bonus', '0')}
        </div>
    </li>`;
}

function renderPartyTab() {
    document.getElementById('pt-list').innerHTML = party.map(partyCardHtml).join('');
    document.getElementById('pt-empty').hidden = party.length > 0;
    document.getElementById('pt-add').disabled = party.length >= PARTY_MAX;
    renderPartySum();
}

function renderPartySum() {
    const box = document.getElementById('pt-sum');
    ['pt-init', 'pt-enc', 'pt-copy'].forEach(id => { document.getElementById(id).disabled = !party.length; });
    if (!party.length) { box.innerHTML = ''; return; }
    const b = partyBudget(partyGroups(party));
    const fmt = n => n.toLocaleString('en-US');
    const watch = party.filter(c => c.pp !== null);
    const best = watch.length ? watch.reduce((a, c) => (c.pp > a.pp ? c : a)) : null;
    box.innerHTML = `
        <div class="split-total">${party.length} character${party.length === 1 ? '' : 's'}</div>
        <div class="split-each">${esc(partyLabel(party))}</div>
        <p class="pt-line">Encounter budget: ${['low', 'moderate', 'high'].map(k => `${ENCOUNTER_LEVELS[k].icon} ${ENCOUNTER_LEVELS[k].label} <b>${fmt(b[k])}</b>`).join(' · ')} XP</p>
        ${best ? `<p class="pt-line">Sharpest eyes: ${esc(partyMemberName(best, party.indexOf(best)))}, passive Perception <b>${best.pp}</b></p>` : ''}`;
}

function partySave() {
    saveParty(party);
}

function partyIndex(el) {
    return Number(el.closest('.pt-char').dataset.i);
}

// Text: saved as typed. Numbers and the level: saved cleaned, and the box shows the clean value on change.
function onPartyField(e, done) {
    const f = e.target.closest('.pt-f');
    if (!f) return;
    const i = partyIndex(f);
    const c = cleanPartyMember({ ...party[i], [f.dataset.k]: f.value });
    party[i] = c;
    if (done && f.dataset.k in PARTY_NUMS) f.value = c[f.dataset.k] ?? '';
    partySave();
    renderPartySum();
}

function onPartyClick(e) {
    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    const i = partyIndex(btn);
    const c = party[i];
    const act = btn.dataset.act;
    if (act === 'remove') {
        party.splice(i, 1);
        partySave();
        renderPartyTab();
        flash('party-status', `🗑️ Removed ${partyMemberName(c, i)}.`);
        return;
    }
    const j = act === 'up' ? i - 1 : i + 1;
    if (j < 0 || j >= party.length) return;
    [party[i], party[j]] = [party[j], party[i]];
    partySave();
    renderPartyTab();
    const moved = document.querySelector(`.pt-char[data-i="${j}"] [data-act="${act}"]`);
    if (moved && !moved.disabled) moved.focus();
}

function addPartyMember() {
    if (party.length >= PARTY_MAX) { flash('party-status', `⚠️ The party holds ${PARTY_MAX} characters.`); return; }
    const last = party[party.length - 1];
    party.push(cleanPartyMember({ level: last ? last.level : 1 }));
    partySave();
    renderPartyTab();
    const names = document.querySelectorAll('#pt-list [data-k="name"]');
    names[names.length - 1].focus();
}

function partyCopyText() {
    return party.map((c, i) => {
        const who = partyMemberName(c, i) + (c.player && c.name ? ` (${c.player})` : '');
        const bits = [`level ${c.level}${c.cls ? ' ' + c.cls : ''}`];
        if (c.ac !== null) bits.push(`AC ${c.ac}`);
        if (c.hp !== null) bits.push(`HP ${c.hp}`);
        if (c.pp !== null) bits.push(`passive Perception ${c.pp}`);
        bits.push(`init ${c.init >= 0 ? '+' : ''}${c.init}`);
        return `${who}: ${bits.join(', ')}`;
    }).join('\n');
}

document.addEventListener('DOMContentLoaded', () => {
    party = loadParty();
    document.getElementById('pt-classes').innerHTML = PARTY_CLASSES.map(k => `<option value="${k}"></option>`).join('');
    renderPartyTab();
    const list = document.getElementById('pt-list');
    list.addEventListener('input', e => onPartyField(e, false));
    list.addEventListener('change', e => onPartyField(e, true));
    list.addEventListener('click', onPartyClick);
    document.getElementById('pt-add').addEventListener('click', addPartyMember);
    document.getElementById('pt-init').addEventListener('click', () => {
        document.querySelector('.tool-tab[data-tab="init"]').click();
        addPartyToFight(party);
    });
    document.getElementById('pt-enc').addEventListener('click', () => {
        document.querySelector('.tool-tab[data-tab="enc"]').click();
        encUseParty(party);
    });
    document.getElementById('pt-copy').addEventListener('click', () => {
        if (party.length) copyText(partyCopyText(), 'party-status', 'the party');
    });
    const clear = document.getElementById('pt-clear');
    clear.addEventListener('click', () => {
        if (!party.length) return;
        armedClick(clear, '🧹 Clear All', () => {
            party = [];
            partySave();
            renderPartyTab();
            flash('party-status', '🧹 The party is cleared. The tools go back to their own defaults.');
        });
    });
    // Another tab on the same browser changed the party.
    window.addEventListener('storage', e => {
        if (e.key !== PARTY_KEY && e.key !== null) return;
        party = loadParty();
        if (!list.contains(document.activeElement)) renderPartyTab();
        else renderPartySum();
    });
});
