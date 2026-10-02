/**
 * Glossary Page Module
 * Handles glossary search, filtering, and display functionality
 */

import { safeQuerySelector, escapeHTML } from '../utils/safe-dom.js';
import { fetchJSON } from '../utils/fetch-json.js';
import { createLogger } from '../utils/logger.js';
import { addEventListenerWithCleanup } from '../utils/event-cleanup.js';
import { announceStatus, countSummary } from '../utils/announce.js';

const logger = createLogger('GlossaryPage');

const DIFFICULTY_ORDER = { beginner: 1, intermediate: 2, advanced: 3 };

// Initialize glossary page
async function initializeGlossary() {
  // Load glossary data and initialize components
  const searchContainer = safeQuerySelector('#glossary-search-container');
  if (searchContainer) {
    await loadGlossarySearch(searchContainer);
  }

  const filtersContainer = safeQuerySelector('#glossary-filters-container');
  if (filtersContainer) {
    await loadGlossaryFilters(filtersContainer);
  }

  const contentContainer = safeQuerySelector('#glossary-content-container');
  if (contentContainer) {
    await loadGlossaryContent(contentContainer);
  }

  // Load stats
  await loadGlossaryStats();
}

// Auto-initialize if DOM is ready, otherwise wait for DOMContentLoaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeGlossary);
} else {
  initializeGlossary();
}

// Export for manual initialization
window.initializeGlossary = initializeGlossary;

/**
 * Load glossary search functionality
 * @param {HTMLElement} container - Search container element
 */
async function loadGlossarySearch(container) {
  try {
    container.innerHTML = `
            <div class="glossary-search">
                <div class="search-header">
                    <h3><i class="fas fa-search" aria-hidden="true"></i> Search Glossary</h3>
                    <p>Find philatelic terms and definitions</p>
                </div>
                <div class="search-form">
                    <div class="search-input-group">
                        <input
                            type="search"
                            id="glossary-search-input"
                            placeholder="Search terms, definitions, or categories..."
                            aria-label="Search glossary terms"
                            autocomplete="off"
                        >
                        <button id="glossary-search-button" aria-label="Search" type="button">
                            <i class="fas fa-search" aria-hidden="true"></i>
                        </button>
                        <button id="glossary-clear-button" aria-label="Clear search" type="button" style="display: none;">
                            <i class="fas fa-times" aria-hidden="true"></i>
                        </button>
                    </div>
                    <div class="search-suggestions" id="search-suggestions" style="display: none;"></div>
                </div>
                <div id="glossary-search-status" class="sr-only" role="status" aria-live="polite"></div>
                <div id="search-results" style="display: none;"></div>
            </div>
        `;

    // Add search functionality
    const searchInput = container.querySelector('#glossary-search-input');
    const searchButton = container.querySelector('#glossary-search-button');
    const clearButton = container.querySelector('#glossary-clear-button');
    const resultsContainer = container.querySelector('#search-results');
    const statusRegion = container.querySelector('#glossary-search-status');

    let searchTimeout;

    // Real-time search with debouncing
    addEventListenerWithCleanup(searchInput, 'input', (e) => {
      clearTimeout(searchTimeout);
      const query = e.target.value.trim();

      if (query.length > 0) {
        clearButton.style.display = 'block';
        searchTimeout = setTimeout(() => performSearch(query, resultsContainer), 300);
      } else {
        cancelPendingSearch();
        clearButton.style.display = 'none';
        resultsContainer.style.display = 'none';
        if (statusRegion) { statusRegion.textContent = ''; }
        applyFilters();
      }
    });

    // Search button click
    addEventListenerWithCleanup(searchButton, 'click', () => {
      const query = searchInput.value.trim();
      clearTimeout(searchTimeout);
      if (query) {
        performSearch(query, resultsContainer);
      }
    });

    // Clear button click
    addEventListenerWithCleanup(clearButton, 'click', () => {
      clearTimeout(searchTimeout);
      cancelPendingSearch();
      searchInput.value = '';
      clearButton.style.display = 'none';
      resultsContainer.style.display = 'none';
      if (statusRegion) { statusRegion.textContent = ''; }
      applyFilters();
      searchInput.focus();
    });

    // Enter key search
    addEventListenerWithCleanup(searchInput, 'keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const query = searchInput.value.trim();
        clearTimeout(searchTimeout);
        if (query) {
          performSearch(query, resultsContainer);
        }
      }
    });

    // Search result links (results are re-rendered; one delegated handler)
    addEventListenerWithCleanup(resultsContainer, 'click', (e) => {
      const link = e.target.closest('.search-result-link');
      if (!link) {return;}
      e.preventDefault();
      if (link.dataset.termId) {
        scrollToTerm(link.dataset.termId);
      }
    });

  } catch (error) {
    logger.error('Failed to load glossary search:', error);
    container.innerHTML = '<p class="error-message">Unable to load search functionality.</p>';
  }
}

/**
 * Load the glossary terms. The JSON is fetched once per page (fetchJSON
 * memoises it); callers get their own array so sorting or filtering never
 * reorders the shared copy.
 * @returns {Promise<Array>} Glossary terms
 */
async function loadGlossaryTerms() {
  const glossaryData = await fetchJSON('data/glossary/glossary.json');
  return [...(glossaryData.terms || [])];
}

/**
 * Glossary search generation. Every search, and every clear, takes a new
 * number; a search whose number is no longer current when its data arrives
 * is stale and must not render or announce anything (a slow earlier query
 * would otherwise overwrite a newer one, or speak after the box was cleared).
 */
let searchGeneration = 0;

function cancelPendingSearch() {
  searchGeneration++;
}

/**
 * Load glossary filters
 * @param {HTMLElement} container - Filters container element
 */
async function loadGlossaryFilters(container) {
  try {
    const terms = await loadGlossaryTerms();

    // Extract unique categories and difficulties
    const categories = [...new Set(terms.map(term => term.category))]
      .sort((a, b) => formatCategory(a).localeCompare(formatCategory(b)));
    const difficulties = [...new Set(terms.map(term => term.difficulty))]
      .sort((a, b) => (DIFFICULTY_ORDER[a] || 99) - (DIFFICULTY_ORDER[b] || 99));

    // "Group by" replaces the old "Sort by": every term shares one dateAdded,
    // so "Recently Added" could never change anything and is gone.
    container.innerHTML = `
            <div class="glossary-filters">
                <div class="filters-grid">
                    <div class="filter-group">
                        <label for="category-filter">
                            <i class="fas fa-layer-group" aria-hidden="true"></i> Category
                        </label>
                        <select id="category-filter">
                            <option value="">All Categories</option>
                            ${categories.map(cat => `<option value="${escapeHTML(cat)}">${escapeHTML(formatCategory(cat))}</option>`).join('')}
                        </select>
                    </div>

                    <div class="filter-group">
                        <label for="difficulty-filter">
                            <i class="fas fa-signal" aria-hidden="true"></i> Difficulty
                        </label>
                        <select id="difficulty-filter">
                            <option value="">All Levels</option>
                            ${difficulties.map(diff => `<option value="${escapeHTML(diff)}">${escapeHTML(formatDifficulty(diff))}</option>`).join('')}
                        </select>
                    </div>

                    <div class="filter-group">
                        <label for="sort-filter">
                            <i class="fas fa-sort" aria-hidden="true"></i> Group By
                        </label>
                        <select id="sort-filter">
                            <option value="alphabetical">Letter (A&ndash;Z)</option>
                            <option value="category">Category</option>
                            <option value="difficulty">Difficulty</option>
                        </select>
                    </div>

                    <div class="filter-group">
                        <button id="filter-reset" type="button" class="btn btn-secondary">
                            <i class="fas fa-undo" aria-hidden="true"></i> Reset Filters
                        </button>
                    </div>
                </div>

                <nav class="alphabet-nav" id="alphabet-nav" aria-label="Jump to letter">
                    <span class="alphabet-label" aria-hidden="true">Jump to letter:</span>
                    ${Array.from('ABCDEFGHIJKLMNOPQRSTUVWXYZ').map(letter =>
    `<button type="button" class="alphabet-btn" data-letter="${letter}">${letter}</button>`
  ).join('')}
                </nav>
            </div>
        `;

    // Add filter event listeners
    const categoryFilter = container.querySelector('#category-filter');
    const difficultyFilter = container.querySelector('#difficulty-filter');
    const sortFilter = container.querySelector('#sort-filter');
    const resetButton = container.querySelector('#filter-reset');
    const alphabetBtns = container.querySelectorAll('.alphabet-btn');

    [categoryFilter, difficultyFilter, sortFilter].forEach(filter => {
      addEventListenerWithCleanup(filter, 'change', applyFilters);
    });

    addEventListenerWithCleanup(resetButton, 'click', () => {
      categoryFilter.value = '';
      difficultyFilter.value = '';
      sortFilter.value = 'alphabetical';
      applyFilters();
    });

    alphabetBtns.forEach(btn => {
      addEventListenerWithCleanup(btn, 'click', (e) => {
        const button = e.currentTarget;
        if (button.disabled) {return;}
        if (!jumpToLetter(button.dataset.letter)) {return;}

        // Visual feedback
        alphabetBtns.forEach(b => b.classList.remove('active'));
        button.classList.add('active');
      });
    });

    // The term list may already be on screen.
    updateAlphabetNav();

  } catch (error) {
    logger.error('Failed to load glossary filters:', error);
    container.innerHTML = '<p class="error-message">Unable to load filters.</p>';
  }
}

/**
 * Load glossary content
 * @param {HTMLElement} container - Content container element
 */
async function loadGlossaryContent(container) {
  try {
    const terms = await loadGlossaryTerms();

    if (terms.length === 0) {
      container.innerHTML = `
                <div class="card">
                    <div class="card-content text-center">
                        <h3>No Terms Available</h3>
                        <p>The glossary is currently being updated. Please check back soon.</p>
                    </div>
                </div>
            `;
      return;
    }

    // Store terms globally for filtering
    window.glossaryTerms = terms;
    bindTermInteractions(container);
    renderGlossaryTerms(sortTerms(terms, 'alphabetical'), container, 'alphabetical');

    // Links such as glossary.html#term-perforation (site search results) land
    // on the term once it exists; the browser's own fragment jump ran before
    // the async render.
    openTermFromHash();
    addEventListenerWithCleanup(window, 'hashchange', openTermFromHash);

  } catch (error) {
    logger.error('Failed to load glossary content:', error);
    container.innerHTML = `
            <div class="card">
                <div class="card-content text-center">
                    <h3>Error Loading Glossary</h3>
                    <p>Unable to load glossary terms. Please try refreshing the page.</p>
                </div>
            </div>
        `;
  }
}

/**
 * If the URL fragment names a term (#term-<id>), scroll to it and expand it.
 */
function openTermFromHash() {
  const match = /^#term-(.+)$/.exec(window.location.hash || '');
  if (!match) {return;}
  let termId = match[1];
  try {
    termId = decodeURIComponent(termId);
  } catch {
    // keep the raw fragment
  }
  scrollToTerm(termId);
}

function byTermName(a, b) {
  return a.term.localeCompare(b.term, undefined, { sensitivity: 'base' });
}

/**
 * Sort a copy of the terms for a grouping mode. Within every group the terms
 * are alphabetical.
 * @param {Array} terms - Glossary terms
 * @param {string} mode - 'alphabetical' | 'category' | 'difficulty'
 * @returns {Array} Sorted copy
 */
function sortTerms(terms, mode) {
  const sorted = [...terms];
  switch (mode) {
  case 'category':
    sorted.sort((a, b) =>
      formatCategory(a.category).localeCompare(formatCategory(b.category)) || byTermName(a, b));
    break;
  case 'difficulty':
    sorted.sort((a, b) =>
      ((DIFFICULTY_ORDER[a.difficulty] || 99) - (DIFFICULTY_ORDER[b.difficulty] || 99)) || byTermName(a, b));
    break;
  case 'alphabetical':
  default:
    sorted.sort(byTermName);
    break;
  }
  return sorted;
}

/**
 * Group key (used in the section id) and heading for a term.
 * @param {Object} term - Glossary term
 * @param {string} mode - Grouping mode
 * @returns {{key: string, label: string}} Group
 */
function groupFor(term, mode) {
  if (mode === 'category') {
    return { key: `cat-${term.category}`, label: formatCategory(term.category) };
  }
  if (mode === 'difficulty') {
    return { key: `level-${term.difficulty}`, label: formatDifficulty(term.difficulty) };
  }
  const letter = term.term.charAt(0).toUpperCase();
  return { key: letter, label: letter };
}

/**
 * Render glossary terms (already sorted), grouped by the current mode.
 * Rendering only replaces the container's children. The click handler lives
 * on the container and is bound once (bindTermInteractions), so re-renders
 * never stack handlers.
 * @param {Array} terms - Sorted glossary terms
 * @param {HTMLElement} container - Container element
 * @param {string} mode - Grouping mode
 */
function renderGlossaryTerms(terms, container, mode = 'alphabetical') {
  container.dataset.groupMode = mode;

  if (terms.length === 0) {
    container.innerHTML = `
            <div class="card">
                <div class="card-content text-center">
                    <h3>No Terms Found</h3>
                    <p>No terms match your current search or filter criteria.</p>
                </div>
            </div>
        `;
    updateAlphabetNav();
    return;
  }

  const groups = [];
  const byKey = new Map();
  terms.forEach(term => {
    const { key, label } = groupFor(term, mode);
    if (!byKey.has(key)) {
      const group = { key, label, terms: [] };
      byKey.set(key, group);
      groups.push(group);
    }
    byKey.get(key).terms.push(term);
  });

  container.innerHTML = groups.map(group => `
        <section class="glossary-section" id="section-${escapeHTML(group.key)}" aria-labelledby="heading-${escapeHTML(group.key)}">
            <h2 class="glossary-letter-header" id="heading-${escapeHTML(group.key)}" tabindex="-1">${escapeHTML(group.label)}</h2>
            <div class="glossary-terms">
                ${group.terms.map(term => renderTermCard(term)).join('')}
            </div>
        </section>
    `).join('');

  updateAlphabetNav();
}

/**
 * One delegated click handler for the term list: expand/collapse and
 * related-term links. Bound once per container.
 * @param {HTMLElement} container - The persistent #glossary-content-container
 */
function bindTermInteractions(container) {
  if (container.dataset.termHandlerBound === 'true') {return;}
  container.dataset.termHandlerBound = 'true';

  addEventListenerWithCleanup(container, 'click', (e) => {
    const related = e.target.closest('a.related-term[data-term-id]');
    if (related) {
      e.preventDefault();
      scrollToTerm(related.dataset.termId);
      return;
    }

    const header = e.target.closest('.term-header');
    if (header && container.contains(header)) {
      setTermExpanded(header.closest('.glossary-term'), header.getAttribute('aria-expanded') !== 'true');
    }
  });
}

/**
 * Expand or collapse one term card.
 * @param {HTMLElement|null} termCard - .glossary-term element
 * @param {boolean} expanded - Desired state
 */
function setTermExpanded(termCard, expanded) {
  if (!termCard) {return;}
  const header = termCard.querySelector('.term-header');
  const content = termCard.querySelector('.term-content');
  if (!header || !content) {return;}
  header.setAttribute('aria-expanded', String(expanded));
  content.hidden = !expanded;
  termCard.classList.toggle('expanded', expanded);
}

/**
 * Enable the A-Z buttons whose letter has a term in the current list and
 * disable the rest, so an empty letter is visibly unavailable instead of a
 * button that silently does nothing.
 */
function updateAlphabetNav() {
  const buttons = document.querySelectorAll('#alphabet-nav .alphabet-btn');
  if (buttons.length === 0) {return;}
  const present = new Set(
    [...document.querySelectorAll('#glossary-content-container .glossary-term .term-title')]
      .map(el => el.textContent.trim().charAt(0).toUpperCase())
  );
  buttons.forEach(btn => {
    const { letter } = btn.dataset;
    const has = present.has(letter);
    btn.disabled = !has;
    btn.title = has ? `Jump to terms starting with ${letter}` : `No terms start with ${letter}`;
    if (!has) {btn.classList.remove('active');}
  });
}

/**
 * Render individual term card
 * @param {Object} term - Glossary term object
 * @returns {string} HTML string
 */
function renderTermCard(term) {
  const difficulty = formatDifficulty(term.difficulty);
  const category = formatCategory(term.category);
  const id = escapeHTML(term.id);

  return `
        <article class="glossary-term" id="term-${id}" data-term-id="${id}">
            <h3 class="term-heading">
                <button type="button" class="term-header" id="term-toggle-${id}" aria-expanded="false" aria-controls="term-content-${id}">
                    <span class="term-title-group">
                        <span class="term-title">${escapeHTML(term.term)}</span>
                        ${term.alternateNames && term.alternateNames.length > 0 ?
    `<span class="alternate-names">Also known as: ${term.alternateNames.map(name => escapeHTML(name)).join(', ')}</span>` : ''
}
                    </span>
                    <span class="term-meta">
                        <span class="difficulty-badge difficulty-${escapeHTML(term.difficulty)}">${escapeHTML(difficulty)}</span>
                        <span class="category-badge">${escapeHTML(category)}</span>
                        <i class="fas fa-chevron-down expand-icon" aria-hidden="true"></i>
                    </span>
                </button>
            </h3>

            <div class="term-content" id="term-content-${id}" hidden>
                <div class="term-definition">
                    <p class="definition">${escapeHTML(term.definition)}</p>
                    ${term.detailedDescription ?
    `<div class="detailed-description">
                            <p>${escapeHTML(term.detailedDescription)}</p>
                        </div>` : ''
}
                </div>

                ${term.examples && term.examples.length > 0 ? `
                    <div class="term-examples">
                        <h4><i class="fas fa-lightbulb" aria-hidden="true"></i> Examples</h4>
                        <ul>
                            ${term.examples.map(example => `
                                <li>
                                    ${escapeHTML(example.description)}
                                    ${example.caption ? `<span class="example-caption">${escapeHTML(example.caption)}</span>` : ''}
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                ` : ''}

                ${term.etymology ? `
                    <div class="term-etymology">
                        <h4><i class="fas fa-history" aria-hidden="true"></i> Etymology</h4>
                        <p><strong>Origin:</strong> ${escapeHTML(term.etymology.origin)}</p>
                        <p><strong>Meaning:</strong> ${escapeHTML(term.etymology.meaning)}</p>
                        ${term.etymology.history ? `<p><strong>History:</strong> ${escapeHTML(term.etymology.history)}</p>` : ''}
                    </div>
                ` : ''}

                ${term.relatedTerms && term.relatedTerms.length > 0 ? `
                    <div class="related-terms">
                        <h4><i class="fas fa-link" aria-hidden="true"></i> Related Terms</h4>
                        <div class="related-terms-list">
                            ${term.relatedTerms.map(relatedId => (termExists(relatedId)
    ? `<a href="#term-${escapeHTML(relatedId)}" class="related-term" data-term-id="${escapeHTML(relatedId)}">${escapeHTML(formatTermId(relatedId))}</a>`
    : `<span class="related-term related-term-text">${escapeHTML(formatTermId(relatedId))}</span>`)
  ).join('')}
                        </div>
                    </div>
                ` : ''}

                ${term.tags && term.tags.length > 0 ? `
                    <div class="term-tags">
                        ${term.tags.map(tag => `<span class="tag">${escapeHTML(tag)}</span>`).join('')}
                    </div>
                ` : ''}
            </div>
        </article>
    `;
}

/**
 * Perform glossary search
 * @param {string} query - Search query
 * @param {HTMLElement} resultsContainer - Results container
 */
async function performSearch(query, resultsContainer) {
  const generation = ++searchGeneration;
  const statusRegion = document.getElementById('glossary-search-status');
  try {
    const terms = await loadGlossaryTerms();
    if (generation !== searchGeneration) {
      return; // superseded by a newer search or a clear
    }

    const lowerQuery = query.toLowerCase();
    const results = sortTerms(terms.filter(term => {
      return term.term.toLowerCase().includes(lowerQuery) ||
                   term.definition.toLowerCase().includes(lowerQuery) ||
                   (term.detailedDescription && term.detailedDescription.toLowerCase().includes(lowerQuery)) ||
                   (term.tags && term.tags.some(tag => tag.toLowerCase().includes(lowerQuery))) ||
                   (term.category && term.category.toLowerCase().includes(lowerQuery)) ||
                   (term.alternateNames && term.alternateNames.some(name => name.toLowerCase().includes(lowerQuery)));
    }), 'alphabetical');

    if (results.length === 0) {
      resultsContainer.innerHTML = `
                <div class="search-no-results">
                    <p><strong>No results found for "${escapeHTML(query)}"</strong></p>
                    <p>Try searching for related terms or browse by category.</p>
                </div>
            `;
    } else {
      resultsContainer.innerHTML = `
                <div class="search-results-header">
                    <p>Found <strong>${results.length}</strong> result${results.length !== 1 ? 's' : ''} for "<strong>${escapeHTML(query)}</strong>"</p>
                </div>
                <div class="search-results-list">
                    ${results.map(term => `
                        <div class="search-result-item">
                            <h4><a href="#term-${escapeHTML(term.id)}" class="search-result-link" data-term-id="${escapeHTML(term.id)}">${escapeHTML(term.term)}</a></h4>
                            <p class="result-definition">${escapeHTML(term.definition)}</p>
                            <div class="result-meta">
                                <span class="result-category">${escapeHTML(formatCategory(term.category))}</span>
                                <span class="result-difficulty">${escapeHTML(formatDifficulty(term.difficulty))}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
    }

    resultsContainer.style.display = 'block';

    // Announce the outcome through the always-rendered status region: a live
    // region that is display:none while it fills is not reliably announced.
    announceStatus(statusRegion, results.length === 0
      ? `No results for "${query}"`
      : `${results.length} result${results.length !== 1 ? 's' : ''} for "${query}"`);

  } catch (error) {
    logger.error('Search failed:', error);
    if (generation !== searchGeneration) {
      return;
    }
    resultsContainer.innerHTML = '<p class="error-message">Search temporarily unavailable. Please try again.</p>';
    resultsContainer.style.display = 'block';
    announceStatus(statusRegion, 'Search temporarily unavailable. Please try again.');
  }
}

/**
 * Apply filters and grouping to glossary terms
 */
function applyFilters() {
  const categoryFilter = document.querySelector('#category-filter')?.value || '';
  const difficultyFilter = document.querySelector('#difficulty-filter')?.value || '';
  const sortFilter = document.querySelector('#sort-filter')?.value || 'alphabetical';

  if (!window.glossaryTerms) {return;}

  let filteredTerms = [...window.glossaryTerms];

  if (categoryFilter) {
    filteredTerms = filteredTerms.filter(term => term.category === categoryFilter);
  }

  if (difficultyFilter) {
    filteredTerms = filteredTerms.filter(term => term.difficulty === difficultyFilter);
  }

  filteredTerms = sortTerms(filteredTerms, sortFilter);

  const container = document.querySelector('#glossary-content-container');
  if (container) {
    renderGlossaryTerms(filteredTerms, container, sortFilter);
    announceTermCount(filteredTerms.length);
  }
}

/**
 * Show all terms: reset the filters and grouping, then re-render.
 */
function showAllTerms() {
  const category = document.querySelector('#category-filter');
  const difficulty = document.querySelector('#difficulty-filter');
  const sort = document.querySelector('#sort-filter');
  if (category) {category.value = '';}
  if (difficulty) {difficulty.value = '';}
  if (sort) {sort.value = 'alphabetical';}
  applyFilters();
}

/**
 * Whether a term id exists in the glossary data. Related-term targets that
 * do not exist are shown as plain text, not as links that go nowhere.
 * @param {string} termId - Term id
 * @returns {boolean} True when the term exists
 */
function termExists(termId) {
  return Array.isArray(window.glossaryTerms) && window.glossaryTerms.some(t => t.id === termId);
}

/**
 * Announce how many terms the list shows after a filter, sort, reset or
 * search clear. The term list itself is not a live region (~4k characters).
 * @param {number} shown - Terms now rendered
 */
function announceTermCount(shown) {
  const total = window.glossaryTerms ? window.glossaryTerms.length : shown;
  announceStatus(
    document.getElementById('glossary-search-status'),
    shown === 0 ? 'No terms found' : countSummary(shown, total, 'term', 'terms')
  );
}

/**
 * Jump to a letter. Grouped A-Z, that is the letter's section heading;
 * grouped by category or difficulty, it is the first term with that letter.
 * @param {string} letter - Letter to jump to
 * @returns {boolean} True when there was somewhere to go
 */
function jumpToLetter(letter) {
  const container = document.querySelector('#glossary-content-container');
  if (!container) {return false;}
  let target = null;
  if (container.dataset.groupMode === 'alphabetical') {
    target = container.querySelector(`#section-${letter} .glossary-letter-header`);
  }
  if (!target) {
    const card = [...container.querySelectorAll('.glossary-term')]
      .find(el => (el.querySelector('.term-title')?.textContent || '').trim().charAt(0).toUpperCase() === letter);
    target = card ? card.querySelector('.term-header') : null;
  }
  if (!target) {return false;}
  // scroll-margin-top (styles.css) keeps the target clear of the sticky header.
  target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  target.focus({ preventScroll: true });
  return true;
}

/**
 * Scroll to specific term and expand it
 * @param {string} termId - Term ID to scroll to
 */
function scrollToTerm(termId) {
  const findCard = () => [...document.querySelectorAll('#glossary-content-container .glossary-term')]
    .find(el => el.dataset.termId === termId);
  let termElement = findCard();
  if (!termElement && termExists(termId)) {
    // The term exists but the current filter hides it: show everything first.
    showAllTerms();
    termElement = findCard();
  }
  if (termElement) {
    termElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTermExpanded(termElement, true);
    termElement.querySelector('.term-header')?.focus({ preventScroll: true });

    // Highlight the term briefly
    termElement.classList.add('highlighted');
    setTimeout(() => termElement.classList.remove('highlighted'), 2000);
  }
}

/**
 * Load glossary statistics
 */
async function loadGlossaryStats() {
  try {
    const terms = await loadGlossaryTerms();

    const totalTerms = terms.length;
    const categories = new Set(terms.map(term => term.category)).size;
    const totalReferences = terms.reduce((sum, term) => sum + (term.relatedTerms?.length || 0), 0);

    const totalTermsEl = document.querySelector('#total-terms');
    const totalCategoriesEl = document.querySelector('#total-categories');
    const totalReferencesEl = document.querySelector('#total-references');

    if (totalTermsEl) {totalTermsEl.textContent = totalTerms;}
    if (totalCategoriesEl) {totalCategoriesEl.textContent = categories;}
    if (totalReferencesEl) {totalReferencesEl.textContent = totalReferences;}

  } catch (error) {
    logger.error('Failed to load glossary stats:', error);
    ['#total-terms', '#total-categories', '#total-references'].forEach(selector => {
      const el = document.querySelector(selector);
      if (el) {el.textContent = 'Unavailable';}
    });
  }
}

/**
 * Utility functions
 */
function formatCategory(category) {
  return category.split('-').map(word =>
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
}

function formatDifficulty(difficulty) {
  return difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
}

function formatTermId(termId) {
  return termId.split('-').map(word =>
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
}

// Make scrollToTerm globally available for onclick handlers
window.scrollToTerm = scrollToTerm;
