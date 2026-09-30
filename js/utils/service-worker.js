/**
 * Service Worker Utilities
 * The site registers no service worker; see retireServiceWorkers().
 */

import { createLogger } from './logger.js';

const logger = createLogger('ServiceWorker');

/**
 * Retire any service worker previously registered for this origin.
 *
 * The site deliberately does NOT register a service worker. The sw.js kept in
 * the repo is cache-first with a fixed cache name ('sapa-cache-v1') and
 * precaches every main page, so a visitor who ever installed it would keep
 * seeing stale pages after each quarterly content update. sw.js is not
 * deployed; this one-time cleanup unregisters any worker a browser may still
 * hold and deletes its 'sapa-' caches. Harmless (a no-op) when none exist.
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
