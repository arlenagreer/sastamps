/**
 * Resources Page Bundle
 * Only includes functionality needed for the resources page
 */

import { debounce } from '../utils/performance.js';
import { safeQuerySelector, escapeHTML, safeUrl } from '../utils/safe-dom.js';
import { fetchJSON } from '../utils/fetch-json.js';
import { addEventListenerWithCleanup } from '../utils/event-cleanup.js';
import { formatDate } from '../utils/helpers.js';
import { createLogger } from '../utils/logger.js';
import { announceStatus, countSummary } from '../utils/announce.js';

const logger = createLogger('ResourcesPage');

const RESOURCES_URL = 'data/members/resources.json';

// What the visitor has asked to see. Search, both filters and "My bookmarks"
// combine: a resource is shown only when it passes all of them.
const viewState = {
  query: '',
  category: '',
  difficulty: '',
  bookmarksOnly: false
};

let allResources = [];

// Resources-specific functionality
async function initializeResourcesPage() {
  const resourcesData = await loadResourcesData();
  if (!resourcesData) {
    logger.error('Failed to load resources data');
    return;
  }

  allResources = resourcesData.resources || [];

  displayFeaturedResources(allResources);
  displayCategorizedResources(allResources, resourcesData.categories || []);
  displayAllResources(allResources);

  initializeResourceSearch();
  initializeResourceFilters();

  updateBookmarkStates();
  applyView();

  // Links such as resources.html#resource-stamp-grading-guide (site search
  // results) land on the item once the list exists.
  revealResourceFromHash();
  addEventListenerWithCleanup(window, 'hashchange', revealResourceFromHash);
}

async function loadResourcesData() {
  try {
    return await fetchJSON(RESOURCES_URL);
  } catch (error) {
    logger.error('Failed to load resources data:', error);
    showResourcesError('Unable to load resources. Please try again later.');
    return null;
  }
}

/* ------------------------------------------------------------------------
 * Bookmarks. localStorage can be missing or throw (private windows, blocked
 * site data). Bookmarks then live in memory for this visit, and the visitor is
 * told they will not be kept, instead of the button silently failing.
 * --------------------------------------------------------------------- */
const BOOKMARK_KEY = 'resource_bookmarks';
let memoryBookmarks = null;
let bookmarkStorageWorks = true;

function readBookmarks() {
  if (memoryBookmarks) {
    return [...memoryBookmarks];
  }
  try {
    const parsed = JSON.parse(window.localStorage.getItem(BOOKMARK_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.filter(id => typeof id === 'string') : [];
  } catch (error) {
    logger.warn('Bookmarks unavailable from storage:', error);
    bookmarkStorageWorks = false;
    memoryBookmarks = [];
    return [];
  }
}

function writeBookmarks(list) {
  if (!memoryBookmarks) {
    try {
      window.localStorage.setItem(BOOKMARK_KEY, JSON.stringify(list));
      return;
    } catch (error) {
      logger.warn('Bookmarks could not be saved to storage:', error);
      bookmarkStorageWorks = false;
    }
  }
  memoryBookmarks = [...list];
}

/* ------------------------------------------------------------------------
 * Rendering
 * --------------------------------------------------------------------- */
function bookmarkButton(resourceId, extraClass = '') {
  return `<button type="button" class="btn-outline btn-bookmark${extraClass}" data-resource-id="${escapeHTML(resourceId)}" aria-pressed="false">🔖 Bookmark</button>`;
}

function displayFeaturedResources(resources) {
  const container = safeQuerySelector('#featured-resources-grid');
  if (!container) {return;}

  const featuredResources = resources.filter(resource => resource.featured);

  if (featuredResources.length === 0) {
    container.innerHTML = '<p>No featured resources available at this time.</p>';
    return;
  }

  const html = featuredResources.map(resource => `
        <div class="resource-card featured-resource" data-id="${escapeHTML(resource.id)}" data-category="${escapeHTML(resource.category)}" data-difficulty="${escapeHTML(resource.difficulty)}">
            <div class="resource-header">
                <h3>${escapeHTML(resource.title)}</h3>
                <div class="resource-badges">
                    <span class="difficulty-badge difficulty-${escapeHTML(resource.difficulty)}">${escapeHTML(resource.difficulty)}</span>
                    ${resource.estimatedReadTime ? `<span class="read-time">📖 ${escapeHTML(String(resource.estimatedReadTime))} min read</span>` : ''}
                </div>
            </div>

            <div class="resource-content">
                <p class="resource-summary">${escapeHTML(resource.summary)}</p>

                <div class="resource-meta">
                    <span class="resource-type">📄 ${escapeHTML(formatResourceType(resource.type))}</span>
                    <span class="resource-category">🏷️ ${escapeHTML(formatCategory(resource.category))}</span>
                    ${resource.author ? `<span class="resource-author">✍️ ${escapeHTML(resource.author.name)}</span>` : ''}
                </div>

                ${resource.tags && resource.tags.length > 0 ? `
                    <div class="resource-tags">
                        ${resource.tags.map(tag => `<span class="tag">${escapeHTML(tag)}</span>`).join('')}
                    </div>
                ` : ''}
            </div>

            <div class="resource-actions">
                <button type="button" class="btn-primary btn-read-resource" data-resource-id="${escapeHTML(resource.id)}">
                    📖 Read Guide
                </button>
                ${resource.sections && resource.sections.length > 0 ? `
                    <button type="button" class="btn-secondary btn-view-sections" data-resource-id="${escapeHTML(resource.id)}">
                        📋 View Sections
                    </button>
                ` : ''}
                ${bookmarkButton(resource.id)}
            </div>
        </div>
    `).join('');

  container.innerHTML = html;
  bindResourceActions(container);
}

function displayCategorizedResources(resources, categories) {
  const container = safeQuerySelector('#categories-container');
  if (!container) {return;}

  const html = categories.map(category => {
    const categoryResources = resources.filter(resource => resource.category === category.id);

    return `
            <div class="category-card" data-category="${escapeHTML(category.id)}">
                <div class="category-header">
                    <h3>${escapeHTML(category.name)}</h3>
                    <p class="category-description">${escapeHTML(category.description)}</p>
                    <span class="resource-count">${categoryResources.length} resource${categoryResources.length !== 1 ? 's' : ''}</span>
                </div>

                <div class="category-resources">
                    ${categoryResources.slice(0, 3).map(resource => `
                        <div class="resource-preview" data-id="${escapeHTML(resource.id)}">
                            <h4><a href="#resource-${escapeHTML(resource.id)}" class="resource-link" data-resource-id="${escapeHTML(resource.id)}">${escapeHTML(resource.title)}</a></h4>
                            <p class="resource-preview-summary">${escapeHTML(resource.summary.substring(0, 100))}...</p>
                            <div class="resource-preview-meta">
                                <span class="difficulty-badge difficulty-${escapeHTML(resource.difficulty)}">${escapeHTML(resource.difficulty)}</span>
                                ${resource.estimatedReadTime ? `<span class="read-time">${escapeHTML(String(resource.estimatedReadTime))} min</span>` : ''}
                            </div>
                        </div>
                    `).join('')}

                    ${categoryResources.length > 3 ? `
                        <button type="button" class="btn-outline btn-view-all-category" data-category="${escapeHTML(category.id)}">
                            View All ${categoryResources.length} Resources
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
  }).join('');

  container.innerHTML = html;
  bindCategoryActions(container);
}

function displayAllResources(resources) {
  const container = safeQuerySelector('#resources-container');
  if (!container) {return;}

  const html = resources.map(resource => `
        <div class="resource-item" id="resource-${escapeHTML(resource.id)}" data-id="${escapeHTML(resource.id)}" data-category="${escapeHTML(resource.category)}" data-difficulty="${escapeHTML(resource.difficulty)}">
            <div class="resource-item-header">
                <h3><a href="#resource-${escapeHTML(resource.id)}" class="resource-link" data-resource-id="${escapeHTML(resource.id)}">${escapeHTML(resource.title)}</a></h3>
                <div class="resource-badges">
                    <span class="difficulty-badge difficulty-${escapeHTML(resource.difficulty)}">${escapeHTML(resource.difficulty)}</span>
                    ${resource.featured ? '<span class="featured-badge">⭐ Featured</span>' : ''}
                </div>
            </div>

            <p class="resource-summary">${escapeHTML(resource.summary)}</p>

            <div class="resource-meta">
                <span class="resource-type">📄 ${escapeHTML(formatResourceType(resource.type))}</span>
                <span class="resource-category">🏷️ ${escapeHTML(formatCategory(resource.category))}</span>
                ${resource.estimatedReadTime ? `<span class="read-time">📖 ${escapeHTML(String(resource.estimatedReadTime))} min read</span>` : ''}
                ${resource.dateUpdated ? `<span class="last-updated">📅 Updated ${escapeHTML(formatDate(resource.dateUpdated))}</span>` : ''}
            </div>

            <div class="resource-actions">
                <button type="button" class="btn-primary btn-read-resource" data-resource-id="${escapeHTML(resource.id)}">
                    📖 Read Guide
                </button>
                ${resource.sections && resource.sections.length > 0 ? `
                    <button type="button" class="btn-secondary btn-view-sections" data-resource-id="${escapeHTML(resource.id)}">
                        📋 View Sections
                    </button>
                ` : ''}
                ${bookmarkButton(resource.id)}
            </div>
        </div>
    `).join('');

  container.innerHTML = html;
  bindResourceActions(container);
}

/* ------------------------------------------------------------------------
 * Search, filters and the bookmarks view
 * --------------------------------------------------------------------- */
function initializeResourceSearch() {
  const searchInput = safeQuerySelector('#resource-search');
  if (!searchInput) {return;}

  const runSearch = debounce((query) => {
    viewState.query = query;
    applyView();
  }, 300);

  addEventListenerWithCleanup(searchInput, 'input', (e) => {
    runSearch(e.target.value);
  });
}

function initializeResourceFilters() {
  const categoryFilter = safeQuerySelector('#category-filter');
  const difficultyFilter = safeQuerySelector('#difficulty-filter');
  const bookmarksFilter = safeQuerySelector('#bookmarks-filter');
  const clearButton = safeQuerySelector('#clear-filters');

  if (categoryFilter) {
    addEventListenerWithCleanup(categoryFilter, 'change', () => {
      viewState.category = categoryFilter.value;
      applyView();
    });
  }

  if (difficultyFilter) {
    addEventListenerWithCleanup(difficultyFilter, 'change', () => {
      viewState.difficulty = difficultyFilter.value;
      applyView();
    });
  }

  if (bookmarksFilter) {
    bookmarksFilter.hidden = false;
    addEventListenerWithCleanup(bookmarksFilter, 'click', () => {
      viewState.bookmarksOnly = !viewState.bookmarksOnly;
      applyView();
    });
  }

  if (clearButton) {
    addEventListenerWithCleanup(clearButton, 'click', () => {
      if (categoryFilter) {categoryFilter.value = '';}
      if (difficultyFilter) {difficultyFilter.value = '';}
      const searchInput = safeQuerySelector('#resource-search');
      if (searchInput) {searchInput.value = '';}
      viewState.query = '';
      viewState.category = '';
      viewState.difficulty = '';
      viewState.bookmarksOnly = false;
      applyView();
    });
  }
}

function searchResources(resources, query) {
  const searchTerms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (searchTerms.length === 0) {return resources;}

  return resources.filter(resource => {
    const searchText = [
      resource.title,
      resource.summary,
      resource.content,
      ...(resource.tags || []),
      resource.category,
      resource.difficulty,
      resource.author?.name || ''
    ].join(' ').toLowerCase();

    return searchTerms.every(term => searchText.includes(term));
  });
}

function matchingResources() {
  let results = searchResources(allResources, viewState.query);
  if (viewState.category) {
    results = results.filter(r => r.category === viewState.category);
  }
  if (viewState.difficulty) {
    results = results.filter(r => r.difficulty === viewState.difficulty);
  }
  if (viewState.bookmarksOnly) {
    const bookmarks = readBookmarks();
    results = results.filter(r => bookmarks.includes(r.id));
  }
  return results;
}

/**
 * Show exactly the resources that pass the search, both filters and the
 * bookmarks view; hide sections left empty and say so when nothing matches.
 */
function applyView() {
  const matches = matchingResources();
  const ids = new Set(matches.map(r => r.id));

  document.querySelectorAll('.resource-item, .resource-card').forEach(item => {
    item.style.display = ids.has(item.dataset.id) ? '' : 'none';
  });

  document.querySelectorAll('.category-card').forEach(card => {
    const visible = [...card.querySelectorAll('.resource-preview')].filter(preview => {
      const show = ids.has(preview.dataset.id);
      preview.style.display = show ? '' : 'none';
      return show;
    });
    card.style.display = visible.length > 0 ? '' : 'none';
  });

  const featuredSection = safeQuerySelector('#featured-resources');
  if (featuredSection && featuredSection.querySelector('.resource-card')) {
    featuredSection.hidden = ![...featuredSection.querySelectorAll('.resource-card')].some(c => c.style.display !== 'none');
  }
  const categorySection = safeQuerySelector('#categorized-resources');
  if (categorySection) {
    categorySection.hidden = ![...categorySection.querySelectorAll('.category-card')].some(c => c.style.display !== 'none');
  }

  const emptyMessage = safeQuerySelector('#resources-empty');
  if (emptyMessage) {
    if (matches.length > 0) {
      emptyMessage.hidden = true;
      emptyMessage.textContent = '';
    } else {
      emptyMessage.hidden = false;
      const noBookmarks = viewState.bookmarksOnly && readBookmarks().length === 0;
      emptyMessage.textContent = noBookmarks
        ? 'You have not bookmarked any resources yet. Use a resource\'s Bookmark button to save it here.'
        : 'No resources match your search and filters. Try different words, or choose Clear Filters.';
    }
  }

  updateBookmarksFilterButton();

  const items = document.querySelectorAll('#resources-container .resource-item');
  const shown = [...items].filter(item => item.style.display !== 'none').length;
  announceStatus(
    safeQuerySelector('#resources-status'),
    shown === 0 ? 'No resources match' : countSummary(shown, items.length, 'resource', 'resources')
  );
}

function updateBookmarksFilterButton() {
  const button = safeQuerySelector('#bookmarks-filter');
  if (!button) {return;}
  const count = readBookmarks().filter(id => allResources.some(r => r.id === id)).length;
  button.setAttribute('aria-pressed', String(viewState.bookmarksOnly));
  button.classList.toggle('active', viewState.bookmarksOnly);
  button.textContent = `🔖 My Bookmarks (${count})`;
}

function revealResourceFromHash() {
  const match = /^#resource-(.+)$/.exec(window.location.hash || '');
  if (!match) {return;}
  const item = [...document.querySelectorAll('#resources-container .resource-item')]
    .find(el => `resource-${el.dataset.id}` === decodeURIComponentSafe(match[0].slice(1)));
  if (!item) {return;}
  if (item.style.display === 'none') {
    // Filters hide it: clear them so the linked resource is visible.
    safeQuerySelector('#clear-filters')?.click();
  }
  // scroll-margin-top (styles.css) keeps it clear of the sticky header.
  item.scrollIntoView({ behavior: 'smooth', block: 'start' });
  item.classList.add('highlighted');
  setTimeout(() => item.classList.remove('highlighted'), 2000);
}

function decodeURIComponentSafe(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/* ------------------------------------------------------------------------
 * Actions
 * --------------------------------------------------------------------- */
function bindResourceActions(container) {
  container.querySelectorAll('.btn-read-resource, .resource-link').forEach(button => {
    addEventListenerWithCleanup(button, 'click', (e) => {
      e.preventDefault();
      const btn = e.currentTarget;
      const {resourceId} = btn.dataset;
      if (resourceId) {
        openResourceModal(resourceId, btn);
      } else {
        logger.error('No resourceId found on button:', btn);
      }
    });
  });

  container.querySelectorAll('.btn-bookmark').forEach(button => {
    addEventListenerWithCleanup(button, 'click', (e) => {
      e.preventDefault();
      const btn = e.currentTarget;
      const {resourceId} = btn.dataset;
      if (resourceId) {
        toggleBookmark(resourceId, btn);
      }
    });
  });

  container.querySelectorAll('.btn-view-sections').forEach(button => {
    addEventListenerWithCleanup(button, 'click', (e) => {
      e.preventDefault();
      const btn = e.currentTarget;
      const {resourceId} = btn.dataset;
      if (resourceId) {
        showResourceSections(resourceId, btn);
      }
    });
  });
}

function bindCategoryActions(container) {
  container.querySelectorAll('.resource-link').forEach(link => {
    addEventListenerWithCleanup(link, 'click', (e) => {
      e.preventDefault();
      const btn = e.currentTarget;
      const {resourceId} = btn.dataset;
      if (resourceId) {
        openResourceModal(resourceId, btn);
      }
    });
  });

  container.querySelectorAll('.btn-view-all-category').forEach(button => {
    addEventListenerWithCleanup(button, 'click', (e) => {
      e.preventDefault();
      const categoryId = e.currentTarget.dataset.category;
      if (categoryId) {
        filterByCategory(categoryId);
      }
    });
  });
}

/* ------------------------------------------------------------------------
 * Guide dialog: a native modal <dialog> (role dialog, aria-modal, the page
 * behind is inert). Focus moves to the title, Tab stays inside, Escape and
 * both Close buttons close it, and focus returns to the control that opened
 * it. Its layout lives in styles.css (no inline !important styles), so the
 * print stylesheet can print the whole guide.
 * --------------------------------------------------------------------- */
let activeDialog = null;

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function openDialog(innerHTML, titleId, returnFocus) {
  if (activeDialog) {
    closeDialog({ restoreFocus: false });
  }

  const dialog = document.createElement('dialog');
  dialog.className = 'resource-dialog';
  dialog.setAttribute('aria-labelledby', titleId);
  dialog.setAttribute('aria-modal', 'true');
  dialog.innerHTML = `<div class="resource-dialog-inner">${innerHTML}</div>`;
  document.body.appendChild(dialog);
  document.body.classList.add('resource-dialog-open');

  activeDialog = { dialog, returnFocus };

  if (typeof dialog.showModal === 'function') {
    dialog.showModal();
  } else {
    dialog.setAttribute('open', '');
    dialog.setAttribute('role', 'dialog');
  }

  // Native Escape fires "cancel": close through our path so focus returns.
  addEventListenerWithCleanup(dialog, 'cancel', (e) => {
    e.preventDefault();
    closeDialog();
  });

  addEventListenerWithCleanup(dialog, 'keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeDialog();
      return;
    }
    if (e.key !== 'Tab') {return;}
    const focusable = [...dialog.querySelectorAll(FOCUSABLE)].filter(el => el.offsetParent !== null || el === document.activeElement);
    if (focusable.length === 0) {return;}
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const current = document.activeElement;
    if (e.shiftKey && (current === first || !dialog.contains(current) || current === dialog.querySelector(`#${titleId}`))) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && (current === last || !dialog.contains(current))) {
      e.preventDefault();
      first.focus();
    }
  });

  // A click on the backdrop lands on the <dialog> element itself.
  addEventListenerWithCleanup(dialog, 'click', (e) => {
    if (e.target === dialog) {
      closeDialog();
      return;
    }
    if (e.target.closest('[data-dialog-close]')) {
      closeDialog();
      return;
    }
    if (e.target.closest('[data-dialog-print]')) {
      window.print();
    }
  });

  const title = dialog.querySelector(`#${titleId}`);
  if (title) {
    title.focus();
  }
  return dialog;
}

function closeDialog({ restoreFocus = true } = {}) {
  if (!activeDialog) {return;}
  const { dialog, returnFocus } = activeDialog;
  activeDialog = null;
  if (typeof dialog.close === 'function' && dialog.open) {
    dialog.close();
  }
  dialog.remove();
  document.body.classList.remove('resource-dialog-open');
  if (restoreFocus && returnFocus && returnFocus.isConnected) {
    returnFocus.focus();
  }
}

function dialogHeader(titleId, title) {
  return `
        <div class="resource-dialog-bar">
            <h2 id="${titleId}" class="resource-dialog-title" tabindex="-1">${escapeHTML(title)}</h2>
            <button type="button" class="resource-dialog-close" data-dialog-close aria-label="Close">
                <span aria-hidden="true">&times;</span>
            </button>
        </div>`;
}

async function openResourceModal(resourceId, returnFocus = document.activeElement) {
  let resource;
  try {
    const resourcesData = await fetchJSON(RESOURCES_URL);
    resource = resourcesData.resources.find(r => r.id === resourceId);
  } catch (error) {
    logger.error('Failed to load resource:', error);
    alert('Unable to load resource content. Please try again.');
    return;
  }

  if (!resource) {
    logger.error('Resource not found:', resourceId);
    return;
  }

  const titleId = `resource-dialog-title-${resource.id}`;
  const modalContent = `
            ${dialogHeader(titleId, resource.title)}
            <div class="resource-modal">
                <div class="resource-modal-header">
                    <div class="resource-modal-meta">
                        <span class="difficulty-badge difficulty-${escapeHTML(resource.difficulty)}">${escapeHTML(resource.difficulty)}</span>
                        ${resource.estimatedReadTime ? `<span class="read-time">📖 ${escapeHTML(String(resource.estimatedReadTime))} min read</span>` : ''}
                        ${resource.author ? `<span class="author">✍️ ${escapeHTML(resource.author.name)}</span>` : ''}
                    </div>
                </div>

                <div class="resource-modal-content">
                    ${renderMarkdown(resource.content, resource.title)}

                    ${resource.externalLinks && resource.externalLinks.length > 0 ? `
                        <div class="external-links-section">
                            <h3>Additional Resources</h3>
                            <ul class="external-links-list">
                                ${resource.externalLinks.map(link => {
    const linkUrl = safeUrl(link.url, '');
    return `
                                    <li>
                                        ${linkUrl ? `<a href="${escapeHTML(linkUrl)}" target="_blank" rel="noopener">${escapeHTML(link.title)}</a>` : escapeHTML(link.title)}
                                        ${link.description ? `<span class="link-description">${escapeHTML(link.description)}</span>` : ''}
                                    </li>
                                `;
  }).join('')}
                            </ul>
                        </div>
                    ` : ''}
                </div>

                <div class="resource-modal-actions">
                    ${bookmarkButton(resource.id, ' btn-bookmark-modal')}
                    <button type="button" class="btn-secondary btn-print" data-dialog-print>
                        🖨️ Print
                    </button>
                    <button type="button" class="btn-primary btn-close-modal" data-dialog-close>
                        Close
                    </button>
                </div>
            </div>
        `;

  const dialog = openDialog(modalContent, titleId, returnFocus);

  const modalBookmarkButton = dialog.querySelector('.btn-bookmark-modal');
  if (modalBookmarkButton) {
    setBookmarkButtonState(modalBookmarkButton, readBookmarks().includes(resource.id));
    addEventListenerWithCleanup(modalBookmarkButton, 'click', (e) => {
      e.preventDefault();
      toggleBookmark(resource.id, e.currentTarget);
    });
  }
}

async function showResourceSections(resourceId, returnFocus = document.activeElement) {
  let resource;
  try {
    const resourcesData = await fetchJSON(RESOURCES_URL);
    resource = resourcesData.resources.find(r => r.id === resourceId);
  } catch (error) {
    logger.error('Failed to load resource sections:', error);
    alert('Unable to load sections. Please try again.');
    return;
  }

  if (!resource || !resource.sections) {
    logger.error('Resource sections not found:', resourceId);
    return;
  }

  const titleId = `resource-sections-title-${resource.id}`;
  const sections = [...resource.sections].sort((a, b) => a.order - b.order);
  const modalContent = `
            ${dialogHeader(titleId, `${resource.title}: Sections`)}
            <div class="resource-sections-modal resource-modal">
                <p class="sections-count">${sections.length} sections available</p>

                <div class="sections-list">
                    ${sections.map(section => `
                        <div class="section-item">
                            <h3>${escapeHTML(String(section.order))}. ${escapeHTML(section.title)}</h3>
                            <p>${escapeHTML(section.content)}</p>
                        </div>
                    `).join('')}
                </div>

                <div class="resource-modal-actions">
                    <button type="button" class="btn-primary btn-read-full" data-resource-id="${escapeHTML(resource.id)}">
                        📖 Read Full Guide
                    </button>
                    <button type="button" class="btn-secondary btn-close-modal" data-dialog-close>
                        Close
                    </button>
                </div>
            </div>
        `;

  const dialog = openDialog(modalContent, titleId, returnFocus);

  const readFullButton = dialog.querySelector('.btn-read-full');
  if (readFullButton) {
    addEventListenerWithCleanup(readFullButton, 'click', () => {
      closeDialog({ restoreFocus: false });
      openResourceModal(resourceId, returnFocus);
    });
  }
}

function setBookmarkButtonState(button, isBookmarked) {
  button.textContent = isBookmarked ? '🔖 Bookmarked' : '🔖 Bookmark';
  button.setAttribute('aria-pressed', String(isBookmarked));
  button.classList.toggle('bookmarked', isBookmarked);
}

function updateBookmarkStates() {
  const bookmarks = readBookmarks();
  document.querySelectorAll('.btn-bookmark').forEach(button => {
    setBookmarkButtonState(button, bookmarks.includes(button.dataset.resourceId));
  });
  updateBookmarksFilterButton();
}

function toggleBookmark(resourceId, button) {
  const bookmarks = readBookmarks();
  const wasBookmarked = bookmarks.includes(resourceId);
  const next = wasBookmarked ? bookmarks.filter(id => id !== resourceId) : [...bookmarks, resourceId];
  writeBookmarks(next);

  updateBookmarkStates();
  setBookmarkButtonState(button, !wasBookmarked);

  let message = wasBookmarked ? 'Bookmark removed' : 'Resource bookmarked';
  if (!bookmarkStorageWorks) {
    message += ' for this visit only (this browser is not saving site data)';
  }

  const feedback = document.createElement('div');
  feedback.className = 'bookmark-feedback';
  feedback.setAttribute('role', 'status');
  feedback.textContent = message;
  button.parentNode.appendChild(feedback);
  setTimeout(() => feedback.remove(), bookmarkStorageWorks ? 2000 : 4000);

  if (viewState.bookmarksOnly && !button.closest('dialog')) {
    applyView();
  } else {
    updateBookmarksFilterButton();
  }
}

function filterByCategory(categoryId) {
  const categoryFilter = safeQuerySelector('#category-filter');
  if (categoryFilter) {
    categoryFilter.value = categoryId;
    categoryFilter.dispatchEvent(new Event('change'));
  }

  const allResourcesSection = safeQuerySelector('#all-resources');
  if (allResourcesSection) {
    allResourcesSection.scrollIntoView({ behavior: 'smooth' });
  }
}

/* ------------------------------------------------------------------------
 * Markdown. A deliberately small renderer for the guide text in
 * resources.json: headings, paragraphs, bullet and numbered lists, bold,
 * italic, inline code and links. Every piece of text is HTML-escaped BEFORE
 * any markup is added, and link targets go through safeUrl, so the data
 * cannot inject HTML or script.
 * --------------------------------------------------------------------- */
function renderInline(text) {
  const links = [];
  let html = escapeHTML(text);

  // Links first, swapped for placeholders so emphasis rules cannot touch URLs.
  html = html.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (whole, label, rawUrl) => {
    const url = safeUrl(rawUrl.replace(/&amp;/g, '&'), '');
    if (!url) {return label;}
    const external = /^https?:/i.test(url);
    links.push(`<a href="${escapeHTML(url)}"${external ? ' target="_blank" rel="noopener"' : ''}>${label}</a>`);
    return `\u0000${links.length - 1}\u0000`;
  });

  html = html
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
    .replace(/(^|[^*\w])\*(?!\s)([^*]+?)\*(?!\w)/g, '$1<em>$2</em>')
    .replace(/(^|[^_\w])_(?!\s)([^_]+?)_(?!\w)/g, '$1<em>$2</em>');

  return html.replace(/\u0000(\d+)\u0000/g, (whole, index) => links[Number(index)]);
}

export function renderMarkdown(markdown, title = '') {
  if (typeof markdown !== 'string' || markdown.trim() === '') {return '';}

  const out = [];
  let paragraph = [];
  let list = null; // { type: 'ul' | 'ol', items: [] }
  let first = true;

  const flushParagraph = () => {
    if (paragraph.length > 0) {
      out.push(`<p>${paragraph.map(renderInline).join('<br>')}</p>`);
      paragraph = [];
    }
  };
  const flushList = () => {
    if (list) {
      out.push(`<${list.type}>${list.items.map(item => `<li>${renderInline(item)}</li>`).join('')}</${list.type}>`);
      list = null;
    }
  };

  markdown.replace(/\r\n?/g, '\n').split('\n').forEach(rawLine => {
    const line = rawLine.trim();

    if (line === '') {
      flushParagraph();
      flushList();
      return;
    }

    const heading = /^(#{1,6})\s+(.+?)\s*#*$/.exec(line);
    if (heading) {
      flushParagraph();
      flushList();
      const text = heading[2];
      // The dialog title already shows the guide's title.
      if (!(first && heading[1].length === 1 && title && text.trim() === title.trim())) {
        const level = Math.min(6, Math.max(3, heading[1].length + 1));
        out.push(`<h${level}>${renderInline(text)}</h${level}>`);
      }
      first = false;
      return;
    }
    first = false;

    const bullet = /^[-*+]\s+(.*)$/.exec(line);
    const numbered = /^\d+[.)]\s+(.*)$/.exec(line);
    if (bullet || numbered) {
      flushParagraph();
      const type = bullet ? 'ul' : 'ol';
      if (list && list.type !== type) {flushList();}
      if (!list) {list = { type, items: [] };}
      list.items.push((bullet || numbered)[1]);
      return;
    }

    flushList();
    paragraph.push(line);
  });

  flushParagraph();
  flushList();
  return out.join('\n');
}

function formatResourceType(type) {
  const types = {
    'guide': 'Guide',
    'tutorial': 'Tutorial',
    'reference': 'Reference',
    'checklist': 'Checklist',
    'tool': 'Tool'
  };
  return types[type] || type;
}

function formatCategory(categoryId) {
  const categories = {
    'getting-started': 'Getting Started',
    'grading-condition': 'Grading & Condition',
    'storage-preservation': 'Storage & Preservation',
    'valuation': 'Valuation',
    'reference': 'Reference'
  };
  return categories[categoryId] || categoryId;
}

function showResourcesError(message) {
  const container = safeQuerySelector('#featured-resources-grid');
  if (container) {
    container.innerHTML = `
            <div class="error-message">
                <h3>Unable to Load Resources</h3>
                <p>${escapeHTML(message)}</p>
                <button type="button" class="btn-secondary btn-reload">Refresh Page</button>
            </div>
        `;
    const reload = container.querySelector('.btn-reload');
    if (reload) {
      addEventListenerWithCleanup(reload, 'click', () => window.location.reload());
    }
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeResourcesPage);
} else {
  initializeResourcesPage();
}
