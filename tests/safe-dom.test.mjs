/**
 * js/utils/safe-dom.js: escapeHTML is the chokepoint every data-driven
 * render goes through (template-engine, search-engine), and the
 * safeLocalStorage* helpers must survive blocked storage, where even reading
 * localStorage throws.
 *
 * Only what runs without a browser DOM is tested here. The module imports
 * logger.js -> config/index.js, which reads window.location at load, so a
 * stub window is installed first.
 *
 * escapeHTML's string branch and safeUrl need PR #168 (DOM-free escapeHTML,
 * new safeUrl). Until it merges those tests skip themselves, then run.
 */
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = { location: { hostname: 'example.org', protocol: 'https:', search: '', href: 'https://example.org/' } };
const dom = await import('../js/utils/safe-dom.js');

// Does escapeHTML run without a DOM yet? (Before #168 it calls document.createElement.)
let domFree = true;
try {
  dom.escapeHTML('<');
} catch {
  domFree = false;
}
const NEEDS_168 = 'escapeHTML needs a DOM until PR #168 merges';

test('escapeHTML: anything that is not a string becomes the empty string', () => {
  for (const v of [undefined, null, 42, 0, true, {}, ['<b>'], { toString: () => '<script>' }]) {
    assert.equal(dom.escapeHTML(v), '', String(v));
  }
});

test('escapeHTML: escapes the five HTML-significant characters', { skip: !domFree && NEEDS_168 }, () => {
  assert.equal(dom.escapeHTML('<script>alert(1)</script>'), '&lt;script&gt;alert(1)&lt;/script&gt;');
  assert.equal(dom.escapeHTML('" onmouseover="x'), '&quot; onmouseover=&quot;x');
  assert.equal(dom.escapeHTML("'a'"), '&#39;a&#39;');
  assert.equal(dom.escapeHTML('Tom & Jerry'), 'Tom &amp; Jerry');
  assert.equal(dom.escapeHTML('&amp;'), '&amp;amp;', 'no double-escaping guard: text is text');
});

test('escapeHTML: leaves ordinary text alone', { skip: !domFree && NEEDS_168 }, () => {
  for (const s of ['', 'Stamp Bourse', 'Doors open 6:30 PM; meeting 7:30 PM.', 'Café — 50¢ stamps', '1/2 price, 100% (approx.)']) {
    assert.equal(dom.escapeHTML(s), s);
  }
});

test('safeUrl: keeps relative and http(s)/mailto/tel links', { skip: typeof dom.safeUrl !== 'function' && 'safeUrl arrives with PR #168' }, () => {
  for (const u of ['public/x.pdf', './a.html', '../b.html', '/c.html', '#top', '?q=1', '//www.sastamps.org/',
    'https://www.sastamps.org/', 'http://example.org/', 'mailto:someone@example.org', 'tel:+12105550100']) {
    assert.equal(dom.safeUrl(u), u, u);
  }
});

test('safeUrl: refuses script and data schemes, however disguised', { skip: typeof dom.safeUrl !== 'function' && 'safeUrl arrives with PR #168' }, () => {
  for (const u of ['javascript:alert(1)', 'JaVaScRiPt:alert(1)', ' javascript:x', 'java\tscript:x', '\u0001javascript:x',
    'data:text/html,<script>x</script>', 'vbscript:x', 'file:///etc/passwd', '', null, 42]) {
    assert.equal(dom.safeUrl(u), '#', JSON.stringify(u));
  }
  assert.equal(dom.safeUrl('javascript:x', ''), '', 'custom fallback');
});

// A localStorage stand-in whose methods can be made to throw.
let store;
beforeEach(() => {
  store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  };
});

test('safeLocalStorage: round-trips JSON values', () => {
  assert.equal(dom.safeLocalStorageSet('bookmarks', ['a', 'b']), true);
  assert.deepEqual(dom.safeLocalStorageGet('bookmarks'), ['a', 'b']);
  assert.equal(dom.safeLocalStorageRemove('bookmarks'), true);
  assert.equal(dom.safeLocalStorageGet('bookmarks', 'none'), 'none');
});

test('safeLocalStorageGet: a corrupt value falls back to the default', () => {
  store.set('k', '{not json');
  assert.equal(dom.safeLocalStorageGet('k', 'fallback'), 'fallback');
});

test('safeLocalStorage: blocked storage never throws', () => {
  const blocked = () => {
    throw new DOMException('The operation is insecure.', 'SecurityError');
  };
  globalThis.localStorage = { getItem: blocked, setItem: blocked, removeItem: blocked };
  assert.equal(dom.safeLocalStorageGet('k', 'd'), 'd');
  assert.equal(dom.safeLocalStorageSet('k', 1), false);
  assert.equal(dom.safeLocalStorageRemove('k'), false);
});

test('safeLocalStorage: reading localStorage itself throws (site data blocked)', () => {
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    get() {
      throw new DOMException('Access is denied for this document.', 'SecurityError');
    },
  });
  try {
    assert.equal(dom.safeLocalStorageGet('k', 'd'), 'd');
    assert.equal(dom.safeLocalStorageSet('k', 1), false);
    assert.equal(dom.safeLocalStorageRemove('k'), false);
  } finally {
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, writable: true, value: undefined });
  }
});
