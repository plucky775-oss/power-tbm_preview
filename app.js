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
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const delay = Number(el.dataset.delay || 0);
        window.setTimeout(() => el.classList.add('is-visible'), delay);
        observer.unobserve(el);
      });
    }, { threshold: 0.13, rootMargin: '0px 0px -5% 0px' });
    revealItems.forEach((item) => revealObserver.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add('is-visible'));
  }

  const workflow = $('.workflow');
  if (workflow && 'IntersectionObserver' in window) {
    const workflowObserver = new IntersectionObserver((entries, observer) => {
      if (entries[0]?.isIntersecting) {
        workflow.classList.add('in-view');
        observer.disconnect();
      }
    }, { threshold: 0.25 });
    workflowObserver.observe(workflow);
  }

  const storyScreen = $('#storyScreen');
  const storyItems = $$('.story-list li');
  const storyData = [
    { src: 'assets/screens/meeting.png', alt: 'Power TBM 공종 선택 및 회의 진행 화면' },
    { src: 'assets/screens/ai.png', alt: 'Power TBM AI 상세검토 화면' },
    { src: 'assets/screens/sign.png', alt: 'Power TBM 전자서명 및 PDF 화면' }
  ];
  let storyIndex = 0;
  let storyTimer = null;
  const setStory = (index, restart = true) => {
    if (!storyScreen || !storyItems[index]) return;
    storyIndex = index;
    storyItems.forEach((item, i) => item.classList.toggle('active', i === index));
    storyScreen.style.opacity = '0';
    storyScreen.style.transform = 'scale(.985)';
    window.setTimeout(() => {
      storyScreen.src = storyData[index].src;
      storyScreen.alt = storyData[index].alt;
      storyScreen.style.opacity = '1';
      storyScreen.style.transform = 'none';
    }, reduceMotion ? 0 : 150);
    if (restart && !reduceMotion) startStoryTimer();
  };
  const startStoryTimer = () => {
    window.clearInterval(storyTimer);
    storyTimer = window.setInterval(() => setStory((storyIndex + 1) % storyData.length, false), 5200);
  };
  storyItems.forEach((item, index) => item.addEventListener('click', () => setStory(index)));
  if (storyScreen) {
    storyScreen.style.transition = 'opacity .25s ease, transform .25s ease';
    if (!reduceMotion) startStoryTimer();
  }

  const screenData = [
    {
      src: 'assets/screens/home.png',
      title: '현장 중심 홈',
      desc: '날씨·기상특보와 핵심 메뉴를 한눈에 확인합니다.',
      alt: 'Power TBM 홈 화면'
    },
    {
      src: 'assets/screens/meeting.png',
      title: '회의 진행',
      desc: '기본정보와 복수 공종, 보호구 및 핵심 확인사항을 순서대로 진행합니다.',
      alt: 'Power TBM 회의 진행 화면'
    },
    {
      src: 'assets/screens/ai.png',
      title: 'AI 상세검토',
      desc: '중점·주의·확인 항목과 안전대책을 검토하고 필요한 내용만 회의록에 반영합니다.',
      alt: 'Power TBM AI 상세검토 화면'
    },
    {
      src: 'assets/screens/sign.png',
      title: '원격전자서명',
      desc: '시공관리책임자와 작업자의 서명 상태를 확인하고 PDF 원본을 확정합니다.',
      alt: 'Power TBM 전자서명 화면'
    },
    {
      src: 'assets/screens/calendar.png',
      title: '회의록 캘린더',
      desc: '날짜별 원본 PDF를 다시 열고 필요한 기간을 ZIP으로 묶어 관리합니다.',
      alt: 'Power TBM 회의록 캘린더 화면'
    }
  ];
  const galleryImage = $('#galleryImage');
  const galleryPhone = $('.gallery-phone');
  const galleryIndex = $('#screenIndex');
  const galleryTitle = $('#screenTitle');
  const galleryDesc = $('#screenDesc');
  const thumbButtons = $$('.screen-thumbs button');
  let currentScreen = 0;
  let screenChanging = false;

  const updateGallery = (nextIndex) => {
    if (!galleryImage || screenChanging) return;
    const total = screenData.length;
    const index = (nextIndex + total) % total;
    screenChanging = true;
    galleryPhone?.classList.add('changing');
    window.setTimeout(() => {
      currentScreen = index;
      const data = screenData[index];
      galleryImage.src = data.src;
      galleryImage.alt = data.alt;
      if (galleryIndex) galleryIndex.textContent = `${String(index + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`;
      if (galleryTitle) galleryTitle.textContent = data.title;
      if (galleryDesc) galleryDesc.textContent = data.desc;
      thumbButtons.forEach((button, i) => {
        button.classList.toggle('active', i === index);
        button.setAttribute('aria-selected', String(i === index));
      });
      requestAnimationFrame(() => galleryPhone?.classList.remove('changing'));
      window.setTimeout(() => { screenChanging = false; }, reduceMotion ? 0 : 420);
    }, reduceMotion ? 0 : 190);
  };
  $('#screenPrev')?.addEventListener('click', () => updateGallery(currentScreen - 1));
  $('#screenNext')?.addEventListener('click', () => updateGallery(currentScreen + 1));
  thumbButtons.forEach((button, index) => button.addEventListener('click', () => updateGallery(index)));
  $('.screen-showcase')?.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') updateGallery(currentScreen - 1);
    if (event.key === 'ArrowRight') updateGallery(currentScreen + 1);
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

  if (!reduceMotion && window.matchMedia('(pointer:fine)').matches) {
    $$('[data-tilt]').forEach((device) => {
      device.addEventListener('pointermove', (event) => {
        const rect = device.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;
        device.style.setProperty('--tilt-x', `${(-y * 3).toFixed(2)}deg`);
        device.style.setProperty('--tilt-y', `${(x * 4).toFixed(2)}deg`);
      });
      device.addEventListener('pointerleave', () => {
        device.style.removeProperty('--tilt-x');
        device.style.removeProperty('--tilt-y');
      });
    });
  }

  const year = $('#year');
  if (year) year.textContent = String(new Date().getFullYear());
})();
