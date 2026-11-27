# Gate 2 · 独立 QA 验收报告

**角色：** 独立 QA（非 Gate 2 实施者）  
**依据：** `docs/gate-2-impl-handoff.md`、`docs/prd-architecture.md`  
**日期：** 2026-11-25  
**结论：** **PASS**

---

## 总结（8 行）

1. `npx tsx scripts/verify_plaza.ts` 退出码 **0**（strictMiss / hotAt=3 / publicDefault=false）。  
2. `node scripts/validate_gallery.mjs` 退出码 **0**（8 作品 magnet + catalog 全绿）。  
3. `app.json` tabBar 为广场 / 库存 / 日记 / 设置；`pages/build/index` 在 `pages` 中、不在 tabBar。  
4. `canBuild` 对缺失形状严格失败（`need > stock` 即 false）；广场「只看我能拼的」走 `filterPlaza` + `canBuild`。  
5. `publicShowcase` 默认 **false**；`publicDiary` 总开关关时返回 `[]`；广场「大家的作品」`wx:if="{{publicOn}}"`。  
6. 库存「拍照认包装盒」仅为 `wx.showModal` 预告文案，无 `chooseImage`/OCR，无库存写入。  
7. `works-catalog.ts` SEEDS **8×** `status: 'draft'`，源码无新增 `status: 'accepted'`。  
8. 磁吸未放宽：`house-roof` 仍局部于 `tile-large`；无 71↔75 配对 helper（仅注释/夹具尺度常量）。

---

## 命令证据

| 命令 | 退出码 | 备注 |
|------|--------|------|
| `npx tsx scripts/verify_plaza.ts` | **0** | `verify_plaza OK { shapes: 7, strictMiss: true, hotAt: 3, publicDefault: false }` |
| `node scripts/validate_gallery.mjs` | **0** | `validate_gallery magnet OK`；`validate_catalog OK`；`validate_gallery OK` |

---

## 交接清单逐项

| # | 准则 | 结果 | 证据 |
|---|------|------|------|
| 1 | `verify_plaza` 退出 0 | **PASS** | 上表；脚本断言缺形 `canBuild` false、合并、公开默认关 |
| 2 | `validate_gallery` 仍全绿 | **PASS** | 退出 0；flower n=13、house n=7 等 OK |
| 3 | tabBar 四页 + build 非 Tab | **PASS** | `app.json` L2–5 pages 含 build；L21–45 tabBar 仅 plaza/inventory/diary/settings |
| 4 | `canBuild` 严格 | **PASS** | `utils/inventory-logic.ts` L46–51：遍历 `SHIPPED_SHAPES`，`need > stock[id]` 即 false |
| 5 | 公开默认关；关时 diary  feed 空 | **PASS** | `user-store.ts` L49 `publicShowcase: false`；L234–236 `if (!publicShowcase) return []` |
| 6 | 拍照盒仅预告 UI | **PASS** | `pages/inventory/index.ts` L85–91 仅 modal；无相机/OCR API |
| 7 | 无 catalog `accepted` | **PASS** | `works-catalog.ts` SEEDS 全 `draft`；`validate_gallery.mjs` L441 仍禁止 accepted 字面量 |
| 8 | 磁吸规则未 loosen | **PASS** | `magnet-physics.ts` L400–414 house-roof 局部；`house-roof.ts` + `works.ts` 双坡；无新 71↔75 匹配函数 |

---

## 与实施交接对照

| 交接声明 | QA 核实 |
|----------|---------|
| 四 Tab + build `navigateTo` | **一致**（build 在 pages、非 tabBar） |
| 严格 canBuild / 热门 ≥3 | **一致**（`verify_plaza` + `inventory-logic`） |
| `publicShowcase` 默认关 | **一致** |
| 未标 accepted、未改磁吸 | **一致** |
| 拍照认盒仅说明弹窗 | **一致** |

---

## 阻断项

**无。**

---

## 裁决

| 维度 | 裁决 |
|------|------|
| **Gate 2 自动化 + 静态验收** | **PASS** |
| **推进 Gate 3** | **可**（本报告 PASS；仍遵守「勿标 accepted」与 Gate 1 人审待办） |

---

## 说明

- 本 QA **未**修改产品代码，仅运行脚本与源码抽检。  
- **未**将任何作品标为 `accepted`。  
- Gate 1 house/flower **人类视觉**仍可能为 PENDING（见 `docs/gate-1-qa.md`）；与 Gate 2 外壳交付无冲突。