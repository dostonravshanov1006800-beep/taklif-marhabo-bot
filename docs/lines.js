/* Gold Hairline: единая система тонких линий для страницы гостя.
   Только SVG и inset box-shadow (без border), цвета берутся из темы приглашения.
   Ничего не анимируется, кроме однократной «прорисовки» stroke-dashoffset. */
(function () {
  'use strict';
  var root = document.documentElement;

  function hex(c) { return /^#[0-9a-f]{6}$/i.test(c) ? c : null; }
  function rgb(c) { var h = hex(c); if (!h) return [178, 138, 80]; return [parseInt(h.substr(1, 2), 16), parseInt(h.substr(3, 2), 16), parseInt(h.substr(5, 2), 16)]; }
  function mix(a, b, t) { var A = rgb(a), B = rgb(b); return '#' + [0, 1, 2].map(function (i) { var v = Math.round(A[i] + (B[i] - A[i]) * t); return ('0' + v.toString(16)).slice(-2); }).join(''); }
  function lum(c) { var r = rgb(c).map(function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * r[0] + 0.7152 * r[1] + 0.0722 * r[2]; }

  /* палитра линий из цвета акцента темы: тёмная -> светлее, светлая -> глубже */
  function palette(accent, base) {
    var dark = lum(base) < 0.25;
    var a = hex(accent) || '#B28A50';
    /* на светлом фоне линию делаем глубже и плотнее, иначе 1px теряется на экранах 3x */
    var lo = dark ? mix(a, '#000000', 0.35) : mix(a, '#000000', 0.42);
    var hi = dark ? mix(a, '#ffffff', 0.45) : mix(a, '#000000', 0.22);
    var lc = dark ? rgb(a) : rgb(mix(a, '#000000', 0.38));
    return {
      dark: dark, a: a, lo: lo, hi: hi,
      line: 'rgba(' + lc.join(',') + ',' + (dark ? .65 : .92) + ')',
      soft: 'rgba(' + lc.join(',') + ',' + (dark ? .28 : .5) + ')'
    };
  }

  /* ---- 2.1 рамка с орнаментом: одна SVG, без швов ---- */
  function frameSvg(p) {
    var g = [p.lo, p.hi, p.lo];
    return '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">'
      + '<defs><linearGradient id="g" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="200" y2="200"><stop offset="0" stop-color="' + g[0] + '"/><stop offset=".5" stop-color="' + g[1] + '"/><stop offset="1" stop-color="' + g[2] + '"/></linearGradient>'
      + '<g id="c" fill="none" stroke="url(#g)" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">'
      + '<path d="M66 6.5H22.5Q6.5 6.5 6.5 22.5V66"/><path d="M66 14.5H31.5L14.5 31.5V66"/>'
      + '<path d="M31.5 14.5C42 14.5 45 24.5 55 24.5C62 24.5 63 17.5 58 17.5"/><path d="M14.5 31.5C14.5 42 24.5 45 24.5 55C24.5 62 17.5 63 17.5 58"/>'
      + '<path d="M23 19.5L26.5 23L23 26.5L19.5 23Z" fill="url(#g)" stroke="none"/><circle cx="66" cy="24.5" r="1.3" fill="url(#g)" stroke="none"/><circle cx="24.5" cy="66" r="1.3" fill="url(#g)" stroke="none"/></g></defs>'
      + '<g fill="none" stroke="url(#g)" stroke-width="1"><path d="M60 6.5H140M60 14.5H140M60 193.5H140M60 185.5H140M6.5 60V140M14.5 60V140M193.5 60V140M185.5 60V140"/></g>'
      + '<use href="#c"/><use href="#c" transform="translate(200 0) scale(-1 1)"/><use href="#c" transform="translate(0 200) scale(1 -1)"/><use href="#c" transform="translate(200 200) scale(-1 -1)"/></svg>';
  }


  /* один угол орнамента (66x66) и его зеркальные варианты, без швов: каждый угол отдельная SVG */
  function cornerSvgs(p) {
    function one(tr) {
      var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="66" height="66" viewBox="0 0 66 66"><defs><linearGradient id="g" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="66" y2="66"><stop offset="0" stop-color="' + p.lo + '"/><stop offset=".5" stop-color="' + p.hi + '"/><stop offset="1" stop-color="' + p.lo + '"/></linearGradient></defs>'
        + '<g transform="' + tr + '" fill="none" stroke="url(#g)" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" shape-rendering="geometricPrecision">'
        + '<path d="M66 6.5H22.5Q6.5 6.5 6.5 22.5V66"/><path d="M66 14.5H31.5L14.5 31.5V66"/>'
        + '<path d="M31.5 14.5C42 14.5 45 24.5 55 24.5C62 24.5 63 17.5 58 17.5"/><path d="M14.5 31.5C14.5 42 24.5 45 24.5 55C24.5 62 17.5 63 17.5 58"/>'
        + '<path d="M23 19.5L26.5 23L23 26.5L19.5 23Z" fill="url(#g)" stroke="none"/><circle cx="60" cy="24.5" r="1.3" fill="url(#g)" stroke="none"/><circle cx="24.5" cy="60" r="1.3" fill="url(#g)" stroke="none"/></g></svg>';
      return 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '")';
    }
    return [one(''), one('translate(66 0) scale(-1 1)'), one('translate(0 66) scale(1 -1)'), one('translate(66 66) scale(-1 -1)')];
  }

  /* ---- 2.3 разделитель-орнамент ---- */
  function dividerSvg(p) {
    var s = p.hi, e = p.a;
    return '<svg viewBox="0 0 280 40" width="280" height="40" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">'
      + '<defs><linearGradient id="dl" x1="0" x2="1"><stop offset="0" stop-color="' + e + '" stop-opacity="0"/><stop offset="1" stop-color="' + s + '"/></linearGradient>'
      + '<linearGradient id="dr" x1="0" x2="1"><stop offset="0" stop-color="' + s + '"/><stop offset="1" stop-color="' + e + '" stop-opacity="0"/></linearGradient></defs>'
      + '<g fill="none" stroke="' + p.hi + '" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" shape-rendering="geometricPrecision">'
      + '<path d="M8 20.5H112" stroke="url(#dl)"/><path d="M168 20.5H272" stroke="url(#dr)"/>'
      + '<path d="M112 20.5H119C124 20.5 126 14.5 131 14.5M168 20.5H161C156 20.5 154 14.5 149 14.5"/>'
      + '<path d="M119 20.5C124 20.5 126 26.5 131 26.5M161 20.5C156 20.5 154 26.5 149 26.5"/>'
      + '<path d="M140 8L148 20.5L140 33L132 20.5Z"/><path d="M140 13.5L144.5 20.5L140 27.5L135.5 20.5Z" fill="' + p.hi + '"/>'
      + '<circle cx="104" cy="20.5" r="1.6" fill="' + p.hi + '" stroke="none"/><circle cx="176" cy="20.5" r="1.6" fill="' + p.hi + '" stroke="none"/>'
      + '<path d="M92 20.5L96 17.5M92 20.5L96 23.5M188 20.5L184 17.5M188 20.5L184 23.5"/></g></svg>';
  }

  /* ---- 2.5 двойная арка вокруг фото, одним замкнутым контуром ---- */
  function archSvg(w, h, p) {
    var r = w / 2, gap = 8;
    function path(inset) {
      var x0 = inset + .5, x1 = w - inset - .5, rr = r - inset - .5, top = inset + .5;
      return 'M' + x0 + ' ' + h + 'V' + (top + rr) + 'A' + rr + ' ' + rr + ' 0 0 1 ' + x1 + ' ' + (top + rr) + 'V' + h;
    }
    var cx = w / 2;
    return '<svg class="arc" viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h + '" preserveAspectRatio="none" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">'
      + '<g fill="none" stroke-linecap="round" stroke-linejoin="round" shape-rendering="geometricPrecision" vector-effect="non-scaling-stroke">'
      + '<path d="' + path(0) + '" stroke="' + p.hi + '" stroke-width="1" pathLength="100"/>'
      + '<path d="' + path(gap) + '" stroke="' + p.hi + '" stroke-opacity=".55" stroke-width=".75"/>'
      + '<path d="M' + (cx - 3.5) + ' ' + (gap / 2 + .5) + 'L' + cx + ' ' + (gap / 2 - 3) + 'L' + (cx + 3.5) + ' ' + (gap / 2 + .5) + 'L' + cx + ' ' + (gap / 2 + 4) + 'Z" fill="' + p.hi + '" stroke="none"/>'
      + '</g></svg>';
  }

  function css(p) {
    var f = 'url("data:image/svg+xml,' + encodeURIComponent(frameSvg(p)) + '")';
    var cs = cornerSvgs(p);
    var d = 'url("data:image/svg+xml,' + encodeURIComponent(dividerSvg(p)) + '")';
    return ''
      + ':root{--corner-url:' + cs[0] + ';--corner-url-r:' + cs[1] + ';--corner-url-b:' + cs[2] + ';--corner-url-br:' + cs[3] + ';--gold-line:' + p.line + ';--gold-line-soft:' + p.soft + ';--frame-url:' + f + ';--div-url:' + d + ';--hi:' + p.hi + ';--lo:' + p.lo + '}'
      /* 2.1/2.2 рамка карточки: двойная линия без border и без швов */
      + '#card{box-shadow:inset 0 0 0 1px var(--gold-line),0 40px 90px -60px rgba(0,0,0,.35)!important}'
      + '#card>.in{inset:6px!important;border-radius:16px!important;box-shadow:inset 0 0 0 1px var(--gold-line-soft)!important}'
      + '#card::before{content:"";position:absolute;inset:0;pointer-events:none;z-index:2;background:var(--corner-url) 0 0/48px 48px no-repeat,var(--corner-url-r) 100% 0/48px 48px no-repeat,var(--corner-url-b) 0 100%/48px 48px no-repeat,var(--corner-url-br) 100% 100%/48px 48px no-repeat}'
      /* 2.3 разделитель */
      + '.gdiv{display:block;width:min(280px,80%);height:40px;margin:14px auto 0;background:var(--div-url) center/contain no-repeat;pointer-events:none}'
      /* 2.4 заголовки секций: линии с градиентом к краям и ромб */
      + '.lh{gap:12px!important}.lh i{flex:1!important;width:auto!important;max-width:120px;height:1px!important;background:linear-gradient(90deg,transparent,var(--gold-line))!important}'
      + '.lh i:last-child{transform:scaleX(-1)}.lh p{position:relative;white-space:nowrap}'
      + '.lh p::before{content:"";display:inline-block;width:5px;height:5px;background:var(--hi);transform:rotate(45deg);margin:0 9px 2px 0;vertical-align:middle}'
      /* 2.5 арка */
      + '.arch{border:0!important;box-shadow:none!important;overflow:visible!important;border-radius:0!important;background:none}'
      + '.arch img{border-radius:130px 130px 16px 16px;position:relative;z-index:0;clip-path:inset(0 round 130px 130px 16px 16px)}'
      + '.arch .arc{position:absolute;left:-9px;top:-9px;width:calc(100% + 18px);height:calc(100% + 18px);z-index:1;pointer-events:none;overflow:visible}'
      /* 2.6 кольца таймера: засечки */
      + '.cd>div{box-shadow:inset 0 0 0 1px var(--gold-line)!important;border:0!important}'
      /* 2.7 кнопки: двойная линия */
      + '.ctb,.mb,.cb,.cmb,.ics,.mapb,.cpb{border:0!important;border-radius:999px;box-shadow:inset 0 0 0 1px var(--gold-line),0 0 0 4px var(--lp-bg,transparent),0 0 0 5px var(--gold-line-soft)!important}'
      /* 2.2 прочие карточки: 1px граница -> inset-линия, швов нет */
      + '.vb,.gal button,.gate{border:0!important;box-shadow:inset 0 0 0 1px var(--gold-line)!important}'
      + '.vb{box-shadow:inset 0 0 0 1px var(--gold-line),0 18px 34px -22px rgba(40,25,10,.7)!important}'
      /* 2.8 программа: градиентная линия, точка 7px с кольцом */
      + '.prog .tx{border-left:0!important;position:relative}'
      + '.prog .tx::after{content:"";position:absolute;left:0;top:0;bottom:0;width:1px;background:linear-gradient(180deg,transparent,var(--gold-line) 14%,var(--gold-line) 86%,transparent)}'
      + '.prog li:first-child .tx::after{background:linear-gradient(180deg,transparent,var(--gold-line) 22%,var(--gold-line))}'
      + '.prog .tx:before{left:-3px!important;top:7px!important;width:7px!important;height:7px!important;box-shadow:0 0 0 3px var(--lp-bg,#fff),0 0 0 4px var(--gold-line-soft);z-index:1}'
      + '.prog .tm{font-weight:600}'
      /* 2.9 номер карты */
      + '.gf .cn,.gf [class*=num]{white-space:nowrap;font-variant-numeric:tabular-nums}'
      /* однократная прорисовка линий арки */
      + '.arc path:first-child{stroke-dasharray:100;stroke-dashoffset:100;animation:lndraw .9s .15s cubic-bezier(.22,1,.36,1) forwards}'
      + '@keyframes lndraw{to{stroke-dashoffset:0}}'
      + '@media (prefers-reduced-motion:reduce){.arc path:first-child{animation:none;stroke-dashoffset:0}}';
  }

  var P = null;
  function apply(accent, base) {
    P = palette(accent, base);
    var st = document.getElementById('lines-css');
    if (!st) { st = document.createElement('style'); st.id = 'lines-css'; document.head.appendChild(st); }
    st.textContent = css(P);
    root.style.setProperty('--lp-bg', base || '#fff');
    return P;
  }

  /* вставка декоративных элементов в уже построенную разметку (идемпотентно) */
  function decorate() {
    if (!P) return;
    var card = document.getElementById('card'); if (!card) return;
    /* разделитель под ярлыком типа праздника / между именами и датой */
    var h1 = card.querySelector('h1');
    if (h1 && !card.querySelector('.gdiv')) {
      var d1 = document.createElement('i'); d1.className = 'gdiv'; d1.setAttribute('aria-hidden', 'true');
      h1.parentNode.appendChild(d1);
    }
    /* двойная арка */
    var arch = card.querySelector('.arch');
    if (arch && !arch.querySelector('.arc')) {
      var w = 258, hh = 300;
      var tmp = document.createElement('div'); tmp.innerHTML = archSvg(w, hh, P);
      arch.appendChild(tmp.firstChild);
    }
    /* разделители перед крупными блоками (кроме первого) */
    card.querySelectorAll('.lh').forEach(function (lh) {
      var prev = lh.previousElementSibling;
      if (prev && prev.classList && prev.classList.contains('gdiv')) return;
      var host = lh.parentNode; if (!host || host.querySelector(':scope>.gdiv')) return;
    });
  }

  window.GoldLines = { apply: apply, decorate: decorate, palette: palette, dividerSvg: dividerSvg, frameSvg: frameSvg, archSvg: archSvg };
})();
