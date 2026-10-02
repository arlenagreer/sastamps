---
created: 2026-02-23T14:10:27.865Z
title: Audit XSS surface area
area: security
files:
  - js/script.js:1206
  - js/utils/safe-dom.js
  - js/modules/newsletter-loader.js
---

## Problem

Newsletter rendering (~script.js line 1206) dynamically creates HTML content. While sanitization utilities exist (escapeHTML, sanitizeText in safe-dom.js), not all innerHTML usage has been verified to pass through them. Any dynamic content insertion that bypasses sanitization is a potential XSS vector.

## Solution

- Audit all innerHTML usage across the codebase
- Ensure every dynamic content insertion uses escapeHTML/sanitizeText utilities
- Consider switching to textContent where HTML rendering isn't needed
- Add CSP nonce-based script allowlisting as defense-in-depth

## Resolution (2026-10-01)

Done in #168: all 115 innerHTML/outerHTML/insertAdjacentHTML sites audited (table in the PR); escapeHTML now escapes quotes (the root cause of attribute breakout); new safeUrl()/firstSafeUrl() reject javascript:/data:/vbscript: links built from data; ~10 unescaped interpolations fixed. archive.js links routed through safeUrl in #169, and tests/xss-security-test.js (node:test, in bin/ci) checks the contract plus every URL in data/**/*.json. CSP nonces are not applicable while pages rely on 'unsafe-inline'. Remaining (in open follow-ups): audit the inline <script> blocks inside the HTML pages.
