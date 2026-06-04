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
    /* Rewrite each iframe src to the embed format required by the IFrame API */
    items.forEach(function (item) {
      if (item.iframe && item.videoId) {
        item.iframe.setAttribute(
          'src',
          'https://www.youtube-nocookie.com/embed/' + item.videoId +
          '?enablejsapi=1&autoplay=0&mute=1&controls=0&rel=0&playsinline=1'
        );
      }
    });

    if (window.YT && window.YT.Player) {
      createPlayers();
      return;
    }

    var prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = function () {
      if (typeof prev === 'function') prev();
      createPlayers();
    };

    var tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
  }

  function createPlayers() {
    items.forEach(function (item, i) {
      if (!item.iframe || !item.videoId) return;

      item.player = new YT.Player('hero-yt-' + i, {
        events: {
          onReady: function (event) {
            var dur = event.target.getDuration();
            item.duration = (dur && dur > 0) ? dur : 120;
            item.ready = true;
            if (item.pendingActivate) {
              item.pendingActivate = false;
              playItem(i);
            }
          },
          onError: function () {
            /* Leave item.ready = false; still image stays visible */
          }
        }
      });
    });

    activateItem(0);
  }

  function playItem(i) { /* implemented in Task 4 */ }
  function activateItem(i) { /* implemented in Task 4 */ }

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
