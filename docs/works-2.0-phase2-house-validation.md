# Phase 2 · house 双坡 — 验证结果（待人工视觉验收）

**日期:** 2026-11-25  
**方案:** B — 左右各大三角真双坡  
**status:** `draft` · **visualReview:** `fail`（**未**自动 accepted）

---

## 精确几何（非预估写入）

由 `utils/house-roof.ts` 从 `LARGE_TRI_HEIGHT = 137/75` 导出：

| 量 | 值 |
|----|-----|
| rise | √(H²−0.5²) ≈ **1.7569038423** |
| pitch（相对水平） | atan2(rise,0.5) ≈ **74.1140944226°** |
| α（相对竖直内倾） | 90°−pitch ≈ **15.8859055774°** |
| 脊尖 | `(0, 1+rise, 0)` ≈ `(0, 2.7569, 0)` |
| 左 pose | pos `(-1/3, 1+rise/3, 0)` · rot `(-90−α, -90, 0)` |
| 右 pose | pos `(+1/3, 1+rise/3, 0)` · rot `(-90+α, -90, 0)` |
| 檐口 | 底边 75mm ↔ 左/右墙顶；左右共脊**点** |

---

## 局部姿态例外

| 规则 | 行为 |
|------|------|
| 默认 | `CARDINAL_POSE_EPS_DEG = 10`；rx/rz 须近 0/±90 |
| 例外 | 仅 `posePolicy: 'house-roof'` **且** `model: 'tile-large'` |
| 边长 | **未**放宽；71↔75 仍禁止作设计依赖 |
| 其它作品 | gallery **无** posePolicy |

反向测试见 `scripts/verify_house_roof.mjs`（无 policy 倾角失败；错误 model+policy 失败；cube 非法倾角仍失败）。

---

## 自动化结果

| 检查 | 结果 |
|------|------|
| `node scripts/verify_house_roof.mjs` | **OK** |
| `node scripts/validate_gallery.mjs` | house **n=7** OK；全作品 magnet OK |
| `npm run accept` | **34/34** |
| sortBuildSteps | 经 works 入口排序；屋面吸左右墙 |

---

## 阶段记账

| 项 | 值 |
|----|----|
| 片数 | **7** |
| 形状 | square×4, window×1, large-triangle×2 |
| 磁吸 | 墙↔屋面 real co-edge OK |
| 视觉 | **待人工** — 图见 `docs/house-phase2-views/` |

### 视图文件

- `house-front.png` — 正面双坡轮廓  
- `house-side.png` — 侧面屋面朝向  
- `house-pitch-elevation.png` — 沿 Z 的坡度剖面（可读 pitch）  
- `house-top.png` — 俯视左右坡会于脊  
- `house-iso.png` / `house-3d.png` — 搭建示意  

> 离线几何渲染，**非**微信真机 XR 截屏。真机预览仍需人工补做。

---

## 请人工确认

1. 正面是否对称、可读为「小房子」双坡？  
2. 侧面 / 坡度剖面是否能看出真实坡度？  
3. 有无悬空、穿插、虚假吸附观感？  

确认通过后再改 `visualReview`；**通过前不要** `status: accepted`。  
通过后下一作品：**tent → bridge**。
