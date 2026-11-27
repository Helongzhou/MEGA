# Gate 0 · 独立 QA 验收报告（复验）

**角色：** 独立 QA（非 Gate 0 实施者）  
**依据：** `docs/works-2.0-roadmap-gates.md` Gate 0 Exit  
**日期：** 2026-11-25  
**轮次：** 复验（Prior FAIL：`works-design/dome.md` 缺 pose 策略）  
**结论：** **PASS**

---

## 总结

自动化三连绿；硬约束抽检无放宽；catalog 零 `accepted`、house 仍 `visualReview: fail`；无 tent/bridge BuildWork。`works-design` 14 文件（13 作品 + README）齐全。**独立阅读** `dome.md`：现含 `## 共边 / 姿态策略（Gate 0 已提交口径）`，明示 **cardinal 默认** 与 **Gate 0 不批准任何 dome posePolicy**，满足 Prior 阻断项。

**可进入 Gate 1 实施/人审准备**（house/flower 视觉仍须 Gate 1 + 人类签字）。

---

## 命令证据

| 命令 | 退出码 | 备注 |
|------|--------|------|
| `node scripts/validate_gallery.mjs` | **0** | 8 作品 magnet + catalog ids 一致 |
| `node scripts/verify_house_roof.mjs` | **0** | pitch≈74.11°，7 片 |
| `npm run accept` | **0** | verify_logic + verify_magnet + accept_batches 34/34 + ux gate |

---

## Exit Gate 逐项

| # | 准则 | 结果 | 证据 |
|---|------|------|------|
| 1 | 硬约束语义未放宽（BuildStep / tile-spec / magnet） | **PASS** | `tile-spec.ts` M=75、TRIANGLE/HEX=71；`magnet-physics.ts` `CARDINAL_POSE_EPS_DEG=10`，`posePolicy:'house-roof'` 仅 `tile-large`；`works.ts` house 2 步仍 `houseRoofPose` + `posePolicy:'house-roof'` |
| 2 | 8 现品 + 5 roadmap 均有 design 页，含片型/共边/pose/≤24 | **PASS** | 下表 13/13；`dome.md` L23–27 |
| 3 | 无 `status: 'accepted'`；house 仍可 visual fail | **PASS** | SEEDS 8× `status: 'draft'`；house `visualReview: 'fail'`（L124） |
| 4 | `validate_gallery` + `npm run accept` 仍绿 | **PASS** | 上表 |
| 5 | Gate 0 未改 BuildStep 位姿（抽检） | **PASS** | `WORKS = [cube, house, ...GALLERY_WORKS]`（6 画廊）；`WORK_ROADMAP` 含 tent/bridge/pyramid/animal/dome，无对应 `BuildWork` |
| 6 | castle L4；roadmap dome 延后、animal 10–14 | **PASS** | `works-catalog.ts` castle `level: 'L4'`；WORK_ROADMAP dome note「延后」、animal `10–14` |

---

## `works-design/*.md` 清单

要求：**片数 ≤24（或明示现/目标）**、**边族 75 vs 71**、**姿态策略（cardinal / 局部例外或未批准）**。

| 文件 | 存在 | ≤24 / 片数 | 边族 75/71 | Pose 策略 | 结果 |
|------|------|------------|------------|-----------|------|
| `README.md` | ✓ | 模板 ≤24 | 禁止混吸 | 默认 cardinal | **PASS** |
| `cube.md` | ✓ | 6 | 75 | cardinal，无例外 | **PASS** |
| `flower.md` | ✓ | 7 / ≤14 | 仅 71 | cardinal | **PASS** |
| `house.md` | ✓ | 7 | 75 | `house-roof` 2 片 | **PASS** |
| `car.md` | ✓ | 9–12 | 75 为主 | 默认 cardinal | **PASS** |
| `rocket.md` | ✓ | 12–15 | 75 | 默认 cardinal | **PASS** |
| `robot.md` | ✓ | 13–16 | 75 | 默认 cardinal | **PASS** |
| `tower.md` | ✓ | 14–18 | 75 | 默认 cardinal | **PASS** |
| `castle.md` | ✓ | 20 | 75 | cardinal | **PASS** |
| `tent.md` | ✓ | 8–10 | 75（禁 71 混吸） | 默认 cardinal，例外须明示 | **PASS** |
| `bridge.md` | ✓ | 10–14 | 75 | cardinal | **PASS** |
| `pyramid.md` | ✓ | 12–16 | 75 或 71 二选一 | 预研锁定（cardinal / 局部 posePolicy） | **PASS** |
| `animal.md` | ✓ | 10–14 | 单族方案 | cardinal | **PASS** |
| `dome.md` | ✓ | 18–24 | 仅 71 | **cardinal 默认**；**Gate 0 不批准 posePolicy**（L25–26） | **PASS** |

---

## Prior 阻断项复验

| 项 | 结果 |
|----|------|
| `dome.md` pose 策略落地 | **已修复** — `## 共边 / 姿态策略（Gate 0 已提交口径）` 含边族、cardinal 默认、明确「不批准任何 dome posePolicy」、片数 ≤24 |

---

## Catalog / 状态抽检

| 检查项 | 结果 |
|--------|------|
| `SEEDS` 中 `status: 'accepted'` | **0** |
| `house.visualReview` | **`fail`** |
| QA 修改产品代码 / status | **否**（仅本报告） |

---

## 裁决

| 裁决 | |
|------|--|
| **Gate 0** | **PASS** |
| **可启动 Gate 1？** | **是**（house 视觉 accepted 仍须人审，非本 Gate） |