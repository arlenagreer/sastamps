/**
 * Calendar Data Adapter
 * Converts SAPA meeting data to Vanilla Calendar Pro format
 */

export class CalendarAdapter {
  constructor() {
    this.meetingsData = null;
    this.eventTypeStyles = {
      'business': {
        color: '#1a5276',
        bgColor: '#e8f4f8'
      },
      'auction': {
        color: '#d35400',
        bgColor: '#fdf2e8'
      },
      'social': {
        color: '#27ae60',
        bgColor: '#e8f8f0'
      },
      'regular': {
        color: '#8e44ad',
        bgColor: '#f3e8f8'
      },
      'holiday': {
        color: '#c0392b',
        bgColor: '#fdeaea'
      },
      'picnic': {
        color: '#f39c12',
        bgColor: '#fef9e7'
      }
    };
  }

  /**
   * Load meetings data from JSON file
   */
  async loadMeetings() {
    try {
      const response = await fetch('data/meetings/meetings.json');
      if (!response.ok) {
        throw new Error(`Failed to load meetings: ${response.status}`);
      }
      this.meetingsData = await response.json();
      return this.meetingsData;
    } catch (error) {
      console.error('Error loading meetings:', error);
      return null;
    }
  }

  /**
   * Get a meeting by date
   */
  getMeetingByDate(date) {
    if (!this.meetingsData || !this.meetingsData.meetings) {
      return null;
    }
    return this.meetingsData.meetings.find(meeting => meeting.date === date);
  }

  /**
     * Convert meetings data to calendar events
     * @param {Object} meetingsData - The meetings.json data
     * @returns {Array} Array of calendar events
     */
  convertToCalendarEvents(meetingsData) {
    if (!meetingsData || !meetingsData.meetings) {
      return [];
    }

    return meetingsData.meetings.map(meeting => this.convertMeetingToEvent(meeting));
  }

  /**
     * Convert single meeting to calendar event
     * @param {Object} meeting - Meeting data object
     * @returns {Object} Calendar event object
     */
  convertMeetingToEvent(meeting) {
    const eventDate = new Date(meeting.date);
    const styleConfig = this.eventTypeStyles[meeting.type] || this.eventTypeStyles['regular'];

    return {
      id: meeting.id,
      date: this.formatDateForCalendar(eventDate),
      summary: meeting.title,
      description: this.buildEventDescription(meeting),
      type: meeting.type,
      cancelled: meeting.cancelled || false,
      time: meeting.time,
      location: meeting.location,
      color: styleConfig.color,
      bgColor: styleConfig.bgColor,
      tags: meeting.tags || [],
      // Vanilla Calendar Pro specific properties
      HTMLContent: this.buildEventHTML(meeting),
      popover: {
        modifier: 'vc-red',
        html: this.buildPopoverHTML(meeting)
      }
    };
  }

  /**
     * Format date for Vanilla Calendar Pro
     * @param {Date} date - JavaScript Date object
     * @returns {string} Formatted date string (YYYY-MM-DD)
     */
  formatDateForCalendar(date) {
    return date.toISOString().split('T')[0];
  }

  /**
     * Build event description from meeting data
     * @param {Object} meeting - Meeting data object
     * @returns {string} Event description
     */
  buildEventDescription(meeting) {
    let description = meeting.description || '';

    if (meeting.presenter && meeting.presenter.name) {
      description += `\n\nPresenter: ${meeting.presenter.name}`;
    }

    if (meeting.specialNotes && meeting.specialNotes.length > 0) {
      description += `\n\nSpecial Notes:\n${meeting.specialNotes.join('\n')}`;
    }

    return description.trim();
  }

  /**
     * Build HTML content for calendar event display
     * @param {Object} meeting - Meeting data object
     * @returns {string} HTML content
     */
  buildEventHTML(meeting) {
    const timeDisplay = meeting.time ?
      `${meeting.time.doorsOpen || meeting.time.meetingStart}` : '';

    const statusClass = meeting.cancelled ? 'cancelled' : '';
    const typeClass = `event-${meeting.type}`;

    return `
            <div class="calendar-event ${typeClass} ${statusClass}">
                <div class="event-time">${timeDisplay}</div>
                <div class="event-title">${meeting.title}</div>
                ${meeting.cancelled ? '<div class="event-cancelled">CANCELLED</div>' : ''}
            </div>
        `;
  }

  /**
     * Build popover HTML for event details
     * @param {Object} meeting - Meeting data object
     * @returns {string} Popover HTML content
     */
  buildPopoverHTML(meeting) {
    const location = meeting.location ?
      `${meeting.location.name}<br>${meeting.location.address?.street}` :
      'Location TBD';

    const timeInfo = meeting.time ? `
            <strong>Schedule:</strong><br>
            Doors: ${meeting.time.doorsOpen}<br>
            Meeting: ${meeting.time.meetingStart} - ${meeting.time.meetingEnd}
        ` : '';

    const presenter = meeting.presenter ?
      `<br><strong>Presenter:</strong> ${meeting.presenter.name}` : '';

    const cancelledNote = meeting.cancelled ?
      '<div class="cancelled-notice"><strong>⚠️ CANCELLED</strong></div>' : '';

    return `
            <div class="meeting-popover">
                ${cancelledNote}
                <h4>${meeting.title}</h4>
                <div class="meeting-details">
                    <strong>Date:</strong> ${this.formatDisplayDate(new Date(meeting.date))}<br>
                    ${timeInfo}
                    <br><strong>Location:</strong><br>
                    ${location}
                    ${presenter}
                    <br><br>
                    <div class="meeting-description">
                        ${meeting.description || ''}
                    </div>
                </div>
            </div>
        `;
  }

  /**
     * Format date for display
     * @param {Date} date - JavaScript Date object
     * @returns {string} Formatted date string
     */
  formatDisplayDate(date) {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  /**
     * Get events for a specific month
     * @param {Array} events - Array of calendar events
     * @param {number} year - Year
     * @param {number} month - Month (0-based)
     * @returns {Array} Filtered events for the month
     */
  getEventsForMonth(events, year, month) {
    return events.filter(event => {
      const eventDate = new Date(event.date);
      return eventDate.getFullYear() === year && eventDate.getMonth() === month;
    });
  }

  /**
     * Get upcoming events
     * @param {Array} events - Array of calendar events
     * @param {number} limit - Maximum number of events to return
     * @returns {Array} Upcoming events
     */
  getUpcomingEvents(events, limit = 5) {
    const now = new Date();
    const upcoming = events
      .filter(event => {
        const eventDate = new Date(event.date);
        return eventDate >= now && !event.cancelled;
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, limit);

    return upcoming;
  }

  /**
     * Get next meeting
     * @param {Array} events - Array of calendar events
     * @returns {Object|null} Next meeting or null if none found
     */
  getNextMeeting(events) {
    const upcoming = this.getUpcomingEvents(events, 1);
    return upcoming.length > 0 ? upcoming[0] : null;
  }

  /**
     * Filter events by type
     * @param {Array} events - Array of calendar events
     * @param {string} type - Event type to filter by
     * @returns {Array} Filtered events
     */
  filterEventsByType(events, type) {
    return events.filter(event => event.type === type);
  }

  /**
     * Get event statistics
     * @param {Array} events - Array of calendar events
     * @returns {Object} Statistics object
     */
  getEventStatistics(events) {
    const stats = {
      total: events.length,
      byType: {},
      upcoming: 0,
      cancelled: 0
    };

    const now = new Date();

    events.forEach(event => {
      // Count by type
      stats.byType[event.type] = (stats.byType[event.type] || 0) + 1;

      // Count upcoming
      if (new Date(event.date) >= now && !event.cancelled) {
        stats.upcoming++;
      }

      // Count cancelled
      if (event.cancelled) {
        stats.cancelled++;
      }
    });

    return stats;
  }
}

// Export singleton instance and factory function
export const calendarAdapter = new CalendarAdapter();

// Export factory function for backward compatibility
export default function createCalendarAdapter() {
  return new CalendarAdapter();
}
