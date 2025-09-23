# Contributing to San Antonio Philatelic Association Website

First off, thank you for considering contributing to the SAPA website! It's people like you that help make our stamp collecting community thrive online.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Pull Request Process](#pull-request-process)
- [Style Guidelines](#style-guidelines)
- [Commit Messages](#commit-messages)

## Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code:

- **Be Respectful**: Treat everyone with respect. No harassment, discrimination, or inappropriate behavior.
- **Be Collaborative**: Work together towards common goals.
- **Be Patient**: Remember that everyone was new once.
- **Be Thoughtful**: Consider how your contributions affect others.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates. When creating a bug report, include:

- **Clear title and description**
- **Steps to reproduce**
- **Expected behavior**
- **Actual behavior**
- **Screenshots** (if applicable)
- **Browser and OS information**

### Suggesting Enhancements

Enhancement suggestions are welcome! Please provide:

- **Clear title and description**
- **Use case** (why is this needed?)
- **Possible implementation** (if you have ideas)
- **Mockups or examples** (if applicable)

### Content Contributions

Help us improve our content:

- **Newsletter uploads**: Follow the format in `data/newsletters/newsletters.json`
- **Glossary terms**: Add to `data/glossary/glossary.json` with proper formatting
- **Meeting updates**: Update `data/meetings/meetings.json`
- **Resources**: Add educational content to `data/members/resources.json`

### Code Contributions

We love code improvements! Areas where you can help:

- **Performance optimizations**
- **Accessibility improvements**
- **Bug fixes**
- **New features** (discuss first in an issue)
- **Test coverage**
- **Documentation**

## Development Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/YOUR-USERNAME/sastamps.git
   cd sastamps
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Start Development Server**
   ```bash
   npm start
   ```

4. **Run Tests**
   ```bash
   npm run test:quick  # For quick validation
   npm test           # For full test suite
   ```

5. **Create a Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Pull Request Process

1. **Before Submitting**
   - Ensure all tests pass: `npm test`
   - Update documentation if needed
   - Add tests for new functionality
   - Follow the style guidelines

2. **PR Description Template**
   ```markdown
   ## Description
   Brief description of changes

   ## Type of Change
   - [ ] Bug fix
   - [ ] New feature
   - [ ] Breaking change
   - [ ] Documentation update

   ## Testing
   - [ ] All tests pass
   - [ ] Added new tests
   - [ ] Tested on mobile
   - [ ] Tested accessibility

   ## Screenshots (if applicable)
   ```

3. **Review Process**
   - CI must pass all checks
   - At least one approval required
   - Address review feedback promptly
   - Squash commits if requested

## Style Guidelines

### HTML
- Use semantic HTML5 elements
- Include proper ARIA labels for accessibility
- Validate with W3C standards
- Follow existing indentation (2 spaces)

### CSS
- Use CSS custom properties for theming
- Follow BEM naming for components
- Mobile-first responsive design
- Keep specificity low

### JavaScript
- ES6+ syntax preferred
- Use meaningful variable names
- Comment complex logic
- Follow ESLint configuration
- Prefer `const` over `let`

Example:
```javascript
// Good
const calculateMeetingDate = (month, weekNumber) => {
  // Calculate the date of a specific week in the month
  const firstDay = new Date(month);
  // ... implementation
};

// Avoid
function calc(m, w) {
  var d = new Date(m);
  // ...
}
```

### File Organization
- Page-specific JS in `js/pages/`
- Reusable modules in `js/modules/`
- Utility functions in `js/utils/`
- Keep files focused and single-purpose

## Commit Messages

Follow conventional commits format:

```
type(scope): subject

body (optional)

footer (optional)
```

### Types
- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation only
- **style**: Code style (formatting, semicolons, etc)
- **refactor**: Code change that neither fixes a bug nor adds a feature
- **perf**: Performance improvement
- **test**: Adding missing tests
- **chore**: Changes to build process or tools

### Examples
```
feat(calendar): add ICS export functionality

fix(navigation): correct mobile menu z-index issue

docs(readme): update installation instructions

perf(images): optimize hero images to WebP format
```

## Testing Requirements

### Before Submitting
Run these commands locally:

```bash
# Quick tests
npm run test:quick

# Full test suite
npm run serve  # In terminal 1
npm test       # In terminal 2

# Check bundle size
npm run analyze:bundle
```

### Test Coverage Areas
- **HTML validation**: No errors allowed
- **CSS validation**: Fix any errors
- **JavaScript linting**: Must pass ESLint
- **Accessibility**: WCAG 2.0 AA compliance
- **Performance**: Lighthouse score > 90

## Questions?

Feel free to:
- Open an issue for questions
- Email loz33@hotmail.com for sensitive matters
- Join us at a meeting to discuss in person

## Recognition

Contributors will be recognized in:
- The project's contributors list
- Special mentions in our newsletter (with permission)
- Our annual membership meeting

Thank you for helping improve the San Antonio Philatelic Association website! 🎯

---

<p align="center">
  <em>Happy collecting and happy coding!</em> 📮
</p>