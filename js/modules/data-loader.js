/**
 * Data Loader Module
 * Handles fetching and caching of JSON data files for the SAPA website
 */

class DataLoader {
  constructor() {
    this.cache = new Map();
    this.cacheExpiry = new Map();
    this.defaultCacheDuration = 5 * 60 * 1000; // 5 minutes
    this.baseDataPath = '/data/';
  }

  /**
     * Fetch JSON data with caching and error handling
     * @param {string} endpoint - The data endpoint (e.g., 'newsletters/newsletters.json')
     * @param {Object} options - Optional configuration
     * @param {number} options.cacheDuration - Cache duration in milliseconds
     * @param {boolean} options.forceRefresh - Force refresh cache
     * @returns {Promise<Object>} Parsed JSON data
     */
  async fetchData(endpoint, options = {}) {
    const {
      cacheDuration = this.defaultCacheDuration,
      forceRefresh = false
    } = options;

    const fullPath = this.baseDataPath + endpoint;
    const cacheKey = fullPath;

    // Check cache first (unless force refresh)
    if (!forceRefresh && this.isCacheValid(cacheKey)) {
      // Loading from cache
      return this.cache.get(cacheKey);
    }

    try {
      // Fetching data
      const response = await fetch(fullPath);

      if (!response.ok) {
        throw new Error(`Failed to fetch ${endpoint}: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // Validate data structure
      this.validateData(endpoint, data);

      // Cache the data
      this.setCache(cacheKey, data, cacheDuration);

      return data;
    } catch (error) {
      console.error(`❌ Error loading data from ${endpoint}:`, error);

      // Return cached data if available, even if expired
      if (this.cache.has(cacheKey)) {
        // Returning stale cache
        return this.cache.get(cacheKey);
      }

      // Return fallback data
      return this.getFallbackData(endpoint, error);
    }
  }

  /**
     * Get newsletters data
     * @param {Object} options - Optional configuration
     * @returns {Promise<Object>} Newsletter data
     */
  async getNewsletters(options = {}) {
    return this.fetchData('newsletters/newsletters.json', options);
  }

  /**
     * Get meetings data
     * @param {Object} options - Optional configuration
     * @returns {Promise<Object>} Meeting data
     */
  async getMeetings(options = {}) {
    return this.fetchData('meetings/meetings.json', options);
  }

  /**
     * Get member resources data
     * @param {Object} options - Optional configuration
     * @returns {Promise<Object>} Resources data
     */
  async getResources(options = {}) {
    return this.fetchData('members/resources.json', options);
  }

  /**
     * Get glossary data
     * @param {Object} options - Optional configuration
     * @returns {Promise<Object>} Glossary data
     */
  async getGlossary(options = {}) {
    return this.fetchData('glossary/glossary.json', options);
  }

  /**
     * Get upcoming meetings (next 3 months)
     * @returns {Promise<Array>} Array of upcoming meetings
     */
  async getUpcomingMeetings() {
    try {
      const data = await this.getMeetings();
      const now = new Date();
      const threeMonthsFromNow = new Date(now.getTime() + (90 * 24 * 60 * 60 * 1000));

      return data.meetings
        .filter(meeting => {
          const meetingDate = new Date(meeting.date);
          return meetingDate >= now && meetingDate <= threeMonthsFromNow && !meeting.cancelled;
        })
        .sort((a, b) => new Date(a.date) - new Date(b.date));
    } catch (error) {
      console.error('Error getting upcoming meetings:', error);
      return [];
    }
  }

  /**
     * Get latest newsletter
     * @returns {Promise<Object|null>} Latest newsletter or null
     */
  async getLatestNewsletter() {
    try {
      const data = await this.getNewsletters();
      return data.newsletters
        .filter(newsletter => newsletter.status === 'published')
        .sort((a, b) => new Date(b.publishDate) - new Date(a.publishDate))[0] || null;
    } catch (error) {
      console.error('Error getting latest newsletter:', error);
      return null;
    }
  }

  /**
     * Search across all data types
     * @param {string} query - Search query
     * @param {Array} types - Data types to search ['newsletters', 'meetings', 'resources', 'glossary']
     * @returns {Promise<Object>} Search results grouped by type
     */
  async search(query, types = ['newsletters', 'meetings', 'resources', 'glossary']) {
    const results = {
      newsletters: [],
      meetings: [],
      resources: [],
      glossary: [],
      total: 0
    };

    const searchPromises = [];

    if (types.includes('newsletters')) {
      searchPromises.push(this.searchNewsletters(query));
    }
    if (types.includes('meetings')) {
      searchPromises.push(this.searchMeetings(query));
    }
    if (types.includes('resources')) {
      searchPromises.push(this.searchResources(query));
    }
    if (types.includes('glossary')) {
      searchPromises.push(this.searchGlossary(query));
    }

    try {
      const searchResults = await Promise.all(searchPromises);

      types.forEach((type, index) => {
        results[type] = searchResults[index] || [];
        results.total += results[type].length;
      });

      return results;
    } catch (error) {
      console.error('Search error:', error);
      return results;
    }
  }

  /**
     * Search newsletters
     * @param {string} query - Search query
     * @returns {Promise<Array>} Matching newsletters
     */
  async searchNewsletters(query) {
    try {
      const data = await this.getNewsletters();
      const lowerQuery = query.toLowerCase();

      return data.newsletters.filter(newsletter => {
        return newsletter.title.toLowerCase().includes(lowerQuery) ||
                       newsletter.description.toLowerCase().includes(lowerQuery) ||
                       newsletter.highlights.some(highlight =>
                         highlight.toLowerCase().includes(lowerQuery)) ||
                       newsletter.tags.some(tag =>
                         tag.toLowerCase().includes(lowerQuery));
      });
    } catch (error) {
      console.error('Newsletter search error:', error);
      return [];
    }
  }

  /**
     * Search meetings
     * @param {string} query - Search query
     * @returns {Promise<Array>} Matching meetings
     */
  async searchMeetings(query) {
    try {
      const data = await this.getMeetings();
      const lowerQuery = query.toLowerCase();

      return data.meetings.filter(meeting => {
        return meeting.title?.toLowerCase().includes(lowerQuery) ||
                       meeting.topic?.toLowerCase().includes(lowerQuery) ||
                       meeting.description?.toLowerCase().includes(lowerQuery) ||
                       meeting.presenter?.name?.toLowerCase().includes(lowerQuery) ||
                       meeting.tags?.some(tag => tag.toLowerCase().includes(lowerQuery));
      });
    } catch (error) {
      console.error('Meeting search error:', error);
      return [];
    }
  }

  /**
     * Search resources
     * @param {string} query - Search query
     * @returns {Promise<Array>} Matching resources
     */
  async searchResources(query) {
    try {
      const data = await this.getResources();
      const lowerQuery = query.toLowerCase();

      return data.resources.filter(resource => {
        return resource.title.toLowerCase().includes(lowerQuery) ||
                       resource.summary.toLowerCase().includes(lowerQuery) ||
                       resource.content.toLowerCase().includes(lowerQuery) ||
                       resource.tags.some(tag => tag.toLowerCase().includes(lowerQuery));
      });
    } catch (error) {
      console.error('Resource search error:', error);
      return [];
    }
  }

  /**
     * Search glossary
     * @param {string} query - Search query
     * @returns {Promise<Array>} Matching glossary terms
     */
  async searchGlossary(query) {
    try {
      const data = await this.getGlossary();
      const lowerQuery = query.toLowerCase();

      return data.terms.filter(term => {
        return term.term.toLowerCase().includes(lowerQuery) ||
                       term.definition.toLowerCase().includes(lowerQuery) ||
                       term.alternateNames?.some(name =>
                         name.toLowerCase().includes(lowerQuery)) ||
                       term.tags?.some(tag => tag.toLowerCase().includes(lowerQuery));
      });
    } catch (error) {
      console.error('Glossary search error:', error);
      return [];
    }
  }

  /**
     * Check if cached data is still valid
     * @param {string} key - Cache key
     * @returns {boolean} Whether cache is valid
     */
  isCacheValid(key) {
    if (!this.cache.has(key)) return false;

    const expiryTime = this.cacheExpiry.get(key);
    return expiryTime && Date.now() < expiryTime;
  }

  /**
     * Set data in cache with expiry
     * @param {string} key - Cache key
     * @param {any} data - Data to cache
     * @param {number} duration - Cache duration in milliseconds
     */
  setCache(key, data, duration) {
    this.cache.set(key, data);
    this.cacheExpiry.set(key, Date.now() + duration);
  }

  /**
     * Clear all cached data
     */
  clearCache() {
    this.cache.clear();
    this.cacheExpiry.clear();
    // Cache cleared
  }

  /**
     * Basic data validation
     * @param {string} endpoint - Data endpoint
     * @param {Object} data - Data to validate
     */
  validateData(endpoint, data) {
    if (!data || typeof data !== 'object') {
      throw new Error(`Invalid data format for ${endpoint}`);
    }

    // Specific validations based on endpoint
    if (endpoint.includes('newsletters')) {
      if (!data.newsletters || !Array.isArray(data.newsletters)) {
        throw new Error('Newsletter data must contain newsletters array');
      }
    } else if (endpoint.includes('meetings')) {
      if (!data.meetings || !Array.isArray(data.meetings)) {
        throw new Error('Meeting data must contain meetings array');
      }
    } else if (endpoint.includes('resources')) {
      if (!data.resources || !Array.isArray(data.resources)) {
        throw new Error('Resource data must contain resources array');
      }
    } else if (endpoint.includes('glossary')) {
      if (!data.terms || !Array.isArray(data.terms)) {
        throw new Error('Glossary data must contain terms array');
      }
    }
  }

  /**
     * Get fallback data when fetch fails
     * @param {string} endpoint - Data endpoint
     * @param {Error} error - Original error
     * @returns {Object} Fallback data
     */
  getFallbackData(endpoint, error) {
    console.warn(`⚠️ Using fallback data for ${endpoint}:`, error.message);

    // Return minimal structure based on endpoint
    if (endpoint.includes('newsletters')) {
      return {
        newsletters: [],
        metadata: {
          error: true,
          message: 'Failed to load newsletter data',
          lastUpdated: new Date().toISOString()
        }
      };
    } else if (endpoint.includes('meetings')) {
      return {
        meetings: [],
        metadata: {
          error: true,
          message: 'Failed to load meeting data',
          lastUpdated: new Date().toISOString()
        }
      };
    } else if (endpoint.includes('resources')) {
      return {
        resources: [],
        metadata: {
          error: true,
          message: 'Failed to load resource data',
          lastUpdated: new Date().toISOString()
        }
      };
    } else if (endpoint.includes('glossary')) {
      return {
        terms: [],
        metadata: {
          error: true,
          message: 'Failed to load glossary data',
          lastUpdated: new Date().toISOString()
        }
      };
    }

    return {
      error: true,
      message: 'Failed to load data',
      endpoint
    };
  }
}

// Create singleton instance
const dataLoader = new DataLoader();

// Export for module usage
export default dataLoader;

// Also attach to window for global access
if (typeof window !== 'undefined') {
  window.dataLoader = dataLoader;
}
