---
created: 2026-10-22T16:45:00.000Z
title: Migrate hosting from GitHub Pages to Cloudflare (free tier)
area: general
priority: medium
---

## Problem

Priority: **medium** (set by the owner, 2026-10-22).

The site is a static build (`_site/`) that `.github/workflows/ci.yml`
deploys to GitHub Pages at `www.sastamps.org`. Pages serves files only, so
nothing on the site can run code on a server:

- The contact form and meeting RSVPs relay through FormSubmit, which the
  site calls temporary. It exposes the owner's address in the page source
  (open follow-ups, item 5).
- `contact-handler.php`, `csrf-token.php`, `security-headers.php` and
  `netlify/functions/contact-form.js` exist in the repo but never run on
  Pages. The server-side rate limiting and CSRF protection that CLAUDE.md
  describes are therefore not live.
- Security headers can only be set as `<meta>` tags, so headers that only
  work as real HTTP headers (`frame-ancestors`, HSTS) cannot be set. See
  the clickjacking todo.
- Every content change (for example the 2026 Blue-Chip Auction banner) is a
  hand edit plus a deploy, and a date-bound notice has to be taken down by
  hand.

## Solution

Not yet decided. **The owner wants to discuss what the migration makes
possible before any work starts**, especially interactivity and serverless
functions. Topics for that discussion (verify Cloudflare's current
free-tier limits first; they change):

- **Hosting:** Cloudflare Pages or Workers static assets serving `_site/`
  unchanged, with the custom domain, HTTPS and preview deploys per PR.
- **Serverless functions (Workers / Pages Functions):**
  - a real contact and RSVP handler with Turnstile bot protection, sending
    mail to a club inbox (retires FormSubmit);
  - RSVP counts the Board can see;
  - Blue-Chip Auction lot submission and a lot list with photos.
- **Data:** D1 (SQLite) or KV for RSVPs, auction lots and announcements.
  A small admin page would let Jim post a notice with an end date, so it
  goes up and comes down without a code change.
- **Headers and security:** real CSP, HSTS and `frame-ancestors` through
  `_headers` or a Worker.
- **Email Routing:** forward an address like `info@sastamps.org` to
  whoever handles club mail.

Risks to plan for:

- the DNS move for `sastamps.org`, and who controls the registrar;
- keeping the local CI gate and the `_site/` build contract;
- a rollback path back to Pages;
- the Board's view on holding member data such as RSVPs.
