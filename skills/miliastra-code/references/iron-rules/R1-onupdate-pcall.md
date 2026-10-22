# R1 `OnUpdate` 必须包 `pcall` → 聚合故障块

> 归属：`miliastra-code` 机械可查铁律｜从 `iron-rules-lua.md` 拆出（内容未改）


- **违反长什么样**：`function OnUpdate(dt) tick(dt) end` —— tick 里任何异常直接抛掉整帧。
- **为什么致命**：引擎只调 `OnUpdate`；一次异常后**整脚本不再更新**，表现是"点了没反应 / 字不消失 / 按钮不出现"，
 而日志里**什么都没**（连续 4 轮把已知会崩的版本带上真机，都是这个）。
- **正确写法**（骨架已内置）：
```lua
function OnUpdate(dt)
    local ok, err = pcall(tick, dt)
    if not ok then
        fail("OnUpdate 异常: " .. tostring(err))   -- fail(): 同一故障只报一次，块内含 首错/尝试数/交接值
    end
end
```
- **审查动作**：`node tools/check-lua-style.mjs`（error 级 `ONUPDATE_NO_PCALL`）。
