#!/usr/bin/env node
/**
 * check-build-idempotent: the build still rewrites committed root HTML in
 * place (fix-html-validation, update-image-tags), and the Pages deploy builds
 * from those committed files. Any step that appends instead of replacing
 * stacks one more copy per build: on 2026-10-01 the six main pages had grown
 * to 300-490 KB that way. The pages now load plain stylesheet links and a
 * font-loading script, and nothing is inlined.
 *
 * Every run happens in a fresh temp dir, with each script started as its own
 * process (absolute path, cwd = the temp dir), so the real worktree is never
 * written. A tripwire checks that.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const REPO = path.resolve(__dirname, '..');
// The steps of scripts/build.js that rewrite root HTML, in build order. The
// drift check below fails when build.js gains, loses or reorders a step until
// it is classified here or in NOT_HTML_WRITERS.
const CHAIN = ['fix-html-validation.js', 'update-image-tags.js'];
// build-css writes css/*.min.css and dist/js/font-loading.min.js; optimize-images
// only regenerates dist/images; build-search-embedded rewrites search.html's
// embedded index on every build by design (it carries a build date); the rest
// write only under dist/.
const NOT_HTML_WRITERS = ['build-css.js', 'optimize-images.js', 'build-search-index.js', 'build-search-embedded.js', 'esbuild.config.js', 'analyze-image-savings.js'];
const INPUTS = ['dist/images/placeholders.json'];
// Pages that use the font-loading CSS, and therefore need the script.
const FONT_PAGES = [...require('./lib/pages'), 'archive.html'];

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
const ROOT_HTML = fs.readdirSync(REPO).filter((n) => n.endsWith('.html'));
const sha = (file) => crypto.createHash('sha1').update(fs.readFileSync(file)).digest('hex');
const read = (dir, rel) => fs.readFileSync(path.join(dir, rel), 'utf8');
const tempDirs = [];
const linkedMin = new Set(); // css/*.min.css names the pages link (filled by T2)

function stage() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sapa-idempotent-'));
  tempDirs.push(dir);
  for (const f of ROOT_HTML) fs.copyFileSync(path.join(REPO, f), path.join(dir, f));
  for (const rel of INPUTS) {
    fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    fs.copyFileSync(path.join(REPO, rel), path.join(dir, rel));
  }
  return dir;
}

function runChain(dir) {
  for (const script of CHAIN) {
    const r = spawnSync(process.execPath, [path.join(REPO, 'scripts', script)], { cwd: dir, encoding: 'utf8' });
    if (r.status !== 0) {
      const out = `${r.stderr}\n${r.stdout}`;
      const reason = (out.match(/Error: .*/) || [out.trim().split('\n').pop()])[0];
      throw new Error(`${script} exited ${r.status}: ${reason}`);
    }
  }
  return Object.fromEntries(ROOT_HTML.map((p) => [p, read(dir, p)]));
}

const before = Object.fromEntries([...ROOT_HTML, ...INPUTS].map((f) => [f, sha(path.join(REPO, f))]));

try {
  console.log('▸ T0 the chain matches the HTML-writing steps of scripts/build.js');
  const buildJs = fs.readFileSync(path.join(REPO, 'scripts/build.js'), 'utf8');
  const steps = [...buildJs.matchAll(/runCommand\('node', \['(?:scripts\/)?([\w.-]+\.js)'\]\)/g)].map((m) => m[1]);
  const calls = (buildJs.match(/runCommand\(/g) || []).length - 1; // minus the definition
  check(steps.length > 0 && steps.length === calls,
    `scripts/build.js has ${calls} runCommand calls but only ${steps.length} in the recognised form`);
  const unknown = steps.filter((st) => !CHAIN.includes(st) && !NOT_HTML_WRITERS.includes(st));
  check(unknown.length === 0, `build.js step(s) not classified here: ${unknown.join(', ')}`);
  check(JSON.stringify(steps.filter((st) => CHAIN.includes(st))) === JSON.stringify(CHAIN),
    `CHAIN order differs from build.js: ${steps.filter((st) => CHAIN.includes(st)).join(' > ')}`);

  // T1: the committed pages are a fixed point of the build chain, so the deploy
  // ships exactly what is committed. Fails on any step that stacks output.
  console.log('▸ T1 committed pages are a fixed point of the build chain');
  const dir = stage();
  const pass1 = runChain(dir);
  const pass2 = runChain(dir);
  for (const p of ROOT_HTML) {
    check(pass1[p] === fs.readFileSync(path.join(REPO, p), 'utf8'), `${p}: one build changes the committed page`);
    check(pass2[p] === pass1[p], `${p}: a second build changes the page again`);
  }

  console.log('▸ T2 pages load plain links and nothing is inlined');
  // Every deployed page links both minified stylesheets, except these, which
  // are self-contained or not deployed.
  const EXEMPT = new Set(['offline.html']); // works with no network: inline styles only
  const sitePages = ROOT_HTML.filter((f) => !/^(test-|q4_update)/.test(f));
  check(sitePages.length >= 10, `only ${sitePages.length} site pages found`);
  for (const p of sitePages) {
    const html = fs.readFileSync(path.join(REPO, p), 'utf8');
    check(count(html, /sourceMappingURL/g) === 0, `${p}: inline source map present`);
    check(count(html, /<!-- \/?build:/g) === 0, `${p}: leftover build: region markers`);
    check(count(html, /id="critical-css"/g) === 0, `${p}: inline critical CSS (id="critical-css")`);
    check(count(html, /\/\/ Font Face Observer script/g) === 0, `${p}: an old inline font observer is still on the page`);
    check(count(html, /<style\b/gi) === count(html, /<\/style>/gi), `${p}: unbalanced <style> tags`);
    check(count(html, /<script\b/gi) === count(html, /<\/script>/gi), `${p}: unbalanced <script> tags`);
    check(count(html, /dist\/css\//g) === 0, `${p}: references the retired dist/css/ stylesheet`);
    for (const m of html.matchAll(/href=["']?(?:\.?\/)?css\/([\w-]+)\.min\.css/g)) linkedMin.add(m[1]);
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

  // The minified files are what build:css produces from the sources today.
  // Compiled in memory with the same options, so nothing is written.
  console.log('▸ T3 committed minified files match their sources');
  const { builds, STYLESHEETS, compile } = require('./build-css');
  const outs = builds.map((b) => path.relative(REPO, b.outfile)).sort();
  const want = [...STYLESHEETS.map((n) => `css/${n}.min.css`), 'dist/js/font-loading.min.js'].sort();
  check(JSON.stringify(outs) === JSON.stringify(want), `build-css.js outputs ${outs.join(', ')}; want ${want.join(', ')}`);
  // Every css/*.min.css a page links must be one the build produces.
  for (const n of linkedMin) check(STYLESHEETS.includes(n), `pages link css/${n}.min.css but build-css.js does not build it`);
  for (const options of builds) {
    const rel = path.relative(REPO, options.outfile);
    const committed = fs.readFileSync(options.outfile, 'utf8');
    check(compile(options) === committed, `${rel} is not what npm run build:css produces: run it and commit`);
    check(!/\/\*(?!!)/.test(committed), `${rel} contains a comment (not minified, or a source map)`);
    if (rel.endsWith('.css')) {
      // Syntax old Safari/Chrome ignore must not appear in shipped CSS.
      check(!/(^|[;{])inset(-inline|-block)?(-start|-end)?:/.test(committed), `${rel} uses an inset property (Safari < 14.1 ignores it)`);
    }
  }
  check(count(fs.readFileSync(path.join(REPO, 'search.html'), 'utf8'), /window\.SEARCH_INDEX_DATA = /g) === 1,
    'search.html must embed the search index exactly once');
} catch (err) {
  failures++;
  console.log(`  FAIL ${err.message}`);
}

for (const d of tempDirs) fs.rmSync(d, { recursive: true, force: true });

// Nothing above may touch the real worktree.
const after = Object.fromEntries([...ROOT_HTML, ...INPUTS].map((f) => [f, sha(path.join(REPO, f))]));
for (const f of Object.keys(before)) check(before[f] === after[f], `tripwire: ${f} in the real worktree changed`);

console.log(`check-build-idempotent: ${checks} checks, ${failures} failed`);
process.exit(failures === 0 ? 0 : 1);
