---
phase: quick
plan: 2
type: execute
wave: 1
depends_on: []
files_modified:
  - .planning/quick/2-review-sapa-philatex-q2-2026-newsletter-/NEWSLETTER-REVIEW.md
autonomous: true
requirements: []
must_haves:
  truths:
    - "Review document covers all 5 pages of the newsletter"
    - "Proofreading issues are identified with page and section references"
    - "Layout recommendations are specific and actionable"
    - "Data consistency between newsletter PDF and website JSON is assessed"
  artifacts:
    - path: ".planning/quick/2-review-sapa-philatex-q2-2026-newsletter-/NEWSLETTER-REVIEW.md"
      provides: "Complete newsletter review with proofreading, content assessment, and layout recommendations"
      min_lines: 80
  key_links: []
---

<objective>
Produce a detailed written review of the SAPA Philatex Q2 2026 newsletter (Vol 132 #2, April-May-June 2026) covering proofreading corrections, content quality assessment, layout recommendations, and data consistency with the website.

Purpose: Help the newsletter editor (Jim Durham) improve the Q2 issue before or after distribution, and flag any data mismatches with the website that need correction.
Output: NEWSLETTER-REVIEW.md with organized findings by category.
</objective>

<execution_context>
@/Users/arlenagreer/.claude/get-shit-done/workflows/execute-plan.md
@/Users/arlenagreer/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@public/SAPA-PHILATEX-Second-Quarter-2026.pdf (the newsletter under review)
@data/newsletters/newsletters.json (website metadata to cross-reference)
@data/meetings/meetings.json (meeting data to cross-reference)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Produce comprehensive newsletter review document</name>
  <files>.planning/quick/2-review-sapa-philatex-q2-2026-newsletter-/NEWSLETTER-REVIEW.md</files>
  <action>
Read the full 5-page newsletter PDF at public/SAPA-PHILATEX-Second-Quarter-2026.pdf (all pages). Also read data/newsletters/newsletters.json and data/meetings/meetings.json for cross-reference.

Create NEWSLETTER-REVIEW.md organized into these sections:

## 1. Proofreading Issues
Review every page for spelling, grammar, punctuation, capitalization, and typographical errors. For each issue found, note the page number, section, the problematic text, and the suggested correction. Key items to check:
- Consistency of formatting (e.g., "Show and Tell" vs "Show and Tell" with quotes in calendar)
- Proper names spelled consistently
- Date/day-of-week accuracy (verify April 3 2026 is indeed Good Friday, May 22 is Memorial Day weekend, etc.)
- Punctuation consistency across sections
- Any missing or extra spaces, mismatched quotes

## 2. Content Assessment
Evaluate the newsletter content for:
- **Completeness**: Does the Q2 issue cover everything a quarterly club newsletter should? Are there gaps (e.g., missing treasurer report, missing president message)?
- **Timeliness**: The "March Stamp Program Reminder" on page 2 references an event on March 27 -- this is a Q2 (April-June) newsletter. Assess whether this is a carryover from Q1 or an error.
- **Accuracy of the "Did You Know?" fact**: It says SAPA joined APS "70 years ago on January 31, 1956." Since this is a 2026 newsletter, 2026-1956=70, so this is correct. Note this.
- **Feature article attribution**: The Farley's Follies article is credited to Mystic Stamp Company website. Assess whether the attribution is adequate.
- **Condolences section**: Verify the wording is appropriate and sensitive.
- **Postcard Club info on page 5**: Assess whether this belongs and whether the mostly-blank page 5 is intentional or wasteful.

## 3. Layout and Design Recommendations
Assess each page's layout and provide specific suggestions:
- **Page 1**: Calendar table readability, inconsistent quoting ("Show and Tell" has quotes in April 10 row but not in other months)
- **Page 2**: Section spacing, heading hierarchy consistency
- **Page 3**: Image placement for Talking Stamps and stamp images, white space usage, transition from light content to feature article
- **Page 4**: Two-column layout for Board of Governors / Write to SAPA -- assess effectiveness, TSDA shows formatting
- **Page 5**: Mostly blank -- recommend either filling with content, removing the page, or consolidating the Postcard Club info onto page 4
- **Overall**: Header/footer consistency, font usage, visual hierarchy

## 4. Data Consistency with Website
Cross-reference the newsletter against website JSON data and flag discrepancies:
- newsletters.json says pageCount is 3 but the PDF is 5 pages -- this MUST be flagged
- Verify meeting dates in the calendar table match meetings.json entries
- Verify the Joe Perez stamp program date (May 29 in newsletter calendar) matches meetings.json
- Verify Board of Governors names match any website references
- Check that the archive URL (https://www.sastamps.org/archive.html) is the correct path

## 5. Summary and Priority Recommendations
Provide a ranked list of the most important items to address, categorized as:
- **Must Fix**: Factual errors, data mismatches that affect the website
- **Should Fix**: Proofreading issues, confusing content
- **Nice to Have**: Layout improvements, content suggestions for future issues

Be thorough but constructive in tone. This is a volunteer-produced club newsletter.
  </action>
  <verify>
    <automated>test -f .planning/quick/2-review-sapa-philatex-q2-2026-newsletter-/NEWSLETTER-REVIEW.md && wc -l .planning/quick/2-review-sapa-philatex-q2-2026-newsletter-/NEWSLETTER-REVIEW.md | awk '{if ($1 >= 80) print "PASS: " $1 " lines"; else print "FAIL: only " $1 " lines"}'</automated>
  </verify>
  <done>NEWSLETTER-REVIEW.md exists with at least 80 lines, covering all 5 sections: proofreading issues, content assessment, layout recommendations, data consistency, and prioritized summary.</done>
</task>

</tasks>

<verification>
- NEWSLETTER-REVIEW.md exists and is comprehensive
- All 5 pages of the newsletter are addressed
- Data consistency section flags the pageCount mismatch in newsletters.json
- Recommendations are specific with page/section references
</verification>

<success_criteria>
- Complete review document with findings organized into 5 clear sections
- Each proofreading issue includes page number, problematic text, and correction
- Layout recommendations are specific and actionable
- Data discrepancies between PDF and website JSON are documented
- Priority ranking helps editor know what to address first
</success_criteria>

<output>
After completion, create `.planning/quick/2-review-sapa-philatex-q2-2026-newsletter-/2-SUMMARY.md`
</output>
