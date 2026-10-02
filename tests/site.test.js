/**
 * scripts/lib/site.js decides what deploys. isPrivate is the line between the
 * public site and files that must never be served (*.php source, the SQLite
 * database, secrets, docs), so its edges are tested here.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { isSitePage, isPrivate, sitePages, deployableFiles, SITE_FILES, SITE_DIRS } = require('../scripts/lib/site');
const { pageUrl, ORIGIN, EXCLUDE } = require('../scripts/build-sitemap');

test('isSitePage: root .html pages, minus test pages and q4_update', () => {
  for (const p of ['index.html', 'about.html', '404.html', 'offline.html', 'search.html']) {
    assert.equal(isSitePage(p), true, p);
  }
  for (const p of ['test-search.html', 'test-.html', 'q4_update.html', 'index.htm', 'index.html.bak', 'readme.md', 'style.css']) {
    assert.equal(isSitePage(p), false, p);
  }
});

test('isPrivate: server code, databases, secrets and docs never deploy', () => {
  for (const p of ['contact-handler.php', 'security-headers.PHP', 'data/sapa.db', 'data/members.DB', '.env', 'config/.env',
    'README.md', 'docs/notes.md', 'notes.txt', 'data/export.txt']) {
    assert.equal(isPrivate(p), true, p);
  }
});

test('isPrivate: dotfiles and anything under a dot-directory are private', () => {
  for (const p of ['.htaccess', '.DS_Store', 'images/.DS_Store', '.github/workflows/ci.yml', 'data/.cache/x.json']) {
    assert.equal(isPrivate(p), true, p);
  }
});

test('isPrivate: public assets, and robots.txt at the root only', () => {
  for (const p of ['index.html', 'css/styles.min.css', 'data/meetings/meetings.json', 'public/sapa-q4-2026-meetings.ics',
    'images/logo.webp', 'robots.txt', 'site.webmanifest', 'favicon.ico']) {
    assert.equal(isPrivate(p), false, p);
  }
  assert.equal(isPrivate('public/robots.txt'), true, 'only the root robots.txt is exempt');
  assert.equal(isPrivate('robots.txt.md'), true);
});

test('isPrivate: a near-miss extension is not mistaken for a private one', () => {
  for (const p of ['images/php-logo.png', 'data/db.json', 'downloads/readme.mdx', 'public/environment.pdf']) {
    assert.equal(isPrivate(p), false, p);
  }
});

test('SITE_FILES and SITE_DIRS are never private themselves', () => {
  for (const f of [...SITE_FILES, ...SITE_DIRS]) {
    assert.equal(isPrivate(f), false, f);
  }
});

test('sitePages: only deployable root pages', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'site-test-'));
  try {
    for (const f of ['index.html', 'about.html', 'test-x.html', 'draft.html', 'notes.md']) {
      fs.writeFileSync(path.join(dir, f), '');
    }
    const deployable = new Set(['index.html', 'about.html', 'test-x.html', 'notes.md']); // draft.html: untracked and ignored
    assert.deepEqual(sitePages(dir, deployable).sort(), ['about.html', 'index.html']);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('deployableFiles: tracked files, never ignored output', () => {
  const root = path.resolve(__dirname, '..');
  const files = deployableFiles(root);
  assert.ok(files.has('index.html'));
  assert.ok(files.has('scripts/lib/site.js'));
  assert.ok(![...files].some((f) => f.startsWith('node_modules/') || f.startsWith('_site/')));
});

test('sitemap URLs: canonical www host, index as the bare origin', () => {
  assert.equal(ORIGIN, 'https://www.sastamps.org/');
  assert.equal(pageUrl('index.html'), 'https://www.sastamps.org/');
  assert.equal(pageUrl('about.html'), 'https://www.sastamps.org/about.html');
  assert.ok(EXCLUDE.has('404.html') && EXCLUDE.has('offline.html'));
});

test('PAGE_DATA names real files (a misspelled path would silently date nothing)', () => {
  const { PAGE_DATA } = require('../scripts/build-sitemap');
  const root = path.resolve(__dirname, '..');
  for (const [page, files] of Object.entries(PAGE_DATA)) {
    assert.ok(fs.existsSync(path.join(root, page)), page);
    for (const f of files) {
      assert.ok(fs.statSync(path.join(root, f), { throwIfNoEntry: false })?.isFile(), `${page}: ${f} does not exist`);
    }
  }
  // archive.html renders js/pages/archive.js's data file, not newsletters.json.
  assert.deepEqual(PAGE_DATA['archive.html'], ['data/newsletters/archived-newsletters.json']);
});

test('buildSitemap: dated by the page or its data file; no <lastmod> without history', () => {
  const { buildSitemap, PAGE_DATA } = require('../scripts/build-sitemap');
  const { execFileSync } = require('child_process');
  const root = path.resolve(__dirname, '..');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sitemap-test-'));
  const warn = console.warn;
  try {
    for (const f of ['index.html', 'meetings.html', '404.html']) {
      fs.writeFileSync(path.join(dir, f), '');
    }
    console.warn = () => {};
    buildSitemap(root, dir, { dated: true });
    const dated = fs.readFileSync(path.join(dir, 'sitemap.xml'), 'utf8');
    assert.match(dated, /<loc>https:\/\/www\.sastamps\.org\/<\/loc>/);
    assert.ok(!dated.includes('404.html'));
    const latest = execFileSync('git', ['log', '-1', '--format=%cs', '--', 'meetings.html', ...PAGE_DATA['meetings.html']],
      { cwd: root, encoding: 'utf8' }).trim();
    assert.match(dated, new RegExp(`meetings\\.html</loc>\\n    <lastmod>${latest}</lastmod>`));
    buildSitemap(root, dir, { dated: false });
    const shallow = fs.readFileSync(path.join(dir, 'sitemap.xml'), 'utf8');
    assert.equal((shallow.match(/<loc>/g) || []).length, 2);
    assert.ok(!shallow.includes('<lastmod>'));
  } finally {
    console.warn = warn;
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
