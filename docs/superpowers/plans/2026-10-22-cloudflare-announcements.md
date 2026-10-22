# Cloudflare Hosting and Homepage Announcements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Serve sastamps.org from one Cloudflare Worker (release 1), then let Jim publish
homepage announcements that expire on their own (release 2).

**Architecture:**

- One Worker serves the unchanged `_site/` build as static assets.
- Release 2 adds announcement routes in the same Worker. D1 holds the announcements, and
  Cloudflare Access protects `/admin/`.
- The homepage banner is spliced into `index.html` at a marker comment by plain string
  replacement. If the announcement query fails, the static page is served unchanged.
- All logic lives in small pure ES modules under `worker/src/`, tested with `node:test` in
  the existing `tests/` glob. The Worker entry file is thin glue.

**Tech Stack:**

- Cloudflare Workers with static assets, D1, Access (One-time PIN) and the `send_email`
  binding.
- `wrangler` as a devDependency.
- Node 22 `node:test`, with WebCrypto for JWT checks.

**Spec:** `docs/superpowers/specs/2026-10-22-cloudflare-announcements-design.md`. Read it
first; it records every owner decision this plan relies on.

## Global Constraints

- Zero recurring cost: free tier only, and nothing may enable a paid plan. Task 1 re-checks
  every limit used here against Cloudflare's current published limits.
- The build contract is unchanged: `npm run build` → `_site/`, verified by
  `scripts/check-site-build.js`. The build writes no tracked file.
- `bin/ci` is the merge gate. New tests go in `tests/*.test.mjs`, so `npm run test:unit`
  picks them up with no `bin/ci` edit. `eslint` must cover `worker/**/*.js` (Task 2 adds it).
- Canonical host: `https://www.sastamps.org/`. The apex redirects to it with a 301.
- Time zone `America/Chicago`. An announcement shows from 00:00 on `show_from` through
  23:59:59 on `show_until`, local time.
- Show at most **2** announcements, soonest-ending first.
- Sign-in allowlist: Jim and Arlen only. The emails live in the Worker secret
  `ADMIN_EMAILS` and in the Access policy, never in a tracked file.
- Everything Jim types is escaped at render time. Raw HTML is never accepted.
- Pages keep their `<meta>` CSP. Admin scripts load from `'self'`: no inline script and no
  CDN.
- The 2026 Blue-Chip Auction banner in `index.html` stays hard-coded and is not migrated
  (owner decision).

## Review Focus

1. **Hostile or messy text from the form** (`<script>`, `javascript:` links, curly quotes,
   emoji, 2,000 pasted characters): rendered inert and exactly as typed, or rejected with a
   clear message. Tests are in Tasks 6 and 9.
2. **The last day of a window and DST changes:** an announcement ending 2026-11-01 (the
   CDT→CST day) still shows at 23:30 Chicago time and is gone at 00:00. Test in Task 5.
3. **A slow or broken D1:** the homepage returns byte-identical to the static file within
   the timeout. Test in Task 7.
4. **Duplicate details-page addresses:** two announcements with the same headline get
   different slugs, and editing a headline never changes a published slug, because emailed
   links must keep working. Test in Task 9.
5. **A stale admin session:** a request with an expired, wrong-audience or non-allowlisted
   Access token is refused with 403 and changes nothing. Test in Task 8.

---

## Release 1: hosting move (nothing visible changes)

### Task 1: Verify Cloudflare facts and add the Worker that serves `_site/`

**Files:**

- Create: `wrangler.jsonc`, `worker/src/index.js`, `worker/src/redirect.js`
- Create: `docs/cloudflare/limits-2026-10.md`, recording each limit this plan uses, read
  from Cloudflare's docs with URL and date: Workers requests/day, static-asset count and
  size per file, D1 storage and reads/day, Access free seats, and `send_email` to a
  verified address with no MX on the zone.
- Modify: `package.json` (devDependency `wrangler`, pinned exact; script
  `"deploy:cf": "wrangler deploy"`)
- Test: `tests/worker-redirect.test.mjs`

**Interfaces:**

- Produces: `canonicalRedirect(url: URL) -> string | null` returns the `https://www.`
  location for apex or `http` requests, else `null`.
- Produces: the Worker `fetch(request, env)`: if `canonicalRedirect` returns a location,
  respond 301; otherwise `env.ASSETS.fetch(request)`.

- [ ] **Step 1:** Read the docs and write `docs/cloudflare/limits-2026-10.md`. **If any
  limit makes the design cost money, STOP and report to the owner.**
- [ ] **Step 2: Write the failing test.** `canonicalRedirect(new URL("https://sastamps.org/meetings.html?x=1"))`
  returns `"https://www.sastamps.org/meetings.html?x=1"`. The `http://www.` form returns the
  `https://www.` URL. `https://www.sastamps.org/` and `https://sastamps-site.<acct>.workers.dev/`
  both return `null`.
- [ ] **Step 3:** Run `npm run test:unit` and expect FAIL (module not found).
- [ ] **Step 4:** Implement `redirect.js` and `index.js`. In `wrangler.jsonc` set:
  - `"name": "sastamps-site"`
  - `"main": "worker/src/index.js"`
  - `"assets": { "directory": "_site", "binding": "ASSETS", "not_found_handling": "404-page" }`
  - `"compatibility_date"` set to the date of this task
- [ ] **Step 5:** Run `npm run test:unit` and expect PASS. Then run `npm run build && npx wrangler dev --local`;
  `curl -sI localhost:8787/meetings.html` returns 200, and a missing path returns 404 with
  the site's `404.html` body.
- [ ] **Step 6: Commit.**

### Task 2: Lint coverage and the host-comparison tool

**Files:**

- Modify: `package.json` `test:js` → `eslint 'js/**/*.js' 'worker/**/*.js'`. Add
  `"compare:hosts": "node scripts/compare-hosts.js"`.
- Create: `scripts/compare-hosts.js`
- Test: `tests/compare-hosts.test.mjs`

**Interfaces:**

- Produces: `compareHosts(a: string, b: string, paths: string[], fetchImpl = fetch) -> Promise<{path, a: {status, type, len}, b: {...}, same: boolean}[]>`
- Produces: `defaultPaths(siteDir = "_site") -> string[]`, covering every sitemap URL, every
  `.ics` under `data/calendar/`, `calendar/sapa-meetings.ics`, three newsletter PDFs, and
  `/does-not-exist`.
- The CLI prints one line per path, exits 1 on any `same:false`, and prints the totals.

- [ ] **Step 1: Write the failing test.** With a fake `fetchImpl`, identical responses
  yield `same:true`. A status, content-type or body-length difference yields `same:false`
  for that path only. `defaultPaths()` on a built `_site` includes `/`,
  `/calendar/sapa-meetings.ics` and `/does-not-exist`.
- [ ] **Step 2:** Run the test and expect FAIL.
- [ ] **Step 3:** Implement with `HEAD`, falling back to `GET` when `HEAD` returns 405.
- [ ] **Step 4:** Run the test and expect PASS. Run `npm run test:js` with 0 errors.
- [ ] **Step 5: Commit.**

### Task 3: Deploy to Cloudflare from CI, in parallel with Pages

**Files:**

- Modify: `.github/workflows/ci.yml`. Add a job `deploy-cloudflare` with
  `needs: test` and the same `if:` as the Pages job. It downloads the same `_site` artifact
  and runs `npx wrangler deploy` with `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`
  from repository secrets. Pages stays as it is.

- [ ] **Step 1:** Arlen creates a Cloudflare API token scoped to *Workers Scripts: Edit*
  for this account only, and adds both secrets. **Owner action: ask, never guess a
  token.**
- [ ] **Step 2:** Push the branch and merge through the gate. The `deploy-cloudflare` job
  succeeds.
- [ ] **Step 3:** Run `npm run compare:hosts -- https://www.sastamps.org https://sastamps-site.<acct>.workers.dev`
  and expect 0 differences. Record the output in the PR.
- [ ] **Step 4: In-browser UAT on `workers.dev`** (`/browse`):
  - Check the homepage, meetings modal, search, newsletter PDF, calendar download,
    contact form page and 404.
  - Expect 0 console errors.
- [ ] **Step 5: Commit** (workflow only).

### Task 4: DNS cutover runbook and execution (owner-run)

**Files:**

- Create: `docs/cloudflare/cutover-runbook.md`, with numbered steps and the exact record
  table below.

- [ ] **Step 1:** Write the runbook:
  1. Add the `sastamps.org` zone to Cloudflare (free plan).
  2. Create records: `www` as a Worker custom domain for `sastamps-site`; the apex as a
     custom domain too (the 301 lives in the Worker).
  3. Disable "Always Use HTTPS" only if it conflicts with the Worker redirect. Test both.
  4. The day before the switch, lower the TTLs at Gandi to 300.
  5. At Gandi, set the nameservers to the two Cloudflare names.
  6. Watch `dig +short NS sastamps.org` until it shows the Cloudflare names.
  7. Run `compare:hosts` between the live domain and `workers.dev` (expect 0 differences).
  8. Run the browser UAT again on the live domain.
  9. **Rollback:** restore the Gandi nameservers. The Gandi records are left untouched
     until Task 5.
- [ ] **Step 2:** Arlen executes it. Record the `dig` output, the `compare:hosts` totals
  and the UAT result in the runbook's log section.
- [ ] **Step 3: Commit** the runbook with its log.

### Task 5 (release 1, part b, one week after Task 4): Retire GitHub Pages

**Files:**

- Delete: `CNAME`.
- Modify: `.github/workflows/ci.yml` to remove the Pages artifact upload, the
  `deploy`/`github-pages` job and the Pages concurrency group.
- Modify: `scripts/lib/site.js`, removing `CNAME` from `SITE_FILES` if it is listed. Keep
  `scripts/check-site-build.js` green.
- Modify: `CLAUDE.md` and `README.md` deployment sections to say Cloudflare.

- [ ] **Step 1:** `grep -rn "CNAME\|github-pages\|deploy-pages" --include=*.js --include=*.yml --include=*.md .`
  then update each hit.
- [ ] **Step 2:** `bin/ci` is green. Push, merge, and confirm `deploy-cloudflare` succeeds.
- [ ] **Step 3:** In the GitHub repo settings, turn Pages off (owner).
- [ ] **Step 4: Commit.**

---

## Release 2: announcements (ships only after the owner's go-live checklist)

### Task 6: Announcement window and text formatting (pure modules)

**Files:**

- Create: `worker/src/announcements/window.js`, `worker/src/announcements/format.js`
- Test: `tests/announcements-window.test.mjs`, `tests/announcements-format.test.mjs`

**Interfaces:**

- Produces: `chicagoDate(instant: Date) -> "YYYY-MM-DD"`, using `Intl.DateTimeFormat`
  with `timeZone: "America/Chicago"`.
- Produces: `isShowing(a: {status, show_from, show_until}, now: Date) -> boolean`:
  `status === "published"` and `show_from <= chicagoDate(now) <= show_until`.
- Produces: `isPast(a, now) -> boolean`: `chicagoDate(now) > show_until` or
  `status === "taken_down"`.
- Produces: `pickCurrent(list, now, max = 2) -> list`, filtered by `isShowing` and sorted
  by `show_until` ascending, then `id`.
- Produces: `formatText(text: string) -> string` (HTML) with these rules:
  - Escape `& < > " '` first.
  - A blank line splits paragraphs into `<p>`.
  - Single newlines become `<br>`.
  - `**x**` becomes `<strong>x</strong>`. This is the one markup, and only the toolbar
    produces it.
  - `https?://…` and bare email addresses become links:
    `<a href="…" rel="noopener">` for URLs and `mailto:` for emails. An `http:` link is
    kept as typed.
  - Nothing else becomes markup.

- [ ] **Step 1: Write the failing tests**:
  - `isShowing` for `show_until: "2026-11-01"`, at `2026-11-02T05:30:00Z` (23:30 CST
    Nov 1) → true, and at `2026-11-02T06:00:00Z` → false.
  - `show_from` boundary at `2026-03-08` (CST→CDT).
  - `pickCurrent` returns 2 of 3, soonest-ending first.
  - `formatText("<script>x</script>")` contains no `<script`.
  - `formatText("javascript:alert(1)")` produces no `<a`.
  - `formatText("Hi **Jim** see https://x.org/a?b=1&c=2")` equals
    `<p>Hi <strong>Jim</strong> see <a href="https://x.org/a?b=1&amp;c=2" rel="noopener">https://x.org/a?b=1&amp;c=2</a></p>`.
  - Curly quotes and emoji pass through unchanged.
  - A double blank line produces 2 `<p>`.
- [ ] **Step 2:** Run the tests and expect FAIL.
- [ ] **Step 3:** Implement both modules. Escape before linkifying, and match links on the
  escaped text with `&amp;` handled.
- [ ] **Step 4:** Run the tests and expect PASS.
- [ ] **Step 5: Commit.**

### Task 7: Banner rendering and homepage injection (fail-open)

**Files:**

- Create: `worker/src/announcements/render.js`, `worker/src/announcements/inject.js`
- Modify: `index.html`. Insert the line `<!-- announcements -->` directly after the
  closing `</section>` of the Newsletter Banner (before the hard-coded Blue-Chip banner
  comment).
- Modify: `worker/src/index.js` so `/` and `/index.html` go through `serveHome`.
- Test: `tests/announcements-render.test.mjs`, `tests/announcements-inject.test.mjs`

**Interfaces:**

- Consumes: `formatText`, `pickCurrent` (Task 6).
- Produces: `renderBanner(a) -> string`. It produces the same markup and inline styles as
  today's `#blue-chip-banner` block in `index.html` (copy them), with these changes:
  - `id="announcement-<id>"`
  - `<h2>` = escaped headline
  - `<p>` = `formatText(body)`
  - the button, only when `button_label` is set: its href is `button_url` (https only) or
    `/announcements/<slug>`.
- Produces: `injectBanners(html: string, banners: string[]) -> string`. It replaces
  `<!-- announcements -->` with the wrapped banners, or returns `html` unchanged when
  `banners` is empty or the marker is absent.
- Produces: `serveHome(request, env, now = new Date())`:
  1. Fetch the asset.
  2. `Promise.race` the D1 query against a **300 ms** timeout.
  3. On any error or timeout, return the asset response untouched.
  4. Otherwise return the injected HTML with the original headers, except
     `content-length`, plus `cache-control: no-store`.

- [ ] **Step 1: Write the failing tests:**
  - `renderBanner` escapes a `<b>` headline.
  - A `button_url` of `javascript:x` produces no button.
  - `injectBanners(html, [])` equals the input exactly.
  - `serveHome` with a fake `env.DB` that rejects, and with one that never resolves (fake
    timer), returns a body **byte-identical** to the fake asset.
  - With one published current row, the body contains `id="announcement-1"` at the marker
    position, before `Celebrating Our Philatelic Heritage`.
- [ ] **Step 2:** Run the tests and expect FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run the tests and expect PASS. Run `npm run test:site-build` (the marker
  comment must not break any check).
- [ ] **Step 5: Commit.**

### Task 8: Access token verification and the allowlist

**Files:**

- Create: `worker/src/auth.js`
- Test: `tests/worker-auth.test.mjs`

**Interfaces:**

- Produces: `verifyAccess(request, env, fetchJwks = defaultFetchJwks) -> Promise<{email} | null>`.
  - Read `Cf-Access-Jwt-Assertion`.
  - Verify RS256 against the JWKS from `https://${env.ACCESS_TEAM_DOMAIN}/cdn-cgi/access/certs`,
    with `crypto.subtle` and the key chosen by `kid`.
  - Require `aud` to include `env.ACCESS_AUD`, require `exp > now`, and require that the
    lowercased `email` is in the comma-separated `env.ADMIN_EMAILS`.
  - Cache JWKS for 10 minutes in module scope.

- [ ] **Step 1: Write the failing tests** with a test RSA key pair generated in the test
  and a fake JWKS:
  - A valid token for an allowlisted email resolves `{email}`.
  - Each of these resolves `null`: a missing header, a bad signature, an expired token,
    the wrong `aud`, an email not on the list, and an unknown `kid`.
- [ ] **Step 2:** Run the tests and expect FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run the tests and expect PASS.
- [ ] **Step 5: Commit.**

### Task 9: D1 schema, store and admin API

**Files:**

- Create: `worker/migrations/0001_announcements.sql`, `worker/src/announcements/store.js`,
  `worker/src/announcements/api.js`
- Modify: `wrangler.jsonc` to add the `d1_databases` binding `DB` (database
  `sastamps-announcements`) and `"migrations_dir": "worker/migrations"`.
- Modify: `worker/src/index.js` to route `/api/admin/*` through `verifyAccess`, answering
  403 JSON `{error:"forbidden"}` when it returns null.
- Test: `tests/announcements-api.test.mjs` (in-memory fake `DB` with the same `prepare().bind().all()/run()/first()` surface)

**Interfaces:**

- Schema `announcements`:
  - `id INTEGER PK`
  - `slug TEXT UNIQUE NOT NULL`
  - `headline TEXT NOT NULL`
  - `body TEXT NOT NULL`
  - `button_label TEXT`, `button_url TEXT`, `details TEXT`
  - `show_from TEXT NOT NULL`, `show_until TEXT NOT NULL`
  - `status TEXT NOT NULL CHECK(status IN ('draft','published','taken_down'))`
  - `created_by`, `created_at`, `updated_by`, `updated_at`
  - `last_notice_error TEXT`
- Produces in `store.js`: `listAll(db)`, `listCurrent(db)` (status published), `getById(db, id)`,
  `getBySlug(db, slug)`, `insert(db, a, actor)`, `update(db, id, patch, actor)`,
  `setStatus(db, id, status, actor)`, `setNoticeError(db, id, msg)`.
- Produces in `api.js`, `handleAdmin(request, env, user) -> Response`:
  - `GET /api/admin/announcements` → `{items}`
  - `POST /api/admin/announcements` → `201 {item}`
  - `PUT /api/admin/announcements/:id` → `{item}`
  - `POST /api/admin/announcements/:id/takedown` → `{item}`
- Produces `validate(input) -> {ok, errors: {field: message}}`:
  - headline is 1–100 characters
  - body is 1–500
  - details is ≤ 5000
  - `button_label` is ≤ 30, and a label requires a `button_url` or details
  - `button_url` must parse as `https:`
  - dates are `YYYY-MM-DD`, with `show_from <= show_until`
  - `show_until` must be today or later in Chicago time
- Produces `makeSlug(headline, existing: Set) -> string`: lowercase ASCII words joined by
  `-`, at most 60 characters, with `-2`, `-3` and so on appended on collision. The slug is
  set at insert and **never changed by update**.

- [ ] **Step 1: Write the failing tests:**
  - `validate` rejects each rule above with a field-named message.
  - A 2,000-character body gets `errors.body`.
  - Two inserts with the same headline get `slug` and `slug-2`.
  - An update that changes the headline keeps the slug.
  - A takedown sets status and `updated_by`.
  - `handleAdmin` with `user = null` (via the index route) → 403, and the row count is
    unchanged.
- [ ] **Step 2:** Run the tests and expect FAIL.
- [ ] **Step 3:** Implement. Create the remote D1 database once with
  `npx wrangler d1 create sastamps-announcements` (owner) and apply it with
  `npx wrangler d1 migrations apply sastamps-announcements --remote`.
- [ ] **Step 4:** Run the tests and expect PASS.
- [ ] **Step 5: Commit.**

### Task 10: Notice email to Arlen

**Files:**

- Create: `worker/src/notify.js`
- Modify: `wrangler.jsonc` to add `send_email` binding `NOTIFY`, restricted to the
  verified destination. Modify `api.js` to call `notifyOwner` after each successful
  write.
- Test: `tests/worker-notify.test.mjs`

**Interfaces:**

- Produces: `buildNotice({action, actor, item, siteUrl}) -> {subject, text}`. The subject
  is `SAPA site: <actor> <published|edited|took down> "<headline>"`. The text gives the
  headline, the dates, and the details link if there is one.
- Produces: `notifyOwner(env, notice) -> Promise<{ok, error?}>`. It never throws. On
  failure it calls `setNoticeError`, and the publish still returns success.

- [ ] **Step 1: Write the failing tests:**
  - The subject names the actor's email and the action.
  - With a fake `NOTIFY.send` that rejects, the API still returns 201, and
    `last_notice_error` is set on that row.
- [ ] **Step 2:** Run the tests and expect FAIL.
- [ ] **Step 3:** Implement. If Task 1's limits file says `send_email` cannot work here,
  use the free fallback recorded there behind the same `notifyOwner` signature.
- [ ] **Step 4:** Run the tests and expect PASS.
- [ ] **Step 5: Commit.**

### Task 11: Details pages

**Files:**

- Create: `worker/src/announcements/details.js`
- Modify: `worker/src/index.js` to route `GET /announcements/:slug`.
- Test: `tests/announcements-details.test.mjs`

**Interfaces:**

- Consumes: `getBySlug`, `isPast`, `formatText`.
- Produces: `renderDetailsPage(shellHtml, a, now) -> string`. The shell is `404.html`
  from `env.ASSETS`.
  - Replace the content of its `<main id="main-content">` with an `<h1>` (headline), the
    formatted details (or the body if there are no details), and the show dates.
  - When `isPast`, add a banner reading **"This event has passed."**
  - Set `<title>` to `<headline> - San Antonio Philatelic Association`.
- Route rules:
  - a published or past announcement returns 200;
  - a draft, or a published one whose `show_from` is in the future, returns 404 (the
    site's 404 page);
  - an unknown slug returns 404.

- [ ] **Step 1: Write the failing tests** covering:
  - the route rules;
  - the past-event banner;
  - the title;
  - an escaped headline;
  - the shell's header and footer kept.
- [ ] **Step 2:** Run the tests and expect FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run the tests and expect PASS.
- [ ] **Step 5: Commit.**

### Task 12: Admin page

**Files:**

- Create: `admin/index.html` (deployed at `/admin/`; site header and footer; form;
  list; preview pane), `js/pages/admin.js` (bundled by esbuild like other pages; imports
  `formatText` and `renderBanner` from `worker/src/announcements/`).
- Modify: `esbuild.config.js` to add the `admin` entry. Modify `scripts/lib/site.js` and
  `scripts/build-sitemap.js`: deploy `admin/`, exclude it from the sitemap, and add
  `robots.txt` `Disallow: /admin/`.
- Test: `tests/admin-page.test.mjs` (static checks), plus the UAT below.

**Interfaces:**

- Consumes: the Task 9 API and the Task 6/7 renderers.
- The preview calls the **same** `renderBanner` the Worker uses. No second renderer.

- [ ] **Step 1: Write the failing test.**
  - `admin/index.html` has no inline `<script>` and no `on*=` attributes.
  - It loads `dist/js/admin.min.js`.
  - The sitemap excludes `/admin/`.
  - `robots.txt` disallows it.
- [ ] **Step 2:** Run the test and expect FAIL.
- [ ] **Step 3:** Implement.
  - **Form:** headline, text (with a **Bold** button that wraps the selection in `**`),
    optional button (none / web link / details page with a details textarea), and two
    date pickers.
  - **Preview:** updates live.
  - **Buttons:** Save draft, Publish, Edit, Take down (with a confirm).
  - **Errors:** shown next to their fields from `validate` errors.
  - **List:** current, upcoming and past announcements, with any `last_notice_error`.
- [ ] **Step 4:** Run `bin/ci` and expect green.
- [ ] **Step 5: In-browser UAT** with `wrangler dev --local` and a test `ADMIN_EMAILS`
  plus a stubbed `verifyAccess` (env flag `DEV_FAKE_ACCESS_EMAIL`, honoured only when
  `env.ENVIRONMENT === "dev"`; a test proves production ignores it). Run Jim's whole flow:
  1. Create and preview.
  2. Publish; the homepage shows it.
  3. Edit; the homepage changes.
  4. Open the details page.
  5. Take it down; it's gone from the homepage, and the details page says "This event has
     passed".
  6. Set `show_until` to yesterday; it's hidden.

  Expect 0 console errors.
- [ ] **Step 6: Commit.**

### Task 13: Access setup and go-live (owner-gated)

**Files:**

- Create: `docs/cloudflare/announcements-go-live.md`

- [ ] **Step 1:** Write the doc:
  - **Access:** a Zero Trust free team; a self-hosted application on
    `www.sastamps.org/admin/*` and `/api/admin/*`; the One-time PIN login method; a policy
    allowing only Jim's and Arlen's emails. Copy the AUD tag into the `ACCESS_AUD` var and
    the team domain into `ACCESS_TEAM_DOMAIN`.
  - **Secret:** set `ADMIN_EMAILS` via `wrangler secret put`.
  - **The owner's go-live checklist, verbatim from the spec:** tell the Board, confirm
    with Jim and send the how-to, and do a test post on the live site.
- [ ] **Step 2:** Arlen completes the checklist and the live test post. Verify:
  - `/admin/` without a session redirects to the Access login;
  - `curl -X POST /api/admin/announcements` without a token returns 403;
  - the test post appears on and disappears from `https://www.sastamps.org/`, checked
    with a cache-busted URL.
- [ ] **Step 3:** Draft the how-to email to Jim, with screenshots of the form and the
  preview. Send it **only with the owner's OK**, using the SAPA CC/BCC pattern.
- [ ] **Step 4:** If release 2 goes live on or before 2026-12-11, `grep -n "blue-chip-banner" index.html`.
  If the hard-coded banner is still there, Jim's first announcement must not duplicate it.
  Any announcement that replaces it ships in the same change that removes the hard-coded
  block (spec: never both).
- [ ] **Step 5: Done** when Jim publishes his first real announcement himself.
