/* Background, phone clips and audio share ONE continuous file and decoder. */
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

  const timeline = window.PowerTBMTVTimeline;
  const entryFor = segment => timeline.segments.find(entry => entry.id === segment.id);
  let pendingStart = null;
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

  // Follow media time, not a timer: buffering must not consume the fade before
  // a word is heard. Keep the beginning audible and preserve the mute choice.
  let voiceFadeStart = 0;
  const beginVoiceFade = () => {
    voiceFadeStart = media.currentTime;
    media.volume = .2;
  };
  media.addEventListener('play', beginVoiceFade);
  media.addEventListener('playing', beginVoiceFade);
  const softenVoiceEntry = segment => {
    const elapsed = Math.max(0, Math.min(api.localTime(segment), media.currentTime - voiceFadeStart));
    const volume = .2 + .8 * Math.min(1, elapsed / .35);
    if (Math.abs(media.volume - volume) > .005) media.volume = volume;
  };

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

  // Two small drawing surfaces read rectangles from the SAME decoded frame.
  // No video cloning, captureStream, pixel readback or full-screen canvas buffer.
  const backdrop = document.getElementById('cinematicBackdrop');
  const background = document.createElement('canvas');
  background.id = 'tvBackdrop';
  background.className = 'cinematic-backdrop-video';
  background.width = timeline.surfaces.background[2];
  background.height = timeline.surfaces.background[3];
  background.setAttribute('aria-hidden', 'true');
  backdrop.append(background);
  const phone = document.createElement('canvas');
  phone.id = 'tvPhoneVideo';
  phone.width = 480;
  phone.height = 1040;
  phone.hidden = true;
  phone.setAttribute('aria-hidden', 'true');
  document.querySelector('.guide-media').append(phone);
  const backgroundContext = background.getContext('2d', { alpha: false });
  const phoneContext = phone.getContext('2d', { alpha: false });
  let foregroundVisible = false;
  let backgroundPaused = true;
  let frame = 0;
  let lastBackgroundTime = -Infinity;
  let lastPhoneTime = -1;
  let backgroundInterval = 1 / 15;
  let drawingFailed = false;
  // Keep one constant in-viewport native surface under the page. Resizing or
  // reparenting the decoder at splash/chapter boundaries used to stall webOS.
  Object.assign(media.style, { left: '0px', top: '0px', width: '240px', height: '616px', zIndex: '-1' });
  const draw = (context, surface, rectangle) => {
    if (!context) throw new Error('TV canvas is unavailable');
    context.drawImage(media, ...rectangle, 0, 0, surface.width, surface.height);
  };
  const paint = () => {
    if (drawingFailed || document.hidden || media.readyState < 2 || media.seeking || pendingStart !== null) return;
    const time = media.currentTime;
    try {
      if (!backgroundPaused && (Math.abs(time - lastBackgroundTime) >= backgroundInterval)) {
        draw(backgroundContext, background, timeline.surfaces.background);
        lastBackgroundTime = time;
        backdrop.classList.add('tv-background-ready');
      }
      if (foregroundVisible && Math.floor(time * 30) !== lastPhoneTime) {
        draw(phoneContext, phone, timeline.surfaces.phone);
        lastPhoneTime = Math.floor(time * 30);
        phone.hidden = false;
      }
    } catch (error) {
      drawingFailed = true;
      phone.hidden = true;
      backdrop.classList.remove('tv-background-ready');
      console.warn('TV 영상 화면을 표시하지 못했습니다.', error);
    }
  };
  const stopFrames = () => {
    if (frame) window.cancelAnimationFrame(frame);
    frame = 0;
  };
  const startFrames = () => {
    if (frame || media.paused || media.ended || document.hidden || drawingFailed) return;
    frame = window.requestAnimationFrame(() => {
      frame = 0;
      paint();
      startFrames();
    });
  };
  const invalidateFrames = () => {
    lastBackgroundTime = -Infinity;
    lastPhoneTime = -1;
    phone.hidden = true;
    backdrop.classList.remove('tv-background-ready');
  };
  media.addEventListener('play', startFrames);
  media.addEventListener('playing', startFrames);
  media.addEventListener('pause', () => { paint(); stopFrames(); });
  media.addEventListener('ended', stopFrames);
  media.addEventListener('seeking', invalidateFrames);
  media.addEventListener('seeked', () => { paint(); startFrames(); });
  media.addEventListener('loadeddata', () => { paint(); startFrames(); });
  media.addEventListener('error', () => { invalidateFrames(); stopFrames(); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopFrames();
    else startFrames();
  });
  // A stalled clock must not permanently discard moving footage. Reduce only
  // drawing frequency; the bounded media retry remains in app.js.
  api.reduceRenderLoad = () => { backgroundInterval = 1 / 10; };
  api.syncBackground = (page, { paused }) => {
    backgroundPaused = paused;
    // Posters remain behind the canvas while the shared stream buffers.
    if (!paused) { paint(); startFrames(); }
  };
  api.present = (page, segment, visualTime) => {
    softenVoiceEntry(segment);
    const visible = page === 'intro' || segment.id === '08-safety4cut-example' ||
      (segment.id === '04-safety-tools' && visualTime >= 26100 && visualTime < 32600);
    if (foregroundVisible !== visible) {
      foregroundVisible = visible;
      lastPhoneTime = -1;
      phone.hidden = true;
    }
    media.dataset.surface = visible ? page : 'audio';
    paint();
    startFrames();
  };
  api.park = () => {
    foregroundVisible = false;
    phone.hidden = true;
    media.dataset.surface = 'audio';
  };
  api.media = media;
  api.park();
  // Buffer while the sound-choice gate is visible. Reuse this element/source
  // on start and at every automatic chapter boundary.
  media.src = timeline.src;
  media.load();
})();
