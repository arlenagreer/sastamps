/**
 * Modules Bundle Export
 * Tree-shakable exports for all modules
 */

// For now, create a simple modules bundle that doesn't require the existing modules
// This will be expanded as we refactor the existing modules to use ES6 exports

// Re-export utilities that are commonly used
export {
  formatDate,
  parseDate,
  validateEmail,
  sanitizeHtml,
  generateId,
  deepClone
} from '../utils/helpers.js';

export {
  debounce,
  throttle,
  requestAnimationFrameWithFallback,
  cancelAnimationFrameWithFallback
} from '../utils/performance.js';

export {
  safeQuerySelector,
  safeQuerySelectorAll,
  safeLocalStorageGet,
  safeLocalStorageSet,
  safeLocalStorageRemove
} from '../utils/safe-dom.js';

export {
  addEventListenerWithCleanup,
  removeEventListenerWithCleanup,
  cleanupEventListeners
} from '../utils/event-cleanup.js';

// Simple module loader for dynamic imports
export async function loadModule(moduleName) {
  try {
    switch (moduleName) {
    case 'calendar':
      return await import('../calendar-component.js');
    case 'modal':
      return await import('../modal.js');
    case 'error-boundary':
      return await import('../error-boundary.js');
    case 'lazy-loader':
      return await import('../lazy-loader.js');
    default:
      throw new Error(`Unknown module: ${moduleName}`);
    }
  } catch (error) {
    console.error(`Failed to load module ${moduleName}:`, error);
    throw error;
  }
}
