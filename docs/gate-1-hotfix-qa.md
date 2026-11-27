# Gate 1 · Flower Magnet Hotfix · 独立 QA

**角色：** 独立 QA（仅验收 hotfix，不改产品代码）  
**Bug：** flower 在 magnet #10 崩于 `mid=0.473`  
**声称修复：** `edgesSnap` 的 M=1 桌面网格启发式限制在 `isSquareGridModel`（square / window / rect）  
**日期：** 2026-11-25  
**结论：** **PASS**

---

## 验收清单

| # | 检查项 | 结果 | 证据 |
|---|--------|------|------|
| 1 | `utils/magnet-physics.ts` 含 `isSquareGridModel`，且 M 网格启发式受其门控 | **PASS** | L277–309：`isSquareGridModel` 仅 `tile-square|window|rect`；`edgesSnap` 内 `if (isSquareGridModel(prev) && isSquareGridModel(next) && …)` 才走 dx/dz≈1 启发式 |
| 2 | `WORK_FLOWER.steps.length === 13`，tsx 退出码 0 | **PASS** | `npx tsx -e "…"` → 打印 `13`，exit **0** |
| 3 | `node scripts/validate_gallery.mjs` + `npm run accept` 退出码 0 | **PASS** | `OK flower n=13`；`validate_gallery OK`；accept **34/34** + magnet/ux gate 绿 |
| 4 | `scripts/verify_magnet.mjs` 断言 `isSquareGridModel` | **PASS** | L24–27：`phys.includes('isSquareGridModel')`；单独运行 exit **0** |
| 5 | catalog **零** `status: 'accepted'` | **PASS** | `works-catalog.ts` SEEDS 8× `status: 'draft'`；`validate_gallery.mjs` L440–445 禁止 accepted 字面量 |

---

## 命令输出（摘要）

```
npx tsx -e "import { WORK_FLOWER } from './utils/works-gallery.ts'; console.log(WORK_FLOWER.steps.length)"
→ 13 (exit 0)

node scripts/validate_gallery.mjs
→ OK flower n=13 · validate_gallery magnet OK · validate_gallery OK

npm run accept
→ verify_logic OK · verify_magnet OK · accept_batches 34/34 · UX GATE PASSED
```

---

## 裁决

| 维度 | 裁决 |
|------|------|
| **Hotfix（flower magnet / false M-grid neighbor）** | **PASS** |

自动化维度满足声称修复；catalog 仍无 `accepted`（visual/teaching 未签字口径不变）。