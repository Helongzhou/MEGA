# UI 2.0 · Batch 0 基线审计报告

日期：2026-11-25  
门禁：`qa_ux_gate` PASS · `accept_batches` **34/34 PASS**

## 1. 布局与高度

| 项 | 现状 |
|----|------|
| 结构 | 三栏 column：`chrome--top` → `stage` → `chrome--bottom` |
| 顶栏内容高 | `TOP_CONTENT = 108` + `statusBarHeight` |
| 底栏内容高 | `BOTTOM_CONTENT = 72` + `safeBottom` |
| Stage | `max(220, windowHeight - top - bottom)` |
| XR 绑定 | `style height:{{stageHeight}}px`；`renderWidth/Height` = 逻辑尺寸 × `min(dpr,2)` |
| 禁止项 | 无 `cover-view`；XR 不用 `{{height}}` 全屏 |

**风险**：顶栏加品牌/进度后 `TOP_CONTENT` 必须上调，否则挤占 stage。

## 2. XR 生命周期

- `created` → `_initInternalState` / audio  
- `handleReady` → scene、assets、`scene-ready`  
- `workIndex` observer → `_loadWork`（切作品）  
- `detached` → `_unloadAssets` + `_disposeAudio`  
- Pose 命令式；仅 `model`/slot 结构走 `setData`

## 3. 命令协议（须保留）

Page → props：`command` + `commandArg` + `commandSeq++`  
Commands：`prev` | `next` | `replay` | `goto`  
其它：`workIndex`、`mode`、`isAutoPlaying`、`isPaused`、`speedMultiplier`

## 4. 自动播放 / 完成

- 默认 page：`mode=watch`，`isAutoPlaying=true`  
- xr 默认 prop：`mode=manual`（page 覆盖为 watch）  
- 完成：`_triggerCelebration` → bounce + particles + `celebrate.mp3` → `_startShowcase`（`SHOWCASE_MS=6000`）  
- State 事件：`currentStep`、`totalSteps`、`celebrating`、`showcasing`、`completed`、`workId`、`workLabel`

## 5. 作品数据

| id | label（现状单字） | steps |
|----|-------------------|-------|
| cube | 方 | 6 |
| house | 房 | 6 |
| rocket | 箭 | ~13 |
| castle | 堡 | 20 |
| tower | 塔 | ~15 |
| car | 车 | 8 |
| robot | 机 | ~14 |
| flower | 花 | 7 |

`WORK_LABELS` 仅单汉字；**无进度条**；`currentStep`/`totalSteps` 已有但不展示。

## 6. 音频

`pop` 0.65 · `slide` 0.5 · `celebrate` 0.7 · `ambient` 0.18 loop  
**无静音开关**；volume 均 ≤0.7（验收要求）。

## 7. 色不一致

| 位置 | 色 |
|------|-----|
| `app.json` window | `#2B2622` |
| `app.wxss` page | `#d9ebf8`（偏蓝，过时） |
| chrome | `#1c1917` |
| stage / clear-color | `#f5efe6` / `0.94 0.91 0.87` |
| 主钮黄 | `#ffe66d` |
| 速度选中粉 | `#f38181` |

## 8. 现有 QA 断言（不得删意图）

- 禁 cover-view；stageHeight 约束 XR  
- icons play/pause/replay/prev/next 路径  
- aria 重播/播放/暂停、上一步/下一步  
- SPEED_PRESETS、WORK_LABELS、showcaseHint  
- 触控 ≥52（实际查 56）  
- DPR ≤2；showcase hooks；celebrate/replay  

## 9. Batch 映射（后续）

| Batch | 范围 |
|-------|------|
| 1 | Design tokens + 背景色统一 |
| 2 | 品牌顶栏 + 作品全名 + 真实进度 |
| 3 | 工具条/Chip 打磨 + 完成仪式（P1） |
| 4 | Loading/静音/模式/a11y（P2） |
| 5 | QA 断言扩展 + 回归报告 |

## 10. 明确不改

作品 ID、GLB 路径、搭建 steps、磁吸规则、watch 默认、1s/3s/5s、6s 转盘、command 协议、Chrome 不盖 XR。
