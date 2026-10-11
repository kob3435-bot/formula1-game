// Test harness page (dev server only): builds a circuit scene exactly as the game does (unmerged so every object is
// inspectable) and verifies that nothing solid-looking stands on, overhangs or blocks any part of the drivable road.
import * as THREE from 'three';
import { TRACK_BY_ID } from '../src/data/tracks.js';
import { buildTrackGeometry } from '../src/game/trackgeom.js';
import { buildTrackScene } from '../src/game/trackScene.js';
import { themeOf } from '../src/game/themes.js';

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(800, 450); document.body.appendChild(renderer.domElement);
let cur = null;

function load(id) {
  if (cur) { cur.scene.traverse(o => { if (o.geometry) o.geometry.dispose(); }); }
  const track = TRACK_BY_ID[id], geo = buildTrackGeometry(track);
  const ts = buildTrackScene(geo, { quality: 2, weather: 'SUNNY', night: !!track.night, theme: themeOf(track), noMerge: true });
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#8fc4f0'); scene.fog = new THREE.Fog('#8fc4f0', 300, 1600);
  scene.add(new THREE.HemisphereLight('#ffffff', '#556644', 1.6)); const sun = new THREE.DirectionalLight('#ffffff', 1.8); sun.position.set(300, 500, 200); scene.add(sun);
  scene.add(ts.group); scene.updateMatrixWorld(true);
  cur = { id, track, geo, ts, scene };
  return cur;
}

const tA = new THREE.Vector3(), tB = new THREE.Vector3(), tC = new THREE.Vector3(), P = new THREE.Vector3(), M = new THREE.Matrix4();
function check(id) {
  const { geo, ts, scene } = load(id);
  const hw = geo.halfW, bad = [], N = geo.N;
  const note = (kind, x, y, z, c) => { if (bad.length < 40) bad.push({ kind, x: +x.toFixed(1), z: +z.toFixed(1), y: +y.toFixed(1), clear: +c.toFixed(2) }); else bad.length++; };
  // on-road test for a world point that is part of a solid object (only the height band a car/camera occupies matters)
  const testPt = (kind, p, need) => { const c = geo.clearAt(p.x, p.z, p.y - 1.5); if (c < need) note(kind, p.x, p.y, p.z, c); };
  let meshes = 0, pts = 0;
  ts.group.traverse(o => {
    if (!o.isMesh || o.userData.surface || o.userData.overhead || o.userData.outline) return;
    meshes++;
    const kind = o.userData.barrier ? 'barrier' : (o.name || o.geometry.type || 'mesh');
    const pos = o.geometry.attributes.position;
    if (o.isInstancedMesh) {
      o.geometry.computeBoundingSphere(); const r0 = o.geometry.boundingSphere.radius;
      for (let k = 0; k < o.count; k++) {
        o.getMatrixAt(k, M); M.premultiply(o.matrixWorld); P.setFromMatrixPosition(M);
        const sc = new THREE.Vector3().setFromMatrixScale(M); const r = Math.min(r0 * sc.x, 3); // trees/huts: trunk footprint
        pts++; testPt('instanced:' + (o.geometry.type || 'merged'), P, Math.min(0.5, r * 0.25));
      }
      return;
    }
    const idx = o.geometry.index, tri = idx ? idx.count / 3 : pos.count / 3;
    const need = o.userData.barrier ? 0.9 : 0.3;
    for (let t = 0; t < tri; t++) {
      const a = idx ? idx.getX(t * 3) : t * 3, b = idx ? idx.getX(t * 3 + 1) : t * 3 + 1, c = idx ? idx.getX(t * 3 + 2) : t * 3 + 2;
      tA.fromBufferAttribute(pos, a).applyMatrix4(o.matrixWorld); tB.fromBufferAttribute(pos, b).applyMatrix4(o.matrixWorld); tC.fromBufferAttribute(pos, c).applyMatrix4(o.matrixWorld);
      const L = Math.max(tA.distanceTo(tB), tB.distanceTo(tC), tC.distanceTo(tA)); const n = Math.min(40, Math.ceil(L / 1.5));
      for (let i = 0; i <= n; i++) for (let j = 0; j <= n - i; j++) { const u = i / Math.max(1, n), v = j / Math.max(1, n); P.copy(tA).multiplyScalar(1 - u - v).addScaledVector(tB, u).addScaledVector(tC, v); pts++; testPt(kind, P, need); }
    }
  });
  // collision == visuals: the race clamps to geo.wallR/L; the barrier mesh must be built from the same arrays
  let mism = 0;
  ts.group.traverse(o => { if (!o.userData.barrier) return; const pos = o.geometry.attributes.position; for (let k = 0; k < pos.count; k += 2) { P.fromBufferAttribute(pos, k); const c = geo.clearAt(P.x, P.z, P.y); if (c < 1.0) mism++; } });
  // line of sight from the driver's eye along every 10 m: anything hit within 35 m that sits on the road is a blocker
  const rc = new THREE.Raycaster(); const solids = []; ts.group.traverse(o => { if (o.isMesh && !o.userData.surface && !o.userData.overhead && !o.userData.outline) solids.push(o); });
  let rays = 0, blocked = 0; const blk = [];
  for (let i = 0; i < N; i += 5) for (const d of [-hw * 0.6, 0, hw * 0.6]) {
    const eye = new THREE.Vector3(geo.x[i] + geo.rx[i] * d, geo.y[i] + 1.0, geo.z[i] + geo.rz[i] * d);
    const j = (i + Math.round(30 / geo.ds)) % N; const tgt = new THREE.Vector3(geo.x[j] + geo.rx[j] * d, geo.y[j] + 0.9, geo.z[j] + geo.rz[j] * d);
    const dir = tgt.clone().sub(eye); const far = dir.length(); dir.normalize(); rc.set(eye, dir); rc.far = far; rays++;
    const h = rc.intersectObjects(solids, false)[0];
    if (h && geo.clearAt(h.point.x, h.point.z, h.point.y - 1.5) < 0.3) { blocked++; if (blk.length < 10) blk.push({ s: i * geo.ds, d, obj: h.object.userData.barrier ? 'barrier' : h.object.geometry.type, at: [h.point.x.toFixed(0), h.point.z.toFixed(0)] }); }
  }
  // vertical test over the whole road surface: drop a ray from 6 m above each road point; the first thing it meets must be
  // that road (or its own kerb/line paint). Catches terrain/hills, run-off, gravel, water or props of OTHER sections above it.
  const road = []; ts.group.traverse(o => { if (o.isMesh && o.userData.surface) road.push(o); });
  const all = solids.concat(road.filter(o => o.geometry.type !== 'CircleGeometry'));
  let vrays = 0, covered = 0; const cov = [];
  for (let i = 0; i < N; i += 2) for (const d of [-hw + 0.4, -hw * 0.5, 0, hw * 0.5, hw - 0.4]) {
    const top = new THREE.Vector3(geo.x[i] + geo.rx[i] * d, geo.y[i] + 6, geo.z[i] + geo.rz[i] * d);
    rc.set(top, new THREE.Vector3(0, -1, 0)); rc.far = 5.95; vrays++;
    const hits = rc.intersectObjects(all, false).filter(h => !h.object.userData.overhead);
    const h = hits[0];
    if (h && h.point.y > geo.y[i] + 0.12) { covered++; if (cov.length < 10) cov.push({ s: i * geo.ds, d: +d.toFixed(1), dy: +(h.point.y - geo.y[i]).toFixed(2), obj: h.object.userData.barrier ? 'barrier' : h.object.userData.surface ? 'surface:' + (h.object.material.map ? 'tex' : 'col') + (h.object.geometry.index ? '' : '') : h.object.geometry.type }); }
  }
  if (cur.ts.group.children.length && false) {}
  const wallClip = (() => { let c = 0; for (let i = 0; i < N; i++) { if (geo.wallR[i] < hw + 20.5) c++; if (geo.wallL[i] < hw + 20.5) c++; } return +(c / 2 / N * 100).toFixed(1); })();
  return { id, vrays, covered, cov, meshes, pts, violations: bad.length, sample: bad.slice(0, 8), barrierOffRoadMismatch: mism, rays, blocked, blk, wallClipPct: wallClip, minWall: +Math.min(Math.min(...geo.wallR), Math.min(...geo.wallL)).toFixed(1), stands: ts.stands.length };
}

function shot(fracs) {
  const { geo, scene } = cur; const cam = new THREE.PerspectiveCamera(62, 16 / 9, 0.1, 3000); const out = [];
  for (const f of fracs) {
    const i = Math.floor(f * geo.N) % geo.N, b = Math.max(0, i - 4);
    cam.position.set(geo.x[b] + geo.rx[b] * geo.lineD[b] * 0.5, geo.y[b] + 1.6, geo.z[b] + geo.rz[b] * geo.lineD[b] * 0.5);
    const j = (i + 12) % geo.N; cam.lookAt(geo.x[j], geo.y[j] + 0.8, geo.z[j]);
    renderer.render(scene, cam); out.push(renderer.domElement.toDataURL('image/jpeg', 0.8));
  }
  return out;
}
window.trackcheck = { check, shot, load: (id) => { load(id); return true; } };
window.trackcheckReady = true;
