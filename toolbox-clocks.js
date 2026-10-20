/* ============================================
   DM TOOLBOX: PROGRESS CLOCKS (F41)
   Named clocks of 4, 6, 8, or 12 segments, drawn as SVG pie wedges.
   Click a wedge to fill up to it, or click the last filled wedge to empty it;
   − and + do the same from the keyboard. Kept in localStorage CLOCKS_KEY.
   clockSvg() needs no page, so other tools (the DM screen) can draw a clock.
   Loads after toolbox.js and toolbox-table.js (uses esc(), flash(), copyText(), armedClick()).
   The DM screen loads it too, without the tab: the tab's setup skips a page without #clk-list.
   ============================================ */

const CLOCKS_KEY = 'gazette-clocks';
const CLOCKS_MAX = 30;
const CLOCK_SIZES = [4, 6, 8, 12];

let clocks = [];

// ── Data ──────────────────────────────────────────────────
function cleanClock(c) {
    if (!c || typeof c !== 'object') return null;
    const size = CLOCK_SIZES.includes(Number(c.size)) ? Number(c.size) : 4;
    return {
        id: typeof c.id === 'string' && /^[a-z0-9]{1,16}$/.test(c.id) ? c.id : newClockId(),
        name: typeof c.name === 'string' ? c.name.slice(0, 60) : '',
        size,
        filled: Math.min(size, Math.max(0, Math.floor(Number(c.filled)) || 0))
    };
}

function newClockId() {
    return Date.now().toString(36) + Math.floor(Math.random() * 1296).toString(36);
}

function loadClocks() {
    try {
        const saved = JSON.parse(localStorage.getItem(CLOCKS_KEY));
        if (Array.isArray(saved)) clocks = saved.map(cleanClock).filter(Boolean).slice(0, CLOCKS_MAX);
    } catch (e) {}
}

function saveClocks() {
    try { localStorage.setItem(CLOCKS_KEY, JSON.stringify(clocks)); } catch (e) {
        flash('clocks-status', "⚠️ This browser wouldn't save the clocks (storage full or blocked).");
    }
}

// ── Drawing ───────────────────────────────────────────────
// One wedge per segment, clockwise from twelve o'clock. Each wedge carries data-seg.
function clockSvg(size, filled) {
    const r = 46, step = 360 / size;
    const at = deg => {
        const a = (deg - 90) * Math.PI / 180;
        return `${(50 + r * Math.cos(a)).toFixed(2)} ${(50 + r * Math.sin(a)).toFixed(2)}`;
    };
    const wedges = Array.from({ length: size }, (_, i) =>
        `<path class="clk-seg${i < filled ? ' on' : ''}" data-seg="${i}" d="M50 50 L${at(i * step)} A${r} ${r} 0 0 1 ${at((i + 1) * step)} Z"/>`).join('');
    return `<svg class="clk-svg" viewBox="0 0 100 100" role="img" aria-label="${filled} of ${size} segments filled">${wedges}<circle class="clk-rim" cx="50" cy="50" r="${r}"/></svg>`;
}

// ── The tab ───────────────────────────────────────────────
function renderClocks() {
    const list = document.getElementById('clk-list');
    document.getElementById('clk-empty').hidden = clocks.length > 0;
    document.getElementById('clk-count').textContent = clocks.length;
    list.innerHTML = clocks.map((c, i) => {
        const full = c.filled >= c.size;
        return `<li class="clk-card${full ? ' full' : ''}" data-i="${i}">
            <label class="sr-only" for="clk-name-${c.id}">Clock name</label>
            <input type="text" class="clk-name" id="clk-name-${c.id}" value="${esc(c.name)}" maxlength="60" placeholder="Unnamed clock" autocomplete="off">
            <div class="clk-face" title="Click a segment to fill up to it; click the last filled one to empty it">${clockSvg(c.size, c.filled)}</div>
            <div class="clk-state">${full ? '⏰ Complete' : `${c.filled} / ${c.size}`}</div>
            <div class="clk-controls">
                <button type="button" class="clk-btn" data-act="dec" aria-label="Empty a segment of ${esc(c.name || 'this clock')}"${c.filled ? '' : ' disabled'}>−</button>
                <label class="sr-only" for="clk-size-${c.id}">Segments</label>
                <select class="clk-size" id="clk-size-${c.id}">${CLOCK_SIZES.map(n => `<option value="${n}"${n === c.size ? ' selected' : ''}>${n}</option>`).join('')}</select>
                <button type="button" class="clk-btn" data-act="inc" aria-label="Fill a segment of ${esc(c.name || 'this clock')}"${full ? ' disabled' : ''}>+</button>
            </div>
            <div class="clk-more">
                <button type="button" class="clk-mini" data-act="up" aria-label="Move earlier"${i ? '' : ' disabled'}>◀</button>
                <button type="button" class="clk-mini" data-act="reset"${c.filled ? '' : ' disabled'}>↺ Reset</button>
                <button type="button" class="clk-mini clk-x" data-act="remove" aria-label="Remove ${esc(c.name || 'this clock')}">✕</button>
                <button type="button" class="clk-mini" data-act="down" aria-label="Move later"${i < clocks.length - 1 ? '' : ' disabled'}>▶</button>
            </div>
        </li>`;
    }).join('');
}

function setFilled(i, n) {
    const c = clocks[i];
    c.filled = Math.min(c.size, Math.max(0, n));
    saveClocks();
    renderClocks();
    if (c.filled >= c.size) flash('clocks-status', `⏰ ${c.name || 'A clock'} is complete.`);
}

function addClock(e) {
    e.preventDefault();
    if (clocks.length >= CLOCKS_MAX) { flash('clocks-status', `⚠️ ${CLOCKS_MAX} clocks at most. Remove some first.`); return; }
    const nameEl = document.getElementById('clk-new-name');
    clocks.push(cleanClock({ name: nameEl.value.trim(), size: document.getElementById('clk-new-size').value, filled: 0 }));
    nameEl.value = '';
    saveClocks();
    renderClocks();
    nameEl.focus();
}

function onClockClick(e) {
    const card = e.target.closest('.clk-card');
    if (!card) return;
    const i = Number(card.dataset.i);
    const c = clocks[i];
    const seg = e.target.closest('.clk-seg');
    if (seg) {
        const s = Number(seg.dataset.seg);
        setFilled(i, s === c.filled - 1 ? s : s + 1);
        return;
    }
    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    const act = btn.dataset.act;
    if (act === 'inc') setFilled(i, c.filled + 1);
    else if (act === 'dec') setFilled(i, c.filled - 1);
    else if (act === 'reset') setFilled(i, 0);
    else if (act === 'up' || act === 'down') {
        const j = act === 'up' ? i - 1 : i + 1;
        if (j < 0 || j >= clocks.length) return;
        [clocks[i], clocks[j]] = [clocks[j], clocks[i]];
        saveClocks();
        renderClocks();
        const moved = document.querySelector(`.clk-card[data-i="${j}"] [data-act="${act}"]`);
        if (moved && !moved.disabled) moved.focus();
    } else if (act === 'remove') {
        clocks.splice(i, 1);
        saveClocks();
        renderClocks();
        flash('clocks-status', `🗑️ Removed ${c.name || 'the clock'}.`);
    }
}

function clocksText() {
    return clocks.map(c => `${c.name || 'Unnamed clock'}: ${c.filled}/${c.size}${c.filled >= c.size ? ' (complete)' : ''}`).join('\n');
}

document.addEventListener('DOMContentLoaded', () => {
    // The DM screen loads this file for clockSvg() and cleanClock() only.
    if (!document.getElementById('clk-list')) return;
    loadClocks();
    renderClocks();
    document.getElementById('clk-add').addEventListener('submit', addClock);
    const list = document.getElementById('clk-list');
    list.addEventListener('click', onClockClick);
    // Typing renames in place (no redraw, so the field keeps focus).
    list.addEventListener('input', e => {
        if (!e.target.classList.contains('clk-name')) return;
        clocks[Number(e.target.closest('.clk-card').dataset.i)].name = e.target.value.slice(0, 60);
        saveClocks();
    });
    list.addEventListener('change', e => {
        if (!e.target.classList.contains('clk-size')) return;
        const c = clocks[Number(e.target.closest('.clk-card').dataset.i)];
        c.size = Number(e.target.value);
        c.filled = Math.min(c.filled, c.size);
        saveClocks();
        renderClocks();
    });
    document.getElementById('clk-copy').addEventListener('click', () => {
        if (clocks.length) copyText(clocksText(), 'clocks-status', `${clocks.length} clock${clocks.length === 1 ? '' : 's'}`);
        else flash('clocks-status', 'No clocks yet.');
    });
    const clear = document.getElementById('clk-clear');
    clear.addEventListener('click', () => {
        if (!clocks.length) return;
        armedClick(clear, '🧹 Clear All', () => {
            const n = clocks.length;
            clocks = [];
            saveClocks();
            renderClocks();
            flash('clocks-status', `🧹 Cleared ${n} clock${n === 1 ? '' : 's'}.`);
        });
    });
    // Another tab on the same browser changed the clocks.
    window.addEventListener('storage', e => {
        if (e.key !== CLOCKS_KEY) return;
        clocks = [];
        loadClocks();
        if (!document.activeElement || !document.activeElement.classList.contains('clk-name')) renderClocks();
    });
});
