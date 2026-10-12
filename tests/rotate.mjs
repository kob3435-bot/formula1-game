// Usage: node tests/rotate.mjs [baseUrl] — phones held in portrait get the game rotated to landscape (CSS fallback),
// touch controls / menus / HUD work through the rotation; landscape phones and desktop are not rotated.
import { chromium, devices } from 'playwright-core';
import { mkdirSync } from 'fs';
const BASE = process.argv[2] || 'http://localhost:4173/formula1-game/';
const OUT = new URL('../screenshots/', import.meta.url).pathname; mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let pass = 0, total = 0; const ok = (n, c, i = '') => { total++; if (c) pass++; console.log(`${c ? 'PASS' : 'FAIL'}  ${n} ${i}`); };
const iphone = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' };
const pixel = { viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.6, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (Linux; Android 15; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Mobile Safari/537.36' };
// tap at a point given in STAGE (landscape) coordinates -> device coordinates for a 90° clockwise rotation
const tapStage = async (page, sel) => {
  const el = await page.$(sel); await el.evaluate(e => e.scrollIntoView({ block: 'center', inline: 'center' })); await page.waitForTimeout(150); const b = await el.boundingBox(); // bounding box is in device (portrait) coordinates
  await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2);
};
async function portraitFlow(name, dev) {
  const ctx = await browser.newContext(dev); const page = await ctx.newPage();
  const errors = []; page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); if (m.text().startsWith('OUT')) console.log(m.text()); }); page.on('pageerror', e => errors.push(e.message));
  await page.goto(BASE + '?nosw'); await page.waitForSelector('[data-x=casual]', { timeout: 30000 });
  const geo = await page.evaluate(() => { const s = document.getElementById('stage').getBoundingClientRect(), c = document.getElementById('gl'); return { rot: document.documentElement.classList.contains('rot'), sw: s.width, sh: s.height, cw: c.width, ch: c.height, iw: innerWidth, ih: innerHeight, aspect: window.__gp ? null : null }; });
  ok(`${name}: portrait → stage rotated to landscape`, geo.rot && Math.abs(geo.sw - geo.iw) < 2 && Math.abs(geo.sh - geo.ih) < 2 && geo.cw > geo.ch, JSON.stringify(geo));
  await tapStage(page, '[data-x=casual]'); await page.waitForSelector('[data-go=quick]');
  ok(`${name}: menu buttons respond to touch through the rotation`, true);
  await page.waitForTimeout(800); await page.screenshot({ path: `${OUT}rot-${name}-menu.png` });
  await tapStage(page, '[data-go=quick]'); await page.waitForSelector('#go');
  { // the rotated menu is scrollable (long screens such as the driver picker); scroll input is mapped through the rotation by the browser
    await page.evaluate(() => { document.getElementById('ui').scrollTop = 0; });
    await page.mouse.move(dev.viewport.width / 2, dev.viewport.height / 2); await page.mouse.wheel(0, 400); await page.waitForTimeout(400);
    const after = await page.evaluate(() => { const u = document.getElementById('ui'); return { top: u.scrollTop, max: u.scrollHeight - u.clientHeight }; });
    ok(`${name}: rotated menu scrolls`, after.max <= 0 || after.top > 0, JSON.stringify(after));
    await page.evaluate(() => { document.getElementById('ui').scrollTop = 0; });
  }
  await tapStage(page, '[data-seg=laps] [data-v="1"]').catch(() => {});
  await tapStage(page, '#go'); await page.waitForSelector('#intro-skip', { timeout: 90000 }); await tapStage(page, '#intro-skip');
  await page.waitForFunction(() => window.__gp && window.__gp.race && window.__gp.race.phase === 'race', null, { timeout: 60000 });
  const cam = await page.evaluate(() => ({ aspect: window.__gp.game.camera.aspect }));
  ok(`${name}: 3D view renders landscape (camera aspect > 1.6)`, cam.aspect > 1.6, cam.aspect.toFixed(2));
  // touch controls: hold the throttle button (device coords from its rotated bounding box), car accelerates
  const th = await page.$('.touch .tbtn.thr, #t-thr, .tbtn[data-k=throttle]') || (await page.$$('.touch .tbtn'))[2];
  const visible = await page.evaluate(() => [...document.querySelectorAll('.touch .tbtn')].filter(b => b.getBoundingClientRect().width > 20).length);
  ok(`${name}: touch controls visible`, visible >= 3, `${visible} buttons`);
  const tb = await page.evaluate(() => { const els = [...document.querySelectorAll('.touch .tbtn')]; return els.map(e => ({ id: e.id, cls: e.className, r: e.getBoundingClientRect().toJSON() })); });
  const pick = (re) => tb.find(b => re.test(b.id + ' ' + b.cls));
  const thr = pick(/gas/i) || pick(/right/i), right = pick(/right/i); // casual control: auto-throttle, no GAS button
  const cdp = await ctx.newCDPSession(page);
  const touch = async (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts });
  if (thr) {
    const p = { x: thr.r.x + thr.r.width / 2, y: thr.r.y + thr.r.height / 2 };
    const v0 = await page.evaluate(() => window.__gp.race.player.v);
    await touch('touchStart', [p]); await page.waitForTimeout(2500);
    const st = await page.evaluate(() => ({ v: window.__gp.race.player.v, thr: window.__gp.game.input.touch.throttle }));
    await page.screenshot({ path: `${OUT}rot-${name}-race.png` });
    if (right) { const q = { x: right.r.x + right.r.width / 2, y: right.r.y + right.r.height / 2 }; await touch('touchStart', [p, q]); await page.waitForTimeout(600); }
    const steer = await page.evaluate(() => window.__gp.game.input.read().steer);
    await touch('touchEnd', []);
    ok(`${name}: car drives under touch control`, st.v > v0 + 5, JSON.stringify({ v0, ...st }));
    if (right) ok(`${name}: steer-right button steers right (multi-touch)`, steer > 0, `steer ${steer}`);
  } else ok(`${name}: throttle button found`, false, JSON.stringify(tb.map(b => b.id + '|' + b.cls)));
  // HUD fits inside the rotated stage
  const hud = await page.evaluate(() => { const s = document.getElementById('stage'); const W = s.offsetWidth, H = s.offsetHeight; const out = [...document.querySelectorAll('#hud .hud-tl, #hud .hud-tr, #hud .hud-br, #hud .hud-bl')].filter(e => { const r = e.getBoundingClientRect(); if (r.width && (r.right > innerWidth + 2 || r.bottom > innerHeight + 2 || r.left < -2 || r.top < -2)) console.log('OUT', e.className, JSON.stringify(r)); return r.width && (r.right > innerWidth + 2 || r.bottom > innerHeight + 2 || r.left < -2 || r.top < -2); }).length; return { W, H, out }; });
  ok(`${name}: HUD panels within the screen`, hud.out === 0 && hud.W > hud.H, JSON.stringify(hud));
  // pause menu by touch
  await tapStage(page, '#h-pause').catch(() => {}); await page.waitForTimeout(500);
  ok(`${name}: pause button works by touch`, await page.evaluate(() => window.__gp.game.paused === true));
  // device rotated to landscape mid-game -> un-rotates, canvas follows
  await page.setViewportSize({ width: dev.viewport.height, height: dev.viewport.width }); await page.waitForTimeout(700);
  const g2 = await page.evaluate(() => ({ rot: document.documentElement.classList.contains('rot'), aspect: window.__gp.game.camera.aspect, cw: document.getElementById('gl').width, ch: document.getElementById('gl').height }));
  ok(`${name}: turning the device to landscape un-rotates (resize handled)`, !g2.rot && g2.aspect > 1.6 && g2.cw > g2.ch, JSON.stringify(g2));
  await page.setViewportSize(dev.viewport); await page.waitForTimeout(700);
  ok(`${name}: back to portrait re-rotates`, await page.evaluate(() => document.documentElement.classList.contains('rot') && window.__gp.game.camera.aspect > 1.6));
  ok(`${name}: no console errors`, errors.length === 0, errors.slice(0, 3).join(' | '));
  await ctx.close();
}
await portraitFlow('iphone-390x844', iphone);
await portraitFlow('android-412x915', pixel);
for (const [name, opt] of [['phone-landscape-844x390', { ...iphone, viewport: { width: 844, height: 390 } }], ['desktop-1366x768', { viewport: { width: 1366, height: 768 } }], ['desktop-narrow-600x900', { viewport: { width: 600, height: 900 } }]]) {
  const ctx = await browser.newContext(opt); const page = await ctx.newPage();
  await page.goto(BASE + '?nosw'); await page.waitForSelector('[data-x=casual]', { timeout: 30000 });
  const r = await page.evaluate(() => ({ rot: document.documentElement.classList.contains('rot'), t: getComputedStyle(document.getElementById('stage')).transform }));
  ok(`${name}: not rotated`, !r.rot && !/matrix\(0, 1|matrix\(6/.test(r.t), JSON.stringify(r));
  await ctx.close();
}
const m = await (await fetch(BASE + 'manifest.webmanifest')).json().catch(() => ({}));
ok('PWA manifest orientation = landscape', m.orientation === 'landscape', m.orientation);
console.log(`\n${pass}/${total} checks passed`); await browser.close(); process.exit(pass === total ? 0 : 1);
