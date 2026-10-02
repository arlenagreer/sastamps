#!/usr/bin/env node
/**
 * test-search-page: the built search page loads its index and finds results,
 * in headless Chrome, against _site/ exactly as it deploys.
 *
 * Until 2026-10 the build inlined the whole lunr index (~345 KB) into
 * _site/search.html. The page now always fetches dist/data/search-index.json
 * and search-documents.json, so this checks that path end to end: both files
 * are requested, a search for "stamp" reports results, and the page logs no
 * console error.
 *
 * lunr itself comes from unpkg on the live page; here that request is answered
 * from node_modules/lunr, so the check needs no network.
 *
 * Exit: 0 pass; 1 fail (anything wrong with the built site or the page,
 * including a missing _site/search.html, a missing element or a timeout);
 * 2 only when the harness itself could not start (Chrome would not launch,
 * or the local server would not listen), which bin/ci reports as NOT
 * VERIFIED rather than FAILED.
 * Usage: node scripts/test-search-page.js [query]
 */
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const { serve, chromeArgs } = require('./lib/serve');

const REPO = path.resolve(__dirname, '..');
const SITE = path.join(REPO, '_site');
const QUERY = process.argv[2] || 'stamp';
const LUNR = fs.readFileSync(require.resolve('lunr/lunr.min.js'), 'utf8');

let failures = 0;
function check(cond, message) {
  console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${message}`);
  if (!cond) {
    failures++;
  }
}

async function main() {
  if (!fs.existsSync(path.join(SITE, 'search.html'))) {
    console.error('test-search-page: FAIL _site/search.html is missing (the build did not produce it; run npm run build).');
    return 1;
  }
  let browser;
  try {
    browser = await puppeteer.launch({ headless: true, args: chromeArgs() });
  } catch (err) {
    console.error(`test-search-page: could not launch headless Chrome (${err.message.split('\n')[0]}).`);
    return 2;
  }
  let server;
  let base;
  try {
    ({ server, base } = await serve(SITE));
  } catch (err) {
    console.error(`test-search-page: could not start the local server (${err.message}).`);
    await browser.close();
    return 2;
  }
  try {
    await testPage(browser, base);
  } catch (err) {
    // Anything the page does wrong (an element that is not there, a wait
    // that times out) is a failure of the site, not of the harness.
    check(false, `the page test stopped: ${err.message.split('\n')[0]}`);
  } finally {
    await browser.close();
    server.close();
  }
  console.log(`test-search-page: ${failures} failure(s)`);
  return failures ? 1 : 0;
}

async function testPage(browser, base) {
  const page = await browser.newPage();
  const LUNR_URL = /^https:\/\/unpkg\.com\/lunr@[^/]+\/lunr\.min\.js$/;
  // Other third-party requests (icon font, web fonts) are not under test:
  // they are blocked, and the console errors that causes are not counted.
  const notUnderTest = (url) => Boolean(url) && !url.startsWith(base) && !LUNR_URL.test(url);
  const errors = [];
  const blocked = new Set();
  page.on('console', (msg) => {
    const where = msg.location() && msg.location().url;
    if (msg.type() === 'error' && !notUnderTest(where) && ![...blocked].some((u) => msg.text().includes(u))
      && !/net::ERR_BLOCKED_BY_CLIENT/.test(msg.text())) {
      errors.push(msg.text());
    }
  });
  page.on('pageerror', (err) => errors.push(err.message));
  const statuses = {};
  page.on('response', (res) => {
    statuses[new URL(res.url()).pathname] = res.status();
  });
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const url = req.url();
    if (LUNR_URL.test(url)) {
      // The page loads lunr with integrity= and crossorigin=, so the
      // response must be CORS-readable and byte-identical to unpkg's
      // (node_modules/lunr 2.3.9 is: same sha384).
      req.respond({ status: 200, contentType: 'text/javascript', headers: { 'Access-Control-Allow-Origin': '*' }, body: LUNR });
    } else if (url.startsWith(base) || url.startsWith('data:')) {
      req.continue();
    } else {
      blocked.add(url);
      req.abort('blockedbyclient');
    }
  });

  const started = Date.now();
  await page.goto(`${base}search.html`, { waitUntil: 'load' });
  // Ready when the "Loading search index..." status is hidden (or errored).
  await page.waitForFunction(() => {
    const s = document.getElementById('searchStatus');
    return s && (s.style.display === 'none' || s.classList.contains('error'));
  }, { timeout: 20000 });
  const readyMs = Date.now() - started;

  const html = await page.content();
  check(!/window\.SEARCH_INDEX_DATA\s*=/.test(html), 'the page carries no embedded index');
  for (const name of ['search-index.json', 'search-documents.json']) {
    const got = statuses[`/dist/data/${name}`];
    check(got === 200, `it fetched dist/data/${name} (HTTP ${got ?? 'never requested'})`);
  }
  const initStatus = await page.$eval('#searchStatus', (el) => el.classList.contains('error') ? el.textContent.trim() : '');
  check(!initStatus, `the index loaded${initStatus ? `: "${initStatus}"` : ''}`);

  await page.type('#searchInput', QUERY);
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => /result/i.test(document.getElementById('searchStatus').textContent), { timeout: 10000 })
    .catch(() => {}); // a page that never answers fails the check below
  const status = await page.$eval('#searchStatus', (el) => el.textContent.trim());
  const shown = await page.$$eval('#searchResults > *', (els) => els.length);
  check(/^Found \d+ results? for/.test(status) && shown > 0, `search "${QUERY}": ${status} (${shown} shown)`);
  check(errors.length === 0, `no console errors${errors.length ? `: ${errors.slice(0, 3).join(' | ')}` : ''}`);
  console.log(`  index ready in ${readyMs} ms`);
}

main().then((code) => process.exit(code), (err) => {
  console.error(err);
  process.exit(1);
});
