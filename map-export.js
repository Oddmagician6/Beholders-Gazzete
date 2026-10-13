/* ============================================
   MAP EXPORT (F45)
   Turns a map's SVG (siteMapSvg, contMapSvg) into a PNG file to download: the page's own
   map styles go inside the SVG, the browser draws it on a canvas, and the canvas becomes
   the file. Nothing leaves the browser. Used by the Worldbuilder's Sites tab (a battle map
   on a 5-foot grid, for Owlbear Rodeo, Foundry, or any VTT) and its Continent tab.
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
    return svg.replace(/<svg\b/, `<svg width="${w}" height="${h}"`).replace(/(<svg\b[^>]*>)/, `$1<style>${css}</style>`);
}

// Draws the SVG on a canvas and resolves to a PNG blob, or null when the browser can't
// (most often a canvas too big for it: phones cap them lower than computers).
function mapSvgToPng(svg, w, h) {
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
                ctx.drawImage(img, 0, 0, w, h);
                canvas.toBlob(done, 'image/png');
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

// "The Sunken Vault of Orr" → "the-sunken-vault-of-orr"
function mapFileSlug(name) {
    return String(name).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'map';
}

// The whole export: svg string → PNG download. Resolves to true, or false if it failed.
async function mapExportPng(svg, w, h, css, fileName) {
    const blob = await mapSvgToPng(mapSvgForExport(svg, w, h, css), w, h);
    if (!blob) return false;
    mapDownload(blob, fileName);
    return true;
}
