/**
 * Resources Page Bundle
 * Only includes functionality needed for the resources page
 */

import { debounce } from '../utils/performance.js';
import { safeQuerySelector } from '../utils/safe-dom.js';
import { addEventListenerWithCleanup } from '../utils/event-cleanup.js';
import { formatDate } from '../utils/helpers.js';

// Resources-specific functionality
async function initializeResourcesPage() {
    // Load resources data
    const resourcesData = await loadResourcesData();
    if (!resourcesData) return;
    
    // Initialize featured resources
    displayFeaturedResources(resourcesData.resources);
    
    // Initialize categorized view
    displayCategorizedResources(resourcesData.resources, resourcesData.categories);
    
    // Initialize all resources list
    displayAllResources(resourcesData.resources);
    
    // Initialize search and filters
    initializeResourceSearch(resourcesData.resources);
    initializeResourceFilters(resourcesData.resources, resourcesData.categories);
    
    // Track page view
    if (typeof gtag === 'function') {
        gtag('event', 'page_view', {
            page_title: 'Resources Page',
            page_location: window.location.href
        });
    }
}

async function loadResourcesData() {
    try {
        const { default: data } = await import('../../data/members/resources.json');
        console.log('Resources data loaded successfully');
        return data;
    } catch (error) {
        console.error('Failed to load resources data:', error);
        showResourcesError('Unable to load resources. Please try again later.');
        return null;
    }
}

function displayFeaturedResources(resources) {
    const container = safeQuerySelector('#featured-resources-grid');
    if (!container) return;
    
    const featuredResources = resources.filter(resource => resource.featured);
    
    if (featuredResources.length === 0) {
        container.innerHTML = '<p>No featured resources available at this time.</p>';
        return;
    }
    
    const html = featuredResources.map(resource => `
        <div class="resource-card featured-resource" data-id="${resource.id}" data-category="${resource.category}" data-difficulty="${resource.difficulty}">
            <div class="resource-header">
                <h3>${resource.title}</h3>
                <div class="resource-badges">
                    <span class="difficulty-badge difficulty-${resource.difficulty}">${resource.difficulty}</span>
                    ${resource.estimatedReadTime ? `<span class="read-time">📖 ${resource.estimatedReadTime} min read</span>` : ''}
                </div>
            </div>
            
            <div class="resource-content">
                <p class="resource-summary">${resource.summary}</p>
                
                <div class="resource-meta">
                    <span class="resource-type">📄 ${formatResourceType(resource.type)}</span>
                    <span class="resource-category">🏷️ ${formatCategory(resource.category)}</span>
                    ${resource.author ? `<span class="resource-author">✍️ ${resource.author.name}</span>` : ''}
                </div>
                
                ${resource.tags && resource.tags.length > 0 ? `
                    <div class="resource-tags">
                        ${resource.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                    </div>
                ` : ''}
            </div>
            
            <div class="resource-actions">
                <button class="btn-primary btn-read-resource" data-resource-id="${resource.id}">
                    📖 Read Guide
                </button>
                ${resource.sections && resource.sections.length > 0 ? `
                    <button class="btn-secondary btn-view-sections" data-resource-id="${resource.id}">
                        📋 View Sections
                    </button>
                ` : ''}
                <button class="btn-outline btn-bookmark" data-resource-id="${resource.id}" aria-label="Bookmark resource">
                    🔖
                </button>
            </div>
        </div>
    `).join('');
    
    container.innerHTML = html;
    bindResourceActions(container);
}

function displayCategorizedResources(resources, categories) {
    const container = safeQuerySelector('#categories-container');
    if (!container) return;
    
    const html = categories.map(category => {
        const categoryResources = resources.filter(resource => resource.category === category.id);
        
        return `
            <div class="category-card" data-category="${category.id}">
                <div class="category-header">
                    <h3>${category.name}</h3>
                    <p class="category-description">${category.description}</p>
                    <span class="resource-count">${categoryResources.length} resource${categoryResources.length !== 1 ? 's' : ''}</span>
                </div>
                
                <div class="category-resources">
                    ${categoryResources.slice(0, 3).map(resource => `
                        <div class="resource-preview">
                            <h4><a href="#" class="resource-link" data-resource-id="${resource.id}">${resource.title}</a></h4>
                            <p class="resource-preview-summary">${resource.summary.substring(0, 100)}...</p>
                            <div class="resource-preview-meta">
                                <span class="difficulty-badge difficulty-${resource.difficulty}">${resource.difficulty}</span>
                                ${resource.estimatedReadTime ? `<span class="read-time">${resource.estimatedReadTime} min</span>` : ''}
                            </div>
                        </div>
                    `).join('')}
                    
                    ${categoryResources.length > 3 ? `
                        <button class="btn-outline btn-view-all-category" data-category="${category.id}">
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
    if (!container) return;
    
    const html = resources.map(resource => `
        <div class="resource-item" data-id="${resource.id}" data-category="${resource.category}" data-difficulty="${resource.difficulty}">
            <div class="resource-item-header">
                <h3><a href="#" class="resource-link" data-resource-id="${resource.id}">${resource.title}</a></h3>
                <div class="resource-badges">
                    <span class="difficulty-badge difficulty-${resource.difficulty}">${resource.difficulty}</span>
                    ${resource.featured ? '<span class="featured-badge">⭐ Featured</span>' : ''}
                </div>
            </div>
            
            <p class="resource-summary">${resource.summary}</p>
            
            <div class="resource-meta">
                <span class="resource-type">📄 ${formatResourceType(resource.type)}</span>
                <span class="resource-category">🏷️ ${formatCategory(resource.category)}</span>
                ${resource.estimatedReadTime ? `<span class="read-time">📖 ${resource.estimatedReadTime} min read</span>` : ''}
                ${resource.dateUpdated ? `<span class="last-updated">📅 Updated ${formatDate(resource.dateUpdated)}</span>` : ''}
            </div>
            
            <div class="resource-actions">
                <button class="btn-primary btn-read-resource" data-resource-id="${resource.id}">
                    Read Guide
                </button>
                <button class="btn-outline btn-bookmark" data-resource-id="${resource.id}" aria-label="Bookmark resource">
                    🔖 Bookmark
                </button>
            </div>
        </div>
    `).join('');
    
    container.innerHTML = html;
    bindResourceActions(container);
}

function initializeResourceSearch(resources) {
    const searchInput = safeQuerySelector('#resource-search');
    if (!searchInput) return;
    
    const performSearch = debounce((query) => {
        if (!query.trim()) {
            showAllResources();
            return;
        }
        
        const results = searchResources(resources, query);
        filterResourcesDisplay(results);
        
        // Track search
        if (typeof gtag === 'function') {
            gtag('event', 'search', {
                search_term: query,
                search_type: 'resources',
                results_count: results.length
            });
        }
    }, 300);
    
    addEventListenerWithCleanup(searchInput, 'input', (e) => {
        performSearch(e.target.value);
    });
}

function initializeResourceFilters(resources, categories) {
    const categoryFilter = safeQuerySelector('#category-filter');
    const difficultyFilter = safeQuerySelector('#difficulty-filter');
    const clearButton = safeQuerySelector('#clear-filters');
    
    const applyFilters = debounce(() => {
        const selectedCategory = categoryFilter?.value || '';
        const selectedDifficulty = difficultyFilter?.value || '';
        
        let filteredResources = resources;
        
        if (selectedCategory) {
            filteredResources = filteredResources.filter(r => r.category === selectedCategory);
        }
        
        if (selectedDifficulty) {
            filteredResources = filteredResources.filter(r => r.difficulty === selectedDifficulty);
        }
        
        filterResourcesDisplay(filteredResources);
    }, 300);
    
    if (categoryFilter) {
        addEventListenerWithCleanup(categoryFilter, 'change', applyFilters);
    }
    
    if (difficultyFilter) {
        addEventListenerWithCleanup(difficultyFilter, 'change', applyFilters);
    }
    
    if (clearButton) {
        addEventListenerWithCleanup(clearButton, 'click', () => {
            if (categoryFilter) categoryFilter.value = '';
            if (difficultyFilter) difficultyFilter.value = '';
            const searchInput = safeQuerySelector('#resource-search');
            if (searchInput) searchInput.value = '';
            
            showAllResources();
        });
    }
}

function searchResources(resources, query) {
    const searchTerms = query.toLowerCase().split(' ');
    
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

function filterResourcesDisplay(filteredResources) {
    const allItems = document.querySelectorAll('.resource-item, .resource-card');
    
    allItems.forEach(item => {
        const resourceId = item.dataset.id;
        const isMatch = filteredResources.some(resource => resource.id === resourceId);
        item.style.display = isMatch ? 'block' : 'none';
    });
    
    // Update category cards
    const categoryCards = document.querySelectorAll('.category-card');
    categoryCards.forEach(card => {
        const categoryId = card.dataset.category;
        const categoryResources = filteredResources.filter(r => r.category === categoryId);
        card.style.display = categoryResources.length > 0 ? 'block' : 'none';
    });
}

function showAllResources() {
    const allItems = document.querySelectorAll('.resource-item, .resource-card, .category-card');
    allItems.forEach(item => {
        item.style.display = 'block';
    });
}

function bindResourceActions(container) {
    // Read resource buttons
    const readButtons = container.querySelectorAll('.btn-read-resource, .resource-link');
    readButtons.forEach(button => {
        addEventListenerWithCleanup(button, 'click', (e) => {
            e.preventDefault();
            const resourceId = e.target.dataset.resourceId;
            openResourceModal(resourceId);
        });
    });
    
    // Bookmark buttons
    const bookmarkButtons = container.querySelectorAll('.btn-bookmark');
    bookmarkButtons.forEach(button => {
        addEventListenerWithCleanup(button, 'click', (e) => {
            const resourceId = e.target.dataset.resourceId;
            toggleBookmark(resourceId, e.target);
        });
    });
    
    // View sections buttons
    const sectionsButtons = container.querySelectorAll('.btn-view-sections');
    sectionsButtons.forEach(button => {
        addEventListenerWithCleanup(button, 'click', (e) => {
            const resourceId = e.target.dataset.resourceId;
            showResourceSections(resourceId);
        });
    });
}

function bindCategoryActions(container) {
    // Category resource links
    const resourceLinks = container.querySelectorAll('.resource-link');
    resourceLinks.forEach(link => {
        addEventListenerWithCleanup(link, 'click', (e) => {
            e.preventDefault();
            const resourceId = e.target.dataset.resourceId;
            openResourceModal(resourceId);
        });
    });
    
    // View all category buttons
    const viewAllButtons = container.querySelectorAll('.btn-view-all-category');
    viewAllButtons.forEach(button => {
        addEventListenerWithCleanup(button, 'click', (e) => {
            const categoryId = e.target.dataset.category;
            filterByCategory(categoryId);
        });
    });
}

async function openResourceModal(resourceId) {
    try {
        const { default: resourcesData } = await import('../../data/members/resources.json');
        const resource = resourcesData.resources.find(r => r.id === resourceId);
        
        if (!resource) {
            console.error('Resource not found:', resourceId);
            return;
        }
        
        // Create modal content
        const modalContent = `
            <div class="resource-modal">
                <div class="resource-modal-header">
                    <h2>${resource.title}</h2>
                    <div class="resource-modal-meta">
                        <span class="difficulty-badge difficulty-${resource.difficulty}">${resource.difficulty}</span>
                        ${resource.estimatedReadTime ? `<span class="read-time">📖 ${resource.estimatedReadTime} min read</span>` : ''}
                        ${resource.author ? `<span class="author">✍️ ${resource.author.name}</span>` : ''}
                    </div>
                </div>
                
                <div class="resource-modal-content">
                    ${formatResourceContent(resource.content)}
                    
                    ${resource.externalLinks && resource.externalLinks.length > 0 ? `
                        <div class="external-links-section">
                            <h3>Additional Resources</h3>
                            <ul class="external-links-list">
                                ${resource.externalLinks.map(link => `
                                    <li>
                                        <a href="${link.url}" target="_blank" rel="noopener">
                                            ${link.title}
                                        </a>
                                        ${link.description ? `<span class="link-description">${link.description}</span>` : ''}
                                    </li>
                                `).join('')}
                            </ul>
                        </div>
                    ` : ''}
                </div>
                
                <div class="resource-modal-actions">
                    <button class="btn-outline btn-bookmark-modal" data-resource-id="${resource.id}">
                        🔖 Bookmark
                    </button>
                    <button class="btn-secondary btn-print" onclick="window.print()">
                        🖨️ Print
                    </button>
                    <button class="btn-primary btn-close-modal">
                        Close
                    </button>
                </div>
            </div>
        `;
        
        // Use existing modal system or create simple modal
        showModal(modalContent);
        
        // Track resource view
        if (typeof gtag === 'function') {
            gtag('event', 'resource_view', {
                resource_id: resourceId,
                resource_title: resource.title,
                resource_category: resource.category
            });
        }
        
    } catch (error) {
        console.error('Failed to load resource:', error);
        alert('Unable to load resource content. Please try again.');
    }
}

function showModal(content) {
    // Simple modal implementation
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content">
            ${content}
        </div>
    `;
    
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
    
    // Close modal handlers
    const closeButton = modal.querySelector('.btn-close-modal');
    if (closeButton) {
        addEventListenerWithCleanup(closeButton, 'click', () => {
            modal.remove();
            document.body.style.overflow = '';
        });
    }
    
    // Close on overlay click
    addEventListenerWithCleanup(modal, 'click', (e) => {
        if (e.target === modal) {
            modal.remove();
            document.body.style.overflow = '';
        }
    });
    
    // Close on escape key
    const handleEscape = (e) => {
        if (e.key === 'Escape') {
            modal.remove();
            document.body.style.overflow = '';
            document.removeEventListener('keydown', handleEscape);
        }
    };
    document.addEventListener('keydown', handleEscape);
}

function toggleBookmark(resourceId, button) {
    const bookmarks = JSON.parse(localStorage.getItem('resource_bookmarks') || '[]');
    const isBookmarked = bookmarks.includes(resourceId);
    
    if (isBookmarked) {
        const index = bookmarks.indexOf(resourceId);
        bookmarks.splice(index, 1);
        button.textContent = '🔖';
        button.setAttribute('aria-label', 'Bookmark resource');
    } else {
        bookmarks.push(resourceId);
        button.textContent = '🔖 Bookmarked';
        button.setAttribute('aria-label', 'Remove bookmark');
    }
    
    localStorage.setItem('resource_bookmarks', JSON.stringify(bookmarks));
    
    // Show feedback
    const feedback = document.createElement('div');
    feedback.className = 'bookmark-feedback';
    feedback.textContent = isBookmarked ? 'Bookmark removed' : 'Resource bookmarked';
    button.parentNode.appendChild(feedback);
    
    setTimeout(() => {
        feedback.remove();
    }, 2000);
}

function filterByCategory(categoryId) {
    const categoryFilter = safeQuerySelector('#category-filter');
    if (categoryFilter) {
        categoryFilter.value = categoryId;
        categoryFilter.dispatchEvent(new Event('change'));
    }
    
    // Scroll to all resources section
    const allResourcesSection = safeQuerySelector('#all-resources');
    if (allResourcesSection) {
        allResourcesSection.scrollIntoView({ behavior: 'smooth' });
    }
}

function formatResourceContent(content) {
    // Convert markdown-like content to HTML
    return content
        .replace(/\n## (.*?)\n/g, '<h3>$1</h3>')
        .replace(/\n### (.*?)\n/g, '<h4>$1</h4>')
        .replace(/\n\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n- (.*?)(?=\n|$)/g, '<li>$1</li>')
        .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/^/, '<p>')
        .replace(/$/, '</p>');
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
                <p>${message}</p>
                <button onclick="location.reload()" class="btn-secondary">Refresh Page</button>
            </div>
        `;
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeResourcesPage);
} else {
    initializeResourcesPage();
}