// Headless F1 rules check on the real race logic (no rendering): pit stops, two-compound rule, Overtake Mode,
// points, grid, lap times — full-distance AI race at every 2026 calendar circuit (timeScale-free, fixed 1/60 s steps).
import { TRACK_BY_ID, CALENDAR, realLaps } from '../src/data/tracks.js';
import { CURRENT_GRID, riderBike } from '../src/data/riders.js';
import { buildTrackGeometry } from '../src/game/trackgeom.js';
import { Race } from '../src/game/race.js';
import { POINTS, TIRES } from '../src/game/perf.js';
import { gridSlots } from '../src/game/trackScene.js';

const only = process.argv[2] ? process.argv[2].split(',') : CALENDAR.map(c => c.id);
const lapsArg = process.argv[3];
let fails = 0; const ok = (n, c, i = '') => { if (!c) fails++; console.log(`${c ? 'PASS' : 'FAIL'}  ${n} ${i}`); };
const fmt = (t) => `${Math.floor(t / 60)}:${(t % 60).toFixed(3).padStart(6, '0')}`;
ok('points system = 25-18-15-12-10-8-6-4-2-1', POINTS.join(',') === '25,18,15,12,10,8,6,4,2,1');
ok('tyre compounds = SOFT/MEDIUM/HARD/INTER/WET', Object.keys(TIRES).join(',') === 'SOFT,MEDIUM,HARD,INTER,WET');
for (const id of only) {
  const track = TRACK_BY_ID[id], geo = buildTrackGeometry(track);
  const laps = lapsArg ? +lapsArg : realLaps(track);
  const race = new Race({ geo, track, laps, weather: 'SUNNY', difficulty: 'PRO', control: 'SEMI', entrants: CURRENT_GRID.map(r => ({ rider: r, bike: riderBike(r) })), spectator: true, seed: 7 });
  race.placeOnGrid(race.qualify(), gridSlots(geo, 22));
  const dt = 1 / 60; let otm = 0, pits = 0, steps = 0, pens = 0, maxSteps = laps * 200 * 60;
  while (!race.allFinished() && steps < maxSteps) {
    race.lodS = null; race.step(dt, null); steps++;
    for (const ev of race.events) { if (ev.type === 'otm') otm++; if (ev.type === 'pit') pits++; if (ev.type === 'penalty') pens++; }
    race.events.length = 0;
    if (race.order[0].finished && race.t - race.order[0].finishTime - race.goTime > 200) race.projectFinish();
  }
  const win = race.order[0];
  const fl = race.fastestLap;
  const allTwo = race.entrants.every(e => race.usedTwoCompounds(e) || e.projected);
  console.log(`--- ${track.gp} · ${track.name} · ${laps} laps · winner ${win.rider.name} ${fmt(win.finishTime)} · FL ${fl ? fl.rider.name + ' ' + fmt(fl.time) : '-'} · pit stops ${pits} · OTM activations ${otm} · penalties ${pens} · overtakes ${race.overtakes}`);
  ok(`${id}: race completes`, race.allFinished(), `${(race.t / 60).toFixed(1)} sim-min`);
  if (laps >= 8) {
    ok(`${id}: every car made >=1 pit stop & used two dry compounds`, race.entrants.every(e => e.stops >= 1) && allTwo, race.entrants.filter(e => !e.stops).map(e => e.rider.name).join(', '));
    ok(`${id}: Overtake Mode activated`, otm > 0, String(otm));
    const real = track.laps === laps ? (win.finishTime / 60) : null;
    if (real) ok(`${id}: race duration plausible (60-130 min)`, real > 60 && real < 130, real.toFixed(1) + ' min');
  }
}
console.log(fails ? `${fails} FAILED` : 'ALL PASSED');
process.exit(fails ? 1 : 0);
