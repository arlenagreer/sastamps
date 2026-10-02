/**
 * XSS security checks for js/utils/safe-dom.js: escapeHTML and safeUrl.
 *
 * Run from the repository root:  node tests/xss-security-test.js
 * Exits 0 when every assertion holds, 1 otherwise.
 *
 * Contract under test:
 * - escapeHTML(text): non-string -> ''; otherwise & < > " ' become
 *   &amp; &lt; &gt; &quot; &#39;, so the result is safe both as element text
 *   and inside a quoted attribute value. Nothing else changes.
 * - safeUrl(url, fallback = '#'): relative URLs and http(s), mailto, tel, sms
 *   and webcal pass through (outer whitespace/control chars trimmed); any
 *   other scheme -- javascript:, data:, vbscript:, in any disguise a browser
 *   would still honour -- returns the fallback. Detection removes only what
 *   browsers ignore: tab/LF/CR anywhere; C0 controls, spaces and other
 *   Unicode whitespace (NBSP, BOM, ...) at the ends only.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';

// safe-dom.js -> logger.js -> config/index.js reads window.location at import time.
globalThis.window = globalThis.window || { location: { hostname: 'example.org', protocol: 'https:', search: '' } };

const { escapeHTML, safeUrl, firstSafeUrl } = await import('../js/utils/safe-dom.js');

let passed = 0;
let failed = 0;
function check(name, fn) {
  try {
    fn();
    passed++;
  } catch (error) {
    failed++;
    console.error(`FAIL ${name}\n  ${error.message}`);
  }
}

// ── escapeHTML ──────────────────────────────────────────────────────────────
const escapeCases = [
  ['<script>alert("XSS")</script>', '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;'],
  ['<img src=x onerror=alert(1)>', '&lt;img src=x onerror=alert(1)&gt;'],
  ['"><script>alert(1)</script>', '&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;'],
  ['" onmouseover="alert(1)', '&quot; onmouseover=&quot;alert(1)'],
  ["' autofocus onfocus='alert(1)", '&#39; autofocus onfocus=&#39;alert(1)'],
  ["';alert(1);//", '&#39;;alert(1);//'],
  ['Tom & Jerry', 'Tom &amp; Jerry'],
  ['&amp;', '&amp;amp;'],
  ['SAPA PHILATEX Fourth Quarter 2026', 'SAPA PHILATEX Fourth Quarter 2026']
];
for (const [input, expected] of escapeCases) {
  check(`escapeHTML(${JSON.stringify(input)})`, () => assert.equal(escapeHTML(input), expected));
}
for (const input of [undefined, null, 42, {}, ['<b>']]) {
  check(`escapeHTML non-string ${JSON.stringify(input)} -> ''`, () => assert.equal(escapeHTML(input), ''));
}
check('escaped value cannot break out of a quoted attribute', () => {
  const html = `<a data-x="${escapeHTML('"><script>alert(1)</script>')}" title='${escapeHTML("' onclick='x")}'>`;
  assert.ok(!/"\s*>|<script/i.test(html.slice(html.indexOf('data-x="') + 8, html.lastIndexOf('"'))));
  assert.ok(!html.includes("' onclick='"));
});

// ── safeUrl: rejected ───────────────────────────────────────────────────────
const rejected = [
  'javascript:alert(1)',
  'JaVaScRiPt:alert(1)',
  ' javascript:alert(1)',
  '\u0000javascript:alert(1)',
  '\u0001javascript:alert(1)',
  '\u001Fjavascript:alert(1)',
  'java\tscript:alert(1)',
  'java\nscript:alert(1)',
  'java\rscript:alert(1)',
  'javascript\t:alert(1)',
  'javascript:alert(1)\n',
  'data:text/html,<script>alert(1)</script>',
  'DATA:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==',
  ' \tdata:image/svg+xml,<svg onload=alert(1)>',
  'vbscript:msgbox(1)',
  'VBScript:msgbox(1)',
  'file:///etc/passwd',
  'a:b/c.pdf'
];
for (const url of rejected) {
  check(`safeUrl rejects ${JSON.stringify(url)}`, () => assert.equal(safeUrl(url), '#'));
}
check('safeUrl custom fallback', () => assert.equal(safeUrl('javascript:alert(1)', ''), ''));
for (const input of [undefined, null, 42, '', '   ', '\u0000']) {
  check(`safeUrl unusable ${JSON.stringify(input)} -> fallback`, () => assert.equal(safeUrl(input), '#'));
}

// ── safeUrl: accepted ───────────────────────────────────────────────────────
const accepted = [
  'https://example.org/a.pdf',
  'http://example.org/',
  'HTTPS://EXAMPLE.ORG/',
  'mailto:loz33@hotmail.com',
  'tel:+12105551234',
  'sms:+12105551234',
  'webcal://example.org/sapa.ics',
  'public/SAPA-PHILATEX-Fourth-Quarter-2026.pdf',
  'Philatex Q1: 2025.pdf',
  'public/Philatex Q1: 2025.pdf',
  './newsletters/a.pdf',
  '../a.pdf',
  '/data/calendar/2026-01-09-meeting.ics',
  '#term-perforation',
  '?q=stamps',
  '//cdn.example.org/x.png'
];
for (const url of accepted) {
  check(`safeUrl accepts ${JSON.stringify(url)}`, () => assert.equal(safeUrl(url), url));
}
check('safeUrl trims outer whitespace and controls only', () => {
  assert.equal(safeUrl('  public/a b.pdf \n'), 'public/a b.pdf');
  assert.equal(safeUrl('\u0001https://example.org/\u0000'), 'https://example.org/');
});
check('safeUrl trims Unicode whitespace at the ends (NBSP, BOM, line separator)', () => {
  assert.equal(safeUrl('public/X.pdf '), 'public/X.pdf');
  assert.equal(safeUrl('﻿public/X.pdf'), 'public/X.pdf');
  assert.equal(safeUrl(' public/X.pdf　'), 'public/X.pdf');
  assert.equal(safeUrl(' ﻿'), '#');
});
check('safeUrl keeps interior Unicode whitespace', () => {
  assert.equal(safeUrl('public/Philatex Q1.pdf'), 'public/Philatex Q1.pdf');
});
check('safeUrl rejects javascript: behind Unicode whitespace', () => {
  assert.equal(safeUrl(' javascript:alert(1)'), '#');
  assert.equal(safeUrl('﻿javascript:alert(1)'), '#');
  assert.equal(safeUrl('javascript:alert(1) '), '#');
});

// ── firstSafeUrl ────────────────────────────────────────────────────────────
check('firstSafeUrl picks the first usable candidate', () => {
  assert.equal(firstSafeUrl(undefined, 'javascript:x', 'public/a.pdf'), 'public/a.pdf');
  assert.equal(firstSafeUrl('public/b.pdf', 'public/a.pdf'), 'public/b.pdf');
});
check('firstSafeUrl returns "" when nothing is usable', () => {
  assert.equal(firstSafeUrl(undefined, '', 'javascript:x'), '');
});

// ── every URL in the shipped data survives safeUrl unchanged ───────────────
const urlish = [];
const walk = (value, key) => {
  if (typeof value === 'string' && /url|path|href|link|image/i.test(key || '')) {
    urlish.push([key, value]);
  } else if (Array.isArray(value)) {
    value.forEach(item => walk(item, key));
  } else if (value && typeof value === 'object') {
    Object.entries(value).forEach(([k, v]) => walk(v, k));
  }
};
for (const file of ['data/newsletters/newsletters.json', 'data/meetings/meetings.json',
  'data/members/resources.json', 'data/glossary/glossary.json']) {
  walk(JSON.parse(fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')));
}
for (const [key, url] of urlish) {
  check(`data ${key}=${url} passes safeUrl unchanged`, () => assert.equal(safeUrl(url, ''), url));
}

console.log(`${passed + failed} checks, ${passed} passed, ${failed} failed (data URLs: ${urlish.length})`);
process.exit(failed === 0 ? 0 : 1);
