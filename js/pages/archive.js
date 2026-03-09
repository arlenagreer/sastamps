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
 * Fetch archived newsletters JSON and render year-grouped sections
 * into the #archived-newsletters container using safe DOM methods.
 */
async function renderArchivedNewsletters() {
  const container = document.getElementById('archived-newsletters');
  if (!container) {
    logger.warn('Archived newsletters container not found');
    return;
  }

  try {
    logger.info('Fetching archived newsletters data...');
    const response = await fetch('data/newsletters/archived-newsletters.json');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    const entries = data.archivedNewsletters;

    // Group entries by year
    const yearMap = new Map();
    for (const entry of entries) {
      if (!yearMap.has(entry.year)) {
        yearMap.set(entry.year, []);
      }
      yearMap.get(entry.year).push(entry);
    }

    // Sort years descending (2024 down to 2008)
    const sortedYears = Array.from(yearMap.keys()).sort((a, b) => b - a);

    // Render each year section
    for (const year of sortedYears) {
      const yearEntries = yearMap.get(year);

      const section = document.createElement('div');
      section.classList.add('archive-year-section');

      const header = document.createElement('h2');
      header.classList.add('archive-year-header');
      header.textContent = `${year} Archive`;
      section.appendChild(header);

      const list = document.createElement('ul');
      list.classList.add('archive-list');

      for (const entry of yearEntries) {
        const li = document.createElement('li');

        if (entry.status === 'available') {
          li.classList.add('archive-list-item');

          const link = document.createElement('a');
          link.classList.add('archive-link');
          link.setAttribute('href', entry.filePath);
          link.setAttribute('target', '_blank');

          const icon = document.createElement('i');
          icon.classList.add('fas', 'fa-file-pdf');
          link.appendChild(icon);

          const text = document.createTextNode(entry.editionLabel);
          link.appendChild(text);

          li.appendChild(link);
        } else {
          li.classList.add('archive-list-item', 'archive-item-unavailable');

          const label = document.createElement('span');
          label.classList.add('archive-label');
          label.textContent = entry.editionLabel;
          li.appendChild(label);

          const badge = document.createElement('span');
          badge.classList.add('unavailable-badge');
          badge.textContent = 'Not Available';
          li.appendChild(badge);
        }

        list.appendChild(li);
      }

      section.appendChild(list);
      container.appendChild(section);
    }

    logger.info(`Rendered archived newsletters for ${sortedYears.length} years`);
  } catch (error) {
    logger.error('Failed to load archived newsletters:', error);
    const msg = document.createElement('p');
    msg.textContent = 'Unable to load the newsletter archive. Please try again later.';
    container.appendChild(msg);
  }
}

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

    // Render archived newsletters (2008-2024) from JSON
    await renderArchivedNewsletters();

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
