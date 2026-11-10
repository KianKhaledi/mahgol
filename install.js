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


  const status = document.querySelector('#app-status');
  const checkButton = document.querySelector('#check-update');
  const applyButton = document.querySelector('#apply-update');
  let registration = null;
  let changingVersion = false;
  let checking = false;

  function showStatus(text) {
    status.textContent = text;
    offlineInfo.textContent = text;
  }
  function readyStatus() {
    if (registration?.waiting) {
      applyButton.hidden = false;
      showStatus('نسخهٔ تازه آماده‌ست. ثبت‌های باز رو ذخیره کن و «دریافت نسخهٔ تازه» رو بزن.');
    } else if (navigator.serviceWorker?.controller) {
      showStatus('برای استفادهٔ آفلاین آماده است.');
    }
  }
  function watchInstallation(worker) {
    if (!worker) return;
    worker.addEventListener('statechange', () => {
      if (worker.state === 'installed') readyStatus();
      if (worker.state === 'redundant') {
        showStatus('نسخهٔ تازه کامل دریافت نشد. با اتصال پایدار دوباره بررسی کن.');
      }
    });
  }
  async function checkUpdate() {
    if (!registration || checking) return;
    checking = true;
    checkButton.disabled = true;
    showStatus('در حال بررسی آپدیت؛ می‌تونی به استفاده از دفتر ادامه بدی.');
    const timeout = setTimeout(() => showStatus('سرور فعلاً پاسخ نداده. نسخهٔ ذخیره‌شده قابل استفاده است.'), 8000);
    try {
      await registration.update();
      if (registration.installing) showStatus('نسخهٔ تازه در حال دریافت است…');
      else readyStatus();
    } catch {
      showStatus('اتصال به سرور برقرار نشد. برای آپدیت دوباره با اتصال پایدار تلاش کن.');
    } finally {
      clearTimeout(timeout);
      checking = false;
      checkButton.disabled = false;
    }
  }
  applyButton.addEventListener('click', async () => {
    if (!registration?.waiting) return;
    if (document.querySelector('#dialog').open || document.querySelector('#install-help').open) {
      showStatus('اول فرم باز رو ذخیره کن یا ببند، بعد آپدیت رو بزن.');
      return;
    }
    applyButton.disabled = true;
    try {
      // Preserve both an unlocked diary and pending encrypted writes before reload.
      if (typeof state !== 'undefined' && state) await save();
      changingVersion = true;
      registration.waiting.postMessage({ type: 'ACTIVATE_UPDATE' });
    } catch {
      showStatus('ذخیرهٔ دفتر کامل نشد؛ قبل از آپدیت، فضای ذخیره‌سازی رو بررسی کن.');
      applyButton.disabled = false;
    }
  });
  checkButton.addEventListener('click', checkUpdate);

  updateButton();
  if (window.isSecureContext && 'serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (changingVersion) {
        location.reload();
        return;
      }
      readyStatus();
    });
    showStatus('برای اولین دریافت نسخهٔ آفلاین، اینترنت رو روشن نگه دار.');
    navigator.serviceWorker.register('./sw.js', { scope: './', updateViaCache: 'none' })
      .then(reg => {
        registration = reg;
        watchInstallation(reg.installing);
        reg.addEventListener('updatefound', () => watchInstallation(reg.installing));
        readyStatus();
        navigator.serviceWorker.ready.then(readyStatus);
      })
      .catch(() => showStatus('نسخهٔ آفلاین آماده نشد. اینترنت رو بررسی کن و صفحه رو دوباره باز کن.'));
    window.addEventListener('online', checkUpdate);
  } else {
    checkButton.hidden = true;
    showStatus('برای نصب و استفادهٔ آفلاین، لینک HTTPS برنامه رو در مرورگر اصلی گوشی باز کن.');
  }
})();
