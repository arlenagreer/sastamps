/**
 * Service Worker Registration Utilities
 * Tree-shakable service worker management
 */

/**
 * Register service worker if supported
 * @returns {Promise<ServiceWorkerRegistration|null>} Registration or null
 */
export async function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        try {
            console.log('Registering service worker...');
            
            const registration = await navigator.serviceWorker.register('/sw.js', {
                scope: '/'
            });
            
            console.log('Service worker registered successfully:', registration);
            
            // Handle updates
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                if (newWorker) {
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            showUpdateNotification();
                        }
                    });
                }
            });
            
            return registration;
            
        } catch (error) {
            console.warn('Service worker registration failed:', error);
            return null;
        }
    } else {
        console.log('Service worker not supported');
        return null;
    }
}

/**
 * Unregister service worker
 * @returns {Promise<boolean>} Success status
 */
export async function unregisterServiceWorker() {
    if ('serviceWorker' in navigator) {
        try {
            const registration = await navigator.serviceWorker.getRegistration();
            if (registration) {
                const success = await registration.unregister();
                console.log('Service worker unregistered:', success);
                return success;
            }
        } catch (error) {
            console.warn('Service worker unregistration failed:', error);
        }
    }
    return false;
}

/**
 * Check if service worker is active
 * @returns {boolean} Whether service worker is active
 */
export function isServiceWorkerActive() {
    return 'serviceWorker' in navigator && 
           navigator.serviceWorker.controller !== null;
}

/**
 * Show update notification when new version available
 */
function showUpdateNotification() {
    const notification = document.createElement('div');
    notification.className = 'update-notification';
    notification.innerHTML = `
        <div class="update-content">
            <p>A new version of the site is available!</p>
            <button class="btn-update">Update Now</button>
            <button class="btn-dismiss">Dismiss</button>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Handle update button
    notification.querySelector('.btn-update').addEventListener('click', () => {
        window.location.reload();
    });
    
    // Handle dismiss button
    notification.querySelector('.btn-dismiss').addEventListener('click', () => {
        notification.remove();
    });
    
    // Auto-dismiss after 10 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 10000);
}