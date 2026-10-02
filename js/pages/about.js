/**
 * About Page JavaScript Bundle
 * Minimal bundle for the about page containing only essential functionality
 */

// Import utilities
import { safeQuerySelector } from '../utils/safe-dom.js';
import { debounce as _debounce } from '../utils/performance.js';
import { createLogger } from '../utils/logger.js';
import { addEventListenerWithCleanup } from '../utils/event-cleanup.js';
import { retireServiceWorkers } from '../utils/service-worker.js';

// Import core modules
import breadcrumb from '../modules/breadcrumb.js';

const logger = createLogger('AboutPage');

/**
 * Initialize about page functionality
 */
async function initAboutPage() {
  logger.info('Initializing about page...');

  try {
    // Initialize breadcrumb navigation
    breadcrumb.init();

    // Add mobile menu functionality
    initMobileMenu();

    // Remove any stale service worker (the site no longer registers one)
    retireServiceWorkers();

    logger.info('About page initialized successfully');
  } catch (error) {
    logger.error('About page initialization failed:', error);
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
      // The menu button (label) toggles the checkbox itself; treating a tap on
      // it as "outside" unchecked the box and the label re-checked it, so the
      // menu could never be closed from the button.
      if (!navMenu.contains(event.target) && !menuToggle.contains(event.target) &&
          !event.target.closest('.menu-toggle')) {
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
 * Initialize when DOM is ready
 */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAboutPage);
} else {
  initAboutPage();
}

// Export for external access if needed
export { initAboutPage };