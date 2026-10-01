# Static Site Testing Guide

This guide describes the comprehensive testing setup for the San Antonio Philatelic Association website, designed specifically for static HTML/CSS/JavaScript sites.

## Overview

Our testing suite includes:
- **HTML Validation** - Catch syntax errors and accessibility issues
- **Link Checking** - Find broken internal and external links
- **JavaScript Linting** - Detect errors and enforce code quality
- **CSS Validation** - Ensure styles follow best practices
- **Accessibility Testing** - WCAG compliance checking
- **Performance Auditing** - Lighthouse reports for optimization

## Quick Start

### Running All Tests
```bash
# Build, then start the local server (in a separate terminal)
npm start

# Run all tests
npm test
```

### Quick Testing (No Server Required)
```bash
# Run HTML, JS, and CSS tests only
npm run test:quick
```

## Individual Test Commands

### HTML Validation
```bash
npm run test:html
```
Tests all HTML files for:
- Proper syntax and structure
- Valid attributes and elements
- Accessibility best practices
- SEO requirements

### Link Checking
```bash
npm run build        # test:links crawls the built site in _site/
npm run test:links
```
linkinator (a devDependency) crawls `_site/` from its own local server, with
the settings in `linkinator.config.json`. It fails on:
- Broken internal links
- Missing images, scripts and stylesheets
- Broken `url()` references in CSS

External links are skipped there, so the check cannot fail because a
third-party site is down. The weekly scheduled workflow checks them too and
only reports.

### JavaScript Linting
```bash
npm run test:js
```
Enforces:
- ES6+ best practices
- Consistent code style
- Error prevention
- Performance patterns

### CSS Validation
```bash
npm run test:css
```
Validates:
- CSS syntax
- Property values
- Selector patterns
- Modern CSS features

### Markdown Documentation
```bash
npm run test:md
```
Checks all markdown files for formatting consistency.

### Accessibility Testing
```bash
npm run build       # test:a11y checks the built site in _site/
npm run test:a11y   # every deployed page
node scripts/a11y-check.js index.html about.html   # just these pages
```
`scripts/a11y-check.js` serves `_site/` on a free local port (no server to
start) and runs pa11y 10 with the axe runner against every deployed root page,
using the `defaults` in `.pa11yrc.json` (WCAG2AA). It exits 1 on any error,
including axe results that need review. It needs puppeteer's Chrome, which
`npm ci` installs unless `PUPPETEER_SKIP_DOWNLOAD` is set.

Rules in the `ignore` list, and why:
- `color-contrast` -- known failures, ignored until the colour palette is fixed.
- `frame-tested` -- reported for the embedded Google Maps iframes (contact,
  meetings): axe cannot test inside a cross-origin frame. Those iframes still
  get the `frame-title` check.

## Advanced Testing

### Performance Audit
```bash
# Run Lighthouse audit (requires server)
npm run audit:lighthouse
```
Generates a detailed report in `reports/lighthouse.html` covering:
- Performance metrics
- Accessibility score
- SEO optimization
- Best practices

### Security Audit
```bash
npm run audit:security
```
Checks npm dependencies for known vulnerabilities.

## Configuration Files

- `.htmlvalidate.json` - HTML validation rules
- `.eslintrc.json` - JavaScript linting rules
- `.stylelintrc.json` - CSS validation rules
- `.pa11yrc.json` - Accessibility test configuration
- `linkinator.config.json` - Link checker configuration
- `.markdownlintrc.json` - Markdown formatting rules

## Common Issues and Solutions

### HTML Validation Errors

**Issue**: "no-inline-style" errors
**Solution**: Already disabled in config as inline styles are used for critical CSS

**Issue**: "require-sri" warnings for external scripts
**Solution**: Disabled as not all CDNs provide SRI hashes

### JavaScript Linting

**Issue**: "no-unused-vars" for global libraries
**Solution**: Added globals for `Calendar` and `lunr` in config

**Issue**: Console warnings
**Solution**: Console.warn and console.error are allowed for debugging

### CSS Validation

**Issue**: Vendor prefix warnings
**Solution**: `property-no-vendor-prefix` and `value-no-vendor-prefix` are disabled; the at-rule, selector and media-feature prefix rules from `stylelint-config-standard` stay on. Nothing adds prefixes at build time (there is no PostCSS config and no autoprefixer), so write any prefix a property needs by hand in `css/styles.css`

### Link Checking

**Issue**: A link works on the live site but fails locally
**Solution**: The check runs against `_site/`, so rebuild (`npm run build`) after editing a page

## Continuous Testing Workflow

1. **Before Commits**
   ```bash
   npm run test:quick
   ```

2. **Before Deployment**
   ```bash
   npm test
   npm run audit
   ```

3. **Weekly Maintenance**
   - Run full test suite
   - Review Lighthouse scores
   - Check for security updates

## Testing Best Practices

1. **Fix Errors Immediately** - Don't let validation errors accumulate
2. **Test Locally First** - Always test before pushing changes
3. **Monitor Performance** - Keep Lighthouse scores above 90
4. **Accessibility First** - Ensure all content is accessible
5. **Regular Audits** - Run security audits weekly

## Adding New Pages

When adding new HTML pages:
1. Run `npm run build && npm run test:a11y` (every deployed page is tested; nothing to register)
2. Run `npm run test:html` to validate the new page
3. Check all internal links with `npm run test:links`
4. Verify performance with `npm run audit:lighthouse`

## Reports

Test reports are saved in the `reports/` directory:
- `lighthouse.html` - Performance audit results
- Additional reports can be configured as needed

The `reports/` directory is git-ignored to avoid committing test artifacts.

## Troubleshooting

### Server Not Running
Many tests require the local server. It serves the built site in `_site/`, so build first:
```bash
npm start   # npm run build, then npm run serve
```

### Port Conflicts
If port 3000 is in use, modify the port in `package.json`:
```json
"serve": "http-server _site -p 3001"
```

### Test Timeouts
For slow connections, increase timeouts in `.pa11yrc.json`.

## Future Enhancements

Consider adding:
- Visual regression testing
- Cross-browser testing automation
- Performance budget enforcement
- Automated deployment checks

---

For questions or issues with the testing setup, please check the configuration files or open an issue in the repository.