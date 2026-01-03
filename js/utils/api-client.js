/**
 * API Client Utility
 * Provides consistent API communication with error handling
 */

import {
  withErrorHandling,
  validateResponse,
  handleNetworkError,
  withTimeout,
  retryWithBackoff,
  AppError as _AppError,
  ErrorTypes
} from './error-handler.js';
import { API_ENDPOINTS, TIMING, HTTP_STATUS as _HTTP_STATUS } from '../constants/index.js';
import { createLogger } from './logger.js';

const logger = createLogger('ApiClient');

/**
 * Default API client configuration
 */
const defaultConfig = {
  timeout: 30000, // 30 seconds
  retries: 3,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
};

/**
 * API client class for consistent API communication
 */
export class ApiClient {
  constructor(config = {}) {
    this.config = { ...defaultConfig, ...config };
    this.baseURL = config.baseURL || '';
  }

  /**
     * Make an API request with error handling and retries
     * @param {string} url - Request URL
     * @param {Object} options - Fetch options
     * @returns {Promise<Object>} Response data
     */
  async request(url, options = {}) {
    const fullUrl = this.baseURL + url;
    const requestOptions = {
      ...options,
      headers: {
        ...this.config.headers,
        ...options.headers
      }
    };

    // Add CSRF token if available
    if (requestOptions.method !== 'GET') {
      const csrfToken = await this.getCSRFToken();
      if (csrfToken) {
        requestOptions.headers['X-CSRF-Token'] = csrfToken;
      }
    }

    try {
      const response = await retryWithBackoff(
        async () => {
          const fetchPromise = fetch(fullUrl, requestOptions);
          const responseWithTimeout = await withTimeout(
            fetchPromise,
            options.timeout || this.config.timeout
          );
          return validateResponse(responseWithTimeout);
        },
        {
          maxRetries: options.retries || this.config.retries,
          shouldRetry: (error) => {
            // Retry on network errors and 5xx status codes
            return error.type === ErrorTypes.NETWORK ||
                               (error.details?.status >= 500);
          }
        }
      );

      // Parse response based on content type
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      } else {
        return await response.text();
      }
    } catch (error) {
      throw handleNetworkError(error);
    }
  }

  /**
     * GET request
     * @param {string} url - Request URL
     * @param {Object} options - Request options
     * @returns {Promise<Object>} Response data
     */
  async get(url, options = {}) {
    return this.request(url, {
      ...options,
      method: 'GET'
    });
  }

  /**
     * POST request
     * @param {string} url - Request URL
     * @param {Object} data - Request body
     * @param {Object} options - Request options
     * @returns {Promise<Object>} Response data
     */
  async post(url, data, options = {}) {
    return this.request(url, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  /**
     * PUT request
     * @param {string} url - Request URL
     * @param {Object} data - Request body
     * @param {Object} options - Request options
     * @returns {Promise<Object>} Response data
     */
  async put(url, data, options = {}) {
    return this.request(url, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  /**
     * DELETE request
     * @param {string} url - Request URL
     * @param {Object} options - Request options
     * @returns {Promise<Object>} Response data
     */
  async delete(url, options = {}) {
    return this.request(url, {
      ...options,
      method: 'DELETE'
    });
  }

  /**
     * Get CSRF token
     * @returns {Promise<string|null>} CSRF token or null
     */
  async getCSRFToken() {
    try {
      const response = await fetch(API_ENDPOINTS.CSRF_TOKEN);
      if (response.ok) {
        const data = await response.json();
        return data.token;
      }
    } catch (error) {
      logger.warn('Failed to get CSRF token:', error);
    }
    return null;
  }
}

/**
 * Create a singleton API client instance
 */
export const apiClient = new ApiClient();

/**
 * Utility function for form submission
 * @param {string} url - Form submission URL
 * @param {FormData|Object} data - Form data
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Response data
 */
export const submitForm = withErrorHandling(
  async (url, data, options = {}) => {
    const formData = data instanceof FormData ? data : new FormData();

    if (!(data instanceof FormData)) {
      Object.entries(data).forEach(([key, value]) => {
        formData.append(key, value);
      });
    }

    const response = await apiClient.request(url, {
      ...options,
      method: 'POST',
      body: formData,
      headers: {
        // Let browser set content-type for FormData
        'Accept': 'application/json'
      }
    });

    return response;
  },
  {
    errorMessage: 'Form submission failed. Please try again.',
    trackError: true
  }
);

/**
 * Load JSON data with caching
 * @param {string} url - JSON URL
 * @param {Object} options - Load options
 * @returns {Promise<Object>} JSON data
 */
export const loadJSON = withErrorHandling(
  async (url, options = {}) => {
    const cacheKey = `json_cache_${url}`;
    const cacheDuration = options.cacheDuration || 3600000; // 1 hour

    // Check cache first
    if (options.useCache) {
      const cached = getCachedData(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const data = await apiClient.get(url, options);

    // Cache the data
    if (options.useCache) {
      setCachedData(cacheKey, data, cacheDuration);
    }

    return data;
  },
  {
    errorMessage: 'Failed to load data. Please try again.',
    fallbackValue: null
  }
);

/**
 * Simple cache implementation
 */
const cache = new Map();

function getCachedData(key) {
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) {
    return cached.data;
  }
  cache.delete(key);
  return null;
}

function setCachedData(key, data, duration) {
  cache.set(key, {
    data,
    expires: Date.now() + duration
  });
}

/**
 * Clear expired cache entries
 */
export function clearExpiredCache() {
  const now = Date.now();
  for (const [key, value] of cache.entries()) {
    if (value.expires <= now) {
      cache.delete(key);
    }
  }
}

// Clear expired cache periodically
setInterval(clearExpiredCache, TIMING.REMINDER_CHECK_INTERVAL);
