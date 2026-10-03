(() => {
  'use strict';
  const panel = document.getElementById('narrationSubtitles');
  const line = document.getElementById('subtitleLine');
  const toggle = document.getElementById('subtitleToggle');
  const audio = document.getElementById('demoNarration');
  if (!panel || !line || !toggle) return;
  const key = 'power-tbm-subtitles-enabled';
  let enabled = true;
  try { enabled = localStorage.getItem(key) !== 'false'; } catch (_) { /* Private mode still works. */ }
  let currentCue = null;
  let words = [];
  let lastId = '';
  let lastTime = 0;

  function clear() {
    currentCue = null;
    words = [];
    line.replaceChildren();
    line.removeAttribute('aria-label');
  }

  function render(id, seconds) {
    lastId = id || '';
    lastTime = Math.max(0, Number(seconds) || 0);
    if (!enabled) return;
    const cues = window.PowerTBMSubtitleData?.[lastId] || [];
    const cue = cues.find(item => lastTime >= item.start && lastTime < item.end);
    if (!cue) { if (currentCue) clear(); return; }
    if (currentCue !== cue) {
      clear();
      currentCue = cue;
      line.setAttribute('aria-label', cue.words.map(word => word.text).join(' '));
      words = cue.words.map((word, index) => {
        if (index) line.append(document.createTextNode(' '));
        const span = document.createElement('span');
        span.className = 'subtitle-word';
        span.textContent = word.text;
        span.setAttribute('aria-hidden', 'true');
        line.append(span);
        return span;
      });
    }
    cue.words.forEach((word, index) => {
      const progress = Math.max(0, Math.min(1, (lastTime - word.start) / Math.max(.02, word.end - word.start)));
      words[index].style.setProperty('--read', `${(progress * 100).toFixed(1)}%`);
    });
  }

  function syncPreference() {
    panel.hidden = !enabled;
    document.body.classList.toggle('subtitles-enabled', enabled);
    toggle.textContent = enabled ? '자막 ON' : '자막 OFF';
    toggle.setAttribute('aria-pressed', String(enabled));
    toggle.setAttribute('aria-label', enabled ? '자막 끄기' : '자막 켜기');
    render(lastId, lastTime);
  }
  toggle.addEventListener('click', () => {
    enabled = !enabled;
    try { localStorage.setItem(key, String(enabled)); } catch (_) { /* No storage required. */ }
    syncPreference();
  });
  // currentTime is authoritative: seeks, pauses, rate changes and muted playback
  // must never advance the karaoke highlight using a separate timer.
  ['timeupdate', 'seeked', 'loadeddata', 'pause'].forEach(event => {
    audio?.addEventListener(event, () => render(audio.dataset.segment, audio.currentTime));
  });
  audio?.addEventListener('emptied', () => { lastId = ''; clear(); });
  window.PowerTBMSubtitles = {
    render,
    clear: () => { lastId = ''; lastTime = 0; clear(); }
  };
  syncPreference();
})();
