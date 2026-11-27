/**
 * Square pyramid cap: four equilateral triangles (edge = L = 7.5 cm)
 * on a square rim. Johnson J1. Apex height = L/√2 above the rim.
 * Faces tilt ~54.7°, so steps need posePolicy 'roof-cap'.
 */
import { M } from './tile-spec';

type Vec3 = [number, number, number];

export type CapSide = 'front' | 'back' | 'left' | 'right';

/** Height of the apex above the wall-top plane. */
export const PYRAMID_RISE = M / Math.SQRT2;

const TRI_H = (M * Math.sqrt(3)) / 2;

function localTri(): Vec3[] {
  return [
    [0, 0, (2 * TRI_H) / 3],
    [-M / 2, 0, -TRI_H / 3],
    [M / 2, 0, -TRI_H / 3],
  ];
}

export function pyramidApex(cx: number, rimY: number, cz: number): Vec3 {
  return [cx, rimY + PYRAMID_RISE, cz];
}

/** World verts in local order: tip, baseA, baseB. */
export function pyramidCapVerts(
  side: CapSide,
  cx: number,
  rimY: number,
  cz: number,
): Vec3[] {
  const apex = pyramidApex(cx, rimY, cz);
  const h = M / 2;
  if (side === 'front') {
    return [apex, [cx - h, rimY, cz + h], [cx + h, rimY, cz + h]];
  }
  if (side === 'back') {
    return [apex, [cx + h, rimY, cz - h], [cx - h, rimY, cz - h]];
  }
  if (side === 'left') {
    return [apex, [cx - h, rimY, cz + h], [cx - h, rimY, cz - h]];
  }
  return [apex, [cx + h, rimY, cz - h], [cx + h, rimY, cz + h]];
}

function sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}
function add(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}
function scale(a: Vec3, s: number): Vec3 {
  return [a[0] * s, a[1] * s, a[2] * s];
}
function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}
function cross(a: Vec3, b: Vec3): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}
function norm(a: Vec3): Vec3 {
  const L = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / L, a[1] / L, a[2] / L];
}
function centroid(pts: Vec3[]): Vec3 {
  return [
    (pts[0][0] + pts[1][0] + pts[2][0]) / 3,
    (pts[0][1] + pts[1][1] + pts[2][1]) / 3,
    (pts[0][2] + pts[1][2] + pts[2][2]) / 3,
  ];
}

function basis(pts: Vec3[]): Vec3[] {
  const e0 = norm(sub(pts[2], pts[1]));
  const mid = scale(add(pts[1], pts[2]), 0.5);
  const e1 = norm(sub(pts[0], mid));
  const n = norm(cross(e0, e1));
  const e1b = norm(cross(n, e0));
  return [e0, e1b, n];
}

/** R = Rz Ry Rx matching rotateEulerDeg. Columns are images of local axes. */
function eulerFromBasis(local: Vec3[], world: Vec3[]): Vec3 {
  const R: number[][] = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  for (let col = 0; col < 3; col++) {
    for (let row = 0; row < 3; row++) {
      R[row][col] =
        world[0][row] * local[0][col] +
        world[1][row] * local[1][col] +
        world[2][row] * local[2][col];
    }
  }
  const sy = Math.hypot(R[0][0], R[1][0]);
  let rx: number;
  let ry: number;
  let rz: number;
  if (sy > 1e-6) {
    rx = Math.atan2(R[2][1], R[2][2]);
    ry = Math.atan2(-R[2][0], sy);
    rz = Math.atan2(R[1][0], R[0][0]);
  } else {
    rx = Math.atan2(-R[1][2], R[1][1]);
    ry = Math.atan2(-R[2][0], sy);
    rz = 0;
  }
  const deg = 180 / Math.PI;
  return [rx * deg, ry * deg, rz * deg];
}

export function pyramidCapPose(
  side: CapSide,
  cx = 0,
  rimY = 1,
  cz = 0,
): { position: Vec3; rotation: Vec3 } {
  const local = localTri();
  const world = pyramidCapVerts(side, cx, rimY, cz);
  let rot = eulerFromBasis(basis(local), basis(world));
  // [rx, 0, 180] is the same pose as [rx-180, 180, 0]. The scene applies the
  // second form the same way as the front face (tilt + yaw), so the back
  // triangle stays point-up. The roll form renders upside down.
  if (Math.abs(Math.abs(rot[2]) - 180) < 1) {
    rot = [rot[0] - 180, rot[1] + 180, 0];
  }
  return { position: centroid(world), rotation: rot };
}
