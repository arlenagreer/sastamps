/**
 * What archive.html lists, as plain data (no DOM), so it can be unit tested.
 *
 * Two eras, both rendered from JSON by js/pages/archive.js:
 * - current issues: every entry in data/newsletters/newsletters.json (2025 on),
 *   shown as cards, newest first. The /philatex-update run only edits that
 *   JSON, never archive.html, so a new issue appears here on its own;
 * - the archive: data/newsletters/archived-newsletters.json (2008-2024),
 *   shown as compact year lists in chronological order.
 * In both, an issue with no entry at all is listed as unavailable, so a gap
 * reads "Not Available" instead of silently missing.
 */

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

const QUARTER_NUMBERS = { First: 1, Second: 2, Third: 3, Fourth: 4 };
const QUARTER_WORDS = ['First', 'Second', 'Third', 'Fourth'];

/**
 * The months an edition covers: Q1-Q4 (quarterly), 01-06 (bimonthly).
 * @param {string} edition
 * @returns {{series: 'quarterly'|'bimonthly', start: number, end: number}|null} months 1-12
 */
export function editionSlot(edition) {
  const q = /^Q([1-4])$/.exec(edition);
  if (q) {
    const start = (Number(q[1]) - 1) * 3 + 1;
    return { series: 'quarterly', start, end: start + 2 };
  }
  const b = /^0([1-6])$/.exec(edition);
  if (b) {
    const start = (Number(b[1]) - 1) * 2 + 1;
    return { series: 'bimonthly', start, end: start + 1 };
  }
  return null; // special editions (2020's Covid-19 issue) cover no fixed months
}

const SERIES_EDITIONS = {
  quarterly: ['Q1', 'Q2', 'Q3', 'Q4'],
  bimonthly: ['01', '02', '03', '04', '05', '06']
};

/** Archive-style labels, as archived-newsletters.json writes them. */
export function archiveEditionLabel(edition) {
  const slot = editionSlot(edition);
  if (!slot) {
    return edition;
  }
  if (slot.series === 'quarterly') {
    const months = MONTHS.slice(slot.start - 1, slot.end).join(', ');
    return `${QUARTER_WORDS[(slot.start - 1) / 3]} Quarter: ${months}`;
  }
  return `${MONTHS[slot.start - 1]}/${MONTHS[slot.end - 1]}`;
}

/** Current-era labels, as the issue cards show them ("Fourth Quarter 2026"). */
export function currentEditionLabel(edition, year) {
  const slot = editionSlot(edition);
  if (!slot) {
    return `${edition} ${year}`;
  }
  if (slot.series === 'quarterly') {
    return `${QUARTER_WORDS[(slot.start - 1) / 3]} Quarter ${year}`;
  }
  return `${MONTHS[slot.start - 1]}/${MONTHS[slot.end - 1]} ${year}`;
}

/**
 * One year's issues, in chronological order, with every issue the year
 * should have up to its latest listed one. A missing issue is added as
 * { status: 'unavailable', filePath: null, missing: true }. Gaps are filled
 * from the series (quarterly or bimonthly) of the issue that follows them,
 * so a year that changes series part-way is filled correctly.
 * @param {Array<{edition: string, year: number}>} yearEntries - chronological
 * @param {(edition: string, year: number) => string} [labelFor]
 * @returns {Array<object>}
 */
export function withMissingIssues(yearEntries, labelFor = archiveEditionLabel) {
  if (yearEntries.length === 0) {
    return [];
  }
  const [{ year }] = yearEntries;
  const result = [];
  let coveredUntil = 0; // last month covered by an issue placed so far
  for (const entry of yearEntries) {
    const slot = editionSlot(entry.edition);
    if (slot) {
      for (const edition of SERIES_EDITIONS[slot.series]) {
        const gap = editionSlot(edition);
        if (gap.start > coveredUntil && gap.end < slot.start) {
          result.push({ year, edition, editionLabel: labelFor(edition, year), filePath: null, status: 'unavailable', missing: true });
        }
      }
      coveredUntil = Math.max(coveredUntil, slot.end);
    }
    result.push(entry);
  }
  return result;
}

/**
 * A newsletters.json entry as a listing entry. Quarterly issues carry
 * `quarter`; bimonthly ones (from 2027) carry `months`.
 */
export function currentIssueEntry(n) {
  let edition = null;
  if (QUARTER_NUMBERS[n.quarter]) {
    edition = `Q${QUARTER_NUMBERS[n.quarter]}`;
  } else if (Array.isArray(n.months) && n.months.length) {
    const first = MONTHS.indexOf(n.months[0]) + 1;
    if (first > 0 && first % 2 === 1) {
      edition = `0${(first + 1) / 2}`;
    }
  }
  return {
    ...n,
    edition: edition || n.id,
    editionLabel: edition ? currentEditionLabel(edition, n.year) : n.title,
    status: n.filePath ? 'available' : 'unavailable'
  };
}

function groupByYear(entries) {
  const years = new Map();
  for (const e of entries) {
    if (!years.has(e.year)) {
      years.set(e.year, []);
    }
    years.get(e.year).push(e);
  }
  return years;
}

function chronological(a, b) {
  const sa = editionSlot(a.edition);
  const sb = editionSlot(b.edition);
  return (sa ? sa.start : 0) - (sb ? sb.start : 0);
}

/**
 * The current-era cards: years newest first, issues newest first, gaps
 * filled with unavailable placeholders.
 * @param {Array<object>} newsletters - newsletters.json `newsletters`
 * @returns {Array<{year: number, issues: Array<object>}>}
 */
export function currentIssueYears(newsletters) {
  const years = groupByYear((newsletters || []).map(currentIssueEntry));
  return [...years.keys()].sort((a, b) => b - a).map(year => ({
    year,
    issues: withMissingIssues(years.get(year).slice().sort(chronological), currentEditionLabel).reverse()
  }));
}

/**
 * The 2008-2024 archive lists: years newest first, issues in the JSON's
 * chronological order, gaps filled.
 * @param {Array<object>} archived - archived-newsletters.json `archivedNewsletters`
 * @returns {Array<{year: number, issues: Array<object>}>}
 */
export function archiveYears(archived) {
  const years = groupByYear(archived || []);
  return [...years.keys()].sort((a, b) => b - a).map(year => ({
    year,
    issues: withMissingIssues(years.get(year))
  }));
}
