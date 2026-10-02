/**
 * js/utils/safe-dom.js, the parts tests/xss-security-test.js does not cover:
 * escapeHTML leaving ordinary text untouched, and the safeLocalStorage*
 * helpers surviving blocked storage, where even reading localStorage throws.
 * (escapeHTML's escaping and safeUrl's contract are in xss-security-test.js;
 * both files run under npm run test:unit.)
 *
 * The module imports logger.js -> config/index.js, which reads
 * window.location at load, so a stub window is installed first.
 */
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = { location: { hostname: 'example.org', protocol: 'https:', search: '', href: 'https://example.org/' } };
const dom = await import('../js/utils/safe-dom.js');

test('escapeHTML: leaves ordinary text alone', () => {
  for (const s of ['', 'Stamp Bourse', 'Doors open 6:30 PM; meeting 7:30 PM.', 'Café — 50¢ stamps', '1/2 price, 100% (approx.)']) {
    assert.equal(dom.escapeHTML(s), s);
  }
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
