/**
 * Event Cleanup Utilities
 * Tree-shakable event listener management with memory leak prevention
 */

// Store references to event listeners for cleanup
const eventListeners = new Map();

/**
 * Add event listener with cleanup tracking
 * @param {EventTarget} element - The element to attach the listener to
 * @param {string} event - The event type
 * @param {Function} handler - The event handler
 * @param {Object} options - Additional options for addEventListener
 */
export function addEventListenerWithCleanup(element, event, handler, options) {
    if (!element || typeof element.addEventListener !== 'function') {
        console.warn('Invalid element provided to addEventListenerWithCleanup');
        return;
    }
    
    element.addEventListener(event, handler, options);
    
    if (!eventListeners.has(element)) {
        eventListeners.set(element, []);
    }
    
    eventListeners.get(element).push({ event, handler, options });
}

/**
 * Remove specific event listener and cleanup tracking
 * @param {EventTarget} element - The element to remove the listener from
 * @param {string} event - The event type
 * @param {Function} handler - The event handler
 */
export function removeEventListenerWithCleanup(element, event, handler) {
    if (!element || typeof element.removeEventListener !== 'function') {
        console.warn('Invalid element provided to removeEventListenerWithCleanup');
        return;
    }
    
    element.removeEventListener(event, handler);
    
    const listeners = eventListeners.get(element);
    if (listeners) {
        const index = listeners.findIndex(l => l.event === event && l.handler === handler);
        if (index > -1) {
            listeners.splice(index, 1);
        }
        
        if (listeners.length === 0) {
            eventListeners.delete(element);
        }
    }
}

/**
 * Clean up all event listeners for better memory management
 * @param {EventTarget} specificElement - Optional: clean up only this element
 */
export function cleanupEventListeners(specificElement = null) {
    if (specificElement) {
        const listeners = eventListeners.get(specificElement);
        if (listeners) {
            listeners.forEach(({ event, handler, options }) => {
                specificElement.removeEventListener(event, handler, options);
            });
            eventListeners.delete(specificElement);
        }
    } else {
        // Clean up all tracked listeners
        eventListeners.forEach((listeners, element) => {
            listeners.forEach(({ event, handler, options }) => {
                try {
                    element.removeEventListener(event, handler, options);
                } catch (error) {
                    console.warn('Failed to remove event listener:', error);
                }
            });
        });
        eventListeners.clear();
    }
}

/**
 * Get count of tracked event listeners (for debugging)
 * @returns {number} Number of elements with tracked listeners
 */
export function getEventListenerCount() {
    return eventListeners.size;
}

// Automatic cleanup on page unload
if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
        cleanupEventListeners();
    });
}