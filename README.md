# 磁力片儿童搭建小程序 · XR-Frame

面向 3 岁儿童的微信小程序：拖拽卡通磁力片完成简单搭建，或观看可暂停/变速/跳步的自动演示。零文字、零失败。

## 技术栈

- 微信小程序 + **XR-Frame**（基础库 ≥ 2.32.0）
- TypeScript
- 本地低面数 glTF（无 Draco，总计约 14KB）

## 快速开始

1. 用微信开发者工具打开本仓库根目录
2. 详情 → 本地设置：勾选「不校验合法域名」
3. 基础库选 **2.32.0+**；调试建议用 **真机预览**（模拟器对 XR-Frame / Draco 支持不完整）
4. iOS 客户端 ≥ 8.0.36，Android ≥ 8.0.35

```bash
# 重新生成磁力片 GLB 与占位音效（可选）
npm run generate
```

## 工程结构

```
├── components/xr-builder/   # 唯一 xr-frame 场景 + gotoStep 状态机
├── pages/build/             # 控制栏 UI（图标按钮，无文字）
├── assets/                  # tile-square / tile-triangle 及彩色变体
├── sounds/                  # pop / slide / celebrate
└── utils/                   # works 配置、StepPlayer、easing
```

## 核心架构

手动 / 自动共享 `gotoStep(index)` 作为单一场景数据源：

- `i < index`：磁力片已落定
- `i >= index`：隐藏
- `currentStep` + `virtualProgress` 驱动当前步飞入 / 拖拽

## 设计原则（验收底线）

| ID | 原则 |
|----|------|
| P1 | 零文字依赖（界面仅图标） |
| P2 | 仅点击 + 单指拖拽；禁用双指缩放 |
| P3 | 触控目标 ≥ 60×60pt |
| P4 | 操作后 0.2s 内反馈 |
| P5 | 无失败态（搭错自动滑回） |
| P6 | 动画 ≥ 0.8s，步骤间隔 ≥ 1.5s |
| P7 | 单作品 ≤ 6 步 |

## 真机验证清单（按批次）

1. 浅蓝 3D 空间 + 两个磁力片 + 单指旋转（双指无缩放）
2. `gotoStep` / 飞入动画
3. 手动 3 步 + 拖拽纠错
4. 自动播放暂停 / 变速 / 跳步
5. 模式切换无跳变 + 庆祝
6. 第二作品 + 中低端机 ≥ 30fps
