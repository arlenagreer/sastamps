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
