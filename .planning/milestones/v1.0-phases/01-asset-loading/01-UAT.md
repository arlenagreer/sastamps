---
status: complete
phase: 01-asset-loading
source: [01-01-SUMMARY.md, 01-02-SUMMARY.md]
started: 2026-02-16T15:06:54Z
updated: 2026-02-16T15:08:30Z
---

## Current Test

[testing complete]

## Tests

### 1. Google Fonts Load Correctly
expected: Google Fonts (Open Sans, Merriweather) load on all pages without 404 errors
result: issue
reported: "Font preload link tags use incorrect short URLs (e.g. fonts.gstatic.com/s/opensans/v1/400.woff2) that return 404. The Google Fonts CSS itself loads correctly (200) and provides the real versioned font URLs which load successfully (200). The fonts render correctly, but 5 preload 404 errors appear in the console on every page. Found in index.html lines 2818-2822 and 2857-2861 (duplicate preload blocks). Same pattern exists across all HTML pages (about.html, meetings.html, newsletter.html, membership.html, contact.html)."
severity: minor

### 2. Favicon Loads
expected: favicon.ico loads with 200 status on all pages
result: pass
notes: favicon.ico returns 200 with content-type image/x-icon. Link tag present in head as `<link rel="icon" type="image/x-icon" href="favicon.ico">`.

### 3. No Service Worker/Manifest 404 Errors
expected: No console 404 errors for sw.js or site.webmanifest
result: pass
notes: No sw.js or site.webmanifest 404 errors in console. site.webmanifest returns 200. All 5 console errors on index.html are font preload related only.

### 4. Manifest References Correct
expected: site.webmanifest contains favicon.ico paths, 404.html references site.webmanifest not manifest.json
result: pass
notes: site.webmanifest icons array references "favicon.ico" for both 192x192 and 512x512 sizes. 404.html line 45 contains `<link rel="manifest" href="site.webmanifest">` (correct reference).

## Summary

total: 4
passed: 3
issues: 1
pending: 0
skipped: 0

## Gaps

- **Font preload 404s (minor):** All HTML pages contain `<link rel="preload">` tags with incorrect font URLs pointing to `fonts.gstatic.com/s/opensans/v1/` and `fonts.gstatic.com/s/merriweather/v1/` which are not valid Google Fonts CDN paths. The actual fonts load correctly via the Google Fonts CSS stylesheet, so this is cosmetic (console noise) rather than functional. Fix: either remove the preload tags entirely (the Google Fonts CSS handles loading) or update them with the correct versioned URLs from the Google Fonts CSS response.
