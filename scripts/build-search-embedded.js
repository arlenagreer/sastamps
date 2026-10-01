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

// The built copy of search.html in _site/ (or a path given as the first
// argument). The source search.html is never rewritten: it carries no
// embedded data and falls back to fetching dist/data/*.json.
const searchHtmlPath = path.resolve(process.argv[2] || path.join(__dirname, '../_site/search.html'));
if (!fs.existsSync(searchHtmlPath)) {
    console.error(`${searchHtmlPath} not found. Run npm run build (it assembles _site/ first).`);
    process.exit(1);
}
let searchHtml = fs.readFileSync(searchHtmlPath, 'utf8');

// Create the embedded data script
const embeddedDataScript = `
    <!-- Embedded search data for offline functionality -->
    <script>
        window.SEARCH_INDEX_DATA = ${searchIndex};
        window.SEARCH_DOCUMENTS_DATA = ${searchDocs};
    </script>
`;

// Idempotency: strip any previously-embedded data block(s) first, so a re-run
// REPLACES rather than appends. Previously every build added another duplicate
// window.SEARCH_INDEX_DATA block, bloating search.html unbounded each quarter.
searchHtml = searchHtml.replace(
    /\s*<!-- Embedded search data for offline functionality -->\s*<script>\s*window\.SEARCH_INDEX_DATA = [\s\S]*?<\/script>\s*/g,
    '\n',
);

// Find where to insert the embedded data (before the search functionality script)
const searchScriptMarker = '<!-- Search functionality -->';
if (searchHtml.includes(searchScriptMarker)) {
    searchHtml = searchHtml.replace(searchScriptMarker, embeddedDataScript + '\n    ' + searchScriptMarker);
} else {
    // If marker not found, insert before closing body tag
    searchHtml = searchHtml.replace('</body>', embeddedDataScript + '\n</body>');
}

// Write the updated search.html
fs.writeFileSync(searchHtmlPath, searchHtml);

console.log(`✓ Search data embedded in ${path.relative(path.join(__dirname, '..'), searchHtmlPath)}`);
console.log('  The search page now works offline and with file:// protocol');