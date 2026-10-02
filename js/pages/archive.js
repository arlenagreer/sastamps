/**
 * Archive Page JavaScript Bundle
 * Renders the whole newsletter listing from JSON:
 * - #current-newsletters: every issue in newsletters.json (2025 on), as cards;
 * - #archived-newsletters: archived-newsletters.json (2008-2024), as lists.
 * Issue cards are never hand-written into archive.html, so a new issue added
 * to newsletters.json (the /philatex-update run) appears here on its own.
 */

// Import utilities
import { safeQuerySelector, safeUrl } from '../utils/safe-dom.js';
import { parseLocalDate } from '../utils/dates.js';
import { createLogger } from '../utils/logger.js';
import { fetchJSON } from '../utils/fetch-json.js';
import { addEventListenerWithCleanup } from '../utils/event-cleanup.js';
import { retireServiceWorkers } from '../utils/service-worker.js';
import { currentIssueYears, archiveYears } from '../utils/archive-listing.js';

// Import core modules
import breadcrumb from '../modules/breadcrumb.js';

const logger = createLogger('ArchivePage');

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) {
    node.className = className;
  }
  if (text !== undefined) {
    node.textContent = text;
  }
  return node;
}

function icon(classes) {
  const i = el('i', classes);
  i.setAttribute('aria-hidden', 'true');
  return i;
}

function formatPublished(isoDate) {
  const date = parseLocalDate(isoDate);
  return date
    ? date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : '';
}

// "638 KB" or a byte count, shown as written in newsletters.json.
function formatSize(fileSize) {
  if (typeof fileSize === 'number') {
    return fileSize >= 1048576 ? `${(fileSize / 1048576).toFixed(1)} MB` : `${Math.round(fileSize / 1024)} KB`;
  }
  return fileSize || '';
}

/** One current-era issue card (or a "Not Available" placeholder). */
function renderIssueCard(issue) {
  const fileUrl = issue.status === 'available' ? safeUrl(issue.filePath, '') : '';
  const card = el('div', fileUrl ? 'archive-item' : 'archive-item archive-item-missing');

  const header = el('div', 'archive-item-header');
  header.appendChild(el('h3', '', 'SAPA PHILATEX'));
  header.appendChild(el('p', '', issue.editionLabel));
  card.appendChild(header);

  const content = el('div', 'archive-item-content');
  if (!fileUrl) {
    content.appendChild(el('p', 'unavailable-badge', 'Not Available'));
    content.appendChild(el('p', '', 'This issue is not yet in the online archive. If you have a copy, please contact our newsletter editor.'));
    card.appendChild(content);
    return card;
  }

  const published = formatPublished(issue.publishDate);
  if (published) {
    const p = el('p');
    p.appendChild(el('strong', '', 'Published:'));
    p.appendChild(document.createTextNode(` ${published}`));
    content.appendChild(p);
  }
  if (issue.description) {
    content.appendChild(el('p', '', issue.description));
  }

  const meta = el('div', 'newsletter-meta');
  if (issue.pageCount) {
    const pages = el('span', 'meta-item');
    pages.appendChild(icon('fas fa-file-alt'));
    pages.appendChild(document.createTextNode(` ${issue.pageCount} pages`));
    meta.appendChild(pages);
  }
  const size = formatSize(issue.fileSize);
  if (size) {
    const s = el('span', 'meta-item');
    s.appendChild(icon('fas fa-download'));
    s.appendChild(document.createTextNode(` ${size}`));
    meta.appendChild(s);
  }
  if (meta.childNodes.length) {
    content.appendChild(meta);
  }

  const link = el('a', 'btn btn-primary');
  link.setAttribute('href', fileUrl);
  link.setAttribute('target', '_blank');
  link.appendChild(icon('fas fa-file-pdf'));
  link.appendChild(document.createTextNode(' Download PDF'));
  const hint = el('span', 'sr-only', ` ${issue.editionLabel} (opens in a new tab)`);
  link.appendChild(hint);
  content.appendChild(link);

  card.appendChild(content);
  return card;
}

/** One archive list row (or a "Not Available" row). */
function renderArchiveRow(entry) {
  const li = el('li');
  // An unsafe or empty filePath (javascript:, data:, ...) gets no link.
  const fileUrl = entry.status === 'available' ? safeUrl(entry.filePath, '') : '';
  if (fileUrl) {
    li.className = 'archive-list-item';
    const link = el('a', 'archive-link');
    link.setAttribute('href', fileUrl);
    link.setAttribute('target', '_blank');
    link.appendChild(icon('fas fa-file-pdf'));
    link.appendChild(document.createTextNode(entry.editionLabel));
    li.appendChild(link);
  } else {
    li.className = 'archive-list-item archive-item-unavailable';
    li.appendChild(el('span', 'archive-label', entry.editionLabel));
    li.appendChild(el('span', 'unavailable-badge', 'Not Available'));
  }
  return li;
}

function showLoadError(container, message) {
  container.appendChild(el('p', '', message));
}

/** The 2025+ issue cards, newest first, from newsletters.json. */
async function renderCurrentNewsletters() {
  const container = document.getElementById('current-newsletters');
  if (!container) {
    logger.warn('Current newsletters container not found');
    return;
  }
  try {
    const data = await fetchJSON('data/newsletters/newsletters.json');
    for (const { year, issues } of currentIssueYears(data.newsletters)) {
      const section = el('div', 'archive-year-section');
      section.appendChild(el('h2', 'archive-year-header', `${year} Newsletter Archive`));
      const grid = el('div', 'archive-grid');
      issues.forEach(issue => grid.appendChild(renderIssueCard(issue)));
      section.appendChild(grid);
      container.appendChild(section);
    }
  } catch (error) {
    logger.error('Failed to load current newsletters:', error);
    showLoadError(container, 'Unable to load the latest newsletters. Please try again later, or see the Newsletter page for the current issue.');
  }
}

/** The 2008-2024 year lists, from archived-newsletters.json. */
async function renderArchivedNewsletters() {
  const container = document.getElementById('archived-newsletters');
  if (!container) {
    logger.warn('Archived newsletters container not found');
    return;
  }
  try {
    const data = await fetchJSON('data/newsletters/archived-newsletters.json');
    const years = archiveYears(data.archivedNewsletters);
    for (const { year, issues } of years) {
      const section = el('div', 'archive-year-section');
      section.appendChild(el('h2', 'archive-year-header', `${year} Archive`));
      const list = el('ul', 'archive-list');
      issues.forEach(entry => list.appendChild(renderArchiveRow(entry)));
      section.appendChild(list);
      container.appendChild(section);
    }
    logger.info(`Rendered archived newsletters for ${years.length} years`);
  } catch (error) {
    logger.error('Failed to load archived newsletters:', error);
    showLoadError(container, 'Unable to load the newsletter archive. Please try again later.');
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

    // Remove any stale service worker (the site no longer registers one)
    retireServiceWorkers();

    // Render the issue listing (2025 on, then 2008-2024) from JSON
    await Promise.all([renderCurrentNewsletters(), renderArchivedNewsletters()]);

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
      // The menu button (label) toggles the checkbox itself; treating a tap on
      // it as "outside" unchecked the box and the label re-checked it, so the
      // menu could never be closed from the button.
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
  document.addEventListener('DOMContentLoaded', initArchivePage);
} else {
  initArchivePage();
}

// Export for external access if needed
export { initArchivePage };
