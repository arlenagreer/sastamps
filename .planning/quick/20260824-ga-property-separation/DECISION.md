---
task: GA property separation — diagnosis checklist and remediation decision tree
created: 2026-08-24
status: blocked-on-GA-console-access
---

# Decision document

## Corrections to the first-pass analysis

Adversarial review overturned parts of the initial reasoning. Recorded because the
*reasoning* was wrong even where the conclusion held.

1. **"Different measurement IDs ⇒ different properties" is invalid.** A GA4 property
   supports up to 50 data streams, each with its own `G-` ID, all reporting into one
   property. Measurement IDs are *stream* identifiers and say nothing about property
   containment. The no-commingling conclusion stands, but on other evidence.
2. **A live scenario was missed:** `G-XW5LFQ52YR` could be a stream inside a *dormant,
   traffic-free* ALT property. That survives every established fact — the report only
   rules out ALT's *primary* property — and it flips remediation from a zero-cost move
   to a history-losing re-tag.
3. **"Account containment" is three claims, not one.** C1 Susan holds *some* access to
   the property — near-certain. C2 that property is in the same *account* as ALT's —
   **no direct evidence**. C3 the mechanism is account-level inheritance rather than a
   direct grant — **no direct evidence**, and it presumes Susan's ALT role is
   account-scoped rather than property-scoped.
4. **Arlen's own guess carries no evidential weight.** "I may have used the wrong
   account id" has three readings; the most literal (wrong ID pasted into the pages) is
   falsified by 16 months of git history. Using it as evidence for the diagnosis it
   inspired is circular.
5. **The 16-month latency is unexplained.** Equally consistent with a Google product
   rollout and with a *2026 access change* — which would make the interesting event a
   permissions change, not a 2025 filing error.

## What is actually established

Hit data is **not** commingled — on three independent grounds, none of which is the
ID-difference argument:
- **Disjoint tag destination chains.** `G-XW5LFQ52YR` → `{G-XW5LFQ52YR, GT-5R7RJNBK}`;
  `G-7WEN7DMP01` → `{G-7WEN7DMP01, GT-M39VH56, AW-16461674706, GT-WKX3SPGD}`. This is
  the only method that sees connected site tags, which are invisible to page source.
- **Zero ALT pages** in a report whose totals are 284 users / 1.1K events — brochure-site
  shape, not a WooCommerce catalog with ~4,499 indexable URLs.
- **16 months of git history**: `G-7WEN7DMP01` has never appeared in a shipped sastamps page.

Cleared false lead, do not re-raise: `UA-25695442-4` in sastamps history is from
`node_modules/lunr/index.html` (Lunr.js's own demo page), removed in `3eb04b6`.

## Diagnostic checklist — read-only, change nothing

**Free, before touching GA:**
1. Ask Susan one question: **"Is this the first such email, or the first you've
   mentioned?"** First-ever ⇒ benign rollout. Long-running ⇒ 2025 filing error.
   Recently-started-after-years ⇒ suspect a 2026 access change. Cheapest discriminator
   in the whole analysis.
2. Check her copy's headers: is `sbutch@alt.bio` an individual mailbox, or an alias /
   group / delegated mailbox? If the latter, the grant is on a different identity and
   the containment theory is aimed at the wrong thing.

**GA console, signed in as `arlenagreer@gmail.com`. Screenshot everything — this is both
the audit trail and the rollback list.**

3. **Admin → Account settings → Account details.** Record the **numeric Account ID**
   holding `G-XW5LFQ52YR` and the one holding `G-7WEN7DMP01`.
   Equal ⇒ containment confirmed. **Unequal ⇒ diagnosis refuted → Branch D.**
4. **Admin → Data streams** on the sastamps property. Exactly one stream ⇒ standalone
   property, move available. More than one, or ALT's stream present ⇒ **Branch B**.
5. **Property access management → filter to Direct permissions.** Susan in the account
   list but absent from Direct, role not editable ⇒ inherited. Present under Direct with
   a working Remove ⇒ **direct grant, which travels with the property on a move** — this
   is where a "successful" move silently fails. A *group* address ⇒ removing her
   individually is a no-op.
6. **Account access management** on the containing account. Is any `@alt.bio` identity an
   Administrator? **If the only Administrator is `arlenagreer@gmail.com`, ALT does not
   control its own analytics account** — that outweighs the email. Count ALT users with
   Viewer-or-above: that count is the exposure.
7. **Organization field** on both accounts. Any GMP org ⇒ org admins hold invisible
   inherited Administrator, so an empty access list does not exonerate; check
   `marketingplatform.google.com` → Administration → Users. Also gates cross-account moves.
8. **Product links → Google Ads**, and **BigQuery links**, on the sastamps property. An
   ALT Ads link means SAPA visitors feed ALT remarketing audiences; a BigQuery link into
   an ALT GCP project means raw event rows in ALT storage. Either raises severity to 3.
9. **Data retention.** Default is 2 months. If never changed, the event-level history at
   stake is 2 months, not 16 (standard aggregated reports are unaffected). Set to 14
   months now regardless — free, one click.
10. **Enumerate every other property in that account.** The account-selector default is
    not property-specific. A low-traffic misfiled sibling generates no email and would
    never surface. This is the highest-value minute in the process.

## Remediation

**Phase 0 — reply to Susan (no authorization needed).** The data is not commingled,
verified three ways; what is shared is account containment and visibility; the fix is a
property relocation needing her go/no-go. **Explicitly: please do not delete the
property** — GA4 trashes it for 35 days, then it is gone permanently.

**Do not ask her to click unsubscribe.** The endpoint's scope is undocumented; the
documented alternative (My Preferences → Performance Suggestions and Updates) is
definitely broader and would kill the class across *every* property she can see,
including ALT's own. Suppressing it also removes the only external indicator that the
misplacement exists.

**Phase 1 — run the checklist. Change nothing.**

**Phase 2 — human gate.** A property move is semi-irreversible: reversing it needs both
accounts' admins to cooperate. "Not a big deal," said about an email, is not
authorization to restructure a public company's GA account. Get written go/no-go.

### Branch A — standalone property inside ALT's account (expected) ← preferred
Move it. `Admin → Property settings → Move property`, choosing **"Replace existing
property permissions"** (not Keep — Replace is the only option that reliably severs ALT
visibility). **The measurement ID does not change, so no file is touched, no deploy
happens, and there is no collection gap.** All history, streams, settings and links move
with it. Requires **Administrator *and* Editor on both** accounts — if Arlen holds only
Editor on ALT's, he cannot execute this and it becomes Susan's action.
Create the destination account under a **SAPA-controlled identity**, not
`arlenagreer@gmail.com` — that just relocates the bus-factor problem.
Then: verify no `@alt.bio` identity remains in Property access management; unlink any ALT
Ads/BigQuery links; **close `chore/ga-property-separation` unmerged — it is contingent
work built ahead of its trigger.**

### Branch B — it is a stream inside an ALT property
A property cannot be split, so the move is unavailable. This is also the one world where
"no cross contamination" is partially wrong at the report level. New property under the
SAPA account, then re-tag via `scripts/retag-analytics.sh`, **after** deleting
`scripts/add-analytics.js` (it appends rather than replaces — re-running it double-counts
every pageview) and resolving the `G-XXXXXXXXXX` placeholder in `js/constants/index.js`.
Push, **wait for the Actions `deploy` job** (`ci.yml` has `deploy: needs: test`; a test
failure silently skips it), then `--verify-live`, then gate on **GA4 Realtime** — the
string check is not verification. Run both properties in parallel one full cycle before
retiring anything.

### Branch C — the move is blocked
Usually a GMP-org mismatch or missing roles. An org admin can link the accounts, or the
destination can be created without an org. If genuinely unblockable, fall through to B.

### Branch D — account IDs differ
Containment refuted. Remove the `@alt.bio` grant from the property's access list
(record the list first). Audit that account's users. Severity drops to 1.

### Phase 5 — the part worth more than the rest
Decide with Susan whether `arlenagreer@gmail.com` should hold standing access to ALT's GA
account at all, or whether that should be an ALT-issued identity inside ALT's Workspace,
SSO, MFA and offboarding controls. **A personal, non-corporate identity holding
Editor-or-above on a NASDAQ-listed subsidiary's analytics account is what made this
possible**, and it was in no version of the original plan.

**Explicitly do not:** delete the property to tidy up (deletion is the failure mode, not
the fix); link BigQuery "to preserve history" (forward-only, and pointing it at an ALT
project makes the finding worse); escalate as a privacy incident (it is not one).

## Reversibility ranking
notification setting — seconds, reversible · re-tag in git — `git revert` · user removal —
reversible *only if the access list was recorded first* · **property move — treat as
one-way** · **property delete — 35 days, then never**.

## Severity: 2/5
Susan is right on urgency and wrong to let it close the ticket. Nothing is bleeding, no
ALT data left ALT, no stream is commingled, no billing impact. It still warrants a proper
fix on a weeks horizon, chiefly because the one failure mode that matters is **deletion by
routine ALT housekeeping** — an admin doing an access review finds an unrecognized
stamp-club property, deletes it, and nobody at SAPA is watching the 35-day window. The
window to fix it cheaply is open now, while Arlen holds access on both sides and both
parties are on good terms. Rises to 3 on any of: an ALT Ads link, a BigQuery export into
an ALT project, the ALT account sitting in a GMP org or shared with an agency, or page
titles embedding SAPA member names.

---

# CONFIRMED via GA Admin API — 2026-08-24

Obtained a one-hour read-only `analytics.readonly` token (OAuth loopback, no refresh
token retained) and queried the Admin API directly. Required enabling
`analyticsadmin.googleapis.com` on project `gws-cli-arlena-2026` — reversible, and
unrelated to the gws credentials.

## The account tree

```
accounts/97359010  "AmericanLaboratoryTrading"   (created 2017-04-13)
    properties/373649367  "AmericanLaboratoryTrading - GA4"  created 2023-05-02
    properties/484761829  "SAStamps"                         created 2025-04-06T14:48:59Z
```

**Containment CONFIRMED.** `properties/484761829.parent == accounts/97359010`, the same
account holding ALT's own property. The creation timestamp matches commit `7feca52`
(2025-04-06) to the day.

## Every open scenario, now closed

| Question | Answer |
|---|---|
| Is SAStamps a standalone property or a stream inside an ALT property? | **Standalone.** 1 web stream, `G-XW5LFQ52YR`, `propertyType: PROPERTY_TYPE_ORDINARY` |
| Could it be a GA360 hostname-filtered subproperty? | **No.** `serviceLevel: GOOGLE_ANALYTICS_STANDARD`, `propertyType: ORDINARY` on both |
| Data commingling? | **None.** Two ordinary properties, one stream each, disjoint measurement IDs |
| SAStamps → ALT Google Ads links? | **0** (ALT's own property has 2 — expected, its own) |
| SAStamps → BigQuery export? | **0** (v1alpha `bigQueryLinks`, HTTP 200, empty) |
| Other misfiled properties in ALT's account? | **None.** Exactly 2 properties, both accounted for |
| Event-level history at stake | **2 months** — `eventDataRetention: TWO_MONTHS`, the default, never changed |

The three severity-raising conditions (Ads link, BigQuery export, 360 subproperty) are all
**absent**. Severity stays at **2/5**.

## Verdict: Branch A

`properties/484761829` is a standalone ORDINARY property inside ALT's account. **The
property move is available.** The measurement ID does not change, so:

- **no file in this repo needs to change**
- **no deploy, no collection gap**
- **`scripts/retag-analytics.sh` is NOT needed — close this branch unmerged**

## Incidental config errors found (unrelated to the crosslink)

1. **Stream `defaultUri` is `https://www.sastamps.com`** — the site is `www.sastamps.org`
   (see `CNAME`). Wrong metadata; does not affect collection, which keys off the
   measurement ID.
2. **`timeZone: America/Los_Angeles`** on a San Antonio, Texas club property. Reporting
   days are bucketed in Pacific time. Should be `America/Chicago`. Changing it is not
   retroactive — it affects future data only.

## Still requires the console

- **Property access management** — whether Susan's grant is direct or inherited. Needs
  `analytics.manage.users.readonly`, a more sensitive scope that was deliberately not
  requested. A direct grant **travels with the property on a move**.
- **Whether a GMP organization exists** — the v1beta `Account` resource exposes no
  organization field.
- **The move itself.** `Property.parent` is annotated Immutable; there is no move RPC in
  v1beta or v1alpha. Google's docs state the Property-Moving UI is the only mechanism.
