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

async function getPlaceholders() {
    try {
        const data = await fs.readFile('dist/images/placeholders.json', 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.warn('No placeholders found, continuing without blur-up effect');
        return {};
    }
}

async function updateHtmlFile(filename, placeholders) {
    console.log(`Processing ${filename}...`);
    let content = await fs.readFile(filename, 'utf8');

    // Add blur-up CSS if not already present
    if (!content.includes('blur-up-style')) {
        const blurUpStyle = `
    <style id="blur-up-style">
        .blur-up {
            filter: blur(5px);
            transition: filter 400ms;
        }
        .blur-up.loaded {
            filter: blur(0);
        }
    </style>`;
        content = content.replace('</head>', `${blurUpStyle}\n</head>`);
    }

    // Add blur-up script if not already present
    if (!content.includes('blur-up-script')) {
        const blurUpScript = `
    <script id="blur-up-script">
        document.addEventListener('DOMContentLoaded', function() {
            document.querySelectorAll('img[data-src]').forEach(img => {
                img.onload = function() {
                    img.classList.add('loaded');
                };
                img.src = img.dataset.src;
            });
        });
    </script>`;
        content = content.replace('</body>', `${blurUpScript}\n</body>`);
    }

    // Update background images in style attributes
    content = content.replace(
        /background-image:\s*url\(['"]?images\/([^'"]+)\.png['"]?\)/g,
        (match, imageName) => {
            return `background-image: url('dist/images/${imageName}.webp')`;
        }
    );

    // Update regular image tags with blur-up support
    content = content.replace(
        /<img\s+src=["']images\/([^"']+)\.png["']/g,
        (match, imageName) => {
            const placeholder = placeholders[imageName] || '';
            const placeholderAttr = placeholder ? ` style="background-image: url('${placeholder}'); background-size: cover;"` : '';
            
            return `<picture>
    <source
        srcset="dist/images/sm/${imageName}.webp 400w,
                dist/images/md/${imageName}.webp 800w,
                dist/images/lg/${imageName}.webp 1200w"
        sizes="(max-width: 400px) 400px,
               (max-width: 800px) 800px,
               1200px"
        type="image/webp"
    >
    <img src="${placeholder}"
         data-src="dist/images/${imageName}.png"
         srcset="dist/images/sm/${imageName}.png 400w,
                 dist/images/md/${imageName}.png 800w,
                 dist/images/lg/${imageName}.png 1200w"
         sizes="(max-width: 400px) 400px,
                (max-width: 800px) 800px,
                1200px"
         class="blur-up"${placeholderAttr}`;
        }
    );

    // Update meta tags
    content = content.replace(
        /content=["']images\/([^"']+)\.png["']/g,
        (match, imageName) => {
            return `content="dist/images/${imageName}.webp"`;
        }
    );

    // Update favicon references
    content = content.replace(
        /(href=["'])images\/favicon\.png(["'])/g,
        `$1dist/images/favicon.webp$2`
    );

    await fs.writeFile(filename, content, 'utf8');
    console.log(`Updated ${filename}`);
}

async function updateAllFiles() {
    try {
        const placeholders = await getPlaceholders();
        await Promise.all(htmlFiles.map(file => updateHtmlFile(file, placeholders)));
        console.log('All files updated successfully!');
    } catch (err) {
        console.error('Error updating files:', err);
        process.exit(1);
    }
}

updateAllFiles(); 