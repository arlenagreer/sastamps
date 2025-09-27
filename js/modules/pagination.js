/**
 * Pagination Module
 * Reusable pagination component for newsletters, search results, and glossary
 */

class Pagination {
  constructor(options = {}) {
    this.itemsPerPage = options.itemsPerPage || 10;
    this.maxVisiblePages = options.maxVisiblePages || 5;
    this.currentPage = 1;
    this.totalItems = 0;
    this.totalPages = 0;
    this.items = [];
    this.filteredItems = [];
    this.callbacks = {
      onPageChange: options.onPageChange || (() => {}),
      onRender: options.onRender || (() => {})
    };
    this.containerElement = null;
    this.paginationElement = null;
  }

  /**
     * Set data to paginate
     * @param {Array} items - Array of items to paginate
     * @param {number} itemsPerPage - Items per page (optional)
     */
  setData(items, itemsPerPage = null) {
    this.items = items || [];
    this.filteredItems = [...this.items];
    this.totalItems = this.filteredItems.length;

    if (itemsPerPage !== null) {
      this.itemsPerPage = itemsPerPage;
    }

    this.calculateTotalPages();
    this.currentPage = 1;
    return this;
  }

  /**
     * Filter items based on a filter function
     * @param {Function} filterFn - Filter function
     */
  filter(filterFn) {
    if (typeof filterFn === 'function') {
      this.filteredItems = this.items.filter(filterFn);
    } else {
      this.filteredItems = [...this.items];
    }

    this.totalItems = this.filteredItems.length;
    this.calculateTotalPages();
    this.currentPage = 1;
    return this;
  }

  /**
     * Sort items
     * @param {Function} sortFn - Sort function
     */
  sort(sortFn) {
    if (typeof sortFn === 'function') {
      this.filteredItems.sort(sortFn);
    }
    return this;
  }

  /**
     * Get current page items
     * @returns {Array} Items for current page
     */
  getCurrentPageItems() {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return this.filteredItems.slice(startIndex, endIndex);
  }

  /**
     * Go to specific page
     * @param {number} page - Page number (1-indexed)
     */
  goToPage(page) {
    const newPage = Math.max(1, Math.min(page, this.totalPages));

    if (newPage !== this.currentPage) {
      this.currentPage = newPage;
      this.callbacks.onPageChange(this.currentPage, this.getCurrentPageItems());
      this.render();
    }

    return this;
  }

  /**
     * Go to next page
     */
  nextPage() {
    return this.goToPage(this.currentPage + 1);
  }

  /**
     * Go to previous page
     */
  prevPage() {
    return this.goToPage(this.currentPage - 1);
  }

  /**
     * Go to first page
     */
  firstPage() {
    return this.goToPage(1);
  }

  /**
     * Go to last page
     */
  lastPage() {
    return this.goToPage(this.totalPages);
  }

  /**
     * Set items per page
     * @param {number} itemsPerPage - New items per page
     */
  setItemsPerPage(itemsPerPage) {
    this.itemsPerPage = itemsPerPage;
    this.calculateTotalPages();
    this.currentPage = 1;
    this.callbacks.onPageChange(this.currentPage, this.getCurrentPageItems());
    this.render();
    return this;
  }

  /**
     * Bind to DOM container
     * @param {string|Element} container - Container selector or element
     */
  bindTo(container) {
    if (typeof container === 'string') {
      this.containerElement = document.querySelector(container);
    } else {
      this.containerElement = container;
    }

    if (!this.containerElement) {
      console.error('Pagination container not found');
      return this;
    }

    // Create pagination element if it doesn't exist
    this.paginationElement = this.containerElement.querySelector('.pagination-controls');
    if (!this.paginationElement) {
      this.paginationElement = document.createElement('div');
      this.paginationElement.className = 'pagination-controls';
      this.containerElement.appendChild(this.paginationElement);
    }

    return this;
  }

  /**
     * Render pagination controls
     */
  render() {
    if (!this.paginationElement) {
      return this;
    }

    if (this.totalPages <= 1) {
      this.paginationElement.innerHTML = '';
      this.paginationElement.style.display = 'none';
      return this;
    }

    this.paginationElement.style.display = 'block';
    this.paginationElement.innerHTML = this.generatePaginationHTML();
    this.attachEventListeners();

    // Call render callback
    this.callbacks.onRender(this.currentPage, this.totalPages, this.getCurrentPageItems());

    return this;
  }

  /**
     * Generate pagination HTML
     * @returns {string} HTML string
     */
  generatePaginationHTML() {
    const pages = this.getVisiblePages();
    let html = '<div class="pagination-wrapper">';

    // Info section
    html += `
            <div class="pagination-info">
                <span>Showing ${this.getStartItem()}-${this.getEndItem()} of ${this.totalItems} items</span>
            </div>
        `;

    // Controls section
    html += '<div class="pagination-nav">';

    // First and Previous buttons
    html += `
            <button class="pagination-btn pagination-first" 
                    ${this.currentPage === 1 ? 'disabled' : ''} 
                    data-page="1" 
                    title="First page">
                <i class="fas fa-angle-double-left"></i>
            </button>
            <button class="pagination-btn pagination-prev" 
                    ${this.currentPage === 1 ? 'disabled' : ''} 
                    data-page="${this.currentPage - 1}" 
                    title="Previous page">
                <i class="fas fa-angle-left"></i>
            </button>
        `;

    // Page numbers
    for (const page of pages) {
      if (page === '...') {
        html += '<span class="pagination-ellipsis">...</span>';
      } else {
        const isActive = page === this.currentPage;
        html += `
                    <button class="pagination-btn pagination-page ${isActive ? 'active' : ''}" 
                            data-page="${page}"
                            ${isActive ? 'aria-current="page"' : ''}>
                        ${page}
                    </button>
                `;
      }
    }

    // Next and Last buttons
    html += `
            <button class="pagination-btn pagination-next" 
                    ${this.currentPage === this.totalPages ? 'disabled' : ''} 
                    data-page="${this.currentPage + 1}" 
                    title="Next page">
                <i class="fas fa-angle-right"></i>
            </button>
            <button class="pagination-btn pagination-last" 
                    ${this.currentPage === this.totalPages ? 'disabled' : ''} 
                    data-page="${this.totalPages}" 
                    title="Last page">
                <i class="fas fa-angle-double-right"></i>
            </button>
        `;

    html += '</div>'; // pagination-nav

    // Items per page selector
    html += `
            <div class="pagination-settings">
                <label for="items-per-page">Items per page:</label>
                <select id="items-per-page" class="items-per-page-select">
                    <option value="5" ${this.itemsPerPage === 5 ? 'selected' : ''}>5</option>
                    <option value="10" ${this.itemsPerPage === 10 ? 'selected' : ''}>10</option>
                    <option value="20" ${this.itemsPerPage === 20 ? 'selected' : ''}>20</option>
                    <option value="50" ${this.itemsPerPage === 50 ? 'selected' : ''}>50</option>
                </select>
            </div>
        `;

    html += '</div>'; // pagination-wrapper

    return html;
  }

  /**
     * Get visible page numbers
     * @returns {Array} Array of page numbers and ellipsis
     */
  getVisiblePages() {
    const pages = [];
    const half = Math.floor(this.maxVisiblePages / 2);
    let start = Math.max(1, this.currentPage - half);
    const end = Math.min(this.totalPages, start + this.maxVisiblePages - 1);

    // Adjust start if we're near the end
    if (end - start + 1 < this.maxVisiblePages) {
      start = Math.max(1, end - this.maxVisiblePages + 1);
    }

    // Add first page and ellipsis if needed
    if (start > 1) {
      pages.push(1);
      if (start > 2) {
        pages.push('...');
      }
    }

    // Add visible pages
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    // Add ellipsis and last page if needed
    if (end < this.totalPages) {
      if (end < this.totalPages - 1) {
        pages.push('...');
      }
      pages.push(this.totalPages);
    }

    return pages;
  }

  /**
     * Attach event listeners to pagination controls
     */
  attachEventListeners() {
    if (!this.paginationElement) {return;}

    // Page buttons
    this.paginationElement.querySelectorAll('.pagination-btn[data-page]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const page = parseInt(btn.dataset.page);
        if (!isNaN(page) && !btn.disabled) {
          this.goToPage(page);
        }
      });
    });

    // Items per page selector
    const itemsSelect = this.paginationElement.querySelector('.items-per-page-select');
    if (itemsSelect) {
      itemsSelect.addEventListener('change', (e) => {
        const newItemsPerPage = parseInt(e.target.value);
        this.setItemsPerPage(newItemsPerPage);
      });
    }
  }

  /**
     * Calculate total pages
     */
  calculateTotalPages() {
    this.totalPages = Math.max(1, Math.ceil(this.totalItems / this.itemsPerPage));
  }

  /**
     * Get start item number for current page
     * @returns {number} Start item number
     */
  getStartItem() {
    if (this.totalItems === 0) {return 0;}
    return (this.currentPage - 1) * this.itemsPerPage + 1;
  }

  /**
     * Get end item number for current page
     * @returns {number} End item number
     */
  getEndItem() {
    return Math.min(this.currentPage * this.itemsPerPage, this.totalItems);
  }

  /**
     * Get pagination state
     * @returns {Object} Current pagination state
     */
  getState() {
    return {
      currentPage: this.currentPage,
      totalPages: this.totalPages,
      totalItems: this.totalItems,
      itemsPerPage: this.itemsPerPage,
      startItem: this.getStartItem(),
      endItem: this.getEndItem(),
      hasNext: this.currentPage < this.totalPages,
      hasPrev: this.currentPage > 1,
      items: this.getCurrentPageItems()
    };
  }

  /**
     * Add pagination styles to the page
     */
  static addStyles() {
    if (document.getElementById('pagination-styles')) {return;}

    const styles = `
            .pagination-controls {
                margin: 2rem 0;
                font-family: var(--font-body, Arial, sans-serif);
            }

            .pagination-wrapper {
                display: flex;
                flex-wrap: wrap;
                align-items: center;
                justify-content: space-between;
                gap: 1rem;
                padding: 1rem;
                background-color: var(--white, #fff);
                border: 1px solid var(--light, #ecf0f1);
                border-radius: var(--radius-md, 5px);
            }

            .pagination-info {
                color: var(--medium, #7f8c8d);
                font-size: 0.9rem;
            }

            .pagination-nav {
                display: flex;
                align-items: center;
                gap: 0.25rem;
            }

            .pagination-btn {
                padding: 0.5rem 0.75rem;
                border: 1px solid var(--light, #ecf0f1);
                background-color: var(--white, #fff);
                color: var(--dark, #2c3e50);
                cursor: pointer;
                border-radius: var(--radius-sm, 3px);
                font-size: 0.9rem;
                transition: all var(--transition-fast, 0.15s ease);
                min-width: 2.5rem;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .pagination-btn:hover:not(:disabled) {
                background-color: var(--primary-light, #2980b9);
                color: var(--white, #fff);
                border-color: var(--primary-light, #2980b9);
            }

            .pagination-btn.active {
                background-color: var(--primary, #1a5276);
                color: var(--white, #fff);
                border-color: var(--primary, #1a5276);
            }

            .pagination-btn:disabled {
                opacity: 0.5;
                cursor: not-allowed;
                color: var(--medium, #7f8c8d);
            }

            .pagination-ellipsis {
                padding: 0.5rem 0.25rem;
                color: var(--medium, #7f8c8d);
            }

            .pagination-settings {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                font-size: 0.9rem;
            }

            .pagination-settings label {
                color: var(--medium, #7f8c8d);
            }

            .items-per-page-select {
                padding: 0.25rem 0.5rem;
                border: 1px solid var(--light, #ecf0f1);
                border-radius: var(--radius-sm, 3px);
                background-color: var(--white, #fff);
                color: var(--dark, #2c3e50);
                font-size: 0.9rem;
            }

            /* Mobile responsive */
            @media (max-width: 768px) {
                .pagination-wrapper {
                    flex-direction: column;
                    text-align: center;
                }

                .pagination-nav {
                    order: 1;
                }

                .pagination-info {
                    order: 2;
                    margin-top: 0.5rem;
                }

                .pagination-settings {
                    order: 3;
                    margin-top: 0.5rem;
                }

                .pagination-btn {
                    padding: 0.4rem 0.6rem;
                    font-size: 0.8rem;
                    min-width: 2rem;
                }
            }

            @media (max-width: 480px) {
                .pagination-nav {
                    gap: 0.1rem;
                }

                .pagination-btn {
                    padding: 0.3rem 0.5rem;
                    font-size: 0.7rem;
                    min-width: 1.8rem;
                }
            }
        `;

    const styleSheet = document.createElement('style');
    styleSheet.id = 'pagination-styles';
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
  }
}

// Add default styles when module loads
if (typeof document !== 'undefined') {
  // Add styles when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => Pagination.addStyles());
  } else {
    Pagination.addStyles();
  }
}

// Export for module usage
export default Pagination;

// Also attach to window for global access
if (typeof window !== 'undefined') {
  window.Pagination = Pagination;
}
