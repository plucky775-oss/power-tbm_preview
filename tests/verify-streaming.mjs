import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../sw.js', import.meta.url), 'utf8');
function worker({ cached, network, oldCaches = [] } = {}) {
  const handlers = {}, navigated = [], reads = [], writes = [];
  const scope = 'https://demo.test/';
  const cache = {
    match: async request => { reads.push(request); return cached?.(); },
    put: async request => { writes.push(request); throw new Error('must not buffer streaming media'); }
  };
  const context = vm.createContext({ URL, URLSearchParams, Request, Response, Headers, console,
    caches: { open: async () => cache, keys: async () => oldCaches, delete: async () => true },
    fetch: async request => { if (!network) throw new Error('offline'); return network(request); },
    self: {
      registration: { scope }, location: { origin: new URL(scope).origin, search: '' },
      addEventListener: (name, handler) => { handlers[name] = handler; },
      clients: { claim: async () => {}, matchAll: async () => [{ url: scope, navigate: async url => navigated.push(url) }] }
    }
  });
  vm.runInContext(source, context);
  return { navigated, reads, writes, async activate() { let task; handlers.activate({ waitUntil: value => { task = value; } }); await task; },
    async fetch(range = 'bytes=10-29') {
      let task;
      handlers.fetch({ request: new Request(scope + 'assets/example.mp4', { headers: range ? { Range: range } : {} }), respondWith: value => { task = value; } });
      return task;
    }
  };
}
const test = async (name, run) => {
  try { await run(); console.log('PASS', name); }
  catch (error) { console.error('FAIL', name, error.message); process.exitCode = 1; }
};
await test('Service worker upgrade never navigates a playing client', async () => {
  const w = worker({ oldCaches: ['power-tbm-offline-v98-test'] });
  await w.activate(); assert.deepEqual(w.navigated, []);
});
await test('Online range playback streams the native response without reading a cached file', async () => {
  const response = new Response('partial data', { status: 206 });
  const w = worker({ network: () => response, cached: () => new Response(new Uint8Array(100)) });
  assert.equal(await w.fetch(), response); assert.equal(w.reads.length, 0); assert.equal(w.writes.length, 0);
});
await test('Uncached media is returned without cloning or waiting for a whole-file cache write', async () => {
  const response = new Response(new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array([1])); } }));
  response.clone = () => { throw new Error('large media clone'); };
  const w = worker({ network: () => response });
  assert.equal(await w.fetch(null), response); assert.equal(w.writes.length, 0);
  await response.body.cancel();
});
await test('Offline ranges slice a Blob without creating a full-file JS ArrayBuffer', async () => {
  const w = worker({ cached: () => {
    const response = new Response(Uint8Array.from({ length: 100 }, (_, i) => i));
    response.arrayBuffer = () => { throw new Error('full-file heap allocation'); };
    return response;
  } });
  const response = await w.fetch(); assert.equal(response.status, 206);
  assert.deepEqual([...new Uint8Array(await response.arrayBuffer())], Array.from({ length: 20 }, (_, i) => i + 10));
});
