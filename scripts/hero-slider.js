/* VMI Hero Slider v1.0.0
   Auto-rotating hero: 10s per title, hover pauses, YouTube trailer from 50%.
   Paste into Webflow → Page Settings → Custom Code → Before </body>        */
(function () {
  'use strict';

  var SLIDE_DURATION = 10000; // ms per title

  /* State */
  var items      = [];   // [{el, iframe, videoId, player, duration, ready, pendingActivate, counterEl, progressEl}]
  var activeIdx  = 0;
  var timerElapsed = 0;  // ms accumulated before current pause
  var timerStart   = 0;  // performance.now() when timer last resumed
  var isHovering   = false;
  var rafHandle    = null;

  /* ── CSS Injection ───────────────────────────────────────────────── */
  function injectCSS() {
    var st = document.createElement('style');
    st.textContent =
      '.hero-text_container .w-dyn-item .hero-iframe_wrap{visibility:hidden!important}' +
      '.hero-text_container .w-dyn-item.is-active .hero-iframe_wrap{visibility:visible!important}' +
      '.hero-text_container .w-dyn-item:not(.is-active) .hero-title{opacity:0.4;transition:opacity .3s}' +
      '.hero-text_container .w-dyn-item.is-active .hero-title{opacity:1;transition:opacity .3s}' +
      '.hero-playback_progress{width:0%;transition:width .1s linear}';
    document.head.appendChild(st);
  }

  /* ── Video ID Extraction ──────────────────────────────────────────── */
  function extractVideoId(src) {
    if (!src) return null;
    var m = src.match(/youtu\.be\/([^?&/]+)/) ||
            src.match(/youtube\.com\/embed\/([^?&/]+)/) ||
            src.match(/[?&]v=([^?&]+)/);
    return m ? m[1] : null;
  }

  /* ── YouTube API Loader (Task 3) ──────────────────────────────────── */
  function loadYouTubeAPI() {
    /* implemented in Task 3 */
  }

  /* ── Boot ─────────────────────────────────────────────────────────── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    var container = document.querySelector('.hero-text_container');
    if (!container) return;
    var domItems = Array.prototype.slice.call(
      container.querySelectorAll('.w-dyn-item')
    );
    if (!domItems.length) return;

    injectCSS();

    domItems.forEach(function (el, i) {
      var iframe      = el.querySelector('iframe');
      var progressEl  = el.querySelector('.hero-playback_progress');
      var counterEl   = el.querySelector('.hero-playback_counter');

      /* Fix duplicate IDs */
      if (iframe)     iframe.id     = 'hero-yt-' + i;
      if (progressEl) progressEl.id = 'hero-yt-progress-' + i;

      items.push({
        el:             el,
        iframe:         iframe,
        videoId:        iframe ? extractVideoId(iframe.getAttribute('src')) : null,
        player:         null,
        duration:       0,
        ready:          false,
        pendingActivate: false,
        counterEl:      counterEl,
        progressEl:     progressEl,
      });
    });

    loadYouTubeAPI();
  }
})();
