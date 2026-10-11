// Usage: node tests/trackcheck.mjs [ids,comma] [--shots]   (expects `npm run dev` on :5173)
// For EVERY circuit: no barrier/prop/tree/stand geometry on or over the drivable road (all sections, bridges excepted),
// barriers == collision, no on-road blocker in the driver's line of sight; saves driver-eye screenshots.
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync } from 'fs';
const BASE = process.env.DEV_URL || 'http://localhost:5173/formula1-game/';
const OUT = new URL('../screenshots/tracks/', import.meta.url).pathname; mkdirSync(OUT, { recursive: true });
const CHROME = process.env.CHROME || '/usr/bin/google-chrome';
const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 800, height: 450 } });
const errs = []; page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type() === 'error' && !/404/.test(m.text())) errs.push(m.text()); });
await page.goto(BASE + 'tests/trackcheck.html'); await page.waitForFunction(() => window.trackcheckReady, null, { timeout: 60000 });
const ids = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2].split(',') : await page.evaluate(async () => (await import('/formula1-game/src/data/tracks.js')).TRACKS.map(t => t.id));
const shots = process.argv.includes('--shots');
let fails = 0;
for (const id of ids) {
  const r = await page.evaluate((id) => window.trackcheck.check(id), id);
  const ok = r.violations === 0 && r.barrierOffRoadMismatch === 0 && r.blocked === 0 && r.covered === 0;
  if (!ok) fails++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${id.padEnd(12)} objects ${r.meshes} · sampled pts ${r.pts} · on-road violations ${r.violations} · barrier mismatch ${r.barrierOffRoadMismatch} · LOS rays ${r.rays} blocked ${r.blocked} · road-surface probes ${r.vrays} covered ${r.covered} · barriers clipped ${r.wallClipPct}% (min ${r.minWall} m) · stands ${r.stands}`);
  if (!ok) console.log('      ', JSON.stringify({ sample: r.sample, blk: r.blk, cov: r.cov }));
  if (shots) { const imgs = await page.evaluate(() => window.trackcheck.shot([0.02, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9])); imgs.forEach((d, k) => writeFileSync(`${OUT}${id}-${k}.jpg`, Buffer.from(d.split(',')[1], 'base64'))); }
}
console.log(errs.length ? 'console errors: ' + errs.slice(0, 5).join(' | ') : 'no console errors');
console.log(fails || errs.length ? `${fails} circuits FAILED` : `ALL ${ids.length} circuits PASSED`);
await browser.close(); process.exit(fails || errs.length ? 1 : 0);
