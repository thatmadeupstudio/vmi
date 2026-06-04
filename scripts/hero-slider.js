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

  /* ── Boot ─────────────────────────────────────────────────────────── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    var container = document.querySelector('.hero-text_container');
    if (!container) return; // not the homepage — bail silently
    var domItems = Array.prototype.slice.call(
      container.querySelectorAll('.w-dyn-item')
    );
    if (!domItems.length) return;
    // remaining setup in later tasks
    console.log('[hero-slider] found', domItems.length, 'items');
  }
})();
