export const MONTH_OF = Object.fromEntries(CALENDAR.map(c => [c.id, c.month]));
// official Grand Prix race distance (≈305 km; Monaco ≈260 km)
export function realLaps(t) { return t.laps || Math.round(305000 / t.length); }
export function seasonLaps(season, trackId) {
  if (season.lapsMode === 'REAL') return trackId ? realLaps(TRACK_BY_ID[trackId]) : 0;
  return Math.max(1, Math.min(99, Math.round(+season.laps || 3)));
}
export function lapsLabel(season) { return season.lapsMode === 'REAL' ? 'full Grand Prix distance' : `${seasonLaps(season)} lap${seasonLaps(season) === 1 ? '' : 's'} per race`; }
