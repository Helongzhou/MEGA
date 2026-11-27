# Gate 2 实施交接（非自验 PASS）

## 做了什么
- 四个 Tab：广场 / 库存 / 日记 / 设置；搭建页改为 `navigateTo`，不再是首页。
- 纯函数 `utils/inventory-logic.ts`：严格 `canBuild`、套数合并、热门阈值 3、筛选排序。
- `utils/user-store.ts`：本地一套状态；公开总开关默认关。
- Catalog 增加 `form` / `themes`（轨道类暂无作品）。
- 搭建完成提示可记日记；设置里的音效会在进入搭建时同步静音。
- `scripts/verify_plaza.ts` 覆盖缺片不能拼、合并、公开默认关。

## 没做
- 未改磁吸几何、未标任何作品 `accepted`。
- 拍照认包装盒只有说明弹窗。
- 日记照片字段预留，这一期记的是文字。

## 请独立 QA
1. `npx tsx scripts/verify_plaza.ts` 退出 0。
2. `node scripts/validate_gallery.mjs` 仍全绿。
3. 源码无新增 `status: 'accepted'`。
4. `publicShowcase` 默认 false；`publicDiary` 在总开关关闭时为空。
5. 广场「只看我能拼的」走 `canBuild`，不是模糊匹配。
