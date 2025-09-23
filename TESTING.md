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
# Start the local server first (in a separate terminal)
npm run serve

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
# First, start the server in a separate terminal
npm run test:links:server

# Then run the link checker
npm run test:links
```
Checks for:
- Broken internal links
- Missing anchors
- Invalid file references
- Orphaned pages

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
# Requires server running
npm run test:a11y
```
Tests against WCAG 2.0 AA standards using axe-core.

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
**Solution**: Disabled as PostCSS handles prefixing automatically

### Link Checking

**Issue**: False positives for anchor links
**Solution**: The checker validates both page existence and anchor presence

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
1. Add the page URL to `.pa11yrc.json` for accessibility testing
2. Run `npm test:html` to validate the new page
3. Check all internal links with `npm run test:links`
4. Verify performance with `npm run audit:lighthouse`

## Reports

Test reports are saved in the `reports/` directory:
- `lighthouse.html` - Performance audit results
- Additional reports can be configured as needed

The `reports/` directory is git-ignored to avoid committing test artifacts.

## Troubleshooting

### Server Not Running
Many tests require the local server. Always start it first:
```bash
npm run serve
```

### Port Conflicts
If port 3000 is in use, modify the port in `package.json`:
```json
"serve": "http-server . -p 3001"
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