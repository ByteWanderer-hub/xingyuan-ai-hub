# R5 无 BOM / LF / 4 空格 / 禁 tab

> 归属：`miliastra-code` 机械可查铁律｜从 `iron-rules-lua.md` 拆出（内容未改）


- **真实事故**：编辑器新建关卡写的活文件**自带 UTF-8 BOM** ⇒ 原神打印
  `Read text file with BOM header may cause Lua error`。判据：文件前 3 字节应是 `2d 2d 20`（`-- `）。
- **⚠️ 另一个坑**：PowerShell 5.1 的 `Get-Content` 默认按 ANSI 解码，**显示成乱码是错觉**，别据此转码。
- **审查动作**：`node tools/check-lua-style.mjs`（`BOM`/`CRLF`/`TAB`/`INDENT`）。
