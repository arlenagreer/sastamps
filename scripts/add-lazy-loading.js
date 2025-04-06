const fs = require('fs').promises;

const htmlFiles = [
    'index.html',
    'about.html',
    'contact.html',
    'meetings.html',
    'membership.html',
    'newsletter.html'
];

async function addLazyLoading(filename) {
    console.log(`Adding lazy loading to ${filename}...`);
    let content = await fs.readFile(filename, 'utf8');

    // Add loading="lazy" to img tags that are not in the hero section
    content = content.replace(
        /(<img(?![^>]*\bloading=)[^>]*class="(?!hero)[^"]*"[^>]*>)/g,
        '$1 loading="lazy"'
    );

    // Add loading="lazy" to picture elements that are not in the hero section
    content = content.replace(
        /(<picture(?![^>]*\bloading=)[^>]*>(?!.*hero)[^>]*<img)/g,
        '$1 loading="lazy"'
    );

    await fs.writeFile(filename, content, 'utf8');
    console.log(`Updated ${filename}`);
}

async function updateAllFiles() {
    try {
        await Promise.all(htmlFiles.map(addLazyLoading));
        console.log('Added lazy loading to all files!');
    } catch (err) {
        console.error('Error updating files:', err);
        process.exit(1);
    }
}

updateAllFiles(); 