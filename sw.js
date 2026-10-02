/*
 * Kill switch for the retired SAPA service worker. It must stay deployed at /sw.js.
 *
 * From 2025-09-27 to 2025-11-18 the site deployed a cache-first worker,
 * registered at /sw.js with the cache 'sapa-cache-v1'. A browser that installed
 * it kept serving the pages it had cached: a year later the home page still
 * read "Fourth Quarter 2025". When /sw.js answers 404, the browser keeps the old
 * worker, so taking the file down did not remove it.
 *
 * Browsers re-check /sw.js on every navigation. This replacement installs
 * at once and then:
 *   1. deletes the retired worker's caches (every name starting 'sapa-'),
 *   2. unregisters itself, and
 *   3. if it removed a cache, re-navigates the tabs the old worker controlled
 *      (the ones showing stale pages) so each loads a fresh page.
 * It has no fetch handler, so it never answers a request itself. Re-navigation
 * only happens when a stale cache existed, so it cannot cause a reload loop.
 *
 * Do not delete this file while any browser could still hold the old worker.
 * scripts/check-site-build.js asserts that the deployed copy is this one.
 */

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    let removed = 0;
    try {
      const keys = (await caches.keys()).filter((key) => key.startsWith('sapa-'));
      const results = await Promise.all(keys.map((key) => caches.delete(key)));
      removed = results.filter(Boolean).length;
    } catch (_error) {
      // Nothing to clean up, or the cache API is unavailable here.
    }

    await self.registration.unregister();

    if (removed > 0) {
      // Controlled tabs only: these were being served from the stale cache.
      const windows = await self.clients.matchAll({ type: 'window' });
      await Promise.all(windows.map((client) => client.navigate(client.url).catch(() => null)));
    }
  })());
});
