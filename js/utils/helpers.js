/**
 * Helper Utilities
 * Tree-shakable helper functions
 */

/**
 * Format date for display
 * @param {string|Date} date - Date to format
 * @param {Object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date string
 */
export function formatDate(date, options = {}) {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

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
    console.warn('Failed to parse date:', dateString, error);
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
 * Validate phone number (US format)
 * @param {string} phone - Phone number to validate
 * @returns {boolean} Whether phone number is valid
 */
export function validatePhone(phone) {
  const phoneRegex = /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/;
  return phoneRegex.test(phone);
}

/**
 * Sanitize HTML string
 * @param {string} html - HTML string to sanitize
 * @returns {string} Sanitized HTML
 */
export function sanitizeHtml(html) {
  const div = document.createElement('div');
  div.textContent = html;
  return div.innerHTML;
}

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
