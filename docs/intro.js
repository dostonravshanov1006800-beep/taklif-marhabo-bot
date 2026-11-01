/* Заставки-вступления: seal, env, gift, door, book. Включаются полем cv в данных приглашения.
   Занавес (cv=curtain или старое cu=1) живёт в curtain.js. Любая ошибка здесь не должна блокировать приглашение. */
(function () {
  'use strict';
  var H = document.documentElement;
  var RM = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var KINDS = ['seal', 'env', 'gift', 'door', 'book'];
  var TXT = {
    ru: { b: 'Нажмите, чтобы открыть', s: 'Пропустить', t: 'Вас ждёт приглашение' },
    uz: { b: 'Ochish uchun bosing', s: "O'tkazib yuborish", t: 'Sizni taklifnoma kutmoqda' },
    en: { b: 'Tap to open', s: 'Skip', t: 'An invitation awaits you' },
    kk: { b: 'Ашу үшін басыңыз', s: 'Өткізу', t: 'Сізді шақыру күтіп тұр' }
  };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  window.__introKinds = KINDS;

  window.__introInit = function (D, th, lang, onDone) {
    var fin0 = function () { try { onDone && onDone(); } catch (_) {} };
    try {
      var kind = D && D.cv;
      if (!kind || KINDS.indexOf(kind) < 0 || RM) return fin0();
      if (window.__PREVIEW || location.hash.replace(/^#\/?/, '') === 'preview') return fin0();
      var key = 'intro_' + (D.i || (D.a || '') + (D.b || ''));
      try { if (sessionStorage.getItem(key) === '1') return fin0(); } catch (_) {}
      var L = TXT[lang] || TXT.ru;
      var names = esc(D.a || '') + (D.b ? ' &amp; ' + esc(D.b) : '');
      var root = document.createElement('div');
      root.id = 'intro'; root.className = 'iv-' + kind; root.setAttribute('role', 'button'); root.tabIndex = 0; root.setAttribute('aria-label', L.b);
      if (th) { root.style.setProperty('--ib', th.base || '#1b1510'); root.style.setProperty('--it', th.ink || '#fff'); root.style.setProperty('--ia', th.accent || '#d8b24a'); }
      var body = '';
      if (kind === 'seal') body = '<div class="st"><div class="wax">' + esc((D.a || 'M').charAt(0).toUpperCase()) + '</div></div>';
      else if (kind === 'env') body = '<div class="st"><div class="ev"><div class="cd2"></div><div class="fl"></div><div class="sl"></div></div></div>';
      else if (kind === 'gift') { var sp = ''; for (var i = 0; i < 12; i++) { var a = (i / 12) * 6.283; sp += '<i class="sp" style="left:50%;top:40%;--x:' + Math.round(Math.cos(a) * 110) + 'px;--y:' + Math.round(Math.sin(a) * 110 - 40) + 'px"></i>'; } body = '<div class="st"><div class="gb"><div class="gx"></div><div class="gl"></div>' + sp + '</div></div>'; }
      else if (kind === 'door') body = '<div class="gl2"></div><div class="dr l"></div><div class="dr r"></div>';
      else if (kind === 'book') body = '<div class="st"><div class="bk"><div class="bp"></div><div class="bc"><div class="nm">' + names + '</div></div></div></div>';
      var nmEl = (kind === 'book') ? '' : '<div class="nm" style="' + (kind === 'door' ? 'z-index:4;top:42%' : 'top:12%') + '">' + names + '</div>';
      root.innerHTML = body + nmEl + '<div class="it"><b>' + L.t + '</b><span>' + L.b + '</span></div><button type="button" class="sk">' + L.s + '</button>';
      H.classList.add('intro-on'); document.body.appendChild(root);

      var done = false, started = false, tEnd = 0;
      function finish() {
        if (done) return; done = true; clearTimeout(tEnd);
        try { sessionStorage.setItem(key, '1'); } catch (_) {}
        root.classList.add('out'); fin0();
        setTimeout(function () { try { root.remove(); } catch (_) {} H.classList.remove('intro-on'); }, 1000);
      }
      function start() {
        if (started || done) return; started = true;
        try { navigator.vibrate && navigator.vibrate(14); } catch (_) {}
        root.classList.add('play');
        tEnd = setTimeout(finish, kind === 'door' ? 1500 : 1700);
      }
      root.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('.sk')) { finish(); return; } start(); });
      root.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); start(); } if (e.key === 'Escape') finish(); });
      setTimeout(function () { try { root.focus({ preventScroll: true }); } catch (_) {} }, 50);
      setTimeout(function () { if (!started && !done) { /* гость не нажал: остаёмся на заставке, но ничего не блокируем навсегда */ } }, 0);
      setTimeout(function () { if (!done) finish(); }, 45000); // страховка: через 45 с заставка уходит сама
    } catch (e) { try { var c = document.getElementById('intro'); if (c) c.remove(); H.classList.remove('intro-on'); } catch (_) {} fin0(); }
  };
})();
