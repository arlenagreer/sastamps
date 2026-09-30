#!/usr/bin/env node
/**
 * check-inline-scripts.js -- fail if any inline <script> on a deployed page
 * does not parse as JavaScript.
 *
 * Why this exists: in March 2026 an earlier version of
 * scripts/fix-html-validation.js HTML-escaped every raw `&` in each page,
 * including inside <script> blocks, turning `a && b` into `a &amp;&amp; b`.
 * The fixer was corrected the same day to skip <script>/<style>, but the
 * already-escaped source files were committed, and the corrected fixer then
 * preserved the damage verbatim. search.html's main script stopped parsing,
 * so performSearch() was never defined and site search silently returned
 * nothing in production for months. html-validate and eslint (js/**) both
 * miss this: neither parses the JavaScript inside HTML pages.
 *
 * Classic scripts are compiled with vm.Script (compile only, never run).
 * Module scripts are parsed with `node --input-type=module --check`.
 * Non-JS script types (application/ld+json, etc.) and src= scripts are skipped.
 *
 * Scope: every *.html at the repo root and in showcase/ -- the HTML the Pages
 * deploy copies -- minus test-*.html, matching test:html's exclusion.
 *
 * Usage: node scripts/check-inline-scripts.js [dir]   (dir defaults to repo root)
 * Exit: 0 all parse, 1 at least one inline script fails to parse.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const vm = require('vm');

const root = path.resolve(process.argv[2] || path.join(__dirname, '..'));
const SCAN_DIRS = ['.', 'showcase'];
const JS_TYPES = new Set(['', 'text/javascript', 'application/javascript', 'module']);

function htmlFiles() {
  const files = [];
  for (const dir of SCAN_DIRS) {
    const abs = path.join(root, dir);
    if (!fs.existsSync(abs)) {continue;}
    for (const name of fs.readdirSync(abs).sort()) {
      if (name.endsWith('.html') && !name.startsWith('test-')) {
        files.push(path.join(dir, name));
      }
    }
  }
  return files;
}

function parseError(code, isModule) {
  if (isModule) {
    const r = spawnSync(process.execPath, ['--input-type=module', '--check', '-'], {
      input: code,
      encoding: 'utf8'
    });
    if (r.status === 0) {return null;}
    const m = (r.stderr || '').match(/SyntaxError[^\n]*/);
    return m ? m[0] : `node --check exited ${r.status}`;
  }
  try {
    new vm.Script(code); // compile only; never runInContext'd
    return null;
  } catch (err) {
    return `${err.name}: ${err.message}`;
  }
}

let checked = 0;
const failures = [];

for (const rel of htmlFiles()) {
  const html = fs.readFileSync(path.join(root, rel), 'utf8');
  // The HTML parser ends a script element at the first </script, so this
  // non-greedy match extracts exactly what a browser would execute.
  // End tag may carry whitespace/attributes (`</script\t\n bar>`), which browsers accept.
  const re = /<script\b([^>]*)>([\s\S]*?)<\/script\b[^>]*>/gi;
  let m;
  while ((m = re.exec(html))) {
    const attrs = m[1];
    if (/\bsrc\s*=/i.test(attrs)) {continue;}
    const type = ((attrs.match(/\btype\s*=\s*["']?([^"'\s>]+)/i) || [])[1] || '').toLowerCase();
    if (!JS_TYPES.has(type)) {continue;}
    checked++;
    const err = parseError(m[2], type === 'module');
    if (err) {
      const line = html.slice(0, m.index).split('\n').length;
      const hint = /&(amp|lt|gt|quot);/.test(m[2]) ? ' (contains HTML entities -- escaped operators?)' : '';
      failures.push(`${rel}:${line} ${err}${hint}`);
    }
  }
}

if (failures.length) {
  console.error(`Inline script parse check: ${failures.length} of ${checked} inline scripts FAIL to parse`);
  for (const f of failures) {console.error(`  ${f}`);}
  process.exit(1);
}
console.log(`Inline script parse check: all ${checked} inline scripts parse`);
