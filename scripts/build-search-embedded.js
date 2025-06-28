#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read the search data files
const searchIndexPath = path.join(__dirname, '../dist/data/search-index.json');
const searchDocsPath = path.join(__dirname, '../dist/data/search-documents.json');

if (!fs.existsSync(searchIndexPath) || !fs.existsSync(searchDocsPath)) {
    console.error('Search data files not found. Please run build-search-index.js first.');
    process.exit(1);
}

const searchIndex = fs.readFileSync(searchIndexPath, 'utf8');
const searchDocs = fs.readFileSync(searchDocsPath, 'utf8');

// Read the search.html file
const searchHtmlPath = path.join(__dirname, '../search.html');
let searchHtml = fs.readFileSync(searchHtmlPath, 'utf8');

// Create the embedded data script
const embeddedDataScript = `
    <!-- Embedded search data for offline functionality -->
    <script>
        window.SEARCH_INDEX_DATA = ${searchIndex};
        window.SEARCH_DOCUMENTS_DATA = ${searchDocs};
    </script>
`;

// Find where to insert the embedded data (before the search functionality script)
const searchScriptMarker = '<!-- Search functionality -->';
if (searchHtml.includes(searchScriptMarker)) {
    searchHtml = searchHtml.replace(searchScriptMarker, embeddedDataScript + '\n    ' + searchScriptMarker);
} else {
    // If marker not found, insert before closing body tag
    searchHtml = searchHtml.replace('</body>', embeddedDataScript + '\n</body>');
}

// Update the initializeSearch function to use embedded data if available
const oldInitFunction = `async function initializeSearch() {
            if (isLoading) return;
            isLoading = true;

            const statusEl = document.getElementById('searchStatus');
            statusEl.className = 'search-status loading';
            statusEl.textContent = 'Loading search index...';

            try {
                // Determine the base path based on protocol
                let basePath = '';
                if (window.location.protocol === 'file:') {
                    // For local file system, use absolute path
                    basePath = window.location.href.substring(0, window.location.href.lastIndexOf('/'));
                } else {
                    // For web (GitHub Pages), use relative path
                    basePath = '.';
                }

                // Load search index and documents
                const [indexResponse, docsResponse] = await Promise.all([
                    fetch(basePath + '/dist/data/search-index.json'),
                    fetch(basePath + '/dist/data/search-documents.json')
                ]);

                if (!indexResponse.ok || !docsResponse.ok) {
                    throw new Error('Failed to load search data');
                }

                const indexData = await indexResponse.json();
                const docsData = await docsResponse.json();

                // Initialize Lunr index
                searchIndex = lunr.Index.load(indexData);

                // Build documents map
                docsData.documents.forEach(doc => {
                    documents[doc.id] = doc;
                });

                statusEl.style.display = 'none';
                
                // Focus on search input
                document.getElementById('searchInput').focus();

                // Check for search query in URL
                const urlParams = new URLSearchParams(window.location.search);
                const query = urlParams.get('q');
                if (query) {
                    document.getElementById('searchInput').value = query;
                    performSearch();
                }

            } catch (error) {
                console.error('Search initialization error:', error);
                statusEl.className = 'search-status error';
                statusEl.textContent = 'Failed to load search index. Please try again later.';
            } finally {
                isLoading = false;
            }
        }`;

const newInitFunction = `async function initializeSearch() {
            if (isLoading) return;
            isLoading = true;

            const statusEl = document.getElementById('searchStatus');
            statusEl.className = 'search-status loading';
            statusEl.textContent = 'Loading search index...';

            try {
                let indexData, docsData;
                
                // Check if embedded data is available
                if (window.SEARCH_INDEX_DATA && window.SEARCH_DOCUMENTS_DATA) {
                    // Use embedded data
                    indexData = window.SEARCH_INDEX_DATA;
                    docsData = window.SEARCH_DOCUMENTS_DATA;
                } else {
                    // Fall back to fetching
                    const basePath = window.location.protocol === 'file:' 
                        ? window.location.href.substring(0, window.location.href.lastIndexOf('/'))
                        : '.';

                    const [indexResponse, docsResponse] = await Promise.all([
                        fetch(basePath + '/dist/data/search-index.json'),
                        fetch(basePath + '/dist/data/search-documents.json')
                    ]);

                    if (!indexResponse.ok || !docsResponse.ok) {
                        throw new Error('Failed to load search data');
                    }

                    indexData = await indexResponse.json();
                    docsData = await docsResponse.json();
                }

                // Initialize Lunr index
                searchIndex = lunr.Index.load(indexData);

                // Build documents map
                docsData.documents.forEach(doc => {
                    documents[doc.id] = doc;
                });

                statusEl.style.display = 'none';
                
                // Focus on search input
                document.getElementById('searchInput').focus();

                // Check for search query in URL
                const urlParams = new URLSearchParams(window.location.search);
                const query = urlParams.get('q');
                if (query) {
                    document.getElementById('searchInput').value = query;
                    performSearch();
                }

            } catch (error) {
                console.error('Search initialization error:', error);
                statusEl.className = 'search-status error';
                statusEl.textContent = 'Failed to load search index. Please try again later.';
            } finally {
                isLoading = false;
            }
        }`;

searchHtml = searchHtml.replace(oldInitFunction, newInitFunction);

// Write the updated search.html
fs.writeFileSync(searchHtmlPath, searchHtml);

console.log('✓ Search data embedded in search.html successfully');
console.log('  The search page now works offline and with file:// protocol');