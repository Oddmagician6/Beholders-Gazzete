export const BRAND_LINES = [
  "The Beholder's Gazette. All the news that's fit to print, or burn.",
  "Keep one eye on the news—and another on the exits. The Beholder's Gazette.",
  "That's the story. The witnesses are being reassembled. The Beholder's Gazette.",
  "Until next time, keep your spell slots close and your alibis closer. The Beholder's Gazette.",
];
const TEMPLATE_VERSION = 3;

function htmlText(html) {
  return String(html || '')
    .replace(/<\s*(br|\/(?:p|div|li|h[1-6]))\b[^>]*>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>')
    .replace(/&quot;|&#34;/gi, '"').replace(/&#39;|&apos;/gi, "'")
    .replace(/&mdash;/gi, '—').replace(/&ndash;/gi, '–').replace(/&rsquo;|&lsquo;/gi, '’')
    .replace(/&rdquo;|&ldquo;/gi, '”')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([\da-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/\s+/g, ' ').replace(/ ([,.;:!?])/g, '$1').trim();
}

function words(text) { return text.trim().split(/\s+/).filter(Boolean); }

function sentences(text) {
  const decimalPoint = '\uE000';
  // Decimals, titles ("Dr. Vell"), and "a.m."/"e.g." don't end a sentence; "5 a.m." does only before a capital.
  const protectedText = text.replace(/(\d)\.(?=\d)/g, `$1${decimalPoint}`)
    .replace(/\b(Dr|Mr|Mrs|Ms|St|Mt|vs)\./g, `$1${decimalPoint}`)
    .replace(/\b(e)\.g\.|\b(i)\.e\./gi, m => m.replaceAll('.', decimalPoint))
    .replace(/\b([aApP])\.([mM])\.(?!\s+[A-Z"“])/g, `$1${decimalPoint}$2${decimalPoint}`)
    .replace(/\b([aApP])\.([mM])\./g, `$1${decimalPoint}$2.`);
  return (protectedText.match(/[^.!?]+[.!?]+(?:["'”’)\]]+)?|[^.!?]+$/g) || [])
    .map(part => part.replaceAll(decimalPoint, '.').trim()).filter(Boolean);
}

function normalize(text) {
  return text.toLocaleLowerCase('en-US').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

function limitAtSentence(text, maxWords) {
  const all = words(text);
  if (all.length <= maxWords) return text;
  const clipped = all.slice(0, maxWords).join(' ');
  const boundary = Math.max(clipped.lastIndexOf('. '), clipped.lastIndexOf('! '), clipped.lastIndexOf('? '));
  return boundary >= clipped.length * 0.55 ? clipped.slice(0, boundary + 1) : `${clipped.replace(/[,:;]+$/, '')}…`;
}

function punchlineScore(text, source) {
  let score = source === 'excerpt' ? 2 : 0;
  if (/\b(?:but|yet|instead|though|however|only to|despite this)\b/i.test(text)) score += 3;
  if (/\bnot\b.{1,40}\bbut\b/i.test(text)) score += 1;
  if (/[“”"'][^“”"']+[“”"']/.test(text)) score += 1;
  if (/\bnot amused\b|\bnot pleased\b|\bdeclined to comment\b/i.test(text)) score -= 3;
  if (/^(?:in the meantime|until\b|meanwhile\b|for now\b|currently\b)/i.test(text)) score -= 4;
  const count = words(text).length;
  if (count >= 8 && count <= 24) score += 2;
  if (count < 5) score -= 1;
  if (count > 28) score -= 2;
  return score;
}

function choosePunchline(excerptSentences, bodySentences) {
  const candidates = [];
  if (excerptSentences.length > 1) candidates.push({ text: excerptSentences.at(-1), source: 'excerpt' });
  for (const text of bodySentences.slice(-8)) candidates.push({ text, source: 'article-body' });

  const excerpt = normalize(excerptSentences.join(' '));
  const unique = new Map();
  for (const candidate of candidates) {
    const key = normalize(candidate.text);
    // A sentence starting in lowercase is a fragment the splitter cut, not a line to read aloud.
    if (!key || /^[a-z]/.test(candidate.text)) continue;
    if (candidate.source === 'article-body' && (excerpt.includes(key) || key.includes(excerpt))) continue;
    const prior = unique.get(key);
    if (!prior || candidate.source === 'excerpt') unique.set(key, candidate);
  }
  const ranked = [...unique.values()].map(candidate => ({
    ...candidate,
    score: punchlineScore(candidate.text, candidate.source),
  })).sort((a, b) => b.score - a.score || (a.source === 'excerpt' ? -1 : 1));
  return ranked[0]?.score > 0 ? ranked[0] : null;
}

export function createGazetteReportScript(article, maxDurationSeconds = 35, brandLine = BRAND_LINES[0]) {
  const title = htmlText(article.title);
  const excerpt = htmlText(article.excerpt) || htmlText(article.content);
  if (!excerpt) throw new Error(`Article "${article.id}" has no excerpt or readable article text.`);

  const excerptSentences = sentences(excerpt);
  const bodySentences = sentences(htmlText(article.content));
  const punchline = choosePunchline(excerptSentences, bodySentences);
  let reportSentences = punchline?.source === 'excerpt' ? excerptSentences.slice(0, -1) : excerptSentences;
  if (punchline?.source === 'article-body' && /\bnot amused\b|\bnot pleased\b/i.test(reportSentences.at(-1) || '')) {
    reportSentences = reportSentences.slice(0, -1);
  }
  const brandWords = words(brandLine).length;
  const hookWords = words(title).length;
  const punchlineWords = punchline ? words(punchline.text).length : 0;
  const maxVoiceWords = Math.max(40, Math.floor((maxDurationSeconds - 2) * 140 / 60));
  const reportBudget = Math.max(8, maxVoiceWords - hookWords - punchlineWords - brandWords);
  const report = limitAtSentence(reportSentences.join(' '), reportBudget);

  const segments = [
    { id: 'hook', role: 'hook', source: 'headline', text: title },
  ];
  if (report) segments.push({ id: 'report', role: 'setup', source: 'excerpt', text: report });
  if (punchline) segments.push({ id: 'punchline', role: 'punchline', source: punchline.source, text: punchline.text });
  segments.push({ id: 'brand', role: 'branding', source: 'brandline', text: brandLine });

  const wordCount = segments.reduce((sum, segment) => sum + words(segment.text).length, 0);
  return {
    schemaVersion: TEMPLATE_VERSION,
    articleId: article.id,
    template: 'gazette-report',
    language: 'en-US',
    source: { title: article.title, category: article.category, author: article.author || '', date: article.date },
    editorial: {
      method: 'deterministic-source-ranking',
      humanReviewRequired: true,
      punchlineSelected: Boolean(punchline),
      wordCount,
      estimatedDurationSeconds: Number((wordCount / 140 * 60).toFixed(1)),
    },
    segments,
    notes: 'Headline opens the reel; report and punchline are drawn from published article text. Review the wording and timing before approval.',
  };
}
