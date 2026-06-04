# Hero Slider Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite the VMI homepage hero as an auto-rotating slider — retains last hovered title, rotates every 10s, plays each title's YouTube trailer (muted, from 50% duration) while showing the production still.

**Architecture:** A single IIFE script in `scripts/hero-slider.js` pasted into Webflow page custom code (Before `</body>`). Loads the YouTube IFrame API, creates one `YT.Player` per hero item, manages an rAF-based 10s timer with hover-pause, and toggles an `is-active` class to control visibility.

**Tech Stack:** Vanilla JS (ES5-compatible), YouTube IFrame API, `requestAnimationFrame`, Webflow CMS list DOM

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `scripts/hero-slider.js` | Create | Complete slider script — copy/paste into Webflow custom code |

---

## Task 1: Scaffold IIFE + constants + DOM init guard

**Files:**
- Create: `scripts/hero-slider.js`

- [ ] **Step 1: Create the file with IIFE wrapper, constants, and a DOM-ready guard**

```javascript
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
```

- [ ] **Step 2: Verify the file exists and is valid JS**

```bash
node --check scripts/hero-slider.js && echo "OK"
```
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add scripts/hero-slider.js
git commit -m "feat(hero): scaffold hero slider IIFE"
```

---

## Task 2: Inject CSS + fix duplicate IDs + build items array

**Files:**
- Modify: `scripts/hero-slider.js`

The live DOM has `id="hero-yt"` and `id="hero-yt-progress"` duplicated on all 5 items. This task fixes those and builds the `items` array.

- [ ] **Step 1: Add `injectCSS()` and the items-building loop inside `init()`**

Replace the body of `init()` (after the early-return guards) with:

```javascript
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
```

- [ ] **Step 2: Add `injectCSS()` function (inside the IIFE, before `init`)**

```javascript
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
```

- [ ] **Step 3: Add `extractVideoId()` helper (inside IIFE, before `init`)**

Handles `youtu.be/ID`, `youtu.be/ID?si=…`, `youtube.com/embed/ID`, `youtube.com/watch?v=ID`.

```javascript
  function extractVideoId(src) {
    if (!src) return null;
    var m = src.match(/youtu\.be\/([^?&/]+)/) ||
            src.match(/youtube\.com\/embed\/([^?&/]+)/) ||
            src.match(/[?&]v=([^?&]+)/);
    return m ? m[1] : null;
  }
```

- [ ] **Step 4: Add `loadYouTubeAPI()` stub (inside IIFE, before `init`) — just a stub so the file stays runnable**

```javascript
  function loadYouTubeAPI() {
    /* implemented in Task 3 */
  }
```

- [ ] **Step 5: Syntax-check**

```bash
node --check scripts/hero-slider.js && echo "OK"
```
Expected: `OK`

- [ ] **Step 6: Commit**

```bash
git add scripts/hero-slider.js
git commit -m "feat(hero): inject CSS, fix duplicate IDs, build items array"
```

---

## Task 3: YouTube IFrame API + player creation

**Files:**
- Modify: `scripts/hero-slider.js`

Replace the `loadYouTubeAPI()` stub and add `createPlayers()`.

- [ ] **Step 1: Replace `loadYouTubeAPI()` stub with full implementation**

```javascript
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
      /* API already present (e.g. another embed loaded it first) */
      createPlayers();
      return;
    }

    /* Queue our callback alongside any existing one */
    var prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = function () {
      if (typeof prev === 'function') prev();
      createPlayers();
    };

    var tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
  }
```

- [ ] **Step 2: Add `createPlayers()` (inside IIFE, after `loadYouTubeAPI`)**

```javascript
  function createPlayers() {
    items.forEach(function (item, i) {
      if (!item.iframe || !item.videoId) return;

      item.player = new YT.Player('hero-yt-' + i, {
        events: {
          onReady: function (event) {
            var dur = event.target.getDuration();
            item.duration = (dur && dur > 0) ? dur : 120; /* 2-min fallback */
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

    activateItem(0); /* start with first title */
  }
```

- [ ] **Step 3: Add `playItem()` stub so the file stays runnable**

```javascript
  function playItem(i) { /* implemented in Task 4 */ }
  function activateItem(i) { /* implemented in Task 4 */ }
```

- [ ] **Step 4: Syntax-check**

```bash
node --check scripts/hero-slider.js && echo "OK"
```
Expected: `OK`

- [ ] **Step 5: Commit**

```bash
git add scripts/hero-slider.js
git commit -m "feat(hero): load YouTube IFrame API, create players"
```

---

## Task 4: `activateItem()` + `playItem()` + visual state

**Files:**
- Modify: `scripts/hero-slider.js`

Replace the stubs added in Task 3.

- [ ] **Step 1: Replace `activateItem()` stub**

```javascript
  function activateItem(i) {
    /* Deactivate all items */
    items.forEach(function (item, idx) {
      item.el.classList.remove('is-active');
      if (item.player && item.ready && idx !== i) {
        try { item.player.pauseVideo(); } catch (e) {}
      }
    });

    activeIdx = i;
    var item = items[i];
    item.el.classList.add('is-active');

    /* Update counter on every item (only active one is visible, but keep all in sync) */
    items.forEach(function (it) {
      if (it.counterEl) {
        it.counterEl.textContent = (i + 1) + '/' + items.length;
      }
    });

    /* Reset progress bar */
    if (item.progressEl) item.progressEl.style.width = '0%';

    /* Start or queue trailer */
    if (item.ready) {
      playItem(i);
    } else {
      item.pendingActivate = true;
    }

    /* Reset timer */
    timerElapsed = 0;
    timerStart   = performance.now();

    /* Start tick only if not hovering */
    cancelAnimationFrame(rafHandle);
    if (!isHovering) {
      rafHandle = requestAnimationFrame(tick);
    }
  }
```

- [ ] **Step 2: Replace `playItem()` stub**

```javascript
  function playItem(i) {
    var item = items[i];
    if (!item.player || !item.ready) return;
    var startSec = Math.floor(item.duration / 2);
    try {
      item.player.seekTo(startSec, true);
      item.player.playVideo();
    } catch (e) {}
  }
```

- [ ] **Step 3: Add `tick()` stub and `advance()` stub (inside IIFE)**

```javascript
  function tick() { /* implemented in Task 5 */ }
  function advance() { /* implemented in Task 5 */ }
```

- [ ] **Step 4: Syntax-check**

```bash
node --check scripts/hero-slider.js && echo "OK"
```
Expected: `OK`

- [ ] **Step 5: Commit**

```bash
git add scripts/hero-slider.js
git commit -m "feat(hero): activateItem, playItem, visual is-active state"
```

---

## Task 5: Timer — `tick()`, `advance()`, progress bar

**Files:**
- Modify: `scripts/hero-slider.js`

Replace the stubs from Task 4.

- [ ] **Step 1: Replace `tick()` stub**

```javascript
  function tick() {
    var elapsed = timerElapsed + (performance.now() - timerStart);
    var item = items[activeIdx];

    /* Update progress bar */
    if (item && item.progressEl) {
      var pct = Math.min(elapsed / SLIDE_DURATION, 1) * 100;
      item.progressEl.style.width = pct + '%';
    }

    if (elapsed >= SLIDE_DURATION) {
      advance();
      return; /* advance() starts a new tick via activateItem */
    }

    rafHandle = requestAnimationFrame(tick);
  }
```

- [ ] **Step 2: Replace `advance()` stub**

```javascript
  function advance() {
    var nextIdx = (activeIdx + 1) % items.length;
    activateItem(nextIdx); /* activateItem resets the timer and starts tick */
  }
```

- [ ] **Step 3: Syntax-check**

```bash
node --check scripts/hero-slider.js && echo "OK"
```
Expected: `OK`

- [ ] **Step 4: Commit**

```bash
git add scripts/hero-slider.js
git commit -m "feat(hero): tick loop, advance, progress bar"
```

---

## Task 6: Hover + touch handlers

**Files:**
- Modify: `scripts/hero-slider.js`

Add event listeners inside `init()`, after the `loadYouTubeAPI()` call.

- [ ] **Step 1: Add container-level + item-level hover handlers inside `init()`**

Add these lines at the end of `init()`, after `loadYouTubeAPI()`:

```javascript
    /* ── Hover handlers ─────────────────────────────────────────── */
    /* Container mouseenter: freeze timer */
    container.addEventListener('mouseenter', function () {
      if (!isHovering) {
        isHovering = true;
        timerElapsed += performance.now() - timerStart;
        cancelAnimationFrame(rafHandle);
      }
    });

    /* Container mouseleave: resume timer from where it paused */
    container.addEventListener('mouseleave', function () {
      if (isHovering) {
        isHovering = false;
        timerStart = performance.now();
        rafHandle  = requestAnimationFrame(tick);
      }
    });

    /* Per-item mouseenter: switch active title (timer stays frozen because
       container mouseenter fires first and sets isHovering = true) */
    domItems.forEach(function (el, i) {
      el.addEventListener('mouseenter', function () {
        if (i !== activeIdx) {
          activateItem(i);
          /* activateItem resets timerElapsed = 0 → new item gets a fresh 10s
             but tick won't start because isHovering = true                    */
        }
      });

      /* Touch: same behaviour, prevent ghost click */
      var titleLink = el.querySelector('.hero-title');
      if (titleLink) {
        titleLink.addEventListener('touchstart', function (e) {
          e.preventDefault();
          if (i !== activeIdx) {
            /* Briefly fake hover state so activateItem doesn't start tick */
            isHovering = true;
            activateItem(i);
            /* Let the timer run on touch — no mouseleave will fire */
            isHovering = false;
            timerStart = performance.now();
            rafHandle  = requestAnimationFrame(tick);
          }
        }, { passive: false });
      }
    });
```

- [ ] **Step 2: Syntax-check**

```bash
node --check scripts/hero-slider.js && echo "OK"
```
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add scripts/hero-slider.js
git commit -m "feat(hero): hover pause/resume and touch handlers"
```

---

## Task 7: Manual verification in Webflow

**Files:**
- Webflow Designer → Home page → Page Settings → Custom Code → Before `</body>`

- [ ] **Step 1: Copy the full script content**

```bash
cat scripts/hero-slider.js | pbcopy
```

- [ ] **Step 2: Paste into Webflow**

Open Webflow Designer → select the Home page → click the gear icon (Page Settings) → scroll to "Custom Code" → find "Before `</body>` tag" → paste the script → Save.

- [ ] **Step 3: Open the Webflow preview and verify the checklist**

| Check | Expected |
|-------|----------|
| On load, first title is active | First `.hero-title` at full opacity, its production still visible |
| Inactive titles dimmed | Other `.hero-title` elements at ~40% opacity |
| Progress bar fills | `hero-playback_progress` width increases from 0% to 100% over 10s |
| Counter updates | `hero-playback_counter` shows "1/5", changes to "2/5" on advance |
| Auto-advance | After 10s, second title activates (still + new trailer) |
| Trailer plays | YouTube player visible, playing muted from ~midpoint |
| Hover pauses | Move mouse onto title list → progress bar freezes |
| Hover different title | Hovering a different title immediately activates it |
| Mouse-out resumes | Progress bar resumes from where it paused |
| Loop | After title 5, wraps back to title 1 |
| No console errors | Browser devtools Console shows no JS errors |

- [ ] **Step 4: Publish the Webflow site**

Webflow Designer → Publish → Publish to webflow.io

- [ ] **Step 5: Commit final state of the script file**

```bash
git add scripts/hero-slider.js
git commit -m "feat(hero): complete hero slider — auto-rotate, hover pause, YouTube trailers"
```

---

## Self-Review Notes

**Spec coverage:**
- ✅ Always 1 active title — `activateItem(0)` on init, `is-active` class management
- ✅ Auto-rotate 10s — `tick()` / `advance()` / `SLIDE_DURATION = 10000`
- ✅ Hover retains last title — `container.mouseenter` freezes timer; `item.mouseenter` switches `is-active`
- ✅ Hover resumes from paused — `timerElapsed` accumulates before pause, `timerStart` resets on resume
- ✅ Trailer plays from 50% — `playItem()` calls `seekTo(duration / 2)` + `playVideo()`
- ✅ Muted — embed URL includes `mute=1`
- ✅ Progress bar — `tick()` sets `progressEl.style.width`
- ✅ Counter updates — `activateItem()` updates all `.hero-playback_counter` elements
- ✅ Wrong iframe src format — `loadYouTubeAPI()` rewrites all srcs to embed format
- ✅ Duplicate IDs — fixed in `init()` loop
- ✅ Player not ready on activate — `pendingActivate` flag, handled in `onReady`
- ✅ `getDuration()` returns 0 — fallback to 120s in `onReady`
- ✅ YouTube API load fail — `onError` handler leaves `ready = false`; still image stays
- ✅ Single item — `advance()` loops to `(0 + 1) % 1 = 0`, re-activates same item
- ✅ Touch support — `touchstart` on `.hero-title` in each item
- ✅ No new Webflow HTML — all via class toggling and injected `<style>`
