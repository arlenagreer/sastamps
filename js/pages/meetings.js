/**
 * Meetings Page Bundle
 * Only includes functionality needed for the meetings page
 */

import { debounce } from '../utils/performance.js';
import { safeQuerySelector, escapeHTML, safeUrl } from '../utils/safe-dom.js';
import { parseLocalDate, isUpcomingDate } from '../utils/dates.js';
import { fetchJSON } from '../utils/fetch-json.js';
import { addEventListenerWithCleanup } from '../utils/event-cleanup.js';
import { createLogger } from '../utils/logger.js';
import { announceStatus, countSummary } from '../utils/announce.js';
import {
  TIMING,
  CALENDAR,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  STORAGE_KEYS,
  FILTER_OPTIONS
} from '../constants/index.js';
import MeetingLoader, { meetingsInQuarter, selectScheduleQuarter } from '../modules/meeting-loader.js';
import { meetingCalendarUrl, hasTime } from '../calendar-adapter.js';

const logger = createLogger('MeetingsPage');

// Export MeetingLoader for global access via SAPA_MEETINGS
export { MeetingLoader };

const LOAD_FAILED_TEXT = 'The meeting schedule could not be loaded. Check your connection and try again.';

// Meetings-specific functionality
async function initializeMeetingsPage() {
  // Calendar is essential for meetings page - always load
  await initializeMeetingsCalendar();

  // Meeting list/grid view
  const meetingsList = safeQuerySelector('#meeting-schedule-container');
  if (meetingsList) {
    await loadMeetingsList(meetingsList);
  }

  // Meeting filters
  const filtersContainer = safeQuerySelector('#meeting-filters');
  if (filtersContainer) {
    initializeMeetingFilters(filtersContainer);
  }

  // RSVP functionality
  initializeRSVPSystem();
}

/**
 * Re-run the schedule list and calendar after a failed meetings.json load.
 */
async function retryMeetingsLoad() {
  const calendarContainer = safeQuerySelector('#calendar-container');
  const meetingsList = safeQuerySelector('#meeting-schedule-container');
  [calendarContainer, meetingsList].forEach(el => {
    if (el) {
      el.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin" aria-hidden="true"></i> Loading...</div>';
    }
  });
  await initializeMeetingsCalendar();
  if (meetingsList) {
    await loadMeetingsList(meetingsList);
  }
  try {
    initializeRSVPSystem();
  } catch (error) {
    logger.warn('RSVP state could not be restored:', error);
  }
}

/**
 * Replace a container's content with a visible error and a working retry button.
 * @param {HTMLElement} container
 * @param {string} message
 */
function renderLoadError(container, message) {
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
    addEventListenerWithCleanup(button, 'click', () => {
      retryMeetingsLoad();
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
  if (!isUpcomingDate(date, new Date())) {
    dateEl.classList.add('sapa-day-past');
  }
  dateEl.dataset.sapaMeeting = meeting.cancelled ? 'cancelled' : 'meeting';

  const button = dateEl.querySelector('[data-vc-date-btn]');
  if (button) {
    const what = meeting.cancelled ? `no meeting (${meeting.title})` : meeting.title;
    button.setAttribute('aria-label', `${formatLongDate(date)}: ${what}. Show details`);
  }
}

async function initializeMeetingsCalendar() {
  const calendarContainer = safeQuerySelector('#calendar-container');
  if (!calendarContainer) {
    logger.warn('Calendar container not found on meetings page');
    return;
  }

  try {
    // Import calendar dependencies
    const [
      { Calendar },
      { calendarAdapter },
      { modal },
      { reminderSystem: _reminderSystem }
    ] = await Promise.all([
      import('vanilla-calendar-pro'),
      import('../calendar-adapter.js'),
      import('../modal.js'),
      import('../reminder-system.js')
    ]);

    // Initialize calendar with full meeting functionality
    // calendarAdapter is already an instance, not a function
    const adapter = calendarAdapter;
    const data = await adapter.loadMeetings();
    if (!data) {
      // Without the data every day click would silently do nothing.
      renderLoadError(calendarContainer, LOAD_FAILED_TEXT);
      return;
    }

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

    calendar.init();
    renderCalendarLegend(calendarContainer);

  } catch (error) {
    logger.error('Failed to initialize meetings calendar:', error);
    renderLoadError(calendarContainer, ERROR_MESSAGES.CALENDAR_UNAVAILABLE);
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

function formatLongDate(date) {
  return parseLocalDate(date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
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

  // Past and cancelled meetings get no RSVP, reminder or calendar actions.
  const calendarUrl = (past || cancelled) ? '' : safeUrl(meetingCalendarUrl(meeting), '');
  const actions = (past || cancelled) ? '' : `
                <div class="meeting-actions">
                    <button type="button" class="btn-rsvp" data-meeting-id="${escapeHTML(meeting.id)}">RSVP</button>
                    <button type="button" class="btn-reminder" data-meeting-id="${escapeHTML(meeting.id)}">Set Reminder</button>
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

async function loadMeetingsList(container) {
  try {
    const meetingsData = await fetchJSON('data/meetings/meetings.json');

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

    // A meeting stays upcoming for the whole of its own local day.
    const now = new Date();
    const isPast = m => !isUpcomingDate(m.date, now);
    const nextMeeting = meetings.find(m => !m.cancelled && !isPast(m));
    const pastCount = meetings.filter(isPast).length;

    const summary = nextMeeting
      ? `<p class="meeting-schedule-summary"><strong>Next meeting:</strong> <a href="#meeting-${escapeHTML(nextMeeting.id)}">${escapeHTML(formatLongDate(nextMeeting.date))}: ${escapeHTML(nextMeeting.title)}</a></p>`
      : `<p class="meeting-schedule-summary">All Q${quarter.quarter} ${quarter.year} meetings have taken place. The next schedule has not been posted yet; please check back soon.</p>`;

    container.innerHTML = summary + meetings.map(meeting => renderMeetingCard(meeting, {
      past: isPast(meeting),
      next: meeting === nextMeeting
    })).join('');

    const pastNote = pastCount ? `, ${pastCount} already past` : '';
    announceStatus(scheduleStatusRegion(), `${countSummary(meetings.length, meetings.length, 'meeting', 'meetings')} for Q${quarter.quarter} ${quarter.year}${pastNote}`);

    // Add event listeners for RSVP and reminder buttons
    bindMeetingActions(container);

    // A link such as meetings.html#meeting-2026-10-16 names a card that only
    // exists now, so the browser's own jump on load found nothing.
    scrollToHashedMeeting();

  } catch (error) {
    logger.error('Failed to load meetings list:', error);
    renderLoadError(container, LOAD_FAILED_TEXT);
    announceStatus(scheduleStatusRegion(), ERROR_MESSAGES.MEETING_LOAD_FAILED);
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

addEventListenerWithCleanup(window, 'hashchange', scrollToHashedMeeting);

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

      // A meeting stays upcoming for the whole of its own day
      if (showUpcomingOnly && !isUpcomingDate(meeting.dataset.date, now)) {
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

function handleRSVP(meetingId, button) {
  // Toggle RSVP status
  const isRSVPd = button.classList.contains('rsvp-active');

  if (isRSVPd) {
    button.classList.remove('rsvp-active');
    button.textContent = 'RSVP';
  } else {
    button.classList.add('rsvp-active');
    button.textContent = 'RSVP\'d';
  }

  // Store RSVP status in localStorage
  try {
    const rsvps = JSON.parse(localStorage.getItem('meeting_rsvps') || '{}');
    rsvps[meetingId] = !isRSVPd;
    localStorage.setItem('meeting_rsvps', JSON.stringify(rsvps));
  } catch (error) {
    logger.warn('Failed to save RSVP status:', error);
  }
}

function bindMeetingActions(container) {
  // RSVP buttons
  const rsvpButtons = container.querySelectorAll('.btn-rsvp');
  rsvpButtons.forEach(button => {
    addEventListenerWithCleanup(button, 'click', (e) => {
      const {meetingId} = e.target.dataset;
      handleRSVP(meetingId, button);
    });
  });

  // Reminder buttons
  const reminderButtons = container.querySelectorAll('.btn-reminder');
  reminderButtons.forEach(button => {
    addEventListenerWithCleanup(button, 'click', async (e) => {
      const {meetingId} = e.target.dataset;
      const { reminderSystem } = await import('../reminder-system.js');
      reminderSystem.setReminder(meetingId);

      button.textContent = 'Reminder Set!';
      button.disabled = true;
      setTimeout(() => {
        button.textContent = 'Set Reminder';
        button.disabled = false;
      }, TIMING.NOTIFICATION_SHORT);
    });
  });
}

function initializeRSVPSystem() {
  // RSVP system using localStorage for now
  window.handleRSVP = function(meetingId, button) {
    const rsvps = JSON.parse(localStorage.getItem(STORAGE_KEYS.MEETING_RSVPS) || '{}');
    const hasRSVPed = rsvps[meetingId];

    if (hasRSVPed) {
      delete rsvps[meetingId];
      button.textContent = 'RSVP';
      button.classList.remove('rsvp-confirmed');
    } else {
      rsvps[meetingId] = {
        timestamp: new Date().toISOString(),
        attendeeCount: 1
      };
      button.textContent = 'RSVP Confirmed';
      button.classList.add('rsvp-confirmed');
    }

    localStorage.setItem(STORAGE_KEYS.MEETING_RSVPS, JSON.stringify(rsvps));

    // Show confirmation
    const confirmation = document.createElement('div');
    confirmation.className = 'rsvp-confirmation';
    confirmation.textContent = hasRSVPed ? SUCCESS_MESSAGES.RSVP_CANCELLED : SUCCESS_MESSAGES.RSVP_CONFIRMED;
    button.parentNode.appendChild(confirmation);

    setTimeout(() => {
      confirmation.remove();
    }, TIMING.RSVP_CONFIRMATION_DURATION);
  };

  // Load existing RSVPs
  const rsvps = JSON.parse(localStorage.getItem(STORAGE_KEYS.MEETING_RSVPS) || '{}');
  Object.keys(rsvps).forEach(meetingId => {
    const button = Array.from(document.querySelectorAll('[data-meeting-id]')).find(el => el.dataset.meetingId === meetingId);
    if (button && button.classList.contains('btn-rsvp')) {
      button.textContent = 'RSVP Confirmed';
      button.classList.add('rsvp-confirmed');
    }
  });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeMeetingsPage);
} else {
  initializeMeetingsPage();
}
