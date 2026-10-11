// Headless: the race logic's barrier == the rendered barrier (geo.wallR/L) on every circuit. The player is driven
// flat-out with full lock into each side all lap long; |d| must never exceed the barrier at that point, and nowhere may
// the car reach another section's road surface (clearAt > -0) by crossing a visible barrier.
import { TRACKS } from '../src/data/tracks.js';
import { CURRENT_GRID, riderBike } from '../src/data/riders.js';
import { buildTrackGeometry } from '../src/game/trackgeom.js';
import { Race } from '../src/game/race.js';
import { gridSlots } from '../src/game/trackScene.js';
let fails = 0;
for (const track of TRACKS) {
  const geo = buildTrackGeometry(track); let worst = -1e9, crossed = 0, steps = 0;
  for (const side of [1, -1]) {
    const race = new Race({ geo, track, laps: 1, weather: 'SUNNY', difficulty: 'PRO', control: 'PRO', entrants: CURRENT_GRID.slice(0, 4).map((r, k) => ({ rider: r, bike: riderBike(r), isPlayer: k === 0 })), spectator: false, seed: 3 });
    race.placeOnGrid(race.qualify(), gridSlots(geo, 4)); const P = race.player;
    const input = { steer: side, throttle: 1, brake: 0, analog: true, pit: false, reset: true, shiftUp: false, shiftDown: false };
    for (let k = 0; k < 60 * 400 && P.s < geo.L; k++) {
      race.lodS = null; race.step(1 / 60, input); race.events.length = 0; steps++;
      if (race.phase !== 'race' && race.phase !== 'finished') continue;
      input.steer = Math.sin(k / 50) > 0 ? side : -side; // weave wall to wall
      const N = geo.N, i = ((Math.round(P.s / geo.ds) % N) + N) % N, lim = (P.d >= 0 ? geo.wallR : geo.wallL)[i];
      worst = Math.max(worst, Math.abs(P.d) - lim);
      const wx = geo.x[i] + geo.rx[i] * P.d, wz = geo.z[i] + geo.rz[i] * P.d;
      // reached another section's tarmac through the barrier? (own road: |d| <= hw)
      if (Math.abs(P.d) > geo.halfW + 0.5 && geo.clearAt(wx, wz, geo.y[i]) < -0.5) crossed++;
    }
    // exhaustive: from every sample, aim the car 30° into the barrier at 60 m/s and integrate one step
    for (let i = 0; i < geo.N; i++) {
      Object.assign(P, { s: i * geo.ds, d: side * ((side > 0 ? geo.wallR : geo.wallL)[i] - 0.7), v: 60, psi: side * 0.5, crashT: 0, yaw: 0 });
      race.stepPlayer(P, 1 / 60, { ...input, steer: side }, 30);
      const j = ((Math.round(P.s / geo.ds) % geo.N) + geo.N) % geo.N; const lim = (P.d >= 0 ? geo.wallR : geo.wallL)[j];
      worst = Math.max(worst, Math.abs(P.d) - Math.max(lim, (P.d >= 0 ? geo.wallR : geo.wallL)[i])); steps++;
    }
  }
  const ok = worst <= 0.01 && crossed === 0; if (!ok) fails++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${track.id.padEnd(12)} max beyond barrier ${worst.toFixed(2)} m · reached other road through barrier ${crossed} · ${steps} steps`);
}
console.log(fails ? `${fails} FAILED` : 'ALL PASSED'); process.exit(fails ? 1 : 0);
