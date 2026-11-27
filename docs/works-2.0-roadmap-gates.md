# 作品集 2.0 · 分阶段路线图与质量门禁

**定位：** 用真实边磁吸与清晰剪影，带孩子从「认识边长与平/立」走到「看懂空间结构与对称拼搭」。  
**原则：** 质量优先于完成数量；阶段门禁未过不得进入下一 Gate。

## 独立验收规则（强制）

| 角色 | 职责 |
|------|------|
| **实施 agent** | 按 Gate 改文档/代码；自测可跑脚本，**不得**宣布门禁 PASS |
| **QA agent** | **另启**独立 agent，按本文件 Exit Gate 验收；写 `docs/gate-N-qa.md` |
| **人类** | 视觉 `accepted` 唯一签字人；QA 不得改 `visualReview`/`status` 为 accepted |

实施 agent 完成某 Gate 后必须：**停手 → 拉起 QA agent → 等待 QA 报告**。QA FAIL 则实施修复后再次另启 QA（不可自验翻盘）。

## 硬约束（每 Gate 隐式包含）

1. 不改 BuildStep 核心字段语义；不改 GLB 路径。  
2. 禁止 71↔75 跨族共边 / 假连接。  
3. 默认 rx/rz ∈ {0,±90}±10°；姿态例外仅作品局部明示（现仅 house 双坡 `house-roof`）。  
4. 单品片数 ≤ `MAX_PRECREATED_TILES`（24）。  
5. **禁止**自动 `status: accepted` / 伪造 visual pass。

## 动作总表

| id | 动作 | Gate |
|----|------|------|
| cube | 保留·打磨验收 | G0 文档 → 后人审 |
| flower | 保留+优化 | G0 文档 → **G1** |
| house | 保留·视觉修通 | G0 文档 → **G1**（人审三视图） |
| car / rocket / robot / tower | 大改 | G0 文档 → **G3** |
| castle | 保留+叙事升级 | G0 → **G4** |
| tent / bridge | 新增 | G0 文档 → **G2** |
| pyramid | 预研后决定 | G0 提纲 → **G2 预研结论** |
| animal | 降级精简（10–14） | G0 → **G3** |
| dome | **延后** | G0 标注 → G4 确认仍延后 |

## 游玩顺序（Catalog sortOrder 目标）

L1: cube → flower  
L2: tent → house → car  
L3: bridge → animal → rocket → robot → tower  
L4: castle → pyramid → dome（延后）

---

### Gate 0 — 规范与设计页对齐
**实施：** 仅 `works-design/*`、catalog/roadmap 元数据、本文件；**不改** BuildStep 位姿。  
**Exit（QA 验）：**
1. 硬约束文件未改语义（抽检 BuildStep / tile-spec / magnet 边长）。  
2. 现有 8 + roadmap 5 均有 `works-design/<id>.md`，含片型、共边、pose 策略、预估片数≤24。  
3. 无任何 `status: 'accepted'`；house 仍可为 visual fail。  
4. `npm run accept` 与 `validate_gallery` 仍绿（无因文档改坏）。

### Gate 1 — house 视觉 + flower 优化
**实施：** 仅 house / flower steps + 文档 + catalog。  
**Exit（QA + 人审）：** magnet 全过；片数≤24；**人**确认 house/flower 视觉后才可 accepted。

### Gate 2 — tent & bridge + pyramid 预研
**实施：** 新建 tent/bridge；pyramid 仅预研报告。  
**Exit（QA）：** 新作品 magnet+catalog 1:1；片数区间达标；预研无违规假设。

### Gate 3 — 消灭同质化（逐个 1～2 个）
**实施：** car → rocket → robot → tower → animal（分批）。  
**Exit（QA + 人审剪影对比）。**

### Gate 4 — castle 叙事 + 排序收口 + dome 延后确认
**Exit（QA + 全量人审）。**

---

## QA agent 启动词（实施 agent 用）

```
你是独立 QA（非实施者）。只验收 Gate N，不改产品代码（可写 docs/gate-N-qa.md）。
对照 docs/works-2.0-roadmap-gates.md 的 Exit Gate。
跑：validate_gallery / verify_house_roof（若相关）/ npm run accept。
抽查：无 accepted；works-design 齐套；未放宽 71↔75。
输出：PASS/FAIL + 证据表 + 阻断项。FAIL 时禁止建议「先进入下一 Gate」。
```
