(() => {
  'use strict';
  const panel = document.getElementById('narrationSubtitles');
  const line = document.getElementById('subtitleLine');
  const toggle = document.getElementById('subtitleToggle');
  const audio = document.getElementById('demoNarration');
  if (!panel || !line || !toggle) return;
  const key = 'power-tbm-subtitles-enabled';
  const modeKey = 'power-tbm-subtitles-mode';
  const modes = ['karaoke', 'bubble', 'off'];
  let mode = 'karaoke';
  try {
    const saved = localStorage.getItem(modeKey);
    mode = modes.includes(saved) ? saved : localStorage.getItem(key) === 'false' ? 'off' : 'karaoke';
  } catch (_) { /* Private mode still works. */ }
  const stage = document.getElementById('tourStage');
  const device = stage?.querySelector('.tour-device');
  const bubble = document.createElement('aside');
  bubble.id = 'subtitleBubble';
  bubble.className = 'subtitle-bubble';
  bubble.setAttribute('aria-label', '말풍선 자막');
  bubble.hidden = true;
  stage?.append(bubble);
  // Both displays use the same complete transcript and media timestamps.
  let layoutFrame = 0;
  function placeBubble() {
    layoutFrame = 0;
    if (bubble.hidden || !stage || !device) return;
    const bounds = stage.getBoundingClientRect();
    const phone = device.getBoundingClientRect();
    const stacked = window.innerWidth <= 900;
    bubble.classList.toggle('is-stacked', stacked);
    const width = Math.min(stacked ? 300 : 330, Math.max(0, bounds.width - 32));
    bubble.style.width = `${width}px`;
    const left = stacked ? (bounds.width - width) / 2 : Math.max(16, Math.min(phone.right - bounds.left + 18, bounds.width - width - 16));
    bubble.style.left = `${left}px`;
    bubble.style.top = `${stacked ? 16 : Math.max(20, Math.min(phone.top - bounds.top + 28, 100))}px`;
  }
  function requestLayout() {
    if (!layoutFrame) layoutFrame = requestAnimationFrame(placeBubble);
  }
  window.addEventListener('resize', requestLayout, { passive: true });
  if (stage && 'ResizeObserver' in window) new ResizeObserver(requestLayout).observe(stage);
  let currentCue = null;
  let words = [];
  let lastId = '';
  let lastTime = 0;

  function clear() {
    currentCue = null;
    words = [];
    line.replaceChildren();
    line.removeAttribute('aria-label');
    bubble.hidden = true;
    bubble.textContent = '';
  }

  function render(id, seconds) {
    lastId = id || '';
    lastTime = Math.max(0, Number(seconds) || 0);
    if (mode === 'off') return;
    const cues = window.PowerTBMSubtitleData?.[lastId] || [];
    const cue = cues.find(item => lastTime >= item.start && lastTime < item.end);
    if (mode === 'bubble') {
      if (!cue) { bubble.hidden = true; bubble.textContent = ''; return; }
      const text = cue.words.map(word => word.text).join(' ');
      if (bubble.textContent !== text || bubble.hidden) {
        bubble.textContent = text;
        bubble.hidden = false;
        requestLayout();
      }
      return;
    }
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
    clear();
    panel.hidden = mode !== 'karaoke';
    document.body.classList.toggle('subtitles-enabled', mode === 'karaoke');
    document.body.classList.toggle('subtitles-bubble', mode === 'bubble');
    toggle.value = mode;
    render(lastId, lastTime);
  }
  toggle.addEventListener('change', () => {
    if (!modes.includes(toggle.value)) return;
    mode = toggle.value;
    try {
      localStorage.setItem(modeKey, mode);
      localStorage.setItem(key, String(mode !== 'off'));
    } catch (_) { /* No storage required. */ }
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
