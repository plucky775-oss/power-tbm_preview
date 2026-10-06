import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../demo-recorder-v81.js', import.meta.url), 'utf8');
const aac = 'video/mp4;codecs=avc1,mp4a.40.2';
const webm = 'video/webm;codecs=vp8,opus';
const settle = () => new Promise(resolve => setImmediate(resolve));

function harness({ supported = [aac, webm], failEncoder = '', sound = true, withAudio = true, failVideo = false, cancel = false } = {}) {
  const elements = new Map();
  const blobs = [];
  const intervals = new Map();
  const tracks = [];
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
  const document = new Element();
  Object.assign(document, { body: element('body'), documentElement: element('html'),
    getElementById: element, querySelectorAll: () => [video] });
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
      this.mimeType = options.mimeType; this.state = 'inactive'; recorder = this;
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
  return { document, element, blobs, tracks, intervals,
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
  await h.stop();
  assert.match(h.element('demoRecordDownload').download, /\.mp4$/);
  assert.equal(h.blobs[0].type, aac);
  assert.equal(h.element('demoRecordError').hidden, true);
  assert(h.tracks.every(t => t.readyState === 'ended'));
  assert.equal(h.audioContext.state, 'closed');
  assert.equal(h.intervals.size, 0);
  assert.equal(h.document.documentElement.classList.contains('demo-recording'), false);
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
for (const options of [{ withAudio: false }, { failVideo: true }, { cancel: true }]) {
  const h = harness(options); await h.start();
  assert.equal(h.blobs.length, 0);
  assert.equal(h.document.body.classList.contains('demo-recording'), false);
  assert.equal(h.element('demoRecordError').hidden, false);
  assert(h.tracks.every(t => t.readyState === 'ended'));
  assert.equal(h.audioContext.state, 'closed');
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
console.log('PASS: explicit H.264/AAC, WebM fallback, encoder failure, media preflight, audio signal, missing audio, load failure, cancellation, playback failure, completion and cleanup');
