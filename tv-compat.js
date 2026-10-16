/* webOS uses one media pipeline. Keep video, narration and music in one file. */
(() => {
  'use strict';
  const params = new URLSearchParams(location.search);
  const enabled = !params.has('frame') && (params.get('tv') === '1' ||
    (params.get('tv') !== '0' && /Web0S|webOS|NetCast|LG Browser|SmartTV/i.test(navigator.userAgent)));
  const api = window.PowerTBMTV = { enabled };
  if (!enabled) {
    document.querySelectorAll('[data-demo-src]').forEach(image => { image.src = image.dataset.demoSrc; });
    document.querySelectorAll('[data-demo-poster]').forEach(media => { media.poster = media.dataset.demoPoster; });
    document.querySelectorAll('[data-standard-preload]').forEach(media => {
      media.preload = media.dataset.standardPreload;
    });
    return;
  }
  document.documentElement.classList.add('tbm-tv');

  const original = document.getElementById('demoNarration');
  const media = document.createElement('video');
  media.id = 'demoNarration';
  media.className = 'tv-media-player';
  media.preload = 'none';
  media.playsInline = true;
  media.setAttribute('playsinline', '');
  media.setAttribute('aria-hidden', 'true');
  media.tabIndex = -1;
  original.replaceWith(media);
  // Do not reparent the active player during playback: it can reset TV decoding.
  document.body.append(media);

  document.querySelectorAll('video').forEach(video => {
    if (video === media || video.id === 'demoRecordPreview') return;
    const id = video.id;
    const placeholder = document.createElement('img');
    placeholder.id = id;
    placeholder.className = video.className + ' tv-video-placeholder';
    const poster = video.dataset.demoPoster || video.getAttribute('poster') || '';
    placeholder.dataset.demoSrc = poster;
    placeholder.setAttribute('data-demo-src', poster);
    if (video.dataset.cinematicPage) placeholder.dataset.cinematicPage = video.dataset.cinematicPage;
    placeholder.alt = '';
    video.pause();
    video.removeAttribute('src');
    video.querySelectorAll('source').forEach(source => source.remove());
    video.load();
    video.replaceWith(placeholder);
  });
  const bgm = document.getElementById('demoBgm');
  bgm.pause();
  bgm.removeAttribute('src');
  bgm.load();
  bgm.remove();

  // The original screenshots can occupy hundreds of MB when all chapters
  // decode together. Keep only the current chapter's scaled copies attached.
  const imageFor = source => /^assets\/(?:screens\/guide|safety4cut|background|video|closing)\/.+\.(?:png|jpe?g|webp)$/i.test(source)
    ? source.replace('assets/', 'assets/tv-v100/images/').replace(/\.[^.]+$/, '.webp') : source;
  const images = [...document.querySelectorAll('[data-demo-src]')];
  const pageFor = image => {
    if (image.dataset.cinematicPage) return image.dataset.cinematicPage === 'meeting' ? ['meeting', 'safety'] : [image.dataset.cinematicPage];
    if (image.id === 'guideImage') return ['weather', 'manual'];
    if (image.closest('#weatherDemo, .demo-explanations, .typhoon-compare')) return ['weather'];
    if (image.closest('#meetingDemo, .meeting-explanations')) return ['meeting'];
    if (image.closest('#safetyDemo, .safety-explanations')) return ['safety'];
    if (image.closest('#supportDemo, .support-explanations')) return ['support'];
    if (image.closest('#closingDemo, .closing-explanation')) return ['closing'];
    if (image.id === 'openingDemoVideo' || image.closest('#launchIntro, .cinematic-backdrop, .opening-explanation')) return ['intro'];
    return [];
  };
  let imagePage = '';
  const syncImage = image => {
    const pages = pageFor(image);
    if (!pages.length || pages.includes(imagePage)) {
      const source = imageFor(image.dataset.demoSrc);
      if (image.getAttribute('src') !== source) image.src = source;
    } else if (image.getAttribute('src')) image.removeAttribute('src');
  };
  api.setImage = (image, source) => {
    image.dataset.demoSrc = source;
    syncImage(image);
  };
  api.setPage = page => {
    if (imagePage === page) return;
    imagePage = page;
    images.forEach(syncImage);
  };
  api.setPage('intro');

  let target = null;
  let layoutFrame = 0;
  let parked = false;
  const park = () => {
    target = null;
    if (parked) return;
    parked = true;
    // Keep a small, in-viewport surface; display:none can suspend TV video.
    Object.assign(media.style, { left: '0px', top: '0px', width: '2px', height: '2px', borderRadius: '0', zIndex: '0' });
    media.dataset.surface = 'audio';
  };
  const layout = () => {
    layoutFrame = 0;
    if (!target) return;
    const box = target.getBoundingClientRect();
    if (box.width < 1 || box.height < 1) return;
    Object.assign(media.style, {
      left: `${box.left}px`, top: `${box.top}px`, width: `${box.width}px`, height: `${box.height}px`,
      borderRadius: getComputedStyle(target).borderRadius, zIndex: '15'
    });
  };
  const scheduleLayout = () => {
    if (!layoutFrame) layoutFrame = requestAnimationFrame(layout);
  };
  api.present = (page, segment, visualTime) => {
    const next = page === 'intro' ? document.getElementById('openingDemoVideo') :
      segment.id === '08-safety4cut-example' ? document.getElementById('safetyExample') :
      page === 'support' && visualTime >= 26100 && visualTime < 32600 ? document.getElementById('goldenRulesVideo') : null;
    if (!next) { park(); return; }
    if (next === target) return;
    target = next;
    parked = false;
    media.dataset.surface = page;
    media.style.objectFit = page === 'intro' ? 'cover' : 'contain';
    layout();
    scheduleLayout();
  };
  api.park = park;
  api.sourceFor = segment => segment.id === '08-safety4cut-example'
    ? segment.src : `assets/tv-v99/${segment.id}.mp4`;
  api.media = media;
  park();
  window.addEventListener('resize', scheduleLayout, { passive: true });
  window.addEventListener('scroll', scheduleLayout, { passive: true });
  document.addEventListener('fullscreenchange', scheduleLayout);
  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(scheduleLayout);
    ['openingDemoVideo', 'safetyExample', 'goldenRulesVideo', 'tourStage'].forEach(id => observer.observe(document.getElementById(id)));
  }
})();
