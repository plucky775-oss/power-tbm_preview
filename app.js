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
  let currentGuide = 0;
  let guideChanging = false;

  const updateGuide = (nextIndex) => {
    if (!guideImage || guideChanging) return;
    const index = (nextIndex + guideData.length) % guideData.length;
    guideChanging = true;
    guidePhone?.classList.add('changing');
    const apply = () => {
      const item = guideData[index];
      currentGuide = index;
      guideImage.src = item.src;
      guideImage.width = item.width;
      guideImage.height = item.height;
      guideImage.alt = item.alt;
      if (guideIndex) guideIndex.textContent = `${String(index + 1).padStart(2, '0')} / ${String(guideData.length).padStart(2, '0')}`;
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
      window.setTimeout(() => { guideChanging = false; }, reduceMotion ? 0 : 240);
    };
    window.setTimeout(apply, reduceMotion ? 0 : 150);
  };

  guideTabs.forEach((tab, index) => tab.addEventListener('click', () => updateGuide(index)));
  $('#guidePrev')?.addEventListener('click', () => updateGuide(currentGuide - 1));
  $('#guideNext')?.addEventListener('click', () => updateGuide(currentGuide + 1));
  $('.tour-stage')?.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') updateGuide(currentGuide - 1);
    if (event.key === 'ArrowRight') updateGuide(currentGuide + 1);
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
