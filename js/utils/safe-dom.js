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

const HTML_ESCAPES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  '\'': '&#39;'
};

/**
 * Escape HTML special characters to prevent XSS.
 *
 * Escapes & < > " and ', so the result is safe both as element text and
 * inside a quoted attribute value (href="...", data-id='...'). The previous
 * implementation serialised a text node through a <div>, which leaves quotes
 * untouched and therefore allowed a value to break out of an attribute.
 * Non-string input still returns '' (unchanged contract).
 *
 * @param {string} text - Text to escape
 * @returns {string} Escaped text safe for HTML text and quoted attributes
 */
export function escapeHTML(text) {
  if (typeof text !== 'string') {
    return '';
  }

  return text.replace(/[&<>"']/g, ch => HTML_ESCAPES[ch]);
}

const SAFE_URL_SCHEMES = ['http:', 'https:', 'mailto:', 'tel:', 'sms:', 'webcal:'];

/**
 * Return a URL that is safe to place in an href/src attribute, or a fallback.
 *
 * Relative URLs (path, ./, ../, ?query, #fragment, //host) and absolute
 * http(s), mailto, tel, sms and webcal URLs pass through. Anything else --
 * javascript:, data:, vbscript:, or any other scheme -- yields the fallback.
 * The result is NOT HTML-escaped; wrap it in escapeHTML() when interpolating
 * into markup.
 *
 * Scheme detection mirrors the WHATWG URL parser: leading/trailing C0 control
 * characters and spaces are trimmed, and ASCII tab, LF and CR are removed
 * anywhere ("java\tscript:" is javascript:). Nothing else is removed, so an
 * ordinary file name with a space before a colon ("Philatex Q1: 2025.pdf")
 * has no scheme and stays a relative path.
 *
 * @param {string} url - Candidate URL (typically from JSON data)
 * @param {string} fallback - Value to return when the URL is rejected
 * @returns {string} The URL (outer whitespace/controls trimmed) or the fallback
 */
export function safeUrl(url, fallback = '#') {
  if (typeof url !== 'string') {
    return fallback;
  }
  const trimmed = url.replace(/^[\u0000-\u0020]+|[\u0000-\u0020]+$/g, '');
  if (trimmed === '') {
    return fallback;
  }
  const normalised = trimmed.replace(/[\t\n\r]/g, '');
  const scheme = /^([a-zA-Z][a-zA-Z0-9+.-]*):/.exec(normalised);
  if (!scheme) {
    return trimmed;
  }
  return SAFE_URL_SCHEMES.includes(`${scheme[1].toLowerCase()}:`) ? trimmed : fallback;
}

/**
 * Like safeUrl, but returns '' when there is no usable URL (missing, empty,
 * or rejected), so callers can omit a link entirely instead of rendering a
 * dead href="#".
 *
 * @param {...*} candidates - Values to try in order (e.g. filePath, pdfUrl)
 * @returns {string} The first acceptable URL, or ''
 */
export function firstSafeUrl(...candidates) {
  for (const candidate of candidates) {
    const url = safeUrl(candidate, '');
    if (url) {
      return url;
    }
  }
  return '';
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
