# 作品集 2.0 · Phase 1 审查报告

## 基线（自动）

`node scripts/validate_gallery.mjs`：house/rocket/castle/tower/car/robot/flower 几何 OK；cube 在 works.ts（脚本未全覆盖）。  
GLB：22 个。`validateMagnetBuild` 规则仍强制真实共边。

## 可复用

| 模块 | 说明 |
|------|------|
| `BuildStep` / `BuildWork` | 不可推翻 |
| `sortBuildSteps` / `validateMagnetBuild` | 保留 |
| gallery helpers | `cellWalls`, `petalOnHex`, `largeOnWallTop`, `rectOnWallTop`, `rectBesideFloor`, `rightFinOnFloorX`, `work()` |
| `MODEL_TO_SHAPE` / tile-spec | 双几何边长 |
| `WORK_LABELS` / `WORK_TITLES` | 将改为由 Catalog 派生 |

## 现存问题

1. house 屋顶单片大三角，非双坡。  
2. 题材同质（竖井+三角顶）。  
3. 正三角/六边几乎只在 flower。  
4. 无难度/教学/时长元数据。  
5. 无设计文档与视觉验收状态。  
6. `validate_gallery.mjs` 未覆盖 cube、未校验 catalog。

## 风险

- 双坡屋顶需在 75mm 边体系内解（大方/直角/大三角底），不可 71↔75。  
- 穹顶/金字塔可能超 24 槽，需控片数。  
- Catalog 与 steps 双写会漂移 → tileCount/shapeUsage 必须从 steps 计算。

## Phase 1 范围（本轮）

Catalog 类型 + 8 个现有作品元数据迁移 + 旧导出兼容 + 校验扩展。  
**不重做 house / 不新增 tent·bridge。**
