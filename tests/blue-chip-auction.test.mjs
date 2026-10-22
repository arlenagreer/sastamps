/**
 * The 2026 Blue-Chip Auction announcement (Jim Durham, 2026-10-22): lots are
 * due at the November 6 meeting, and lots submitted on or after November 7 are
 * accepted but may not be verified. The Q4 newsletter's earlier rule ("lots
 * submitted before November 20 are verified") must not survive anywhere a
 * member would read it, or the site would give two different deadlines.
 *
 * Remove this file with the announcement once the auction is over.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { deployableFiles, sitePages } = require('../scripts/lib/site');
const { SITE_PAGES } = require('../scripts/build-search-index');

const ROOT = path.resolve(import.meta.dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const PAGE = 'blue-chip-auction.html';

// Every href on the page, parsed per <a> tag rather than across attributes.
const hrefs = (html) => [...html.matchAll(/<a\b[^>]*>/gi)]
  .map((m) => /\bhref="([^"]*)"/i.exec(m[0])?.[1]).filter(Boolean);

test('the announcement page carries every rule in Jim\'s announcement', () => {
  const html = read(PAGE).replace(/\s+/g, ' ');
  for (const fact of ['December 11, 2026', 'November 6', 'November 7', 'November 20', 'December 4',
    'up to 15 lots', 'at least $20', 'Catalog number', 'Catalog value', 'Year of the catalog',
    'Opening bid', 'may be rejected', '&ldquo;as is.&rdquo;']) {
    assert.ok(html.includes(fact), `${PAGE} is missing "${fact}"`);
  }
});

test('the homepage links to the announcement above the fold, before the About section', () => {
  const html = read('index.html');
  const banner = html.indexOf('id="blue-chip-banner"');
  assert.ok(banner > 0, 'index.html has no #blue-chip-banner');
  assert.ok(banner < html.indexOf('Celebrating Our Philatelic Heritage'), 'the banner sits below the About section');
  assert.ok(hrefs(html.slice(banner, html.indexOf('</section>', banner))).includes(PAGE), 'the banner does not link to the page');
});

test('the Club News auction card links to the announcement', () => {
  const html = read('index.html');
  const card = html.indexOf('SAPA Annual Blue-Chip Auction</h3>');
  assert.ok(card > 0);
  assert.ok(hrefs(html.slice(card, html.indexOf('</div>', card))).includes(PAGE));
});

// The superseded rule: any statement tying lot submission, receipt or
// verification to November 20, however it is worded.
const STALE_EVENT = /Lot Viewing\s*(?:\/|&amp;|&|and)\s*(?:Lot )?Verification/i;
const STALE = /\b(submi\w*|receiv\w*|verif\w*|due)\b[^.;]*\b(before|after|by|until|through|on) Nov(?:ember|\.)? 20\b/i;

test('nothing deployed still carries the November 20 verification rule', () => {
  // Every page, data file and calendar the site serves, so a copy nobody
  // remembered (the search index reads newsletters.json) cannot hide.
  const deployable = deployableFiles(ROOT);
  const files = [...sitePages(ROOT, deployable),
    ...[...deployable].filter((f) => /^(data|public)\/.*\.(json|ics)$/.test(f))];
  assert.ok(files.length > 50, `only ${files.length} files scanned`);
  for (const rel of files) {
    const text = read(rel);
    assert.doesNotMatch(text, STALE, rel);
    // The schedule wordings that put verification on November 20 itself.
    assert.doesNotMatch(text, STALE_EVENT, rel);
  }
});

const navHrefs = (html) => hrefs(html.slice(html.indexOf('<ul class="nav-menu"'), html.indexOf('</ul>', html.indexOf('<ul class="nav-menu"'))));

test('the page tells newsletter readers that these dates replace the printed one', () => {
  assert.match(read(PAGE).replace(/\s+/g, ' '), /replace the November 20 date printed in the Fourth Quarter 2026 PHILATEX/);
});

test('the banner previews verified lots, and the newsletter page links the update', () => {
  const html = read('index.html');
  const at = html.indexOf('id="blue-chip-banner"');
  assert.ok(at > 0, 'index.html has no #blue-chip-banner');
  assert.match(html.slice(at, html.indexOf('</section>', at)), /verified lots/i);
  const issue = read('newsletter.html');
  const from = issue.indexOf('SAPA Annual Blue-Chip Auction, December 11');
  assert.ok(from > 0, 'newsletter.html no longer lists the auction');
  const tag = [...issue.slice(from, issue.indexOf('</li>', from)).matchAll(/<a\b[^>]*>/gi)]
    .map((m) => m[0]).find((t) => t.includes(`href="${PAGE}"`));
  assert.ok(tag, 'newsletter.html does not link the auction update');
  assert.match(/\bstyle="([^"]*)"/.exec(tag)?.[1] ?? '', /text-decoration:\s*underline/);
});

test('only verified lots are said to be on display', () => {
  const list = JSON.parse(read('data/meetings/meetings.json'));
  const meetings = Array.isArray(list) ? list : list.meetings;
  for (const id of ['2026-11-20', '2026-12-04']) {
    const m = meetings.find((x) => x.id === id);
    for (const line of [...m.agenda.map((a) => a.item), ...(m.specialNotes ?? [])]) {
      if (/lots?\b.*\bon display/i.test(line)) assert.match(line, /verified/i, `${id}: ${line}`);
    }
  }
});

test('the page has the same main navigation as the homepage', () => {
  assert.deepEqual(navHrefs(read(PAGE)), navHrefs(read('index.html')));
});

test('site search indexes the announcement page', () => {
  assert.ok(SITE_PAGES.some((p) => p.file === PAGE && p.keywords.includes('auction')));
});

test('the highlights link is underlined, not told apart by color alone', () => {
  const html = read('index.html');
  const start = html.indexOf('Latest Issue Highlights');
  const tag = [...html.slice(start, html.indexOf('</ul>', start)).matchAll(/<a\b[^>]*>/gi)]
    .map((m) => m[0]).find((t) => t.includes(`href="${PAGE}"`));
  assert.ok(tag, 'no link to the page in the highlights');
  assert.match(/\bstyle="([^"]*)"/.exec(tag)?.[1] ?? '', /text-decoration:\s*underline/);
});

// Calendar apps match an imported event by UID; SEQUENCE and LAST-MODIFIED
// tell them the event changed (RFC 5545 3.8.7.4).
test('every changed calendar event is marked as revised', () => {
  const block = (text, uid) => {
    const i = text.indexOf(`UID:${uid}`);
    return text.slice(text.lastIndexOf('BEGIN:VEVENT', i), text.indexOf('END:VEVENT', i));
  };
  for (const day of ['2026-11-06', '2026-11-20', '2026-12-11']) {
    const ymd = day.replaceAll('-', '');
    for (const [rel, uid] of [[`data/calendar/${day}-meeting.ics`, `${ymd}T193000Z-sapa@sastamps.org`],
      ['public/sapa-q4-2026-meetings.ics', `sapa-${day}@sastamps.org`]]) {
      const ev = block(read(rel), uid);
      assert.match(ev, /^SEQUENCE:1\r?$/m, `${rel} ${day}`);
      assert.match(ev, /^LAST-MODIFIED:20261022T\d{6}Z\r?$/m, `${rel} ${day}`);
    }
  }
});

test('the meeting data says lots are due November 6, and only viewed on November 20', () => {
  const meetings = JSON.parse(read('data/meetings/meetings.json'));
  const list = Array.isArray(meetings) ? meetings : meetings.meetings;
  const byId = Object.fromEntries(list.map((m) => [m.id, m]));
  const text = (m) => JSON.stringify(m);
  assert.match(text(byId['2026-11-06']), /Blue-Chip Auction lots due/);
  assert.doesNotMatch(byId['2026-11-20'].title, /Verification/);
  assert.match(text(byId['2026-12-11']), /November 7/);
});
