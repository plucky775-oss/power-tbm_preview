import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

// Run with an existing jsdom installation; this does not add an app dependency.
// Example: JSDOM_PATH=/tmp/tbm-language-qa/node_modules/jsdom node tests/verify-language.mjs
const require = createRequire(import.meta.url);
let JSDOM, VirtualConsole;
for (const modulePath of [process.env.JSDOM_PATH, 'jsdom', '/tmp/tbm-language-qa/node_modules/jsdom'].filter(Boolean)) {
  try { ({ JSDOM, VirtualConsole } = require(modulePath)); break; } catch (_) { /* Try the next existing installation. */ }
}
assert.ok(JSDOM, 'Install jsdom outside the project and set JSDOM_PATH to that installation.');
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const languageKey = 'power-tbm-demo-language';
const scripts = new Set(['tv-media-timeline.js', 'english-narration.js', 'tv-compat.js', 'demo-translations.js', 'demo-language.js',
  'safety4cut.js', 'subtitle-data.js', 'subtitle-data.en.js', 'subtitles.js', 'app.js']);

function setup({ savedLanguage, storageUnavailable = false, reducedMotion = false } = {}) {
  const errors = [], mediaCalls = [], pending = new Map();
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', error => errors.push(error.message));
  const dom = new JSDOM(html, { url: 'https://demo.test/', runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole });
  const { window } = dom;
  const { document } = window;
  window.matchMedia = media => ({ media, matches: reducedMotion && media.includes('prefers-reduced-motion'), addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
  let nextFrame = 0;
  window.requestAnimationFrame = callback => { pending.set(++nextFrame, callback); return nextFrame; };
  window.cancelAnimationFrame = handle => pending.delete(handle);
  for (const method of ['play', 'pause', 'load']) {
    window.HTMLMediaElement.prototype[method] = function () {
      mediaCalls.push([this.id, method]);
      return method === 'play' ? Promise.resolve() : undefined;
    };
  }
  if (storageUnavailable) Object.defineProperty(window, 'localStorage', {
    value: { getItem() { throw Error('blocked'); }, setItem() { throw Error('blocked'); } }
  });
  else if (savedLanguage !== undefined) window.localStorage.setItem(languageKey, savedLanguage);
  // Evaluate the production scripts in their real page order. Media decoding and
  // animation scheduling are the only unavailable browser facilities stubbed here.
  const executed = [];
  for (const script of document.querySelectorAll('script[src]')) {
    const file = script.getAttribute('src').split('?')[0];
    if (!scripts.has(file)) continue;
    window.eval(readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'));
    executed.push(file);
  }
  assert.equal(executed.length, scripts.size, 'all language, scene, subtitle and app runtimes are linked from the page');
  function flushFrames() {
    const batch = [...pending];
    pending.clear();
    for (const [, callback] of batch) callback(window.performance.now());
  }
  const chooseLanguage = language => document.querySelector(`[data-demo-language="${language}"]`).click();
  const chooseMode = mode => {
    const toggle = document.getElementById('subtitleToggle');
    toggle.value = mode;
    toggle.dispatchEvent(new window.Event('change'));
    flushFrames();
  };
  const render = (id, time) => { window.PowerTBMSubtitles.render(id, time); flushFrames(); };
  return { window, document, errors, mediaCalls, chooseLanguage, chooseMode, render, close: () => window.close() };
}

const h = setup();
const { window, document } = h;
const api = window.PowerTBMLanguage;
const detail = document.querySelector('.tour-detail');
const originalDetail = detail.textContent;
const phone = document.querySelector('.guide-phone');
const phoneAppText = element => {
  const copy = element.cloneNode(true);
  copy.querySelector('#safetyCaption').remove();
  return copy.textContent;
};
const originalPhone = phoneAppText(phone);
const originalMedia = [...document.querySelectorAll('audio, video')];
const originalEmphasis = [...detail.querySelectorAll('em, br')];
const narration = document.getElementById('demoNarration');
const example = document.getElementById('safetyExample');
const launch = document.getElementById('launchIntro');
assert.equal(api.get(), 'ko');
assert.equal(api.getMode(), 'ko');
assert.equal(document.documentElement.lang, 'ko');
assert.equal(document.querySelectorAll('#launchStartPanel [data-demo-language]').length, 3, 'all three repeat modes are selectable before playback');
assert.ok(launch.classList.contains('is-awaiting-start'));
narration.currentTime = 19;
example.currentTime = 13.5;
const callsBeforeLanguage = h.mediaCalls.length;
const changes = [];
window.addEventListener('power-tbm:languagechange', event => changes.push(event.detail.language));
h.chooseLanguage('en');
assert.equal(api.get(), 'en');
assert.equal(api.getMode(), 'en');
assert.equal(document.documentElement.lang, 'en');
assert.equal(window.localStorage.getItem(languageKey), 'en');
assert.deepEqual(changes, ['en']);
assert.equal(document.querySelector('[data-demo-language="en"]').getAttribute('aria-pressed'), 'true');
assert.equal(document.querySelector('[data-demo-language="ko"]').getAttribute('aria-pressed'), 'false');
assert.ok(launch.classList.contains('is-awaiting-start'), 'selecting a language must keep the start screen open');
assert.equal(h.mediaCalls.length, callsBeforeLanguage, 'language selection must not play, pause or reload media');
assert.equal(narration.currentTime, 19);
assert.equal(example.currentTime, 13.5);
assert.deepEqual([...document.querySelectorAll('audio, video')], originalMedia, 'existing media elements remain intact');
assert.deepEqual([...detail.querySelectorAll('em, br')], originalEmphasis, 'headings retain their emphasis and line breaks');
assert.doesNotMatch(detail.textContent, /[가-힣]/, 'every right-hand explanation is available in English');
assert.equal(phoneAppText(phone), originalPhone, 'the phone app screen stays Korean with English narration');
assert.equal(phone.lang, 'ko', 'the phone declares its own Korean content language');
assert.doesNotMatch(document.querySelector('#launchStartTitle').textContent, /[가-힣]/);
assert.doesNotMatch(document.querySelector('#subtitleToggle').textContent, /[가-힣]/);
api.set('invalid');
assert.equal(api.get(), 'en', 'unsupported languages cannot corrupt the selection');
assert.deepEqual(changes, ['en']);
h.chooseLanguage('ko');
assert.equal(detail.textContent, originalDetail, 'returning to Korean restores the original complete explanations');
console.log('PASS: first-screen selection, persistence, no media restart, HTML language, accessibility state, English explanations and exact Korean restoration');

// Exercise real DOM mutation, including replacement text nodes and updates to
// an existing node. The production runtime, rather than a copied algorithm,
// is responsible for remembering and restoring each current Korean source.
const fixture = document.createElement('section');
fixture.innerHTML = '<p id="qa-dynamic" aria-label="기상정보" title="기상정보"> 기상정보 <em>안전가이드</em><br></p>' +
  '<img alt="기상정보"><input placeholder="기상정보"><span data-language-fixed>기상정보</span>' +
  '<script type="text/plain">기상정보</script><style>/* 기상정보 */</style><noscript>기상정보</noscript><textarea>기상정보</textarea>';
document.body.append(fixture);
const dynamic = fixture.querySelector('#qa-dynamic');
const textNode = dynamic.firstChild;
const emphasis = dynamic.querySelector('em');
const lineBreak = dynamic.querySelector('br');
let clicks = 0;
emphasis.addEventListener('click', () => clicks++);
h.chooseLanguage('en');
assert.equal(dynamic.firstChild, textNode);
assert.equal(dynamic.querySelector('em'), emphasis);
assert.equal(dynamic.querySelector('br'), lineBreak);
assert.equal(textNode.nodeValue, ` ${window.PowerTBMEnglish['기상정보']} `);
emphasis.click();
assert.equal(clicks, 1, 'language switching keeps existing event listeners');
for (const [selector, attribute] of [['p', 'aria-label'], ['p', 'title'], ['img', 'alt'], ['input', 'placeholder']]) {
  assert.equal(fixture.querySelector(selector).getAttribute(attribute), window.PowerTBMEnglish['기상정보']);
}
for (const element of fixture.querySelectorAll('script, style, noscript, textarea, [data-language-fixed]')) {
  assert.match(element.textContent, /기상정보/, 'content that is not UI translation stays unchanged');
}
textNode.nodeValue = '안전가이드';
dynamic.setAttribute('title', '안전가이드');
api.apply(fixture);
assert.equal(textNode.nodeValue, window.PowerTBMEnglish['안전가이드']);
assert.equal(dynamic.getAttribute('title'), window.PowerTBMEnglish['안전가이드']);
h.chooseLanguage('ko');
assert.equal(textNode.nodeValue, '안전가이드', 'later application updates replace the remembered Korean text');
assert.equal(dynamic.getAttribute('title'), '안전가이드');
dynamic.textContent = '기상정보';
h.chooseLanguage('en');
assert.equal(dynamic.textContent, window.PowerTBMEnglish['기상정보'], 'newly created description nodes are translated');
fixture.remove();
console.log('PASS: dynamically created and updated DOM text, original node/listener preservation, attribute translations and excluded content');

// Safety descriptions are regenerated at five scene boundaries. Test those
// production renders, including the embedded-video branch that runs per frame.
for (const scene of window.PowerTBMSafety.scenes) {
  window.PowerTBMSafety.render(scene.at + .2, { paused: true, mediaClock: true });
  for (const id of ['safetyTitle', 'safetyDescription', 'safetyPoints', 'safetySceneLabel']) {
    assert.doesNotMatch(document.getElementById(id).textContent, /[가-힣]/, `English dynamic safety scene: ${scene.label} / ${id}`);
  }
  assert.equal(document.getElementById('safetyCaption').textContent, api.translate(scene.caption), 'the bottom Safety 4-Cut explanation follows English narration');
  assert.equal(document.getElementById('safetyCaption').lang, 'en');
  const time = window.PowerTBMSafety.time;
  h.chooseLanguage('ko');
  assert.equal(document.getElementById('safetyDescription').textContent, scene.description);
  assert.equal(document.getElementById('safetyCaption').textContent, scene.caption);
  assert.equal(document.getElementById('safetyCaption').lang, 'ko');
  assert.equal(window.PowerTBMSafety.time, time, 'language changes preserve the safety scene clock');
  h.chooseLanguage('en');
  assert.equal(document.getElementById('safetyCaption').textContent, api.translate(scene.caption), 'a paused caption switches back to English immediately');
}
example.dispatchEvent(new window.Event('error'));
assert.equal(document.getElementById('safetyCaption').textContent, api.translate('교육영상을 불러오지 못했습니다'), 'the bottom video failure message follows the selected language');
console.log('PASS: all five dynamic Safety 4-Cut scenes, translated bottom captions/errors, Korean app screen and clock preservation');

const koData = window.PowerTBMSubtitleData;
const enData = window.PowerTBMSubtitleDataEn;
assert.deepEqual(Object.keys(enData), Object.keys(koData));
assert.equal(Object.keys(enData).length, 9);
assert.match(koData['01-weather'][6].words.map(w => w.text).join(' '), /한국의 레이더 영상 및 기상특보를/);
assert.match(enData['01-weather'][6].words.map(w => w.text).join(' '), /radar imagery and weather alerts for Korea/);
assert.equal(document.querySelector('.typhoon-compare > p').textContent,
  'View typhoon tracks from Korea, the U.S., and Japan, along with radar imagery and weather alerts for Korea—all in one place.');
assert.equal(Object.values(enData).reduce((count, cues) => count + cues.length, 0), 85);
const caption = document.getElementById('subtitleLine');
const bubble = document.getElementById('subtitleBubble');
const panel = document.getElementById('narrationSubtitles');
const cueText = cue => cue.words.map(word => word.text).join(' ');
for (const [id, cues] of Object.entries(enData)) {
  assert.equal(cues.length, koData[id].length, `same cue count: ${id}`);
  cues.forEach((cue, index) => {
    assert.ok(cue.start >= 0 && cue.end > cue.start);
    assert.ok(cue.end <= window.PowerTBMEnglishNarration.tracks[id].duration, `English cue stays within its audio: ${id}/${index}`);
    if (index) assert.ok(cue.start >= cues[index - 1].end - 1e-6, `English cues do not overlap: ${id}/${index}`);
    assert.ok(cue.words.length);
    assert.doesNotMatch(cueText(cue), /[가-힣]/);
    let previousEnd = cue.start;
    for (const word of cue.words) {
      assert.ok(word.text.trim());
      assert.ok(Number.isFinite(word.start) && Number.isFinite(word.end));
      assert.ok(word.start >= previousEnd - 1e-9 && word.end > word.start && word.end <= cue.end + 1e-9, `valid English word timing: ${id}/${index}`);
      previousEnd = word.end;
    }
  });
}
for (const [language, data] of [['en', enData], ['ko', koData]]) {
  h.chooseLanguage(language);
  for (const [id, cues] of Object.entries(data)) {
    for (const cue of cues) {
      h.chooseMode('bubble');
      h.render(id, (cue.start + cue.end) / 2);
      assert.equal(bubble.textContent, cueText(cue), `complete ${language} bubble: ${id}/${cue.start}`);
      assert.equal(bubble.hidden, false);
      assert.equal(caption.textContent, '');
      h.chooseMode('karaoke');
      assert.equal(caption.textContent, cueText(cue), `complete ${language} highlighted subtitle: ${id}/${cue.start}`);
      assert.equal(bubble.hidden, true);
    }
  }
}
h.chooseMode('karaoke');
narration.dataset.segment = '02-tbm-basic';
narration.dataset.narrationActive = 'true';
narration.currentTime = 19;
narration.dispatchEvent(new window.Event('seeked'));
assert.equal(caption.textContent, cueText(koData['02-tbm-basic'].find(c => c.start <= 19 && c.end > 19)));
h.chooseLanguage('en');
assert.equal(caption.textContent, cueText(enData['02-tbm-basic'].find(c => c.start <= 19 && c.end > 19)), 'English replaces a paused caption immediately');
assert.equal(narration.currentTime, 19);
assert.ok([...caption.children].some(word => parseFloat(word.style.getPropertyValue('--read')) > 0), 'reading highlight stays at the current media time');
h.chooseMode('bubble');
h.chooseLanguage('ko');
assert.equal(bubble.textContent, cueText(koData['02-tbm-basic'].find(c => c.start <= 19 && c.end > 19)));
h.chooseMode('off');
h.render('00-opening', 2);
h.chooseLanguage('en');
assert.equal(panel.hidden, true);
assert.equal(bubble.hidden, true);
assert.equal(caption.textContent, '');
h.chooseMode('bubble');
assert.equal(bubble.textContent, cueText(enData['00-opening'][0]), 'enabling captions uses the latest time and selected language');
const englishClock = window.PowerTBMEnglishNarration.tracks['08-safety4cut-example'].clock;
const silenceIndex = englishClock.findIndex((p, i) => i > 0 && p[1] >= 35);
const [a, b] = englishClock.slice(silenceIndex - 1, silenceIndex + 1);
const englishSilence = a[0] + (35 - a[1]) * (b[0] - a[0]) / (b[1] - a[1]);
h.render('08-safety4cut-example', englishSilence);
assert.equal(bubble.hidden, true, 'silent intervals stay empty in English');
const stage = document.getElementById('tourStage');
const device = stage.querySelector('.tour-device');
stage.getBoundingClientRect = () => ({ left: 20, top: 90, width: 1400 });
device.getBoundingClientRect = () => ({ left: 90, right: 420, top: 120 });
window.innerWidth = 1440;
h.render('00-opening', 2);
assert.equal(bubble.classList.contains('is-stacked'), false);
assert.ok(parseFloat(bubble.style.left) >= 400, 'English bubble remains beside the phone on a wide display');
stage.getBoundingClientRect = () => ({ left: 8, top: 90, width: 374 });
window.innerWidth = 390;
window.dispatchEvent(new window.Event('resize'));
h.render('00-opening', 2);
assert.equal(bubble.classList.contains('is-stacked'), true);
assert.equal(bubble.style.top, '16px');
assert.ok(parseFloat(bubble.style.left) >= 0);
h.chooseLanguage('ko');
h.render('00-opening', 2);
assert.equal(bubble.classList.contains('is-stacked'), true, 'language changes preserve responsive bubble placement');
assert.equal(h.errors.length, 0, h.errors.join('\n'));
h.close();
console.log('PASS: English and Korean subtitles for all 9 tracks / 85 cues, independent English cue clocks, both display modes, OFF, immediate language changes, paused seek, reading progress, silence and resize branches');

for (const options of [{ savedLanguage: 'ko' }, { savedLanguage: 'en' }, { savedLanguage: 'alternate' }, { savedLanguage: 'invalid' }, { storageUnavailable: true }]) {
  const reopened = setup(options);
  assert.equal(reopened.window.PowerTBMLanguage.get(), options.savedLanguage === 'en' ? 'en' : 'ko');
  const savedMode = ['ko', 'en', 'alternate'].includes(options.savedLanguage) ? options.savedLanguage : 'ko';
  assert.equal(reopened.window.PowerTBMLanguage.getMode(), savedMode);
  assert.equal(reopened.document.querySelector(`[data-demo-language="${savedMode}"]`).getAttribute('aria-pressed'), 'true');
  assert.equal(phoneAppText(reopened.document.querySelector('.guide-phone')), originalPhone, 'phone app stays Korean when reopening with a saved language');
  if (options.savedLanguage === 'en') assert.doesNotMatch(reopened.document.querySelector('.tour-detail').textContent, /[가-힣]/, 'stored English applies through app initialization');
  reopened.chooseLanguage('en');
  assert.equal(reopened.window.PowerTBMLanguage.get(), 'en');
  reopened.chooseLanguage('ko');
  assert.equal(reopened.window.PowerTBMLanguage.get(), 'ko');
  const callsBeforeAlternate = reopened.mediaCalls.length;
  reopened.chooseLanguage('alternate');
  assert.equal(reopened.window.PowerTBMLanguage.getMode(), 'alternate');
  assert.equal(reopened.window.PowerTBMLanguage.get(), 'ko', 'alternating mode starts with a full Korean tour');
  assert.equal(reopened.mediaCalls.length, callsBeforeAlternate, 'choosing alternating mode does not start playback');
  assert.equal(reopened.errors.length, 0, reopened.errors.join('\n'));
  reopened.close();
}
console.log('PASS: all three saved playback modes, legacy single-language preferences, invalid preference fallback and selection without local storage');

// Drive the actual app click handlers from the launch gate through two menu
// chapters and back home. Reduced motion removes only transition delays.
const flow = setup({ reducedMotion: true });
const flowDocument = flow.document;
const flowLaunch = flowDocument.getElementById('launchIntro');
const flowStage = flowDocument.getElementById('tourStage');
const playingHintKo = '자동 시연. 터치하거나 스페이스 키를 누르면 일시정지합니다.';
const pausedHintKo = '시연 일시정지 중. 터치하거나 스페이스 키를 누르면 계속 재생합니다.';
const playingHintEn = flow.window.PowerTBMEnglish[playingHintKo];
const pausedHintEn = flow.window.PowerTBMEnglish[pausedHintKo];
const startupCalls = flow.mediaCalls.length;
flow.chooseLanguage('en');
assert.ok(flowLaunch.classList.contains('is-awaiting-start'));
assert.equal(flow.mediaCalls.length, startupCalls);
flowDocument.querySelector('[data-launch-sound="off"]').click();
assert.equal(flowLaunch.classList.contains('is-awaiting-start'), false);
assert.ok(flow.mediaCalls.slice(startupCalls).some(([, method]) => method === 'play'), 'the explicit playback choice starts the demo');
assert.equal(flowStage.getAttribute('aria-label'), playingHintEn, 'the live playback hint stays English after starting without a demoToggle element');
flowDocument.getElementById('weatherDemoPage').click();
assert.equal(flowStage.dataset.demoPage, 'weather');
assert.match(flowDocument.getElementById('demoNarration').src, /audio\/en-v119\/01-weather\.m4a$/, 'English selection uses the recorded English voice');
assert.equal(flowDocument.getElementById('demoNarration').muted, true, 'English narration preserves the explicit silent-playback choice');
assert.doesNotMatch(flowDocument.querySelector('.tour-copy').textContent, /[가-힣]/);
assert.equal(flowStage.getAttribute('aria-label'), playingHintEn, 'changing chapters keeps the current English playback hint');
await Promise.resolve();
flowStage.click();
assert.ok(flowDocument.querySelector('.guide-phone').classList.contains('is-paused'), 'the real playback-surface handler pauses the demo');
assert.equal(flowStage.getAttribute('aria-label'), pausedHintEn, 'pausing updates the playback hint in English');
flow.chooseLanguage('ko');
assert.equal(flowStage.getAttribute('aria-label'), pausedHintKo, 'Korean restores the exact current paused hint');
flow.chooseLanguage('en');
assert.equal(flowStage.getAttribute('aria-label'), pausedHintEn);
flowStage.click();
assert.equal(flowDocument.querySelector('.guide-phone').classList.contains('is-paused'), false, 'the real playback-surface handler resumes the demo');
assert.equal(flowStage.getAttribute('aria-label'), playingHintEn, 'resuming restores the English playing hint');
flowDocument.getElementById('safetyDemoPage').click();
assert.equal(flowStage.dataset.demoPage, 'safety');
assert.doesNotMatch(flowDocument.querySelector('.safety-explanations').textContent, /[가-힣]/);
flowDocument.getElementById('homeReset').click();
assert.ok(flowLaunch.classList.contains('is-awaiting-start'));
assert.equal(flow.window.PowerTBMLanguage.get(), 'en', 'returning home retains the language choice');
const returnCalls = flow.mediaCalls.length;
flow.chooseLanguage('ko');
assert.equal(flow.mediaCalls.length, returnCalls);
assert.ok(flowLaunch.classList.contains('is-awaiting-start'));
assert.equal(flowDocument.getElementById('launchStartTitle').textContent, '자동시연을 시작합니다');
assert.equal(flowDocument.getElementById('safetyDescription').textContent, flow.window.PowerTBMSafety.scenes[0].description);
assert.equal(flowStage.getAttribute('aria-label'), playingHintKo, 'returning home and choosing Korean restores the exact playing hint');
await Promise.resolve();
assert.equal(flow.errors.length, 0, flow.errors.join('\n'));
flow.close();
console.log('PASS: actual app flow English selection → explicit muted start → weather → pause/resume → Safety 4-Cut → home → Korean, including dynamic English/Korean accessibility hints and no playback caused by language selection');

// Finish real playback events for whole tours in each selected repeat mode. Only
// native media completion is simulated; language, DOM and transition code are real.
for (const [mode, sound] of [['ko', 'on'], ['en', 'off'], ['alternate', 'off']]) {
  const loop = setup({ reducedMotion: true });
  loop.chooseLanguage(mode);
  const startingLanguage = mode === 'en' ? 'en' : 'ko';
  const d = loop.document;
  const lang = loop.window.PowerTBMLanguage;
  const stage = d.getElementById('tourStage');
  const order = ['00-opening', '01-weather', '02-tbm-basic', '03-ai-pdf',
    '04-safety-tools', '05-emergency', '07-safety4cut-intro', '08-safety4cut-example', '06-closing'];
  const active = () => d.querySelector('audio[data-narration-active="true"], video[data-narration-active="true"]');
  const finish = () => {
    const player = active();
    Object.defineProperty(player, 'duration', { configurable: true, value: 600 });
    Object.defineProperty(player, 'ended', { configurable: true, value: true });
    player.currentTime = 600;
    player.dispatchEvent(new loop.window.Event('ended'));
  };
  let stopAtEnd = false;
  let completed = 0;
  d.addEventListener('power-tbm:sequence-complete', event => {
    completed++;
    if (stopAtEnd) event.preventDefault();
  });
  d.querySelector(`[data-launch-sound="${sound}"]`).click();
  for (let cycle = 0; cycle < 3; cycle++) {
    const currentLanguage = mode === 'alternate' && cycle % 2 ? 'en' : startingLanguage;
    for (const id of order) {
      await Promise.resolve();
      assert.equal(lang.get(), currentLanguage, 'keep one language through every chapter and the closing');
      assert.equal(active().dataset.segment, id);
      assert.equal(active().muted, sound === 'off', 'repeating preserves the sound choice');
      assert.equal(/(?:en-v119|02-tbm-basic-en\.m4a)/.test(active().src), currentLanguage === 'en', `${id} uses the current language's audio`);
      if (id === '06-closing' && cycle === 2) stopAtEnd = true;
      finish();
    }
    assert.equal(completed, cycle + 1, 'one completion event per full tour');
    assert.equal(loop.window.localStorage.getItem(languageKey), mode, 'automatic loops preserve the saved playback mode');
    assert.equal(lang.getMode(), mode);
    assert.equal(d.querySelector(`[data-demo-language="${mode}"]`).getAttribute('aria-pressed'), 'true', 'the selected menu remains the repeat mode, not the current tour language');
    if (stopAtEnd) {
      assert.equal(lang.get(), currentLanguage, 'a canceled repeat, such as recording completion, must not switch language');
      assert.equal(stage.dataset.demoPage, 'closing');
    } else {
      assert.equal(lang.get(), mode === 'alternate' ? (currentLanguage === 'ko' ? 'en' : 'ko') : currentLanguage);
      assert.equal(stage.dataset.demoPage, 'intro');
      assert.equal(active().dataset.segment, '00-opening');
      assert.equal(d.documentElement.lang, lang.get());
      assert.equal(d.querySelector('.guide-phone').lang, 'ko', 'the app screen remains Korean after automatic alternation');
      assert.equal(d.getElementById('safetyCaption').lang, lang.get());
      const englishCredit = d.querySelector('.demo-only-developer').textContent.startsWith('Developer:');
      assert.equal(englishCredit, lang.get() === 'en');
      loop.chooseMode('bubble');
      const data = lang.get() === 'en' ? loop.window.PowerTBMSubtitleDataEn : loop.window.PowerTBMSubtitleData;
      const cue = data['00-opening'][0];
      loop.render('00-opening', (cue.start + cue.end) / 2);
      assert.equal(d.getElementById('subtitleBubble').textContent, cueText(cue), 'the next opening uses matching subtitles');
    }
  }
  assert.equal(loop.errors.length, 0, loop.errors.join('\n'));
  loop.close();
}
console.log('PASS: Korean-only, English-only and alternating full tours; paired voices/subtitles/credits, Korean phone screens, mute preservation, saved playback mode and canceled recording repeat');
