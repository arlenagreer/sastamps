/**
 * Newsletter Data Loader Module
 * Handles loading and rendering newsletter data from JSON
 */

class NewsletterLoader {
  constructor(options = {}) {
    this.dataUrl = options.dataUrl || './data/newsletters/newsletters.json';
    this.newsletters = [];
    this.metadata = {};
    this.isLoaded = false;
    this.isLoading = false;

    this.callbacks = {
      onLoad: options.onLoad || (() => {}),
      onError: options.onError || ((error) => console.error('Newsletter loader error:', error))
    };
  }

  /**
     * Load newsletter data from JSON
     */
  async loadData() {
    if (this.isLoaded || this.isLoading) {
      return { newsletters: this.newsletters, metadata: this.metadata };
    }

    this.isLoading = true;

    try {
      // Loading newsletter data

      const response = await fetch(this.dataUrl);
      if (!response.ok) {
        throw new Error(`Failed to load newsletter data: ${response.statusText}`);
      }

      const data = await response.json();

      this.newsletters = data.newsletters || [];
      this.metadata = data.metadata || {};
      this.isLoaded = true;
      this.isLoading = false;

      // Newsletter data loaded successfully
      this.callbacks.onLoad(data);

      return data;

    } catch (error) {
      this.isLoading = false;
      console.error('❌ Failed to load newsletter data:', error);
      this.callbacks.onError(error);
      throw error;
    }
  }

  /**
     * Get newsletters grouped by year
     */
  getNewslettersByYear() {
    if (!this.isLoaded) {
      console.warn('Newsletter data not loaded yet');
      return {};
    }

    const grouped = {};

    this.newsletters.forEach(newsletter => {
      const {year} = newsletter;
      if (!grouped[year]) {
        grouped[year] = [];
      }
      grouped[year].push(newsletter);
    });

    // Sort newsletters within each year by quarter
    Object.keys(grouped).forEach(year => {
      grouped[year].sort((a, b) => {
        const quarterOrder = { 'First': 1, 'Second': 2, 'Third': 3, 'Fourth': 4 };
        return (quarterOrder[b.quarter] || 0) - (quarterOrder[a.quarter] || 0); // Most recent first
      });
    });

    return grouped;
  }

  /**
     * Filter newsletters by criteria
     */
  filterNewsletters(criteria = {}) {
    if (!this.isLoaded) {
      console.warn('Newsletter data not loaded yet');
      return [];
    }

    let filtered = [...this.newsletters];

    // Filter by year
    if (criteria.year) {
      filtered = filtered.filter(newsletter => newsletter.year === criteria.year);
    }

    // Filter by quarter
    if (criteria.quarter) {
      filtered = filtered.filter(newsletter => newsletter.quarter === criteria.quarter);
    }

    // Filter by tags
    if (criteria.tags && criteria.tags.length > 0) {
      filtered = filtered.filter(newsletter => {
        return criteria.tags.some(tag =>
          newsletter.tags && newsletter.tags.includes(tag)
        );
      });
    }

    // Filter by date range
    if (criteria.dateFrom || criteria.dateTo) {
      filtered = filtered.filter(newsletter => {
        const publishDate = new Date(newsletter.publishDate);
        const fromDate = criteria.dateFrom ? new Date(criteria.dateFrom) : new Date('1900-01-01');
        const toDate = criteria.dateTo ? new Date(criteria.dateTo) : new Date('2099-12-31');

        return publishDate >= fromDate && publishDate <= toDate;
      });
    }

    // Sort by publish date (most recent first)
    filtered.sort((a, b) => new Date(b.publishDate) - new Date(a.publishDate));

    return filtered;
  }

  /**
     * Get available years for filtering
     */
  getAvailableYears() {
    if (!this.isLoaded) {return [];}

    const years = [...new Set(this.newsletters.map(n => n.year))];
    return years.sort((a, b) => b - a); // Most recent first
  }

  /**
     * Get available quarters for filtering
     */
  getAvailableQuarters() {
    return ['First', 'Second', 'Third', 'Fourth'];
  }

  /**
     * Get all available tags
     */
  getAvailableTags() {
    if (!this.isLoaded) {return [];}

    const tags = new Set();
    this.newsletters.forEach(newsletter => {
      if (newsletter.tags) {
        newsletter.tags.forEach(tag => tags.add(tag));
      }
    });

    return Array.from(tags).sort();
  }

  /**
     * Render newsletter archive HTML
     */
  renderArchive(container, options = {}) {
    const {
      groupByYear = true,
      showFilters = false,
      sortOrder = 'desc'
    } = options;

    if (typeof container === 'string') {
      container = document.querySelector(container);
    }

    if (!container) {
      throw new Error('Archive container not found');
    }

    if (!this.isLoaded) {
      container.innerHTML = '<div class="loading">Loading newsletter archive...</div>';
      return;
    }

    let html = '';

    if (showFilters) {
      html += this.renderFilters();
    }

    if (groupByYear) {
      html += this.renderByYear(sortOrder);
    } else {
      html += this.renderFlat(sortOrder);
    }

    container.innerHTML = html;

    // Add event listeners if filters are shown
    if (showFilters) {
      this.initializeFilters(container);
    }
  }

  /**
     * Render filter controls
     */
  renderFilters() {
    const years = this.getAvailableYears();
    const quarters = this.getAvailableQuarters();
    const tags = this.getAvailableTags();

    return `
            <div class="archive-filters">
                <h3>Filter Newsletters</h3>
                <div class="filter-row">
                    <div class="filter-group">
                        <label for="year-filter">Year:</label>
                        <select id="year-filter" class="filter-select">
                            <option value="">All Years</option>
                            ${years.map(year => `<option value="${year}">${year}</option>`).join('')}
                        </select>
                    </div>
                    <div class="filter-group">
                        <label for="quarter-filter">Quarter:</label>
                        <select id="quarter-filter" class="filter-select">
                            <option value="">All Quarters</option>
                            ${quarters.map(quarter => `<option value="${quarter}">${quarter}</option>`).join('')}
                        </select>
                    </div>
                    <div class="filter-group">
                        <label for="tags-filter">Tags:</label>
                        <select id="tags-filter" class="filter-select" multiple>
                            ${tags.map(tag => `<option value="${tag}">${this.formatLabel(tag)}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div class="filter-actions">
                    <button id="apply-filters" class="btn btn-primary">Apply Filters</button>
                    <button id="clear-filters" class="btn btn-secondary">Clear Filters</button>
                </div>
            </div>
        `;
  }

  /**
     * Render newsletters grouped by year
     */
  renderByYear(sortOrder = 'desc') {
    const groupedNewsletters = this.getNewslettersByYear();
    const years = Object.keys(groupedNewsletters).sort((a, b) =>
      sortOrder === 'desc' ? b - a : a - b
    );

    return years.map(year => `
            <div class="archive-year-section">
                <h2 class="archive-year-header">${year} Newsletter Archive</h2>
                <div class="archive-grid">
                    ${groupedNewsletters[year].map(newsletter => this.renderNewsletterCard(newsletter)).join('')}
                </div>
            </div>
        `).join('');
  }

  /**
     * Render newsletters in flat list
     */
  renderFlat(sortOrder = 'desc') {
    const newsletters = [...this.newsletters].sort((a, b) => {
      const dateA = new Date(a.publishDate);
      const dateB = new Date(b.publishDate);
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

    return `
            <div class="archive-grid">
                ${newsletters.map(newsletter => this.renderNewsletterCard(newsletter)).join('')}
            </div>
        `;
  }

  /**
     * Render individual newsletter card
     */
  renderNewsletterCard(newsletter) {
    const publishDate = new Date(newsletter.publishDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const featuredArticles = newsletter.featuredArticles || [];
    const highlights = newsletter.highlights || [];
    const tags = newsletter.tags || [];

    return `
            <div class="archive-item" data-year="${newsletter.year}" data-quarter="${newsletter.quarter}">
                <div class="archive-item-header">
                    <h3>SAPA PHILATEX</h3>
                    <p>${newsletter.quarter} Quarter ${newsletter.year}</p>
                </div>
                <div class="archive-item-content">
                    <p><strong>Published:</strong> ${publishDate}</p>
                    <p class="newsletter-description">${newsletter.description}</p>
                    
                    ${featuredArticles.length > 0 ? `
                        <div class="featured-articles">
                            <h4>Featured Articles:</h4>
                            <ul>
                                ${featuredArticles.map(article => `
                                    <li>
                                        <strong>${article.title}</strong>
                                        ${article.author ? ` by ${article.author}` : ''}
                                        ${article.page ? ` (p. ${article.page})` : ''}
                                        ${article.category ? ` <em>[${article.category}]</em>` : ''}
                                    </li>
                                `).join('')}
                            </ul>
                        </div>
                    ` : ''}
                    
                    ${highlights.length > 0 ? `
                        <div class="highlights">
                            <h4>Highlights:</h4>
                            <ul>
                                ${highlights.map(highlight => `<li>${highlight}</li>`).join('')}
                            </ul>
                        </div>
                    ` : ''}
                    
                    ${tags.length > 0 ? `
                        <div class="newsletter-tags">
                            ${tags.map(tag => `<span class="tag">${this.formatLabel(tag)}</span>`).join('')}
                        </div>
                    ` : ''}
                    
                    <div class="newsletter-meta">
                        ${newsletter.pageCount ? `<span class="meta-item"><i class="fas fa-file-alt"></i> ${newsletter.pageCount} pages</span>` : ''}
                        ${newsletter.fileSize ? `<span class="meta-item"><i class="fas fa-download"></i> ${newsletter.fileSize}</span>` : ''}
                    </div>
                    
                    <a href="${newsletter.filePath}" class="btn btn-primary" target="_blank">
                        <i class="fas fa-file-pdf"></i> Download PDF
                    </a>
                </div>
            </div>
        `;
  }

  /**
     * Initialize filter functionality
     */
  initializeFilters(container) {
    const yearFilter = container.querySelector('#year-filter');
    const quarterFilter = container.querySelector('#quarter-filter');
    const tagsFilter = container.querySelector('#tags-filter');
    const applyButton = container.querySelector('#apply-filters');
    const clearButton = container.querySelector('#clear-filters');

    if (applyButton) {
      applyButton.addEventListener('click', () => {
        const criteria = {
          year: yearFilter?.value ? parseInt(yearFilter.value) : null,
          quarter: quarterFilter?.value || null,
          tags: tagsFilter ? Array.from(tagsFilter.selectedOptions).map(option => option.value) : []
        };

        this.applyFilters(container, criteria);
      });
    }

    if (clearButton) {
      clearButton.addEventListener('click', () => {
        if (yearFilter) {yearFilter.value = '';}
        if (quarterFilter) {quarterFilter.value = '';}
        if (tagsFilter) {
          Array.from(tagsFilter.options).forEach(option => option.selected = false);
        }

        this.renderArchive(container, { groupByYear: true, showFilters: true });
      });
    }
  }

  /**
     * Apply filters and re-render
     */
  applyFilters(container, criteria) {
    const filtered = this.filterNewsletters(criteria);

    if (filtered.length === 0) {
      const archiveContent = container.querySelector('.archive-year-section, .archive-grid');
      if (archiveContent) {
        archiveContent.outerHTML = `
                    <div class="no-results">
                        <h3>No newsletters found</h3>
                        <p>No newsletters match the selected criteria. Try adjusting your filters.</p>
                    </div>
                `;
      }
      return;
    }

    // Group filtered results by year
    const grouped = {};
    filtered.forEach(newsletter => {
      const {year} = newsletter;
      if (!grouped[year]) {
        grouped[year] = [];
      }
      grouped[year].push(newsletter);
    });

    const years = Object.keys(grouped).sort((a, b) => b - a);
    const html = years.map(year => `
            <div class="archive-year-section">
                <h2 class="archive-year-header">${year} Newsletter Archive</h2>
                <div class="archive-grid">
                    ${grouped[year].map(newsletter => this.renderNewsletterCard(newsletter)).join('')}
                </div>
            </div>
        `).join('');

    // Replace content after filters
    const filtersElement = container.querySelector('.archive-filters');
    const afterFilters = filtersElement ? filtersElement.nextElementSibling : container.firstElementChild;

    if (afterFilters) {
      afterFilters.outerHTML = html;
    } else {
      container.innerHTML += html;
    }
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
     * Add newsletter archive styles
     */
  static addStyles() {
    if (document.getElementById('newsletter-archive-styles')) {return;}

    const styles = `
            .archive-filters {
                background-color: var(--light, #ecf0f1);
                padding: 1.5rem;
                border-radius: var(--radius-md, 5px);
                margin-bottom: 2rem;
                border: 1px solid #ddd;
            }

            .archive-filters h3 {
                margin-top: 0;
                margin-bottom: 1rem;
                color: var(--primary, #1a5276);
            }

            .filter-row {
                display: flex;
                flex-wrap: wrap;
                gap: 1rem;
                margin-bottom: 1rem;
                align-items: center;
            }

            .filter-group {
                display: flex;
                flex-direction: column;
                gap: 0.5rem;
            }

            .filter-group label {
                font-weight: 600;
                color: var(--dark, #2c3e50);
            }

            .filter-select {
                padding: 0.5rem;
                border: 1px solid var(--medium, #7f8c8d);
                border-radius: var(--radius-sm, 3px);
                background-color: var(--white, #fff);
                font-size: 0.9rem;
                min-width: 120px;
            }

            .filter-select[multiple] {
                min-height: 100px;
                min-width: 160px;
            }

            .filter-actions {
                display: flex;
                gap: 1rem;
            }

            .newsletter-description {
                line-height: 1.6;
                margin-bottom: 1rem;
            }

            .featured-articles,
            .highlights {
                margin-bottom: 1rem;
            }

            .featured-articles h4,
            .highlights h4 {
                margin-bottom: 0.5rem;
                color: var(--primary, #1a5276);
                font-size: 1rem;
            }

            .featured-articles ul,
            .highlights ul {
                margin: 0;
                padding-left: 1.5rem;
            }

            .featured-articles li,
            .highlights li {
                margin-bottom: 0.25rem;
            }

            .newsletter-tags {
                margin-bottom: 1rem;
            }

            .newsletter-tags .tag {
                display: inline-block;
                background: var(--accent, #f1c40f);
                color: var(--dark, #2c3e50);
                padding: 0.25rem 0.5rem;
                margin: 0.125rem;
                border-radius: var(--radius-sm, 3px);
                font-size: 0.8rem;
            }

            .newsletter-meta {
                display: flex;
                gap: 1rem;
                margin-bottom: 1rem;
                font-size: 0.9rem;
                color: var(--medium, #7f8c8d);
            }

            .meta-item {
                display: flex;
                align-items: center;
                gap: 0.25rem;
            }

            .no-results {
                text-align: center;
                padding: 3rem;
                background-color: var(--light, #ecf0f1);
                border-radius: var(--radius-md, 5px);
                margin: 2rem 0;
            }

            .no-results h3 {
                color: var(--medium, #7f8c8d);
                margin-bottom: 1rem;
            }

            .loading {
                text-align: center;
                padding: 3rem;
                color: var(--medium, #7f8c8d);
                font-size: 1.1rem;
            }

            /* Mobile responsive */
            @media (max-width: 768px) {
                .filter-row {
                    flex-direction: column;
                    align-items: stretch;
                }

                .filter-group {
                    width: 100%;
                }

                .filter-select {
                    width: 100%;
                    min-width: auto;
                }

                .filter-actions {
                    flex-direction: column;
                }

                .newsletter-meta {
                    flex-direction: column;
                    gap: 0.5rem;
                }
            }
        `;

    const styleSheet = document.createElement('style');
    styleSheet.id = 'newsletter-archive-styles';
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
  }
}

// Add default styles when module loads
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => NewsletterLoader.addStyles());
  } else {
    NewsletterLoader.addStyles();
  }
}

// Export for module usage
export default NewsletterLoader;

// Also attach to window for global access
if (typeof window !== 'undefined') {
  window.NewsletterLoader = NewsletterLoader;
}
