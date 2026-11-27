/**
 * Pure inventory / plaza rules — no wx, safe for node tests.
 * "能拼" is strict: every required shape count <= merged stock.
 */
import { SHIPPED_SHAPES, type TileShapeId } from './tile-spec';
import type { ShapeUsage } from './works-stats';

export const SHAPE_LABEL: Record<TileShapeId, string> = {
  square: '方片',
  rectangle: '长方',
  triangle: '正三角',
  'right-triangle': '直角',
  'large-triangle': '大三角',
  hexagon: '六边',
  window: '窗片',
};

/** Completions at or above this count earn the 热门 badge. */
export const HOT_MIN_COMPLETIONS = 3;

export type StockCounts = Record<TileShapeId, number>;

export function emptyCounts(): StockCounts {
  const out = {} as StockCounts;
  for (const id of SHIPPED_SHAPES) out[id] = 0;
  return out;
}

export function clampCount(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(99, Math.floor(n)));
}

export function mergeCounts(parts: StockCounts[]): StockCounts {
  const out = emptyCounts();
  for (const part of parts) {
    for (const id of SHIPPED_SHAPES) {
      out[id] += clampCount(part[id] || 0);
    }
  }
  for (const id of SHIPPED_SHAPES) out[id] = Math.min(99, out[id]);
  return out;
}

/** Strict: missing shapes count as 0. Extra stock is fine. */
export function canBuild(usage: ShapeUsage, stock: StockCounts): boolean {
  for (const id of SHIPPED_SHAPES) {
    const need = usage[id] || 0;
    if (need > (stock[id] || 0)) return false;
  }
  return true;
}

export function isHot(completionCount: number): boolean {
  return completionCount >= HOT_MIN_COMPLETIONS;
}

export type PlazaSort = 'hot' | 'new' | 'tiles';

export interface PlazaQuery {
  keyword: string;
  form: 'all' | 'solid' | 'flat' | 'track';
  theme: string;
  sort: PlazaSort;
  onlyBuildable: boolean;
}

export interface PlazaCandidate {
  id: string;
  title: string;
  subtitle: string;
  tags: string[];
  form: string;
  themes: string[];
  sortOrder: number;
  tileCount: number;
  level: string;
  shapeUsage: ShapeUsage;
  swatch: [string, string];
  shortLabel: string;
}

export interface PlazaRow extends PlazaCandidate {
  completions: number;
  hot: boolean;
  buildable: boolean;
}

export function filterPlaza(
  items: PlazaCandidate[],
  query: PlazaQuery,
  stock: StockCounts,
  completions: Record<string, number>,
): PlazaRow[] {
  const kw = query.keyword.trim().toLowerCase();
  const rows: PlazaRow[] = [];
  for (const item of items) {
    if (query.form !== 'all' && item.form !== query.form) continue;
    if (query.theme !== 'all' && !item.themes.includes(query.theme)) continue;
    if (kw) {
      const hay = [item.title, item.subtitle, item.id, ...item.tags]
        .join(' ')
        .toLowerCase();
      if (!hay.includes(kw)) continue;
    }
    const buildable = canBuild(item.shapeUsage, stock);
    if (query.onlyBuildable && !buildable) continue;
    const n = completions[item.id] || 0;
    rows.push({ ...item, completions: n, hot: isHot(n), buildable });
  }
  rows.sort((a, b) => {
    if (query.sort === 'hot') {
      if (b.completions !== a.completions) return b.completions - a.completions;
      return a.sortOrder - b.sortOrder;
    }
    if (query.sort === 'tiles') {
      if (a.tileCount !== b.tileCount) return a.tileCount - b.tileCount;
      return a.sortOrder - b.sortOrder;
    }
    return b.sortOrder - a.sortOrder;
  });
  return rows;
}
