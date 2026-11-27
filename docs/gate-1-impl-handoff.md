# Gate 1 · 实施交接（供独立 QA · 非自验 PASS）

## 改动
| 项 | 内容 |
|----|------|
| flower | n=7→**13**：绿 hex + 6 瓣 + 6 外叶；全 71mm；`leafOnPetalOuter` |
| validate_gallery | flower 夹具同步双环 |
| catalog / flower.md | 副标题与设计页更新 |
| house | **未改几何**；subtitle 标明待人审；三视图仍在 `docs/house-phase2-views/` |

## 未做（须人 / 不得自动）
- 未将 house / flower 标为 `accepted`
- house `visualReview` 仍为 `fail`（等人审三视图）

## Hotfix（真机崩溃）
- **现象：** `work('flower')` 抛 `#10 no co-edge magnet mid=0.473` at leaf `[-1.093,0,0.947]`
- **根因：** `sortBuildSteps` 经 `edgesSnap` 把 71mm 环上间距≈0.95 误判为 M=1 方格邻接，外叶排到花瓣之前；`validateMagnetBuild` 仅认真实共边 → 失败
- **修复：** `edgesSnap` 桌面网格启发式仅对 `tile-square|window|rect`（`isSquareGridModel`）

## 请独立 QA 验
见 `docs/works-2.0-roadmap-gates.md` Gate 1 Exit（自动化部分）：
1. validate_gallery / verify_house_roof / npm run accept  
2. flower 仅 71 族、n≤24、无 posePolicy；**tsx/运行时可成功 import WORK_FLOWER**  
3. house 仍 houseRoofPose + 仅 2× house-roof  
4. 零 accepted  
5. magnet-physics 含 `isSquareGridModel`

人审 house/flower 画面**不在** QA agent 职责内通过；QA 报告应单列「待人审」。
