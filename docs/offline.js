/* Офлайн: регистрация service worker и мягкая плашка «нет сети». Ничего не блокирует, любая ошибка молча игнорируется. */
(function () {
  var T = {
    ru: { off: 'Нет сети. Показана сохранённая копия', on: 'Сеть вернулась', ready: 'Теперь приглашение открывается без интернета' },
    uz: { off: 'Tarmoq yo\u2018q. Saqlangan nusxa ko\u2018rsatilmoqda', on: 'Tarmoq qaytdi', ready: 'Endi taklifnoma internetsiz ham ochiladi' },
    en: { off: 'You are offline. Showing the saved copy', on: 'Back online', ready: 'The invitation now opens without internet' },
    kk: { off: 'Желі жоқ. Сақталған көшірме көрсетілуде', on: 'Желі қайта қосылды', ready: 'Енді шақыру интернетсіз де ашылады' }
  };
  var safe = function (f) { return function () { try { return f.apply(this, arguments); } catch (_) {} }; };
  var tx = function (k) { var l = document.documentElement.lang || 'ru'; return (T[l] || T.ru)[k]; };
  var bar;
  var show = safe(function (msg, kind, ms) {
    if (!bar) {
      bar = document.createElement('div'); bar.id = 'tkNet'; bar.setAttribute('role', 'status'); bar.setAttribute('aria-live', 'polite');
      bar.style.cssText = 'position:fixed;left:50%;bottom:calc(14px + env(safe-area-inset-bottom,0px));transform:translate(-50%,24px);z-index:99998;max-width:calc(100vw - 28px);padding:10px 16px;border-radius:99px;font:600 12px/1.3 Manrope,system-ui,sans-serif;letter-spacing:.02em;text-align:center;color:#fff;background:rgba(33,26,19,.92);box-shadow:0 10px 30px -10px rgba(0,0,0,.5);opacity:0;pointer-events:none;transition:opacity .35s,transform .35s';
      document.body.appendChild(bar);
    }
    bar.textContent = msg; bar.style.background = kind === 'bad' ? 'rgba(160,82,45,.95)' : 'rgba(33,26,19,.92)';
    void bar.offsetWidth; bar.style.opacity = '1'; bar.style.transform = 'translate(-50%,0)';
    clearTimeout(bar._t); if (ms) bar._t = setTimeout(function () { bar.style.opacity = '0'; bar.style.transform = 'translate(-50%,24px)'; }, ms);
  });
  window.addEventListener('offline', safe(function () { show(tx('off'), 'bad', 0); }));
  window.addEventListener('online', safe(function () { show(tx('on'), 'ok', 2200); }));
  if (navigator.onLine === false) window.addEventListener('load', safe(function () { show(tx('off'), 'bad', 0); }));
  if (!('serviceWorker' in navigator) || !/^https?:$/.test(location.protocol)) return;
  var first = !navigator.serviceWorker.controller;
  window.addEventListener('load', safe(function () {
    var base = document.baseURI.replace(/[?#].*$/, '').replace(/[^\/]*$/, '');
    navigator.serviceWorker.register(base + 'sw.js', { scope: base }).then(function (r) {
      navigator.serviceWorker.addEventListener('controllerchange', safe(function () { if (first) { first = false; show(tx('ready'), 'ok', 3500); } }));
    }).catch(function () {});
  }));
})();
