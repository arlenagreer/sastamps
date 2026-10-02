---
created: 2026-02-23T14:10:27.865Z
title: Add performance refinements
area: performance
files:
  - esbuild.config.js
  - service-worker.js
---

## Problem

Source maps are disabled in production (no debugging capability). No HTTP cache headers configured. No gzip/brotli compression at the server level. No stored Lighthouse baseline scores for tracking performance regressions over time.

## Solution

- Enable source maps for production debugging
- Configure HTTP cache headers (max-age, ETag) if hosting supports it
- Enable gzip/brotli compression at the server/CDN level
- Store Lighthouse baseline scores and track over time
- Consider HTTP/2 Server Push for critical assets

## Resolution (2026-10-01)

Closed. Source maps stay off in production on purpose (they would ship the sources' size again). HTTP cache headers and compression are set by GitHub Pages' CDN (Fastly already serves gzip); they cannot be configured without a CDN/host change (see the clickjacking todo). HTTP/2 Server Push is deprecated in browsers. A stored Lighthouse baseline is carried to `2026-10-01-open-follow-ups.md`.
