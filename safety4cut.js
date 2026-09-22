(() => {
  'use strict';
  const scenes = [
    { at: 0, label: '관리자 메뉴', src: '01-admin-v75.png', fullScreen: true, title: ['관리자 화면에서', '4컷 카툰 제작'], description: '마지막으로, 사고예방 교육을 위한 안전 4컷입니다. 관리자 메뉴에서 ‘4컷카툰 제작’을 눌러 시작합니다.', points: ['관리자 메뉴', '4컷카툰 제작', '안전교육'], caption: '‘4컷카툰 제작’을 눌러 시작합니다', focus: [6.8, 25.8, 24.3, 5.2], gesture: { from: [75, 68], to: [19, 28.4], start: 4.1, arrive: 6.1, tap: 6.5, end: 7.8 } },
    { at: 8.202, label: '사고사례 등록', src: '02-upload-v75.png', fullScreen: true, title: ['사고사례를 등록하면', '카툰부터 교육영상까지'], description: '사고사례 사진·보고서를 등록하면 4컷 카툰은 물론, 음성과 효과음이 들어간 몰입도 높은 안전교육 영상까지 간편하게 만들 수 있습니다.', points: ['사고사례 등록', '4컷 카툰', '음성·효과음 영상'], caption: '사고사례를 등록해 카툰과 교육영상을 만듭니다', focus: [7.1, 24.3, 85.8, 13.7], gesture: { from: [82, 71], to: [50, 32.8], start: .25, arrive: 1.4, tap: 1.7, end: 3 } },
    { at: 17.971, label: '카툰형', src: '06-cartoon.jpg', title: ['실제 사고사례를', '네 컷으로 이해'], description: '지금 보시는 화면은 실제 사고사례로 만든 카툰형 교육자료입니다. 작업 상황과 사고 발생, 예방조치를 함께 보여줍니다.', points: ['작업 상황', '사고 원인', '예방조치'], caption: '실제 생성 결과 · 카툰형' },
    { at: 23.377, label: '실사형', src: '07-realistic.jpg', title: ['같은 사고사례를', '실사형으로도'], description: '같은 사례를 실사형 교육자료로도 만들 수 있습니다. 이어서 음성과 효과음이 담긴 실제 제작 영상을 함께 보시겠습니다.', points: ['실사형 표현', '음성·효과음', '실제 영상 보기'], caption: '실제 생성 결과 · 실사형' },
    { at: 30.325, label: '완성 영상', title: ['보고 듣고 기억하는', '사고예방 교육'], description: '지상변압기 작업 사례로 만든 실제 교육영상입니다. 사고의 흐름과 예방조치를 함께 보고, 다음 안전회의에서 다시 확인합니다.', points: ['사고사례 공유', '예방조치 확인', '다음 TBM 교육'], caption: '실제 생성 교육영상 재생 중', video: true }
  ];
  const root = document.querySelector('#safetyDemo');
  if (!root) return;
  const canvas = root.querySelector('.safety-screen-canvas');
  const viewport = root.querySelector('.safety-screen-viewport');
  const picture = root.querySelector('#safetyScreenshot');
  const focus = root.querySelector('.safety-focus');
  const hand = root.querySelector('.safety-hand');
  const sample = root.querySelector('#safetyExample');
  const duration = 85.725;
  const videoOffset = 30.325;
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
    const width = scenes[current]?.fullScreen
      ? Math.max(box.width, box.height * ratio)
      : Math.min(box.width, box.height * ratio);
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
      root.classList.toggle('safety-fullscreen-photo', Boolean(scene.fullScreen));
      document.querySelector('#safetyTitle').innerHTML = `${scene.title[0]}<br><em>${scene.title[1]}</em>`;
      document.querySelector('#safetyDescription').textContent = scene.description;
      document.querySelector('#safetyPoints').innerHTML = scene.points.map(point => `<b>${point}</b>`).join('');
      document.querySelector('#safetySceneLabel').textContent = `${index + 1} / ${scenes.length} · ${scene.label}`;
      root.querySelector('#safetyCaption').textContent = scene.caption;
      if (scene.src) {
        picture.src = `assets/safety4cut/${scene.src}`;
        picture.alt = `Safety 4-Cut ${scene.label} 실제 화면`;
        fitCanvas();
      }
      focus.hidden = !scene.focus;
      hand.hidden = !scene.gesture;
      if (scene.focus) {
        const [left, top, width, height] = scene.focus;
        Object.assign(focus.style, { left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%` });
      }
    }
    // Keep the fitted screenshot fixed; only the finger moves and presses.
    renderGesture(scene, lastTime - scene.at);
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

  // Drive the finger and press from the same audio clock as the scene.
  function renderGesture(scene, elapsed) {
    const gesture = scene.gesture;
    focus.classList.remove('is-tapping');
    if (!gesture) {
      root.dataset.gesture = 'none';
      return;
    }
    const travel = reduceMotion ? 1 : Math.min(1, Math.max(0, (elapsed - gesture.start) / (gesture.arrive - gesture.start)));
    const eased = 1 - Math.pow(1 - travel, 3);
    const x = gesture.from[0] + (gesture.to[0] - gesture.from[0]) * eased;
    const y = gesture.from[1] + (gesture.to[1] - gesture.from[1]) * eased;
    const tapProgress = (elapsed - gesture.tap) / .4;
    const tapping = !reduceMotion && tapProgress >= 0 && tapProgress <= 1;
    const press = tapping ? Math.sin(tapProgress * Math.PI) : 0;
    const fade = Math.min(1, Math.max(0, (elapsed - gesture.start) / .25), Math.max(0, (gesture.end - elapsed) / .35));
    Object.assign(hand.style, {
      left: `${x}%`, top: `${y}%`, opacity: String(reduceMotion ? 1 : fade),
      transform: `translate(-50%, -10%) rotate(${-10 + 4 * press}deg) scale(${1 - .23 * press})`
    });
    hand.style.setProperty('--tap-opacity', String(tapping ? 1 - tapProgress : 0));
    hand.style.setProperty('--tap-scale', String(1 + Math.max(0, tapProgress) * .8));
    focus.classList.toggle('is-tapping', tapping);
    root.dataset.gesture = reduceMotion ? 'still' : elapsed < gesture.start ? 'waiting' : travel < 1 ? 'moving' : tapping ? 'tapping' : elapsed < gesture.end ? 'pointing' : 'complete';
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
  window.PowerTBMSafety = { scenes, duration, videoOffset, render, pause, startFallback, reset, get time() { return lastTime; } };
  reset();
})();
