/**
 * Date parsing for the site's data files.
 *
 * The JSON data stores calendar dates as 'YYYY-MM-DD'. `new Date('2026-10-01')`
 * parses that as UTC midnight, which in US time zones is the previous evening:
 * it renders as "September 30, 2026", and '2026-01-01' reports year 2025.
 * parseLocalDate() reads a date-only string as local midnight instead, the same
 * convention as the meetings code's `${date}T00:00:00`.
 */

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * @param {string|Date} value - 'YYYY-MM-DD', any other Date-parsable string, or a Date
 * @returns {Date} Local-midnight Date for date-only strings; otherwise new Date(value)
 *   (an Invalid Date when the input is missing or unparsable)
 */
export function parseLocalDate(value) {
  if (value instanceof Date) {
    return value;
  }
  const match = typeof value === 'string' ? DATE_ONLY.exec(value.trim()) : null;
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }
  return new Date(value);
}

/**
 * Whether an event dated 'YYYY-MM-DD' is still upcoming at `now`.
 * Event dates are calendar days, so a meeting stays upcoming for the whole
 * of its own local day and becomes past only once that day has ended.
 * (new Date('YYYY-MM-DD') is UTC midnight, which in US time zones made a
 * meeting count as past from the previous evening.)
 * @param {string} date - Event date, 'YYYY-MM-DD'
 * @param {Date} now - Current time
 * @returns {boolean}
 */
export function isUpcomingDate(date, now = new Date()) {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return parseLocalDate(date) >= startOfToday;
}
