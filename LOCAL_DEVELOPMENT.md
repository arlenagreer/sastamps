# Local Development Instructions

## Viewing the Site Locally

Due to browser security restrictions, some features (like JavaScript modules) won't work when opening HTML files directly from the file system using the `file://` protocol.

To properly view the site locally, you need to run a local web server:

### Option 1: Python (Recommended)
If you have Python installed, navigate to the project directory and run:

```bash
# Python 3
python3 -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000
```

Then open your browser to: http://localhost:8000

### Option 2: Node.js
If you have Node.js installed:

```bash
# Install http-server globally (one time)
npm install -g http-server

# Run the server
http-server -p 8000
```

Then open your browser to: http://localhost:8000

### Option 3: VS Code
If you're using Visual Studio Code, install the "Live Server" extension, then right-click on any HTML file and select "Open with Live Server".

## Note on File Protocol
When opening files directly (file:// protocol), you'll see:
- Security header warnings in the console
- Service Worker registration failures
- Module loading errors
- Fallback content on pages that use JavaScript modules

These are normal and expected when viewing files directly. The site will work properly when:
1. Served through a local development server
2. Deployed to a web server (like GitHub Pages)