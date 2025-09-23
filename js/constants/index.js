/**
 * Central Constants File
 * Consolidates all magic numbers and hardcoded values for better maintainability
 */

// Timing Constants (in milliseconds)
export const TIMING = {
  DEBOUNCE_DEFAULT: 500,
  DEBOUNCE_SEARCH: 300,
  THROTTLE_DEFAULT: 1000,
  ANIMATION_FRAME_FALLBACK: 16, // ~60fps
  NOTIFICATION_AUTO_DISMISS: 10000,
  NOTIFICATION_SHORT: 2000,
  REMINDER_CHECK_INTERVAL: 60000, // 1 minute
  REMINDER_AUTO_DISMISS: 15000,
  COPY_FEEDBACK_DURATION: 1500,
  FORM_MESSAGE_SUCCESS_DURATION: 10000,
  RSVP_CONFIRMATION_DURATION: 3000,
  RETRY_DELAY_BASE: 1000,
  SERVICE_WORKER_UPDATE_DISMISS: 10000
};

// Form Validation Constants
export const VALIDATION = {
  NAME_MIN_LENGTH: 2,
  EMAIL_PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE_PATTERN: /^(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}$/,
  MESSAGE_MIN_LENGTH: 10,
  MESSAGE_MAX_LENGTH: 1000,
  MESSAGE_WARNING_THRESHOLD: 50,
  SUBJECT_MIN_LENGTH: 5,
  PASSWORD_MIN_LENGTH: 8
};

// Reminder System Constants
export const REMINDER = {
  DEFAULT_TIMES: [
    { label: '1 day before', minutes: 1440 }, // 24 * 60
    { label: '2 hours before', minutes: 120 }, // 2 * 60
    { label: '30 minutes before', minutes: 30 }
  ],
  NOTIFICATION_AUTO_CLOSE: 10000,
  SOUND_FREQUENCIES: {
    HIGH: 800,
    LOW: 600
  },
  SOUND_DURATION: 0.3,
  SOUND_VOLUME: 0.3
};

// Calendar Constants
export const CALENDAR = {
  DATE_RANGE: {
    MIN: '2024-01-01',
    MAX: '2026-12-31'
  },
  VIEW_TYPES: {
    DEFAULT: 'default',
    MONTH: 'month',
    YEAR: 'year'
  }
};

// Lazy Loading Constants
export const LAZY_LOADING = {
  ROOT_MARGIN: '50px',
  THRESHOLD: 0.1,
  MAX_RETRIES: 2,
  SPINNER_SIZE: 20,
  CLASSES: {
    LOADING: 'lazy-loading',
    LOADED: 'lazy-loaded',
    ERROR: 'lazy-error'
  }
};

// Storage Keys
export const STORAGE_KEYS = {
  MEETING_REMINDERS: 'sapa-meeting-reminders',
  REMINDER_SETTINGS: 'sapa-reminder-settings',
  MEETING_RSVPS: 'meeting_rsvps',
  THEME_PREFERENCE: 'theme-preference',
  USER_PREFERENCES: 'user-preferences',
  SEARCH_HISTORY: 'search-history'
};

// API Endpoints
export const API_ENDPOINTS = {
  CONTACT_FORM: '/contact-handler.php',
  CSRF_TOKEN: '/csrf-token.php',
  NETLIFY_CONTACT: '/.netlify/functions/contact-form',
  NEWSLETTER_ARCHIVE: '/api/newsletters',
  MEETING_DATA: '/data/meetings/meetings.json'
};

// CSS Classes
export const CSS_CLASSES = {
  ERROR: 'error',
  SUCCESS: 'success',
  WARNING: 'warning',
  LOADING: 'loading',
  DISABLED: 'disabled',
  ACTIVE: 'active',
  HIDDEN: 'hidden',
  VISIBLE: 'visible'
};

// Error Messages
export const ERROR_MESSAGES = {
  GENERIC: 'An error occurred. Please try again.',
  NETWORK: 'Network error. Please check your connection.',
  VALIDATION_FAILED: 'Please correct the errors above before submitting.',
  LOAD_FAILED: 'Failed to load content. Please try again.',
  SUBMISSION_FAILED: 'Sorry, there was an error sending your message. Please try again.',
  CALENDAR_UNAVAILABLE: 'Calendar temporarily unavailable. Please try refreshing the page.',
  MEETING_LOAD_FAILED: 'Unable to load meetings. Please try again later.',
  REMINDER_PERMISSION_DENIED: 'Notification permission was denied.',
  COPY_FAILED: 'Failed to copy to clipboard.'
};

// Success Messages
export const SUCCESS_MESSAGES = {
  FORM_SUBMITTED: 'Thank you! Your message has been sent successfully.',
  SETTINGS_SAVED: 'Settings have been saved successfully.',
  REMINDER_SET: 'Reminder has been set.',
  COPIED_TO_CLIPBOARD: 'Copied to clipboard!',
  RSVP_CONFIRMED: 'Thanks for your RSVP!',
  RSVP_CANCELLED: 'RSVP cancelled'
};

// Filter Options
export const FILTER_OPTIONS = {
  MEETING_TYPES: [
    { value: '', label: 'All Types' },
    { value: 'regular', label: 'Regular Meetings' },
    { value: 'special', label: 'Special Events' },
    { value: 'social', label: 'Social Events' }
  ],
  YEAR_RANGE: 1 // Years before and after current year
};

// Performance Thresholds
export const PERFORMANCE = {
  MAX_INLINE_STYLE_LENGTH: 1000,
  MAX_DOM_DEPTH: 32,
  MAX_CHILD_ELEMENTS: 1500,
  LONG_TASK_THRESHOLD: 50, // milliseconds
  FPS_TARGET: 60
};

// Analytics Configuration
export const ANALYTICS = {
  GA_MEASUREMENT_ID: 'G-XXXXXXXXXX', // Replace with actual ID in production
  EVENTS: {
    PAGE_VIEW: 'page_view',
    FORM_SUBMIT: 'form_submit',
    FILE_DOWNLOAD: 'file_download',
    NEWSLETTER_DOWNLOAD: 'newsletter_download',
    MEETING_RSVP: 'meeting_rsvp',
    SEARCH: 'search',
    RESOURCE_VIEW: 'resource_view'
  }
};


// Analytics Events (combining both legacy and new events)
export const ANALYTICS_EVENTS = {
  ...ANALYTICS.EVENTS,
  CONTACT_FORM_SUBMIT: 'contact_form_submit',
  SEARCH_PERFORMED: 'search_performed',
  REMINDER_SET: 'reminder_set'
};

// Z-Index Layers
export const Z_INDEX = {
  DROPDOWN: 100,
  STICKY_HEADER: 200,
  MODAL_BACKDROP: 300,
  MODAL: 400,
  NOTIFICATION: 500,
  TOOLTIP: 600
};

// Breakpoints (matching CSS)
export const BREAKPOINTS = {
  MOBILE: 576,
  TABLET: 768,
  DESKTOP: 992,
  LARGE: 1200
};

// Animation Durations (in milliseconds)
export const ANIMATION = {
  FAST: 200,
  NORMAL: 300,
  SLOW: 500,
  EXTRA_SLOW: 1000
};

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  SERVER_ERROR: 500
};

// Default Values
export const DEFAULTS = {
  PAGE_SIZE: 10,
  MAX_SEARCH_RESULTS: 50,
  IMAGE_QUALITY: 0.85,
  COMPRESSION_LEVEL: 9,
  CACHE_DURATION: 3600, // 1 hour in seconds
  SESSION_TIMEOUT: 1800 // 30 minutes in seconds
};
