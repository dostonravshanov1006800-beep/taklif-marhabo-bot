/* Заставка-занавес. Подключается в i.html; включается флагом cu=1 в данных приглашения.
   Любая ошибка здесь не должна блокировать приглашение: в конце всегда вызывается finish(). */
(function () {
  'use strict';
  var H = document.documentElement;
  var RM = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var TXT = {
    ru: { t: 'Вас ждёт приглашение', b: 'Нажмите, чтобы открыть', s: 'Пропустить' },
    uz: { t: 'Sizni taklifnoma kutmoqda', b: 'Ochish uchun bosing', s: "O'tkazib yuborish" },
    en: { t: 'An invitation awaits you', b: 'Tap to open', s: 'Skip' },
    kk: { t: 'Сізді шақыру күтіп тұр', b: 'Ашу үшін басыңыз', s: 'Өткізу' }
  };
  var VEIL = { gold: 'rgba(70,48,18,.34)', rose: 'rgba(110,40,60,.34)', cloud: 'rgba(40,60,90,.30)', ivory: 'rgba(80,60,30,.28)', velvet: 'rgba(60,10,35,.55)', green: 'rgba(15,55,40,.50)', midnight: 'rgba(8,12,40,.62)' };

  window.__curtainInit = function (D, theme, lang, base) {
    try {
      if (!D || D.cu !== 1 || RM) return;
      if (D.t !== 'wedding' && D.t !== 'nikah' && D.t !== 'nikoh') return; // заставка только для свадьбы и никаха
      if (window.__PREVIEW || location.hash.replace(/^#\/?/, '') === 'preview') return; // предпросмотр владельца без заставки (iframe самого Telegram не считается предпросмотром)
      var key = 'curtain_' + (D.i || (D.a || '') + (D.b || ''));
      try { if (sessionStorage.getItem(key) === '1') return; } catch (_) {}
      var L = TXT[lang] || TXT.ru;
      var root = document.createElement('div');
      root.id = 'cur'; root.setAttribute('role', 'button'); root.tabIndex = 0; root.setAttribute('aria-label', L.b);
      root.style.setProperty('--cx', VEIL[theme] || VEIL.gold);
      root.innerHTML =
        '<img class="cp" src="' + base + 'brand/curtain_poster.jpg" alt="" decoding="async">' +
        '<video class="cv" muted playsinline webkit-playsinline preload="none" poster="' + base + 'brand/curtain_poster.jpg" aria-hidden="true"></video>' +
        '<div class="cx"></div><div class="cd"></div>' +
        '<div class="ct"><b>' + L.t + '</b><span>' + L.b + '</span></div>' +
        '<button type="button" class="sk">' + L.s + '</button>';
      H.classList.add('curtain-on');
      document.body.appendChild(root);

      var v = root.querySelector('video'), done = false, started = false, tFail = 0, tEnd = 0;
      function finish() {
        if (done) return; done = true;
        clearTimeout(tFail); clearTimeout(tEnd);
        try { sessionStorage.setItem(key, '1'); } catch (_) {}
        root.classList.add('fade'); H.classList.add('curtain-rev');
        setTimeout(function () { try { v.pause(); v.removeAttribute('src'); v.load(); root.remove(); } catch (_) {} H.classList.remove('curtain-on', 'curtain-rev'); }, 1200);
      }
      function start() {
        if (started || done) return; started = true;
        try { navigator.vibrate && navigator.vibrate(14); } catch (_) {}
        root.classList.add('play');
        v.src = base + 'brand/curtain.mp4';
        // запасной выход: видео не пошло (блок автоплея, нет сети) -> плавно открываем приглашение
        tFail = setTimeout(function () { if (!(v.currentTime > 0.2)) finish(); }, 3500);
        v.addEventListener('timeupdate', function onT() {
          if (v.duration && v.currentTime >= v.duration - 1.7) { v.removeEventListener('timeupdate', onT); root.classList.add('dim'); tEnd = setTimeout(finish, 900); }
        });
        v.addEventListener('ended', finish); v.addEventListener('error', finish);
        var p = v.play(); if (p && p.catch) p.catch(finish);
      }
      root.addEventListener('click', function (e) { if (e.target.closest('.sk')) { finish(); return; } start(); });
      root.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); start(); } if (e.key === 'Escape') finish(); });
      setTimeout(function () { try { root.focus({ preventScroll: true }); } catch (_) {} }, 50);
    } catch (e) { H.classList.remove('curtain-on', 'curtain-rev'); var c = document.getElementById('cur'); if (c) c.remove(); }
  };
})();
