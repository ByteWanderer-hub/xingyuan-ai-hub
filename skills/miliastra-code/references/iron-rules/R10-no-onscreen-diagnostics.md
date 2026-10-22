# R10 不许在画面塞诊断 / 兜底显示

> 归属：`miliastra-code` 机械可查铁律｜从 `iron-rules-lua.md` 拆出（内容未改）


- **创作者明令**：不许"建不出来就算了"的静默 return，也不许在玩家画面里塞 `FAULT@…` / 诊断行 ——
  诊断走 `print`（`miliastra_log`）与 `miliastra_sim`，**画面只放该给玩家看的东西**。
- **审查动作**：`grep -n 'FAULT@\|诊断\|状态>' <脚本>`。
