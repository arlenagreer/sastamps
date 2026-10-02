/**
 * A minimal static server for _site/, for the browser checks
 * (scripts/a11y-check.js, scripts/test-search-page.js). It behaves like
 * GitHub Pages where that matters: files only, and a directory only through
 * its index.html. Listens on a free port on 127.0.0.1.
 */
const fs = require('fs');
const http = require('http');
const path = require('path');

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json', '.pdf': 'application/pdf',
  '.ics': 'text/calendar', '.xml': 'application/xml', '.txt': 'text/plain'
};

// Resolves to { server, base, requests }: base is "http://127.0.0.1:PORT/",
// requests lists every path served, in order.
function serve(root) {
  const requests = [];
  const server = http.createServer((req, res) => {
    let rel;
    try {
      rel = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    } catch {
      res.writeHead(400).end();
      return;
    }
    requests.push(rel);
    let file = path.join(root, rel);
    if (!file.startsWith(root)) {
      res.writeHead(403).end();
      return;
    }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
      file = path.join(file, 'index.html');
    }
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
      res.writeHead(404).end('not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      // Listening: a later server error is not a start-up failure. Say so and
      // stop with exit 2 (the harness broke), rather than swallow it.
      server.off('error', reject);
      server.on('error', (err) => {
        console.error(`serve: the local _site/ server failed (${err.message})`);
        process.exit(2);
      });
      resolve({ server, base: `http://127.0.0.1:${server.address().port}/`, requests });
    });
  });
}

// GitHub's Ubuntu runners block the unprivileged user namespaces Chrome's
// sandbox needs; the pages under test are this repo's own build.
const chromeArgs = () => (process.env.CI ? ['--no-sandbox'] : []);

module.exports = { serve, chromeArgs };
