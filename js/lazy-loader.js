/**
 * Lazy Loading System
 * San Antonio Philatelic Association
 * 
 * Implements efficient lazy loading for components using Intersection Observer
 */

class LazyLoader {
    constructor(options = {}) {
        this.options = {
            rootMargin: '50px',
            threshold: 0.1,
            loadingClass: 'lazy-loading',
            loadedClass: 'lazy-loaded',
            errorClass: 'lazy-error',
            ...options
        };
        
        this.observer = null;
        this.loaders = new Map();
        this.init();
    }

    init() {
        if ('IntersectionObserver' in window) {
            this.observer = new IntersectionObserver(
                this.handleIntersection.bind(this),
                {
                    rootMargin: this.options.rootMargin,
                    threshold: this.options.threshold
                }
            );
        } else {
            // Fallback for older browsers - load everything immediately
            console.warn('IntersectionObserver not supported, loading all components immediately');
        }
    }

    /**
     * Register a component for lazy loading
     * @param {Element} element - Target element
     * @param {Function} loadFunction - Function to call when element comes into view
     * @param {Object} options - Additional options
     */
    observe(element, loadFunction, options = {}) {
        if (!element || typeof loadFunction !== 'function') {
            console.error('LazyLoader: Invalid element or load function');
            return;
        }

        const config = {
            loadFunction,
            loaded: false,
            loading: false,
            retries: 0,
            maxRetries: options.maxRetries || 2,
            fallbackContent: options.fallbackContent || null,
            placeholder: options.placeholder || null,
            ...options
        };

        this.loaders.set(element, config);

        // Show placeholder if provided
        if (config.placeholder) {
            this.showPlaceholder(element, config.placeholder);
        }

        if (this.observer) {
            this.observer.observe(element);
        } else {
            // Immediate loading for unsupported browsers
            this.loadComponent(element, config);
        }
    }

    /**
     * Handle intersection events
     * @param {Array} entries - Intersection observer entries
     */
    handleIntersection(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const element = entry.target;
                const config = this.loaders.get(element);
                
                if (config && !config.loaded && !config.loading) {
                    this.loadComponent(element, config);
                }
            }
        });
    }

    /**
     * Load a component
     * @param {Element} element - Target element
     * @param {Object} config - Component configuration
     */
    async loadComponent(element, config) {
        if (config.loading || config.loaded) return;

        config.loading = true;
        element.classList.add(this.options.loadingClass);

        try {
            // Show loading indicator
            this.showLoadingIndicator(element);

            // Call the load function
            await config.loadFunction(element);

            // Success
            config.loaded = true;
            config.loading = false;
            element.classList.remove(this.options.loadingClass);
            element.classList.add(this.options.loadedClass);

            // Remove from observer
            if (this.observer) {
                this.observer.unobserve(element);
            }

            // Remove loading indicator
            this.hideLoadingIndicator(element);

            console.log('[LazyLoader] Component loaded successfully:', element);

        } catch (error) {
            console.error('[LazyLoader] Failed to load component:', error);
            
            config.loading = false;
            config.retries++;

            // Retry if not exceeded max retries
            if (config.retries < config.maxRetries) {
                console.log(`[LazyLoader] Retrying... (${config.retries}/${config.maxRetries})`);
                setTimeout(() => {
                    this.loadComponent(element, config);
                }, 1000 * config.retries);
            } else {
                // Show error state
                this.showError(element, config, error);
            }
        }
    }

    /**
     * Show placeholder content
     * @param {Element} element - Target element
     * @param {string|Function} placeholder - Placeholder content
     */
    showPlaceholder(element, placeholder) {
        const content = typeof placeholder === 'function' ? placeholder() : placeholder;
        element.innerHTML = content;
    }

    /**
     * Show loading indicator
     * @param {Element} element - Target element
     */
    showLoadingIndicator(element) {
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'lazy-loading-indicator';
        loadingDiv.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 2rem;
            background-color: #f8f9fa;
            border-radius: var(--radius-md, 5px);
            color: var(--medium, #666);
            font-size: 0.875rem;
        `;
        
        loadingDiv.innerHTML = `
            <div style="text-align: center;">
                <div style="margin-bottom: 0.5rem;">
                    <div class="spinner" style="
                        border: 2px solid #e9ecef;
                        border-top: 2px solid var(--primary, #007bff);
                        border-radius: 50%;
                        width: 20px;
                        height: 20px;
                        animation: spin 1s linear infinite;
                        margin: 0 auto;
                    "></div>
                </div>
                <div>Loading...</div>
            </div>
        `;

        // Add spinner animation
        if (!document.querySelector('#lazy-loader-styles')) {
            const style = document.createElement('style');
            style.id = 'lazy-loader-styles';
            style.textContent = `
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
        }

        element.appendChild(loadingDiv);
    }

    /**
     * Hide loading indicator
     * @param {Element} element - Target element
     */
    hideLoadingIndicator(element) {
        const indicator = element.querySelector('.lazy-loading-indicator');
        if (indicator) {
            indicator.remove();
        }
    }

    /**
     * Show error state
     * @param {Element} element - Target element
     * @param {Object} config - Component configuration
     * @param {Error} error - The error that occurred
     */
    showError(element, config, error) {
        element.classList.add(this.options.errorClass);
        this.hideLoadingIndicator(element);

        const errorContent = config.fallbackContent || this.getDefaultErrorContent();
        const errorDiv = document.createElement('div');
        errorDiv.className = 'lazy-error-content';
        errorDiv.style.cssText = `
            background-color: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
            border-radius: var(--radius-md, 5px);
            padding: 1rem;
            text-align: center;
        `;

        if (typeof errorContent === 'function') {
            errorDiv.innerHTML = errorContent(error);
        } else {
            errorDiv.innerHTML = errorContent;
        }

        // Add retry button
        const retryButton = document.createElement('button');
        retryButton.textContent = 'Retry';
        retryButton.className = 'btn btn-sm btn-outline-primary mt-2';
        retryButton.style.cssText = `
            background: none;
            border: 1px solid var(--primary, #007bff);
            color: var(--primary, #007bff);
            padding: 0.25rem 0.75rem;
            border-radius: var(--radius-sm, 3px);
            cursor: pointer;
            font-size: 0.875rem;
            margin-top: 0.5rem;
        `;
        
        retryButton.onclick = () => {
            config.retries = 0;
            config.loaded = false;
            config.loading = false;
            element.classList.remove(this.options.errorClass);
            errorDiv.remove();
            this.loadComponent(element, config);
        };

        errorDiv.appendChild(retryButton);
        element.appendChild(errorDiv);
    }

    /**
     * Get default error content
     * @returns {string} Default error HTML
     */
    getDefaultErrorContent() {
        return `
            <div>
                <h4 style="margin-bottom: 0.5rem;">
                    <i class="fas fa-exclamation-triangle"></i>
                    Failed to Load
                </h4>
                <p style="margin-bottom: 0;">
                    This component couldn't be loaded. Please try again.
                </p>
            </div>
        `;
    }

    /**
     * Manually trigger loading for a specific element
     * @param {Element} element - Target element
     */
    forceLoad(element) {
        const config = this.loaders.get(element);
        if (config && !config.loaded) {
            this.loadComponent(element, config);
        }
    }

    /**
     * Unobserve an element
     * @param {Element} element - Target element
     */
    unobserve(element) {
        if (this.observer) {
            this.observer.unobserve(element);
        }
        this.loaders.delete(element);
    }

    /**
     * Destroy the lazy loader
     */
    destroy() {
        if (this.observer) {
            this.observer.disconnect();
        }
        this.loaders.clear();
    }
}

/**
 * Calendar-specific lazy loader
 */
class CalendarLazyLoader extends LazyLoader {
    constructor(options = {}) {
        super({
            placeholder: CalendarLazyLoader.getCalendarPlaceholder,
            fallbackContent: CalendarLazyLoader.getCalendarError,
            ...options
        });
    }

    /**
     * Get calendar placeholder content
     * @returns {string} Placeholder HTML
     */
    static getCalendarPlaceholder() {
        return `
            <div class="calendar-placeholder" style="
                background-color: #f8f9fa;
                border: 2px dashed #dee2e6;
                border-radius: var(--radius-md, 5px);
                padding: 2rem;
                text-align: center;
                min-height: 300px;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                color: var(--medium, #666);
            ">
                <div style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;">
                    <i class="fas fa-calendar-alt"></i>
                </div>
                <h3 style="margin-bottom: 0.5rem; color: var(--dark, #333);">Calendar</h3>
                <p style="margin: 0; font-size: 0.875rem;">
                    Calendar will load when you scroll down
                </p>
            </div>
        `;
    }

    /**
     * Get calendar error content
     * @param {Error} error - The error that occurred
     * @returns {string} Error HTML
     */
    static getCalendarError(error) {
        return `
            <div>
                <h4 style="margin-bottom: 0.5rem;">
                    <i class="fas fa-calendar-times"></i>
                    Calendar Unavailable
                </h4>
                <p style="margin-bottom: 0.5rem;">
                    Unable to load the meeting calendar. Please try refreshing the page.
                </p>
                <p style="font-size: 0.875rem; margin: 0; opacity: 0.7;">
                    For meeting information, email: <a href="mailto:loz33@hotmail.com">loz33@hotmail.com</a>
                </p>
            </div>
        `;
    }
}

// Create global instance
const lazyLoader = new LazyLoader();
const calendarLazyLoader = new CalendarLazyLoader();

export { LazyLoader, CalendarLazyLoader, lazyLoader, calendarLazyLoader };