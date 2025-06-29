/**
 * Global Error Handler
 * Tree-shakable global error handling setup
 */

// Global error handling for uncaught errors
window.addEventListener('error', (event) => {
    console.error('Uncaught error:', event.error);
    
    // Don't show error banner for script loading errors in production
    if (event.filename && event.filename.includes('.js')) {
        return;
    }
    
    showErrorBanner('An unexpected error occurred. Please refresh the page.');
});

// Global error handling for unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    
    // Prevent the default browser behavior
    event.preventDefault();
    
    showErrorBanner('A network or processing error occurred. Please try again.');
});

/**
 * Show error banner to user
 * @param {string} message - Error message to display
 */
function showErrorBanner(message) {
    // Remove existing error banner
    const existingBanner = document.querySelector('.error-banner');
    if (existingBanner) {
        existingBanner.remove();
    }
    
    // Create new error banner
    const banner = document.createElement('div');
    banner.className = 'error-banner';
    banner.innerHTML = `
        <div class="error-content">
            <span class="error-message">${message}</span>
            <button class="error-dismiss" aria-label="Dismiss error">×</button>
        </div>
    `;
    
    // Insert at top of page
    document.body.insertBefore(banner, document.body.firstChild);
    
    // Add dismiss functionality
    banner.querySelector('.error-dismiss').addEventListener('click', () => {
        banner.remove();
    });
    
    // Auto-dismiss after 10 seconds
    setTimeout(() => {
        if (banner.parentNode) {
            banner.remove();
        }
    }, 10000);
}

// Console warning for development
if (process.env.NODE_ENV === 'development') {
    console.log('Global error handler initialized');
}