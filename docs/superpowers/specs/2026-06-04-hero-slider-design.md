# Hero Slider — Design Spec
**Date:** 2026-06-04  
**Status:** Approved

---

## Problem

The homepage hero has 5 film titles in a Webflow CMS list. Hover reveals each title's production still, but:
- No title is active by default (nothing shows on load)
- No auto-rotation exists
- Trailers don't play
- YouTube iframe `src` attributes use the wrong format (`youtu.be/ID` instead of embed URL)
- `id="hero-yt"` and `id="hero-yt-progress"` are duplicated across all 5 items

---

## Goals

1. Always show exactly 1 active title (retain last hover, default to first on load)
2. Auto-rotate through all 5 titles every 10 seconds, looping
3. Active title plays its YouTube trailer, muted, starting at 50% of the video's duration
4. Progress bar shows the 10s rotation countdown
5. Hover pauses the timer; mouse-out resumes from where it paused
6. Keep all existing styles unchanged

---

## DOM Structure (current)

```
div.slider.w-dyn-list
  div.hero-text_container.w-dyn-items
    div.w-dyn-item  ×5
      div.hero-playback
        div.hero-playback_track
          div#hero-yt-progress.hero-playback_progress   ← duplicate IDs, needs fix
        p.hero-playback_counter                         ← shows "1/5"
      div.s-8
        a.hero-title[href="/titles/slug"]               ← title text link
      div.hero-iframe_wrap                              ← hidden by Webflow CSS default
        iframe#hero-yt[src="https://youtu.be/ID"]       ← wrong format + duplicate IDs
        div.hero_slider[style="background-image:url(…)"]
          div.title-hero_overlay
```

---

## Architecture

**Delivery:** Single `<script>` block in Webflow page-level custom code, placed Before `</body>`. No new HTML elements. No changes to Webflow Designer.

### State

| Variable | Type | Description |
|---|---|---|
| `items` | array | One entry per `.w-dyn-item`: `{ el, iframe, player, duration, ready }` |
| `activeIdx` | number | Index of currently active item (0–4) |
| `timerElapsed` | number | ms accumulated before the current pause |
| `timerStart` | number | `performance.now()` when timer last resumed |
| `isHovering` | bool | True while mouse is over the title list |
| `rafHandle` | number | `requestAnimationFrame` ref for cleanup |

### Constants

```js
const SLIDE_DURATION = 10000; // ms per title
```

---

## YouTube IFrame API Integration

### URL conversion

Each iframe `src` is extracted and rewritten:

```
https://youtu.be/VIDEO_ID          →  extract VIDEO_ID
https://youtu.be/VIDEO_ID?si=…     →  extract VIDEO_ID (strip query)
```

Replaced with:
```
https://www.youtube-nocookie.com/embed/VIDEO_ID
  ?enablejsapi=1
  &autoplay=0
  &mute=1
  &controls=0
  &rel=0
  &playsinline=1
```

### Player init

- `id="hero-yt"` duplicates replaced with `id="hero-yt-0"` … `id="hero-yt-4"`
- `id="hero-yt-progress"` duplicates replaced with `id="hero-yt-progress-0"` … `id="hero-yt-progress-4"`
- One `YT.Player` created per iframe after `YT.ready()`
- `onReady`: set `items[i].duration = player.getDuration()`, set `items[i].ready = true`
- If item `i` is currently active and was waiting for ready: seek + play

### Playback

On `activateItem(i)`:
- If `items[i].ready`: `player.seekTo(duration / 2, true)` then `player.playVideo()`
- If not ready: flag `pendingActivate = true`; handled in `onReady` callback

On `deactivateItem(i)`:
- `player.pauseVideo()`

---

## Timer & Progress Bar

```
Tick loop (rAF):
  elapsed = timerElapsed + (performance.now() - timerStart)
  progress bar width = min(elapsed / SLIDE_DURATION, 1) × 100 %
  if elapsed >= SLIDE_DURATION → advance()

advance():
  activeIdx = (activeIdx + 1) % items.length
  activateItem(activeIdx)   ← resets timerElapsed = 0, timerStart = now

Hover start (mouseenter on .hero-text_container):
  timerElapsed += (performance.now() - timerStart)
  cancelAnimationFrame(rafHandle)
  isHovering = true

Hover end (mouseleave on .hero-text_container):
  isHovering = false
  timerStart = performance.now()
  rafHandle = requestAnimationFrame(tick)

Title hover (mouseenter on individual .w-dyn-item):
  activateItem(i)           ← fresh timer on the new item; timer stays paused (isHovering=true)
```

---

## Active / Inactive Visual State

**Injected CSS** (appended to `<head>` at script init):

```css
.hero-text_container .w-dyn-item .hero-iframe_wrap {
  visibility: hidden !important;
}
.hero-text_container .w-dyn-item.is-active .hero-iframe_wrap {
  visibility: visible !important;
}
.hero-text_container .w-dyn-item:not(.is-active) .hero-title {
  opacity: 0.4;
}
.hero-text_container .w-dyn-item.is-active .hero-title {
  opacity: 1;
}
.hero-playback_progress {
  width: 0%;
  transition: width 0.1s linear;
}
```

**JS class toggling:**
- `activateItem(i)`: adds `is-active` to item `i`, removes from all others
- Updates `.hero-playback_counter` text to `"${i + 1}/${items.length}"`

---

## Counter

The `hero-playback_counter` element inside each item shows the global slide position (e.g., "2/5"). Updated on every `activateItem()` call — only the active item's counter is visible in practice, but all are kept in sync.

---

## Edge Cases

| Scenario | Handling |
|---|---|
| YouTube API not loaded (network fail) | Script catches error; still images remain visible; no JS errors |
| Player not ready when item activates | `pendingActivate` flag; play triggers in `onReady` |
| `getDuration()` returns 0 or NaN | Fallback: `seekTo(60)` (1 minute in as safe default) |
| Single item in list | Rotation disabled; item stays permanently active |
| Mobile (touch) | `touchstart` on item title triggers `activateItem`; no hover events needed |

---

## Out of Scope

- Sound / unmute controls (muted silent playback only)
- Video end detection (rotation is timer-based, not video-end-based)
- Changes to Webflow Designer elements or CMS structure
