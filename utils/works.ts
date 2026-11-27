/** Data-driven build works for the magnet-tile builder. */

import { sortBuildSteps } from './build-order';
import { pyramidCapPose, type CapSide } from './pyramid-cap';
import type { TileModel } from './tile-spec';
import {
  buildWorkCatalog,
  catalogLabelsFromSeeds,
  catalogTitlesFromSeeds,
  WORK_ROADMAP,
} from './works-catalog';
import { GALLERY_WORKS } from './works-gallery';

export {
  buildWorkCatalog,
  WORK_ROADMAP,
  type WorkCatalogItem,
  type WorkLevel,
  type WorkStatus,
} from './works-catalog';
export { computeShapeUsage, computeTileCount } from './works-stats';

export type { TileModel } from './tile-spec';

export type TileAssetId =
  | 'tile-square'
  | 'tile-triangle'
  | 'tile-rect'
  | 'tile-right'
  | 'tile-large'
  | 'tile-hex'
  | 'tile-window'
  | 'tile-square-red'
  | 'tile-square-blue'
  | 'tile-square-yellow'
  | 'tile-triangle-green'
  | 'tile-triangle-orange'
  | 'tile-rect-blue'
  | 'tile-rect-red'
  | 'tile-right-green'
  | 'tile-right-orange'
  | 'tile-large-yellow'
  | 'tile-large-orange'
  | 'tile-hex-green'
  | 'tile-hex-blue'
  | 'tile-window-blue'
  | 'tile-window-yellow';

export type Vec3Tuple = [number, number, number];

/**
 * Pose stability policy for validateMagnetBuild.
 * - cardinal (default): rx/rz ∈ {0, ±90}
 * - roof-cap: equilateral triangles on a square pyramid roof
 */
export type PosePolicy = 'cardinal' | 'roof-cap';

/** Optional authored camera hint (unused at runtime — occlusion rescue only). */
export interface StepCamera {
  position: Vec3Tuple;
  target: Vec3Tuple;
}

export interface BuildStep {
  model: TileModel;
  /** Colored asset to load for this step. */
  assetId: TileAssetId;
  /** Final settled pose (degrees for rotation). */
  position: Vec3Tuple;
  rotation: Vec3Tuple;
  hintColor: string;
  flyFrom?: Vec3Tuple;
  flyFromRotation?: Vec3Tuple;
  startPosition?: Vec3Tuple;
  startRotation?: Vec3Tuple;
  camera?: StepCamera;
  /**
   * Optional local pose exception. Default cardinal.
   * Only equilateral roof caps may set `roof-cap`.
   */
  posePolicy?: PosePolicy;
}

export interface BuildWork {
  id: string;
  /** Two accent colors for the work switcher dots (no text). */
  swatch: [string, string];
  steps: BuildStep[];
}

export {
  compareBuildOrder,
  faceBuildRank,
  layerKey,
  sortBuildSteps,
} from './build-order';

/** Default tray origin (bottom of view, toward camera). */
export const TRAY_FLY_FROM: Vec3Tuple = [0, 0.2, 4.0];

function near(pos: Vec3Tuple, offset: Vec3Tuple): Vec3Tuple {
  return [pos[0] + offset[0], pos[1] + offset[1], pos[2] + offset[2]];
}

/**
 * Work 0 — cube.
 * Order: floor → back → left → right → front → lid (per-layer back-to-front).
 */
export const WORK_CUBE: BuildWork = {
  id: 'cube',
  swatch: ['#4ECDC4', '#FFE66D'],
  steps: sortBuildSteps([
    {
      model: 'tile-square',
      assetId: 'tile-square-yellow',
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      flyFrom: TRAY_FLY_FROM,
      startPosition: near([0, 0, 0], [0, 0.35, 0.15]),
      startRotation: [0, 0, 0],
      hintColor: '#FFE66D',
      camera: { position: [0, 3.2, 3.6], target: [0, 0.2, 0] },
    },
    {
      model: 'tile-square',
      assetId: 'tile-square-blue',
      position: [0, 0.5, -0.5],
      rotation: [-90, 0, 0],
      flyFrom: [0, 0.3, -3.6],
      startPosition: near([0, 0.5, -0.5], [0, 0.15, -0.45]),
      startRotation: [-90, 0, 0],
      hintColor: '#4ECDC4',
      camera: { position: [0, 1.6, -4.2], target: [0, 0.5, -0.5] },
    },
    {
      model: 'tile-square',
      assetId: 'tile-square-red',
      position: [-0.5, 0.5, 0],
      rotation: [0, 0, 90],
      flyFrom: [-3.6, 0.3, 0],
      startPosition: near([-0.5, 0.5, 0], [-0.45, 0.15, 0]),
      startRotation: [0, 0, 90],
      hintColor: '#FF6B6B',
      camera: { position: [-4.2, 1.6, 0], target: [-0.5, 0.5, 0] },
    },
    {
      model: 'tile-square',
      assetId: 'tile-square-blue',
      position: [0.5, 0.5, 0],
      rotation: [0, 0, -90],
      flyFrom: [3.6, 0.3, 0],
      startPosition: near([0.5, 0.5, 0], [0.45, 0.15, 0]),
      startRotation: [0, 0, -90],
      hintColor: '#4ECDC4',
      camera: { position: [4.2, 1.6, 0], target: [0.5, 0.5, 0] },
    },
    {
      model: 'tile-square',
      assetId: 'tile-square-red',
      position: [0, 0.5, 0.5],
      rotation: [90, 0, 0],
      flyFrom: [0, 0.3, 3.6],
      startPosition: near([0, 0.5, 0.5], [0, 0.15, 0.45]),
      startRotation: [90, 0, 0],
      hintColor: '#FF6B6B',
      camera: { position: [0, 1.6, 4.2], target: [0, 0.5, 0.5] },
    },
    {
      model: 'tile-square',
      assetId: 'tile-square-yellow',
      position: [0, 1.0, 0],
      rotation: [0, 0, 0],
      flyFrom: [0, 3.2, 0.4],
      startPosition: near([0, 1.0, 0], [0, 0.55, 0.1]),
      startRotation: [0, 0, 0],
      hintColor: '#FFE66D',
      camera: { position: [1.2, 3.4, 3.2], target: [0, 1.0, 0] },
    },
  ]),
};

const HOUSE_CAP_SIDES: CapSide[] = ['back', 'left', 'right', 'front'];
const HOUSE_CAP_ASSETS = [
  'tile-triangle-green',
  'tile-triangle-orange',
  'tile-triangle-green',
  'tile-triangle-orange',
] as const;
const HOUSE_CAP_HINTS = ['#95E1D3', '#F38181', '#95E1D3', '#F38181'] as const;

/** Work 1 — little house. Four equilateral triangles close the roof. */
export const WORK_LITTLE_HOUSE: BuildWork = {
  id: 'house',
  swatch: ['#FFE66D', '#F38181'],
  steps: sortBuildSteps([
    {
      model: 'tile-square',
      assetId: 'tile-square-yellow',
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      flyFrom: TRAY_FLY_FROM,
      startPosition: near([0, 0, 0], [0, 0.35, 0.15]),
      startRotation: [0, 0, 0],
      hintColor: '#FFE66D',
      camera: { position: [0, 3.0, 3.8], target: [0, 0.2, 0] },
    },
    {
      model: 'tile-square',
      assetId: 'tile-square-blue',
      position: [0, 0.5, -0.5],
      rotation: [-90, 0, 0],
      flyFrom: [0, 0.3, -3.6],
      startPosition: near([0, 0.5, -0.5], [0, 0.15, -0.45]),
      startRotation: [-90, 0, 0],
      hintColor: '#4ECDC4',
      camera: { position: [0, 1.5, -4.0], target: [0, 0.5, -0.5] },
    },
    {
      model: 'tile-square',
      assetId: 'tile-square-red',
      position: [-0.5, 0.5, 0],
      rotation: [0, 0, 90],
      flyFrom: [-3.6, 0.3, 0],
      startPosition: near([-0.5, 0.5, 0], [-0.45, 0.15, 0]),
      startRotation: [0, 0, 90],
      hintColor: '#FF6B6B',
      camera: { position: [-4.0, 1.5, 0], target: [-0.5, 0.5, 0] },
    },
    {
      model: 'tile-square',
      assetId: 'tile-square-blue',
      position: [0.5, 0.5, 0],
      rotation: [0, 0, -90],
      flyFrom: [3.6, 0.3, 0],
      startPosition: near([0.5, 0.5, 0], [0.45, 0.15, 0]),
      startRotation: [0, 0, -90],
      hintColor: '#4ECDC4',
      camera: { position: [4.0, 1.5, 0], target: [0.5, 0.5, 0] },
    },
    {
      // Front window (口-shape, same outer magnets as square)
      model: 'tile-window',
      assetId: 'tile-window-blue',
      position: [0, 0.5, 0.5],
      rotation: [90, 0, 0],
      flyFrom: [0, 0.3, 3.6],
      startPosition: near([0, 0.5, 0.5], [0, 0.15, 0.45]),
      startRotation: [90, 0, 0],
      hintColor: '#4ECDC4',
      camera: { position: [0, 1.5, 4.0], target: [0, 0.5, 0.5] },
    },
    ...HOUSE_CAP_SIDES.map((side, i) => {
      const pose = pyramidCapPose(side, 0, 1, 0);
      return {
        model: 'tile-triangle' as const,
        assetId: HOUSE_CAP_ASSETS[i],
        position: pose.position,
        rotation: pose.rotation,
        posePolicy: 'roof-cap' as const,
        flyFrom: [0, 2.4, 2.2] as [number, number, number],
        startPosition: near(pose.position, [0, 0.3, 0.2]),
        startRotation: pose.rotation,
        hintColor: HOUSE_CAP_HINTS[i],
        camera: { position: [0, 2.8, 4.2] as [number, number, number], target: [0, 1.6, 0] as [number, number, number] },
      };
    }),
  ]),
};

/** Compact one-glyph labels — derived from catalog seeds (single source). */
export const WORK_LABELS: Record<string, string> = catalogLabelsFromSeeds();

/** Child-facing full titles — derived from catalog seeds. */
export const WORK_TITLES: Record<string, string> = catalogTitlesFromSeeds();

/** Starters + competitor-inspired gallery. UI entry — do not bypass. */
export const WORKS: BuildWork[] = [WORK_CUBE, WORK_LITTLE_HOUSE, ...GALLERY_WORKS];

/** Enriched curation rows (tileCount/shapeUsage from real steps). */
export const WORK_CATALOG = buildWorkCatalog(WORKS);

/** Must cover the largest gallery build (castle ≈ 16). */
export const MAX_PRECREATED_TILES = 24;
export const SNAP_DISTANCE = 1.5;
export const BASE_DURATION = 1.65;
export const STEP_HOLD_MS = 520;
export const FLY_DURATION = 1.15;
export const SNAP_DURATION = 0.28;
export const SNAP_AT = 0.78;
