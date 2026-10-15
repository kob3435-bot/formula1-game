// Usage: node tests/scroll.mjs [baseUrl] — every menu screen scrolls to its LAST item by finger swipe (CDP touch
// events) on portrait phones (390x844, 412x915) and on a landscape phone (844x390); the last item is then on
// screen and receives a tap.
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const BASE = process.argv[2] || 'http://localhost:4173/formula1-game/';
const OUT = new URL('../screenshots/', import.meta.url).pathname; mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let pass = 0, total = 0; const ok = (n, c, i = '') => { total++; if (c) pass++; console.log(`${c ? 'PASS' : 'FAIL'}  ${n} ${i}`); };
const UA_IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const UA_AND = 'Mozilla/5.0 (Linux; Android 15; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Mobile Safari/537.36';
const DEVS = [['iphone-portrait-390x844', 390, 844, UA_IOS], ['android-portrait-412x915', 412, 915, UA_AND], ['phone-landscape-844x390', 844, 390, UA_IOS]];
const SCREENS = ['settingsScreen', 'stats', 'db', 'champ', 'quick', 'dream'];
for (const [name, W, H, ua] of DEVS) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: ua });
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  const cdp = await ctx.newCDPSession(page);
  const T = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] });
  const tap = async (x, y) => { await T('touchStart', x, y); await page.waitForTimeout(40); await T('touchEnd'); await page.waitForTimeout(250); };
  const tapEl = async (sel) => { const b = await (await page.$(sel)).boundingBox(); await tap(b.x + b.width / 2, b.y + b.height / 2); };
  await page.goto(BASE + '?nosw'); await page.waitForSelector('[data-x=casual]', { timeout: 30000 });
  const rot = await page.evaluate(() => document.documentElement.classList.contains('rot'));
  ok(`${name}: native ${H > W ? 'portrait' : 'landscape'} (never rotated)`, !rot && (await page.evaluate(() => document.documentElement.classList.contains('portrait'))) === (H > W));
  await tapEl('[data-x=casual]'); await page.waitForSelector('[data-go=quick]');
  for (const scr of SCREENS) {
    await page.evaluate((scr) => { document.getElementById('ui').scrollTop = 0; document.querySelector(`[data-go=${scr}]`).scrollIntoView({ block: 'center' }); }, scr);
    await tapEl(`[data-go=${scr}]`); await page.waitForTimeout(600);
    const target = await page.evaluate(() => {
      const els = [...document.querySelectorAll('#ui .screen button, #ui .screen input, #ui .screen select, #ui .screen .rcard')].filter(e => !e.closest('[data-back]') && e.offsetParent);
      let last = els[els.length - 1], inter = true;
      if (!last) { inter = false; const all = [...document.querySelectorAll('#ui .screen *')].filter(e => e.offsetParent && !e.children.length && e.textContent.trim()); last = all[all.length - 1]; }
      if (!last) return null; last.setAttribute('data-test-last', '1'); return { inter, txt: (last.textContent || last.value || '').trim().slice(0, 30), n: els.length };
    });
    if (!target) { ok(`${name}/${scr}: has items`, false); await page.goto(BASE + '?nosw'); await page.waitForSelector('[data-go=quick]'); continue; }
    const visible = () => page.evaluate(() => { const e = document.querySelector('[data-test-last]'); const r = e.getBoundingClientRect(); const cx = r.left + r.width / 2, cy = r.top + r.height / 2; const inView = cx > 0 && cy > 0 && cx < innerWidth && cy < innerHeight; const hit = inView && document.elementFromPoint(cx, cy); return { inView, hit: !!hit && (hit === e || e.contains(hit)), cx, cy }; });
    let v = await visible(), swipes = 0;
    while (!(v.inView && v.hit) && swipes < 40) {
      // finger stroke up
      const pts = []; for (let k = 0; k <= 10; k++) { const f = k / 10; pts.push([W * 0.5, H * (0.8 - 0.6 * f)]); }
      await T('touchStart', ...pts[0]); for (const p of pts.slice(1)) { await T('touchMove', ...p); await page.waitForTimeout(12); } await T('touchEnd');
      await page.waitForTimeout(450); swipes++; v = await visible();
    }
    if (scr === 'settingsScreen' && name.startsWith('iphone')) await page.screenshot({ path: `${OUT}portrait-iphone-settings-bottom.png` });
    ok(`${name}/${scr}: last item reached by finger swipe`, v.inView && v.hit, `${swipes} swipes · "${target.txt}" (${target.n} items)`);
    if (target.inter) {
    const pr = page.evaluate(() => new Promise(res => { const e = document.querySelector('[data-test-last]'); e.addEventListener('click', (ev) => { ev.preventDefault(); ev.stopImmediatePropagation(); res(true); }, { once: true, capture: true }); setTimeout(() => res(false), 1500); }));
    await page.waitForTimeout(100);
    if (v.inView) await tap(v.cx, v.cy);
    ok(`${name}/${scr}: last item is tappable`, await pr);
    }
    await page.goto(BASE + '?nosw'); await page.waitForSelector('[data-go=quick]', { timeout: 30000 });
  }
  { // a settings slider can be dragged by finger
    await page.evaluate(() => document.querySelector('[data-go=settingsScreen]').scrollIntoView({ block: 'center' }));
    await tapEl('[data-go=settingsScreen]'); await page.waitForTimeout(500);
    const r = await page.evaluate(() => { const e = [...document.querySelectorAll('#ui input[type=range]')][0]; e.scrollIntoView({ block: 'center' }); e.setAttribute('data-test-sl', '1'); return e.value; });
    await page.waitForTimeout(200);
    const b = await (await page.$('[data-test-sl]')).boundingBox();
    const [x0, y0, x1, y1] = [b.x + b.width * 0.9, b.y + b.height / 2, b.x + b.width * 0.1, b.y + b.height / 2];
    await T('touchStart', x0, y0); for (let k = 1; k <= 10; k++) { await T('touchMove', x0 + (x1 - x0) * k / 10, y0 + (y1 - y0) * k / 10); await page.waitForTimeout(15); } await T('touchEnd'); await page.waitForTimeout(300);
    const r2 = await page.evaluate(() => document.querySelector('[data-test-sl]').value);
    ok(`${name}: settings slider drags by finger`, +r2 < +r, `${r} -> ${r2}`);
  }
  ok(`${name}: no console errors`, errors.length === 0, errors.slice(0, 3).join(' | '));
  await ctx.close();
}
console.log(`\n${pass}/${total} checks passed`); await browser.close(); process.exit(pass === total ? 0 : 1);
