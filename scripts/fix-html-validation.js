#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Function to fix HTML validation issues
function fixHTMLFile(filePath) {
  console.log(`Processing: ${filePath}`);
  
  let content = fs.readFileSync(filePath, 'utf8');
  let changesMade = false;
  
  // 1. Remove trailing whitespace
  const originalLength = content.length;
  content = content.split('\n').map(line => line.trimEnd()).join('\n');
  if (content.length !== originalLength) {
    changesMade = true;
    console.log(`  ✓ Removed trailing whitespace`);
  }
  
  // 2. Fix duplicate critical-css IDs
  let criticalCssCount = 0;
  content = content.replace(/id="critical-css"/g, (match) => {
    criticalCssCount++;
    if (criticalCssCount === 1) {
      return match; // Keep the first one
    } else {
      changesMade = true;
      return ''; // Remove subsequent IDs
    }
  });
  if (criticalCssCount > 1) {
    console.log(`  ✓ Fixed ${criticalCssCount - 1} duplicate critical-css IDs`);
  }
  
  // 3. Fix raw ampersands (must be &amp;)
  const ampersandRegex = /&(?!amp;|lt;|gt;|quot;|#\d+;|#x[0-9a-fA-F]+;)/g;
  const ampersandMatches = content.match(ampersandRegex);
  if (ampersandMatches) {
    content = content.replace(ampersandRegex, '&amp;');
    changesMade = true;
    console.log(`  ✓ Fixed ${ampersandMatches.length} raw ampersands`);
  }
  
  // 4. Remove redundant role="contentinfo" on footer
  const footerRoleRegex = /<footer([^>]*)\s+role="contentinfo"([^>]*)>/g;
  if (footerRoleRegex.test(content)) {
    content = content.replace(footerRoleRegex, '<footer$1$2>');
    changesMade = true;
    console.log(`  ✓ Removed redundant role="contentinfo" from footer`);
  }
  
  // 5. Ensure file ends with newline
  if (!content.endsWith('\n')) {
    content += '\n';
    changesMade = true;
    console.log(`  ✓ Added final newline`);
  }
  
  if (changesMade) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`  ✅ File updated successfully`);
  } else {
    console.log(`  ℹ️  No changes needed`);
  }
  
  return changesMade;
}

// Main execution
console.log('HTML Validation Fixer\n');

// Get all HTML files
const htmlFiles = fs.readdirSync('.')
  .filter(file => file.endsWith('.html') && !file.includes('test-'))
  .map(file => path.join('.', file));

console.log(`Found ${htmlFiles.length} HTML files to process\n`);

let totalFilesChanged = 0;

// Process each file
htmlFiles.forEach(file => {
  if (fixHTMLFile(file)) {
    totalFilesChanged++;
  }
  console.log('');
});

console.log(`\nSummary: ${totalFilesChanged} files were updated`);
console.log('\nRun "npm run test:html" to verify all issues are fixed.');