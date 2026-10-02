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
const { HOST, ORIGIN, EXCLUDE, pageUrl, isShallow } = require('./build-sitemap');
const ics = require('./lib/ics');
const { FEED_REL, FEED_NAME, MANIFEST_REL, feedSourceFiles } = require('./build-calendar');

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

const SKIP_REF = /^(https?:|webcal:|\/\/|data:|mailto:|tel:|javascript:|#|\$\{)/i;
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
    || (!f.includes('/') && f.endsWith('.html') && !isSitePage(f)) || (/(^|\/)sw\.js$/.test(f) && f !== 'sw.js'));
  check(forbidden.length === 0, `_site contains files that must not be public: ${forbidden.slice(0, 8).join(', ')}`);

  // /sw.js deploys only as the kill switch for the retired 2025 caching
  // worker. A caching worker here would pin stale pages again, and a 404
  // here would leave the old worker installed (browsers keep it on a 404).
  console.log('▸ _site/sw.js is the service-worker kill switch');
  const sw = existsExact(path.join(SITE, 'sw.js')) ? fs.readFileSync(path.join(SITE, 'sw.js'), 'utf8') : '';
  const swCode = sw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  check(sw.length > 0, '_site/sw.js missing: browsers holding the retired worker would keep serving stale pages');
  check(/self\.registration\.unregister\(\)/.test(swCode), '_site/sw.js must unregister itself (kill switch)');
  check(/self\.skipWaiting\(\)/.test(swCode), '_site/sw.js must skipWaiting() so it replaces the old worker at once');
  check(/caches\.delete\(/.test(swCode), '_site/sw.js must delete the stale caches');
  check(!/addEventListener\(\s*['"]fetch['"]/.test(swCode) && !/\bonfetch\b/.test(swCode) && !/cache\.(put|add|addAll)\(/.test(swCode),
    '_site/sw.js must not handle fetches or write caches');

  // Icons must be what they claim. favicon.ico was once a 202 KB WebP, and
  // the manifest called it a 192 and 512 px x-icon.
  console.log('▸ favicon.ico and the manifest icons are real files of their declared type');
  const magic = (buf) => (buf.subarray(0, 4).equals(Buffer.from([0, 0, 1, 0])) ? 'image/x-icon'
    : buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) ? 'image/png'
      : buf.subarray(0, 4).toString() === 'RIFF' && buf.subarray(8, 12).toString() === 'WEBP' ? 'image/webp' : 'unknown');
  const pngSize = (buf) => `${buf.readUInt32BE(16)}x${buf.readUInt32BE(20)}`;
  const ico = existsExact(path.join(SITE, 'favicon.ico')) ? fs.readFileSync(path.join(SITE, 'favicon.ico')) : Buffer.alloc(0);
  check(magic(ico) === 'image/x-icon', `_site/favicon.ico is ${magic(ico)}, not an ICO`);
  check(ico.length < 50000, `_site/favicon.ico is ${ico.length} bytes; every visit downloads it`);
  let manifest = {};
  try {
    manifest = JSON.parse(fs.readFileSync(path.join(SITE, 'site.webmanifest'), 'utf8'));
  } catch {
    check(false, '_site/site.webmanifest is not valid JSON');
  }
  check(Array.isArray(manifest.icons) && manifest.icons.length > 0, 'site.webmanifest lists no icons');
  for (const icon of manifest.icons || []) {
    const abs = path.join(SITE, icon.src.replace(/^\//, ''));
    if (!fileExact(abs)) { check(false, `site.webmanifest icon ${icon.src} missing`); continue; }
    const buf = fs.readFileSync(abs);
    check(magic(buf) === icon.type, `site.webmanifest icon ${icon.src} is ${magic(buf)}, declared ${icon.type}`);
    if (magic(buf) === 'image/png') {
      check(pngSize(buf) === icon.sizes, `site.webmanifest icon ${icon.src} is ${pngSize(buf)}, declared ${icon.sizes}`);
    }
  }

  // And every page's icon tags: a declared type must be the file's real
  // type, and an apple-touch-icon must be a PNG (iOS ignores WebP there).
  for (const file of walk(SITE).filter((f) => /\.html?$/.test(f))) {
    const html = fs.readFileSync(file, 'utf8');
    for (const m of html.matchAll(/<link\b[^>]*\brel=["'](?:shortcut )?(icon|apple-touch-icon)["'][^>]*>/gi)) {
      const href = (m[0].match(/\bhref=["']([^"']+)["']/i) || [])[1];
      const type = (m[0].match(/\btype=["']([^"']+)["']/i) || [])[1];
      const abs = href && !SKIP_REF.test(href) ? resolveRef(href, file) : null;
      if (!abs || !fileExact(abs)) continue; // the reference scan below reports it
      const real = magic(fs.readFileSync(abs));
      const where = `${path.relative(SITE, file)}: <link rel="${m[1]}" href="${href}">`;
      if (type) check(real === type, `${where} declares ${type} but the file is ${real}`);
      if (m[1].toLowerCase() === 'apple-touch-icon') check(real === 'image/png', `${where} is ${real}; want a PNG`);
    }
  }

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
  // Absolute URLs on this site (either host) anywhere in a page, stylesheet or
  // the manifest: og:image, JSON-LD, canonical, plain links. They are not
  // relative references, so the scan above skips them, but a dead one is just
  // as broken (a missing og:image served 404 for a year). Each must name a
  // file in _site/, as Pages would serve it. The host comes from CNAME, in
  // both its www and bare forms, with or without a scheme (//host/...).
  // Escape every regex metacharacter, not just dots (CNAME is ours, but a
  // regex built from text should never depend on that).
  const bareHost = HOST.replace(/^www\./, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Groups: 1 userinfo (user@host: never acceptable), 2 port (ignored, so
  // host:443/x is checked as /x), 3 path. The host must end at a path, a
  // port or the URL's end, so www.sastamps.org@evil.example or
  // sastamps.org.evil.example are not mistaken for this site.
  const SAME_SITE = new RegExp(`(?:https?:)?//(?:([^/\\s"'<>@]+)@)?(?:www\\.)?${bareHost}(?::(\\d+))?(?![\\w.:@-])(/[^\\s"'<>)\\\\,]*)?`, 'gi');
  let sameSite = 0; // in pages only: the sanity floor below must not count sitemap/robots
  for (const file of walk(SITE).filter((f) => /\.(html?|css|webmanifest|xml|txt)$/.test(f))) {
    const text = fs.readFileSync(file, 'utf8');
    for (const m of text.matchAll(SAME_SITE)) {
      if (/\.html?$/.test(file)) sameSite++;
      if (m[1] !== undefined) {
        missing.push(`${path.relative(SITE, file)} -> ${m[0]} (userinfo in a same-site URL)`);
        continue;
      }
      let rel = (m[3] || '/').split(/[?#]/)[0];
      try {
        rel = decodeURIComponent(rel);
      } catch {
        missing.push(`${path.relative(SITE, file)} -> ${m[0]} (malformed escape)`);
        continue;
      }
      if (rel.endsWith('/')) rel += 'index.html';
      const abs = path.join(SITE, rel);
      // Like the relative scan: a directory resolves through its index.html.
      if (!fileExact(abs) && !fileExact(path.join(abs, 'index.html'))) missing.push(`${path.relative(SITE, file)} -> ${m[0]}`);
    }
  }
  check(sameSite >= 10, `only ${sameSite} absolute same-site URLs found in the pages (parser problem?)`);
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
  // and one well-formed <lastmod> (none in a shallow clone: no history to date it).
  const wantLastmod = isShallow(REPO) ? 0 : 1;
  check(/^<\?xml version="1\.0" encoding="UTF-8"\?>\n<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">\n[\s\S]*<\/urlset>\n$/.test(sitemap),
    '_site/sitemap.xml is not a well-formed <urlset>');
  const entries = [...sitemap.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((m) => m[1]);
  check(count(sitemap, /<url>/g) === entries.length && count(sitemap, /<\/url>/g) === entries.length, '_site/sitemap.xml has unbalanced <url> tags');
  const locs = [];
  for (const e of entries) {
    const loc = [...e.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1]);
    const lastmod = [...e.matchAll(/<lastmod>([^<]*)<\/lastmod>/g)].map((m) => m[1]);
    check(loc.length === 1 && lastmod.length === wantLastmod, `sitemap entry needs one <loc> and ${wantLastmod} <lastmod>: ${e.trim().slice(0, 80)}`);
    if (lastmod.length) {
      check(/^\d{4}-\d{2}-\d{2}$/.test(lastmod[0]) && !Number.isNaN(Date.parse(lastmod[0])), `sitemap <lastmod> is not a date: ${lastmod[0]}`);
    }
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
  // Each listed page's rel=canonical is exactly its sitemap <loc>, on the
  // CNAME host: search engines treat a mismatch as two different URLs.
  console.log(`▸ rel=canonical matches the sitemap and uses https://${HOST}/`);
  for (const loc of locs) {
    const rel = loc.slice(ORIGIN.length) || 'index.html';
    if (!fileExact(path.join(SITE, rel))) continue;
    const html = fs.readFileSync(path.join(SITE, rel), 'utf8');
    const canon = [...html.matchAll(/<link\b[^>]*\brel=["']canonical["'][^>]*>/gi)]
      .map((m) => (m[0].match(/\bhref=["']([^"']*)["']/i) || [])[1]);
    check(canon.length === 1, `${rel}: ${canon.length} rel=canonical links, want 1`);
    if (canon.length === 1) {
      check(canon[0] === loc, `${rel}: canonical ${canon[0]} is not its sitemap <loc> ${loc}`);
      check(canon[0].startsWith(`https://${HOST}/`), `${rel}: canonical ${canon[0]} is not on https://${HOST}/ (CNAME)`);
    }
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


// The contact form (contact.html's action) and the JavaScript-only forms
// (js/config/form-relay.js, used by the meeting RSVP) must mail the same
// recipient through the same relay.
console.log('▸ contact.html and js/config/form-relay.js name the same relay recipient');
{
  const contact = fs.readFileSync(path.join(REPO, 'contact.html'), 'utf8');
  const action = (contact.match(/<form\b[^>]*\bid=["']contact-form["'][^>]*>/i) || [''])[0].match(/\baction=["']([^"']+)["']/i);
  const relaySrc = fs.readFileSync(path.join(REPO, 'js/config/form-relay.js'), 'utf8');
  const relay = relaySrc.match(/export const FORM_RELAY_URL = '([^']+)'/);
  check(Boolean(action), 'contact.html: #contact-form has no action');
  check(Boolean(relay), 'js/config/form-relay.js: FORM_RELAY_URL not found');
  if (action && relay) {
    const recipient = (u) => {
      const url = new URL(u);
      return `${url.host}${url.pathname.replace(/^\/ajax\//, '/').replace(/\/$/, '')}`.toLowerCase();
    };
    check(recipient(action[1]) === recipient(relay[1]),
      `contact.html mails ${action[1]} but js/config/form-relay.js mails ${relay[1]}: they must match`);
    check(/^https:\/\/formsubmit\.co\/[^/]+$/.test(relay[1]), `FORM_RELAY_URL is not a FormSubmit recipient URL: ${relay[1]}`);
  }
  const meetings = fs.readFileSync(path.join(REPO, 'meetings.html'), 'utf8');
  const csp = (meetings.match(/http-equiv="Content-Security-Policy" content="([^"]*)"/) || [])[1] || '';
  check(/connect-src[^;]*https:\/\/formsubmit\.co/.test(csp), 'meetings.html: CSP connect-src must allow https://formsubmit.co (the RSVP relay)');
}

// Reminders: every deployed .ics event that is not cancelled carries the two
// VALARMs, a cancelled one carries none, and removing them gives back the
// source file byte for byte (so check-ics.mjs's UID, DTSTART, DTEND and
// SUMMARY are exactly what the skill wrote).
console.log('▸ deployed .ics files carry reminders and are otherwise the source, byte for byte');
if (fs.existsSync(SITE)) {
  const files = walk(SITE).filter((f) => f.endsWith('.ics')).map((f) => path.relative(SITE, f).split(path.sep).join('/'))
    .filter((rel) => rel !== FEED_REL);
  let alarmed = 0;
  let cancelled = 0;
  check(files.length >= 50, `only ${files.length} .ics files in _site/ (want the meeting files)`);
  for (const rel of files) {
    const src = path.join(REPO, rel);
    if (!fs.existsSync(src)) {
      check(false, `_site/${rel} has no source file`);
      continue;
    }
    const source = fs.readFileSync(src, 'utf8');
    const deployed = fs.readFileSync(path.join(SITE, rel), 'utf8');
    // A source the strict parser rejects deploys unchanged (the build warns
    // and goes on: reminders must never block a newsletter deploy).
    let sourceOk = true;
    try {
      ics.parseICS(source);
    } catch (error) {
      sourceOk = false;
      console.log(`  WARN ${rel} does not parse (${error.message}): deployed without reminders`);
    }
    if (!sourceOk) {
      check(deployed === source, `_site/${rel} does not parse, so it must deploy unchanged`);
      continue;
    }
    let cal;
    try {
      cal = ics.parseICS(deployed);
    } catch (error) {
      check(false, `_site/${rel} does not parse: ${error.message}`);
      continue;
    }
    if (!/BEGIN:VALARM/i.test(source)) {
      check(ics.stripAlarms(deployed) === source, `_site/${rel} differs from its source apart from the reminders`);
    }
    check(ics.detectEol(deployed) === ics.detectEol(source) && (deployed.includes('\r\n') || !deployed.includes('\r')),
      `_site/${rel}: line endings differ from the source`);
    const srcEvents = ics.events(ics.parseICS(source));
    const events = ics.events(cal);
    check(srcEvents.length === events.length, `_site/${rel}: ${events.length} events, source has ${srcEvents.length}`);
    events.forEach((ev, i) => {
      for (const name of ['UID', 'DTSTART', 'DTEND', 'SUMMARY']) {
        check(ics.prop(ev, name) === ics.prop(srcEvents[i] || { props: [] }, name), `_site/${rel} event ${i + 1}: ${name} differs from the source`);
      }
      const alarms = ev.children.filter((c) => c.name === 'VALARM');
      if (ics.isCancelled(ev)) {
        cancelled++;
        check(alarms.length === 0, `_site/${rel} event ${i + 1} is cancelled but has ${alarms.length} reminder(s)`);
      } else {
        alarmed++;
        const triggers = alarms.map((a) => ics.prop(a, 'TRIGGER')).sort().join(',');
        check(triggers === '-P1D,-PT2H' && alarms.every((a) => ics.prop(a, 'ACTION') === 'DISPLAY' && ics.prop(a, 'DESCRIPTION')),
          `_site/${rel} event ${i + 1} (${ics.prop(ev, 'UID')}): reminders are [${triggers}], want DISPLAY at -P1D and -PT2H`);
      }
    });
  }
  check(alarmed > 0 && cancelled > 0, `expected both reminded (${alarmed}) and cancelled (${cancelled}) events`);

  // The subscribe feed: one calendar, the same UIDs as the single-meeting
  // files from 60 days ago onward (so subscribers' events update in place).
  console.log(`▸ _site/${FEED_REL} is a valid subscribe feed`);
  const feedPath = path.join(SITE, FEED_REL);
  const feed = existsExact(feedPath) ? fs.readFileSync(feedPath, 'utf8') : '';
  check(feed.length > 0, `_site/${FEED_REL} missing`);
  if (feed) {
    let cal = null;
    try {
      cal = ics.parseICS(feed);
    } catch (error) {
      check(false, `_site/${FEED_REL} does not parse: ${error.message}`);
    }
    check(!/(^|[^\r])\n/.test(feed), `_site/${FEED_REL}: every line must end in CRLF`);
    check(feed.split('\r\n').every((l) => Buffer.byteLength(l, 'utf8') <= 75), `_site/${FEED_REL}: a line is longer than 75 octets (unfolded)`);
    if (cal) {
      check(ics.prop(cal, 'X-WR-CALNAME') === FEED_NAME, `feed X-WR-CALNAME is ${ics.prop(cal, 'X-WR-CALNAME')}`);
      check(ics.prop(cal, 'X-WR-TIMEZONE') === 'America/Chicago', 'feed X-WR-TIMEZONE must be America/Chicago');
      check(cal.props.some((p) => p.name === 'REFRESH-INTERVAL' && /VALUE=DURATION/i.test(p.params) && p.value === 'P1D'), 'feed needs REFRESH-INTERVAL;VALUE=DURATION:P1D');
      check(ics.prop(cal, 'X-PUBLISHED-TTL') === 'P1D', 'feed needs X-PUBLISHED-TTL:P1D');
      // Expected events: the SOURCE files from the start date the build used
      // (dist/calendar-feed.json; recomputing it here could straddle a
      // midnight), minus any file the build had to skip.
      let manifest = {};
      try {
        manifest = JSON.parse(fs.readFileSync(path.join(REPO, MANIFEST_REL), 'utf8'));
      } catch {
        check(false, `${MANIFEST_REL} missing or not JSON (the build writes it)`);
      }
      check(/^\d{4}-\d{2}-\d{2}$/.test(manifest.feedStart || ''), `${MANIFEST_REL}: feedStart is ${manifest.feedStart}`);
      const skipped = new Set(manifest.skipped || []);
      const wantFiles = feedSourceFiles(REPO, manifest.feedStart || '9999')
        .filter((f) => !skipped.has(path.relative(REPO, f).split(path.sep).join('/')));
      const want = wantFiles.flatMap((f) => ics.events(ics.parseICS(fs.readFileSync(f, 'utf8'))));
      const got = ics.events(cal);
      if (want.length < 5) {
        console.log(`  WARN only ${want.length} meetings in the feed from ${manifest.feedStart} (is the next schedule posted?)`);
      }
      check(JSON.stringify(got.map((e) => ics.prop(e, 'UID'))) === JSON.stringify(want.map((e) => ics.prop(e, 'UID'))),
        `feed UIDs ${got.length} do not match the ${want.length} single-meeting files from ${manifest.feedStart} onward`);
      got.forEach((ev, i) => {
        const src = want[i];
        if (!src) return;
        for (const name of ['DTSTART', 'DTEND', 'SUMMARY', 'STATUS']) {
          check(ics.prop(ev, name) === ics.prop(src, name), `feed ${ics.prop(ev, 'UID')}: ${name} differs from its source file`);
        }
        const n = ev.children.filter((c) => c.name === 'VALARM').length;
        check(n === (ics.isCancelled(ev) ? 0 : 2), `feed ${ics.prop(ev, 'UID')}: ${n} reminders`);
      });
    }
  }

  // The retired "Set Reminder" button (it threw setReminder is not a function).
  console.log('▸ no "Set Reminder" button anywhere in _site');
  const leftovers = walk(SITE).filter((f) => /\.(html|js)$/.test(f))
    .filter((f) => /Set Reminder|btn-reminder/.test(fs.readFileSync(f, 'utf8')));
  check(leftovers.length === 0, `"Set Reminder" still in: ${leftovers.map((f) => path.relative(SITE, f)).join(', ')}`);
}

console.log(`check-site-build: ${checks} checks, ${failures} failed`);
process.exit(failures === 0 ? 0 : 1);
