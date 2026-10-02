/**
 * Service Worker Utilities
 * The site registers no service worker; see retireServiceWorkers().
 */

import { createLogger } from './logger.js';

const logger = createLogger('ServiceWorker');

/**
 * Retire any service worker previously registered for this origin.
 *
 * The site deliberately does NOT register a service worker. From 2025-09-27
 * to 2025-11-18 it deployed a cache-first one ('sapa-cache-v1') that pinned
 * stale pages. The root sw.js is now a kill switch that removes that worker
 * from any browser that re-checks /sw.js. This in-page cleanup is a second
 * path: it unregisters any worker this page can see and deletes its 'sapa-'
 * caches. Harmless (a no-op) when none exist.
 * @returns {Promise<number>} Number of registrations removed
 */
export async function retireServiceWorkers() {
  let removed = 0;
  try {
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator &&
        typeof navigator.serviceWorker.getRegistrations === 'function') {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        if (await registration.unregister()) {removed++;}
      }
    }
    if (typeof caches !== 'undefined') {
      const keys = await caches.keys();
      await Promise.all(keys.filter(k => k.startsWith('sapa-')).map(k => caches.delete(k)));
    }
  } catch (error) {
    logger.warn('Service worker cleanup failed:', error);
  }
  return removed;
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
        return success;
      }
    } catch (error) {
      logger.warn('Service worker unregistration failed:', error);
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
