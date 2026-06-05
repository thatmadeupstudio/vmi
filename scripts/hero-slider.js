/* VMI Hero Slider v1.1.14 */
(function () {
  'use strict';

  var SLIDE_DURATION      = 15000;
  var REVEAL_DELAY        = 1000;
  var PLAY_BUFFER         = 500;
  var CONTROLS_HIDE_DELAY = 4500;
  var END_FADE_DUR        = '1.12s';

  var items        = [];
  var activeIdx    = 0;
  var timerStart   = 0;
  var isHovering   = false;
  var rafHandle    = null;
  var initialized  = false;
  var endFadeTimer = null;

  /* ── CSS ───────────────────────────────────────────────────────────── */
  function injectCSS() {
    var st = document.createElement('style');
    st.textContent =
      '.hero-text_container .w-dyn-item .hero-iframe_wrap{transition:opacity .56s;background:#000;z-index:0}' +
      '.hero-text_container .w-dyn-item iframe{opacity:0!important;pointer-events:none!important;transition:opacity .9s}' +
      '.hero-text_container .w-dyn-item:not(.is-active) .hero-title{opacity:0.4!important;transition:opacity .3s}' +
      '.hero-text_container .w-dyn-item.is-active .hero-title{opacity:1!important;transition:opacity .3s}' +
      '.hero-text_container .w-dyn-item:not(.is-active) .hero-playback{opacity:0;transition:opacity .3s}' +
      '.hero-text_container .w-dyn-item.is-active .hero-playback{opacity:1;transition:opacity .3s}' +
      '.hero-playback_progress{width:0%;transition:width .25s linear}' +
      '.hero-yt-mask{position:absolute;top:0;left:0;width:100%;height:100%;z-index:99;pointer-events:none;transition:opacity .7s}';
    document.head.appendChild(st);
  }

  /* ── Video ID ──────────────────────────────────────────────────────── */
  function extractVideoId(src) {
    if (!src) return null;
    var m = src.match(/youtu\.be\/([^?&/]+)/) ||
            src.match(/youtube(?:-nocookie)?\.com\/embed\/([^?&/]+)/) ||
            src.match(/[?&]v=([^?&]+)/);
    return m ? m[1] : null;
  }

  /* ── Iframe visibility ─────────────────────────────────────────────── */
  function showStill(el) {
    var wraps = el.querySelectorAll('.hero-iframe_wrap');
    for (var j = 0; j < wraps.length; j++) {
      wraps[j].style.setProperty('opacity', '1', 'important');
      wraps[j].style.setProperty('pointer-events', 'none', 'important');
    }
  }

  function setIframeVisible(el, visible) {
    var wraps = el.querySelectorAll('.hero-iframe_wrap');
    for (var j = 0; j < wraps.length; j++) {
      wraps[j].style.setProperty('opacity', visible ? '1' : '0', 'important');
      wraps[j].style.setProperty('pointer-events', 'none', 'important');
    }
    var iframes = el.querySelectorAll('iframe');
    for (var j = 0; j < iframes.length; j++) {
      iframes[j].style.setProperty('opacity', visible ? '1' : '0', 'important');
    }
  }

  /* ── End-fade transition override ─────────────────────────────────── */
  function setEndFade(on) {
    items.forEach(function (item) {
      var wraps = item.el.querySelectorAll('.hero-iframe_wrap');
      for (var j = 0; j < wraps.length; j++) {
        if (on) {
          wraps[j].style.setProperty('transition', 'opacity ' + END_FADE_DUR, 'important');
        } else {
          wraps[j].style.removeProperty('transition');
        }
      }
    });
  }

  /* ── Read still image source for mask background ───────────────────── */
  function getStillBg(wrap) {
    var children = Array.prototype.slice.call(wrap.children);
    for (var j = 0; j < children.length; j++) {
      var ch = children[j];
      if (ch.tagName.toLowerCase() === 'iframe') continue;
      if (ch.className && ch.className.indexOf('hero-yt-mask') !== -1) continue;
      var img = ch.tagName.toLowerCase() === 'img' ? ch : ch.querySelector('img');
      if (img) {
        var src = img.currentSrc || img.getAttribute('src');
        if (src) return 'url("' + src + '") center/cover no-repeat';
      }
      var bg = window.getComputedStyle(ch).backgroundImage;
      if (bg && bg !== 'none') return bg + ' center / cover no-repeat';
    }
    return '#000';
  }

  /* ── Per-item video setup ──────────────────────────────────────────── */
  function setupItemVideo(idx) {
    var item = items[idx];
    if (!item.videoId || item.videoSetupAt > 0) return;

    var embedUrl =
      'https://www.youtube.com/embed/' + item.videoId +
      '?autoplay=1&mute=1&controls=0&disablekb=1&iv_load_policy=3' +
      '&cc_load_policy=0&loop=1&playlist=' + item.videoId +
      '&rel=0&playsinline=1&start=30&enablejsapi=1' +
      '&origin=' + encodeURIComponent(window.location.origin);

    var newIframe = document.createElement('iframe');
    newIframe.setAttribute('frameborder', '0');
    newIframe.setAttribute('allow', 'autoplay; encrypted-media');
    newIframe.setAttribute('allowfullscreen', '');
    newIframe.className = item.iframe ? (item.iframe.className || '') : '';
    newIframe.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;';
    newIframe.setAttribute('src', embedUrl);

    var wrap;
    if (item.iframe && item.iframe.parentNode) {
      wrap = item.iframe.parentNode;
      wrap.replaceChild(newIframe, item.iframe);
    } else {
      wrap = item.el.querySelector('.hero-iframe_wrap') || item.el;
      wrap.appendChild(newIframe);
    }
    item.iframe       = newIframe;
    item.videoSetupAt = performance.now();
    item.videoPlaying = false;

    var existingMask = wrap.querySelector('.hero-yt-mask');
    if (existingMask) existingMask.parentNode.removeChild(existingMask);
    var mask = document.createElement('div');
    mask.className = 'hero-yt-mask';
    mask.style.background = getStillBg(wrap);
    wrap.appendChild(mask);
    item.maskEl = mask;
  }

  /* ── Replace all original iframes with blank placeholders ─────────── */
  function clearOriginalIframes() {
    items.forEach(function (item) {
      if (item.iframe && item.iframe.parentNode) {
        var blank = document.createElement('iframe');
        blank.className = item.iframe.className || '';
        blank.setAttribute('frameborder', '0');
        blank.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;';
        item.iframe.parentNode.replaceChild(blank, item.iframe);
        item.iframe = blank;
      }
      item.videoSetupAt = 0;
      item.videoPlaying = false;
    });
  }

  /* ── YouTube play-state detection ──────────────────────────────────── */
  function onYouTubeMessage(e) {
    if (e.origin !== 'https://www.youtube.com') return;
    var d;
    try { d = typeof e.data === 'string' ? JSON.parse(e.data) : e.data; } catch (err) { return; }
    var rawState = d.event === 'onStateChange' ? d.info :
                   (d.event === 'infoDelivery' && d.info) ? d.info.playerState : null;
    if (rawState !== 1) return;
    items.forEach(function (item) {
      if (item.iframe && item.iframe.contentWindow === e.source && !item.videoPlaying) {
        item.videoPlaying = true;
        var idx = items.indexOf(item);
        if (idx !== activeIdx) return;
        clearTimeout(item.revealTimer);
        item.revealTimer = setTimeout(function () {
          if (activeIdx !== idx) return;
          doReveal(idx);
        }, PLAY_BUFFER);
      }
    });
  }

  function doReveal(idx) {
    var item = items[idx];
    setIframeVisible(item.el, true);
    clearTimeout(item.stillFadeTimer);
    item.stillFadeTimer = setTimeout(function () {
      if (activeIdx !== idx) return;
      if (item.maskEl) item.maskEl.style.opacity = '0';
      cancelAnimationFrame(rafHandle);
      timerStart = performance.now();
      rafHandle  = requestAnimationFrame(tick);
    }, CONTROLS_HIDE_DELAY);
  }

  /* ── Reveal timing — fallback if YT state=1 never fires ──────────── */
  function revealWhenReady(idx) {
    var item = items[idx];
    clearTimeout(item.revealTimer);
    var elapsed = item.videoSetupAt > 0 ? performance.now() - item.videoSetupAt : 0;
    var delay   = Math.max(0, REVEAL_DELAY - elapsed);
    item.revealTimer = setTimeout(function () {
      if (activeIdx !== idx) return;
      doReveal(idx);
    }, delay);
  }

  /* ── Slide control ─────────────────────────────────────────────────── */
  /* immediate=true: hover-triggered. immediate=false: auto-advance. Both load video. */
  function activateItem(i, immediate) {
    clearTimeout(endFadeTimer);
    if (initialized) setEndFade(true);
    else initialized = true;

    items.forEach(function (item) {
      item.el.classList.remove('is-active');
      setIframeVisible(item.el, false);
      clearTimeout(item.revealTimer);
      item.revealTimer = null;
      clearTimeout(item.stillFadeTimer);
      item.stillFadeTimer = null;
      if (item.progressEl) item.progressEl.style.width = '0%';
    });

    cancelAnimationFrame(rafHandle);
    rafHandle  = null;
    timerStart = 0;

    items[i].videoSetupAt = 0;
    items[i].videoPlaying = false;

    activeIdx = i;
    items[i].el.classList.add('is-active');
    setupItemVideo(i);
    revealWhenReady(i);

    var idx = i;
    requestAnimationFrame(function () {
      if (activeIdx === idx) showStill(items[idx].el);
    });

    endFadeTimer = setTimeout(setEndFade.bind(null, false), 1200);

    items.forEach(function (it) {
      if (it.counterEl) it.counterEl.textContent = (i + 1) + '/' + items.length;
    });
  }

  function tick() {
    var elapsed = performance.now() - timerStart;
    var pct     = Math.min(elapsed / SLIDE_DURATION, 1) * 100;
    var bar     = items[activeIdx] && items[activeIdx].progressEl;
    if (bar) bar.style.width = pct + '%';
    if (elapsed >= SLIDE_DURATION) {
      if (!isHovering) activateItem((activeIdx + 1) % items.length, false);
      return;
    }
    rafHandle = requestAnimationFrame(tick);
  }

  /* ── Boot ──────────────────────────────────────────────────────────── */
  injectCSS();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    var container = document.querySelector('.hero-text_container');
    if (!container) return;

    var domItems = Array.prototype.slice.call(container.querySelectorAll('.w-dyn-item')).filter(function (el) {
      return el.parentNode === container;
    });
    if (!domItems.length) return;

    domItems.forEach(function (el) {
      var iframe = el.querySelector('iframe');
      items.push({
        el:           el,
        iframe:       iframe,
        videoId:      iframe ? extractVideoId(
                        iframe.getAttribute('src') || iframe.getAttribute('data-src') || ''
                      ) : null,
        counterEl:    el.querySelector('.hero-playback_counter'),
        progressEl:   el.querySelector('.hero-playback_progress'),
        videoSetupAt:   0,
        videoPlaying:   false,
        revealTimer:    null,
        stillFadeTimer: null,
        maskEl:         null,
      });
    });

    clearOriginalIframes();

    var startIdx = 0;
    showStill(items[startIdx].el);
    setTimeout(function () { showStill(items[startIdx].el); }, 300);

    setupItemVideo(startIdx);
    setTimeout(function () { activateItem(startIdx, false); }, 1000);

    container.addEventListener('mouseenter', function () { isHovering = true; });
    container.addEventListener('mouseleave', function () {
      isHovering = false;
      if (timerStart > 0 && (performance.now() - timerStart) >= SLIDE_DURATION) {
        activateItem((activeIdx + 1) % items.length, false);
      }
    });

    domItems.forEach(function (el, i) {
      el.addEventListener('mouseenter', function () {
        if (i !== activeIdx) {
          activateItem(i, true);
        } else if (items[i].videoSetupAt === 0) {
          setupItemVideo(i);
          revealWhenReady(i);
        }
      });

      var titleLink = el.querySelector('.hero-title');
      if (titleLink) {
        titleLink.addEventListener('touchstart', function (e) {
          if (i !== activeIdx) {
            e.preventDefault();
            activateItem(i, true);
          } else if (items[i].videoSetupAt === 0) {
            e.preventDefault();
            setupItemVideo(i);
            revealWhenReady(i);
          }
        }, { passive: false });
      }
    });

    window.addEventListener('message', onYouTubeMessage);
  }
})();
