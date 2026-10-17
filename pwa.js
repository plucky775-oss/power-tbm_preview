(() => {
  'use strict';

  const localDevelopment = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  const canRegister = window.isSecureContext || localDevelopment;
  if (!('serviceWorker' in navigator) || !canRegister) return;

  window.addEventListener('load', async () => {
    try {
      // Installing the TV offline cache downloads the entire tour plus all
      // backgrounds. Do not compete with the first streamed splash/weather run.
      const media = window.PowerTBMTV?.enabled && window.PowerTBMTV.media;
      if (media) await new Promise(resolve => {
        const events = ['progress', 'canplaythrough', 'ended', 'error'];
        const check = event => {
          const ranges = media.buffered;
          const fullyBuffered = Number.isFinite(media.duration) && media.duration > 0
            && ranges && ranges.length === 1 && ranges.start(0) < .1
            && ranges.end(0) >= media.duration - .1;
          if (!fullyBuffered && event?.type !== 'ended' && !media.ended && !media.error) return;
          events.forEach(event => media.removeEventListener(event, check));
          resolve();
        };
        events.forEach(event => media.addEventListener(event, check));
        check();
      });
      const workerUrl = window.PowerTBMTV?.enabled ? './sw.js?tv=1' : './sw.js';
      const registration = await navigator.serviceWorker.register(workerUrl, {
        scope: './',
        updateViaCache: 'none'
      });
      await navigator.serviceWorker.ready;
      document.documentElement.dataset.offlineReady = 'true';
      window.dispatchEvent(new CustomEvent('power-tbm:offline-ready'));
      registration.update().catch(() => {});
    } catch (error) {
      console.warn('오프라인 사용 준비를 완료하지 못했습니다.', error);
    }
  });
})();
