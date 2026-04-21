#!/usr/bin/env node
/**
 * Beholder's Gazette — RSS Feed Generator
 * Run: node generate-rss.js
 * Output: feed.xml (drop this in your site root)
 */

const fs   = require('fs');
const path = require('path');

const SITE_URL   = 'https://oddmagician6.github.io/Beholders-Gazzete';
const SITE_TITLE = "The Beholder's Gazette";
const SITE_DESC  = "Your premier source for satirical news from across the realms. All the news that's fit to print (or burn).";
const FEED_PATH  = path.join(__dirname, 'feed.xml');
const DATA_PATH  = path.join(__dirname, 'articles.json');

function escXml(str) {
  if (!str) return '';
  return str
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&apos;');
}

function stripHtml(html) {
  return (html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function toRfc822(dateStr) {
  const d = new Date(dateStr);
  return isNaN(d) ? new Date().toUTCString() : d.toUTCString();
}

const raw  = fs.readFileSync(DATA_PATH, 'utf8');
const data = JSON.parse(raw);
const articles = [...(data.articles || [])]
  .sort((a, b) => new Date(b.date) - new Date(a.date))
  .slice(0, 20); // Latest 20 articles in feed

const items = articles.map(a => {
  const url     = `${SITE_URL}/article.html?id=${encodeURIComponent(a.id)}`;
  const excerpt = a.excerpt || stripHtml(a.content).slice(0, 280) + '…';
  return `
  <item>
    <title>${escXml(a.title)}</title>
    <link>${url}</link>
    <guid isPermaLink="true">${url}</guid>
    <pubDate>${toRfc822(a.date)}</pubDate>
    <category>${escXml(a.category || 'News')}</category>
    <author>gazette@beholders-gazette.com (${escXml(a.author || 'The Gazette Staff')})</author>
    <description>${escXml(excerpt)}</description>
  </item>`;
}).join('\n');

const now = new Date().toUTCString();

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:atom="http://www.w3.org/2005/Atom"
  xmlns:content="http://purl.org/rss/1.0/modules/content/"
  xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${escXml(SITE_TITLE)}</title>
    <link>${SITE_URL}</link>
    <description>${escXml(SITE_DESC)}</description>
    <language>en-us</language>
    <lastBuildDate>${now}</lastBuildDate>
    <managingEditor>gazette@beholders-gazette.com (The Gazette Staff)</managingEditor>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml"/>
    <image>
      <url>${SITE_URL}/favicon.ico</url>
      <title>${escXml(SITE_TITLE)}</title>
      <link>${SITE_URL}</link>
    </image>
${items}
  </channel>
</rss>`;

fs.writeFileSync(FEED_PATH, xml, 'utf8');
console.log(`✅ RSS feed written to feed.xml (${articles.length} articles)`);
