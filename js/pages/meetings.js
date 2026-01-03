/**
 * Meetings Page Bundle
 * Only includes functionality needed for the meetings page
 */

import { debounce } from '../utils/performance.js';
import { safeQuerySelector } from '../utils/safe-dom.js';
import { addEventListenerWithCleanup } from '../utils/event-cleanup.js';
import { createLogger } from '../utils/logger.js';
import {
  TIMING,
  CALENDAR,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  STORAGE_KEYS,
  FILTER_OPTIONS
} from '../constants/index.js';

const logger = createLogger('MeetingsPage');

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
      { reminderSystem }
    ] = await Promise.all([
      import('vanilla-calendar-pro'),
      import('../calendar-adapter.js'),
      import('../modal.js'),
      import('../reminder-system.js')
    ]);

    // Initialize calendar with full meeting functionality
    // calendarAdapter is already an instance, not a function
    const adapter = calendarAdapter;
    if (adapter && adapter.loadMeetings) {
      await adapter.loadMeetings();
    }

    const calendar = new Calendar(calendarContainer, {
      type: 'default',
      settings: {
        visibility: {
          daysOutside: false,
          weekend: true
        },
        selection: {
          day: 'single'
        },
        range: {
          min: CALENDAR.DATE_RANGE.MIN,
          max: CALENDAR.DATE_RANGE.MAX
        }
      },
      actions: {
        clickDay: (event, self) => {
          const clickedDate = self.selectedDates[0];
          const meeting = adapter.getMeetingByDate(clickedDate);

          if (meeting) {
            modal.showMeetingDetails(meeting);
          }
        }
      }
    });

    calendar.init();

    // Initialize reminder system
    reminderSystem.initialize();

    // Meetings calendar initialized successfully

  } catch (error) {
    logger.error('Failed to initialize meetings calendar:', error);
    calendarContainer.innerHTML = `
            <div class="error-message">
                <p>${ERROR_MESSAGES.CALENDAR_UNAVAILABLE}</p>
                <button onclick="location.reload()">Refresh Page</button>
            </div>
        `;
  }
}

async function loadMeetingsList(container) {
  try {
    const { default: meetingsData } = await import('../../data/meetings/meetings.json');
    
    // Get current date to determine which quarter to show
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // JavaScript months are 0-based
    
    // Determine current quarter
    let quarterStart, quarterEnd, _quarterLabel;
    if (currentMonth >= 10) {
      // Q4: October-December
      quarterStart = new Date(currentYear, 9, 1); // October 1
      quarterEnd = new Date(currentYear, 11, 31); // December 31
      _quarterLabel = 'Q4';
    } else if (currentMonth >= 7) {
      // Q3: July-September
      quarterStart = new Date(currentYear, 6, 1); // July 1
      quarterEnd = new Date(currentYear, 8, 30); // September 30
      _quarterLabel = 'Q3';
    } else if (currentMonth >= 4) {
      // Q2: April-June
      quarterStart = new Date(currentYear, 3, 1); // April 1
      quarterEnd = new Date(currentYear, 5, 30); // June 30
      _quarterLabel = 'Q2';
    } else {
      // Q1: January-March
      quarterStart = new Date(currentYear, 0, 1); // January 1
      quarterEnd = new Date(currentYear, 2, 31); // March 31
      _quarterLabel = 'Q1';
    }
    
    // Filter meetings for current quarter
    const meetings = meetingsData.meetings
      .filter(meeting => {
        const meetingDate = new Date(meeting.date);
        return meetingDate >= quarterStart && meetingDate <= quarterEnd;
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date)); // Sort ascending for chronological order

    const html = meetings.map(meeting => `
            <article class="meeting-item" data-date="${meeting.date}" data-type="${meeting.type || 'regular'}">
                <header class="meeting-header">
                    <h3>${meeting.title}</h3>
                    <time datetime="${meeting.date}" class="meeting-date">
                        ${new Date(meeting.date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })}
                    </time>
                </header>
                
                <div class="meeting-details">
                    <p><strong>Time:</strong> ${meeting.time}</p>
                    <p><strong>Location:</strong> ${meeting.location}</p>
                    ${meeting.description ? `<p class="meeting-description">${meeting.description}</p>` : ''}
                    ${meeting.agenda ? `
                        <details class="meeting-agenda">
                            <summary>Agenda</summary>
                            <ul>
                                ${meeting.agenda.map(item => `<li>${item}</li>`).join('')}
                            </ul>
                        </details>
                    ` : ''}
                </div>
                
                <footer class="meeting-actions">
                    <button class="btn-rsvp" data-meeting-id="${meeting.id}">RSVP</button>
                    <button class="btn-reminder" data-meeting-id="${meeting.id}">Set Reminder</button>
                    ${meeting.calendarLink ? `<a href="${meeting.calendarLink}" class="btn-calendar">Add to Calendar</a>` : ''}
                </footer>
            </article>
        `).join('');

    container.innerHTML = html;

    // Add event listeners for RSVP and reminder buttons
    bindMeetingActions(container);

  } catch (error) {
    logger.error('Failed to load meetings list:', error);
    container.innerHTML = `<p class="error-message">${ERROR_MESSAGES.MEETING_LOAD_FAILED}</p>`;
  }
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
    `<option value="${type.value}">${type.label}</option>`
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
      const meetingDate = new Date(meeting.dataset.date);
      const meetingType = meeting.dataset.type;

      let show = true;

      if (selectedYear && meetingDate.getFullYear() !== parseInt(selectedYear)) {
        show = false;
      }

      if (selectedType && meetingType !== selectedType) {
        show = false;
      }

      if (showUpcomingOnly && meetingDate < now) {
        show = false;
      }

      meeting.style.display = show ? 'block' : 'none';
    });
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
    const button = document.querySelector(`[data-meeting-id="${meetingId}"]`);
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
