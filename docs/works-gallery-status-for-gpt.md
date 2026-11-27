# MEGA 磁力片作品集 · 现况导出（供 GPT 优化）

> 生成日：2026-11-25  
> 产品：微信小程序 XR 磁力片儿童搭建（ScienceBaby 7.5cm 级）  
> 用途：请基于本文件做**作品集策划/造型/教学/难度曲线**优化建议；实现侧遵守文末工程约束。

---

## 1. 产品与玩法

- 观看自动搭建（watch）+ 手动跟搭；奶油色场景；固定相机 + 桌面转盘；完成后 6s showcase。
- 片与片之间必须**真实边磁吸**（等边长 + 共边），禁止“看起来像、边长不配”的假连接。
- UI 不盖在 XR 画布上；品牌 MEGA。

---

## 2. 片型与边长（硬约束）

| 片型 | 关键边 | mm | 可互吸族 |
|------|--------|-----|----------|
| square / window | 四边 | **75** | 75 族 |
| rectangle | 长边 / 短边 | **75 / 37.5** | 长↔75；短↔短 |
| right-triangle | 腰 / 斜边 | **75 / ≈106** | 腰↔75；斜边仅同长 |
| large-triangle | 底 / 腰 | **75 / ≈142** | 底↔75；腰仅同长 |
| triangle（正三角） | 三边 | **71** | **仅 71 族** |
| hexagon | 六边 | **71** | **仅 71 族** |

**禁止：** 71mm 正三角/六边 贴 75mm 方/窗/直角腰/大三角底。  
**姿态：** 默认 rx/rz ∈ {0,±90}（±10°）；仅 house 双坡两片 `tile-large` 允许局部 `posePolicy: house-roof`。

已上架 GLB：方/三角/长方/直角/大三角/六边/窗 + 多色变体（约 22 个资产）。

---

## 3. 现有作品一览（8 个，均已上线 BuildStep）

排序 = Catalog `sortOrder`。片数来自 `validate_gallery`（磁吸全 OK）。  
**无一 `accepted`**；磁吸通过 ≠ 视觉/教学合格。

| # | id | 标题 | 标签 | 难度 | 片数 | featured | category | visualReview | status | 副标题（现状） |
|---|-----|------|------|------|------|----------|----------|--------------|--------|----------------|
| 1 | cube | 方块 | 方 | L1 | 6 | yes | basics | pending | draft | 六面盒子 · 认识墙与盖 |
| 2 | flower | 小花 | 花 | L1 | 7 | yes | nature | pending | draft | 六边花心 · 正三角花瓣 |
| 3 | house | 小房子 | 房 | L2 | 7 | yes | home | **fail** | draft | 双坡已实现，待视觉验收 |
| 4 | car | 小汽车 | 车 | L2 | 8 | no | vehicle | pending | draft | 舱体 + 引擎盖（待加轮廓） |
| 5 | rocket | 火箭 | 箭 | L3 | 13 | yes | vehicle | pending | draft | 方舱 + 大三角鼻锥 + 直角翼 |
| 6 | robot | 机器人 | 机 | L3 | 14 | no | character | pending | draft | 躯干 + 窗头 + 直角臂 |
| 7 | castle | 城堡 | 堡 | L3 | 20 | yes | landmark | pending | draft | 2×2 庭院 + 窗墙 + 垛口 |
| 8 | tower | 高塔 | 塔 | L3 | 15 | no | landmark | pending | draft | 双层井筒 + 瞭望窗 |

### 3.1 形状用量（由 steps 推导）

| id | n | shapeUsage |
|----|---|------------|
| cube | 6 | square×6 |
| flower | 7 | hexagon×1, triangle×6 |
| house | 7 | square×4, window×1, large-triangle×2 |
| car | 8 | square×5, rectangle×1, window×1, large-triangle×1 |
| rocket | 13 | square×10, large-triangle×1, right-triangle×2 |
| robot | 14 | square×10, window×1, right-triangle×2, large-triangle×1 |
| tower | 15 | square×10, window×1, large-triangle×1, rectangle×3 |
| castle | 20 | square×8, window×4, rectangle×8 |

### 3.2 教学元数据（Catalog）

| id | 学习目标 | 估时 | 年龄 | tags |
|----|----------|------|------|------|
| cube | 正方形边对边；90°立面；封闭六面体 | 2min | 3+ | 入门,正方体,直角 |
| flower | 71mm边互吸；六边环对称；正三角60° | 2min | 3+ | 六边形,正三角,平面 |
| house | 窗片外框同方；坡屋顶边匹配 | 3min | 4+ | 房屋,窗户,屋顶 |
| car | 长边拼接；前后层次 | 3min | 4+ | 交通,长方形 |
| rocket | 大三角底贴墙顶；直角腰贴地板边 | 4min | 5+ | 竖向,大三角,直角三角 |
| robot | 左右对称；窗作面部 | 4min | 5+ | 角色,对称 |
| castle | 多地板拼接；长方半高垛口 | 5min | 5+ | 围合,长方形垛口 |
| tower | 层间衔接；窗瞭望 | 4min | 5+ | 高层,竖向稳定 |

### 3.3 结构摘要（实现现状）

**cube**  
地板→四墙→盖。纯 75mm 方。入门标准件。视觉可读性高。

**flower**  
平面：中心 hex + 六片 equilateral 花瓣（全 71mm）。唯一充分使用 71 族的作品。后续计划「优化造型」。

**house（Phase 2 刚改）**  
地板方 + 后/左/右墙方 + 前窗 + **左右各大三角真双坡**（底贴左右墙顶 75mm，尖共中脊）。  
pitch≈74.114°（由 H=137/75 导出，非手写）。仅此 2 片有 `house-roof` 姿态例外。  
自动化通过；**视觉仍 fail，等人审**。示意：`docs/house-phase2-views/`。

**car**  
舱地板 + 长方引擎盖 + 三墙 + 窗挡风 + 舱盖 + 大三角（竖立在挡风顶，非车顶双坡）。轮廓偏弱，副标题已写「待加轮廓」。

**rocket**  
单地板 + 两层 cell 墙 + 舱盖 + 大三角鼻锥（竖在前墙顶）+ 左右直角翼贴地板。竖井+三角顶同质化代表。

**robot**  
躯干一层墙 + 中盖 + 头层（前窗）+ 顶盖 + 直角臂 + 大三角帽。与 rocket/tower 结构相近。

**castle**  
2×2 地板庭院 + 一圈混窗墙 + 每墙顶一长方垛口。片数最多，围合感相对好。

**tower**  
双层井筒 + 中/顶盖 + 瞭望窗层 + 大三角顶 + 三面长方垛口。仍是竖井+三角顶。

---

## 4. Roadmap（尚无 BuildWork）

| id | 标题 | 目标难度 | 目标片数 | 备注 |
|----|------|----------|----------|------|
| tent | 小帐篷 | L2 | 8–10 | 三角棱柱 / 双坡 |
| bridge | 小桥 | L2 | 10–14 | 桥面+桥墩 |
| pyramid | 金字塔 | L3 | 12–16 | 四坡或层叠 |
| animal | 小鱼 | L3 | 14–18 | 平面剪影+立体鳍 |
| dome | 六边形穹顶 | L4 | 18–24 | hex 环 + 71mm 三角 |

Phase 2 已定顺序（质量优先，不追数量）：  
1. **house 双坡**（已实现，待视觉）→ 2. **tent** → 3. **bridge** → 4. 优化 **flower** → 5. **pyramid** 几何预研。

---

## 5. 已知问题 / 优化动机（给 GPT 的痛点）

1. **同质化强：** rocket / robot / tower / car 都是「竖井或舱 + 大三角顶」，侧脸辨识度不足。  
2. **71mm 族闲置：** 除 flower 外几乎不用正三角/六边；dome/pyramid 应激活但未做。  
3. **直角三角使用浅：** 仅作翼/臂，未做屋面/坡面教学件（house 最终未用直角方案）。  
4. **视觉验收全未过：** 仅 house 标 fail；其余 pending；**0 accepted**。  
5. **设计文档缺失：** 仅 `works-design/house.md` + README；其余 id 无独立设计页。  
6. **car 轮廓弱；flower 待优化；castle 虽大但教学叙事可加强。**  
7. **难度曲线：** L1×2、L2×2、L3×4，缺真正 L4；L2/L3 区分偏靠片数而非造型语言。  
8. **槽位上限：** `MAX_PRECREATED_TILES = 24`；穹顶需控片。

---

## 6. 工程约束（优化方案必须遵守）

- 不改 BuildStep 核心字段语义；不改 GLB 路径约定。  
- 不放宽 75/71 边长匹配；不伪造共边；不为过验证改几何含义。  
- 不全局放开姿态角；姿态例外若需要必须**作品局部、明示范围**（现仅 house 屋顶）。  
- 不自动 `status: accepted`；visual 须人工。  
- 新增作品须：`validateMagnetBuild` + `sortBuildSteps` + catalog 1:1 + design 文档。  
- 质量 > 完成数量。

---

## 7. 请 GPT 输出的优化交付物（建议格式）

请给出：

1. **作品集定位一句话** + 儿童年龄带叙事。  
2. **保留 / 大改 / 降级 / 延后** 表（针对现有 8 + roadmap 5）。  
3. 每个建议大改作品的：**目标剪影（正/侧/俯）**、片型配方、边长匹配关键边、预估片数、教学点、与同质作品的差异。  
4. **难度曲线重排**（L1→L4 推荐游玩顺序）。  
5. **花（flower）优化方案** 与 **金字塔预研要点**（边长可行性先于造型愿望）。  
6. 明确哪些想法会触碰「71↔75」或「非 cardinal 姿态」——标红并给替代。

不要输出可执行代码；先给策划与几何可行性结论。
