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