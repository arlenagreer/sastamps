/**
 * Search Engine Module
 * Handles search functionality using Lunr.js and provides UI components
 */

class SearchEngine {
    constructor(options = {}) {
        this.index = null;
        this.documents = new Map();
        this.isLoaded = false;
        this.isLoading = false;
        this.baseUrl = options.baseUrl || './dist/data';
        this.lunrUrl = options.lunrUrl || 'https://unpkg.com/lunr@2.3.9/lunr.min.js';
        this.callbacks = {
            onLoad: options.onLoad || (() => {}),
            onSearch: options.onSearch || (() => {}),
            onError: options.onError || ((error) => console.error('Search error:', error))
        };
        
        // Load Lunr.js if not already loaded
        this.ensureLunrLoaded();
    }

    /**
     * Ensure Lunr.js is loaded
     */
    async ensureLunrLoaded() {
        if (typeof lunr !== 'undefined') {
            return Promise.resolve();
        }

        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = this.lunrUrl;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Failed to load Lunr.js'));
            document.head.appendChild(script);
        });
    }

    /**
     * Initialize search engine by loading index and documents
     */
    async initialize() {
        if (this.isLoaded || this.isLoading) {
            return;
        }

        this.isLoading = true;

        try {
            console.log('🔍 Initializing search engine...');

            // Ensure Lunr is loaded
            await this.ensureLunrLoaded();

            // Load search index and documents in parallel
            const [indexData, documentsData] = await Promise.all([
                this.loadSearchIndex(),
                this.loadSearchDocuments()
            ]);

            // Initialize Lunr index
            this.index = lunr.Index.load(indexData);

            // Build documents map for quick lookup
            this.buildDocumentsMap(documentsData.documents);

            this.isLoaded = true;
            this.isLoading = false;

            console.log(`✅ Search engine initialized with ${documentsData.documents.length} documents`);
            this.callbacks.onLoad(documentsData.metadata);

        } catch (error) {
            this.isLoading = false;
            console.error('❌ Failed to initialize search engine:', error);
            this.callbacks.onError(error);
            throw error;
        }
    }

    /**
     * Load search index from server
     */
    async loadSearchIndex() {
        const response = await fetch(`${this.baseUrl}/search-index.json`);
        if (!response.ok) {
            throw new Error(`Failed to load search index: ${response.statusText}`);
        }
        return response.json();
    }

    /**
     * Load search documents from server
     */
    async loadSearchDocuments() {
        const response = await fetch(`${this.baseUrl}/search-documents.json`);
        if (!response.ok) {
            throw new Error(`Failed to load search documents: ${response.statusText}`);
        }
        return response.json();
    }

    /**
     * Build documents map for quick lookup
     */
    buildDocumentsMap(documents) {
        this.documents.clear();
        documents.forEach(doc => {
            this.documents.set(doc.id, doc);
        });
    }

    /**
     * Perform search
     * @param {string} query - Search query
     * @param {Object} options - Search options
     * @returns {Promise<Object>} Search results
     */
    async search(query, options = {}) {
        if (!this.isLoaded) {
            await this.initialize();
        }

        const {
            limit = 50,
            types = [],
            categories = [],
            difficulty = [],
            boost = true
        } = options;

        try {
            console.log(`🔎 Searching for: "${query}"`);

            // Perform Lunr search
            const searchResults = this.index.search(query);

            // Process and enrich results
            let results = searchResults.map(result => {
                const document = this.documents.get(result.ref);
                return {
                    id: result.ref,
                    score: result.score,
                    document: document,
                    matches: result.matchData || {}
                };
            });

            // Apply filters
            results = this.applyFilters(results, { types, categories, difficulty });

            // Limit results
            if (limit > 0) {
                results = results.slice(0, limit);
            }

            const searchResult = {
                query,
                results,
                total: results.length,
                hasResults: results.length > 0,
                metadata: {
                    searchTime: Date.now(),
                    totalDocuments: this.documents.size,
                    appliedFilters: { types, categories, difficulty }
                }
            };

            console.log(`📊 Found ${results.length} results for "${query}"`);
            this.callbacks.onSearch(searchResult);

            return searchResult;

        } catch (error) {
            console.error('Search error:', error);
            this.callbacks.onError(error);
            return {
                query,
                results: [],
                total: 0,
                hasResults: false,
                error: error.message
            };
        }
    }

    /**
     * Apply filters to search results
     */
    applyFilters(results, filters) {
        const { types, categories, difficulty } = filters;

        return results.filter(result => {
            const doc = result.document;
            if (!doc) return false;

            // Filter by type
            if (types.length > 0 && !types.includes(doc.type)) {
                return false;
            }

            // Filter by category
            if (categories.length > 0 && !categories.includes(doc.category)) {
                return false;
            }

            // Filter by difficulty
            if (difficulty.length > 0 && doc.difficulty && !difficulty.includes(doc.difficulty)) {
                return false;
            }

            return true;
        });
    }

    /**
     * Get search suggestions based on partial query
     */
    async getSuggestions(partialQuery, limit = 5) {
        if (!this.isLoaded || !partialQuery || partialQuery.length < 2) {
            return [];
        }

        try {
            // Simple wildcard search for suggestions
            const query = `${partialQuery}*`;
            const results = await this.search(query, { limit });
            
            return results.results.map(result => ({
                text: result.document.title,
                type: result.document.type,
                url: result.document.url
            }));

        } catch (error) {
            console.error('Suggestions error:', error);
            return [];
        }
    }

    /**
     * Get available filter options
     */
    getFilterOptions() {
        if (!this.isLoaded) {
            return {
                types: [],
                categories: [],
                difficulty: []
            };
        }

        const options = {
            types: new Set(),
            categories: new Set(),
            difficulty: new Set()
        };

        this.documents.forEach(doc => {
            if (doc.type) options.types.add(doc.type);
            if (doc.category) options.categories.add(doc.category);
            if (doc.difficulty) options.difficulty.add(doc.difficulty);
        });

        return {
            types: Array.from(options.types).sort(),
            categories: Array.from(options.categories).sort(),
            difficulty: Array.from(options.difficulty).sort()
        };
    }

    /**
     * Create search UI component
     */
    createSearchUI(container, options = {}) {
        const {
            placeholder = 'Search newsletters, meetings, resources...',
            showFilters = true,
            showSuggestions = true,
            autoSearch = true,
            searchDelay = 300
        } = options;

        if (typeof container === 'string') {
            container = document.querySelector(container);
        }

        if (!container) {
            throw new Error('Search container not found');
        }

        // Create search UI HTML
        container.innerHTML = this.generateSearchHTML(placeholder, showFilters);

        // Initialize search functionality
        this.initializeSearchUI(container, {
            showSuggestions,
            autoSearch,
            searchDelay
        });

        return container;
    }

    /**
     * Generate search UI HTML
     */
    generateSearchHTML(placeholder, showFilters) {
        return `
            <div class="search-container">
                <div class="search-input-wrapper">
                    <input type="search" 
                           class="search-input" 
                           placeholder="${placeholder}"
                           autocomplete="off"
                           spellcheck="false">
                    <button class="search-button" type="button">
                        <i class="fas fa-search"></i>
                    </button>
                    <div class="search-suggestions" style="display: none;"></div>
                </div>
                
                ${showFilters ? `
                    <div class="search-filters">
                        <div class="filter-group">
                            <label>Type:</label>
                            <select class="filter-select" data-filter="type">
                                <option value="">All Types</option>
                            </select>
                        </div>
                        <div class="filter-group">
                            <label>Category:</label>
                            <select class="filter-select" data-filter="category">
                                <option value="">All Categories</option>
                            </select>
                        </div>
                        <div class="filter-group">
                            <label>Difficulty:</label>
                            <select class="filter-select" data-filter="difficulty">
                                <option value="">All Levels</option>
                            </select>
                        </div>
                        <button class="clear-filters-button" type="button">Clear Filters</button>
                    </div>
                ` : ''}
                
                <div class="search-results">
                    <div class="search-status"></div>
                    <div class="search-results-list"></div>
                </div>
            </div>
        `;
    }

    /**
     * Initialize search UI functionality
     */
    async initializeSearchUI(container, options) {
        const {
            showSuggestions,
            autoSearch,
            searchDelay
        } = options;

        const searchInput = container.querySelector('.search-input');
        const searchButton = container.querySelector('.search-button');
        const suggestionsContainer = container.querySelector('.search-suggestions');
        const resultsContainer = container.querySelector('.search-results-list');
        const statusContainer = container.querySelector('.search-status');
        const filterSelects = container.querySelectorAll('.filter-select');
        const clearFiltersButton = container.querySelector('.clear-filters-button');

        let searchTimeout;
        let currentQuery = '';

        // Initialize search engine
        await this.initialize();

        // Populate filter options
        this.populateFilterOptions(filterSelects);

        // Search input event handlers
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            currentQuery = query;

            if (autoSearch) {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    if (query) {
                        this.performUISearch(query, container);
                    } else {
                        this.clearResults(container);
                    }
                }, searchDelay);
            }

            // Show suggestions
            if (showSuggestions && query.length >= 2) {
                this.showSuggestions(query, suggestionsContainer, searchInput);
            } else {
                suggestionsContainer.style.display = 'none';
            }
        });

        // Search button handler
        searchButton.addEventListener('click', () => {
            const query = searchInput.value.trim();
            if (query) {
                this.performUISearch(query, container);
            }
        });

        // Enter key handler
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const query = searchInput.value.trim();
                if (query) {
                    this.performUISearch(query, container);
                }
            }
        });

        // Filter change handlers
        filterSelects.forEach(select => {
            select.addEventListener('change', () => {
                if (currentQuery) {
                    this.performUISearch(currentQuery, container);
                }
            });
        });

        // Clear filters handler
        if (clearFiltersButton) {
            clearFiltersButton.addEventListener('click', () => {
                filterSelects.forEach(select => select.value = '');
                if (currentQuery) {
                    this.performUISearch(currentQuery, container);
                }
            });
        }

        // Hide suggestions when clicking outside
        document.addEventListener('click', (e) => {
            if (!container.contains(e.target)) {
                suggestionsContainer.style.display = 'none';
            }
        });
    }

    /**
     * Populate filter options
     */
    populateFilterOptions(filterSelects) {
        const options = this.getFilterOptions();

        filterSelects.forEach(select => {
            const filterType = select.dataset.filter;
            let filterOptions = [];

            switch (filterType) {
                case 'type':
                    filterOptions = options.types.map(type => ({
                        value: type,
                        label: this.formatLabel(type)
                    }));
                    break;
                case 'category':
                    filterOptions = options.categories.map(category => ({
                        value: category,
                        label: this.formatLabel(category)
                    }));
                    break;
                case 'difficulty':
                    filterOptions = options.difficulty.map(difficulty => ({
                        value: difficulty,
                        label: this.formatLabel(difficulty)
                    }));
                    break;
            }

            // Add options to select
            filterOptions.forEach(option => {
                const optionElement = document.createElement('option');
                optionElement.value = option.value;
                optionElement.textContent = option.label;
                select.appendChild(optionElement);
            });
        });
    }

    /**
     * Format label for display
     */
    formatLabel(value) {
        return value
            .replace(/-/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());
    }

    /**
     * Perform search and update UI
     */
    async performUISearch(query, container) {
        const resultsContainer = container.querySelector('.search-results-list');
        const statusContainer = container.querySelector('.search-status');
        const filterSelects = container.querySelectorAll('.filter-select');

        // Show loading state
        statusContainer.innerHTML = '<div class="search-loading">Searching...</div>';
        resultsContainer.innerHTML = '';

        // Get filter values
        const filters = {};
        filterSelects.forEach(select => {
            const filterType = select.dataset.filter;
            const value = select.value;
            if (value) {
                if (filterType === 'type') filters.types = [value];
                else if (filterType === 'category') filters.categories = [value];
                else if (filterType === 'difficulty') filters.difficulty = [value];
            }
        });

        try {
            const results = await this.search(query, filters);
            this.displaySearchResults(results, container);
        } catch (error) {
            statusContainer.innerHTML = `<div class="search-error">Search failed: ${error.message}</div>`;
        }
    }

    /**
     * Display search results in UI
     */
    displaySearchResults(searchResult, container) {
        const resultsContainer = container.querySelector('.search-results-list');
        const statusContainer = container.querySelector('.search-status');

        // Update status
        if (searchResult.hasResults) {
            statusContainer.innerHTML = `
                <div class="search-info">
                    Found ${searchResult.total} result${searchResult.total === 1 ? '' : 's'} for "${searchResult.query}"
                </div>
            `;
        } else {
            statusContainer.innerHTML = `
                <div class="search-no-results">
                    No results found for "${searchResult.query}"
                </div>
            `;
        }

        // Display results
        if (searchResult.hasResults) {
            resultsContainer.innerHTML = searchResult.results.map(result => 
                this.renderSearchResult(result)
            ).join('');
        } else {
            resultsContainer.innerHTML = '';
        }
    }

    /**
     * Render individual search result
     */
    renderSearchResult(result) {
        const doc = result.document;
        const typeIcon = this.getTypeIcon(doc.type);
        const formattedDate = doc.date ? new Date(doc.date).toLocaleDateString() : '';

        return `
            <div class="search-result-item" data-type="${doc.type}">
                <div class="search-result-header">
                    <h3 class="search-result-title">
                        <i class="${typeIcon}"></i>
                        <a href="${doc.url}">${doc.title}</a>
                    </h3>
                    <div class="search-result-meta">
                        <span class="search-result-type">${this.formatLabel(doc.type)}</span>
                        ${doc.category ? `<span class="search-result-category">${this.formatLabel(doc.category)}</span>` : ''}
                        ${doc.difficulty ? `<span class="search-result-difficulty difficulty-${doc.difficulty}">${doc.difficulty}</span>` : ''}
                        ${formattedDate ? `<span class="search-result-date">${formattedDate}</span>` : ''}
                    </div>
                </div>
                <p class="search-result-summary">${doc.summary}</p>
                ${doc.tags && doc.tags.length > 0 ? `
                    <div class="search-result-tags">
                        ${doc.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                    </div>
                ` : ''}
                <div class="search-result-score">Relevance: ${(result.score * 100).toFixed(1)}%</div>
            </div>
        `;
    }

    /**
     * Get icon for content type
     */
    getTypeIcon(type) {
        const icons = {
            newsletter: 'fas fa-newspaper',
            meeting: 'fas fa-calendar',
            resource: 'fas fa-book',
            glossary: 'fas fa-book-open'
        };
        return icons[type] || 'fas fa-file';
    }

    /**
     * Show search suggestions
     */
    async showSuggestions(query, container, input) {
        try {
            const suggestions = await this.getSuggestions(query);
            
            if (suggestions.length > 0) {
                container.innerHTML = suggestions.map(suggestion => `
                    <div class="search-suggestion" data-url="${suggestion.url}">
                        <i class="${this.getTypeIcon(suggestion.type)}"></i>
                        <span>${suggestion.text}</span>
                    </div>
                `).join('');

                // Add click handlers
                container.querySelectorAll('.search-suggestion').forEach(item => {
                    item.addEventListener('click', (e) => {
                        e.preventDefault();
                        input.value = item.querySelector('span').textContent;
                        container.style.display = 'none';
                        this.performUISearch(input.value, input.closest('.search-container'));
                    });
                });

                container.style.display = 'block';
            } else {
                container.style.display = 'none';
            }
        } catch (error) {
            console.error('Suggestions error:', error);
            container.style.display = 'none';
        }
    }

    /**
     * Clear search results
     */
    clearResults(container) {
        const resultsContainer = container.querySelector('.search-results-list');
        const statusContainer = container.querySelector('.search-status');
        const suggestionsContainer = container.querySelector('.search-suggestions');

        if (resultsContainer) resultsContainer.innerHTML = '';
        if (statusContainer) statusContainer.innerHTML = '';
        if (suggestionsContainer) suggestionsContainer.style.display = 'none';
    }

    /**
     * Add search styles to the page
     */
    static addStyles() {
        if (document.getElementById('search-engine-styles')) return;

        const styles = `
            .search-container {
                margin: 2rem 0;
                font-family: var(--font-body, Arial, sans-serif);
            }

            .search-input-wrapper {
                position: relative;
                margin-bottom: 1rem;
            }

            .search-input {
                width: 100%;
                padding: 1rem 3rem 1rem 1rem;
                border: 2px solid var(--light, #ecf0f1);
                border-radius: var(--radius-md, 5px);
                font-size: 1rem;
                transition: border-color var(--transition-fast, 0.15s ease);
                box-sizing: border-box;
            }

            .search-input:focus {
                outline: none;
                border-color: var(--primary, #1a5276);
            }

            .search-button {
                position: absolute;
                right: 0.5rem;
                top: 50%;
                transform: translateY(-50%);
                background: none;
                border: none;
                color: var(--medium, #7f8c8d);
                font-size: 1.2rem;
                cursor: pointer;
                padding: 0.5rem;
                border-radius: var(--radius-sm, 3px);
                transition: color var(--transition-fast, 0.15s ease);
            }

            .search-button:hover {
                color: var(--primary, #1a5276);
            }

            .search-suggestions {
                position: absolute;
                top: 100%;
                left: 0;
                right: 0;
                background: var(--white, #fff);
                border: 1px solid var(--light, #ecf0f1);
                border-top: none;
                border-radius: 0 0 var(--radius-md, 5px) var(--radius-md, 5px);
                box-shadow: var(--shadow-lg, 0 10px 15px -3px rgba(0,0,0,0.1));
                z-index: 1000;
                max-height: 300px;
                overflow-y: auto;
            }

            .search-suggestion {
                padding: 0.75rem 1rem;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 0.5rem;
                transition: background-color var(--transition-fast, 0.15s ease);
            }

            .search-suggestion:hover {
                background-color: var(--light, #ecf0f1);
            }

            .search-suggestion i {
                color: var(--primary, #1a5276);
                width: 1rem;
            }

            .search-filters {
                display: flex;
                flex-wrap: wrap;
                gap: 1rem;
                margin-bottom: 1rem;
                padding: 1rem;
                background-color: var(--light, #ecf0f1);
                border-radius: var(--radius-md, 5px);
                align-items: center;
            }

            .filter-group {
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }

            .filter-group label {
                font-weight: 600;
                color: var(--dark, #2c3e50);
                white-space: nowrap;
            }

            .filter-select {
                padding: 0.5rem;
                border: 1px solid var(--medium, #7f8c8d);
                border-radius: var(--radius-sm, 3px);
                background-color: var(--white, #fff);
                font-size: 0.9rem;
            }

            .clear-filters-button {
                padding: 0.5rem 1rem;
                background-color: var(--warning, #f39c12);
                color: var(--white, #fff);
                border: none;
                border-radius: var(--radius-sm, 3px);
                cursor: pointer;
                font-size: 0.9rem;
                transition: background-color var(--transition-fast, 0.15s ease);
            }

            .clear-filters-button:hover {
                background-color: #e67e22;
            }

            .search-results {
                margin-top: 1rem;
            }

            .search-info,
            .search-no-results,
            .search-error,
            .search-loading {
                padding: 1rem;
                margin-bottom: 1rem;
                border-radius: var(--radius-md, 5px);
                font-weight: 600;
            }

            .search-info {
                background-color: #e8f4f8;
                color: var(--primary, #1a5276);
                border-left: 4px solid var(--primary, #1a5276);
            }

            .search-no-results {
                background-color: #fff3cd;
                color: #856404;
                border-left: 4px solid #ffc107;
            }

            .search-error {
                background-color: #f8d7da;
                color: #721c24;
                border-left: 4px solid #dc3545;
            }

            .search-loading {
                background-color: var(--light, #ecf0f1);
                color: var(--medium, #7f8c8d);
                text-align: center;
            }

            .search-result-item {
                background-color: var(--white, #fff);
                border: 1px solid var(--light, #ecf0f1);
                border-radius: var(--radius-md, 5px);
                padding: 1.5rem;
                margin-bottom: 1rem;
                transition: box-shadow var(--transition-fast, 0.15s ease);
            }

            .search-result-item:hover {
                box-shadow: var(--shadow-md, 0 4px 6px rgba(0,0,0,0.1));
            }

            .search-result-header {
                margin-bottom: 1rem;
            }

            .search-result-title {
                margin: 0 0 0.5rem 0;
                font-size: 1.25rem;
            }

            .search-result-title a {
                color: var(--primary, #1a5276);
                text-decoration: none;
                margin-left: 0.5rem;
            }

            .search-result-title a:hover {
                text-decoration: underline;
            }

            .search-result-title i {
                color: var(--secondary, #d35400);
            }

            .search-result-meta {
                display: flex;
                flex-wrap: wrap;
                gap: 0.5rem;
                font-size: 0.9rem;
            }

            .search-result-type,
            .search-result-category,
            .search-result-difficulty,
            .search-result-date {
                padding: 0.25rem 0.5rem;
                border-radius: var(--radius-sm, 3px);
                background-color: var(--light, #ecf0f1);
                color: var(--dark, #2c3e50);
            }

            .search-result-difficulty.difficulty-beginner {
                background-color: #27ae60;
                color: var(--white, #fff);
            }

            .search-result-difficulty.difficulty-intermediate {
                background-color: #f39c12;
                color: var(--white, #fff);
            }

            .search-result-difficulty.difficulty-advanced {
                background-color: #c0392b;
                color: var(--white, #fff);
            }

            .search-result-summary {
                margin: 1rem 0;
                color: var(--medium, #7f8c8d);
                line-height: 1.6;
            }

            .search-result-tags {
                margin: 1rem 0;
            }

            .search-result-tags .tag {
                display: inline-block;
                padding: 0.25rem 0.5rem;
                margin: 0.125rem;
                background-color: var(--accent, #f1c40f);
                color: var(--dark, #2c3e50);
                border-radius: var(--radius-sm, 3px);
                font-size: 0.8rem;
            }

            .search-result-score {
                font-size: 0.8rem;
                color: var(--medium, #7f8c8d);
                text-align: right;
                margin-top: 0.5rem;
            }

            /* Mobile responsive */
            @media (max-width: 768px) {
                .search-filters {
                    flex-direction: column;
                    align-items: stretch;
                }

                .filter-group {
                    justify-content: space-between;
                }

                .search-result-meta {
                    flex-direction: column;
                    gap: 0.25rem;
                }
            }
        `;

        const styleSheet = document.createElement('style');
        styleSheet.id = 'search-engine-styles';
        styleSheet.textContent = styles;
        document.head.appendChild(styleSheet);
    }
}

// Add default styles when module loads
if (typeof document !== 'undefined') {
    // Add styles when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => SearchEngine.addStyles());
    } else {
        SearchEngine.addStyles();
    }
}

// Export for module usage
export default SearchEngine;

// Also attach to window for global access
if (typeof window !== 'undefined') {
    window.SearchEngine = SearchEngine;
}