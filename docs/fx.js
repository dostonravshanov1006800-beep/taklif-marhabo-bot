/* Marhabo FX: реализм, анимации, галерея, лепестки, календарь, музыка.
   Слой навешивается на готовую страницу гостя. Любая ошибка здесь не должна ломать приглашение. */
(function () {
  'use strict';
  var RM = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (id) { return document.getElementById(id); };
  var safe = function (fn) { return function () { try { return fn.apply(this, arguments); } catch (e) { try { console.warn('fx', e && e.message); } catch (_) {} } }; };

  /* ---------- общие данные страницы ---------- */
  var ctx = null; // заполняется из window.__INV, который выставляет i.html
  function getCtx() { return (ctx = window.__INV || ctx); }

  /* ---------- 1. Цвета фольги и воска из темы ---------- */
  function applyThemeVars() {
    var c = getCtx(); if (!c) return;
    var th = c.th, root = document.documentElement;
    document.body.setAttribute('data-th', c.type);
    var acc = th.accent;
    root.style.setProperty('--fa', acc);
    root.style.setProperty('--fat', th.accentText || acc);
    root.style.setProperty('--fb', th.accentSoft);
    root.style.setProperty('--fi', th.ink);
    root.style.setProperty('--fm', th.muted);
    root.style.setProperty('--fg', th.accentSoft + '48');
    // фольга: тёмный, светлый и блик из акцента
    root.style.setProperty('--fa1', shade(acc, -0.28));
    root.style.setProperty('--fa2', shade(acc, 0.28));
    root.style.setProperty('--fa3', shade(acc, 0.62));
    // воск: по типу праздника
    var wax = { wedding: ['#a8323a', '#7d1f27', '#5e141b'], nikah: ['#5d7a4a', '#3f5a33', '#2c4023'], birthday: ['#e0805f', '#c25a3c', '#923f27'], anniversary: ['#3f8a6a', '#2a6a4f', '#1c4a37'], navruz: ['#2aa684', '#1b7f64', '#115a46'], other: ['#8e5a78', '#6b3f58', '#4c2b3e'] }[c.type] || ['#a8323a', '#7d1f27', '#5e141b'];
    root.style.setProperty('--wx2', wax[0]); root.style.setProperty('--wx1', wax[1]); root.style.setProperty('--wx0', wax[2]);
    root.style.setProperty('--fbase', th.base);
  }
  function shade(hex, p) {
    var m = /^#?([0-9a-f]{6})$/i.exec(hex); if (!m) return hex;
    var n = parseInt(m[1], 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    var t = p < 0 ? 0 : 255, q = Math.abs(p);
    r = Math.round((t - r) * q + r); g = Math.round((t - g) * q + g); b = Math.round((t - b) * q + b);
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  /* ---------- 1. Печать: инициалы, нажатие ---------- */
  var sealDone = false;
  var setupSeal = safe(function () {
    var s = $('seal'); if (!s || sealDone) return; sealDone = true;
    var c = getCtx(); var i = s.querySelector('.i');
    if (i && c) i.textContent = c.ini;
    var h = document.createElement('span'); h.className = 'fxh'; s.appendChild(h);
    s.addEventListener('pointerdown', function () { s.classList.remove('fx-press'); void s.offsetWidth; s.classList.add('fx-press'); if (navigator.vibrate) try { navigator.vibrate(18); } catch (e) {} }, { passive: true });
    s.addEventListener('click', function () { s.classList.add('fx-crack'); startPetals(); }, true);
  });

  /* ---------- 1. Золотая фольга на заголовках ---------- */
  var foilDone = false;
  var setupFoil = safe(function () {
    if (foilDone) return;
    var h1 = document.querySelector('#card h1'); if (!h1) return; foilDone = true;
    h1.classList.add('fx-foil');
    // амперсанд оставляем акцентным, он внутри span и тоже получает фольгу
    var nm = document.querySelector('#gate .nm'); if (nm) nm.classList.add('fx-foil');
    var lh = document.querySelectorAll('#card .mt svg'); lh.forEach(function (s) { s.classList.add('fx-draw'); s.style.setProperty('--l', 320); });
  });

  /* ---------- 2b. Карточки подарков и пожеланий: плавное появление, в том числе для динамически добавленных ---------- */
  var setupCards = safe(function () {
    var sel = '.gc, .wc';
    var show = function (el) { el.classList.add('shown'); };
    if (RM || !('IntersectionObserver' in window)) { document.querySelectorAll(sel).forEach(show); return; }
    var io2 = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { show(e.target); io2.unobserve(e.target); } });
    }, { threshold: 0.15, rootMargin: '0px 0px -4% 0px' });
    var watch = function (root) { (root.querySelectorAll ? root.querySelectorAll(sel) : []).forEach(function (el) { if (!el.classList.contains('shown')) io2.observe(el); }); };
    watch(document);
    var host = document.getElementById('card');
    if (host && 'MutationObserver' in window) {
      new MutationObserver(function (ms) {
        ms.forEach(function (m) { m.addedNodes.forEach(function (n) { if (n.nodeType === 1) { if (n.matches && n.matches(sel)) io2.observe(n); watch(n); } }); });
      }).observe(host, { childList: true, subtree: true });
    }
  });

  /* прогрев: пока гость читает первый экран, в простое готовим слои нижних блоков */
  var warmUp = safe(function () {
    var st = $('st'); if (!st) return;
    var idle = window.requestIdleCallback || function (f) { return setTimeout(f, 600); };
    idle(function () {
      var n = 0; [].slice.call(st.children).forEach(function (k) { if (n++ > 12) return; void k.offsetHeight; });
    });
  });

  /* ---------- 3. Появление при прокрутке + параллакс ---------- */
  var io = null;
  var setupReveal = safe(function () {
    var st = $('st'); if (!st) return;
    if (RM || !('IntersectionObserver' in window)) return;
    io = io || new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('fx-in'); io.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    var kids = Array.prototype.slice.call(st.children);
    // первые блоки уже анимированы стартовой анимацией страницы, остальные показываем по прокрутке
    kids.forEach(function (k, idx) {
      if (idx < 4 || k.classList.contains('fx-rv') || k.id === 'cdw') return;
      k.classList.add('fx-rv'); io.observe(k);
    });
    st.querySelectorAll('.prog li').forEach(function (li, i) { if (li.classList.contains('fx-rv')) return; li.classList.add('fx-rv', 'fx-d' + Math.min(3, i % 4)); io.observe(li); });
    st.querySelectorAll('.g3 button').forEach(function (b, i) { if (b.classList.contains('fx-rv')) return; b.classList.add('fx-rv', 'fx-d' + (i % 3 + 1)); io.observe(b); });
    st.querySelectorAll('svg.fx-draw').forEach(function (s) { io.observe(s); });
    var lastMt = st.querySelector(':scope > div:last-child .mt svg'); if (lastMt) { lastMt.classList.add('fx-draw'); lastMt.style.setProperty('--l', 320); io.observe(lastMt); }
  });
  var parallaxOn = false;
  var setupParallax = safe(function () {
    if (parallaxOn || RM) return;
    var im = document.querySelector('.arch img'); if (!im) return; parallaxOn = true;
    var ticking = false;
    function upd() {
      ticking = false;
      var r = im.parentNode.getBoundingClientRect(), vh = innerHeight;
      if (r.bottom < 0 || r.top > vh) return;
      var p = ((r.top + r.height / 2) - vh / 2) / vh; // -0.5..0.5
      im.style.setProperty('--py', (-p * 34).toFixed(1) + 'px');
    }
    addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(upd); } }, { passive: true });
    addEventListener('resize', upd, { passive: true }); upd();
  });

  /* ---------- 2. Табло: 4 квадрата, цифры меняются мгновенно, без анимации ---------- */
  var setupCountdown = safe(function () {
    var w = $('cdw'); if (!w) return;
    var c = getCtx(); if (!c) return;
    var I0 = c.I, built = false, nodes = [], last = ['', '', '', ''], timer = 0;
    var target = function () { var t = (c.I.time || '12:00').slice(0, 5); return new Date(c.I.date + 'T' + t + ':00').getTime(); };
    var tick = function () {
      var I = c.I; if (!I.date) { w.innerHTML = ''; built = false; return; }
      var tg = target(); if (isNaN(tg)) return;
      var d = tg - Date.now();
      if (d <= 0) {
        if (!w.querySelector('.fx-today')) {
          var sameDay = new Date(I.date + 'T00:00:00').toDateString() === new Date().toDateString();
          w.innerHTML = sameDay ? '<div class="fx-today" style="color:' + (c.th.accentText || c.th.accent) + '">' + c.T.today + '</div>' : '';
          built = false;
        }
        return;
      }
      var s = Math.floor(d / 1000);
      var v = [Math.floor(s / 86400), Math.floor(s % 86400 / 3600), Math.floor(s % 3600 / 60), s % 60];
      if (!built || !w.querySelector('.sq')) {
        var labels = [c.T.day, c.T.hour, c.T.min, c.T.sec];
        w.innerHTML = '<div class="rgw"><p class="up rgt" style="color:' + c.th.muted + '">' + c.T.countdown + '</p><div class="rg" data-fx="1">' +
          v.map(function (x, i) { return '<div class="sq"><b>' + pad(x) + '</b><small>' + esc(labels[i]) + '</small></div>'; }).join('') + '</div></div>';
        nodes = [].slice.call(w.querySelectorAll('.sq b')); last = v.map(pad); built = true; return;
      }
      for (var i = 0; i < 4; i++) { var t = pad(v[i]); if (t !== last[i]) { nodes[i].textContent = t; last[i] = t; } }
    };
    // тик выравниваем по границе секунды: без дрейфа setInterval, без пропусков и двойных шагов
    var loop = function () { tick(); var ms = 1000 - (Date.now() % 1000) + 8; timer = setTimeout(loop, ms); };
    document.addEventListener('visibilitychange', function () { if (!document.hidden) { clearTimeout(timer); loop(); } });
    window.__fxOwnsCd = function () { return !!(w.querySelector('.rg[data-fx]') || w.querySelector('.fx-today')); };
    loop();
  });
  function pad(x) { return String(x).padStart(2, '0'); }

  /* ---------- 5. Лепестки (canvas) и конфетти ---------- */
  var petalsOn = false;
  var startPetals = safe(function () {
    if (petalsOn || RM) return; petalsOn = true;
    var c = getCtx(); if (!c) return;
    var pal = PAL[c.type] || PAL.wedding;
    // один фиксированный слой; лепестки двигает только CSS (transform), без JS-цикла и без градиента на каждом кадре
    var N = innerWidth < 600 ? 10 : 18;
    var layer = document.createElement('div'); layer.id = 'fxp';
    var h = '';
    for (var i = 0; i < N; i++) {
      var col = pal[i % pal.length], s = 9 + Math.random() * 8, x = Math.random() * 100, dur = 11 + Math.random() * 9, del = -Math.random() * dur,
        dx = (Math.random() - 0.5) * 90, rot = 180 + Math.random() * 300, op = 0.55 + Math.random() * 0.35;
      h += '<i style="left:' + x.toFixed(1) + '%;width:' + s.toFixed(1) + 'px;height:' + (s * 1.35).toFixed(1) + 'px;--a:' + col[0] + ';--b:' + col[1] + ';--dx:' + dx.toFixed(0) + 'px;--r:' + rot.toFixed(0) + 'deg;--o:' + op.toFixed(2) + ';animation-duration:' + dur.toFixed(1) + 's;animation-delay:' + del.toFixed(1) + 's"></i>';
    }
    layer.innerHTML = h; document.body.appendChild(layer);
    // вкладка скрыта: останавливаем анимацию
    document.addEventListener('visibilitychange', function () { layer.style.animationPlayState = ''; layer.classList.toggle('paused', document.hidden); });
  });
  var PAL = {
    wedding: [['#fbe3e6', '#f1b9c2'], ['#fff5f0', '#f4d6cc'], ['#fde9c9', '#e8c07a']],
    nikah: [['#eef3e3', '#c6d4a4'], ['#fffdf2', '#e9e4c4'], ['#e0ead0', '#a9bd84']],
    birthday: [['#ffd9cf', '#f09a84'], ['#fff0b8', '#f2c94c'], ['#ffd1e6', '#f08cba']],
    anniversary: [['#e1f0e5', '#9fc9ae'], ['#fffdf5', '#e8dca8'], ['#cfe6d6', '#7fb494']],
    navruz: [['#d9f3e8', '#74c9a8'], ['#fff3b8', '#f2cf4a'], ['#ffd7e0', '#f08aa5']],
    other: [['#f3e3ec', '#c79cb3'], ['#fff6fa', '#e8cfdc'], ['#e6d3df', '#a97b94']]
  };
  function newPetal(pal, anywhere) {
    var c = pal[(Math.random() * pal.length) | 0], s = 7 + Math.random() * 9;
    return { x: Math.random() * innerWidth, y: anywhere ? Math.random() * innerHeight : -20 - Math.random() * 60, s: s, c1: c[0], c2: c[1],
      vy: 0.5 + Math.random() * 0.8, vx: (Math.random() - 0.5) * 0.3, sw: 0.25 + Math.random() * 0.5, t: Math.random() * 6, ts: 0.02 + Math.random() * 0.03,
      rot: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.04, flip: Math.random() * 6.28, vf: 0.03 + Math.random() * 0.05, a: 0.55 + Math.random() * 0.35 };
  }
  function drawPetal(g, p) {
    var sy = Math.cos(p.flip), s = p.s; // переворот лепестка в 3D
    g.save(); g.translate(p.x, p.y); g.rotate(p.rot); g.scale(1, 0.35 + Math.abs(sy) * 0.65); g.globalAlpha = p.a * (0.7 + Math.abs(sy) * 0.3);
    var gr = g.createRadialGradient(-s * 0.2, -s * 0.3, 0, 0, 0, s * 1.2); gr.addColorStop(0, p.c1); gr.addColorStop(1, p.c2);
    g.fillStyle = gr; g.beginPath();
    g.moveTo(0, -s); g.bezierCurveTo(s * 0.95, -s * 0.7, s * 0.8, s * 0.55, 0, s); g.bezierCurveTo(-s * 0.8, s * 0.55, -s * 0.95, -s * 0.7, 0, -s); g.fill();
    g.globalAlpha *= 0.35; g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 0.6; g.beginPath(); g.moveTo(0, -s * 0.8); g.lineTo(0, s * 0.7); g.stroke();
    g.restore();
  }
  var confetti = safe(function (x, y) {
    if (RM) return;
    var c = getCtx(); var cv = $('fxc');
    if (!cv) { cv = document.createElement('canvas'); cv.id = 'fxc'; document.body.appendChild(cv); }
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; var g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
    var cols = [c.th.accent, shade(c.th.accent, 0.4), shade(c.th.accent, -0.2), '#fff', '#f3d9a0', '#e58a8a'];
    var ps = [];
    for (var i = 0; i < 90; i++) { var a = (-Math.PI / 2) + (Math.random() - 0.5) * 1.9, sp = 7 + Math.random() * 9; ps.push({ x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, w: 5 + Math.random() * 6, h: 3 + Math.random() * 4, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, c: cols[(Math.random() * cols.length) | 0], l: 1 }); }
    var f = 0;
    (function step() {
      g.clearRect(0, 0, innerWidth, innerHeight); var alive = 0;
      ps.forEach(function (p) {
        p.vy += 0.34; p.vx *= 0.985; p.x += p.vx; p.y += p.vy; p.r += p.vr; p.l -= 0.0085; if (p.l <= 0 || p.y > innerHeight + 20) return; alive++;
        g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.globalAlpha = Math.min(1, p.l * 1.6); g.fillStyle = p.c; g.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * (0.4 + Math.abs(Math.sin(p.r * 2)) * 0.6)); g.restore();
      });
      if (alive && f++ < 260) requestAnimationFrame(step); else g.clearRect(0, 0, innerWidth, innerHeight);
    })();
  });

  /* ---------- 6. Календарь и маршрут ---------- */
  var actDone = false;
  var ICO = {
    cal: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 2v4" /> <path d="M16 2v4" /> <path d="M21 13V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8" /> <path d="M3 10h18" /> <path d="M16 19h6" /> <path d="M19 16v6" /></svg>', pin: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" /> <circle cx="12" cy="10" r="3" /></svg>', nav: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="3 11 22 2 13 21 11 13 3 11" /></svg>', car: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 2h4" /> <path d="m21 8-2 2-1.5-3.7A2 2 0 0 0 15.646 5H8.4a2 2 0 0 0-1.903 1.257L5 10 3 8" /> <path d="M7 14h.01" /> <path d="M17 14h.01" /> <rect width="18" height="8" x="3" y="10" rx="2" /> <path d="M5 18v2" /> <path d="M19 18v2" /></svg>'
  };
  function monthCard(I, T, th) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(I.date); if (!m) return '';
    var y = +m[1], mo = +m[2] - 1, d = +m[3];
    var first = new Date(y, mo, 1).getDay(), dim = new Date(y, mo + 1, 0).getDate();
    var lead = (first + 6) % 7; // неделя с понедельника
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var wd = [1, 2, 3, 4, 5, 6, 0].map(function (i, k) { return '<i' + (k > 4 ? ' class="we"' : '') + '>' + esc((T.dw && T.dw[i]) || T.days[i].slice(0, 2)) + '</i>'; }).join('');
    var cells = '', i;
    for (i = 0; i < lead; i++) cells += '<b class="e"></b>';
    for (i = 1; i <= dim; i++) {
      var past = new Date(y, mo, i) < today, col = (lead + i - 1) % 7;
      if (i === d) cells += '<b class="on"><span class="hv" aria-label="' + i + '">' + i + '</span></b>';
      else cells += '<b class="' + (past ? 'pa' : '') + (col > 4 ? ' we' : '') + '">' + i + '</b>';
    }
    var heart = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.6-9.1C.9 8.5 2.8 5 6.2 5c2 0 3.4 1 4.4 2.5h2.8C14.4 6 15.8 5 17.8 5c3.4 0 5.3 3.5 3.8 6.9C19.5 16.4 12 21 12 21z"/></svg>';
    return '<div class="fx-cal"><div class="hd"><span class="yd">' + heart + '<em>' + esc(T.yourDay || '') + '</em></span><div class="ttl"><span class="mn">' + esc(T.months[mo]) + '</span><span class="yr">' + y + '</span></div></div>' +
      '<div class="wk">' + wd + '</div><div class="dg">' + cells + '</div></div>';
  }
  var setupActions = safe(function () {
    if (actDone) return; var c = getCtx(); if (!c) return;
    var I = c.I, T = c.T; if (!I.date) return;
    var anchor = null; var cards = document.querySelectorAll('#st > div');
    cards.forEach(function (d) { if (d.querySelector('a[href^="http"][target="_blank"]') && /border-radius:16px/.test(d.getAttribute('style') || '')) anchor = d; });
    if (!anchor) { cards.forEach(function (d) { if (!anchor && (d.textContent || '').indexOf(T.where) >= 0 && d.getAttribute('style') && d.getAttribute('style').indexOf('border-radius:16px') >= 0) anchor = d; }); }
    var cdw = $('cdw'); if (!cdw) return; actDone = true;
    var place = [I.place, I.addr].filter(Boolean).join(', ');
    var q = encodeURIComponent(place);
    var mapUrl = /^https?:\/\//.test(I.map) ? I.map : (place ? 'https://www.google.com/maps/search/?api=1&query=' + q : '');
    var yandex = place ? 'https://yandex.com/maps/?text=' + q : '';
    // такси: если в ссылке на карту есть координаты, открываем Яндекс Go точно; иначе маршрут «такси» в Яндекс Картах по адресу
    var ll = null, mm;
    var mu = String(I.map || '');
    if ((mm = /[?&](?:ll|pt)=(-?\d+\.\d+)[,%2C]+(-?\d+\.\d+)/i.exec(mu))) ll = [mm[2], mm[1]]; // Яндекс: долгота,широта
    else if ((mm = /@(-?\d+\.\d+),(-?\d+\.\d+)/.exec(mu)) || (mm = /[?&](?:q|query|destination)=(-?\d+\.\d+)(?:,|%2C)(-?\d+\.\d+)/i.exec(mu)) || (mm = /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/.exec(mu))) ll = [mm[1], mm[2]];
    if (ll && (Math.abs(ll[0]) > 90 || Math.abs(ll[1]) > 180)) ll = null;
    var taxi = ll ? 'https://go.yandex/route?end-lat=' + ll[0] + '&end-lon=' + ll[1] : (place ? 'https://yandex.com/maps/?rtext=~' + q + '&rtt=taxi' : '');
    // 1) календарь месяца сразу после табло обратного отсчёта
    var calBox = document.createElement('div'); calBox.className = 'fx-calw';
    calBox.innerHTML = monthCard(I, T, c.th) + '<button type="button" class="fx-addcal" id="fxcal">' + ICO.cal + '<span>' + T.addCal + '</span></button>';
    cdw.parentNode.insertBefore(calBox, cdw.nextSibling);
    // 2) кнопки маршрута внутри карточки «Где»
    if (anchor && (mapUrl || yandex || taxi)) {
      var box = document.createElement('div'); box.className = 'fx-act';
      box.innerHTML = (mapUrl ? '<a href="' + esc(mapUrl) + '" target="_blank" rel="noreferrer">' + ICO.pin + '<span>' + T.route + '</span></a>' : '') +
        (yandex ? '<a href="' + esc(yandex) + '" target="_blank" rel="noreferrer">' + ICO.nav + '<span>' + T.yandex + '</span></a>' : '') +
        (taxi ? '<a class="wide tx" href="' + esc(taxi) + '" target="_blank" rel="noreferrer">' + ICO.car + '<span>' + T.taxi + '</span></a>' : '');
      anchor.appendChild(box);
    }
    $('fxcal').addEventListener('click', function () { openCalMenu(c); });
  });
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]; }); }
  function icsText(s) { return String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n'); }
  function calData(c) {
    var I = c.I, m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(I.date); if (!m) return null;
    var tm = /^(\d{1,2}):(\d{2})/.exec(I.time || '') || [0, '18', '00'];
    var h = parseInt(tm[1], 10), st = m[1] + m[2] + m[3] + 'T' + pad(h) + tm[2] + '00';
    var endDay = m[1] + m[2] + m[3];
    if (h + 4 >= 24) { var dd = new Date(+m[1], +m[2] - 1, +m[3] + 1); endDay = dd.getFullYear() + pad(dd.getMonth() + 1) + pad(dd.getDate()); }
    var en = endDay + 'T' + pad((h + 4) % 24) + tm[2] + '00';
    var title = [I.n1, I.n2].filter(Boolean).join(' & ') + ' · ' + (c.tp.label[c.lang] || c.tp.label.ru);
    var place = [I.place, I.addr].filter(Boolean).join(', ');
    var note = (I.text || '') + (I.map ? '\n' + I.map : '');
    return { st: st, en: en, title: title, place: place, note: note, m: m, h: h, mi: tm[2] };
  }
  function buildICS(c, d) {
    var uid = (c.id || Math.random().toString(36).slice(2)) + '@taklifnoma';
    var now = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
    return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Taklifnoma//Invitation//RU', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'BEGIN:VEVENT', 'UID:' + uid, 'DTSTAMP:' + now,
      'DTSTART:' + d.st, 'DTEND:' + d.en, 'SUMMARY:' + icsText(d.title), 'LOCATION:' + icsText(d.place), 'DESCRIPTION:' + icsText(d.note),
      'BEGIN:VALARM', 'TRIGGER:-P1D', 'ACTION:DISPLAY', 'DESCRIPTION:' + icsText(d.title), 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  }
  // открываем внешнюю ссылку так, чтобы её не заблокировал WebView Telegram
  function openExt(url) {
    try { var tg = window.Telegram && window.Telegram.WebApp; if (tg && tg.openLink) { tg.openLink(url, { try_instant_view: false }); return; } } catch (_) {}
    var w = window.open(url, '_blank', 'noopener'); if (!w) location.href = url;
  }
  function openCalMenu(c) {
    var d = calData(c); if (!d) return;
    var old = document.getElementById('fxcm'); if (old) old.remove();
    var L = { ru: ['Добавить в календарь', 'Google Календарь', 'Outlook', 'Apple / файл .ics', 'Закрыть', 'Скопировано'], uz: ['Kalendarga qo\'shish', 'Google Kalendar', 'Outlook', 'Apple / .ics fayl', 'Yopish', 'Nusxalandi'], en: ['Add to calendar', 'Google Calendar', 'Outlook', 'Apple / .ics file', 'Close', 'Copied'], kk: ['Күнтізбеге қосу', 'Google күнтізбесі', 'Outlook', 'Apple / .ics файл', 'Жабу', 'Көшірілді'] }[c.lang] || null;
    L = L || ['Добавить в календарь', 'Google Календарь', 'Outlook', 'Apple / файл .ics', 'Закрыть', 'Скопировано'];
    var g = 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent(d.title) + '&dates=' + d.st + '/' + d.en + '&details=' + encodeURIComponent(d.note) + '&location=' + encodeURIComponent(d.place);
    var iso = function (s) { return s.slice(0, 4) + '-' + s.slice(4, 6) + '-' + s.slice(6, 8) + 'T' + s.slice(9, 11) + ':' + s.slice(11, 13) + ':00'; };
    var o = 'https://outlook.live.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent&subject=' + encodeURIComponent(d.title) + '&startdt=' + encodeURIComponent(iso(d.st)) + '&enddt=' + encodeURIComponent(iso(d.en)) + '&body=' + encodeURIComponent(d.note) + '&location=' + encodeURIComponent(d.place);
    var ics = buildICS(c, d), dataUrl = 'data:text/calendar;charset=utf-8,' + encodeURIComponent(ics);
    var ov = document.createElement('div'); ov.id = 'fxcm'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-label', L[0]);
    ov.innerHTML = '<div class="cmb"><p class="cmt">' + esc(L[0]) + '</p>' +
      '<button type="button" data-k="g">' + ICO.cal + '<span>' + esc(L[1]) + '</span></button>' +
      '<button type="button" data-k="o">' + ICO.cal + '<span>' + esc(L[2]) + '</span></button>' +
      '<button type="button" data-k="i">' + ICO.cal + '<span>' + esc(L[3]) + '</span></button>' +
      '<button type="button" class="cmx" data-k="x">' + esc(L[4]) + '</button></div>';
    document.body.appendChild(ov);
    requestAnimationFrame(function () { ov.classList.add('on'); });
    var close = function () { ov.classList.remove('on'); setTimeout(function () { ov.remove(); }, 200); };
    ov.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (e.target === ov || (b && b.dataset.k === 'x')) { close(); return; }
      if (!b) return; var k = b.dataset.k;
      if (k === 'g') { openExt(g); close(); }
      else if (k === 'o') { openExt(o); close(); }
      else if (k === 'i') {
        var inTg = !!(window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.openLink);
        if (inTg) {
          // WebView Telegram блокирует скачивание: открываем страницу-посредник во внешнем браузере, он сам скачает .ics
          var base = document.baseURI.replace(/[#?].*$/, '').replace(/\/i\/[^/]*\/?$/, '/').replace(/[^/]*$/, '');
          var u = base + 'cal.html?s=' + d.st + '&e=' + d.en + '&t=' + encodeURIComponent(d.title) + '&p=' + encodeURIComponent(d.place) + '&n=' + encodeURIComponent(d.note.slice(0, 400)) + '&l=' + encodeURIComponent(c.lang || 'ru') + '&i=' + encodeURIComponent(c.id || '');
          openExt(u);
        } else {
          try {
            var blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' }), url = URL.createObjectURL(blob);
            var a = document.createElement('a'); a.href = url; a.download = 'taklifnoma.ics'; a.rel = 'noopener'; document.body.appendChild(a); a.click();
            setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 1500);
          } catch (_) {}
        }
        close();
      }
    });
    document.addEventListener('keydown', function esc2(e) { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc2); } });
  }

  /* ---------- 4. Галерея: свайп, зум, листание ---------- */
  var galInit = false;
  var setupGallery = safe(function () {
    if (galInit) return; var c = getCtx(); if (!c || !c.gallery) return; galInit = true;
    var lb = $('lb'), idx = 0, sc = 1, tx = 0, ty = 0, startX = 0, startY = 0, sx = 0, sy = 0, pinch = 0, pinchSc = 1, drag = false, moved = false, lastTap = 0;
    var imgEl = null, cnt = null, dots = null;
    function open(i) {
      idx = i; sc = 1; tx = ty = 0;
      lb.innerHTML = '<div class="fxc"></div><button class="fxx" aria-label="close">\u00d7</button><button class="fxa l" aria-label="prev">\u2039</button><button class="fxa r" aria-label="next">\u203a</button><div class="fxs"><img alt="" draggable="false"></div><div class="fxd"></div>';
      lb.classList.add('on'); lb.dataset.fx = '1'; document.documentElement.style.overflow = 'hidden';
      imgEl = lb.querySelector('img'); cnt = lb.querySelector('.fxc'); dots = lb.querySelector('.fxd');
      dots.innerHTML = c.gallery.map(function () { return '<i></i>'; }).join('');
      show(0);
    }
    function show(dir) {
      imgEl.classList.remove('dr'); sc = 1; tx = ty = 0;
      imgEl.style.opacity = '0'; imgEl.style.transform = 'translateX(' + (dir * 40) + 'px) scale(.97)';
      imgEl.onload = function () { requestAnimationFrame(function () { imgEl.style.opacity = '1'; apply(); }); };
      imgEl.src = c.gallery[idx];
      if (imgEl.complete) imgEl.onload();
      cnt.textContent = (idx + 1) + ' / ' + c.gallery.length;
      Array.prototype.forEach.call(dots.children, function (d, i) { d.classList.toggle('on', i === idx); });
      [idx + 1, idx - 1].forEach(function (k) { var u = c.gallery[(k + c.gallery.length) % c.gallery.length]; if (u) { var im = new Image(); im.src = u; } });
    }
    function apply() { imgEl.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + sc + ')'; }
    function go(d) { if (c.gallery.length < 2) return; idx = (idx + d + c.gallery.length) % c.gallery.length; show(d); }
    function close() { lb.classList.remove('on'); lb.innerHTML = ''; lb.dataset.fx = ''; document.documentElement.style.overflow = ''; }
    function dist(t) { var a = t[0], b = t[1]; return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY); }
    lb.addEventListener('touchstart', function (e) {
      if (!lb.dataset.fx) return;
      if (e.touches.length === 2) { pinch = dist(e.touches); pinchSc = sc; drag = false; return; }
      var t = e.touches[0]; startX = sx = t.clientX; startY = sy = t.clientY; drag = true; moved = false; imgEl.classList.add('dr');
    }, { passive: true });
    lb.addEventListener('touchmove', function (e) {
      if (!lb.dataset.fx) return;
      if (e.touches.length === 2 && pinch) { sc = Math.max(1, Math.min(4, pinchSc * dist(e.touches) / pinch)); if (sc === 1) { tx = ty = 0; } apply(); e.preventDefault(); return; }
      if (!drag) return; var t = e.touches[0], dx = t.clientX - sx, dy = t.clientY - sy; sx = t.clientX; sy = t.clientY;
      if (Math.abs(t.clientX - startX) + Math.abs(t.clientY - startY) > 6) moved = true;
      if (sc > 1) { tx += dx; ty += dy; } else { tx += dx; ty += dy * 0.5; }
      apply(); e.preventDefault();
    }, { passive: false });
    lb.addEventListener('touchend', function (e) {
      if (!lb.dataset.fx) return;
      if (e.touches.length < 2) pinch = 0;
      if (!drag) return; drag = false; imgEl.classList.remove('dr');
      var dx = tx, now = Date.now();
      if (!moved) { // тап: двойной тап = зум
        if (e.target === imgEl && now - lastTap < 320) { sc = sc > 1 ? 1 : 2.4; tx = ty = 0; apply(); lastTap = 0; return; }
        lastTap = now; if (e.target === lb || e.target.classList.contains('fxs')) { if (sc === 1) close(); } return;
      }
      if (sc === 1) { if (Math.abs(dx) > 70) { go(dx < 0 ? 1 : -1); } else if (ty > 110) { close(); } else { tx = ty = 0; apply(); } }
    });
    lb.addEventListener('click', function (e) {
      if (!lb.dataset.fx) return; e.stopImmediatePropagation();
      if (e.target.closest('.fxx')) return close();
      if (e.target.closest('.fxa.l')) return go(-1);
      if (e.target.closest('.fxa.r')) return go(1);
      if (e.target === lb) close();
    }, true);
    lb.addEventListener('wheel', function (e) { if (!lb.dataset.fx) return; e.preventDefault(); sc = Math.max(1, Math.min(4, sc - e.deltaY * 0.002)); if (sc === 1) tx = ty = 0; apply(); }, { passive: false });
    addEventListener('keydown', function (e) { if (!lb.dataset.fx) return; if (e.key === 'ArrowRight') go(1); else if (e.key === 'ArrowLeft') go(-1); else if (e.key === 'Escape') close(); }, true);
    // перехват открытия до штатного обработчика страницы
    document.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('.gal button'); if (!b) return;
      e.stopImmediatePropagation(); e.preventDefault(); open(+b.dataset.i || 0);
    }, true);
  });

  /* ---------- 10. Музыка: плавное нарастание/затухание и громкость ---------- */
  var musicDone = false;
  var setupMusic = safe(function () {
    var au = $('au'), mb = $('mb'); if (!au || !mb || musicDone) return; musicDone = true;
    var c = getCtx(); var target = 0.45, tmr = 0;
    function fade(to, ms, done) {
      clearInterval(tmr); var from = au.volume, t0 = performance.now();
      tmr = setInterval(function () {
        var k = Math.min(1, (performance.now() - t0) / ms), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        au.volume = Math.max(0, Math.min(1, from + (to - from) * e));
        if (k >= 1) { clearInterval(tmr); done && done(); }
      }, 40);
    }
    // ползунок громкости
    var mv = document.createElement('div'); mv.className = 'mv';
    mv.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/></svg><input type="range" min="0" max="100" value="45" aria-label="volume">';
    mb.parentNode.appendChild(mv);
    var rg = mv.querySelector('input'); rg.addEventListener('input', function () { target = rg.value / 100; clearInterval(tmr); au.volume = target; });
    // плавный старт/стоп
    var origPlay = au.play.bind(au);
    au.play = function () { au.volume = 0; var p = origPlay(); if (p && p.then) p.then(function () { fade(target, 2600); }).catch(function () {}); else fade(target, 2600); return p; };
    var origPause = au.pause.bind(au);
    au.pause = function () { if (au.paused) return; fade(0, 700, function () { origPause(); au.volume = target; }); };
    var update = function () { mv.classList.toggle('on', !au.paused || mb.classList.contains('playing')); };
    new MutationObserver(update).observe(mb, { attributes: true, attributeFilter: ['class'] }); update();
    // зацикливание без щелчка: затухание в конце, новый круг с нарастанием
    au.loop = false;
    au.addEventListener('timeupdate', function () { if (au.duration && au.duration - au.currentTime < 2.2 && au.volume > 0.02 && !au.fxEnding) { au.fxEnding = true; fade(0, 2000); } });
    au.addEventListener('ended', function () { au.fxEnding = false; au.currentTime = 0; au.volume = 0; origPlay().then(function () { fade(target, 2200); }).catch(function () {}); });
    au.addEventListener('seeked', function () { if (au.duration - au.currentTime > 3) au.fxEnding = false; });
    // уходим со вкладки: тише
    document.addEventListener('visibilitychange', function () { if (document.hidden && !au.paused) fade(target * 0.25, 600); else if (!au.paused) fade(target, 900); });
  });

  /* ---------- 5. Конфетти по кнопке «Приду» ---------- */
  var setupRsvp = safe(function () {
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('.bt a'); if (!a) return;
      var href = a.getAttribute('href') || ''; if (!/start=ry_/.test(href)) return;
      var r = a.getBoundingClientRect(); confetti(r.left + r.width / 2, r.top + r.height / 2);
    }, true);
  });

  /* ---------- 7. Фоновые узоры по теме ---------- */
  var themeDone = false;
  var setupTheme = safe(function () {
    if (themeDone) return; var c = getCtx(); var card = $('card'); if (!c || !card) return; themeDone = true;
    var cls = { nikah: 'fx-th-geo', birthday: 'fx-th-lines', navruz: 'fx-th-adras' }[c.type];
    if (cls) { var d = document.createElement('div'); d.className = cls; card.insertBefore(d, card.firstChild); }
  });

  /* ---------- запуск ---------- */
  var bootDone = false;
  var boot = safe(function () {
    if (!getCtx()) return;
    applyThemeVars(); setupSeal();
    if ($('card')) { setupTheme(); setupFoil(); setupCountdown(); setupMusic(); setupGallery(); setupRsvp(); setupCards(); }
    if ($('st') && $('st').children.length) { setupActions(); setupReveal(); warmUp(); setupParallax(); }
    bootDone = !!($('seal') && $('st') && $('st').children.length);
  });
  window.__fxBoot = boot;
  var tries = 0, iv = setInterval(function () { boot(); if ((bootDone && tries > 6) || ++tries > 80) clearInterval(iv); }, 250);
  document.addEventListener('DOMContentLoaded', boot);
})();
