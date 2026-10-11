// Formula 1 cars (2026 chassis + legendary title-winning cars). Stats 0-99 are game ratings, not official data.
// The data layer keeps the studio's engine field names: power, topSpeed, acceleration, braking, turning (low-speed),
// cornerSpeed (high-speed downforce), traction, aero (drag efficiency), stability, tireWear (kindness to tyres), electronics (ERS/energy management).
// character: frontEnd (front-limited/pointy) / rearSteer (loose rear) / cornerSpeed / hardBraking (0-100 emphasis).
const B = (id, name, mfr, era, s, character) => ({
  id, name, manufacturer: mfr, era,
  power: s[0], topSpeed: s[1], acceleration: s[2], braking: s[3], turning: s[4], cornerSpeed: s[5],
  traction: s[6], aero: s[7], stability: s[8], tireWear: s[9], electronics: s[10],
  character: { frontEnd: character[0], rearSteer: character[1], cornerSpeed: character[2], hardBraking: character[3] },
});
//                                                         pow top acc brk trn csp tra aero stab tyre ers
export const BIKES = [
  // ---- 2026 grid (ordered roughly by 2026 constructors' standings after round 17)
  B('w17', 'MERCEDES F1 W17', 'mercedes', 2026, [96, 96, 94, 92, 90, 92, 92, 93, 92, 89, 96], [60, 45, 70, 60]),
  B('sf26', 'FERRARI SF-26', 'ferrari', 2026, [94, 94, 93, 93, 91, 91, 91, 90, 90, 87, 92], [70, 55, 65, 70]),
  B('mcl40', 'McLAREN MCL40', 'mclaren', 2026, [93, 93, 92, 92, 93, 94, 92, 91, 91, 92, 91], [65, 40, 90, 50]),
  B('rb22', 'RED BULL RB22', 'redbull', 2026, [91, 93, 91, 91, 90, 91, 89, 93, 88, 87, 89], [85, 75, 70, 60]),
  B('vcarb03', 'RACING BULLS VCARB 03', 'racingbulls', 2026, [90, 91, 89, 89, 88, 88, 88, 90, 87, 86, 88], [80, 65, 65, 55]),
  B('a526', 'ALPINE A526', 'alpine', 2026, [93, 92, 90, 88, 87, 87, 88, 88, 87, 86, 92], [60, 50, 60, 55]),
  B('vf26', 'HAAS VF-26', 'haas', 2026, [91, 90, 89, 88, 87, 87, 87, 88, 87, 88, 89], [55, 45, 60, 60]),
  B('r26', 'AUDI R26', 'audi', 2026, [88, 89, 88, 88, 87, 87, 87, 89, 87, 87, 87], [55, 45, 60, 55]),
  B('fw48', 'WILLIAMS FW48', 'williams', 2026, [92, 92, 89, 87, 85, 86, 87, 92, 86, 85, 91], [55, 50, 55, 50]),
  B('amr26', 'ASTON MARTIN AMR26', 'astonmartin', 2026, [86, 87, 87, 87, 86, 86, 86, 86, 86, 86, 84], [55, 55, 55, 55]),
  B('mac26', 'CADILLAC MAC-26', 'cadillac', 2026, [88, 87, 86, 85, 84, 84, 85, 85, 85, 85, 85], [50, 50, 50, 55]),
  // ---- legendary title-winning cars (REAL machinery in Dream Grid)
  B('mp4-2', 'McLAREN MP4/2 (1984)', 'mclaren', 1984, [86, 88, 86, 80, 82, 80, 82, 60, 84, 86, 40], [55, 55, 55, 60]),
  B('fw11b', 'WILLIAMS FW11B (1987)', 'williams', 1987, [92, 92, 88, 80, 82, 82, 80, 62, 83, 82, 42], [55, 60, 55, 60]),
  B('mp4-4', 'McLAREN MP4/4 (1988)', 'mclaren', 1988, [93, 93, 91, 84, 87, 86, 85, 66, 88, 86, 45], [65, 50, 65, 65]),
  B('mp4-5', 'McLAREN MP4/5 (1989)', 'mclaren', 1989, [93, 92, 90, 84, 86, 85, 85, 66, 87, 86, 46], [65, 50, 65, 65]),
  B('mp4-6', 'McLAREN MP4/6 (1991)', 'mclaren', 1991, [94, 93, 90, 85, 86, 86, 85, 68, 87, 85, 50], [65, 55, 65, 65]),
  B('fw14b', 'WILLIAMS FW14B (1992)', 'williams', 1992, [92, 91, 92, 88, 92, 93, 93, 72, 92, 87, 70], [70, 40, 85, 65]),
  B('fw15c', 'WILLIAMS FW15C (1993)', 'williams', 1993, [93, 92, 93, 89, 92, 93, 94, 74, 92, 87, 74], [70, 40, 85, 65]),
  B('b194', 'BENETTON B194 (1994)', 'alpine', 1994, [86, 87, 89, 87, 92, 89, 89, 72, 84, 85, 60], [85, 80, 70, 60]),
  B('fw18', 'WILLIAMS FW18 (1996)', 'williams', 1996, [91, 91, 89, 88, 89, 91, 88, 75, 90, 88, 55], [65, 45, 80, 60]),
  B('fw19', 'WILLIAMS FW19 (1997)', 'williams', 1997, [90, 90, 88, 88, 88, 90, 87, 75, 89, 88, 55], [65, 45, 80, 60]),
  B('mp4-13', 'McLAREN MP4/13 (1998)', 'mclaren', 1998, [92, 92, 90, 89, 89, 90, 88, 77, 89, 86, 58], [70, 50, 75, 65]),
  B('f2004', 'FERRARI F2004 (2004)', 'ferrari', 2004, [95, 94, 93, 92, 92, 93, 92, 82, 92, 90, 65], [70, 50, 80, 65]),
  B('r25', 'RENAULT R25 (2005)', 'alpine', 2005, [91, 91, 94, 90, 90, 89, 92, 80, 88, 89, 62], [80, 55, 65, 70]),
  B('f2007', 'FERRARI F2007 (2007)', 'ferrari', 2007, [93, 94, 91, 90, 89, 90, 89, 83, 89, 88, 62], [60, 50, 75, 60]),
  B('mp4-23', 'McLAREN MP4-23 (2008)', 'mclaren', 2008, [92, 92, 91, 91, 91, 90, 90, 82, 88, 86, 64], [80, 55, 70, 65]),
  B('bgp001', 'BRAWN BGP 001 (2009)', 'mercedes', 2009, [91, 90, 90, 90, 91, 92, 90, 86, 91, 90, 66], [60, 40, 85, 55]),
  B('rb9', 'RED BULL RB9 (2013)', 'redbull', 2013, [88, 88, 90, 92, 93, 96, 92, 86, 92, 84, 76], [75, 50, 95, 60]),
  B('w07', 'MERCEDES F1 W07 (2016)', 'mercedes', 2016, [97, 96, 93, 92, 90, 92, 92, 88, 92, 89, 92], [60, 45, 75, 60]),
  B('w11', 'MERCEDES F1 W11 (2020)', 'mercedes', 2020, [97, 96, 94, 93, 93, 96, 93, 90, 94, 90, 94], [65, 40, 90, 60]),
  B('rb19', 'RED BULL RB19 (2023)', 'redbull', 2023, [94, 96, 93, 93, 92, 95, 94, 96, 93, 92, 93], [70, 45, 85, 65]),
  B('mcl39', 'McLAREN MCL39 (2025)', 'mclaren', 2025, [93, 93, 93, 92, 94, 96, 93, 90, 92, 95, 92], [65, 40, 95, 50]),
];
export const BIKE_BY_ID = Object.fromEntries(BIKES.map(b => [b.id, b]));
export const BIKE_STATS = ['power', 'topSpeed', 'acceleration', 'braking', 'turning', 'cornerSpeed', 'traction', 'aero', 'stability', 'tireWear', 'electronics'];

// Equal machinery reference car (field average of the 2026 grid)
export function equalBike() {
  const cur = BIKES.filter(b => b.era === 2026);
  const out = { id: 'equal', name: 'SPEC F1 2026 CAR', manufacturer: 'spec', era: 2026, character: { frontEnd: 70, rearSteer: 50, cornerSpeed: 65, hardBraking: 60 } };
  for (const k of BIKE_STATS) out[k] = Math.round(cur.reduce((a, b) => a + b[k], 0) / cur.length);
  return out;
}
// Balanced: pull each stat 70% of the way towards the reference
export function balancedBike(b) {
  const ref = equalBike();
  const out = { ...b, character: { ...b.character }, id: b.id + '-bal' };
  for (const k of BIKE_STATS) out[k] = Math.round(ref[k] + (b[k] - ref[k]) * 0.3);
  return out;
}
