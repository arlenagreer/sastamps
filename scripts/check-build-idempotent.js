#!/usr/bin/env node
/**
 * check-build-idempotent: the build rewrites the committed root HTML in place
 * (critical CSS, HTML fixes, image tags, font loading), and the Pages deploy
 * builds from those committed files. Any step that appends instead of
 * replacing stacks one more copy per build: on 2026-10-01 the six main pages
 * carried 3-9 stacked stylesheet blocks (two with a ~110 KB inline source
 * map), 7-15 font blocks and 7-13 font-observer scripts, 300-490 KB each.
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
const PAGES = ['index.html', 'about.html', 'contact.html', 'meetings.html', 'membership.html', 'newsletter.html'];
// Same order as scripts/build.js.
const CHAIN = ['extract-critical-css.js', 'fix-html-validation.js', 'update-image-tags.js', 'optimize-fonts.js'];
const INPUTS = ['css/critical.css', 'dist/css/styles.min.css', 'dist/images/placeholders.json'];
const REGIONS = ['critical-css', 'font-styles', 'font-observer'];

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
const sha = (file) => crypto.createHash('sha1').update(fs.readFileSync(file)).digest('hex');
const read = (dir, rel) => fs.readFileSync(path.join(dir, rel), 'utf8');

function stage(mutate) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sapa-idempotent-'));
  for (const f of fs.readdirSync(REPO).filter((n) => n.endsWith('.html'))) {
    fs.copyFileSync(path.join(REPO, f), path.join(dir, f));
  }
  for (const rel of INPUTS) {
    fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    fs.copyFileSync(path.join(REPO, rel), path.join(dir, rel));
  }
  if (mutate) mutate(dir);
  return dir;
}

function runChain(dir) {
  for (const script of CHAIN) {
    const r = spawnSync(process.execPath, [path.join(REPO, 'scripts', script)], { cwd: dir, encoding: 'utf8' });
    if (r.status !== 0) {
      throw new Error(`${script} exited ${r.status}: ${(r.stderr || r.stdout).trim().split('\n').slice(-3).join(' | ')}`);
    }
  }
  return Object.fromEntries(PAGES.map((p) => [p, read(dir, p)]));
}

function invariants(label, html) {
  check(count(html, /sourceMappingURL/g) === 0, `${label}: inline source map present`);
  check(count(html, /\/\/ Font Face Observer script/g) === 1, `${label}: font-observer scripts = ${count(html, /\/\/ Font Face Observer script/g)}, want 1`);
  check(count(html, /display=swap/g) === 1, `${label}: display=swap = ${count(html, /display=swap/g)}, want 1`);
  check(count(html, /rel="preload" href="dist\/css\/styles\.min\.css"/g) === 1, `${label}: stylesheet preload links != 1`);
  check(count(html, /<noscript><link rel="stylesheet" href="dist\/css\/styles\.min\.css">/g) === 1, `${label}: stylesheet noscript links != 1`);
  for (const name of REGIONS) {
    const open = count(html, new RegExp(`<!-- build:${name} -->`, 'g'));
    const close = count(html, new RegExp(`<!-- /build:${name} -->`, 'g'));
    check(open === 1 && close === 1, `${label}: region ${name} open/close = ${open}/${close}, want 1/1`);
  }
  check(count(html, /<style\b/gi) === count(html, /<\/style>/gi), `${label}: unbalanced <style> tags`);
  check(count(html, /<script\b/gi) === count(html, /<\/script>/gi), `${label}: unbalanced <script> tags`);
  // The font fallbacks win today only because they follow the main stylesheet.
  check(html.indexOf('<!-- build:font-styles -->') > html.indexOf('rel="preload" href="dist/css/styles.min.css"'),
    `${label}: font-styles region is not after the stylesheet preload`);
}

function regionBody(html, name) {
  const m = html.match(new RegExp(`<!-- build:${name} -->([\\s\\S]*?)<!-- /build:${name} -->`));
  return m ? m[1] : '';
}

const before = Object.fromEntries([...PAGES, ...INPUTS].map((f) => [f, sha(path.join(REPO, f))]));

try {
  // T1: the committed pages are a fixed point of the build chain, so the deploy
  // ships exactly what is committed. Fails on any step that stacks output.
  console.log('▸ T1 committed pages are a fixed point of the build chain');
  const dir1 = stage();
  const pass1 = runChain(dir1);
  const pass2 = runChain(dir1);
  for (const p of PAGES) {
    check(pass1[p] === fs.readFileSync(path.join(REPO, p), 'utf8'), `${p}: one build changes the committed page (${fs.statSync(path.join(REPO, p)).size} -> ${Buffer.byteLength(pass1[p])} bytes)`);
    check(pass2[p] === pass1[p], `${p}: a second build changes the page again (${Buffer.byteLength(pass1[p])} -> ${Buffer.byteLength(pass2[p])} bytes)`);
  }

  console.log('▸ T2 generated-content invariants');
  for (const p of PAGES) invariants(p, pass1[p]);
  check(count(fs.readFileSync(path.join(REPO, 'dist/css/styles.min.css'), 'utf8'), /sourceMappingURL/g) === 0,
    'dist/css/styles.min.css carries an inline source map');

  // T3: the critical region is regenerated from css/critical.css, in place.
  console.log('▸ T3 critical CSS regenerates in place, never inlines a source map');
  const probe = '.zz-idempotence-probe{color:red}';
  const dir3 = stage((d) => fs.appendFileSync(path.join(d, 'css/critical.css'),
    `\n${probe}\n/*# sourceMappingURL=data:application/json;base64,aDM= */\n`));
  const regen1 = runChain(dir3);
  const regen2 = runChain(dir3);
  for (const p of PAGES) {
    check(count(regionBody(regen1[p], 'critical-css'), /zz-idempotence-probe/g) === 1, `${p}: critical region did not pick up a css/critical.css change exactly once`);
    check(count(regen1[p], /sourceMappingURL/g) === 0, `${p}: a source-map comment in the CSS was inlined`);
    check(regen2[p] === regen1[p], `${p}: regenerated page is not stable on the next build`);
    invariants(`${p} (regenerated)`, regen1[p]);
  }

  // T4: a page with no generated regions gets exactly one of each.
  console.log('▸ T4 first build inserts exactly one of each region');
  const dir4 = stage((d) => {
    for (const p of PAGES) {
      let html = read(d, p);
      html = html.replace(/<!-- build:critical-css -->[\s\S]*?<!-- \/build:critical-css -->/,
        '<link rel="stylesheet" href="dist/css/styles.min.css">');
      html = html.replace(/\n?[ \t]*<!-- build:font-(styles|observer) -->[\s\S]*?<!-- \/build:font-\1 -->/g, '');
      html = html.replace(/([?&](amp;)?)display=swap/g, '').replace(/(fonts\.googleapis\.com\/css2\?[^"']*?)(&amp;)+"/, '$1"');
      fs.writeFileSync(path.join(d, p), html);
    }
  });
  const fresh = runChain(dir4);
  const freshAgain = runChain(dir4);
  for (const p of PAGES) {
    invariants(`${p} (fresh)`, fresh[p]);
    // A first insert must already be final: e.g. a raw '&' written after
    // fix-html-validation.js would be rewritten by the next build.
    check(freshAgain[p] === fresh[p], `${p} (fresh): the build after a first insert changes the page again`);
  }
} catch (err) {
  failures++;
  console.log(`  FAIL ${err.message}`);
}

// T5: nothing above may touch the real worktree.
const after = Object.fromEntries([...PAGES, ...INPUTS].map((f) => [f, sha(path.join(REPO, f))]));
for (const f of Object.keys(before)) check(before[f] === after[f], `tripwire: ${f} in the real worktree changed`);

console.log(`check-build-idempotent: ${checks} checks, ${failures} failed`);
process.exit(failures === 0 ? 0 : 1);
