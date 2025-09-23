/**
 * Error Boundary System for Vanilla JavaScript
 * San Antonio Philatelic Association
 *
 * Provides React-like error boundary functionality for vanilla JavaScript components
 */

class ErrorBoundary {
  constructor(options = {}) {
    this.componentName = options.componentName || 'Unknown Component';
    this.fallbackUI = options.fallbackUI || this.createDefaultFallback();
    this.onError = options.onError || this.defaultErrorHandler;
    this.retryCallback = options.retryCallback || null;
    this.maxRetries = options.maxRetries || 0;
    this.currentRetries = 0;
    this.container = options.container || null;
  }

  /**
     * Wrap a function with error boundary protection
     * @param {Function} fn - Function to wrap
     * @param {Object} context - Execution context
     * @returns {Function} - Wrapped function
     */
  wrap(fn, context = null) {
    return (...args) => {
      try {
        const result = fn.apply(context, args);

        // Handle promises
        if (result && typeof result.catch === 'function') {
          return result.catch(error => this.handleError(error));
        }

        return result;
      } catch (error) {
        return this.handleError(error);
      }
    };
  }

  /**
     * Wrap an async function with error boundary protection
     * @param {Function} asyncFn - Async function to wrap
     * @param {Object} context - Execution context
     * @returns {Function} - Wrapped async function
     */
  wrapAsync(asyncFn, context = null) {
    return async (...args) => {
      try {
        return await asyncFn.apply(context, args);
      } catch (error) {
        return this.handleError(error);
      }
    };
  }

  /**
     * Handle errors caught by the boundary
     * @param {Error} error - The error that occurred
     * @returns {*} - Fallback result or rethrows if needed
     */
  handleError(error) {
    console.error(`[${this.componentName}] Error caught by boundary:`, error);

    // Call custom error handler
    this.onError(error, this.componentName);

    // Show fallback UI if container is provided
    if (this.container) {
      this.showFallbackUI(error);
    }

    // Try retry if configured
    if (this.retryCallback && this.currentRetries < this.maxRetries) {
      this.currentRetries++;
      console.log(`[${this.componentName}] Retrying... (${this.currentRetries}/${this.maxRetries})`);

      setTimeout(() => {
        try {
          this.retryCallback();
        } catch (retryError) {
          console.error(`[${this.componentName}] Retry failed:`, retryError);
        }
      }, 1000 * this.currentRetries); // Exponential backoff
    }

    // Return null to prevent further errors
    return null;
  }

  /**
     * Show fallback UI in the container
     * @param {Error} error - The error that occurred
     */
  showFallbackUI(error) {
    if (!this.container) return;

    const fallbackElement = typeof this.fallbackUI === 'function'
      ? this.fallbackUI(error, this.componentName)
      : this.fallbackUI;

    // Clear container and add fallback
    this.container.innerHTML = '';
    if (typeof fallbackElement === 'string') {
      this.container.innerHTML = fallbackElement;
    } else if (fallbackElement instanceof HTMLElement) {
      this.container.appendChild(fallbackElement);
    }

    // Add retry button if retry is available
    if (this.retryCallback && this.currentRetries < this.maxRetries) {
      const retryButton = document.createElement('button');
      retryButton.textContent = 'Retry';
      retryButton.className = 'btn btn-primary mt-2';
      retryButton.onclick = () => {
        this.container.innerHTML = '';
        this.retryCallback();
      };
      this.container.appendChild(retryButton);
    }
  }

  /**
     * Create default fallback UI
     * @returns {Function} - Fallback UI generator
     */
  createDefaultFallback() {
    return (error, componentName) => `
            <div class="error-boundary-fallback" style="
                background-color: #f8d7da;
                color: #721c24;
                border: 1px solid #f5c6cb;
                border-radius: 0.375rem;
                padding: 1rem;
                margin: 1rem 0;
                text-align: center;
            ">
                <h4 style="margin-bottom: 0.5rem;">
                    <i class="fas fa-exclamation-triangle"></i>
                    Something went wrong
                </h4>
                <p style="margin-bottom: 0.5rem;">
                    The ${componentName} component encountered an error and couldn't load properly.
                </p>
                <details style="margin-top: 0.5rem; font-size: 0.875rem;">
                    <summary style="cursor: pointer; color: #495057;">
                        Technical Details
                    </summary>
                    <pre style="
                        background-color: #f8f9fa;
                        padding: 0.5rem;
                        border-radius: 0.25rem;
                        margin-top: 0.5rem;
                        overflow-x: auto;
                        font-size: 0.75rem;
                        text-align: left;
                    ">${error.message}\n${error.stack || ''}</pre>
                </details>
            </div>
        `;
  }

  /**
     * Default error handler
     * @param {Error} error - The error that occurred
     * @param {string} componentName - Name of the component
     */
  defaultErrorHandler(error, componentName) {
    // Log to console
    console.error(`[ErrorBoundary] ${componentName}:`, error);

    // Send to analytics if available
    if (typeof gtag !== 'undefined') {
      gtag('event', 'exception', {
        description: `${componentName}: ${error.message}`,
        fatal: false
      });
    }

    try {
      const errorLog = JSON.parse(localStorage.getItem('errorBoundaryLog') || '[]');
      errorLog.push({
        timestamp: new Date().toISOString(),
        component: componentName,
        message: error.message,
        stack: error.stack,
        userAgent: navigator.userAgent
      });

      // Keep only last 50 errors
      if (errorLog.length > 50) {
        errorLog.splice(0, errorLog.length - 50);
      }

      localStorage.setItem('errorBoundaryLog', JSON.stringify(errorLog));
    } catch (storageError) {
      console.warn('Failed to log error to localStorage:', storageError);
    }
  }

  /**
     * Reset the error boundary state
     */
  reset() {
    this.currentRetries = 0;
  }
}

/**
 * Global error boundary for uncaught errors
 */
class GlobalErrorBoundary {
  constructor() {
    this.setupGlobalHandlers();
    this.errorCount = 0;
    this.maxErrors = 10;
    this.timeWindow = 60000; // 1 minute
    this.errorTimes = [];
  }

  setupGlobalHandlers() {
    // Handle JavaScript errors
    window.addEventListener('error', (event) => {
      this.handleGlobalError(event.error, event.filename, event.lineno, event.colno);
    });

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.handleGlobalError(event.reason, 'Promise rejection', 0, 0);
      event.preventDefault(); // Prevent console logging
    });
  }

  handleGlobalError(error, source, lineno, colno) {
    const now = Date.now();

    // Clean old error times
    this.errorTimes = this.errorTimes.filter(time => now - time < this.timeWindow);

    // Check if we're getting too many errors
    if (this.errorTimes.length >= this.maxErrors) {
      console.warn('Too many errors detected. Stopping error boundary logging to prevent spam.');
      return;
    }

    this.errorTimes.push(now);

    const errorInfo = {
      message: error?.message || error || 'Unknown error',
      source: source || 'Unknown source',
      line: lineno || 0,
      column: colno || 0,
      stack: error?.stack || '',
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    console.error('[GlobalErrorBoundary] Uncaught error:', errorInfo);

    // Send to analytics
    if (typeof gtag !== 'undefined') {
      gtag('event', 'exception', {
        description: `Global: ${errorInfo.message}`,
        fatal: false
      });
    }

    // Show user-friendly error notification
    this.showErrorNotification(errorInfo);
  }

  showErrorNotification(errorInfo) {
    // Create or update error notification
    let notification = document.getElementById('global-error-notification');

    if (!notification) {
      notification = document.createElement('div');
      notification.id = 'global-error-notification';
      notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background-color: #f8d7da;
                color: #721c24;
                border: 1px solid #f5c6cb;
                border-radius: 0.375rem;
                padding: 1rem;
                max-width: 300px;
                z-index: 9999;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                display: none;
            `;

      notification.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: space-between;">
                    <span style="font-weight: bold;">
                        <i class="fas fa-exclamation-triangle"></i>
                        Something went wrong
                    </span>
                    <button id="close-error-notification" style="
                        background: none;
                        border: none;
                        font-size: 1.2rem;
                        cursor: pointer;
                        color: #721c24;
                        padding: 0;
                        margin-left: 0.5rem;
                    ">&times;</button>
                </div>
                <p style="margin: 0.5rem 0 0 0; font-size: 0.875rem;">
                    We've encountered an unexpected error. The page may not work correctly.
                    Please refresh to try again.
                </p>
            `;

      document.body.appendChild(notification);

      // Add close handler
      document.getElementById('close-error-notification').onclick = () => {
        notification.style.display = 'none';
      };

      // Auto-hide after 10 seconds
      setTimeout(() => {
        if (notification) {
          notification.style.display = 'none';
        }
      }, 10000);
    }

    // Show notification
    notification.style.display = 'block';
  }
}

// Create and export instances
const globalErrorBoundary = new GlobalErrorBoundary();

export { ErrorBoundary, GlobalErrorBoundary, globalErrorBoundary };
