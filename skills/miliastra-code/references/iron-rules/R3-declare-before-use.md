# R3 函数/变量声明必须早于使用（否则闭包读到 nil）

> 归属：`miliastra-code` 机械可查铁律｜从 `iron-rules-lua.md` 拆出（内容未改）


- **真实事故**（同一天三次）：`local C_PANEL` 写在 `build()` 里、`local curStage/blinkT` 写在 `animTick()` **之后** ⇒
  另一个函数读的是**全局 nil** ⇒ `pcall → fail → failDone=true` ⇒ 此后每帧 tick 第一行就 `return`，
  **一次冻结焊出三个"看起来无关"的 bug**（翻卡不动 + 提示条不消失 + 结算按钮不出现）。
- **正确写法**：每帧要用的状态变量声明在**最早使用它的函数之前**；要"前面调后面"时用**前置声明 + 赋值**：
```lua
local restartToLevel1          -- ① 先声明槽位
local function loadLevel(i)    -- 闭包捕获的是这个槽位
    restartToLevel1()
end
restartToLevel1 = function()   -- ② 再赋值（用 local function 会新建槽位，闭包抓不到）
end
```
- **审查动作**：`node tools/check-lua-scope.mjs`（会报"这个名字在第 N 行声明过"）。
