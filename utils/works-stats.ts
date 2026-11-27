/**
 * Derive tileCount / shapeUsage from real BuildStep[] — never hand-maintain.
 */
import { MODEL_TO_SHAPE, type TileShapeId, type TileModel } from './tile-spec';

/** Minimal step shape for counting (avoids circular import with works.ts). */
export type StepLike = { model: string };

export type ShapeUsage = Partial<Record<TileShapeId, number>>;

export function shapeOfStep(step: StepLike): TileShapeId {
  return MODEL_TO_SHAPE[step.model as TileModel] ?? 'square';
}

export function computeShapeUsage(steps: StepLike[]): ShapeUsage {
  const out: ShapeUsage = {};
  for (const s of steps) {
    const sh = shapeOfStep(s);
    out[sh] = (out[sh] || 0) + 1;
  }
  return out;
}

export function computeTileCount(steps: StepLike[]): number {
  return steps.length;
}

/** Stable compact string for logs / QA. */
export function formatShapeUsage(usage: ShapeUsage): string {
  return (Object.keys(usage) as TileShapeId[])
    .sort()
    .map((k) => `${k}:${usage[k]}`)
    .join(',');
}
