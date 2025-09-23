# SAPA Website API Documentation

This document provides comprehensive API documentation for the San Antonio Philatelic Association website's JavaScript modules and utilities.

## Table of Contents

1. [Core Utilities](#core-utilities)
2. [Data Management](#data-management)
3. [Search Engine](#search-engine)
4. [Page Modules](#page-modules)
5. [Error Handling](#error-handling)
6. [Performance](#performance)
7. [Usage Examples](#usage-examples)

## Core Utilities

### Safe DOM Operations (`js/utils/safe-dom.js`)

Safe DOM manipulation utilities with error handling to prevent crashes.

#### `safeQuerySelector(selector, context?)`

Safely query for a single element with error handling.

```javascript
import { safeQuerySelector } from './utils/safe-dom.js';

const element = safeQuerySelector('.my-selector');
if (element) {
    // Element found, safe to use
    element.textContent = 'Hello World';
}
```

**Parameters:**
- `selector` (string): CSS selector
- `context` (Element, optional): Context element, defaults to document

**Returns:** Element | null

#### `safeQuerySelectorAll(selector, context?)`

Safely query for multiple elements with error handling.

```javascript
const elements = safeQuerySelectorAll('.card');
elements.forEach(card => {
    // Process each card
});
```

**Parameters:**
- `selector` (string): CSS selector  
- `context` (Element, optional): Context element, defaults to document

**Returns:** NodeList | Array (empty array on error)

#### `safeLocalStorageGet(key, defaultValue?)`

Safely get item from localStorage with fallback.

```javascript
const userPrefs = safeLocalStorageGet('userPreferences', {});
const theme = safeLocalStorageGet('theme', 'light');
```

**Parameters:**
- `key` (string): Storage key
- `defaultValue` (any, optional): Default value if key doesn't exist

**Returns:** Any (parsed JSON value or default)

#### `safeLocalStorageSet(key, value)`

Safely set item in localStorage with error handling.

```javascript
const success = safeLocalStorageSet('theme', 'dark');
if (!success) {
    console.warn('Failed to save theme preference');
}
```

**Parameters:**
- `key` (string): Storage key
- `value` (any): Value to store (will be JSON stringified)

**Returns:** boolean (success status)

#### `safeLocalStorageRemove(key)`

Safely remove item from localStorage.

```javascript
const success = safeLocalStorageRemove('oldPreference');
```

**Parameters:**
- `key` (string): Storage key

**Returns:** boolean (success status)

### Performance Utilities (`js/utils/performance.js`)

Performance optimization functions for better user experience.

#### `debounce(func, wait)`

Debounce utility to prevent excessive function calls.

```javascript
import { debounce } from './utils/performance.js';

const debouncedSearch = debounce((query) => {
    performSearch(query);
}, 300);

searchInput.addEventListener('input', (e) => {
    debouncedSearch(e.target.value);
});
```

**Parameters:**
- `func` (Function): The function to debounce
- `wait` (number): Debounce delay in milliseconds

**Returns:** Function (debounced function)

#### `throttle(func, limit)`

Throttle utility to limit function execution frequency.

```javascript
const throttledScroll = throttle(() => {
    updateScrollPosition();
}, 100);

window.addEventListener('scroll', throttledScroll);
```

**Parameters:**
- `func` (Function): The function to throttle
- `limit` (number): Throttle limit in milliseconds

**Returns:** Function (throttled function)

#### `requestAnimationFrameWithFallback(callback)`

Request animation frame with fallback for older browsers.

```javascript
const animationId = requestAnimationFrameWithFallback(() => {
    // Animation code
    updateAnimation();
});
```

**Parameters:**
- `callback` (Function): Function to execute on next frame

**Returns:** number (RAF ID for cancellation)

## Data Management

### Data Loader (`js/modules/data-loader.js`)

Handles fetching and caching of JSON data files.

#### `new DataLoader()`

Create a new data loader instance.

```javascript
import DataLoader from './modules/data-loader.js';

const dataLoader = new DataLoader();
```

#### `fetchData(endpoint, options?)`

Fetch JSON data with caching and error handling.

```javascript
// Basic usage
const meetings = await dataLoader.fetchData('meetings/meetings.json');

// With options
const newsletters = await dataLoader.fetchData('newsletters/newsletters.json', {
    cacheDuration: 10 * 60 * 1000, // 10 minutes
    forceRefresh: false
});
```

**Parameters:**
- `endpoint` (string): The data endpoint relative to `/data/`
- `options` (Object, optional):
  - `cacheDuration` (number): Cache duration in milliseconds
  - `forceRefresh` (boolean): Force refresh cache

**Returns:** Promise<Object> (parsed JSON data)

#### Available Data Endpoints

- `meetings/meetings.json` - Meeting schedules and details
- `newsletters/newsletters.json` - Newsletter metadata
- `members/resources.json` - Educational resources
- `glossary/glossary.json` - Philatelic terminology

## Search Engine

### SearchEngine (`js/modules/search-engine.js`)

Comprehensive search functionality using Lunr.js.

#### `new SearchEngine(options?)`

Create a new search engine instance.

```javascript
import SearchEngine from './modules/search-engine.js';

const searchEngine = new SearchEngine({
    baseUrl: './data',
    onLoad: (metadata) => console.log('Search loaded:', metadata),
    onSearch: (results) => console.log('Search results:', results),
    onError: (error) => console.error('Search error:', error)
});
```

**Options:**
- `baseUrl` (string): Base URL for search data
- `lunrUrl` (string): Lunr.js CDN URL
- `onLoad` (Function): Callback when search engine loads
- `onSearch` (Function): Callback when search is performed
- `onError` (Function): Callback for error handling

#### `initialize()`

Initialize the search engine by loading index and documents.

```javascript
await searchEngine.initialize();
```

**Returns:** Promise<void>

#### `search(query, options?)`

Perform a search with filters.

```javascript
const results = await searchEngine.search('stamp collecting', {
    limit: 10,
    types: ['newsletter', 'resource'],
    categories: ['education'],
    difficulty: ['beginner'],
    boost: true
});
```

**Parameters:**
- `query` (string): Search query
- `options` (Object, optional):
  - `limit` (number): Maximum results
  - `types` (Array): Content types to include
  - `categories` (Array): Categories to include
  - `difficulty` (Array): Difficulty levels
  - `boost` (boolean): Apply relevance boosting

**Returns:** Promise<Object> (search results)

#### `createSearchUI(container, options?)`

Create a complete search UI component.

```javascript
const searchContainer = searchEngine.createSearchUI('#search-container', {
    placeholder: 'Search resources...',
    showFilters: true,
    showSuggestions: true,
    autoSearch: true,
    searchDelay: 300
});
```

**Parameters:**
- `container` (string|Element): Container selector or element
- `options` (Object, optional):
  - `placeholder` (string): Input placeholder text
  - `showFilters` (boolean): Show filter controls
  - `showSuggestions` (boolean): Show search suggestions
  - `autoSearch` (boolean): Search as you type
  - `searchDelay` (number): Debounce delay for auto-search

**Returns:** Element (search container)

## Page Modules

### Resources Page (`js/pages/resources.js`)

Handles resources page functionality including modal displays and bookmarks.

#### Key Functions

- `initializeResourcesPage()` - Initialize the resources page
- `displayFeaturedResources(resources)` - Show featured resources
- `displayCategorizedResources(resources, categories)` - Show categorized view
- `initializeResourceSearch(resources)` - Set up search functionality
- `updateBookmarkStates()` - Update bookmark button states

### Meetings Page (`js/pages/meetings.js`)

Handles meeting calendar and schedule display.

#### Key Functions

- `initializeMeetingsPage()` - Initialize meetings page
- `loadMeetingsData()` - Load meeting data
- `displayMeetingCalendar(meetings)` - Render calendar
- `generateICSFile(meeting)` - Create calendar export

### Newsletter Page (`js/pages/newsletter.js`)

Manages newsletter archive and PDF viewing.

#### Key Functions

- `initializeNewsletterPage()` - Initialize newsletter page
- `loadNewslettersData()` - Load newsletter data
- `displayNewsletterArchive(newsletters)` - Show archive
- `handlePDFViewing()` - Manage PDF display

## Error Handling

### Error Boundaries (`js/error-boundary.js`)

React-like error boundaries for vanilla JavaScript.

#### `new ErrorBoundary(options)`

Create an error boundary for component isolation.

```javascript
import ErrorBoundary from './error-boundary.js';

const boundary = new ErrorBoundary({
    componentName: 'Calendar',
    container: calendarElement,
    maxRetries: 2,
    fallbackUI: (error) => `<p>Calendar failed to load: ${error.message}</p>`
});

const safeInitialize = boundary.wrap(initializeCalendar);
safeInitialize();
```

**Options:**
- `componentName` (string): Name for logging
- `container` (Element): Container element
- `maxRetries` (number): Maximum retry attempts
- `fallbackUI` (Function): Fallback HTML generator

#### `wrap(func)`

Wrap a function with error boundary protection.

**Parameters:**
- `func` (Function): Function to protect

**Returns:** Function (wrapped function)

### Event Cleanup (`js/utils/event-cleanup.js`)

Memory leak prevention utilities.

#### `addEventListenerWithCleanup(element, event, handler, options?)`

Add event listener with automatic cleanup tracking.

```javascript
import { addEventListenerWithCleanup } from './utils/event-cleanup.js';

addEventListenerWithCleanup(button, 'click', handleClick);
addEventListenerWithCleanup(window, 'scroll', handleScroll, { passive: true });
```

**Parameters:**
- `element` (Element): Target element
- `event` (string): Event type
- `handler` (Function): Event handler
- `options` (Object, optional): Event listener options

#### `cleanupEventListeners()`

Remove all tracked event listeners.

```javascript
// Call on page unload
window.addEventListener('beforeunload', cleanupEventListeners);
```

## Performance

### Tree-Shaking Support

All modules are designed for tree-shaking optimization:

```javascript
// Import only what you need
import { debounce, throttle } from './utils/performance.js';
import { safeQuerySelector } from './utils/safe-dom.js';

// Tree-shaking will eliminate unused exports
```

### Bundle Structure

The build system creates page-specific bundles:

- `core.min.js` - Shared utilities (~11KB)
- `home.min.js` - Home page functionality (~30KB)
- `meetings.min.js` - Meeting calendar (~42KB)
- `resources.min.js` - Resources page (~21KB)
- `search.min.js` - Search functionality (~35KB)

### Performance Tips

1. **Use dynamic imports for heavy features:**
```javascript
// Only load calendar when needed
if (calendarContainer) {
    const { Calendar } = await import('vanilla-calendar-pro');
    // Initialize calendar
}
```

2. **Leverage caching:**
```javascript
// Data loader automatically caches responses
const meetings = await dataLoader.fetchData('meetings/meetings.json');
```

3. **Use debouncing for user input:**
```javascript
const debouncedHandler = debounce(handleUserInput, 300);
```

## Usage Examples

### Complete Search Implementation

```javascript
import SearchEngine from './modules/search-engine.js';

// Initialize search
const searchEngine = new SearchEngine({
    onLoad: (metadata) => {
        console.log(`Search ready with ${metadata.documentCount} documents`);
    },
    onError: (error) => {
        showErrorMessage('Search unavailable: ' + error.message);
    }
});

// Create search UI
const searchContainer = document.querySelector('#search');
searchEngine.createSearchUI(searchContainer, {
    placeholder: 'Search newsletters, meetings, resources...',
    showFilters: true,
    autoSearch: true
});

// Programmatic search
const results = await searchEngine.search('stamp grading', {
    types: ['resource'],
    difficulty: ['beginner', 'intermediate']
});

console.log(`Found ${results.total} results`);
```

### Safe Resource Loading

```javascript
import { safeQuerySelector } from './utils/safe-dom.js';
import DataLoader from './modules/data-loader.js';
import ErrorBoundary from './error-boundary.js';

// Create error boundary
const boundary = new ErrorBoundary({
    componentName: 'ResourcesList',
    container: safeQuerySelector('#resources'),
    fallbackUI: () => '<p>Resources temporarily unavailable.</p>'
});

// Safe initialization
const safeInit = boundary.wrap(async () => {
    const dataLoader = new DataLoader();
    const resources = await dataLoader.fetchData('members/resources.json');
    
    const container = safeQuerySelector('#resources-list');
    if (container && resources) {
        renderResourcesList(resources.resources, container);
    }
});

safeInit();
```

### Performance-Optimized Event Handling

```javascript
import { debounce, throttle } from './utils/performance.js';
import { addEventListenerWithCleanup } from './utils/event-cleanup.js';

// Debounced search
const searchInput = safeQuerySelector('#search-input');
const debouncedSearch = debounce((query) => {
    performSearch(query);
}, 300);

addEventListenerWithCleanup(searchInput, 'input', (e) => {
    debouncedSearch(e.target.value);
});

// Throttled scroll
const throttledScroll = throttle(() => {
    updateScrollIndicator();
}, 100);

addEventListenerWithCleanup(window, 'scroll', throttledScroll, { passive: true });
```

---

## Module Dependencies

```
Core Utilities
├── safe-dom.js (no dependencies)
├── performance.js (no dependencies)
├── helpers.js (no dependencies)
└── event-cleanup.js (no dependencies)

Data Management
├── data-loader.js (no dependencies)
└── template-engine.js (→ safe-dom.js)

Search
└── search-engine.js (→ safe-dom.js, performance.js)

Page Modules
├── home.js (→ data-loader.js, safe-dom.js)
├── meetings.js (→ data-loader.js, performance.js)
├── newsletter.js (→ data-loader.js, safe-dom.js)
└── resources.js (→ search-engine.js, data-loader.js)

Error Handling
└── error-boundary.js (→ safe-dom.js)
```

This modular architecture ensures optimal bundle sizes and clear dependency management for the SAPA website.