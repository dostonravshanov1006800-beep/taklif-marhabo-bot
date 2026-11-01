/* Заставки-вступления: seal, env, gift, door, book. Включаются полем cv в данных приглашения.
   Занавес (cv=curtain или старое cu=1) живёт в curtain.js. Любая ошибка здесь не должна блокировать приглашение. */
(function () {
  'use strict';
  var H = document.documentElement;
  var RM = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var KINDS = ['seal', 'env', 'gift', 'door', 'book', 'vmuhr', 'vnikoh'];
  var VID = { vmuhr: { src: 'media/intro/muhr.mp4', poster: 'media/intro/muhr_0.jpg', last: 'media/intro/muhr.jpg', at: 6.2 }, vnikoh: { src: 'media/intro/nikoh.mp4', poster: 'media/intro/nikoh_0.jpg', last: 'media/intro/nikoh.jpg', at: 7.0 } };
  var TXT = {
    ru: { b: 'Нажмите, чтобы открыть', s: 'Пропустить', t: 'Вас ждёт приглашение' },
    uz: { b: 'Ochish uchun bosing', s: "O'tkazib yuborish", t: 'Sizni taklifnoma kutmoqda' },
    en: { b: 'Tap to open', s: 'Skip', t: 'An invitation awaits you' },
    kk: { b: 'Ашу үшін басыңыз', s: 'Өткізу', t: 'Сізді шақыру күтіп тұр' }
  };
  var fmtDate = function (d, lang) { try { var m = String(d || '').match(/^(\d{4})-(\d{2})-(\d{2})/); if (!m) return ''; return new Date(+m[1], +m[2] - 1, +m[3]).toLocaleDateString({ ru: 'ru-RU', uz: 'uz-UZ', en: 'en-GB', kk: 'kk-KZ' }[lang] || 'ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }); } catch (_) { return ''; } };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  window.__introKinds = KINDS;

  /* Видео-заставки (Muhr/Nikoh), только свадьба и никах. Видео со звуком, имена и дата привязаны к кадрам: проявляются в нужную секунду и остаются на последнем кадре, затем всё плавно гаснет в приглашение. */
  function videoIntro(kind, D, th, lang, L, names, fin0) {
    var cfg = VID[kind], key = 'intro_' + (D.i || (D.a || '') + (D.b || ''));
    var base = document.baseURI.replace(/[?#].*$/, '').replace(/[^/]*$/, '');
    var root = document.createElement('div');
    root.id = 'intro'; root.className = 'iv-' + kind; root.setAttribute('role', 'button'); root.tabIndex = 0; root.setAttribute('aria-label', L.b);
    var ink = kind === 'vmuhr' ? '#4a3622' : '#4f3a1d', acc = '#a8782f';
    var dt = fmtDate(D.d, lang);
    root.innerHTML = '<div class="vbox"><img class="vpo" alt="" src="' + base + cfg.poster + '"><video class="vv" playsinline preload="auto" poster="' + base + cfg.poster + '" src="' + base + cfg.src + '"></video>' +
      '<div class="vtx" style="color:' + ink + ';--va:' + acc + '"><div class="vn">' + names + '</div>' + (dt ? '<div class="vd">' + esc(dt) + '</div>' : '') + '</div></div>' +
      '<div class="it"><b>' + L.t + '</b><span>' + L.b + '</span></div><button type="button" class="sk">' + L.s + '</button>';
    H.classList.add('intro-on'); document.body.appendChild(root);
    var v = root.querySelector('video'), done = false, started = false, shown = false, guard = 0, fb = 0;
    function finish() {
      if (done) return; done = true; clearTimeout(guard); clearTimeout(fb);
      try { sessionStorage.setItem(key, '1'); } catch (_) {}
      try { v.pause(); } catch (_) {}
      root.classList.add('out'); fin0();
      setTimeout(function () { try { root.remove(); } catch (_) {} H.classList.remove('intro-on'); }, 1000);
    }
    function showText() { if (shown) return; shown = true; root.classList.add('tx'); }
    function ended() { showText(); root.classList.add('end'); setTimeout(finish, 2200); }
    function start() {
      if (started || done) return; started = true;
      try { navigator.vibrate && navigator.vibrate(14); } catch (_) {}
      root.classList.add('play');
      var p; try { v.muted = false; v.volume = 1; p = v.play(); } catch (_) {}
      var soft = function () { try { v.muted = true; var q = v.play(); q && q.catch && q.catch(fallback); } catch (_) { fallback(); } };
      if (p && p.catch) p.catch(soft);
      // запасной вариант: видео не пошло за 3 с (нет сети, формат) → показываем последний кадр с текстом
      fb = setTimeout(function () { if (v.currentTime < 0.2) fallback(); }, 3000);
    }
    function fallback() { if (done) return; var po = root.querySelector('.vpo'); if (po) po.src = base + cfg.last; root.classList.add('play', 'fbk'); showText(); setTimeout(ended, 600); }
    v.addEventListener('timeupdate', function () { if (v.currentTime >= cfg.at) showText(); });
    v.addEventListener('ended', ended);
    v.addEventListener('error', fallback);
    root.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('.sk')) { finish(); return; } start(); });
    root.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); start(); } if (e.key === 'Escape') finish(); });
    setTimeout(function () { try { root.focus({ preventScroll: true }); } catch (_) {} }, 50);
    guard = setTimeout(function () { if (!done) finish(); }, 60000);
  }

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
      if (VID[kind]) { return videoIntro(kind, D, th, lang, L, names, fin0); }
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
