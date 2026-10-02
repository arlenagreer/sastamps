/**
 * scripts/build-search-index.js: what site search covers and where each
 * result lands. The 2026-10 UAT found that no result reached its item (S-1)
 * and that the archive and the site pages were not searchable (S-2).
 * Built from the real data/ and pages, in memory: nothing is written.
 */
const { test, before } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const lunr = require('lunr');
const {
    SearchIndexBuilder, SITE_PAGES, extractPageText, archivedIssueDate, fileUrl, quarterNewsletterMap
} = require('../scripts/build-search-index');

const ROOT = path.resolve(__dirname, '..');
let builder;
let docs;
let byId;

before(async () => {
    builder = new SearchIndexBuilder({ root: ROOT });
    docs = await builder.collect();
    builder.buildLunrIndex();
    byId = new Map(docs.map(d => [d.id, d]));
});

function search(query) {
    return builder.index.search(query).map(r => byId.get(r.ref));
}

const read = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));

test('every available archived issue is indexed and links to its own PDF', () => {
    const archived = read('data/newsletters/archived-newsletters.json').archivedNewsletters
        .filter(e => e.status === 'available');
    assert.ok(archived.length >= 98);
    for (const entry of archived) {
        const doc = byId.get(`archive-${entry.id}`);
        assert.ok(doc, `archive-${entry.id} is indexed`);
        assert.equal(decodeURIComponent(doc.url), entry.filePath);
    }
});

test('every current newsletter links to its PDF, never to newsletter.html#<id>', () => {
    for (const n of read('data/newsletters/newsletters.json').newsletters) {
        const doc = byId.get(`newsletter-${n.id}`);
        assert.equal(decodeURIComponent(doc.url), n.filePath);
    }
    assert.equal(docs.filter(d => /newsletter\.html#/.test(d.url)).length, 0);
});

test('every result link resolves to a file in the repository', () => {
    for (const doc of docs) {
        for (const url of [doc.url, doc.newsletterUrl].filter(Boolean)) {
            const file = decodeURIComponent(url.split('#')[0]);
            assert.ok(fs.existsSync(path.join(ROOT, file)), `${doc.id}: ${file} exists`);
        }
    }
});

test('anchors use the ids the pages render', () => {
    for (const doc of docs) {
        if (doc.type === 'meeting') {
            assert.match(doc.url, /^meetings\.html#meeting-\d{4}-\d{2}-\d{2}$/);
            assert.equal(doc.url, `meetings.html#meeting-${doc.date}`);
        } else if (doc.type === 'glossary') {
            assert.match(doc.url, /^glossary\.html#term-[a-z0-9-]+$/);
        } else if (doc.type === 'resource') {
            assert.match(doc.url, /^resources\.html#resource-[a-z0-9-]+$/);
        }
    }
});

test('a meeting carries its quarter and that quarter\'s PHILATEX', () => {
    const doc = byId.get('meeting-2026-07-31') || docs.find(d => d.type === 'meeting' && d.date.startsWith('2026-08'));
    assert.ok(doc);
    assert.equal(doc.quarter, '2026-Q3');
    assert.equal(doc.newsletterUrl, 'public/SAPA-PHILATEX-Third-Quarter-2026.pdf');
    const june2025 = docs.find(d => d.type === 'meeting' && d.date.startsWith('2025-06'));
    assert.equal(june2025.newsletterUrl, fileUrl('public/SAPA PHILATEX Second Quarter 2025.pdf'));
});

test('the main site pages are indexed with their text', () => {
    for (const page of SITE_PAGES) {
        const doc = byId.get(`page-${page.file.replace('.html', '')}`);
        assert.ok(doc, page.file);
        assert.equal(doc.url, page.file);
        assert.ok(doc.content.length > 200, `${page.file} has text`);
        assert.doesNotMatch(doc.content, /<[a-z]/i, `${page.file} text has no markup`);
    }
});

test('searches the UAT found broken now find the right things', () => {
    assert.ok(search('2009').length >= 6, '"2009" finds the 2009 issues');
    assert.ok(search('2009').slice(0, 6).every(d => d.id.startsWith('archive-2009-')));
    assert.equal(search('membership')[0].id, 'page-membership');
    assert.ok(search('dues').some(d => d.id === 'page-membership'), '"dues" finds the membership page');
    assert.equal(search('subscribe')[0].id, 'page-newsletter');
    assert.ok(search('covid').some(d => d.id === 'archive-2020-special-covid'));
});

test('extractPageText: main text only, entities decoded, scripts dropped', () => {
    const html = '<html><head><title>Membership - San Antonio Philatelic Association</title>'
        + '<meta name="description" content="Join &amp; enjoy"></head><body><header>NAV</header>'
        + '<main><h1>Join&nbsp;us</h1><script>var x = "<b>";</script><p>Fish &amp; chips &ndash; &#8220;ok&#8221;</p>'
        + '<noscript>no js</noscript></main><footer>FOOT</footer></body></html>';
    const out = extractPageText(html);
    assert.equal(out.title, 'Membership');
    assert.equal(out.description, 'Join & enjoy');
    assert.equal(out.text, 'Join us Fish & chips – “ok”');
});

test('archivedIssueDate: bimonthly and quarterly issues sort by their first month', () => {
    assert.equal(archivedIssueDate({ year: 2009, edition: '01' }), '2009-01-01');
    assert.equal(archivedIssueDate({ year: 2009, edition: '06' }), '2009-11-01');
    assert.equal(archivedIssueDate({ year: 2024, edition: 'Q3' }), '2024-07-01');
});

test('quarterNewsletterMap prefers the current issue list, then the archive', () => {
    const map = quarterNewsletterMap(
        [{ year: 2025, quarter: 'Second', filePath: 'public/a b.pdf' }],
        [{ year: 2024, edition: 'Q4', status: 'available', filePath: 'public/newsletter_archive/2024-q4.pdf' },
            { year: 2024, edition: '01', status: 'available', filePath: 'public/newsletter_archive/x.pdf' }]
    );
    assert.equal(map.get('2025-Q2'), 'public/a%20b.pdf');
    assert.equal(map.get('2024-Q4'), 'public/newsletter_archive/2024-q4.pdf');
    assert.equal(map.size, 2);
});

test('the serialized index loads in lunr and keeps every record', () => {
    const loaded = lunr.Index.load(JSON.parse(JSON.stringify(builder.index)));
    assert.ok(loaded.search('philatex').length > 100);
    assert.equal(builder.resultDocuments().length, docs.length);
});

test('archive.html lists every current newsletter issue', () => {
    // The 2025+ issues are static cards on archive.html; the UAT found the
    // newest issue (Q4 2026) missing from it.
    const html = fs.readFileSync(path.join(ROOT, 'archive.html'), 'utf8');
    for (const n of read('data/newsletters/newsletters.json').newsletters) {
        assert.ok(html.includes(`href="${n.filePath}"`), `archive.html links ${n.filePath}`);
    }
});
