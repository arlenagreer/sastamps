const fs = require('fs').promises;

const htmlFiles = [
    'index.html',
    'about.html',
    'contact.html',
    'meetings.html',
    'membership.html',
    'newsletter.html'
];

const monitoringScript = `
<script async src="https://www.googletagmanager.com/gtag/js?id=MEASUREMENT_ID"></script>
<script type="module">
    import {onCLS, onFID, onLCP, onFCP, onTTFB} from 'https://unpkg.com/web-vitals@3/dist/web-vitals.attribution.js';

    // Google Analytics setup
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'MEASUREMENT_ID');

    // Performance metrics storage for local development
    const metrics = {
        vitals: {},
        errors: [],
        pageUrl: window.location.pathname
    };

    // Initialize monitoring
    function initMonitoring() {
        // Core Web Vitals monitoring
        onCLS(sendToAnalytics);
        onFID(sendToAnalytics);
        onLCP(sendToAnalytics);
        onFCP(sendToAnalytics);
        onTTFB(sendToAnalytics);

        // Error monitoring
        observeErrors();
    }

    // Send metrics to analytics
    function sendToAnalytics(metric) {
        // Store locally for development panel
        metrics.vitals[metric.name] = {
            value: metric.value,
            rating: metric.rating,
            delta: metric.delta,
            id: metric.id,
            timestamp: new Date().toISOString()
        };

        // Send to Google Analytics
        gtag('event', metric.name, {
            value: Math.round(metric.value * 1000) / 1000,
            metric_rating: metric.rating,
            metric_id: metric.id,
            metric_delta: metric.delta
        });

        // Log to console in development
        if (location.hostname === 'localhost') {
            console.log(metric.name, metric);
            saveMetrics();
        }
    }

    // Observe errors
    function observeErrors() {
        window.addEventListener('error', (event) => {
            metrics.errors.push({
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                timestamp: new Date().toISOString()
            });

            // Send to Google Analytics
            gtag('event', 'javascript_error', {
                error_message: event.message,
                error_filename: event.filename,
                error_lineno: event.lineno
            });

            if (location.hostname === 'localhost') {
                saveMetrics();
            }
        });
    }

    // Save metrics to localStorage (development only)
    function saveMetrics() {
        try {
            localStorage.setItem('performance_metrics', JSON.stringify(metrics));
        } catch (e) {
            console.warn('Failed to save metrics:', e);
        }
    }

    // Initialize monitoring on load
    if (document.readyState === 'complete') {
        initMonitoring();
    } else {
        window.addEventListener('load', initMonitoring);
    }
</script>

<!-- Development monitoring panel (only shows on localhost) -->
<script>
    if (location.hostname === 'localhost') {
        const style = document.createElement('style');
        style.textContent = \`
            #monitoring-panel {
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 15px;
                border-radius: 8px;
                font-family: monospace;
                font-size: 12px;
                z-index: 9999;
                max-width: 300px;
                max-height: 400px;
                overflow: auto;
            }
            #monitoring-panel h3 {
                margin: 0 0 10px;
                color: #4CAF50;
            }
            #monitoring-panel div {
                margin-bottom: 8px;
            }
            .metric-good { color: #4CAF50; }
            .metric-needs-improvement { color: #FFC107; }
            .metric-poor { color: #F44336; }
        \`;
        document.head.appendChild(style);

        const panel = document.createElement('div');
        panel.id = 'monitoring-panel';
        panel.innerHTML = '<h3>Performance Metrics</h3>';
        document.body.appendChild(panel);

        setInterval(() => {
            const metrics = JSON.parse(localStorage.getItem('performance_metrics') || '{}');
            const vitals = metrics.vitals || {};
            
            panel.innerHTML = \`
                <h3>Performance Metrics</h3>
                <div>
                    CLS: <span class="metric-\${vitals.CLS?.rating || 'poor'}">\${(vitals.CLS?.value || 0).toFixed(3)}</span>
                </div>
                <div>
                    FID: <span class="metric-\${vitals.FID?.rating || 'poor'}">\${(vitals.FID?.value || 0).toFixed(1)}ms</span>
                </div>
                <div>
                    LCP: <span class="metric-\${vitals.LCP?.rating || 'poor'}">\${(vitals.LCP?.value || 0).toFixed(0)}ms</span>
                </div>
                <div>
                    FCP: <span class="metric-\${vitals.FCP?.rating || 'poor'}">\${(vitals.FCP?.value || 0).toFixed(0)}ms</span>
                </div>
                <div>
                    TTFB: <span class="metric-\${vitals.TTFB?.rating || 'poor'}">\${(vitals.TTFB?.value || 0).toFixed(0)}ms</span>
                </div>
                <div>
                    Errors: \${metrics.errors?.length || 0}
                </div>
            \`;
        }, 1000);
    }
</script>`;

async function addMonitoringToFile(filename) {
    console.log(`Adding monitoring to ${filename}...`);
    let content = await fs.readFile(filename, 'utf8');

    // Add monitoring scripts before closing body tag
    content = content.replace('</body>', `${monitoringScript}\n</body>`);

    await fs.writeFile(filename, content, 'utf8');
    console.log(`Updated ${filename}`);
}

async function setupMonitoring() {
    try {
        await Promise.all(htmlFiles.map(addMonitoringToFile));
        console.log('Monitoring setup complete!');
        console.log('\nIMPORTANT: Replace "MEASUREMENT_ID" in the HTML files with your Google Analytics Measurement ID');
        console.log('You can get this ID by:');
        console.log('1. Going to https://analytics.google.com/');
        console.log('2. Creating a new property if you don\'t have one');
        console.log('3. Going to Admin > Data Streams > Web');
        console.log('4. Creating a new stream for your GitHub Pages site');
        console.log('5. Copying the Measurement ID (starts with "G-")');
    } catch (err) {
        console.error('Error setting up monitoring:', err);
        process.exit(1);
    }
}

setupMonitoring(); 