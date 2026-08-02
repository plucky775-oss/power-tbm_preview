(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const revealItems = $$('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion) {
    const observer = new IntersectionObserver((entries, revealObserver) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const delay = Number(entry.target.dataset.delay || 0);
        window.setTimeout(() => entry.target.classList.add('is-visible'), delay);
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -4% 0px' });
    revealItems.forEach((item) => observer.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add('is-visible'));
  }

  const guidePhone = $('.guide-phone');
  const guideStage = $('.tour-stage');
  const allDemoPage = $('#allDemoPage');
  const weatherDemoPage = $('#weatherDemoPage');
  const meetingDemoPage = $('#meetingDemoPage');
  const supportDemoPage = $('#supportDemoPage');
  const openingDemoVideo = $('#openingDemoVideo');
  const demoNarration = $('#demoNarration');
  const demoBgm = $('#demoBgm');
  const weatherDemo = $('#weatherDemo');
  const meetingDemo = $('#meetingDemo');
  const supportDemo = $('#supportDemo');
  const closingDemo = $('#closingDemo');
  const stageAssetRoots = { meeting: meetingDemo, support: supportDemo, closing: closingDemo };
  const nextStageByPage = { intro: 'weather', weather: 'meeting', meeting: 'support', support: 'closing', closing: 'intro' };
  const demoDurationFallbacks = { intro: 8350, weather: 40000, meeting: 96000, support: 50000, closing: 11494 };
  // A complete stage change fades to the Power TBM navy, swaps while fully
  // covered, then gently reveals the next scene. Keeping the swap and reveal
  // as separate moments prevents the opening video from cutting straight to
  // the home screen.
  const stageTransitionTiming = { fadeOut: 700, coveredHold: 120 };
  // Each stage advances while its final scene is still fully visible.
  // The weather timeline begins fading its last comparison earlier than the
  // other stages, so it intentionally has a different end ratio.
  const demoEndRatios = { intro: 1, weather: .91, meeting: .989, support: .98, closing: 1 };
  // The source track is intentionally kept well below the normalized voices.
  // It rises slightly for the opening and field-photo ending, then ducks under
  // every information-heavy narration section.
  const bgmVolumeByPage = { intro: .12, weather: .065, meeting: .065, support: .065, closing: .13 };
  const bgmClosingFadeSeconds = 2.35;
  const stageActiveClasses = ['opening-demo-active', 'demo-active', 'meeting-demo-active', 'support-demo-active', 'closing-demo-active'];
  const stageClassByPage = {
    intro: 'opening-demo-active',
    weather: 'demo-active',
    meeting: 'meeting-demo-active',
    support: 'support-demo-active',
    closing: 'closing-demo-active'
  };
  const narrationByPage = {
    intro: [
      {
        id: '00-opening',
        src: 'assets/audio/00-opening-taehyung.mp3',
        duration: 8.150204,
        cues: [[0, 0], [8, 8000], [8.150204, 8000]]
      }
    ],
    weather: [
      {
        id: '01-weather',
        src: 'assets/audio/01-weather-jisoo.mp3',
        duration: 29.701224,
        cues: [[0, 0], [5.42, 4000], [10.28, 9200], [16.44, 19600], [27.16, 36400], [29.701224, 36400]]
      }
    ],
    meeting: [
      {
        id: '02-tbm-basic',
        src: 'assets/audio/02-tbm-basic-taehyung.mp3',
        duration: 34.29875,
        cues: [[0, 0], [2.57, 5664], [6.99, 11424], [12.67, 20160], [18.27, 28800], [23.77, 37056], [28.98, 46176], [34.29875, 55296]]
      },
      {
        id: '03-ai-pdf',
        src: 'assets/audio/03-ai-pdf-jisoo.mp3',
        duration: 40.646531,
        cues: [[0, 55296], [12.81, 62880], [22.86, 70080], [27.78, 77280], [31.58, 84000], [36.19, 87840], [38.4, 92736], [40.646531, 94944]]
      }
    ],
    support: [
      {
        id: '04-safety-tools',
        src: 'assets/audio/04-safety-tools-taehyung.mp3',
        duration: 30.772188,
        cues: [[0, 0], [3.26, 5700], [12.35, 19600], [16.65, 25600], [22.25, 32600], [24.59, 36100], [30.772188, 42450]]
      },
      {
        id: '05-emergency',
        src: 'assets/audio/05-emergency-jisoo.mp3',
        duration: 21.995102,
        cues: [[0, 42450], [6.19, 43800], [13.1, 45500], [17.41, 47000], [21.995102, 49000]]
      }
    ],
    closing: [
      {
        id: '06-closing',
        src: 'assets/audio/06-closing-jisoo.mp3',
        duration: 11.493878,
        cues: [[0, 0], [3.246, 3246], [7.021, 7021], [9.555, 9555], [10.373, 10373], [11.493878, 11494]]
      }
    ]
  };
  const narrationSegments = Object.values(narrationByPage).flat();
  const narrationSegmentById = new Map(narrationSegments.map((segment) => [segment.id, segment]));
  let demoPage = 'intro';
  let demoMode = 'sequence';
  let sequenceTimer = null;
  let sequenceStartedAt = 0;
  let sequenceRemaining = demoDurationFallbacks.intro;
  let stageTransitioning = false;
  let stageTransitionTimers = [];
  let narrationRequested = false;
  let narrationMuted = false;
  let narrationUnlocked = false;
  let narrationState = 'ready';
  let narrationSegmentIndex = 0;
  let narrationRunToken = 0;
  let narrationFrame = null;
  let bgmFrame = null;
  let bgmFadeToken = 0;
  let syncedAnimations = [];

  const hydrateStageAssets = (page) => {
    stageAssetRoots[page]?.querySelectorAll('img[data-src]').forEach((asset) => {
      asset.src = asset.dataset.src;
      asset.removeAttribute('data-src');
    });
  };

  const warmNextStageAssets = (page) => {
    const nextPage = nextStageByPage[page];
    if (!stageAssetRoots[nextPage]) return;
    const hydrate = () => hydrateStageAssets(nextPage);
    if ('requestIdleCallback' in window) window.requestIdleCallback(hydrate, { timeout: 1500 });
    else window.setTimeout(hydrate, 0);
  };

  const parseCssTime = (value) => {
    const time = String(value || '').trim();
    if (!time) return 0;
    if (time.endsWith('ms')) return Number.parseFloat(time) || 0;
    if (time.endsWith('s')) return (Number.parseFloat(time) || 0) * 1000;
    return Number.parseFloat(time) || 0;
  };

  const updateDemoStateData = () => {
    if (!guideStage) return;
    guideStage.dataset.demoPage = demoPage;
    guideStage.dataset.demoMode = demoMode;
    guideStage.dataset.narrationState = narrationState;
    guideStage.dataset.narrationMuted = String(narrationMuted);
    guideStage.dataset.bgmState = demoBgm ? (demoBgm.paused ? 'paused' : 'playing') : 'unavailable';
    const segment = narrationByPage[demoPage]?.[narrationSegmentIndex];
    guideStage.dataset.narrationSegment = narrationRequested && segment ? segment.id.slice(0, 2) : '';
  };

  const updateNarrationHint = () => {
    const needsStart = !narrationRequested || narrationState === 'blocked' || narrationState === 'error';
    allDemoPage?.classList.toggle('narration-start-hint', needsStart);
  };

  const setNarrationState = (state) => {
    narrationState = state;
    updateDemoStateData();
    updateNarrationHint();
  };

  const cancelNarrationFrame = () => {
    if (narrationFrame) window.cancelAnimationFrame(narrationFrame);
    narrationFrame = null;
  };

  const cancelBgmFrame = () => {
    bgmFadeToken += 1;
    if (bgmFrame) window.cancelAnimationFrame(bgmFrame);
    bgmFrame = null;
  };

  const rampDemoBgmVolume = (target, duration = 800, onComplete = null) => {
    if (!demoBgm) return;
    cancelBgmFrame();
    const token = bgmFadeToken;
    const from = Number.isFinite(demoBgm.volume) ? demoBgm.volume : 0;
    const to = Math.min(1, Math.max(0, Number(target) || 0));
    const startedAt = performance.now();
    const tick = (now) => {
      if (token !== bgmFadeToken || !demoBgm) return;
      const ratio = duration <= 0 ? 1 : Math.min(1, Math.max(0, (now - startedAt) / duration));
      const eased = 1 - Math.pow(1 - ratio, 3);
      demoBgm.volume = from + ((to - from) * eased);
      if (ratio < 1) {
        bgmFrame = window.requestAnimationFrame(tick);
        return;
      }
      bgmFrame = null;
      onComplete?.();
      updateDemoStateData();
    };
    bgmFrame = window.requestAnimationFrame(tick);
  };

  const getCurrentBgmTarget = (page = demoPage) => {
    const base = bgmVolumeByPage[page] || bgmVolumeByPage.weather;
    if (page !== 'closing' || !demoNarration) return base;
    const segment = narrationByPage.closing?.[0];
    const fadeStart = Math.max(0, (segment?.duration || 0) - bgmClosingFadeSeconds);
    if (demoNarration.currentTime <= fadeStart) return base;
    const ratio = Math.min(1, (demoNarration.currentTime - fadeStart) / bgmClosingFadeSeconds);
    return base * (1 - ratio);
  };

  const startDemoBgmForPage = (page, { restart = false } = {}) => {
    if (!demoBgm || !narrationRequested) return;
    cancelBgmFrame();
    if (restart || demoBgm.ended) {
      try { demoBgm.currentTime = 0; } catch { /* metadata may still be loading */ }
      demoBgm.volume = 0;
    }
    demoBgm.muted = narrationMuted;
    if (document.hidden) {
      demoBgm.pause();
      updateDemoStateData();
      return;
    }
    const playAttempt = demoBgm.play();
    rampDemoBgmVolume(bgmVolumeByPage[page] || bgmVolumeByPage.weather, page === 'intro' ? 1100 : 750);
    playAttempt?.catch?.((error) => {
      // Background music is optional. Narration keeps the authoritative
      // autoplay/error handling so a blocked BGM never breaks the demo.
      console.warn('배경음 재생을 시작하지 못했습니다.', error);
      demoBgm.pause();
      updateDemoStateData();
    });
    updateDemoStateData();
  };

  const pauseDemoBgm = () => {
    cancelBgmFrame();
    demoBgm?.pause();
    updateDemoStateData();
  };

  const resumeDemoBgm = () => {
    if (!demoBgm || !narrationRequested || document.hidden) return;
    demoBgm.muted = narrationMuted;
    const playAttempt = demoBgm.play();
    rampDemoBgmVolume(getCurrentBgmTarget(), 500);
    playAttempt?.catch?.((error) => {
      console.warn('배경음 재생을 다시 시작하지 못했습니다.', error);
      demoBgm.pause();
      updateDemoStateData();
    });
    updateDemoStateData();
  };

  const fadeOutDemoBgm = ({ duration = 900, reset = false } = {}) => {
    if (!demoBgm) return;
    rampDemoBgmVolume(0, duration, () => {
      demoBgm.pause();
      if (reset) {
        try { demoBgm.currentTime = 0; } catch { /* metadata may still be loading */ }
      }
    });
  };

  const stopDemoBgm = ({ reset = true } = {}) => {
    cancelBgmFrame();
    if (!demoBgm) return;
    demoBgm.pause();
    demoBgm.volume = 0;
    if (reset) {
      try { demoBgm.currentTime = 0; } catch { /* metadata may still be loading */ }
    }
    updateDemoStateData();
  };

  const syncClosingBgmFade = (segment, seconds) => {
    if (!demoBgm || demoPage !== 'closing' || segment?.id !== '06-closing') return;
    const fadeStart = Math.max(0, segment.duration - bgmClosingFadeSeconds);
    if (seconds < fadeStart) return;
    cancelBgmFrame();
    const ratio = Math.min(1, Math.max(0, (seconds - fadeStart) / bgmClosingFadeSeconds));
    demoBgm.volume = bgmVolumeByPage.closing * (1 - ratio);
  };

  const releaseSyncedAnimations = ({ resume = false } = {}) => {
    syncedAnimations.forEach((animation) => {
      if (!resume) return;
      try { animation.play(); } catch { /* animation may already be detached */ }
    });
    syncedAnimations = [];
  };

  const getAnimationsForRoot = (root) => {
    if (!root?.getAnimations) return [];
    try {
      return root.getAnimations({ subtree: true });
    } catch {
      return [root, ...root.querySelectorAll('*')].flatMap((element) => element.getAnimations?.() || []);
    }
  };

  const collectNarrationAnimations = (page) => {
    const rootsByPage = {
      weather: [weatherDemo, $('.demo-explanations'), $('.typhoon-compare')],
      meeting: [meetingDemo, $('.meeting-explanations')],
      support: [supportDemo, $('.support-explanations')],
      closing: [closingDemo, $('.closing-explanation')]
    };
    const seen = new Set();
    syncedAnimations = (rootsByPage[page] || [])
      .filter(Boolean)
      .flatMap(getAnimationsForRoot)
      .filter((animation) => {
        if (!animation || seen.has(animation) || typeof animation.animationName !== 'string') return false;
        seen.add(animation);
        return true;
      });
    syncedAnimations.forEach((animation) => {
      try { animation.pause(); } catch { /* keep the fallback timeline available */ }
    });
  };

  const mapNarrationTimeToVisual = (segment, seconds) => {
    const cues = segment?.cues || [[0, 0]];
    const time = Math.max(0, Number(seconds) || 0);
    if (time <= cues[0][0]) return cues[0][1];
    for (let index = 1; index < cues.length; index += 1) {
      const previous = cues[index - 1];
      const next = cues[index];
      if (time > next[0]) continue;
      const span = Math.max(.001, next[0] - previous[0]);
      const ratio = Math.min(1, Math.max(0, (time - previous[0]) / span));
      return previous[1] + ((next[1] - previous[1]) * ratio);
    }
    return cues[cues.length - 1][1];
  };

  const applyNarrationVisualTime = (segment, seconds) => {
    if (!segment) return;
    const visualTime = mapNarrationTimeToVisual(segment, seconds);
    if (demoPage === 'intro') {
      const videoDuration = Number(openingDemoVideo?.duration) || 8;
      const target = Math.min(Math.max(0, Number(seconds) || 0), videoDuration);
      if (openingDemoVideo && target < videoDuration && Math.abs(openingDemoVideo.currentTime - target) > .24) {
        try { openingDemoVideo.currentTime = target; } catch { /* metadata may still be loading */ }
      }
      return;
    }
    if (!syncedAnimations.length) collectNarrationAnimations(demoPage);
    syncedAnimations.forEach((animation) => {
      try {
        if (animation.playState !== 'paused') animation.pause();
        animation.currentTime = visualTime;
      } catch { /* a scene can detach during a soft transition */ }
    });
  };

  const runNarrationVisualClock = (token) => {
    cancelNarrationFrame();
    const tick = () => {
      if (token !== narrationRunToken || !narrationRequested || !demoNarration) return;
      const segment = narrationByPage[demoPage]?.[narrationSegmentIndex];
      applyNarrationVisualTime(segment, demoNarration.currentTime);
      syncClosingBgmFade(segment, demoNarration.currentTime);
      if (!document.hidden && !demoNarration.ended) narrationFrame = window.requestAnimationFrame(tick);
    };
    narrationFrame = window.requestAnimationFrame(tick);
  };

  const stopNarrationPlayback = ({ reset = true, keepRequested = true } = {}) => {
    narrationRunToken += 1;
    cancelNarrationFrame();
    releaseSyncedAnimations();
    demoNarration?.pause();
    if (reset && demoNarration) {
      try { demoNarration.currentTime = 0; } catch { /* source may be changing */ }
    }
    narrationSegmentIndex = 0;
    if (!keepRequested) narrationRequested = false;
    updateDemoStateData();
  };

  const handleNarrationFailure = (error, token) => {
    if (token !== narrationRunToken) return;
    console.warn('내레이션 재생을 시작하지 못해 무음 자동시연으로 전환합니다.', error);
    cancelNarrationFrame();
    releaseSyncedAnimations({ resume: true });
    demoNarration?.pause();
    stopDemoBgm({ reset: false });
    narrationRequested = false;
    narrationUnlocked = false;
    setNarrationState(error?.name === 'NotAllowedError' ? 'blocked' : 'error');
    scheduleSequenceAdvance();
  };

  const loadNarrationSegment = (segment, token) => {
    if (!demoNarration || !segment || token !== narrationRunToken) return;
    const currentSource = demoNarration.getAttribute('src') || '';
    if (currentSource !== segment.src) {
      demoNarration.src = segment.src;
      demoNarration.load();
    } else {
      try { demoNarration.currentTime = 0; } catch { /* metadata may still be loading */ }
    }
    demoNarration.muted = narrationMuted;
    demoNarration.dataset.segment = segment.id;
    demoNarration.dataset.runToken = String(token);
    updateDemoStateData();
  };

  const syncLoadedNarrationDuration = () => {
    const segment = narrationSegmentById.get(demoNarration?.dataset.segment);
    const duration = Number(demoNarration?.duration);
    if (!segment || !Number.isFinite(duration) || duration <= 0) return;
    segment.duration = duration;
    const finalCue = segment.cues?.[segment.cues.length - 1];
    if (finalCue) finalCue[0] = duration;
  };

  const playNarrationSegment = ({ token, restartVideo = false } = {}) => {
    if (!demoNarration || token !== narrationRunToken || !narrationRequested) return;
    const segment = narrationByPage[demoPage]?.[narrationSegmentIndex];
    if (!segment) return;
    loadNarrationSegment(segment, token);
    releaseSyncedAnimations();
    collectNarrationAnimations(demoPage);
    applyNarrationVisualTime(segment, 0);
    if (demoPage === 'intro') syncOpeningVideoPlayback({ restart: restartVideo });
    if (document.hidden) {
      setNarrationState('paused');
      return;
    }
    setNarrationState('loading');
    const playAttempt = demoNarration.play();
    runNarrationVisualClock(token);
    if (!playAttempt?.then) {
      narrationUnlocked = true;
      setNarrationState('playing');
      return;
    }
    playAttempt.then(() => {
      if (token !== narrationRunToken) return;
      narrationUnlocked = true;
      setNarrationState('playing');
    }).catch((error) => handleNarrationFailure(error, token));
  };

  const startNarrationForPage = (page, { restartVideo = true } = {}) => {
    if (!narrationRequested || !narrationByPage[page]) return false;
    stopNarrationPlayback({ keepRequested: true });
    demoPage = page;
    narrationSegmentIndex = 0;
    const token = narrationRunToken;
    startDemoBgmForPage(page, { restart: page === 'intro' });
    playNarrationSegment({ token, restartVideo });
    return true;
  };

  const getStageRunDuration = (page) => {
    if (page === 'intro') {
      const videoDuration = Number(openingDemoVideo?.duration);
      return Number.isFinite(videoDuration) && videoDuration > 0
        ? Math.round(videoDuration * 1000 + 350)
        : demoDurationFallbacks.intro;
    }
    const roots = { weather: weatherDemo, meeting: meetingDemo, support: supportDemo, closing: closingDemo };
    const variables = { weather: '--demo-duration', meeting: '--meeting-duration', support: '--support-duration', closing: '--closing-duration' };
    const root = roots[page];
    const cssDuration = root ? parseCssTime(getComputedStyle(root).getPropertyValue(variables[page])) : 0;
    const fullDuration = cssDuration || demoDurationFallbacks[page] || demoDurationFallbacks.weather;
    return Math.round(fullDuration * (demoEndRatios[page] || .98));
  };

  const clearStageTransitionTimers = () => {
    stageTransitionTimers.forEach((timer) => window.clearTimeout(timer));
    stageTransitionTimers = [];
  };

  const clearSequenceTimer = ({ preserve = false } = {}) => {
    if (sequenceTimer && preserve) {
      const elapsed = performance.now() - sequenceStartedAt;
      sequenceRemaining = Math.max(0, sequenceRemaining - elapsed);
    }
    if (sequenceTimer) window.clearTimeout(sequenceTimer);
    sequenceTimer = null;
  };

  const advanceSequence = () => {
    if (demoMode !== 'sequence') return;
    if (demoPage === 'intro') activateWeatherPage({ keepMode: true });
    else if (demoPage === 'weather') activateMeetingPage({ keepMode: true });
    else if (demoPage === 'meeting') activateSupportPage({ keepMode: true });
    else if (demoPage === 'support') activateClosingPage({ keepMode: true });
    else activateIntroPage({ keepMode: true });
  };

  const scheduleSequenceAdvance = ({ reset = true } = {}) => {
    clearSequenceTimer();
    if (reset) sequenceRemaining = getStageRunDuration(demoPage);
    if (narrationRequested || demoMode !== 'sequence' || document.hidden || reduceMotion || stageTransitioning) return;
    sequenceStartedAt = performance.now();
    sequenceTimer = window.setTimeout(advanceSequence, Math.max(80, sequenceRemaining));
  };

  const startCurrentStageClock = ({ restartVideo = true } = {}) => {
    clearSequenceTimer();
    if (narrationRequested) {
      startNarrationForPage(demoPage, { restartVideo });
      return;
    }
    scheduleSequenceAdvance();
  };

  const updateDemoPageButtons = () => {
    const sequenceSelected = demoMode === 'sequence';
    const weatherSelected = demoPage === 'weather';
    const meetingSelected = demoPage === 'meeting';
    const supportSelected = demoPage === 'support' || demoPage === 'closing';
    allDemoPage?.classList.toggle('active', sequenceSelected);
    allDemoPage?.setAttribute('aria-selected', String(sequenceSelected));
    guidePhone?.classList.toggle('sequence-mode', sequenceSelected);
    guideStage?.classList.toggle('sequence-mode', sequenceSelected);
    [
      [weatherDemoPage, weatherSelected],
      [meetingDemoPage, meetingSelected],
      [supportDemoPage, supportSelected]
    ].forEach(([button, selected]) => {
      button?.classList.toggle('active', !sequenceSelected && selected);
      button?.classList.toggle('current', sequenceSelected && selected);
      button?.setAttribute('aria-selected', String(!sequenceSelected && selected));
      if (sequenceSelected && selected) button?.setAttribute('aria-current', 'step');
      else button?.removeAttribute('aria-current');
    });
    updateDemoStateData();
  };

  const syncOpeningVideoPlayback = ({ restart = false } = {}) => {
    if (!openingDemoVideo) return;
    openingDemoVideo.muted = true;
    if (restart) {
      try { openingDemoVideo.currentTime = 0; } catch { /* metadata may still be loading */ }
    }
    if (document.hidden || reduceMotion || demoPage !== 'intro') {
      openingDemoVideo.pause();
      return;
    }
    openingDemoVideo.play().catch(() => {
      // The sequence timer remains as a fallback if a browser blocks playback.
    });
  };

  const startIntroDemo = ({ restart = false } = {}) => {
    if (!guidePhone || reduceMotion || demoPage !== 'intro') return;
    stageActiveClasses.forEach((className) => guidePhone.classList.remove(className));
    guideStage?.classList.remove('meeting-page', 'support-page', 'closing-page');
    guideStage?.classList.add('intro-page');
    guidePhone.classList.add('opening-demo-active');
    guidePhone.classList.toggle('is-paused', document.hidden);
    if (!narrationRequested) syncOpeningVideoPlayback({ restart });
    updateDemoPageButtons();
    if (!stageTransitioning) startCurrentStageClock({ restartVideo: restart });
  };

  const startWeatherDemo = ({ restart = false } = {}) => {
    if (!guidePhone || reduceMotion || demoPage !== 'weather') return;
    openingDemoVideo?.pause();
    if (restart) {
      guidePhone.classList.remove('demo-active');
      void guidePhone.offsetWidth;
    }
    guidePhone.classList.add('demo-active');
    guidePhone.classList.toggle('is-paused', document.hidden);
    if (!stageTransitioning) startCurrentStageClock();
  };

  const startMeetingDemo = ({ restart = false } = {}) => {
    if (!guidePhone || demoPage !== 'meeting') return;
    openingDemoVideo?.pause();
    guidePhone.classList.remove('demo-active');
    if (restart) {
      guidePhone.classList.remove('meeting-demo-active');
      guideStage?.classList.remove('meeting-page');
      void guidePhone.offsetWidth;
      if (guideStage) void guideStage.offsetWidth;
    }
    guideStage?.classList.add('meeting-page');
    guidePhone.classList.add('meeting-demo-active');
    guidePhone.classList.toggle('is-paused', document.hidden);
    if (!stageTransitioning) startCurrentStageClock();
  };

  const startSupportDemo = ({ restart = false } = {}) => {
    if (!guidePhone || demoPage !== 'support') return;
    openingDemoVideo?.pause();
    guidePhone.classList.remove('demo-active', 'meeting-demo-active');
    if (restart) {
      guidePhone.classList.remove('support-demo-active');
      guideStage?.classList.remove('support-page');
      void guidePhone.offsetWidth;
      if (guideStage) void guideStage.offsetWidth;
    }
    guideStage?.classList.add('support-page');
    guidePhone.classList.add('support-demo-active');
    guidePhone.classList.toggle('is-paused', document.hidden);
    if (!stageTransitioning) startCurrentStageClock();
  };

  const startClosingDemo = ({ restart = false } = {}) => {
    if (!guidePhone || demoPage !== 'closing') return;
    openingDemoVideo?.pause();
    guidePhone.classList.remove('demo-active', 'meeting-demo-active', 'support-demo-active');
    if (restart) {
      guidePhone.classList.remove('closing-demo-active');
      guideStage?.classList.remove('closing-page');
      void guidePhone.offsetWidth;
      if (guideStage) void guideStage.offsetWidth;
    }
    guideStage?.classList.add('closing-page');
    guidePhone.classList.add('closing-demo-active');
    guidePhone.classList.toggle('is-paused', document.hidden);
    updateDemoPageButtons();
    if (!stageTransitioning) startCurrentStageClock();
  };

  const applyDemoStage = (page) => {
    if (!guidePhone || !stageClassByPage[page]) return;
    clearSequenceTimer();
    if (demoPage === 'intro' && page !== 'intro') openingDemoVideo?.pause();
    demoPage = page;
    hydrateStageAssets(page);
    warmNextStageAssets(page);

    stageActiveClasses.forEach((className) => guidePhone.classList.remove(className));
    guideStage?.classList.remove('intro-page', 'meeting-page', 'support-page', 'closing-page');
    // Force a clean animation start while the transition veil is opaque.
    void guidePhone.offsetWidth;
    if (guideStage) void guideStage.offsetWidth;

    if (page === 'intro') guideStage?.classList.add('intro-page');
    if (page === 'meeting') guideStage?.classList.add('meeting-page');
    if (page === 'support') guideStage?.classList.add('support-page');
    if (page === 'closing') guideStage?.classList.add('closing-page');
    guidePhone.classList.add(stageClassByPage[page]);
    guidePhone.classList.toggle('is-paused', document.hidden);
    if (page === 'intro') {
      if (stageTransitioning) {
        openingDemoVideo?.pause();
        try { openingDemoVideo.currentTime = 0; } catch { /* metadata may still be loading */ }
      } else if (!narrationRequested) {
        syncOpeningVideoPlayback({ restart: true });
      }
    } else openingDemoVideo?.pause();
    updateDemoPageButtons();
    if (!stageTransitioning) startCurrentStageClock();
  };

  const switchDemoStage = (page, { keepMode = false, forceRestart = false, immediate = false } = {}) => {
    if (!guidePhone || !stageClassByPage[page] || stageTransitioning) return;
    hydrateStageAssets(page);
    if (!keepMode) demoMode = 'single';
    const activeClass = stageClassByPage[page];
    const alreadyActive = demoPage === page && guidePhone.classList.contains(activeClass);
    if (alreadyActive && !forceRestart) {
      updateDemoPageButtons();
      return;
    }

    clearSequenceTimer();
    if (narrationRequested) stopNarrationPlayback({ keepRequested: true });
    updateDemoPageButtons();
    const hasVisibleStage = stageActiveClasses.some((className) => guidePhone.classList.contains(className));
    if (immediate || reduceMotion || !hasVisibleStage) {
      applyDemoStage(page);
      return;
    }

    stageTransitioning = true;
    guidePhone.classList.add('stage-transitioning');
    guideStage?.classList.add('stage-transitioning');

    const swapTimer = window.setTimeout(() => {
      applyDemoStage(page);
    }, stageTransitionTiming.fadeOut);
    const revealTimer = window.setTimeout(() => {
      guidePhone.classList.remove('stage-transitioning');
      guideStage?.classList.remove('stage-transitioning');
      stageTransitioning = false;
      stageTransitionTimers = [];
      startCurrentStageClock();
    }, stageTransitionTiming.fadeOut + stageTransitionTiming.coveredHold);
    stageTransitionTimers = [swapTimer, revealTimer];
  };

  const enableNarrationFromGesture = () => {
    if (stageTransitioning) {
      clearStageTransitionTimers();
      stageTransitioning = false;
      guidePhone?.classList.remove('stage-transitioning');
      guideStage?.classList.remove('stage-transitioning');
    }
    if (!narrationUnlocked) narrationMuted = false;
    narrationRequested = true;
    setNarrationState('ready');
  };

  const activateWeatherPage = ({ keepMode = false, userInitiated = false } = {}) => {
    if (userInitiated) enableNarrationFromGesture();
    switchDemoStage('weather', { keepMode, forceRestart: true, immediate: userInitiated && !narrationUnlocked });
  };

  const activateIntroPage = ({ keepMode = false, userInitiated = false } = {}) => {
    if (userInitiated) enableNarrationFromGesture();
    switchDemoStage('intro', { keepMode, forceRestart: true, immediate: userInitiated && !narrationUnlocked });
  };

  const activateMeetingPage = ({ keepMode = false, userInitiated = false } = {}) => {
    if (userInitiated) enableNarrationFromGesture();
    switchDemoStage('meeting', { keepMode, forceRestart: true, immediate: userInitiated && !narrationUnlocked });
  };

  const activateSupportPage = ({ keepMode = false, userInitiated = false } = {}) => {
    if (userInitiated) enableNarrationFromGesture();
    switchDemoStage('support', { keepMode, forceRestart: true, immediate: userInitiated && !narrationUnlocked });
  };

  const activateClosingPage = ({ keepMode = false } = {}) => {
    switchDemoStage('closing', { keepMode, forceRestart: true });
  };

  const activateSequence = ({ userInitiated = false } = {}) => {
    if (userInitiated) enableNarrationFromGesture();
    demoMode = 'sequence';
    switchDemoStage('intro', { keepMode: true, forceRestart: true, immediate: userInitiated && !narrationUnlocked });
  };

  allDemoPage?.addEventListener('click', () => activateSequence({ userInitiated: true }));
  weatherDemoPage?.addEventListener('click', () => activateWeatherPage({ userInitiated: true }));
  meetingDemoPage?.addEventListener('click', () => activateMeetingPage({ userInitiated: true }));
  supportDemoPage?.addEventListener('click', () => activateSupportPage({ userInitiated: true }));

  if (guideStage && !reduceMotion && 'IntersectionObserver' in window) {
    const demoObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        if (narrationRequested && ['loading', 'playing', 'paused'].includes(narrationState)) return;
        if (demoPage === 'intro') startIntroDemo({ restart: true });
        else if (demoPage === 'meeting') startMeetingDemo({ restart: true });
        else if (demoPage === 'support') startSupportDemo({ restart: true });
        else if (demoPage === 'closing') startClosingDemo({ restart: true });
        else startWeatherDemo({ restart: true });
      });
    }, { threshold: .35 });
    demoObserver.observe(guideStage);
  } else if (!reduceMotion) {
    if (demoPage === 'intro') startIntroDemo();
    else startWeatherDemo();
  }
  document.addEventListener('visibilitychange', () => {
    if (!guidePhone) return;
    guidePhone.classList.toggle('is-paused', document.hidden);
    if (narrationRequested && demoNarration) {
      if (document.hidden) {
        demoNarration.pause();
        pauseDemoBgm();
        openingDemoVideo?.pause();
        cancelNarrationFrame();
        setNarrationState('paused');
      } else if (!demoNarration.ended) {
        if (demoPage === 'intro') syncOpeningVideoPlayback();
        resumeDemoBgm();
        const token = narrationRunToken;
        setNarrationState('loading');
        const playAttempt = demoNarration.play();
        runNarrationVisualClock(token);
        if (playAttempt?.then) {
          playAttempt.then(() => {
            if (token === narrationRunToken) setNarrationState('playing');
          }).catch((error) => handleNarrationFailure(error, token));
        } else setNarrationState('playing');
      }
    } else if (demoPage === 'intro') syncOpeningVideoPlayback();
    if (!narrationRequested && demoMode === 'sequence') {
      if (document.hidden) clearSequenceTimer({ preserve: true });
      else scheduleSequenceAdvance({ reset: false });
    }
  });
  updateDemoPageButtons();
  updateNarrationHint();
  warmNextStageAssets('intro');

  openingDemoVideo?.addEventListener('ended', () => {
    // The narration is intentionally longer than the eight-second video.
    // Keep the final frame visible until the opening voice track ends.
  });

  demoNarration?.addEventListener('ended', () => {
    const token = Number(demoNarration.dataset.runToken);
    if (!narrationRequested || token !== narrationRunToken || document.hidden) return;
    if (Number.isFinite(demoNarration.duration) && demoNarration.currentTime < demoNarration.duration - .2) return;
    const segments = narrationByPage[demoPage] || [];
    const completed = segments[narrationSegmentIndex];
    applyNarrationVisualTime(completed, completed?.duration || demoNarration.duration);
    if (narrationSegmentIndex + 1 < segments.length) {
      narrationSegmentIndex += 1;
      playNarrationSegment({ token });
      return;
    }
    cancelNarrationFrame();
    setNarrationState('complete');
    if (demoMode === 'sequence') advanceSequence();
    else fadeOutDemoBgm();
  });

  demoNarration?.addEventListener('loadedmetadata', syncLoadedNarrationDuration);

  demoBgm?.addEventListener('error', () => {
    console.warn('배경음 파일을 불러오지 못했습니다.', demoBgm.error);
    stopDemoBgm({ reset: false });
  });

  demoNarration?.addEventListener('error', () => {
    if (!narrationRequested || !demoNarration.currentSrc) return;
    handleNarrationFailure(demoNarration.error || new Error('내레이션 파일을 불러오지 못했습니다.'), narrationRunToken);
  });

})();
