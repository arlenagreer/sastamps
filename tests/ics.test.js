/**
 * scripts/lib/ics.js: the build adds meeting reminders (VALARM) to the
 * deployed .ics copies and must change nothing else, byte for byte.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const ics = require('../scripts/lib/ics');

const event = (extra = '', summary = 'SAPA Meeting - BOG and Show & Tell') => [
  'BEGIN:VEVENT',
  'UID:20261002T193000Z-sapa@sastamps.org',
  'DTSTART:20261003T003000Z',
  'DTEND:20261003T020000Z',
  `SUMMARY:${summary}`,
  ...(extra ? [extra] : []),
  'END:VEVENT'
];
const calendar = (lines, eol) => ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//test//EN', ...lines, 'END:VCALENDAR'].join(eol) + eol;

for (const [label, eol] of [['LF', '\n'], ['CRLF', '\r\n']]) {
  test(`adds both reminders before END:VEVENT and keeps ${label} line endings`, () => {
    const source = calendar(event('STATUS:CONFIRMED'), eol);
    const { text, added } = ics.addAlarms(source);
    assert.equal(added, 1);
    assert.equal(ics.stripAlarms(text), source, 'only VALARM lines were added');
    const lines = text.split(eol);
    assert.ok(lines.every((l) => !l.includes('\r') && !l.includes('\n')), 'no mixed line endings');
    const ev = ics.events(ics.parseICS(text))[0];
    const alarms = ev.children.filter((c) => c.name === 'VALARM');
    assert.deepEqual(alarms.map((a) => ics.prop(a, 'TRIGGER')), ['-P1D', '-PT2H']);
    assert.ok(alarms.every((a) => ics.prop(a, 'ACTION') === 'DISPLAY'));
    assert.equal(ics.prop(alarms[0], 'DESCRIPTION'), 'Tomorrow: SAPA Meeting - BOG and Show & Tell');
    assert.equal(lines[lines.indexOf('END:VEVENT') - 1], 'END:VALARM');
  });
}

test('leaves a cancelled event alone', () => {
  const source = calendar(event('STATUS:CANCELLED'), '\n');
  const { text, added } = ics.addAlarms(source);
  assert.equal(added, 0);
  assert.equal(text, source);
});

test('is idempotent: an event with a VALARM gets no more', () => {
  const once = ics.addAlarms(calendar(event('STATUS:CONFIRMED'), '\r\n')).text;
  const twice = ics.addAlarms(once);
  assert.equal(twice.added, 0);
  assert.equal(twice.text, once);
});

test('folds a long reminder line at 75 octets, and it unfolds to the summary', () => {
  const summary = `Stamp Program: ${'Expertising Philatelics — Jimmy Tomchesson '.repeat(3)}`.trim();
  const { text } = ics.addAlarms(calendar(event('', summary), '\r\n'));
  // The source's own lines are kept as they are; the added ones are folded.
  const added = text.slice(text.indexOf('BEGIN:VALARM')).split('\r\n');
  for (const line of added) {
    assert.ok(Buffer.byteLength(line, 'utf8') <= 75, `too long: ${line}`);
  }
  const alarm = ics.events(ics.parseICS(text))[0].children[0];
  assert.equal(ics.prop(alarm, 'DESCRIPTION'), `Tomorrow: ${summary}`);
});

test('keeps blank lines and trailing blanks exactly (real sources have both)', () => {
  const source = `BEGIN:VCALENDAR\nVERSION:2.0\n\n${event().join('\n')}\n\n${event().join('\n')}\nEND:VCALENDAR \n`;
  const { text, added } = ics.addAlarms(source);
  assert.equal(added, 2);
  assert.equal(ics.stripAlarms(text), source);
});

test('parseICS rejects broken calendars', () => {
  assert.throws(() => ics.parseICS(''), /empty/);
  assert.throws(() => ics.parseICS('BEGIN:VCALENDAR\nBEGIN:VEVENT\nEND:VCALENDAR\n'), /does not close/);
  assert.throws(() => ics.parseICS('BEGIN:VCALENDAR\nnot a line\nEND:VCALENDAR\n'), /not a content line/);
  assert.throws(() => ics.parseICS('BEGIN:VCALENDAR\nBEGIN:VEVENT\n'), /unclosed/);
  assert.throws(() => ics.parseICS('BEGIN:VEVENT\nEND:VEVENT\n'), /VCALENDAR/);
});

test('rawEvents returns each VEVENT block, LF-joined', () => {
  const blocks = ics.rawEvents(calendar([...event(), ...event()], '\r\n'));
  assert.equal(blocks.length, 2);
  assert.ok(blocks.every((b) => b.startsWith('BEGIN:VEVENT\n') && b.endsWith('END:VEVENT') && !b.includes('\r')));
});
