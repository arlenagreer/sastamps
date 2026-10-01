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
 * Exit: 0 pass; 1 fail; 2 could not run (no _site/, no Chrome).
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
    console.error('test-search-page: _site/search.html is missing; run npm run build first.');
    return 2;
  }
  let browser;
  try {
    browser = await puppeteer.launch({ headless: true, args: chromeArgs() });
  } catch (err) {
    console.error(`test-search-page: could not launch headless Chrome (${err.message.split('\n')[0]}).`);
    return 2;
  }
  const { server, base } = await serve(SITE);
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
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
      if (/^https:\/\/unpkg\.com\/lunr@[^/]+\/lunr\.min\.js$/.test(url)) {
        req.respond({ status: 200, contentType: 'text/javascript', body: LUNR });
      } else if (url.startsWith(base)) {
        req.continue();
      } else {
        req.respond({ status: 204, body: '' }); // fonts, icons: not under test
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
    console.log(`test-search-page: index ready in ${readyMs} ms, ${failures} failure(s)`);
  } finally {
    await browser.close();
    server.close();
  }
  return failures ? 1 : 0;
}

main().then((code) => process.exit(code), (err) => {
  console.error(err);
  process.exit(2);
});
