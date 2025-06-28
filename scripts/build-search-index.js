/**
 * Search Index Builder
 * Generates Lunr.js search index from JSON data files
 */

const fs = require('fs').promises;
const path = require('path');
const lunr = require('lunr');

class SearchIndexBuilder {
    constructor() {
        this.dataDir = 'data';
        this.outputDir = 'dist/data';
        this.documents = [];
        this.index = null;
    }

    /**
     * Build complete search index from all data sources
     */
    async build() {
        try {
            console.log('🔍 Building search index...');

            // Ensure output directory exists
            await this.ensureDir(this.outputDir);

            // Load all data sources
            await this.loadNewsletters();
            await this.loadMeetings();
            await this.loadResources();
            await this.loadGlossary();

            // Build Lunr index
            this.buildLunrIndex();

            // Save index and documents
            await this.saveIndex();
            await this.saveDocuments();

            console.log(`✅ Search index built successfully with ${this.documents.length} documents`);

        } catch (error) {
            console.error('❌ Search index build failed:', error);
            throw error;
        }
    }

    /**
     * Load newsletter data
     */
    async loadNewsletters() {
        try {
            const filePath = path.join(this.dataDir, 'newsletters', 'newsletters.json');
            const data = JSON.parse(await fs.readFile(filePath, 'utf8'));

            for (const newsletter of data.newsletters) {
                this.documents.push({
                    id: `newsletter-${newsletter.id}`,
                    type: 'newsletter',
                    title: newsletter.title,
                    content: this.buildNewsletterContent(newsletter),
                    summary: newsletter.description,
                    url: `/newsletter.html#${newsletter.id}`,
                    date: newsletter.publishDate,
                    tags: newsletter.tags || [],
                    category: 'newsletter'
                });
            }

            console.log(`📰 Loaded ${data.newsletters.length} newsletters`);
        } catch (error) {
            console.warn('⚠️ Could not load newsletters:', error.message);
        }
    }

    /**
     * Load meeting data
     */
    async loadMeetings() {
        try {
            const filePath = path.join(this.dataDir, 'meetings', 'meetings.json');
            const data = JSON.parse(await fs.readFile(filePath, 'utf8'));

            for (const meeting of data.meetings) {
                this.documents.push({
                    id: `meeting-${meeting.id}`,
                    type: 'meeting',
                    title: meeting.title || meeting.topic || 'SAPA Meeting',
                    content: this.buildMeetingContent(meeting),
                    summary: meeting.description || '',
                    url: `/meetings.html#${meeting.id}`,
                    date: meeting.date,
                    tags: meeting.tags || [],
                    category: 'meeting'
                });
            }

            console.log(`🤝 Loaded ${data.meetings.length} meetings`);
        } catch (error) {
            console.warn('⚠️ Could not load meetings:', error.message);
        }
    }

    /**
     * Load resource data
     */
    async loadResources() {
        try {
            const filePath = path.join(this.dataDir, 'members', 'resources.json');
            const data = JSON.parse(await fs.readFile(filePath, 'utf8'));

            for (const resource of data.resources) {
                this.documents.push({
                    id: `resource-${resource.id}`,
                    type: 'resource',
                    title: resource.title,
                    content: this.buildResourceContent(resource),
                    summary: resource.summary,
                    url: `/resources.html#${resource.slug}`,
                    date: resource.dateCreated || resource.dateUpdated,
                    tags: resource.tags || [],
                    category: resource.category,
                    difficulty: resource.difficulty
                });
            }

            console.log(`📚 Loaded ${data.resources.length} resources`);
        } catch (error) {
            console.warn('⚠️ Could not load resources:', error.message);
        }
    }

    /**
     * Load glossary data
     */
    async loadGlossary() {
        try {
            const filePath = path.join(this.dataDir, 'glossary', 'glossary.json');
            const data = JSON.parse(await fs.readFile(filePath, 'utf8'));

            for (const term of data.terms) {
                this.documents.push({
                    id: `glossary-${term.id}`,
                    type: 'glossary',
                    title: term.term,
                    content: this.buildGlossaryContent(term),
                    summary: term.definition,
                    url: `/glossary.html#${term.slug}`,
                    date: term.dateAdded || term.dateUpdated,
                    tags: term.tags || [],
                    category: term.category,
                    difficulty: term.difficulty
                });
            }

            console.log(`📖 Loaded ${data.terms.length} glossary terms`);
        } catch (error) {
            console.warn('⚠️ Could not load glossary:', error.message);
        }
    }

    /**
     * Build newsletter content for search
     */
    buildNewsletterContent(newsletter) {
        let content = newsletter.title + ' ' + newsletter.description;
        
        if (newsletter.highlights) {
            content += ' ' + newsletter.highlights.join(' ');
        }
        
        if (newsletter.featuredArticles) {
            const articles = newsletter.featuredArticles
                .map(article => `${article.title} ${article.category}`)
                .join(' ');
            content += ' ' + articles;
        }
        
        if (newsletter.tags) {
            content += ' ' + newsletter.tags.join(' ');
        }
        
        return content;
    }

    /**
     * Build meeting content for search
     */
    buildMeetingContent(meeting) {
        let content = (meeting.title || meeting.topic || '') + ' ' + (meeting.description || '');
        
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
            const agendaItems = meeting.agenda
                .map(item => item.item)
                .join(' ');
            content += ' ' + agendaItems;
        }
        
        if (meeting.tags) {
            content += ' ' + meeting.tags.join(' ');
        }
        
        return content;
    }

    /**
     * Build resource content for search
     */
    buildResourceContent(resource) {
        let content = resource.title + ' ' + resource.summary + ' ' + resource.content;
        
        if (resource.sections) {
            const sectionContent = resource.sections
                .map(section => `${section.title} ${section.content}`)
                .join(' ');
            content += ' ' + sectionContent;
        }
        
        if (resource.tags) {
            content += ' ' + resource.tags.join(' ');
        }
        
        if (resource.category) {
            content += ' ' + resource.category.replace('-', ' ');
        }
        
        return content;
    }

    /**
     * Build glossary content for search
     */
    buildGlossaryContent(term) {
        let content = term.term + ' ' + term.definition;
        
        if (term.alternateNames) {
            content += ' ' + term.alternateNames.join(' ');
        }
        
        if (term.detailedDescription) {
            content += ' ' + term.detailedDescription;
        }
        
        if (term.examples) {
            const examples = term.examples
                .map(example => example.description)
                .join(' ');
            content += ' ' + examples;
        }
        
        if (term.tags) {
            content += ' ' + term.tags.join(' ');
        }
        
        if (term.category) {
            content += ' ' + term.category.replace('-', ' ');
        }
        
        return content;
    }

    /**
     * Build Lunr search index
     */
    buildLunrIndex() {
        console.log('🔨 Building Lunr index...');
        
        const documents = this.documents;
        
        this.index = lunr(function() {
            this.ref('id');
            this.field('title', { boost: 10 });
            this.field('content', { boost: 5 });
            this.field('summary', { boost: 3 });
            this.field('tags', { boost: 2 });
            this.field('category');
            this.field('type');
            
            // Add all documents to index
            documents.forEach((doc) => {
                this.add(doc);
            });
        });
    }

    /**
     * Save search index to file
     */
    async saveIndex() {
        const indexPath = path.join(this.outputDir, 'search-index.json');
        const serializedIndex = JSON.stringify(this.index);
        await fs.writeFile(indexPath, serializedIndex);
        console.log(`💾 Search index saved to ${indexPath}`);
    }

    /**
     * Save document data for search results
     */
    async saveDocuments() {
        const docsPath = path.join(this.outputDir, 'search-documents.json');
        
        // Save minimal document data for search results
        const minimalDocs = this.documents.map(doc => ({
            id: doc.id,
            type: doc.type,
            title: doc.title,
            summary: doc.summary,
            url: doc.url,
            date: doc.date,
            tags: doc.tags,
            category: doc.category,
            difficulty: doc.difficulty
        }));
        
        const documentsData = {
            documents: minimalDocs,
            metadata: {
                totalDocuments: minimalDocs.length,
                types: {
                    newsletter: minimalDocs.filter(d => d.type === 'newsletter').length,
                    meeting: minimalDocs.filter(d => d.type === 'meeting').length,
                    resource: minimalDocs.filter(d => d.type === 'resource').length,
                    glossary: minimalDocs.filter(d => d.type === 'glossary').length
                },
                buildDate: new Date().toISOString()
            }
        };
        
        await fs.writeFile(docsPath, JSON.stringify(documentsData, null, 2));
        console.log(`📄 Search documents saved to ${docsPath}`);
    }

    /**
     * Ensure directory exists
     */
    async ensureDir(dir) {
        try {
            await fs.mkdir(dir, { recursive: true });
        } catch (err) {
            if (err.code !== 'EEXIST') throw err;
        }
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

module.exports = { SearchIndexBuilder };