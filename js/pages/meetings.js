/**
 * Meetings Page Bundle
 * Only includes functionality needed for the meetings page
 */

import { debounce } from '../utils/performance.js';
import { safeQuerySelector, escapeHTML, safeUrl } from '../utils/safe-dom.js';
import { parseLocalDate } from '../utils/dates.js';
import { fetchJSON } from '../utils/fetch-json.js';
import { addEventListenerWithCleanup } from '../utils/event-cleanup.js';
import { createLogger } from '../utils/logger.js';
import { announceStatus, countSummary } from '../utils/announce.js';
import {
  TIMING,
  CALENDAR,
  FILTER_OPTIONS
} from '../constants/index.js';
import MeetingLoader, { meetingsInQuarter, selectScheduleQuarter } from '../modules/meeting-loader.js';
import { meetingCalendarUrl, hasTime, formatLongDate, isClubUpcoming } from '../utils/meeting-calendar.js';
import { openRsvpDialog, renderRsvpButton, rsvpButtonHTML } from '../modules/rsvp-dialog.js';

const logger = createLogger('MeetingsPage');

// Export MeetingLoader for global access via SAPA_MEETINGS
export { MeetingLoader };

// Visible and announced text for the two ways the page can fail. Each sits
// next to a "Try again" button, so each says that is what to do.
const LOAD_FAILED_TEXT = 'The meeting schedule could not be loaded. Check your connection, then select Try again.';
const CALENDAR_FAILED_TEXT = 'The calendar view could not be shown. Select Try again, or use the meeting list above.';

// The live vanilla-calendar-pro instance, and which sections rendered.
// A retry rebuilds only the sections that failed.
let calendarInstance = null;
let calendarReady = false;
let listReady = false;

// One load at a time per section. A load in flight is shared, not repeated,
// and each load carries a token: a load that a newer one has superseded
// leaves the page alone, so a late failure cannot overwrite a newer success.
const sectionLoads = { calendar: null, list: null };
const sectionTokens = { calendar: 0, list: 0 };

function loadSection(name) {
  if (!sectionLoads[name]) {
    const token = ++sectionTokens[name];
    const run = name === 'calendar'
      ? initializeMeetingsCalendar(token)
      : loadMeetingsList(token);
    sectionLoads[name] = run.finally(() => {
      sectionLoads[name] = null;
    });
  }
  return sectionLoads[name];
}

const isCurrent = (name, token) => token === sectionTokens[name];

const CONTAINER_IDS = { calendar: 'calendar-container', list: 'meeting-schedule-container' };

// Meetings-specific functionality
async function initializeMeetingsPage() {
  // Calendar is essential for meetings page - always load
  await loadSection('calendar');

  // Meeting list/grid view
  await loadSection('list');

  // Meeting filters
  const filtersContainer = safeQuerySelector('#meeting-filters');
  if (filtersContainer) {
    initializeMeetingFilters(filtersContainer);
  }

  // RSVPs used to be kept only in this browser (never reaching the club);
  // drop that stale record. RSVPs are now emailed (js/modules/rsvp-dialog.js).
  try {
    window.localStorage.removeItem('meeting_rsvps');
  } catch {
    // storage blocked: nothing to remove
  }
}

const LOADING_HTML = '<div class="loading"><i class="fas fa-spinner fa-spin" aria-hidden="true"></i> Loading...</div>';

/**
 * "Try again": rebuild whichever sections failed (never one that works, and
 * never one already loading), then put focus somewhere sensible in the
 * section the button was in.
 * @param {string} originName - 'calendar' or 'list'
 */
async function retryFailedSections(originName) {
  const pending = [];
  for (const name of ['calendar', 'list']) {
    const ready = name === 'calendar' ? calendarReady : listReady;
    if (ready) {
      continue;
    }
    if (!sectionLoads[name]) {
      const el = document.getElementById(CONTAINER_IDS[name]);
      if (el) {
        el.innerHTML = LOADING_HTML;
      }
    }
    pending.push(name);
  }

  // Calendar first, then the list, as on page load (they share one fetch)
  for (const name of pending) {
    await loadSection(name);
  }

  // Failed again: back to that section's retry button. Recovered: the section.
  // Re-query: the calendar's destroy() replaces its container element.
  const origin = document.getElementById(CONTAINER_IDS[originName]);
  const retry = origin?.querySelector('.meetings-retry');
  if (retry) {
    retry.focus();
  } else if (origin) {
    origin.setAttribute('tabindex', '-1');
    origin.focus();
  }
}

/**
 * Replace a section's content with a visible error and a working retry button.
 * role="alert" announces the same text that is shown.
 * @param {string} name - 'calendar' or 'list'
 * @param {string} message
 */
function renderLoadError(name, message) {
  // Always the live element: the calendar's destroy() swaps it for a clone
  const container = document.getElementById(CONTAINER_IDS[name]);
  if (!container) {
    return;
  }
  container.innerHTML = `
        <div class="error-message meetings-load-error" role="alert">
            <p>${escapeHTML(message)}</p>
            <button type="button" class="btn btn-primary meetings-retry">
                <i class="fas fa-redo" aria-hidden="true"></i> Try again
            </button>
        </div>
    `;
  const button = container.querySelector('.meetings-retry');
  if (button) {
    // A plain listener: the button is thrown away with its markup, and the
    // listener with it (the cleanup registry would keep the detached node).
    button.addEventListener('click', () => {
      if (button.disabled) {
        return;
      }
      // Stays disabled until this section's load settles (a failure renders
      // a fresh button; a success removes this one).
      button.disabled = true;
      button.setAttribute('aria-disabled', 'true');
      retryFailedSections(name);
    });
  }
}

/**
 * Mark meeting days on a calendar date cell (vanilla-calendar-pro v3
 * onCreateDateEls hook, called for every day cell it renders).
 * @param {HTMLElement} dateEl - The cell, carrying data-vc-date
 * @param {Object} adapter - CalendarAdapter with meetings loaded
 */
function markMeetingDate(dateEl, adapter) {
  const date = dateEl?.dataset?.vcDate;
  const meeting = date && adapter.getMeetingByDate(date);
  if (!meeting) {
    return;
  }
  dateEl.classList.add(meeting.cancelled ? 'sapa-day-cancelled' : 'sapa-day-meeting');
  if (!isClubUpcoming(date)) {
    dateEl.classList.add('sapa-day-past');
  }
  dateEl.dataset.sapaMeeting = meeting.cancelled ? 'cancelled' : 'meeting';

  const button = dateEl.querySelector('[data-vc-date-btn]');
  if (button) {
    const what = meeting.cancelled ? `no meeting (${meeting.title})` : meeting.title;
    button.setAttribute('aria-label', `${formatLongDate(date)}: ${what}. Show details`);
  }
}

// v3 attaches its click handler to the container, so a second instance on
// the same element would answer every click twice. Always tear down first.
// destroy() replaces the container with a clone: re-query it afterwards.
function destroyCalendar() {
  if (calendarInstance) {
    try {
      calendarInstance.destroy();
    } catch (error) {
      logger.warn('Calendar destroy failed:', error);
    }
    calendarInstance = null;
  }
  calendarReady = false;
}

async function initializeMeetingsCalendar(token) {
  if (!document.getElementById(CONTAINER_IDS.calendar)) {
    logger.warn('Calendar container not found on meetings page');
    return;
  }

  destroyCalendar();

  let adapter;
  let Calendar;
  let modal;
  try {
    // Import calendar dependencies
    const [calendarModule, adapterModule, modalModule] = await Promise.all([
      import('vanilla-calendar-pro'),
      import('../calendar-adapter.js'),
      import('../modal.js')
    ]);
    ({ Calendar } = calendarModule);
    // calendarAdapter is already an instance, not a function
    adapter = adapterModule.calendarAdapter;
    ({ modal } = modalModule);
    // The details dialog offers RSVP for an upcoming meeting, through the
    // same form as the cards.
    modal.onRsvp = (meeting, button) => openRsvpDialog(meeting, button, { onSent: markRsvpSent });
    modal.renderRsvpButton = renderRsvpButton;
  } catch (error) {
    logger.error('Failed to load the calendar code:', error);
    if (isCurrent('calendar', token)) {
      renderLoadError('calendar', CALENDAR_FAILED_TEXT);
    }
    return;
  }

  const data = await adapter.loadMeetings();
  if (!isCurrent('calendar', token)) {
    return;
  }
  if (!data) {
    // Without the data every day click would silently do nothing.
    renderLoadError('calendar', LOAD_FAILED_TEXT);
    return;
  }

  try {
    // Re-queried after destroyCalendar(), which swaps the element
    const calendarContainer = document.getElementById(CONTAINER_IDS.calendar);
    calendarContainer.innerHTML = '';

    // vanilla-calendar-pro v3 API (flat options; v2's settings/actions are ignored)
    const calendar = new Calendar(calendarContainer, {
      type: 'default',
      displayDatesOutside: false,
      selectedWeekends: [0, 6],
      selectionDatesMode: 'single',
      displayDateMin: CALENDAR.DATE_RANGE.MIN,
      displayDateMax: CALENDAR.DATE_RANGE.MAX,
      // Show the meeting days: a class and a spoken label on each cell
      onCreateDateEls: (_self, dateEl) => markMeetingDate(dateEl, adapter),
      onClickDate: (self, event) => {
        // Read the clicked cell's date rather than self.context.selectedDates:
        // re-clicking a date toggles it off (enableDateToggle), emptying the selection.
        const dateEl = event?.target?.closest?.('[data-vc-date]');
        const clickedDate = dateEl?.dataset.vcDate || self.context.selectedDates[0];
        const meeting = clickedDate && adapter.getMeetingByDate(clickedDate);

        if (meeting) {
          modal.open(meeting);
        }
      }
    });

    // Held before init(), so a half-built calendar is still destroyed on failure
    calendarInstance = calendar;
    calendar.init();
    calendarReady = true;
    renderCalendarLegend(document.getElementById(CONTAINER_IDS.calendar));

  } catch (error) {
    // The calendar itself failed (not the data): only the calendar is
    // rebuilt on retry; the meeting list keeps working.
    logger.error('Failed to initialize meetings calendar:', error);
    destroyCalendar();
    renderLoadError('calendar', CALENDAR_FAILED_TEXT);
  }
}

// Key to the day markings, placed under the calendar.
function renderCalendarLegend(calendarContainer) {
  const existing = document.getElementById('calendar-legend');
  if (existing) {
    existing.remove();
  }
  const legend = document.createElement('ul');
  legend.id = 'calendar-legend';
  legend.className = 'calendar-legend';
  legend.setAttribute('aria-label', 'Calendar key');
  legend.innerHTML = `
        <li><span class="legend-swatch legend-meeting" aria-hidden="true">8</span> Meeting day (select it for details)</li>
        <li><span class="legend-swatch legend-cancelled" aria-hidden="true">8</span> No meeting that Friday</li>
    `;
  calendarContainer.insertAdjacentElement('afterend', legend);
}

/**
 * Formats meeting time object into readable string
 * @param {Object|string} time - Time object or string
 * @returns {string} Formatted time string
 */
function formatMeetingTime(time) {
  if (typeof time === 'string') {
    return time;
  }
  if (time && typeof time === 'object') {
    if (!hasTime(time.meetingStart)) {
      return 'Time TBD';
    }
    const parts = [];
    if (hasTime(time.doorsOpen) && time.doorsOpen !== time.meetingStart) {
      parts.push(`Doors: ${time.doorsOpen}`);
    }
    if (hasTime(time.bogStart)) {
      parts.push(`BOG: ${time.bogStart}`);
    }
    parts.push(`Meeting: ${time.meetingStart}`);
    if (hasTime(time.meetingEnd)) {
      parts.push(`End: ${time.meetingEnd}`);
    }
    return parts.join(' | ');
  }
  return 'Time TBD';
}

/**
 * Formats meeting location object into readable string
 * @param {Object|string} location - Location object or string
 * @returns {string} Formatted location string
 */
function formatMeetingLocation(location) {
  if (typeof location === 'string') {
    return location;
  }
  if (location && typeof location === 'object') {
    const parts = [];
    if (location.name) {
      parts.push(location.name);
    }
    if (location.building) {
      parts.push(location.building);
    }
    if (location.room) {
      parts.push(location.room);
    }
    if (location.address) {
      const addr = location.address;
      const addressStr = `${addr.street}, ${addr.city}, ${addr.state} ${addr.zipCode}`;
      parts.push(addressStr);
    }
    return parts.join(', ') || 'Location TBD';
  }
  return 'Location TBD';
}

function meetingBadges(cancelled, past, next) {
  const badges = [];
  if (next) {
    badges.push('<span class="meeting-badge badge-next">Next meeting</span>');
  }
  if (cancelled) {
    badges.push('<span class="meeting-badge badge-cancelled">No meeting</span>');
  }
  if (past) {
    badges.push('<span class="meeting-badge badge-past">Past</span>');
  }
  return badges.length ? `<p class="meeting-badges">${badges.join(' ')}</p>` : '';
}

/**
 * One meeting card.
 * @param {Object} meeting
 * @param {{past: boolean, next: boolean}} state
 * @returns {string} HTML
 */
function renderMeetingCard(meeting, { past, next }) {
  const cancelled = Boolean(meeting.cancelled);
  const classes = ['meeting-item'];
  if (cancelled) { classes.push('meeting-cancelled'); }
  if (past) { classes.push('meeting-past'); }
  if (next) { classes.push('meeting-next'); }

  const agenda = Array.isArray(meeting.agenda) && meeting.agenda.length ? `
                        <details class="meeting-agenda">
                            <summary>Agenda</summary>
                            <ul>
                                ${meeting.agenda.map(item => `<li>${escapeHTML(typeof item === 'string' ? item : [item.time, item.item].filter(Boolean).join(' – '))}</li>`).join('')}
                            </ul>
                        </details>` : '';

  // A cancelled Friday has no time or place to show.
  const details = cancelled
    ? `<p class="meeting-description">${escapeHTML(meeting.description || 'No meeting this Friday.')}</p>`
    : `
                    <p><strong>Time:</strong> ${escapeHTML(formatMeetingTime(meeting.time))}</p>
                    <p><strong>Location:</strong> ${escapeHTML(formatMeetingLocation(meeting.location))}</p>
                    ${meeting.description ? `<p class="meeting-description">${escapeHTML(meeting.description)}</p>` : ''}
                    ${agenda}`;

  // Past and cancelled meetings get no RSVP or calendar actions. Reminders
  // come with the calendar: every meeting .ics carries them (scripts/build-calendar.js).
  const calendarUrl = (past || cancelled) ? '' : safeUrl(meetingCalendarUrl(meeting), '');
  const actions = (past || cancelled) ? '' : `
                <div class="meeting-actions">
                    ${rsvpButtonHTML(meeting)}
                    ${calendarUrl ? `<a href="${escapeHTML(calendarUrl)}" class="btn-calendar" download aria-label="Add to Calendar: ${escapeHTML(meeting.title)}, ${escapeHTML(formatLongDate(meeting.date))}"><i class="fas fa-calendar-plus" aria-hidden="true"></i> Add to Calendar</a>` : ''}
                </div>`;

  return `
            <article id="meeting-${escapeHTML(meeting.id)}" class="${classes.join(' ')}" data-date="${escapeHTML(meeting.date)}" data-type="${escapeHTML(meeting.type || 'regular')}" tabindex="-1">
                <div class="meeting-header">
                    ${meetingBadges(cancelled, past, next)}
                    <h3>${escapeHTML(meeting.title)}</h3>
                    <time datetime="${escapeHTML(meeting.date)}" class="meeting-date">${escapeHTML(formatLongDate(meeting.date))}</time>
                </div>
                <div class="meeting-details">${details}
                </div>${actions}
            </article>
        `;
}

async function loadMeetingsList(token) {
  const container = document.getElementById(CONTAINER_IDS.list);
  if (!container) {
    return;
  }
  try {
    const meetingsData = await fetchJSON('data/meetings/meetings.json');
    if (!isCurrent('list', token)) {
      return;
    }

    // Show the current quarter (rolling over to the next one near quarter end,
    // once its schedule is posted). Shared with MeetingLoader so the rule lives
    // in one place and nothing needs editing when a quarter changes.
    const quarter = selectScheduleQuarter(meetingsData.meetings);
    const meetings = meetingsInQuarter(meetingsData.meetings, quarter);

    if (meetings.length === 0) {
      container.innerHTML = `<p class="meeting-schedule-empty">The Q${quarter.quarter} ${quarter.year} meeting schedule has not been posted yet. Please check back soon.</p>`;
      announceStatus(scheduleStatusRegion(), `The Q${quarter.quarter} ${quarter.year} meeting schedule has not been posted yet.`);
      return;
    }

    // A meeting stays upcoming through the whole of its own date in
    // San Antonio (Central time), wherever the visitor is.
    const now = new Date();
    const isPast = m => !isClubUpcoming(m.date, now);
    const nextMeeting = meetings.find(m => !m.cancelled && !isPast(m));
    const pastCount = meetings.filter(isPast).length;

    const summary = nextMeeting
      ? `<p class="meeting-schedule-summary"><strong>Next meeting:</strong> <a href="#meeting-${escapeHTML(nextMeeting.id)}">${escapeHTML(formatLongDate(nextMeeting.date))}: ${escapeHTML(nextMeeting.title)}</a></p>`
      : `<p class="meeting-schedule-summary">All Q${quarter.quarter} ${quarter.year} meetings have taken place. The next schedule has not been posted yet; please check back soon.</p>`;

    meetingsById = new Map(meetings.map(m => [m.id, m]));
    container.innerHTML = summary + meetings.map(meeting => renderMeetingCard(meeting, {
      past: isPast(meeting),
      next: meeting === nextMeeting
    })).join('');

    const pastNote = pastCount ? `, ${pastCount} already past` : '';
    announceStatus(scheduleStatusRegion(), `${countSummary(meetings.length, meetings.length, 'meeting', 'meetings')} for Q${quarter.quarter} ${quarter.year}${pastNote}`);

    // RSVP buttons
    bindMeetingActions(container);
    listReady = true;

    // A link such as meetings.html#meeting-2026-10-16 names a card that only
    // exists now, so the browser's own jump on load found nothing.
    scrollToHashedMeeting();

  } catch (error) {
    logger.error('Failed to load meetings list:', error);
    if (!isCurrent('list', token)) {
      return;
    }
    listReady = false;
    renderLoadError('list', LOAD_FAILED_TEXT);
    announceStatus(scheduleStatusRegion(), LOAD_FAILED_TEXT);
  }
}

function scrollToHashedMeeting() {
  let id = '';
  try {
    id = decodeURIComponent((location.hash || '').slice(1));
  } catch {
    return;
  }
  if (!/^meeting-\d{4}-\d{2}-\d{2}$/.test(id)) {
    return;
  }
  const card = document.getElementById(id);
  if (card) {
    card.scrollIntoView({ block: 'start' });
    card.focus({ preventScroll: true });
  }
}

// Plain listener: the cleanup registry drops its listeners on beforeunload,
// which would leave a page restored from the back/forward cache without it.
window.addEventListener('hashchange', scrollToHashedMeeting);

// Short visually hidden role="status" line next to the schedule (meetings.html).
// The schedule container itself is not a live region: it holds ~6k characters.
function scheduleStatusRegion() {
  return safeQuerySelector('#meeting-schedule-status');
}

function initializeMeetingFilters(container) {
  const currentYear = new Date().getFullYear();
  const yearRange = FILTER_OPTIONS.YEAR_RANGE;
  const years = [];
  for (let i = -yearRange; i <= yearRange; i++) {
    years.push(currentYear + i);
  }

  container.innerHTML = `
        <div class="filter-group">
            <label for="year-filter">Year:</label>
            <select id="year-filter">
                <option value="">All Years</option>
                ${years.map(year => `<option value="${year}">${year}</option>`).join('')}
            </select>
        </div>
        
        <div class="filter-group">
            <label for="type-filter">Type:</label>
            <select id="type-filter">
                ${FILTER_OPTIONS.MEETING_TYPES.map(type =>
    `<option value="${escapeHTML(type.value)}">${escapeHTML(type.label)}</option>`
  ).join('')}
            </select>
        </div>
        
        <div class="filter-group">
            <label for="upcoming-only">
                <input type="checkbox" id="upcoming-only"> Upcoming Only
            </label>
        </div>
        
        <button id="clear-filters" class="btn-secondary">Clear Filters</button>
    `;

  // Add filter event listeners
  const yearFilter = container.querySelector('#year-filter');
  const typeFilter = container.querySelector('#type-filter');
  const upcomingOnly = container.querySelector('#upcoming-only');
  const clearButton = container.querySelector('#clear-filters');

  const applyFilters = debounce(() => {
    const meetings = document.querySelectorAll('.meeting-item');
    const selectedYear = yearFilter.value;
    const selectedType = typeFilter.value;
    const showUpcomingOnly = upcomingOnly.checked;
    const now = new Date();

    meetings.forEach(meeting => {
      const meetingDate = parseLocalDate(meeting.dataset.date);
      const meetingType = meeting.dataset.type;

      let show = true;

      if (selectedYear && meetingDate.getFullYear() !== parseInt(selectedYear)) {
        show = false;
      }

      if (selectedType && meetingType !== selectedType) {
        show = false;
      }

      // A meeting stays upcoming through its whole Central-time date
      if (showUpcomingOnly && !isClubUpcoming(meeting.dataset.date, now)) {
        show = false;
      }

      meeting.style.display = show ? 'block' : 'none';
    });

    const shown = [...meetings].filter(m => m.style.display !== 'none').length;
    announceStatus(scheduleStatusRegion(), countSummary(shown, meetings.length, 'meeting', 'meetings'));
  }, TIMING.DEBOUNCE_SEARCH);

  addEventListenerWithCleanup(yearFilter, 'change', applyFilters);
  addEventListenerWithCleanup(typeFilter, 'change', applyFilters);
  addEventListenerWithCleanup(upcomingOnly, 'change', applyFilters);

  addEventListenerWithCleanup(clearButton, 'click', () => {
    yearFilter.value = '';
    typeFilter.value = '';
    upcomingOnly.checked = false;
    applyFilters();
  });
}

// The meetings on the cards, by id (set by loadMeetingsList).
let meetingsById = new Map();

/**
 * After a confirmed send: every RSVP button for that meeting (its card and,
 * if open, the details dialog) says so, for this page view only.
 * @param {string} meetingId
 */
function markRsvpSent(meetingId) {
  const meeting = meetingsById.get(meetingId);
  for (const button of document.querySelectorAll('.btn-rsvp[data-meeting-id], .modal-rsvp-btn[data-meeting-id]')) {
    if (button.dataset.meetingId === meetingId && meeting) {
      renderRsvpButton(button, meeting);
    }
  }
}

function bindMeetingActions(container) {
  // One delegated listener on the container, which outlives every re-render
  // of the cards inside it.
  if (container.dataset.meetingActionsBound === 'true') {
    return;
  }
  container.dataset.meetingActionsBound = 'true';

  // Plain listener, not addEventListenerWithCleanup: the cleanup registry
  // removes its listeners on beforeunload, and a page restored from the
  // back/forward cache would keep the bound flag but lose the listener.
  container.addEventListener('click', (e) => {
    const button = e.target.closest?.('.btn-rsvp');
    if (!button || !container.contains(button)) {
      return;
    }
    const meeting = meetingsById.get(button.dataset.meetingId);
    // Only upcoming meetings have the button; check again in case the page
    // stayed open past the meeting.
    if (!meeting || meeting.cancelled || !isClubUpcoming(meeting.date)) {
      return;
    }
    openRsvpDialog(meeting, button, { onSent: markRsvpSent });
  });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeMeetingsPage);
} else {
  initializeMeetingsPage();
}
