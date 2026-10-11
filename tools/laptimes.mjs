// Calibration check: simulated pole-lap times (Verstappen, RB22, dry, soft) vs real 2025/2026 pole times.
import { TRACKS } from '../src/data/tracks.js';
import { RIDER_BY_ID, riderBike } from '../src/data/riders.js';
import { buildTrackGeometry } from '../src/game/trackgeom.js';
import { effective, speedProfile, lapTimeOf } from '../src/game/perf.js';
// approximate real pole times (s)
const REAL = { melbourne: 75.1, shanghai: 90.6, suzuka: 86.98, sepang: 92.0, miami: 86.2, montreal: 70.9, monaco: 69.95, barcelona: 71.5, spielberg: 63.97, silverstone: 84.9, spa: 100.9, hungaroring: 75.4, zandvoort: 68.7, monza: 78.8, madring: 87.0, baku: 101.1, singapore: 89.2, austin: 92.5, mexico: 75.6, interlagos: 69.5, lasvegas: 92.3, lusail: 79.4, yasmarina: 82.2 };
const r = RIDER_BY_ID[process.argv[2] || 'verstappen'];
let err = 0, n = 0;
for (const t of TRACKS) {
  const geo = buildTrackGeometry(t);
  const eff = effective(r, riderBike(r), t, { weather: 'SUNNY', tire: 'SOFT' });
  const prof = speedProfile(geo, geo.lineK, eff);
  const lt = lapTimeOf(geo, prof); let vmax = 0, vmin = 1e9; for (const v of prof) { vmax = Math.max(vmax, v); vmin = Math.min(vmin, v); }
  const real = REAL[t.id]; if (real) { err += (lt - real) / real; n++; }
  console.log(t.id.padEnd(12), lt.toFixed(2).padStart(7), real ? ('real ' + real).padEnd(10) + ((lt / real - 1) * 100).toFixed(1).padStart(6) + '%' : '', ` top ${(vmax * 3.6).toFixed(0)} min ${(vmin * 3.6).toFixed(0)} km/h`);
}
console.log('mean error', (err / n * 100).toFixed(1) + '%');
