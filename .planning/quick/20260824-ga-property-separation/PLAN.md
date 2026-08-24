---
task: Separate the sastamps GA4 property from American Laboratory Trading's GA account
slug: ga-property-separation
created: 2026-08-24
status: superseded-in-part-by-DECISION.md — see corrections there
---

# GA property separation — sastamps vs American Laboratory Trading

## Trigger

Susan Butch (VP Technology, ALT) forwarded an automated Google Analytics
performance report (period Jul 16 – Aug 12 2026) that she received at
`sbutch@alt.bio`, asking: *"FYI it looks like SAStamps site somehow got linked
to the ALT GA account?"*

Every page in that report is a San Antonio Philatelic Association page. No ALT
pages appear at all.

## What was verified (2026-08-24)

| # | Finding | How verified |
|---|---------|--------------|
| 1 | sastamps.org reports to `G-XW5LFQ52YR` | page source, live site + repo |
| 2 | americanlaboratorytrading.com reports to `G-7WEN7DMP01` | page source, live site |
| 3 | Neither tag references the other as a connected/forwarded destination | fetched `googletagmanager.com/gtag/js?id=<ID>` for both; `G-XW5LFQ52YR` references only itself + container `GT-5R7RJNBK`; `G-7WEN7DMP01` references only itself + `AW-16461674706` + its own containers |
| 4 | The report is 100% sastamps pages, 284 active users | the forwarded email itself |
| 5 | Tag committed 2025-04-06 (`7feca52 "Added Google Analytics"`) | git log |
| 6 | Measurement ID is hardcoded in 11 files, 22 occurrences | grep; confirmed by `scripts/retag-analytics.sh --dry-run` |
| 7 | No build step injects or regenerates the GA tag | read `scripts/build.js`, `package.json`; `add-analytics.js` is a one-shot |
| 8 | GA Admin API unreachable from this environment | OAuth token holds no `analytics.*` scope; `ListAccounts` → 403 `ACCESS_TOKEN_SCOPE_INSUFFICIENT` |

**Conclusion on data:** findings 1–3 establish that the two sites' hit data is
**not commingled**. They are separate GA4 properties with independent Google
Tags and no forwarding between them. Arlen's reassurance to Susan was accurate.

**Conclusion on containment:** the sastamps *property* is *hypothesised* to sit
inside ALT's GA *account*. ⚠ See DECISION.md — adversarial review split this into
three separable claims, two of which have NO direct evidence. Because GA4 account-level access inherits down to
every property in the account, Susan's legitimate ALT access carries with it
access to the sastamps property — and its automated performance emails.
This is an inference, not a direct observation (see finding 8).

## The trap in the obvious fix — CONDITIONAL, see DECISION.md

"Just remove Susan's access to the sastamps property" does not work if the
access is **inherited from account level** — GA4 does not allow revoking
inherited access at the property level. Removing it would mean downgrading her
role on ALT's own account, which is legitimate access she needs.

Consequence (only if access is in fact inherited — unverified): there is no
stopgap Arlen can perform alone. The noise fix and the
governance fix are the same action — get the property out of ALT's account.
Susan can silence the emails herself in the interim via the unsubscribe link in
that email, or via Analytics → user settings → Performance Email Notification
Settings.

## Root cause

When creating a GA4 property, the Account selector defaults to the last-used
account. ALT's account was active, so the new SAPA property landed there
silently. Nothing warns you, which is why it went unnoticed for ~16 months —
the only symptom is other people in that account receiving reports.

## Deliverable in this branch

`scripts/retag-analytics.sh` — an atomic, self-verifying re-tag tool for the
recreate branch of the decision tree. Rewrites all 22 occurrences, hard-asserts
zero surviving occurrences of the old ID, and carries a `--verify-live` mode
that checks the deployed pages. ⚠ CORRECTED: GitHub Pages does NOT serve straight
from the repo — `.github/workflows/ci.yml:89` defines `deploy` with `needs: test`,
so a test failure silently skips the deploy.

Tested 2026-08-24: rejects malformed IDs, rejects a no-op re-tag, rewrote 11
files / 22 occurrences with 0 remaining (this file preserved), and `--verify-live`
correctly detected a mismatch against the live site. No measurement ID has been
changed.

Three defects were found and fixed after the first commit — it rewrote its own
audit trail, it misstated the deploy model, and a `pipefail` interaction aborted
it with exit 1 *after* a correct rewrite. See commits `bcaaf2a` and `0cfde68`.

⚠ On the preferred remediation branch (a property move) the measurement ID does
not change, so **this script is not needed at all**. It exists for the re-tag
branch only.

## Out of scope (flagged, not fixed)

`js/utils/analytics.js` calls `gtag('config', GA_MEASUREMENT_ID)` where
`GA_MEASUREMENT_ID` is the placeholder `'G-XXXXXXXXXX'` from
`js/constants/index.js`. That placeholder is compiled into the shipped
`dist/js/*.min.js` bundles. It is an inert no-op — it does not send anything to
ALT — but `trackPageView()` is effectively dead code. Separate pre-existing bug.
