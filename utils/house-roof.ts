/**
 * House dual-slope roof (Phase 2) — exact geometry from MAG-001 large triangle.
 *
 * Layout: unit room (floor/walls M=1). Left/right eaves at x=±0.5, y=1, z∈[-0.5,0.5].
 * Each large triangle: base on one eave, apex shared at ridge (0, 1+rise, 0).
 *
 * rise = √(H² − (M/2)²), pitch = atan2(rise, M/2) from horizontal.
 * Pose: Ry=-90°, Rx = −90 ∓ α with α = 90° − pitch (inward from vertical).
 *
 * posePolicy 'house-roof' is required on these steps only — not a global tilt waiver.
 */
import { LARGE_TRI_HEIGHT, M } from './tile-spec';

type Vec3Tuple = [number, number, number];

const HALF = M / 2;

/** Vertical rise from eave plane (y=1) to shared ridge apex. */
export const HOUSE_ROOF_RISE = Math.sqrt(
  LARGE_TRI_HEIGHT * LARGE_TRI_HEIGHT - HALF * HALF,
);

/** Roof plane inclination from horizontal (degrees). */
export const HOUSE_ROOF_PITCH_DEG =
  (Math.atan2(HOUSE_ROOF_RISE, HALF) * 180) / Math.PI;

/** Inward tilt from vertical (degrees). */
export const HOUSE_ROOF_FROM_VERTICAL_DEG = 90 - HOUSE_ROOF_PITCH_DEG;

/** Shared ridge apex (world). */
export const HOUSE_RIDGE_APEX: Vec3Tuple = [0, 1 + HOUSE_ROOF_RISE, 0];

export type HouseRoofSide = 'left' | 'right';

/** Eave segment for a side (world endpoints, length M). */
export function houseEave(side: HouseRoofSide): { a: Vec3Tuple; b: Vec3Tuple } {
  if (side === 'left') {
    return { a: [-HALF, 1, -HALF], b: [-HALF, 1, HALF] };
  }
  return { a: [HALF, 1, -HALF], b: [HALF, 1, HALF] };
}

/**
 * Authored pose for one dual-slope large triangle.
 * Centroid: x = ∓M/3, y = 1 + rise/3, z = 0 (matches magnet-physics local verts).
 */
export function houseRoofPose(side: HouseRoofSide): {
  position: Vec3Tuple;
  rotation: Vec3Tuple;
} {
  const alpha = HOUSE_ROOF_FROM_VERTICAL_DEG;
  const rx = side === 'left' ? -90 - alpha : -90 + alpha;
  const x = side === 'left' ? -M / 3 : M / 3;
  return {
    position: [x, 1 + HOUSE_ROOF_RISE / 3, 0],
    rotation: [rx, -90, 0],
  };
}

/** World triangle verts in local-large order: base back → base front → apex. */
export function houseRoofWorldVerts(
  side: HouseRoofSide,
): [Vec3Tuple, Vec3Tuple, Vec3Tuple] {
  const e = houseEave(side);
  return [e.a, e.b, [HOUSE_RIDGE_APEX[0], HOUSE_RIDGE_APEX[1], HOUSE_RIDGE_APEX[2]]];
}
