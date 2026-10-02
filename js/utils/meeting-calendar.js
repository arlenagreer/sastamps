/**
 * Small, dependency-free helpers for meeting records (data/meetings/meetings.json),
 * shared by the meetings page, the meeting dialog, the calendar adapter and
 * MeetingLoader so each rule lives in one place.
 */

import { parseLocalDate } from './dates.js';

// The club meets in San Antonio: "today", "past" and "next" follow its day,
// not the viewer's, so a Friday meeting is still upcoming for a visitor in
// Berlin at 02:30 on Saturday (19:30 Friday in San Antonio).
export const CLUB_TIME_ZONE = 'America/Chicago';

let clubDayFormat = null;

/**
 * Today's date in the club's time zone, as 'YYYY-MM-DD'.
 * @param {Date} [now]
 * @returns {string}
 */
export function clubToday(now = new Date()) {
  try {
    if (!clubDayFormat) {
      clubDayFormat = new Intl.DateTimeFormat('en-CA', {
        timeZone: CLUB_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit'
      });
    }
    // en-CA formats as YYYY-MM-DD; build it from parts so it never depends on that
    const parts = Object.fromEntries(clubDayFormat.formatToParts(now).map(p => [p.type, p.value]));
    return `${parts.year}-${parts.month}-${parts.day}`;
  } catch {
    // No time-zone data: fall back to the viewer's own day
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${now.getFullYear()}-${m}-${d}`;
  }
}

/**
 * Whether a meeting dated 'YYYY-MM-DD' is still upcoming: it stays upcoming
 * through the whole of its own date in Central time.
 * @param {string} date
 * @param {Date} [now]
 * @returns {boolean}
 */
export function isClubUpcoming(date, now = new Date()) {
  return typeof date === 'string' && date >= clubToday(now);
}

/**
 * The deployed single-meeting .ics for a meeting, or '' when there is none.
 *
 * Newsletter runs write one file per meeting to data/calendar/ named
 * YYYY-MM-DD-meeting.ics, or YYYY-MM-DD-picnic.ics for the picnic
 * (.claude/skills/philatex-update/references/data-contract.md section C).
 * A cancelled meeting gets no link: there is nothing to attend. An explicit
 * `calendarLink` in the data wins over the naming convention.
 * @param {Object} meeting - meetings.json entry
 * @returns {string} Page-relative URL, or ''
 */
export function meetingCalendarUrl(meeting) {
  if (!meeting || meeting.cancelled) {
    return '';
  }
  if (typeof meeting.calendarLink === 'string' && meeting.calendarLink) {
    return meeting.calendarLink;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(meeting.date || '')) {
    return '';
  }
  const kind = meeting.type === 'picnic' ? 'picnic' : 'meeting';
  return `data/calendar/${meeting.date}-${kind}.ics`;
}

/**
 * A time value that is really there ("N/A" is how cancelled entries say none).
 * @param {string} value
 * @returns {boolean}
 */
export function hasTime(value) {
  return typeof value === 'string' && value.trim() !== '' && value.trim().toUpperCase() !== 'N/A';
}

/**
 * 'YYYY-MM-DD' -> "Friday, October 2, 2026"
 * @param {string} date
 * @returns {string}
 */
export function formatLongDate(date) {
  return parseLocalDate(date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}
