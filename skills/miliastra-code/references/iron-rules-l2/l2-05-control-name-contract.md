# L2-05 控件名是**契约**：拼错 = 严格模式冻结整脚本

> 归属：`miliastra-code` 语义铁律（默认不查）｜从 `iron-rules-lua.md` 拆出（内容未改）

- **判据**：`show/setText/setColor` 用的名字必须与 `add()` 建的名字**完全一致**；动态前缀（`"wash" .. i`）工具认不出，必须自己确认循环真的建了。
- **过查方法**：`node tools/check-lua-scope.mjs`（它内置控件名契约检查，报 `UNDEF_CONTROL` / `DYN_CONTROL_NAME`）。
