# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the **San Antonio Philatelic Association (SAPA)** website - a modern, production-ready static website for a stamp collecting club. The codebase demonstrates advanced web development practices with enterprise-level security, performance optimization, and maintainability.

## Core Development Commands

### Build System
```bash
# Complete build process
npm run build                 # Full build with tree-shaking optimization
npm run build:js              # JavaScript build with advanced tree-shaking
npm run build:css             # PostCSS processing and minification
npm run build:js:legacy       # Legacy single bundle (fallback)

# Development server
npm start                     # Start development server (port 3000)
npm run serve                 # Same as start
npm run watch                 # Watch mode for CSS/JS changes

# Analysis and optimization
npm run analyze:bundle        # View detailed bundle analysis
npm run optimize:images       # WebP image optimization with responsive sizing
npm run build:search          # Build search index for site search

# Testing and validation
npm test                      # Run all tests (HTML, CSS, JS, links, markdown)
npm run test:quick            # Quick tests (no server required)
npm run test:a11y             # Accessibility testing
npm run audit:lighthouse      # Performance audit with Lighthouse
```

### Development Workflow
```bash
# 1. Start development server
npm run serve

# 2. Build optimized bundles
npm run build:js

# 3. Analyze bundle sizes
npm run analyze:bundle

# 4. Optimize images if needed
npm run optimize:images
```

## Architecture Overview

### Technology Stack
- **Frontend**: Vanilla JavaScript ES6+, HTML5, CSS3 with PostCSS
- **Build System**: ESBuild with advanced tree-shaking optimization
- **Search**: Lunr.js for client-side search functionality
- **Calendar**: Vanilla Calendar Pro for meeting schedules
- **Images**: Sharp for optimization and responsive image generation
- **Security**: CSP headers, rate limiting, input sanitization

### Tree-Shaking Build System
The project uses sophisticated bundle optimization:
- **Page-specific bundles**: Each page loads only required code
- **Dynamic imports**: Heavy components load on-demand
- **Bundle analysis**: Detailed size tracking and optimization metrics
- **Total optimized size**: ~191KB across 7 bundles

### Project Structure
```
sastamps/
├── js/
│   ├── pages/           # Page-specific bundles (home.js, meetings.js, etc.)
│   ├── modules/         # Reusable components (search-engine.js, etc.)
│   ├── utils/           # Utility functions (safe-dom.js, performance.js)
│   └── core-bundle.js   # Shared functionality across pages
├── css/
│   ├── critical.css     # Critical CSS extracted from inline styles
│   └── styles.css       # Main stylesheet
├── data/
│   ├── meetings/        # Meeting data in JSON format
│   ├── newsletters/     # Newsletter metadata
│   ├── glossary/        # Philatelic terminology
│   └── schemas/         # JSON validation schemas
└── dist/               # Built assets output
```

## Data Architecture

### JSON Data Files
- `data/meetings/meetings.json` - Meeting schedules and details
- `data/newsletters/newsletters.json` - Newsletter metadata and links
- `data/members/resources.json` - Educational resources and guides
- `data/glossary/glossary.json` - Philatelic terminology database

### Data Schema Validation
All data files have corresponding JSON schemas in `data/schemas/` for validation and consistency.

## Development Patterns

### Security-First Approach
- **Content Security Policy**: Comprehensive CSP headers in `security-headers.php`
- **Input Sanitization**: Multiple layers of XSS prevention
- **Rate Limiting**: Client and server-side protection (3 submissions/hour)
- **CSRF Protection**: Cross-site request forgery prevention

### Performance-First Design
- **Tree-shaking**: Eliminates unused code automatically
- **Critical CSS**: Above-the-fold styles preloaded
- **Lazy Loading**: Components load only when needed via Intersection Observer
- **Image Optimization**: WebP format with responsive sizing
- **Service Worker**: Intelligent caching strategies

### Error Handling System
- **Error Boundaries**: React-like error boundaries for vanilla JavaScript
- **Safe Utilities**: Defensive programming with null checks
- **Graceful Degradation**: Features fail safely without breaking the site
- **Memory Management**: Event listener cleanup prevents memory leaks

## Code Quality Standards

### Safe DOM Operations
```javascript
// Use safe utilities instead of direct DOM access
const element = safeQuerySelector('.selector');
if (!element) return; // Graceful handling

// Safe storage operations
const success = safeLocalStorageSet('key', 'value');
if (!success) console.warn('Storage failed');
```

### Module Import Patterns
```javascript
// Tree-shakable imports
import { debounce } from '../utils/performance.js';
import { safeQuerySelector } from '../utils/safe-dom.js';

// Dynamic imports for heavy components
if (calendarContainer) {
    const { Calendar } = await import('vanilla-calendar-pro');
    // Initialize only when needed
}
```

### Error Handling Pattern
```javascript
// Wrap functionality in error boundaries
function setupFeature() {
    try {
        // Feature implementation
    } catch (error) {
        console.error('Feature setup failed:', error);
        // Graceful degradation
    }
}
```

## Testing Strategy

### Manual Testing Checklist
1. **Error Boundary Testing**: Verify graceful degradation when features fail
2. **Performance Testing**: Check bundle sizes and loading performance
3. **Security Testing**: Validate input sanitization and rate limiting
4. **Accessibility Testing**: Verify ARIA labels and keyboard navigation
5. **Cross-browser Testing**: Test on multiple browsers and devices

### Build Validation
```bash
# Always run after changes
npm run build:js          # Verify tree-shaking works
npm run analyze:bundle    # Check bundle sizes
npm run test:quick        # Run HTML, JS, CSS validation
```

### Comprehensive Testing
```bash
# Full test suite (requires server)
npm run serve             # In terminal 1
npm test                  # In terminal 2

# Individual tests
npm run test:html         # HTML validation
npm run test:js           # JavaScript linting
npm run test:css          # CSS validation
npm run test:links        # Link checking (requires server)
npm run test:a11y         # Accessibility (requires server)
```

## Configuration Files

### Build Configuration
- `esbuild.config.js` - Advanced bundling with tree-shaking
- `postcss.config.js` - CSS processing pipeline
- `package.json` - Dependencies and build scripts

### Testing Configuration
- `.htmlvalidate.json` - HTML validation rules
- `eslint.config.js` - JavaScript linting configuration
- `.stylelintrc.json` - CSS validation rules
- `.pa11yrc.json` - Accessibility testing setup
- `.markdownlintrc.json` - Markdown formatting rules
- `TESTING.md` - Comprehensive testing documentation

### Security Configuration
- `security-headers.php` - Security headers middleware
- `contact-handler.php` - Server-side form validation
- `netlify/functions/contact-form.js` - Serverless validation

## Deployment

### Static Site Deployment
- **GitHub Pages**: Currently deployed configuration
- **Netlify**: Serverless functions for form handling
- **CDN Ready**: Optimized assets for CDN distribution

### Service Worker
- Intelligent caching for performance
- Offline functionality for core pages
- Image request handling with fallbacks

## Key Features

### Calendar Integration
- Vanilla Calendar Pro for meeting schedules
- ICS file generation for calendar imports
- Dynamic loading only when calendar is visible

### Search Engine
- Lunr.js powered client-side search
- Embedded search index for fast results
- Search across meetings, newsletters, and glossary

### Newsletter System
- PDF newsletter management
- Metadata tracking and organization
- Archive functionality

### Resource Management
- Educational resource library
- Categorized browsing with filtering
- Bookmark system using localStorage

## Performance Monitoring

### Bundle Analysis
The build system generates detailed bundle analysis:
- Individual bundle sizes
- Import/export tracking
- Tree-shaking effectiveness
- Compression ratios

### Key Metrics
- **Total Bundle Size**: ~191KB across 7 optimized bundles
- **Page-specific Loading**: Only required code per page
- **Memory Management**: Event listener cleanup prevents leaks
- **Error Recovery**: Failed components don't block functionality

## Important Notes

### Never Edit Directly
- `dist/` directory - auto-generated build output
- `data/schemas/` - JSON validation schemas

### Always Run After Changes
- `npm run build:js` to verify tree-shaking
- `npm run analyze:bundle` to check bundle sizes
- Test locally with `npm run serve`

### Security Considerations
- Never commit API keys or sensitive data
- Use server-side validation for all user inputs
- Test CSP headers and rate limiting
- Validate all JSON data against schemas

This codebase represents a sophisticated, production-ready web application with enterprise-level security, performance optimization, and maintainability features while maintaining clean, readable code structure.

## Task Master AI Instructions
**Import Task Master's development workflow commands and guidelines, treat as if import is in the main CLAUDE.md file.**
@./.taskmaster/CLAUDE.md
