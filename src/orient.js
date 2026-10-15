// Free orientation (same studio approach as GP Racing Legends v10): no orientation lock, no fullscreen grab, no CSS
// rotation — portrait and both landscapes are displayed natively and the player chooses. Touch devices held upright get
// a dedicated portrait layout (html.portrait + tall chase camera + portrait HUD/touch zones); everything re-lays out live
// on resize (debounced, with hysteresis so the iOS address bar can't toggle it). Desktop is unchanged.
// Menus keep native scrolling in every orientation. (The old ?rotate=… test switch is gone; it is ignored if present.)
const st = { w: innerWidth, h: innerHeight, portrait: false, coarse: false, rotated: false };
export const orient = st;
export function viewSize() { return st; }
export function isRotated() { return false; } // kept for compatibility: the stage is never rotated any more
function vv() { const v = window.visualViewport; return v ? { w: Math.round(v.width), h: Math.round(v.height) } : { w: innerWidth, h: innerHeight }; }
export function screenAngle() { const so = screen.orientation; if (so && typeof so.angle === 'number') return ((so.angle % 360) + 360) % 360; const o = window.orientation; return o == null ? 0 : ((+o % 360) + 360) % 360; }
function apply() {
  const { w, h } = vv(), html = document.documentElement;
  const portrait = st.coarse && (st.portrait ? !(w > h * 1.05) : h > w * 1.05);
  const changed = portrait !== st.portrait || w !== st.w || h !== st.h;
  st.w = w; st.h = h; st.portrait = portrait;
  if (html.classList.contains('portrait') !== portrait) html.classList.toggle('portrait', portrait);
  html.style.setProperty('--sw', w + 'px'); html.style.setProperty('--sh', h + 'px');
  window.__rotated = false;
  if (changed) window.dispatchEvent(new Event('f1-resize'));
}
let installed = false;
export function installOrientation() {
  if (installed) return st; installed = true;
  st.coarse = matchMedia('(pointer: coarse)').matches || (navigator.maxTouchPoints > 0 && /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent));
  apply();
  let tm = 0; const later = () => { clearTimeout(tm); tm = setTimeout(apply, 150); };
  addEventListener('resize', later); if (window.visualViewport) visualViewport.addEventListener('resize', later);
  addEventListener('orientationchange', later); if (screen.orientation && screen.orientation.addEventListener) screen.orientation.addEventListener('change', later);
  return st;
}
installOrientation(); // on import, before anything measures the screen
