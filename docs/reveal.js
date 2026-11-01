/* Пометка блоков карточки и показ при прокрутке. Любая ошибка не должна скрывать содержимое:
   класс rvj (прячет блоки) ставится только после успешной подготовки, а страховка через 4 с показывает всё. */
(function () {
  'use strict';
  window.__revealInit = function (fxk) {
    try {
      var RM = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
      var card = document.getElementById('st'); if (!card || RM || !('IntersectionObserver' in window)) return;
      var H = document.documentElement; var kids = [].slice.call(card.children).filter(function (e) { return e.nodeType === 1 && e.offsetHeight > 0 && !/\bfx-(rv|calw)\b/.test(e.className) && !/\bfin\b/.test(e.className); });
      if (!kids.length) return;
      if (fxk) H.setAttribute('data-rv', fxk);
      kids.forEach(function (e, i) { e.classList.add('rv'); e.style.setProperty('--rd', Math.min(i, 3) * 0.06 + 's'); });
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (x) { if (x.isIntersecting) { x.target.classList.add('on'); io.unobserve(x.target); } });
      }, { threshold: 0.08, rootMargin: '0px 0px -6% 0px' });
      H.classList.add('rvj');
      kids.forEach(function (e) { io.observe(e); });
      setTimeout(function () { kids.forEach(function (e) { e.classList.add('on'); }); }, 4000 + kids.length * 120); // страховка
    } catch (_) { try { document.documentElement.classList.remove('rvj'); } catch (__) {} }
  };
})();

/* Переворот цифр: следим за изменением текста в табло и ставим короткий класс. Таймер fx.js не трогаем. */
(function () {
  'use strict';
  window.__flipInit = function () {
    try {
      if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      if (!('MutationObserver' in window)) return;
      var w = document.getElementById('cdw'); if (!w) return;
      var mo = new MutationObserver(function (ms) {
        ms.forEach(function (m) {
          // fx.js меняет textContent у <b>: для наблюдателя это замена дочернего узла (childList), реже characterData
          var el = m.type === 'childList' ? m.target : (m.target && m.target.parentNode);
          if (!el || el.tagName !== 'B' || !el.closest || !el.closest('.sq')) return;
          if (m.type === 'childList' && !m.addedNodes.length) return;
          el.classList.remove('flp'); void el.offsetWidth; el.classList.add('flp');
          clearTimeout(el._flt); el._flt = setTimeout(function () { try { el.classList.remove('flp'); } catch (_) {} }, 450);
        });
      });
      mo.observe(w, { subtree: true, childList: true, characterData: true });
    } catch (_) {}
  };
})();
