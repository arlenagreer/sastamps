#!/usr/bin/env node
/**
 * build-sitemap: write _site/sitemap.xml listing every deployed root page on
 * the canonical host (the CNAME file), dated by its last change.
 *
 * Run by `npm run build` after _site/ is assembled, so the sitemap can never
 * go stale. (The committed sitemap.xml it replaces listed 8 pages on the bare
 * sastamps.org host, was last edited 2025-06-28, and was never deployed.)
 *
 * <lastmod> is the latest commit touching the page or the data file(s) it
 * renders. It needs history: CI fetches full history only on a push to main,
 * where the site deploys. In a shallow clone (PR runs) the dates would be
 * wrong, so <lastmod> is omitted there; the sitemap is otherwise identical.
 * A page with no commit yet (new, uncommitted) gets today's date.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { sitePages, deployableFiles } = require('./lib/site');

const REPO = path.resolve(__dirname, '..');
const HOST = fs.readFileSync(path.join(REPO, 'CNAME'), 'utf8').trim();
const ORIGIN = `https://${HOST}/`;
// Not content: the 404 page and the offline fallback.
const EXCLUDE = new Set(['404.html', 'offline.html']);
// Pages whose content is rendered from data files: a data change is a page change.
const PAGE_DATA = {
  'index.html': ['data/meetings/meetings.json', 'data/newsletters/newsletters.json'],
  'meetings.html': ['data/meetings/meetings.json'],
  'newsletter.html': ['data/newsletters/newsletters.json'],
  'archive.html': ['data/newsletters/archived-newsletters.json'], // js/pages/archive.js
  'glossary.html': ['data/glossary/glossary.json'],
  'resources.html': ['data/members/resources.json'],
  // The search index (scripts/build-search-index.js) is built from these.
  'search.html': ['data/meetings/meetings.json', 'data/newsletters/newsletters.json', 'data/glossary/glossary.json', 'data/members/resources.json']
};

const pageUrl = (page) => ORIGIN + (page === 'index.html' ? '' : page);

const isShallow = (root) => execFileSync('git', ['rev-parse', '--is-shallow-repository'], { cwd: root, encoding: 'utf8' }).trim() === 'true';

// Latest commit date (YYYY-MM-DD) touching the page or its data files.
function lastModified(root, page) {
  const out = execFileSync('git', ['log', '-1', '--format=%cs', '--', page, ...(PAGE_DATA[page] || [])], { cwd: root, encoding: 'utf8' }).trim();
  return out || new Date().toISOString().slice(0, 10);
}

function buildSitemap(root, siteDir, { dated = !isShallow(root) } = {}) {
  if (!dated) {
    console.warn('build-sitemap: shallow clone, so <lastmod> is left out (full history is fetched on push to main)');
  }
  const pages = sitePages(root, deployableFiles(root))
    .filter((p) => !EXCLUDE.has(p) && fs.existsSync(path.join(siteDir, p)))
    .sort((a, b) => (a === 'index.html' ? -1 : b === 'index.html' ? 1 : a.localeCompare(b)));
  const urls = pages.map((p) => `  <url>\n    <loc>${pageUrl(p)}</loc>\n${dated ? `    <lastmod>${lastModified(root, p)}</lastmod>\n` : ''}  </url>`);
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
  fs.writeFileSync(path.join(siteDir, 'sitemap.xml'), xml);
  return pages;
}

module.exports = { HOST, ORIGIN, EXCLUDE, PAGE_DATA, pageUrl, isShallow, buildSitemap };

if (require.main === module) {
  const pages = buildSitemap(REPO, path.join(REPO, '_site'));
  console.log(`Wrote _site/sitemap.xml: ${pages.length} pages on ${ORIGIN}`);
}
