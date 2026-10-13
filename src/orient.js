// Landscape on phones/tablets without the player having to rotate the device (desktop untouched):
// 1. PWA manifest orientation "landscape" (installed app opens in landscape).
// 2. First tap/start: fullscreen + screen.orientation.lock('landscape') where supported (Android Chrome / PWA).
// 3. Fallback (iOS Safari, rotation lock, anything that stays portrait): the whole game (#stage) is CSS-rotated 90°
//    clockwise and sized to the swapped viewport, so it is displayed and played in landscape while the device reports
//    portrait. Browsers hit-test touches through CSS transforms, so DOM buttons/menus/touch controls just work; code
//    that needs screen dimensions uses viewSize() (renderer, camera aspect, post FX) instead of innerWidth/innerHeight.
const coarse = typeof matchMedia === 'function' && (matchMedia('(pointer: coarse)').matches || (navigator.maxTouchPoints || 0) > 0 && !matchMedia('(pointer: fine)').matches);
const forced = typeof location !== 'undefined' && new URLSearchParams(location.search).get('rotate'); // ?rotate=1 / ?rotate=0 for testing
export function isRotated() {
  if (forced === '0') return false;
  if (!coarse && forced !== '1') return false;
  return innerHeight > innerWidth;
}
export function viewSize() { const r = isRotated(); return r ? { w: innerHeight, h: innerWidth, rotated: true } : { w: innerWidth, h: innerHeight, rotated: false }; }

function apply() {
  const r = isRotated(), root = document.documentElement;
  root.classList.toggle('rot', r);
  root.style.setProperty('--sw', (r ? innerHeight : innerWidth) + 'px');
  root.style.setProperty('--sh', (r ? innerWidth : innerHeight) + 'px');
  window.__rotated = r;
}
apply(); // before the game measures anything
addEventListener('resize', apply, { capture: true });
addEventListener('orientationchange', () => { apply(); setTimeout(() => { apply(); dispatchEvent(new Event('resize')); }, 250); });
if (window.visualViewport) visualViewport.addEventListener('resize', apply);

export function installOrientation() {
  if (!coarse) return { coarse };
  const tryLock = async () => {
    try {
      const d = document.documentElement;
      if (!document.fullscreenElement && d.requestFullscreen) await d.requestFullscreen({ navigationUI: 'hide' });
    } catch { /* not allowed (iOS Safari) */ }
    try { if (screen.orientation && screen.orientation.lock) await screen.orientation.lock('landscape'); } catch { /* unsupported -> CSS rotation */ }
    apply(); dispatchEvent(new Event('resize'));
  };
  addEventListener('pointerdown', tryLock, { once: true, capture: true });
  addEventListener('touchend', tryLock, { once: true, capture: true });
  return { coarse };
}

// ---- finger scrolling for menus while the stage is CSS-rotated ----
// Native touch scrolling of a rotated scroller is unreliable (iOS Safari pans along the device axis / not at all), so in
// rotated mode #ui is touch-action:none and we scroll ourselves: the finger delta is mapped into stage coordinates
// (90° cw: stage dy = -device dx, stage dx = device dy), applied to the nearest scrollable ancestor (vertical or
// horizontal), with momentum. A drag beyond 8 px cancels the tap so buttons are not triggered while scrolling.
const toStage = (dx, dy) => ({ x: dy, y: -dx });
function scrollableAncestor(el, axis) {
  for (let e = el; e && e !== document.documentElement; e = e.parentElement) {
    if (e.id === 'hud') return null;
    const cs = getComputedStyle(e);
    if (axis === 'y' && /(auto|scroll)/.test(cs.overflowY) && e.scrollHeight > e.clientHeight + 1) return e;
    if (axis === 'x' && /(auto|scroll)/.test(cs.overflowX) && e.scrollWidth > e.clientWidth + 1) return e;
    if (e.id === 'stage') return null;
  }
  return null;
}
let drag = null, momentum = 0, suppressClick = false;
function canScroll(el, axis, d) { // d > 0: scrolling towards the end
  if (axis === 'y') return d > 0 ? el.scrollTop < el.scrollHeight - el.clientHeight - 0.5 : el.scrollTop > 0.5;
  return d > 0 ? el.scrollLeft < el.scrollWidth - el.clientWidth - 0.5 : el.scrollLeft > 0.5;
}
addEventListener('touchstart', (e) => {
  cancelAnimationFrame(momentum);
  if (!window.__rotated || e.touches.length !== 1 || !e.target.closest || !e.target.closest('#ui, .panel, .pause-menu') || e.target.closest('select, textarea')) { drag = null; return; }
  const t = e.touches[0];
  drag = { range: e.target.closest('input[type=range]'), x0: t.clientX, y0: t.clientY, x: t.clientX, y: t.clientY, t: performance.now(), vx: 0, vy: 0, target: e.target, moved: false, ey: null, ex: null };
}, { passive: true, capture: true });
addEventListener('touchmove', (e) => {
  if (!drag || !window.__rotated) return;
  const t = e.touches[0], now = performance.now();
  const s = toStage(t.clientX - drag.x, t.clientY - drag.y), tot = toStage(t.clientX - drag.x0, t.clientY - drag.y0);
  if (!drag.moved && Math.hypot(tot.x, tot.y) > 8) {
    drag.moved = true;
    drag.axis = Math.abs(tot.y) >= Math.abs(tot.x) ? 'y' : 'x';
    drag.el = drag.range && drag.axis === 'x' ? null : scrollableAncestor(drag.target, drag.axis); // sideways drag with no horizontal scroller: nothing to scroll
  }
  if (drag.moved && drag.range && drag.axis === 'x') { // slider dragged along its (rotated) track: stage x = device y
    e.preventDefault();
    const r = drag.range, b = r.getBoundingClientRect(), f = Math.max(0, Math.min(1, (t.clientY - b.top) / (b.height || 1)));
    const min = +r.min || 0, max = r.max === '' ? 100 : +r.max, st = r.step === 'any' || !r.step ? 0 : +r.step;
    let v = min + f * (max - min); if (st) v = Math.round((v - min) / st) * st + min;
    if (String(v) !== r.value) { r.value = v; r.dispatchEvent(new Event('input', { bubbles: true })); drag.rangeChanged = true; }
  }
  if (drag.moved && drag.el) {
    e.preventDefault();
    const d = drag.axis === 'y' ? -s.y : -s.x;
    // scroll chaining: an inner list at its end hands the drag on to the page behind it
    for (let k = 0; k < 4 && d && !canScroll(drag.el, drag.axis, d); k++) { const up = scrollableAncestor(drag.el.parentElement, drag.axis); if (!up) break; drag.el = up; }
    if (drag.axis === 'y') drag.el.scrollTop += d; else drag.el.scrollLeft += d;
    const dt = Math.max(1, now - drag.t); const v = d / dt; drag.v = drag.v === undefined ? v : drag.v * 0.6 + v * 0.4;
  }
  drag.x = t.clientX; drag.y = t.clientY; drag.t = now;
}, { passive: false, capture: true });
addEventListener('touchend', () => {
  if (!drag) return;
  if (drag.rangeChanged) drag.range.dispatchEvent(new Event('change', { bubbles: true }));
  if (drag.moved) { suppressClick = true; setTimeout(() => { suppressClick = false; }, 350); }
  const el = drag.el, axis = drag.axis; let v = (drag.moved && el && performance.now() - drag.t < 80 ? drag.v || 0 : 0) * 16; drag = null;
  if (!el || Math.abs(v) < 0.5) return;
  const step = () => { if (Math.abs(v) < 0.3 || !canScroll(el, axis, v)) return; if (axis === 'y') el.scrollTop += v; else el.scrollLeft += v; v *= 0.95; momentum = requestAnimationFrame(step); };
  momentum = requestAnimationFrame(step);
}, { capture: true });
addEventListener('click', (e) => { if (suppressClick) { e.stopPropagation(); e.preventDefault(); suppressClick = false; } }, { capture: true });
