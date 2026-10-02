---
created: 2026-10-02T09:45:00.000Z
title: Search Engine Optimization
area: general
---

## Problem

The owner wants the SAPA site to be easier to find in search engines, so
that people looking for a stamp club in San Antonio find it. Some groundwork
already exists:

- canonical links on the `www` host (#167);
- Organization JSON-LD (#167);
- a generated `sitemap.xml` and `robots.txt` (#169);
- searchable archive issues (#180);
- the indexable design showcase removed (#183).

Nothing has been done yet to measure or improve search visibility on
purpose.

## Solution

Not yet decided. Candidate steps:

- Register the site in Google Search Console and Bing Webmaster Tools
  (free; needs DNS or file verification), submit the sitemap, and record a
  baseline: queries, impressions, indexed pages and crawl errors.
- Check each page's title and meta description for local intent ("stamp
  club San Antonio", "philatelic society", "stamp bourse") without keyword
  stuffing.
- Generate Event JSON-LD for upcoming meetings from
  `data/meetings/meetings.json` at build time, so meetings can appear as
  event results.
- Add a real logo image (the Organization JSON-LD now points at the
  favicon) and consistent social-preview images.
- Claim or update the club's Google Business Profile (address, Friday
  hours, link), if the club wants one. This is a club decision.
- Get listed by the APS chapter directory and the Texas Philatelic
  Association, and link back to them.
- Resolve the contradictory history claims on the About, Newsletter and
  Archive pages (founding year, PHILATEX dates). Conflicting facts hurt
  trust signals.
- Track Core Web Vitals (Lighthouse baseline; open follow-up 16).
