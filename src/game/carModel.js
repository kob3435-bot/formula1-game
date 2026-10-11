import * as THREE from 'three';
import { toonify, addOutlines, toonMat } from './toon.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// Procedural 2026-regulation Formula 1 car + driver (same studio pipeline as the original bike model: lofted superellipse bodywork, toon ramps, ink outlines).
// Local frame: forward = -Z, up = +Y, right = +X; ground contact at y = 0. Car ≈ 5.6 m long, 1.9 m wide (2026 regs: 3.4 m wheelbase, 18-inch wheels).
// detail: 0 = LOW (Lambert, coarse), 1 = MEDIUM (PBR), 2 = HIGH/ULTRA (clear-coat paint, finer meshes).

const R = 0.36;            // wheel radius incl. tyre (18-inch rim, ~720 mm tyre)
const FRONT_Z = -1.62, REAR_Z = 1.78;  // 3.4 m wheelbase
const _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3(), _v3 = new THREE.Vector3(), _q = new THREE.Quaternion(), _up = new THREE.Vector3(0, 1, 0);

// ---------- textures ----------
const texCache = new Map();
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function toTex(c, srgb = true) { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }
function carbonTexture() {
  if (texCache.has('carbon')) return texCache.get('carbon');
  const [c, x] = canvas(64, 64);
  for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) {
    const g = x.createLinearGradient(i * 8, j * 8, i * 8 + 8, j * 8 + 8);
    const a = (i + j) % 2 ? ['#2a2c30', '#141518'] : ['#141518', '#2a2c30'];
    g.addColorStop(0, a[0]); g.addColorStop(1, a[1]); x.fillStyle = g; x.fillRect(i * 8, j * 8, 8, 8);
  }
  const t = toTex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(6, 6); texCache.set('carbon', t); return t;
}
// Wraps around a loft: u = around (right side at u=.25, top .5, left .75), v = along (canvas top = rear).
function helmetTexture(h, num) {
  const [c, x] = canvas(512, 256);
  x.fillStyle = h[0]; x.fillRect(0, 0, 512, 256);
  x.fillStyle = h[1];
  x.beginPath(); x.moveTo(0, 90); x.bezierCurveTo(130, 40, 380, 40, 512, 90); x.lineTo(512, 130); x.bezierCurveTo(380, 80, 130, 80, 0, 130); x.fill();
  x.fillStyle = h[2];
  for (let i = 0; i < 10; i++) { x.beginPath(); x.moveTo(i * 56, 0); x.lineTo(i * 56 + 22, 0); x.lineTo(i * 56 - 6, 70); x.lineTo(i * 56 - 28, 70); x.fill(); }
  x.fillRect(0, 150, 512, 8);
  x.fillStyle = h[1]; x.font = 'italic 900 52px Arial'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(String(num), 128, 205); x.fillText(String(num), 384, 205);
  return toTex(c);
}
function numberTexture(num) {
  const key = 'num' + num; if (texCache.has(key)) return texCache.get(key);
  const [c, x] = canvas(128, 128);
  x.fillStyle = '#fff'; x.beginPath(); x.ellipse(64, 64, 60, 54, 0, 0, Math.PI * 2); x.fill();
  x.fillStyle = '#111'; x.font = 'italic 900 78px Arial Black, Arial, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(String(num), 64, 68);
  const t = toTex(c); texCache.set(key, t); return t;
}

// ---------- materials ----------
const matCache = new Map();
function mat(kind, color, detail, extra = {}) {
  const key = kind + color + detail + JSON.stringify(extra);
  if (matCache.has(key)) return matCache.get(key);
  let m;
  if (detail === 0) m = new THREE.MeshLambertMaterial({ color, ...extra });
  else if (kind === 'paint' && detail >= 2) m = new THREE.MeshPhysicalMaterial({ color, roughness: 0.32, metalness: 0.15, clearcoat: 1, clearcoatRoughness: 0.06, ...extra });
  else {
    const p = { paint: [0.3, 0.2], metal: [0.25, 1], chrome: [0.08, 1], gold: [0.28, 1], ti: [0.22, 1], rubber: [0.92, 0], plastic: [0.55, 0], carbon: [0.35, 0.3], visor: [0.04, 1], leather: [0.6, 0] }[kind] || [0.5, 0];
    m = new THREE.MeshStandardMaterial({ color, roughness: p[0], metalness: p[1], ...extra });
  }
  matCache.set(key, m); return m;
}

// ---------- geometry helpers ----------
// sections: [z, yCentre, halfWidth, topHalfHeight, bottomHalfHeight, exponent]
function loft(sections, around, opts = {}) {
  const pos = [], uv = [], idx = [];
  const n = sections.length, a0 = opts.from ?? 0, a1 = opts.to ?? 1, open = a0 !== 0 || a1 !== 1;
  for (let s = 0; s < n; s++) {
    const [z, yc, w, t, b, e = 2.6] = sections[s];
    for (let j = 0; j <= around; j++) {
      const u = a0 + (a1 - a0) * j / around; const a = (u - 0.25) * Math.PI * 2;
      const ca = Math.cos(a), sa = Math.sin(a);
      const x = w * Math.sign(ca) * Math.pow(Math.abs(ca), 2 / e);
      const y = yc + (sa >= 0 ? t : b) * Math.sign(sa) * Math.pow(Math.abs(sa), 2 / e);
      pos.push(x, y, z); uv.push(u, 1 - s / (n - 1));
    }
  }
  const row = around + 1;
  for (let s = 0; s < n - 1; s++) for (let j = 0; j < around; j++) {
    const a = s * row + j, b = a + 1, c = a + row, d = c + 1;
    idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  g.computeVertexNormals();
  // the loft winds clockwise seen from the front -> flip if normals point inwards
  const p = g.attributes.position, nn = g.attributes.normal; let out = 0;
  for (let i = 0; i < p.count; i += 7) out += p.getX(i) * nn.getX(i) + (p.getY(i) - sections[Math.floor(i / row)][1]) * nn.getY(i);
  if (out < 0) { for (let i = 0; i < idx.length; i += 3) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; } g.setIndex(idx); g.computeVertexNormals(); }
  if (open) g.userData.open = true;
  return g;
}
function tyreGeometry(halfW, seg, detail) {
  // rounded tyre cross-section revolved around the axle
  const pts = [];
  const rIn = R - 0.085, steps = detail >= 2 ? 10 : 6;
  pts.push(new THREE.Vector2(rIn, -halfW * 0.8));
  for (let i = 0; i <= steps; i++) { const a = -Math.PI / 2 + Math.PI * i / steps; pts.push(new THREE.Vector2(R - 0.045 + Math.cos(a) * 0.045, Math.sin(a) * halfW)); }
  pts.push(new THREE.Vector2(rIn, halfW * 0.8));
  const g = new THREE.LatheGeometry(pts, seg); g.rotateZ(Math.PI / 2); return g;
}
function limbGeo(r0, r1, len, seg) { const g = new THREE.CylinderGeometry(r1, r0, len, seg, 1); const cap = new THREE.SphereGeometry(r0, seg, Math.max(3, seg / 2)); cap.translate(0, -len / 2, 0); const cap2 = new THREE.SphereGeometry(r1, seg, Math.max(3, seg / 2)); cap2.translate(0, len / 2, 0); return mergeGeometries([g.toNonIndexed(), cap.toNonIndexed(), cap2.toNonIndexed()]); }
const T = (g, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, s = null) => { g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), s || new THREE.Vector3(1, 1, 1))); return g; };
function clean(g) { let n = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(n.attributes)) if (!['position', 'normal', 'uv'].includes(k)) n.deleteAttribute(k); if (!n.attributes.uv) n.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(n.attributes.position.count * 2), 2)); if (!n.attributes.normal) n.computeVertexNormals(); return n; }
// v3: untextured opaque parts are baked into ONE vertex-coloured toon mesh (1 draw instead of 1 per colour);
// textured / transparent parts keep their own material
function bakeColor(g, color) { const c = new THREE.Color(color), n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; }
function mergeByMaterial(parts, shadow = true) {
  const groups = new Map(), baked = [];
  for (const p of parts) {
    if (!p.mat.map && !p.mat.transparent) { baked.push(bakeColor(clean(p.geo), p.mat.color)); continue; }
    if (!groups.has(p.mat)) groups.set(p.mat, []); groups.get(p.mat).push(clean(p.geo));
  }
  const out = [];
  if (baked.length) { const mesh = new THREE.Mesh(mergeGeometries(baked, false), toonMat({ vertexColors: true, rim: 0.85 })); mesh.castShadow = shadow; mesh.userData.ink = true; out.push(mesh); }
  for (const [m, gs] of groups) { const mesh = new THREE.Mesh(mergeGeometries(gs, false), m); mesh.castShadow = shadow; mesh.userData.ink = true; out.push(mesh); }
  return out;
}
function tube(points, r, seg, radial) { const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p))); return new THREE.TubeGeometry(curve, seg, r, radial, false); }


// Livery wraps around a loft: u = around (right side at u=.25, top .5, left .75), v = along the car.
function carLiveryTexture(colors, num, sponsor) {
  const W = 1024, H = 1024; const [c, x] = canvas(W, H);
  x.fillStyle = colors[0]; x.fillRect(0, 0, W, H);
  // top spine stripe (engine cover / nose) and lower side accent sweeping up towards the rear
  x.fillStyle = colors[1];
  x.fillRect(0.455 * W, 0, 0.09 * W, H);
  for (const u of [0.25, 0.75]) { const cx = u * W; x.beginPath(); x.moveTo(cx - 70, H); x.lineTo(cx + 70, H); x.lineTo(cx + 170, 0); x.lineTo(cx + 120, 0); x.fill(); }
  x.fillStyle = colors[2] || '#111';
  x.fillRect(0, 0, 0.14 * W, H); x.fillRect(0.86 * W, 0, 0.14 * W, H); // underside / floor edge
  x.fillRect(0.49 * W, 0, 0.02 * W, H);
  const side = (u, rot) => {
    x.save(); x.translate(u * W, 0.46 * H); x.rotate(rot);
    if (sponsor) { x.fillStyle = colors[0] === '#ffffff' || colors[0] === '#c6c9cc' || colors[0] === '#bcc0c4' ? '#111' : '#ffffff'; x.font = `italic 900 ${sponsor.length > 12 ? 40 : 58}px Arial, sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(sponsor, -60, 0); }
    x.fillStyle = '#ffffff'; x.font = 'italic 900 64px Arial, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.lineWidth = 6; x.strokeStyle = '#111'; x.strokeText(String(num), 230, 4); x.fillText(String(num), 230, 4);
    x.restore();
  };
  side(0.25, Math.PI / 2); side(0.75, -Math.PI / 2);
  // race number on the nose (top)
  x.save(); x.translate(0.5 * W, 0.86 * H); x.rotate(Math.PI); x.fillStyle = '#ffffff'; x.strokeStyle = '#111'; x.lineWidth = 6;
  x.font = 'italic 900 80px Arial, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.strokeText(String(num), 0, 0); x.fillText(String(num), 0, 0); x.restore();
  return toTex(c);
}

// ---------- bodywork definition: [z, yCentre, halfWidth, topHalfHeight, bottomHalfHeight, exponent]
const CHASSIS = [
  [-2.78, 0.26, 0.05, 0.04, 0.04, 2.4], [-2.45, 0.3, 0.1, 0.07, 0.07], [-1.95, 0.36, 0.15, 0.09, 0.1], [-1.35, 0.44, 0.2, 0.12, 0.15],
  [-0.85, 0.5, 0.28, 0.15, 0.22], [-0.45, 0.48, 0.47, 0.13, 0.28, 3.4], [0.25, 0.47, 0.5, 0.13, 0.29, 3.4], [0.95, 0.45, 0.36, 0.13, 0.28, 3.0],
  [1.6, 0.42, 0.2, 0.12, 0.22], [2.25, 0.4, 0.1, 0.09, 0.14], [2.7, 0.4, 0.05, 0.05, 0.06],
];
const ENGINE_COVER = [[-0.7, 0.72, 0.1, 0.06, 0.08], [-0.45, 0.82, 0.15, 0.17, 0.1], [0.0, 0.8, 0.16, 0.17, 0.12], [0.8, 0.68, 0.12, 0.1, 0.1], [1.6, 0.56, 0.08, 0.05, 0.06], [2.2, 0.5, 0.04, 0.03, 0.03]];

export function createBike({ livery, helmet, number, sponsor, detail = 1, tyre = 'MEDIUM' }) {
  const D = detail;
  const root = new THREE.Group();
  const lean = new THREE.Group(); root.add(lean);            // body roll / crash spin
  const wheelie = new THREE.Group(); lean.add(wheelie);       // pitch (dive under braking, squat on throttle)
  const body = new THREE.Group(); wheelie.add(body);
  const hi = new THREE.Group(); body.add(hi);

  const paintTex = carLiveryTexture(livery, number, sponsor);
  const cLivery = D === 0 ? new THREE.MeshLambertMaterial({ map: paintTex }) : D >= 2 ? new THREE.MeshPhysicalMaterial({ map: paintTex, roughness: 0.3, metalness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05 }) : new THREE.MeshStandardMaterial({ map: paintTex, roughness: 0.28, metalness: 0.15 });
  const cDark = mat('plastic', '#141416', D), cRubber = mat('rubber', '#121212', D), cMetal = mat('metal', '#a8adb5', D);
  const cCarbon = D === 0 ? mat('plastic', '#1d1e21', D) : mat('carbon', '#ffffff', D, { map: carbonTexture() });
  const cMain = mat('paint', livery[0], D), cAcc = mat('paint', livery[1], D), cTi = mat('ti', '#8e8a9c', D);
  const tyreStripe = { SOFT: '#ff3b3b', MEDIUM: '#ffd23b', HARD: '#f0f0f0', INTER: '#3bd16f', WET: '#3b9dff' }[tyre] || '#ffd23b';
  const around = D >= 2 ? 36 : D === 1 ? 24 : 14;

  const parts = [{ geo: loft(CHASSIS, around), mat: cLivery }, { geo: loft(ENGINE_COVER, Math.max(12, around / 2)), mat: cLivery }];
  // floor (carbon) with 2026 narrower plank, sidepod inlets
  { const fl = new THREE.BoxGeometry(1.42, 0.03, 3.2); const p = fl.attributes.position; for (let i = 0; i < p.count; i++) { const z = p.getZ(i); if (z < -1.0) p.setX(i, p.getX(i) * 0.55); } fl.computeVertexNormals(); parts.push({ geo: T(fl, 0, 0.07, 0.35), mat: cCarbon }); }
  for (const sx of [-1, 1]) parts.push({ geo: T(new THREE.BoxGeometry(0.1, 0.16, 0.04), sx * 0.44, 0.52, -0.5), mat: cDark });
  // front wing: 2 elements + endplates, nose pylons
  parts.push({ geo: T(new THREE.BoxGeometry(1.8, 0.022, 0.42), 0, 0.12, -2.68, -0.04), mat: cAcc });
  parts.push({ geo: T(new THREE.BoxGeometry(1.72, 0.018, 0.2), 0, 0.2, -2.55, -0.45), mat: cCarbon });
  for (const sx of [-1, 1]) {
    parts.push({ geo: T(new THREE.BoxGeometry(0.02, 0.2, 0.5), sx * 0.9, 0.18, -2.66), mat: cMain });
    parts.push({ geo: T(new THREE.BoxGeometry(0.02, 0.13, 0.08), sx * 0.08, 0.2, -2.55), mat: cCarbon });
    // suspension wishbones (front + rear)
    parts.push({ geo: T(new THREE.BoxGeometry(0.62, 0.025, 0.06), sx * 0.5, 0.42, FRONT_Z - 0.05, 0, 0, sx * -0.12), mat: cCarbon });
    parts.push({ geo: T(new THREE.BoxGeometry(0.62, 0.025, 0.06), sx * 0.5, 0.3, FRONT_Z + 0.05, 0, 0, sx * 0.06), mat: cCarbon });
    parts.push({ geo: T(new THREE.BoxGeometry(0.6, 0.025, 0.06), sx * 0.5, 0.44, REAR_Z - 0.05, 0, 0, sx * -0.05), mat: cCarbon });
    parts.push({ geo: T(new THREE.BoxGeometry(0.6, 0.025, 0.06), sx * 0.5, 0.28, REAR_Z + 0.05), mat: cCarbon });
    // rear wing endplates
    parts.push({ geo: T(new THREE.BoxGeometry(0.02, 0.5, 0.55), sx * 0.5, 0.78, 2.52), mat: cMain });
    // mirrors
    parts.push({ geo: T(new THREE.BoxGeometry(0.14, 0.06, 0.04), sx * 0.42, 0.78, -0.95), mat: cMain });
    parts.push({ geo: T(new THREE.BoxGeometry(0.02, 0.15, 0.02), sx * 0.38, 0.7, -0.95), mat: cCarbon });
  }
  // rear wing: main plane + flap (active aero), beam wing, swan-neck pylon
  parts.push({ geo: T(new THREE.BoxGeometry(1.0, 0.022, 0.32), 0, 0.92, 2.55, 0.12), mat: cMain });
  parts.push({ geo: T(new THREE.BoxGeometry(1.0, 0.018, 0.2), 0, 1.0, 2.38, 0.5), mat: cAcc });
  parts.push({ geo: T(new THREE.BoxGeometry(0.9, 0.016, 0.16), 0, 0.42, 2.6, 0.1), mat: cCarbon });
  parts.push({ geo: T(new THREE.BoxGeometry(0.03, 0.42, 0.1), 0, 0.7, 2.5), mat: cCarbon });
  // halo
  { const h = new THREE.TorusGeometry(0.28, 0.025, 6, D >= 1 ? 18 : 10, Math.PI); h.rotateX(-Math.PI / 2); h.scale(1, 1, 1.5); h.translate(0, 0.86, -0.42); parts.push({ geo: h, mat: cDark });
    parts.push({ geo: T(new THREE.CylinderGeometry(0.02, 0.025, 0.42, 6), 0, 0.76, -0.96, -0.95), mat: cDark }); }
  // exhaust + rain light
  parts.push({ geo: T(new THREE.CylinderGeometry(0.045, 0.05, 0.16, D >= 2 ? 12 : 8), 0, 0.5, 2.62, Math.PI / 2), mat: cTi });
  parts.push({ geo: T(new THREE.BoxGeometry(0.1, 0.05, 0.02), 0, 0.42, 2.72), mat: mat('plastic', '#ff2020', D, { emissive: '#ff0000', emissiveIntensity: 0.6 }) });
  const exhaust = new THREE.Vector3(0, 0.5, 2.72);
  for (const m of mergeByMaterial(parts)) hi.add(m);

  // wheels (18-inch, wheel covers removed for 2026 but kept as simple discs)
  const mkWheel = (halfW) => {
    const g = new THREE.Group(); const wp = [];
    wp.push({ geo: tyreGeometry(halfW, D >= 2 ? 40 : D === 1 ? 26 : 14, D), mat: cRubber });
    if (D >= 1) for (const sx of [-1, 1]) { const st = new THREE.TorusGeometry(R - 0.06, 0.006, 4, D >= 2 ? 40 : 24); st.rotateY(Math.PI / 2); st.translate(sx * halfW * 0.98, 0, 0); wp.push({ geo: st, mat: mat('plastic', tyreStripe, D) }); }
    const rim = new THREE.CylinderGeometry(R - 0.09, R - 0.09, halfW * 1.7, D >= 2 ? 24 : 14, 1, true); rim.rotateZ(Math.PI / 2); wp.push({ geo: rim, mat: cDark });
    for (const sx of [-1, 1]) { const d = new THREE.CircleGeometry(R - 0.09, D >= 2 ? 24 : 12); d.rotateY(sx * Math.PI / 2); d.translate(sx * halfW * 0.85, 0, 0); wp.push({ geo: d, mat: cMetal }); }
    for (const m of mergeByMaterial(wp, D >= 1)) g.add(m);
    return g;
  };
  const front = new THREE.Group(); front.position.set(0, R, FRONT_Z); hi.add(front);
  const rear = new THREE.Group(); rear.position.set(0, R, REAR_Z); hi.add(rear);
  for (const sx of [-1, 1]) { const w = mkWheel(0.15); w.position.x = sx * 0.8; front.add(w); const w2 = mkWheel(0.2); w2.position.x = sx * 0.78; rear.add(w2); }

  // driver: helmet in the cockpit (head group = helmet camera anchor)
  const head = new THREE.Group(); head.position.set(0, 0.76, -0.4); hi.add(head);
  const helm = new THREE.Mesh(new THREE.SphereGeometry(0.13, D >= 2 ? 20 : 12, D >= 2 ? 14 : 8), D === 0 ? new THREE.MeshLambertMaterial({ map: helmetTexture(helmet, number) }) : new THREE.MeshStandardMaterial({ map: helmetTexture(helmet, number), roughness: 0.25, metalness: 0.2 }));
  helm.scale.set(1, 1, 1.12); helm.castShadow = true; head.add(helm);
  const visor = new THREE.Mesh(new THREE.SphereGeometry(0.132, 12, 6, -0.9, 1.8, 1.15, 0.5), mat('visor', '#1a1f2a', D)); visor.rotation.y = Math.PI; head.add(visor);
  const torso = new THREE.Group(); hi.add(torso);
  { const sh = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.08, 0.2), mat('leather', livery[0], D)); sh.position.set(0, 0.62, -0.3); torso.add(sh); }

  // ---------------- far LOD (single draw) ----------------
  const lo = new THREE.Group(); body.add(lo); lo.visible = false;
  {
    const lp = [];
    const col = (g, c) => { const n = clean(g); const cc = new THREE.Color(c); const arr = new Float32Array(n.attributes.position.count * 3); for (let i = 0; i < arr.length; i += 3) { arr[i] = cc.r; arr[i + 1] = cc.g; arr[i + 2] = cc.b; } n.setAttribute('color', new THREE.BufferAttribute(arr, 3)); return n; };
    lp.push(col(loft(CHASSIS, 8), livery[0]), col(loft(ENGINE_COVER, 8), livery[1]));
    lp.push(col(T(new THREE.BoxGeometry(1.8, 0.04, 0.42), 0, 0.12, -2.66), livery[1]), col(T(new THREE.BoxGeometry(1.0, 0.25, 0.32), 0, 0.88, 2.5), livery[0]));
    lp.push(col(T(new THREE.BoxGeometry(1.3, 0.04, 3.0), 0, 0.07, 0.35), '#151515'));
    for (const [z, x, w] of [[FRONT_Z, 0.8, 0.3], [REAR_Z, 0.78, 0.4]]) for (const sx of [-1, 1]) lp.push(col(T(new THREE.CylinderGeometry(R, R, w, 10), sx * x, R, z, 0, 0, Math.PI / 2), '#111'));
    lp.push(col(T(new THREE.SphereGeometry(0.13, 8, 6), 0, 0.76, -0.4), helmet[0]));
    const m = new THREE.Mesh(mergeGeometries(lp.map(g => { for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'color'].includes(k)) g.deleteAttribute(k); return g; })), loMaterial());
    lo.add(m);
  }

  toonify(hi, { rim: 0.85 }); toonify(lo, { rim: 0.6 });
  helm.userData.ink = true;
  addOutlines(hi, { width: D >= 2 ? 2.9 : 2.5, minSize: 0.05, filter: o => o.userData.ink });
  addOutlines(lo, { width: 2.2 });
  hi.traverse(o => { if (o.isMesh) o.receiveShadow = false; });
  const car = {
    root, lean, wheelie, body, hi, lo, front, rear, head, torso, limbs: [], extras: [], exhaust, detail: D,
    anim: { lean: 0, leanV: 0, pitch: 0, pitchV: 0, spin: 0, look: 0, lookV: 0, lod: 0, crashYaw: 0 },
    knee: [new THREE.Vector3(), new THREE.Vector3()],
    setLOD(level) { if (this.anim.lod === level) return; this.anim.lod = level; hi.visible = level === 0; lo.visible = level === 1; },
    hulls: [], loHulls: [], ink: true, loInk: true,
    setInk(on, loOn = on) { if (on !== this.ink) { this.ink = on; for (const h of this.hulls) h.visible = on; } if (loOn !== this.loInk) { this.loInk = loOn; for (const h of this.loHulls) h.visible = loOn; } },
  };
  hi.traverse(o => { if (o.userData.outline) car.hulls.push(o); }); lo.traverse(o => { if (o.userData.outline) car.loHulls.push(o); });
  return car;
}
export const createCar = createBike;
let _loMat = null;
function loMaterial() { if (!_loMat) _loMat = new THREE.MeshLambertMaterial({ vertexColors: true }); return _loMat; }

function spring(a, key, target, omega, dt) {
  const vk = key + 'V'; const x = a[key], v = a[vk] || 0;
  const f = 1 + 2 * dt * omega, oo = omega * omega, hoo = dt * oo, hhoo = dt * hoo, det = 1 / (f + hhoo);
  a[key] = (f * x + dt * v + hhoo * target) * det; a[vk] = (v + hoo * (target - x)) * det;
}

// driver pose: only the helmet moves (look into corners, celebrate on the podium)
export function poseRider(m, hang, tuck, look, brake, celebrate = 0) {
  m.head.rotation.set(-0.05 + celebrate * 0.25, look, -hang * 0.15, 'YXZ');
  m.head.position.y = 0.76 + celebrate * 0.12;
}

// Smoothly animate the car from physical state. `lean` is the normalised lateral-g angle from the sim.
export function animateBike(m, { lean = 0, accel = 0, v = 0, dt = 0.016, crashed = false, brake = 0, near = true }) {
  const a = m.anim; dt = Math.min(dt, 0.05);
  spring(a, 'lean', lean * 0.05, 12, dt);                   // a few degrees of body roll
  const pT = accel < -2 ? Math.max(-0.02, accel * 0.0006) : accel > 3 ? Math.min(0.012, accel * 0.0008) : 0;
  spring(a, 'pitch', pT, 8, dt);
  spring(a, 'look', Math.max(-0.4, Math.min(0.4, lean * 0.4)), 6, dt);
  m.lean.rotation.z = -a.lean;
  m.wheelie.rotation.x = a.pitch;
  a.spin = (a.spin + v * dt / R) % (Math.PI * 2);
  m.front.rotation.x = -a.spin; m.rear.rotation.x = -a.spin;
  if (crashed) { a.crashYaw += dt * Math.max(0, 6 - a.crashYaw) * 1.4; m.lean.rotation.y = a.crashYaw; } else if (a.crashYaw) { a.crashYaw = 0; m.lean.rotation.y = 0; }
  if (near && a.lod === 0) poseRider(m, lean, 1, a.look, brake);
}
export const animateCar = animateBike;
