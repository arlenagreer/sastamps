const fs = require('fs').promises;

const htmlFiles = [
    'index.html',
    'about.html',
    'contact.html',
    'meetings.html',
    'membership.html',
    'newsletter.html'
];

const analyticsScript = `
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XW5LFQ52YR"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', 'G-XW5LFQ52YR');
</script>
`;

async function addAnalyticsToFile(filename) {
    console.log(`Adding Google Analytics to ${filename}...`);
    try {
        let content = await fs.readFile(filename, 'utf8');
        
        // Add analytics script right after <head> tag
        content = content.replace('<head>', '<head>' + analyticsScript);
        
        await fs.writeFile(filename, content, 'utf8');
        console.log(`✓ Updated ${filename}`);
    } catch (err) {
        console.error(`Error processing ${filename}:`, err);
        throw err;
    }
}

async function addAnalyticsToAllFiles() {
    try {
        await Promise.all(htmlFiles.map(addAnalyticsToFile));
        console.log('\nGoogle Analytics has been added to all HTML files successfully! 🎉');
    } catch (err) {
        console.error('\nError adding Google Analytics:', err);
        process.exit(1);
    }
}

addAnalyticsToAllFiles(); 