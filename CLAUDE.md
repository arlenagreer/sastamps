# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the San Antonio Philatelic Association (SAPA) website - a static site built with vanilla HTML, CSS, and JavaScript, hosted on GitHub Pages. The site includes PWA functionality with offline support and performance optimizations.

## Development Commands

```bash
# Start development server
npm start  # or npm run serve (serves on port 3000)

# Build the entire project (includes all optimizations)
npm run build

# Build individual assets
npm run build:css    # Build and minify CSS with PostCSS
npm run build:js     # Bundle and minify JavaScript with esbuild

# Image optimization
npm run optimize:images  # Run all image optimizations
npm run analyze         # Analyze image optimization savings

# Watch for changes during development
npm run watch  # Watch CSS and JS files for changes
```

## Architecture Overview

### Build System
The project uses a custom build pipeline (`scripts/build.js`) that orchestrates:
1. Critical CSS extraction and inlining
2. Image optimization (WebP conversion, responsive images)
3. Font optimization with preloading
4. Service worker configuration
5. Asset minification
6. Performance monitoring setup

### Key Technologies
- **CSS Processing**: PostCSS with autoprefixer and cssnano
- **JS Bundling**: esbuild for bundling and minification
- **Image Optimization**: sharp for WebP conversion and responsive images
- **PWA**: Service worker (`sw.js`) with offline support
- **Analytics**: Google Analytics integration

### File Structure
- HTML pages in root directory (index.html, about.html, etc.)
- Source assets in `/css/`, `/js/`, `/images/`
- Build output in `/dist/`
- Build scripts in `/scripts/`
- PWA files: `sw.js`, `offline.html`, `site.webmanifest`

### Service Worker Strategy
- Caches core assets on install
- Separate cache for images with fallback to placeholder SVG
- Cache-first strategy for assets, network-first for navigation
- Automatic cache cleanup on activation

## Important Notes

- No testing framework is configured
- Google Analytics Measurement ID needs to be configured in HTML files
- The site uses CSS variables for theming and responsive design
- Calendar event files (ICS format) are generated for meetings
- Build process updates `package.json` during execution

## Newsletter Update Process

When updating the quarterly newsletter (published January 1, April 1, July 1, October 1):

1. **Upload new PDF** to `/public/` directory with naming format: `SAPA-PHILATEX-[Quarter]-Quarter-[Year].pdf`
2. **Update index.html**:
   - Newsletter banner section (lines ~440-450)
   - Latest issue highlights section (lines ~590-600)
   - Meeting calendar section if needed (lines ~500-580)
3. **Update newsletter.html**:
   - Current issue section (lines ~380-420)
4. **Update meetings.html**:
   - Meeting schedule table for current quarter
   - Calendar download link
5. **Create calendar ICS files** in `/data/calendar/`:
   - Individual meeting files: `YYYY-MM-DD-meeting.ics`
   - Quarterly schedule: `YYYY-Q[#]-schedule.ics`
6. **Update JSON-LD** structured data for upcoming meetings
7. **Update sitemap.xml** with current modification dates

## File Locations

- **Newsletter PDFs**: `/public/`
- **Calendar files**: `/data/calendar/`
- **Meeting images**: `/images/`
- **Build output**: `/dist/`

## Known Issues & Improvements

- ~~Critical CSS is duplicated 3 times in each HTML file~~ (Fixed)
- ~~Google Fonts URL has triple `&display=swap` parameters~~ (Fixed)
- ~~Images lack alt text for accessibility~~ (N/A - site uses CSS background images and Font Awesome icons)
- Consider implementing:
  - Newsletter archive page
  - Client-side search functionality
  - Dark mode toggle
  - ~~Better mobile menu overlay~~ (Implemented)

## Recent Learnings

### Image Implementation
- The website doesn't use `<img>` tags - all images are implemented as CSS background images
- Font Awesome is used for all icons (navigation, social, decorative)
- This means standard accessibility features like alt text and lazy loading attributes aren't applicable
- The site follows modern practices for decorative images

### Build Process
- Running `npm run build:css` and `npm run build:js` rebuilds the minified files
- The build process correctly handles PostCSS transformations and esbuild bundling
- Always rebuild after making CSS or JS changes

### Mobile Menu
- Mobile menu uses a slide-in panel from the right
- Overlay element is dynamically created via JavaScript for better performance
- Body scroll is disabled when menu is open to prevent background interaction
- Menu closes on ESC key, overlay click, or clicking outside

### Accessibility
- Skip-link is already implemented and properly styled
- Enhanced with smooth transitions and visible focus indicators
- Centered positioning for better visibility
- Proper ARIA attributes on mobile menu toggle

### JSON-Based Content Management (Phase 1)
- Created comprehensive data directory structure in `/data/`
- Designed JSON schemas for newsletters, meetings, member resources, and glossary
- Newsletter schema supports metadata, featured articles, tags, and file paths
- Meeting schema includes detailed location, timing, agenda, and RSVP support
- Resource schema enables guides, tutorials, FAQs with difficulty levels and content sections
- Glossary schema provides comprehensive terminology with cross-references and examples
- All schemas include proper validation rules and extensive documentation
- Example data files created with real SAPA content for testing and development
- Foundation established for dynamic content loading and search functionality