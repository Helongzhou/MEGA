# 作品设计流程（可复现）

```
题材策划 → 规格核对(tile-spec) → 几何草图 → 结构设计
  → BuildStep 实现 → validateMagnetBuild → 视觉验收 → Catalog 入库
```

每个作品一份 `works-design/<id>.md`，至少包含：

1. 题材灵感 / 动作（保留·大改·新增·延后）  
2. 作品目标 / 难度 / 预估片数（≤24）  
3. 片型配方与边长族（75 或 71，禁止混吸）  
4. 结构拆分（正/侧/俯剪影）  
5. 真实共边关系与姿态策略（默认 cardinal；例外须明示）  
6. 搭建顺序要点  
7. 视觉验收标准  
8. 教学目标  

状态：`planned` → `draft` → `review` → `accepted`  
**仅 magnet 通过不得标 accepted。**

阶段门禁见 [`docs/works-2.0-roadmap-gates.md`](../docs/works-2.0-roadmap-gates.md)。  
**验收必须由独立 QA agent 执行，实施 agent 不得自验 PASS。**
