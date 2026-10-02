/**
 * scripts/build-search-index.js: what site search covers and where each
 * result lands. The 2026-10 UAT found that no result reached its item (S-1)
 * and that the archive and the site pages were not searchable (S-2).
 * Built from the real data/ and pages, in memory: nothing is written. The
 * assertions on real data hold for any future issue or meeting; exact
 * mappings are checked on synthetic fixtures.
 */
const { test, before } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const lunr = require('lunr');
const {
    SearchIndexBuilder, SITE_PAGES, extractPageText, decodeEntities, archivedIssueDate, fileUrl,
    issueByMonthMap, meetingDocument
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

const topIds = (query, n = 3) => search(query).slice(0, n).map(d => d.id);
const read = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));

test('every available archived issue is indexed and links to its own PDF', () => {
    const archived = read('data/newsletters/archived-newsletters.json').archivedNewsletters
        .filter(e => e.status === 'available');
    assert.ok(archived.length > 0);
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

test('every source is indexed', () => {
    for (const type of ['newsletter', 'meeting', 'resource', 'glossary', 'page']) {
        assert.ok(docs.some(d => d.type === type), `${type} records present`);
    }
    assert.ok(docs.some(d => d.category === 'archive'), 'archive records present');
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
            assert.equal(doc.url, `meetings.html#meeting-${doc.date}`);
        } else if (doc.type === 'glossary') {
            assert.match(doc.url, /^glossary\.html#term-[a-z0-9-]+$/);
        } else if (doc.type === 'resource') {
            assert.match(doc.url, /^resources\.html#resource-[a-z0-9-]+$/);
        }
    }
});

test('each meeting in a month a current issue covers links to that issue', () => {
    const issues = read('data/newsletters/newsletters.json').newsletters;
    const byMonth = issueByMonthMap(issues, []);
    const meetings = docs.filter(d => d.type === 'meeting' && byMonth.has(d.date.slice(0, 7)));
    assert.ok(meetings.length > 0, 'some meeting falls in a current issue');
    for (const m of meetings) {
        assert.equal(m.newsletterUrl, byMonth.get(m.date.slice(0, 7)).url, m.id);
        assert.match(m.quarter, /^\d{4}-Q[1-4]$/);
    }
});

test('issueByMonthMap: quarterly, bimonthly (2027 on) and archived issues', () => {
    const map = issueByMonthMap(
        [
            { id: '2026-Q4', year: 2026, quarter: 'Fourth', filePath: 'public/SAPA PHILATEX Q4.pdf' },
            { id: '2027-01', year: 2027, months: ['January', 'February'], filePath: 'public/SAPA-PHILATEX-January-February-2027.pdf' }
        ],
        [
            { year: 2024, edition: 'Q2', editionLabel: 'Second Quarter: April, May, June', status: 'available', filePath: 'public/newsletter_archive/2024-q2.pdf' },
            { year: 2023, edition: '06', editionLabel: 'November/December', status: 'available', filePath: 'public/newsletter_archive/2023-06.pdf' },
            { year: 2012, edition: '04', editionLabel: 'July/August', status: 'unavailable', filePath: null }
        ]
    );
    assert.deepEqual(map.get('2026-11'), { url: 'public/SAPA%20PHILATEX%20Q4.pdf', label: 'Fourth Quarter 2026' });
    assert.deepEqual(map.get('2027-02'), { url: 'public/SAPA-PHILATEX-January-February-2027.pdf', label: 'January/February 2027' });
    assert.equal(map.has('2027-03'), false);
    assert.equal(map.get('2024-06').url, 'public/newsletter_archive/2024-q2.pdf');
    assert.equal(map.get('2023-12').label, 'November/December 2023');
    assert.equal(map.has('2012-07'), false);
});

test('a 2027 meeting links to its bimonthly issue', () => {
    const map = issueByMonthMap(
        [{ id: '2027-01', year: 2027, months: ['January', 'February'], filePath: 'public/SAPA-PHILATEX-January-February-2027.pdf' }],
        []
    );
    const doc = meetingDocument({ id: '2027-01-15', date: '2027-01-15', title: 'Club Auction' }, map, builder);
    assert.equal(doc.url, 'meetings.html#meeting-2027-01-15');
    assert.equal(doc.newsletterUrl, 'public/SAPA-PHILATEX-January-February-2027.pdf');
    assert.equal(doc.newsletterLabel, 'January/February 2027');
    assert.equal(doc.quarter, '2027-Q1');
    const unlisted = meetingDocument({ id: '2027-03-05', date: '2027-03-05', title: 'Bourse' }, map, builder);
    assert.equal(unlisted.newsletterUrl, null);
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
    const archive2009 = read('data/newsletters/archived-newsletters.json').archivedNewsletters
        .filter(e => e.year === 2009 && e.status === 'available').length;
    const hits2009 = search('2009').filter(d => d.category === 'archive' && d.id.startsWith('archive-2009-'));
    assert.equal(hits2009.length, archive2009, '"2009" finds every 2009 issue');
    assert.ok(topIds('membership').includes('page-membership'), '"membership": page in the top 3');
    assert.ok(search('dues').some(d => d.id === 'page-membership'), '"dues" finds the membership page');
    assert.ok(topIds('subscribe').includes('page-newsletter'), '"subscribe": newsletter page in the top 3');
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

test('decodeEntities: invalid code points become U+FFFD instead of throwing', () => {
    assert.equal(decodeEntities('a&#99999999;b'), 'a�b');
    assert.equal(decodeEntities('&#xD800;'), '�');
    assert.equal(decodeEntities('&#x110000;'), '�');
    assert.equal(decodeEntities('&#x1F4EC; &#65; &unknown;'), '📬 A &unknown;');
});

test('archivedIssueDate: bimonthly and quarterly issues sort by their first month', () => {
    assert.equal(archivedIssueDate({ year: 2009, edition: '01' }), '2009-01-01');
    assert.equal(archivedIssueDate({ year: 2009, edition: '06' }), '2009-11-01');
    assert.equal(archivedIssueDate({ year: 2024, edition: 'Q3' }), '2024-07-01');
});

test('fileUrl encodes each path segment', () => {
    assert.equal(fileUrl('public/SAPA PHILATEX Second Quarter 2025.pdf'), 'public/SAPA%20PHILATEX%20Second%20Quarter%202025.pdf');
});

test('a missing or broken source is skipped, not fatal', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'search-index-'));
    try {
        fs.mkdirSync(path.join(tmp, 'data', 'newsletters'), { recursive: true });
        fs.writeFileSync(path.join(tmp, 'data', 'newsletters', 'newsletters.json'), JSON.stringify({
            newsletters: [{ id: '2027-01', title: 'SAPA PHILATEX January/February 2027', year: 2027,
                months: ['January', 'February'], publishDate: '2027-01-01', description: 'x',
                filePath: 'public/SAPA-PHILATEX-January-February-2027.pdf' }]
        }));
        fs.writeFileSync(path.join(tmp, 'data', 'newsletters', 'archived-newsletters.json'), '{ not json');
        fs.writeFileSync(path.join(tmp, 'membership.html'), '<main><p>' + 'Join SAPA. '.repeat(30) + '</p></main>');
        const partial = new SearchIndexBuilder({ root: tmp });
        const out = await partial.collect();
        assert.deepEqual(out.map(d => d.id).sort(), ['newsletter-2027-01', 'page-membership']);
    } finally {
        fs.rmSync(tmp, { recursive: true, force: true });
    }
});

test('the serialized index loads in lunr and keeps every record', () => {
    const loaded = lunr.Index.load(JSON.parse(JSON.stringify(builder.index)));
    assert.ok(loaded.search('philatex').length > 0);
    assert.equal(builder.resultDocuments().length, docs.length);
});
