/* webOS uses one media pipeline. The entire tour shares one continuous file. */
(() => {
  'use strict';
  const params = new URLSearchParams(location.search);
  const enabled = !params.has('frame') && (params.get('tv') === '1' ||
    (params.get('tv') !== '0' && /Web0S|webOS|NetCast|LG Browser|SmartTV/i.test(navigator.userAgent)));
  const api = window.PowerTBMTV = { enabled };
  // The original screenshots can occupy hundreds of MB when all chapters
  // decode together. Attach only the current chapter; use scaled copies on TV.
  // Keep the single safety menu ready so selecting it does not show an empty phone.
  const imageFor = source => enabled && /^assets\/(?:screens\/guide|safety4cut|background|video|closing)\/.+\.(?:png|jpe?g|webp)$/i.test(source)
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
    if (!pages.length || pages.includes(imagePage) || image.dataset.demoPreload === 'true') {
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

  if (!enabled) {
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
  media.preload = 'auto';
  media.playsInline = true;
  media.setAttribute('playsinline', '');
  media.setAttribute('aria-hidden', 'true');
  media.tabIndex = -1;
  original.replaceWith(media);
  // Do not reparent the active player during playback: it can reset TV decoding.
  document.body.append(media);

  const timeline = window.PowerTBMTVTimeline;
  const entryFor = segment => timeline.segments.find(entry => entry.id === segment.id);
  let pendingStart = null;
  const seekToChapter = () => {
    if (pendingStart === null) return;
    try {
      media.currentTime = pendingStart;
      pendingStart = null;
    } catch (_) { /* loadedmetadata will retry on older TV engines */ }
  };
  media.addEventListener('loadedmetadata', seekToChapter);
  api.select = segment => {
    pendingStart = entryFor(segment).start;
    if (media.getAttribute('src') !== timeline.src) {
      media.src = timeline.src;
      media.load();
    }
    if (media.readyState >= 1) seekToChapter();
  };
  api.segmentAtTime = () => pendingStart !== null || media.seeking ? null :
    [...timeline.segments].reverse().find(entry => media.currentTime >= entry.start);
  api.localTime = segment => Math.max(0, media.currentTime - entryFor(segment).start);
  api.segmentEnded = id => media.currentTime >= entryFor({ id }).end - .001;

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
    images.push(placeholder);
    syncImage(placeholder);
  });
  const bgm = document.getElementById('demoBgm');
  bgm.pause();
  bgm.removeAttribute('src');
  bgm.load();
  bgm.remove();

  let target = null;
  let layoutFrame = 0;
  let parked = false;
  const park = () => {
    target = null;
    if (parked) return;
    parked = true;
    // Keep the existing decoded surface behind the page. Shrinking it to 2px
    // forced webOS to resize the native video plane at the next visible frame.
    if (!media.style.width) Object.assign(media.style, { left: '0px', top: '0px', width: '320px', height: '180px' });
    media.style.zIndex = '-1';
    media.dataset.surface = 'audio';
  };
  const layout = () => {
    layoutFrame = 0;
    if (!target) return;
    const box = target.getBoundingClientRect();
    if (box.width < 1 || box.height < 1) return;
    Object.assign(media.style, {
      left: `${box.left}px`, top: `${box.top}px`, width: `${box.width}px`, height: `${box.height}px`,
      borderRadius: getComputedStyle(target).borderRadius
    });
  };
  const scheduleLayout = () => {
    if (!layoutFrame) layoutFrame = requestAnimationFrame(layout);
  };
  api.present = (page, segment, visualTime) => {
    // Every embedded clip is precomposed into the same phone-sized frame.
    // Changing source dimensions or resizing the video plane interrupts webOS.
    const next = document.querySelector('.guide-media');
    if (!next) { park(); return; }
    const visible = page === 'intro' || segment.id === '08-safety4cut-example' ||
      (segment.id === '04-safety-tools' && visualTime >= 26100 && visualTime < 32600);
    const surface = visible ? page : 'audio';
    if (media.dataset.surface !== surface) {
      media.dataset.surface = surface;
      media.style.zIndex = visible ? '15' : '-1';
    }
    if (next === target) return;
    target = next;
    parked = false;
    layout();
    scheduleLayout();
  };
  api.park = park;
  api.media = media;
  park();
  window.addEventListener('resize', scheduleLayout, { passive: true });
  window.addEventListener('scroll', scheduleLayout, { passive: true });
  document.addEventListener('fullscreenchange', scheduleLayout);
  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(scheduleLayout);
    observer.observe(document.querySelector('.guide-media'));
    observer.observe(document.getElementById('tourStage'));
  }
})();
