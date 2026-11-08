/**
 * Service Worker for Promotion Tracking & To-Do List PWA
 * Version: promotrack-v1.0.0
 */

const CACHE_NAME = `promotrack-shell-v6:${self.registration.scope}`;
const APP_ROOT = self.registration.scope;
const STATIC_ASSETS = [
  './',
  'index.html',
  'manifest.webmanifest',
  'fonts/noto-sans-lao-v33-lao.woff2',
  'icons/super-mde-32-v1.png',
  'icons/super-mde-180-v1.png',
  'icons/super-mde-192-v1.png',
  'icons/super-mde-512-v1.png',
  'icons/super-mde-maskable-192-v2.png',
  'icons/super-mde-maskable-512-v2.png'
].map((asset) => new URL(asset, APP_ROOT).href);

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('Pre-cache partial failure:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key.startsWith('promotrack-shell-') && key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // NEVER cache sensitive authenticated API calls or external Supabase DB calls in public caches
  if (
    url.origin !== self.location.origin ||
    !url.href.startsWith(APP_ROOT) ||
    request.method !== 'GET' ||
    url.pathname.startsWith('/api/') ||
    url.hostname.includes('supabase.co') ||
    request.headers.get('Authorization')
  ) {
    return; // Pass through to network
  }

  // Network-first with Cache fallback for app shell & static assets
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Fallback to app root index.html for navigation requests
          if (request.mode === 'navigate') {
            return caches.match(APP_ROOT);
          }
          return new Response('Offline: Content currently unavailable', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({ 'Content-Type': 'text/plain' })
          });
        });
      })
  );
});
