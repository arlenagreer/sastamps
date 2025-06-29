/**
 * Glossary Page Module
 * Handles glossary search, filtering, and display functionality
 */

import { safeQuerySelector } from '../utils/safe-dom.js';

// Initialize glossary page
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🔤 Initializing glossary page...');

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
});

/**
 * Load glossary search functionality
 * @param {HTMLElement} container - Search container element
 */
async function loadGlossarySearch(container) {
    try {
        container.innerHTML = `
            <div class="glossary-search">
                <div class="search-header">
                    <h3><i class="fas fa-search"></i> Search Glossary</h3>
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
                            <i class="fas fa-search"></i>
                        </button>
                        <button id="glossary-clear-button" aria-label="Clear search" type="button" style="display: none;">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="search-suggestions" id="search-suggestions" style="display: none;"></div>
                </div>
                <div id="search-results" style="display: none;"></div>
            </div>
        `;

        // Add search functionality
        const searchInput = container.querySelector('#glossary-search-input');
        const searchButton = container.querySelector('#glossary-search-button');
        const clearButton = container.querySelector('#glossary-clear-button');
        const resultsContainer = container.querySelector('#search-results');

        let searchTimeout;

        // Real-time search with debouncing
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            const query = e.target.value.trim();
            
            if (query.length > 0) {
                clearButton.style.display = 'block';
                searchTimeout = setTimeout(() => performSearch(query, resultsContainer), 300);
            } else {
                clearButton.style.display = 'none';
                resultsContainer.style.display = 'none';
                showAllTerms();
            }
        });

        // Search button click
        searchButton.addEventListener('click', () => {
            const query = searchInput.value.trim();
            if (query) {
                performSearch(query, resultsContainer);
            }
        });

        // Clear button click
        clearButton.addEventListener('click', () => {
            searchInput.value = '';
            clearButton.style.display = 'none';
            resultsContainer.style.display = 'none';
            showAllTerms();
            searchInput.focus();
        });

        // Enter key search
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const query = searchInput.value.trim();
                if (query) {
                    performSearch(query, resultsContainer);
                }
            }
        });

    } catch (error) {
        console.error('Failed to load glossary search:', error);
        container.innerHTML = '<p class="error-message">Unable to load search functionality.</p>';
    }
}

/**
 * Load glossary filters
 * @param {HTMLElement} container - Filters container element
 */
async function loadGlossaryFilters(container) {
    try {
        const { default: glossaryData } = await import('../../data/glossary/glossary.json');
        const terms = glossaryData.terms || [];

        // Extract unique categories and difficulties
        const categories = [...new Set(terms.map(term => term.category))].sort();
        const difficulties = [...new Set(terms.map(term => term.difficulty))].sort();
        const subcategories = [...new Set(terms.map(term => term.subcategory).filter(Boolean))].sort();

        container.innerHTML = `
            <div class="glossary-filters">
                <div class="filters-grid">
                    <div class="filter-group">
                        <label for="category-filter">
                            <i class="fas fa-layer-group"></i> Category
                        </label>
                        <select id="category-filter" aria-label="Filter by category">
                            <option value="">All Categories</option>
                            ${categories.map(cat => `<option value="${cat}">${formatCategory(cat)}</option>`).join('')}
                        </select>
                    </div>
                    
                    <div class="filter-group">
                        <label for="difficulty-filter">
                            <i class="fas fa-signal"></i> Difficulty
                        </label>
                        <select id="difficulty-filter" aria-label="Filter by difficulty">
                            <option value="">All Levels</option>
                            ${difficulties.map(diff => `<option value="${diff}">${formatDifficulty(diff)}</option>`).join('')}
                        </select>
                    </div>
                    
                    <div class="filter-group">
                        <label for="sort-filter">
                            <i class="fas fa-sort"></i> Sort By
                        </label>
                        <select id="sort-filter" aria-label="Sort terms">
                            <option value="alphabetical">Alphabetical</option>
                            <option value="category">Category</option>
                            <option value="difficulty">Difficulty</option>
                            <option value="recent">Recently Added</option>
                        </select>
                    </div>
                    
                    <div class="filter-group">
                        <button id="filter-reset" type="button" class="btn btn-secondary">
                            <i class="fas fa-undo"></i> Reset Filters
                        </button>
                    </div>
                </div>
                
                <div class="alphabet-nav" id="alphabet-nav">
                    <span class="alphabet-label">Jump to letter:</span>
                    ${Array.from('ABCDEFGHIJKLMNOPQRSTUVWXYZ').map(letter => 
                        `<button class="alphabet-btn" data-letter="${letter}">${letter}</button>`
                    ).join('')}
                </div>
            </div>
        `;

        // Add filter event listeners
        const categoryFilter = container.querySelector('#category-filter');
        const difficultyFilter = container.querySelector('#difficulty-filter');
        const sortFilter = container.querySelector('#sort-filter');
        const resetButton = container.querySelector('#filter-reset');
        const alphabetBtns = container.querySelectorAll('.alphabet-btn');

        [categoryFilter, difficultyFilter, sortFilter].forEach(filter => {
            filter.addEventListener('change', applyFilters);
        });

        resetButton.addEventListener('click', () => {
            categoryFilter.value = '';
            difficultyFilter.value = '';
            sortFilter.value = 'alphabetical';
            applyFilters();
        });

        alphabetBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const letter = e.target.dataset.letter;
                jumpToLetter(letter);
                
                // Visual feedback
                alphabetBtns.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
            });
        });

    } catch (error) {
        console.error('Failed to load glossary filters:', error);
        container.innerHTML = '<p class="error-message">Unable to load filters.</p>';
    }
}

/**
 * Load glossary content
 * @param {HTMLElement} container - Content container element
 */
async function loadGlossaryContent(container) {
    try {
        const { default: glossaryData } = await import('../../data/glossary/glossary.json');
        const terms = glossaryData.terms || [];

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
        renderGlossaryTerms(terms, container);

    } catch (error) {
        console.error('Failed to load glossary content:', error);
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
 * Render glossary terms
 * @param {Array} terms - Array of glossary terms
 * @param {HTMLElement} container - Container element
 */
function renderGlossaryTerms(terms, container) {
    if (terms.length === 0) {
        container.innerHTML = `
            <div class="card">
                <div class="card-content text-center">
                    <h3>No Terms Found</h3>
                    <p>No terms match your current search or filter criteria.</p>
                </div>
            </div>
        `;
        return;
    }

    // Group terms alphabetically
    const groupedTerms = {};
    terms.forEach(term => {
        const firstLetter = term.term.charAt(0).toUpperCase();
        if (!groupedTerms[firstLetter]) {
            groupedTerms[firstLetter] = [];
        }
        groupedTerms[firstLetter].push(term);
    });

    // Sort letters and terms within each letter
    const sortedLetters = Object.keys(groupedTerms).sort();
    
    const html = sortedLetters.map(letter => `
        <div class="glossary-section" id="section-${letter}">
            <h2 class="glossary-letter-header">${letter}</h2>
            <div class="glossary-terms">
                ${groupedTerms[letter].map(term => renderTermCard(term)).join('')}
            </div>
        </div>
    `).join('');

    container.innerHTML = html;

    // Add click handlers for term expansion
    container.addEventListener('click', (e) => {
        if (e.target.closest('.term-header')) {
            const termCard = e.target.closest('.glossary-term');
            const content = termCard.querySelector('.term-content');
            const icon = termCard.querySelector('.expand-icon');
            
            if (content.style.display === 'none' || !content.style.display) {
                content.style.display = 'block';
                icon.style.transform = 'rotate(180deg)';
                termCard.classList.add('expanded');
            } else {
                content.style.display = 'none';
                icon.style.transform = 'rotate(0deg)';
                termCard.classList.remove('expanded');
            }
        }

        // Handle related term clicks
        if (e.target.closest('.related-term')) {
            e.preventDefault();
            const termId = e.target.closest('.related-term').dataset.termId;
            scrollToTerm(termId);
        }
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
    
    return `
        <div class="glossary-term" id="term-${term.id}" data-term-id="${term.id}">
            <div class="term-header">
                <div class="term-title-group">
                    <h3 class="term-title">${escapeHtml(term.term)}</h3>
                    ${term.alternateNames && term.alternateNames.length > 0 ? 
                        `<div class="alternate-names">
                            Also known as: ${term.alternateNames.map(name => escapeHtml(name)).join(', ')}
                        </div>` : ''
                    }
                </div>
                <div class="term-meta">
                    <span class="difficulty-badge difficulty-${term.difficulty}">${difficulty}</span>
                    <span class="category-badge">${category}</span>
                    <i class="fas fa-chevron-down expand-icon"></i>
                </div>
            </div>
            
            <div class="term-content" style="display: none;">
                <div class="term-definition">
                    <p class="definition">${escapeHtml(term.definition)}</p>
                    ${term.detailedDescription ? 
                        `<div class="detailed-description">
                            <p>${escapeHtml(term.detailedDescription)}</p>
                        </div>` : ''
                    }
                </div>
                
                ${term.examples && term.examples.length > 0 ? `
                    <div class="term-examples">
                        <h4><i class="fas fa-lightbulb"></i> Examples</h4>
                        <ul>
                            ${term.examples.map(example => `
                                <li>
                                    ${escapeHtml(example.description)}
                                    ${example.caption ? `<span class="example-caption">${escapeHtml(example.caption)}</span>` : ''}
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                ` : ''}
                
                ${term.etymology ? `
                    <div class="term-etymology">
                        <h4><i class="fas fa-history"></i> Etymology</h4>
                        <p><strong>Origin:</strong> ${escapeHtml(term.etymology.origin)}</p>
                        <p><strong>Meaning:</strong> ${escapeHtml(term.etymology.meaning)}</p>
                        ${term.etymology.history ? `<p><strong>History:</strong> ${escapeHtml(term.etymology.history)}</p>` : ''}
                    </div>
                ` : ''}
                
                ${term.relatedTerms && term.relatedTerms.length > 0 ? `
                    <div class="related-terms">
                        <h4><i class="fas fa-link"></i> Related Terms</h4>
                        <div class="related-terms-list">
                            ${term.relatedTerms.map(relatedId => 
                                `<a href="#term-${relatedId}" class="related-term" data-term-id="${relatedId}">${formatTermId(relatedId)}</a>`
                            ).join('')}
                        </div>
                    </div>
                ` : ''}
                
                ${term.tags && term.tags.length > 0 ? `
                    <div class="term-tags">
                        ${term.tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}

/**
 * Perform glossary search
 * @param {string} query - Search query
 * @param {HTMLElement} resultsContainer - Results container
 */
async function performSearch(query, resultsContainer) {
    try {
        const { default: glossaryData } = await import('../../data/glossary/glossary.json');
        const terms = glossaryData.terms || [];
        
        const lowerQuery = query.toLowerCase();
        const results = terms.filter(term => {
            return term.term.toLowerCase().includes(lowerQuery) ||
                   term.definition.toLowerCase().includes(lowerQuery) ||
                   (term.detailedDescription && term.detailedDescription.toLowerCase().includes(lowerQuery)) ||
                   (term.tags && term.tags.some(tag => tag.toLowerCase().includes(lowerQuery))) ||
                   (term.category && term.category.toLowerCase().includes(lowerQuery)) ||
                   (term.alternateNames && term.alternateNames.some(name => name.toLowerCase().includes(lowerQuery)));
        });

        if (results.length === 0) {
            resultsContainer.innerHTML = `
                <div class="search-no-results">
                    <p><strong>No results found for "${escapeHtml(query)}"</strong></p>
                    <p>Try searching for related terms or browse by category.</p>
                </div>
            `;
        } else {
            resultsContainer.innerHTML = `
                <div class="search-results-header">
                    <p>Found <strong>${results.length}</strong> result${results.length !== 1 ? 's' : ''} for "<strong>${escapeHtml(query)}</strong>"</p>
                </div>
                <div class="search-results-list">
                    ${results.map(term => `
                        <div class="search-result-item">
                            <h4><a href="#term-${term.id}" onclick="scrollToTerm('${term.id}')">${escapeHtml(term.term)}</a></h4>
                            <p class="result-definition">${escapeHtml(term.definition)}</p>
                            <div class="result-meta">
                                <span class="result-category">${formatCategory(term.category)}</span>
                                <span class="result-difficulty">${formatDifficulty(term.difficulty)}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }
        
        resultsContainer.style.display = 'block';
        
    } catch (error) {
        console.error('Search failed:', error);
        resultsContainer.innerHTML = '<p class="error-message">Search temporarily unavailable. Please try again.</p>';
        resultsContainer.style.display = 'block';
    }
}

/**
 * Apply filters to glossary terms
 */
function applyFilters() {
    const categoryFilter = document.querySelector('#category-filter')?.value || '';
    const difficultyFilter = document.querySelector('#difficulty-filter')?.value || '';
    const sortFilter = document.querySelector('#sort-filter')?.value || 'alphabetical';
    
    if (!window.glossaryTerms) return;
    
    let filteredTerms = [...window.glossaryTerms];
    
    // Apply category filter
    if (categoryFilter) {
        filteredTerms = filteredTerms.filter(term => term.category === categoryFilter);
    }
    
    // Apply difficulty filter
    if (difficultyFilter) {
        filteredTerms = filteredTerms.filter(term => term.difficulty === difficultyFilter);
    }
    
    // Apply sorting
    switch (sortFilter) {
        case 'category':
            filteredTerms.sort((a, b) => {
                if (a.category !== b.category) return a.category.localeCompare(b.category);
                return a.term.localeCompare(b.term);
            });
            break;
        case 'difficulty':
            const difficultyOrder = { 'beginner': 1, 'intermediate': 2, 'advanced': 3 };
            filteredTerms.sort((a, b) => {
                const orderA = difficultyOrder[a.difficulty] || 999;
                const orderB = difficultyOrder[b.difficulty] || 999;
                if (orderA !== orderB) return orderA - orderB;
                return a.term.localeCompare(b.term);
            });
            break;
        case 'recent':
            filteredTerms.sort((a, b) => {
                const dateA = new Date(a.dateAdded || '1970-01-01');
                const dateB = new Date(b.dateAdded || '1970-01-01');
                return dateB - dateA;
            });
            break;
        case 'alphabetical':
        default:
            filteredTerms.sort((a, b) => a.term.localeCompare(b.term));
            break;
    }
    
    const container = document.querySelector('#glossary-content-container');
    if (container) {
        renderGlossaryTerms(filteredTerms, container);
    }
}

/**
 * Show all terms (reset search)
 */
function showAllTerms() {
    const container = document.querySelector('#glossary-content-container');
    if (container && window.glossaryTerms) {
        renderGlossaryTerms(window.glossaryTerms, container);
    }
}

/**
 * Jump to specific letter section
 * @param {string} letter - Letter to jump to
 */
function jumpToLetter(letter) {
    const section = document.querySelector(`#section-${letter}`);
    if (section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

/**
 * Scroll to specific term
 * @param {string} termId - Term ID to scroll to
 */
function scrollToTerm(termId) {
    const termElement = document.querySelector(`#term-${termId}`);
    if (termElement) {
        termElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Expand the term if it's collapsed
        const content = termElement.querySelector('.term-content');
        const icon = termElement.querySelector('.expand-icon');
        if (content && content.style.display !== 'block') {
            content.style.display = 'block';
            if (icon) icon.style.transform = 'rotate(180deg)';
            termElement.classList.add('expanded');
        }
        
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
        const { default: glossaryData } = await import('../../data/glossary/glossary.json');
        const terms = glossaryData.terms || [];
        
        const totalTerms = terms.length;
        const categories = new Set(terms.map(term => term.category)).size;
        const totalReferences = terms.reduce((sum, term) => sum + (term.relatedTerms?.length || 0), 0);
        
        const totalTermsEl = document.querySelector('#total-terms');
        const totalCategoriesEl = document.querySelector('#total-categories');
        const totalReferencesEl = document.querySelector('#total-references');
        
        if (totalTermsEl) totalTermsEl.textContent = totalTerms;
        if (totalCategoriesEl) totalCategoriesEl.textContent = categories;
        if (totalReferencesEl) totalReferencesEl.textContent = totalReferences;
        
    } catch (error) {
        console.error('Failed to load glossary stats:', error);
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

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Make scrollToTerm globally available for onclick handlers
window.scrollToTerm = scrollToTerm;