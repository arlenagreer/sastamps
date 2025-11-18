/**
 * Global Error Handler
 * Tree-shakable global error handling setup
 */

import { createLogger } from './logger.js';
import { ERROR_MESSAGES, TIMING, CSS_CLASSES as _CSS_CLASSES } from '../constants/index.js';
import { ENV } from '../config/index.js';

const logger = createLogger('GlobalErrorHandler');

// Global error handling for uncaught errors
window.addEventListener('error', (event) => {
  logger.error('Uncaught error', {
    error: event.error,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno
  });

  // Don't show error banner for script loading errors in production
  if (event.filename && event.filename.includes('.js')) {
    return;
  }

  showErrorBanner(ERROR_MESSAGES.GENERIC);
});

// Global error handling for unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  logger.error('Unhandled promise rejection', {
    reason: event.reason,
    promise: event.promise
  });

  // Prevent the default browser behavior
  event.preventDefault();

  showErrorBanner(ERROR_MESSAGES.NETWORK);
});

/**
 * Show error banner to user
 * @param {string} message - Error message to display
 */
function showErrorBanner(message) {
  // Remove existing error banner
  const existingBanner = document.querySelector('.error-banner');
  if (existingBanner) {
    existingBanner.remove();
  }

  // Create new error banner
  const banner = document.createElement('div');
  banner.className = 'error-banner';
  banner.innerHTML = `
        <div class="error-content">
            <span class="error-message">${message}</span>
            <button class="error-dismiss" aria-label="Dismiss error">×</button>
        </div>
    `;

  // Insert at top of page
  document.body.insertBefore(banner, document.body.firstChild);

  // Add dismiss functionality
  banner.querySelector('.error-dismiss').addEventListener('click', () => {
    banner.remove();
  });

  // Auto-dismiss after configured duration
  setTimeout(() => {
    if (banner.parentNode) {
      banner.remove();
    }
  }, TIMING.NOTIFICATION_AUTO_DISMISS);
}

// Log initialization in development
if (ENV.isDevelopment) {
  logger.info('Global error handler initialized');
}
