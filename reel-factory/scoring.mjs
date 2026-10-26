const STOP_WORDS = new Set([
  'about', 'after', 'again', 'also', 'among', 'and', 'are', 'because', 'been', 'before', 'being', 'between',
  'both', 'could', 'does', 'each', 'from', 'have', 'into', 'just', 'more', 'most', 'other', 'over', 'same',
  'some', 'such', 'than', 'that', 'their', 'them', 'then', 'there', 'these', 'they', 'this', 'those', 'through',
  'under', 'very', 'were', 'what', 'when', 'where', 'which', 'while', 'with', 'would', 'your', 'the', 'for',
  'was', 'has', 'had', 'his', 'her', 'its', 'not', 'but', 'you', 'out', 'all', 'any', 'who', 'why', 'how',
]);

const CONTRAST = /\b(?:but|yet|instead|though|however|despite|whereas|rather than|only to)\b/i;

function words(text) {
  return String(text || '').match(/[\p{L}\p{N}]+(?:['’][\p{L}]+)*/gu) || [];
}

function roleText(script, role) {
  return script?.segments?.find(segment => segment.role === role)?.text || '';
}

// Counted from the segments as the template counts them, so a hand-edited script isn't scored on its old text.
function scriptWords(script) {
  return (script.segments || []).reduce((total, segment) => total + String(segment.text || '').trim().split(/\s+/).filter(Boolean).length, 0);
}

function estimatedSeconds(script) { return Number((scriptWords(script) / 140 * 60).toFixed(1)); }

function clamp(value, max) { return Math.max(0, Math.min(max, value)); }

function hasQuotedPhrase(text) {
  return /“[^”]{2,}”|‘[^’]{2,}’|"[^"]{2,}"|(?:^|\s)'[^']{2,}'(?=\s|$)/.test(text);
}

function bandFor(total) {
  if (total >= 85) return 'Strong candidate';
  if (total >= 70) return 'Good candidate';
  if (total >= 55) return 'Maybe';
  return 'Skip';
}

function makeCriterion(name, max, score, rationale, signals, suggestions = []) {
  const awarded = clamp(score, max);
  return { name, score: awarded, max, pointsUnawarded: max - awarded, rationale, signals, suggestions };
}

function scoreHook(title) {
  const count = words(title).length;
  const signals = [];
  const suggestions = [];
  let score = 3;
  if (count >= 5 && count <= 12) { score += 8; signals.push(`Headline is ${count} words, a compact spoken hook.`); }
  else if (count >= 3 && count <= 16) { score += 5; signals.push(`Headline is ${count} words.`); }
  else { score += 2; suggestions.push('Tighten the headline for quicker delivery.'); }
  if (/\d/.test(title)) { score += 2; signals.push('Headline has a concrete number.'); }
  if (CONTRAST.test(title)) { score += 3; signals.push('Headline contains a contrast or turn.'); }
  if (/[?!]/.test(title) || hasQuotedPhrase(title)) { score += 2; signals.push('Headline has a question, exclamation, or quoted phrase.'); }
  if (count < 4) suggestions.push('Add enough context for a viewer who has not seen the article.');
  if (count > 12 && !CONTRAST.test(title)) suggestions.push('Consider putting the most surprising detail earlier.');
  if (!CONTRAST.test(title) && count >= 4) suggestions.push('No headline reversal or contrast cue was detected; only add one if the article supports it.');
  return makeCriterion('Hook', 20, score, 'Uses headline length and visible structural cues; it does not judge joke quality semantically.', signals, suggestions);
}

function scoreVisual(artworkKind) {
  const kinds = {
    generated: { score: 19, rationale: 'A per-article generated image gives this Reel its own visual subject.', signal: 'Story-specific generated artwork is available.' },
    explicit: { score: 18, rationale: 'An explicit article image gives this Reel a story-specific visual.', signal: 'Story-specific article artwork is available.' },
    category: { score: 9, rationale: 'Category artwork fits the section, but may repeat across several Reels.', signal: 'Uses reusable category artwork.' },
    missing: { score: 0, rationale: 'No local artwork is available to carry the story visually.', signal: 'No usable local artwork was found.' },
  };
  const selected = kinds[artworkKind] || kinds.category;
  const suggestions = artworkKind === 'category' || artworkKind === 'missing'
    ? ['Use a story-specific illustration or a more distinctive sequence of visual beats.']
    : ['Review the crop and focal point on a phone-sized preview.'];
  return makeCriterion('Visual potential', 20, selected.score, selected.rationale, [selected.signal], suggestions);
}

function scoreHumor(article, script) {
  const text = [article.title, article.excerpt, ...((script.segments || []).map(segment => segment.text))].join(' ');
  const signals = [];
  const suggestions = [];
  let score = 4;
  if (CONTRAST.test(text)) { score += 5; signals.push('Contains a contrast, reversal, or delayed turn.'); }
  if (hasQuotedPhrase(text)) { score += 4; signals.push('Has a quotable spoken phrase.'); }
  if (/[()—–]/.test(text)) { score += 3; signals.push('Uses an aside or interruption that can support comic timing.'); }
  if (/[?!]/.test(text)) { score += 2; signals.push('Uses a question or exclamation for emphasis.'); }
  const punchline = roleText(script, 'punchline');
  const punchlineWords = words(punchline).length;
  if (punchlineWords >= 5 && punchlineWords <= 22) { score += 4; signals.push(`Punchline is a concise ${punchlineWords}-word beat.`); }
  else if (!punchline) suggestions.push('Consider whether the excerpt already contains a strong final turn.');
  if (!CONTRAST.test(text)) suggestions.push('No contrast or reversal cue was detected.');
  if (!hasQuotedPhrase(text)) suggestions.push('No quoted phrase was detected.');
  if (!/[()—–]/.test(text)) suggestions.push('No aside or interruption was detected.');
  if (!/[?!]/.test(text)) suggestions.push('No question or exclamation cue was detected.');
  if (score < 10) suggestions.push('Review manually for a clearer comic turn; this heuristic cannot recognize humor reliably.');
  return makeCriterion('Humor', 20, score, 'Scores visible joke structure, not whether a human will find the article funny.', signals, suggestions);
}

function scoreColdComprehension(article, script) {
  const excerpt = String(article.excerpt || '').replace(/<[^>]*>/g, ' ').replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' ').trim();
  const excerptWords = words(excerpt);
  const titleTokens = new Set(words(article.title).map(token => token.toLocaleLowerCase('en-US')).filter(token => token.length > 3 && !STOP_WORDS.has(token)));
  const overlap = excerptWords.map(token => token.toLocaleLowerCase('en-US')).filter(token => titleTokens.has(token)).length;
  const referentialOpening = /^(?:it|this|that|they|he|she|these|those|there|as mentioned|the latter)\b/i.test(excerpt);
  const signals = [];
  const suggestions = [];
  let score = 0;
  if (excerptWords.length >= 8 && excerptWords.length <= 40) { score += 4; signals.push(`Excerpt gives context in ${excerptWords.length} words.`); }
  else if (excerptWords.length <= 55) { score += 2; signals.push(`Excerpt is ${excerptWords.length} words.`); }
  else suggestions.push('Shorten the setup so it makes sense without the article page.');
  if (overlap >= 2) { score += 5; signals.push('Headline and setup share at least two specific terms.'); }
  else if (overlap === 1) { score += 3; signals.push('Headline and setup share a specific term.'); }
  else suggestions.push('Repeat the subject or event in the spoken setup for a cold viewer.');
  if (!referentialOpening) { score += 3; signals.push('Setup begins with a named subject or direct event rather than a dangling reference.'); }
  else { score += 1; suggestions.push('Replace the opening reference with the subject’s name or the event.'); }
  if (/[.!?][”’"']?$/.test(excerpt)) { score += 2; signals.push('Excerpt reads as a complete thought.'); }
  if (roleText(script, 'setup')) { score += 1; signals.push('Script includes a spoken setup beat.'); }
  return makeCriterion('Cold comprehension', 15, score, 'Checks whether the spoken setup repeats enough context for a first-time viewer.', signals, suggestions);
}

function scoreShareability(script, title) {
  const hookWords = words(roleText(script, 'hook') || title).length;
  const punchline = roleText(script, 'punchline');
  const punchlineWords = words(punchline).length;
  const combined = `${roleText(script, 'hook')} ${punchline}`;
  const signals = [];
  const suggestions = [];
  let score = 2;
  if (hookWords >= 4 && hookWords <= 12) { score += 4; signals.push('Hook is short enough to quote or repeat.'); }
  else suggestions.push('Shorten the hook to make the core idea easier to repeat.');
  if (punchlineWords >= 5 && punchlineWords <= 20) { score += 4; signals.push('Punchline fits in a compact final beat.'); }
  else if (punchlineWords > 20) suggestions.push('Trim the punchline to leave one memorable final thought.');
  if (CONTRAST.test(combined)) { score += 3; signals.push('Hook or punchline has a clear reversal.'); }
  if (/[?!]/.test(combined) || hasQuotedPhrase(combined)) { score += 2; signals.push('Contains a quotable or conversational cue.'); }
  if (!CONTRAST.test(combined)) suggestions.push('No contrast cue was detected in the hook or punchline.');
  if (!/[?!]/.test(combined) && !hasQuotedPhrase(combined)) suggestions.push('No question, exclamation, or quoted phrase was detected.');
  return makeCriterion('Shareability', 15, score, 'Uses brevity and quotable structure as proxies; actual audience response is unknown.', signals, suggestions);
}

function scoreShortForm(script, durationSeconds) {
  const wordCount = scriptWords(script);
  const duration = Number(durationSeconds || estimatedSeconds(script));
  const segmentCount = (script.segments || []).filter(segment => segment.role !== 'branding').length;
  const signals = [];
  const suggestions = [];
  let score = 0;
  if (duration >= 20 && duration <= 30) { score += 6; signals.push(`Estimated/rendered duration is ${duration.toFixed(1)} seconds, in the 20–30 second target.`); }
  else if (duration >= 15 && duration <= 35) { score += 4; signals.push(`Estimated/rendered duration is ${duration.toFixed(1)} seconds, inside the 15–35 second limit.`); }
  else if (duration > 0) suggestions.push('Adjust the script toward the 15–35 second target.');
  if (wordCount >= 45 && wordCount <= 75) { score += 2; signals.push(`Narration has ${wordCount} words.`); }
  else suggestions.push(`Review the ${wordCount}-word script for pacing.`);
  if (segmentCount >= 2 && segmentCount <= 4) { score += 2; signals.push(`Uses ${segmentCount} story beats before branding.`); }
  else suggestions.push('Simplify the number of spoken beats.');
  return makeCriterion('Short-form suitability', 10, score, 'Uses estimated/rendered duration, narration length, and beat count.', signals, suggestions);
}

export function scoreReel(article, script, { artworkKind = 'category', durationSeconds } = {}) {
  const criteria = [
    scoreHook(roleText(script, 'hook') || article.title),
    scoreVisual(artworkKind),
    scoreHumor(article, script),
    scoreColdComprehension(article, script),
    scoreShareability(script, article.title),
    scoreShortForm(script, durationSeconds),
  ];
  const total = criteria.reduce((sum, criterion) => sum + criterion.score, 0);
  return {
    version: 1,
    articleId: article.id,
    title: article.title,
    category: article.category,
    method: 'deterministic-editorial-heuristics',
    total,
    max: 100,
    band: bandFor(total),
    artworkKind,
    durationSeconds: Number(durationSeconds || estimatedSeconds(script)),
    humanReviewRequired: true,
    criteria,
    limitations: [
      'This is a transparent heuristic, not an LLM or audience prediction.',
      'Humor, visual composition, narration quality, crop quality, and actual shareability still need human review.',
      'A low score is a recommendation to skip or revise, not a block on manually creating a draft.',
    ],
  };
}
