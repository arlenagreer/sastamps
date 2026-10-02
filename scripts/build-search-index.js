/**
 * Search Index Builder
 * Generates the Lunr.js search index (dist/data/search-index.json) and the
 * result records search.html renders (dist/data/search-documents.json).
 *
 * Every record's url must land on the thing it found (UAT finding S-1):
 * - a newsletter or archived issue links to its PDF;
 * - a meeting carries two links, chosen by search.html at view time: the
 *   card on meetings.html (#meeting-YYYY-MM-DD) while meetings.html shows
 *   that meeting's quarter, otherwise the PDF of the PHILATEX issue (quarterly,
 *   or bimonthly from 2027) whose calendar lists it;
 * - a glossary term links to glossary.html#term-<id>, a resource guide to
 *   resources.html#resource-<id>;
 * - a site page links to the page itself.
 * The index covers the current issues, the archive (2008 on), meetings,
 * resources, glossary terms and the text of the main site pages (S-2).
 */

const fs = require('fs').promises;
const path = require('path');
const lunr = require('lunr');

const ROOT = path.resolve(__dirname, '..');

/**
 * The site pages whose text is indexed. `keywords` are search aliases for a
 * page (words a visitor types that the page itself does not use, such as
 * "dues" for the page that leads to the membership application). They are
 * indexed but never displayed.
 */
const SITE_PAGES = [
    { file: 'index.html', title: 'Home', keywords: ['home', 'welcome'] },
    { file: 'about.html', keywords: ['history', 'officers', 'club'] },
    { file: 'membership.html', keywords: ['join', 'joining', 'dues', 'application', 'member', 'members', 'renew', 'renewal'] },
    { file: 'meetings.html', keywords: ['schedule', 'calendar', 'location', 'directions', 'when', 'where'] },
    { file: 'newsletter.html', keywords: ['philatex', 'subscribe', 'subscription', 'editor', 'current issue'] },
    { file: 'archive.html', keywords: ['philatex', 'back issues', 'past issues', 'old newsletters'] },
    { file: 'resources.html', keywords: ['guides', 'beginners', 'learn'] },
    { file: 'glossary.html', keywords: ['terms', 'definitions', 'dictionary', 'vocabulary'] },
    { file: 'contact.html', keywords: ['email', 'message', 'question', 'questions'] }
];

// How much page text search-documents.json keeps for the result snippet.
const PAGE_CONTENT_LIMIT = 3000;

const ENTITIES = {
    amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
    ndash: '–', mdash: '—', hellip: '…', copy: '©', rsquo: '’', lsquo: '‘',
    rdquo: '”', ldquo: '“', middot: '·', bull: '•', rsaquo: '›', lsaquo: '‹', raquo: '»', laquo: '«'
};

function decodeEntities(text) {
    return text.replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z]+);/gi, (match, name) => {
        if (name[0] === '#') {
            const code = name[1] === 'x' || name[1] === 'X' ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10);
            // An invalid code point (&#xD800;, &#99999999;) becomes U+FFFD
            // rather than throwing and failing the build.
            const valid = Number.isInteger(code) && code >= 0 && code <= 0x10FFFF && !(code >= 0xD800 && code <= 0xDFFF);
            return valid ? String.fromCodePoint(code) : '\uFFFD';
        }
        const decoded = ENTITIES[name.toLowerCase()];
        return decoded === undefined ? match : decoded;
    });
}

/**
 * The visible text of a page's <main> (or <body>), without scripts, styles
 * and <noscript> blocks. Our own pages only, so a regex pass is enough.
 * @param {string} html
 * @returns {{title: string, description: string, text: string}}
 */
function extractPageText(html) {
    const titleMatch = /<title>([\s\S]*?)<\/title>/i.exec(html);
    const title = titleMatch
        ? decodeEntities(titleMatch[1]).replace(/\s*[-|–]\s*San Antonio Philatelic Association\s*$/i, '').trim()
        : '';
    const descMatch = /<meta\s+name="description"\s+content="([^"]*)"/i.exec(html);
    const description = descMatch ? decodeEntities(descMatch[1]).trim() : '';
    const mainMatch = /<main\b[^>]*>([\s\S]*?)<\/main>/i.exec(html) || /<body\b[^>]*>([\s\S]*?)<\/body>/i.exec(html);
    let body = mainMatch ? mainMatch[1] : html;
    body = body
        .replace(/<!--[\s\S]*?-->/g, ' ')
        .replace(/<(script|style|noscript|template)\b[\s\S]*?<\/\1>/gi, ' ')
        .replace(/<[^>]+>/g, ' ');
    const text = decodeEntities(body).replace(/\s+/g, ' ').trim();
    return { title, description, text };
}

/** A repository-relative file path as a link from a root page (spaces and all). */
function fileUrl(filePath) {
    return filePath.split('/').map(encodeURIComponent).join('/');
}

/** "2026-10-01" -> { year: 2026, quarter: 4 } */
function quarterOfDate(isoDate) {
    const [year, month] = isoDate.split('-').map(Number);
    return { year, quarter: Math.floor((month - 1) / 3) + 1 };
}

const QUARTER_NAMES = { First: 1, Second: 2, Third: 3, Fourth: 4 };
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

/** The months (1-12) an archived edition covers: Q1-Q4 or bimonthly 01-06. */
function archivedEditionMonths(edition) {
    const q = /^Q([1-4])$/.exec(edition);
    if (q) {
        const start = (Number(q[1]) - 1) * 3 + 1;
        return [start, start + 1, start + 2];
    }
    const b = /^0([1-6])$/.exec(edition);
    if (b) {
        const start = (Number(b[1]) - 1) * 2 + 1;
        return [start, start + 1];
    }
    return [];
}

/** The months (1-12) a newsletters.json issue covers: by quarter, or by months (bimonthly, 2027 on). */
function issueMonths(n) {
    const q = QUARTER_NAMES[n.quarter];
    if (q) {
        const start = (q - 1) * 3 + 1;
        return [start, start + 1, start + 2];
    }
    if (Array.isArray(n.months)) {
        return n.months.map(m => MONTH_NAMES.indexOf(m) + 1).filter(m => m > 0);
    }
    return [];
}

/** "Fourth Quarter 2026" or "January/February 2027". */
function issueLabel(n) {
    if (QUARTER_NAMES[n.quarter]) {
        return `${n.quarter} Quarter ${n.year}`;
    }
    if (Array.isArray(n.months) && n.months.length) {
        return `${n.months.join('/')} ${n.year}`;
    }
    return n.title;
}

const monthKey = (year, month) => `${year}-${String(month).padStart(2, '0')}`;

/**
 * Map "YYYY-MM" -> { url, label } of the PHILATEX issue covering that month
 * (whose calendar lists that month's meetings): quarterly or bimonthly
 * issues from newsletters.json first, then the archive.
 */
function issueByMonthMap(newsletters, archived) {
    const map = new Map();
    for (const n of newsletters) {
        if (!n.filePath) { continue; }
        for (const m of issueMonths(n)) {
            map.set(monthKey(n.year, m), { url: fileUrl(n.filePath), label: issueLabel(n) });
        }
    }
    for (const a of archived) {
        if (a.status !== 'available' || !a.filePath) { continue; }
        for (const m of archivedEditionMonths(a.edition)) {
            const key = monthKey(a.year, m);
            if (!map.has(key)) {
                map.set(key, { url: fileUrl(a.filePath), label: `${a.editionLabel} ${a.year}` });
            }
        }
    }
    return map;
}

/** Sort date for an archived issue: the first day of its first month. */
function archivedIssueDate(entry) {
    const bimonthly = /^0([1-6])$/.exec(entry.edition);
    if (bimonthly) {
        const month = (Number(bimonthly[1]) - 1) * 2 + 1;
        return `${entry.year}-${String(month).padStart(2, '0')}-01`;
    }
    const quarterly = /^Q([1-4])$/.exec(entry.edition);
    if (quarterly) {
        const month = (Number(quarterly[1]) - 1) * 3 + 1;
        return `${entry.year}-${String(month).padStart(2, '0')}-01`;
    }
    // Special editions (2020's Covid-19 issue) fall between the regular ones;
    // only the year is certain, so the record shows no exact date.
    return `${entry.year}-04-15`;
}

function archivedDocument(entry) {
    const period = `${entry.editionLabel} ${entry.year}`;
    return {
        id: `archive-${entry.id}`,
        type: 'newsletter',
        title: entry.title,
        content: `${entry.title} ${period} PHILATEX newsletter archive back issue ${entry.year}`,
        summary: `PHILATEX issue for ${period}, from the newsletter archive (PDF).`,
        url: fileUrl(entry.filePath),
        date: archivedIssueDate(entry),
        period,
        tags: [String(entry.year), 'Archive'],
        category: 'archive',
        keywords: ''
    };
}

function meetingDocument(meeting, issueByMonth, builder) {
    const { year, quarter } = quarterOfDate(meeting.date);
    const issue = issueByMonth.get(meeting.date.slice(0, 7)) || null;
    return {
        id: `meeting-${meeting.id}`,
        type: 'meeting',
        title: meeting.title || meeting.topic || 'SAPA Meeting',
        content: builder.buildMeetingContent(meeting),
        summary: meeting.description || meeting.topic || '',
        // meetings.html renders each card as <article id="meeting-YYYY-MM-DD">.
        url: `meetings.html#meeting-${encodeURIComponent(meeting.id)}`,
        // The PHILATEX whose calendar lists this meeting (quarterly or bimonthly).
        newsletterUrl: issue ? issue.url : null,
        newsletterLabel: issue ? issue.label : null,
        // The calendar quarter, which decides whether meetings.html shows it.
        quarter: `${year}-Q${quarter}`,
        date: meeting.date,
        tags: meeting.tags || [],
        category: meeting.type || 'meeting',
        cancelled: meeting.cancelled === true || meeting.type === 'holiday',
        keywords: ''
    };
}

class SearchIndexBuilder {
    constructor(options = {}) {
        this.root = options.root || ROOT;
        this.dataDir = path.join(this.root, 'data');
        this.outputDir = path.join(this.root, 'dist', 'data');
        this.documents = [];
        this.index = null;
    }

    /**
     * Build complete search index from all data sources
     */
    async build() {
        try {
            console.log('🔍 Building search index...');

            await this.ensureDir(this.outputDir);
            await this.collect();
            this.buildLunrIndex();
            await this.saveIndex();
            await this.saveDocuments();

            console.log(`✅ Search index built successfully with ${this.documents.length} documents`);
        } catch (error) {
            console.error('❌ Search index build failed:', error);
            throw error;
        }
    }

    /**
     * Load every source into this.documents. Each source is loaded on its
     * own: one that fails is logged and skipped, so a bad file cannot take
     * search down with it (tests/search-index.test.js checks that every
     * source is present).
     */
    async collect() {
        this.documents = [];
        const newsletters = await this.tryLoad('newsletters', () => this.readJSON('newsletters', 'newsletters.json'));
        const archived = await this.tryLoad('archived newsletters', () => this.readJSON('newsletters', 'archived-newsletters.json'));
        const current = (newsletters && newsletters.newsletters) || [];
        const archive = (archived && archived.archivedNewsletters) || [];
        await this.tryLoad('newsletters', () => this.loadNewsletters(current));
        await this.tryLoad('archived newsletters', () => this.loadArchivedNewsletters(archive));
        const issueByMonth = issueByMonthMap(current, archive);
        await this.tryLoad('meetings', async () => this.loadMeetings((await this.readJSON('meetings', 'meetings.json')).meetings, issueByMonth));
        await this.tryLoad('resources', async () => this.loadResources((await this.readJSON('members', 'resources.json')).resources));
        await this.tryLoad('glossary', async () => this.loadGlossary((await this.readJSON('glossary', 'glossary.json')).terms));
        await this.loadSitePages();
        return this.documents;
    }

    async tryLoad(what, fn) {
        try {
            return await fn();
        } catch (error) {
            console.warn(`⚠️ Search index: skipped ${what} (${error.message})`);
            return null;
        }
    }

    async readJSON(...parts) {
        return JSON.parse(await fs.readFile(path.join(this.dataDir, ...parts), 'utf8'));
    }

    loadNewsletters(newsletters) {
        for (const newsletter of newsletters) {
            this.documents.push({
                id: `newsletter-${newsletter.id}`,
                type: 'newsletter',
                title: newsletter.title,
                content: this.buildNewsletterContent(newsletter),
                summary: newsletter.description,
                url: fileUrl(newsletter.filePath),
                date: newsletter.publishDate,
                tags: newsletter.tags || [],
                category: 'newsletter',
                keywords: 'philatex newsletter issue'
            });
        }
        console.log(`📰 Loaded ${newsletters.length} newsletters`);
    }

    loadArchivedNewsletters(entries) {
        const available = entries.filter(e => e.status === 'available' && e.filePath);
        for (const entry of available) {
            this.documents.push(archivedDocument(entry));
        }
        console.log(`🗄️  Loaded ${available.length} archived newsletters`);
    }

    loadMeetings(meetings, byQuarter) {
        for (const meeting of meetings) {
            this.documents.push(meetingDocument(meeting, byQuarter, this));
        }
        console.log(`🤝 Loaded ${meetings.length} meetings`);
    }

    loadResources(resources) {
        for (const resource of resources) {
            this.documents.push({
                id: `resource-${resource.id}`,
                type: 'resource',
                title: resource.title,
                content: this.buildResourceContent(resource),
                summary: resource.summary,
                url: `resources.html#resource-${encodeURIComponent(resource.id)}`,
                date: resource.dateCreated || resource.dateUpdated,
                tags: resource.tags || [],
                category: resource.category,
                difficulty: resource.difficulty,
                keywords: ''
            });
        }
        console.log(`📚 Loaded ${resources.length} resources`);
    }

    loadGlossary(terms) {
        for (const term of terms) {
            this.documents.push({
                id: `glossary-${term.id}`,
                type: 'glossary',
                title: term.term,
                content: this.buildGlossaryContent(term),
                summary: term.definition,
                // glossary.js renders each term as id="term-<term.id>".
                url: `glossary.html#term-${encodeURIComponent(term.id)}`,
                date: null,
                tags: term.tags || [],
                category: term.category,
                difficulty: term.difficulty,
                keywords: 'glossary definition'
            });
        }
        console.log(`📖 Loaded ${terms.length} glossary terms`);
    }

    async loadSitePages() {
        for (const page of SITE_PAGES) {
            let html;
            try {
                html = await fs.readFile(path.join(this.root, page.file), 'utf8');
            } catch (error) {
                console.warn(`⚠️ Search index: skipped page ${page.file} (${error.message})`);
                continue;
            }
            const { title, description, text } = extractPageText(html);
            this.documents.push({
                id: `page-${page.file.replace(/\.html$/, '')}`,
                type: 'page',
                title: page.title || title || page.file,
                content: text,
                summary: description,
                url: page.file,
                date: null,
                tags: [],
                category: 'page',
                keywords: page.keywords.join(' ')
            });
        }
        console.log(`🌐 Loaded ${SITE_PAGES.length} site pages`);
    }

    buildNewsletterContent(newsletter) {
        let content = newsletter.title + ' ' + newsletter.description;
        if (newsletter.highlights) {
            content += ' ' + newsletter.highlights.join(' ');
        }
        if (newsletter.featuredArticles) {
            content += ' ' + newsletter.featuredArticles.map(a => `${a.title} ${a.category}`).join(' ');
        }
        if (newsletter.tags) {
            content += ' ' + newsletter.tags.join(' ');
        }
        return content;
    }

    buildMeetingContent(meeting) {
        let content = (meeting.title || meeting.topic || '') + ' ' + (meeting.topic || '') + ' ' + (meeting.description || '');
        if (meeting.presenter && meeting.presenter.name) {
            content += ' ' + meeting.presenter.name;
            if (meeting.presenter.title) {
                content += ' ' + meeting.presenter.title;
            }
        }
        if (meeting.location && meeting.location.name) {
            content += ' ' + meeting.location.name;
        }
        if (meeting.specialNotes) {
            content += ' ' + meeting.specialNotes.join(' ');
        }
        if (meeting.agenda) {
            content += ' ' + meeting.agenda.map(item => (typeof item === 'string' ? item : item.item || '')).join(' ');
        }
        if (meeting.tags) {
            content += ' ' + meeting.tags.join(' ');
        }
        return content;
    }

    buildResourceContent(resource) {
        let content = resource.title + ' ' + resource.summary + ' ' + resource.content;
        if (resource.sections) {
            content += ' ' + resource.sections.map(s => `${s.title} ${s.content}`).join(' ');
        }
        if (resource.tags) {
            content += ' ' + resource.tags.join(' ');
        }
        if (resource.category) {
            content += ' ' + resource.category.replace(/-/g, ' ');
        }
        return content;
    }

    buildGlossaryContent(term) {
        let content = term.term + ' ' + term.definition;
        if (term.alternateNames) {
            content += ' ' + term.alternateNames.join(' ');
        }
        if (term.detailedDescription) {
            content += ' ' + term.detailedDescription;
        }
        if (term.examples) {
            content += ' ' + term.examples.map(e => e.description).join(' ');
        }
        if (term.tags) {
            content += ' ' + term.tags.join(' ');
        }
        if (term.category) {
            content += ' ' + term.category.replace(/-/g, ' ');
        }
        return content;
    }

    buildLunrIndex() {
        console.log('🔨 Building Lunr index...');
        const documents = this.documents;
        this.index = lunr(function() {
            this.ref('id');
            // Keywords are indexed with the title, not as a field of their
            // own: a field most records leave empty has a tiny average length,
            // and BM25's length normalisation then all but cancels any match
            // in it ("dues" scored 2.7 for the membership page, against 19
            // for "No meeting due to ...").
            this.field('title', { boost: 10, extractor: (doc) => `${doc.title} ${doc.keywords || ''}` });
            this.field('content', { boost: 5 });
            this.field('summary', { boost: 3 });
            this.field('tags', { boost: 2, extractor: (doc) => (doc.tags || []).join(' ') });
            this.field('category');
            this.field('type');
            documents.forEach((doc) => {
                this.add(doc);
            });
        });
        return this.index;
    }

    async saveIndex() {
        const indexPath = path.join(this.outputDir, 'search-index.json');
        await fs.writeFile(indexPath, JSON.stringify(this.index));
        console.log(`💾 Search index saved to ${path.relative(this.root, indexPath)}`);
    }

    /** The record search.html renders for each result. */
    resultDocuments() {
        return this.documents.map(doc => {
            const out = {
                id: doc.id,
                type: doc.type,
                title: doc.title,
                summary: doc.summary,
                url: doc.url,
                date: doc.date,
                tags: doc.tags,
                category: doc.category
            };
            if (doc.difficulty) { out.difficulty = doc.difficulty; }
            if (doc.period) { out.period = doc.period; }
            if (doc.type === 'meeting') {
                out.newsletterUrl = doc.newsletterUrl;
                out.newsletterLabel = doc.newsletterLabel;
                out.quarter = doc.quarter;
                out.cancelled = doc.cancelled;
            }
            // Page text feeds the "content match" snippet; pages have no
            // other summary of what is on them.
            if (doc.type === 'page') {
                out.content = doc.content.slice(0, PAGE_CONTENT_LIMIT);
            }
            return out;
        });
    }

    async saveDocuments() {
        const docsPath = path.join(this.outputDir, 'search-documents.json');
        const minimalDocs = this.resultDocuments();
        const types = {};
        for (const d of minimalDocs) {
            types[d.type] = (types[d.type] || 0) + 1;
        }
        const documentsData = {
            documents: minimalDocs,
            metadata: {
                totalDocuments: minimalDocs.length,
                types,
                buildDate: new Date().toISOString()
            }
        };
        await fs.writeFile(docsPath, JSON.stringify(documentsData));
        console.log(`📄 Search documents saved to ${path.relative(this.root, docsPath)}`);
    }

    async ensureDir(dir) {
        await fs.mkdir(dir, { recursive: true });
    }
}

// Run if called directly
if (require.main === module) {
    const builder = new SearchIndexBuilder();
    builder.build().catch(err => {
        console.error(err);
        process.exit(1);
    });
}

module.exports = {
    SearchIndexBuilder,
    SITE_PAGES,
    extractPageText,
    archivedDocument,
    archivedIssueDate,
    issueByMonthMap,
    meetingDocument,
    decodeEntities,
    fileUrl
};
