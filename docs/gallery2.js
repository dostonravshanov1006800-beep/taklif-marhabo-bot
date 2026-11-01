/* Галерея 2.0: подпись к фото и слайд-шоу поверх просмотрщика из fx.js. Ничего не ломает: всё в try/catch, сам просмотрщик не меняется. */
(function () {
  'use strict';
  var T = {
    ru: { play: 'Слайд-шоу', stop: 'Остановить слайд-шоу' },
    uz: { play: 'Slayd-shou', stop: 'Slayd-shouni to\u2018xtatish' },
    en: { play: 'Slideshow', stop: 'Stop slideshow' },
    kk: { play: 'Слайд-шоу', stop: 'Слайд-шоуды тоқтату' }
  };
  var timer = 0, playing = false, lastSig = '';
  var rm = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function ctx() { return window.__INV || {}; }
  function tx(k) { var l = ctx().lang; return (T[l] || T.ru)[k]; }
  function stop() { playing = false; clearInterval(timer); timer = 0; var b = document.getElementById('gsb'); if (b) { b.setAttribute('aria-pressed', 'false'); b.setAttribute('aria-label', tx('play')); b.innerHTML = ICON_PLAY; } }
  var ICON_PLAY = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l11-6.5z"/></svg>';
  var ICON_STOP = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>';
  function index(lb) { var c = lb.querySelector('.fxc'); var m = c && /^(\d+)\s*\/\s*(\d+)/.exec(c.textContent || ''); return m ? +m[1] - 1 : -1; }
  function sync() {
    try {
      var lb = document.getElementById('lb'); if (!lb) return;
      if (!lb.classList.contains('on')) { stop(); lastSig = ''; return; }
      var c = ctx(), g = c.gallery || [], caps = c.gcaps || [];
      if (!lb.querySelector('.fxs')) return;
      var i = index(lb);
      // подпись
      var cap = lb.querySelector('.gcb');
      if (!cap) { cap = document.createElement('div'); cap.className = 'gcb'; cap.setAttribute('aria-live', 'polite'); lb.appendChild(cap); }
      var t = (i >= 0 && caps[i]) || ''; if (cap.textContent !== t) cap.textContent = t; cap.style.display = t ? '' : 'none';
      // кнопка слайд-шоу (только если фото больше одного и анимации не отключены)
      if (g.length > 1 && !rm && !document.getElementById('gsb')) {
        var b = document.createElement('button'); b.type = 'button'; b.id = 'gsb'; b.setAttribute('aria-pressed', 'false'); b.setAttribute('aria-label', tx('play')); b.innerHTML = ICON_PLAY;
        lb.appendChild(b);
      }
      lastSig = String(i);
    } catch (e) {}
  }
  function start() {
    var lb = document.getElementById('lb'); if (!lb || !lb.classList.contains('on')) return;
    playing = true; var b = document.getElementById('gsb'); if (b) { b.setAttribute('aria-pressed', 'true'); b.setAttribute('aria-label', tx('stop')); b.innerHTML = ICON_STOP; }
    clearInterval(timer);
    timer = setInterval(function () { var n = lb.querySelector('.fxa.r'); if (!lb.classList.contains('on') || document.hidden) { if (!lb.classList.contains('on')) stop(); return; } if (n) n.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })); }, 4000);
  }
  function boot() {
    var lb = document.getElementById('lb'); if (!lb || lb.__g2) return; lb.__g2 = 1;
    new MutationObserver(sync).observe(lb, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['class'] });
    // fx.js глушит клики на #lb в фазе перехвата, поэтому кнопку слушаем выше, на window (она срабатывает раньше)
    window.addEventListener('click', function (e) {
      var b = e.target && e.target.closest && e.target.closest('#gsb'); if (!b) return;
      e.stopPropagation(); e.stopImmediatePropagation(); e.preventDefault(); playing ? stop() : start();
    }, true);
    // любое касание картинки или стрелок вручную останавливает показ
    lb.addEventListener('touchstart', function (e) { if (playing && !(e.target.closest && e.target.closest('#gsb'))) stop(); }, { passive: true, capture: true });
    window.addEventListener('click', function (e) { if (playing && e.isTrusted && lb.contains(e.target) && !(e.target.closest && e.target.closest('#gsb'))) stop(); }, true);
    document.addEventListener('visibilitychange', function () { if (document.hidden && playing) stop(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
