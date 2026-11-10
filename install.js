'use strict';

(() => {
  const button = document.querySelector('#install-button');
  const dialog = document.querySelector('#install-help');
  const steps = document.querySelector('#install-steps');
  const offlineInfo = document.querySelector('#offline-info');
  const displayMode = window.matchMedia('(display-mode: standalone)');
  const isAppleMobile = /iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  let installPrompt = null;
  let installed = false;

  function updateButton() {
    button.hidden = installed || displayMode.matches || navigator.standalone === true;
  }

  function showHelp() {
    if (isAppleMobile) {
      steps.textContent = 'لینک رو در Safari باز کن. از منوی اشتراک‌گذاری (Share)، «افزودن به صفحهٔ اصلی» (Add to Home Screen) رو بزن. اگر «Open as Web App» رو دیدی، روشنش کن و Add رو بزن.';
    } else if (/Android/i.test(navigator.userAgent)) {
      steps.textContent = 'لینک رو در Chrome باز کن. از منوی سه‌نقطه، «نصب برنامه» یا «افزودن به صفحهٔ اصلی» رو انتخاب کن و نصب رو تأیید کن.';
    } else {
      steps.textContent = 'همین لینک رو روی گوشی در Chrome اندروید یا Safari آیفون باز کن و «نصب ماه‌گل» رو بزن.';
    }
    dialog.showModal();
  }

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    installPrompt = event;
    updateButton();
  });
  window.addEventListener('appinstalled', () => {
    installPrompt = null;
    installed = true;
    if (dialog.open) dialog.close();
    updateButton();
  });
  displayMode.addEventListener?.('change', updateButton);
  button.addEventListener('click', async () => {
    if (!installPrompt) {
      showHelp();
      return;
    }
    const prompt = installPrompt;
    installPrompt = null;
    try {
      await prompt.prompt();
      await prompt.userChoice;
    } catch {
      showHelp();
    }
  });

  updateButton();
  if (window.isSecureContext && 'serviceWorker' in navigator) {
    offlineInfo.textContent = 'برای اولین بار تا آماده شدن نسخهٔ آفلاین، اینترنت رو روشن نگه دار.';
    navigator.serviceWorker.register('./sw.js', {scope: './', updateViaCache: 'none'})
      .then(() => navigator.serviceWorker.ready)
      .then(() => { offlineInfo.textContent = 'تقویم و دفتر برای استفادهٔ آفلاین آماده‌ان.'; })
      .catch(() => { offlineInfo.textContent = 'نسخهٔ آفلاین آماده نشد. اینترنت رو بررسی کن و صفحه رو دوباره باز کن.'; });
  } else {
    offlineInfo.textContent = 'برای نصب و استفادهٔ آفلاین، لینک HTTPS برنامه رو در مرورگر اصلی گوشی باز کن.';
  }
})();
