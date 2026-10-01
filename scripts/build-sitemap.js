#!/usr/bin/env node
/**
 * build-sitemap: write _site/sitemap.xml listing every deployed root page on
 * the canonical host, each with the date of its last commit as <lastmod>.
 *
 * Run by `npm run build` after _site/ is assembled, so the sitemap can never
 * go stale. (The committed sitemap.xml it replaces listed 8 pages on the bare
 * sastamps.org host, was last edited 2025-06-28, and was never deployed.)
 *
 * <lastmod> needs history: CI checks out with fetch-depth 0. In a shallow
 * clone every page would get the same date, so this warns. A page with no
 * commit yet (new, uncommitted) gets today's date.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { sitePages, deployableFiles } = require('./lib/site');

const ORIGIN = 'https://www.sastamps.org/';
// Not content: the 404 page and the offline fallback.
const EXCLUDE = new Set(['404.html', 'offline.html']);

const pageUrl = (page) => ORIGIN + (page === 'index.html' ? '' : page);

function lastCommitDate(root, file) {
  const out = execFileSync('git', ['log', '-1', '--format=%cs', '--', file], { cwd: root, encoding: 'utf8' }).trim();
  return out || new Date().toISOString().slice(0, 10);
}

function buildSitemap(root, siteDir) {
  const shallow = execFileSync('git', ['rev-parse', '--is-shallow-repository'], { cwd: root, encoding: 'utf8' }).trim() === 'true';
  if (shallow) {
    console.warn('build-sitemap: shallow clone, so <lastmod> dates are not accurate (check out with fetch-depth 0)');
  }
  const pages = sitePages(root, deployableFiles(root))
    .filter((p) => !EXCLUDE.has(p) && fs.existsSync(path.join(siteDir, p)))
    .sort((a, b) => (a === 'index.html' ? -1 : b === 'index.html' ? 1 : a.localeCompare(b)));
  const urls = pages.map((p) => `  <url>\n    <loc>${pageUrl(p)}</loc>\n    <lastmod>${lastCommitDate(root, p)}</lastmod>\n  </url>`);
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
  fs.writeFileSync(path.join(siteDir, 'sitemap.xml'), xml);
  return pages;
}

module.exports = { ORIGIN, EXCLUDE, pageUrl, buildSitemap };

if (require.main === module) {
  const root = path.resolve(__dirname, '..');
  const pages = buildSitemap(root, path.join(root, '_site'));
  console.log(`Wrote _site/sitemap.xml: ${pages.length} pages on ${ORIGIN}`);
}
