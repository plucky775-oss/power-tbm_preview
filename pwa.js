(() => {
  'use strict';

  const localDevelopment = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  const canRegister = window.isSecureContext || localDevelopment;
  if (!('serviceWorker' in navigator) || !canRegister) return;

  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('./sw.js', {
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
