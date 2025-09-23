/**
 * Application Configuration
 * Centralizes all configuration settings
 */

import { DEFAULTS } from '../constants/index.js';

/**
 * Environment detection
 */
export const ENV = {
  isDevelopment: window.location.hostname === 'localhost' ||
                   window.location.hostname === '127.0.0.1',
  isProduction: window.location.protocol === 'https:',
  isDebug: window.location.search.includes('debug=true')
};

/**
 * Feature flags
 */
export const FEATURES = {
  enableReminders: true,
  enableAnalytics: ENV.isProduction,
  enableServiceWorker: ENV.isProduction,
  enableDebugLogging: ENV.isDevelopment || ENV.isDebug,
  enableCaching: true,
  enableOfflineMode: true
};

/**
 * API configuration
 */
export const API_CONFIG = {
  baseURL: ENV.isDevelopment ? 'http://localhost:3000' : '',
  timeout: 30000,
  retries: 3,
  cacheTimeout: DEFAULTS.CACHE_DURATION * 1000
};

/**
 * Storage configuration
 */
export const STORAGE_CONFIG = {
  prefix: 'sapa_',
  version: '1.0',
  maxAge: DEFAULTS.SESSION_TIMEOUT * 1000
};

/**
 * Image optimization configuration
 */
export const IMAGE_CONFIG = {
  formats: ['webp', 'jpg'],
  sizes: [320, 640, 960, 1280, 1920],
  quality: DEFAULTS.IMAGE_QUALITY,
  lazyLoadOffset: 50
};

/**
 * Search configuration
 */
export const SEARCH_CONFIG = {
  minSearchLength: 2,
  maxResults: DEFAULTS.MAX_SEARCH_RESULTS,
  debounceDelay: 300,
  highlightMatches: true
};

/**
 * Form configuration
 */
export const FORM_CONFIG = {
  autoSave: true,
  autoSaveInterval: 30000, // 30 seconds
  maxRetries: 3,
  showProgressIndicator: true
};

/**
 * Calendar configuration
 */
export const CALENDAR_CONFIG = {
  defaultView: 'month',
  firstDayOfWeek: 0, // Sunday
  showWeekNumbers: false,
  allowPastDates: false,
  maxFutureMonths: 12
};

/**
 * Notification configuration
 */
export const NOTIFICATION_CONFIG = {
  position: 'top-right',
  duration: 5000,
  maxNotifications: 3,
  soundEnabled: false
};

/**
 * Performance configuration
 */
export const PERFORMANCE_CONFIG = {
  enableLazyLoading: true,
  enableCodeSplitting: true,
  enablePrefetch: ENV.isProduction,
  enableCompression: ENV.isProduction,
  reportWebVitals: ENV.isProduction
};

/**
 * Security configuration
 */
export const SECURITY_CONFIG = {
  enableCSRF: true,
  enableRateLimit: true,
  rateLimitMax: 3,
  rateLimitWindow: 3600000, // 1 hour
  allowedOrigins: [
    'https://sastamps.org',
    'https://www.sastamps.org'
  ]
};

/**
 * Logging configuration
 */
export const LOGGING_CONFIG = {
  level: ENV.isDevelopment ? 'debug' : 'error',
  enableConsole: true,
  enableRemote: ENV.isProduction,
  remoteEndpoint: '/api/logs'
};

/**
 * Get configuration value with fallback
 * @param {string} path - Dot notation path (e.g., 'api.timeout')
 * @param {*} defaultValue - Default value if not found
 * @returns {*} Configuration value
 */
export function getConfig(path, defaultValue = null) {
  const keys = path.split('.');
  let value = CONFIG;

  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key];
    } else {
      return defaultValue;
    }
  }

  return value;
}

/**
 * Combined configuration object
 */
export const CONFIG = {
  env: ENV,
  features: FEATURES,
  api: API_CONFIG,
  storage: STORAGE_CONFIG,
  image: IMAGE_CONFIG,
  search: SEARCH_CONFIG,
  form: FORM_CONFIG,
  calendar: CALENDAR_CONFIG,
  notification: NOTIFICATION_CONFIG,
  performance: PERFORMANCE_CONFIG,
  security: SECURITY_CONFIG,
  logging: LOGGING_CONFIG
};

// Freeze configuration to prevent accidental modifications
Object.freeze(CONFIG);
Object.freeze(ENV);
Object.freeze(FEATURES);
