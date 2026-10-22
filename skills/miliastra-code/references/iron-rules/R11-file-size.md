# R11 文件与函数规模有度

> 归属：`miliastra-code` 机械可查铁律｜从 `iron-rules-lua.md` 拆出（内容未改）


- **判据**：单文件 >1000 行、单函数长到一眼看不完 ⇒ 拆（本工程用 `案子/<地图>/2.代码/main/` 之类的片段 + 构建脚本拆）。
- **审查动作**：`node tools/check-lua-style.mjs --map <地图>`（`BIG_FILE` warn）。
