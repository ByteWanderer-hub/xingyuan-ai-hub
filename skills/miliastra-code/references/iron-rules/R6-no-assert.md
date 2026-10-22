# R6 不用 `assert` 引爆；校验走显式检查 + `fail()`

> 归属：`miliastra-code` 机械可查铁律｜从 `iron-rules-lua.md` 拆出（内容未改）


- **为什么**：`assert` 抛错会中断整帧，而且**信息零散**；`fail()` 能把上下文（首错/尝试数/交接值）一次性打全。
- **正确写法**：`if type(x) ~= "string" then return "参数非法: " .. tostring(x) end` → 调用方 `if err then fail(err) end`。
- **审查动作**：`node tools/check-lua-style.mjs`（`ASSERT` warn，逐处问"这里真会炸吗"）。
