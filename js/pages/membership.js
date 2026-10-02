/**
 * Membership Page JavaScript Bundle
 * Minimal bundle for the membership page containing only essential functionality
 */

// Import utilities
import { safeQuerySelector } from '../utils/safe-dom.js';
import { debounce as _debounce } from '../utils/performance.js';
import { createLogger } from '../utils/logger.js';
import { addEventListenerWithCleanup } from '../utils/event-cleanup.js';
import { retireServiceWorkers } from '../utils/service-worker.js';

// Import core modules
import breadcrumb from '../modules/breadcrumb.js';

const logger = createLogger('MembershipPage');

/**
 * Initialize membership page functionality
 */
async function initMembershipPage() {
  logger.info('Initializing membership page...');

  try {
    // Initialize breadcrumb navigation
    breadcrumb.init();

    // Add mobile menu functionality
    initMobileMenu();

    // Remove any stale service worker (the site no longer registers one)
    retireServiceWorkers();

    logger.info('Membership page initialized successfully');
  } catch (error) {
    logger.error('Membership page initialization failed:', error);
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
      // A tap on the menu button (label) is not "outside": the label toggles
      // the checkbox itself, and unchecking here first made it re-open.
      if (!navMenu.contains(event.target) && !menuToggle.contains(event.target) &&
          !(event.target instanceof Element && event.target.closest('.menu-toggle'))) {
        menuToggle.checked = false;
      }
    });

    // Close menu when pressing escape
    addEventListenerWithCleanup(document, 'keydown', (event) => {
      if (event.key === 'Escape' && menuToggle.checked) {
        menuToggle.checked = false;
        menuToggle.focus(); // the panel's links just became unfocusable
      }
    });
  }
}


/**
 * Initialize when DOM is ready
 */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMembershipPage);
} else {
  initMembershipPage();
}

// Export for external access if needed
export { initMembershipPage };
