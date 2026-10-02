/**
 * js/utils/markdown.js: the small renderer for resource guides.
 * Structure (headings, lists, emphasis, paragraphs), escaping of all data,
 * and link targets: escaped exactly once, unsafe schemes rejected.
 *
 * safe-dom.js imports logger.js -> config/index.js, which reads
 * window.location at load, so a stub window is installed first.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = { location: { hostname: 'example.org', protocol: 'https:', search: '', href: 'https://example.org/' } };
const { renderMarkdown, renderInline } = await import('../js/utils/markdown.js');

const hrefs = (html) => [...html.matchAll(/href="([^"]*)"/g)].map(m => m[1]);

test('headings, lists, emphasis and paragraphs; title heading dropped', () => {
  const html = renderMarkdown('# Guide\n\nIntro *here*.\n\n## Part\n\n### Sub\n\n1. **One** - first\n2. Two\n\n- a\n- b\n\n**Mint** - unused\n**Used** - cancelled', 'Guide');
  assert.ok(!html.includes('Guide</h'), 'title heading dropped');
  assert.match(html, /<p>Intro <em>here<\/em>\.<\/p>/);
  assert.match(html, /<h3>Part<\/h3>/);
  assert.match(html, /<h4>Sub<\/h4>/);
  assert.match(html, /<ol><li><strong>One<\/strong> - first<\/li><li>Two<\/li><\/ol>/);
  assert.match(html, /<ul><li>a<\/li><li>b<\/li><\/ul>/);
  assert.match(html, /<p><strong>Mint<\/strong> - unused<br><strong>Used<\/strong> - cancelled<\/p>/);
  assert.ok(!/(^|>)\s*#|\*\*|<li>- /.test(html), 'no stray markers');
});

test('every resources.json guide renders without stray Markdown', async () => {
  const fs = await import('node:fs');
  const data = JSON.parse(fs.readFileSync(new URL('../data/members/resources.json', import.meta.url), 'utf8'));
  for (const r of data.resources) {
    const text = renderMarkdown(r.content, r.title).replace(/<[^>]+>/g, '\n');
    assert.ok(!/(^|\n)\s*#/.test(text), `${r.id}: stray #`);
    assert.ok(!/\*\*/.test(text), `${r.id}: stray **`);
    assert.ok(!/(^|\n)- /.test(text), `${r.id}: stray "- "`);
  }
});

test('data is escaped, never interpreted as HTML', () => {
  const html = renderMarkdown('<script>alert(1)</script> & "quotes" <img src=x onerror=alert(1)>');
  assert.ok(!/<script|<img/i.test(html));
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /&amp; &quot;quotes&quot;/);
});

test('link URL is escaped exactly once (no double escaping)', () => {
  const html = renderInline('[Search](https://example.com/?a=1&b=2&c="x")');
  assert.deepEqual(hrefs(html), ['https://example.com/?a=1&amp;b=2&amp;c=&quot;x&quot;']);
  assert.match(html, /target="_blank" rel="noopener">Search<\/a>/);
  // Label keeps its own escaping and emphasis
  assert.match(renderInline('[**A & B**](https://e.org)'), /<a href="https:\/\/e\.org"[^>]*><strong>A &amp; B<\/strong><\/a>/);
});

test('unsafe link schemes are rejected (javascript:, entity-split, tab-split)', () => {
  const cases = [
    '[x](javascript:alert(1))',
    '[x](JaVaScRiPt:alert(1))',
    '[x](data:text/html;base64,PHNjcmlwdD4=)',
    '[x](vbscript:msgbox(1))',
    '[x](jav&#x09;ascript:alert(1))',
    '[x](java&#9;script:alert(1))',
    '[x](java\tscript:alert(1))',
  ];
  for (const md of cases) {
    const html = renderInline(md);
    for (const h of hrefs(html)) {
      // Decode the attribute the way a browser would, then strip tab/LF/CR as the URL parser does.
      const decoded = h.replace(/&#x([0-9a-f]+);?/gi, (m, n) => String.fromCodePoint(parseInt(n, 16)))
        .replace(/&#(\d+);?/g, (m, n) => String.fromCodePoint(Number(n)))
        .replace(/&quot;/g, '"').replace(/&#39;/g, '\'').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
        .replace(/[\t\n\r]/g, '');
      assert.ok(!/^\s*(javascript|data|vbscript):/i.test(decoded), `${JSON.stringify(md)} produced executable href ${h}`);
      // An entity-split target stays literal text in a relative path (its & is escaped once).
      if (/&#/.test(md)) {assert.ok(h.includes('&amp;#'), `${md}: entity not neutralised: ${h}`);}
    }
    if (/^\[x\]\((javascript|JaVaScRiPt|data|vbscript):/.test(md)) {
      assert.deepEqual(hrefs(html), [], `${md}: should render as plain text`);
    }
  }
});

test('data cannot forge a link placeholder', () => {
  const html = renderInline('0 [a](https://a.org)');
  assert.equal(hrefs(html).length, 1);
});
