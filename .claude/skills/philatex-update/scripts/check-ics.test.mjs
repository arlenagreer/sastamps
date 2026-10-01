// check-ics.test.mjs — tests for check-ics.mjs edition parsing (quarterly YYYY-QN and bimonthly YYYY-MM).
//
// Run: node --test .claude/skills/philatex-update/scripts/check-ics.test.mjs   (from the repo root)
//
// 1. The real 2026-Q3 / 2026-Q4 data must still pass with unchanged counts (quarterly behaviour is unchanged).
// 2. A synthetic bimonthly edition (2027-01 = January/February 2027, all CST) is built in a scratch dir:
//    correct → exit 0; a CDT offset on a CST date → exit 1; missing aggregate → exit 1.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const script = path.join(here, 'check-ics.mjs');
const repoRoot = path.resolve(here, '../../../..');

const run = (edition, root) => spawnSync(process.execPath, [script, '--edition', edition, '--root', root], { encoding: 'utf8' });

for (const edition of ['2026-Q3', '2026-Q4']) {
  test(`quarterly ${edition} still passes with unchanged counts`, () => {
    const r = run(edition, repoRoot);
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.match(r.stdout, new RegExp(`check-ics ${edition}: 13 meetings, 26 checks passed, 0 failures`));
  });
}

test('malformed editions are rejected with exit 2', () => {
  for (const bad of ['2027-13', '2027-00', '2027-1', '2026-Q5']) assert.equal(run(bad, repoRoot).status, 2, bad);
});

// ── Synthetic bimonthly fixture: 2027-01 (Jan/Feb 2027) ──
const meeting = (date, type, extra = {}) => ({
  id: date, date, type, title: `${type} ${date}`,
  time: { doorsOpen: '6:30 PM', meetingStart: '7:30 PM', meetingEnd: '9:00 PM' }, ...extra,
});
const NA = { doorsOpen: 'N/A', meetingStart: 'N/A', meetingEnd: 'N/A' };
const meetings = [
  meeting('2026-12-18', 'social'), // before the edition: must be ignored
  meeting('2027-01-01', 'holiday', { cancelled: true, time: NA }),
  meeting('2027-01-08', 'business'),
  meeting('2027-02-26', 'auction'),
  meeting('2027-03-05', 'business'), // after the edition (March belongs to 2027-03): must be ignored
];
const ymd = (d) => d.replaceAll('-', '');
const next = (d) => { const t = new Date(`${d}T00:00:00Z`); t.setUTCDate(t.getUTCDate() + 1); return t.toISOString().slice(0, 10).replaceAll('-', ''); };

function individual(mt) {
  const cancelled = mt.type === 'holiday';
  // CST (UTC-6): 7:30 PM → 01:30Z next day, 9:00 PM → 03:00Z next day.
  const [start, end] = cancelled ? [`${ymd(mt.date)}T183000Z`, `${ymd(mt.date)}T183100Z`] : [`${next(mt.date)}T013000Z`, `${next(mt.date)}T030000Z`];
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//San Antonio Philatelic Association//SAPA Meetings//EN', 'BEGIN:VEVENT',
    `UID:${ymd(mt.date)}T193000Z-sapa@sastamps.org`, 'DTSTAMP:20270101T000000Z', `DTSTART:${start}`, `DTEND:${end}`,
    `LOCATION:${cancelled ? 'Meeting Cancelled' : 'MacArthur Park Lutheran Church'}`, `STATUS:${cancelled ? 'CANCELLED' : 'CONFIRMED'}`,
    'END:VEVENT', 'END:VCALENDAR', ''].join('\n');
}
function aggregate(list) {
  const ev = list.map((mt) => {
    const cancelled = mt.type === 'holiday';
    const [s, e] = cancelled ? ['183000', '183100'] : ['183000', '210000'];
    return ['BEGIN:VEVENT', `DTSTART:${ymd(mt.date)}T${s}`, `DTEND:${ymd(mt.date)}T${e}`, 'DTSTAMP:20270101T000000Z',
      `UID:sapa-${mt.date}@sastamps.org`, `STATUS:${cancelled ? 'CANCELLED' : 'CONFIRMED'}`, 'END:VEVENT'].join('\n');
  });
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//San Antonio Philatelic Association//SAPA Meeting Calendar//EN', '', ...ev, 'END:VCALENDAR', ''].join('\n');
}

function buildFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'check-ics-bimonthly-'));
  fs.mkdirSync(path.join(root, 'data/meetings'), { recursive: true });
  fs.mkdirSync(path.join(root, 'data/calendar'), { recursive: true });
  fs.mkdirSync(path.join(root, 'public'), { recursive: true });
  fs.writeFileSync(path.join(root, 'data/meetings/meetings.json'), JSON.stringify({ meetings }, null, 2));
  const inEdition = meetings.filter((mt) => mt.date >= '2027-01-01' && mt.date < '2027-03-01');
  for (const mt of inEdition) fs.writeFileSync(path.join(root, `data/calendar/${mt.date}-meeting.ics`), individual(mt));
  fs.writeFileSync(path.join(root, 'public/sapa-2027-01-meetings.ics'), aggregate(inEdition));
  return root;
}

test('bimonthly 2027-01: correct fixture passes', () => {
  const root = buildFixture();
  const r = run('2027-01', root);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /check-ics 2027-01: 3 meetings, 6 checks passed, 0 failures/);
  fs.rmSync(root, { recursive: true, force: true });
});

test('bimonthly 2027-01: a CDT offset on a CST date fails', () => {
  const root = buildFixture();
  const f = path.join(root, 'data/calendar/2027-01-08-meeting.ics');
  fs.writeFileSync(f, fs.readFileSync(f, 'utf8').replace('DTSTART:20270109T013000Z', 'DTSTART:20270109T003000Z'));
  const r = run('2027-01', root);
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stdout, /FAIL data\/calendar\/2027-01-08-meeting\.ics: DTSTART is 20270109T003000Z, expected 20270109T013000Z/);
  fs.rmSync(root, { recursive: true, force: true });
});

test('bimonthly 2027-01: missing aggregate fails', () => {
  const root = buildFixture();
  fs.rmSync(path.join(root, 'public/sapa-2027-01-meetings.ics'));
  const r = run('2027-01', root);
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stdout, /FAIL public\/sapa-2027-01-meetings\.ics: missing/);
  fs.rmSync(root, { recursive: true, force: true });
});
