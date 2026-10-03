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
  bubble.setAttribute('aria-label', '말풍선 안내');
  bubble.hidden = true;
  stage?.append(bubble);
  // Short scene guidance shares the media clock but does not animate its text.
  const bubbleCues = {
    '00-opening': [[0, 7.96, '기상 확인부터 안전회의 기록까지']],
    '01-weather': [[0, 5.7, '기상특보와 조치사항을 확인합니다'], [5.72, 10.46, '체감온도와 시간별 날씨를 확인합니다'], [10.58, 16.62, '미세먼지와 중기예보도 함께 확인합니다'], [16.66, 26.88, '태풍정보와 레이더를 비교합니다'], [27.02, 29.42, '이제 TBM 회의록을 작성합니다']],
    '02-tbm-basic': [[0, 7.24, 'TBM 회의록 작성을 시작합니다'], [7.36, 12.9, '공사명·장소·책임자를 입력합니다'], [13.08, 18.32, '일용원 이름과 임무를 등록합니다'], [18.56, 23.14, '실제 작업할 공종을 선택합니다'], [23.44, 28.24, '건강상태와 보호구를 확인합니다'], [28.24, 34.22, '공종에 맞는 위험요인과 대책을 확인합니다']],
    '03-ai-pdf': [[0, 9.52, 'AI가 추가 위험과 안전대책을 제안합니다'], [9.58, 16.06, '현장 책임자가 중점 위험을 확정합니다'], [16.12, 23.04, '직접·QR·원격 서명을 지원합니다'], [23.12, 31.84, '서명란에 직접 서명하고 저장합니다'], [31.84, 40.36, '완성된 회의록은 PDF로 보관합니다']],
    '04-safety-tools': [[0, 12.82, '공종별 안전수칙을 바로 확인합니다'], [12.82, 16.82, '골든룰스11 영상으로 안전수칙을 공유합니다'], [16.88, 22.68, '사고사례와 안전자료를 확인합니다'], [22.68, 31.8, '음성메모·거리뷰 등 현장도구를 사용합니다']],
    '05-emergency': [[0, 6.46, '가까운 병원과 거리를 확인합니다'], [6.46, 13.42, '길찾기와 병원 전화로 바로 연결합니다'], [13.48, 17.6, '위급할 때는 119로 연결합니다'], [17.84, 21.84, '동의한 경우에만 위치정보를 사용합니다']],
    '06-closing': [[0, 8.98, '더 안전한 현장을 함께 만듭니다'], [9.34, 10.14, '감사합니다']],
    '07-safety4cut-intro': [[0, 7.66, '관리자 메뉴에서 안전 4컷을 실행합니다'], [8.32, 17.36, '사고자료를 카툰과 교육영상으로 만듭니다'], [17.72, 22.74, '실제 사례로 만든 카툰형 교육자료입니다'], [23.5, 26.1, '실사형으로도 제작할 수 있습니다'], [26.1, 34.02, 'AI가 사례에 맞는 컷수를 추천합니다'], [34.02, 37.46, '완성된 교육영상을 함께 보겠습니다']],
    '08-safety4cut-example': [[0, 6.24, '실제 산업재해 사례를 살펴봅니다'], [6.24, 13.88, '사선으로 오인한 맨손 작업 중 감전'], [13.88, 18.06, '엘보 분리·절연캡 취부 작업'], [18.12, 21.9, '작업 전 무전압을 확인했나요?'], [21.98, 33.44, '검전 없이 충전부에 접근하면 위험합니다'], [37.7, 42.96, '계통정보 불일치와 검전 생략이 원인'], [42.96, 47.24, '절연장갑 착용·검전 후 작업합니다'], [47.24, 55.56, '사선으로 오인하고 검전을 생략했습니다'], [55.8, 63.12, '절연장갑 착용과 무전압 확인이 먼저입니다']]
  };
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
    if (mode === 'bubble') {
      const cue = bubbleCues[lastId]?.find(([start, end]) => lastTime >= start && lastTime < end);
      if (!cue) { bubble.hidden = true; bubble.textContent = ''; return; }
      if (bubble.textContent !== cue[2] || bubble.hidden) {
        bubble.textContent = cue[2];
        bubble.hidden = false;
        requestLayout();
      }
      return;
    }
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
