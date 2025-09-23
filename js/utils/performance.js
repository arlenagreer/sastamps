/**
 * Performance Utilities
 * Tree-shakable performance optimization functions
 */

import { TIMING } from '../constants/index.js';

/**
 * Debounce utility function to prevent excessive function calls
 * @param {Function} func - The function to debounce
 * @param {number} wait - The debounce delay in milliseconds (default: 500ms)
 * @returns {Function} The debounced function
 */
export function debounce(func, wait = TIMING.DEBOUNCE_DEFAULT) {
  if (typeof func !== 'function') {
    throw new TypeError('First argument must be a function');
  }

  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle utility function to limit function execution frequency
 * @param {Function} func - The function to throttle
 * @param {number} limit - The throttle limit in milliseconds (default: 1000ms)
 * @returns {Function} The throttled function
 */
export function throttle(func, limit = TIMING.THROTTLE_DEFAULT) {
  if (typeof func !== 'function') {
    throw new TypeError('First argument must be a function');
  }

  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Request animation frame with fallback
 * @param {Function} callback - Function to execute on next frame
 * @returns {number} RAF ID for cancellation
 */
export function requestAnimationFrameWithFallback(callback) {
  if (typeof callback !== 'function') {
    throw new TypeError('Callback must be a function');
  }

  if (typeof requestAnimationFrame !== 'undefined') {
    return requestAnimationFrame(callback);
  }
  return setTimeout(callback, TIMING.ANIMATION_FRAME_FALLBACK); // ~60fps fallback
}

/**
 * Cancel animation frame with fallback
 * @param {number} id - RAF ID to cancel
 */
export function cancelAnimationFrameWithFallback(id) {
  if (typeof cancelAnimationFrame !== 'undefined') {
    cancelAnimationFrame(id);
  } else {
    clearTimeout(id);
  }
}
