const fs = require('fs').promises;
const { upsertRegion } = require('./lib/html-region');

const htmlFiles = [
    'index.html',
    'about.html',
    'contact.html',
    'meetings.html',
    'membership.html',
    'newsletter.html'
];

// The first stylesheet reference to the full CSS, used only on a page's first
// build. After that the page carries a build:critical-css region (which holds
// the preload link itself) and the region is replaced in place.
const STYLESHEET_LINK = /<link[^>]*href=["']dist\/css\/styles\.min\.css["'][^>]*>/;

// css/critical.css is the hand-maintained above-the-fold stylesheet: balanced,
// and the only file that defines the :root custom properties the rest of the
// CSS uses. It replaces an earlier split-on-'}' extract of the full stylesheet,
// which left 26 @media blocks unclosed, defined no variables, and copied the
// stylesheet's trailing inline source map (~110 KB) into every page.
async function readCriticalCSS() {
    const css = await fs.readFile('css/critical.css', 'utf8');
    // Comments carry nothing the browser needs, and a sourceMappingURL comment
    // must never be inlined.
    return css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\n{2,}/g, '\n').trim();
}

async function updateHTMLWithCriticalCSS(filename, criticalCSS) {
    console.log(`Processing ${filename}...`);
    const content = await fs.readFile(filename, 'utf8');

    const block = `
    <style id="critical-css">
${criticalCSS}
    </style>
    <link rel="preload" href="dist/css/styles.min.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
    <noscript><link rel="stylesheet" href="dist/css/styles.min.css"></noscript>`;

    const updated = upsertRegion(content, 'critical-css', block, STYLESHEET_LINK, filename);
    await fs.writeFile(filename, updated, 'utf8');
    console.log(`Updated ${filename}`);
}

async function optimizeCSS() {
    try {
        const criticalCSS = await readCriticalCSS();
        await Promise.all(htmlFiles.map(file =>
            updateHTMLWithCriticalCSS(file, criticalCSS)
        ));

        console.log('Critical CSS optimization complete!');
    } catch (err) {
        console.error('Error optimizing CSS:', err);
        process.exit(1);
    }
}

optimizeCSS();
