/**
 * 15 cm × 7.5 cm rectangle placements.
 * The 7.5 cm edge mates a square; the 15 cm edge runs away from that joint.
 */
import { M, M2 } from './tile-spec';

type Vec3 = [number, number, number];

function sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}
function add(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}
function scale(a: Vec3, s: number): Vec3 {
  return [a[0] * s, a[1] * s, a[2] * s];
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

function localRect(): Vec3[] {
  const hx = M2 / 2;
  const hz = M / 2;
  return [
    [-hx, 0, -hz],
    [hx, 0, -hz],
    [hx, 0, hz],
    [-hx, 0, hz],
  ];
}

function basis3(pts: Vec3[]): Vec3[] {
  const e0 = norm(sub(pts[1], pts[0]));
  const e1 = norm(sub(pts[2], pts[0]));
  const n = norm(cross(e0, e1));
  const e1b = norm(cross(n, e0));
  return [e0, e1b, n];
}

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

function rotateEuler(p: Vec3, rotDeg: Vec3): Vec3 {
  const rx = (rotDeg[0] * Math.PI) / 180;
  const ry = (rotDeg[1] * Math.PI) / 180;
  const rz = (rotDeg[2] * Math.PI) / 180;
  let [x, y, z] = p;
  let y2 = y * Math.cos(rx) - z * Math.sin(rx);
  let z2 = y * Math.sin(rx) + z * Math.cos(rx);
  y = y2;
  z = z2;
  let x2 = x * Math.cos(ry) + z * Math.sin(ry);
  z2 = -x * Math.sin(ry) + z * Math.cos(ry);
  x = x2;
  z = z2;
  x2 = x * Math.cos(rz) - y * Math.sin(rz);
  y2 = x * Math.sin(rz) + y * Math.cos(rz);
  return [x2, y2, z];
}

function cardinal(angle: number): boolean {
  const a = ((angle % 360) + 360) % 360;
  return [0, 90, 270].some((t) => Math.abs(a - t) < 1 || Math.abs(a - t - 360) < 1);
}

function poseFromQuads(local: Vec3[], world: Vec3[]): { position: Vec3; rotation: Vec3 } {
  const guess = eulerFromBasis(basis3(local), basis3(world));
  const center = scale(
    world.reduce<Vec3>((s, p) => add(s, p), [0, 0, 0]),
    0.25,
  );
  if (cardinal(guess[0]) && cardinal(guess[2])) {
    return { position: center, rotation: guess };
  }
  const angs = [0, 90, -90, 180];
  for (const rx of angs) {
    for (const ry of angs) {
      for (const rz of angs) {
        if (!cardinal(rx) || !cardinal(rz)) continue;
        const spun = local.map((p) => rotateEuler(p, [rx, ry, rz]));
        const lc = scale(
          spun.reduce<Vec3>((s, p) => add(s, p), [0, 0, 0]),
          0.25,
        );
        const pos = sub(center, lc);
        const got = spun.map((p) => add(p, pos));
        const ok = got.every(
          (g, i) => Math.hypot(g[0] - world[i][0], g[1] - world[i][1], g[2] - world[i][2]) < 1e-6,
        );
        if (ok) return { position: pos, rotation: [rx, ry, rz] };
      }
    }
  }
  return { position: center, rotation: guess };
}

export type RailSide = 'front' | 'back' | 'left' | 'right';

/** 15cm parapet standing on a wall top. The 7.5cm edge sits on the rim. */
export function parapetPose(
  side: RailSide,
  cx: number,
  rimY: number,
  cz: number,
): { position: Vec3; rotation: Vec3 } {
  const h = M / 2;
  const up = M2;
  let world: Vec3[];
  if (side === 'front') {
    world = [
      [cx - h, rimY, cz + h],
      [cx - h, rimY + up, cz + h],
      [cx + h, rimY + up, cz + h],
      [cx + h, rimY, cz + h],
    ];
  } else if (side === 'back') {
    world = [
      [cx + h, rimY, cz - h],
      [cx + h, rimY + up, cz - h],
      [cx - h, rimY + up, cz - h],
      [cx - h, rimY, cz - h],
    ];
  } else if (side === 'left') {
    world = [
      [cx - h, rimY, cz + h],
      [cx - h, rimY + up, cz + h],
      [cx - h, rimY + up, cz - h],
      [cx - h, rimY, cz - h],
    ];
  } else {
    world = [
      [cx + h, rimY, cz - h],
      [cx + h, rimY + up, cz - h],
      [cx + h, rimY + up, cz + h],
      [cx + h, rimY, cz + h],
    ];
  }
  // Match local edge lengths: local 0-1 is the long edge.
  // Rebuild world so edge 0-1 is a vertical long edge.
  const ordered: Vec3[] = [world[0], world[1], world[2], world[3]];
  return poseFromQuads(localRect(), ordered);
}

/** Hood lying on the desk, 7.5cm edge against the square's ±Z side, 15cm sticking out. */
export function hoodPose(
  floor: Vec3,
  dir: '+z' | '-z',
): { position: Vec3; rotation: Vec3 } {
  const sign = dir === '+z' ? 1 : -1;
  const x0 = floor[0];
  const zEdge = floor[2] + sign * (M / 2);
  const zFar = zEdge + sign * M2;
  const y = floor[1];
  const world: Vec3[] = [
    [x0 - M / 2, y, zEdge],
    [x0 - M / 2, y, zFar],
    [x0 + M / 2, y, zFar],
    [x0 + M / 2, y, zEdge],
  ];
  return poseFromQuads(localRect(), world);
}
