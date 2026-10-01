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

const fontConfig = {
    'Open Sans': {
        weights: [400, 600, 700],
        display: 'swap'
    },
    'Merriweather': {
        weights: [400, 700],
        display: 'swap'
    }
};

async function generateFontFaceObserver() {
    return `
    <script>
        // Font Face Observer script
        (function() {
            class FontFaceObserver {
                constructor(family, options = {}) {
                    this.family = family;
                    this.options = options;
                }
                
                async load() {
                    try {
                        await document.fonts.load(\`1em \${this.family}\`, this.options.text || 'BESbswy');
                        return true;
                    } catch (e) {
                        return false;
                    }
                }
            }

            // Load fonts and mark as loaded
            async function loadFonts() {
                document.documentElement.classList.add('fonts-loading');
                
                const fontLoaders = [
                    ${Object.entries(fontConfig).map(([family, config]) => 
                        config.weights.map(weight => 
                            `new FontFaceObserver('${family}', { weight: ${weight} }).load()`
                        ).join(',\n                    ')
                    ).join(',\n                    ')}
                ];

                try {
                    await Promise.all(fontLoaders);
                    document.documentElement.classList.remove('fonts-loading');
                    document.documentElement.classList.add('fonts-loaded');
                    localStorage.setItem('fonts-loaded', 'true');
                } catch (err) {
                    document.documentElement.classList.remove('fonts-loading');
                    document.documentElement.classList.add('fonts-failed');
                }
            }

            // Check if fonts were previously loaded
            if (localStorage.getItem('fonts-loaded')) {
                document.documentElement.classList.add('fonts-loaded');
            } else {
                loadFonts();
            }
        })();
    </script>`;
}

async function generateFontStyles() {
    return `
    <style>
        /* Font loading states */
        .fonts-loading body {
            opacity: 0.8;
        }
        
        .fonts-loaded body {
            opacity: 1;
            transition: opacity 0.3s ease;
        }

        /* Font fallbacks */
        body {
            font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
        }
        
        .fonts-loaded body {
            font-family: 'Open Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
        }

        h1, h2, h3, h4, h5, h6 {
            font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, serif;
        }
        
        .fonts-loaded h1, 
        .fonts-loaded h2, 
        .fonts-loaded h3, 
        .fonts-loaded h4, 
        .fonts-loaded h5, 
        .fonts-loaded h6 {
            font-family: 'Merriweather', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, serif;
        }
    </style>`;
}

async function renderFontOptimizations(filename) {
    console.log(`Processing ${filename}...`);
    let content = await fs.readFile(filename, 'utf8');

    // Each block lives in a build:* region that is replaced in place, so a
    // rebuild never adds another copy (see scripts/lib/html-region.js). The
    // font styles must stay after the full stylesheet: their fallbacks win only
    // because they come later in the cascade, so they go just before </head>.
    content = upsertRegion(content, 'font-styles', await generateFontStyles(), '</head>', filename);
    content = upsertRegion(content, 'font-observer', await generateFontFaceObserver(), '</body>', filename);

    // Ensure the Google Fonts URL asks for display=swap, once. It is written
    // already escaped because fix-html-validation.js (which runs earlier in the
    // build) would otherwise rewrite a raw '&' on the next build.
    content = content.replace(
        /(https:\/\/fonts\.googleapis\.com\/css2\?[^"']+)/g,
        (url) => (/[?&](amp;)?display=/.test(url) ? url : `${url}&amp;display=swap`)
    );

    return [filename, content];
}

async function optimizeFonts() {
    try {
        // Render every page before writing any, so a failure on one page never
        // leaves the others half-updated.
        const pages = await Promise.all(htmlFiles.map(renderFontOptimizations));
        for (const [file, html] of pages) {
            await fs.writeFile(file, html, 'utf8');
            console.log(`Updated ${file}`);
        }
        console.log('Font optimization complete!');
    } catch (err) {
        console.error('Error optimizing fonts:', err);
        process.exit(1);
    }
}

optimizeFonts(); 