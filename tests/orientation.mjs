// Usage: node tests/orientation.mjs [baseUrl] — free orientation: phones held upright get the native PORTRAIT layout
// (no CSS rotation, no lock), landscape phones and desktop the normal layout; rotating mid-race re-lays out live
// without pausing; touch controls / menus / HUD work in every orientation; manifest orientation "any".
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const BASE = process.argv[2] || 'http://localhost:4173/formula1-game/';
const OUT = new URL('../screenshots/', import.meta.url).pathname; mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let pass = 0, total = 0; const ok = (n, c, i = '') => { total++; if (c) pass++; console.log(`${c ? 'PASS' : 'FAIL'}  ${n} ${i}`); };
const UA_IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const UA_AND = 'Mozilla/5.0 (Linux; Android 15; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Mobile Safari/537.36';
const phone = (w, h, ua) => ({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: ua });
const layout = (page) => page.evaluate(() => { const s = document.getElementById('stage'), c = document.getElementById('gl'); return { portrait: document.documentElement.classList.contains('portrait'), rotTransform: getComputedStyle(s).transform.replace(/matrix\(1, 0, 0, 1, 0, 0\)|none/, ''), sw: s.offsetWidth, sh: s.offsetHeight, iw: innerWidth, ih: innerHeight, cw: c.width, ch: c.height }; });
const tapEl = async (page, sel) => { const el = await page.$(sel); await el.evaluate(e => e.scrollIntoView({ block: 'center' })); await page.waitForTimeout(120); const b = await el.boundingBox(); await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); };
async function portraitFlow(name, dev) {
  const ctx = await browser.newContext(dev); const page = await ctx.newPage();
  const errors = []; page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); }); page.on('pageerror', e => errors.push(e.message));
  await page.goto(BASE + '?nosw&rotate=1'); await page.waitForSelector('[data-x=casual]', { timeout: 30000 }); // ?rotate is ignored now
  const L = await layout(page);
  ok(`${name}: portrait layout, NOT rotated (old ?rotate switch harmless)`, L.portrait && !L.rotTransform && L.sw === L.iw && L.sh === L.ih, JSON.stringify(L));
  await tapEl(page, '[data-x=casual]'); await page.waitForSelector('[data-go=quick]'); await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}portrait-${name}-menu.png` });
  ok(`${name}: main menu fits the width (no horizontal overflow)`, await page.evaluate(() => document.getElementById('ui').scrollWidth <= innerWidth + 1));
  await tapEl(page, '[data-go=quick]'); await page.waitForSelector('#go');
  await tapEl(page, '[data-seg=laps] [data-v="1"]').catch(() => {});
  await tapEl(page, '#go'); await page.waitForSelector('#intro-skip', { timeout: 90000 }); await tapEl(page, '#intro-skip');
  await page.waitForFunction(() => window.__gp && window.__gp.race && window.__gp.race.phase === 'race', null, { timeout: 60000 });
  const cam = await page.evaluate(() => ({ aspect: window.__gp.game.camera.aspect, hudPortrait: !!document.querySelector('#hud .hud.portrait'), mobile: !!document.querySelector('#hud .hud.mobile') }));
  ok(`${name}: portrait race view (camera aspect < 1, portrait HUD)`, cam.aspect < 1 && cam.hudPortrait && cam.mobile, JSON.stringify(cam));
  const zones = await page.evaluate(() => ['t-left', 't-right'].map(id => { const r = document.getElementById(id).getBoundingClientRect(); return { top: r.top / innerHeight, w: r.width / innerWidth, h: r.height / innerHeight }; }));
  ok(`${name}: LEFT/RIGHT steering zones fill the bottom half`, zones.every(z => z.top > 0.5 && z.w > 0.45 && z.h > 0.4), JSON.stringify(zones.map(z => Object.fromEntries(Object.entries(z).map(([k, v]) => [k, +v.toFixed(2)])))));
  const tower = await page.evaluate(() => { const t = document.querySelector('#hud .tower'); return t ? { shown: getComputedStyle(t).display !== 'none', rows: t.querySelectorAll('.tr').length } : null; });
  await page.waitForTimeout(1200);
  ok(`${name}: compact leaderboard shown`, await page.evaluate(() => { const t = document.querySelector('#hud .tower'); return !!t && getComputedStyle(t).display !== 'none' && t.querySelectorAll('.tr').length > 0; }));
  const box = await page.evaluate(() => { const b = document.getElementById('t-box').getBoundingClientRect(), l = document.getElementById('t-left').getBoundingClientRect(); return { boxBottom: b.bottom, zonesTop: l.top, w: b.width }; });
  ok(`${name}: BOX button above the steering zones`, box.boxBottom <= box.zonesTop + 1 && box.w > 40, JSON.stringify(box));
  // steer by touch (multi-touch capable zones)
  const r = await page.evaluate(() => document.getElementById('t-right').getBoundingClientRect().toJSON());
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: r.x + r.width / 2, y: r.y + r.height / 2 }] }); await page.waitForTimeout(400);
  const steer = await page.evaluate(() => window.__gp.game.input.read().steer);
  await page.waitForTimeout(1600); await page.screenshot({ path: `${OUT}portrait-${name}-race.png` });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  ok(`${name}: right zone steers right`, steer > 0, `steer ${steer}`);
  const hud = await page.evaluate(() => [...document.querySelectorAll('#hud .hud-tl, #hud .hud-tr, #hud .hud-br, #hud .hud-bl')].filter(e => { const r = e.getBoundingClientRect(); return r.width && (r.right > innerWidth + 2 || r.bottom > innerHeight + 2 || r.left < -2 || r.top < -2); }).map(e => e.className));
  ok(`${name}: HUD panels inside the screen`, hud.length === 0, hud.join(','));
  // rotate to landscape mid-race: live re-layout, race keeps running (no pause)
  const t0 = await page.evaluate(() => window.__gp.race.t);
  await page.setViewportSize({ width: dev.viewport.height, height: dev.viewport.width }); await page.waitForTimeout(900);
  const g2 = await page.evaluate(() => ({ portrait: document.documentElement.classList.contains('portrait'), hudPortrait: !!document.querySelector('#hud .hud.portrait'), aspect: window.__gp.game.camera.aspect, paused: !!window.__gp.game.paused, t: window.__gp.race.t }));
  ok(`${name}: turning to landscape re-lays out live, no pause`, !g2.portrait && !g2.hudPortrait && g2.aspect > 1.6 && !g2.paused && g2.t > t0, JSON.stringify(g2));
  await page.setViewportSize(dev.viewport); await page.waitForTimeout(900);
  const g3 = await page.evaluate(() => ({ portrait: document.documentElement.classList.contains('portrait'), aspect: window.__gp.game.camera.aspect, paused: !!window.__gp.game.paused }));
  ok(`${name}: back to portrait re-lays out live, no pause`, g3.portrait && g3.aspect < 1 && !g3.paused, JSON.stringify(g3));
  await tapEl(page, '#h-pause'); await page.waitForTimeout(400);
  ok(`${name}: pause button works by touch`, await page.evaluate(() => window.__gp.game.paused === true));
  ok(`${name}: no console errors`, errors.length === 0, errors.slice(0, 3).join(' | '));
  await ctx.close();
}
await portraitFlow('iphone-390x844', phone(390, 844, UA_IOS));
await portraitFlow('android-412x915', phone(412, 915, UA_AND));
for (const [name, opt, wantPortrait] of [['phone-landscape-844x390', phone(844, 390, UA_IOS), false], ['desktop-1366x768', { viewport: { width: 1366, height: 768 } }, false], ['desktop-narrow-600x900', { viewport: { width: 600, height: 900 } }, false]]) {
  const ctx = await browser.newContext(opt); const page = await ctx.newPage();
  await page.goto(BASE + '?nosw'); await page.waitForSelector('[data-x=casual]', { timeout: 30000 });
  const L = await layout(page);
  ok(`${name}: normal layout (no portrait class, no rotation)`, L.portrait === wantPortrait && !L.rotTransform, JSON.stringify(L));
  await ctx.close();
}
const m = await (await fetch(BASE + 'manifest.webmanifest')).json().catch(() => ({}));
ok('PWA manifest orientation = any (players choose)', m.orientation === 'any', m.orientation);
const src = await (await fetch(BASE)).text();
ok('no orientation lock / rotation code shipped', !/orientation\.lock|rotate\(90deg\)/.test(src));
console.log(`\n${pass}/${total} checks passed`); await browser.close(); process.exit(pass === total ? 0 : 1);
