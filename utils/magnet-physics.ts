/**
 * MAG-002 — Edge-magnet connection rules.
 * Laws: equal edge length · reverse co-edge · mid within adsorb band.
 * Dihedral fold / polarity profiles are future (brand_default stub).
 */
import {
  EPS_EDGE_ALIGN,
  EPS_EDGE_LEN,
  EPS_EDGE_MID,
  HEX_APOTHEM,
  HEX_SIDE,
  LARGE_CENTROID_TO_BASE,
  LARGE_TRI_BASE,
  LARGE_TRI_HEIGHT,
  MODEL_TO_SHAPE,
  RECT_EDGE_LONG,
  RECT_EDGE_SHORT,
  RIGHT_TRI_LEG,
  SQUARE_EDGE,
  TRIANGLE_EDGE,
  TRI_CENTROID_TO_BASE,
  type TileModel,
} from './tile-spec';
import type { BuildStep, Vec3Tuple } from './works';

export {
  SQUARE_EDGE,
  TRIANGLE_EDGE,
  TRI_CENTROID_TO_BASE,
  HEX_SIDE,
  HEX_APOTHEM,
  LARGE_TRI_BASE,
  LARGE_TRI_HEIGHT,
  LARGE_CENTROID_TO_BASE,
  RECT_EDGE_LONG,
  RECT_EDGE_SHORT,
  RIGHT_TRI_LEG,
};

const EPS = 0.12;

export type Edge3 = { a: Vec3Tuple; b: Vec3Tuple };

function almost(a: number, b: number, eps = EPS): boolean {
  return Math.abs(a - b) <= eps;
}

function almostVec(a: Vec3Tuple, b: Vec3Tuple, eps = EPS): boolean {
  return almost(a[0], b[0], eps) && almost(a[1], b[1], eps) && almost(a[2], b[2], eps);
}

function isHorizontal(rot: Vec3Tuple): boolean {
  return Math.abs(rot[0]) < 20 && Math.abs(rot[2]) < 20;
}

function isWall(rot: Vec3Tuple): boolean {
  return !isHorizontal(rot);
}

function len3(v: Vec3Tuple): number {
  return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
}

function len3Safe(v: Vec3Tuple): number {
  return len3(v) || 1;
}

function sub3(a: Vec3Tuple, b: Vec3Tuple): Vec3Tuple {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function add3(a: Vec3Tuple, b: Vec3Tuple): Vec3Tuple {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function scale3(v: Vec3Tuple, s: number): Vec3Tuple {
  return [v[0] * s, v[1] * s, v[2] * s];
}

function dot3(a: Vec3Tuple, b: Vec3Tuple): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function mid3(e: Edge3): Vec3Tuple {
  return [(e.a[0] + e.b[0]) * 0.5, (e.a[1] + e.b[1]) * 0.5, (e.a[2] + e.b[2]) * 0.5];
}

/** Apply XYZ Euler degrees to a local point (matches authored tile poses). */
export function rotateEulerDeg(p: Vec3Tuple, rotDeg: Vec3Tuple): Vec3Tuple {
  const rx = (rotDeg[0] * Math.PI) / 180;
  const ry = (rotDeg[1] * Math.PI) / 180;
  const rz = (rotDeg[2] * Math.PI) / 180;
  let x = p[0];
  let y = p[1];
  let z = p[2];
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
  return [x, y, z];
}

function localSquareVerts(edge = SQUARE_EDGE): Vec3Tuple[] {
  const h = edge / 2;
  return [
    [-h, 0, -h],
    [h, 0, -h],
    [h, 0, h],
    [-h, 0, h],
  ];
}

function localRectVerts(
  longEdge = RECT_EDGE_LONG,
  shortEdge = RECT_EDGE_SHORT,
): Vec3Tuple[] {
  const hx = longEdge / 2;
  const hz = shortEdge / 2;
  return [
    [-hx, 0, -hz],
    [hx, 0, -hz],
    [hx, 0, hz],
    [-hx, 0, hz],
  ];
}

function localTriangleVerts(edge = TRIANGLE_EDGE): Vec3Tuple[] {
  const h = (edge * Math.sqrt(3)) / 2;
  return [
    [0, 0, (2 * h) / 3],
    [-edge / 2, 0, -h / 3],
    [edge / 2, 0, -h / 3],
  ];
}

/** Isosceles right: legs along +X/+Z from right-angle corner, centroid origin. */
function localRightVerts(leg = RIGHT_TRI_LEG): Vec3Tuple[] {
  const cx = leg / 3;
  const cz = leg / 3;
  return [
    [-cx, 0, -cz],
    [leg - cx, 0, -cz],
    [-cx, 0, leg - cz],
  ];
}

function localLargeVerts(
  base = LARGE_TRI_BASE,
  height = LARGE_TRI_HEIGHT,
): Vec3Tuple[] {
  const cz = height / 3;
  return [
    [-base / 2, 0, -cz],
    [base / 2, 0, -cz],
    [0, 0, height - cz],
  ];
}

function localHexVerts(side = HEX_SIDE): Vec3Tuple[] {
  const out: Vec3Tuple[] = [];
  for (let i = 0; i < 6; i++) {
    const ang = Math.PI / 6 + (i * Math.PI) / 3;
    out.push([side * Math.cos(ang), 0, side * Math.sin(ang)]);
  }
  return out;
}

export function localVertsForModel(model: TileModel | string): Vec3Tuple[] {
  const shape = MODEL_TO_SHAPE[model as TileModel] ?? 'square';
  switch (shape) {
    case 'rectangle':
      return localRectVerts();
    case 'triangle':
      return localTriangleVerts();
    case 'right-triangle':
      return localRightVerts();
    case 'large-triangle':
      return localLargeVerts();
    case 'hexagon':
      return localHexVerts();
    case 'window':
    case 'square':
    default:
      return localSquareVerts();
  }
}

export function tileWorldEdges(step: BuildStep): Edge3[] {
  const local = localVertsForModel(step.model);
  const world = local.map((p) =>
    add3(rotateEulerDeg(p, step.rotation), step.position),
  );
  const edges: Edge3[] = [];
  for (let i = 0; i < world.length; i++) {
    edges.push({ a: world[i], b: world[(i + 1) % world.length] });
  }
  return edges;
}

export interface EdgeMatch {
  prevIndex: number;
  distMid: number;
  align: number;
  lenA: number;
  lenB: number;
  lenDelta: number;
}

export function bestEdgeMatch(prev: BuildStep, next: BuildStep): EdgeMatch | null {
  const ea = tileWorldEdges(prev);
  const eb = tileWorldEdges(next);
  let best: EdgeMatch | null = null;
  for (let i = 0; i < ea.length; i++) {
    for (let j = 0; j < eb.length; j++) {
      const A = ea[i];
      const B = eb[j];
      const da = sub3(A.b, A.a);
      const db = sub3(B.b, B.a);
      const la = len3Safe(da);
      const lb = len3Safe(db);
      const align = Math.abs(dot3(scale3(da, 1 / la), scale3(db, 1 / lb)));
      const distMid = len3(sub3(mid3(A), mid3(B)));
      const lenDelta = Math.abs(la - lb);
      const score = distMid + (1 - align) * 0.5 + lenDelta * 0.25;
      const cur = best
        ? best.distMid + (1 - best.align) * 0.5 + best.lenDelta * 0.25
        : Infinity;
      if (score < cur) {
        best = {
          prevIndex: -1,
          distMid,
          align,
          lenA: la,
          lenB: lb,
          lenDelta,
        };
      }
    }
  }
  return best;
}

/** Strict co-edge: mid, parallel, equal length (MAG-002). */
export function edgesReallySnap(prev: BuildStep, next: BuildStep): boolean {
  const m = bestEdgeMatch(prev, next);
  if (!m) return false;
  return (
    m.distMid <= Math.max(0.1, EPS_EDGE_MID) &&
    m.align >= EPS_EDGE_ALIGN &&
    m.lenDelta <= Math.max(0.08, EPS_EDGE_LEN)
  );
}

function wallOutward(rot: Vec3Tuple): Vec3Tuple | null {
  const [rx, , rz] = rot;
  if (Math.abs(rx - 90) < 20) return [0, 0, 1];
  if (Math.abs(rx + 90) < 20) return [0, 0, -1];
  if (Math.abs(rz - 90) < 20) return [-1, 0, 0];
  if (Math.abs(rz + 90) < 20) return [1, 0, 0];
  return null;
}

/** Square-cell M-grid models only — never apply to 71mm triangle/hex (false neighbors ≈0.95). */
function isSquareGridModel(model: string): boolean {
  return (
    model === 'tile-square' ||
    model === 'tile-window' ||
    model === 'tile-rect'
  );
}

/** Heuristic fallback for topo sort (square-cell layouts). */
export function edgesSnap(prev: BuildStep, next: BuildStep): boolean {
  if (edgesReallySnap(prev, next)) return true;

  const a = prev.position;
  const b = next.position;
  const ar = prev.rotation;
  const br = next.rotation;

  // M=1 desk grid: squares/windows/rects only. Flower 71mm rings sit ~0.95 apart on-axis
  // and must NOT be treated as grid neighbors (would place leaves before their petals).
  if (
    isSquareGridModel(prev.model) &&
    isSquareGridModel(next.model) &&
    isHorizontal(ar) &&
    isHorizontal(br) &&
    almost(a[1], 0) &&
    almost(b[1], 0)
  ) {
    const dx = Math.abs(a[0] - b[0]);
    const dz = Math.abs(a[2] - b[2]);
    if (almost(dx, 1) && almost(dz, 0)) return true;
    if (almost(dz, 1) && almost(dx, 0)) return true;
  }

  if (isHorizontal(ar) && isWall(br)) {
    const out = wallOutward(br);
    if (out) {
      const expect: Vec3Tuple = [a[0] + out[0] * 0.5, a[1] + 0.5, a[2] + out[2] * 0.5];
      if (almostVec(b, expect)) return true;
    }
  }

  if (isWall(ar) && isWall(br) && almostVec(ar, br, 15)) {
    if (almost(a[0], b[0]) && almost(a[2], b[2]) && almost(b[1], a[1] + 1)) {
      return true;
    }
  }

  if (isWall(ar) && isWall(br) && almost(a[1], b[1])) {
    const oa = wallOutward(ar);
    const ob = wallOutward(br);
    if (oa && ob) {
      const d = oa[0] * ob[0] + oa[2] * ob[2];
      if (almost(d, 0, 0.2)) {
        const dist = Math.hypot(a[0] - b[0], a[2] - b[2]);
        if (dist > 0.45 && dist < 1.05) return true;
      }
    }
  }

  if (isWall(ar) && isHorizontal(br)) {
    const out = wallOutward(ar);
    if (out && almost(b[1], a[1] + 0.5)) {
      const cell: Vec3Tuple = [a[0] - out[0] * 0.5, b[1], a[2] - out[2] * 0.5];
      if (almostVec(b, cell)) return true;
    }
  }

  return false;
}

export interface MagnetIssue {
  index: number;
  step: BuildStep;
  reason: string;
}

export interface EdgeAudit {
  index: number;
  model: string;
  heuristicOk: boolean;
  realOk: boolean;
  best: EdgeMatch | null;
  partner: number;
}

export function auditMagnetEdges(steps: BuildStep[]): EdgeAudit[] {
  const out: EdgeAudit[] = [];
  for (let i = 1; i < steps.length; i++) {
    const next = steps[i];
    let heuristicOk = false;
    let realOk = false;
    let best: EdgeMatch | null = null;
    let partner = -1;
    for (let j = 0; j < i; j++) {
      if (edgesSnap(steps[j], next)) heuristicOk = true;
      const m = bestEdgeMatch(steps[j], next);
      if (m) {
        const score = m.distMid + (1 - m.align) * 0.5 + m.lenDelta * 0.25;
        const cur = best
          ? best.distMid + (1 - best.align) * 0.5 + best.lenDelta * 0.25
          : Infinity;
        if (score < cur) {
          best = { ...m, prevIndex: j };
          partner = j;
        }
      }
      if (edgesReallySnap(steps[j], next)) realOk = true;
    }
    out.push({
      index: i,
      model: next.model,
      heuristicOk,
      realOk,
      best,
      partner,
    });
  }
  return out;
}

/**
 * Cardinal rx/rz check (tight ±10°). House dual-slope roofs (~15.9° off vertical)
 * must opt out via posePolicy:'roof-cap' (equilateral roof triangles only).
 * Edge-length / co-edge laws are never waived.
 */
export const CARDINAL_POSE_EPS_DEG = 10;

export function isCardinalPose(rot: Vec3Tuple): boolean {
  const [rx, , rz] = rot;
  const e = CARDINAL_POSE_EPS_DEG;
  const rxOk = almost(rx, 0, e) || almost(rx, 90, e) || almost(rx, -90, e);
  const rzOk = almost(rz, 0, e) || almost(rz, 90, e) || almost(rz, -90, e);
  return rxOk && rzOk;
}

function allowsNonCardinalPose(step: BuildStep): boolean {
  return step.posePolicy === 'roof-cap' && step.model === 'tile-triangle';
}

export function validateMagnetBuild(steps: BuildStep[]): MagnetIssue[] {
  const issues: MagnetIssue[] = [];
  if (!steps.length) return issues;

  const first = steps[0];
  if (!(isHorizontal(first.rotation) && almost(first.position[1], 0))) {
    issues.push({
      index: 0,
      step: first,
      reason: 'first tile must lie flat on the desk',
    });
  }

  for (let i = 1; i < steps.length; i++) {
    const next = steps[i];
    if (!allowsNonCardinalPose(next) && !isCardinalPose(next.rotation)) {
      issues.push({
        index: i,
        step: next,
        reason: `unstable tilt rot=[${next.rotation}] — use 0/±90° edge snaps only`,
      });
      continue;
    }
    if (next.posePolicy === 'roof-cap' && next.model !== 'tile-triangle') {
      issues.push({
        index: i,
        step: next,
        reason: `posePolicy roof-cap is only valid on tile-triangle (got ${next.model})`,
      });
      continue;
    }

    let ok = false;
    let best: EdgeMatch | null = null;
    for (let j = 0; j < i; j++) {
      if (edgesReallySnap(steps[j], next)) ok = true;
      const m = bestEdgeMatch(steps[j], next);
      if (
        m &&
        (!best ||
          m.distMid + (1 - m.align) * 0.5 + m.lenDelta * 0.25 <
            best.distMid + (1 - best.align) * 0.5 + best.lenDelta * 0.25)
      ) {
        best = { ...m, prevIndex: j };
      }
    }
    if (!ok) {
      issues.push({
        index: i,
        step: next,
        reason: `no co-edge magnet (best mid=${best?.distMid?.toFixed(3)} lenΔ=${best?.lenDelta?.toFixed(3)}) at [${next.position}]`,
      });
    }
  }
  return issues;
}
