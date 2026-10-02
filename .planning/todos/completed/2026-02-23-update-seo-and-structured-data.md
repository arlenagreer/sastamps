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

## Resolution (2026-10-01)

Done: canonical links on www for every deployed page, og/twitter URLs fixed, Organization JSON-LD cleaned (invented facts removed, real logo) (#167); sitemap.xml generated at build on the www host with per-page/data lastmod, robots.txt deployed, canonical==sitemap checked in CI (#169). The hand-written Event block (stale after its date) was removed; generating Event JSON-LD from meetings.json at build is in open follow-ups.
