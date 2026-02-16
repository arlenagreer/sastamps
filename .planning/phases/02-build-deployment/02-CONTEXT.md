# Phase 2: Build & Deployment - Context

**Gathered:** 2026-02-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Deploy missing JavaScript bundles for 4 pages (About, Archive, Membership, Glossary) so they load without 404 errors. Fix the broken sitemap link in the Glossary footer. No new page functionality is added -- only ensuring existing assets are built and deployed, and broken links are resolved.

</domain>

<decisions>
## Implementation Decisions

### Bundle deployment approach
- Build bundles from existing page source files using the existing `npm run build:js` esbuild pipeline
- Only build what's already coded -- no new functionality added to any page
- If any page lacks a source JS file, create a minimal entry point that imports core-bundle only (ensures no 404 without adding new behavior)

### Sitemap link resolution
- Remove the broken sitemap link entirely rather than creating a sitemap.xml
- Remove from the Glossary footer only (the reported broken instance)
- Just remove the link, do not replace it with another link
- Creating a real sitemap.xml is deferred to a future phase

### Verification approach
- Verify via manual browser check on local dev server (`npm run serve`)
- Verification scope: confirm each bundle loads without 404 errors in browser console
- No formal documentation of verification results needed -- phase success criteria are sufficient

### Claude's Discretion
- Exact structure of minimal entry points if source files are missing
- Build configuration adjustments if needed to include the 4 page bundles
- Order of operations for build and link fix

</decisions>

<specifics>
## Specific Ideas

No specific requirements -- open to standard approaches. The existing esbuild build system and project conventions should be followed.

</specifics>

<deferred>
## Deferred Ideas

- Create a real sitemap.xml for SEO purposes -- future phase

</deferred>

---

*Phase: 02-build-deployment*
*Context gathered: 2026-02-16*
