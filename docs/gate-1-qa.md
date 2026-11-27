# Gate 1 · 独立 QA 验收报告

**角色：** 独立 QA（非 Gate 1 实施者）  
**依据：** `docs/works-2.0-roadmap-gates.md` Gate 1 Exit；`docs/gate-1-impl-handoff.md`  
**日期：** 2026-11-25  
**结论（自动化）：** **AUTOMATION_PASS / HUMAN_PENDING**

Gate 1 **完整 Exit** 须人类对 house/flower 画面签字；本报告仅覆盖脚本与静态抽检，**不**构成全量 PASS。

---

## 总结

三连自动化均退出码 **0**。flower 已为 **n=13**、纯 **71mm**（`tile-hex` + `tile-triangle`）、`leafOnPetalOuter` 双环、无 `posePolicy`。house 仍为 `houseRoofPose` + **恰好 2×** `posePolicy: 'house-roof'`；catalog **零** `status: 'accepted'`，house `visualReview: 'fail'`。  
**待人审：** house 三视图（`docs/house-phase2-views/`）、flower 真机/截图视觉。

---

## 命令证据

| 命令 | 退出码 | 备注 |
|------|--------|------|
| `node scripts/validate_gallery.mjs` | **0** | 含 `OK flower n=13`；`validate_gallery OK` |
| `node scripts/verify_house_roof.mjs` | **0** | pitch≈74.114°，7 片 |
| `npm run accept` | **0** | verify_logic + verify_magnet + accept_batches **34/34** + ux gate |

---

## Gate 1 Exit · 自动化逐项

| # | 准则 | 结果 | 证据 |
|---|------|------|------|
| 1 | magnet 全过（validate + accept 内嵌） | **PASS** | 上表三连绿；`validate_gallery magnet OK` |
| 2 | flower **n=13**；≤24 | **PASS** | validate 输出 `OK flower n=13`；`WORK_FLOWER` 1+6+6 步 |
| 3 | flower 仅 **71 族**；`leafOnPetalOuter` | **PASS** | `utils/works-gallery.ts` L378–386：`hex` + `petalOnHex` + `leafOnPetalOuter`；注释「71mm only」；无 square/rect/large/right/window 入 `WORK_FLOWER` |
| 4 | flower **无** posePolicy | **PASS** | `works-gallery.ts` 全文无 `posePolicy`；`verify_house_roof.mjs` L258 断言 gallery 无 posePolicy |
| 5 | 无 flower **71↔75** 假连接 | **PASS** | 零 75 片型；夹具 `petal0 vs hex` 同族匹配（la/lb≈0.947）；设计页「禁止 75 族片」 |
| 6 | house **houseRoofPose** + **仅 2×** house-roof | **PASS** | `works.ts` L182–183、L252、L265；`verify_house_roof` 断言 `match.length === 2` |
| 7 | **零** catalog `status: 'accepted'` | **PASS** | `works-catalog.ts` SEEDS 8× `status: 'draft'`；无 `status: 'accepted'` 字面量 |
| 8 | house **未** accepted；visual 仍 fail | **PASS** | house `visualReview: 'fail'`（L124）、`status: 'draft'` |
| 9 | flower visual 未 auto-accept | **PASS** | flower `visualReview: 'pending'`（L104） |

---

## 人类视觉（QA 不判 PASS）

| 作品 | 自动化 | 人审 |
|------|--------|------|
| **house** | magnet/roof 脚本绿 | **HUMAN_PENDING** — 三视图与真机剪影；`visualReview` 仍为 `fail` |
| **flower** | magnet n=13 绿 | **HUMAN_PENDING** — 「一眼花」、双环可读（`works-design/flower.md` §视觉验收） |

---

## 与实施交接对照

| 交接声明 | QA 核实 |
|----------|---------|
| flower n=7→13，`leafOnPetalOuter` | **一致** |
| validate_gallery 双环夹具 | **一致**（`flowerPetals` + `flowerLeaves`） |
| house 几何未改；visual fail | **一致** |
| 未标 accepted | **一致** |

---

## 阻断项

**无**（自动化维度）。

---

## 裁决

| 维度 | 裁决 |
|------|------|
| **自动化（Gate 1 Exit 脚本+抽检）** | **PASS** |
| **人类视觉（house/flower accepted）** | **PENDING** |
| **Gate 1 整体** | **AUTOMATION_PASS / HUMAN_PENDING** |

人类签字通过并更新 `visualReview` / `status` 后，方可视 Gate 1 **完整 Exit** 为 PASS；**勿**在未过人审前进入 Gate 2 产品位姿改动以外的「完成」口径。