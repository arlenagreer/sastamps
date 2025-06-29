/**
 * Core Bundle - Shared utilities used across all pages
 * Tree-shaking will automatically remove unused exports
 */

// Essential utilities used on every page
export { debounce, throttle } from './utils/performance.js';
export { safeQuerySelector, safeLocalStorageGet, safeLocalStorageSet } from './utils/safe-dom.js';
export { ErrorBoundary, globalErrorBoundary } from './error-boundary.js';

// Theme management (used on all pages)
export { initializeTheme, toggleTheme } from './utils/theme.js';

// Service worker registration (used globally)
export { registerServiceWorker } from './utils/service-worker.js';

// Basic DOM utilities
export { addEventListenerWithCleanup, cleanupEventListeners } from './utils/event-cleanup.js';

// Initialize core functionality immediately
import './utils/global-error-handler.js';
import './utils/analytics.js';