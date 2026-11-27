/**
 * Fixed camera + horizontal desk turntable.
 * Camera stays put; stage yaw brings the active face toward the viewer.
 */

export type Vec3 = [number, number, number];

function len(v: Vec3): number {
  return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]) || 1;
}

function norm(v: Vec3): Vec3 {
  const L = len(v);
  return [v[0] / L, v[1] / L, v[2] / L];
}

function add(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function scale(v: Vec3, s: number): Vec3 {
  return [v[0] * s, v[1] * s, v[2] * s];
}

function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function lerp(a: Vec3, b: Vec3, t: number): Vec3 {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

/** Local +Y of a tile after XYZ Euler degrees (approx, matches our authored poses). */
export function tileOutwardNormal(rotationDeg: Vec3): Vec3 {
  const rx = (rotationDeg[0] * Math.PI) / 180;
  const ry = (rotationDeg[1] * Math.PI) / 180;
  const rz = (rotationDeg[2] * Math.PI) / 180;
  let x = 0;
  let y = 1;
  let z = 0;
  {
    const y2 = y * Math.cos(rx) - z * Math.sin(rx);
    const z2 = y * Math.sin(rx) + z * Math.cos(rx);
    y = y2;
    z = z2;
  }
  {
    const x2 = x * Math.cos(ry) + z * Math.sin(ry);
    const z2 = -x * Math.sin(ry) + z * Math.cos(ry);
    x = x2;
    z = z2;
  }
  {
    const x2 = x * Math.cos(rz) - y * Math.sin(rz);
    const y2 = x * Math.sin(rz) + y * Math.cos(rz);
    x = x2;
    y = y2;
  }
  return norm([x, y, z]);
}

export interface FollowShot {
  eye: Vec3;
  target: Vec3;
}

/** Default fixed hero camera (正视角). */
export const FRONT_EYE: Vec3 = [0, 2.2, 5.5];
export const FRONT_LOOK: Vec3 = [0, 0.4, 0];

/**
 * Kept for accept/tests — static framing only (no live dolly).
 */
export function shotForTile(
  tilePos: Vec3,
  tileRot: Vec3,
  opts?: { dist?: number; lift?: number; pullBack?: number },
): FollowShot {
  const dist = (opts?.dist ?? 3.4) * (opts?.pullBack ?? 1);
  const lift = opts?.lift ?? 1.1;
  const n = tileOutwardNormal(tileRot);
  const away = norm(add(n, [0, 0.35, 0]));
  const eye = add(add(tilePos, scale(away, dist)), [0, lift * 0.15, 0]);
  eye[1] = Math.max(eye[1], tilePos[1] + lift * 0.4);
  return { eye, target: [tilePos[0], tilePos[1], tilePos[2]] };
}

/**
 * Stage yaw (radians) so the tile's mating face turns toward +Z (camera).
 * Floor/lid (mostly vertical normal) → face the tile's XZ offset, else 0.
 */
export function yawToRevealTile(tilePos: Vec3, tileRot: Vec3): number {
  const n = tileOutwardNormal(tileRot);
  const hLen = Math.hypot(n[0], n[2]);
  if (hLen < 0.35) {
    const pLen = Math.hypot(tilePos[0], tilePos[2]);
    if (pLen < 0.12) return 0;
    return -Math.atan2(tilePos[0], tilePos[2]);
  }
  return -Math.atan2(n[0] / hLen, n[2] / hLen);
}

/** Shortest signed delta from `from` to `to` in radians. */
export function shortestYawDelta(from: number, to: number): number {
  let d = to - from;
  const twoPi = Math.PI * 2;
  while (d > Math.PI) d -= twoPi;
  while (d < -Math.PI) d += twoPi;
  return d;
}

export function dampAngle(
  current: number,
  goal: number,
  dtSec: number,
  halfLife = 0.28,
): number {
  const d = shortestYawDelta(current, goal);
  const k = 1 - Math.pow(0.5, Math.max(0, dtSec) / Math.max(0.001, halfLife));
  return current + d * k;
}

/**
 * Tray on the camera-facing rim (legacy). Prefer outwardFlyStart for watch paths
 * so tiles never lerp through the build.
 */
export function trayInTurntableLocal(
  stageYaw: number,
  y = 0.25,
  dist = 3.8,
): Vec3 {
  const c = Math.cos(stageYaw);
  const s = Math.sin(stageYaw);
  return [dist * s, y, dist * c];
}

/**
 * Fly-in origin outside the mating face — right tile from +X, left from -X, etc.
 * Prevents 穿模 (lerp through the existing build).
 */
export function outwardFlyStart(
  tilePos: Vec3,
  tileRot: Vec3,
  dist = 2.6,
): Vec3 {
  const n = tileOutwardNormal(tileRot);
  let dir = n;
  // Floor / lid: mostly ±Y — come slightly from +Z so the path stays clear
  if (Math.abs(n[1]) > 0.85) {
    dir = norm([n[0] * 0.15, n[1], n[2] * 0.15 + 0.4 * Math.sign(n[1] || 1)]);
  }
  return [
    tilePos[0] + dir[0] * dist,
    tilePos[1] + dir[1] * dist * 0.9,
    tilePos[2] + dir[2] * dist,
  ];
}

/** True when tile is fully hidden behind the build from a fixed front camera. */
export function isFullyOccluded(
  eye: Vec3,
  look: Vec3,
  tilePos: Vec3,
  placed: Vec3[],
): boolean {
  if (!placed.length) return false;

  const toTile = sub(tilePos, eye);
  const distTile = len(toTile);
  if (distTile < 0.01) return false;
  const rayTile = scale(toTile, 1 / distTile);

  const view = norm(sub(look, eye));
  if (dot(view, rayTile) < 0.15) return false;

  let cx = 0;
  let cy = 0;
  let cz = 0;
  for (let i = 0; i < placed.length; i++) {
    cx += placed[i][0];
    cy += placed[i][1];
    cz += placed[i][2];
  }
  const n = placed.length;
  const centroid: Vec3 = [cx / n, cy / n, cz / n];

  const camFromCore = sub(eye, centroid);
  const tileFromCore = sub(tilePos, centroid);
  const backDot = dot(norm(camFromCore), norm(tileFromCore));
  if (backDot > -0.35) return false;

  let blockers = 0;
  for (let i = 0; i < placed.length; i++) {
    const p = placed[i];
    const toP = sub(p, eye);
    const dP = len(toP);
    if (dP >= distTile - 0.2) continue;
    const rayP = scale(toP, 1 / dP);
    if (dot(rayTile, rayP) > 0.92) blockers += 1;
  }
  return blockers >= 1;
}

/** @deprecated camera rescue — prefer turntable yaw. Kept for accept string checks. */
export function rescueShot(
  eye: Vec3,
  look: Vec3,
  tilePos: Vec3,
  tileRot: Vec3,
): FollowShot {
  const dist = Math.max(4.2, Math.min(7.5, len(sub(eye, look))));
  const face = shotForTile(tilePos, tileRot, { dist: dist * 0.85, lift: 1.15 });
  const target: Vec3 = [
    (look[0] + tilePos[0]) * 0.5,
    Math.max(0.4, (look[1] + tilePos[1]) * 0.5),
    (look[2] + tilePos[2]) * 0.5,
  ];
  const dir = norm(sub(face.eye, target));
  const newEye = add(target, scale(dir, dist));
  newEye[1] = Math.max(1.6, Math.min(3.6, newEye[1]));
  return { eye: newEye, target };
}

export function dampVec3(current: Vec3, goal: Vec3, dtSec: number, halfLife = 0.18): Vec3 {
  const k = 1 - Math.pow(0.5, Math.max(0, dtSec) / Math.max(0.001, halfLife));
  return lerp(current, goal, k);
}

export function applyCameraPose(
  cameraEl: any,
  targetEl: any,
  eye: Vec3,
  target: Vec3,
  getTransform: (el: any) => any,
): void {
  const camTr = getTransform(cameraEl);
  if (camTr && camTr.position) {
    camTr.position.x = eye[0];
    camTr.position.y = eye[1];
    camTr.position.z = eye[2];
  }
  if (targetEl) {
    const tTr = getTransform(targetEl);
    if (tTr && tTr.position) {
      tTr.position.x = target[0];
      tTr.position.y = target[1];
      tTr.position.z = target[2];
    }
  }
}
