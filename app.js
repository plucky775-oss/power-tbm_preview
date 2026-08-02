(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const header = $('#siteHeader');
  const progress = $('.scroll-progress span');
  const updateScrollUI = () => {
    const y = window.scrollY || 0;
    header?.classList.toggle('scrolled', y > 24);
    const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    if (progress) progress.style.transform = `scaleX(${Math.min(1, y / max)})`;
  };
  updateScrollUI();
  window.addEventListener('scroll', updateScrollUI, { passive: true });
  window.addEventListener('resize', updateScrollUI, { passive: true });

  const menuButton = $('.menu-toggle');
  const mobileMenu = $('#mobileMenu');
  const closeMenu = () => {
    if (!menuButton || !mobileMenu) return;
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', '메뉴 열기');
    mobileMenu.hidden = true;
  };
  menuButton?.addEventListener('click', () => {
    const open = menuButton.getAttribute('aria-expanded') === 'true';
    menuButton.setAttribute('aria-expanded', String(!open));
    menuButton.setAttribute('aria-label', open ? '메뉴 열기' : '메뉴 닫기');
    if (mobileMenu) mobileMenu.hidden = open;
  });
  $$('#mobileMenu a').forEach((link) => link.addEventListener('click', closeMenu));
  window.addEventListener('resize', () => {
    if (window.innerWidth > 1100) closeMenu();
  });

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

  const guideData = [
    {
      src: 'assets/screens/guide/home.webp',
      width: 709,
      height: 1536,
      alt: 'Power TBM 홈 화면',
      category: '시작 화면',
      title: '홈에서 오늘의 현장을 확인합니다',
      desc: '현재 날씨와 기상특보를 먼저 확인한 뒤 TBM 회의록, 안전가이드, 현장도구로 이동합니다.',
      check: '현재 기온·특보, 작업중지권, 주요 메뉴',
      when: '현장 도착 직후와 회의 시작 전',
      tip: '특보 카드를 누르면 상세 조치사항을 펼쳐 볼 수 있습니다.'
    },
    {
      src: 'assets/screens/guide/home-alert.webp',
      width: 709,
      height: 1536,
      alt: 'Power TBM 기상특보 상세 화면',
      category: '기상특보',
      title: '특보가 작업에 미치는 영향을 확인합니다',
      desc: '현재 위치에 발표된 기상특보와 산업분야 조치사항을 홈에서 바로 확인합니다.',
      check: '특보 종류·발표 시각·산업분야 조치사항',
      when: '폭염·강풍·호우 등 특보가 표시될 때',
      tip: '작업시간 조정, 휴식, 급수 등 조치사항을 TBM 전달내용과 함께 확인하세요.'
    },
    {
      src: 'assets/screens/guide/meeting-menu.webp',
      width: 1179,
      height: 2556,
      alt: 'TBM 회의록 작성과 캘린더 메뉴',
      category: 'TBM 회의록',
      title: '작성과 보관 업무를 구분해 시작합니다',
      desc: '새 회의는 ‘회의록 작성’, 완료 문서 확인은 ‘회의록 캘린더’를 선택합니다.',
      check: '새 회의 작성 또는 기존 원본 조회',
      when: '회의 시작 전 또는 과거 회의록을 찾을 때',
      tip: '회의를 새로 시작할 때는 반드시 ‘회의록 작성’으로 들어가세요.'
    },
    {
      src: 'assets/screens/guide/trade-select.webp',
      width: 1179,
      height: 2556,
      alt: '가공 배전공사 공종 선택 화면',
      category: '공종 선택',
      title: '실제 수행하는 공종만 복수 선택합니다',
      desc: '가공·지중·내선 구분에서 당일 공종을 선택하면 관련 위험요인이 회의 항목으로 구성됩니다.',
      check: '작업범위와 선택 공종의 일치 여부',
      when: '기본정보 입력을 마친 뒤',
      tip: '함께 수행하는 공종은 모두 선택하되, 예정만 있고 수행하지 않는 공종은 제외하세요.'
    },
    {
      src: 'assets/screens/guide/weather-now.webp',
      width: 1179,
      height: 2556,
      alt: '현재 날씨와 작업 안전 경고 화면',
      category: '현장 날씨',
      title: '현재 작업조건을 수치로 확인합니다',
      desc: '체감온도, 습도, 풍속, 기온과 시간대별 예보를 확인해 작업 위험을 판단합니다.',
      check: '체감온도·습도·풍속·강수확률',
      when: '회의 전과 기상 변화가 있을 때',
      tip: '상단의 현재 위치 새로고침으로 실제 작업 위치가 맞는지 확인하세요.'
    },
    {
      src: 'assets/screens/guide/weather-week.webp',
      width: 1179,
      height: 2556,
      alt: '주간 날씨와 태풍정보 화면',
      category: '주간·태풍',
      title: '앞으로의 날씨와 태풍 경로를 살핍니다',
      desc: '주간 예보와 한국·미국·일본 기관의 태풍정보, 레이더 영상과 기상특보로 연결됩니다.',
      check: '일별 최저·최고기온, 강수확률, 태풍 경로',
      when: '향후 작업계획 수립과 태풍 접근 시',
      tip: '기관별 예상 경로는 갱신 시점이 다를 수 있으므로 최신 발표 시각을 함께 확인하세요.'
    },
    {
      src: 'assets/screens/guide/incidents.webp',
      width: 1179,
      height: 2556,
      alt: '최근 안전사고 사례 목록 화면',
      category: '안전가이드',
      title: '최근 사고사례로 위험을 구체화합니다',
      desc: '관리자가 등록한 사고사례를 월별로 보고 사고유형, 개요와 첨부 사진을 확인합니다.',
      check: '사고유형·발생일·사고개요·사진',
      when: '유사 작업 전 경각심을 높일 때',
      tip: '오늘 공종과 관련된 사례는 회의 중 위험요인 설명에 활용하세요.'
    },
    {
      src: 'assets/screens/guide/voice-memo.webp',
      width: 1179,
      height: 2556,
      alt: '음성메모 작성과 저장 화면',
      category: '현장도구',
      title: '말로 입력해 전달사항을 빠르게 남깁니다',
      desc: '음성을 텍스트로 바꿔 메모하고, 저장한 내용을 다시 불러오거나 복사할 수 있습니다.',
      check: '음성 인식 결과와 저장된 메모 내용',
      when: '장갑 착용 중이거나 긴 내용을 빠르게 기록할 때',
      tip: '저장 전 인식된 문장을 한 번 읽고 작업명·숫자·고유명사를 바로잡으세요.'
    },
    {
      src: 'assets/screens/guide/notices.webp',
      width: 1179,
      height: 2556,
      alt: 'Power TBM 공지사항 목록 화면',
      category: '공지사항',
      title: '업데이트와 현장 공지를 확인합니다',
      desc: '관리자가 등록한 공지의 제목, 등록일, 확인 여부와 첨부 사진을 확인합니다.',
      check: '새 공지·업데이트 내용·확인 상태',
      when: '앱 실행 후 새 공지가 표시될 때',
      tip: '확인하지 않은 공지는 내용을 연 뒤 업무에 미치는 변경사항을 확인하세요.'
    },
    {
      src: 'assets/screens/guide/contacts.webp',
      width: 1179,
      height: 2556,
      alt: '회사별 비상연락망 화면',
      category: '비상연락망',
      title: '필요한 연락처로 즉시 연결합니다',
      desc: '회사별 연락처를 저장하고 전화 버튼으로 바로 통화 앱을 열 수 있습니다.',
      check: '회사명·이름·전화번호',
      when: '현장 연락 또는 비상상황 대응 시',
      tip: '작업 전 책임자와 주요 협력사 연락처가 최신인지 확인하세요.'
    },
    {
      src: 'assets/screens/guide/settings.webp',
      width: 1179,
      height: 2556,
      alt: '위치정보, 관리자와 계정 설정 화면',
      category: '설정',
      title: '권한과 계정 상태를 관리합니다',
      desc: '위치정보 동의, 관리자 메뉴, 로그인 계정과 로그아웃·회원탈퇴 기능을 확인합니다.',
      check: '위치 동의 상태·계정·관리자 권한',
      when: '위치기능이 안 되거나 계정을 관리할 때',
      tip: '회원탈퇴는 계정 삭제 작업이므로 필요한 문서를 먼저 확인하세요.'
    },
    {
      src: 'assets/screens/guide/location-consent.webp',
      width: 1179,
      height: 2556,
      alt: 'Power TBM 위치정보 이용 동의 화면',
      category: '위치정보',
      title: '필요한 경우에만 위치정보에 동의합니다',
      desc: '날씨, 거리뷰, 응급의료시설 검색에 사용할 위치정보의 항목과 목적을 확인하고 선택합니다.',
      check: '수집 항목·이용 목적·제공될 수 있는 곳',
      when: '위치기반 기능을 처음 사용할 때',
      tip: '앱 동의와 별도로 브라우저 권한 팝업에서도 위치 사용을 허용해야 기능이 작동합니다.'
    }
  ];

  const guideImage = $('#guideImage');
  const guidePhone = $('.guide-phone');
  const guideIndex = $('#guideIndex');
  const guideCategory = $('#guideCategory');
  const guideTitle = $('#guideTitle');
  const guideDesc = $('#guideDesc');
  const guideCheck = $('#guideCheck');
  const guideWhen = $('#guideWhen');
  const guideTip = $('#guideTip');
  const guideTabs = $$('.tour-tabs [data-guide]');
  const guideStage = $('.tour-stage');
  const demoControls = $('#demoControls');
  const demoToggle = $('#demoToggle');
  const demoReplay = $('#demoReplay');
  const allDemoPage = $('#allDemoPage');
  const weatherDemoPage = $('#weatherDemoPage');
  const meetingDemoPage = $('#meetingDemoPage');
  const supportDemoPage = $('#supportDemoPage');
  const homeReset = $('#homeReset');
  const openingDemoVideo = $('#openingDemoVideo');
  const demoNarration = $('#demoNarration');
  const demoBgm = $('#demoBgm');
  const demoMute = $('#demoMute');
  const weatherDemo = $('#weatherDemo');
  const meetingDemo = $('#meetingDemo');
  const supportDemo = $('#supportDemo');
  const goldenRulesVideoShell = $('.support-golden-video-shell');
  const goldenRulesVideo = $('#goldenRulesVideo');
  const closingDemo = $('#closingDemo');

  // The basic-information form is built with fixed-size DOM controls while the
  // phone itself scales with the viewport. Resolve every target from its live
  // box so the highlight, fingertip and ripple stay attached at every size.
  const syncMeetingBasicTargets = () => {
    if (!meetingDemo) return;
    const rootRect = meetingDemo.getBoundingClientRect();
    if (!rootRect.width || !rootRect.height) return;

    const form = $('.meeting-basic-screen .meeting-form-card', meetingDemo);
    const fields = $$('.meeting-basic-screen .meeting-field', meetingDemo);
    const nextButton = $('.meeting-basic-screen .meeting-primary-button', meetingDemo);
    const setBox = (name, element) => {
      if (!element) return;
      const rect = element.getBoundingClientRect();
      meetingDemo.style.setProperty(`--meeting-basic-${name}-left`, `${rect.left - rootRect.left}px`);
      meetingDemo.style.setProperty(`--meeting-basic-${name}-top`, `${rect.top - rootRect.top}px`);
      meetingDemo.style.setProperty(`--meeting-basic-${name}-width`, `${rect.width}px`);
      meetingDemo.style.setProperty(`--meeting-basic-${name}-height`, `${rect.height}px`);
    };
    const setCenter = (name, element) => {
      if (!element) return;
      const rect = element.getBoundingClientRect();
      meetingDemo.style.setProperty(`--meeting-basic-${name}-x`, `${rect.left + rect.width / 2 - rootRect.left}px`);
      meetingDemo.style.setProperty(`--meeting-basic-${name}-y`, `${rect.top + rect.height / 2 - rootRect.top}px`);
    };

    setBox('form', form);
    setCenter('project', fields[0]);
    setCenter('place', fields[1]);
    setCenter('manager', fields[2]);
    setCenter('next', nextButton);
  };
  let meetingTargetFrame = 0;
  const scheduleMeetingBasicTargets = () => {
    window.cancelAnimationFrame(meetingTargetFrame);
    meetingTargetFrame = window.requestAnimationFrame(syncMeetingBasicTargets);
  };
  scheduleMeetingBasicTargets();
  window.addEventListener('load', scheduleMeetingBasicTargets, { once: true });
  window.addEventListener('resize', scheduleMeetingBasicTargets, { passive: true });
  document.fonts?.ready.then(scheduleMeetingBasicTargets).catch(() => {});
  if ('ResizeObserver' in window && meetingDemo) {
    const meetingTargetObserver = new ResizeObserver(scheduleMeetingBasicTargets);
    meetingTargetObserver.observe(meetingDemo);
  }

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
        cues: [[0, 0], [3.26, 5700], [12.35, 19600], [16.12, 25950], [22.25, 32600], [24.59, 36100], [30.772188, 42450]]
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
  let currentGuide = 0;
  let guideChanging = false;
  let demoPaused = false;
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
  let goldenRulesClockFrame = null;
  let goldenRulesVideoActive = false;
  let goldenRulesPlayPending = false;
  let goldenRulesPlaybackBlocked = false;
  let goldenRulesRunToken = 0;
  const goldenRulesTimeline = Object.freeze({ start: 26100, end: 32600 });

  const parseCssTime = (value) => {
    const time = String(value || '').trim();
    if (!time) return 0;
    if (time.endsWith('ms')) return Number.parseFloat(time) || 0;
    if (time.endsWith('s')) return (Number.parseFloat(time) || 0) * 1000;
    return Number.parseFloat(time) || 0;
  };

  const enforceGoldenRulesMute = () => {
    if (!goldenRulesVideo) return;
    if (!goldenRulesVideo.defaultMuted) goldenRulesVideo.defaultMuted = true;
    if (!goldenRulesVideo.muted) goldenRulesVideo.muted = true;
    if (goldenRulesVideo.volume !== 0) goldenRulesVideo.volume = 0;
    if (!goldenRulesVideo.playsInline) goldenRulesVideo.playsInline = true;
  };

  const cancelGoldenRulesClock = () => {
    if (goldenRulesClockFrame) window.cancelAnimationFrame(goldenRulesClockFrame);
    goldenRulesClockFrame = null;
  };

  const resetGoldenRulesVideo = () => {
    if (!goldenRulesVideo) return;
    goldenRulesRunToken += 1;
    enforceGoldenRulesMute();
    goldenRulesVideo.pause();
    goldenRulesVideoActive = false;
    goldenRulesPlayPending = false;
    goldenRulesPlaybackBlocked = false;
    goldenRulesVideoShell?.removeAttribute('data-playback');
    if (goldenRulesVideo.currentTime > .02) {
      try { goldenRulesVideo.currentTime = 0; } catch (_) { /* metadata may still be loading */ }
    }
  };

  const getGoldenRulesVisualTime = () => {
    if (!goldenRulesVideoShell?.getAnimations) return Number.NaN;
    const animations = goldenRulesVideoShell.getAnimations();
    const animation = animations.find((item) => item.animationName === 'support-golden-video-shell') || animations[0];
    const currentTime = Number(animation?.currentTime);
    const computedDuration = Number(animation?.effect?.getComputedTiming?.().duration);
    const duration = Number.isFinite(computedDuration) && computedDuration > 0
      ? computedDuration
      : demoDurationFallbacks.support;
    if (!Number.isFinite(currentTime)) return Number.NaN;
    return ((currentTime % duration) + duration) % duration;
  };

  const syncGoldenRulesVideo = (visualTime) => {
    if (!goldenRulesVideo) return;
    enforceGoldenRulesMute();
    const time = Number(visualTime);
    const stageIsActive = demoPage === 'support' && guidePhone?.classList.contains('support-demo-active');
    const inVideoWindow = stageIsActive
      && Number.isFinite(time)
      && time >= goldenRulesTimeline.start
      && time < goldenRulesTimeline.end;

    if (!inVideoWindow) {
      goldenRulesVideo.pause();
      if (goldenRulesVideoActive || goldenRulesVideo.currentTime > .08) {
        try { goldenRulesVideo.currentTime = 0; } catch (_) { /* metadata may still be loading */ }
      }
      goldenRulesVideoActive = false;
      goldenRulesVideoShell?.setAttribute('data-playback', 'idle');
      return;
    }

    const desiredTime = Math.max(0, (time - goldenRulesTimeline.start) / 1000);
    if (!goldenRulesVideoActive || Math.abs(goldenRulesVideo.currentTime - desiredTime) > .45) {
      try { goldenRulesVideo.currentTime = desiredTime; } catch (_) { /* metadata may still be loading */ }
    }
    goldenRulesVideoActive = true;

    if (demoPaused || document.hidden || reduceMotion) {
      goldenRulesVideo.pause();
      goldenRulesVideoShell?.setAttribute('data-playback', 'paused');
      return;
    }

    if (goldenRulesVideo.paused && !goldenRulesPlayPending && !goldenRulesPlaybackBlocked) {
      goldenRulesPlayPending = true;
      const playToken = goldenRulesRunToken;
      const playAttempt = goldenRulesVideo.play();
      if (playAttempt?.then) {
        playAttempt.then(() => {
          if (playToken !== goldenRulesRunToken) {
            goldenRulesVideo.pause();
            return;
          }
          goldenRulesVideoShell?.setAttribute('data-playback', 'playing');
        }).catch((error) => {
          if (playToken !== goldenRulesRunToken) return;
          goldenRulesPlaybackBlocked = true;
          goldenRulesVideoShell?.setAttribute('data-playback', 'blocked');
          console.warn('골든룰스11 무음 영상을 자동재생하지 못했습니다.', error);
        }).finally(() => {
          if (playToken === goldenRulesRunToken) goldenRulesPlayPending = false;
        });
      } else {
        goldenRulesPlayPending = false;
        goldenRulesVideoShell?.setAttribute('data-playback', 'playing');
      }
    }
  };

  const stopGoldenRulesClock = ({ reset = true } = {}) => {
    cancelGoldenRulesClock();
    if (reset) resetGoldenRulesVideo();
    else goldenRulesVideo?.pause();
  };

  const startGoldenRulesClock = ({ reset = false } = {}) => {
    cancelGoldenRulesClock();
    if (reset) resetGoldenRulesVideo();
    const tick = () => {
      if (demoPage !== 'support' || !guidePhone?.classList.contains('support-demo-active')) {
        stopGoldenRulesClock();
        return;
      }
      const visualTime = getGoldenRulesVisualTime();
      if (Number.isFinite(visualTime)) syncGoldenRulesVideo(visualTime);
      goldenRulesClockFrame = window.requestAnimationFrame(tick);
    };
    goldenRulesClockFrame = window.requestAnimationFrame(tick);
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

  const updateNarrationButton = () => {
    if (!demoMute) return;
    const needsStart = !narrationRequested || narrationState === 'blocked' || narrationState === 'error';
    const icon = narrationMuted && !needsStart ? '🔇' : '🔊';
    const visibleLabel = needsStart ? '소리 시작' : narrationMuted ? '소리 꺼짐' : '소리 켜짐';
    const actionLabel = needsStart
      ? '음성 및 배경음 재생 시작'
      : narrationMuted
        ? '음성 및 배경음 켜기'
        : '음성 및 배경음 끄기';
    demoMute.classList.toggle('needs-start', needsStart);
    allDemoPage?.classList.toggle('narration-start-hint', needsStart);
    demoMute.setAttribute('aria-pressed', String(!needsStart && !narrationMuted));
    demoMute.setAttribute('aria-label', actionLabel);
    demoMute.title = actionLabel;
    demoMute.innerHTML = `<span class="demo-sound-icon" aria-hidden="true">${icon}</span><span class="demo-sound-label">${visibleLabel}</span>`;
  };

  const setNarrationState = (state) => {
    narrationState = state;
    updateDemoStateData();
    updateNarrationButton();
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
      try { demoBgm.currentTime = 0; } catch (_) { /* metadata may still be loading */ }
      demoBgm.volume = 0;
    }
    demoBgm.muted = narrationMuted;
    if (demoPaused || document.hidden) {
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
    if (!demoBgm || !narrationRequested || demoPaused || document.hidden) return;
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
        try { demoBgm.currentTime = 0; } catch (_) { /* metadata may still be loading */ }
      }
    });
  };

  const stopDemoBgm = ({ reset = true } = {}) => {
    cancelBgmFrame();
    if (!demoBgm) return;
    demoBgm.pause();
    demoBgm.volume = 0;
    if (reset) {
      try { demoBgm.currentTime = 0; } catch (_) { /* metadata may still be loading */ }
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
      try { animation.play(); } catch (_) { /* animation may already be detached */ }
    });
    syncedAnimations = [];
  };

  const getAnimationsForRoot = (root) => {
    if (!root?.getAnimations) return [];
    try {
      return root.getAnimations({ subtree: true });
    } catch (_) {
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
      try { animation.pause(); } catch (_) { /* keep the fallback timeline available */ }
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
        try { openingDemoVideo.currentTime = target; } catch (_) { /* metadata may still be loading */ }
      }
      return;
    }
    if (!syncedAnimations.length) collectNarrationAnimations(demoPage);
    syncedAnimations.forEach((animation) => {
      try {
        if (animation.playState !== 'paused') animation.pause();
        animation.currentTime = visualTime;
      } catch (_) { /* a scene can detach during a soft transition */ }
    });
    if (demoPage === 'support') syncGoldenRulesVideo(visualTime);
  };

  const runNarrationVisualClock = (token) => {
    cancelNarrationFrame();
    const tick = () => {
      if (token !== narrationRunToken || !narrationRequested || !demoNarration) return;
      const segment = narrationByPage[demoPage]?.[narrationSegmentIndex];
      applyNarrationVisualTime(segment, demoNarration.currentTime);
      syncClosingBgmFade(segment, demoNarration.currentTime);
      if (!demoPaused && !document.hidden && !demoNarration.ended) narrationFrame = window.requestAnimationFrame(tick);
    };
    narrationFrame = window.requestAnimationFrame(tick);
  };

  const stopNarrationPlayback = ({ reset = true, keepRequested = true } = {}) => {
    narrationRunToken += 1;
    cancelNarrationFrame();
    releaseSyncedAnimations();
    demoNarration?.pause();
    if (reset && demoNarration) {
      try { demoNarration.currentTime = 0; } catch (_) { /* source may be changing */ }
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
      try { demoNarration.currentTime = 0; } catch (_) { /* metadata may still be loading */ }
    }
    demoNarration.muted = narrationMuted;
    demoNarration.dataset.segment = segment.id;
    demoNarration.dataset.runToken = String(token);
    updateDemoStateData();
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
    if (demoPaused || document.hidden) {
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
    if (narrationRequested || demoMode !== 'sequence' || demoPaused || document.hidden || reduceMotion || stageTransitioning) return;
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

  const updateDemoButton = () => {
    if (!demoToggle) return;
    demoToggle.setAttribute('aria-pressed', String(demoPaused));
    const playingLabel = demoMode === 'sequence' ? '전체 시연 일시정지' : '시연 일시정지';
    demoToggle.innerHTML = `<span aria-hidden="true">${demoPaused ? '▶' : 'Ⅱ'}</span> ${demoPaused ? '계속 재생' : playingLabel}`;
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

  const stopAllDemos = () => {
    clearSequenceTimer();
    clearStageTransitionTimers();
    stopGoldenRulesClock();
    stopNarrationPlayback({ keepRequested: false });
    stopDemoBgm();
    stageTransitioning = false;
    guidePhone?.classList.remove('opening-demo-active', 'demo-active', 'meeting-demo-active', 'support-demo-active', 'closing-demo-active', 'is-paused', 'stage-transitioning');
    guideStage?.classList.remove('intro-page', 'meeting-page', 'support-page', 'closing-page', 'stage-transitioning');
    openingDemoVideo?.pause();
    demoControls?.classList.remove('active');
    demoPaused = false;
    setNarrationState('ready');
    updateDemoButton();
  };

  const syncOpeningVideoPlayback = ({ restart = false } = {}) => {
    if (!openingDemoVideo) return;
    openingDemoVideo.muted = true;
    if (restart) {
      try { openingDemoVideo.currentTime = 0; } catch (_) { /* metadata may still be loading */ }
    }
    if (demoPaused || document.hidden || reduceMotion || demoPage !== 'intro') {
      openingDemoVideo.pause();
      return;
    }
    openingDemoVideo.play().catch(() => {
      // The sequence timer remains as a fallback if a browser blocks playback.
    });
  };

  const startIntroDemo = ({ restart = false } = {}) => {
    if (!guidePhone || reduceMotion || demoPage !== 'intro') return;
    stopGoldenRulesClock();
    stageActiveClasses.forEach((className) => guidePhone.classList.remove(className));
    guideStage?.classList.remove('meeting-page', 'support-page', 'closing-page');
    guideStage?.classList.add('intro-page');
    guidePhone.classList.add('opening-demo-active');
    guidePhone.classList.toggle('is-paused', demoPaused || document.hidden);
    demoControls?.classList.add('active');
    if (guideIndex) guideIndex.textContent = 'OPENING';
    if (!narrationRequested) syncOpeningVideoPlayback({ restart });
    updateDemoPageButtons();
    updateDemoButton();
    if (!stageTransitioning) startCurrentStageClock({ restartVideo: restart });
  };

  const startWeatherDemo = ({ restart = false } = {}) => {
    if (!guidePhone || reduceMotion || currentGuide !== 0 || demoPage !== 'weather') return;
    stopGoldenRulesClock();
    openingDemoVideo?.pause();
    if (restart) {
      guidePhone.classList.remove('demo-active');
      void guidePhone.offsetWidth;
    }
    guidePhone.classList.add('demo-active');
    guidePhone.classList.toggle('is-paused', demoPaused || document.hidden);
    demoControls?.classList.add('active');
    updateDemoButton();
    if (!stageTransitioning) startCurrentStageClock();
  };

  const startMeetingDemo = ({ restart = false } = {}) => {
    if (!guidePhone || demoPage !== 'meeting') return;
    stopGoldenRulesClock();
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
    guidePhone.classList.toggle('is-paused', demoPaused || document.hidden);
    demoControls?.classList.add('active');
    if (guideIndex) guideIndex.textContent = '02 / 03';
    updateDemoButton();
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
    guidePhone.classList.toggle('is-paused', demoPaused || document.hidden);
    demoControls?.classList.add('active');
    if (guideIndex) guideIndex.textContent = '03 / 03';
    startGoldenRulesClock({ reset: restart });
    updateDemoButton();
    if (!stageTransitioning) startCurrentStageClock();
  };

  const startClosingDemo = ({ restart = false } = {}) => {
    if (!guidePhone || demoPage !== 'closing') return;
    stopGoldenRulesClock();
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
    guidePhone.classList.toggle('is-paused', demoPaused || document.hidden);
    demoControls?.classList.add('active');
    if (guideIndex) guideIndex.textContent = 'ENDING';
    updateDemoPageButtons();
    updateDemoButton();
    if (!stageTransitioning) startCurrentStageClock();
  };

  const syncWeatherGuide = () => {
    const item = guideData[0];
    currentGuide = 0;
    if (guideImage) {
      guideImage.src = item.src;
      guideImage.width = item.width;
      guideImage.height = item.height;
      guideImage.alt = item.alt;
    }
    if (guideCategory) guideCategory.textContent = item.category;
    if (guideTitle) guideTitle.textContent = item.title;
    if (guideDesc) guideDesc.textContent = item.desc;
    if (guideCheck) guideCheck.textContent = item.check;
    if (guideWhen) guideWhen.textContent = item.when;
    if (guideTip) guideTip.textContent = item.tip;
    guideTabs.forEach((tab, tabIndex) => {
      const selected = tabIndex === 0;
      tab.classList.toggle('active', selected);
      tab.setAttribute('aria-selected', String(selected));
    });
  };

  const applyDemoStage = (page) => {
    if (!guidePhone || !stageClassByPage[page]) return;
    clearSequenceTimer();
    if (page !== 'support') stopGoldenRulesClock();
    if (demoPage === 'intro' && page !== 'intro') openingDemoVideo?.pause();
    demoPage = page;
    if (page === 'weather') syncWeatherGuide();

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
    if (page === 'support') startGoldenRulesClock({ reset: true });
    guidePhone.classList.toggle('is-paused', demoPaused || document.hidden);
    demoControls?.classList.add('active');

    if (guideIndex) {
      guideIndex.textContent = page === 'intro'
        ? 'OPENING'
        : page === 'weather'
          ? '01 / 03'
          : page === 'meeting'
            ? '02 / 03'
            : page === 'closing'
              ? 'ENDING'
              : '03 / 03';
    }
    if (page !== 'weather') {
      guideTabs.forEach((tab) => {
        tab.classList.remove('active');
        tab.setAttribute('aria-selected', 'false');
      });
    }
    if (page === 'intro') {
      if (stageTransitioning) {
        openingDemoVideo?.pause();
        try { openingDemoVideo.currentTime = 0; } catch (_) { /* metadata may still be loading */ }
      } else if (!narrationRequested) {
        syncOpeningVideoPlayback({ restart: true });
      }
    } else openingDemoVideo?.pause();
    updateDemoPageButtons();
    updateDemoButton();
    if (!stageTransitioning) startCurrentStageClock();
  };

  const switchDemoStage = (page, { keepMode = false, forceRestart = false, immediate = false } = {}) => {
    if (!guidePhone || !stageClassByPage[page] || guideChanging || stageTransitioning) return;
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

  const updateGuide = (nextIndex) => {
    if (!guideImage || guideChanging) return;
    const index = (nextIndex + guideData.length) % guideData.length;
    stopAllDemos();
    guideChanging = true;
    guidePhone?.classList.add('changing');
    const apply = () => {
      const item = guideData[index];
      currentGuide = index;
      guideImage.src = item.src;
      guideImage.width = item.width;
      guideImage.height = item.height;
      guideImage.alt = item.alt;
      if (guideIndex) {
        guideIndex.textContent = (demoPage === 'weather' && index === 0)
          ? '01 / 03'
          : `${String(index + 1).padStart(2, '0')} / ${String(guideData.length).padStart(2, '0')}`;
      }
      if (guideCategory) guideCategory.textContent = item.category;
      if (guideTitle) guideTitle.textContent = item.title;
      if (guideDesc) guideDesc.textContent = item.desc;
      if (guideCheck) guideCheck.textContent = item.check;
      if (guideWhen) guideWhen.textContent = item.when;
      if (guideTip) guideTip.textContent = item.tip;
      guideTabs.forEach((tab, tabIndex) => {
        const selected = tabIndex === index;
        tab.classList.toggle('active', selected);
        tab.setAttribute('aria-selected', String(selected));
        if (selected) tab.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'nearest', inline: 'nearest' });
      });
      requestAnimationFrame(() => guidePhone?.classList.remove('changing'));
      if (index === 0) window.setTimeout(() => startWeatherDemo({ restart: true }), reduceMotion ? 0 : 260);
      window.setTimeout(() => { guideChanging = false; }, reduceMotion ? 0 : 240);
    };
    window.setTimeout(apply, reduceMotion ? 0 : 150);
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
    demoPaused = false;
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
    if (guideChanging) {
      window.setTimeout(() => activateSequence({ userInitiated }), reduceMotion ? 0 : 280);
      return;
    }
    if (userInitiated) enableNarrationFromGesture();
    demoMode = 'sequence';
    demoPaused = false;
    switchDemoStage('intro', { keepMode: true, forceRestart: true, immediate: userInitiated && !narrationUnlocked });
  };

  homeReset?.addEventListener('click', () => {
    clearStageTransitionTimers();
    stageTransitioning = false;
    guidePhone?.classList.remove('stage-transitioning');
    guideStage?.classList.remove('stage-transitioning');
    demoMode = 'sequence';
    demoPaused = false;
    switchDemoStage('intro', { keepMode: true, forceRestart: true, immediate: true });
  });
  allDemoPage?.addEventListener('click', () => activateSequence({ userInitiated: true }));
  weatherDemoPage?.addEventListener('click', () => activateWeatherPage({ userInitiated: true }));
  meetingDemoPage?.addEventListener('click', () => activateMeetingPage({ userInitiated: true }));
  supportDemoPage?.addEventListener('click', () => activateSupportPage({ userInitiated: true }));
  guideTabs.forEach((tab, index) => tab.addEventListener('click', () => {
    demoMode = 'single';
    demoPage = index === 0 ? 'weather' : 'manual';
    updateDemoPageButtons();
    updateGuide(index);
  }));
  $('#guidePrev')?.addEventListener('click', () => {
    if (demoPage === 'intro') activateSupportPage();
    else if (demoPage === 'closing') activateSupportPage();
    else if (demoPage === 'support') activateMeetingPage();
    else if (demoPage === 'meeting') activateWeatherPage();
    else if (demoPage === 'weather') activateSupportPage();
    else updateGuide(currentGuide - 1);
  });
  $('#guideNext')?.addEventListener('click', () => {
    if (demoPage === 'intro') activateWeatherPage();
    else if (demoPage === 'weather') activateMeetingPage();
    else if (demoPage === 'meeting') activateSupportPage();
    else if (demoPage === 'support') activateWeatherPage();
    else if (demoPage === 'closing') activateIntroPage();
    else updateGuide(currentGuide + 1);
  });
  guideStage?.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') {
      if (demoPage === 'intro') activateSupportPage();
      else if (demoPage === 'closing') activateSupportPage();
      else if (demoPage === 'support') activateMeetingPage();
      else if (demoPage === 'meeting') activateWeatherPage();
      else if (demoPage === 'weather') activateSupportPage();
      else updateGuide(currentGuide - 1);
    }
    if (event.key === 'ArrowRight') {
      if (demoPage === 'intro') activateWeatherPage();
      else if (demoPage === 'weather') activateMeetingPage();
      else if (demoPage === 'meeting') activateSupportPage();
      else if (demoPage === 'support') activateWeatherPage();
      else if (demoPage === 'closing') activateIntroPage();
      else updateGuide(currentGuide + 1);
    }
  });
  demoToggle?.addEventListener('click', () => {
    if (!guidePhone || (demoPage !== 'meeting' && demoPage !== 'support' && demoPage !== 'closing' && currentGuide !== 0)) return;
    demoPaused = !demoPaused;
    guidePhone.classList.toggle('is-paused', demoPaused);
    if (demoPage === 'support') syncGoldenRulesVideo(getGoldenRulesVisualTime());
    if (narrationRequested && demoNarration) {
      if (demoPaused) {
        demoNarration.pause();
        pauseDemoBgm();
        openingDemoVideo?.pause();
        cancelNarrationFrame();
        setNarrationState('paused');
      } else {
        if (demoPage === 'intro') syncOpeningVideoPlayback();
        resumeDemoBgm();
        setNarrationState('loading');
        const token = narrationRunToken;
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
      if (demoPaused) clearSequenceTimer({ preserve: true });
      else scheduleSequenceAdvance({ reset: false });
    }
    updateDemoButton();
  });
  demoReplay?.addEventListener('click', () => {
    if (demoMode === 'sequence') activateSequence({ userInitiated: true });
    else if (demoPage === 'meeting') activateMeetingPage({ userInitiated: true });
    else if (demoPage === 'support') activateSupportPage({ userInitiated: true });
    else activateWeatherPage({ userInitiated: true });
  });
  demoMute?.addEventListener('click', () => {
    if (!narrationRequested || !narrationUnlocked || narrationState === 'blocked' || narrationState === 'error') {
      activateSequence({ userInitiated: true });
      return;
    }
    narrationMuted = !narrationMuted;
    if (demoNarration) demoNarration.muted = narrationMuted;
    if (demoBgm) demoBgm.muted = narrationMuted;
    updateDemoStateData();
    updateNarrationButton();
  });

  if (guideStage && !reduceMotion && 'IntersectionObserver' in window) {
    const demoObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        if (narrationRequested && ['loading', 'playing', 'paused'].includes(narrationState)) return;
        if (demoPage === 'intro') startIntroDemo({ restart: true });
        else if (demoPage === 'meeting') startMeetingDemo({ restart: true });
        else if (demoPage === 'support') startSupportDemo({ restart: true });
        else if (demoPage === 'closing') startClosingDemo({ restart: true });
        else if (currentGuide === 0) startWeatherDemo({ restart: true });
      });
    }, { threshold: .35 });
    demoObserver.observe(guideStage);
  } else if (!reduceMotion) {
    if (demoPage === 'intro') startIntroDemo();
    else startWeatherDemo();
  }
  document.addEventListener('visibilitychange', () => {
    if (!guidePhone || (demoPage !== 'meeting' && demoPage !== 'support' && demoPage !== 'closing' && currentGuide !== 0)) return;
    guidePhone.classList.toggle('is-paused', document.hidden || demoPaused);
    if (demoPage === 'support') syncGoldenRulesVideo(getGoldenRulesVisualTime());
    if (narrationRequested && demoNarration) {
      if (document.hidden) {
        demoNarration.pause();
        pauseDemoBgm();
        openingDemoVideo?.pause();
        cancelNarrationFrame();
        setNarrationState('paused');
      } else if (!demoPaused && !demoNarration.ended) {
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
    if (!narrationRequested && demoMode === 'sequence' && !demoPaused) {
      if (document.hidden) clearSequenceTimer({ preserve: true });
      else scheduleSequenceAdvance({ reset: false });
    }
  });
  updateDemoPageButtons();
  updateDemoButton();
  updateNarrationButton();

  if (goldenRulesVideo) {
    enforceGoldenRulesMute();
    goldenRulesVideo.addEventListener('volumechange', enforceGoldenRulesMute);
    goldenRulesVideo.addEventListener('error', () => {
      goldenRulesPlaybackBlocked = true;
      goldenRulesVideoShell?.setAttribute('data-playback', 'unavailable');
      console.warn('골든룰스11 영상을 불러오지 못했습니다.', goldenRulesVideo.error);
    });
  }

  openingDemoVideo?.addEventListener('ended', () => {
    // The narration is intentionally longer than the eight-second video.
    // Keep the final frame visible until the opening voice track ends.
  });

  demoNarration?.addEventListener('ended', () => {
    const token = Number(demoNarration.dataset.runToken);
    if (!narrationRequested || token !== narrationRunToken || demoPaused || document.hidden) return;
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

  demoBgm?.addEventListener('error', () => {
    console.warn('배경음 파일을 불러오지 못했습니다.', demoBgm.error);
    stopDemoBgm({ reset: false });
  });

  demoNarration?.addEventListener('error', () => {
    if (!narrationRequested || !demoNarration.currentSrc) return;
    handleNarrationFailure(demoNarration.error || new Error('내레이션 파일을 불러오지 못했습니다.'), narrationRunToken);
  });

  const video = $('#promoVideo');
  const videoToggle = $('#videoToggle');
  const updateVideoButton = () => {
    if (!video || !videoToggle) return;
    const paused = video.paused;
    videoToggle.innerHTML = `<span class="video-icon">${paused ? '▶' : 'Ⅱ'}</span> ${paused ? '영상 재생' : '영상 일시정지'}`;
  };
  videoToggle?.addEventListener('click', async () => {
    if (!video) return;
    try {
      if (video.paused) await video.play();
      else video.pause();
    } catch (error) {
      console.warn('영상 재생을 시작하지 못했습니다.', error);
    }
    updateVideoButton();
  });
  video?.addEventListener('play', updateVideoButton);
  video?.addEventListener('pause', updateVideoButton);
  if (reduceMotion && video) video.pause();
  updateVideoButton();

  const year = $('#year');
  if (year) year.textContent = String(new Date().getFullYear());
})();
