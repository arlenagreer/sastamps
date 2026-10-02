/**
 * Helper Utilities
 * Tree-shakable helper functions
 */

import { createLogger } from './logger.js';
import { parseLocalDate } from './dates.js';

const logger = createLogger('Helpers');

/**
 * Format date for display
 * @param {string|Date} date - Date to format
 * @param {Object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date string
 */
export function formatDate(date, options = {}) {
  // 'YYYY-MM-DD' is a local calendar day (new Date() would read it as UTC and
  // show the previous day in US time zones); full ISO datetimes parse as before.
  const dateObj = typeof date === 'string' ? parseLocalDate(date) : date;

  if (!(dateObj instanceof Date) || isNaN(dateObj)) {
    return 'Invalid Date';
  }

  const defaultOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  };

  return dateObj.toLocaleDateString('en-US', { ...defaultOptions, ...options });
}

/**
 * Parse date string safely
 * @param {string} dateString - Date string to parse
 * @param {Date} fallback - Fallback date if parsing fails
 * @returns {Date} Parsed date or fallback
 */
export function parseDate(dateString, fallback = new Date()) {
  try {
    const parsed = new Date(dateString);
    return isNaN(parsed) ? fallback : parsed;
  } catch (error) {
    logger.warn('Failed to parse date:', dateString, error);
    return fallback;
  }
}

/**
 * Validate email address
 * @param {string} email - Email to validate
 * @returns {boolean} Whether email is valid
 */
export function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Is this a plausible phone number? The contact form's phone field is
 * optional and read by a person, so this accepts what people actually type:
 * US or international, with +, spaces, dots, dashes, brackets, a slash and
 * an extension ("ext. 4", "x12", "#3"). 7 to 15 digits, the longest a phone
 * number can be (E.164). Anything else is likely a typo.
 * @param {string} value - Phone number as typed
 * @returns {boolean} Whether it looks like a phone number
 */
export function isPlausiblePhone(value) {
  if (typeof value !== 'string') {return false;}
  const main = value.trim().replace(/\s*(?:ext\.?|extension|x|#)\s*\d{1,6}$/i, '');
  if (!/^\+?[\d\s().\-/]+$/.test(main)) {return false;}
  const digits = main.replace(/\D/g, '').length;
  return digits >= 7 && digits <= 15;
}

// Note: For HTML sanitization, use escapeHTML from '../utils/safe-dom.js'
// The sanitizeHtml function was removed to avoid duplication

/**
 * Generate unique ID
 * @param {string} prefix - Optional prefix for ID
 * @returns {string} Unique ID
 */
export function generateId(prefix = 'id') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Deep clone object
 * @param {*} obj - Object to clone
 * @returns {*} Cloned object
 */
export function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (obj instanceof Date) {
    return new Date(obj);
  }

  if (obj instanceof Array) {
    return obj.map(item => deepClone(item));
  }

  if (typeof obj === 'object') {
    const cloned = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = deepClone(obj[key]);
      }
    }
    return cloned;
  }

  return obj;
}
