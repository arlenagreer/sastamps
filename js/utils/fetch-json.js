/**
 * Fetch a site JSON data file once per page load.
 *
 * Page bundles used to `import()` data/*.json. esbuild builds them as IIFE
 * without code splitting (the pages load them as classic scripts), so every
 * such import was inlined: meetings.json alone was ~72 KB of each of
 * home.min.js and meetings.min.js, and the meetings page then fetched the
 * same file again through calendarAdapter. Fetching at runtime keeps the data
 * out of the bundles, downloads it only when a feature actually needs it, and
 * shares the HTTP cache with the other fetch() callers.
 *
 * The promise is memoised per URL, matching import() semantics (one load per
 * page); a failed load is not cached, so a later call can retry.
 */

const cache = new Map();

/**
 * @param {string} url - Page-relative URL, e.g. 'data/meetings/meetings.json'
 * @returns {Promise<any>} Parsed JSON
 */
export function fetchJSON(url) {
  if (!cache.has(url)) {
    const request = fetch(url).then(response => {
      if (!response.ok) {
        throw new Error(`Failed to load ${url}: ${response.status}`);
      }
      return response.json();
    });
    request.catch(() => cache.delete(url));
    cache.set(url, request);
  }
  return cache.get(url);
}
