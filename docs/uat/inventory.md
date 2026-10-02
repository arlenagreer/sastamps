# SAPA website: UAT coverage inventory

Generated 2026-10-01 from `origin/main @ cb25e31` and a read-only crawl of `https://www.sastamps.org`. Every row comes from the page HTML, the page bundle source in `js/`, the data files, or the live crawl. The same rows are in `inventory.json` (machine-readable).

This is an inventory only: nothing here was fixed, and no form was submitted.

## How to read a row

- **Outcome check**: what proves the feature does what a real person expects, end to end. A page returning 200 is not an outcome.
- **Risk**: high = a visitor-facing failure could go unnoticed; medium = visible but misleading or degrading; low = cosmetic or internal.
- **Status**: `known` = on the known-issues list; `finding` = code or crawl evidence that it fails today; `suspect` = evidence it may fail, needs the browser to confirm; `verify` = no evidence either way.
- **Personas**: PM = Prospective member; CM = Current member; DL = Dealer at the bourse; NR = Newsletter reader; CC = Someone contacting the club; AS = Returning archive searcher.

## Summary

115 rows. Risk: 21 high, 50 medium, 44 low. Status: 13 finding, 9 suspect, 5 known, 88 verify.

| Page | Rows |
| --- | --- |
| global | 15 |
| index.html | 13 |
| about.html | 2 |
| meetings.html | 19 |
| newsletter.html | 6 |
| archive.html | 5 |
| membership.html | 4 |
| resources.html | 15 |
| glossary.html | 10 |
| contact.html | 13 |
| search.html | 8 |
| 404.html | 2 |
| offline.html | 1 |
| showcase/ | 1 |
| data/calendar/ | 1 |

## High-risk rows not on the known-issues list

- **G-06** (verify): Footer mailto:`loz33@hotmail.com` (club secretary; also on meetings, contact, glossary, archive)
- **G-12** (finding): Client error reporting (logger.logToRemote POSTs errors to /api/logs on https)
- **H-03** (verify): Static "Upcoming Meetings" Q4 2026 table (13 cells, hand-written HTML)
- **H-05** (verify): "Download Complete Q4 2026 Schedule" (public/sapa-q4-2026-meetings.ics, download attr)
- **H-06** (finding): "View Individual Meeting Downloads" button -&gt; meetings.html
- **M-01** (verify): Location & Times block (address, Building 1, doors/BOG/start)
- **M-03** (verify): Meeting schedule list (#meeting-schedule-container, JS from data/meetings/meetings.json, current quarter)
- **M-08** (finding): Per-meeting "Add to Calendar" link (.btn-calendar)
- **M-10** (suspect): Calendar: which days have meetings
- **M-11** (verify): Calendar day click -&gt; meeting modal (#event-modal)
- **M-14** (verify): "Download Complete Q4 2026 Schedule" .ics (same file as H-05)
- **M-15** (finding): Instruction text "Click the calendar-plus icons above for individual meetings"
- **M-16** (verify): Google Maps iframe (maps.google.com ... output=embed)
- **MB-01** (suspect): "Download Membership Application" (downloads/SAPA_membership_application.pdf, 2.2 MB)
- **C-01** (verify): Contact form, JS path (fetch POST to the FormSubmit AJAX endpoint for the form action address)
- **C-02** (verify): Contact form, no-JS path (native POST, _next -&gt; contact.html#sent)
- **C-03** (verify): Relay refusal path (FormSubmit success:"false", e.g. activation pending)
- **S-01** (verify): Search box (#searchInput) + Enter + search button (inline performSearch; lunr 2.3.9 from unpkg with SRI; dist/data/search-index.json 298 KB + search-documents.json, 94 docs)
- **S-03** (finding): Result links (doc.url: /newsletter.html#2026-Q4, /meetings.html#2026-10-09, /resources.html#&lt;id&gt;, /glossary.html#&lt;id&gt;)

## Inventory

### global

| ID | Element / feature | User's goal | Outcome check | Personas | Risk | Status | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| G-01 | Skip-to-content link (a.skip-link -&gt; #main-content) | Keyboard user jumps past the navigation. | First Tab from page load focuses the link; Enter moves focus into main content (next Tab lands inside &lt;main&gt;). | PM CM | low | verify | every page header |
| G-02 | Site title link (header) -&gt; index.html | Return to the home page from anywhere. | Click from every page loads index.html (200). | PM CM | low | verify | every page header |
| G-03 | Hamburger menu (CSS-only #menu-toggle-checkbox) at phone width | Open the menu on a phone and reach every page. | At 375px the toggle opens/closes, all 10 links are visible and tappable without horizontal scroll; Escape/outside tap closes it (JS close only exists on about/archive/membership/404 via initMobileMenu / script.js). | PM CM DL NR CC AS | medium | verify | index.html nav; js/pages/about.js initMobileMenu |
| G-04 | Primary nav: Home, About, Meetings, Newsletter, Archive, Membership, Resources, Glossary, Contact, Search | Move between sections. | Each of the 10 links loads the right page with 200 and the current page is indicated; same set on every page (glossary.html uses its own .nav-link markup, 404.html uses absolute paths). | PM CM DL NR CC AS | medium | verify | crawl: 10 sitemap pages all 200 |
| G-05 | Footer quick links (set differs per page: index lacks Archive/Search, about says "Newsletter Archive") | Find a section from the footer. | Every footer link resolves (200) and the set is consistent enough that no page lacks a route to Archive/Search. | PM CM | low | verify | footer of each page |
| G-06 | Footer mailto:`loz33@hotmail.com` (club secretary; also on meetings, contact, glossary, archive) | Email the club directly. | Clicking opens a mail draft to `loz33@hotmail.com`; a test email sent there gets a human reply from the club (mailbox is live and read). | PM CC DL | high | verify | every page footer |
| G-07 | Footer Facebook link (facebook.com/groups/305765941949570, new tab) | Join or view the club Facebook group. | Opens the SAPA group (not an error or another group) in a new tab; group is active and admits join requests. | PM CM | low | verify | crawl: 200 |
| G-08 | Google Fonts (Merriweather, Open Sans) + dist/js/font-loading.min.js (localStorage flag) | Readable, on-brand text. | Text renders in the web fonts; with storage blocked and with fonts.googleapis.com blocked the page still renders readable fallback text (covered by test:font-loading). | PM | low | verify | js/font-loading.js |
| G-09 | Font Awesome 6.4.0 (cdnjs) icons that carry meaning (calendar-plus, gavel, PDF, times-circle) | Understand icon-labelled content. | Icons render; with cdnjs blocked no instruction becomes meaningless (meetings.html text tells users to "click the calendar-plus icons"). | PM CM | medium | verify | crawl: cdnjs 200 |
| G-10 | Retired service worker cleanup (retireServiceWorkers in about/archive/membership bundles + script.js; inline in glossary.html) | A returning visitor sees this quarter's content, not a cached copy. | In a browser that still holds the old sapa-cache-v1 worker, visiting the HOME page alone shows current content. Note: home/meetings/newsletter/contact/resources/search bundles do not call the cleanup, so a home-only visitor may keep stale pages until they open about/archive/membership/glossary/404. | CM NR | medium | suspect | js/utils/service-worker.js; grep retireServiceWorkers js/pages |
| G-11 | Web app manifest (site.webmanifest) and favicons | Add the site to a phone home screen with the club icon. | Add-to-Home-Screen shows the SAPA icon and name; manifest icons (favicon.ico declared 192/512 image/x-icon) load. | CM | low | verify | crawl: manifest 200 |
| G-12 | Client error reporting (logger.logToRemote POSTs errors to /api/logs on https) | Operators learn when a page breaks for visitors. | A forced JS error reaches someone. Today /api/logs returns 404 on GitHub Pages, so every reported error is dropped: no one learns of a broken feature (the same failure class that hid the contact form). | CC | high | finding | js/config/index.js LOGGING_CONFIG; GET /api/logs -&gt; 404 |
| G-13 | Custom 404 page for unknown URLs | Recover from a bad or old link. | Unknown URL returns HTTP 404 with the custom page (verified: /nonexistent-page, /q4_update.html -&gt; 404, 11944 bytes); its links work (see E-rows). | PM AS | low | verify | probe |
| G-14 | JSON-LD structured data (index, about, resources) and canonical links | Search engines show the right club name, logo and URL. | Rich-results test parses without error; logo URL (dist/images/favicon.png) returns 200; canonicals point at `www.sastamps.org`. | PM | low | verify | index.html JSON-LD |
| G-15 | sitemap.xml (10 URLs) and robots.txt | Search engines find every public page. | sitemap lists all 10 site pages (404/offline/showcase deliberately absent) and every entry returns 200. | PM | low | verify | crawl: sitemap 10 URLs, all 200 |

### index.html

| ID | Element / feature | User's goal | Outcome check | Personas | Risk | Status | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| H-01 | Hero "SAPA PHILATEX - Fourth Quarter 2026" Download PDF (public/SAPA-PHILATEX-Fourth-Quarter-2026.pdf, new tab) | Read the newest newsletter. | Opens the Q4 2026 issue (masthead says Fourth Quarter 2026, Oct 1 2026) in a new tab on desktop and phone. | NR CM | medium | verify | crawl: PDF 200 |
| H-02 | "Learn More About SAPA" button -&gt; about.html | Learn about the club. | Loads about.html. | PM | low | verify | index.html |
| H-03 | Static "Upcoming Meetings" Q4 2026 table (13 cells, hand-written HTML) | See what happens on which Friday this quarter. | Every cell (date, type, program, NO MEETING holidays, Dec 18 party at 6:00 PM) matches data/meetings/meetings.json and the Q4 PDF calendar; every date is a Friday. The table is not generated from data, so it can drift silently. | PM CM DL | high | verify | index.html #meeting-schedule |
| H-04 | Times line: Doors 6:30, BOG 7:15, Meetings 7:30 | Know when to arrive. | Matches meetings.json time fields and the .ics events (the Q4 .ics DTSTART is 18:30, i.e. doors-open, not the 7:30 start). | PM DL | medium | verify | index.html; public/sapa-q4-2026-meetings.ics |
| H-05 | "Download Complete Q4 2026 Schedule" (public/sapa-q4-2026-meetings.ics, download attr) | Put the whole quarter in my calendar. | Imports into Apple Calendar (macOS + iOS), Google Calendar and Outlook as 13 events with the right local date/time per meetings.json; holiday "no meeting" entries are clearly labelled; times are floating (no TZID) so check a device set to another time zone. | PM CM DL | high | verify | served as text/calendar 200; 13 VEVENTs |
| H-06 | "View Individual Meeting Downloads" button -&gt; meetings.html | Add just one meeting to my calendar. | On meetings.html the visitor finds a per-meeting calendar download. FAILS by code: no meetings.json record has calendarLink, so meetings.js never renders "Add to Calendar"; the 89 data/calendar/*.ics files are deployed but linked from nowhere. | PM CM DL | high | finding | js/pages/meetings.js:209; meetings.json calendarLink count = 0 |
| H-07 | "Latest Issue Highlights" static list | Decide whether to read the issue. | Every bullet appears in the Q4 2026 PDF (names, dates, $20 Blue-Chip minimum). | NR | medium | verify | index.html newsletter section |
| H-08 | "Read Latest Issue" button -&gt; Q4 2026 PDF | Read the newest newsletter. | Opens the Q4 2026 PDF. | NR | medium | verify | crawl: 200 |
| H-09 | "Subscribe Today" card: "Join SAPA" -&gt; membership.html | Get the newsletter by joining. | Loads membership.html. | NR PM | low | verify | index.html |
| H-10 | "Subscribe Today" card: "Learn More" -&gt; newsletter.html#subscribe | Learn how to subscribe to PHILATEX. | Lands on subscription information. FAILS: newsletter.html has no #subscribe target and no subscription mechanism or instructions exist anywhere on the site. | NR PM | medium | finding | grep id="subscribe" *.html = none |
| H-11 | Newsletter editor mailto:`jsdurham4@gmail.com` | Contact the newsletter editor. | Opens a draft to the editor; a test message gets a reply (mailbox is live; Jim Durham is still editor). | NR CC | medium | verify | index.html; newsletter.html; archive.html |
| H-12 | "Club News & Announcements" cards (Oct 9 program, Blue-Chip auction, ...) | Know what is coming up. | Dates, times and rules match meetings.json and the PDF; nothing in the past is presented as upcoming. | CM PM DL | medium | verify | index.html announcements section |
| H-13 | CTA cards: "Join SAPA Today", "Meeting Schedule" (#meeting-schedule), "Get in Touch", "Read PHILATEX" | Take the next step. | Each loads the right page; "Meeting Schedule" scrolls to the schedule section. | PM | low | verify | index.html |

### about.html

| ID | Element / feature | User's goal | Outcome check | Personas | Risk | Status | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A-01 | History timeline and mission text | Learn the club's history. | Facts are consistent across the site. Today about.html says PHILATEX was renamed in 1975 while newsletter.html says it has been published since 1954. | PM | low | finding | about.html vs newsletter.html |
| A-02 | "Membership Information" and "Contact Us" buttons | Move on to join or ask. | Both load their pages. | PM | low | verify | about.html |

### meetings.html

| ID | Element / feature | User's goal | Outcome check | Personas | Risk | Status | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| M-01 | Location & Times block (address, Building 1, doors/BOG/start) | Know where and when to go. | Address, building and times match meetings.json location and the map pin; a first-time visitor can find Building 1. | PM DL | high | verify | meetings.html static |
| M-02 | "Meeting Types" block (1st Friday BOG, 2nd Friday Auction, other Fridays Bourse/Programs) | Predict what a given Friday holds. | Pattern agrees with the current quarter. Q4 2026 breaks it (Oct 9, the 2nd Friday, is a stamp program; the auction is Oct 16), so the page must not mislead. | PM CM DL | medium | suspect | meetings.html vs meetings.json |
| M-03 | Meeting schedule list (#meeting-schedule-container, JS from data/meetings/meetings.json, current quarter) | See this quarter's meetings in detail. | Shows the 13 Q4 2026 meetings with correct weekday, date, time, location and description; rolls to the next quarter only once its data exists; empty-quarter message is correct. | PM CM DL | high | verify | js/pages/meetings.js loadMeetingsList |
| M-04 | Status line #meeting-schedule-status (role=status) | Screen-reader user hears how many meetings loaded. | Announces "13 meetings for Q4 2026" once. | PM | low | verify | meetings.js announceStatus |
| M-05 | Per-meeting Agenda &lt;details&gt; (when agenda data exists) | See the agenda. | Expands/collapses with mouse, keyboard and touch. | CM | low | verify | meetings.js |
| M-06 | RSVP button (.btn-rsvp) | Tell the club I am coming. | Someone at the club learns of the RSVP. KNOWN: localStorage only. Also: un-RSVP then reload shows "RSVP Confirmed" again (handleRSVP stores false, initializeRSVPSystem treats every key as confirmed), and with storage blocked initializeRSVPSystem throws (unguarded localStorage). | PM CM | high | known | meetings.js:333-424 |
| M-07 | Set Reminder button (.btn-reminder) | Get reminded before the meeting. | A reminder actually reaches me. KNOWN as localStorage-only; worse by code: the handler calls reminderSystem.setReminder(), which does not exist (only setReminders), so the click throws and the button never even changes (also in the live bundle). | CM PM | high | known | meetings.js:370; js/reminder-system.js; live meetings.min.js |
| M-08 | Per-meeting "Add to Calendar" link (.btn-calendar) | Add one meeting to my calendar. | Never rendered: meetings.json has no calendarLink on any of 79 records. | PM CM DL | high | finding | meetings.js:209 |
| M-09 | Calendar (vanilla-calendar-pro v3, #calendar-container): month navigation | Browse months to find meeting days. | Prev/next arrows reach Oct-Dec 2026; range is 2024-01-01 to end of next year; works by touch at 375px. | PM CM | medium | verify | meetings.js initializeMeetingsCalendar |
| M-10 | Calendar: which days have meetings | See at a glance which Fridays have meetings. | Meeting days are visibly marked. Suspect: the calendar is created with no popups/markers (the type colours in calendar-adapter.js are only used by calendar-component.js, which no page loads), so every day may look the same. | PM CM DL | high | suspect | meetings.js Calendar options; js/calendar-adapter.js |
| M-11 | Calendar day click -&gt; meeting modal (#event-modal) | See that meeting's details. | Clicking Oct 9 2026 opens a modal with "Expertising Philatelics", 7:30 PM, location; a holiday shows "No meeting"; a non-meeting day does nothing confusing; re-click of the same day still opens it. | PM CM DL | high | verify | meetings.js onClickDate; js/modal.js |
| M-12 | Modal close (X, Close button, overlay click, Escape), focus trap and focus return | Close the details and continue. | Every close route works on desktop and phone; focus returns to the clicked day; body scroll restored. | PM CM | medium | verify | js/modal.js bindEvents |
| M-13 | Modal contact links (mailto / tel from meeting contact) | Ask about this meeting. | Links open mail/phone with the right address/number. | PM CC | medium | verify | js/modal.js:234-239 |
| M-14 | "Download Complete Q4 2026 Schedule" .ics (same file as H-05) | Put the quarter in my calendar. | Same outcome check as H-05. | PM CM DL | high | verify | meetings.html |
| M-15 | Instruction text "Click the calendar-plus icons above for individual meetings" | Find per-meeting downloads. | The icons exist. FAILS: no such icons are rendered anywhere (same root cause as M-08). | PM CM | high | finding | meetings.html:203 |
| M-16 | Google Maps iframe (maps.google.com ... output=embed) | Get directions to the church. | Map loads (CSP frame-src allows it), pin is MacArthur Park Lutheran Church, 2903 Nacogdoches Rd; on a phone "View larger map"/directions opens Maps. | PM DL | high | verify | crawl: 200 |
| M-17 | TSDA stamp shows table (static, Q4 2026) | Plan which shows to attend or exhibit at. | Dates/venues/hours are correct and no past show is listed as upcoming. | DL CM | medium | verify | meetings.html |
| M-18 | JavaScript disabled: &lt;noscript&gt; message | Still find meeting dates without JS. | Static location/times/types and the .ics link remain; the schedule list and calendar are replaced by a message with a working mailto. | PM | medium | verify | meetings.html:173 |
| M-19 | Error state: "Refresh Page" button when calendar fails | Recover from a failure. | Shown only on failure; reload works. | PM | low | verify | meetings.js:109 |

### newsletter.html

| ID | Element / feature | User's goal | Outcome check | Personas | Risk | Status | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| N-01 | Breadcrumb (#breadcrumb-nav, js/modules/breadcrumb.js) | Know where I am, go back up. | Renders Home &gt; Newsletters with working links. | NR | low | verify | newsletter.html |
| N-02 | Current issue "Download PDF" (Q4 2026, new tab) | Read the newest issue. | Opens the Q4 2026 PDF. | NR CM | medium | verify | crawl: 200 |
| N-03 | "View Archive" -&gt; archive.html | Find older issues. | Loads archive.html. | NR AS | low | verify | newsletter.html |
| N-04 | "In This Issue" static list | Preview the issue. | Every item appears in the Q4 2026 PDF. | NR | medium | verify | newsletter.html |
| N-05 | Contributing: mailto editor `jsdurham4@gmail.com` | Submit an article. | Same as H-11. | NR CM | medium | verify | newsletter.html |
| N-06 | Publication details (quarterly, dates, deadlines) | Know when the next issue comes. | Consistent with the issue itself (Q4 2026 announces a bimonthly schedule from January 2027). | NR | low | verify | newsletter.html |

### archive.html

| ID | Element / feature | User's goal | Outcome check | Personas | Risk | Status | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| AR-01 | Static Download PDF buttons for 2025 Q2 - 2026 Q3 (6 links) | Open a recent back issue. | Each opens the right issue; "SAPA PHILATEX Second Quarter 2025.pdf" has spaces in its href (200 when encoded) and must open in every browser. | AS NR | medium | verify | crawl + probe: all 200 |
| AR-02 | JS-rendered 2008-2024 archive (#archived-newsletters from data/newsletters/archived-newsletters.json) | Find an old issue by year. | Year sections render newest first; each of the 98 available links opens the issue its label names (all 98 return application/pdf 200); the 1 unavailable (2012 Jul/Aug) shows "Not Available". | AS | medium | verify | js/pages/archive.js; probe 98/98 200 |
| AR-03 | Coverage gaps between the two lists | Every issue that exists is listed. | Confirm whether 2024 Q1 and 2025 Q1 exist: neither list mentions them (not even as "Not Available"). | AS | medium | suspect | archived-newsletters.json years; archive.html static list |
| AR-04 | JavaScript disabled: &lt;noscript&gt; "enable JavaScript to view the full archive (2008-2024)" | Reach old issues without JS. | 2008-2024 issues are unreachable without JS; message is shown. | AS | medium | verify | archive.html:471 |
| AR-05 | "Contact Newsletter Editor" mailto | Ask for a missing issue. | Same as H-11. | AS | medium | verify | archive.html |

### membership.html

| ID | Element / feature | User's goal | Outcome check | Personas | Risk | Status | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| MB-01 | "Download Membership Application" (downloads/SAPA_membership_application.pdf, 2.2 MB) | Join the club and pay dues. | PDF opens in Safari/iOS, Chrome, Acrobat (pdftotext reports a stream syntax error; it is a 2-page scan with no text layer) and its instructions are current: page 2 tells applicants to pay "Dora Roberts" at a home address, names "Fred (our Treasurer)", a bimonthly newsletter and a Saturday Boursette, with a 2007 map. Confirm every name/address/amount with the club. | PM | high | suspect | pdfinfo/pdftotext; rendered pages |
| MB-02 | Benefits and "Special Opportunities" claims (mentorship, members-only quarterly auctions, library, Scott catalogs) | Know what I get for joining. | Each claim is still true (auctions are listed monthly in Q4 data). | PM | low | verify | membership.html |
| MB-03 | "Contact us" -&gt; contact.html; "meeting" -&gt; index.html#meeting-schedule | Ask first or visit first. | Both land on the right place. | PM | low | verify | membership.html |
| MB-04 | Dues and how to pay (not on the page; only in the PDF) | Know the cost before downloading. | Visitor can learn dues without opening a 2.2 MB scan. | PM | low | verify | membership.html has no $ amounts |

### resources.html

| ID | Element / feature | User's goal | Outcome check | Personas | Risk | Status | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| RS-01 | Featured resources grid (#featured-resources-grid) | Start with the best guide. | Renders the 1 featured resource with working buttons. | PM CM | medium | verify | js/pages/resources.js; resources.json 3 resources |
| RS-02 | Browse by Category (#categories-container): title links (.resource-link) and "View all" (.btn-view-all-category) | Browse by topic. | Title opens the guide modal; "View all" sets the category filter and scrolls to the list. | PM CM | medium | verify | resources.js bindCategoryActions |
| RS-03 | All resources list (#resources-container) | See every guide. | Lists all 3 resources. | PM CM | medium | verify | resources.js displayAllResources |
| RS-04 | Resource search box (#resource-search) | Find a guide by keyword. | Typing "grading" leaves only the grading guide; #resources-status announces the count. | PM CM | medium | verify | resources.js initializeResourceSearch |
| RS-05 | Category and difficulty selects (#category-filter, #difficulty-filter) | Narrow by topic/level. | Each option filters correctly; "Valuation", "Reference" and "Advanced" match no resource, so an empty state must be clear. | PM CM | low | verify | resources.html options vs resources.json |
| RS-06 | "Clear Filters" (#clear-filters) | Reset the view. | Search and both selects reset and all resources return. | PM | low | verify | resources.js:254 |
| RS-07 | "Read Guide" (.btn-read-resource) -&gt; resource modal with content and external links | Read a guide. | Modal shows the full guide; links inside open in a new tab and resolve. | PM CM | medium | verify | resources.js openResourceModal |
| RS-08 | "View Sections" (.btn-view-sections) -&gt; sections modal and "Read full" (.btn-read-full) | Jump to part of a guide. | Sections list opens; "Read full" swaps to the full guide. | CM | low | verify | resources.js showResourceSections |
| RS-09 | Bookmark buttons (.btn-bookmark, .btn-bookmark-modal; localStorage resource_bookmarks) | Save a guide to come back to. | A bookmarked guide is findable later. No view lists bookmarks (only the button label changes), and with storage blocked toggleBookmark throws (unguarded localStorage). | CM | medium | finding | resources.js:622-660 |
| RS-10 | Print button in modal (window.print) | Print a guide for the club table. | Printout contains the guide text, not just the page behind the modal. | CM | low | verify | resources.js:433 |
| RS-11 | Modal close (button, overlay, Escape) | Close the guide. | All three close it; focus returns. | PM CM | low | verify | resources.js showModal |
| RS-12 | Quick tools: "View Glossary", "Browse Catalog" (colnect), "View Catalog" (scottonline.com), "Contact Us" | Reach catalog tools. | Each opens the intended site. scottonline.com did not answer curl (timeout x3); check in a browser. | CM PM | medium | suspect | probe: scottonline 000 |
| RS-13 | External organisation/news links (APS, ASDA, "United States Postal Service", Scott, Michel, Colnect, Linn's, APS News, Postal News) | Visit the named organisation. | Each label matches its destination. "United States Postal Service" links to uspcs.org, the U.S. Philatelic Classics Society. | PM CM | medium | finding | resources.html |
| RS-14 | JavaScript disabled | See guides without JS. | Guides are entirely JS-rendered; confirm the page says so rather than showing empty sections. | PM | medium | verify | resources.html has no &lt;noscript&gt; |
| RS-15 | Error state "Refresh Page" | Recover from a load failure. | Shown only on failure. | PM | low | verify | resources.js:720 |

### glossary.html

| ID | Element / feature | User's goal | Outcome check | Personas | Risk | Status | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| GL-01 | Loader script that injects dist/js/glossary.min.js; fallback panel | Glossary loads. | Terms render. If the script fails, the fallback panel says "Development Mode ... requires a web server", which is wrong wording for a public visitor. | PM CM | low | verify | glossary.html:293-370 |
| GL-02 | Glossary search (#glossary-search-input, search button, Enter) and result links (.search-result-link) | Look up a term. | "perf" finds Perforation; clicking the result scrolls to and expands the term card; status region announces counts. | PM CM | medium | verify | js/pages/glossary.js |
| GL-03 | Clear search button (#glossary-clear-button) | Reset the search. | Visible and clickable when text is present. KNOWN: may be covered by the suggestions dropdown. | PM | low | known | glossary.js:119 |
| GL-04 | Category / difficulty / sort selects and Reset (#filter-reset) | Narrow or reorder terms. | Each option changes the list correctly; Reset restores all 5 terms alphabetically. | PM | low | verify | glossary.js loadGlossaryFilters |
| GL-05 | A-Z jump buttons (26 .alphabet-btn) | Jump to a letter. | Letters with terms (F, M, P, W) scroll there; the other 22 letters give a clear "no terms" response rather than nothing. | PM | medium | suspect | glossary.js jumpToLetter |
| GL-06 | Term card expand/collapse (click delegation on #glossary-content-container) | Read a definition. | Expands/collapses by mouse, keyboard and touch. | PM | medium | verify | glossary.js:350 |
| GL-07 | Related-term links (a.related-term -&gt; #term-&lt;id&gt;) | Follow a related concept. | Each lands on that term. FAILS: all 18 related ids across the 5 terms (philatelist, never-hinged, imperforate, cachet, ...) are not in glossary.json, so every link goes nowhere. | PM | medium | finding | data/glossary/glossary.json |
| GL-08 | Content volume | Find the term I need. | KNOWN: only 5 terms. | PM | medium | known | glossary.json |
| GL-09 | Stats panel (#total-terms, #total-categories, #total-references) | See glossary size. | Numbers replace "Loading..." and match the data. | PM | low | verify | glossary.js loadGlossaryStats |
| GL-10 | "Suggest a term" mailto loz33 | Propose a term. | Same as G-06. | CM | low | verify | glossary.html |

### contact.html

| ID | Element / feature | User's goal | Outcome check | Personas | Risk | Status | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | Contact form, JS path (fetch POST to the FormSubmit AJAX endpoint for the form action address) | Send the club a question and get an answer. | A real submission produces an email in the recipient's inbox within minutes with name, email (as reply-to), phone, topic and message, subject "SAPA website: &lt;topic&gt; (from &lt;name&gt;)"; a reply reaches the sender. The recipient is `arlenagreer@gmail.com` (webmaster), not the club: confirm the club actually learns of each message. | CC PM DL | high | verify | js/pages/contact.js handleFormSubmission; contact.html action |
| C-02 | Contact form, no-JS path (native POST, _next -&gt; contact.html#sent) | Same, with JavaScript off. | Email arrives as in C-01; visitor returns to the "Thank you" notice; a later reload does not show it again. | CC | high | verify | contact.html hidden fields |
| C-03 | Relay refusal path (FormSubmit success:"false", e.g. activation pending) | Know when my message did NOT go. | An error message, never the success message, is shown whenever the relay does not confirm. | CC | high | verify | contact.js:243-255 |
| C-04 | Field validation (name &gt;= 2, email, optional phone, topic select, message 10-1000) with inline errors (role=alert) | Fix mistakes before sending. | Real-world inputs pass: +1 210 ..., (210)555-0123, international numbers, short names, apostrophes; errors are announced and clear when fixed. | CC | medium | verify | contact.js validateField; js/utils/helpers.js |
| C-05 | Character counter under the message | Know how much I can write. | Counts down from 1000 and warns under 50. | CC | low | verify | contact.js initializeCharacterCounter |
| C-06 | Honeypot field _honey (hidden) | Real people are never treated as spam. | Browser autofill (Chrome, Safari, 1Password) never fills it; a real submission is delivered. | CC | medium | verify | contact.html:198 |
| C-07 | Slow/failed network: 30 s timeout and "couldn't confirm" message | Know what happened on a bad connection. | On Slow 3G the button shows "Sending..." and is disabled; after 30 s the unconfirmed message appears; no duplicate send on retry within the wait. | CC | medium | verify | contact.js RELAY_TIMEOUT_MS |
| C-08 | Submit button state (disabled while sending, restored after) | Avoid double sends. | Double-click sends one email. | CC | medium | verify | contact.js |
| C-09 | "#sent" notice and history.replaceState | See that my no-JS message went. | Shown after relay redirect; a shared/reloaded URL does not claim a send. | CC | low | verify | contact.js:33-40 |
| C-10 | mailto:`loz33@hotmail.com` contact link | Email instead of the form. | Same as G-06. | CC | medium | verify | contact.html |
| C-11 | Google Maps iframe | Find the venue. | Same as M-16. | PM CC | medium | verify | contact.html |
| C-12 | Relay address visible in page source | n/a | KNOWN: FormSubmit relay address is visible in the source. | CC | low | known | contact.html action |
| C-13 | Anti-framing script (hides page when framed) | Page is not clickjacked. | Page renders normally top-level; when framed it hides and breaks out. | CC | low | verify | contact.html inline script |

### search.html

| ID | Element / feature | User's goal | Outcome check | Personas | Risk | Status | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| S-01 | Search box (#searchInput) + Enter + search button (inline performSearch; lunr 2.3.9 from unpkg with SRI; dist/data/search-index.json 298 KB + search-documents.json, 94 docs) | Find anything on the site. | "Fourth Quarter 2026" and "philatex" return the newest newsletter first; "auction" returns this quarter's auctions; status region reports counts. | NR AS CM PM | high | verify | search.html inline script; live index 200 |
| S-02 | Quick-search chips (5 buttons, inline onclick: stamp collecting, meeting, newsletter, beginner, "2025 Events") | One-tap common searches. | Each returns relevant results. "2025 Events" is stale: the index holds only 2026 meetings. | PM | medium | suspect | search.html; search-documents.json |
| S-03 | Result links (doc.url: /newsletter.html#2026-Q4, /meetings.html#2026-10-09, /resources.html#&lt;id&gt;, /glossary.html#&lt;id&gt;) | Open the thing I found. | The link lands on that item. FAILS: none of the 94 fragment ids exist on the target pages; newsletter results land on a page showing only the current issue, and past-quarter meetings are not on meetings.html at all. | NR AS CM | high | finding | live search-documents.json urls; page ids |
| S-04 | ?q= URL parameter and pushState | Share or bookmark a search; Back works. | search.html?q=auction runs on load; Back steps through searches. | AS | low | verify | search.html inline |
| S-05 | Index coverage | Find an old issue or article by topic. | Search reaches the 98 archive issues (2008-2024) and newsletter contents. Today it indexes only 7 newsletters (titles/summaries), 79 meetings, 5 terms, 3 resources. | AS | medium | finding | search-documents.json type counts |
| S-06 | Third-party dependency: unpkg.com lunr | Search works on any network. | With unpkg blocked or slow, a clear error shows instead of a dead page. | AS | medium | verify | search.html:344 |
| S-07 | Lunr query syntax (e.g. "C:", "stamp~", "+") | Odd input doesn't break search. | Shows a friendly message, not "Search error: QueryParseError ...". | AS | low | verify | search.html performSearch |
| S-08 | JavaScript disabled | Search without JS. | Page says search needs JavaScript (no &lt;noscript&gt; today). | AS | medium | suspect | search.html has no &lt;noscript&gt; |

### 404.html

| ID | Element / feature | User's goal | Outcome check | Personas | Risk | Status | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| E-01 | "Go to Homepage", "Search Site" and 4 suggestion cards (absolute paths) | Recover from a bad link. | Each loads its page from a deep 404 URL (e.g. /a/b/c). | PM AS | low | verify | 404.html |
| E-02 | gtag 404 tracking (inline) | Operators learn of broken links. | No Google Analytics is loaded anywhere, so 404s are never reported. | AS | low | finding | 404.html inline script |

### offline.html

| ID | Element / feature | User's goal | Outcome check | Personas | Risk | Status | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| O-01 | Offline page "Try Again" and online listener | Retry when back online. | Orphan: deployed (200) but linked from nowhere since the service worker was retired; confirm it is harmless. | CM | low | verify | probe 200 |

### showcase/

| ID | Element / feature | User's goal | Outcome check | Personas | Risk | Status | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SC-01 | Design showcase (index meta-refresh -&gt; 1.html; 5 pages Prev/Next; 5 PNG mockups ~1.7-2 MB) | n/a (internal design review). | Deployed (all 200) but unlinked; confirm it should be public; Prev/Next work. | PM | low | verify | probe: all 200 |

### data/calendar/

| ID | Element / feature | User's goal | Outcome check | Personas | Risk | Status | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| DC-01 | 89 per-meeting and per-quarter .ics files (2025-04-04 .. 2026-12-25) | Per-meeting calendar import. | Deployed (sample 200) but no page links them (see H-06/M-08). Past-quarter public/sapa-q1..q3-2026 and q4-2025 .ics are also unlinked. | CM | medium | finding | grep data/calendar *.html = none |

## Persona journeys

### J1: Prospective member on a phone (375px) wants to attend this Friday's meeting

Personas: Prospective member.

1. Open `https://www.sastamps.org/` on a 375px viewport; scroll to Upcoming Meetings.
2. Identify the next Friday (e.g. Oct 2 2026, BOG; Show & Tell) and the times (doors 6:30, meeting 7:30).
3. Tap "View Individual Meeting Downloads", try to add just that meeting to the phone calendar.
4. Fall back to "Download Complete Q4 2026 Schedule"; import it on iOS and Android.
5. Open the map on meetings.html, start directions to 2903 Nacogdoches Rd, Building 1.
6. Go to Membership, open the application PDF on the phone.

**Expected outcome:** The calendar shows the right Friday at the right local time; directions reach the church; the PDF opens and its payment instructions are current. Expect failure at step 3 (H-06/M-08/M-15).

### J2: Someone contacting the club (desktop 1440, then phone, then JS off)

Personas: Someone contacting the club.

1. Open contact.html, fill name, email, phone, topic, a 50-character message; submit.
2. Repeat on a 375px phone and again with JavaScript disabled (native POST, #sent notice).
3. Repeat on Slow 3G (C-07).
4. Check the recipient inbox and reply to each message.
5. Also send a plain email to `loz33@hotmail.com` from the footer link.

**Expected outcome:** Every submission arrives once with all fields and the sender as reply-to; the reply reaches the sender; a club officer (not only the webmaster) learns of each message; the mailbox answers.

### J3: Current member checks the next auction and plans to attend

Personas: Current member.

1. Open meetings.html; find the Oct 16 2026 auction in the schedule list.
2. Click RSVP, reload, un-RSVP, reload (M-06).
3. Click Set Reminder (M-07).
4. In the calendar, navigate to October 2026 and click the 16th (M-10, M-11); close the modal with Escape.
5. Add the auction to a calendar.

**Expected outcome:** Member can see auction rules/times and add it to a calendar; RSVP/reminder behaviour is recorded against the known issue (no one at the club is told; reminder click throws).

### J4: Newsletter reader wants the newest PHILATEX and to subscribe

Personas: Newsletter reader.

1. From the home hero, open the Q4 2026 PDF.
2. Compare the home "Latest Issue Highlights" and newsletter.html "In This Issue" with the PDF.
3. Click "Subscribe Today" &gt; "Learn More" (H-10).
4. Email the editor from newsletter.html.

**Expected outcome:** The PDF is Q4 2026; the summaries match; the reader learns how to receive future issues (expect failure: no #subscribe target); the editor replies.

### J5: Returning archive searcher looks for a 2009 issue and a topic

Personas: Returning archive searcher.

1. search.html: search "Expertising", "Fourth Quarter 2026", "2009", "auction".
2. Click the first newsletter and meeting results (S-03).
3. archive.html: open 2009 January/February; check the masthead date.
4. Repeat archive with JavaScript disabled (AR-04).

**Expected outcome:** Newest issue ranks first; result links land on the item (expect failure); the 2009 issue opens and is the right one; JS-off visitors are told how to get old issues.

### J6: Dealer planning to bring stock to the bourse

Personas: Dealer at the bourse.

1. Find the bourse Fridays (Oct 23, Nov 20) on home and meetings pages.
2. Confirm doors-open time and building; open the map.
3. Check the TSDA shows table on meetings.html.
4. Use the contact form to ask about table space (topic "Event Information").

**Expected outcome:** Dates and times agree across home, meetings list, calendar modal and .ics; the question reaches someone who answers (the club has said there is no dealer-table fee, provisionally until the Oct 2 meeting; nothing on the site should state one).

### J7: New collector learning terms and techniques

Personas: Prospective member.

1. resources.html: search "grading", open the guide, bookmark it, reload, look for the bookmark.
2. Follow the Scott and Colnect links; check the "United States Postal Service" link destination.
3. glossary.html: search "perf", open Perforation, click a related term, use the A-Z buttons, clear the search.

**Expected outcome:** Guide opens and the bookmark is findable later (expect failure); external labels match destinations (USPS link is mislabelled); related terms land on definitions (expect failure: all 18 dead).

### J8: Visitor arriving from an old link or with a stale cached copy

Personas: Returning archive searcher, Current member.

1. Open /q4_update.html and /some/old/path: confirm the 404 page and its links.
2. In a profile that has the old sapa-cache-v1 service worker, open only the home page and check the quarter shown (G-10).

**Expected outcome:** Custom 404 with working recovery links; the home page shows Q4 2026 content without needing to visit another page first.

## Conditions matrix

Apply each condition to the pages listed; desktop 1440 is the baseline for every row.

| Condition | Applies to | Note |
| --- | --- | --- |
| Desktop 1440x900 | All 12 deployed pages + showcase | Baseline for every row. |
| Phone 375x812 (touch) | All pages; focus on G-03 menu, H-03 table, M-09..M-12 calendar/modal, M-16 map, RS-07 modal, contact form | No horizontal scroll; tap targets &gt;= 24px; modal fits and scrolls; iOS PDF and .ics hand-off. |
| JavaScript disabled | meetings (M-18), archive (AR-04), resources (RS-14), glossary (GL-01 fallback/noscript), search (S-08), contact no-JS path (C-02), home static content | Content that only JS renders must be replaced by a useful message, never a silent blank. |
| Slow network (DevTools Slow 3G / 400 kbps, 400 ms RTT) | contact (C-07 30 s timeout), search (298 KB index + unpkg), meetings calendar, archive JSON, resources/glossary JSON, PDFs | Loading states visible; no false success; no double submit. |
| WebKit / Safari engine | All pages, esp. contact (AbortController, fetch JSON), meetings (date parsing of YYYY-MM-DDT00:00:00, calendar), .ics import on iOS, PDF with spaces in name, download attribute | Playwright WebKit is NOT installed on this machine (~/Library/Caches/ms-playwright has chromium-1234 only): run `npx playwright install webkit` or test in real Safari/iOS. |
| Storage blocked (cookies/site data blocked, private mode) | meetings RSVP (M-06) and reminder, resources bookmarks (RS-09), font-loading (G-08), error-boundary log | Unguarded localStorage calls (meetings.js initializeRSVPSystem, resources.js bookmarks) must not break the page. |

## Known issues already found (do not re-report)

| Issue | Rows |
| --- | --- |
| RSVP and Set Reminder buttons on meetings are localStorage-only; the club is never told | M-06, M-07 (M-07 is worse: the click throws) |
| Glossary has only 5 terms | GL-08 |
| Glossary search clear button may be covered by the suggestions dropdown | GL-03 |
| Calendar picnic colour #f39c12 on #fef9e7, about 2.08:1 | M-10 (that colour lives in calendar-adapter.js, used only by calendar-component.js, which no page loads; confirm where it shows) |
| FormSubmit relay address visible in page source | C-12 |

## Dead code: handlers whose target does not exist on any page

| File | Handlers / features | Why it never runs |
| --- | --- | --- |
| js/pages/home.js | initializeHomeCalendar (#calendar-preview), initializeCountdownTimer (#meeting-countdown), loadQuickStats (#quick-stats), loadRecentNewsletters (#newsletter-preview) and their meetings.json/newsletters.json fetches | none of the 4 ids exist in index.html; home.min.js (104 KB) runs nothing |
| js/pages/meetings.js | initializeMeetingFilters (#meeting-filters: year/type selects, "Upcoming only", Clear Filters); window.handleRSVP global | #meeting-filters not in meetings.html; buttons call the module-local handleRSVP |
| js/pages/newsletter.js | loadNewslettersList (#newsletters-container), initializeNewsletterSearch (#newsletter-search), initializeNewsletterFilters (#newsletter-filters), .btn-download handler | none of the 3 ids exist; only the breadcrumb import does anything |
| js/pages/search.js + js/modules/search-engine.js | whole bundle: #search-interface, #search-filters, #search-results, #results-container, suggestions, date filters, its own lunr/unpkg loader and fetches | containers absent; the live search is the inline script in search.html |
| js/pages/contact.js | initializeContactInfo click-to-copy ([data-copy]) | no [data-copy] element on any page |
| contact.html inline script | accordion (.accordion-header) | no .accordion-header element |
| js/script.js (loaded by membership.html, 404.html) | setupEventCountdown (#event-countdown), setupFormValidation + setupContactForm (#contact-form, PHP endpoint, csrf-token.php fetch), setupAccordion, setupImageGallery (.gallery-image/.lightbox), setupThemeToggle (.theme-toggle), setupDynamicContentBoundaries (calendar/newsletter containers) | none of those elements exist on the two pages that load it; the PHP endpoints 404 in production |
| js/reminder-system.js | settings panel (#reminder-settings-container), browser notifications, sound, setReminders() | container absent; nothing calls setReminders; meetings.js calls a non-existent setReminder() |
| js/calendar-component.js, js/modules/meeting-loader.js (class), newsletter-loader.js, pagination.js, template-engine.js, data-loader.js, modules/index.js, core-bundle.js, utils/api-client.js, utils/error-handler.js, utils/global-error-handler.js, utils/theme.js, utils/loading-states.js | components, loaders and handlers (pagination buttons, newsletter filter apply/clear, error banners, theme listener) | not executed on any deployed page (only reachable behind containers that do not exist, or not imported by any page entry) |
| 404.html inline script | gtag("event","exception") 404 tracking | gtag is never defined |

## Cross-check: every handler and network call in js/ maps to a row

| Call or handler | Where | Row(s) |
| --- | --- | --- |
| fetch data/meetings/meetings.json | meetings.js loadMeetingsList; calendar-adapter.js loadMeetings | M-03, M-11 |
| fetch data/newsletters/archived-newsletters.json | archive.js renderArchivedNewsletters | AR-02 |
| fetch data/members/resources.json | resources.js (load, modal, sections) | RS-01..RS-08 |
| fetch data/glossary/glossary.json | glossary.js loadGlossaryTerms | GL-02..GL-09 |
| fetch dist/data/search-index.json + search-documents.json | search.html inline initializeSearch | S-01 |
| script `https://unpkg.com/lunr@2.3.9` | search.html | S-01, S-06 |
| script-injected dist/js/glossary.min.js | glossary.html inline loader | GL-01 |
| fetch POST `https://formsubmit.co/ajax/`... | contact.js handleFormSubmission | C-01, C-03, C-07 |
| form POST `https://formsubmit.co/`... (no JS) | contact.html | C-02 |
| fetch POST /api/logs | utils/logger.js logToRemote (all bundles) | G-12 |
| iframe maps.google.com | meetings.html, contact.html | M-16, C-11 |
| stylesheets fonts.googleapis.com, cdnjs font-awesome 6.4.0, css/vendor/vanilla-calendar.min.css | all pages / meetings.html | G-08, G-09, M-09 |
| fetch data/newsletters/newsletters.json | home.js, newsletter.js only | DEAD (not fetched by any live code; feeds the search build only) |
| fetch search-index via search-engine.js | search.js | DEAD |
| fetch csrf-token.php / contact-handler.php | script.js, utils/api-client.js | DEAD (404 in production) |
| click .btn-rsvp / .btn-reminder | meetings.js bindMeetingActions | M-06, M-07 |
| Calendar onClickDate; modal close/overlay/Escape/Tab | meetings.js; modal.js | M-11, M-12 |
| input/change/click on #resource-search, #category-filter, #difficulty-filter, #clear-filters | resources.js | RS-04..RS-06 |
| click .btn-read-resource, .resource-link, .btn-view-sections, .btn-read-full, .btn-view-all-category | resources.js | RS-02, RS-07, RS-08 |
| click .btn-bookmark, .btn-bookmark-modal; onclick window.print; modal close/overlay/keydown | resources.js | RS-09..RS-11 |
| input/click/keypress glossary search, clear; change filters; click reset, .alphabet-btn, term cards, .search-result-link | glossary.js | GL-02..GL-07 |
| blur/input/change on contact fields; submit #contact-form; input counter | contact.js | C-01, C-04, C-05, C-08 |
| keypress #searchInput; onclick performSearch / quickSearch | search.html inline | S-01, S-02 |
| document click/keydown menu close | about.js, archive.js, membership.js (script.js on membership/404) | G-03 |
| a[href^="#"] smooth scroll | script.js on membership.html, 404.html | MB-03 (in-page anchors) |
| window "online" reload | offline.html | O-01 |
| beforeunload cleanup listeners | event-cleanup.js, home.js, script.js | internal (no user outcome) |

## Crawl results: 404s and unreachable targets

| Item | Result |
| --- | --- |
| Broken internal link targets (HTML pages, PDFs, .ics, images, CSS, JS, JSON) | none: 151 internal URLs reached from the sitemap and every internal link, all 200; plus 98/98 archive PDFs 200 |
| sw.js | 404 by design (retired, not deployed) |
| q4_update.html, test-xss-fix.html, contact-handler.php, csrf-token.php | 404 by design (excluded from the build); nothing links to them |
| /api/logs | 404: target of every client error report (G-12) |
| Fragment targets | newsletter.html#subscribe (H-10); 18 glossary related-term anchors (GL-07); all 94 search-result fragments (S-03) |
| External | `www.scottonline.com` did not answer curl (timeout x3; verify in a browser). All other external links 200 (stamps.org fails only Python's CA bundle; curl 200). fonts.googleapis.com / fonts.gstatic.com bare origins are preconnect hints, not links. |
