/**
 * Search Page Bundle
 * Only includes functionality needed for the search page
 */

import { debounce } from '../utils/performance.js';
import { safeQuerySelector } from '../utils/safe-dom.js';
import { addEventListenerWithCleanup } from '../utils/event-cleanup.js';

// Search-specific functionality
async function initializeSearchPage() {
    // Main search interface
    const searchContainer = safeQuerySelector('#search-interface');
    if (searchContainer) {
        await initializeSearchInterface(searchContainer);
    }
    
    // Advanced search filters
    const filtersContainer = safeQuerySelector('#search-filters');
    if (filtersContainer) {
        initializeSearchFilters(filtersContainer);
    }
    
    // Search results container
    const resultsContainer = safeQuerySelector('#search-results');
    if (resultsContainer) {
        initializeSearchResults(resultsContainer);
    }
    
    // Handle URL search parameters
    handleURLSearchParams();
}

async function initializeSearchInterface(container) {
    container.innerHTML = `
        <div class="search-main">
            <div class="search-input-container">
                <input type="search" 
                       id="main-search-input" 
                       placeholder="Search meetings, newsletters, and more..." 
                       aria-label="Search site content"
                       autocomplete="off">
                <button id="search-button" class="btn-primary" aria-label="Search">
                    🔍 Search
                </button>
            </div>
            <div class="search-suggestions" id="search-suggestions" aria-live="polite"></div>
        </div>
        
        <div class="search-stats" id="search-stats" aria-live="polite"></div>
    `;
    
    const searchInput = container.querySelector('#main-search-input');
    const searchButton = container.querySelector('#search-button');
    const suggestionsContainer = container.querySelector('#search-suggestions');
    const statsContainer = container.querySelector('#search-stats');
    
    // Load search engine
    let searchEngine = null;
    try {
        const { SearchEngine } = await import('../modules/search-engine.js');
        searchEngine = new SearchEngine();
        await searchEngine.initialize();
        console.log('Search engine initialized successfully');
    } catch (error) {
        console.error('Failed to initialize search engine:', error);
        showSearchError('Search functionality is temporarily unavailable.');
        return;
    }
    
    // Debounced search function
    const performSearch = debounce(async (query) => {
        if (!query.trim()) {
            clearSearchResults();
            suggestionsContainer.innerHTML = '';
            return;
        }
        
        try {
            const results = await searchEngine.search(query);
            displaySearchResults(results, query);
            updateSearchStats(results.length, query);
            
            // Clear suggestions when showing results
            suggestionsContainer.innerHTML = '';
            
        } catch (error) {
            console.error('Search failed:', error);
            showSearchError('Search failed. Please try again.');
        }
    }, 300);
    
    // Auto-suggestions function
    const showSuggestions = debounce(async (query) => {
        if (!query.trim() || query.length < 2) {
            suggestionsContainer.innerHTML = '';
            return;
        }
        
        try {
            const suggestions = await searchEngine.getSuggestions(query, 5);
            
            if (suggestions.length > 0) {
                const html = suggestions.map(suggestion => `
                    <button class="search-suggestion" data-query="${suggestion}">
                        ${highlightMatch(suggestion, query)}
                    </button>
                `).join('');
                
                suggestionsContainer.innerHTML = `
                    <div class="suggestions-list">
                        ${html}
                    </div>
                `;
                
                // Add click handlers for suggestions
                suggestionsContainer.querySelectorAll('.search-suggestion').forEach(button => {
                    addEventListenerWithCleanup(button, 'click', (e) => {
                        const query = e.target.dataset.query;
                        searchInput.value = query;
                        performSearch(query);
                        suggestionsContainer.innerHTML = '';
                    });
                });
            } else {
                suggestionsContainer.innerHTML = '';
            }
            
        } catch (error) {
            console.error('Suggestions failed:', error);
            suggestionsContainer.innerHTML = '';
        }
    }, 500);
    
    // Event listeners
    addEventListenerWithCleanup(searchInput, 'input', (e) => {
        const query = e.target.value;
        showSuggestions(query);
        
        // Update URL without triggering navigation
        updateURLWithQuery(query, false);
    });
    
    addEventListenerWithCleanup(searchInput, 'keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            performSearch(searchInput.value);
        }
    });
    
    addEventListenerWithCleanup(searchButton, 'click', () => {
        performSearch(searchInput.value);
    });
    
    // Hide suggestions when clicking outside
    addEventListenerWithCleanup(document, 'click', (e) => {
        if (!container.contains(e.target)) {
            suggestionsContainer.innerHTML = '';
        }
    });
    
    // Store search engine reference for other functions
    window.siteSearchEngine = searchEngine;
}

function initializeSearchFilters(container) {
    container.innerHTML = `
        <details class="search-filters-details">
            <summary>Advanced Search Options</summary>
            <div class="filters-grid">
                <div class="filter-group">
                    <label for="content-type-filter">Content Type:</label>
                    <select id="content-type-filter">
                        <option value="">All Content</option>
                        <option value="meetings">Meetings</option>
                        <option value="newsletters">Newsletters</option>
                        <option value="pages">Pages</option>
                    </select>
                </div>
                
                <div class="filter-group">
                    <label for="date-range-filter">Date Range:</label>
                    <select id="date-range-filter">
                        <option value="">Any Time</option>
                        <option value="last-month">Last Month</option>
                        <option value="last-3-months">Last 3 Months</option>
                        <option value="last-year">Last Year</option>
                        <option value="custom">Custom Range</option>
                    </select>
                </div>
                
                <div class="filter-group date-range-custom" style="display: none;">
                    <label for="date-from">From:</label>
                    <input type="date" id="date-from">
                    <label for="date-to">To:</label>
                    <input type="date" id="date-to">
                </div>
                
                <div class="filter-group">
                    <label for="sort-filter">Sort By:</label>
                    <select id="sort-filter">
                        <option value="relevance">Relevance</option>
                        <option value="date-desc">Newest First</option>
                        <option value="date-asc">Oldest First</option>
                        <option value="title">Title A-Z</option>
                    </select>
                </div>
                
                <div class="filter-actions">
                    <button id="apply-filters" class="btn-secondary">Apply Filters</button>
                    <button id="clear-filters" class="btn-outline">Clear</button>
                </div>
            </div>
        </details>
    `;
    
    // Handle custom date range
    const dateRangeFilter = container.querySelector('#date-range-filter');
    const customDateRange = container.querySelector('.date-range-custom');
    
    addEventListenerWithCleanup(dateRangeFilter, 'change', (e) => {
        customDateRange.style.display = e.target.value === 'custom' ? 'block' : 'none';
    });
    
    // Apply filters
    const applyFiltersButton = container.querySelector('#apply-filters');
    addEventListenerWithCleanup(applyFiltersButton, 'click', applySearchFilters);
    
    // Clear filters
    const clearFiltersButton = container.querySelector('#clear-filters');
    addEventListenerWithCleanup(clearFiltersButton, 'click', clearSearchFilters);
}

function initializeSearchResults(container) {
    container.innerHTML = `
        <div id="results-container" class="results-container">
            <!-- Search results will be displayed here -->
        </div>
        <div id="results-pagination" class="results-pagination">
            <!-- Pagination will be displayed here -->
        </div>
    `;
}

function displaySearchResults(results, query) {
    const container = safeQuerySelector('#results-container');
    if (!container) return;
    
    if (results.length === 0) {
        container.innerHTML = `
            <div class="no-results">
                <h3>No results found for "${query}"</h3>
                <p>Try adjusting your search terms or using different keywords.</p>
                <div class="search-tips">
                    <h4>Search Tips:</h4>
                    <ul>
                        <li>Use different keywords or synonyms</li>
                        <li>Check your spelling</li>
                        <li>Try broader search terms</li>
                        <li>Use fewer words</li>
                    </ul>
                </div>
            </div>
        `;
        return;
    }
    
    const html = results.map((result, index) => `
        <article class="search-result" data-index="${index}">
            <header class="result-header">
                <h3 class="result-title">
                    <a href="${result.url}" target="_blank">
                        ${highlightMatch(result.title, query)}
                    </a>
                </h3>
                <div class="result-meta">
                    <span class="result-type">${formatContentType(result.type)}</span>
                    ${result.date ? `<time datetime="${result.date}">${formatDate(result.date)}</time>` : ''}
                    ${result.score ? `<span class="result-score">Relevance: ${Math.round(result.score * 100)}%</span>` : ''}
                </div>
            </header>
            
            <div class="result-content">
                ${result.excerpt ? `<p class="result-excerpt">${highlightMatch(result.excerpt, query)}</p>` : ''}
                ${result.tags && result.tags.length > 0 ? `
                    <div class="result-tags">
                        ${result.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                    </div>
                ` : ''}
            </div>
            
            <footer class="result-actions">
                <a href="${result.url}" class="btn-outline btn-small">View Full Content</a>
                ${result.downloadUrl ? `<a href="${result.downloadUrl}" class="btn-outline btn-small">Download</a>` : ''}
            </footer>
        </article>
    `).join('');
    
    container.innerHTML = html;
    
    // Track search
    if (typeof gtag === 'function') {
        gtag('event', 'search', {
            search_term: query,
            results_count: results.length
        });
    }
}

function updateSearchStats(count, query) {
    const container = safeQuerySelector('#search-stats');
    if (!container) return;
    
    container.innerHTML = `
        <p class="search-stats-text">
            Found <strong>${count}</strong> result${count !== 1 ? 's' : ''} for "<em>${query}</em>"
        </p>
    `;
}

function clearSearchResults() {
    const container = safeQuerySelector('#results-container');
    if (container) {
        container.innerHTML = '';
    }
    
    const stats = safeQuerySelector('#search-stats');
    if (stats) {
        stats.innerHTML = '';
    }
}

function showSearchError(message) {
    const container = safeQuerySelector('#results-container');
    if (container) {
        container.innerHTML = `
            <div class="search-error">
                <h3>Search Error</h3>
                <p>${message}</p>
                <button onclick="location.reload()" class="btn-secondary">Refresh Page</button>
            </div>
        `;
    }
}

function applySearchFilters() {
    const currentQuery = safeQuerySelector('#main-search-input')?.value;
    if (!currentQuery || !window.siteSearchEngine) return;
    
    const filters = {
        contentType: safeQuerySelector('#content-type-filter')?.value,
        dateRange: safeQuerySelector('#date-range-filter')?.value,
        dateFrom: safeQuerySelector('#date-from')?.value,
        dateTo: safeQuerySelector('#date-to')?.value,
        sortBy: safeQuerySelector('#sort-filter')?.value || 'relevance'
    };
    
    // Apply search with filters
    window.siteSearchEngine.search(currentQuery, filters)
        .then(results => {
            displaySearchResults(results, currentQuery);
            updateSearchStats(results.length, currentQuery);
        })
        .catch(error => {
            console.error('Filtered search failed:', error);
            showSearchError('Search with filters failed. Please try again.');
        });
}

function clearSearchFilters() {
    safeQuerySelector('#content-type-filter').value = '';
    safeQuerySelector('#date-range-filter').value = '';
    safeQuerySelector('#date-from').value = '';
    safeQuerySelector('#date-to').value = '';
    safeQuerySelector('#sort-filter').value = 'relevance';
    
    // Hide custom date range
    const customRange = safeQuerySelector('.date-range-custom');
    if (customRange) {
        customRange.style.display = 'none';
    }
    
    // Re-run search without filters
    applySearchFilters();
}

function handleURLSearchParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get('q');
    
    if (query) {
        const searchInput = safeQuerySelector('#main-search-input');
        if (searchInput && window.siteSearchEngine) {
            searchInput.value = query;
            window.siteSearchEngine.search(query)
                .then(results => {
                    displaySearchResults(results, query);
                    updateSearchStats(results.length, query);
                })
                .catch(error => {
                    console.error('URL parameter search failed:', error);
                });
        }
    }
}

function updateURLWithQuery(query, pushState = true) {
    const url = new URL(window.location);
    
    if (query.trim()) {
        url.searchParams.set('q', query);
    } else {
        url.searchParams.delete('q');
    }
    
    if (pushState) {
        window.history.pushState({}, '', url.toString());
    } else {
        window.history.replaceState({}, '', url.toString());
    }
}

// Utility functions
function highlightMatch(text, query) {
    if (!query.trim()) return text;
    
    const regex = new RegExp(`(${query.split(' ').join('|')})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
}

function formatContentType(type) {
    const types = {
        'meetings': 'Meeting',
        'newsletters': 'Newsletter',
        'pages': 'Page',
        'events': 'Event'
    };
    return types[type] || 'Content';
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeSearchPage);
} else {
    initializeSearchPage();
}