#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Function to fix CSS validation issues
function fixCSSFile(filePath) {
  console.log(`Processing: ${filePath}`);
  
  let content = fs.readFileSync(filePath, 'utf8');
  let changesMade = false;
  
  // 1. Fix color-function-alias-notation: rgba -> rgb when alpha is 1
  const rgbaRegex = /rgba\(([^,]+),\s*([^,]+),\s*([^,]+),\s*1\)/g;
  const rgbaMatches = content.match(rgbaRegex);
  if (rgbaMatches) {
    content = content.replace(rgbaRegex, 'rgb($1, $2, $3)');
    changesMade = true;
    console.log(`  ✓ Fixed ${rgbaMatches.length} rgba -> rgb conversions`);
  }
  
  // 2. Fix pseudo-element notation: single colon to double colon
  const pseudoElements = [':before', ':after', ':first-letter', ':first-line'];
  pseudoElements.forEach(pseudo => {
    const regex = new RegExp(`(^|[^:])${pseudo}`, 'gm');
    if (regex.test(content)) {
      content = content.replace(regex, `$1:${pseudo}`);
      changesMade = true;
      console.log(`  ✓ Fixed ${pseudo} -> :${pseudo}`);
    }
  });
  
  // 3. Fix value-keyword-case: capitalize font names to lowercase
  const fontNames = ['Arial', 'Georgia', 'Helvetica', 'Times New Roman', 'Verdana'];
  fontNames.forEach(font => {
    const regex = new RegExp(`(['"])${font}(['"])`, 'g');
    if (regex.test(content)) {
      content = content.replace(regex, `$1${font.toLowerCase()}$2`);
      changesMade = true;
      console.log(`  ✓ Fixed ${font} -> ${font.toLowerCase()}`);
    }
  });
  
  // 4. Add empty line before comments
  content = content.replace(/([^\n])\n(\s*\/\*)/g, '$1\n\n$2');
  
  // 5. Fix media-feature-range-notation for max-width
  const mediaRegex = /@media\s+screen\s+and\s+\(max-width:\s*(\d+px)\)/g;
  const mediaMatches = content.match(mediaRegex);
  if (mediaMatches) {
    content = content.replace(mediaRegex, '@media screen and (width <= $1)');
    changesMade = true;
    console.log(`  ✓ Fixed ${mediaMatches.length} media query notations`);
  }
  
  // 6. Remove duplicate properties
  // This is more complex and would require CSS parsing, so we'll skip for now
  
  if (changesMade) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`  ✅ File updated successfully`);
  } else {
    console.log(`  ℹ️  No changes needed`);
  }
  
  return changesMade;
}

// Main execution
console.log('CSS Validation Fixer\n');

// Get all CSS files
const cssFiles = [
  'css/styles.css',
  'css/critical.css'
].filter(file => fs.existsSync(file));

console.log(`Found ${cssFiles.length} CSS files to process\n`);

let totalFilesChanged = 0;

// Process each file
cssFiles.forEach(file => {
  if (fixCSSFile(file)) {
    totalFilesChanged++;
  }
  console.log('');
});

console.log(`\nSummary: ${totalFilesChanged} files were updated`);
console.log('\nRun "npm run test:css" to verify issues are improved.');