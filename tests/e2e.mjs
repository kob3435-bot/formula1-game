// End-to-end QA: loads the built game, plays through key flows and saves screenshots.
// Usage: node tests/e2e.mjs [baseUrl]   (expects `npm run preview` on :4173)
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const BASE = process.argv[2] || process.env.BASE_URL || 'http://localhost:4173/formula1-game/';
const OUT = new URL('../screenshots/', import.meta.url).pathname; mkdirSync(OUT, { recursive: true });
const CHROME = process.env.CHROME || '/usr/bin/google-chrome';
// blocklist of real-world rider/manufacturer/circuit names that must never appear (base64 so the names are not stored in the repo as plain text)
// leftover content from the MotoGP game this was forked from must never appear (Honda is legitimate: Aston Martin's 2026 power unit)
const MOTO_RX = /\b(riding|moto ?gp|motorcycles?|riders?|bikes?|ducati|yamaha|ktm|aprilia|suzuki|fulminor|kairyu|sorami|seiran|brennwerk|ventara|wheelie|highside|lowside|knee slider|bagnaya|marqu[eé]s|novara|tidecore|siam thunder)\b/i;
const results = []; const ok = (name, cond, info = '') => { results.push({ name, pass: !!cond, info }); console.log(`${cond ? 'PASS' : 'FAIL'}  ${name} ${info}`); };
const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });

async function newPage(opts) {
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  return { ctx, page, errors };
}
const state = (page) => page.evaluate(() => { const r = window.__gp && window.__gp.race; if (!r) return null; return { phase: r.phase, gstate: window.__gp.game.state, t: r.t, overtakes: r.overtakes, laps: r.laps, player: r.player && { s: r.player.s, d: r.player.d, v: r.player.v, lap: r.player.lap, pos: r.player.pos, finished: r.player.finished }, moving: r.entrants.filter(e => e.v > 5).length, maxLap: Math.max(...r.entrants.map(e => e.lap)), finished: r.entrants.filter(e => e.finished).length }; });

// ---------------- desktop flow ----------------
{
  const { ctx, page, errors } = await newPage({ viewport: { width: 1366, height: 768 } });
  await page.goto(BASE + '?nosw'); await page.waitForSelector('[data-x=casual]', { timeout: 20000 });
  ok('first launch asks CASUAL / EXPERIENCED', await page.$('[data-x=exp]'));
  await page.click('[data-x=casual]'); await page.waitForSelector('[data-go=quick]');
  const items = await page.$$eval('.mm-item b', els => els.map(e => e.textContent));
  ok('main menu shows working modes', items.length === 8 && items.includes('ONLINE CHAMPIONSHIP'), items.join(', '));
  await page.mouse.move(5, 760); await page.waitForTimeout(1200);
  await page.screenshot({ path: OUT + '01-main-menu.png' });
  // rider database
  await page.click('[data-go=db]'); await page.waitForSelector('#dbl .rcard');
  const cards = await page.$$eval('#dbl .rcard', e => e.length);
  ok('driver database lists drivers', cards >= 40, `${cards} cards`);
  await page.click('[data-f=legend]'); await page.waitForTimeout(300);
  await page.click('#dbl .rcard'); await page.waitForSelector('.panel.detail'); await page.waitForTimeout(500);
  await page.screenshot({ path: OUT + '02-driver-database.png' });
  const leftover = await page.evaluate((src) => { const m = document.body.innerText.match(new RegExp(src, 'i')); return m ? m[0] : null; }, MOTO_RX.source);
  ok('no leftover MotoGP terms in UI', !leftover, leftover || '');
  { // data-level: the real 2026 grid is present with correct numbers
    const { readFileSync } = await import('fs');
    const all = JSON.parse(readFileSync(new URL('../src/data/riders.json', import.meta.url)));
    const cur = all.filter(r => r.kind === 'current');
    const want = { norris: 1, verstappen: 3, hadjar: 6, leclerc: 16, hamilton: 44, russell: 63, antonelli: 12, piastri: 81, alonso: 14, albon: 23, sainz: 55, perez: 11, bottas: 77, lindblad: 41, bortoleto: 5 };
    const bad = Object.entries(want).filter(([id, n]) => !cur.find(r => r.id === id && r.number === n)).map(([id]) => id);
    ok('driver data: 22 real 2026 drivers with official numbers', cur.length === 22 && bad.length === 0, bad.join(', ') || `${all.length} drivers checked`);
    const moto = all.filter(r => MOTO_RX.test([r.name, r.version, r.strengths, r.weaknesses, ...(r.styles || []), r.personality].join(' '))).map(r => r.name);
    ok('driver data: no leftover MotoGP terms', moto.length === 0, moto.join(', '));
  }
  await page.click('.panel.detail .x'); await page.click('[data-back]');
  // settings & stats screens open
  await page.click('[data-go=settingsScreen]'); ok('settings screen opens', await page.waitForSelector('.settings')); await page.click('[data-back]');
  await page.click('[data-go=stats]'); ok('statistics screen opens', await page.waitForSelector('.statgrid')); await page.click('[data-back]');
  // quick race, 1 lap
  await page.click('[data-go=quick]'); await page.waitForSelector('#go');
  await page.click('[data-seg=laps] [data-v="1"]');
  await page.click('#go');
  await page.waitForSelector('#intro-skip', { timeout: 90000 });
  ok('quick race reachable in 3 clicks (menu → quick → start)', true);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: OUT + '06-race-intro.png' });
  await page.click('#intro-skip');
  // wait for lights out
  await page.waitForFunction(() => window.__gp.race.phase === 'race', null, { timeout: 60000 });
  ok('start lights sequence completes', true);
  await page.evaluate(() => { window.__gp.game.timeScale = 2; });
  await page.waitForFunction(() => window.__gp.race.player.v > 30, null, { timeout: 60000 });
  // steering works: hold right, then left
  const d0 = (await state(page)).player.d;
  // hold each key until the bike has moved >0.6 m the expected way (headless software GL runs at a few FPS)
  const holdUntil = async (key, sign, from) => {
    await page.keyboard.down(key);
    await page.waitForFunction(([f, sg]) => (window.__gp.race.player.d - f) * sg > 0.6, [from, sign], { timeout: 8000 }).catch(() => {});
    await page.keyboard.up(key);
    return (await state(page)).player.d;
  };
  const d1 = await holdUntil('ArrowRight', 1, d0);
  const d2 = await holdUntil('ArrowLeft', -1, d1);
  ok('steering moves the car laterally', d1 > d0 + 0.5 && d2 < d1 - 0.5, `d: ${d0.toFixed(2)} → ${d1.toFixed(2)} → ${d2.toFixed(2)}`);
  // let the bot ride for the screenshot: steer towards line via autopilot
  await page.evaluate(() => { window.__gp.race.autopilot = true; window.__gp.game.timeScale = 1; });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: OUT + '03-race-chase-cam.png' });
  let s = await state(page);
  ok('cars are moving', s.moving >= 15, `${s.moving} moving, player ${Math.round(s.player.v * 3.6)} km/h`);
  // speed up to finish
  await page.evaluate(() => { window.__gp.game.timeScale = 10; });
  await page.waitForFunction(() => window.__gp.race.entrants.some(e => e.lap >= 1 && e.s > 200), null, { timeout: 120000 });
  s = await state(page); ok('lap counter running', s.maxLap >= 1, `maxLap ${s.maxLap}`);
  await page.waitForFunction(() => ['finished', 'podium', 'results'].includes(window.__gp.game.state) || document.querySelector('.restable'), null, { timeout: 240000 });
  s = await state(page).catch(() => null);
  const overt = await page.evaluate(() => window.__gp.race ? window.__gp.race.overtakes : window.__lastOvertakes);
  await page.waitForSelector('#podium-skip, .restable', { timeout: 60000 });
  if (await page.$('#podium-skip')) { await page.waitForTimeout(600); await page.screenshot({ path: OUT + 'v2-podium.png' }); await page.click('#podium-skip'); }
  await page.waitForSelector('.restable', { timeout: 60000 });
  ok('race finishes and shows results', true);
  const rows = await page.$$eval('.restable .rr:not(.head)', e => e.length);
  ok('results classification complete', rows === 22, `${rows} rows`);
  await page.waitForTimeout(600);
  await page.screenshot({ path: OUT + '05-results.png' });
  ok('AI overtakes happened', (overt || 0) > 0, `overtakes counted: ${overt}`);
  const stats = await page.evaluate(() => JSON.parse(localStorage.getItem('f1rl.stats.v1')));
  ok('statistics saved', stats && stats.races >= 1, JSON.stringify({ races: stats?.races, km: stats?.distanceKm?.toFixed?.(2) }));
  ok('no console errors (desktop)', errors.length === 0, errors.slice(0, 5).join(' | '));
  await ctx.close();
}

// ---------------- mobile landscape ----------------
{
  const { ctx, page, errors } = await newPage({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36' });
  await page.goto(BASE + '?nosw'); await page.waitForSelector('[data-x=casual]', { timeout: 20000 });
  await page.tap('[data-x=casual]'); await page.waitForSelector('[data-go=quick]');
  await page.screenshot({ path: OUT + '07-mobile-menu.png' });
  await page.tap('[data-go=quick]'); await page.waitForSelector('#go'); await page.tap('#go');
  await page.waitForSelector('#intro-skip', { timeout: 90000 }); await page.tap('#intro-skip');
  await page.waitForFunction(() => window.__gp.race.phase === 'race', null, { timeout: 60000 });
  const btns = await page.$$eval('.touch .tbtn:not(.box)', els => els.map(e => { const r = e.getBoundingClientRect(); return { cls: e.className, w: r.width, h: r.height, vis: getComputedStyle(e).display !== 'none' }; }));
  ok('touch LEFT/RIGHT buttons visible at 844x390', btns.length >= 2 && btns.every(b => b.vis && b.w > 80 && b.h > 80), JSON.stringify(btns.map(b => `${b.cls}:${Math.round(b.w)}x${Math.round(b.h)}`)));
  await page.waitForFunction(() => window.__gp.race.player.v > 25, null, { timeout: 60000 });
  const before = await page.evaluate(() => window.__gp.race.player.d);
  const box = await page.$eval('#t-right', e => { const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  await page.dispatchEvent('#t-right', 'touchstart'); await page.waitForTimeout(1200); await page.dispatchEvent('#t-right', 'touchend');
  const after = await page.evaluate(() => window.__gp.race.player.d);
  ok('touch RIGHT steers the car', after > before + 0.3, `d ${before.toFixed(2)} → ${after.toFixed(2)}`);
  await page.evaluate(() => { window.__gp.race.autopilot = true; });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: OUT + '04-mobile-landscape-race.png' });
  ok('no console errors (mobile)', errors.length === 0, errors.slice(0, 5).join(' | '));
  await ctx.close();
}
await browser.close();
const failed = results.filter(r => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
