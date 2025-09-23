/**
 * Calendar Component
 * Integrates Vanilla Calendar Pro with SAPA meeting data and modal
 */

import { Calendar } from 'vanilla-calendar-pro';
import { calendarAdapter } from './calendar-adapter.js';
import { modal } from './modal.js';
import { reminderSystem } from './reminder-system.js';

export class CalendarComponent {
  constructor(containerId, meetingsData) {
    this.containerId = containerId;
    this.meetingsData = meetingsData;
    this.calendar = null;
    this.events = [];
    this.isLazyLoaded = false;

    if (!this.isLazyLoaded) {
      this.init();
    }
  }

  /**
     * Static method for lazy loading calendar
     * @param {HTMLElement} element - Container element
     * @param {Object} meetingsData - Meetings data
     * @returns {Promise<CalendarComponent>} - Calendar instance
     */
  static async lazyLoad(element, meetingsData = null) {
    return new Promise((resolve, reject) => {
      try {
        if (!meetingsData) {
          import('./modules/meeting-loader.js')
            .then(({ meetingLoader }) => {
              return meetingLoader.loadMeetings();
            })
            .then(data => {
              const calendar = new CalendarComponent(element.id, data);
              calendar.isLazyLoaded = true;
              calendar.init();
              resolve(calendar);
            })
            .catch(reject);
        } else {
          const calendar = new CalendarComponent(element.id, meetingsData);
          calendar.isLazyLoaded = true;
          calendar.init();
          resolve(calendar);
        }
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
     * Initialize calendar component
     */
  async init() {
    try {
      // Convert meeting data to calendar events
      if (this.meetingsData) {
        this.events = calendarAdapter.convertToCalendarEvents(this.meetingsData);
      }

      // Create calendar instance
      this.createCalendar();

      // Calendar component initialized successfully
    } catch (error) {
      console.error('Error initializing calendar:', error);
      this.showError('Failed to initialize calendar');
    }
  }

  /**
     * Create calendar instance
     */
  createCalendar() {
    const container = document.getElementById(this.containerId);
    if (!container) {
      console.error(`Calendar container with ID "${this.containerId}" not found`);
      return;
    }

    // Clear container
    container.innerHTML = '';

    // Create calendar wrapper
    const calendarWrapper = document.createElement('div');
    calendarWrapper.className = 'calendar-container';

    // Create calendar element
    const calendarElement = document.createElement('div');
    calendarElement.id = 'vanilla-calendar';
    calendarElement.className = 'vanilla-calendar';

    calendarWrapper.appendChild(calendarElement);
    container.appendChild(calendarWrapper);

    // Create event indicators legend
    this.createEventLegend(container);

    // Initialize Vanilla Calendar
    this.calendar = new Calendar(calendarElement, {
      type: 'default',
      settings: {
        lang: 'en',
        iso8601: false,
        selection: {
          day: 'single',
          month: true,
          year: true
        },
        selected: {
          dates: [],
          month: new Date().getMonth(),
          year: new Date().getFullYear()
        },
        visibility: {
          theme: 'system',
          themeDetect: true,
          monthShort: true,
          weekNumbers: false,
          weekend: true,
          today: true,
          rangeDisabled: false
        },
        range: {
          min: '1970-01-01',
          max: '2030-12-31'
        }
      },
      actions: {
        clickDay: (event, self) => this.handleDayClick(event, self),
        changeMonth: (event, self) => this.handleMonthChange(event, self),
        changeYear: (event, self) => this.handleYearChange(event, self)
      }
    });

    // Initialize calendar
    this.calendar.init();

    // Add events to calendar
    this.updateCalendarEvents();

    // Set up reminders for meetings
    if (this.meetingsData && this.meetingsData.meetings) {
      reminderSystem.setReminders(this.meetingsData.meetings);
    }
  }

  /**
     * Create event type legend
     * @param {HTMLElement} container - Container element
     */
  createEventLegend(container) {
    const legend = document.createElement('div');
    legend.className = 'event-indicators';
    legend.innerHTML = `
            <div class="event-indicator">
                <div class="event-indicator-dot" style="background: var(--primary);"></div>
                <span>Business Meetings</span>
            </div>
            <div class="event-indicator">
                <div class="event-indicator-dot" style="background: var(--secondary);"></div>
                <span>Auctions</span>
            </div>
            <div class="event-indicator">
                <div class="event-indicator-dot" style="background: var(--success);"></div>
                <span>Social Events</span>
            </div>
            <div class="event-indicator">
                <div class="event-indicator-dot" style="background: #8e44ad;"></div>
                <span>Presentations</span>
            </div>
            <div class="event-indicator">
                <div class="event-indicator-dot" style="background: var(--danger);"></div>
                <span>Holidays</span>
            </div>
            <div class="event-indicator">
                <div class="event-indicator-dot" style="background: var(--warning);"></div>
                <span>Special Events</span>
            </div>
        `;

    container.appendChild(legend);
  }

  /**
     * Update calendar with events
     */
  updateCalendarEvents() {
    if (!this.calendar || !this.events.length) return;

    // Add event dots to dates
    this.addEventDots();
  }

  /**
     * Add event dots to calendar dates
     */
  addEventDots() {
    // Wait for calendar to render, then add event dots
    setTimeout(() => {
      const calendarDates = this.calendar.HTMLElement.querySelectorAll('.vc-date');

      calendarDates.forEach(dateElement => {
        const dateValue = dateElement.getAttribute('data-vc-date');
        if (!dateValue) return;

        // Find events for this date
        const dayEvents = this.events.filter(event => event.date === dateValue);

        if (dayEvents.length > 0) {
          // Remove existing event dots
          const existingDots = dateElement.querySelectorAll('.calendar-event');
          existingDots.forEach(dot => dot.remove());

          // Add event dots (max 3 visible)
          dayEvents.slice(0, 3).forEach((event, index) => {
            const eventDot = document.createElement('div');
            eventDot.className = `calendar-event event-${event.type}`;
            if (event.cancelled) {
              eventDot.classList.add('cancelled');
            }

            // Position multiple dots
            if (index === 1) {
              eventDot.style.right = '10px';
            } else if (index === 2) {
              eventDot.style.right = '18px';
            }

            dateElement.appendChild(eventDot);
          });

          // Make date clickable
          dateElement.style.cursor = 'pointer';
          dateElement.setAttribute('data-has-events', 'true');
        }
      });
    }, 100);
  }

  /**
     * Handle day click
     * @param {Event} event - Click event
     * @param {Object} self - Calendar instance
     */
  handleDayClick(event, self) {
    const clickedDate = event.target.getAttribute('data-vc-date');
    if (!clickedDate) return;

    // Find events for clicked date
    const dayEvents = this.events.filter(event => event.date === clickedDate);

    if (dayEvents.length > 0) {
      // If multiple events, show the first one or create a list
      if (dayEvents.length === 1) {
        // Find original meeting data
        const meeting = this.findMeetingById(dayEvents[0].id);
        if (meeting) {
          modal.open(meeting);
        }
      } else {
        // Multiple events - could show a selection modal or just the first
        const meeting = this.findMeetingById(dayEvents[0].id);
        if (meeting) {
          modal.open(meeting);
        }
      }
    }
  }

  /**
     * Handle month change
     * @param {Event} event - Change event
     * @param {Object} self - Calendar instance
     */
  handleMonthChange(event, self) {
    // Re-add event dots after month change
    setTimeout(() => {
      this.addEventDots();
    }, 100);
  }

  /**
     * Handle year change
     * @param {Event} event - Change event
     * @param {Object} self - Calendar instance
     */
  handleYearChange(event, self) {
    // Re-add event dots after year change
    setTimeout(() => {
      this.addEventDots();
    }, 100);
  }

  /**
     * Find meeting by ID
     * @param {string} id - Meeting ID
     * @returns {Object|null} Meeting object or null
     */
  findMeetingById(id) {
    if (!this.meetingsData || !this.meetingsData.meetings) return null;
    return this.meetingsData.meetings.find(meeting => meeting.id === id);
  }

  /**
     * Update calendar with new meeting data
     * @param {Object} meetingsData - New meetings data
     */
  updateMeetings(meetingsData) {
    this.meetingsData = meetingsData;
    this.events = calendarAdapter.convertToCalendarEvents(meetingsData);
    this.updateCalendarEvents();

    // Update reminders with new meeting data
    if (meetingsData && meetingsData.meetings) {
      reminderSystem.setReminders(meetingsData.meetings);
    }
  }

  /**
     * Show loading state
     */
  showLoading() {
    const container = document.getElementById(this.containerId);
    if (container) {
      container.innerHTML = '<div class="calendar-loading">Loading calendar...</div>';
    }
  }

  /**
     * Show error state
     * @param {string} message - Error message
     */
  showError(message) {
    const container = document.getElementById(this.containerId);
    if (container) {
      container.innerHTML = `
                <div class="calendar-error">
                    <h3>Calendar Error</h3>
                    <p>${message}</p>
                    <button onclick="location.reload()" class="btn btn-primary">Reload Page</button>
                </div>
            `;
    }
  }

  /**
     * Get upcoming events
     * @param {number} limit - Maximum number of events
     * @returns {Array} Upcoming events
     */
  getUpcomingEvents(limit = 5) {
    return calendarAdapter.getUpcomingEvents(this.events, limit);
  }

  /**
     * Get next meeting
     * @returns {Object|null} Next meeting or null
     */
  getNextMeeting() {
    return calendarAdapter.getNextMeeting(this.events);
  }

  /**
     * Destroy calendar instance
     */
  destroy() {
    if (this.calendar) {
      this.calendar.destroy();
      this.calendar = null;
    }
  }
}

// Export for use in main application
export default CalendarComponent;
