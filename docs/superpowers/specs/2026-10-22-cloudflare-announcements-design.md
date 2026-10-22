# Cloudflare hosting and self-service homepage announcements

Status: draft for owner approval · 2026-10-22 · owner: Arlen Greer

## Why

On 2026-10-22, Jim Durham (SAPA newsletter editor) emailed an announcement for the
annual Blue-Chip Auction and asked Arlen to put it on the website. Getting it there took:

- a code change and a review loop;
- a deploy;
- two reminder tasks: reword the banner on Nov 7, take it down on Dec 12.

The site is static on GitHub Pages, so nothing on it can change without a code change.
Every club notice will go the same way.

The goal is that **Jim posts a homepage announcement himself and it comes down by itself**,
with Arlen informed but not involved. That needs code that runs on a server, which GitHub
Pages cannot do, so the site moves to Cloudflare's free tier first.

This is the first round of a longer path (see "Later rounds"). The owner chose to scope it
to announcements: "The ability for Jim to post ad hoc announcements like this morning's,
to be showcased on the site's homepage."

## Goals

1. **Move hosting from GitHub Pages to Cloudflare** with no visible change to the site.
   Every page, PDF, calendar file and the subscribe feed stay at the same URL on
   `https://www.sastamps.org/`.
2. **Self-service announcements for Jim**, as the owner confirmed:
   - **Sign-in:** an emailed one-time code; there is no password.
   - **Form fields:** a headline, one or two lines of text, an optional button (an external
     link, or a details page written in the same form), and show-from / show-until dates.
   - **Preview** of exactly how it will look on the homepage, then **Publish**.
   - **Placement:** the slot the auction banner uses today, under the newsletter banner and
     above the About section.
   - **Expiry:** it disappears by itself after its show-until date.
   - **Owner notice:** Arlen gets an email whenever something is published, edited or
     taken down.
   - **Changes:** Jim can edit an announcement, or take it down early.
3. **Launch milestone: the first real announcement Jim posts himself**, start to finish,
   without Arlen's help.

**Two releases** (owner decision, 2026-10-22):

- **Release 1: hosting move only.** Nothing visible changes. It ships when the cutover UAT
  passes.
- **Release 2: announcements.** Turn on `/admin/` and the homepage slot. It ships only after
  Arlen clears the go-live checklist below.

**The 2026 Blue-Chip Auction banner stays hard-coded** in `index.html`, with its existing
Google Tasks (reword Nov 7, take down Dec 12) (owner decision). It is not migrated: the new
system will not be live in time to matter. If release 2 lands before Dec 11, the hard-coded
banner and an announcement must never both show. Remove the hard-coded one in the same
change that publishes any replacement.

## Non-goals (later rounds or unscheduled)

- Newsletter upload by Jim. This is round 2, described below so this round does not block it.
- An AI agent triggered by an upload (round 3).
- A contact/RSVP handler to replace FormSubmit; club email addresses (Email Routing); a
  members-only archive; online auction lots and photos; real security headers. All of these
  are unscheduled.
- Any change to page content or design beyond the announcement slot.

## Anti-goals: failure even if it technically works

- **Jim has to touch HTML, Markdown syntax, code, git or GitHub.** The form is the whole
  interface.
- **The site breaks when the new parts break.** If the announcements store or function is
  down or misconfigured, every page must still serve exactly as today, with no banner.
- **Any recurring cost.** Owner constraint: zero spend. Everything stays inside Cloudflare's
  free tier, and nothing silently upgrades.
- **Code bypasses the local CI gate.** Code still reaches `main` only through
  `local-ci-gate.sh`. Jim's announcements are content, not code, and are exempt by design.
  This exemption must not grow into a code path.
- **Anyone beyond the allowlist can publish to the homepage.**

## Constraints

- **Free tier only.** Verify each limit against Cloudflare's current published limits before
  building. The numbers drift, and the ones in this document are from memory.
- **The build contract stays.** `npm run build` produces `_site/`, which
  `scripts/check-site-build.js` verifies, and `_site/` is exactly what gets served. The
  build never writes a tracked file.
- **The local CI gate (`bin/ci`) is the merge gate**, on Arlen's machine, for every code
  change. Any new code (the Worker) gets its tests into `bin/ci`.
- **The owner maintains this alone, as a volunteer**, so keep the moving parts few and
  conventional.
- **Domain facts (checked 2026-10-22):**
  - registered at Gandi, in Arlen's account, renewing April 2027;
  - DNS also at Gandi: apex A records point to GitHub Pages, and `www` is a CNAME to
    `arlenagreer.github.io`;
  - no MX, TXT or CAA records, so there is no email to preserve.
- **Content Security Policy:** pages set CSP by `<meta>` (`connect-src 'self'`). Whatever
  renders announcements must fit inside it or change it deliberately.
- **All text Jim enters is untrusted at render time.** Escape it. (The client code already
  funnels rendering through `escapeHTML`.)

## Decided by the owner

- **Scope:** hosting move plus announcements only.
- The announcement experience in Goal 2, confirmed as described ("right on the button").
- **Approval:** Jim's own preview is his approval for announcements; there is no second
  approver. (The two-person approval below applies to newsletters, round 2.)
- **Who signs in:** Jim and Arlen only. The owner decided against adding Al Lozano for now.
  Adding someone later means adding one email to the Access allowlist.

## Design: my calls, which the builder may change with reason

### Hosting
- Serve `_site/` as static assets from a single Cloudflare Worker (Workers static assets).
  The same Worker handles the announcement routes, which keeps one deployable unit.
  Cloudflare Pages plus Functions is an acceptable alternative.
- **DNS:**
  - Move the zone's nameservers from Gandi to Cloudflare (free plan), and keep the
    registration at Gandi.
  - Recreate apex and `www` on Cloudflare, with the apex redirecting to `https://www.`
    (the canonical host the sitemap and `rel=canonical` already use).
  - Cloudflare Access needs the zone on Cloudflare, which is why this is not a CNAME-only
    setup.
- **Cutover:**
  1. Deploy to the `*.workers.dev` address.
  2. Run the full UAT there.
  3. Lower the Gandi TTLs a day ahead.
  4. Switch nameservers.
  5. Keep GitHub Pages deploying in parallel for one week.
- **Rollback:** point the nameservers back to Gandi, where the old records are unchanged.
- **Deploy:**
  - Replace the `deploy-pages` job in `.github/workflows/ci.yml` with a `wrangler deploy` of
    the same tested `_site/` artifact, using a scoped API token kept as a repository secret.
  - Actions minutes are about the same as today.
  - Deploying from Arlen's machine after the gate is the zero-minutes alternative, but it
    loses the guarantee that what deploys is what CI built.
  - Remove `CNAME` and the Pages job only after the parallel week.

### Announcements
- **Storage:** Cloudflare D1, one `announcements` table:
  - id, headline, body, button label, button target (external URL or details slug),
    details body, show_from, show_until;
  - created/updated by and at;
  - status: draft, published or taken down.

  D1 is chosen over KV for queries by date and for a history of what was shown. Nothing is
  hard-deleted; taking an announcement down sets its status.
- **Rendering on the homepage:** the Worker injects the banner into `index.html` at the
  edge (`HTMLRewriter`) when serving it.
  - No client-side fetch, so there is no flash and no CSP change.
  - It works without JavaScript, and search engines see it.
  - If the D1 query fails or times out (short budget), it serves the page unchanged.
  - Show at most two current announcements, stacked, soonest-ending first.
  - Times are America/Chicago dates: show from 00:00 on show_from to 23:59 on show_until.
- **Details pages** are served at `/announcements/<slug>`, rendered by the Worker from the
  site's own page shell (the header, nav and footer of any page), so they match the site.
  - *(my call)* After its show window, or once taken down, a details page **keeps
    serving**, marked "This event has passed", so links already emailed to members never
    break.
  - *(my call)* A draft's or an upcoming announcement's details page is **not** reachable
    by its slug (404). It is visible only through the admin preview.
- **Text formatting** without syntax for Jim: plain text, with blank lines making
  paragraphs, bare URLs and email addresses becoming links, and a small "bold" toolbar
  button. Everything else is escaped, and no raw HTML is ever accepted.
- **Admin:**
  - The admin page lives at `/admin/`. It lists current, upcoming and past announcements,
    has the form, a live preview using the same renderer as the homepage, and Publish,
    Save draft, Edit and Take down buttons.
  - Cloudflare Access protects `/admin/*` and `/api/admin/*` (One-time PIN, allowlist of
    Jim's and Arlen's emails).
  - The Worker also verifies the Access JWT (`Cf-Access-Jwt-Assertion`) on every admin API
    call, as defence in depth. A request without a valid token is refused, never trusted
    from a header alone.
- **Notice email to Arlen** on publish, edit or take-down, naming who made the change
  *(my call: it costs nothing and matters if more people get access)*: the Worker's
  email-sending binding to a verified destination (Arlen's address).
  - Verify that the binding is free and works without Email Routing on an MX the site does
    not have.
  - If not, a free transactional email tier is acceptable.
  - A failed notice never blocks a publish. It is logged and shown on the admin page.
### Tests (in `bin/ci`)
- Unit tests for the renderer and escaping, including hostile input.
- Date-window selection, across DST and the Chicago day boundary.
- The fail-open path: a D1 error must still return `index.html` byte-identical to the
  static build.
- Admin API authorization: no token, a bad token, a valid token from a non-allowlisted
  email.
- `check-site-build` keeps passing unchanged.

### UAT
- On `workers.dev`, then on the live domain:
  - Jim's full flow on a test announcement, through sign-in, preview, publish, see it on
    the homepage, edit, take down;
  - expiry checked by setting show_until to yesterday.
- Every existing page, PDF and calendar URL is spot-checked for the same response.

## Left to the builder

- Wrangler and project layout.
- Test framework for the Worker (keep it runnable offline in `bin/ci`).
- Exact D1 schema details and migrations.
- Admin page styling (reuse the site CSS).
- How the page shell is obtained for details pages.
- The precise fail-open timeout.

## Later rounds (context only, not to build now)

**Round 2: newsletter upload.**
1. Jim uploads the PDF and picks the edition on the same admin page. It is stored in R2.
2. Arlen is emailed the file and the command to run `/philatex-update`.
3. The result is a normal PR. Arlen *or* Jim approves it from a preview link, and the first
   approval publishes it.
4. "Approve" queues the change: the merge itself still goes through the local CI gate.

A draft upload could return the proofreading report to Jim before printing (proposed, not
decided).

**Round 3: agent.** The upload triggers an agent that runs the same
`.claude/skills/philatex-update` skill unattended. Same approval step. Where it runs is
undecided: a cloud routine or a watcher on Arlen's Mac. Not GitHub Actions, because of the
minutes budget.

## Go-live checklist for release 2 (Arlen)

- Tell the Board that Jim will be able to post homepage announcements (owner's call on
  whether that is a courtesy or an approval).
- Confirm that Jim wants to use the admin page. Send him a short how-to email with
  screenshots of the form and the preview.
- Do a dry run on the live domain: Arlen posts a test announcement, then takes it down.
