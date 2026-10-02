/**
 * js/utils/helpers.js: the pure helpers (no DOM). validateEmail and
 * isPlausiblePhone gate the contact form client-side.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = { location: { hostname: 'example.org', protocol: 'https:', search: '', href: 'https://example.org/' } };
const { validateEmail, isPlausiblePhone, deepClone, parseDate } = await import('../js/utils/helpers.js');

test('validateEmail', () => {
  for (const e of ['a@b.co', 'first.last+tag@example.org']) {
    assert.equal(validateEmail(e), true, e);
  }
  for (const e of ['', 'plain', 'a@b', '@b.co', 'a b@c.co', 'a@b .co', 'a@@b.co']) {
    assert.equal(validateEmail(e), false, e);
  }
});

test('isPlausiblePhone: US, international and extensions', () => {
  for (const p of ['210-555-0100', '(210) 555-0100', '210.555.0100', '2105550100', '555-0100',
    '+1 210 555 0123', '+44 20 7946 0958', '+49 (0)30 1234567', '+61 2/9876 5432',
    '210-555-0100 x2', '210-555-0123 ext. 4', '210 555 0123 extension 12', '210.555.0123 #3', '  210-555-0100  ']) {
    assert.equal(isPlausiblePhone(p), true, p);
  }
});

test('isPlausiblePhone: junk, too short, too long', () => {
  for (const p of ['', '   ', 'phone', 'abc', 'call me maybe', '12', '555-01', '+', '210-555-0100 ext', '210-555-0100 ext. 1234567',
    '1234567890123456', '210-555-0100; DROP', '++1 210 555 0100', '210-555-0100+', null, undefined, 2105550100]) {
    assert.equal(isPlausiblePhone(p), false, String(p));
  }
});

test('deepClone: copies nested data without sharing references', () => {
  const src = { a: [1, { b: 2 }], d: new Date('2026-10-02T00:00:00Z'), n: null };
  const copy = deepClone(src);
  assert.deepEqual(copy, src);
  assert.notEqual(copy.a, src.a);
  assert.notEqual(copy.a[1], src.a[1]);
  assert.notEqual(copy.d, src.d);
  assert.equal(copy.d.getTime(), src.d.getTime());
});

test('deepClone: does not copy inherited properties', () => {
  const proto = { polluted: true };
  const obj = Object.create(proto);
  obj.own = 1;
  const copy = deepClone(obj);
  assert.deepEqual(Object.keys(copy), ['own']);
  assert.equal(copy.polluted, undefined);
});

test('parseDate: invalid input returns the fallback', () => {
  const fallback = new Date(0);
  assert.equal(parseDate('not a date', fallback), fallback);
  assert.equal(parseDate('2026-10-02').toISOString().slice(0, 10), '2026-10-02');
});
