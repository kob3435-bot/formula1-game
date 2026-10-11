// Shared performance model — used by in-game AI, the player's assists and the headless balance tool.
export const G = 9.81;
export const MU_BASE = 2.1;      // low-speed (mechanical) lateral grip for an 85-rated driver/car, in g; downforce adds to it with v² (see muAt)
export const DECEL_BASE = 36.0;   // m/s² average peak braking (≈3.7 g; F1 cars peak at 5 g+)
export const A0_BASE = 11.5;      // m/s² low-speed acceleration (traction-limited, 0-100 km/h ≈ 2.6 s)
export const VTOP_BASE = 95.5;    // m/s (~345 km/h with straight-line mode active aero)

export const WEATHER = {
  SUNNY: { label: 'Sunny', grip: 1.0, wet: 0, icon: '☀' },
  CLOUDY: { label: 'Cloudy', grip: 0.985, wet: 0, icon: '☁' },
  LIGHT_RAIN: { label: 'Light Rain', grip: 0.8, wet: 0.6, icon: '🌦' },
  HEAVY_RAIN: { label: 'Heavy Rain', grip: 0.68, wet: 1.0, icon: '🌧' },
};
export const TIRES = {
  // Pirelli 2026 range: dry compounds (C1-C6 nominated as Soft/Medium/Hard each weekend), Intermediate (green) and Full Wet (blue)
  SOFT: { label: 'SOFT', color: '#ff3b3b', dry: 1.03, wetGrip: 0.6, wear: 1.7, dryCompound: true },
  MEDIUM: { label: 'MEDIUM', color: '#ffd23b', dry: 1.0, wetGrip: 0.58, wear: 1.0, dryCompound: true },
  HARD: { label: 'HARD', color: '#f0f0f0', dry: 0.975, wetGrip: 0.55, wear: 0.6, dryCompound: true },
  INTER: { label: 'INTER', color: '#3bd16f', dry: 0.9, wetGrip: 0.97, wear: 2.2, wetBest: 0.6 },
  WET: { label: 'WET', color: '#3b9dff', dry: 0.85, wetGrip: 1.0, wear: 2.8, wetBest: 1.0 },
};
export const DIFFICULTY = {
  CASUAL: { mu: 0.93, decel: 0.9, brakeAcc: 0.84, racecraft: -18, mistakes: 2.6, label: 'Casual' },
  NORMAL: { mu: 0.962, decel: 0.95, brakeAcc: 0.9, racecraft: -9, mistakes: 1.6, label: 'Normal' },
  HARD: { mu: 0.984, decel: 0.975, brakeAcc: 0.94, racecraft: -3, mistakes: 1.15, label: 'Hard' },
  PRO: { mu: 1.0, decel: 1.0, brakeAcc: 0.97, racecraft: 0, mistakes: 1.0, label: 'Pro' },
  LEGEND: { mu: 1.012, decel: 1.015, brakeAcc: 1.0, racecraft: 4, mistakes: 0.6, label: 'Legend' },
};

const SENS = 0.78; // global skill sensitivity (balance knob)
const n = (v) => SENS * ((v ?? 80) - 85) / 100;

export function trackWeights(track) {
  const c = track.character || [];
  return {
    braking: c.includes('heavy-braking') ? 1 : c.includes('stop-and-go') ? 0.6 : 0.2,
    flow: c.includes('flowing') ? 1 : c.includes('technical') ? 0.5 : 0.3,
    exit: c.includes('stop-and-go') ? 1 : 0.5,
    tyre: c.includes('tire-killer') ? 1.35 : 1.0,
    power: c.includes('high-speed') ? 1 : 0.5,
  };
}

// Rider style → preferred bike character, compared with the bike's character profile.
export function compatibility(rider, bike) {
  const a = rider.attributes, st = rider.styles || [];
  const has = (t) => st.includes(t) ? 1 : 0;
  const pref = {
    frontEnd: 55 + (a.cornerEntry - a.cornerExit) * 1.5 + has('Front-End Feel') * 30 + has('Late Brake Master') * 10,
    rearSteer: 40 + (a.aggression - 80) * 1.2 + (a.bikeControl - 85) * 1.5 + has('Aggressive Attacker') * 20 - has('Smooth Operator') * 15,
    cornerSpeed: 55 + (a.midCorner - a.braking) * 3 + has('Corner Speed Specialist') * 30 + has('Smooth Operator') * 12,
    hardBraking: 55 + (a.braking - a.midCorner) * 3 + has('Late Brake Master') * 30 + has('Aggressive Attacker') * 8,
  };
  const c = bike.character;
  let dist = 0;
  for (const k of ['frontEnd', 'rearSteer', 'cornerSpeed', 'hardBraking']) {
    const p = Math.max(0, Math.min(100, pref[k]));
    // being "over-equipped" for rear-steer demand hurts only if the rider can't handle it
    let d = c[k] - p; if (k === 'rearSteer') d = Math.max(0, d);
    dist += Math.abs(d) * (k === 'rearSteer' ? 0.7 : 1);
  }
  return Math.round(Math.max(0, Math.min(100, 100 - dist / 2.6)));
}

export function trackAffinity(rider, track) {
  const w = trackWeights(track), st = rider.styles || [];
  let b = 0;
  if (st.includes('Late Brake Master')) b += 0.006 * w.braking;
  if (st.includes('Corner Speed Specialist')) b += 0.006 * w.flow;
  if (st.includes('Smooth Operator')) b += 0.003 * w.flow;
  if (st.includes('Aggressive Attacker')) b += 0.003 * w.exit;
  if (st.includes('Launch Specialist')) b += 0.002 * w.exit;
  if (st.includes('Tire Whisperer')) b += 0.004 * (w.tyre - 1) * 3;
  return b; // fractional performance bonus (≈0 .. 1%)
}

// Effective dynamic parameters for one rider on one bike at one track & condition.
// opts: { weather, tire, difficulty (AI only), wear (0..1) }
export function effective(rider, bike, track, opts = {}) {
  const a = rider.attributes, h = rider.hidden || {};
  const w = trackWeights(track);
  const weather = WEATHER[opts.weather || 'SUNNY'];
  const tire = TIRES[opts.tire || 'MEDIUM'];
  const diff = opts.difficulty ? DIFFICULTY[opts.difficulty] : null;
  const compat = compatibility(rider, bike);
  const compatF = (compat - 70) / 100 * 0.02;
  const aff = trackAffinity(rider, track);
  const cornerMix = (a.cornerEntry * (0.3 + 0.1 * w.braking) + a.midCorner * (0.3 + 0.2 * w.flow) + a.cornerExit * (0.3 + 0.1 * w.exit)) /
    (0.9 + 0.1 * w.braking + 0.2 * w.flow + 0.1 * w.exit);
  const pace = n(a.racePace);

  let mu = MU_BASE * (1 + 0.105 * n(cornerMix) + 0.055 * n(a.bikeControl) + 0.045 * pace + 0.06 * n(bike.cornerSpeed) + 0.035 * n(bike.turning) + 0.02 * n(bike.electronics) + compatF + aff);
  let decel = DECEL_BASE * (1 + 0.12 * n(a.braking) + 0.035 * n(a.cornerEntry) + 0.03 * n(h.lateBrakingConfidence) + 0.075 * n(bike.braking) + 0.035 * n(bike.stability) + 0.03 * pace + compatF + aff);
  let a0 = A0_BASE * (1 + 0.07 * n(a.acceleration) + 0.065 * n(a.throttleControl) + 0.045 * n(a.cornerExit) + 0.1 * n(bike.acceleration) + 0.07 * n(bike.traction) + 0.035 * n(bike.electronics) + 0.03 * n(bike.power) + compatF);
  let vTop = VTOP_BASE * (1 + 0.06 * n(bike.topSpeed) + 0.03 * n(bike.power) + 0.02 * n(bike.aero) + 0.01 * n(a.speed));

  // weather & tyres
  const wet = weather.wet;
  let grip = weather.grip * (track.grip || 1);
  if (wet > 0) {
    grip *= 1 + (a.wet - 80) / 100 * 0.45 * wet;          // wet specialists clearly benefit
    // intermediates are best on a damp/light-rain track, full wets in heavy rain
    const match = tire.wetBest !== undefined ? 1 - Math.abs(tire.wetBest - wet) * 0.12 : 1;
    grip *= (tire.wetGrip + (1 - tire.wetGrip) * (1 - wet) * 0.4) * match;
  } else grip *= tire.dry;
  const wear = opts.wear || 0;
  // tyre degradation, with a performance 'cliff' once a set is past ~80% of its life
  grip *= 1 - (wear * 0.06 + Math.max(0, wear - 0.8) * 0.25) * (1 - 0.4 * n(a.tireManagement) * 4 * 0.25);
  mu *= grip; decel *= Math.min(1, 0.35 + grip * 0.65) * (wet ? (1 + (a.wet - 80) / 100 * 0.3 * wet) : 1);
  a0 *= Math.min(1, 0.4 + grip * 0.6);
  if (wet) vTop *= 1 - 0.02 * wet;

  // AI difficulty scales braking accuracy / corner speed / racecraft / consistency — never top speed
  let racecraft = a.racecraft, mistakeMul = 1, brakeAcc = 1;
  if (diff) { mu *= diff.mu; decel *= diff.decel; racecraft += diff.racecraft; mistakeMul = diff.mistakes; brakeAcc = diff.brakeAcc; }

  const consistency = a.consistency;
  // race-weekend form / set-up variance (per race), smaller for consistent & mentally strong riders
  const formSigma = 0.0026 + (100 - consistency) * 0.00005 + (100 - a.mental) * 0.00003 + wet * 0.0028;
  const sigma = 0.0022 + (100 - consistency) * 0.00011 + wet * 0.0015;
  const mistakeRate = (0.012 + (100 - consistency) * 0.0026 + Math.max(0, (h.riskTaking ?? 70) - 75) * 0.0012) * (1 + wet * (0.7 + Math.max(0, 85 - a.wet) / 25)) * mistakeMul;
  const wearRate = 0.028 * tire.wear * w.tyre * (1 + (82 - a.tireManagement) / 70) * (1 + (85 - bike.tireWear) / 90) * (1 + Math.max(0, a.aggression - 85) / 200);
  const reaction = 0.16 + (100 - (h.startReaction ?? a.reaction)) * 0.0045;
  const launch = 1 + 0.12 * n(a.clutch) + 0.05 * n(bike.electronics);
  return {
    mu, decel, a0, vTop, compat, sigma, formSigma, mistakeRate, wearRate, reaction, launch, brakeAcc,
    racecraft, overtaking: a.overtaking, defending: a.defending, aggression: a.aggression,
    slipstream: h.slipstreamUsage ?? a.racecraft, lateBrake: h.lateBrakingConfidence ?? a.braking,
    pressure: h.pressureResistance ?? a.mental, qualifying: a.qualifying, mental: a.mental,
  };
}

// Speed-dependent grip (mechanical + aerodynamic downforce), as a friction coefficient in g.
export const AERO_B = 1.9, AERO_V = 60, AERO_CAP = 3.0;
export function muAt(p, v) { return p.mu * Math.min(AERO_CAP, 1 + AERO_B * (v * v) / (AERO_V * AERO_V)); }
export function accelAt(p, v) {
  const r = Math.min(1, v / p.vTop);
  return Math.max(0, p.a0 * (1 - Math.pow(r, 2.3)));
}

// Speed profile along a curvature array (friction-circle limited braking/acceleration).
export function speedProfile(geo, kArr, p, out) {
  const N = geo.N, ds = geo.ds;
  const v = out || new Float32Array(N);
  // downforce: lateral grip grows with v² (capped), so the limit speed solves v²·k = mu·G·(1 + AERO_B·v²/AERO_V²)
  const m0 = p.mu * G, c = m0 * AERO_B / (AERO_V * AERO_V), vCap = AERO_V * Math.sqrt((AERO_CAP - 1) / AERO_B);
  for (let i = 0; i < N; i++) {
    const k = Math.abs(kArr[i]); let vv = p.vTop;
    if (k > 1e-5) { vv = k > c ? Math.sqrt(m0 / (k - c)) : p.vTop; if (vv > vCap) vv = Math.sqrt(m0 * AERO_CAP / k); }
    v[i] = Math.min(p.vTop, vv);
  }
  const avail = (vv, k) => { const lat = vv * vv * Math.abs(k) / (muAt(p, vv) * G); return Math.sqrt(Math.max(0.06, 1 - lat * lat)); };
  for (let pass = 0; pass < 2; pass++) {
    for (let c = 2 * N; c > 0; c--) { // backward (braking)
      const i = c % N, nx = (i + 1) % N;
      const lim = Math.sqrt(v[nx] * v[nx] + 2 * p.decel * avail(v[nx], kArr[nx]) * ds);
      if (v[i] > lim) v[i] = lim;
    }
    for (let c = 0; c < 2 * N; c++) { // forward (traction)
      const i = (c + 1) % N, pv = c % N;
      const lim = Math.sqrt(v[pv] * v[pv] + 2 * accelAt(p, v[pv]) * avail(v[pv], kArr[pv]) * ds);
      if (v[i] > lim) v[i] = lim;
    }
  }
  return v;
}
export function lapTimeOf(geo, v) { let t = 0; for (let i = 0; i < geo.N; i++) t += geo.ds * geo.lineLenF[i] / v[i]; return t; }

// Penalty curvature when off the ideal line: returns effective curvature multiplier.
export function linePenalty(geo, offsetErr) {
  const e = Math.min(1, Math.abs(offsetErr) / (geo.halfW * 1.1));
  return 1 + e * e * 0.55 + e * 0.15;
}

export function pickWeather(track, rand = Math.random) {
  const keys = ['SUNNY', 'CLOUDY', 'LIGHT_RAIN', 'HEAVY_RAIN'];
  let r = rand(), acc = 0;
  for (let i = 0; i < 4; i++) { acc += track.weather[i]; if (r <= acc) return keys[i]; }
  return 'SUNNY';
}
export function autoTire(weather, track) {
  if (WEATHER[weather].wet >= 1) return 'WET';
  if (WEATHER[weather].wet > 0) return 'INTER';
  return trackWeights(track).tyre > 1.2 ? 'HARD' : track.temp === 'cool' ? 'SOFT' : 'MEDIUM';
}
// FIA Formula One Grand Prix points, top ten (no fastest-lap bonus point since 2025)
export const POINTS = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];
// Mandatory pit stop: in a dry race at least two different dry compounds must be used (Sporting Regulations)
export const TWO_COMPOUND_PENALTY = 30; // seconds (the game's stand-in for the stewards' penalty)
export function pitLoss(track) { return track.pitLoss || (track.character?.includes('stop-and-go') ? 21 : 22) + (track.id === 'monaco' ? -2 : 0); }

// Shared helpers used by both the in-game AI (race.js) and the balance tool (tools/simulate.mjs)
export const MISTAKE = { minorBelow: 0.72, majorBelow: 0.97 }; // else: crash
export function qualiTime(lapEst, eff, z) { return lapEst * (1 - (eff.qualifying - 85) * 0.00035) * (1 + z * eff.sigma * 0.9); }
export function rollMistake(r) { return r < MISTAKE.minorBelow ? 1 : r < MISTAKE.majorBelow ? 2 : 3; }
export function passChance(att, def, paceAdv) {
  // att/def: effective params; paceAdv: seconds per lap faster
  return Math.max(0.04, Math.min(0.92, 0.3 + (att.overtaking - def.defending) / 55 + (att.racecraft - 85) / 120 + paceAdv * 0.9 + (att.aggression - 80) / 200));
}
