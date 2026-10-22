# V1. 图片资产 id 与控件模板 id 严禁混用

> 归属：`miliastra-code` 机械可查铁律｜从 `iron-rules-visual-debug.md` 拆出（内容未改）

- `6 位数字`（如 `100001` / `105034`）= **图片资产** → `SetImage(Enum.ImageSource.StaticReference, id)`。
- `1073742xxx`（10 位）= **客户端控件模板** → 必须 `game.InstantiateClientUIControl(id, parent)`。
- **症状**：用 `SetImage` 塞模板 id ⇒ 画面上出现 **「?」占位符**（不报错、不警告）。
- **扫描动作**：产物里 `grep -n "SetImage"`，第二个参数 ≥ 6 位即打回。
