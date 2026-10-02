/**
 * js/utils/archive-listing.js: what archive.html lists. Every issue in
 * newsletters.json must appear (the page is never hand-edited: the
 * /philatex-update run only writes the JSON), and a missing issue must show
 * as "Not Available" rather than vanish.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const {
  withMissingIssues, currentIssueYears, archiveYears, currentIssueEntry, archiveEditionLabel, editionSlot
} = await import('../js/utils/archive-listing.js');

const read = (rel) => JSON.parse(fs.readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8'));
const editions = (issues) => issues.map(i => `${i.edition}${i.missing ? '(missing)' : ''}`);

test('the current-era listing covers every newsletters.json issue, newest year first', () => {
  const { newsletters } = read('data/newsletters/newsletters.json');
  const years = currentIssueYears(newsletters);
  const listed = years.flatMap(y => y.issues).filter(i => !i.missing).map(i => i.filePath);
  for (const n of newsletters) {
    assert.ok(listed.includes(n.filePath), `${n.id} is listed`);
  }
  assert.deepEqual(years.map(y => y.year), [...years.map(y => y.year)].sort((a, b) => b - a));
  const newest = newsletters.slice().sort((a, b) => b.publishDate.localeCompare(a.publishDate))[0];
  assert.equal(years[0].issues[0].filePath, newest.filePath, 'the newest issue is the first card');
});

test('current era: a missing quarter shows as unavailable (2025 Q1)', () => {
  const years = currentIssueYears([
    { id: '2025-Q2', year: 2025, quarter: 'Second', filePath: 'public/a.pdf', publishDate: '2025-04-01' },
    { id: '2025-Q4', year: 2025, quarter: 'Fourth', filePath: 'public/c.pdf', publishDate: '2025-10-01' },
    { id: '2025-Q3', year: 2025, quarter: 'Third', filePath: 'public/b.pdf', publishDate: '2025-07-01' }
  ]);
  assert.deepEqual(editions(years[0].issues), ['Q4', 'Q3', 'Q2', 'Q1(missing)']);
  assert.equal(years[0].issues[3].editionLabel, 'First Quarter 2025');
  assert.equal(years[0].issues[3].status, 'unavailable');
});

test('current era: bimonthly issues from 2027 (months, not quarter)', () => {
  const entry = currentIssueEntry({ id: '2027-03', year: 2027, months: ['March', 'April'], filePath: 'public/x.pdf' });
  assert.equal(entry.edition, '02');
  assert.equal(entry.editionLabel, 'March/April 2027');
  const years = currentIssueYears([
    { id: '2027-03', year: 2027, months: ['March', 'April'], filePath: 'public/x.pdf' }
  ]);
  assert.deepEqual(editions(years[0].issues), ['02', '01(missing)']);
  assert.equal(years[0].issues[1].editionLabel, 'January/February 2027');
});

test('withMissingIssues: fills gaps before the latest listed issue only', () => {
  const y = (editionList, year = 2008) => editionList.map(edition => ({ year, edition, editionLabel: edition, status: 'available', filePath: 'p.pdf' }));
  assert.deepEqual(editions(withMissingIssues(y(['02', '03', '04', '05', '06']))), ['01(missing)', '02', '03', '04', '05', '06']);
  assert.deepEqual(editions(withMissingIssues(y(['01', '02']))), ['01', '02'], 'no trailing placeholders');
  assert.deepEqual(editions(withMissingIssues(y(['Q2', 'Q3', 'Q4'], 2024))), ['Q1(missing)', 'Q2', 'Q3', 'Q4']);
  assert.equal(withMissingIssues(y(['Q2'], 2024))[0].editionLabel, 'First Quarter: January, February, March');
  assert.deepEqual(withMissingIssues([]), []);
});

test('withMissingIssues: a special edition keeps its place and fills nothing', () => {
  const entries = ['01', '02', 'special-covid', '03'].map(edition => ({ year: 2020, edition, editionLabel: edition }));
  assert.deepEqual(editions(withMissingIssues(entries)), ['01', '02', 'special-covid', '03']);
});

test('withMissingIssues: a year that changes from quarterly to bimonthly', () => {
  // Q1 (Jan-Mar), then bimonthly May/Jun and Nov/Dec: the gap months are
  // filled from the bimonthly series that follows them (Sep/Oct, and
  // Jul/Aug); nothing is invented for April, which no series slot fits.
  const entries = ['Q1', '03', '06'].map(edition => ({ year: 2027, edition, editionLabel: edition }));
  assert.deepEqual(editions(withMissingIssues(entries)), ['Q1', '03', '04(missing)', '05(missing)', '06']);
  const backwards = ['01', '02', 'Q3', 'Q4'].map(edition => ({ year: 2027, edition, editionLabel: edition }));
  assert.deepEqual(editions(withMissingIssues(backwards)), ['01', '02', 'Q3', 'Q4'], 'Mar/Apr ends where Q2 would start, so no Q2 is invented');
});

test('archiveYears: the real archive shows its known gaps as unavailable', () => {
  const years = archiveYears(read('data/newsletters/archived-newsletters.json').archivedNewsletters);
  const year = (n) => years.find(y => y.year === n).issues;
  assert.equal(year(2008)[0].edition, '01');
  assert.equal(year(2008)[0].status, 'unavailable');
  assert.equal(year(2024)[0].edition, 'Q1');
  assert.equal(year(2024)[0].status, 'unavailable');
  assert.ok(year(2012).some(i => i.edition === '04' && i.status === 'unavailable'));
  assert.deepEqual(years.map(y => y.year), [...years.map(y => y.year)].sort((a, b) => b - a));
});

test('editionSlot and labels', () => {
  assert.deepEqual(editionSlot('Q4'), { series: 'quarterly', start: 10, end: 12 });
  assert.deepEqual(editionSlot('06'), { series: 'bimonthly', start: 11, end: 12 });
  assert.equal(editionSlot('special-covid'), null);
  assert.equal(archiveEditionLabel('05'), 'September/October');
});
