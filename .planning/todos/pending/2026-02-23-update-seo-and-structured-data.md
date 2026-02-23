---
created: 2026-02-23T14:10:27.865Z
title: Update SEO and structured data
area: general
files:
  - sitemap.xml
  - index.html
  - meetings.html
  - about.html
---

## Problem

Sitemap lastmod dates are stale (2025-06-28). No `<link rel="canonical">` tags on pages. JSON-LD structured data only exists on ~3 pages. Schema.org types are generic — could use more specific types like LocalBusiness and Event for better search engine understanding.

## Solution

- Update sitemap.xml lastmod dates to current
- Add `<link rel="canonical">` to all pages
- Add JSON-LD structured data to all pages
- Use Schema.org LocalBusiness for SAPA organization pages
- Use Schema.org Event for meeting pages
- Verify all images have descriptive alt attributes
