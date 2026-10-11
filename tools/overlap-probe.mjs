import { TRACKS } from '../src/data/tracks.js';
import { buildTrackGeometry } from '../src/game/trackgeom.js';
for (const t of TRACKS) {
  const g = buildTrackGeometry(t), N = g.N, out = [];
  for (let i = 0; i < N; i += 2) for (let j = i + 2; j < N; j += 2) {
    const arc = Math.min(j - i, N - j + i) * g.ds; if (arc < 80) continue;
    const d = Math.hypot(g.x[i] - g.x[j], g.z[i] - g.z[j]); if (d > 2 * g.halfW + 4) continue;
    const ang = Math.abs(Math.acos(Math.max(-1, Math.min(1, g.tx[i] * g.tx[j] + g.tz[i] * g.tz[j])))) * 57.3;
    out.push([i * g.ds, j * g.ds, d.toFixed(1), (g.y[i] - g.y[j]).toFixed(1), ang.toFixed(0)]);
  }
  // compress runs
  const runs = []; for (const o of out) { const r = runs[runs.length - 1]; if (r && Math.abs(o[0] - r.e) <= 8) { r.e = o[0]; r.min = Math.min(r.min, +o[2]); } else runs.push({ s: o[0], e: o[0], j: o[1], min: +o[2], dy: o[3], ang: o[4] }); }
  console.log(t.id.padEnd(12), 'hw', g.halfW, runs.length ? JSON.stringify(runs.slice(0, 6)) : 'clean');
}
