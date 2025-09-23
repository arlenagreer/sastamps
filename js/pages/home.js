/**
 * Home Page Bundle
 * Only includes functionality needed for the home page
 */

// Core utilities (will be tree-shaken if not used)
import { debounce } from '../utils/performance.js';
import { safeQuerySelector } from '../utils/safe-dom.js';

// Conditionally import calendar only if needed
async function initializeHomeCalendar() {
  const calendarContainer = safeQuerySelector('#calendar-preview');
  if (!calendarContainer) {
    return; // Calendar not needed on this page
  }

  try {
    // Dynamic import - only loads if calendar container exists
    const { calendarLazyLoader } = await import('../lazy-loader.js');
    const { Calendar } = await import('vanilla-calendar-pro');
    const { calendarAdapter } = await import('../calendar-adapter.js');

    // Initialize calendar with lazy loading
    calendarLazyLoader.observe(calendarContainer, async (element) => {
      const adapter = calendarAdapter();
      const calendar = new Calendar(element, {
        type: 'default',
        settings: {
          visibility: {
            daysOutside: false
          },
          selection: {
            day: false
          }
        }
      });

      await adapter.loadMeetings();
      calendar.init();

      return calendar;
    });

  } catch (error) {
    console.warn('Failed to initialize home calendar:', error);
  }
}

// Home-specific functionality
function initializeHomeFunctionality() {
  // Countdown timer (only on home page)
  const countdownElement = safeQuerySelector('#meeting-countdown');
  if (countdownElement) {
    initializeCountdownTimer(countdownElement);
  }

  // Quick stats (only on home page)
  const statsContainer = safeQuerySelector('#quick-stats');
  if (statsContainer) {
    loadQuickStats(statsContainer);
  }

  // Recent newsletters preview
  const newsletterPreview = safeQuerySelector('#newsletter-preview');
  if (newsletterPreview) {
    loadRecentNewsletters(newsletterPreview);
  }
}

// Countdown timer implementation
function initializeCountdownTimer(element) {
  const updateCountdown = debounce(async () => {
    try {
      const { default: meetingsData } = await import('../../data/meetings/meetings.json');
      const nextMeeting = findNextMeeting(meetingsData.meetings);

      if (nextMeeting) {
        const timeUntil = calculateTimeUntil(nextMeeting.date);
        element.innerHTML = formatCountdown(timeUntil);
      } else {
        element.innerHTML = '<p>No upcoming meetings scheduled</p>';
      }
    } catch (error) {
      console.warn('Failed to update countdown:', error);
      element.innerHTML = '<p>Upcoming meeting information unavailable</p>';
    }
  }, 1000);

  // Update immediately and then every minute
  updateCountdown();
  const interval = setInterval(updateCountdown, 60000);

  // Cleanup on navigation
  window.addEventListener('beforeunload', () => {
    clearInterval(interval);
  });
}

// Helper functions (tree-shaken if not used)
function findNextMeeting(meetings) {
  const now = new Date();
  return meetings
    .filter(meeting => new Date(meeting.date) > now)
    .sort((a, b) => new Date(a.date) - new Date(b.date))[0];
}

function calculateTimeUntil(dateString) {
  const now = new Date();
  const target = new Date(dateString);
  const diff = target - now;

  if (diff <= 0) return null;

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  return { days, hours, minutes };
}

function formatCountdown(time) {
  if (!time) return '<p>Meeting has started!</p>';

  const parts = [];
  if (time.days > 0) parts.push(`${time.days} day${time.days !== 1 ? 's' : ''}`);
  if (time.hours > 0) parts.push(`${time.hours} hour${time.hours !== 1 ? 's' : ''}`);
  if (time.minutes > 0) parts.push(`${time.minutes} minute${time.minutes !== 1 ? 's' : ''}`);

  return `<p>Next meeting in: <strong>${parts.join(', ')}</strong></p>`;
}

async function loadQuickStats(container) {
  try {
    const [meetingsData, newslettersData] = await Promise.all([
      import('../../data/meetings/meetings.json'),
      import('../../data/newsletters/newsletters.json')
    ]);

    const stats = {
      totalMeetings: meetingsData.default.meetings.length,
      totalNewsletters: newslettersData.default.newsletters.length,
      nextMeeting: findNextMeeting(meetingsData.default.meetings)
    };

    container.innerHTML = `
            <div class="stats-grid">
                <div class="stat-item">
                    <span class="stat-number">${stats.totalMeetings}</span>
                    <span class="stat-label">Total Meetings</span>
                </div>
                <div class="stat-item">
                    <span class="stat-number">${stats.totalNewsletters}</span>
                    <span class="stat-label">Newsletters</span>
                </div>
                <div class="stat-item">
                    <span class="stat-number">${stats.nextMeeting ? '1' : '0'}</span>
                    <span class="stat-label">Upcoming Meeting</span>
                </div>
            </div>
        `;
  } catch (error) {
    console.warn('Failed to load quick stats:', error);
    container.innerHTML = '<p>Statistics temporarily unavailable</p>';
  }
}

async function loadRecentNewsletters(container) {
  try {
    const { default: newslettersData } = await import('../../data/newsletters/newsletters.json');
    const recentNewsletters = newslettersData.newsletters
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 3);

    const html = recentNewsletters.map(newsletter => `
            <div class="newsletter-preview-item">
                <h4><a href="${newsletter.pdfUrl}" target="_blank">${newsletter.title}</a></h4>
                <p class="newsletter-date">${new Date(newsletter.date).toLocaleDateString()}</p>
                <p class="newsletter-summary">${newsletter.summary || 'Latest newsletter from SAPA'}</p>
            </div>
        `).join('');

    container.innerHTML = `
            <h3>Recent Newsletters</h3>
            <div class="newsletter-previews">${html}</div>
            <a href="newsletter.html" class="view-all-link">View All Newsletters →</a>
        `;
  } catch (error) {
    console.warn('Failed to load recent newsletters:', error);
    container.innerHTML = '<p>Recent newsletters temporarily unavailable</p>';
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initializeHomeFunctionality();
    initializeHomeCalendar();
  });
} else {
  initializeHomeFunctionality();
  initializeHomeCalendar();
}
