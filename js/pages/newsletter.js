/**
 * Newsletter Page Bundle
 * Only includes functionality needed for the newsletter page
 */

import { debounce } from '../utils/performance.js';
import { safeQuerySelector } from '../utils/safe-dom.js';
import { addEventListenerWithCleanup } from '../utils/event-cleanup.js';
import _breadcrumb from '../modules/breadcrumb.js';

async function initializeNewsletterPage() {
  const newsletterContainer = safeQuerySelector('#newsletters-container');
  if (newsletterContainer) {
    await loadNewslettersList(newsletterContainer);
  }
  const searchContainer = safeQuerySelector('#newsletter-search');
  if (searchContainer) {
    initializeNewsletterSearch(searchContainer);
  }
  const filtersContainer = safeQuerySelector('#newsletter-filters');
  if (filtersContainer) {
    initializeNewsletterFilters(filtersContainer);
  }
}

async function loadNewslettersList(container) {
  try {
    const { default: newslettersData } = await import('../../data/newsletters/newsletters.json');
    const newsletters = newslettersData.newsletters
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    const html = newsletters.map(newsletter => `
            <article class="newsletter-item" data-date="${newsletter.date}" data-year="${new Date(newsletter.date).getFullYear()}">
                <div class="newsletter-preview">
                    ${newsletter.coverImage ?
    `<img src="${newsletter.coverImage}" alt="Cover of ${newsletter.title}" loading="lazy">` :
    '<div class="newsletter-placeholder">📰</div>'
}
                </div>
                
                <div class="newsletter-content">
                    <header class="newsletter-header">
                        <h3>${newsletter.title}</h3>
                        <time datetime="${newsletter.date}" class="newsletter-date">
                            ${new Date(newsletter.date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })}
                        </time>
                    </header>
                    
                    <div class="newsletter-details">
                        ${newsletter.summary ? `<p class="newsletter-summary">${newsletter.summary}</p>` : ''}
                        
                        ${newsletter.features && newsletter.features.length > 0 ? `
                            <div class="newsletter-features">
                                <h4>Featured Articles:</h4>
                                <ul>
                                    ${newsletter.features.map(feature => `<li>${feature}</li>`).join('')}
                                </ul>
                            </div>
                        ` : ''}
                        
                        <div class="newsletter-meta">
                            <span class="newsletter-pages">${newsletter.pages || 'Multiple'} pages</span>
                            ${newsletter.fileSize ? `<span class="newsletter-size">${newsletter.fileSize}</span>` : ''}
                        </div>
                    </div>
                    
                    <footer class="newsletter-actions">
                        <a href="${newsletter.pdfUrl}" target="_blank" class="btn-primary btn-view-pdf" data-newsletter-id="${newsletter.id}">
                            📄 View PDF
                        </a>
                        <button class="btn-secondary btn-download" data-url="${newsletter.pdfUrl}" data-title="${newsletter.title}">
                            💾 Download
                        </button>
                        ${newsletter.articleLinks && newsletter.articleLinks.length > 0 ? `
                            <details class="newsletter-articles">
                                <summary>Articles (${newsletter.articleLinks.length})</summary>
                                <ul>
                                    ${newsletter.articleLinks.map(article => `
                                        <li><a href="${article.url}" target="_blank">${article.title}</a></li>
                                    `).join('')}
                                </ul>
                            </details>
                        ` : ''}
                    </footer>
                </div>
            </article>
        `).join('');

    container.innerHTML = html;
    bindNewsletterActions(container);

  } catch (error) {
    console.error('Failed to load newsletters:', error);
    container.innerHTML = '<p class="error-message">Unable to load newsletters. Please try again later.</p>';
  }
}

function initializeNewsletterSearch(container) {
  container.innerHTML = `
        <div class="search-container">
            <input type="search" id="newsletter-search-input" placeholder="Search newsletters..." aria-label="Search newsletters">
            <button id="newsletter-search-button" aria-label="Search">🔍</button>
        </div>
        <div id="search-results" class="search-results" aria-live="polite"></div>
    `;

  const searchInput = container.querySelector('#newsletter-search-input');
  const searchButton = container.querySelector('#newsletter-search-button');
  const resultsContainer = container.querySelector('#search-results');

  const performSearch = debounce(async (query) => {
    if (!query.trim()) {
      resultsContainer.innerHTML = '';
      showAllNewsletters();
      return;
    }

    try {
      const { default: newslettersData } = await import('../../data/newsletters/newsletters.json');
      const results = searchNewsletters(newslettersData.newsletters, query);

      if (results.length === 0) {
        resultsContainer.innerHTML = '<p>No newsletters found matching your search.</p>';
        hideAllNewsletters();
      } else {
        resultsContainer.innerHTML = `<p>Found ${results.length} newsletter${results.length !== 1 ? 's' : ''}</p>`;
        showSearchResults(results);
      }
    } catch (error) {
      console.error('Search failed:', error);
      resultsContainer.innerHTML = '<p>Search temporarily unavailable.</p>';
    }
  }, 300);

  addEventListenerWithCleanup(searchInput, 'input', (e) => {
    performSearch(e.target.value);
  });

  addEventListenerWithCleanup(searchButton, 'click', () => {
    performSearch(searchInput.value);
  });

  addEventListenerWithCleanup(searchInput, 'keypress', (e) => {
    if (e.key === 'Enter') {
      performSearch(searchInput.value);
    }
  });
}

function searchNewsletters(newsletters, query) {
  const searchTerms = query.toLowerCase().split(' ');

  return newsletters.filter(newsletter => {
    const searchText = [
      newsletter.title,
      newsletter.summary,
      ...(newsletter.features || []),
      new Date(newsletter.date).toLocaleDateString()
    ].join(' ').toLowerCase();

    return searchTerms.every(term => searchText.includes(term));
  });
}

function showSearchResults(results) {
  const allItems = document.querySelectorAll('.newsletter-item');
  allItems.forEach(item => {
    const newsletterDate = item.dataset.date;
    const isMatch = results.some(result => result.date === newsletterDate);
    item.style.display = isMatch ? 'block' : 'none';
  });
}

function showAllNewsletters() {
  const allItems = document.querySelectorAll('.newsletter-item');
  allItems.forEach(item => {
    item.style.display = 'block';
  });
}

function hideAllNewsletters() {
  const allItems = document.querySelectorAll('.newsletter-item');
  allItems.forEach(item => {
    item.style.display = 'none';
  });
}

function initializeNewsletterFilters(container) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  container.innerHTML = `
        <div class="filter-group">
            <label for="year-filter">Year:</label>
            <select id="year-filter">
                <option value="">All Years</option>
                ${years.map(year => `<option value="${year}">${year}</option>`).join('')}
            </select>
        </div>
        
        <div class="filter-group">
            <label for="sort-filter">Sort By:</label>
            <select id="sort-filter">
                <option value="date-desc">Newest First</option>
                <option value="date-asc">Oldest First</option>
                <option value="title-asc">Title A-Z</option>
                <option value="title-desc">Title Z-A</option>
            </select>
        </div>
        
        <button id="clear-filters" class="btn-secondary">Clear Filters</button>
    `;

  const yearFilter = container.querySelector('#year-filter');
  const sortFilter = container.querySelector('#sort-filter');
  const clearButton = container.querySelector('#clear-filters');

  const applyFilters = debounce(() => {
    const newsletters = document.querySelectorAll('.newsletter-item');
    const selectedYear = yearFilter.value;
    const sortBy = sortFilter.value;
    const visibleNewsletters = Array.from(newsletters).filter(newsletter => {
      if (selectedYear && newsletter.dataset.year !== selectedYear) {
        newsletter.style.display = 'none';
        return false;
      } else {
        newsletter.style.display = 'block';
        return true;
      }
    });
    sortNewsletters(visibleNewsletters, sortBy);
  }, 300);

  addEventListenerWithCleanup(yearFilter, 'change', applyFilters);
  addEventListenerWithCleanup(sortFilter, 'change', applyFilters);

  addEventListenerWithCleanup(clearButton, 'click', () => {
    yearFilter.value = '';
    sortFilter.value = 'date-desc';
    applyFilters();
  });
}

function sortNewsletters(newsletters, sortBy) {
  const container = newsletters[0]?.parentElement;
  if (!container) {return;}

  newsletters.sort((a, b) => {
    switch (sortBy) {
    case 'date-desc':
      return new Date(b.dataset.date) - new Date(a.dataset.date);
    case 'date-asc':
      return new Date(a.dataset.date) - new Date(b.dataset.date);
    case 'title-asc':
      return a.querySelector('h3').textContent.localeCompare(b.querySelector('h3').textContent);
    case 'title-desc':
      return b.querySelector('h3').textContent.localeCompare(a.querySelector('h3').textContent);
    default:
      return 0;
    }
  });

  newsletters.forEach(newsletter => {
    container.appendChild(newsletter);
  });
}

function bindNewsletterActions(container) {
  const downloadButtons = container.querySelectorAll('.btn-download');
  downloadButtons.forEach(button => {
    addEventListenerWithCleanup(button, 'click', (e) => {
      const {url} = e.target.dataset;
      const {title} = e.target.dataset;
      downloadNewsletter(url, title);
    });
  });
  const viewButtons = container.querySelectorAll('.btn-view-pdf');
  viewButtons.forEach(button => {
    addEventListenerWithCleanup(button, 'click', (e) => {
      const {newsletterId} = e.target.dataset;
      trackNewsletterView(newsletterId);
    });
  });
}

function downloadNewsletter(url, title) {
  try {
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title}.pdf`;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    trackNewsletterDownload(title);

  } catch (error) {
    console.error('Download failed:', error);
    alert('Download failed. Please try opening the PDF in a new tab.');
  }
}

function trackNewsletterView(newsletterId) {
  if (typeof gtag === 'function') {
    gtag('event', 'newsletter_view', {
      newsletter_id: newsletterId
    });
  }
}

function trackNewsletterDownload(title) {
  if (typeof gtag === 'function') {
    gtag('event', 'newsletter_download', {
      newsletter_title: title
    });
  }
}


if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeNewsletterPage);
} else {
  initializeNewsletterPage();
}
