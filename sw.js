const CACHE_NAME = 'sapa-cache-v1';
const IMAGE_CACHE_NAME = 'sapa-images-v1';

// Assets that should be cached immediately
const CORE_ASSETS = [
    '/',
    '/index.html',
    '/about.html',
    '/meetings.html',
    '/membership.html',
    '/newsletter.html',
    '/archive.html',
    '/contact.html',
    '/dist/css/styles.min.css',
    '/dist/js/script.min.js'
];

// Image extensions to cache
const IMAGE_EXTENSIONS = ['.webp', '.png', '.jpg', '.jpeg', '.gif', '.svg'];

// Check if a request is for an image
function isImageRequest(request) {
    const url = new URL(request.url);
    return IMAGE_EXTENSIONS.some(ext => url.pathname.toLowerCase().endsWith(ext));
}

// Cache core assets
async function cacheCore() {
    const cache = await caches.open(CACHE_NAME);
    return cache.addAll(CORE_ASSETS);
}

// Cache images with a different strategy
async function cacheImage(request, response) {
    const cache = await caches.open(IMAGE_CACHE_NAME);
    cache.put(request, response.clone());
    return response;
}

// Handle image requests
async function handleImageRequest(request) {
    // Check cache first
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
        return cachedResponse;
    }

    try {
        const response = await fetch(request);
        if (response.ok) {
            return cacheImage(request, response);
        }
        return response;
    } catch (error) {
        // If offline and no cache, return placeholder
        return new Response(
            '<svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">' +
            '<rect width="400" height="300" fill="#eee"/>' +
            '<text x="50%" y="50%" text-anchor="middle" fill="#999">Image Offline</text>' +
            '</svg>',
            {
                headers: {
                    'Content-Type': 'image/svg+xml',
                    'Cache-Control': 'no-store'
                }
            }
        );
    }
}

// Install event - cache core assets
self.addEventListener('install', event => {
    event.waitUntil(
        cacheCore()
            .then(() => self.skipWaiting())
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        Promise.all([
            caches.keys().then(cacheNames => {
                return Promise.all(
                    cacheNames
                        .filter(cacheName => 
                            cacheName !== CACHE_NAME && 
                            cacheName !== IMAGE_CACHE_NAME
                        )
                        .map(cacheName => caches.delete(cacheName))
                );
            }),
            self.clients.claim()
        ])
    );
});

// Helper function to check if request is for an image
function isImageRequest(request) {
    const url = new URL(request.url);
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.ico'];
    return imageExtensions.some(ext => url.pathname.toLowerCase().endsWith(ext));
}

// Helper function to handle image requests with fallback
function handleImageRequest(request) {
    return caches.match(request)
        .then(response => {
            if (response) {
                return response;
            }
            
            return fetch(request)
                .then(response => {
                    // Don't cache non-successful responses
                    if (!response || response.status !== 200) {
                        return response;
                    }
                    
                    // Clone and cache the response
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME)
                        .then(cache => {
                            cache.put(request, responseToCache);
                        });
                    
                    return response;
                })
                .catch(() => {
                    // Return a placeholder image if available
                    return caches.match('/images/placeholder.png');
                });
        });
}

// Fetch event - serve from cache, fall back to network
self.addEventListener('fetch', event => {
    const request = event.request;

    // Handle image requests differently
    if (isImageRequest(request)) {
        event.respondWith(handleImageRequest(request));
        return;
    }

    // For other requests, try cache first, then network
    event.respondWith(
        caches.match(request)
            .then(response => {
                if (response) {
                    return response;
                }

                // Clone the request because it can only be used once
                const fetchRequest = request.clone();

                return fetch(fetchRequest)
                    .then(response => {
                        // Don't cache non-successful responses
                        if (!response || response.status !== 200) {
                            return response;
                        }

                        // Clone the response because it can only be used once
                        const responseToCache = response.clone();

                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(request, responseToCache);
                            });

                        return response;
                    })
                    .catch(() => {
                        // If offline and resource not in cache, return custom offline page
                        if (request.mode === 'navigate') {
                            return caches.match('/offline.html');
                        }
                    });
            })
    );
}); 