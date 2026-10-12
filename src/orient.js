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
