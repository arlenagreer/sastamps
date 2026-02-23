---
created: 2026-02-23T14:10:27.865Z
title: Add automated testing framework
area: testing
files:
  - package.json
  - js/utils/safe-dom.js
  - js/modules/search-engine.js
  - js/pages/contact.js
---

## Problem

The project has no unit tests, integration tests, or E2E tests. Current testing is limited to linting/validation (HTML, CSS, JS, links, markdown) and manual Lighthouse/pa11y audits. Critical modules like safe-dom utilities, form validation, rate limiting, and search have no automated test coverage. There are also no pre-commit hooks to prevent regressions.

## Solution

- Add Jest or Vitest for unit testing JS modules (safe-dom, form validation, rate limiting, sanitization)
- Add Playwright or Cypress for E2E testing (contact form flow, search functionality, calendar interaction)
- Configure pre-commit hooks (husky + lint-staged) to run tests before pushing
- Add CI integration for automated test runs
