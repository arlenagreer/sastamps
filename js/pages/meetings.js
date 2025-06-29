/**
 * Meetings Page Bundle
 * Only includes functionality needed for the meetings page
 */

import { debounce } from '../utils/performance.js';
import { safeQuerySelector } from '../utils/safe-dom.js';
import { addEventListenerWithCleanup } from '../utils/event-cleanup.js';

// Meetings-specific functionality
async function initializeMeetingsPage() {
    // Calendar is essential for meetings page - always load
    await initializeMeetingsCalendar();
    
    // Meeting list/grid view
    const meetingsList = safeQuerySelector('#meetings-list');
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
    const calendarContainer = safeQuerySelector('#meetings-calendar');
    if (!calendarContainer) {
        console.warn('Calendar container not found on meetings page');
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
        const adapter = calendarAdapter();
        await adapter.loadMeetings();
        
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
                    min: '2024-01-01',
                    max: '2026-12-31'
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
        
        console.log('Meetings calendar initialized successfully');
        
    } catch (error) {
        console.error('Failed to initialize meetings calendar:', error);
        calendarContainer.innerHTML = `
            <div class="error-message">
                <p>Calendar temporarily unavailable. Please try refreshing the page.</p>
                <button onclick="location.reload()">Refresh Page</button>
            </div>
        `;
    }
}

async function loadMeetingsList(container) {
    try {
        const { default: meetingsData } = await import('../../data/meetings/meetings.json');
        const meetings = meetingsData.meetings
            .sort((a, b) => new Date(b.date) - new Date(a.date));
        
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
        console.error('Failed to load meetings list:', error);
        container.innerHTML = '<p class="error-message">Unable to load meetings. Please try again later.</p>';
    }
}

function initializeMeetingFilters(container) {
    const currentYear = new Date().getFullYear();
    const years = [currentYear - 1, currentYear, currentYear + 1];
    
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
                <option value="">All Types</option>
                <option value="regular">Regular Meetings</option>
                <option value="special">Special Events</option>
                <option value="social">Social Events</option>
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
    }, 300);
    
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

function bindMeetingActions(container) {
    // RSVP buttons
    const rsvpButtons = container.querySelectorAll('.btn-rsvp');
    rsvpButtons.forEach(button => {
        addEventListenerWithCleanup(button, 'click', (e) => {
            const meetingId = e.target.dataset.meetingId;
            handleRSVP(meetingId, button);
        });
    });
    
    // Reminder buttons
    const reminderButtons = container.querySelectorAll('.btn-reminder');
    reminderButtons.forEach(button => {
        addEventListenerWithCleanup(button, 'click', async (e) => {
            const meetingId = e.target.dataset.meetingId;
            const { reminderSystem } = await import('../reminder-system.js');
            reminderSystem.setReminder(meetingId);
            
            button.textContent = 'Reminder Set!';
            button.disabled = true;
            setTimeout(() => {
                button.textContent = 'Set Reminder';
                button.disabled = false;
            }, 2000);
        });
    });
}

function initializeRSVPSystem() {
    // RSVP system using localStorage for now
    window.handleRSVP = function(meetingId, button) {
        const rsvps = JSON.parse(localStorage.getItem('meeting_rsvps') || '{}');
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
        
        localStorage.setItem('meeting_rsvps', JSON.stringify(rsvps));
        
        // Show confirmation
        const confirmation = document.createElement('div');
        confirmation.className = 'rsvp-confirmation';
        confirmation.textContent = hasRSVPed ? 'RSVP cancelled' : 'Thanks for your RSVP!';
        button.parentNode.appendChild(confirmation);
        
        setTimeout(() => {
            confirmation.remove();
        }, 3000);
    };
    
    // Load existing RSVPs
    const rsvps = JSON.parse(localStorage.getItem('meeting_rsvps') || '{}');
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