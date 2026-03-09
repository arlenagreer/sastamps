#!/usr/bin/env node

/**
 * Download archived SAPA newsletter PDFs from Dropbox and Google Drive.
 * Parses the source URL manifest from git history and saves PDFs
 * to public/newsletter_archive/ with consistent year-edition filenames.
 *
 * Usage: node scripts/download-newsletters.mjs
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync, readFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';

const OUTPUT_DIR = join(process.cwd(), 'public', 'newsletter_archive');
const CONCURRENCY = 3;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

// Month label mappings
const BIMONTHLY_MAP = {
  'January/February': { edition: '01', months: 'jan-feb' },
  'March/April': { edition: '02', months: 'mar-apr' },
  'May/June': { edition: '03', months: 'may-jun' },
  'July/August': { edition: '04', months: 'jul-aug' },
  'September/October': { edition: '05', months: 'sep-oct' },
  'November/December': { edition: '06', months: 'nov-dec' },
};

/**
 * Parse the archived HTML to extract download entries.
 */
function parseSourceHTML(html) {
  const entries = [];
  let currentYear = null;

  const lines = html.split('\n');

  for (const line of lines) {
    // Match year headers: <li>2008 or <li>2008</li>
    const yearMatch = line.match(/<li>\s*(\d{4})\s*(?:<\/li>)?/);
    if (yearMatch) {
      currentYear = parseInt(yearMatch[1], 10);
      continue;
    }

    if (!currentYear) continue;

    // Skip 2025 entirely
    if (currentYear === 2025) continue;

    // Match links: <a href="URL">Label</a>
    const linkMatch = line.match(/<a\s+[^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/i);
    if (!linkMatch) continue;

    let [, url, label] = linkMatch;

    // Strip HTML tags from label (e.g. <i><b>Special Covid-19 Edition</b></i>)
    label = label.replace(/<[^>]+>/g, '').trim();

    // Skip entries with href="#" (e.g. 2012 Jul/Aug "not available")
    if (url === '#') {
      entries.push({ year: currentYear, label, url, skip: true, reason: 'not available' });
      continue;
    }

    // Build target filename
    const filename = buildFilename(currentYear, label);
    if (!filename) {
      entries.push({ year: currentYear, label, url, skip: true, reason: 'unrecognized label' });
      continue;
    }

    // Convert URL for direct download
    const directUrl = convertToDirectUrl(url);

    entries.push({
      year: currentYear,
      label,
      url: directUrl,
      filename,
      skip: false,
    });
  }

  return entries;
}

/**
 * Build the target filename based on year and label.
 */
function buildFilename(year, label) {
  // Special Covid edition
  if (/special\s+covid/i.test(label)) {
    return `${year}-special-covid.pdf`;
  }

  // Quarterly editions (2024): "Second Quarter: April, May, June"
  const quarterlyMatch = label.match(/(\w+)\s+Quarter[:\s]+(\w+),?\s+(\w+),?\s+(\w+)/i);
  if (quarterlyMatch) {
    const quarterNames = { first: 1, second: 2, third: 3, fourth: 4 };
    const qNum = quarterNames[quarterlyMatch[1].toLowerCase()];
    const m1 = quarterlyMatch[2].toLowerCase().slice(0, 3);
    const m2 = quarterlyMatch[3].toLowerCase().slice(0, 3);
    const m3 = quarterlyMatch[4].toLowerCase().slice(0, 3);
    return `${year}-q${qNum}-${m1}-${m2}-${m3}.pdf`;
  }

  // Bimonthly editions
  const bimonthly = BIMONTHLY_MAP[label];
  if (bimonthly) {
    return `${year}-${bimonthly.edition}-${bimonthly.months}.pdf`;
  }

  return null;
}

/**
 * Convert Dropbox or Google Drive sharing URLs to direct download URLs.
 */
function convertToDirectUrl(url) {
  // Dropbox: replace ?dl=0 with ?dl=1
  if (url.includes('dropbox.com')) {
    return url.replace(/\?dl=0$/, '?dl=1');
  }

  // Google Drive: /file/d/{FILE_ID}/view
  const gdriveFileMatch = url.match(/drive\.google\.com\/file\/d\/([^/]+)\//);
  if (gdriveFileMatch) {
    return `https://drive.google.com/uc?export=download&id=${gdriveFileMatch[1]}`;
  }

  // Google Drive: /open?id={FILE_ID}
  const gdriveOpenMatch = url.match(/drive\.google\.com\/open\?id=([^&\s]+)/);
  if (gdriveOpenMatch) {
    return `https://drive.google.com/uc?export=download&id=${gdriveOpenMatch[1]}`;
  }

  return url;
}

/**
 * Download a single file with retry logic.
 */
async function downloadFile(entry) {
  const destPath = join(OUTPUT_DIR, entry.filename);

  // Skip if already downloaded and valid
  if (existsSync(destPath)) {
    const fd = readFileSync(destPath);
    if (fd.length >= 4 && fd.slice(0, 4).toString() === '%PDF') {
      return { ...entry, status: 'skipped', reason: 'already exists' };
    }
    // Remove invalid file
    unlinkSync(destPath);
  }

  let currentEntry = entry;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(currentEntry.url, {
        redirect: 'follow',
        headers: { 'User-Agent': 'Mozilla/5.0 (SAPA Newsletter Downloader)' },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }

      const buffer = Buffer.from(await response.arrayBuffer());

      // Validate PDF magic bytes
      if (buffer.length < 4 || buffer.slice(0, 4).toString() !== '%PDF') {
        // Check if it's a Google Drive virus scan warning page
        const content = buffer.toString('utf8', 0, Math.min(buffer.length, 2000));
        if (content.includes('virus scan') || content.includes('confirm=')) {
          const confirmMatch = content.match(/href="(\/uc\?export=download[^"]+)"/);
          if (confirmMatch && attempt < MAX_RETRIES) {
            const confirmUrl = `https://drive.google.com${confirmMatch[1].replace(/&amp;/g, '&')}`;
            currentEntry = { ...currentEntry, url: confirmUrl };
            throw new Error('Google Drive virus scan redirect - retrying with confirm URL');
          }
        }
        throw new Error('Downloaded file is not a valid PDF');
      }

      writeFileSync(destPath, buffer);
      return { ...entry, status: 'ok', size: buffer.length };
    } catch (err) {
      if (attempt < MAX_RETRIES) {
        console.log(`    Retry ${attempt}/${MAX_RETRIES}: ${err.message}`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
      } else {
        return { ...entry, status: 'failed', error: err.message };
      }
    }
  }
}

/**
 * Process downloads with limited concurrency.
 */
async function downloadWithConcurrency(entries, concurrency) {
  const results = [];
  let index = 0;
  const total = entries.length;

  async function worker() {
    while (index < entries.length) {
      const i = index++;
      const entry = entries[i];
      console.log(`[${i + 1}/${total}] Downloading ${entry.filename}...`);
      const result = await downloadFile(entry);
      const detail = result.reason ? `: ${result.reason}` : result.error ? `: ${result.error}` : '';
      const size = result.size ? ` (${(result.size / 1024).toFixed(0)} KB)` : '';
      console.log(`  -> ${result.status.toUpperCase()}${detail}${size}`);
      results.push(result);
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);
  return results;
}

// Main execution
async function main() {
  console.log('SAPA Newsletter Archive Downloader');
  console.log('==================================\n');

  // Get source HTML from git using execFileSync (safe - no shell injection)
  console.log('Extracting source HTML from git history...');
  let html;
  try {
    html = execFileSync('git', ['show', 'HEAD:js/newsletter_archive/archived_newsletter_links.html'], {
      encoding: 'utf8',
      cwd: process.cwd(),
    });
  } catch (err) {
    console.error('Failed to extract source HTML from git:', err.message);
    process.exit(1);
  }

  // Parse entries
  const allEntries = parseSourceHTML(html);
  const skipped = allEntries.filter(e => e.skip);
  const toDownload = allEntries.filter(e => !e.skip);

  console.log(`Found ${allEntries.length} entries total`);
  console.log(`  To download: ${toDownload.length}`);
  console.log(`  Skipped: ${skipped.length}`);
  skipped.forEach(e => console.log(`    - ${e.year} ${e.label}: ${e.reason}`));
  console.log('');

  // Create output directory
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`Created directory: ${OUTPUT_DIR}`);
  }

  // Download
  console.log(`Starting downloads (concurrency: ${CONCURRENCY})...\n`);
  const results = await downloadWithConcurrency(toDownload, CONCURRENCY);

  // Summary
  const ok = results.filter(r => r.status === 'ok');
  const alreadyExist = results.filter(r => r.status === 'skipped');
  const failed = results.filter(r => r.status === 'failed');

  console.log('\n==================================');
  console.log('Download Summary');
  console.log('==================================');
  console.log(`Downloaded: ${ok.length}`);
  console.log(`Already existed: ${alreadyExist.length}`);
  console.log(`Skipped (unavailable): ${skipped.length}`);
  console.log(`Failed: ${failed.length}`);

  if (failed.length > 0) {
    console.log('\nFailed downloads:');
    failed.forEach(f => console.log(`  - ${f.filename}: ${f.error}`));
  }

  console.log(`\nTotal files in archive: ${ok.length + alreadyExist.length}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
