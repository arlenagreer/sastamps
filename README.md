# San Antonio Philatelic Association Website

![CI Status](https://github.com/arlenagreer/arlenagreer.github.io/workflows/CI%20Testing%20Pipeline/badge.svg)
![License](https://img.shields.io/badge/license-ISC-blue.svg)
![Node Version](https://img.shields.io/badge/node-%3E%3D%2020.0.0-brightgreen)
![Lighthouse Score](https://img.shields.io/badge/lighthouse-90%2B-brightgreen)

A modern, accessible, and performance-optimized website for the San Antonio Philatelic Association (SAPA), one of the oldest continuously operating stamp collecting clubs in the United States, founded in 1896.

## 🌟 Features

- **📅 Meeting Calendar** - Interactive calendar with ICS export for easy integration
- **📰 Newsletter Archive** - Quarterly PHILATEX newsletters in digital format
- **📚 Educational Resources** - Comprehensive guides for stamp collectors
- **🔍 Philatelic Glossary** - Searchable database of stamp collecting terminology
- **💌 Contact System** - Secure contact form with validation and rate limiting
- **🔎 Site Search** - Full-text search across all content
- **📱 Mobile Responsive** - Optimized for all devices
- **♿ Accessibility** - WCAG 2.0 AA compliant
- **⚡ Performance** - Advanced tree-shaking, lazy loading, and caching

## 🚀 Quick Start

### Prerequisites

- Node.js 20.0.0 or higher
- npm 9.0.0 or higher

### Installation

```bash
# Clone the repository
git clone https://github.com/arlenagreer/arlenagreer.github.io.git
cd sastamps

# Install dependencies
npm install

# Start development server
npm start
```

Visit `http://localhost:3000` to view the site.

## 📖 Documentation

### Developer Documentation
- [Developer Guide](CLAUDE.md) - Architecture, patterns, and development workflow
- [API Documentation](docs/API.md) - Comprehensive JavaScript API reference
- [Testing Guide](TESTING.md) - Comprehensive testing procedures
- [CI/CD Pipeline](CI-CD.md) - Automated testing and deployment
- [Local Development](LOCAL_DEVELOPMENT.md) - Local server setup options
- [Tree-Shaking Guide](TREE_SHAKING_GUIDE.md) - Bundle optimization details
- [Server Validation](SERVER_VALIDATION_SETUP.md) - Form validation options

### User Documentation
- [User Guide](docs/USER-GUIDE.md) - How to use the website features
- [Content Management](docs/CONTENT-MANAGEMENT.md) - For club officers managing content

### Project Documentation
- [Contributing Guidelines](CONTRIBUTING.md) - How to contribute to the project
- [Security Policy](SECURITY.md) - Security guidelines and reporting
- [Changelog](CHANGELOG.md) - Version history and release notes

## 🛠️ Development

### Available Scripts

```bash
# Development
npm start                # Start development server (port 3000)
npm run watch           # Watch for CSS/JS changes

# Building
npm run build           # Full production build
npm run build:js        # Build JavaScript with tree-shaking
npm run build:css       # Build and minify CSS

# Testing
npm test                # Run all tests
npm run test:quick      # Quick validation (HTML, CSS, JS)
npm run test:html       # HTML validation
npm run test:css        # CSS validation
npm run test:js         # JavaScript linting
npm run test:links      # Check for broken links
npm run test:a11y       # Accessibility testing
npm run audit           # Performance and security audit

# Optimization
npm run optimize:images # Optimize images to WebP
npm run analyze:bundle  # Analyze bundle sizes
```

### Project Structure

```
sastamps/
├── css/                 # Stylesheets
├── js/                  # JavaScript modules
│   ├── pages/          # Page-specific bundles
│   ├── modules/        # Reusable components
│   └── utils/          # Utility functions
├── data/               # JSON data files
│   ├── meetings/       # Meeting schedules
│   ├── newsletters/    # Newsletter metadata
│   └── glossary/       # Philatelic terms
├── images/             # Image assets
├── dist/               # Build output (git-ignored)
├── scripts/            # Build and utility scripts
└── .github/workflows/  # CI/CD pipelines
```

## 🏗️ Architecture Highlights

### Performance Optimization
- **Tree-shaking**: Reduces bundle sizes by 50-80%
- **Page-specific bundles**: Only loads required code
- **Critical CSS**: Inline styles for instant rendering
- **Lazy loading**: Components load on-demand
- **Service Worker**: Intelligent caching strategy

### Security Features
- **Content Security Policy**: Comprehensive CSP headers
- **Input sanitization**: XSS prevention
- **Rate limiting**: 3 submissions per hour
- **CSRF protection**: Token-based validation

### Bundle Analysis
Total optimized size: ~191KB across 7 bundles
- Core: 10.99 KB
- Home: 30.24 KB
- Meetings: 42.13 KB
- Resources: 21.31 KB
- And more...

## 🧪 Testing

The project includes comprehensive testing:
- HTML validation
- CSS validation
- JavaScript linting
- Link checking
- Accessibility compliance
- Performance auditing

See [TESTING.md](TESTING.md) for detailed testing procedures.

## 🚢 Deployment

The site automatically deploys to GitHub Pages when pushing to the `main` branch. All tests must pass before deployment.

For manual deployment or other hosting options, see [CI-CD.md](CI-CD.md).

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on:
- Reporting bugs
- Suggesting features
- Code style
- Pull request process

## 📊 Performance Metrics

- Lighthouse Score: 90+
- First Contentful Paint: < 1.5s
- Total Blocking Time: < 300ms
- Cumulative Layout Shift: < 0.1

## 🔒 Security

For security concerns, please email loz33@hotmail.com directly rather than opening a public issue.

## 📜 License

This project is licensed under the ISC License - see the [package.json](package.json) for details.

## 🏆 Acknowledgments

- San Antonio Philatelic Association members
- Built with modern web standards
- Powered by vanilla JavaScript for maximum performance

## 📞 Contact

- **Email**: loz33@hotmail.com
- **Website**: https://sastamps.org
- **Meetings**: MacArthur Park Lutheran Church, Building 1
- **Meeting Times**: Most Friday nights, doors open at 6:30 PM

---

<p align="center">
  <strong>San Antonio Philatelic Association</strong><br>
  Founded 1896 | Chapter #3 of the Texas Philatelic Association<br>
  <em>Promoting the enjoyment of stamp collecting through education, fellowship, and service</em>
</p>