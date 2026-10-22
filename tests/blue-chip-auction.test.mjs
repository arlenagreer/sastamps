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

const ROOT = path.resolve(import.meta.dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const PAGE = 'blue-chip-auction.html';

// Every hrefs on the page, parsed per <a> tag rather than across attributes.
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

// The superseded rule, in any of the wordings the Q4 run produced.
const STALE = /(submitted|verified)[^.;]*\b(before|after) November 20\b/i;

test('no member-facing source still carries the November 20 verification rule', () => {
  for (const rel of ['index.html', 'meetings.html', PAGE, 'data/meetings/meetings.json',
    'data/calendar/2026-11-20-meeting.ics', 'data/calendar/2026-12-11-meeting.ics', 'public/sapa-q4-2026-meetings.ics']) {
    assert.doesNotMatch(read(rel), STALE, rel);
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
