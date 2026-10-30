import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);
const read = name => readFileSync(new URL(name, root), 'utf8');

// Exercise the actual app's media events, with controllable buffering/ended
// states so a delayed final frame and a hidden tab can be reproduced reliably.
function harness({ reducedMotion = true, saveData = false } = {}) {
  const elements = new Map();
  let document;
  class Element extends EventTarget {
    constructor() {
      super();
      this.dataset = {}; this.attrs = {}; this.currentTime = 0;
      this.duration = 64.566667; this.readyState = 4;
      this.ended = false; this.paused = true; this.playCount = 0;
      this.naturalWidth = 512; this.naturalHeight = 512;
      this.style = { setProperty() {} };
      const classes = new Set();
      this.classList = {
        add: (...names) => names.forEach(n => classes.add(n)),
        remove: (...names) => names.forEach(n => classes.delete(n)),
        contains: n => classes.has(n),
        toggle: (n, force) => { const on = force ?? !classes.has(n); on ? classes.add(n) : classes.delete(n); return on; }
      };
    }
    querySelector(selector) { return element(selector); }
    querySelectorAll(selector) { return selector === '[data-cinematic-page]' ? [element('#backdropVideo')] : []; }
    getAnimations() { return []; }
    getBoundingClientRect() { return { width: 1024, height: 768, left: 0, top: 0 }; }
    setAttribute(k, v) { this.attrs[k] = String(v); }
    getAttribute(k) { return k === 'src' ? this.src : this.attrs[k]; }
    removeAttribute(k) { delete this.attrs[k]; }
    click() { this.dispatchEvent(new Event('click')); }
    focus() {}
    scrollIntoView() {}
    load() { this.currentTime = 0; this.ended = false; }
    play() { this.playCount++; this.paused = false; return Promise.resolve(); }
    pause() { this.paused = true; }
    dispatchEvent(event) {
      const result = super.dispatchEvent(event);
      if (event.bubbles && this !== document) document.dispatchEvent(new CustomEvent(event.type));
      return result;
    }
  }
  const element = s => { if (!elements.has(s)) elements.set(s, new Element()); return elements.get(s); };
  document = new Element();
  document.body = element('body'); document.documentElement = element('html'); document.hidden = false;
  const window = new Element();
  const noTimer = () => 1;
  Object.assign(window, { innerWidth: 1024, innerHeight: 768, scrollY: 0,
    matchMedia: q => ({ matches: reducedMotion && q.includes('reduced-motion') }),
    requestAnimationFrame: noTimer, cancelAnimationFrame() {}, setTimeout: noTimer, clearTimeout() {} });
  const context = vm.createContext({ window, document, console, Event, CustomEvent, Image: Element,
    navigator: { connection: { saveData } },
    getComputedStyle: () => ({ getPropertyValue: () => '.74' }),
    requestAnimationFrame: noTimer, cancelAnimationFrame() {}, performance: { now: () => 0 } });
  vm.runInContext(read('safety4cut.js'), context);
  const expose = `window.testApp = {
    prepare(index = 1, requested = true) {
      demoNarration = narrationAudio;
      demoPage = 'safety'; demoMode = 'sequence'; demoPaused = false;
      narrationRequested = requested; narrationUnlocked = true; narrationRunToken = 1;
      narrationSegmentIndex = index; demoNarration.dataset.runToken = '1';
      demoNarration.ended = false; demoNarration.currentTime = 0;
      demoNarration.duration = narrationByPage.safety[index].duration;
    },
    start: () => playNarrationSegment({ token: 1 }),
    advance: advanceSequence,
    media: () => demoNarration,
    tick(seconds) { demoNarration.currentTime = seconds; applyNarrationVisualTime(narrationByPage[demoPage][narrationSegmentIndex], seconds); },
    cinematic(page = 'weather') { demoPage = page; syncCinematicBackdrop(); },
    golden() { demoPage = 'support'; guidePhone.classList.add('support-demo-active'); syncGoldenRulesVideo(27000); },
    fail: (error) => handleNarrationFailure(error, narrationRunToken),
    visuals: () => ({ requested: narrationRequested, state: narrationState, reduced: reduceMotion }),
    transition(value) { stageTransitioning = value; },
    launched() { launchChoiceMade = true; },
    state: () => ({ page: demoPage, index: narrationSegmentIndex, paused: demoPaused, mode: demoMode })
  };`;
  vm.runInContext(read('app.js').replace(/\}\)\(\);\s*$/, `${expose}\n})();`), context);
  return { api: window.testApp, safety: window.PowerTBMSafety, element, document,
    audio: element('#demoNarration'), video: element('#safetyExample'),
    get media() { return window.testApp.media(); } };
}

const settle = () => new Promise(resolve => setImmediate(resolve));
const finishMedia = h => {
  h.media.currentTime = h.media.duration; h.media.ended = true;
  h.media.dispatchEvent(new Event('ended'));
};
{
  const h = harness(); h.api.prepare(1);
  const source = h.video.querySelector('source');
  source.src = 'assets/audio/balanced-v128/ko-08-safety4cut-example.mp4';
  let reloads = 0; h.video.load = () => reloads++;
  h.api.start(); await settle();
  assert.equal(reloads, 0, 'switching to a preloaded <source> must retain the prepared decoder');
  assert.equal(h.media, h.video);
  assert.equal(h.video.paused, false);
}

// Dispatch real registered surface listeners without depending on layout.
const surfaceTarget = (control = false, inside = true) => ({
  closest: selector => selector.startsWith('#tour') ? (inside ? {} : null) : (control ? {} : null)
});
const surfaceEvent = (h, type, target, props = {}) => {
  const event = new Event(type, { cancelable: true });
  Object.defineProperty(event, 'target', { value: target });
  Object.assign(event, { clientX: 10, clientY: 10 }, props);
  h.document.dispatchEvent(event);
};
{
  const h = harness(); h.api.prepare(0); h.api.start();
  h.media.currentTime = 4.5;
  const surface = surfaceTarget();
  surfaceEvent(h, 'pointerdown', surface);
  surfaceEvent(h, 'click', surface);
  assert.equal(h.api.state().paused, true, 'central tap pauses narration');
  assert.equal(h.media.paused, true);
  assert.equal(h.element('#demoPauseHint').hidden, false);
  surfaceEvent(h, 'pointerdown', surface);
  surfaceEvent(h, 'click', surface);
  assert.equal(h.api.state().paused, false, 'second tap resumes');
  assert.equal(h.media.currentTime, 4.5, 'resume never rewinds');
  assert.equal(h.element('#demoPauseHint').hidden, true);
  for (const target of [surfaceTarget(true), surfaceTarget(false, false)]) {
    surfaceEvent(h, 'pointerdown', target); surfaceEvent(h, 'click', target);
    assert.equal(h.api.state().paused, false, 'controls and header must not toggle playback');
  }
  surfaceEvent(h, 'pointerdown', surface);
  surfaceEvent(h, 'pointermove', surface, { clientX: 40 });
  surfaceEvent(h, 'click', surface);
  assert.equal(h.api.state().paused, false, 'drag/scroll is not a tap');
  surfaceEvent(h, 'pointerdown', surface); surfaceEvent(h, 'pointercancel', surface);
  surfaceEvent(h, 'click', surface);
  assert.equal(h.api.state().paused, false, 'cancelled touch is ignored');
  h.api.transition(true);
  surfaceEvent(h, 'pointerdown', surface); surfaceEvent(h, 'click', surface);
  assert.equal(h.api.state().paused, false, 'transition cannot be interrupted');
  h.api.transition(false);
  const key = new Event('keydown', { cancelable: true });
  Object.assign(key, { key: ' ' }); h.element('.tour-stage').dispatchEvent(key);
  assert.equal(h.api.state().paused, true, 'keyboard pause works');
  assert.equal(key.defaultPrevented, true, 'space does not scroll');
}
{
  const h = harness(); h.api.prepare(1); h.api.start();
  h.video.currentTime = 12;
  surfaceEvent(h, 'click', surfaceTarget());
  assert.equal(h.video.paused, true, 'original safety video pauses with narration');
  surfaceEvent(h, 'click', surfaceTarget());
  assert.equal(h.video.paused, false);
  assert.equal(h.video.currentTime, 12);
}
for (const [menu, page, next] of [
  ['weatherDemoPage', 'weather', 'meeting'], ['meetingDemoPage', 'meeting', 'support'],
  ['supportDemoPage', 'support', 'safety'], ['safetyDemoPage', 'safety', 'closing']
]) {
  const h = harness(); h.api.prepare(0);
  h.element('#' + menu).click();
  assert.equal(h.api.state().page, page);
  assert.equal(h.api.state().mode, 'sequence', 'each menu starts continuous playback');
  for (let i = 0; i < 12 && h.api.state().page === page; i++) finishMedia(h);
  assert.equal(h.api.state().page, next, menu + ' continues into the next chapter');
}
{
  const h = harness(); h.api.prepare(0, false); h.api.launched();
  surfaceEvent(h, 'click', surfaceTarget());
  assert.equal(h.api.state().paused, true, 'silent fallback can also be paused');
  surfaceEvent(h, 'click', surfaceTarget());
  assert.equal(h.api.state().paused, false);
}
console.log('PASS: central tap, resume position, controls excluded, drag/cancel guards, keyboard, video pause, silent fallback, every menu continues');

{
  const h = harness(); h.api.prepare(0); h.api.start();
  assert.match(h.audio.src, /ko-07-safety4cut-intro\.m4a$/);
  finishMedia(h);
  assert.equal(h.api.state().index, 1);
  assert.equal(h.media, h.video, 'visible video must own both picture and original audio');
  assert.equal(h.video.src, 'assets/audio/balanced-v128/ko-08-safety4cut-example.mp4');
  assert.equal(h.audio.paused, true, 'no duplicate audio decoder');
  assert.equal(h.video.muted, false);
  h.video.dispatchEvent(new Event('loadedmetadata'));
  h.api.tick(12);
  assert.equal(h.video.currentTime, 12, 'video clock must not seek itself');
  assert.equal(h.video.muted, false, 'metadata/render must not mute the shared player');
  assert.equal(h.element('#safetyDemo').dataset.scene, '5');
  assert.equal(h.api.state().page, 'safety');
  h.audio.ended = true; h.audio.dispatchEvent(new Event('ended'));
  assert.equal(h.api.state().page, 'safety', 'stale audio event must not advance the video');
  finishMedia(h);
  assert.equal(h.api.state().page, 'closing', 'native video end advances without clipping');
  assert.equal(h.media, h.audio, 'closing restores narration audio');
}
{
  const h = harness(); h.api.prepare(); h.api.start(); await settle();
  h.api.tick(30);
  h.element('#demoToggle').click();
  assert.equal(h.video.paused, true);
  h.element('#demoToggle').click(); await settle();
  assert.equal(h.video.paused, false);
  assert.equal(h.video.currentTime, 30);
  h.document.hidden = true; h.document.dispatchEvent(new Event('visibilitychange'));
  assert.equal(h.video.paused, true);
  h.document.hidden = false; h.document.dispatchEvent(new Event('visibilitychange')); await settle();
  assert.equal(h.video.paused, false);
  assert.equal(h.video.currentTime, 30);
  h.element('#demoMute').click(); assert.equal(h.video.muted, true);
  h.element('#demoMute').click(); assert.equal(h.video.muted, false);
}
{
  const h = harness(); h.api.prepare(); h.api.start(); await settle();
  h.api.tick(7); h.api.fail(new Error('decode failed'));
  assert.equal(h.api.state().page, 'safety');
  assert.equal(h.api.state().index, 1);
  assert.equal(h.api.state().paused, true);
  assert.equal(h.api.visuals().requested, true, 'failure must not enter silent fallback');
  assert.equal(h.element('#safetyDemo').dataset.scene, '5', 'must not replay introduction');
  h.element('#demoMute').click(); await settle();
  assert.equal(h.video.currentTime, 7);
  assert.equal(h.video.paused, false);
}
{
  const h = harness(); h.api.prepare(0);
  let rejectIntro;
  h.audio.play = () => new Promise((_, reject) => { rejectIntro = reject; });
  h.api.start(); finishMedia(h);
  rejectIntro(Object.assign(new Error('old load interrupted'), { name: 'AbortError' }));
  await settle();
  assert.equal(h.api.state().index, 1);
  assert.equal(h.api.state().paused, false, 'old segment rejection must not stop the new segment');
  assert.equal(h.media, h.video);
}
{
  const h = harness(); h.api.prepare(0, false); h.api.advance();
  assert.equal(h.api.state().page, 'safety', 'fallback must wait for native video end');
  h.video.ended = true; h.video.dispatchEvent(new Event('ended'));
  assert.equal(h.api.state().page, 'closing');
}
{
  const h = harness({ reducedMotion: true, saveData: true });
  const backdrop = h.element('#backdropVideo'); backdrop.dataset.cinematicPage = 'weather';
  h.api.cinematic(); assert.equal(backdrop.paused, true, 'ordinary viewing respects reduced motion');
  h.document.body.classList.add('demo-recording');
  h.api.cinematic(); await settle(); assert.equal(backdrop.paused, false, 'recording includes moving backdrops');
  h.document.body.classList.remove('demo-recording');
  h.document.dispatchEvent(new CustomEvent('power-tbm:recording-stop'));
  assert.equal(backdrop.paused, true, 'restore viewer preference after recording');
  h.api.golden(); await settle();
  assert.equal(h.element('#goldenRulesVideo').paused, false, 'explicit tutorial video is not decorative motion');
}
{
  const h = harness(); const golden = h.element('#goldenRulesVideo'); let attempts = 0;
  golden.play = () => ++attempts === 1
    ? Promise.reject(Object.assign(new Error('cancelled'), { name: 'AbortError' }))
    : (golden.paused = false, Promise.resolve());
  h.api.golden(); await settle(); h.api.golden(); await settle();
  assert.equal(attempts, 2, 'transient golden video interruption is retryable');
  assert.equal(golden.paused, false);
}
{
  const h = harness({ reducedMotion: false });
  const backdrop = h.element('#backdropVideo');
  backdrop.dataset.cinematicPage = 'support';
  backdrop.classList.add('cinematic-backdrop-tools');
  h.api.golden(); await settle();
  assert.equal(backdrop.paused, true, 'Golden Rules owns the decoder while its clip is visible');
  h.api.prepare(1); h.api.start(); h.api.tick(1); await settle();
  backdrop.dataset.cinematicPage = 'safety';
  h.api.cinematic('safety');
  assert.equal(backdrop.paused, true, '4-cut footage does not compete with background decoding');
}
{
  const h = harness({ reducedMotion: false }); let failures = 0;
  h.document.addEventListener('power-tbm:playback-error', () => failures++);
  const backdrop = h.element('#backdropVideo'); backdrop.dataset.cinematicPage = 'weather';
  backdrop.play = () => Promise.reject(new Error('optional decoder unavailable'));
  h.api.cinematic(); await settle();
  assert.equal(failures, 0, 'optional background failure must not stop a healthy recording');
  assert.equal(backdrop.dataset.playbackFailed, 'true');
}

const original = readFileSync(new URL('assets/safety4cut/09-ai-example-v84.mp4', root));
assert.equal(createHash('sha256').update(original).digest('hex'),
  '981c8cf85a52abab0bc976528c7675026582762f506d0e4aa2cd0740a5c05509');
const cacheContext = vm.createContext({ self: { addEventListener() {}, location: { search: "" } }, URL, URLSearchParams, Map });
vm.runInContext(read('sw.js'), cacheContext);
const cached = vm.runInContext('PRECACHE_URLS', cacheContext);
assert(cached.includes('./assets/audio/balanced-v128/ko-08-safety4cut-example.mp4'));
assert(cached.includes('./assets/audio/balanced-v128/ko-07-safety4cut-intro.m4a'));
assert(cached.includes('./app.js?v=20261025-sector-backgrounds-v146'));
assert(cached.includes('./subtitles.js?v=20261020-language-v117'));
assert(cached.includes('./subtitles.css?v=20261004-v87'));
assert(cached.includes('./subtitle-data.js?v=20261024-voice-alignment-v142'));
assert(cached.includes('./safety4cut.js?v=20261030-safety-upload-v148'));
console.log('PASS: original bytes, single video/audio clock, intro handoff, no rewind on error, stale events, mute, pause/resume, hidden tab, fallback, recording motion, Golden Rules retry, cache paths');
