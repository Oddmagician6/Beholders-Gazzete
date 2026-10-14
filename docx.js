/* ============================================
   WORD DOCUMENTS AND RICH COPY (no library, no DOM drawing)
   A document is a list of blocks:
     { t: 'title', text }      the document's title
     { t: 'kicker', text }     a small line over a heading ("Town")
     { t: 'h1' | 'h2', text, page }   headings; page: start a new page
     { t: 'p', text, label }   a paragraph; label: bold lead-in ("Giver: ")
     { t: 'li', text, label }  a bulleted line
   Text is plain; a newline starts a new paragraph.
   - docxBlob(title, blocks): a .docx file (Word, Google Docs, LibreOffice, Pages open it).
     Written as a stored (uncompressed) zip of the few parts Word needs.
   - docHTML(blocks): the same blocks as simple HTML, for the clipboard.
   - docDownload(title, blocks, name): save the .docx.
   - docCopy(blocks, text): copy as formatted text (Google Docs and Word keep the headings
     and bold) with the plain text alongside for everywhere else. Resolves true when copied.
   ============================================ */

const DOC_FONT = 'Georgia';

function docEsc(s) {
    return String(s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function docParas(text) {
    return String(text || '').split(/\n+/).map(s => s.trim()).filter(Boolean);
}

// ── Word XML ──────────────────────────────────────────────
function docRun(text, bold) {
    return `<w:r>${bold ? '<w:rPr><w:b/></w:rPr>' : ''}<w:t xml:space="preserve">${docEsc(text)}</w:t></w:r>`;
}

function docPara(style, runs, page) {
    const pPr = style || page ? `<w:pPr>${style ? `<w:pStyle w:val="${style}"/>` : ''}${page ? '<w:pageBreakBefore/>' : ''}</w:pPr>` : '';
    return `<w:p>${pPr}${runs}</w:p>`;
}

const DOC_STYLE = { title: 'Title', kicker: 'Kicker', h1: 'Heading1', h2: 'Heading2', li: 'Bullet' };

function docBodyXML(blocks) {
    return blocks.map(b => {
        const style = DOC_STYLE[b.t] || '';
        const paras = docParas(b.text);
        // A bullet as a plain "•" and a tab keeps the file free of a numbering part.
        if (b.t === 'li') return docPara(style, docRun('•') + '<w:r><w:tab/></w:r>' + (b.label ? docRun(b.label, true) : '') + docRun(paras.join(' ')));
        if (b.t !== 'p') return docPara(style, docRun(paras.join(' ')), b.page);
        if (!paras.length) return b.label ? docPara('', docRun(b.label, true)) : '';
        return paras.map((p, i) => docPara('', (i === 0 && b.label ? docRun(b.label, true) : '') + docRun(p))).join('');
    }).join('');
}

function docStylesXML() {
    const style = (id, name, ppr, rpr, extra = '') => `<w:style w:type="paragraph" w:styleId="${id}"><w:name w:val="${name}"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/>${extra}<w:pPr>${ppr}</w:pPr><w:rPr>${rpr}</w:rPr></w:style>`;
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="${DOC_FONT}" w:hAnsi="${DOC_FONT}" w:cs="${DOC_FONT}"/><w:sz w:val="22"/><w:lang w:val="en-US"/></w:rPr></w:rPrDefault>
<w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>
${style('Title', 'Title', '<w:spacing w:after="240"/>', '<w:b/><w:sz w:val="44"/><w:color w:val="5A3A12"/>', '<w:qFormat/>')}
${style('Kicker', 'Kicker', '<w:keepNext/><w:spacing w:before="240" w:after="0"/>', '<w:caps/><w:sz w:val="18"/><w:color w:val="8A6A2A"/>')}
${style('Heading1', 'heading 1', '<w:keepNext/><w:spacing w:before="120" w:after="160"/><w:outlineLvl w:val="0"/>', '<w:b/><w:sz w:val="36"/><w:color w:val="5A3A12"/>', '<w:qFormat/>')}
${style('Heading2', 'heading 2', '<w:keepNext/><w:spacing w:before="240" w:after="80"/><w:outlineLvl w:val="1"/>', '<w:b/><w:sz w:val="26"/><w:color w:val="7A5418"/>', '<w:qFormat/>')}
${style('Bullet', 'List Bullet', '<w:spacing w:after="60"/><w:ind w:left="360" w:hanging="360"/>', '')}
</w:styles>`;
}

function docxParts(title, blocks) {
    const now = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
    const body = docBodyXML(blocks);
    return {
        '[Content_Types].xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`,
        '_rels/.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`,
        'docProps/core.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${docEsc(title)}</dc:title><dc:creator>The Beholder's Gazette</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created></cp:coreProperties>`,
        'word/_rels/document.xml.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
        'word/styles.xml': docStylesXML(),
        'word/document.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr></w:body></w:document>`
    };
}

// ── A stored zip ──────────────────────────────────────────
let docCrcTable = null;

function docCrc32(bytes) {
    if (!docCrcTable) {
        docCrcTable = new Uint32Array(256);
        for (let n = 0; n < 256; n++) {
            let c = n;
            for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
            docCrcTable[n] = c >>> 0;
        }
    }
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < bytes.length; i++) crc = docCrcTable[(crc ^ bytes[i]) & 0xFF] ^ (crc >>> 8);
    return (crc ^ 0xFFFFFFFF) >>> 0;
}

function docZip(files) {
    const enc = new TextEncoder(), d = new Date();
    const time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
    const date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    const out = [], central = [];
    let offset = 0;
    Object.entries(files).forEach(([name, text]) => {
        const nm = enc.encode(name), data = enc.encode(text), crc = docCrc32(data);
        const head = new DataView(new ArrayBuffer(30));
        [[0, 0x04034b50, 4], [4, 20, 2], [6, 0x0800, 2], [8, 0, 2], [10, time, 2], [12, date, 2], [14, crc, 4],
            [18, data.length, 4], [22, data.length, 4], [26, nm.length, 2], [28, 0, 2]]
            .forEach(([at, v, n]) => (n === 4 ? head.setUint32(at, v, true) : head.setUint16(at, v, true)));
        const cd = new DataView(new ArrayBuffer(46));
        [[0, 0x02014b50, 4], [4, 20, 2], [6, 20, 2], [8, 0x0800, 2], [10, 0, 2], [12, time, 2], [14, date, 2], [16, crc, 4],
            [20, data.length, 4], [24, data.length, 4], [28, nm.length, 2], [30, 0, 2], [32, 0, 2], [34, 0, 2], [36, 0, 2], [38, 0, 4], [42, offset, 4]]
            .forEach(([at, v, n]) => (n === 4 ? cd.setUint32(at, v, true) : cd.setUint16(at, v, true)));
        out.push(new Uint8Array(head.buffer), nm, data);
        central.push(new Uint8Array(cd.buffer), nm);
        offset += 30 + nm.length + data.length;
    });
    const size = central.reduce((n, a) => n + a.length, 0), count = Object.keys(files).length;
    const end = new DataView(new ArrayBuffer(22));
    [[0, 0x06054b50, 4], [4, 0, 2], [6, 0, 2], [8, count, 2], [10, count, 2], [12, size, 4], [16, offset, 4], [20, 0, 2]]
        .forEach(([at, v, n]) => (n === 4 ? end.setUint32(at, v, true) : end.setUint16(at, v, true)));
    return [...out, ...central, new Uint8Array(end.buffer)];
}

function docxBlob(title, blocks) {
    return new Blob(docZip(docxParts(title, blocks)), { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
}

function docDownload(title, blocks, name) {
    const url = URL.createObjectURL(docxBlob(title, blocks));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ── Rich copy ─────────────────────────────────────────────
function docHTML(blocks) {
    const h = s => docEsc(s);
    let list = false;
    const out = [];
    blocks.forEach(b => {
        if (b.t !== 'li' && list) { out.push('</ul>'); list = false; }
        const paras = docParas(b.text);
        const lead = b.label ? `<b>${h(b.label)}</b>` : '';
        if (b.t === 'li') {
            if (!list) { out.push('<ul>'); list = true; }
            out.push(`<li>${lead}${h(paras.join(' '))}</li>`);
        } else if (b.t === 'title') out.push(`<h1>${h(paras.join(' '))}</h1>`);
        else if (b.t === 'kicker') out.push(`<p style="font-size:9pt;text-transform:uppercase;letter-spacing:1px;color:#8a6a2a;margin-bottom:0">${h(paras.join(' '))}</p>`);
        else if (b.t === 'h1') out.push(`<h2>${h(paras.join(' '))}</h2>`);
        else if (b.t === 'h2') out.push(`<h3>${h(paras.join(' '))}</h3>`);
        else if (paras.length) out.push(paras.map((p, i) => `<p>${i === 0 ? lead : ''}${h(p)}</p>`).join(''));
        else if (lead) out.push(`<p>${lead}</p>`);
    });
    if (list) out.push('</ul>');
    return `<div style="font-family:${DOC_FONT},serif">${out.join('')}</div>`;
}

function docCopy(blocks, text) {
    if (window.ClipboardItem && navigator.clipboard && navigator.clipboard.write) {
        const item = new ClipboardItem({
            'text/html': new Blob([docHTML(blocks)], { type: 'text/html' }),
            'text/plain': new Blob([text], { type: 'text/plain' })
        });
        return navigator.clipboard.write([item]).then(() => true)
            .catch(() => navigator.clipboard.writeText(text).then(() => true, () => false));
    }
    return navigator.clipboard ? navigator.clipboard.writeText(text).then(() => true, () => false) : Promise.resolve(false);
}
