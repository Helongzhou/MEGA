/**
 * Work curation metadata (MAG works 2.0).
 * Linked to BuildWork by id. tileCount / shapeUsage are derived from steps.
 */
import type { ShapeUsage, StepLike } from './works-stats';
import { computeShapeUsage, computeTileCount } from './works-stats';

/** Minimal work shape to avoid circular import with works.ts. */
export type WorkLike = {
  id: string;
  swatch: [string, string];
  steps: StepLike[];
};

export type WorkLevel = 'L1' | 'L2' | 'L3' | 'L4';

export type WorkStatus =
  | 'planned' // roadmap only — no BuildWork yet
  | 'draft' // has steps; magnet may pass; visual/teaching not signed off
  | 'review' // awaiting visual + teaching review
  | 'accepted'; // magnet + visual + teaching signed off

export type VisualReviewState = 'pending' | 'pass' | 'fail' | 'n/a';

export type WorkCategory =
  | 'basics'
  | 'home'
  | 'vehicle'
  | 'nature'
  | 'character'
  | 'landmark'
  | 'structure';

/** Plaza morphology filter. `track` reserved — no work uses it yet. */
export type WorkForm = 'solid' | 'flat' | 'track';

/** Plaza theme chips. plant/character/vehicle extend the base taxonomy so current works are findable. */
export type WorkTheme =
  | 'animal'
  | 'building'
  | 'vegetable'
  | 'fruit'
  | 'appliance'
  | 'daily'
  | 'furniture'
  | 'plant'
  | 'character'
  | 'vehicle';

export interface WorkCatalogItem {
  id: string;
  slug: string;
  title: string;
  shortLabel: string;
  subtitle: string;
  level: WorkLevel;
  sortOrder: number;
  featured: boolean;
  category: WorkCategory;
  /** 立体 / 平面 / 轨道 */
  form: WorkForm;
  themes: WorkTheme[];
  tags: string[];
  learningGoals: string[];
  estimatedMinutes: number;
  recommendedAge: string;
  /** Filled when enriching from BuildWork.steps */
  shapeUsage: ShapeUsage;
  tileCount: number;
  designReference: string;
  visualReview: VisualReviewState;
  status: WorkStatus;
  swatch: [string, string];
}

/** Authored metadata without derived counts (counts come from steps). */
type CatalogSeed = Omit<WorkCatalogItem, 'shapeUsage' | 'tileCount'> & {
  shapeUsage?: ShapeUsage;
  tileCount?: number;
};

/**
 * Existing 8 works — status draft until visual+teaching sign-off.
 * None are `accepted` yet (auto magnet ≠ visual quality).
 * sortOrder follows play curve: L1 cube/flower → L2 house/car → L3 rocket/robot/tower → L4 castle
 * (tent/bridge insert when BuildWork ships; see WORK_ROADMAP).
 */
const SEEDS: CatalogSeed[] = [
  {
    id: 'cube',
    slug: 'cube',
    title: '方块',
    shortLabel: '方',
    subtitle: '六面盒子 · 认识墙与盖',
    level: 'L1',
    sortOrder: 10,
    featured: true,
    category: 'basics',
    form: 'solid',
    themes: ['daily'],
    tags: ['入门', '正方体', '直角'],
    learningGoals: ['正方形边对边', '90° 立面', '封闭六面体'],
    estimatedMinutes: 2,
    recommendedAge: '3+',
    designReference: 'works-design/cube.md',
    visualReview: 'pending',
    status: 'draft',
    swatch: ['#4ECDC4', '#FFE66D'],
  },
  {
    id: 'flower',
    slug: 'flower',
    title: '小花',
    shortLabel: '花',
    subtitle: '六边花心 · 等边花瓣',
    level: 'L1',
    sortOrder: 20,
    featured: true,
    category: 'nature',
    form: 'flat',
    themes: ['plant'],
    tags: ['六边形', '正三角', '平面'],
    learningGoals: ['等边三角对边', '六边环对称', '正三角 60°'],
    estimatedMinutes: 2,
    recommendedAge: '3+',
    designReference: 'works-design/flower.md',
    visualReview: 'pending',
    status: 'draft',
    swatch: ['#F38181', '#95E1D3'],
  },
  {
    id: 'house',
    slug: 'house',
    title: '小房子',
    shortLabel: '房',
    subtitle: '双坡完成 · Gate1 待人审三视图',
    level: 'L2',
    sortOrder: 30,
    featured: true,
    category: 'home',
    form: 'solid',
    themes: ['building'],
    tags: ['房屋', '窗户', '屋顶'],
    learningGoals: ['窗片外框同方', '坡屋顶边匹配'],
    estimatedMinutes: 3,
    recommendedAge: '4+',
    designReference: 'works-design/house.md',
    // Remains fail until human visual sign-off (do not auto-accept)
    visualReview: 'fail',
    status: 'draft',
    swatch: ['#FFE66D', '#F38181'],
  },
  {
    id: 'car',
    slug: 'car',
    title: '小汽车',
    shortLabel: '车',
    subtitle: 'Gate3 大改 · 水平车身轮廓',
    level: 'L2',
    sortOrder: 40,
    featured: false,
    category: 'vehicle',
    form: 'solid',
    themes: ['daily', 'vehicle'],
    tags: ['交通', '长方形'],
    learningGoals: ['长边拼接', '前后层次'],
    estimatedMinutes: 3,
    recommendedAge: '4+',
    designReference: 'works-design/car.md',
    visualReview: 'pending',
    status: 'draft',
    swatch: ['#FF6B6B', '#4ECDC4'],
  },
  {
    id: 'rocket',
    slug: 'rocket',
    title: '火箭',
    shortLabel: '箭',
    subtitle: 'Gate3 大改 · 细长箭体+外翼',
    level: 'L3',
    sortOrder: 50,
    featured: true,
    category: 'vehicle',
    form: 'solid',
    themes: ['vehicle'],
    tags: ['竖向', '大三角', '直角三角'],
    learningGoals: ['大三角底贴墙顶', '直角腰贴地板边'],
    estimatedMinutes: 4,
    recommendedAge: '5+',
    designReference: 'works-design/rocket.md',
    visualReview: 'pending',
    status: 'draft',
    swatch: ['#4ECDC4', '#F38181'],
  },
  {
    id: 'robot',
    slug: 'robot',
    title: '机器人',
    shortLabel: '机',
    subtitle: 'Gate3 大改 · 头身分肢对称',
    level: 'L3',
    sortOrder: 60,
    featured: false,
    category: 'character',
    form: 'solid',
    themes: ['character'],
    tags: ['角色', '对称'],
    learningGoals: ['左右对称', '窗作面部'],
    estimatedMinutes: 4,
    recommendedAge: '5+',
    status: 'draft',
    designReference: 'works-design/robot.md',
    visualReview: 'pending',
    swatch: ['#4ECDC4', '#FFE66D'],
  },
  {
    id: 'tower',
    slug: 'tower',
    title: '高塔',
    shortLabel: '塔',
    subtitle: 'Gate3 大改 · 分层收窄瞭望',
    level: 'L3',
    sortOrder: 70,
    featured: false,
    category: 'landmark',
    form: 'solid',
    themes: ['building'],
    tags: ['高层', '竖向稳定'],
    learningGoals: ['层间衔接', '窗瞭望'],
    estimatedMinutes: 4,
    recommendedAge: '5+',
    designReference: 'works-design/tower.md',
    visualReview: 'pending',
    status: 'draft',
    swatch: ['#95E1D3', '#FFE66D'],
  },
  {
    id: 'castle',
    slug: 'castle',
    title: '城堡',
    shortLabel: '堡',
    subtitle: 'Gate4 叙事升级 · 围合综合',
    level: 'L4',
    sortOrder: 80,
    featured: true,
    category: 'landmark',
    form: 'solid',
    themes: ['building'],
    tags: ['围合', '长方形垛口'],
    learningGoals: ['多地板拼接', '长方半高垛口'],
    estimatedMinutes: 5,
    recommendedAge: '5+',
    designReference: 'works-design/castle.md',
    visualReview: 'pending',
    status: 'draft',
    swatch: ['#FFE66D', '#FF6B6B'],
  },
];

/** Roadmap — no BuildWork yet; excluded from WORKS↔catalog 1:1. */
export const WORK_ROADMAP: Array<{
  id: string;
  title: string;
  level: WorkLevel;
  targetTiles: string;
  note: string;
}> = [
  { id: 'tent', title: '小帐篷', level: 'L2', targetTiles: '8–10', note: 'Gate2 新增 · 棱柱/双坡' },
  { id: 'bridge', title: '小桥', level: 'L2', targetTiles: '10–14', note: 'Gate2 新增 · 桥墩+桥面横向' },
  {
    id: 'pyramid',
    title: '金字塔',
    level: 'L4',
    targetTiles: '12–16',
    note: 'Gate2 先预研 · 禁 71↔75 · 同族闭合',
  },
  {
    id: 'animal',
    title: '小鱼',
    level: 'L3',
    targetTiles: '10–14',
    note: 'Gate3 降级精简 · 剪影+鳍',
  },
  {
    id: 'dome',
    title: '六边形穹顶',
    level: 'L4',
    targetTiles: '18–24',
    note: '延后 · 71 环收敛 · 顶格片数风险',
  },
];

export function enrichCatalogItem(
  seed: CatalogSeed,
  work: WorkLike | undefined,
): WorkCatalogItem {
  const steps = work?.steps || [];
  return {
    ...seed,
    swatch: work?.swatch || seed.swatch,
    tileCount: computeTileCount(steps),
    shapeUsage: computeShapeUsage(steps),
  };
}

export function buildWorkCatalog(works: WorkLike[]): WorkCatalogItem[] {
  const byId = new Map(works.map((w) => [w.id, w]));
  return SEEDS.map((s) => enrichCatalogItem(s, byId.get(s.id))).sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );
}

/** Seeds only (for validate / docs). */
export function listCatalogSeeds(): CatalogSeed[] {
  return SEEDS.slice();
}

export function catalogLabelsFromSeeds(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const s of SEEDS) out[s.id] = s.shortLabel;
  return out;
}

export function catalogTitlesFromSeeds(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const s of SEEDS) out[s.id] = s.title;
  return out;
}
