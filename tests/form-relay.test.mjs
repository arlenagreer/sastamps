/**
 * sendToRelay (js/config/form-relay.js): the one routine the contact form and
 * the meeting RSVP use. A send is 'sent' only on the relay's own success,
 * 'unconfirmed' only when it went out and timed out, and 'failed' otherwise.
 */
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { sendToRelay, relayAjaxUrl, FORM_RELAY_URL } from '../js/config/form-relay.js';

const realFetch = globalThis.fetch;
const realNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
afterEach(() => {
  globalThis.fetch = realFetch;
  if (realNavigator) {
    Object.defineProperty(globalThis, 'navigator', realNavigator);
  }
});

const reply = (status, body) => ({ ok: status >= 200 && status < 300, status, text: async () => body });

test('posts a CORS simple request (Accept only, form-encoded) to the /ajax/ URL', async () => {
  let seen;
  globalThis.fetch = async (url, opts) => { seen = { url, opts }; return reply(200, '{"success":"true","message":"ok"}'); };
  const r = await sendToRelay({ name: 'A', _honey: '' });
  assert.equal(r.outcome, 'sent');
  assert.equal(seen.url, 'https://formsubmit.co/ajax/arlenagreer@gmail.com');
  assert.equal(seen.url, relayAjaxUrl(FORM_RELAY_URL));
  assert.equal(seen.opts.method, 'POST');
  assert.deepEqual(seen.opts.headers, { Accept: 'application/json' });
  assert.ok(seen.opts.body instanceof URLSearchParams);
  assert.equal(seen.opts.body.toString(), 'name=A&_honey=');
});

test('the "needs activation" reply is a failure, not a send', async () => {
  globalThis.fetch = async () => reply(200, '{"success":"false","message":"This form needs Activation."}');
  const r = await sendToRelay({});
  assert.equal(r.outcome, 'failed');
  assert.match(r.message, /Activation/);
});

test('offline is a definite failure and sends nothing', async () => {
  let called = false;
  globalThis.fetch = async () => { called = true; return reply(200, '{"success":"true"}'); };
  Object.defineProperty(globalThis, 'navigator', { value: { onLine: false }, configurable: true });
  const r = await sendToRelay({});
  assert.equal(r.outcome, 'failed');
  assert.equal(r.message, 'offline');
  assert.equal(called, false);
});

test('a TypeError from fetch (refused, blocked, network) is a failure', async () => {
  globalThis.fetch = async () => { throw new TypeError('Failed to fetch'); };
  assert.equal((await sendToRelay({})).outcome, 'failed');
});

test('an unreadable reply is a failure, not unconfirmed', async () => {
  globalThis.fetch = async () => reply(502, '<html>Bad gateway</html>');
  const r = await sendToRelay({});
  assert.equal(r.outcome, 'failed');
  assert.match(r.message, /502/);
});

test('a timeout before the answer is unconfirmed', async () => {
  globalThis.fetch = (_url, opts) => new Promise((_resolve, reject) => {
    opts.signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
  });
  const r = await sendToRelay({}, { timeoutMs: 30 });
  assert.equal(r.outcome, 'unconfirmed');
});

test('the timer also covers a stalled body: it ends as unconfirmed instead of hanging', async () => {
  globalThis.fetch = async (_url, opts) => ({
    ok: true,
    status: 200,
    text: () => new Promise((_resolve, reject) => {
      opts.signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
    })
  });
  const t0 = Date.now();
  const r = await sendToRelay({}, { timeoutMs: 40 });
  assert.equal(r.outcome, 'unconfirmed');
  assert.ok(Date.now() - t0 < 1000);
});
