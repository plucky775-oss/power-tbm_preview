'use strict';

const CACHE_PREFIX = 'power-tbm-offline-';
const CACHE_NAME = `${CACHE_PREFIX}v52-20260802`;
const PRECACHE_CONCURRENCY = 3;
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './styles.css?v=20260802-device-icon-cleanup-v52',
  './app.js?v=20260802-device-icon-cleanup-v52',
  './pwa.js?v=20260802-device-icon-cleanup-v52',
  './assets/audio/00-opening-taehyung.mp3',
  './assets/audio/01-weather-jisoo.mp3',
  './assets/audio/02-tbm-basic-taehyung.mp3',
  './assets/audio/03-ai-pdf-jisoo.mp3',
  './assets/audio/04-safety-tools-taehyung.mp3',
  './assets/audio/05-emergency-jisoo.mp3',
  './assets/audio/06-closing-jisoo.mp3',
  './assets/audio/bgm-starcourt-mall-cc0.mp3',
  './assets/brand/kepco-symbol-v30.png',
  './assets/brand/power-tbm-apple-touch-180.png',
  './assets/brand/power-tbm-icon-192.png',
  './assets/brand/power-tbm-icon-512.png',
  './assets/brand/power-tbm-icon.png',
  './assets/brand/power-tbm-maskable-512.png',
  './assets/closing/power-tbm-field-tbm.jpeg',
  './assets/fonts/nanum-pen-script-korean-400-normal.woff2',
  './assets/menu/emergency.png',
  './assets/menu/streetview.png',
  './assets/screens/guide/compare-alert-red-v13.jpeg',
  './assets/screens/guide/compare-jma-detail-v11.webp',
  './assets/screens/guide/compare-jtwc-v4.webp',
  './assets/screens/guide/compare-kma-typhoon-v12.jpeg',
  './assets/screens/guide/compare-radar-rotation-v13.jpeg',
  './assets/screens/guide/contacts.webp',
  './assets/screens/guide/home-weather-alert-collapsed-v48.jpeg',
  './assets/screens/guide/home-weather-alert-expanded-v48.jpeg',
  './assets/screens/guide/incidents.webp',
  './assets/screens/guide/location-consent.webp',
  './assets/screens/guide/meeting-ai-v2.png',
  './assets/screens/guide/meeting-ai-scroll-detail-v50.jpeg',
  './assets/screens/guide/meeting-calendar-v1.png',
  './assets/screens/guide/meeting-focus-v2.png',
  './assets/screens/guide/meeting-health-v2.png',
  './assets/screens/guide/meeting-home-v1.jpeg',
  './assets/screens/guide/meeting-hub-v48.png',
  './assets/screens/guide/meeting-pdf-v2.jpeg',
  './assets/screens/guide/meeting-risk-v2.png',
  './assets/screens/guide/meeting-qr-signature-v48.png',
  './assets/screens/guide/meeting-sign-pad-v2.png',
  './assets/screens/guide/meeting-sign-v2.png',
  './assets/screens/guide/meeting-trade-v2.png',
  './assets/screens/guide/meeting-workers-v2.png',
  './assets/screens/guide/notices.webp',
  './assets/screens/guide/settings.webp',
  './assets/screens/guide/stage3-emergency.png',
  './assets/screens/guide/stage3-field-tools.png',
  './assets/screens/guide/stage3-golden-rules.jpeg',
  './assets/screens/guide/stage3-home-main-v16.png',
  './assets/screens/guide/stage3-risk-safety.png',
  './assets/screens/guide/stage3-safety-guide.png',
  './assets/screens/guide/trade-select.webp',
  './assets/screens/guide/voice-memo.webp',
  './assets/screens/guide/weather-now.webp',
  './assets/screens/guide/weather-scroll-v3.webp',
  './assets/screens/guide/weather-week.webp',
  './assets/video/golden-rules-11-rule-1-muted.mp4',
  './assets/video/golden-rules-11-rule-1-poster.jpg',
  './assets/video/power-tbm-opening-v22-poster.jpg',
  './assets/video/power-tbm-opening-v22.mp4'
];

const scopedUrl = (path) => new URL(path, self.registration.scope).toString();
const isVersionedShellPath = (path) => /^(?:\.\/)?(?:index\.html|manifest\.webmanifest|styles\.css|app\.js|pwa\.js)(?:\?|$)/.test(path) || path === './';

const precacheInSmallBatches = async (cache) => {
  let nextIndex = 0;
  const workers = Array.from({ length: Math.min(PRECACHE_CONCURRENCY, PRECACHE_URLS.length) }, async () => {
    while (nextIndex < PRECACHE_URLS.length) {
      const path = PRECACHE_URLS[nextIndex];
      nextIndex += 1;
      const request = new Request(scopedUrl(path), {
        cache: isVersionedShellPath(path) ? 'reload' : 'default',
        credentials: 'same-origin'
      });
      const response = await fetch(request);
      if (!response.ok) throw new Error(`Precache failed: ${request.url} (${response.status})`);
      await cache.put(request, response);
    }
  });
  await Promise.all(workers);
};

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await precacheInSmallBatches(cache);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames
      .filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
      .map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

const rangeNotSatisfiable = (size) => new Response(null, {
  status: 416,
  statusText: 'Range Not Satisfiable',
  headers: {
    'Content-Range': `bytes */${size}`,
    'Accept-Ranges': 'bytes'
  }
});

const rangeBufferCache = new Map();

const readRangeBuffer = (request, cachedResponse) => {
  const cacheKey = new URL(request.url).pathname;
  if (!rangeBufferCache.has(cacheKey)) {
    const bufferTask = cachedResponse.arrayBuffer().catch((error) => {
      rangeBufferCache.delete(cacheKey);
      throw error;
    });
    rangeBufferCache.set(cacheKey, bufferTask);
  }
  return rangeBufferCache.get(cacheKey);
};

const createRangeResponse = async (request, cachedResponse) => {
  const rangeHeader = request.headers.get('range');
  const match = /^bytes=(\d*)-(\d*)$/i.exec(rangeHeader || '');
  if (!match || (!match[1] && !match[2])) return cachedResponse;

  const buffer = await readRangeBuffer(request, cachedResponse);
  const size = buffer.byteLength;
  let start;
  let end;

  if (match[1]) {
    start = Number.parseInt(match[1], 10);
    end = match[2] ? Number.parseInt(match[2], 10) : size - 1;
  } else {
    const suffixLength = Number.parseInt(match[2], 10);
    if (!Number.isFinite(suffixLength) || suffixLength <= 0) return rangeNotSatisfiable(size);
    start = Math.max(0, size - suffixLength);
    end = size - 1;
  }

  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || start >= size || end < start) {
    return rangeNotSatisfiable(size);
  }
  end = Math.min(end, size - 1);

  const headers = new Headers(cachedResponse.headers);
  headers.delete('Content-Encoding');
  headers.set('Accept-Ranges', 'bytes');
  headers.set('Content-Range', `bytes ${start}-${end}/${size}`);
  headers.set('Content-Length', String(end - start + 1));

  return new Response(buffer.slice(start, end + 1), {
    status: 206,
    statusText: 'Partial Content',
    headers
  });
};

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const requestUrl = new URL(request.url);
  if (requestUrl.origin !== self.location.origin) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request, { ignoreSearch: true });

    if (cachedResponse) {
      if (request.headers.has('range')) return createRangeResponse(request, cachedResponse);
      return cachedResponse;
    }

    try {
      const networkResponse = await fetch(request);
      if (networkResponse.ok && networkResponse.status === 200) {
        await cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    } catch (_) {
      if (request.mode === 'navigate') {
        const fallback = await cache.match(scopedUrl('./index.html'));
        if (fallback) return fallback;
      }
      return new Response('', { status: 504, statusText: 'Offline' });
    }
  })());
});
