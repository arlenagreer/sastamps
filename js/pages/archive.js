/**
 * Archive Page JavaScript Bundle
 * Minimal bundle for the archive page containing only essential functionality
 */

// Import utilities
import { safeQuerySelector } from '../utils/safe-dom.js';
import { debounce as _debounce } from '../utils/performance.js';
import { createLogger } from '../utils/logger.js';
import { addEventListenerWithCleanup } from '../utils/event-cleanup.js';

// Import core modules
import breadcrumb from '../modules/breadcrumb.js';

const logger = createLogger('ArchivePage');

/**
 * Initialize archive page functionality
 */
async function initArchivePage() {
  logger.info('Initializing archive page...');

  try {
    // Initialize breadcrumb navigation
    breadcrumb.init();

    // Add mobile menu functionality
    initMobileMenu();

    // Initialize service worker if available
    initServiceWorker();

    logger.info('Archive page initialized successfully');
  } catch (error) {
    logger.error('Archive page initialization failed:', error);
  }
}

/**
 * Initialize mobile menu functionality
 */
function initMobileMenu() {
  const menuToggle = safeQuerySelector('.menu-toggle-checkbox');
  const navMenu = safeQuerySelector('.nav-menu');

  if (menuToggle && navMenu) {
    // Close menu when clicking outside
    addEventListenerWithCleanup(document, 'click', (event) => {
      if (!navMenu.contains(event.target) && !menuToggle.contains(event.target)) {
        menuToggle.checked = false;
      }
    });

    // Close menu when pressing escape
    addEventListenerWithCleanup(document, 'keydown', (event) => {
      if (event.key === 'Escape' && menuToggle.checked) {
        menuToggle.checked = false;
      }
    });
  }
}

/**
 * Initialize service worker if available
 */
async function initServiceWorker() {
  if ('serviceWorker' in navigator && window.location.protocol !== 'file:') {
    try {
      await navigator.serviceWorker.register('/sw.js');
      logger.info('Service Worker registered successfully');
    } catch (error) {
      logger.warn('Service Worker registration failed:', error);
    }
  } else if ('serviceWorker' in navigator) {
    logger.info('Service Worker not supported on file:// protocol');
  }
}

/**
 * Initialize when DOM is ready
 */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initArchivePage);
} else {
  initArchivePage();
}

// Export for external access if needed
export { initArchivePage };
