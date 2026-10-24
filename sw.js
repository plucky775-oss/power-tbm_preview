'use strict';

const CACHE_PREFIX = 'power-tbm-offline-';
const CACHE_VERSION = `${CACHE_PREFIX}v138-20261024-menu-closing`;
const TV_CACHE = new URLSearchParams(self.location.search).get('tv') === '1';
const CACHE_NAME = `${CACHE_VERSION}-${TV_CACHE ? 'tv' : 'standard'}`;
const PRECACHE_CONCURRENCY = 1;
const PRECACHE_URLS = [
  './',
  './index.html',
  './tv-media-timeline.js?v=20261023-tv-korean-uniform-v136',
  './english-narration.js?v=20261021-balanced-v128',
  './tv-compat.js?v=20261024-menu-closing-v138',
  './tv-compat.css?v=20261021-launch-handoff-v131',
  './subtitles.css?v=20261004-v87',
  './subtitles.js?v=20261020-language-v117',
  './subtitle-data.js?v=20261022-weather-daily-v132',
  './subtitle-data.en.js?v=20261021-meeting-sequence-v126',
  './demo-translations.js?v=20261023-touch-resume-v134',
  './demo-language.js?v=20261021-language-menu-v125',
  './demo-language.css?v=20261021-language-menu-v125',
  './manifest.webmanifest',
  './assets/brand/demo-hand.svg',
  './styles.css?v=20261023-touch-resume-v134',
  './app.js?v=20261024-menu-closing-v138',
  './safety4cut.css?v=20261016-safety-reveal-v107',
  './demo-hands-v80.css?v=20261021-balanced-v128',
  './demo-recorder-v81.css?v=20261017-recording-start-v113',
  './demo-recorder-v81.js?v=20261020-language-v117',
  './safety4cut.js?v=20261021-safety-caption-v121',
  './pwa.js?v=20261017-tv-startup-v115',
  './assets/tv-ko-v136/tour.mp4',
  './assets/tv-en-v128/tour.mp4',
  './assets/tv-background-v137/weather-powerlines-v60.webp',
  './assets/tv-background-v137/tablet-review-v63.webp',
  './assets/tv-background-v137/field-tools-kepco-v68.webp',
  './assets/tv-background-v137/emergency-response-changwon119-v66.webp',
  './assets/tv-background-v138/tbm-guide-closing-v138.webp',
  './assets/audio/balanced-v128/en-00-opening.m4a',
  './assets/audio/balanced-v128/en-01-weather.m4a',
  './assets/audio/balanced-v128/en-02-tbm-basic.m4a',
  './assets/audio/balanced-v128/en-03-ai-pdf.m4a',
  './assets/audio/balanced-v128/en-04-safety-tools.m4a',
  './assets/audio/balanced-v128/en-05-emergency.m4a',
  './assets/audio/balanced-v128/en-06-closing.m4a',
  './assets/audio/balanced-v128/en-07-safety4cut-intro.m4a',
  './assets/audio/balanced-v128/en-08-safety4cut-example.mp4',
  './assets/audio/balanced-v128/ko-07-safety4cut-intro.m4a',
  './assets/safety4cut/01-main-menu-v97.png',
  './assets/safety4cut/02-upload-v75.png',
  './assets/safety4cut/06-cartoon.jpg',
  './assets/safety4cut/07-realistic.jpg',
  './assets/safety4cut/09-ai-example-v79-poster.jpg',
  './assets/audio/balanced-v128/ko-08-safety4cut-example.mp4',
  './assets/audio/balanced-v128/ko-00-opening.m4a',
  './assets/audio/weather-v132/01-weather.m4a',
  './assets/audio/balanced-v128/ko-02-tbm-basic.m4a',
  './assets/audio/balanced-v128/ko-03-ai-pdf.m4a',
  './assets/audio/balanced-v128/ko-04-safety-tools.m4a',
  './assets/audio/balanced-v128/ko-05-emergency.m4a',
  './assets/audio/balanced-v128/ko-06-closing.m4a',
  './assets/audio/bgm-starcourt-mall-cc0.mp3',
  './assets/background/emergency-response-changwon119-v66-poster.jpg',
  './assets/background/emergency-response-changwon119-v66.mp4',
  './assets/background/field-tools-kepco-v68-poster.jpg',
  './assets/background/field-tools-kepco-v68.mp4',
  './assets/background/tbm-guide-closing-v69-poster.jpg',
  './assets/background/tbm-guide-closing-v138.mp4',
  './assets/background/power-tbm-lightning-opening-v62.webp',
  './assets/background/tablet-review-v63-poster.jpg',
  './assets/background/tablet-review-v63.mp4',
  './assets/background/weather-powerlines-v60-poster.jpg',
  './assets/background/weather-powerlines-v60.mp4',
  './assets/brand/kepco-symbol-v30.png',
  './assets/brand/video-demo-icon-32-v1.png',
  './assets/brand/video-demo-icon-180-v1.png',
  './assets/brand/video-demo-icon-192-v1.png',
  './assets/brand/video-demo-icon-512-v1.png',
  './assets/brand/video-demo-icon-maskable-512-v1.png',
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
  './assets/screens/guide/meeting-trade-long-v126.png',
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
  './assets/video/power-tbm-button-click-poster.jpg',
  './assets/video/power-tbm-button-click-soft-v90.mp4',
  './assets/video/power-tbm-opening-ansan-v77-poster.jpg',
  './assets/video/power-tbm-opening-ansan-v77.mp4'
];

// Keep the continuous narration and the five small animated-image backgrounds.
// TV never downloads separate narration, BGM or a second video stream.
const ACTIVE_PRECACHE_URLS = TV_CACHE ? PRECACHE_URLS
  .filter(path => !path.startsWith('./assets/audio/') &&
    (!/\.mp4(?:\?|$)/.test(path) || /\/(?:tv-ko-v136|tv-en-v128)\//.test(path)))
  .map(path => /^\.\/assets\/(?:screens\/guide|safety4cut|background|video|closing)\/.+\.(?:png|jpe?g|webp)$/i.test(path)
    ? path.replace('./assets/', './assets/tv-v100/images/').replace(/\.[^.]+$/, '.webp') : path)
  : PRECACHE_URLS.filter(path => !/\/(?:tv-ko-v136|tv-en-v128|tv-background-v\d+)\//.test(path));

const scopedUrl = (path) => new URL(path, self.registration.scope).toString();
const isVersionedShellPath = (path) => /^(?:\.\/)?(?:index\.html|manifest\.webmanifest|styles\.css|app\.js|pwa\.js|safety4cut\.(?:js|css)|subtitles\.(?:js|css)|subtitle-data(?:\.en)?\.js|demo-translations\.js|demo-language\.(?:js|css)|english-narration\.js|tv-compat\.(?:js|css)|tv-media-timeline\.js)(?:\?|$)/.test(path) || path === './';

const precacheInSmallBatches = async (cache) => {
  let nextIndex = 0;
  const workers = Array.from({ length: Math.min(PRECACHE_CONCURRENCY, ACTIVE_PRECACHE_URLS.length) }, async () => {
    while (nextIndex < ACTIVE_PRECACHE_URLS.length) {
      const path = ACTIVE_PRECACHE_URLS[nextIndex];
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
    const staleCacheNames = cacheNames
      .filter((name) => name.startsWith(CACHE_PREFIX) && !name.startsWith(CACHE_VERSION + '-'));
    await Promise.all(staleCacheNames.map((name) => caches.delete(name)));
    await self.clients.claim();
    // Apply new code on the next user navigation. Never restart a live tour.
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

const createRangeResponse = async (request, cachedResponse) => {
  const rangeHeader = request.headers.get('range');
  const match = /^bytes=(\d*)-(\d*)$/i.exec(rangeHeader || '');
  if (!match || (!match[1] && !match[2])) return cachedResponse;

  // Blob slices avoid copying a whole MP4 into the worker's JS heap.
  const blob = await cachedResponse.blob();
  const size = blob.size;
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

  return new Response(blob.slice(start, end + 1), {
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
    // Let the browser/CDN stream media and handle byte ranges natively online.
    // Cloning then awaiting cache.put buffers the unread playback branch in full.
    if (/\.(?:mp4|mp3|m4a)$/i.test(requestUrl.pathname)) {
      try {
        const response = await fetch(request);
        if (response.ok) return response;
      } catch (_) { /* Use the prepared offline copy when disconnected. */ }
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request);
      if (cached) return request.headers.has('range') ? createRangeResponse(request, cached) : cached;
      return new Response('', { status: 504, statusText: 'Offline' });
    }
    const cache = await caches.open(CACHE_NAME);

    if (request.mode === 'navigate') {
      try {
        const networkResponse = await fetch(new Request(request, { cache: 'reload' }));
        if (networkResponse.ok && networkResponse.status === 200) {
          await cache.put(scopedUrl('./index.html'), networkResponse.clone());
        }
        return networkResponse;
      } catch (_) {
        const fallback = await cache.match(scopedUrl('./index.html'));
        if (fallback) return fallback;
        return new Response('', { status: 504, statusText: 'Offline' });
      }
    }

    // Version queries distinguish replaced voices and scripts from old bytes.
    const cachedResponse = await cache.match(request);

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
      return new Response('', { status: 504, statusText: 'Offline' });
    }
  })());
});
