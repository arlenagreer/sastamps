#!/usr/bin/env node
// check-ics.mjs — green-bar gate G5 for /philatex-update.
//
// Recomputes every .ics time for an edition from data/meetings/meetings.json and the
// America/Chicago time-zone rules, then compares against the generated files. It
// exists because the DST offset is the error agents repeat: copying a CDT template
// into a CST date (Q1/Q4) shifts the meeting by an hour, and a fixer regenerating
// sibling files can re-introduce it after it was fixed.
//
// Usage: node check-ics.mjs --edition 2026-Q4|2027-01 [--root <repo>] [--json]
//   YYYY-QN = quarterly issue: three months, aggregate public/sapa-qN-YYYY-meetings.ics.
//   YYYY-MM = bimonthly issue: two months starting at MM, aggregate public/sapa-YYYY-MM-meetings.ics.
// Exit:  0 = every check passed, 1 = at least one failure, 2 = bad invocation.
// Conventions checked are data-contract.md §C. Two cancellation shapes exist:
//   type "holiday" (cancelled at publication) → fixed 18:30→18:31 placeholder, LOCATION "Meeting Cancelled";
//   any other type with cancelled:true (cancelled after publication, e.g. 2026-04-24)
//     → STATUS:CANCELLED on the meeting's real times; DTSTAMP may be the later change date.

import fs from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const opt = (name) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : undefined; };
const edition = opt('--edition');
const root = path.resolve(opt('--root') ?? process.cwd());
const asJson = argv.includes('--json');

const m = /^(\d{4})-(?:Q([1-4])|(0[1-9]|1[0-2]))$/.exec(edition ?? '');
if (!m) { console.error('usage: check-ics.mjs --edition YYYY-QN|YYYY-MM [--root <repo>] [--json]'); process.exit(2); }
const year = Number(m[1]);
const q = m[2] ? Number(m[2]) : null; // null = bimonthly edition
const firstMonth = q ? (q - 1) * 3 + 1 : Number(m[3]);
const span = q ? 3 : 2; // months covered by the edition
const pad = (n) => String(n).padStart(2, '0');
// The edition's first day (DTSTAMP). Named for the quarterly case; also the bimonthly start.
const quarterStart = `${year}${pad(firstMonth)}01`;
// Is (y, mo) inside the edition? Month-index arithmetic, so a span may cross a year end.
const startIdx = year * 12 + firstMonth - 1;
const inEdition = (y, mo) => { const i = y * 12 + mo - 1; return i >= startIdx && i < startIdx + span; };

const meetingsPath = path.join(root, 'data/meetings/meetings.json');
const meetings = JSON.parse(fs.readFileSync(meetingsPath, 'utf8')).meetings
  .filter((x) => { const [y, mo] = x.date.split('-').map(Number); return inEdition(y, mo); })
  .sort((a, b) => a.date.localeCompare(b.date));

const failures = [];
const passes = [];
const fail = (where, msg) => failures.push(`${where}: ${msg}`);

if (meetings.length === 0) fail(edition, `no meetings for this edition in ${meetingsPath}`);

// "7:30 PM" → [19, 30]
function parseClock(s) {
  const t = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(String(s).trim());
  if (!t) return null;
  let h = Number(t[1]) % 12;
  if (t[3].toUpperCase() === 'PM') h += 12;
  return [h, Number(t[2])];
}

// America/Chicago local wall time → UTC "YYYYMMDDTHHMMSSZ", using the platform tz database.
const fmt = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', hourCycle: 'h23',
  year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
function chicagoToUtc(date, [h, mi]) {
  const [y, mo, d] = date.split('-').map(Number);
  const wanted = Date.UTC(y, mo - 1, d, h, mi);
  let guess = wanted + 6 * 3600e3;
  for (let i = 0; i < 3; i++) {
    const p = Object.fromEntries(fmt.formatToParts(new Date(guess)).map((x) => [x.type, x.value]));
    const shown = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute);
    guess += wanted - shown;
  }
  const u = new Date(guess);
  return `${u.getUTCFullYear()}${pad(u.getUTCMonth() + 1)}${pad(u.getUTCDate())}T${pad(u.getUTCHours())}${pad(u.getUTCMinutes())}00Z`;
}
const local = (date, [h, mi]) => `${date.replaceAll('-', '')}T${pad(h)}${pad(mi)}00`;

function props(block) {
  const out = {};
  for (const line of block.split(/\r?\n/)) { const i = line.indexOf(':'); if (i > 0) out[line.slice(0, i)] = line.slice(i + 1); }
  return out;
}
function expectEq(where, key, got, want) {
  if (got !== want) fail(where, `${key} is ${got ?? '(missing)'}, expected ${want}`);
}

// ── Individual files: data/calendar/YYYY-MM-DD-{meeting|picnic}.ics (UTC) ──
for (const mt of meetings) {
  const ymd = mt.date.replaceAll('-', '');
  const file = `data/calendar/${mt.date}-${mt.type === 'picnic' ? 'picnic' : 'meeting'}.ics`;
  const full = path.join(root, file);
  if (!fs.existsSync(full)) { fail(file, 'missing'); continue; }
  const raw = fs.readFileSync(full, 'utf8');
  const before = failures.length;
  if (raw.includes('\r')) fail(file, 'CRLF line endings; existing files use LF');
  const p = props(raw);
  expectEq(file, 'PRODID', p.PRODID, '-//San Antonio Philatelic Association//SAPA Meetings//EN');
  expectEq(file, 'UID', p.UID, `${ymd}T193000Z-sapa@sastamps.org`);
  const lateCancel = mt.cancelled && mt.type !== 'holiday';
  if (lateCancel) {
    if (!(p.DTSTAMP >= `${quarterStart}T000000Z`)) fail(file, `DTSTAMP ${p.DTSTAMP} predates the quarter (${quarterStart})`);
  } else expectEq(file, 'DTSTAMP', p.DTSTAMP, `${quarterStart}T000000Z`);
  if (mt.cancelled && !lateCancel) {
    expectEq(file, 'STATUS', p.STATUS, 'CANCELLED');
    expectEq(file, 'LOCATION', p.LOCATION, 'Meeting Cancelled');
    expectEq(file, 'DTSTART', p.DTSTART, `${ymd}T183000Z`);
    expectEq(file, 'DTEND', p.DTEND, `${ymd}T183100Z`);
  } else {
    // An event with no confirmed end omits meetingEnd; its .ics must then omit DTEND (RFC 5545).
    const hasEnd = mt.time?.meetingEnd !== undefined;
    const start = parseClock(mt.time?.meetingStart);
    const end = hasEnd ? parseClock(mt.time.meetingEnd) : null;
    if (!start || (hasEnd && !end)) { fail(file, `unparseable meetingStart/meetingEnd in meetings.json (${mt.time?.meetingStart} / ${mt.time?.meetingEnd})`); continue; }
    expectEq(file, 'STATUS', p.STATUS, lateCancel ? 'CANCELLED' : 'CONFIRMED');
    expectEq(file, 'DTSTART', p.DTSTART, chicagoToUtc(mt.date, start));
    if (hasEnd) expectEq(file, 'DTEND', p.DTEND, chicagoToUtc(mt.date, end));
    else if (p.DTEND !== undefined || p.DURATION !== undefined) fail(file, `has DTEND/DURATION but meetings.json has no meetingEnd (start-only event)`);
  }
  if (failures.length === before) passes.push(file);
}

// ── Stray individual files: a dated .ics in this edition with no matching meeting ──
const expected = new Set(meetings.map((mt) => `${mt.date}-${mt.type === 'picnic' ? 'picnic' : 'meeting'}.ics`));
const calDir = path.join(root, 'data/calendar');
for (const f of fs.existsSync(calDir) ? fs.readdirSync(calDir) : []) {
  const d = /^(\d{4})-(\d{2})-\d{2}-.*\.ics$/.exec(f);
  if (d && inEdition(+d[1], +d[2]) && !expected.has(f)) fail(`data/calendar/${f}`, 'stray file: no matching meeting in meetings.json (wrong name, or a meeting that no longer exists)');
}

// ── Edition aggregate: public/sapa-qN-YYYY-meetings.ics or public/sapa-YYYY-MM-meetings.ics (local/floating) ──
const qfile = q ? `public/sapa-q${q}-${year}-meetings.ics` : `public/sapa-${year}-${pad(firstMonth)}-meetings.ics`;
const qfull = path.join(root, qfile);
if (!fs.existsSync(qfull)) fail(qfile, 'missing');
else {
  const raw = fs.readFileSync(qfull, 'utf8');
  if (raw.includes('\r')) fail(qfile, 'CRLF line endings; existing files use LF');
  expectEq(qfile, 'PRODID', props(raw.split('BEGIN:VEVENT')[0]).PRODID, '-//San Antonio Philatelic Association//SAPA Meeting Calendar//EN');
  const events = raw.split('BEGIN:VEVENT').slice(1).map(props);
  const byUid = new Map(events.map((e) => [e.UID, e]));
  if (events.length !== meetings.length) fail(qfile, `${events.length} VEVENTs, expected ${meetings.length} (one per meeting)`);
  for (const mt of meetings) {
    const where = `${qfile} ${mt.date}`;
    const e = byUid.get(`sapa-${mt.date}@sastamps.org`);
    if (!e) { fail(where, `no VEVENT with UID sapa-${mt.date}@sastamps.org`); continue; }
    const before = failures.length;
    const lateCancel = mt.cancelled && mt.type !== 'holiday';
    if (lateCancel) { if (!(e.DTSTAMP >= `${quarterStart}T000000Z`)) fail(where, `DTSTAMP ${e.DTSTAMP} predates the quarter`); }
    else expectEq(where, 'DTSTAMP', e.DTSTAMP, `${quarterStart}T000000Z`);
    if (mt.cancelled && !lateCancel) {
      expectEq(where, 'STATUS', e.STATUS, 'CANCELLED');
      expectEq(where, 'DTSTART', e.DTSTART, local(mt.date, [18, 30]));
      expectEq(where, 'DTEND', e.DTEND, local(mt.date, [18, 31]));
    } else {
      const anchor = parseClock(mt.type === 'picnic' ? mt.time?.meetingStart : mt.time?.doorsOpen);
      const hasEnd = mt.time?.meetingEnd !== undefined;
      const end = hasEnd ? parseClock(mt.time.meetingEnd) : null;
      if (!anchor || (hasEnd && !end)) { fail(where, 'unparseable times in meetings.json'); continue; }
      expectEq(where, 'STATUS', e.STATUS, lateCancel ? 'CANCELLED' : 'CONFIRMED');
      expectEq(where, 'DTSTART', e.DTSTART, local(mt.date, anchor));
      if (hasEnd) expectEq(where, 'DTEND', e.DTEND, local(mt.date, end));
      else if (e.DTEND !== undefined || e.DURATION !== undefined) fail(where, 'has DTEND/DURATION but meetings.json has no meetingEnd (start-only event)');
    }
    if (failures.length === before) passes.push(where);
  }
}

if (asJson) console.log(JSON.stringify({ edition, meetings: meetings.length, passed: passes.length, failures }, null, 2));
else {
  for (const f of failures) console.log(`FAIL ${f}`);
  console.log(`check-ics ${edition}: ${meetings.length} meetings, ${passes.length} checks passed, ${failures.length} failures`);
}
process.exit(failures.length ? 1 : 0);
