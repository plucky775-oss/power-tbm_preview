(() => {
  'use strict';
  const scenes = [
    { at: 0, label: 'TBM 연결', src: '01-admin.png', title: ['안전점검에서', '사고예방 교육까지'], description: '현장 안전을 확인했다면, 이제 사고사례를 함께 배울 차례입니다. 관리자 메뉴의 ‘4컷카툰 제작’에서 Safety 4-Cut으로 이어집니다.', points: ['안전회의', '사고사례', '예방교육'], caption: 'TBM에서 4컷카툰 제작으로 이어집니다', focus: [64, 27.2, 9.4, 3.5], zoom: 1.65, origin: '68% 29%' },
    { at: 5, label: '사고자료', src: '02-upload.png', title: ['사고보고서와 사진을', '교육의 시작으로'], description: '사진·PDF 자료를 올리고 작업 현장조건을 선택합니다. 등록한 자료를 바탕으로 사고 분석을 시작합니다.', points: ['사진·PDF', '현장조건', 'AI 사고분석'], caption: '사고자료를 올리고 현장조건을 선택합니다', focus: [3.8, 43.4, 48, 16.2], zoom: 1.18, origin: '35% 50%' },
    { at: 11, label: 'AI 분석', src: '03-analysis.png', title: ['사고의 흐름과 원인을', '한눈에 정리'], description: '사고 개요와 진행 순서를 확인합니다. 확인된 사실과 원인 후보를 구분해 검토하고 필요한 내용을 수정합니다.', points: ['사실 확인', '진행 순서', '원인 검토'], caption: '분석 내용을 확인하고 수정합니다', focus: [3.8, 52.7, 92.5, 30.8], zoom: 1.08, origin: '50% 60%' },
    { at: 17, label: '이야기 구성', src: '04-story.png', title: ['전달할 핵심에 맞춰', '이야기를 구성'], description: '작업 따라가기, 위험 찾아보기 등 전개방식을 고릅니다. 기본 4컷 또는 AI가 추천한 컷수를 선택합니다.', points: ['작업 상황', '위험과 사고', '예방조치'], caption: '교육 목적에 맞는 이야기 전개를 고릅니다', focus: [3.8, 28, 92.5, 18.1], zoom: 1.08, origin: '50% 45%' },
    { at: 23, label: '대본·그림체', src: '05-scenario.png', title: ['대본을 확인하고', '표현방식을 선택'], description: '장면과 대사, 교육 포인트를 확인합니다. 카툰형·실사형을 선택하고 공구·장비 참고사진을 등록할 수 있습니다.', points: ['시나리오 확인', '그림체 선택', '참고사진'], caption: '대본과 그림체를 확인해 카툰을 만듭니다', focus: [3.8, 10.7, 92.5, 36.8], zoom: 1.08, origin: '50% 30%' },
    { at: 29, label: '카툰형', src: '06-cartoon.jpg', title: ['어려운 사고사례도', '네 컷으로 이해'], description: '작업 상황부터 사고 발생과 예방조치까지. 현장에서 함께 보며 설명할 수 있는 교육자료로 만듭니다.', points: ['작업 상황', '사고 원인', '예방조치'], caption: '실제 생성 결과 · 카툰형' },
    { at: 35, label: '실사형', src: '07-realistic.jpg', title: ['같은 사고사례를', '실사형으로도'], description: '교육 목적에 맞춰 그림체를 선택합니다. 같은 사례의 카툰형과 실사형 결과를 비교해 보세요.', points: ['같은 사고사례', '실사형 표현', '현장 교육'], caption: '실제 생성 결과 · 실사형' },
    { at: 41, label: '음성·효과음', src: '08-audio-video.jpg', title: ['대사와 현장 소리를', '영상에 함께'], description: '등장인물의 음성에 사고 효과음과 현장 배경음을 더합니다. ‘음성·영상 만들기’로 MP4를 제작합니다.', points: ['등장인물 음성', '사고 효과음', '현장 배경음'], caption: '음성과 효과음을 더해 교육영상으로 만듭니다', focus: [5.5, 23.3, 89, 16.6], zoom: 1.12, origin: '50% 30%' },
    { at: 47, label: '완성 영상', title: ['보고 듣고 기억하는', '사고예방 교육'], description: '지상변압기 작업 사례로 만든 실제 교육영상입니다. 사고의 흐름과 예방조치를 함께 보고, 다음 안전회의에서 다시 확인합니다.', points: ['사고사례 공유', '예방조치 확인', '다음 TBM 교육'], caption: '실제 생성 교육영상 재생 중', video: true }
  ];
  const root = document.querySelector('#safetyDemo');
  if (!root) return;
  const canvas = root.querySelector('.safety-screen-canvas');
  const viewport = root.querySelector('.safety-screen-viewport');
  const picture = root.querySelector('#safetyScreenshot');
  const focus = root.querySelector('.safety-focus');
  const hand = root.querySelector('.safety-hand');
  const sample = root.querySelector('#safetyExample');
  const duration = 102.4;
  const videoOffset = 47;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let current = -1;
  let frame = 0;
  let lastTime = 0;
  let startedAt = 0;
  let playPending = false;
  let videoUnavailable = false;
  let paused = true;

  function fitCanvas() {
    if (!picture.naturalWidth || !picture.naturalHeight) return;
    const box = viewport.getBoundingClientRect();
    if (!box.width || !box.height) return;
    const ratio = picture.naturalWidth / picture.naturalHeight;
    const width = Math.min(box.width, box.height * ratio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${width / ratio}px`;
  }
  picture.addEventListener('load', fitCanvas);
  window.addEventListener('resize', fitCanvas, { passive: true });
  if ('ResizeObserver' in window) new ResizeObserver(fitCanvas).observe(viewport);

  function render(seconds, options = {}) {
    paused = Boolean(options.paused);
    lastTime = Math.max(0, Math.min(duration, seconds));
    let index = scenes.length - 1;
    while (index > 0 && lastTime < scenes[index].at) index -= 1;
    const scene = scenes[index];
    if (index !== current) {
      current = index;
      root.dataset.scene = String(index);
      root.classList.toggle('safety-showing-video', Boolean(scene.video));
      document.querySelector('#safetyTitle').innerHTML = `${scene.title[0]}<br><em>${scene.title[1]}</em>`;
      document.querySelector('#safetyDescription').textContent = scene.description;
      document.querySelector('#safetyPoints').innerHTML = scene.points.map(point => `<b>${point}</b>`).join('');
      document.querySelector('#safetySceneLabel').textContent = `${index + 1} / 9 · ${scene.label}`;
      root.querySelector('#safetyCaption').textContent = scene.caption;
      if (scene.src) {
        picture.src = `assets/safety4cut/${scene.src}`;
        picture.alt = `Safety 4-Cut ${scene.label} 실제 화면`;
        fitCanvas();
      }
      focus.hidden = hand.hidden = !scene.focus;
      if (scene.focus) {
        const [left, top, width, height] = scene.focus;
        Object.assign(focus.style, { left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%` });
        Object.assign(hand.style, { left: `${left + width * .6}%`, top: `${top + height * .65}%` });
      }
      canvas.style.transformOrigin = scene.origin || '50% 50%';
    }
    const progress = reduceMotion ? 0 : Math.min(1, (lastTime - scene.at) / 2);
    canvas.style.transform = `scale(${1 + ((scene.zoom || 1) - 1) * (1 - Math.pow(1 - progress, 3))})`;
    root.querySelector('.safety-progress i').style.transform = `scaleX(${lastTime / duration})`;
    if (!scene.video || paused || document.hidden) {
      sample.pause();
      return;
    }
    // The shared narration track contains the supplied video's original audio.
    sample.muted = true;
    const target = Math.min(lastTime - videoOffset, Number.isFinite(sample.duration) ? Math.max(0, sample.duration - .025) : duration - videoOffset);
    if (sample.readyState >= 1 && Math.abs(sample.currentTime - target) > .4) {
      try { sample.currentTime = target; } catch (_) { /* wait for metadata */ }
    }
    if (sample.paused && !sample.ended && !playPending && !videoUnavailable) {
      playPending = true;
      sample.play().catch(() => { videoUnavailable = true; }).finally(() => { playPending = false; });
    }
  }

  function pause() {
    paused = true;
    cancelAnimationFrame(frame);
    frame = 0;
    sample.pause();
  }
  function startFallback({ reset = true } = {}) {
    pause();
    if (reset) lastTime = 0;
    startedAt = performance.now() - lastTime * 1000;
    const tick = () => {
      if (document.hidden) return;
      render((performance.now() - startedAt) / 1000);
      if (lastTime < duration) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
  }
  function reset() {
    pause();
    current = -1;
    videoUnavailable = false;
    try { sample.currentTime = 0; } catch (_) { /* metadata may be loading */ }
    render(0, { paused: true });
  }
  sample.addEventListener('loadedmetadata', () => render(lastTime, { paused }));
  sample.addEventListener('error', () => {
    videoUnavailable = true;
    root.querySelector('#safetyCaption').textContent = '교육영상을 불러오지 못했습니다';
  });
  window.PowerTBMSafety = { scenes, duration, render, pause, startFallback, reset, get time() { return lastTime; } };
  reset();
})();
