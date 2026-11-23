/** Data-driven build works for the magnet-tile builder. */

export type TileModel = 'tile-square' | 'tile-triangle';

export type TileAssetId =
  | 'tile-square'
  | 'tile-triangle'
  | 'tile-square-red'
  | 'tile-square-blue'
  | 'tile-square-yellow'
  | 'tile-triangle-green'
  | 'tile-triangle-orange';

export interface BuildStep {
  model: TileModel;
  /** Colored asset to load for this step. */
  assetId: TileAssetId;
  position: [number, number, number];
  rotation: [number, number, number];
  hintColor: string;
}

export interface BuildWork {
  id: string;
  /** Two accent colors for the work switcher dots (no text). */
  swatch: [string, string];
  steps: BuildStep[];
}

/**
 * Work A (3 steps): two squares side-by-side + triangle roof.
 * Tile thickness ≈ 0.12 from generated GLB.
 */
export const WORK_HOUSE_ROOF: BuildWork = {
  id: 'roof',
  swatch: ['#FF6B6B', '#95E1D3'],
  steps: [
    {
      model: 'tile-square',
      assetId: 'tile-square-red',
      position: [-0.55, 0, 0],
      rotation: [0, 0, 0],
      hintColor: '#FF6B6B',
    },
    {
      model: 'tile-square',
      assetId: 'tile-square-blue',
      position: [0.55, 0, 0],
      rotation: [0, 0, 0],
      hintColor: '#4ECDC4',
    },
    {
      model: 'tile-triangle',
      assetId: 'tile-triangle-green',
      position: [0, 0.12, 0],
      rotation: [0, 0, 0],
      hintColor: '#95E1D3',
    },
  ],
};

/**
 * Work B (4 steps): foundation + two walls + roof.
 */
export const WORK_LITTLE_HOUSE: BuildWork = {
  id: 'house',
  swatch: ['#FFE66D', '#F38181'],
  steps: [
    {
      model: 'tile-square',
      assetId: 'tile-square-yellow',
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      hintColor: '#FFE66D',
    },
    {
      model: 'tile-square',
      assetId: 'tile-square-red',
      position: [-0.55, 0.12, 0],
      rotation: [0, 0, 0],
      hintColor: '#FF6B6B',
    },
    {
      model: 'tile-square',
      assetId: 'tile-square-blue',
      position: [0.55, 0.12, 0],
      rotation: [0, 0, 0],
      hintColor: '#4ECDC4',
    },
    {
      model: 'tile-triangle',
      assetId: 'tile-triangle-orange',
      position: [0, 0.24, 0],
      rotation: [0, 0, 0],
      hintColor: '#F38181',
    },
  ],
};

export const WORKS: BuildWork[] = [WORK_HOUSE_ROOF, WORK_LITTLE_HOUSE];

export const MAX_PRECREATED_TILES = 20;
export const SNAP_DISTANCE = 1.5;
export const BASE_DURATION = 2.0;
export const STEP_HOLD_MS = 1500;
export const FLY_DURATION = 1.2;
