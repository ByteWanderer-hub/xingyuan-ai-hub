# R4 平台调用都包 `pcall`，且**失败必须有去向**

> 归属：`miliastra-code` 机械可查铁律｜从 `iron-rules-lua.md` 拆出（内容未改）


- **违反长什么样**：`pcall(function() c.raycastTarget = true end)` —— 返回值没人接，失败静默。
- **创作者明令**：**严禁任何"掩盖报错的兜底"**；`pcall` 吞掉的异常要 `log` 出来（同一原因最多报 3 次）。
- **正确写法**（两档：要命的 `fail()`，可选的"降级 + 不阻断"日志）：
```lua
local ok, err = pcall(function() c.raycastTarget = true end)
if not ok then
    log("热区 raycastTarget 设置失败（点击会失效）: " .. tostring(err))
end
-- 每帧都可能失败的探针 → 用 nonFatal(what, err)：降级 + 最多报 3 次，防刷屏
```
- **审查动作**：`node tools/check-lua-style.mjs`（`BARE_PCALL` warn / `SWALLOWED_PCALL` error）。
