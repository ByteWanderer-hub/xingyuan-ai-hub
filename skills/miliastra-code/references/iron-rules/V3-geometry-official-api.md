# V3. 几何只按官方 API 读，别用编辑器字段名

> 归属：`miliastra-code` 机械可查铁律｜从 `iron-rules-visual-debug.md` 拆出（内容未改）

- 正确：`GetAnchoredPosition()`（返回 x, y）、`GetSizeDelta()`、`GetSiblingIndex()`。
- **`posX / posY / width / height` 是编辑器字段，真机 Lua 侧为 `nil`** —— 读到 `nil` **不代表没设置**（本人为此白查两轮）。
