/**
 * build-calendar: meeting reminders and the subscribe feed, written into
 * _site/ by `npm run build` after the site is assembled.
 *
 * 1. Every deployed .ics event that is not cancelled gets two reminders
 *    (VALARM: the day before, and two hours before). Only the _site/ copies
 *    change: the sources are the /philatex-update skill's output, checked by
 *    its check-ics.mjs, and are never edited here.
 * 2. _site/calendar/sapa-meetings.ics is one calendar a visitor can subscribe
 *    to (webcal://, Google Calendar, Outlook): every meeting from 60 days ago
 *    onward, taken from the deployed single-meeting files with the same UIDs,
 *    so a subscribed calendar updates its events instead of duplicating them.
 *
 * scripts/check-site-build.js checks both against the sources.
 */
const fs = require('fs');
const path = require('path');
const { addAlarms, foldLine, parseICS, rawEvents } = require('./lib/ics');

const FEED_REL = 'calendar/sapa-meetings.ics';
const FEED_NAME = 'San Antonio Philatelic Association meetings';
const FEED_DAYS_BACK = 60;
// One file per meeting (data-contract.md section C): YYYY-MM-DD-meeting.ics, or -picnic.ics.
const MEETING_FILE = /^(\d{4}-\d{2}-\d{2})-(meeting|picnic)\.ics$/;
const MEETING_DIR = 'data/calendar';

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) {
    return out;
  }
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      walk(p, out);
    } else {
      out.push(p);
    }
  }
  return out;
}

/** 'YYYY-MM-DD' in San Antonio (the club's day), FEED_DAYS_BACK days before `now`. */
function feedStartDate(now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(now).map((p) => [p.type, p.value]));
  const start = new Date(Date.UTC(+parts.year, +parts.month - 1, +parts.day - FEED_DAYS_BACK));
  return start.toISOString().slice(0, 10);
}

/** The single-meeting files in a site (or repo) root that belong in the feed, sorted. */
function feedSourceFiles(root, now = new Date()) {
  const dir = path.join(root, MEETING_DIR);
  if (!fs.existsSync(dir)) {
    return [];
  }
  const start = feedStartDate(now);
  return fs.readdirSync(dir)
    .filter((name) => {
      const m = MEETING_FILE.exec(name);
      return m && m[1] >= start;
    })
    .sort()
    .map((name) => path.join(dir, name));
}

/** Add reminders to every .ics in _site/ (not the feed). Returns counts. */
function addSiteAlarms(site) {
  let files = 0;
  let events = 0;
  for (const file of walk(site).filter((f) => f.endsWith('.ics'))) {
    const rel = path.relative(site, file).split(path.sep).join('/');
    if (rel === FEED_REL) {
      continue;
    }
    const before = fs.readFileSync(file, 'utf8');
    let result;
    try {
      result = addAlarms(before);
    } catch (error) {
      throw new Error(`${rel}: ${error.message}`);
    }
    if (result.added > 0) {
      fs.writeFileSync(file, result.text);
      files++;
      events += result.added;
    }
  }
  return { files, events };
}

/** Build the subscribe feed text from the (already alarmed) files in _site/. */
function feedText(site, now = new Date()) {
  const CRLF = '\r\n';
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//San Antonio Philatelic Association//SAPA Meetings Feed//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `NAME:${FEED_NAME}`,
    `X-WR-CALNAME:${FEED_NAME}`,
    'X-WR-CALDESC:Meetings of the San Antonio Philatelic Association (sastamps.org)',
    'X-WR-TIMEZONE:America/Chicago',
    'REFRESH-INTERVAL;VALUE=DURATION:P1D',
    'X-PUBLISHED-TTL:P1D'
  ];
  for (const file of feedSourceFiles(site, now)) {
    for (const block of rawEvents(fs.readFileSync(file, 'utf8'))) {
      // Unfold, then fold again with CRLF: the feed is ours, so it follows
      // RFC 5545 exactly (the source files use LF and do not fold).
      lines.push(...block.replace(/\n[ \t]/g, '').split('\n'));
    }
  }
  lines.push('END:VCALENDAR');
  return lines.map((l) => foldLine(l, CRLF)).join(CRLF) + CRLF;
}

function buildCalendars(site, now = new Date()) {
  const alarms = addSiteAlarms(site);
  const text = feedText(site, now);
  parseICS(text); // never deploy a feed that does not parse
  const out = path.join(site, FEED_REL);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, text);
  const count = (text.match(/^BEGIN:VEVENT\r$/gm) || []).length;
  return { ...alarms, feed: FEED_REL, feedEvents: count, feedStart: feedStartDate(now) };
}

module.exports = { FEED_REL, FEED_NAME, FEED_DAYS_BACK, MEETING_DIR, feedStartDate, feedSourceFiles, feedText, addSiteAlarms, buildCalendars };
