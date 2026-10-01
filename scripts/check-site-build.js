#!/usr/bin/env node
/**
 * check-site-build: the build produces the deployable site in _site/ and
 * never writes a tracked file.
 *
 * Before this, `npm run build` rewrote committed pages, dist/ bundles and
 * package.json in place; every local build dirtied the checkout, and stacking
 * steps grew the pages to 300-490 KB. The deploy now uploads exactly the
 * _site/ this check inspects.
 *
 * Runs the real build once (snapshotting every tracked file's size, mtime
 * and ctime before and after, so even a same-bytes rewrite counts as a write:
 * ctime moves on any write and cannot be set back), then checks _site/.
 */
const fs = require('fs');
const path = require('path');
const { spawnSync, execFileSync } = require('child_process');
const { SITE_DIRS, SITE_FILES, isSitePage, sitePages, isPrivate, deployableFiles } = require('./lib/site');
const { ORIGIN, EXCLUDE, pageUrl } = require('./build-sitemap');

const REPO = path.resolve(__dirname, '..');
const SITE = path.join(REPO, '_site');
const DEPLOYABLE = deployableFiles(REPO);

let checks = 0;
let failures = 0;
function check(cond, message) {
  checks++;
  if (!cond) {
    failures++;
    console.log(`  FAIL ${message}`);
  }
}
const count = (s, re) => (s.match(re) || []).length;
const git = (...args) => execFileSync('git', args, { cwd: REPO, encoding: 'utf8' });

function snapshot() {
  const files = git('ls-files', '-z').split('\0').filter(Boolean);
  const state = {};
  for (const f of files) {
    const p = path.join(REPO, f);
    if (!fs.existsSync(p)) continue;
    const st = fs.statSync(p);
    if (!st.isFile()) continue;
    state[f] = `${st.size}:${st.mtimeMs}:${st.ctimeMs}`;
  }
  return { state, status: git('status', '--porcelain', '--untracked-files=all') };
}

// Case-exact existence (macOS file names are case-insensitive, Pages is not).
function existsExact(abs) {
  const rel = path.relative(SITE, abs);
  if (rel.startsWith('..')) return false;
  let dir = SITE;
  for (const part of rel.split(path.sep).filter(Boolean)) {
    if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory() || !fs.readdirSync(dir).includes(part)) return false;
    dir = path.join(dir, part);
  }
  return true;
}

// A reference must name a file: Pages serves no directory listings, so a
// directory resolves only through its index.html.
const fileExact = (abs) => existsExact(abs) && fs.statSync(abs).isFile();

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out); else out.push(p);
  }
  return out;
}

const SKIP_REF = /^(https?:|\/\/|data:|mailto:|tel:|javascript:|#|\$\{)/i;
function resolveRef(ref, fromFile) {
  let clean = ref.split(/[?#]/)[0];
  try {
    clean = decodeURIComponent(clean);
  } catch {
    return path.join(SITE, '\0malformed-escape'); // never exists: reported, not a crash
  }
  if (!clean) return null;
  return clean.startsWith('/') ? path.join(SITE, clean) : path.resolve(path.dirname(fromFile), clean);
}

console.log('▸ build');
const before = snapshot();
// The build's own log streams through, so a failure shows its real diagnostics.
const build = spawnSync(process.execPath, [path.join(REPO, 'scripts/build.js')], { cwd: REPO, stdio: ['ignore', 'inherit', 'inherit'] });
check(build.status === 0, `npm run build failed (exit ${build.status}); its log is above`);
const after = snapshot();

console.log('▸ the build writes no tracked file and leaves the tree as it was');
const touched = Object.keys(before.state).filter((f) => before.state[f] !== after.state[f]);
check(touched.length === 0, `the build wrote ${touched.length} tracked file(s): ${touched.slice(0, 8).join(', ')}`);
check(before.status === after.status, `git status changed during the build:\n${after.status.split('\n').slice(0, 6).join('\n')}`);

if (!fs.existsSync(SITE)) {
  check(false, '_site/ was not produced');
} else {
  console.log('▸ _site holds the deployable pages and nothing private');
  const sourcePages = sitePages(REPO, DEPLOYABLE);
  for (const p of sourcePages) check(existsExact(path.join(SITE, p)), `_site/${p} missing`);
  for (const f of SITE_FILES) check(existsExact(path.join(SITE, f)), `_site/${f} missing`);
  for (const d of SITE_DIRS) check(existsExact(path.join(SITE, d)), `_site/${d}/ missing`);
  const all = walk(SITE).map((f) => path.relative(SITE, f));
  // isPrivate is the build's own rule; the explicit list beside it is an
  // independent second opinion, so a gap in that rule still fails here.
  const forbidden = all.filter((f) => isPrivate(f) || /\.(php|db|sqlite3?|env|md|bak|log|sh|py|rb)$/i.test(f)
    || /^(scripts|js|node_modules|\.planning|\.claude|\.github)\//.test(f)
    || (!f.includes('/') && f.endsWith('.html') && !isSitePage(f)) || /(^|\/)sw\.js$/.test(f));
  check(forbidden.length === 0, `_site contains files that must not be public: ${forbidden.slice(0, 8).join(', ')}`);

  console.log('▸ every local reference in _site resolves');
  const missing = [];
  for (const file of walk(SITE).filter((f) => /\.html?$/.test(f))) {
    const html = fs.readFileSync(file, 'utf8');
    let refs = 0;
    for (const m of html.matchAll(/\b(?:href|src)=["']([^"']+)["']/g)) {
      if (SKIP_REF.test(m[1])) continue;
      refs++;
      const abs = resolveRef(m[1], file);
      if (abs && !fileExact(abs) && !fileExact(path.join(abs, 'index.html'))) missing.push(`${path.relative(SITE, file)} -> ${m[1]}`);
    }
    for (const m of html.matchAll(/\bsrcset=["']([^"']+)["']/g)) {
      for (const part of m[1].split(',')) {
        const url = part.trim().split(/\s+/)[0];
        if (!url || SKIP_REF.test(url)) continue;
        refs++;
        const abs = resolveRef(url, file);
        if (abs && !fileExact(abs)) missing.push(`${path.relative(SITE, file)} -> ${url}`);
      }
    }
    if (path.dirname(file) === SITE && !/^(offline|404)\.html$/.test(path.basename(file))) {
      check(refs >= 5, `${path.relative(SITE, file)}: only ${refs} local references found (parser problem?)`);
    }
  }
  for (const file of walk(SITE).filter((f) => f.endsWith('.css'))) {
    const css = fs.readFileSync(file, 'utf8');
    for (const m of css.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)) {
      if (SKIP_REF.test(m[1])) continue;
      const abs = resolveRef(m[1], file);
      if (abs && !fileExact(abs)) missing.push(`${path.relative(SITE, file)} -> ${m[1]}`);
    }
  }
  check(missing.length === 0, `${missing.length} unresolved reference(s): ${missing.slice(0, 8).join(' ; ')}`);

  console.log('▸ built assets');
  for (const name of ['styles', 'critical', 'font-loading']) {
    const p = path.join(SITE, `css/${name}.min.css`);
    if (!existsExact(p)) { check(false, `_site/css/${name}.min.css missing`); continue; }
    const min = fs.readFileSync(p, 'utf8');
    check(min.length < fs.statSync(path.join(REPO, `css/${name}.css`)).size, `css/${name}.min.css is not smaller than its source`);
    check(!/\/\*(?!!)/.test(min), `css/${name}.min.css contains a comment`);
    check(!/(^|[;{])inset(-inline|-block)?(-start|-end)?:/.test(min), `css/${name}.min.css uses an inset property (Safari < 14.1 ignores it)`);
  }
  check(existsExact(path.join(SITE, 'dist/js/font-loading.min.js')), '_site/dist/js/font-loading.min.js missing');
  check(existsExact(path.join(SITE, 'dist/js/script.min.js')), '_site/dist/js/script.min.js missing (every page loads it)');
  const siteSearch = existsExact(path.join(SITE, 'search.html')) ? fs.readFileSync(path.join(SITE, 'search.html'), 'utf8') : '';
  // search.html fetches its index at runtime (scripts/test-search-page.js
  // proves that in a browser). Inlining it made the page ~368 KB and kept the
  // index from being cached apart from the page.
  check(siteSearch.length > 0 && count(siteSearch, /window\.SEARCH_INDEX_DATA\s*=/g) === 0, '_site/search.html must not embed the search index');
  check(count(fs.readFileSync(path.join(REPO, 'search.html'), 'utf8'), /window\.SEARCH_INDEX_DATA\s*=/g) === 0,
    'the source search.html must not carry an embedded index');
  for (const name of ['search-index.json', 'search-documents.json']) {
    const p = path.join(SITE, 'dist/data', name);
    let ok = false;
    try {
      ok = existsExact(p) && JSON.parse(fs.readFileSync(p, 'utf8')) !== null;
    } catch {
      ok = false;
    }
    check(ok, `_site/dist/data/${name} missing or not valid JSON (search.html fetches it)`);
  }
}

console.log('▸ robots.txt and sitemap.xml');
if (fs.existsSync(SITE)) {
  const robots = existsExact(path.join(SITE, 'robots.txt')) ? fs.readFileSync(path.join(SITE, 'robots.txt'), 'utf8') : '';
  check(robots.length > 0, '_site/robots.txt missing');
  check(new RegExp(`^Sitemap: ${ORIGIN}sitemap\\.xml$`, 'm').test(robots), `_site/robots.txt must point at ${ORIGIN}sitemap.xml`);
  const sitemap = existsExact(path.join(SITE, 'sitemap.xml')) ? fs.readFileSync(path.join(SITE, 'sitemap.xml'), 'utf8') : '';
  check(sitemap.length > 0, '_site/sitemap.xml missing');
  // Parse it as a sitemap: one <urlset>, and every <url> exactly one <loc>
  // and one well-formed <lastmod>.
  check(/^<\?xml version="1\.0" encoding="UTF-8"\?>\n<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">\n[\s\S]*<\/urlset>\n$/.test(sitemap),
    '_site/sitemap.xml is not a well-formed <urlset>');
  const entries = [...sitemap.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((m) => m[1]);
  check(count(sitemap, /<url>/g) === entries.length && count(sitemap, /<\/url>/g) === entries.length, '_site/sitemap.xml has unbalanced <url> tags');
  const locs = [];
  for (const e of entries) {
    const loc = [...e.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1]);
    const lastmod = [...e.matchAll(/<lastmod>([^<]*)<\/lastmod>/g)].map((m) => m[1]);
    check(loc.length === 1 && lastmod.length === 1, `sitemap entry needs one <loc> and one <lastmod>: ${e.trim().slice(0, 80)}`);
    check(lastmod.length === 1 && /^\d{4}-\d{2}-\d{2}$/.test(lastmod[0]) && !Number.isNaN(Date.parse(lastmod[0])), `sitemap <lastmod> is not a date: ${lastmod[0]}`);
    if (loc.length !== 1) continue;
    locs.push(loc[0]);
    check(loc[0].startsWith(ORIGIN), `sitemap <loc> is not on ${ORIGIN}: ${loc[0]}`);
    const rel = loc[0].slice(ORIGIN.length) || 'index.html';
    check(isSitePage(rel) && fileExact(path.join(SITE, rel)), `sitemap <loc> ${loc[0]} has no page in _site/`);
  }
  // And the other way: every deployed page except the excluded ones is listed.
  for (const p of sitePages(REPO, DEPLOYABLE).filter((x) => !EXCLUDE.has(x))) {
    check(locs.includes(pageUrl(p)), `sitemap.xml does not list ${p}`);
  }
  check(!existsExact(path.join(REPO, 'sitemap.xml')) || !DEPLOYABLE.has('sitemap.xml'), 'a committed sitemap.xml would go stale: the build generates it');
}

// Pages that use the font-loading CSS, and therefore need the script.
const FONT_PAGES = ['index.html', 'about.html', 'contact.html', 'meetings.html', 'membership.html', 'newsletter.html', 'archive.html'];
console.log('▸ source pages load plain links and nothing is inlined');
// Every deployed page links both minified stylesheets, except these, which
// are self-contained or not deployed.
const EXEMPT = new Set(['offline.html']); // works with no network: inline styles only
const sourceSitePages = sitePages(REPO, DEPLOYABLE);
check(sourceSitePages.length >= 10, `only ${sourceSitePages.length} site pages found`);
for (const p of sourceSitePages) {
  const html = fs.readFileSync(path.join(REPO, p), 'utf8');
  check(count(html, /sourceMappingURL/g) === 0, `${p}: inline source map present`);
  check(count(html, /<!-- \/?build:/g) === 0, `${p}: leftover build: region markers`);
  check(count(html, /id="critical-css"/g) === 0, `${p}: inline critical CSS (id="critical-css")`);
  check(count(html, /\/\/ Font Face Observer script/g) === 0, `${p}: an old inline font observer is still on the page`);
  check(count(html, /<style\b/gi) === count(html, /<\/style>/gi), `${p}: unbalanced <style> tags`);
  check(count(html, /<script\b/gi) === count(html, /<\/script>/gi), `${p}: unbalanced <script> tags`);
  check(count(html, /dist\/css\//g) === 0, `${p}: references the retired dist/css/ stylesheet`);
  check(!/<link\b(?=[^>]*\brel=["']?preload)(?=[^>]*\bhref=["']?(\.?\/)?css\/)[^>]*>/i.test(html), `${p}: a site stylesheet is preloaded; want plain links`);
  if (!EXEMPT.has(p)) {
    for (const name of ['critical', 'styles']) {
      const n = count(html, new RegExp(`<link rel="stylesheet" href="/?css/${name}\\.min\\.css">`, 'g'));
      check(n === 1, `${p}: css/${name}.min.css linked ${n} times as a plain stylesheet, want 1`);
      check(count(html, new RegExp(`href=["']?(\\.?/)?css/${name}\\.css`, 'g')) === 0, `${p}: still links the unminified css/${name}.css`);
    }
    check(html.indexOf('css/critical.min.css') < html.indexOf('css/styles.min.css'), `${p}: critical.min.css must come before styles.min.css`);
  }
  // Google Fonts must swap, or text is invisible while the fonts load.
  for (const url of html.match(/https:\/\/fonts\.googleapis\.com\/css2\?[^"']+/g) || []) {
    check(count(url, /display=swap/g) === 1, `${p}: Google Fonts URL must carry display=swap exactly once`);
  }
  // The font-loading CSS shows system-ui until the script sets fonts-loaded:
  // one without the other leaves the page on system fonts for good.
  const fontCss = count(html, /href="\/?css\/font-loading\.min\.css"/g);
  const fontJs = count(html, /<script src="\/?dist\/js\/font-loading\.min\.js"><\/script>/g);
  const wantFont = FONT_PAGES.includes(p) ? 1 : 0;
  check(fontCss === wantFont && fontJs === wantFont, `${p}: font-loading CSS/script = ${fontCss}/${fontJs}, want ${wantFont}/${wantFont}`);
  if (wantFont) {
    check(html.indexOf('css/font-loading.min.css') > html.indexOf('css/styles.min.css'),
      `${p}: font-loading CSS must come after the main stylesheet`);
    check(html.indexOf('font-loading.min.js') < html.indexOf('</head>'),
      `${p}: the font-loading script must run in <head>, before first paint`);
    // Without the Google Fonts @font-face rules the script's loads resolve
    // at once with nothing, and it would remember fonts as loaded.
    // Skip anything inside an HTML comment by position (no string rewriting).
    const comments = [...html.matchAll(/<!--[\s\S]*?-->/g)].map((m) => [m.index, m.index + m[0].length]);
    const inComment = (i) => comments.some(([a, z]) => i >= a && i < z);
    const gfLink = [...html.matchAll(/<link\b[^>]*>/g)]
      .find((m) => m[0].includes('fonts.googleapis.com/css2') && !inComment(m.index));
    const blocking = gfLink && /\brel=["']?stylesheet/.test(gfLink[0]) && !/\b(media=["']?print|onload=)/.test(gfLink[0]);
    const script = [...html.matchAll(/font-loading\.min\.js/g)].find((m) => !inComment(m.index));
    check(blocking && script && gfLink.index < script.index,
      `${p}: the Google Fonts stylesheet must be a plain blocking link before the font-loading script`);
  }
}


console.log(`check-site-build: ${checks} checks, ${failures} failed`);
process.exit(failures === 0 ? 0 : 1);
