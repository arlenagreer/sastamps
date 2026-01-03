/**
 * Safe DOM Utilities
 * Tree-shakable DOM manipulation with error handling
 */

import { createLogger } from './logger.js';

const logger = createLogger('SafeDOM');

/**
 * Safely query for an element with error handling
 * @param {string} selector - CSS selector
 * @param {Element} context - Optional context element
 * @returns {Element|null} The found element or null
 */
export function safeQuerySelector(selector, context = document) {
  try {
    return context.querySelector(selector);
  } catch (error) {
    logger.warn(`Failed to query selector "${selector}":`, error);
    return null;
  }
}

/**
 * Safely query for multiple elements with error handling
 * @param {string} selector - CSS selector
 * @param {Element} context - Optional context element
 * @returns {NodeList|Array} The found elements or empty array
 */
export function safeQuerySelectorAll(selector, context = document) {
  try {
    return context.querySelectorAll(selector);
  } catch (error) {
    logger.warn(`Failed to query selector all "${selector}":`, error);
    return [];
  }
}

/**
 * Safely get item from localStorage with fallback
 * @param {string} key - Storage key
 * @param {*} defaultValue - Default value if key doesn't exist
 * @returns {*} The stored value or default value
 */
export function safeLocalStorageGet(key, defaultValue = null) {
  try {
    const item = localStorage.getItem(key);
    return item !== null ? JSON.parse(item) : defaultValue;
  } catch (error) {
    logger.warn(`Failed to get localStorage item "${key}":`, error);
    return defaultValue;
  }
}

/**
 * Safely set item in localStorage with error handling
 * @param {string} key - Storage key
 * @param {*} value - Value to store
 * @returns {boolean} Success status
 */
export function safeLocalStorageSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    logger.warn(`Failed to set localStorage item "${key}":`, error);
    return false;
  }
}

/**
 * Safely remove item from localStorage
 * @param {string} key - Storage key
 * @returns {boolean} Success status
 */
export function safeLocalStorageRemove(key) {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    logger.warn(`Failed to remove localStorage item "${key}":`, error);
    return false;
  }
}

/**
 * Escape HTML special characters to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text safe for HTML insertion
 */
export function escapeHTML(text) {
  if (typeof text !== 'string') {
    return '';
  }

  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Safely set text content with fallback
 * @param {Element} element - Target element
 * @param {string} text - Text to set
 * @returns {boolean} Success status
 */
export function safeSetTextContent(element, text) {
  if (!element || typeof element.textContent === 'undefined') {
    logger.warn('Invalid element for setting text content');
    return false;
  }

  try {
    element.textContent = text;
    return true;
  } catch (error) {
    logger.warn('Failed to set text content:', error);
    return false;
  }
}

/**
 * Safely set innerHTML with sanitized content
 * @param {Element} element - Target element
 * @param {string} html - HTML to set (should be pre-sanitized)
 * @returns {boolean} Success status
 */
export function safeSetInnerHTML(element, html) {
  if (!element) {
    logger.warn('Invalid element for setting innerHTML');
    return false;
  }

  try {
    element.innerHTML = html;
    return true;
  } catch (error) {
    logger.warn('Failed to set innerHTML:', error);
    return false;
  }
}
