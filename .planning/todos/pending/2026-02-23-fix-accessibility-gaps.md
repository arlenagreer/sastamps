---
created: 2026-02-23T14:10:27.865Z
title: Fix accessibility gaps
area: ui
files:
  - .pa11yrc.json
  - css/styles.css
  - js/script.js:1210
  - contact.html
---

## Problem

Several WCAG 2.0 AA accessibility gaps exist: color-contrast rule is disabled in `.pa11yrc.json`, gold accent (#f1c40f) is borderline WCAG AA (~3.5:1 on white). Form inputs lack `aria-label`, `aria-describedby`, and `aria-invalid` attributes. Dynamically loaded content (newsletters, calendar) lacks `aria-live` regions for screen reader announcements. Generic "View PDF" links need descriptive text. Focus trapping is missing from modal dialogs.

## Solution

- Enable color-contrast rule in `.pa11yrc.json` and fix all failures
- Darken gold accent or use it only on dark backgrounds
- Add ARIA attributes to all form inputs and validation messages
- Add `aria-live="polite"` regions for lazy-loaded content
- Change "View PDF" to "View [Newsletter Name] PDF"
- Add focus trapping to modals and keyboard navigation improvements
- Ensure touch targets are minimum 44x44px
