/**
 * Analytics Utilities
 * Tree-shakable analytics integration
 */

/**
 * Initialize Google Analytics if configured
 */
function initializeGoogleAnalytics() {
    // Check if gtag is already loaded
    if (typeof gtag === 'function') {
        console.log('Google Analytics already initialized');
        return;
    }
    
    // Look for measurement ID in HTML
    const gaScript = document.querySelector('script[src*="googletagmanager.com"]');
    if (!gaScript) {
        console.log('Google Analytics not configured');
        return;
    }
    
    console.log('Google Analytics initialized via HTML script tags');
}

/**
 * Track custom event
 * @param {string} eventName - Name of the event
 * @param {Object} parameters - Event parameters
 */
export function trackEvent(eventName, parameters = {}) {
    if (typeof gtag === 'function') {
        gtag('event', eventName, parameters);
    } else {
        console.log('Analytics event:', eventName, parameters);
    }
}

/**
 * Track page view
 * @param {string} pagePath - Path of the page
 * @param {string} pageTitle - Title of the page
 */
export function trackPageView(pagePath, pageTitle) {
    if (typeof gtag === 'function') {
        gtag('config', GA_MEASUREMENT_ID, {
            page_path: pagePath,
            page_title: pageTitle
        });
    } else {
        console.log('Analytics page view:', pagePath, pageTitle);
    }
}

/**
 * Track user engagement
 * @param {number} timeOnPage - Time spent on page in seconds
 */
export function trackEngagement(timeOnPage) {
    trackEvent('user_engagement', {
        engagement_time_msec: timeOnPage * 1000
    });
}

/**
 * Track error events
 * @param {string} errorMessage - Error message
 * @param {string} errorSource - Source of the error
 */
export function trackError(errorMessage, errorSource = 'javascript') {
    trackEvent('exception', {
        description: errorMessage,
        fatal: false,
        source: errorSource
    });
}

// Initialize analytics when module loads
initializeGoogleAnalytics();