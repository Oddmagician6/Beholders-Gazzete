/* ============================================
   MAP EXPORT (F45)
   Turns a map's SVG (siteMapSvg, contMapSvg) into a PNG file to download: the page's own
   map styles go inside the SVG, the browser draws it on a canvas, and the canvas becomes
   the file. Nothing leaves the browser. Used by the Worldbuilder's Sites tab (a battle map
   on a 5-foot grid, for Owlbear Rodeo, Foundry, or any VTT), its Continent tab, and its Maps
   tab (your own picture under the pins: `under`, drawn first).
   ============================================ */

// The page's own rules whose selectors all start with prefix (hover and focus rules left
// out, and nothing inside @media), with each var(--x) swapped for its value: an SVG drawn
// as an image can't see the page's stylesheets.
function mapPageCss(prefix) {
    const root = getComputedStyle(document.documentElement);
    const out = [];
    for (const sheet of document.styleSheets) {
        let rules;
        try { rules = sheet.cssRules; } catch (e) { continue; }   // another site's sheet (Google Fonts)
        for (const r of rules) {
            if (!(r instanceof CSSStyleRule)) continue;
            const parts = r.selectorText.split(',').map(p => p.trim());
            if (!parts.every(p => p.startsWith(prefix) && !p.includes(':'))) continue;
            out.push(r.cssText.replace(/var\((--[\w-]+)(?:\s*,\s*([^)]*))?\)/g, (m, name, back) => root.getPropertyValue(name).trim() || (back || '').trim() || m));
        }
    }
    return out.join('\n');
}

// The SVG at w × h pixels with its styles inside it.
function mapSvgForExport(svg, w, h, css) {
    // Callbacks, so a "$" in the CSS (a font's data: URL) is taken as it is.
    return svg.replace(/<svg\b/, () => `<svg width="${w}" height="${h}"`).replace(/(<svg\b[^>]*>)/, m => `${m}<style>${css}</style>`);
}

// The SVG with each picture it links (href="img/…") written into it as a data: URL: an SVG
// drawn as an image can't load anything outside itself. A picture that won't load is left out.
async function mapInlineImages(svg) {
    const hrefs = [...new Set([...svg.matchAll(/href="(img\/[^"]+)"/g)].map(m => m[1]))];
    const urls = await Promise.all(hrefs.map(async h => {
        try {
            const res = await fetch(h);
            if (!res.ok) return '';
            const blob = await res.blob();
            return await new Promise(ok => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = () => ok(''); r.readAsDataURL(blob); });
        } catch (e) {
            return '';
        }
    }));
    const map = new Map(hrefs.map((h, k) => [h, urls[k]]));
    return svg.replace(/href="(img\/[^"]+)"/g, (m, h) => `href="${map.get(h)}"`);
}

// Draws the SVG on a canvas and resolves to a PNG blob (or `type`), or null when the browser can't
// (most often a canvas too big for it: phones cap them lower than computers). under: a picture
// (an ImageBitmap or a loaded <img>) to draw first, the SVG on top of it.
function mapSvgToPng(svg, w, h, { under = null, type = 'image/png' } = {}) {
    return new Promise(resolve => {
        const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
        const done = blob => { URL.revokeObjectURL(url); resolve(blob); };
        const img = new Image();
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext('2d');
                if (!ctx) { done(null); return; }
                if (under) ctx.drawImage(under, 0, 0, w, h);
                ctx.drawImage(img, 0, 0, w, h);
                canvas.toBlob(done, type, 0.92);
            } catch (e) {
                done(null);
            }
        };
        img.onerror = () => done(null);
        img.src = url;
    });
}

function mapDownload(blob, name) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 10000);
}

// "The Sunken Vault of Orr" → "the-sunken-vault-of-orr". Windows' reserved names (con, nul, com1…) get "-map".
function mapFileSlug(name) {
    const s = String(name).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'map';
    return /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/.test(s) ? s + '-map' : s;
}

// The page's Google web fonts that the CSS names (Cinzel, IM Fell English…), Latin letters only, as
// @font-face rules with the font files inside them: an SVG drawn as an image can't fetch them, so without
// this the picture falls back to the computer's own fonts. '' when offline or nothing matches.
async function mapFontCss(css) {
    const used = new Set([...css.matchAll(/font-family:\s*([^;}]+)/g)].flatMap(m => m[1].split(',').map(f => f.trim().replace(/^['"]|['"]$/g, ''))));
    const link = document.querySelector('link[href*="fonts.googleapis.com/css"]');
    if (!link || !used.size) return '';
    try {
        const sheet = await (await fetch(link.href)).text();
        const faces = (sheet.match(/@font-face\s*\{[^}]*\}/g) || []).filter(f => {
            const fam = (/font-family:\s*['"]?([^;'"]+)/.exec(f) || [])[1];
            const range = (/unicode-range:\s*([^;]+)/.exec(f) || [])[1] || '';
            return used.has(fam) && (!range || /U\+0000-00FF/i.test(range));
        });
        const out = await Promise.all(faces.map(async f => {
            const url = (/url\(([^)]+)\)/.exec(f) || [])[1];
            if (!url) return '';
            const blob = await (await fetch(url.replace(/['"]/g, ''))).blob();
            const data = await new Promise(ok => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = () => ok(''); r.readAsDataURL(blob); });
            return data ? f.replace(/url\([^)]+\)/, () => `url(${data})`) : '';
        }));
        return out.join('\n');
    } catch (e) {
        return '';
    }
}

// The whole export: svg string → PNG download (opts: see mapSvgToPng). Resolves to true, or false if it failed.
async function mapExportPng(svg, w, h, css, fileName, opts = {}) {
    const fonts = await mapFontCss(css);
    const blob = await mapSvgToPng(mapSvgForExport(svg, w, h, fonts ? fonts + '\n' + css : css), w, h, opts);
    if (!blob) return false;
    mapDownload(blob, fileName);
    return true;
}
