/**
 * MAG-001 — 7.5 cm magnetic tiles (Magna-Tiles / Connetix class).
 * World unit 1.0 = 7.5 cm. Only equal edge lengths snap.
 * Hypotenuse ~10.61 cm mates only another hypotenuse.
 */

/** Base modulus M (mm). */
export const M_MM = 75;

/** World units per mm (square edge → 1.0). */
export const UNITS_PER_MM = 1 / M_MM;

/** Logical square edge (= M) in world units. */
export const M = 1.0;

/** Half / double moduli. */
export const M_HALF = M * 0.5;
export const M2 = M * 2;

// —— Real magnet edge lengths (world) ——

/** Square / window outer edge. */
export const SQUARE_EDGE = M; // 75 mm

/** Rectangle: long = 2L (15 cm), short = L (7.5 cm). */
export const RECT_EDGE_LONG = M2;
export const RECT_EDGE_SHORT = M;

/** Equilateral triangle — all sides L (7.5 cm), height ~6.50 cm. Mates square and hex. */
export const TRIANGLE_EDGE_MM = M_MM;
export const TRIANGLE_EDGE = M;

/** Regular hexagon — side L, same as the equilateral triangle. */
export const HEX_SIDE = TRIANGLE_EDGE;

/**
 * Right triangle ~45°-45°-90°: legs = M (mate square / window / rect-long).
 * Brand listing ~98×75 mm is outer envelope; magnet legs use logical M.
 */
export const RIGHT_TRI_LEG = M;
export const RIGHT_TRI_HYP = M * Math.SQRT2;

/**
 * Large isosceles triangle: base = M (mates square), height ≈ 137 mm.
 */
export const LARGE_TRI_BASE = M;
export const LARGE_TRI_HEIGHT_MM = 137;
export const LARGE_TRI_HEIGHT = LARGE_TRI_HEIGHT_MM * UNITS_PER_MM;
export const LARGE_TRI_SIDE = Math.hypot(LARGE_TRI_BASE / 2, LARGE_TRI_HEIGHT);

/** Derived centroids / apothems. */
export const TRI_CENTROID_TO_BASE = (TRIANGLE_EDGE * Math.sqrt(3)) / 6;
export const TRI_HEIGHT = (TRIANGLE_EDGE * Math.sqrt(3)) / 2;
export const LARGE_CENTROID_TO_BASE = LARGE_TRI_HEIGHT / 3;
export const HEX_APOTHEM = (HEX_SIDE * Math.sqrt(3)) / 2;

/** Snap tolerances (doc §5 / §7) → world units. */
export const EPS_EDGE_LEN = 2 * UNITS_PER_MM; // ≤2 mm
export const EPS_EDGE_MID = 8 * UNITS_PER_MM; // ~8 mm adsorb band
export const EPS_EDGE_ALIGN = 0.92; // ~cos 23°; strict path uses 0.95

/** Back-compat aliases. */
export const REAL_SQUARE_CM = M_MM / 10;
export const RIGHT_TRI_LEG_A = RIGHT_TRI_LEG;
export const RIGHT_TRI_LEG_B = RIGHT_TRI_LEG;

export type TileShapeId =
  | 'square'
  | 'rectangle'
  | 'triangle'
  | 'right-triangle'
  | 'large-triangle'
  | 'hexagon'
  | 'window';

export const SHIPPED_SHAPES: TileShapeId[] = [
  'square',
  'rectangle',
  'triangle',
  'right-triangle',
  'large-triangle',
  'hexagon',
  'window',
];

export type TileModel =
  | 'tile-square'
  | 'tile-triangle'
  | 'tile-rect'
  | 'tile-right'
  | 'tile-large'
  | 'tile-hex'
  | 'tile-window';

export const MODEL_TO_SHAPE: Record<TileModel, TileShapeId> = {
  'tile-square': 'square',
  'tile-triangle': 'triangle',
  'tile-rect': 'rectangle',
  'tile-right': 'right-triangle',
  'tile-large': 'large-triangle',
  'tile-hex': 'hexagon',
  'tile-window': 'window',
};

/** Magnet edge lengths each shape exposes (for docs / UI). */
export function shapeEdgeLengths(shape: TileShapeId): number[] {
  switch (shape) {
    case 'square':
    case 'window':
      return [SQUARE_EDGE, SQUARE_EDGE, SQUARE_EDGE, SQUARE_EDGE];
    case 'rectangle':
      return [RECT_EDGE_LONG, RECT_EDGE_SHORT, RECT_EDGE_LONG, RECT_EDGE_SHORT];
    case 'triangle':
      return [TRIANGLE_EDGE, TRIANGLE_EDGE, TRIANGLE_EDGE];
    case 'right-triangle':
      return [RIGHT_TRI_LEG, RIGHT_TRI_LEG, RIGHT_TRI_HYP];
    case 'large-triangle':
      return [LARGE_TRI_BASE, LARGE_TRI_SIDE, LARGE_TRI_SIDE];
    case 'hexagon':
      return Array(6).fill(HEX_SIDE) as number[];
  }
}
