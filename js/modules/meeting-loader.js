/**
 * Meeting Data Loader Module
 * Handles loading and rendering meeting data from JSON
 */

import { escapeHTML } from '../utils/safe-dom.js';
import { createLogger } from '../utils/logger.js';
import { fetchJSON } from '../utils/fetch-json.js';

const logger = createLogger('MeetingLoader');

/**
 * Days before a quarter ends at which the schedule rolls over to show the
 * next quarter, so members can see upcoming meetings as they are planned.
 */
export const QUARTER_ADVANCE_DAYS = 14;

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * First and last day (local midnight) of a calendar quarter.
 * @param {number} year
 * @param {number} quarter - 1-4
 * @returns {{start: Date, end: Date}}
 */
export function getQuarterBounds(year, quarter) {
  const firstMonth = (quarter - 1) * 3;
  return {
    start: new Date(year, firstMonth, 1),
    end: new Date(year, firstMonth + 3, 0)
  };
}

/**
 * Parse a 'Qn-YYYY' string (e.g. 'Q4-2026').
 * @param {string} value
 * @returns {{year: number, quarter: number}|null}
 */
export function parseQuarter(value) {
  const match = /^Q([1-4])-(\d{4})$/i.exec(String(value ?? '').trim());
  return match ? { year: Number(match[2]), quarter: Number(match[1]) } : null;
}

function quarterOf(date) {
  return { year: date.getFullYear(), quarter: Math.floor(date.getMonth() / 3) + 1 };
}

function nextQuarter({ year, quarter }) {
  return quarter === 4 ? { year: year + 1, quarter: 1 } : { year, quarter: quarter + 1 };
}

/**
 * The quarter the schedule should show on a given day: the current quarter,
 * or the next one once we are within QUARTER_ADVANCE_DAYS of its end.
 * @param {Date} [now]
 * @returns {{year: number, quarter: number}}
 */
export function getDisplayQuarter(now = new Date()) {
  const current = quarterOf(now);
  const { end } = getQuarterBounds(current.year, current.quarter);
  const daysUntilQuarterEnd = (end - now) / MS_PER_DAY;
  return daysUntilQuarterEnd <= QUARTER_ADVANCE_DAYS ? nextQuarter(current) : current;
}

function isInQuarter(meeting, { year, quarter }) {
  const { start, end } = getQuarterBounds(year, quarter);
  const meetingDate = new Date(`${meeting.date}T00:00:00`);
  return meetingDate >= start && meetingDate <= end;
}

/**
 * Filter meetings to one quarter, sorted chronologically.
 * @param {Array<{date: string}>} meetings
 * @param {{year: number, quarter: number}} quarter
 */
export function meetingsInQuarter(meetings, quarter) {
  return (meetings || [])
    .filter(meeting => isInQuarter(meeting, quarter))
    .sort((a, b) => new Date(`${a.date}T00:00:00`) - new Date(`${b.date}T00:00:00`));
}

/**
 * The quarter to render: getDisplayQuarter(), except that an early rollover
 * falls back to the current quarter while the next quarter's schedule has not
 * been posted yet (so the page never goes blank at a quarter boundary).
 * @param {Array<{date: string}>} meetings
 * @param {Date} [now]
 * @returns {{year: number, quarter: number}}
 */
export function selectScheduleQuarter(meetings, now = new Date()) {
  const display = getDisplayQuarter(now);
  const current = quarterOf(now);
  const rolledOver = display.year !== current.year || display.quarter !== current.quarter;
  if (rolledOver && meetingsInQuarter(meetings, display).length === 0) {
    return current;
  }
  return display;
}

class MeetingLoader {
  constructor(options = {}) {
    this.dataUrl = options.dataUrl || 'data/meetings/meetings.json';
    this.meetings = [];
    this.metadata = {};
    this.isLoaded = false;
    this.isLoading = false;

    this.callbacks = {
      onLoad: options.onLoad || (() => {}),
      onError: options.onError || ((error) => logger.error('Meeting loader error:', error))
    };
  }

  /**
     * Load meeting data from JSON
     */
  async loadData() {
    if (this.isLoaded || this.isLoading) {
      return { meetings: this.meetings, metadata: this.metadata };
    }

    this.isLoading = true;

    try {
      // Loading meeting data

      const data = await fetchJSON(this.dataUrl);

      this.meetings = data.meetings || [];
      this.metadata = data.metadata || {};
      this.isLoaded = true;
      this.isLoading = false;

      // Meeting data loaded successfully
      this.callbacks.onLoad(data);

      return data;

    } catch (error) {
      this.isLoading = false;
      logger.error('Failed to load meeting data:', error);
      this.callbacks.onError(error);
      throw error;
    }
  }

  /**
     * Filter meetings by date range
     */
  filterMeetingsByDateRange(startDate, endDate) {
    if (!this.isLoaded) {
      logger.warn('Meeting data not loaded yet');
      return [];
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    return this.meetings.filter(meeting => {
      const meetingDate = new Date(`${meeting.date  }T00:00:00`);
      return meetingDate >= start && meetingDate <= end;
    }).sort((a, b) => new Date(`${a.date  }T00:00:00`) - new Date(`${b.date  }T00:00:00`));
  }

  /**
     * Get meetings for one quarter
     * @param {{year: number, quarter: number}} quarter
     */
  getMeetingsForQuarter(quarter) {
    if (!this.isLoaded) {
      logger.warn('Meeting data not loaded yet');
      return [];
    }
    return meetingsInQuarter(this.meetings, quarter);
  }

  /**
     * Resolve a 'Qn-YYYY' dateRange option; anything else (including
     * omitting it) means the quarter the schedule should show today.
     */
  resolveQuarter(dateRange) {
    return parseQuarter(dateRange) || selectScheduleQuarter(this.meetings);
  }

  /**
     * Group meetings by month
     */
  groupMeetingsByMonth(meetings) {
    const grouped = {};

    meetings.forEach(meeting => {
      const date = new Date(`${meeting.date  }T00:00:00`);
      const monthKey = date.toISOString().slice(0, 7); // YYYY-MM format
      const monthName = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

      if (!grouped[monthKey]) {
        grouped[monthKey] = {
          name: monthName,
          meetings: []
        };
      }

      grouped[monthKey].meetings.push(meeting);
    });

    return grouped;
  }

  /**
     * Format meeting type for display
     */
  formatMeetingType(meeting) {
    if (meeting.cancelled) {
      return 'NO MEETING';
    }

    switch (meeting.type) {
    case 'business':
      return 'BOG; Show & Tell';
    case 'auction':
      return 'Auction';
    case 'social':
      return 'Bourse';
    case 'regular':
      return meeting.presenter ? `Program: ${meeting.title}` : 'Program';
    case 'picnic':
      return 'Annual Picnic';
    case 'holiday':
      return 'NO MEETING';
    default:
      return meeting.title || 'Meeting';
    }
  }

  /**
     * Get meeting details text
     */
  getMeetingDetails(meeting) {
    if (meeting.cancelled) {
      // Extract holiday name from title or tags
      if (meeting.title && meeting.title.includes('Independence Day')) {
        return 'Independence Day';
      } else if (meeting.title && meeting.title.includes('Labor Day')) {
        return 'Labor Day';
      } else if (meeting.tags && meeting.tags.includes('holiday')) {
        return 'Holiday';
      }
      return '';
    }

    if (meeting.type === 'regular' && meeting.presenter) {
      return `by ${meeting.presenter.name}`;
    }

    if (meeting.type === 'picnic') {
      return meeting.location?.name || '';
    }

    return '';
  }

  /**
     * Generate calendar download link
     */
  generateCalendarLink(meeting) {
    // Use the existing .ics files if they match the pattern
    const dateStr = meeting.date; // YYYY-MM-DD format
    const calendarFile = `data/calendar/${dateStr}-meeting.ics`;

    return calendarFile;
  }

  /**
     * Render meetings table
     */
  renderMeetingsTable(container, options = {}) {
    const {
      dateRange,
      showCalendarLinks = true,
      _responsive = true
    } = options;

    if (typeof container === 'string') {
      container = document.querySelector(container);
    }

    if (!container) {
      throw new Error('Meetings container not found');
    }

    if (!this.isLoaded) {
      container.innerHTML = '<div class="loading">Loading meeting schedule...</div>';
      return;
    }

    const quarter = this.resolveQuarter(dateRange);
    const groupedMeetings = this.groupMeetingsByMonth(this.getMeetingsForQuarter(quarter));

    // Generate table HTML
    const tableHTML = this.generateTableHTML(groupedMeetings, showCalendarLinks, quarter);

    container.innerHTML = tableHTML;
  }

  /**
     * Generate the meeting table HTML
     */
  generateTableHTML(groupedMeetings, showCalendarLinks, quarter = selectScheduleQuarter(this.meetings)) {
    // The quarter's three months, as YYYY-MM keys and display names
    const { year } = quarter;
    const firstMonth = (quarter.quarter - 1) * 3;
    const months = [0, 1, 2].map(i => `${year}-${String(firstMonth + i + 1).padStart(2, '0')}`);
    const monthNames = [0, 1, 2].map(i =>
      new Date(year, firstMonth + i, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    );

    let html = `
            <table class="meeting-table" style="width: 100%; border-collapse: collapse; font-family: var(--font-body); border-radius: var(--radius-md); overflow: hidden; box-shadow: var(--shadow-sm);">
                <thead>
                    <tr style="background-color: var(--primary); color: white; text-align: center;">
                        ${monthNames.map(month => `<th style="padding: 1rem; font-size: 1.1rem; background-color: var(--primary-dark); color: var(--accent); font-weight: 700; text-shadow: 0 1px 2px rgba(0,0,0,0.3); width: 33.33%; text-align: center;">${escapeHTML(month)}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
        `;

    // Get the maximum number of meetings in any month to determine rows needed
    const maxMeetings = Math.max(...months.map(month =>
      groupedMeetings[month] ? groupedMeetings[month].meetings.length : 0
    ));

    // Create rows for each week/meeting
    for (let i = 0; i < maxMeetings; i++) {
      const isEvenRow = i % 2 === 0;
      const rowStyle = isEvenRow ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.6)';
      html += `<tr style="background-color: ${rowStyle};">`;

      months.forEach(month => {
        const monthData = groupedMeetings[month];
        const meeting = monthData && monthData.meetings[i];

        if (meeting) {
          html += this.generateMeetingCell(meeting, showCalendarLinks);
        } else {
          html += '<td style="padding: 0.75rem; border: 1px solid #ddd;"></td>';
        }
      });

      html += '</tr>';
    }

    html += `
                </tbody>
            </table>
        `;

    return html;
  }

  /**
     * Generate individual meeting cell HTML
     */
  generateMeetingCell(meeting, showCalendarLinks) {
    const date = new Date(`${meeting.date  }T00:00:00`);
    const dayOfMonth = date.getDate();
    const meetingType = this.formatMeetingType(meeting);
    const details = this.getMeetingDetails(meeting);
    const isCancelled = meeting.cancelled;
    const calendarLink = showCalendarLinks ? this.generateCalendarLink(meeting) : null;

    // Determine cell styling based on meeting type
    let cellStyle = 'padding: 0.75rem; border: 1px solid #ddd;';
    if (isCancelled) {
      cellStyle += ' font-weight: bold; color: var(--primary);';
    }

    // Build meeting text with proper formatting
    let meetingText = `${dayOfMonth} ${escapeHTML(meetingType)}`;
    if (details && !isCancelled) {
      if (meeting.type === 'regular' && meeting.presenter) {
        // Program meetings with presenter details
        meetingText += `<br><span style="font-size: 0.9rem;">"${escapeHTML(meeting.title)}" by ${escapeHTML(meeting.presenter.name)}</span>`;
      } else if (details.includes('Day')) {
        // Holiday details
        meetingText += `<br><span style="font-size: 0.9rem; font-weight: normal;">${escapeHTML(details.replace(/[()]/g, ''))}</span>`;
      }
    }

    return `
            <td style="${cellStyle}">
                <div class="meeting-entry">
                    <span>${meetingText}</span>
                    ${calendarLink && !isCancelled ? `
                        <a href="${escapeHTML(calendarLink)}" class="calendar-link" download>
                            <i class="fas fa-calendar-plus" title="Add to Calendar"></i>
                        </a>
                    ` : ''}
                </div>
            </td>
        `;
  }

  /**
     * Render meeting list view (alternative to table)
     */
  renderMeetingsList(container, options = {}) {
    const {
      dateRange,
      showDetails = true,
      groupByMonth = true
    } = options;

    if (typeof container === 'string') {
      container = document.querySelector(container);
    }

    if (!container) {
      throw new Error('Meetings container not found');
    }

    if (!this.isLoaded) {
      container.innerHTML = '<div class="loading">Loading meetings...</div>';
      return;
    }

    const quarterMeetings = this.getMeetingsForQuarter(this.resolveQuarter(dateRange));

    let html = '<div class="meetings-list">';

    if (groupByMonth) {
      const groupedMeetings = this.groupMeetingsByMonth(quarterMeetings);

      Object.keys(groupedMeetings).sort().forEach(monthKey => {
        const monthData = groupedMeetings[monthKey];
        html += `
                    <div class="month-section">
                        <h3 class="month-header">${escapeHTML(monthData.name)}</h3>
                        <div class="month-meetings">
                            ${monthData.meetings.map(meeting => this.renderMeetingCard(meeting, showDetails)).join('')}
                        </div>
                    </div>
                `;
      });
    } else {
      html += quarterMeetings.map(meeting => this.renderMeetingCard(meeting, showDetails)).join('');
    }

    html += '</div>';

    container.innerHTML = html;
  }

  /**
     * Render individual meeting card
     */
  renderMeetingCard(meeting, showDetails) {
    const date = new Date(`${meeting.date  }T00:00:00`);
    const formattedDate = date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const meetingType = this.formatMeetingType(meeting);
    const details = this.getMeetingDetails(meeting);
    const calendarLink = this.generateCalendarLink(meeting);

    let cardClass = 'meeting-card';
    if (meeting.cancelled) {
      cardClass += ' cancelled';
    } else if (meeting.type === 'regular') {
      cardClass += ' special-program';
    }

    return `
            <div class="${cardClass}">
                <div class="meeting-header">
                    <div class="meeting-date">${escapeHTML(formattedDate)}</div>
                    <div class="meeting-time">
                        ${meeting.time?.doorsOpen ? `Doors: ${escapeHTML(meeting.time.doorsOpen)}` : ''}
                        ${meeting.time?.meetingStart ? ` | Meeting: ${escapeHTML(meeting.time.meetingStart)}` : ''}
                    </div>
                </div>
                <div class="meeting-content">
                    <h4 class="meeting-title">${escapeHTML(meetingType)}</h4>
                    ${details ? `<p class="meeting-details">${escapeHTML(details)}</p>` : ''}
                    ${showDetails && meeting.description ? `<p class="meeting-description">${escapeHTML(meeting.description)}</p>` : ''}
                    ${meeting.tags && meeting.tags.length > 0 ? `
                        <div class="meeting-tags">
                            ${meeting.tags.map(tag => `<span class="tag">${escapeHTML(this.formatLabel(tag))}</span>`).join('')}
                        </div>
                    ` : ''}
                </div>
                ${!meeting.cancelled ? `
                    <div class="meeting-actions">
                        <a href="${escapeHTML(calendarLink)}" class="btn btn-sm btn-outline" download>
                            <i class="fas fa-calendar-plus"></i> Add to Calendar
                        </a>
                    </div>
                ` : ''}
            </div>
        `;
  }

  /**
     * Format label for display
     */
  formatLabel(value) {
    return value
      .replace(/-/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  }

  /**
     * Add meeting styles
     */
  static addStyles() {
    if (document.getElementById('meeting-loader-styles')) {return;}

    const styles = `
            .meetings-list {
                margin: 2rem 0;
            }

            .month-section {
                margin-bottom: 3rem;
            }

            .month-header {
                color: var(--primary, #1a5276);
                border-bottom: 2px solid var(--primary, #1a5276);
                padding-bottom: 0.5rem;
                margin-bottom: 1.5rem;
            }

            .month-meetings {
                display: grid;
                gap: 1rem;
            }

            .meeting-card {
                background: var(--white, #fff);
                border: 1px solid var(--light, #ecf0f1);
                border-radius: var(--radius-md, 5px);
                padding: 1.5rem;
                transition: all var(--transition-fast, 0.15s ease);
            }

            .meeting-card:hover {
                box-shadow: var(--shadow-md, 0 4px 6px rgba(0,0,0,0.1));
                transform: translateY(-2px);
            }

            .meeting-card.cancelled {
                background-color: #f8f9fa;
                border-left: 4px solid var(--medium, #7f8c8d);
                opacity: 0.7;
            }

            .meeting-card.special-program {
                border-left: 4px solid var(--accent, #f1c40f);
            }

            .meeting-header {
                margin-bottom: 1rem;
            }

            .meeting-date {
                font-size: 1.1rem;
                font-weight: 600;
                color: var(--primary, #1a5276);
            }

            .meeting-time {
                font-size: 0.9rem;
                color: var(--medium, #7f8c8d);
                margin-top: 0.25rem;
            }

            .meeting-title {
                margin: 0 0 0.5rem 0;
                color: var(--dark, #2c3e50);
                font-size: 1.2rem;
            }

            .meeting-details {
                color: var(--medium, #7f8c8d);
                font-style: italic;
                margin-bottom: 0.5rem;
            }

            .meeting-description {
                line-height: 1.6;
                margin-bottom: 1rem;
            }

            .meeting-tags {
                margin-bottom: 1rem;
            }

            .meeting-tags .tag {
                display: inline-block;
                background: var(--accent, #f1c40f);
                color: var(--dark, #2c3e50);
                padding: 0.25rem 0.5rem;
                margin: 0.125rem;
                border-radius: var(--radius-sm, 3px);
                font-size: 0.8rem;
            }

            .meeting-actions {
                border-top: 1px solid var(--light, #ecf0f1);
                padding-top: 1rem;
                margin-top: 1rem;
            }

            .btn-sm {
                padding: 0.5rem 1rem;
                font-size: 0.9rem;
            }

            .btn-outline {
                background: transparent;
                border: 1px solid var(--primary, #1a5276);
                color: var(--primary, #1a5276);
            }

            .btn-outline:hover {
                background: var(--primary, #1a5276);
                color: var(--white, #fff);
            }

            .calendar-downloads {
                margin-top: 2rem;
                padding: 1.5rem;
                background-color: var(--light, #ecf0f1);
                border-radius: var(--radius-md, 5px);
                text-align: center;
            }

            .calendar-downloads h4 {
                margin-top: 0;
                color: var(--primary, #1a5276);
            }

            .calendar-note {
                margin-top: 1rem;
                color: var(--medium, #7f8c8d);
            }

            .meeting-entry.cancelled {
                opacity: 0.6;
                color: var(--medium, #7f8c8d);
            }

            .meeting-entry.special-program {
                background-color: #fff9c4;
                border-left: 3px solid var(--accent, #f1c40f);
                padding-left: 0.5rem;
            }

            .meeting-date-type {
                margin-bottom: 0.25rem;
            }

            .calendar-link {
                margin-top: 0.5rem;
            }

            .calendar-link a {
                color: var(--primary, #1a5276);
                text-decoration: none;
                font-size: 1.1rem;
            }

            .calendar-link a:hover {
                color: var(--primary-light, #2980b9);
            }

            .loading {
                text-align: center;
                padding: 3rem;
                color: var(--medium, #7f8c8d);
                font-size: 1.1rem;
            }

            /* Mobile responsive */
            @media (max-width: 768px) {
                .meeting-card {
                    padding: 1rem;
                }
                
                .meeting-header {
                    margin-bottom: 0.75rem;
                }
                
                .meeting-date {
                    font-size: 1rem;
                }
                
                .meeting-time {
                    font-size: 0.8rem;
                }
            }
        `;

    const styleSheet = document.createElement('style');
    styleSheet.id = 'meeting-loader-styles';
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
  }
}

// Add default styles when module loads
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => MeetingLoader.addStyles());
  } else {
    MeetingLoader.addStyles();
  }
}

// Export for module usage
export default MeetingLoader;

// Also attach to window for global access
if (typeof window !== 'undefined') {
  window.MeetingLoader = MeetingLoader;
}
