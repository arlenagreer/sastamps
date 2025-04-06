const fs = require('fs').promises;
const path = require('path');

const htmlFiles = [
    'index.html',
    'about.html',
    'contact.html',
    'meetings.html',
    'membership.html',
    'newsletter.html'
];

// Critical CSS rules that should always be inlined
const criticalSelectors = [
    // Layout
    'body',
    'header',
    'nav',
    'main',
    '.container',
    // Typography
    'h1',
    'h2',
    'h3',
    // Navigation
    '.nav-links',
    '.nav-item',
    // Hero section
    '.hero',
    '.hero-content',
    // Cards
    '.card',
    // Images
    '.blur-up',
    'picture',
    'img',
    // Utilities
    '.text-center',
    '.mb-*',
    '.mt-*'
];

async function readCSSFile() {
    const cssContent = await fs.readFile('dist/css/styles.min.css', 'utf8');
    return cssContent;
}

function extractCriticalCSS(fullCSS) {
    // Simple CSS parser
    const rules = fullCSS.split('}').map(rule => rule.trim() + '}');
    const criticalCSS = rules.filter(rule => {
        return criticalSelectors.some(selector => 
            rule.includes(selector) || 
            rule.includes('@media') || 
            rule.includes('@font-face')
        );
    });
    
    return criticalCSS.join('\n');
}

async function updateHTMLWithCriticalCSS(filename, criticalCSS) {
    console.log(`Processing ${filename}...`);
    let content = await fs.readFile(filename, 'utf8');

    // Add critical CSS
    const criticalStyle = `
    <style id="critical-css">
        ${criticalCSS}
    </style>`;

    // Add preload for main CSS
    const preloadLink = `
    <link rel="preload" href="dist/css/styles.min.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
    <noscript><link rel="stylesheet" href="dist/css/styles.min.css"></noscript>`;

    // Replace existing CSS link with critical CSS and async load
    content = content.replace(
        /<link[^>]*href=["']dist\/css\/styles\.min\.css["'][^>]*>/,
        `${criticalStyle}${preloadLink}`
    );

    await fs.writeFile(filename, content, 'utf8');
    console.log(`Updated ${filename}`);
}

async function optimizeCSS() {
    try {
        const fullCSS = await readCSSFile();
        const criticalCSS = extractCriticalCSS(fullCSS);

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