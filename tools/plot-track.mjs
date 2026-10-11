import { TRACK_BY_ID } from '../src/data/tracks.js';
import { buildTrackGeometry } from '../src/game/trackgeom.js';
import { writeFileSync } from 'fs';
const [id, a, b] = process.argv.slice(2); const g = buildTrackGeometry(TRACK_BY_ID[id]);
const out = { hw: g.halfW, L: g.L, x: Array.from(g.x).filter((_, i) => i % 2 == 0), z: Array.from(g.z).filter((_, i) => i % 2 == 0), a: +a / g.ds / 2, b: +b / g.ds / 2, ds: g.ds * 2 };
writeFileSync(`/tmp/${id}.json`, JSON.stringify(out));
