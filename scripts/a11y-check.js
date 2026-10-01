#!/usr/bin/env node
/**
 * a11y-check: run pa11y 10 (axe runner) against every deployed root page in
 * the built _site/, served on a free local port.
 *
 * Replaces `pa11y-ci`, which was never a devDependency, so `test:a11y` had
 * never run. pa11y-ci 4.x would also pull pa11y 9 back in (and with it a
 * known-vulnerable extract-zip), so this drives pa11y directly.
 *
 * Reads .pa11yrc.json `defaults` (runners, standard, timeout, wait, ignore,
 * chromeLaunchConfig). Needs a built _site/ (`npm run build`) and puppeteer's
 * Chrome (installed by `npm ci` unless PUPPETEER_SKIP_DOWNLOAD is set).
 *
 * Exit: 0 no errors; 1 accessibility errors found; 2 could not run
 * (no _site/, no Chrome).
 *
 * Usage: node scripts/a11y-check.js [page.html ...]
 */
const fs = require('fs');
const path = require('path');
const pa11y = require('pa11y');
const puppeteer = require('puppeteer');
const { sitePages, deployableFiles } = require('./lib/site');
const { serve, chromeArgs } = require('./lib/serve');

const REPO = path.resolve(__dirname, '..');
const SITE = path.join(REPO, '_site');
const CONFIG = JSON.parse(fs.readFileSync(path.join(REPO, '.pa11yrc.json'), 'utf8')).defaults || {};

async function main() {
  if (!fs.existsSync(SITE)) {
    console.error('a11y-check: _site/ is missing; run npm run build first.');
    return 2;
  }
  const all = sitePages(REPO, deployableFiles(REPO)).filter((p) => fs.existsSync(path.join(SITE, p)));
  const pages = process.argv.length > 2 ? process.argv.slice(2) : all;

  let browser;
  try {
    browser = await puppeteer.launch({ headless: true, args: chromeArgs(), ...(CONFIG.chromeLaunchConfig || {}) });
  } catch (err) {
    console.error(`a11y-check: could not launch headless Chrome (${err.message.split('\n')[0]}).`);
    console.error('a11y-check: run `npx puppeteer browsers install chrome` (or npm ci without PUPPETEER_SKIP_DOWNLOAD).');
    return 2;
  }
  const { server, base } = await serve(SITE);
  const ignore = CONFIG.ignore || [];
  console.log(`a11y-check: pa11y ${require('pa11y/package.json').version}, runners ${(CONFIG.runners || ['htmlcs']).join('+')}, ${CONFIG.standard || 'WCAG2AA'}, ignoring: ${ignore.join(', ') || 'nothing'}`);

  let errors = 0;
  let broken = 0;
  try {
    for (const page of pages) {
      try {
        const result = await pa11y(base + page, {
          browser,
          runners: CONFIG.runners,
          standard: CONFIG.standard,
          timeout: CONFIG.timeout,
          wait: CONFIG.wait,
          ignore
        });
        const issues = result.issues.filter((i) => i.type === 'error');
        errors += issues.length;
        console.log(`  ${issues.length ? 'FAIL' : 'ok  '} ${page}: ${issues.length} error(s)`);
        const byCode = {};
        for (const i of issues) {(byCode[i.code] ||= []).push(i);}
        for (const [code, list] of Object.entries(byCode)) {
          // axe "incomplete" results (it could not decide) are reported as
          // errors too (pa11y's levelCapWhenNeedsReview default); label them.
          const review = list[0].runnerExtras && list[0].runnerExtras.needsFurtherReview ? ' [axe: needs review]' : '';
          console.log(`         ${code} x${list.length}${review}: ${list[0].message.split('\n')[0]}`);
          for (const i of list.slice(0, 3)) {console.log(`           ${i.selector}`);}
        }
      } catch (err) {
        broken++;
        console.log(`  FAIL ${page}: pa11y could not test it (${err.message.split('\n')[0]})`);
      }
    }
  } finally {
    await browser.close();
    server.close();
  }
  console.log(`a11y-check: ${pages.length} pages, ${errors} accessibility error(s), ${broken} page(s) not testable`);
  return errors || broken ? 1 : 0;
}

main().then((code) => process.exit(code), (err) => {
  console.error(err);
  process.exit(2);
});
