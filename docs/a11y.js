/* Доступность поверх готовой страницы: подписи, main, диалог просмотра фото, живая область.
   Только добавляет атрибуты и не меняет логику; любая ошибка гасится, страница работает как раньше. */
(function () {
  'use strict';
  var NAMES = { ru: 'Русский', uz: 'O\u2018zbekcha', en: 'English', kk: '\u049A\u0430\u0437\u0430\u049B\u0448\u0430' };
  var T = {
    ru: { photo: 'Фото', of: 'из', skip: 'К содержимому', close: 'Закрыть', prev: 'Назад', next: 'Далее', lb: 'Просмотр фото', lang: 'Язык' },
    uz: { photo: 'Surat', of: '/', skip: 'Mazmunga o\u2018tish', close: 'Yopish', prev: 'Oldingi', next: 'Keyingi', lb: 'Suratni ko\u2018rish', lang: 'Til' },
    en: { photo: 'Photo', of: 'of', skip: 'Skip to content', close: 'Close', prev: 'Previous', next: 'Next', lb: 'Photo viewer', lang: 'Language' },
    kk: { photo: 'Сурет', of: '/', skip: 'Мазмұнға өту', close: 'Жабу', prev: 'Алдыңғы', next: 'Келесі', lb: 'Суретті қарау', lang: 'Тіл' }
  };
  var safe = function (f) { return function () { try { return f.apply(this, arguments); } catch (_) {} }; };
  var L = function () { var l = (document.documentElement.lang || 'ru'); return T[l] ? l : 'ru'; };
  var tx = function (k) { return T[L()][k]; };

  var labelGallery = safe(function () {
    var b = [].slice.call(document.querySelectorAll('.gal button[data-i]')), n = b.length;
    b.forEach(function (e, i) {
      if (!e.getAttribute('aria-label')) e.setAttribute('aria-label', tx('photo') + ' ' + (i + 1) + ' ' + tx('of') + ' ' + n);
      var im = e.querySelector('img'); if (im && !im.getAttribute('alt')) im.setAttribute('alt', '');   // подпись у кнопки, картинка декоративна
    });
  });
  var labelLang = safe(function () {
    var g = document.querySelector('.lgsw'); if (!g) return;
    g.setAttribute('aria-label', tx('lang'));
    [].forEach.call(g.querySelectorAll('[data-lg]'), function (e) { var l = e.getAttribute('data-lg'); if (!e.getAttribute('aria-label')) e.setAttribute('aria-label', NAMES[l] || l); });
  });
  var landmarks = safe(function () {
    var root = document.getElementById('root'); if (!root) return;
    var st = document.getElementById('st');
    if (st && !st.hasAttribute('role')) { st.setAttribute('role', 'main'); st.id = 'st'; }
    if (st && !document.getElementById('skip')) {
      var a = document.createElement('a'); a.id = 'skip'; a.href = '#st'; a.textContent = tx('skip'); a.className = 'skipl';
      a.onclick = function (e) { e.preventDefault(); st.setAttribute('tabindex', '-1'); st.focus({ preventScroll: false }); };
      document.body.insertBefore(a, document.body.firstChild);
    }
  });
  var live = safe(function () {
    if (document.getElementById('a11yLive')) return;
    var d = document.createElement('div'); d.id = 'a11yLive'; d.setAttribute('role', 'status'); d.setAttribute('aria-live', 'polite'); d.className = 'sr';
    document.body.appendChild(d);
    window.__announce = function (m) { d.textContent = ''; setTimeout(function () { d.textContent = String(m || ''); }, 30); };
  });
  var focusAfterOpen = safe(function () {
    var card = document.getElementById('card'); if (!card) return;
    var mo = new MutationObserver(function () {
      if (!card.classList.contains('show')) return; mo.disconnect();
      setTimeout(function () {
        var h = card.querySelector('h1'); if (!h) return;
        h.setAttribute('tabindex', '-1'); try { h.focus({ preventScroll: true }); } catch (_) {}
      }, 600);
    });
    mo.observe(card, { attributes: true, attributeFilter: ['class'] });
  });
  var dialog = safe(function () {
    var lb = document.getElementById('lb'); if (!lb) return;
    var prevFocus = null;
    var mo = new MutationObserver(safe(function () {
      var on = lb.classList.contains('on');
      if (on && !lb.getAttribute('role')) {
        prevFocus = document.activeElement; lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-modal', 'true'); lb.setAttribute('aria-label', tx('lb'));
        var m = { '.fxx': 'close', '.fxa.l': 'prev', '.fxa.r': 'next' };
        Object.keys(m).forEach(function (s) { var e = lb.querySelector(s); if (e) e.setAttribute('aria-label', tx(m[s])); });
        var x = lb.querySelector('.fxx'); if (x) try { x.focus(); } catch (_) {}
      }
      if (!on && lb.getAttribute('role')) {
        lb.removeAttribute('role'); lb.removeAttribute('aria-modal'); lb.removeAttribute('aria-label');
        if (prevFocus && document.contains(prevFocus)) try { prevFocus.focus(); } catch (_) {}
      }
    }));
    mo.observe(lb, { attributes: true, attributeFilter: ['class'] });
    // Tab не уходит за пределы окна просмотра
    lb.addEventListener('keydown', safe(function (e) {
      if (e.key !== 'Tab') return;
      var f = [].slice.call(lb.querySelectorAll('button')).filter(function (b) { return b.offsetHeight > 0; }); if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }));
  });

  window.__a11yInit = safe(function () { labelGallery(); labelLang(); landmarks(); live(); focusAfterOpen(); dialog(); });
  window.__a11yRefresh = safe(function () { labelGallery(); labelLang(); landmarks(); });
})();
