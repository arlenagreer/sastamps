# Phase 1: Asset Loading - Context

**Gathered:** 2026-02-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix all external asset loading failures so the site has zero 404 console errors for fonts, favicon, and service worker/manifest references. This phase covers three requirements: ASSET-01 (Google Fonts load), ASSET-02 (Favicon displays), ASSET-03 (No service worker/manifest 404s). No new features or capabilities are added -- this is purely fixing broken references.

</domain>

<decisions>
## Implementation Decisions

### Font loading strategy
- Use Google Fonts CDN -- fix existing URLs to load correctly, do not self-host
- Use `font-display: swap` for immediate fallback text display while fonts load
- No font preloading -- use standard Google Fonts link tags, keep it simple
- Latin subset only -- smaller download, sufficient for English content on the SAPA site
- Required fonts: Open Sans (400/600/700) and Merriweather (400/700)

### Service worker & manifest handling
- If service worker/manifest references point to files that don't exist and aren't providing real functionality, remove the references entirely to eliminate 404s
- If service worker IS in active use providing caching, fix the file path to match the existing reference (simplest fix)
- If a web manifest is needed, keep it minimal: name, short_name, icons, theme_color -- just enough to stop 404s
- Do not change any existing caching strategy -- only fix file references

### Favicon setup
- Single favicon.ico format -- classic .ico in site root, universally supported
- Place favicon.ico in root directory AND add explicit `<link>` tag in HTML head
- Use existing favicon image if one exists in the project -- just fix the path reference
- No apple-touch-icon or multiple size variants -- fix the immediate 404 only

### Claude's Discretion
- Exact Google Fonts URL format and parameter construction
- Whether to combine font requests into single or multiple link tags
- How to verify fonts load correctly across all pages (testing approach)
- Determination of whether service worker is actively used or vestigial

</decisions>

<specifics>
## Specific Ideas

No specific requirements -- open to standard approaches. The goal is simply to eliminate 404 errors with the simplest, most conservative fixes possible.

</specifics>

<deferred>
## Deferred Ideas

None -- discussion stayed within phase scope

</deferred>

---

*Phase: 01-asset-loading*
*Context gathered: 2026-02-16*
