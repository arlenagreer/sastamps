# CI/CD Pipeline Documentation

This document describes the continuous integration and deployment pipeline for the San Antonio Philatelic Association website.

## Overview

The CI/CD pipeline automatically runs tests on every push and pull request, ensuring code quality and preventing regressions. It also handles automatic deployment to GitHub Pages for the main branch.

## GitHub Actions Workflows

### 1. CI Testing Pipeline (`ci.yml`)

**Triggers:**
- Push to `main` or `develop` branches
- Pull requests to `main`
- Manual workflow dispatch

**Jobs:**
- **Test Suite**: Runs all validation tests
  - HTML validation
  - CSS validation
  - JavaScript linting
  - Markdown linting
  - Link checking
  - Accessibility testing
  - Lighthouse performance audit
  - Security audit

- **Deploy**: Automatically deploys to GitHub Pages (main branch only)

### 2. Scheduled Testing (`scheduled-tests.yml`)

**Triggers:**
- Weekly on Sundays at 2 AM UTC
- Manual workflow dispatch

**Features:**
- Comprehensive testing including external links
- Detailed reports saved for 90 days
- Automatic issue creation on failures
- Bundle size tracking
- Security vulnerability scanning

### 3. Pull Request Validation (`pull-request.yml`)

**Triggers:**
- Pull request opened, synchronized, or reopened

**Features:**
- Quick validation tests
- Bundle size analysis
- Automatic PR comments with results

## Local Development

### Setting Up Git Hooks

To enable pre-commit testing locally:

```bash
# Configure git to use our hooks directory
git config core.hooksPath .githooks

# Or copy the hook manually
cp .githooks/pre-commit .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

### Running Tests Locally

Before pushing code:

```bash
# Quick tests (no server required)
npm run test:quick

# Full test suite
npm run serve  # Terminal 1
npm test       # Terminal 2

# Individual tests
npm run test:html
npm run test:css
npm run test:js
npm run test:links
npm run test:a11y
```

## Test Reports

### Artifact Storage

All test runs generate artifacts that are stored in GitHub Actions:
- Test reports: 30 days retention
- Weekly comprehensive reports: 90 days retention
- Lighthouse reports: Temporary public storage

### Accessing Reports

1. Go to the Actions tab in GitHub
2. Click on a workflow run
3. Scroll to "Artifacts" section
4. Download the test reports

## Deployment

### Automatic Deployment

The main branch automatically deploys to GitHub Pages when:
1. All tests pass
2. Build completes successfully
3. Push event (not pull request)

### Manual Deployment

To manually trigger deployment:
1. Go to Actions tab
2. Select "CI Testing Pipeline"
3. Click "Run workflow"
4. Select the branch
5. Click "Run workflow"

## Configuration

### Environment Variables

No environment variables required for basic operation.

### Secrets

No secrets required for public repository deployment.

### Permissions

The workflows require these permissions:
- `contents: read` - Read repository content
- `pages: write` - Deploy to GitHub Pages
- `id-token: write` - GitHub Pages authentication

## Monitoring

### Build Status

Add this badge to your README:
```markdown
![CI Status](https://github.com/arlenagreer/arlenagreer.github.io/workflows/CI%20Testing%20Pipeline/badge.svg)
```

### Failed Tests

- Automated issue creation for scheduled test failures
- Check Actions tab for detailed logs
- Download artifacts for full reports

## Troubleshooting

### Common Issues

1. **Tests pass locally but fail in CI**
   - Check Node.js version matches (v20)
   - Ensure all dependencies are in package.json
   - Verify file paths (case-sensitive on Linux)

2. **Deployment fails**
   - Check GitHub Pages is enabled in settings
   - Verify branch protection rules
   - Ensure build outputs are correct

3. **Link checker timeouts**
   - Increase sleep time after server start
   - Check for rate limiting on external sites
   - Use `--exclude` flag for problematic URLs

### Debugging Workflows

1. Enable debug logging:
   - Add `ACTIONS_RUNNER_DEBUG: true` to secrets
   - Add `ACTIONS_STEP_DEBUG: true` to secrets

2. Use `continue-on-error: true` to see all test results

3. Add `if: always()` to upload artifacts even on failure

## Best Practices

1. **Keep tests fast**: Use `test:quick` for most development
2. **Fix failures immediately**: Don't let technical debt accumulate
3. **Monitor bundle sizes**: Prevent performance regressions
4. **Review security audits**: Address vulnerabilities promptly
5. **Update dependencies**: Keep tools and libraries current

## Future Enhancements

Consider adding:
- Visual regression testing
- Performance budgets with automatic fails
- Automated dependency updates (Dependabot)
- Branch protection rules
- Code coverage reporting
- Cross-browser testing with BrowserStack/Sauce Labs

---

For questions about the CI/CD pipeline, check the workflow files in `.github/workflows/` or open an issue.