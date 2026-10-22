# V2. ★ 复合模板（带子控件的模板）实例化后**禁止 `sanitize()`**

> 归属：`miliastra-code` 机械可查铁律｜从 `iron-rules-visual-debug.md` 拆出（内容未改）

- 真机实测（`1073742519` 场上所有人数比例，11 个子控件）：
  | 是否 sanitize | 结果 |
  |---|---|
  | **调用** `sanitize(node, 1)` | **整卡不显示**（子控件 11 个全在、`visible=true`、`active=true`、`scale=1`、位置尺寸正确、`sibling` 正常 —— **就是不画**） |
  | **不调用** | 正常显示 ✓ |
- 单图角图（如 `1073742182`）加不加都正常 ⇒ 历史代码里"全量 sanitize"一直没暴露问题。
- **扫描动作**：`grep -n "sanitize("`，若它作用在 `pairs(ROLE_ART)` 这类**混合集合**上 ⇒ 打回，改成**白名单：只对单图模板调用**。
