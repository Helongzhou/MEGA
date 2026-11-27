/**
 * Gallery builds under MAG edge laws:
 * - Square/window/rect-long/right-leg/large-base = M (75 mm) — intermate
 * - Equilateral / hex / square / window / rect short side = 7.5 cm
 * - Rect long side = 15 cm
 * - Right hypotenuse ~10.61 cm mates only itself
 */
import { sortBuildSteps } from './build-order';
import { validateMagnetBuild } from './magnet-physics';
import {
  HEX_APOTHEM,
  LARGE_CENTROID_TO_BASE,
  TRIANGLE_EDGE,
  TRI_CENTROID_TO_BASE,
} from './tile-spec';
import { pyramidCapPose, type CapSide } from './pyramid-cap';
import { hoodPose, parapetPose, type RailSide } from './rect-rail';
import type {
  BuildStep,
  BuildWork,
  TileAssetId,
  TileModel,
  Vec3Tuple,
} from './works';

type SqColor = 'red' | 'blue' | 'yellow';
type TriColor = 'green' | 'orange';
type RectColor = 'blue' | 'red';
type LargeColor = 'yellow' | 'orange';
type HexColor = 'green' | 'blue';
type WinColor = 'blue' | 'yellow';
type RightColor = 'green' | 'orange';

const SQ: Record<SqColor, { assetId: TileAssetId; hint: string }> = {
  red: { assetId: 'tile-square-red', hint: '#FF6B6B' },
  blue: { assetId: 'tile-square-blue', hint: '#4ECDC4' },
  yellow: { assetId: 'tile-square-yellow', hint: '#FFE66D' },
};
const TRI: Record<TriColor, { assetId: TileAssetId; hint: string }> = {
  green: { assetId: 'tile-triangle-green', hint: '#95E1D3' },
  orange: { assetId: 'tile-triangle-orange', hint: '#F38181' },
};
const RECT: Record<RectColor, { assetId: TileAssetId; hint: string }> = {
  blue: { assetId: 'tile-rect-blue', hint: '#4ECDC4' },
  red: { assetId: 'tile-rect-red', hint: '#FF6B6B' },
};
const LARGE: Record<LargeColor, { assetId: TileAssetId; hint: string }> = {
  yellow: { assetId: 'tile-large-yellow', hint: '#FFE66D' },
  orange: { assetId: 'tile-large-orange', hint: '#F38181' },
};
const HEX: Record<HexColor, { assetId: TileAssetId; hint: string }> = {
  green: { assetId: 'tile-hex-green', hint: '#95E1D3' },
  blue: { assetId: 'tile-hex-blue', hint: '#4ECDC4' },
};
const WIN: Record<WinColor, { assetId: TileAssetId; hint: string }> = {
  blue: { assetId: 'tile-window-blue', hint: '#4ECDC4' },
  yellow: { assetId: 'tile-window-yellow', hint: '#FFE66D' },
};
const RIGHT: Record<RightColor, { assetId: TileAssetId; hint: string }> = {
  green: { assetId: 'tile-right-green', hint: '#95E1D3' },
  orange: { assetId: 'tile-right-orange', hint: '#F38181' },
};

const D71 = TRI_CENTROID_TO_BASE;
const LD = LARGE_CENTROID_TO_BASE;

function near(pos: Vec3Tuple, offset: Vec3Tuple): Vec3Tuple {
  return [pos[0] + offset[0], pos[1] + offset[1], pos[2] + offset[2]];
}

function outwardHint(rot: Vec3Tuple): Vec3Tuple {
  const [rx, , rz] = rot;
  if (Math.abs(rx) < 20 && Math.abs(rz) < 20) return [0, 1, 0.15];
  if (Math.abs(rx - 90) < 20) return [0, 0.15, 1];
  if (Math.abs(rx + 90) < 20) return [0, 0.15, -1];
  if (Math.abs(rz - 90) < 20) return [-1, 0.15, 0];
  if (Math.abs(rz + 90) < 20) return [1, 0.15, 0];
  return [0, 0.4, 0.4];
}

function step(
  model: TileModel,
  assetId: TileAssetId,
  hint: string,
  pos: Vec3Tuple,
  rot: Vec3Tuple,
): BuildStep {
  const n = outwardHint(rot);
  return {
    model,
    assetId,
    position: pos,
    rotation: rot,
    hintColor: hint,
    startPosition: near(pos, [n[0] * 0.45, n[1] * 0.35 + 0.12, n[2] * 0.45]),
    startRotation: rot,
  };
}

function sq(pos: Vec3Tuple, rot: Vec3Tuple, c: SqColor) {
  const x = SQ[c];
  return step('tile-square', x.assetId, x.hint, pos, rot);
}
function tri(pos: Vec3Tuple, rot: Vec3Tuple, c: TriColor) {
  const x = TRI[c];
  return step('tile-triangle', x.assetId, x.hint, pos, rot);
}
function rect(pos: Vec3Tuple, rot: Vec3Tuple, c: RectColor) {
  const x = RECT[c];
  return step('tile-rect', x.assetId, x.hint, pos, rot);
}
function large(pos: Vec3Tuple, rot: Vec3Tuple, c: LargeColor) {
  const x = LARGE[c];
  return step('tile-large', x.assetId, x.hint, pos, rot);
}
function hex(pos: Vec3Tuple, rot: Vec3Tuple, c: HexColor) {
  const x = HEX[c];
  return step('tile-hex', x.assetId, x.hint, pos, rot);
}
function win(pos: Vec3Tuple, rot: Vec3Tuple, c: WinColor) {
  const x = WIN[c];
  return step('tile-window', x.assetId, x.hint, pos, rot);
}
function right(pos: Vec3Tuple, rot: Vec3Tuple, c: RightColor) {
  const x = RIGHT[c];
  return step('tile-right', x.assetId, x.hint, pos, rot);
}

/** Equilateral petal on flat-top hex (71 mm edges). */
function petalOnHex(center: BuildStep, edgeIndex: number, c: TriColor): BuildStep {
  // Flat-top verts at 30°+k·60° → edge-mid outward at 60°+k·60° from +X
  const ang = Math.PI / 3 + (edgeIndex * Math.PI) / 3;
  const dist = HEX_APOTHEM + D71;
  const x = center.position[0] + Math.cos(ang) * dist;
  const z = center.position[2] + Math.sin(ang) * dist;
  // Local tip +Z; after Ry, tip at atan2(sin yaw, cos yaw) from +Z → polar from +X = 90°-yaw
  const yawDeg = 90 - (ang * 180) / Math.PI;
  return tri([x, 0, z], [0, yawDeg, 0], c);
}

/**
 * Outer leaf on a petal (71 mm only): mate the petal edge with farthest mid-radius
 * from origin; tip further out. Cardinal Ry only.
 */
function leafOnPetalOuter(petal: BuildStep, c: TriColor): BuildStep {
  const triH = (TRIANGLE_EDGE * Math.sqrt(3)) / 2;
  const localTri: Vec3Tuple[] = [
    [0, 0, (2 * triH) / 3],
    [-TRIANGLE_EDGE / 2, 0, -triH / 3],
    [TRIANGLE_EDGE / 2, 0, -triH / 3],
  ];
  const [prx, pry, prz] = petal.rotation;
  const rx = (prx * Math.PI) / 180;
  const ry = (pry * Math.PI) / 180;
  const rz = (prz * Math.PI) / 180;
  const rotate = (p: Vec3Tuple): Vec3Tuple => {
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
  };
  const world = localTri.map((p) => {
    const r = rotate(p);
    return [
      r[0] + petal.position[0],
      r[1] + petal.position[1],
      r[2] + petal.position[2],
    ] as Vec3Tuple;
  });
  const ranked: { a: Vec3Tuple; b: Vec3Tuple; mid: Vec3Tuple }[] = [];
  for (let i = 0; i < 3; i++) {
    const a = world[i];
    const b = world[(i + 1) % 3];
    const mid: Vec3Tuple = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
    ranked.push({ a, b, mid });
  }
  ranked.sort(
    (u, v) => Math.hypot(v.mid[0], v.mid[2]) - Math.hypot(u.mid[0], u.mid[2]),
  );
  const petalR2 =
    petal.position[0] * petal.position[0] + petal.position[2] * petal.position[2];
  for (const e of ranked) {
    const edgeAng = Math.atan2(e.b[2] - e.a[2], e.b[0] - e.a[0]);
    const baseRy = (-edgeAng * 180) / Math.PI;
    for (const add of [0, 180]) {
      const yaw = baseRy + add;
      const ryL = (yaw * Math.PI) / 180;
      const offX = -D71 * Math.sin(ryL);
      const offZ = -D71 * Math.cos(ryL);
      const pos: Vec3Tuple = [e.mid[0] - offX, petal.position[1], e.mid[2] - offZ];
      if (pos[0] * pos[0] + pos[2] * pos[2] <= petalR2 + 1e-6) continue;
      return tri(pos, [0, yaw, 0], c);
    }
  }
  throw new Error('leafOnPetalOuter: no outward 71mm edge mate');
}

/** Large gable on wall top (base M mates square/window). */
function largeOnWallTop(wall: BuildStep, c: LargeColor): BuildStep {
  const p = wall.position;
  const [, , rz] = wall.rotation;
  const topY = p[1] + 0.5 + LD;
  if (Math.abs(rz - 90) < 20) return large([p[0], topY, p[2]], [-90, 90, 0], c);
  if (Math.abs(rz + 90) < 20) return large([p[0], topY, p[2]], [-90, -90, 0], c);
  return large([p[0], topY, p[2]], [-90, 0, 0], c);
}

/** 15cm parapet: 7.5cm edge on the wall top, 15cm standing up. */
function rectOnWallTop(wall: BuildStep, c: RectColor): BuildStep {
  const p = wall.position;
  const [rx, , rz] = wall.rotation;
  const rimY = p[1] + 0.5;
  let side: RailSide = 'front';
  let cx = p[0];
  let cz = p[2];
  if (Math.abs(rx + 90) < 20) {
    side = 'back';
    cz = p[2] + 0.5;
  } else if (Math.abs(rx - 90) < 20) {
    side = 'front';
    cz = p[2] - 0.5;
  } else if (Math.abs(rz - 90) < 20) {
    side = 'left';
    cx = p[0] + 0.5;
  } else if (Math.abs(rz + 90) < 20) {
    side = 'right';
    cx = p[0] - 0.5;
  }
  const pose = parapetPose(side, cx, rimY, cz);
  return rect(pose.position, pose.rotation, c);
}

/** Hood: 7.5cm edge on the square, 15cm lying outward. */
function rectBesideFloor(floor: BuildStep, dir: '+z' | '-z', c: RectColor): BuildStep {
  const pose = hoodPose(floor.position, dir);
  return rect(pose.position, pose.rotation, c);
}

const CAP_SIDES: CapSide[] = ['back', 'left', 'right', 'front'];

/** Four equilateral triangles closing a square rim. */
function roofCap(cx: number, rimY: number, cz: number, c: TriColor): BuildStep[] {
  return CAP_SIDES.map((side) => {
    const pose = pyramidCapPose(side, cx, rimY, cz);
    return {
      ...tri(pose.position, pose.rotation, c),
      posePolicy: 'roof-cap' as const,
    };
  });
}

/**
 * Right-triangle fin on desk: leg (M) mates floor ±X edge (which runs along Z).
 * Local legs +X/+Z; use the Z-parallel leg (x=-leg/3) whose mid is (-leg/3, 0, leg/6).
 */
function rightFinOnFloorX(
  floor: BuildStep,
  side: '+x' | '-x',
  c: RightColor,
): BuildStep {
  const leg = 1.0;
  const [fx, , fz] = floor.position;
  if (side === '+x') {
    // mid_local + pos = (0.5, 0, 0) → pos = (0.5 + leg/3, 0, -leg/6); tip outward +X
    return right([fx + 0.5 + leg / 3, 0, fz - leg / 6], [0, 0, 0], c);
  }
  // yaw 180: mid_local → (leg/3, 0, -leg/6); want (-0.5,0,0)
  return right([fx - 0.5 - leg / 3, 0, fz + leg / 6], [0, 180, 0], c);
}

function cellWalls(
  cx: number,
  cz: number,
  wy: number,
  colors: [SqColor, SqColor, SqColor, SqColor] = ['blue', 'red', 'blue', 'red'],
  front: 'square' | 'window' = 'square',
): BuildStep[] {
  const frontTile =
    front === 'window'
      ? win([cx, wy, cz + 0.5], [90, 0, 0], 'blue')
      : sq([cx, wy, cz + 0.5], [90, 0, 0], colors[3]);
  return [
    sq([cx, wy, cz - 0.5], [-90, 0, 0], colors[0]),
    sq([cx - 0.5, wy, cz], [0, 0, 90], colors[1]),
    sq([cx + 0.5, wy, cz], [0, 0, -90], colors[2]),
    frontTile,
  ];
}

function work(id: string, swatch: [string, string], steps: BuildStep[]): BuildWork {
  const ordered = sortBuildSteps(steps);
  const issues = validateMagnetBuild(ordered);
  if (issues.length) {
    const msg = issues.map((i) => `#${i.index} ${i.reason}`).join('; ');
    throw new Error(`[magnet] work '${id}' invalid: ${msg}`);
  }
  return { id, swatch, steps: ordered };
}

/** Rocket — square body + large-triangle nose + right-triangle fins. */
export const WORK_ROCKET = work('rocket', ['#4ECDC4', '#F38181'], (() => {
  const floor = sq([0, 0, 0], [0, 0, 0], 'yellow');
  const upper = cellWalls(0, 0, 1.5, ['blue', 'red', 'red', 'blue']);
  return [
    floor,
    ...cellWalls(0, 0, 0.5, ['blue', 'red', 'red', 'blue']),
    ...upper,
    ...roofCap(0, 2, 0, 'orange'),
    rightFinOnFloorX(floor, '+x', 'green'),
    rightFinOnFloorX(floor, '-x', 'green'),
  ];
})());

/** Castle — windows + rect battlements. */
export const WORK_CASTLE = work('castle', ['#FFE66D', '#FF6B6B'], (() => {
  const floors = [
    sq([-0.5, 0, -0.5], [0, 0, 0], 'yellow'),
    sq([0.5, 0, -0.5], [0, 0, 0], 'yellow'),
    sq([-0.5, 0, 0.5], [0, 0, 0], 'yellow'),
    sq([0.5, 0, 0.5], [0, 0, 0], 'yellow'),
  ];
  const walls = [
    sq([-0.5, 0.5, -1.0], [-90, 0, 0], 'blue'),
    win([0.5, 0.5, -1.0], [-90, 0, 0], 'yellow'),
    sq([-1.0, 0.5, -0.5], [0, 0, 90], 'red'),
    win([-1.0, 0.5, 0.5], [0, 0, 90], 'blue'),
    sq([1.0, 0.5, -0.5], [0, 0, -90], 'red'),
    win([1.0, 0.5, 0.5], [0, 0, -90], 'blue'),
    sq([-0.5, 0.5, 1.0], [90, 0, 0], 'blue'),
    win([0.5, 0.5, 1.0], [90, 0, 0], 'yellow'),
  ];
  return [
    ...floors,
    ...walls,
    ...walls.map((w, i) => rectOnWallTop(w, i % 2 ? 'red' : 'blue')),
  ];
})());

/** Tower — shaft + window lookout + large roof. */
export const WORK_TOWER = work('tower', ['#95E1D3', '#FFE66D'], (() => {
  const lookout = cellWalls(0, 0, 1.5, ['blue', 'red', 'red', 'blue'], 'window');
  return [
    sq([0, 0, 0], [0, 0, 0], 'yellow'),
    ...cellWalls(0, 0, 0.5, ['blue', 'red', 'red', 'blue']),
    sq([0, 1.0, 0], [0, 0, 0], 'yellow'),
    ...lookout,
    ...roofCap(0, 2, 0, 'orange'),
  ];
})());

/** Car — cabin + rect hood + window windshield + right spoiler. */
export const WORK_CAR = work('car', ['#FF6B6B', '#4ECDC4'], (() => {
  const cabin = sq([0, 0, 0], [0, 0, 0], 'yellow');
  const hood = rectBesideFloor(cabin, '-z', 'red');
  const windshield = win([0, 0.5, 0.5], [90, 0, 0], 'blue');
  return [
    cabin,
    hood,
    sq([0, 0.5, -0.5], [-90, 0, 0], 'blue'),
    sq([-0.5, 0.5, 0], [0, 0, 90], 'red'),
    sq([0.5, 0.5, 0], [0, 0, -90], 'red'),
    windshield,
    ...roofCap(0, 1, 0, 'orange'),
  ];
})());

/** Robot — torso + right-tri arms + window face + large hat. */
export const WORK_ROBOT = work('robot', ['#4ECDC4', '#FFE66D'], (() => {
  const floor = sq([0, 0, 0], [0, 0, 0], 'yellow');
  const head = cellWalls(0, 0, 1.5, ['blue', 'red', 'red', 'blue'], 'window');
  return [
    floor,
    sq([0, 0.5, -0.5], [-90, 0, 0], 'blue'),
    sq([-0.5, 0.5, 0], [0, 0, 90], 'red'),
    sq([0.5, 0.5, 0], [0, 0, -90], 'red'),
    sq([0, 0.5, 0.5], [90, 0, 0], 'blue'),
    sq([0, 1.0, 0], [0, 0, 0], 'yellow'),
    ...head,
    rightFinOnFloorX(floor, '-x', 'orange'),
    rightFinOnFloorX(floor, '+x', 'orange'),
    ...roofCap(0, 2, 0, 'green'),
  ];
})());

/**
 * Flower — hex and equilateral triangles, every edge 7.5 cm.
 */
export const WORK_FLOWER = work('flower', ['#F38181', '#95E1D3'], (() => {
  const center = hex([0, 0, 0], [0, 0, 0], 'green');
  const petals = [0, 1, 2, 3, 4, 5].map((i) =>
    petalOnHex(center, i, i % 2 === 0 ? 'orange' : 'green'),
  );
  const leaves = petals.map((p, i) =>
    leafOnPetalOuter(p, i % 2 === 0 ? 'green' : 'orange'),
  );
  return [center, ...petals, ...leaves];
})());

export const GALLERY_WORKS: BuildWork[] = [
  WORK_ROCKET,
  WORK_CASTLE,
  WORK_TOWER,
  WORK_CAR,
  WORK_ROBOT,
  WORK_FLOWER,
];

export const WORK_LABELS: Record<string, string> = {
  rocket: '箭',
  castle: '堡',
  tower: '塔',
  car: '车',
  robot: '机',
  flower: '花',
};
