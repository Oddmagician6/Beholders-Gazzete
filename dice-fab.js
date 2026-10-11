/* ============================================
   FLOATING DICE BUTTON (F23)
   A 🎲 button in the corner of each tool page that opens a small roller.
   It shares the roll history with the DM Toolbox Dice tab (dice-engine.js,
   which must load first). Readers can hide it; the choice is stored in
   localStorage DICE_FAB_KEY ('off' = hidden), and the Dice tab can turn it back on
   through window.setDiceFab(true). Showing or hiding fires a 'gazette-dice-fab' window event.
   Styles: .dice-fab / .dice-pop in style.css.
   ============================================ */

const DICE_FAB_KEY = 'gazette-dice-fab';

(function () {
    let fab = null;
    let pop = null;
    let mode = 'normal';

    function esc(text) {
        return String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }

    function fabOn() {
        try { return localStorage.getItem(DICE_FAB_KEY) !== 'off'; } catch (e) { return true; }
    }

    function build() {
        fab = document.createElement('button');
        fab.type = 'button';
        fab.className = 'dice-fab';
        fab.title = 'Roll dice';
        fab.setAttribute('aria-label', 'Open the dice roller');
        fab.setAttribute('aria-expanded', 'false');
        fab.setAttribute('aria-controls', 'dice-pop');
        fab.textContent = '🎲';

        pop = document.createElement('div');
        pop.className = 'dice-pop';
        pop.id = 'dice-pop';
        pop.setAttribute('role', 'dialog');
        pop.setAttribute('aria-label', 'Dice roller');
        pop.hidden = true;
        pop.innerHTML = `
            <div class="dice-pop-head">
                <strong>🎲 Quick Roll</strong>
                <button type="button" class="dice-pop-x" aria-label="Close the dice roller">✕</button>
            </div>
            <form class="dice-pop-form">
                <input type="text" class="dice-pop-input" value="d20" maxlength="${DICE_LIMITS.length}" autocomplete="off" spellcheck="false" aria-label="Dice formula, like 2d6+3">
                <button type="submit" class="dice-pop-roll">Roll</button>
            </form>
            <div class="dice-pop-chips">
                ${['d20', 'd4', 'd6', 'd8', 'd10', 'd12', 'd100', '2d6'].map(f => `<button type="button" data-f="${f}">${f}</button>`).join('')}
            </div>
            <div class="dice-pop-modes" role="group" aria-label="Advantage">
                <button type="button" data-mode="dis" aria-pressed="false">Dis</button>
                <button type="button" data-mode="normal" aria-pressed="true" class="on">Normal</button>
                <button type="button" data-mode="adv" aria-pressed="false">Adv</button>
            </div>
            <div class="dice-pop-result" aria-live="polite"></div>
            <ol class="dice-pop-recent"></ol>
            <div class="dice-pop-foot">
                <a href="toolbox.html?tab=dice">Full roller &amp; history →</a>
                <button type="button" class="dice-pop-hide">Hide button</button>
            </div>`;
        document.body.append(fab, pop);

        fab.addEventListener('click', () => toggle());
        pop.querySelector('.dice-pop-x').addEventListener('click', () => toggle(false));
        pop.querySelector('.dice-pop-form').addEventListener('submit', e => {
            e.preventDefault();
            roll(pop.querySelector('.dice-pop-input').value);
        });
        pop.querySelector('.dice-pop-chips').addEventListener('click', e => {
            const b = e.target.closest('button[data-f]');
            if (!b) return;
            pop.querySelector('.dice-pop-input').value = b.dataset.f;
            roll(b.dataset.f);
        });
        pop.querySelector('.dice-pop-modes').addEventListener('click', e => {
            const b = e.target.closest('button[data-mode]');
            if (!b) return;
            mode = b.dataset.mode;
            pop.querySelectorAll('.dice-pop-modes button').forEach(x => {
                x.classList.toggle('on', x === b);
                x.setAttribute('aria-pressed', x === b);
            });
        });
        pop.querySelector('.dice-pop-recent').addEventListener('click', e => {
            const b = e.target.closest('button[data-f]');
            if (!b) return;
            pop.querySelector('.dice-pop-input').value = b.dataset.f;
            roll(b.dataset.f, b.dataset.mode);
        });
        pop.querySelector('.dice-pop-hide').addEventListener('click', () => {
            window.setDiceFab(false);
        });
        document.addEventListener('keydown', onKey);
        document.addEventListener('click', onOutside);
        window.addEventListener('gazette-dice', renderRecent);
        renderRecent();
    }

    function remove() {
        if (!fab) return;
        document.removeEventListener('keydown', onKey);
        document.removeEventListener('click', onOutside);
        window.removeEventListener('gazette-dice', renderRecent);
        fab.remove();
        pop.remove();
        fab = pop = null;
    }

    function toggle(open = pop.hidden) {
        pop.hidden = !open;
        fab.setAttribute('aria-expanded', open);
        fab.classList.toggle('open', open);
        if (open) pop.querySelector('.dice-pop-input').select();
    }

    function onKey(e) {
        if (e.key === 'Escape' && pop && !pop.hidden) { toggle(false); fab.focus(); }
    }

    function onOutside(e) {
        // composedPath, not closest(): a clicked "recent" row is re-rendered (detached) by the time this runs.
        if (pop && !pop.hidden && !e.composedPath().some(n => n === pop || n === fab)) toggle(false);
    }

    function roll(formula, useMode = mode) {
        const out = pop.querySelector('.dice-pop-result');
        try {
            const r = rollAndRecord(formula, useMode);
            const crit = r.crit === 'nat20' ? '<span class="dice-crit hit">Natural 20!</span>' : r.crit === 'nat1' ? '<span class="dice-crit miss">Natural 1</span>' : '';
            out.innerHTML = `<div class="dice-pop-total">${r.total}</div>
                <div class="dice-pop-detail">${esc(diceDetail(r))}${r.mode !== 'normal' ? ` · ${diceModeLabel(r.mode)}` : ''} ${crit}</div>
                ${r.note ? `<div class="dice-pop-note">${esc(r.note)}</div>` : ''}`;
        } catch (err) {
            out.innerHTML = `<div class="dice-pop-note">⚠️ ${esc(err.message)}</div>`;
        }
    }

    function renderRecent() {
        if (!pop) return;
        // Ability-score sets (the Dice tab's six rolls) show here but reroll only there.
        pop.querySelector('.dice-pop-recent').innerHTML = loadDiceHistory().slice(0, 5).map(h => `
            <li><button type="button"${h.stats ? ' disabled' : ` data-f="${esc(h.f)}" data-mode="${esc(h.mode || 'normal')}" title="Roll ${esc(h.f)} again"`}>
                <span>${esc(h.label || h.f)}${h.mode && h.mode !== 'normal' ? ` (${h.mode})` : ''}</span><b>${h.total}</b>
            </button></li>`).join('');
    }

    window.setDiceFab = function (on) {
        try { localStorage.setItem(DICE_FAB_KEY, on ? 'on' : 'off'); } catch (e) {}
        if (on && !fab) build();
        if (!on) remove();
        window.dispatchEvent(new Event('gazette-dice-fab'));
    };

    function start() {
        if (fabOn()) build();
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
    else start();
})();
