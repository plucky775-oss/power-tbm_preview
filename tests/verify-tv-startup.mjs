import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const source = readFileSync(new URL('../pwa.js', import.meta.url), 'utf8');
const settle = () => new Promise(resolve => setImmediate(resolve));
function setup(tv = true) {
  const media = new EventTarget(), window = new EventTarget();
  let ranges = [[0, 3]];
  Object.assign(media, { duration: 280, ended: false, error: null,
    buffered: { get length() { return ranges.length; }, start: i => ranges[i][0], end: i => ranges[i][1] } });
  Object.assign(window, { isSecureContext: true, location: { hostname: 'demo.test' }, PowerTBMTV: { enabled: tv, media } });
  const calls = [], document = { documentElement: { dataset: {} } };
  const navigator = { serviceWorker: { ready: Promise.resolve(), register: async url => {
    calls.push(url); return { update: async () => {} };
  } } };
  vm.runInNewContext(source, { window, document, navigator, console, CustomEvent: Event });
  window.dispatchEvent(new Event('load'));
  return { media, calls, document, setRanges(value) { ranges = value; media.dispatchEvent(new Event('progress')); } };
}
const tv = setup(); await settle();
assert.equal(tv.calls.length, 0, 'offline download must not contend with the first partial stream');
assert.notEqual(tv.document.documentElement.dataset.offlineReady, 'true');
tv.setRanges([[0, 8.2], [270, 280]]); await settle();
assert.equal(tv.calls.length, 0, 'a later seek does not mean the whole tour is buffered');
tv.setRanges([[0, 280]]); await settle();
assert.deepEqual(tv.calls, ['./sw.js?tv=1']);
assert.equal(tv.document.documentElement.dataset.offlineReady, 'true');
tv.media.dispatchEvent(new Event('progress')); await settle();assert.equal(tv.calls.length, 1);
const ended = setup(); /* The tour may already loop in an earlier ended listener. */ ended.media.dispatchEvent(new Event('ended')); await settle();
assert.equal(ended.calls.length, 1, 'a complete tour may prepare offline even with evicted ranges');
const desktop = setup(false); await settle();assert.deepEqual(desktop.calls, ['./sw.js']);
console.log('PASS TV first-stream priority, discontinuous buffers, offline readiness, completion fallback and unchanged desktop registration');
