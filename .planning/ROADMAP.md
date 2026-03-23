# Roadmap: SAPA Website

## Milestones

- ✅ **v1.0 Fix Site Issues** — Phases 1-3 (shipped 2026-02-16)
- ✅ **v1.1 Restore Newsletter Archive** — Phases 4-6 (shipped 2026-03-09)
- 🚧 **v1.2 Philatex Q2 2026 Content Update** — Phases 7-9 (in progress)

## Phases

<details>
<summary>✅ v1.0 Fix Site Issues (Phases 1-3) — SHIPPED 2026-02-16</summary>

- [x] Phase 1: Asset Loading (2/2 plans) — completed 2026-02-16
- [x] Phase 2: Build & Deployment (2/2 plans) — completed 2026-02-16
- [x] Phase 3: Display & UX Fixes (3/3 plans) — completed 2026-02-16

</details>

<details>
<summary>✅ v1.1 Restore Newsletter Archive (Phases 4-6) — SHIPPED 2026-03-09</summary>

- [x] Phase 4: PDF Downloads (2/2 plans) — completed 2026-03-09
- [x] Phase 5: Reference Data (1/1 plan) — completed 2026-03-09
- [x] Phase 6: Archive Page (1/1 plan) — completed 2026-03-09

</details>

### 🚧 v1.2 Philatex Q2 2026 Content Update (In Progress)

**Milestone Goal:** Update the website with all content from the Philatex Second Quarter 2026 newsletter (Vol. 132, Issue #2)

- [ ] **Phase 7: Newsletter and Data** — Add Q2 2026 PDF, update newsletters.json, add meetings to meetings.json, generate ICS files
- [ ] **Phase 8: Page Updates** — Update newsletter.html, meetings.html, and index.html with Q2 2026 content
- [ ] **Phase 9: Verification and Announcements** — Verify BOG roster, mailing address, TSDA shows, and add announcements

## Phase Details

### Phase 7: Newsletter and Data
**Goal**: Q2 2026 newsletter PDF and all data files are current and ready for page rendering
**Depends on**: Nothing (first phase of v1.2)
**Requirements**: NL-01, NL-02, MTG-01, MTG-04
**Success Criteria** (what must be TRUE):
  1. Q2 2026 newsletter PDF exists at the correct path under `public/` with the standard naming convention
  2. `newsletters.json` contains a Q2 2026 entry with articles, highlights, and correct file metadata
  3. `meetings.json` contains all 13 April–June 2026 meeting entries with correct types, dates, and details
  4. ICS calendar files exist for each of the 13 Q2 2026 meetings and are downloadable
**Plans**: TBD

### Phase 8: Page Updates
**Goal**: All three pages (newsletter, meetings, homepage) display Q2 2026 content to visitors
**Depends on**: Phase 7
**Requirements**: NL-03, NL-04, MTG-02, MTG-03, HOME-01, HOME-02, HOME-03
**Success Criteria** (what must be TRUE):
  1. Newsletter page "Current Issue" section displays Vol. 132 Issue #2 (Q2 2026) as the current newsletter
  2. Newsletter page "2026 Newsletter Archive" section lists the Q2 2026 entry with a working PDF link
  3. Meetings page schedule section shows all 13 April–June 2026 meetings
  4. Meetings page "Download complete schedule" button generates or links to a file that includes Q2 2026 meetings
  5. Homepage "Upcoming Meeting" reflects the next meeting from the Q2 2026 schedule, "Read Latest Issue" links to the Q2 PDF, and "Latest Issue Highlights" shows Q2 content
**Plans**: TBD

### Phase 9: Verification and Announcements
**Goal**: Site information is accurate and Q2 2026 announcements are visible to members
**Depends on**: Phase 7
**Requirements**: VER-01, VER-02, VER-03, ANN-01, ANN-02, ANN-03
**Success Criteria** (what must be TRUE):
  1. Board of Governors roster on the site matches the Q2 2026 newsletter listing (including Rick Cross as Secretary)
  2. Mailing address on the contact page matches the newsletter (c/o Al Lozano, Helotes)
  3. TSDA stamp show schedule is visible on the site, including the San Antonio May 8-9 show
  4. New members (Becky Peterson, Greg Peterson, Leo Palencia) are acknowledged on the site
  5. Annual Club Picnic (June 19) and Joe Perez program (May 29) details are visible to visitors
**Plans**: TBD

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Asset Loading | v1.0 | 2/2 | Complete | 2026-02-16 |
| 2. Build & Deployment | v1.0 | 2/2 | Complete | 2026-02-16 |
| 3. Display & UX Fixes | v1.0 | 3/3 | Complete | 2026-02-16 |
| 4. PDF Downloads | v1.1 | 2/2 | Complete | 2026-03-09 |
| 5. Reference Data | v1.1 | 1/1 | Complete | 2026-03-09 |
| 6. Archive Page | v1.1 | 1/1 | Complete | 2026-03-09 |
| 7. Newsletter and Data | v1.2 | 0/TBD | Not started | - |
| 8. Page Updates | v1.2 | 0/TBD | Not started | - |
| 9. Verification and Announcements | v1.2 | 0/TBD | Not started | - |
