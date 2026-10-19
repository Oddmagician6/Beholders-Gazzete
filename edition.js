/* ============================================
   THE PRINT EDITION (F71)
   One day's stories laid out as a newspaper: masthead, the lead story across the page,
   the rest in columns, story pictures, and that day's classifieds (F70, dealClassifieds).
   ?date=YYYY-MM-DD picks the day; without it, the newest edition. Satire and Realm
   Dispatches only: Across the Multiverse stories ("real": true) never go in.
   Needs rng.js and classifieds.js.
   ============================================ */

const edEsc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// Date-only strings parse as UTC midnight, which shows the day before in the Americas
const edDay = s => new Date(s + 'T12:00:00');
const edLong = s => edDay(s).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
const edShort = s => edDay(s).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

let edDesks = [], edDates = [], edByDate = new Map();

// Same picture rule as script.js storyPicSrc: the article's own image, else its category's.
function edPicSrc(a, small) {
    if (a.image) return a.image;
    const slug = String(a.category || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return slug ? `img/story/${slug}${small ? '-sm' : ''}.webp` : '';
}
function edPic(a, small) {
    const src = edPicSrc(a, small);
    return src ? `<figure class="ed-pic"><img src="${edEsc(src)}" alt="" width="${small ? 480 : 960}" height="${small ? 320 : 640}" loading="${small ? 'lazy' : 'eager'}" decoding="async" onerror="this.parentNode.remove()"></figure>` : '';
}

// Article text as written by the newsroom (trusted, same as article.html), minus the old <br> spacers
function edBody(a) {
    return String(a.content || '').replace(/<br\s*\/?>/gi, '');
}

function edKicker(a) {
    const d = edDesks.find(x => x.categories.includes(a.category));
    return edEsc((d && d.icon ? d.icon + ' ' : '') + (a.category || 'News'));
}

function edStory(a, lead) {
    const head = `
        <div class="ed-kicker">${edKicker(a)}</div>
        <h2 class="ed-title"><a href="a/${encodeURIComponent(a.id)}">${edEsc(a.title)}</a></h2>
        <div class="ed-byline">By ${edEsc(a.author || 'The Gazette Staff')}</div>`;
    return lead
        ? `<article class="ed-lead" id="s-${edEsc(a.id)}">${head}${edPic(a, false)}<div class="ed-body">${edBody(a)}</div></article>`
        : `<article class="ed-story" id="s-${edEsc(a.id)}"><div class="ed-story-head">${head}</div><div class="ed-body">${edPic(a, true)}${edBody(a)}</div></article>`;
}

function edAds(date) {
    if (typeof dealClassifieds !== 'function') return '';
    // Four display ads, the same deal as the homepage that day (adsToday in script.js)
    const ads = dealClassifieds(date, 4);
    const small = ads.small.map(ad => `
        <div class="ed-ad">
          <div class="ed-ad-kind">${edEsc(CLASSIFIED_KINDS[ad.k].label)}</div>
          <h3>${edEsc(ad.h)}</h3>
          <p>${edEsc(ad.t)}</p>
          <p class="ed-ad-by">${edEsc(ad.by)}</p>
        </div>`).join('');
    const display = ads.display.map(ad => {
        const href = classifiedShopHref(ad) || ad.href || '';
        return `
        <aside class="ed-display" aria-label="Advertisement">
          <h3>${edEsc(ad.h)}</h3>
          <p>${edEsc(ad.t)}</p>
          ${href ? `<a class="ed-ad-go" href="${edEsc(href)}">${ad.shop ? 'Step inside' : 'Find out more'} →</a>` : ''}
        </aside>`;
    }).join('');
    return `
      <section class="ed-ads" aria-label="Classifieds">
        <h2 class="ed-ads-h">📯 Classifieds</h2>
        <div class="ed-ads-small">${small}</div>
        <div class="ed-ads-display">${display}</div>
      </section>`;
}

function edRender(date) {
    const out = document.getElementById('ed-out');
    const items = edByDate.get(date);
    if (!items) {
        out.innerHTML = `<p class="ed-msg">No edition went to press on ${edEsc(edShort(date))}. ${edDates.length ? `Try <a href="edition?date=${edDates[0]}">the newest one</a>.` : ''}</p>`;
        return;
    }
    const [lead, ...rest] = items;
    const no = edDates.length - edDates.indexOf(date);
    const canon = document.querySelector('link[rel="canonical"]');
    const host = canon ? new URL(canon.href).host : location.host;
    out.innerHTML = `
      <div class="ed-paper">
        <header class="ed-mast">
          <div class="ed-mast-name">The Beholder's Gazette</div>
          <div class="ed-mast-motto">All the News That's Fit to Scry</div>
        </header>
        <div class="ed-dateline">
          <span>No. ${no}</span>
          <span>${edEsc(edLong(date))}</span>
          <span>${items.length} ${items.length === 1 ? 'story' : 'stories'} · Two copper</span>
        </div>
        ${edStory(lead, true)}
        ${rest.length ? `
        <nav class="ed-index" aria-label="In this edition">
          <h2>In This Edition</h2>
          <ol>${rest.map(a => `<li><span>${edKicker(a)}</span><a href="#s-${edEsc(a.id)}">${edEsc(a.title)}</a></li>`).join('')}</ol>
        </nav>` : ''}
        ${rest.map(a => edStory(a, false)).join('')}
        ${edAds(date)}
        <div class="ed-foot">Satire. Every name is a fictional stand-in · Printed by The Beholder's Gazette${host ? ' · ' + edEsc(host) : ''}</div>
      </div>`;

    // Page numbers and the date in the print margins (Chrome and Edge draw @page margin boxes)
    const css = s => '"' + String(s).replace(/["\\]/g, '\\$&') + '"';
    document.getElementById('ed-page-style').textContent =
        `@media print { @page { @bottom-left { content: ${css("The Beholder's Gazette · " + edShort(date))}; font: 8pt Georgia, serif; }` +
        ` @bottom-right { content: "Page " counter(page) " of " counter(pages); font: 8pt Georgia, serif; } } }`;
    document.title = `The Print Edition, ${edShort(date)} | The Beholder's Gazette`;

    // Older and newer editions (edDates is newest first)
    const i = edDates.indexOf(date);
    const link = (id, d) => {
        const el = document.getElementById(id);
        el.href = d ? 'edition?date=' + d : '#';
        el.setAttribute('aria-disabled', d ? 'false' : 'true');
    };
    link('ed-older', edDates[i + 1]);
    link('ed-newer', edDates[i - 1]);
    document.getElementById('ed-pick').value = date;
}

function edGo(date, push) {
    edRender(date);
    const url = location.pathname + '?date=' + date;
    if (push) history.pushState({ date }, '', url); else history.replaceState({ date }, '', url);
}

function edStart(data, g) {
    edDesks = (g.writers || []).filter(w => !w.desk_real).map(w => ({ icon: w.desk_icon || w.avatar || '', categories: w.categories || [] }));
    // File order within a day, as on the homepage: the first story filed leads
    (data.articles || []).forEach(a => {
        if (a.real || !/^\d{4}-\d{2}-\d{2}$/.test(a.date || '')) return;
        if (!edByDate.has(a.date)) edByDate.set(a.date, []);
        edByDate.get(a.date).push(a);
    });
    edDates = [...edByDate.keys()].sort().reverse();

    const pick = document.getElementById('ed-pick');
    pick.innerHTML = edDates.map(d => `<option value="${d}">${edEsc(edShort(d))} (${edByDate.get(d).length})</option>`).join('');
    document.getElementById('ed-bar').hidden = document.getElementById('ed-hint').hidden = !edDates.length;

    const wanted = new URLSearchParams(location.search).get('date');
    // A day with no edition says so (with a link to the newest) rather than quietly showing another day
    if (wanted && /^\d{4}-\d{2}-\d{2}$/.test(wanted) && edDates.length) {
        edRender(wanted);
        if (!edByDate.has(wanted)) pick.selectedIndex = -1;
        return;
    }
    if (edDates.length) edGo(edDates[0], false);
    else document.getElementById('ed-out').innerHTML = '<p class="ed-msg">The presses are cold. No editions yet.</p>';
}

document.getElementById('year').textContent = new Date().getFullYear();

document.getElementById('ed-pick').addEventListener('change', e => edGo(e.target.value, true));
document.getElementById('ed-bar').addEventListener('click', e => {
    const a = e.target.closest('#ed-older, #ed-newer');
    if (!a || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    const d = new URL(a.href, location.href).searchParams.get('date');
    if (d) { edGo(d, true); window.scrollTo(0, 0); }
});
document.getElementById('ed-print').addEventListener('click', () => {
    // Pictures below the fold load lazily; load them all before the print dialog opens
    const imgs = [...document.querySelectorAll('#ed-out img')];
    imgs.forEach(img => { img.loading = 'eager'; });
    const ready = imgs.map(img => img.complete ? null : new Promise(r => { img.addEventListener('load', r); img.addEventListener('error', r); })).filter(Boolean);
    Promise.all([document.fonts ? document.fonts.ready : null, ...ready]).then(() => window.print());
});
window.addEventListener('popstate', () => {
    const d = new URLSearchParams(location.search).get('date');
    if (d) edRender(d);
});

Promise.all([
    fetch('articles.json?t=' + Date.now()).then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }),
    fetch('glossary.json?t=' + Date.now()).then(r => r.json()).catch(() => ({ writers: [] }))
]).then(([data, g]) => edStart(data, g)).catch(err => {
    console.error('Failed to load the edition:', err);
    document.getElementById('ed-out').innerHTML = '<p class="ed-msg">The press jammed and the edition could not be loaded. Try again shortly.</p>';
});
