/**
 * Enhanced Error Handler Utilities
 * Provides consistent error handling patterns across the application
 */

import { ERROR_MESSAGES, ANALYTICS_EVENTS as _ANALYTICS_EVENTS } from '../constants/index.js';
import { createLogger } from './logger.js';

const logger = createLogger('ErrorHandler');

/**
 * Error types enumeration
 */
export const ErrorTypes = {
  NETWORK: 'NETWORK_ERROR',
  VALIDATION: 'VALIDATION_ERROR',
  PERMISSION: 'PERMISSION_ERROR',
  TIMEOUT: 'TIMEOUT_ERROR',
  PARSE: 'PARSE_ERROR',
  UNKNOWN: 'UNKNOWN_ERROR'
};

/**
 * Custom error class with additional context
 */
export class AppError extends Error {
  constructor(message, type = ErrorTypes.UNKNOWN, details = {}) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}

/**
 * Wraps an async function with error handling
 * @param {Function} fn - The async function to wrap
 * @param {Object} options - Error handling options
 * @returns {Function} Wrapped function with error handling
 */
export function withErrorHandling(fn, options = {}) {
  const {
    onError = null,
    fallbackValue = null,
    logError = true,
    trackError = true,
    errorMessage = ERROR_MESSAGES.GENERIC
  } = options;

  return async function(...args) {
    try {
      return await fn.apply(this, args);
    } catch (error) {
      if (logError) {
        logger.error(`Error in ${fn.name || 'anonymous function'}:`, error);
      }

      if (trackError && typeof gtag === 'function') {
        gtag('event', 'exception', {
          description: error.message,
          fatal: false,
          error_type: error.type || ErrorTypes.UNKNOWN
        });
      }

      if (onError) {
        return onError(error);
      }

      if (fallbackValue !== null) {
        return fallbackValue;
      }

      throw new AppError(errorMessage, error.type || ErrorTypes.UNKNOWN, {
        originalError: error
      });
    }
  };
}

/**
 * Retry function with exponential backoff
 * @param {Function} fn - Function to retry
 * @param {Object} options - Retry options
 * @returns {Promise} Result of successful execution
 */
export async function retryWithBackoff(fn, options = {}) {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffFactor = 2,
    shouldRetry = (_error) => true
  } = options;

  let lastError;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (!shouldRetry(error) || attempt === maxRetries - 1) {
        throw error;
      }

      const delay = Math.min(
        initialDelay * Math.pow(backoffFactor, attempt),
        maxDelay
      );

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Handle network errors specifically
 * @param {Error} error - The network error
 * @returns {AppError} Formatted network error
 */
export function handleNetworkError(error) {
  if (error.name === 'NetworkError' || !navigator.onLine) {
    return new AppError(
      ERROR_MESSAGES.NETWORK,
      ErrorTypes.NETWORK,
      { offline: !navigator.onLine }
    );
  }

  if (error.name === 'TimeoutError') {
    return new AppError(
      'Request timed out. Please try again.',
      ErrorTypes.TIMEOUT
    );
  }

  return new AppError(
    error.message || ERROR_MESSAGES.NETWORK,
    ErrorTypes.NETWORK,
    { originalError: error }
  );
}

/**
 * Validate response and throw if not ok
 * @param {Response} response - Fetch response
 * @returns {Response} The response if ok
 * @throws {AppError} If response is not ok
 */
export function validateResponse(response) {
  if (!response.ok) {
    throw new AppError(
      `HTTP error! status: ${response.status}`,
      ErrorTypes.NETWORK,
      {
        status: response.status,
        statusText: response.statusText
      }
    );
  }
  return response;
}

/**
 * Safe JSON parse with error handling
 * @param {string} text - JSON string to parse
 * @param {*} fallback - Fallback value on parse error
 * @returns {*} Parsed JSON or fallback
 */
export function safeJsonParse(text, fallback = null) {
  try {
    return JSON.parse(text);
  } catch (error) {
    logger.warn('JSON parse error:', error);
    return fallback;
  }
}

/**
 * Create a timeout promise
 * @param {number} ms - Timeout in milliseconds
 * @returns {Promise} Promise that rejects after timeout
 */
export function timeout(ms) {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new AppError('Operation timed out', ErrorTypes.TIMEOUT));
    }, ms);
  });
}

/**
 * Race a promise against a timeout
 * @param {Promise} promise - Promise to race
 * @param {number} ms - Timeout in milliseconds
 * @returns {Promise} Result of the race
 */
export async function withTimeout(promise, ms) {
  return Promise.race([promise, timeout(ms)]);
}

/**
 * Log error with context
 * @param {Error} error - Error to log
 * @param {Object} context - Additional context
 */
export function logError(error, context = {}) {
  const errorInfo = {
    message: error.message,
    type: error.type || ErrorTypes.UNKNOWN,
    stack: error.stack,
    timestamp: new Date().toISOString(),
    url: window.location.href,
    userAgent: navigator.userAgent,
    ...context
  };

  logger.error('Application Error:', errorInfo);

  // Send to error tracking service if available
  if (window.errorTracker) {
    window.errorTracker.log(errorInfo);
  }
}

/**
 * Global error boundary for uncaught errors
 */
export function setupGlobalErrorHandling() {
  window.addEventListener('error', (event) => {
    logError(event.error, {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    logError(new Error(event.reason), {
      type: 'unhandledRejection'
    });
  });
}
