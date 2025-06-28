/**
 * Calendar Adapter Test
 * Test the calendar data adapter functionality
 */

import { CalendarAdapter } from './calendar-adapter.js';

// Sample meeting data for testing
const sampleMeetingData = {
    "meetings": [
        {
            "id": "2025-07-11",
            "date": "2025-07-11",
            "time": {
                "doorsOpen": "6:30 PM",
                "meetingStart": "7:00 PM",
                "meetingEnd": "9:00 PM"
            },
            "location": {
                "name": "MacArthur Park Lutheran Church",
                "building": "Building 1",
                "room": "Fellowship Hall",
                "address": {
                    "street": "13030 Jones Maltsberger Road",
                    "city": "San Antonio",
                    "state": "TX",
                    "zipCode": "78247"
                }
            },
            "type": "business",
            "title": "Board of Governors Meeting & Show and Tell",
            "topic": "Monthly club business and member presentations",
            "description": "Monthly Board of Governors meeting followed by member show and tell presentations.",
            "cancelled": false,
            "tags": ["bog", "business", "show-and-tell"]
        },
        {
            "id": "2025-07-04",
            "date": "2025-07-04",
            "time": {
                "doorsOpen": "6:30 PM",
                "meetingStart": "7:00 PM",
                "meetingEnd": "9:00 PM"
            },
            "type": "holiday",
            "title": "No Meeting - Independence Day",
            "description": "No meeting scheduled due to Independence Day holiday.",
            "cancelled": true,
            "tags": ["holiday", "independence-day"]
        }
    ]
};

// Test the adapter
function testCalendarAdapter() {
    console.log('Testing Calendar Adapter...\n');
    
    const adapter = new CalendarAdapter();
    
    // Test event conversion
    console.log('1. Converting meetings to calendar events:');
    const events = adapter.convertToCalendarEvents(sampleMeetingData);
    console.log(`   Converted ${events.length} events`);
    
    // Test individual event
    if (events.length > 0) {
        console.log('\n2. Sample event structure:');
        console.log('   Event ID:', events[0].id);
        console.log('   Date:', events[0].date);
        console.log('   Title:', events[0].summary);
        console.log('   Type:', events[0].type);
        console.log('   Color:', events[0].color);
    }
    
    // Test upcoming events
    console.log('\n3. Getting upcoming events:');
    const upcoming = adapter.getUpcomingEvents(events);
    console.log(`   Found ${upcoming.length} upcoming events`);
    
    // Test statistics
    console.log('\n4. Event statistics:');
    const stats = adapter.getEventStatistics(events);
    console.log('   Total events:', stats.total);
    console.log('   By type:', stats.byType);
    console.log('   Upcoming:', stats.upcoming);
    console.log('   Cancelled:', stats.cancelled);
    
    // Test next meeting
    console.log('\n5. Next meeting:');
    const nextMeeting = adapter.getNextMeeting(events);
    if (nextMeeting) {
        console.log('   Next meeting:', nextMeeting.summary);
        console.log('   Date:', nextMeeting.date);
    } else {
        console.log('   No upcoming meetings found');
    }
    
    console.log('\n✅ Calendar Adapter test completed successfully!');
    return events;
}

/**
 * Test modal functionality
 */
function testModal() {
    console.log('\nTesting Modal functionality...\n');
    
    import('./modal.js').then(({ modal }) => {
        // Test with sample meeting data
        const sampleMeeting = sampleMeetingData.meetings[0];
        
        console.log('Opening modal with sample meeting:', sampleMeeting.title);
        
        // Add a test button to open modal
        const testButton = document.createElement('button');
        testButton.textContent = 'Test Modal';
        testButton.className = 'btn btn-primary';
        testButton.style.margin = '10px';
        testButton.onclick = () => modal.open(sampleMeeting);
        
        document.body.appendChild(testButton);
        
        console.log('✅ Modal test button added to page');
    });
}

/**
 * Test calendar component
 */
function testCalendarComponent() {
    console.log('\nTesting Calendar Component...\n');
    
    // Create test container
    const testContainer = document.createElement('div');
    testContainer.id = 'test-calendar';
    testContainer.style.margin = '20px';
    
    const title = document.createElement('h3');
    title.textContent = 'Test Calendar Component';
    testContainer.appendChild(title);
    
    const calendarDiv = document.createElement('div');
    calendarDiv.id = 'calendar-test-container';
    testContainer.appendChild(calendarDiv);
    
    document.body.appendChild(testContainer);
    
    // Import and test calendar component
    import('./calendar-component.js').then(({ default: CalendarComponent }) => {
        const calendar = new CalendarComponent('calendar-test-container', sampleMeetingData);
        console.log('✅ Calendar component test initialized');
    });
}

/**
 * Test reminder system functionality
 */
function testReminderSystem() {
    console.log('\nTesting Reminder System...\n');
    
    import('./reminder-system.js').then(({ reminderSystem }) => {
        console.log('1. Reminder system stats:');
        const stats = reminderSystem.getStats();
        console.log('   Enabled:', stats.enabled);
        console.log('   Total reminders:', stats.totalReminders);
        console.log('   Active reminders:', stats.activeReminders);
        console.log('   Scheduled timers:', stats.scheduledTimers);
        
        console.log('\n2. Setting up reminders for sample meetings:');
        reminderSystem.setReminders(sampleMeetingData.meetings);
        
        const newStats = reminderSystem.getStats();
        console.log('   After setup - Total reminders:', newStats.totalReminders);
        console.log('   After setup - Active reminders:', newStats.activeReminders);
        
        // Create reminder settings UI container for testing
        const testContainer = document.createElement('div');
        testContainer.id = 'reminder-test-container';
        testContainer.style.margin = '20px';
        testContainer.style.padding = '20px';
        testContainer.style.border = '1px solid #ccc';
        testContainer.style.borderRadius = '5px';
        
        const title = document.createElement('h3');
        title.textContent = 'Test Reminder System';
        testContainer.appendChild(title);
        
        const settingsDiv = document.createElement('div');
        settingsDiv.id = 'reminder-settings-container';
        testContainer.appendChild(settingsDiv);
        
        document.body.appendChild(testContainer);
        
        // Initialize UI
        reminderSystem.createReminderUI();
        
        console.log('✅ Reminder system test completed successfully!');
    });
}

// Export for use in main application
export { testCalendarAdapter, testModal, testCalendarComponent, testReminderSystem, sampleMeetingData };