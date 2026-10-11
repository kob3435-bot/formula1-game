// Usage: node tests/gameplay.mjs [baseUrl]  — in-browser F1 mechanics: 3-lap quick race (mandatory stop applies),
// pit request with B, pit stop executes & changes tyres, HUD pit/tyre/OTM indicators, barrier contact, no console errors.
import { chromium } from 'playwright-core';
const BASE = process.argv[2] || 'http://localhost:4173/formula1-game/';
const CHROME = process.env.CHROME || '/usr/bin/google-chrome';
const OUT = new URL('../screenshots/', import.meta.url).pathname;
const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let pass = 0, total = 0; const ok = (n, c, i = '') => { total++; if (c) pass++; console.log(`${c ? 'PASS' : 'FAIL'}  ${n} ${i}`); };
const page = await (await browser.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
const errors = []; page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); }); page.on('pageerror', e => errors.push(e.message));
await page.goto(BASE + '?nosw'); await page.waitForSelector('[data-x=casual]', { timeout: 30000 }); await page.click('[data-x=casual]');
await page.click('[data-go=quick]'); await page.waitForSelector('#go');
await page.click('[data-seg=laps] [data-v="3"]').catch(() => {});
await page.click('#go'); await page.waitForSelector('#intro-skip', { timeout: 90000 }); await page.click('#intro-skip');
await page.waitForFunction(() => window.__gp.race.phase === 'race', null, { timeout: 60000 });
const laps = await page.evaluate(() => window.__gp.race.laps);
ok('quick race running', true, `${laps} laps, mandatory stop: ${await page.evaluate(() => window.__gp.race.mandatoryStop)}`);
await page.evaluate(() => { window.__gp.race.autopilot = true; window.__gp.game.timeScale = 3; });
const tyre0 = await page.evaluate(() => window.__gp.race.player.tire);
await page.keyboard.press('KeyB'); await page.waitForTimeout(400);
ok('B key requests a pit stop (HUD shows BOX)', await page.evaluate(() => window.__gp.race.player.pitReq && /BOX/.test(document.getElementById('h-box')?.textContent || '')), await page.evaluate(() => document.getElementById('h-box')?.textContent));
await page.waitForFunction(() => window.__gp.race.player.pitting, null, { timeout: 240000 });
await page.waitForTimeout(300); await page.screenshot({ path: OUT + '11-pit-stop.png' });
ok('player enters the pits at the line', true, await page.evaluate(() => document.getElementById('h-box')?.textContent));
await page.waitForFunction(() => !window.__gp.race.player.pitting && window.__gp.race.player.stops >= 1, null, { timeout: 60000 });
const p = await page.evaluate(() => ({ tire: window.__gp.race.player.tire, comps: window.__gp.race.player.compounds, wear: window.__gp.race.player.wear }));
ok('pit stop fits fresh tyres of a different dry compound (wear reset)', p.tire !== tyre0 && p.comps.length === 2 && p.wear < 0.05, JSON.stringify({ from: tyre0, ...p }));
// Overtake Mode: chip lights when within 1 s of the car ahead
let otmSeen = false; for (let k = 0; k < 60 && !otmSeen; k++) { otmSeen = await page.evaluate(() => document.getElementById('h-otm')?.classList.contains('on')); if (!otmSeen) await page.waitForTimeout(500); }
if (otmSeen) await page.screenshot({ path: OUT + '12-overtake-mode.png' });
ok('Overtake Mode indicator activates in traffic', otmSeen);
// barrier: steer the player into the wall manually and confirm it stops at the visible barrier
await page.evaluate(() => { window.__gp.race.autopilot = false; window.__gp.game.timeScale = 1; });
await page.keyboard.down('KeyW'); await page.keyboard.down('KeyD'); await page.waitForTimeout(5000); await page.keyboard.up('KeyD'); await page.keyboard.up('KeyW');
const w = await page.evaluate(() => { const r = window.__gp.race, g = window.__gp.game.geo, P = r.player, i = ((Math.round(P.s / g.ds) % g.N) + g.N) % g.N; return { d: P.d, wall: (P.d >= 0 ? g.wallR : g.wallL)[i], hw: g.halfW }; });
ok('car is held by the barrier (never past it)', Math.abs(w.d) <= w.wall + 0.01, JSON.stringify(w));
await page.evaluate(() => { window.__gp.race.autopilot = true; window.__gp.game.timeScale = 10; });
await page.waitForFunction(() => !window.__gp.race || window.__gp.race.player.finished || window.__gp.game.state !== 'race', null, { timeout: 300000 }).catch(() => {});
ok('race finishes', await page.evaluate(() => !window.__gp.race || window.__gp.race.player.finished || window.__gp.game.state !== 'race'));
ok('no console errors', errors.length === 0, errors.slice(0, 3).join(' | '));
console.log(`\n${pass}/${total} checks passed`); await browser.close(); process.exit(pass === total ? 0 : 1);
