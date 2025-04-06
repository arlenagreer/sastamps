const fs = require('fs').promises;

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

async function generateFontPreloadTags() {
    const preloadTags = [];
    
    for (const [family, config] of Object.entries(fontConfig)) {
        for (const weight of config.weights) {
            preloadTags.push(
                `<link rel="preload" href="https://fonts.gstatic.com/s/${family.toLowerCase().replace(/\s+/g, '')}/v1/${weight}.woff2" as="font" type="font/woff2" crossorigin>`
            );
        }
    }
    
    return preloadTags.join('\n    ');
}

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

async function updateHTMLWithFontOptimizations(filename) {
    console.log(`Processing ${filename}...`);
    let content = await fs.readFile(filename, 'utf8');

    const preloadTags = await generateFontPreloadTags();
    const fontStyles = await generateFontStyles();
    const fontObserver = await generateFontFaceObserver();

    // Add font preload tags
    content = content.replace('</head>', `    ${preloadTags}\n</head>`);

    // Add font styles
    content = content.replace('</head>', `    ${fontStyles}\n</head>`);

    // Add font observer script
    content = content.replace('</body>', `    ${fontObserver}\n</body>`);

    // Update Google Fonts link to include display=swap
    content = content.replace(
        /(https:\/\/fonts\.googleapis\.com\/css2\?[^"']+)/g,
        '$1&display=swap'
    );

    await fs.writeFile(filename, content, 'utf8');
    console.log(`Updated ${filename}`);
}

async function optimizeFonts() {
    try {
        await Promise.all(htmlFiles.map(updateHTMLWithFontOptimizations));
        console.log('Font optimization complete!');
    } catch (err) {
        console.error('Error optimizing fonts:', err);
        process.exit(1);
    }
}

optimizeFonts(); 