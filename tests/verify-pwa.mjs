import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import vm from 'node:vm';

const siteRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const baseUrl = 'http://127.0.0.1:8137/';
const handlers = new Map();

const requestKey = (request) => typeof request === 'string' ? request : request.url;
const comparableKey = (value, ignoreSearch = false) => {
  const url = new URL(value, baseUrl);
  if (ignoreSearch) url.search = '';
  return url.toString();
};

class MemoryCache {
  constructor() {
    this.responses = new Map();
  }

  async addAll(requests) {
    for (const request of requests) {
      const response = await fetch(request);
      assert.equal(response.ok, true, `precache fetch failed: ${request.url} (${response.status})`);
      const body = await response.arrayBuffer();
      this.responses.set(request.url, new Response(body, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers
      }));
    }
  }

  async match(request, options = {}) {
    const wanted = comparableKey(requestKey(request), options.ignoreSearch);
    for (const [key, response] of this.responses) {
      if (comparableKey(key, options.ignoreSearch) === wanted) return response.clone();
    }
    return undefined;
  }

  async put(request, response) {
    const body = await response.arrayBuffer();
    this.responses.set(requestKey(request), new Response(body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    }));
  }
}

const cacheBuckets = new Map();
const cacheStorage = {
  async open(name) {
    if (!cacheBuckets.has(name)) cacheBuckets.set(name, new MemoryCache());
    return cacheBuckets.get(name);
  },
  async keys() {
    return [...cacheBuckets.keys()];
  },
  async delete(name) {
    return cacheBuckets.delete(name);
  }
};

const workerGlobal = {
  registration: { scope: baseUrl },
  location: { origin: new URL(baseUrl).origin },
  clients: { claim: async () => {} },
  skipWaiting: async () => {},
  addEventListener(type, handler) {
    handlers.set(type, handler);
  }
};

const context = vm.createContext({
  self: workerGlobal,
  caches: cacheStorage,
  Request,
  Response,
  Headers,
  URL,
  console
});

const workerSource = await readFile(path.join(siteRoot, 'sw.js'), 'utf8');
vm.runInContext(workerSource, context, { filename: 'sw.js' });
const precacheUrls = vm.runInContext('[...PRECACHE_URLS]', context);

const sourceFiles = ['index.html', 'app.js', 'styles.css'];
const assetPattern = /assets\/[A-Za-z0-9_./-]+\.(?:png|jpe?g|webp|mp3|mp4|woff2)/g;
const referencedAssets = new Set();
for (const file of sourceFiles) {
  const source = await readFile(path.join(siteRoot, file), 'utf8');
  for (const match of source.matchAll(assetPattern)) referencedAssets.add(`./${match[0]}`);
}

const manifest = JSON.parse(await readFile(path.join(siteRoot, 'manifest.webmanifest'), 'utf8'));
for (const icon of manifest.icons) referencedAssets.add(`./${icon.src}`);

const precacheSet = new Set(precacheUrls);
for (const asset of referencedAssets) {
  assert.equal(precacheSet.has(asset), true, `referenced asset missing from precache: ${asset}`);
}

const coreUrls = [
  './',
  './index.html',
  './manifest.webmanifest',
  './styles.css?v=20260802-golden-rules-video-v46',
  './app.js?v=20260802-golden-rules-video-v46',
  './pwa.js?v=20260802-golden-rules-video-v46'
];
for (const url of coreUrls) assert.equal(precacheSet.has(url), true, `core URL missing from precache: ${url}`);

assert.equal(manifest.display, 'standalone');
assert.equal(manifest.start_url.startsWith('./'), true);
assert.equal(manifest.scope, './');
assert.equal(manifest.icons.some((icon) => icon.sizes === '192x192'), true);
assert.equal(manifest.icons.some((icon) => icon.sizes === '512x512' && icon.purpose === 'any'), true);
assert.equal(manifest.icons.some((icon) => icon.sizes === '512x512' && icon.purpose === 'maskable'), true);

const pngSize = async (relativePath) => {
  const bytes = await readFile(path.join(siteRoot, relativePath));
  assert.equal(bytes.toString('hex', 0, 8), '89504e470d0a1a0a', `${relativePath} is not PNG`);
  return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
};
assert.deepEqual(await pngSize('assets/brand/power-tbm-apple-touch-180.png'), [180, 180]);
assert.deepEqual(await pngSize('assets/brand/power-tbm-icon-192.png'), [192, 192]);
assert.deepEqual(await pngSize('assets/brand/power-tbm-icon-512.png'), [512, 512]);
assert.deepEqual(await pngSize('assets/brand/power-tbm-maskable-512.png'), [512, 512]);

const indexSource = await readFile(path.join(siteRoot, 'index.html'), 'utf8');
const pwaSource = await readFile(path.join(siteRoot, 'pwa.js'), 'utf8');
assert.match(indexSource, /rel="manifest" href="manifest\.webmanifest"/);
assert.match(indexSource, /id="homeReset"/);
assert.match(indexSource, /id="demoMute"/);
assert.match(indexSource, /id="goldenRulesVideo"/);
assert.match(indexSource, /golden-rules-11-rule-1-muted\.mp4/);
assert.match(indexSource, /goldenRulesVideo[\s\S]*?muted[\s\S]*?playsinline/);
assert.match(pwaSource, /serviceWorker\.register\('\.\/sw\.js'/);

const server = spawn('python3', ['-m', 'http.server', '8137', '--bind', '127.0.0.1'], {
  cwd: siteRoot,
  stdio: ['ignore', 'ignore', 'pipe']
});

const waitForServer = async () => {
  let lastError;
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(baseUrl);
      if (response.ok) return;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw lastError || new Error('local server did not start');
};

try {
  await waitForServer();
  let installTask;
  handlers.get('install')({ waitUntil(task) { installTask = task; } });
  await installTask;

  let activateTask;
  handlers.get('activate')({ waitUntil(task) { activateTask = task; } });
  await activateTask;
} finally {
  server.kill('SIGTERM');
  await new Promise((resolve) => server.once('exit', resolve));
}

const dispatchFetch = async (request) => {
  let responseTask;
  handlers.get('fetch')({
    request,
    respondWith(task) { responseTask = task; }
  });
  assert.ok(responseTask, `fetch handler ignored ${request.url}`);
  return responseTask;
};

for (const relativeUrl of precacheUrls) {
  const response = await dispatchFetch(new Request(new URL(relativeUrl, baseUrl)));
  assert.equal(response.status, 200, `offline cache miss: ${relativeUrl}`);
}

const mediaUrls = precacheUrls.filter((url) => /\.(?:mp3|mp4)$/.test(url));
for (const relativeUrl of mediaUrls) {
  const response = await dispatchFetch(new Request(new URL(relativeUrl, baseUrl), {
    headers: { Range: 'bytes=10-29' }
  }));
  assert.equal(response.status, 206, `offline range failed: ${relativeUrl}`);
  assert.match(response.headers.get('content-range') || '', /^bytes 10-29\/\d+$/);
  assert.equal(Number(response.headers.get('content-length')), 20);
  assert.equal((await response.arrayBuffer()).byteLength, 20);
}

const suffixResponse = await dispatchFetch(new Request(new URL(mediaUrls[0], baseUrl), {
  headers: { Range: 'bytes=-32' }
}));
assert.equal(suffixResponse.status, 206);
assert.equal((await suffixResponse.arrayBuffer()).byteLength, 32);

const invalidResponse = await dispatchFetch(new Request(new URL(mediaUrls[0], baseUrl), {
  headers: { Range: 'bytes=999999999-' }
}));
assert.equal(invalidResponse.status, 416);

const fallbackRequest = {
  method: 'GET',
  mode: 'navigate',
  url: new URL('./offline-route', baseUrl).toString(),
  headers: new Headers()
};
const fallbackResponse = await dispatchFetch(fallbackRequest);
assert.equal(fallbackResponse.status, 200);
assert.match(await fallbackResponse.text(), /<title>Power TBM \| 자동 시연<\/title>/);

console.log(JSON.stringify({
  status: 'passed',
  precachedUrls: precacheUrls.length,
  referencedAssets: referencedAssets.size,
  offlineMediaFiles: mediaUrls.length,
  navigationFallback: true,
  rangeResponses: true
}, null, 2));
