import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../demo-recorder-v81.js', import.meta.url), 'utf8');
const aac = 'video/mp4;codecs=avc1,mp4a.40.2';
const webm = 'video/webm;codecs=vp8,opus';
const settle = () => new Promise(resolve => setImmediate(resolve));

function harness({ supported = [aac, webm], failEncoder = '', sound = true, withAudio = true, failVideo = false, cancel = false,
  viewport = [1920, 1080], captured = [1920, 1080], failCapture = false, aspect = '4:3' } = {}) {
  const elements = new Map();
  const blobs = [];
  const intervals = new Map();
  const tracks = [];
  const draws = [];
  let id = 0;
  let recorder;
  let audioContext;
  let readyBeforeStart = false;
  let captureOptions;
  class Element extends EventTarget {
    constructor() {
      super(); this.hidden = false; this.attrs = {}; this.paused = true;
      this.readyState = 0; this.open = false; this.textContent = '';
      const classes = new Set();
      this.classList = {
        add: name => classes.add(name), remove: name => classes.delete(name),
        contains: name => classes.has(name),
        toggle: (name, yes) => yes ? classes.add(name) : classes.delete(name)
      };
    }
    setAttribute(k, v) { this.attrs[k] = v; }
    removeAttribute(k) { delete this.attrs[k]; }
    closest() { return element('header'); }
    pause() { this.paused = true; }
    play() {
      if (failCapture) return Promise.reject(new Error('capture playback failed'));
      this.paused = false; this.readyState = 2;
      [this.videoWidth, this.videoHeight] = captured;
      return Promise.resolve();
    }
    getBoundingClientRect() {
      const ratio = this.attrs['data-record-aspect'] === '16:9' ? 16 / 9 : 4 / 3;
      const width = Math.min(window.innerWidth, window.innerHeight * ratio);
      const height = width / ratio;
      return { left: (window.innerWidth - width) / 2, top: (window.innerHeight - height) / 2, width, height };
    }
    load() {
      queueMicrotask(() => {
        this.readyState = failVideo ? 0 : 2;
        this.dispatchEvent(new Event(failVideo ? 'error' : 'loadeddata'));
      });
    }
    showModal() { this.open = true; }
    close() { this.open = false; this.dispatchEvent(new Event('close')); }
    click() { this.dispatchEvent(new Event('click')); }
  }
  const element = name => { if (!elements.has(name)) elements.set(name, new Element()); return elements.get(name); };
  const video = element('required-video');
  element('demoRecordAspect').value = aspect;
  const document = new Element();
  Object.assign(document, { body: element('body'), documentElement: element('html'),
    getElementById: element, querySelectorAll: () => [video],
    createElement: name => {
      const item = element('capture-' + name);
      if (name === 'canvas') {
        item.getContext = () => ({ drawImage: (...args) => draws.push(args) });
        item.captureStream = fps => { item.fps = fps; return new Stream([new Track('video')]); };
      }
      return item;
    } });
  class Track extends EventTarget {
    constructor(kind) { super(); this.kind = kind; this.readyState = 'live'; tracks.push(this); }
    getSettings() { return { displaySurface: 'browser' }; }
    stop() { this.readyState = 'ended'; }
  }
  class Stream {
    constructor(items) { this.items = items; }
    getTracks() { return this.items; }
    getVideoTracks() { return this.items.filter(t => t.kind === 'video'); }
    getAudioTracks() { return this.items.filter(t => t.kind === 'audio'); }
  }
  class Recorder extends EventTarget {
    static isTypeSupported(type) { return supported.includes(type); }
    constructor(stream, options) {
      super();
      if (options.mimeType === failEncoder) throw new Error('encoder unavailable');
      this.mimeType = options.mimeType; this.state = 'inactive'; this.stream = stream; recorder = this;
    }
    start() { readyBeforeStart = video.readyState >= 2; this.state = 'recording'; }
    stop() {
      this.state = 'inactive';
      queueMicrotask(() => {
        const event = new Event('dataavailable');
        event.data = new Blob(['test payload'], { type: this.mimeType });
        this.dispatchEvent(event); this.dispatchEvent(new Event('stop'));
      });
    }
  }
  class AudioContext {
    constructor() { this.state = 'running'; audioContext = this; }
    resume() { return Promise.resolve(); }
    close() { this.state = 'closed'; return Promise.resolve(); }
    createMediaStreamSource() { return { connect() {}, disconnect() {} }; }
    createAnalyser() { return { disconnect() {}, getFloatTimeDomainData: a => a.fill(sound ? .2 : 0) }; }
  }
  const window = new Element();
  Object.assign(window, { isSecureContext: true, MediaRecorder: Recorder, AudioContext,
    innerWidth: viewport[0], innerHeight: viewport[1], requestAnimationFrame: f => queueMicrotask(f),
    setInterval: f => (intervals.set(++id, f), id), clearInterval: id => intervals.delete(id),
    setTimeout: () => ++id, clearTimeout() {} });
  const navigator = { mediaDevices: { getDisplayMedia: async options => {
    captureOptions = options;
    if (cancel) throw Object.assign(new Error('cancelled'), { name: 'NotAllowedError' });
    return new Stream([new Track('video'), ...(withAudio ? [new Track('audio')] : [])]);
  } } };
  vm.runInNewContext(source, { document, window, navigator, MediaRecorder: Recorder, MediaStream: Stream,
    Blob, Float32Array, CustomEvent, Date, performance: { now: () => 2000 },
    URL: { createObjectURL: b => (blobs.push(b), 'blob:test'), revokeObjectURL() {} } });
  return { document, window, element, blobs, tracks, intervals, draws,
    get recorder() { return recorder; }, get audioContext() { return audioContext; },
    get prepared() { return readyBeforeStart; }, get options() { return captureOptions; },
    start: async () => { element('demoRecord').click(); element('demoRecordStart').click(); await settle(); },
    stop: async () => { element('demoRecord').click(); await settle(); }
  };
}

{
  const h = harness(); await h.start();
  assert.equal(h.recorder.mimeType, aac);
  assert.equal(h.prepared, true, 'wait for decoded videos before recorder.start');
  assert.equal(h.options.audio.suppressLocalAudioPlayback, false);
  assert.equal(h.document.body.classList.contains('demo-recording'), true);
  assert.equal(h.document.documentElement.classList.contains('demo-recording'), true);
  assert.equal(h.element('capture-canvas').width, 1440);
  assert.equal(h.element('capture-canvas').height, 1080);
  assert.equal(h.element('capture-canvas').fps, 30);
  assert.deepEqual(h.draws[0].slice(1), [240, 0, 1440, 1080, 0, 0, 1440, 1080], 'crop the centered 4:3 app, not the full widescreen tab');
  assert.notEqual(h.recorder.stream.getVideoTracks()[0], h.tracks[0], 'encode the canvas video track');
  assert.equal(h.recorder.stream.getAudioTracks()[0], h.tracks[1], 'preserve the shared audio track');
  await h.stop();
  assert.match(h.element('demoRecordDownload').download, /\.mp4$/);
  assert.equal(h.blobs[0].type, aac);
  assert.equal(h.element('demoRecordError').hidden, true);
  assert(h.tracks.every(t => t.readyState === 'ended'));
  assert.equal(h.audioContext.state, 'closed');
  assert.equal(h.intervals.size, 0);
  assert.equal(h.document.documentElement.classList.contains('demo-recording'), false);
  assert.equal(h.element('capture-video').srcObject, null);
  assert.match(h.element('demoRecordMeta').textContent, /1440×1080 \(4:3\)/);
}
for (const [viewport, captured, crop] of [
  [[2560, 1080], [1920, 810], [420, 0, 1080, 810]],
  [[1440, 1080], [2880, 2160], [0, 0, 2880, 2160]],
  [[1200, 1000], [1200, 1000], [0, 50, 1200, 900]]
]) {
  const h = harness({ viewport, captured }); await h.start();
  assert.deepEqual(h.draws[0].slice(1), [...crop, 0, 0, 1440, 1080]);
  // Resizing changes the crop, never the encoded dimensions.
  h.window.innerWidth = 1920; h.window.innerHeight = 1080;
  const v = h.element('capture-video'); v.videoWidth = 1920; v.videoHeight = 1080;
  for (const tick of h.intervals.values()) tick();
  assert.deepEqual(h.draws.at(-1).slice(1), [240, 0, 1440, 1080, 0, 0, 1440, 1080]);
  await h.stop();
  assert(h.tracks.every(t => t.readyState === 'ended'));
}
for (const [viewport, captured, crop] of [
  [[1920, 1080], [1920, 1080], [0, 0, 1920, 1080]],
  [[1440, 1080], [1440, 1080], [0, 135, 1440, 810]],
  [[2560, 1080], [1920, 810], [240, 0, 1440, 810]],
  [[1920, 1080], [3840, 2160], [0, 0, 3840, 2160]]
]) {
  const h = harness({ viewport, captured, aspect: '16:9' }); await h.start();
  assert.equal(h.element('demoRecordAspect').disabled, true);
  assert.equal(h.document.body.attrs['data-record-aspect'], '16:9');
  assert.equal(h.element('capture-canvas').width, 1920);
  assert.equal(h.element('capture-canvas').height, 1080);
  assert.deepEqual(h.draws[0].slice(1), [...crop, 0, 0, 1920, 1080]);
  assert.equal(h.recorder.stream.getAudioTracks()[0], h.tracks[1]);
  h.element('demoRecordAspect').value = '4:3'; // A completed result must retain its own preset.
  await h.stop();
  assert.match(h.element('demoRecordMeta').textContent, /1920×1080 \(16:9\)/);
  assert.match(h.element('demoRecordDownload').download, /Power_TBM_16x9_/);
  assert.equal(h.element('demoRecordAspectField').hidden, true);
  assert.equal(h.document.body.attrs['data-record-aspect'], undefined);
  h.element('demoRecordStart').click(); // New recording returns to the selector.
  assert.equal(h.element('demoRecordAspectField').hidden, false);
  assert.equal(h.element('demoRecordAspect').disabled, false);
  h.element('demoRecordStart').click(); await settle();
  assert.equal(h.element('capture-canvas').width, 1440);
  await h.stop();
  assert.match(h.element('demoRecordDownload').download, /Power_TBM_4x3_/);
  assert.equal(h.intervals.size, 0);
}
{
  const h = harness({ supported: ['video/mp4', webm] }); await h.start(); await h.stop();
  assert.equal(h.recorder.mimeType, webm, 'never select unspecified MP4 audio codecs');
  assert.match(h.element('demoRecordDownload').download, /\.webm$/);
  assert.match(h.element('demoRecordMessage').textContent, /AAC.*WebM/);
}
{
  const h = harness({ failEncoder: aac }); await h.start();
  assert.equal(h.recorder.mimeType, webm, 'recover if reported AAC support cannot create encoder');
  await h.stop();
}
{
  const h = harness({ sound: false }); await h.start(); await h.stop();
  assert.match(h.element('demoRecordError').textContent, /소리 신호가 감지되지/);
  assert.equal(h.element('demoRecordTitle').textContent, '녹화 결과 확인 필요');
}
for (const options of [{ withAudio: false }, { failVideo: true }, { cancel: true }, { failCapture: true }, { supported: [] }]) {
  const h = harness(options); await h.start();
  assert.equal(h.blobs.length, 0);
  assert.equal(h.document.body.classList.contains('demo-recording'), false);
  assert.equal(h.element('demoRecordError').hidden, false);
  assert(h.tracks.every(t => t.readyState === 'ended'));
  assert.equal(h.audioContext.state, 'closed');
  assert.equal(h.intervals.size, 0);
  assert.equal(h.element('demoRecordAspect').disabled, false);
  assert.equal(h.element('demoRecordAspectField').hidden, false);
  assert.equal(h.document.body.attrs['data-record-aspect'], undefined);
}
{
  const h = harness(); await h.start();
  h.document.dispatchEvent(new CustomEvent('power-tbm:playback-error', { detail: { message: '영상 중단' } }));
  await settle();
  assert.equal(h.recorder.state, 'inactive');
  assert.equal(h.element('demoRecordError').textContent, '영상 중단');
}
{
  const h = harness(); await h.start();
  const completed = new CustomEvent('power-tbm:sequence-complete', { cancelable: true });
  h.document.dispatchEvent(completed); await settle();
  assert.equal(completed.defaultPrevented, true, 'record one sequence, never loop to intro');
  assert.equal(h.recorder.state, 'inactive');
}
{
  const index = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const worker = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  const context = vm.createContext({ self: { addEventListener() {} }, URL, Map });
  vm.runInContext(worker, context);
  const precache = vm.runInContext('PRECACHE_URLS', context);
  for (const name of ['demo-recorder-v81.js', 'demo-recorder-v81.css']) {
    const url = index.match(new RegExp(`(?:src|href)="(${name.replaceAll('.', '\\.')}\\?[^"\\s]+)"`))?.[1];
    assert(url, `${name} needs a versioned entry point`);
    assert(precache.includes('./' + url), `${name} entry point must match the offline cache`);
    assert.match(url, /recording-aspect-v95/);
  }
  assert.match(vm.runInContext('CACHE_NAME', context), /v96-20261007-swipe$/);
  assert.match(index, /<option value="4:3" selected>/);
  assert.match(index, /<option value="16:9">/);
}
console.log('PASS: 16:9 and 4:3 selection, dimensions, crop, repeat recording, immutable result, selector recovery; widescreen/ultrawide/HiDPI/resize, audio, codec fallback, errors, cleanup and versioned cache paths');
