import type { BuildStep } from './works';
import { edgesReallySnap, edgesSnap } from './magnet-physics';

/**
 * Per-layer face rank (lower = earlier):
 * floor → back → left → right → front → lid/roof
 */
export function faceBuildRank(step: BuildStep): number {
  const [rx, , rz] = step.rotation;
  const horizontal = Math.abs(rx) < 25 && Math.abs(rz) < 25;
  if (horizontal) {
    return step.position[1] <= 0.2 ? 0 : 5;
  }
  const x = step.position[0];
  const z = step.position[2];
  const ax = Math.abs(x);
  const az = Math.abs(z);
  if (az >= ax - 1e-6) return z < 0 ? 1 : 4;
  return x < 0 ? 2 : 3;
}

export function layerKey(step: BuildStep): number {
  return Math.round(step.position[1] * 4) / 4;
}

/** Prefer back-to-front within the same magnet-ready set. */
export function compareBuildOrder(a: BuildStep, b: BuildStep): number {
  const dLayer = layerKey(a) - layerKey(b);
  if (dLayer !== 0) return dLayer;
  const dFace = faceBuildRank(a) - faceBuildRank(b);
  if (dFace !== 0) return dFace;
  if (a.position[2] !== b.position[2]) return a.position[2] - b.position[2];
  return a.position[0] - b.position[0];
}

function deskDist2(s: BuildStep): number {
  const p = s.position;
  return p[0] * p[0] + p[2] * p[2];
}

function isDeskFloor(s: BuildStep): boolean {
  const [rx, , rz] = s.rotation;
  return Math.abs(rx) < 20 && Math.abs(rz) < 20 && Math.abs(s.position[1]) <= 0.2;
}

/**
 * Physics-first order: each next tile must be able to edge-snap onto some
 * already placed tile. Among candidates, prefer back → L/R → front.
 */
export function sortBuildSteps(steps: BuildStep[]): BuildStep[] {
  const remaining = steps.slice();
  const ordered: BuildStep[] = [];

  while (remaining.length) {
    let best = -1;
    for (let i = 0; i < remaining.length; i++) {
      const cand = remaining[i];
      if (ordered.length === 0) {
        if (!isDeskFloor(cand)) continue;
        if (
          best < 0 ||
          deskDist2(cand) < deskDist2(remaining[best]) - 1e-9 ||
          (Math.abs(deskDist2(cand) - deskDist2(remaining[best])) < 1e-9 &&
            compareBuildOrder(cand, remaining[best]) < 0)
        ) {
          best = i;
        }
        continue;
      }

      const snaps = ordered.some(
        (p) => edgesReallySnap(p, cand) || edgesSnap(p, cand),
      );
      if (!snaps) continue;
      if (best < 0 || compareBuildOrder(cand, remaining[best]) < 0) {
        best = i;
      }
    }

    if (best < 0) {
      // No legal candidate — keep deterministic fallback (validateMagnetBuild will fail)
      remaining.sort(compareBuildOrder);
      ordered.push(remaining.shift()!);
      continue;
    }
    ordered.push(remaining.splice(best, 1)[0]);
  }
  return ordered;
}
