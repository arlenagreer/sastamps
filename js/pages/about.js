/**
 * About Page JavaScript Bundle
 * Minimal bundle for the about page containing only essential functionality
 */

// Import utilities
import { safeQuerySelector } from '../utils/safe-dom.js';
import { debounce as _debounce } from '../utils/performance.js';

// Import core modules
import breadcrumb from '../modules/breadcrumb.js';

/**
 * Initialize about page functionality
 */
async function initAboutPage() {
  console.log('Initializing about page...');

  try {
    // Initialize breadcrumb navigation
    breadcrumb.init();

    // Add mobile menu functionality
    initMobileMenu();

    // Initialize service worker if available
    initServiceWorker();

    console.log('About page initialized successfully');
  } catch (error) {
    console.error('About page initialization failed:', error);
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
    document.addEventListener('click', (event) => {
      if (!navMenu.contains(event.target) && !menuToggle.contains(event.target)) {
        menuToggle.checked = false;
      }
    });

    // Close menu when pressing escape
    document.addEventListener('keydown', (event) => {
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
      console.log('Service Worker registered successfully');
    } catch (error) {
      console.warn('Service Worker registration failed:', error);
    }
  } else if ('serviceWorker' in navigator) {
    console.info('Service Worker not supported on file:// protocol');
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