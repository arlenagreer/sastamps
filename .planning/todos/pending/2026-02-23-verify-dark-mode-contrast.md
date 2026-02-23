---
created: 2026-02-23T14:10:27.865Z
title: Verify dark mode contrast
area: ui
files:
  - css/styles.css
  - css/critical.css
---

## Problem

Dark mode has comprehensive color overrides via `[data-theme="dark"]`, but text/background combinations haven't been systematically verified against WCAG AA (4.5:1 for normal text, 3:1 for large text). Some color pairings may fail contrast requirements in dark mode.

## Solution

- Test all dark mode color combinations against WCAG AA contrast ratios
- Use automated tools (axe-core, Lighthouse) with dark mode enabled
- Fix any failing combinations by adjusting dark theme CSS variables
- Document verified contrast ratios for the design system
