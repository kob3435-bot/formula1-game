// Authoring helper: expands compact driver profiles into explicit attribute data (src/data/riders.json).
// The JSON is the shipped data layer; edit it directly or re-run this tool. Target tiers are only an
// authoring aid used to calibrate the base level — the OVR in game is ALWAYS computed from attributes.
import { writeFileSync } from 'fs';
import { ATTRS, HIDDEN, computeOVR } from '../src/data/attributes.js';

const AB = { sp: 'speed', ac: 'acceleration', br: 'braking', ce: 'cornerEntry', mc: 'midCorner', cx: 'cornerExit', tc: 'throttleControl', rp: 'racePace', q: 'qualifying', ov: 'overtaking', de: 'defending', rc: 'racecraft', cn: 'consistency', wt: 'wet', tm: 'tireManagement', bc: 'bikeControl', ag: 'aggression', re: 'reaction', me: 'mental', cl: 'clutch', rk: 'riskTaking', lb: 'lateBrakingConfidence', ss: 'slipstreamUsage', pr: 'pressureResistance', st: 'startReaction' };
function parseMods(s) { const o = {}; for (const t of (s || '').split(/\s+/).filter(Boolean)) { const m = t.match(/^([a-z]+)([+-]\d+)$/); if (!m) throw new Error('bad mod ' + t); o[AB[m[1]]] = +m[2]; } return o; }
function hash(str) { let h = 2166136261; for (const c of str) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function rng(seed) { let s = seed; return () => { s = (Math.imul(s ^ (s >>> 15), 2246822507) + 0x9e3779b9) >>> 0; s ^= s >>> 13; return (s >>> 0) / 4294967296; }; }

// kind: current | rookie | legend
// [id, name, num, nat, kind, version, team, bike, styles, personality, helmet[3], targetOVR, mods, hiddenMods, extra]
const R = [];
const add = (o) => R.push(o);
const cur = (id, name, num, nat, team, styles, pers, helmet, target, mods, hid, extra = {}) => add({ id, name, number: num, nationality: nat, kind: 'current', team, styles, personality: pers, helmet, target, mods, hid, ...extra });
const rook = (id, name, num, nat, styles, pers, helmet, target, mods, hid, extra = {}) => add({ id, name, number: num, nationality: nat, kind: 'rookie', team: null, styles, personality: pers, helmet, target, mods, hid, ...extra });
const leg = (id, name, num, nat, version, primeYear, eraYears, bike, mfr, styles, pers, helmet, livery, target, mods, hid, extra = {}) => add({ id, name, number: num, nationality: nat, kind: 'legend', version, primeYear, eraYears, bike, manufacturer: mfr, styles, personality: pers, helmet, livery, target, mods, hid, ...extra });

// ---------------- CURRENT GRID: 2026 FIA Formula One World Championship (real entry list) ----------------
// Ratings are the studio's own game ratings (not official data). Helmet colours approximate each driver's design.
cur('norris', 'Lando Norris', 1, 'GBR', 'mclaren', ['Qualifying Ace', 'Smooth Operator'], 'SMOOTH', ['#d4ff00', '#1a1a1a', '#ff8000'], 93, 'q+5 mc+3 cn+1 ov+1 de-2 me-1', 'rk+0 lb+2', { age: 26, strengths: 'Reigning world champion: devastating one-lap pace and silky high-speed cornering.', weaknesses: 'Can lose places on lap one; occasionally too hard on himself.' });
cur('piastri', 'Oscar Piastri', 81, 'AUS', 'mclaren', ['Smooth Operator', 'Tire Whisperer'], 'CALCULATED', ['#ff8000', '#0033a0', '#ffffff'], 92, 'cn+5 tm+4 me+4 rc+2 wt-2 q+1', 'rk-2 pr+6', { age: 25, strengths: 'Ice-cool racer, superb tyre management and racecraft.', weaknesses: 'Less comfortable in changeable wet conditions.' });
cur('russell', 'George Russell', 63, 'GBR', 'mercedes', ['Qualifying Ace', 'Late Brake Master'], 'CALCULATED', ['#00d2be', '#1a1a1a', '#ffffff'], 92, 'q+6 br+3 cn+3 rc+2 tm+1', 'rk+0 lb+6', { age: 28, strengths: 'Outstanding qualifier and a sharp, consistent team leader.', weaknesses: 'Occasionally over-aggressive in wheel-to-wheel fights.' });
cur('antonelli', 'Kimi Antonelli', 12, 'ITA', 'mercedes', ['Aggressive Attacker', 'Wet Master'], 'AGGRESSIVE', ['#ffd400', '#00d2be', '#1a1a1a'], 88, 'sp+3 wt+6 ag+5 ov+3 cn-4 me-2', 'rk+8 lb+6', { age: 20, potential: 96, strengths: 'Raw natural speed, brilliant in the wet.', weaknesses: 'Still learning consistency over a full season.' });
cur('verstappen', 'Max Verstappen', 3, 'NED', 'redbull', ['Aggressive Attacker', 'Wet Master', 'Late Brake Master'], 'AGGRESSIVE', ['#ff6600', '#1e3a8a', '#ffffff'], 96, 'br+4 ce+4 ov+6 de+5 rc+5 wt+8 ag+6 bc+5 me+4 tm+1', 'rk+10 lb+12 pr+8', { age: 29, strengths: 'Four-time world champion: complete package, relentless racecraft, master in the rain.', weaknesses: 'Uncompromising defending can draw penalties.' });
cur('hadjar', 'Isack Hadjar', 6, 'FRA', 'redbull', ['Aggressive Attacker'], 'AGGRESSIVE', ['#ffffff', '#0055a4', '#ef4135'], 85, 'sp+2 ag+5 ov+3 q+2 cn-3 tm-2', 'rk+6', { age: 22, potential: 92, strengths: 'Fast, fearless and quick to learn.', weaknesses: 'Can overdrive under pressure.' });
cur('leclerc', 'Charles Leclerc', 16, 'MON', 'ferrari', ['Qualifying Ace', 'Late Brake Master'], 'QUALIFYING SPECIALIST', ['#e8002d', '#ffffff', '#0b2a6f'], 92, 'q+8 br+4 ce+3 bc+3 tm-3 cn-1', 'rk+4 lb+10', { age: 28, strengths: 'Phenomenal single-lap speed; pole position specialist.', weaknesses: 'Tyre management in long stints.' });
cur('hamilton', 'Lewis Hamilton', 44, 'GBR', 'ferrari', ['Smooth Operator', 'Tire Whisperer', 'Wet Master'], 'CALCULATED', ['#ffde00', '#a0a0a0', '#7b00ff'], 91, 'tm+6 rc+5 wt+6 ov+4 me+3 q-2 re-2', 'rk+0 pr+8', { age: 41, strengths: 'Seven-time world champion: racecraft, tyre whispering and wet-weather genius.', weaknesses: 'Raw qualifying pace has faded slightly.' });
cur('albon', 'Alexander Albon', 23, 'THA', 'williams', ['Defensive Master', 'Tire Whisperer'], 'DEFENSIVE', ['#2d2a4a', '#ed1c24', '#ffffff'], 86, 'de+6 tm+4 rc+2 q-1', 'rk-2', { age: 30, strengths: 'Superb defender, maximises every opportunity.', weaknesses: 'Outright one-lap pace.' });
cur('sainz', 'Carlos Sainz', 55, 'ESP', 'williams', ['Smooth Operator', 'Tire Whisperer'], 'CALCULATED', ['#c60b1e', '#ffc400', '#1868db'], 88, 'rc+4 tm+4 cn+3 me+3 q-1', 'rk-2 pr+4', { age: 32, strengths: 'Intelligent strategist with great race management.', weaknesses: 'Rarely the fastest over a single lap.' });
cur('lawson', 'Liam Lawson', 30, 'NZL', 'racingbulls', ['Aggressive Attacker', 'Defensive Master'], 'AGGRESSIVE', ['#111111', '#ffffff', '#1634cc'], 82, 'ag+6 de+4 ov+3 cn-3 q-2', 'rk+6', { age: 24, strengths: 'Tough, combative racer.', weaknesses: 'Qualifying consistency.' });
cur('lindblad', 'Arvid Lindblad', 41, 'GBR', 'racingbulls', ['Launch Specialist', 'Aggressive Attacker'], 'AGGRESSIVE', ['#ffffff', '#1634cc', '#ffd400'], 79, 'cl+6 re+5 ag+4 cn-4 tm-3 rc-2', 'rk+6 st+8', { age: 19, potential: 93, strengths: 'Rookie with rocket starts and huge potential.', weaknesses: 'Inexperience over race distance.' });
cur('alonso', 'Fernando Alonso', 14, 'ESP', 'astonmartin', ['Defensive Master', 'Launch Specialist', 'Tire Whisperer'], 'CALCULATED', ['#00594f', '#cedc00', '#c60b1e'], 90, 'rc+7 de+7 cl+6 re+4 tm+4 me+5 sp-3 q-2', 'rk+2 pr+10 st+8', { age: 45, strengths: 'Two-time world champion: legendary starts, racecraft and defence.', weaknesses: 'Age is starting to blunt peak qualifying speed.' });
cur('stroll', 'Lance Stroll', 18, 'CAN', 'astonmartin', ['Launch Specialist', 'Wet Master'], 'AGGRESSIVE', ['#ffffff', '#d52b1e', '#00594f'], 80, 'cl+6 wt+5 q-4 cn-3', 'rk+2 st+6', { age: 28, strengths: 'Strong starts and confident in the wet.', weaknesses: 'Qualifying pace.' });
cur('ocon', 'Esteban Ocon', 31, 'FRA', 'haas', ['Defensive Master'], 'DEFENSIVE', ['#ff87bc', '#0093cc', '#ffffff'], 84, 'de+6 rc+2 tm+2 q-2', 'rk+2', { age: 30, strengths: 'Very hard to pass, opportunistic.', weaknesses: 'Peaks and troughs in form.' });
cur('bearman', 'Oliver Bearman', 87, 'GBR', 'haas', ['Aggressive Attacker', 'Late Brake Master'], 'LATE BRAKER', ['#e6002b', '#ffffff', '#1a1a1a'], 84, 'br+4 ov+4 ag+5 cn-3 tm-1', 'rk+6 lb+8', { age: 21, potential: 92, strengths: 'Bold late-braking overtaker.', weaknesses: 'Raw race management.' });
cur('hulkenberg', 'Nico Hülkenberg', 27, 'GER', 'audi', ['Qualifying Ace', 'Smooth Operator'], 'CALCULATED', ['#ffd400', '#111111', '#e2001a'], 85, 'q+4 cn+3 tm+2 rc+1 ov-1', 'rk-2', { age: 39, strengths: 'Experienced, consistent and quick on Saturdays.', weaknesses: 'Lap-one chaos.' });
cur('bortoleto', 'Gabriel Bortoleto', 5, 'BRA', 'audi', ['Smooth Operator'], 'SMOOTH', ['#009c3b', '#ffdf00', '#ffffff'], 83, 'mc+3 cn+2 tm+2 ag-2', 'rk+0', { age: 22, potential: 92, strengths: 'Mature, tidy and improving fast.', weaknesses: 'Lacks experience in close battles.' });
cur('gasly', 'Pierre Gasly', 10, 'FRA', 'alpine', ['Late Brake Master', 'Wet Master'], 'LATE BRAKER', ['#0055a4', '#ffffff', '#ff87bc'], 86, 'br+4 wt+4 ov+3 cn+1', 'rk+2 lb+8', { age: 30, strengths: 'Grand Prix winner, great on the brakes.', weaknesses: 'Can fade in long stints.' });
cur('colapinto', 'Franco Colapinto', 43, 'ARG', 'alpine', ['Aggressive Attacker'], 'AGGRESSIVE', ['#74acdf', '#ffffff', '#f6b40e'], 79, 'ag+6 ov+3 cn-4 tm-2', 'rk+8', { age: 23, strengths: 'Brave and spectacular in traffic.', weaknesses: 'Crash-prone, inconsistent.' });
cur('perez', 'Sergio Pérez', 11, 'MEX', 'cadillac', ['Tire Whisperer', 'Defensive Master'], 'TIRE SAVER', ['#006847', '#ffffff', '#ce1126'], 84, 'tm+8 de+4 ov+3 q-4 cn-2', 'rk+0', { age: 36, strengths: 'Legendary tyre management on street circuits.', weaknesses: 'Qualifying.' });
cur('bottas', 'Valtteri Bottas', 77, 'FIN', 'cadillac', ['Qualifying Ace', 'Smooth Operator'], 'SMOOTH', ['#ffffff', '#003580', '#1a1a1a'], 84, 'q+4 mc+2 cn+3 ov-3 ag-3', 'rk-4', { age: 37, strengths: '10-time Grand Prix winner, quick over one lap.', weaknesses: 'Too polite in wheel-to-wheel battles.' });
// ---------------- RESERVE / TEST DRIVERS ----------------
rook('tsunoda', 'Yuki Tsunoda', 22, 'JPN', ['Aggressive Attacker', 'Late Brake Master'], 'AGGRESSIVE', ['#ffffff', '#bc002d', '#1e3a8a'], 82, 'br+4 ag+6 ov+3 cn-4 me-3', 'rk+6 lb+8', { age: 26, strengths: 'Quick and bold on the brakes.', weaknesses: 'Emotional under pressure.' });
rook('zhou', 'Zhou Guanyu', 24, 'CHN', ['Smooth Operator'], 'CALCULATED', ['#de2910', '#ffde00', '#ffffff'], 78, 'cn+4 tm+3 ag-3 q-2', 'rk-4', { age: 27, strengths: 'Consistent, tidy and reliable.', weaknesses: 'Lacks a cutting edge.' });
rook('doohan', 'Jack Doohan', 7, 'AUS', ['Aggressive Attacker'], 'AGGRESSIVE', ['#00843d', '#ffcd00', '#012169'], 76, 'ag+6 ov+3 cn-5', 'rk+8', { age: 23, potential: 86, strengths: 'Fast and brave.', weaknesses: 'Crash-prone.' });
rook('herta', 'Colton Herta', 26, 'USA', ['Late Brake Master', 'Qualifying Ace'], 'LATE BRAKER', ['#ffffff', '#b22234', '#3c3b6e'], 79, 'br+5 q+3 ov+2 cn-3', 'lb+8', { age: 26, strengths: 'Proven IndyCar winner, aggressive on the brakes.', weaknesses: 'Limited F1 mileage.' });

// ---------------- LEGENDS: world champions in their prime seasons ----------------
leg('senna-1988', 'Ayrton Senna', 12, 'BRA', '1988 Champion', 1988, '1984-1994', 'mp4-4', 'mclaren', ['Qualifying Ace', 'Wet Master', 'Aggressive Attacker'], 'AGGRESSIVE', ['#ffdf00', '#009c3b', '#002776'], ['#ffffff', '#e10600', '#111111'], 98, 'q+9 wt+10 ag+6 ov+6 bc+5 cn-2 tm-3', 'rk+12 lb+12 pr+6', { strengths: 'The ultimate qualifier and a genius in the rain.', weaknesses: 'Uncompromising to a fault.' });
leg('senna-1991', 'Ayrton Senna', 1, 'BRA', '1991 Champion', 1991, '1984-1994', 'mp4-6', 'mclaren', ['Qualifying Ace', 'Wet Master', 'Defensive Master'], 'AGGRESSIVE', ['#ffdf00', '#009c3b', '#002776'], ['#ffffff', '#e10600', '#111111'], 98, 'q+8 wt+10 de+5 rc+5 bc+5 me+4 tm-2', 'rk+10 lb+12 pr+8', { strengths: 'Peak maturity: speed, racecraft and mental strength.', weaknesses: 'Fierce rivalries could cloud judgement.' });
leg('prost-1989', 'Alain Prost', 2, 'FRA', '1989 Champion', 1989, '1980-1993', 'mp4-5', 'mclaren', ['Smooth Operator', 'Tire Whisperer'], 'CALCULATED', ['#ffffff', '#0055a4', '#ef4135'], ['#ffffff', '#e10600', '#111111'], 96, 'tm+9 cn+7 rc+7 me+6 q-4 wt-6 ag-4', 'rk-6 pr+10', { strengths: '"The Professor": supreme race management and tyre care.', weaknesses: 'Disliked racing in heavy rain.' });
leg('prost-1993', 'Alain Prost', 2, 'FRA', '1993 Champion', 1993, '1980-1993', 'fw15c', 'williams', ['Smooth Operator', 'Tire Whisperer'], 'CALCULATED', ['#ffffff', '#0055a4', '#ef4135'], ['#0a2d6e', '#ffffff', '#ffd200'], 95, 'tm+9 cn+7 rc+7 me+6 q-3 wt-6 ag-4', 'rk-6 pr+10', { strengths: 'Fourth title in the high-tech Williams.', weaknesses: 'Avoided risk in the wet.' });
leg('lauda-1984', 'Niki Lauda', 8, 'AUT', '1984 Champion', 1984, '1971-1985', 'mp4-2', 'mclaren', ['Tire Whisperer', 'Smooth Operator'], 'TIRE SAVER', ['#e10600', '#ffffff', '#111111'], ['#ffffff', '#e10600', '#111111'], 94, 'tm+9 me+8 cn+6 rc+5 q-6 sp-2', 'rk-8 pr+12', { strengths: 'Analytical genius, won the title by half a point.', weaknesses: 'No longer the fastest qualifier.' });
leg('piquet-1987', 'Nelson Piquet', 6, 'BRA', '1987 Champion', 1987, '1978-1991', 'fw11b', 'williams', ['Smooth Operator', 'Tire Whisperer'], 'CALCULATED', ['#ffffff', '#e10600', '#002776'], ['#0a2d6e', '#ffffff', '#ffd200'], 93, 'tm+5 cn+5 rc+5 me+3 ag-2', 'rk-2', { strengths: 'Cunning, consistent three-time champion.', weaknesses: 'Picked his battles.' });
leg('mansell-1992', 'Nigel Mansell', 5, 'GBR', '1992 Champion', 1992, '1980-1995', 'fw14b', 'williams', ['Aggressive Attacker', 'Late Brake Master'], 'AGGRESSIVE', ['#012169', '#ffffff', '#c8102e'], ['#0a2d6e', '#ffffff', '#ffd200'], 95, 'ag+9 br+6 ov+7 sp+3 q+3 tm-4 cn-3', 'rk+12 lb+12', { strengths: '"Red Five": brave, flat-out attacker.', weaknesses: 'Tyre wear and temperament.' });
leg('hill-1996', 'Damon Hill', 5, 'GBR', '1996 Champion', 1996, '1993-1999', 'fw18', 'williams', ['Smooth Operator', 'Qualifying Ace'], 'CALCULATED', ['#0a1f44', '#ffffff', '#0a1f44'], ['#0a2d6e', '#ffffff', '#ffd200'], 92, 'q+4 cn+4 tm+3 ov-2', 'rk-2', { strengths: 'Fast and determined in a dominant car.', weaknesses: 'Racecraft against the very best.' });
leg('villeneuve-1997', 'Jacques Villeneuve', 3, 'CAN', '1997 Champion', 1997, '1996-2006', 'fw19', 'williams', ['Aggressive Attacker', 'Late Brake Master'], 'AGGRESSIVE', ['#ffffff', '#1f75fe', '#d52b1e'], ['#0a2d6e', '#ffffff', '#ffd200'], 92, 'ag+6 br+5 ov+5 cn-3 tm-2', 'rk+8 lb+10', { strengths: 'Bold overtaker, won a title-deciding duel.', weaknesses: 'Erratic consistency.' });
leg('schumacher-1994', 'Michael Schumacher', 5, 'GER', '1994 Champion', 1994, '1991-2012', 'b194', 'alpine', ['Aggressive Attacker', 'Wet Master', 'Qualifying Ace'], 'AGGRESSIVE', ['#e10600', '#ffffff', '#ffd400'], ['#41a6f1', '#ffd400', '#16a34a'], 96, 'ag+6 wt+8 q+5 bc+5 me+4 tm+2', 'rk+10 lb+8 pr+8', { strengths: 'First title: ferocious speed and car control.', weaknesses: 'Ruthlessness in close battles.' });
leg('schumacher-2004', 'Michael Schumacher', 1, 'GER', '2004 Champion', 2004, '1991-2012', 'f2004', 'ferrari', ['Smooth Operator', 'Wet Master', 'Tire Whisperer'], 'CALCULATED', ['#e10600', '#ffffff', '#ffd400'], ['#e8002d', '#ffffff', '#111111'], 98, 'cn+8 tm+6 wt+8 rp+5 q+4 me+6 bc+5', 'rk+4 pr+12', { strengths: 'Seventh title: metronomic qualifying-lap pace for whole stints.', weaknesses: 'Virtually none in this era.' });
leg('hakkinen-1998', 'Mika Häkkinen', 8, 'FIN', '1998 Champion', 1998, '1991-2001', 'mp4-13', 'mclaren', ['Qualifying Ace', 'Late Brake Master'], 'CALCULATED', ['#ffffff', '#003580', '#1a1a1a'], ['#c0c0c0', '#111111', '#e10600'], 95, 'q+7 br+5 me+3 cn+2 wt-2', 'rk+2 lb+10', { strengths: '"The Flying Finn": phenomenal one-lap pace.', weaknesses: 'Occasional lapses under pressure.' });
leg('alonso-2005', 'Fernando Alonso', 5, 'ESP', '2005 Champion', 2005, '2001-2026', 'r25', 'alpine', ['Launch Specialist', 'Defensive Master', 'Aggressive Attacker'], 'AGGRESSIVE', ['#c60b1e', '#ffc400', '#0055a4'], ['#1f4fbf', '#ffd400', '#ffffff'], 96, 'cl+8 re+6 de+7 ov+6 rc+6 ag+4 me+4', 'rk+6 pr+10 st+10', { strengths: 'Youngest champion of his era: starts and racecraft.', weaknesses: 'Can be impatient.' });
leg('raikkonen-2007', 'Kimi Räikkönen', 6, 'FIN', '2007 Champion', 2007, '2001-2021', 'f2007', 'ferrari', ['Smooth Operator', 'Tire Whisperer'], 'SMOOTH', ['#ffffff', '#003580', '#111111'], ['#e8002d', '#ffffff', '#111111'], 95, 'tm+5 mc+5 rp+4 cn+3 q-1 me+4', 'rk+0 pr+10', { strengths: '"The Iceman": raw speed with calm nerves.', weaknesses: 'Qualifying was not always his forte.' });
leg('hamilton-2008', 'Lewis Hamilton', 22, 'GBR', '2008 Champion', 2008, '2007-2026', 'mp4-23', 'mclaren', ['Aggressive Attacker', 'Wet Master', 'Late Brake Master'], 'AGGRESSIVE', ['#ffde00', '#16a34a', '#ffffff'], ['#c0c0c0', '#111111', '#e10600'], 95, 'ag+6 br+5 wt+9 ov+6 q+3 cn-3 tm-2', 'rk+10 lb+10', { strengths: 'Breathtaking first-title attacker, wet genius.', weaknesses: 'Youthful risk taking.' });
leg('hamilton-2020', 'Lewis Hamilton', 44, 'GBR', '2020 Champion', 2020, '2007-2026', 'w11', 'mercedes', ['Smooth Operator', 'Tire Whisperer', 'Wet Master'], 'CALCULATED', ['#ffde00', '#a0a0a0', '#7b00ff'], ['#111111', '#00d2be', '#c0c0c0'], 98, 'tm+8 rc+6 wt+8 q+5 cn+5 me+6 ov+4', 'rk+0 pr+12', { strengths: 'Seventh title: complete, flawless driver.', weaknesses: 'Virtually none.' });
leg('button-2009', 'Jenson Button', 22, 'GBR', '2009 Champion', 2009, '2000-2017', 'bgp001', 'mercedes', ['Smooth Operator', 'Tire Whisperer', 'Wet Master'], 'SMOOTH', ['#ffffff', '#d5ff00', '#012169'], ['#ffffff', '#d5ff00', '#111111'], 93, 'tm+7 cn+4 wt+6 mc+3 q-4 ag-3', 'rk-4', { strengths: 'Silky smooth, magic in mixed conditions.', weaknesses: 'Struggled when the car did not suit him.' });
leg('vettel-2013', 'Sebastian Vettel', 1, 'GER', '2013 Champion', 2013, '2007-2022', 'rb9', 'redbull', ['Qualifying Ace', 'Launch Specialist'], 'QUALIFYING SPECIALIST', ['#ffffff', '#e10600', '#ffd400'], ['#1e3a8a', '#e10600', '#ffcc00'], 96, 'q+8 cl+5 rp+4 cn+4 ov-1', 'rk+2 pr+6 st+6', { strengths: 'Nine wins in a row: unbeatable from the front.', weaknesses: 'Less convincing fighting from the back.' });
leg('rosberg-2016', 'Nico Rosberg', 6, 'GER', '2016 Champion', 2016, '2006-2016', 'w07', 'mercedes', ['Qualifying Ace', 'Smooth Operator'], 'CALCULATED', ['#ffffff', '#00d2be', '#1a1a1a'], ['#c0c0c0', '#00d2be', '#111111'], 93, 'q+5 cn+4 me+3 tm+2 wt-2', 'rk-2', { strengths: 'Meticulous, mentally strong title winner.', weaknesses: 'Wheel-to-wheel racecraft.' });
leg('verstappen-2023', 'Max Verstappen', 1, 'NED', '2023 Champion', 2023, '2015-2026', 'rb19', 'redbull', ['Aggressive Attacker', 'Wet Master', 'Tire Whisperer'], 'AGGRESSIVE', ['#ff6600', '#1e3a8a', '#ffffff'], ['#1e3a8a', '#e10600', '#ffcc00'], 98, 'br+4 ov+6 rc+6 wt+8 tm+5 bc+6 me+6 q+3', 'rk+8 lb+12 pr+10', { strengths: '19 wins in a season: total domination.', weaknesses: 'None in this form.' });
leg('norris-2025', 'Lando Norris', 4, 'GBR', '2025 Champion', 2025, '2019-2026', 'mcl39', 'mclaren', ['Qualifying Ace', 'Smooth Operator'], 'SMOOTH', ['#d4ff00', '#1a1a1a', '#ff8000'], ['#ff8000', '#1b1b1b', '#47c7fc'], 94, 'q+6 mc+4 cn+2 ov+1 de-2', 'rk+0 lb+2', { strengths: 'First world title in the dominant MCL39.', weaknesses: 'Starts.' });

// ---------------- expand ----------------
function build(r) {
  const mods = parseMods(r.mods), hid = parseMods(r.hid);
  const rand = rng(hash(r.id));
  const jit = {};
  for (const k of ATTRS) jit[k] = Math.round((rand() - 0.5) * 4);
  const mk = (base) => {
    const a = {};
    for (const k of ATTRS) {
      let v = base + (mods[k] || 0) + jit[k];
      // non-core attributes relate loosely to base
      a[k] = Math.max(40, Math.min(98, Math.round(v)));
    }
    return a;
  };
  let base = r.target, a = mk(base);
  for (let i = 0; i < 60; i++) { const o = computeOVR(a); if (o === r.target) break; base += (r.target - o) * 0.7; a = mk(base); }
  // Only the very best primes can touch 99 in a signature attribute (extremely rare).
  if (r.target >= 97) { const best = Object.keys(mods).sort((x, y) => mods[y] - mods[x])[0]; if (best && a[best] >= 97) a[best] = 99; }
  const h = {};
  for (const k of HIDDEN) {
    const ref = k === 'riskTaking' ? a.aggression : k === 'lateBrakingConfidence' ? a.braking : k === 'slipstreamUsage' ? a.racecraft : k === 'pressureResistance' ? a.mental : a.reaction;
    h[k] = Math.max(35, Math.min(99, Math.round(ref - 4 + (hid[k] || 0) + (rand() - 0.5) * 4)));
  }
  const out = { id: r.id, name: r.name, number: r.number, nationality: r.nationality, kind: r.kind };
  if (r.version) { out.version = r.version; out.primeYear = r.primeYear; out.eraYears = r.eraYears; }
  if (r.age) out.age = r.age;
  if (r.potential) out.potential = r.potential;
  out.team = r.team || null;
  if (r.bike) out.bike = r.bike;
  if (r.manufacturer) out.manufacturer = r.manufacturer;
  out.helmet = r.helmet;
  if (r.livery) out.livery = r.livery;
  out.styles = r.styles; out.personality = r.personality;
  out.attributes = a; out.hidden = h;
  out.strengths = r.strengths; out.weaknesses = r.weaknesses;
  return out;
}
const riders = R.map(build);
writeFileSync(new URL('../src/data/riders.json', import.meta.url), JSON.stringify(riders, null, 1));
for (const r of riders) console.log(String(computeOVR(r.attributes)).padStart(3), r.kind.padEnd(8), r.name + (r.version ? ' - ' + r.version : ''));
console.log('total', riders.length, 'legends', riders.filter(r => r.kind === 'legend').length);
