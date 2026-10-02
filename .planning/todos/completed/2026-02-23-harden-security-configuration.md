---
created: 2026-02-23T14:10:27.865Z
title: Harden security configuration
area: security
files:
  - security-headers.php
  - contact-handler.php
---

## Problem

No CSP violation reporting endpoint configured (report-uri or report-to). No security.txt or .well-known/security.json for responsible disclosure. Rate limiting only covers the contact form, not other endpoints. CORS headers could be more restrictive.

## Solution

- Add CSP violation reporting endpoint (report-uri / report-to directive)
- Create /.well-known/security.txt with responsible disclosure info
- Expand rate limiting beyond just the contact form
- Tighten CORS headers to specific allowed origins
- Consider adding Subresource Integrity (SRI) for CDN scripts

## Resolution (2026-10-01)

Done where GitHub Pages allows it: SRI on Font Awesome and Lunr (#167, plus the dynamic Lunr loader in #168); unused hosts (unpkg, Google Analytics/Tag Manager) removed from every page's CSP (#167). Not possible on GitHub Pages (no server, no custom headers): CSP report-uri/report-to, rate limiting, CORS headers, and /.well-known/security.txt (the Pages artifact drops dot-directories). These depend on the CDN/hosting decision in the clickjacking todo.
