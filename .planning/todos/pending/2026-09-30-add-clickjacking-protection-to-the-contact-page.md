---
created: 2026-10-01T01:32:44.078Z
title: Add clickjacking protection to the contact page
area: security
severity: minor
files:
  - contact.html (security meta block and its comment claiming CSP frame-ancestors protection)
  - .github/workflows/ci.yml (deploy: GitHub Pages)
  - netlify/ (existing Netlify config, a possible host that supports headers)
---

## Problem

Found 2026-09-30 while fixing the 404 page (PR #156). `contact.html` has no protection against being embedded in another site's frame (clickjacking). It has neither an `X-Frame-Options` header nor a CSP `frame-ancestors` directive.

- **Why a meta tag can't fix it:** the site is hosted on GitHub Pages, which cannot set custom HTTP response headers. Browsers ignore `X-Frame-Options` and `frame-ancestors` when they are set via `<meta>`. A meta X-Frame-Options on 404.html only produced a console error and was removed in #156.
- **Misleading comment:** a comment in `contact.html` wrongly claims that CSP `frame-ancestors` provides this protection.
- **Exposure:** the contact form is the site's only interactive surface. There is no login and no payments, so impact is low-medium.

## Solution

Not yet decided. Options:

- **(a) Frame-busting JS fallback** on contact.html, e.g. `if (window.top !== window.self) window.top.location = window.self.location;`, or hiding the form when framed. This is partial protection: it can be defeated by sandboxed iframes.
- **(b) CDN or proxy in front of GitHub Pages** (e.g. Cloudflare). It would send `X-Frame-Options: DENY` and `Content-Security-Policy: frame-ancestors 'none'` site-wide. This is the proper fix if the domain's DNS can move.
- **(c) Host on a platform with custom headers** (Netlify config already exists in the repo) and set the headers there.

In every case, correct the misleading comment in contact.html.
