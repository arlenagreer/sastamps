/**
 * Pagination Module
 * Reusable pagination component for newsletters, search results, and glossary
 */

import { createLogger } from '../utils/logger.js';

const logger = createLogger('Pagination');

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
      logger.error('Pagination container not found');
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
     * Generate pagination HTML using DaisyUI join + btn pattern
     * @returns {string} HTML string
     */
  generatePaginationHTML() {
    const pages = this.getVisiblePages();
    let html = '<div class="flex flex-wrap items-center justify-between gap-4 p-4 bg-base-100 border border-base-300 rounded-box">';

    // Info section
    html += `<span class="text-sm text-base-content/60">Showing ${this.getStartItem()}-${this.getEndItem()} of ${this.totalItems} items</span>`;

    // Navigation with DaisyUI join
    html += '<div class="join">';

    // First and Previous buttons
    html += `<button class="join-item btn btn-sm" data-page="1" title="First page" ${this.currentPage === 1 ? 'disabled' : ''}><i class="fas fa-angle-double-left"></i></button>`;
    html += `<button class="join-item btn btn-sm" data-page="${this.currentPage - 1}" title="Previous page" ${this.currentPage === 1 ? 'disabled' : ''}><i class="fas fa-angle-left"></i></button>`;

    // Page numbers
    for (const page of pages) {
      if (page === '...') {
        html += '<span class="join-item btn btn-sm btn-disabled">...</span>';
      } else {
        const isActive = page === this.currentPage;
        html += `<button class="join-item btn btn-sm ${isActive ? 'btn-active' : ''}" data-page="${page}" ${isActive ? 'aria-current="page"' : ''}>${page}</button>`;
      }
    }

    // Next and Last buttons
    html += `<button class="join-item btn btn-sm" data-page="${this.currentPage + 1}" title="Next page" ${this.currentPage === this.totalPages ? 'disabled' : ''}><i class="fas fa-angle-right"></i></button>`;
    html += `<button class="join-item btn btn-sm" data-page="${this.totalPages}" title="Last page" ${this.currentPage === this.totalPages ? 'disabled' : ''}><i class="fas fa-angle-double-right"></i></button>`;

    html += '</div>'; // join

    // Items per page selector with DaisyUI select
    html += '<div class="flex items-center gap-2">';
    html += '<label class="text-sm text-base-content/60" for="items-per-page">Per page:</label>';
    html += '<select id="items-per-page" class="select select-bordered select-sm">';
    html += `<option value="5" ${this.itemsPerPage === 5 ? 'selected' : ''}>5</option>`;
    html += `<option value="10" ${this.itemsPerPage === 10 ? 'selected' : ''}>10</option>`;
    html += `<option value="20" ${this.itemsPerPage === 20 ? 'selected' : ''}>20</option>`;
    html += `<option value="50" ${this.itemsPerPage === 50 ? 'selected' : ''}>50</option>`;
    html += '</select>';
    html += '</div>';

    html += '</div>'; // outer wrapper

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

    // Page buttons (using data-page attribute selector)
    this.paginationElement.querySelectorAll('[data-page]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const page = parseInt(btn.dataset.page);
        if (!isNaN(page) && !btn.disabled) {
          this.goToPage(page);
        }
      });
    });

    // Items per page selector (DaisyUI select by ID)
    const itemsSelect = this.paginationElement.querySelector('#items-per-page');
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

  // DaisyUI handles all pagination styling -- no injected CSS needed
}

// Export for module usage
export default Pagination;

// Also attach to window for global access
if (typeof window !== 'undefined') {
  window.Pagination = Pagination;
}
