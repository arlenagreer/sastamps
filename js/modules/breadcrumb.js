/**
 * Breadcrumb Navigation Module
 * Provides automatic breadcrumb generation for pages
 */

import { createLogger } from '../utils/logger.js';

const logger = createLogger('Breadcrumb');

class BreadcrumbNavigation {
  constructor() {
    this.container = null;
    this.defaultHome = { text: 'Home', href: '/' };
    this.separator = '›';
  }

  /**
     * Initialize breadcrumb navigation
     * @param {string} containerId - ID of the container element
     */
  init(containerId = 'breadcrumb-nav') {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      logger.warn('Breadcrumb container not found');
      return;
    }

    this.generateBreadcrumb();
  }

  /**
     * Generate breadcrumb based on current page
     */
  generateBreadcrumb() {
    const currentPath = window.location.pathname;
    const pathSegments = currentPath.split('/').filter(segment => segment);

    // Build breadcrumb items
    const items = [this.defaultHome];

    // Page-specific breadcrumbs
    const pageTitle = document.title.split(' - ')[0];
    const currentPage = pathSegments[pathSegments.length - 1] || 'index.html';

    // Map common pages
    const pageMap = {
      'index.html': null, // Home page, no breadcrumb needed
      'meetings.html': { text: 'Meetings', href: '/meetings.html' },
      'newsletter.html': { text: 'Newsletters', href: '/newsletter.html' },
      'resources.html': { text: 'Resources', href: '/resources.html' },
      'glossary.html': { text: 'Glossary', href: '/glossary.html' },
      'contact.html': { text: 'Contact', href: '/contact.html' },
      'search.html': { text: 'Search', href: '/search.html' }
    };

    // Check if we're on a subpage
    if (currentPath.includes('/newsletters/')) {
      items.push({ text: 'Newsletters', href: '/newsletter.html' });
      items.push({ text: pageTitle, href: currentPath, current: true });
    } else if (currentPath.includes('/resources/')) {
      items.push({ text: 'Resources', href: '/resources.html' });
      items.push({ text: pageTitle, href: currentPath, current: true });
    } else if (pageMap[currentPage]) {
      items.push({ ...pageMap[currentPage], current: true });
    }

    // Don't show breadcrumb on home page
    if (items.length <= 1) {
      this.container.style.display = 'none';
      return;
    }

    this.render(items);
  }

  /**
     * Render breadcrumb navigation
     * @param {Array} items - Array of breadcrumb items
     */
  render(items) {
    const nav = document.createElement('nav');
    nav.setAttribute('aria-label', 'Breadcrumb');
    nav.className = 'breadcrumb-navigation';

    const ol = document.createElement('ol');
    ol.className = 'breadcrumb-list';

    items.forEach((item, index) => {
      const li = document.createElement('li');
      li.className = 'breadcrumb-item';

      if (item.current) {
        li.setAttribute('aria-current', 'page');
        li.textContent = item.text;
      } else {
        const link = document.createElement('a');
        link.href = item.href;
        link.textContent = item.text;
        li.appendChild(link);
      }

      ol.appendChild(li);

      // Add separator except for last item
      if (index < items.length - 1) {
        const separator = document.createElement('span');
        separator.className = 'breadcrumb-separator';
        separator.setAttribute('aria-hidden', 'true');
        separator.textContent = ` ${this.separator} `;
        ol.appendChild(separator);
      }
    });

    nav.appendChild(ol);
    this.container.innerHTML = '';
    this.container.appendChild(nav);
  }

  /**
     * Manually set breadcrumb items
     * @param {Array} items - Array of breadcrumb items
     */
  setBreadcrumb(items) {
    if (!this.container) {
      logger.warn('Breadcrumb not initialized');
      return;
    }

    this.render([this.defaultHome, ...items]);
  }

  /**
     * Update the current page in breadcrumb
     * @param {string} text - Text for current page
     */
  updateCurrent(text) {
    const currentItem = this.container.querySelector('[aria-current="page"]');
    if (currentItem) {
      currentItem.textContent = text;
    }
  }
}

// Export singleton instance
const breadcrumb = new BreadcrumbNavigation();

// Auto-initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => breadcrumb.init());
} else {
  breadcrumb.init();
}

export default breadcrumb;
