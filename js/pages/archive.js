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
 * Fetch archived newsletters JSON and render as DaisyUI timeline items
 * appended to the #newsletter-timeline container using safe DOM methods.
 */
async function renderArchivedNewsletters() {
  const timeline = document.getElementById('newsletter-timeline');
  if (!timeline) {
    logger.warn('Newsletter timeline container not found');
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

    // Track item index for alternating sides
    let itemIndex = timeline.querySelectorAll('li').length;

    for (const year of sortedYears) {
      const yearEntries = yearMap.get(year);

      for (let i = 0; i < yearEntries.length; i++) {
        const entry = yearEntries[i];
        const isEven = itemIndex % 2 === 0;
        const isYearStart = i === 0;

        const li = document.createElement('li');

        // Leading connector (not on very first item if timeline already has items)
        if (itemIndex > 0) {
          const hrTop = document.createElement('hr');
          hrTop.className = 'stamp-connector';
          li.appendChild(hrTop);
        }

        // Build content box
        const box = document.createElement('div');
        box.className = 'timeline-box bg-base-200 stamp-border';

        const title = document.createElement('h3');
        title.className = 'font-heading text-sm font-bold';
        title.textContent = entry.editionLabel;
        box.appendChild(title);

        if (entry.status === 'available') {
          const link = document.createElement('a');
          link.href = entry.filePath;
          link.target = '_blank';
          link.className = 'btn btn-primary btn-xs mt-2';
          const pdfIcon = document.createElement('i');
          pdfIcon.className = 'fas fa-file-pdf mr-1';
          link.appendChild(pdfIcon);
          link.appendChild(document.createTextNode(' PDF'));
          box.appendChild(link);
        } else {
          const unavailable = document.createElement('span');
          unavailable.className = 'text-xs text-base-content/40 italic mt-1 block';
          unavailable.textContent = 'Not Available';
          box.appendChild(unavailable);
        }

        // Timeline middle (stamp icon)
        const middle = document.createElement('div');
        middle.className = 'timeline-middle stamp-timeline-marker';
        const stampIcon = document.createElement('i');
        stampIcon.className = 'fas fa-stamp';
        middle.appendChild(stampIcon);

        if (isEven) {
          // Content on the end side
          const startDiv = document.createElement('div');
          startDiv.className = 'timeline-start';
          if (isYearStart) {
            startDiv.className = 'timeline-start font-heading text-xl font-bold text-primary';
            startDiv.textContent = String(year);
          }
          li.appendChild(startDiv);
          li.appendChild(middle);
          box.classList.add('timeline-end');
          // Move class from separate div to the box itself
          const endBox = box;
          endBox.className = 'timeline-end timeline-box bg-base-200 stamp-border';
          li.appendChild(endBox);
        } else {
          // Content on the start side (alternating)
          box.className = 'timeline-start timeline-box bg-base-200 stamp-border md:text-end';
          li.appendChild(box);
          li.appendChild(middle);
          const endDiv = document.createElement('div');
          endDiv.className = 'timeline-end';
          if (isYearStart) {
            endDiv.className = 'timeline-end font-heading text-xl font-bold text-primary';
            endDiv.textContent = String(year);
          }
          li.appendChild(endDiv);
        }

        // Trailing connector
        const hrBottom = document.createElement('hr');
        hrBottom.className = 'stamp-connector';
        li.appendChild(hrBottom);

        timeline.appendChild(li);
        itemIndex++;
      }
    }

    logger.info(`Rendered archived newsletters for ${sortedYears.length} years`);
  } catch (error) {
    logger.error('Failed to load archived newsletters:', error);
    if (timeline) {
      const msg = document.createElement('p');
      msg.className = 'text-error p-4';
      msg.textContent = 'Unable to load the newsletter archive. Please try again later.';
      timeline.appendChild(msg);
    }
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
