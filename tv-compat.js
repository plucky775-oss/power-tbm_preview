/* Narration and foreground clips share one continuous file; one muted video
   supplies the current chapter's lightweight moving background. */
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
  // A screenshot and its highlights share readiness, independently of the
  // narration clock. Late loads must not reveal overlays on a blank phone.
  const imageReadiness = new Map();
  images.filter(image => image.dataset.demoImage).forEach(image => {
    const views = [...document.querySelectorAll(`[data-demo-image="${image.dataset.demoImage}"]`)];
    let request = 0;
    const clear = () => {
      request++;
      views.forEach(view => view.classList.remove('demo-image-ready'));
    };
    const prepare = () => {
      const source = image.getAttribute('src');
      if (!source || !image.complete || !image.naturalWidth) return;
      const token = request;
      const reveal = () => {
        if (token !== request || image.getAttribute('src') !== source || !image.complete || !image.naturalWidth) return;
        views.forEach(view => view.classList.add('demo-image-ready'));
      };
      if (typeof image.decode !== 'function') reveal();
      else image.decode().then(reveal, () => { /* Leave failed screenshots and overlays hidden. */ });
    };
    image.addEventListener('load', prepare);
    image.addEventListener('error', clear);
    imageReadiness.set(image, { clear, prepare });
  });
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
    const preload = (image.dataset.demoPreload || '').split(/\s+/);
    const prepareWeather = enabled && imagePage === 'intro' && pages.includes('weather');
    if (!pages.length || pages.includes(imagePage) || preload.includes('true') || preload.includes(imagePage) || prepareWeather) {
      const source = imageFor(image.dataset.demoSrc);
      if (image.getAttribute('src') !== source) {
        imageReadiness.get(image)?.clear();
        image.decoding = 'async';
        image.src = source;
        if (prepareWeather && typeof image.decode === 'function') image.decode().catch(() => {});
        imageReadiness.get(image)?.prepare();
      }
    } else if (image.getAttribute('src')) {
      imageReadiness.get(image)?.clear();
      image.removeAttribute('src');
    }
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

  const timelineForLanguage = language => language === 'en'
    ? window.PowerTBMEnglishNarration.tv : window.PowerTBMTVTimeline;
  let timeline = timelineForLanguage(window.PowerTBMLanguage?.get());
  const entryFor = segment => timeline.segments.find(entry => entry.id === segment.id);
  let pendingStart = null;
  api.setLanguage = language => {
    const next = timelineForLanguage(language);
    if (next === timeline) return;
    media.pause();
    timeline = next;
    pendingStart = null;
    media.dataset.segment = '';
    media.src = timeline.src;
    media.load();
  };
  const seekToChapter = () => {
    if (pendingStart === null) return;
    try {
      // Keep the first decoded frames when the prepared opening is already at
      // zero. An unnecessary seek can flush the native TV decoder's queue.
      if (Math.abs(media.currentTime - pendingStart) > .001) media.currentTime = pendingStart;
      pendingStart = null;
    } catch (_) { /* loadedmetadata will retry on older TV engines */ }
  };
  media.addEventListener('loadedmetadata', seekToChapter);
  api.select = segment => {
    // The launch gesture is part of the same stream as the opening narration.
    pendingStart = segment.id === '00-opening' ? 0 : entryFor(segment).start;
    if (media.getAttribute('src') !== timeline.src) {
      media.src = timeline.src;
      media.load();
    }
    if (media.readyState >= 1) seekToChapter();
  };
  // User-requested review only: reuse the continuous stream and native decoder.
  api.chapter = segment => entryFor(segment);
  api.seek = (segment, seconds) => {
    pendingStart = entryFor(segment).start + seconds;
    if (media.readyState >= 1) seekToChapter();
  };
  api.segmentAtTime = () => pendingStart !== null || media.seeking ? null :
    [...timeline.segments].reverse().find(entry => media.currentTime >= entry.start);
  api.localTime = segment => Math.max(0, media.currentTime - entryFor(segment).start);
  api.segmentEnded = id => media.currentTime >= entryFor({ id }).end - .001;
  api.inPrelude = () => media.currentTime < (timeline.preludeDuration || 0);
  api.bufferedAhead = () => {
    const time = media.currentTime;
    const ranges = media.buffered;
    for (let i = 0; i < ranges.length; i++) {
      if (ranges.start(i) <= time + .05 && ranges.end(i) > time) return ranges.end(i) - time;
    }
    return 0;
  };
  // Audio is normalized in the media files. A chapter-local volume ramp hid
  // the first syllable at every boundary and again after buffering/resume.
  media.volume = 1;

  const backgroundSources = {};
  document.querySelectorAll('video').forEach(video => {
    if (video === media || video.id === 'demoRecordPreview') return;
    if (video.dataset.cinematicPage) {
      const key = video.classList.contains('cinematic-backdrop-emergency') ? 'emergency' : video.dataset.cinematicPage;
      backgroundSources[key] = video.getAttribute('src') || video.querySelector('source')?.getAttribute('src');
    }
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

  // Reuse a single background element. Inactive chapters keep only posters,
  // so their original video elements cannot retain additional decoders.
  const backdrop = document.getElementById('cinematicBackdrop');
  const background = document.createElement('video');
  background.id = 'tvBackdrop';
  background.className = 'cinematic-backdrop-video';
  background.muted = background.defaultMuted = true;
  background.loop = true;
  background.playsInline = true;
  background.setAttribute('playsinline', '');
  background.setAttribute('webkit-playsinline', '');
  background.setAttribute('aria-hidden', 'true');
  background.preload = 'none';
  background.tabIndex = -1;
  background.hidden = true;
  backdrop.append(background);
  let backgroundRequest = 0;
  let backgroundPlayPending = false;
  let backgroundStartTimer = 0;
  const showBackground = () => {
    if (background.getAttribute('src') && background.readyState >= 2 && !background.error) {
      backdrop.classList.remove('tv-background-fallback');
      backdrop.classList.add('tv-background-ready');
    }
  };
  const failBackground = () => {
    background.dataset.playbackFailed = 'true';
    background.pause();
    backdrop.classList.remove('tv-background-ready');
  };
  background.addEventListener('loadeddata', showBackground);
  background.addEventListener('error', failBackground);
  // Some TVs cannot keep both video decoders advancing even though play()
  // succeeds. Release the optional decoder for this session if the main clock
  // stops; chapter changes must not immediately allocate it again.
  let backgroundReleased = false;
  api.releaseBackground = () => {
    if (backgroundReleased) return;
    backgroundReleased = true;
    window.clearTimeout(backgroundStartTimer);
    backgroundRequest++;
    backgroundPlayPending = false;
    if (background.getAttribute('src')) {
      background.pause();
      background.removeAttribute('src');
      background.load();
    }
    background.hidden = true;
    backdrop.classList.remove('tv-background-ready');
    backdrop.classList.add('tv-background-fallback');
  };
  api.syncBackground = (page, { paused, emergency = false }) => {
    window.clearTimeout(backgroundStartTimer);
    const key = page === 'safety' ? 'meeting' : page === 'support' && emergency ? 'emergency' : page;
    images.filter(image => image.dataset.cinematicPage).forEach(image => {
      const imageKey = image.classList.contains('cinematic-backdrop-emergency') ? 'emergency' : image.dataset.cinematicPage;
      image.classList.toggle('tv-fallback-active', imageKey === key);
    });
    if (backgroundReleased) return;
    const source = backgroundSources[key] || '';
    // First paint, screenshot decode, native video-plane change and a second
    // decoder used to happen together at the splash boundary. Let the main
    // clock advance first, with three seconds of contiguous narration ready.
    // HAVE_FUTURE_DATA alone can mean only a few frames on webOS.
    const entry = api.segmentAtTime();
    const canStart = entry && entry.page === page && media.currentTime - entry.start >= 1
      && api.bufferedAhead() >= Math.min(3, media.duration - media.currentTime)
      && media.readyState >= 3 && !media.paused && !document.hidden;
    if (source && (background.getAttribute('src') || '') !== source && (paused || !canStart)) {
      if (background.getAttribute('src')) {
        backgroundRequest++;
        backgroundPlayPending = false;
        background.pause();
        background.removeAttribute('src');
        background.load();
      }
      background.hidden = true;
      backdrop.classList.remove('tv-background-ready');
      backdrop.classList.add('tv-background-fallback');
      if (!paused && !document.hidden) {
        backgroundStartTimer = window.setTimeout(() => api.syncBackground(page, { paused, emergency }), 200);
      }
      return;
    }

    if ((background.getAttribute('src') || '') !== source) {
      backgroundRequest++;
      backgroundPlayPending = false;
      background.pause();
      backdrop.classList.remove('tv-background-ready');
      background.dataset.playbackFailed = 'false';
      if (source) background.src = source;
      else background.removeAttribute('src');
      background.load();
    }
    background.hidden = !source;
    if (!source || paused) {
      if (backgroundPlayPending || !background.paused) {
        backgroundRequest++;
        backgroundPlayPending = false;
        background.pause();
      }
      return;
    }
    if (background.error || background.dataset.playbackFailed === 'true') return;
    showBackground();
    if (!background.paused || backgroundPlayPending) return;
    const token = backgroundRequest;
    backgroundPlayPending = true;
    background.play().catch(error => {
      if (token !== backgroundRequest || error?.name === 'AbortError') return;
      failBackground();
      console.warn('배경영상 재생을 시작하지 못했습니다.', error);
    }).finally(() => { if (token === backgroundRequest) backgroundPlayPending = false; });
  };

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
    media.style.opacity = '1';
    media.dataset.surface = 'audio';
  };
  const layout = () => {
    layoutFrame = 0;
    if (!target) return;
    if (media.dataset.surface === 'prelude') {
      // The square button clip sits in the center of the portrait stream.
      // Keep it square at any TV orientation, without relying on object-fit.
      const side = Math.min(window.innerWidth, window.innerHeight);
      const height = side * timeline.height / timeline.width;
      Object.assign(media.style, { left: `${(window.innerWidth - side) / 2}px`,
        top: `${(window.innerHeight - height) / 2}px`, width: `${side}px`,
        height: `${height}px`, borderRadius: '0' });
      return;
    }
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
  api.presentPrelude = () => {
    // The native decoder can present the 3.5s splash frame before the next JS
    // callback. Fade the button and resize UNDER the opaque gate 400ms early;
    // never wait for the first splash frame to shrink the full-screen plane.
    const resizeAt = (timeline.preludeDuration || 0) - .4;
    if (media.currentTime >= resizeAt) {
      api.present('intro', { id: '00-opening' }, 0);
      return;
    }
    if (media.dataset.surface !== 'prelude') {
      target = document.getElementById('launchIntro');
      parked = false;
      media.dataset.surface = 'prelude';
      media.style.zIndex = '2001';
      layout();
    }
    const opacity = String(Math.min(1, (resizeAt - media.currentTime) / .57));
    if (media.style.opacity !== opacity) media.style.opacity = opacity;
  };
  api.present = (page, segment, visualTime) => {
    // Every embedded clip is precomposed into the same phone-sized frame.
    // Changing source dimensions or resizing the video plane interrupts webOS.
    const next = document.querySelector('.guide-media');
    if (!next) { park(); return; }
    const visible = page === 'intro' || segment.id === '08-safety4cut-example' ||
      (segment.id === '04-safety-tools' && visualTime >= 26100 && visualTime < 32600);
    const surface = visible ? page : 'audio';
    if (media.style.opacity !== '1') media.style.opacity = '1';
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
  // Buffer while the sound-choice gate is visible. Starting playback must reuse
  // this same element/source; no autoplay, extra decoder or JavaScript Blob.
  media.src = timeline.src;
  media.load();
  window.addEventListener('resize', scheduleLayout, { passive: true });
  window.addEventListener('scroll', scheduleLayout, { passive: true });
  document.addEventListener('fullscreenchange', scheduleLayout);
  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(scheduleLayout);
    observer.observe(document.querySelector('.guide-media'));
    observer.observe(document.getElementById('tourStage'));
  }
})();
