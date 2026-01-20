/**
 * Meeting Reminder System
 * Provides opt-in localStorage-based reminders for upcoming SAPA meetings
 */

import {
  REMINDER,
  TIMING,
  STORAGE_KEYS,
  CSS_CLASSES,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES
} from './constants/index.js';
import { createLogger } from './utils/logger.js';

const logger = createLogger('ReminderSystem');

export class ReminderSystem {
  constructor() {
    this.storageKey = STORAGE_KEYS.MEETING_REMINDERS;
    this.settingsKey = STORAGE_KEYS.REMINDER_SETTINGS;
    this.reminderTimers = new Map();
    this.defaultSettings = {
      enabled: false,
      reminderTimes: REMINDER.DEFAULT_TIMES,
      showBrowserNotifications: false,
      playSound: false
    };
    this.init();
  }

  /**
     * Initialize reminder system
     */
  init() {
    this.loadSettings();
    this.checkPermissions();
    this.scheduleReminders();
    this.createReminderUI();

    // Check for due reminders every minute
    setInterval(() => this.checkDueReminders(), TIMING.REMINDER_CHECK_INTERVAL);

    // Reminder system initialized
  }

  /**
     * Load user settings from localStorage
     */
  loadSettings() {
    try {
      const saved = localStorage.getItem(this.settingsKey);
      this.settings = saved ? { ...this.defaultSettings, ...JSON.parse(saved) } : { ...this.defaultSettings };
    } catch (error) {
      logger.warn('Error loading reminder settings:', error);
      this.settings = { ...this.defaultSettings };
    }
  }

  /**
     * Save settings to localStorage
     */
  saveSettings() {
    try {
      localStorage.setItem(this.settingsKey, JSON.stringify(this.settings));
    } catch (error) {
      logger.warn('Error saving reminder settings:', error);
    }
  }

  /**
     * Check browser notification permissions
     */
  async checkPermissions() {
    if ('Notification' in window) {
      if (Notification.permission === 'default') {
        this.settings.showBrowserNotifications = false;
      } else if (Notification.permission === 'granted') {
        // Permission already granted
      } else {
        this.settings.showBrowserNotifications = false;
      }
    } else {
      this.settings.showBrowserNotifications = false;
    }
  }

  /**
     * Request notification permission
     */
  async requestNotificationPermission() {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      this.settings.showBrowserNotifications = permission === 'granted';
      this.saveSettings();
      return permission === 'granted';
    }
    return false;
  }

  /**
     * Set reminders for meetings
     * @param {Array} meetings - Array of meeting objects
     */
  setReminders(meetings) {
    if (!this.settings.enabled) return;

    // Clear existing timers
    this.clearAllReminders();

    const now = new Date();
    const reminders = [];

    meetings.forEach(meeting => {
      if (meeting.cancelled) return;

      const meetingDate = new Date(meeting.date + 'T00:00:00');

      // Parse meeting time
      if (meeting.time && meeting.time.meetingStart) {
        const [time, period] = meeting.time.meetingStart.split(' ');
        const [hours, minutes] = time.split(':').map(Number);

        let hour24 = hours;
        if (period === 'PM' && hours !== 12) hour24 += 12;
        if (period === 'AM' && hours === 12) hour24 = 0;

        meetingDate.setHours(hour24, minutes, 0, 0);
      }

      // Skip past meetings
      if (meetingDate <= now) return;

      this.settings.reminderTimes.forEach(reminderTime => {
        const reminderDate = new Date(meetingDate.getTime() - (reminderTime.minutes * 60000));

        if (reminderDate > now) {
          const reminderId = `${meeting.id}-${reminderTime.minutes}`;
          reminders.push({
            id: reminderId,
            meetingId: meeting.id,
            meetingTitle: meeting.title,
            meetingDate: meetingDate,
            reminderDate: reminderDate,
            reminderLabel: reminderTime.label,
            reminderMinutes: reminderTime.minutes
          });
        }
      });
    });

    this.saveReminders(reminders);
    this.scheduleReminders();
  }

  /**
     * Save reminders to localStorage
     * @param {Array} reminders - Array of reminder objects
     */
  saveReminders(reminders) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(reminders));
    } catch (error) {
      logger.warn('Error saving reminders:', error);
    }
  }

  /**
     * Load reminders from localStorage
     * @returns {Array} Array of reminder objects
     */
  loadReminders() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      logger.warn('Error loading reminders:', error);
      return [];
    }
  }

  /**
     * Schedule reminder timers
     */
  scheduleReminders() {
    if (!this.settings.enabled) return;

    this.clearAllReminders();
    const reminders = this.loadReminders();
    const now = new Date();

    reminders.forEach(reminder => {
      const reminderDate = new Date(reminder.reminderDate);
      const timeUntilReminder = reminderDate.getTime() - now.getTime();

      if (timeUntilReminder > 0) {
        const timerId = setTimeout(() => {
          this.showReminder(reminder);
          this.removeReminder(reminder.id);
        }, timeUntilReminder);

        this.reminderTimers.set(reminder.id, timerId);
      }
    });

    // Scheduled reminders
  }

  /**
     * Clear all reminder timers
     */
  clearAllReminders() {
    this.reminderTimers.forEach(timerId => clearTimeout(timerId));
    this.reminderTimers.clear();
  }

  /**
     * Remove a specific reminder
     * @param {string} reminderId - Reminder ID to remove
     */
  removeReminder(reminderId) {
    if (this.reminderTimers.has(reminderId)) {
      clearTimeout(this.reminderTimers.get(reminderId));
      this.reminderTimers.delete(reminderId);
    }

    // Remove from localStorage
    const reminders = this.loadReminders().filter(r => r.id !== reminderId);
    this.saveReminders(reminders);
  }

  /**
     * Check for due reminders (backup check)
     */
  checkDueReminders() {
    if (!this.settings.enabled) return;

    const reminders = this.loadReminders();
    const now = new Date();
    const dueReminders = reminders.filter(reminder => {
      const reminderDate = new Date(reminder.reminderDate);
      return reminderDate <= now;
    });

    dueReminders.forEach(reminder => {
      this.showReminder(reminder);
      this.removeReminder(reminder.id);
    });
  }

  /**
     * Show reminder notification
     * @param {Object} reminder - Reminder object
     */
  showReminder(reminder) {
    const meetingDate = new Date(reminder.meetingDate);
    const formattedDate = meetingDate.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    });
    const formattedTime = meetingDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    // Show in-page notification
    this.showInPageNotification({
      title: `Meeting Reminder: ${reminder.reminderLabel}`,
      message: `${reminder.meetingTitle}`,
      details: `${formattedDate} at ${formattedTime}`,
      meetingId: reminder.meetingId
    });

    // Show browser notification if enabled
    if (this.settings.showBrowserNotifications && 'Notification' in window && Notification.permission === 'granted') {
      this.showBrowserNotification(reminder, formattedDate, formattedTime);
    }

    // Play sound if enabled
    if (this.settings.playSound) {
      this.playNotificationSound();
    }

    // Reminder shown for meeting
  }

  /**
     * Show browser notification
     * @param {Object} reminder - Reminder object
     * @param {string} formattedDate - Formatted date string
     * @param {string} formattedTime - Formatted time string
     */
  showBrowserNotification(reminder, formattedDate, formattedTime) {
    const notification = new Notification(`SAPA Meeting Reminder`, {
      body: `${reminder.meetingTitle}\n${formattedDate} at ${formattedTime}`,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: `sapa-meeting-${reminder.meetingId}`,
      requireInteraction: false
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    // Auto-close after configured duration
    setTimeout(() => notification.close(), REMINDER.NOTIFICATION_AUTO_CLOSE);
  }

  /**
     * Show in-page notification
     * @param {Object} options - Notification options
     */
  showInPageNotification(options) {
    // Remove existing notification
    const existing = document.getElementById('reminder-notification');
    if (existing) existing.remove();

    // Create notification element
    const notification = document.createElement('div');
    notification.id = 'reminder-notification';
    notification.className = 'reminder-notification';
    notification.innerHTML = `
            <div class="reminder-content">
                <div class="reminder-header">
                    <strong>${options.title}</strong>
                    <button class="reminder-close" aria-label="Close notification">×</button>
                </div>
                <div class="reminder-message">${options.message}</div>
                <div class="reminder-details">${options.details}</div>
                <div class="reminder-actions">
                    <button class="btn btn-sm btn-primary reminder-view">View Details</button>
                    <button class="btn btn-sm btn-light reminder-dismiss">Dismiss</button>
                </div>
            </div>
        `;

    // Add event listeners
    notification.querySelector('.reminder-close').onclick = () => notification.remove();
    notification.querySelector('.reminder-dismiss').onclick = () => notification.remove();
    notification.querySelector('.reminder-view').onclick = () => {
      // Trigger modal for meeting details if available
      if (window.modal && options.meetingId) {
        // This would need meeting data - simplified for now
        // View meeting details action
      }
      notification.remove();
    };

    // Insert into page
    document.body.appendChild(notification);

    // Auto-dismiss after configured duration
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, TIMING.REMINDER_AUTO_DISMISS);
  }

  /**
     * Play notification sound
     */
  playNotificationSound() {
    try {
      // Create a simple notification sound using Web Audio API
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.setValueAtTime(REMINDER.SOUND_FREQUENCIES.HIGH, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(REMINDER.SOUND_FREQUENCIES.LOW, audioContext.currentTime + 0.1);

      gainNode.gain.setValueAtTime(REMINDER.SOUND_VOLUME, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + REMINDER.SOUND_DURATION);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + REMINDER.SOUND_DURATION);
    } catch (error) {
      logger.warn('Could not play notification sound:', error);
    }
  }

  /**
     * Create reminder settings UI
     */
  createReminderUI() {
    // Only create UI in development or if container exists
    if (!(window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
      return;
    }

    const container = document.getElementById('reminder-settings-container');
    if (!container) return;

    container.innerHTML = `
            <div class="reminder-settings">
                <h3>Meeting Reminders</h3>
                <div class="reminder-controls">
                    <label class="reminder-toggle">
                        <input type="checkbox" ${this.settings.enabled ? 'checked' : ''} id="reminder-enabled">
                        Enable meeting reminders
                    </label>
                    
                    <div class="reminder-options ${this.settings.enabled ? '' : CSS_CLASSES.DISABLED}">
                        <label class="reminder-option">
                            <input type="checkbox" ${this.settings.showBrowserNotifications ? 'checked' : ''} id="browser-notifications">
                            Browser notifications
                        </label>
                        
                        <label class="reminder-option">
                            <input type="checkbox" ${this.settings.playSound ? 'checked' : ''} id="play-sound">
                            Play notification sound
                        </label>
                        
                        <div class="reminder-times">
                            <strong>Reminder Times:</strong>
                            ${this.settings.reminderTimes.map(time => `
                                <div class="reminder-time-item">
                                    <span>${time.label}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    
                    <div class="reminder-actions">
                        <button class="btn btn-sm btn-primary" id="save-reminder-settings">Save Settings</button>
                        <button class="btn btn-sm btn-secondary" id="test-reminder">Test Reminder</button>
                    </div>
                </div>
            </div>
        `;

    this.bindUIEvents();
  }

  /**
     * Bind UI event listeners
     */
  bindUIEvents() {
    const enabledCheckbox = document.getElementById('reminder-enabled');
    const browserNotifications = document.getElementById('browser-notifications');
    const playSound = document.getElementById('play-sound');
    const saveButton = document.getElementById('save-reminder-settings');
    const testButton = document.getElementById('test-reminder');

    if (enabledCheckbox) {
      enabledCheckbox.onchange = () => {
        this.settings.enabled = enabledCheckbox.checked;
        const options = document.querySelector('.reminder-options');
        if (options) {
          options.classList.toggle(CSS_CLASSES.DISABLED, !enabledCheckbox.checked);
        }
      };
    }

    if (browserNotifications) {
      browserNotifications.onchange = async () => {
        if (browserNotifications.checked) {
          const granted = await this.requestNotificationPermission();
          browserNotifications.checked = granted;
          this.settings.showBrowserNotifications = granted;
        } else {
          this.settings.showBrowserNotifications = false;
        }
      };
    }

    if (playSound) {
      playSound.onchange = () => {
        this.settings.playSound = playSound.checked;
      };
    }

    if (saveButton) {
      saveButton.onclick = () => {
        this.saveSettings();
        this.showInPageNotification({
          title: 'Settings Saved',
          message: 'Reminder settings have been updated',
          details: this.settings.enabled ? 'Reminders are now enabled' : 'Reminders are disabled'
        });
      };
    }

    if (testButton) {
      testButton.onclick = () => {
        this.showReminder({
          meetingTitle: 'Test Meeting',
          meetingDate: new Date(Date.now() + REMINDER.DEFAULT_TIMES[2].minutes * 60000), // 30 minutes from now
          reminderLabel: 'Test notification',
          meetingId: 'test'
        });
      };
    }
  }

  /**
     * Enable reminders
     */
  enable() {
    this.settings.enabled = true;
    this.saveSettings();
  }

  /**
     * Disable reminders
     */
  disable() {
    this.settings.enabled = false;
    this.clearAllReminders();
    this.saveSettings();
  }

  /**
     * Get reminder statistics
     * @returns {Object} Statistics object
     */
  getStats() {
    const reminders = this.loadReminders();
    const activeReminders = reminders.filter(r => new Date(r.reminderDate) > new Date());

    return {
      enabled: this.settings.enabled,
      totalReminders: reminders.length,
      activeReminders: activeReminders.length,
      scheduledTimers: this.reminderTimers.size
    };
  }
}

// Export singleton instance
export const reminderSystem = new ReminderSystem();
