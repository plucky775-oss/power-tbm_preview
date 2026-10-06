import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
const source = readFileSync(new URL('../subtitles.js', import.meta.url), 'utf8');
const data = readFileSync(new URL('../subtitle-data.js', import.meta.url), 'utf8');

function setup(saved = {}, storageUnavailable = false) {
  class Element extends EventTarget {
    constructor() {
      super(); this.hidden = false; this.children = []; this.attrs = {}; this.dataset = {};
      this.value = ''; this.currentTime = 0; this.text = '';
      this.style = { setProperty(k, v) { this[k] = v; } };
      const classes = new Set();
      this.classList = { toggle(k, on) { on ? classes.add(k) : classes.delete(k); }, contains(k) { return classes.has(k); } };
    }
    append(...children) { this.children.push(...children); }
    replaceChildren(...children) { this.children = children; this.text = ''; }
    set textContent(value) { this.text = value; this.children = []; }
    get textContent() { return this.text + this.children.map(c => c.textContent).join(''); }
    setAttribute(k, v) { this.attrs[k] = v; }
    removeAttribute(k) { delete this.attrs[k]; }
    getBoundingClientRect() { return this.box; }
    querySelector() { return device; }
  }
  const nodes = Object.fromEntries(['narrationSubtitles', 'subtitleLine', 'subtitleToggle', 'demoNarration', 'safetyExample', 'tourStage'].map(id => [id, new Element()]));
  const device = new Element(); device.box = { left: 90, right: 420, top: 120 };
  nodes.tourStage.box = { left: 20, top: 90, width: 1400 };
  const document = {
    getElementById: id => nodes[id], body: new Element(),
    createElement: () => new Element(), createTextNode: text => ({ textContent: text })
  };
  const stored = new Map(Object.entries(saved));
  const localStorage = {
    getItem(k) { if (storageUnavailable) throw Error('blocked'); return stored.get(k) ?? null; },
    setItem(k, v) { if (storageUnavailable) throw Error('blocked'); stored.set(k, v); }
  };
  let pending = [];
  const window = { innerWidth: 1440, addEventListener() {} };
  const context = vm.createContext({ window, document, localStorage, console, requestAnimationFrame: fn => { pending.push(fn); return pending.length; } });
  vm.runInContext(data, context); vm.runInContext(source, context);
  const bubble = nodes.tourStage.children[0];
  const render = (id, time) => { window.PowerTBMSubtitles.render(id, time); pending.splice(0).forEach(fn => fn()); };
  const choose = value => { nodes.subtitleToggle.value = value; nodes.subtitleToggle.dispatchEvent(new Event('change')); pending.splice(0).forEach(fn => fn()); };
  return { nodes, bubble, choose, render, window, stored };
}

const key = 'power-tbm-subtitles-mode';
const h = setup();
assert.equal(h.nodes.subtitleToggle.value, 'karaoke', 'existing effect remains default');
h.render('00-opening', 2);
assert.ok(h.nodes.subtitleLine.textContent.includes('기상'));
let words = h.nodes.subtitleLine.children.filter(c => c.style);
assert.equal(words[0].style['--read'], '100.0%');
assert.equal(words.at(-1).style['--read'], '0.0%');
h.choose('bubble');
assert.equal(h.nodes.narrationSubtitles.hidden, true);
assert.equal(h.bubble.hidden, false);
assert.equal(h.bubble.textContent, '기상 확인부터 AI 안전 검토와 서명, 기록까지,');
assert.equal(h.nodes.subtitleLine.textContent, '', 'modes never overlap');
assert.ok(parseFloat(h.bubble.style.left) >= 400, 'wide layout places bubble beside device');
h.render('02-tbm-basic', 19);
assert.match(h.bubble.textContent, /공종/);
h.choose('karaoke');
assert.equal(h.bubble.hidden, true);
assert.match(h.nodes.subtitleLine.textContent, /공종/);
assert.equal(h.nodes.narrationSubtitles.hidden, false);
h.choose('off');
assert.equal(h.nodes.narrationSubtitles.hidden, true); assert.equal(h.bubble.hidden, true);
h.render('03-ai-pdf', 4);
h.choose('bubble');
assert.match(h.bubble.textContent, /AI/);
h.window.innerWidth = 390; h.nodes.tourStage.box = { left: 8, top: 90, width: 374 };
h.render('05-emergency', 2);
assert.equal(h.bubble.classList.contains('is-stacked'), true);
assert.equal(h.bubble.style.top, '16px');
assert.ok(parseFloat(h.bubble.style.left) >= 0);
h.render('08-safety4cut-example', 35);
assert.equal(h.bubble.hidden, true, 'silent interval clears bubble');
h.render('08-safety4cut-example', 19);
assert.match(h.bubble.textContent, /무전압/);
h.window.PowerTBMSubtitles.clear(); assert.equal(h.bubble.hidden, true);
const resumed = setup(Object.fromEntries(h.stored));
assert.equal(resumed.nodes.subtitleToggle.value, 'bubble', 'choice persists');
assert.equal(setup({ 'power-tbm-subtitles-enabled': 'false' }).nodes.subtitleToggle.value, 'off', 'legacy OFF survives');
assert.equal(setup({ [key]: 'invalid' }).nodes.subtitleToggle.value, 'karaoke');
const noStorage = setup({}, true); noStorage.choose('bubble'); noStorage.render('00-opening', 2); assert.equal(noStorage.bubble.hidden, false);
// Real media events must refresh captions even while no animation frame runs.
noStorage.nodes.demoNarration.dataset.segment = '02-tbm-basic';
noStorage.nodes.demoNarration.currentTime = 19;
noStorage.nodes.demoNarration.dispatchEvent(new Event('seeked'));
assert.match(noStorage.bubble.textContent, /공종/);
noStorage.nodes.demoNarration.dataset.narrationActive = 'false';
noStorage.nodes.safetyExample.dataset.segment = '08-safety4cut-example';
noStorage.nodes.safetyExample.dataset.narrationActive = 'true';
noStorage.nodes.safetyExample.currentTime = 19;
noStorage.nodes.safetyExample.dispatchEvent(new Event('seeked'));
assert.match(noStorage.bubble.textContent, /무전압/, 'paused visible video seeks update captions');
noStorage.nodes.demoNarration.dispatchEvent(new Event('pause'));
noStorage.nodes.demoNarration.dispatchEvent(new Event('emptied'));
assert.match(noStorage.bubble.textContent, /무전압/, 'inactive audio events cannot overwrite video captions');
console.log('PASS: existing highlight, three modes, immediate switches, media seek, persistence, legacy preference, storage failure, silent intervals, placement branches');

// Every cue in every voice track must show identical, unabridged text in both modes.
const all = setup();
for (const [id, cues] of Object.entries(all.window.PowerTBMSubtitleData)) {
  for (const cue of cues) {
    const at = (cue.start + cue.end) / 2;
    all.choose('bubble'); all.render(id, at);
    const expected = cue.words.map(word => word.text).join(' ');
    assert.equal(all.bubble.textContent, expected, `complete bubble transcript: ${id}@${at}`);
    all.choose('karaoke');
    assert.equal(all.nodes.subtitleLine.textContent, expected, `same text after switching: ${id}@${at}`);
  }
}
console.log('PASS: every bubble cue exactly matches the full original subtitle text');
