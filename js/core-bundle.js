/**
 * Core Bundle - Shared utilities used across all pages
 * Tree-shaking will automatically remove unused exports
 */

export { debounce, throttle } from './utils/performance.js';
export { safeQuerySelector, safeLocalStorageGet, safeLocalStorageSet } from './utils/safe-dom.js';
export { ErrorBoundary, globalErrorBoundary } from './error-boundary.js';
export { initializeTheme, toggleTheme } from './utils/theme.js';
export { registerServiceWorker } from './utils/service-worker.js';
export { addEventListenerWithCleanup, cleanupEventListeners } from './utils/event-cleanup.js';

import './utils/global-error-handler.js';
import './utils/analytics.js';
