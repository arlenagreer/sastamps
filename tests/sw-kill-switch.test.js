/**
 * sw.js is the kill switch for the retired 2025 caching worker. It runs here
 * in a vm with a fake service-worker global, so its behaviour is pinned down
 * without a browser. The end-to-end proof (an old worker really replaced in
 * Chromium) is the browser simulation described in the PR.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SOURCE = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');

function load({ cacheKeys = [], windows = [] } = {}) {
  const listeners = {};
  const calls = { skipWaiting: 0, unregister: 0, deleted: [], navigated: [] };
  const store = new Set(cacheKeys);
  const self = {
    addEventListener: (type, fn) => { listeners[type] = fn; },
    skipWaiting: () => { calls.skipWaiting++; return Promise.resolve(); },
    registration: { unregister: async () => { calls.unregister++; return true; } },
    clients: {
      matchAll: async (opts) => { calls.matchAll = opts; return windows.map((url) => ({ url, navigate: async (u) => { calls.navigated.push(u); } })); }
    }
  };
  const caches = {
    keys: async () => [...store],
    delete: async (k) => { calls.deleted.push(k); return store.delete(k); }
  };
  vm.runInNewContext(SOURCE, { self, caches, Promise });
  const fire = async (type) => {
    let waited = Promise.resolve();
    listeners[type]({ waitUntil: (p) => { waited = p; } });
    await waited;
  };
  return { listeners, calls, store, fire };
}

test('sw.js installs at once and has no fetch handler', async () => {
  const sw = load();
  assert.ok(sw.listeners.install && sw.listeners.activate);
  assert.equal(sw.listeners.fetch, undefined, 'a fetch handler could serve stale responses');
  await sw.fire('install');
  assert.equal(sw.calls.skipWaiting, 1);
});

test('sw.js deletes the stale caches, unregisters and re-navigates open tabs', async () => {
  const sw = load({ cacheKeys: ['sapa-cache-v1', 'sapa-cache-v0'], windows: ['https://www.sastamps.org/index.html', 'https://www.sastamps.org/meetings.html'] });
  await sw.fire('activate');
  assert.deepEqual(sw.calls.deleted.sort(), ['sapa-cache-v0', 'sapa-cache-v1']);
  assert.equal(sw.store.size, 0);
  assert.equal(sw.calls.unregister, 1);
  assert.deepEqual(sw.calls.navigated, ['https://www.sastamps.org/index.html', 'https://www.sastamps.org/meetings.html']);
});

test('sw.js does not reload tabs when there was no stale cache (no reload loop)', async () => {
  const sw = load({ cacheKeys: [], windows: ['https://www.sastamps.org/'] });
  await sw.fire('activate');
  assert.equal(sw.calls.unregister, 1);
  assert.deepEqual(sw.calls.navigated, []);
});
