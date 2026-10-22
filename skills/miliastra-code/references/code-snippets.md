# 可直接打入的代码片段（全部来自真机跑通的《侦探杀》✓）

> 用法：**整段复制** ✓，只改变量名/信号名/`mappingId` ✓。
> ⭐ 这些片段的共同设计：**新值优先 · 旧值兜底 · 没有就纯 no-op** ✓ —— 这样"加新通道"永远**不会弄坏现状** ✓。

---

## 0 · 图片控件当**真进度条**用（剩余次数 / 血量 / 进度条）

> 来源：2026-09-29 批量测试中由 `api-client-ui.md` 查到 ⇒ **`evidence_source: documented`** ✓
> **`device_status: pending`** ⚠️ —— **未真机验过** ✓ 用之前先跑一次（或在模拟器里看一眼 ✓）。

要"剩余切割次数 / 血量 / 关卡进度"这类条，**别拿文字硬凑** ✗（跳数字 + 手算宽度 ✓ 又丑又容易错 ✓）
—— 图片控件自带**填充量 + 四种填充方向** ⇒ 可以做成**真进度条** ✓：

```lua
-- ① 填充量（文档标注 Tweenable ✓ 可直接做动画）
img.fillAmount = 0.35                        -- 0 ~ 1
-- ② 填充方向（四选一）
img:SetFillHorizontal(true)                  -- 水平（最常用：次数/血量条）
-- img:SetFillVertical(true)                 -- 垂直
-- img:SetFillRadial90(true)                 -- 径向 90°
-- img:SetFillRadial180(true) / img:SetFillRadial360(true)   -- 径向 180° / 360°
```

⚠️ 三条纪律 ✓：
1. **先按文档写、真机验一次** ✓（本条是 `documented` ✗ 不是 `observed` ✓）；
2. 条的**长度/颜色/数值**都从**同一张常量表**取 ✓（别裸写 ✓ 见 `miliastra-ui` UI1 ✓）；
3. 每帧改 `fillAmount` **也算 setter** ✓ ⇒ 计入 UI 侧每帧预算 ✓（推荐档 ≤120 次/帧 ✓）。

---

## 1 · 读自定义变量（客户端：**能读不能写** ✓）

```lua
-- 只查一次枚举（三个成员：Level / PlayerSelf / AvatarSelf ✓）
-- ★ 2026-10-02 真机：**PlayerSelf 已验证可读**，且「实体」类型的变量读出来**就是 number** ⇒ 见 §9
--   PlayerSelf 另见 dialog-template-patterns.md 的对话/任务工程；AvatarSelf 不能随之认定已实测。
-- ⚠️ 别写 .Player / .Self（名字靠猜 ⇒ 全 nil ⇒ 会误判成"只有 Level" ✗ —— 2026-09-29 真翻过这个车）
local enum_ = Enum.CustomVariableEntityType

local function gv(name)
    local ok, v = pcall(function() return game.GetGlobalCustomVariableValue(enum_.Level, name) end)
    if ok then return v end
    return nil
end
```
要点：**读到的是带类型的值** ✓（整数/字符串/布尔/表 ✓ 不是字符串 ✗）；
**整数取不到 = −2147483648** ✓；`pcall` 包住（名字不存在可能抛错 ✓）。

---

## 2 · 监听变量变化（回调**实时响** ✓ 但**不带值** ✗）

```lua
script:RegisterCustomVariableChangedHandler(enum_.Level, "侦_名声",
    function(et, name)
        -- ⚠️ 回调**不给新值** ✗ ⇒ 必须**再读一次** ✓
        local now = game.GetGlobalCustomVariableValue(et, name)
        if now ~= nil then ... end
    end)
```

---

## 3 · 发服务器信号（**按数据类型**分信号 ✓ 参数 = 名称 + 数值 ✓）

```lua
local varLast = {}                 -- 去重：值没变就不发 ✓（别每帧发 ✗）
local sigFail = 0
local function sigFailOnce(what, err)
    sigFail = sigFail + 1
    if sigFail <= 3 then log("变量信号 " .. what .. " 发送失败（第 " .. sigFail .. " 次）：" .. tostring(err)) end
end

local function setVarInt(name, v)
    local key = "i" .. tostring(math.floor(tonumber(v) or 0))
    if varLast[name] == key then return end
    varLast[name] = key
    local ok, err = pcall(function()
        local sig = game.ServerSignal("侦_整数")     -- ⚠️ 名字必须与服务端信号管理器**逐字一致** ✓
        sig:AddString(name)                          -- 参数 1 = 名称（字符串）
        sig:AddInt(math.floor(tonumber(v) or 0))     -- 参数 2 = 数值（整数）
        sig:SendSignal()
    end)
    if not ok then sigFailOnce(name, err) end
end

local function setVarStr(name, s)    -- 信号 "侦_字符串" + AddString(name) + AddString(s)
    local key = "s" .. tostring(s or "")
    if varLast[name] == key then return end
    varLast[name] = key
    local ok, err = pcall(function()
        local sig = game.ServerSignal("侦_字符串")
        sig:AddString(name)
        sig:AddString(tostring(s or ""))
        sig:SendSignal()
    end)
    if not ok then sigFailOnce(name, err) end
end

local function setVarBool(name, b)   -- 信号 "侦_布尔值" + AddString(name) + AddBool(b)
    local key = "b" .. tostring(b and true or false)
    if varLast[name] == key then return end
    varLast[name] = key
    local ok, err = pcall(function()
        local sig = game.ServerSignal("侦_布尔值")
        sig:AddString(name)
        sig:AddBool(b and true or false)
        sig:SendSignal()
    end)
    if not ok then sigFailOnce(name, err) end
end

-- 列表**一次设完**（绕开"逐条追加会累加"的坑 ✓）；只用"覆盖"信号 ✓，"新增"那条不用 ✗
local function setVarStrList(name, list)
    if type(list) ~= "table" or #list == 0 then return end     -- 空表跳过（别把已有值清空 ✗）
    local parts, i = {}, nil
    for i = 1, #list do parts[#parts + 1] = tostring(list[i]) end
    local key = "L" .. table.concat(parts, "\1")
    if varLast[name] == key then return end
    varLast[name] = key
    local send = {}
    for i = 1, #list do send[i] = tostring(list[i]) end
    local ok, err = pcall(function()
        local sig = game.ServerSignal("侦_字符串列表")
        sig:AddString(name)
        sig:AddStringList(send)                 -- ⭐ 官方 API ✓（整数表用 AddIntList ✓）
        sig:SendSignal()
    end)
    if not ok then sigFailOnce(name, err) end
end
```

---

## 4 · 节点图：**通用"按名字设变量"**（一次建好，以后加字段不用改 ✓）

```
监听信号(侦_整数) ─┬─ 名称 ──→ 设置自定义变量.变量名
                   └─ 数值 ──→ 设置自定义变量.变量值
                               ├ 目标实体        = **关卡实体**（写死 ✓ 别用"事件源实体" ✗）
                               └ 是否触发事件    = **是** ✓（关了 Lua 回调不响 ✗）
```
**五条必须做对的细节**（错一条就静默失效 ✗）：① 参数顺序逐字一致 ✓ ② 目标=关卡实体 ✓
③ 是否触发=是 ✓ ④ **客户端发来的信号，接收端看到的「来源实体」恒为关卡实体**（**不是**玩家实体 —— 2026-10-02 创作者实测）⇒ 图上直接指定关卡实体或用「以GUID查询实体」(换图会变 ✗ 留注释 ✓)；⚠️ **想区分"是哪个玩家发的"做不到**（客户端侧也取不到玩家实体 ⇒ 详见 `engine-boundaries.md` #37）⑤ 列表只用"覆盖" ✓

---

## 5 · ⭐ 读取端"提前布点"（今天最有用的一招 ✓）

> 让读端**先接上新通道**、但**新值没来就保持旧行为** ✓ ⇒ 加通道**零风险** ✓，而且对面一建好就**自动生效** ✓✓

```lua
-- 定义**必须在 kv 之前**（后面的 local 不会被前面的闭包捕获 ✗ —— 本工程最高发的坑 ✓）
local varHitLast = -1
local function applyVars(t)
    if t == nil then return end
    local ok, enum_ = pcall(function() return Enum.CustomVariableEntityType end)
    if not ok or enum_ == nil then return end
    local function gv(name)
        local ok2, v = pcall(function() return game.GetGlobalCustomVariableValue(enum_.Level, name) end)
        if ok2 then return v end
        return nil
    end
    local hit = 0
    -- 列表类：按**原字符串口径**拼回去 ⇒ 下游渲染零改动 ✓
    local vNames = gv("侦_名单")
    if type(vNames) == "table" and #vNames >= 1 then
        local parts = {}
        local vi
        for vi = 1, #vNames do parts[#parts + 1] = tostring(vi) .. ":" .. tostring(vNames[vi]) end
        t.names = table.concat(parts, "|")
        hit = hit + 1
    end
    -- 单值类：类型对上才覆盖 ✓（nil / 类型不符 ⇒ **保持旧值** ✓ = 纯 no-op）
    local map = { { "侦_关卡", "lv" }, { "侦_剩余邪恶", "evil" } }
    local pi
    for pi = 1, #map do
        local v = gv(map[pi][1])
        if type(v) == "number" then
            t[map[pi][2]] = tostring(math.floor(v)); hit = hit + 1
        elseif type(v) == "string" and v ~= "" then
            t[map[pi][2]] = v; hit = hit + 1
        elseif type(v) == "boolean" then
            t[map[pi][2]] = v and "1" or "0"; hit = hit + 1
        end
    end
    -- ⭐ 只在**命中数变化**时打一行（不刷屏 ✓ 但看得见 ✓）—— "N 从 0 跳起来"就是通道通了的铁证 ✓
    if hit ~= varHitLast then
        varHitLast = hit
        print("[xx/" .. SELF .. "] 变量通道命中 " .. tostring(hit) .. " 个字段")
    end
end

local function kv(text)                     -- 挂在原来的解析入口上 ✓
    local t = {}
    for k, v in string.gmatch(text or "", "([%w_]+)=([^;]*)") do t[k] = v end
    applyVars(t)                            -- ★ 解析完再覆盖 ✓
    return t
end
```

---

## 6 · ⭐ `Invoke` 直推（即时反馈 / 指令的正解 ✓ 当帧同步 ✓）

```lua
-- 发送方（任意客户端脚本 ✓）
local ids = { 1073741838, 1073741828, 1073741830 }   -- ⚠️ 必须包含**真正的渲染者** ✓（先 grep 渲染点确认 ✗ 别按模块名猜 ✗）
if varLast["__push"] ~= s then
    varLast["__push"] = s
    local i
    for i = 1, #ids do
        local ok, err = pcall(function()
            local c = ROOT:GetScript(ids[i])          -- mappingId 从 .gil 的 mappings[] 读 ✓
            if c ~= nil and c.alive then c:Invoke("SetX", s) end
        end)
        if not ok then sigFailOnce("直推" .. i, err) end   -- ⚠️ 失败**只打日志** ✓（不兜底黑板 ✗）
    end
end
```
```lua
-- 接收方（被调函数**必须全局** ✓ 不加 local ✗）
local xPush = nil
function SetX(s)
    if type(s) == "string" and s ~= "" then xPush = s end
end
-- 渲染时**直推优先**、旧来源兜底（控件删了也不会坏 ✓）
local mnow = xPush or tostring(t.msg or "")
```

---

## 7 · 状态串"整串直推"（让黑板控件彻底退休 ✓）

```lua
-- ① 三个读端各装接收端（同上写法，函数名 SetState）
local statePush = nil
function SetState(s) if type(s) == "string" and s ~= "" then statePush = s end end

-- ② 读端解析源换成（控件只当兜底 ✓）
raw = statePush or boardState.text or ""

-- ⚠️ ③ 删控件前**必须**补这条护栏，否则一删控件就**整块不渲染** ✗✗
if boardState == nil and statePush == nil then return end

-- ④ 主控推送（只在串变化时 ✓）
if txt ~= nil and txt ~= "" and varLast["__statePush"] ~= txt then
    varLast["__statePush"] = txt
    ... Invoke("SetState", txt) 给三个读端 ...
end
```
⇒ 做完这四步，**名单/格文案/cells/judge/camp…全在串里** ⇒ **一次全部脱离黑板** ✓✓（不用逐字段搬 ✓）

---

## 8 · ⚠️ 两个"静默失效"级坑（照抄规矩，别重犯 ✗）

```lua
-- ✗ 反面：writeState 里**没有** elog 这个名字 ⇒ Lua 读未定义名 = nil ✓ **不报错** ⇒ 守卫永远跳过 ✗✗
if elog ~= nil and elog ~= "" then ...推送... end
-- ✓ 正面：用本作用域**真有**的来源现拼 ✓
local elogStr = table.concat(G.elog or {}, "\n")
if elogStr ~= "" then ...推送(elogStr)... end
```
- 症状：功能**完全没用** ✓ 而门禁/其余日志**全绿** ✗（`check-lua-scope` 抓不到未定义全局 ✗）
- **一秒定位**：在**守卫内侧**打一行日志 ✓（"该出现的一行都没有"＝没进守卫 ✓）
- 第二条：`Invoke` **推给真渲染者** ✓（推错**不报错也不生效** ✗ 还容易误判成修好了 ✗）⇒ 先 grep 渲染点 ✓

---

## 9 · ★ 从「玩家自身」变量取实体并回传（2026-10-02 真机跑通 ✓）

> 场景：客户端要把"我是哪个玩家"告诉服务端。**客户端没有任何"取实体 / 取 GUID"的 API**（文档双向 grep 零命中）⇒
> 唯一正解是 **服务端喂、客户端读**。反例清单与实测边界见 `engine-boundaries.md` #37 / #38 / #40。

**服务端侧**（节点图，人搭；`.gil strings` 里能查到这些节点名）：
`[事件]指定实体创建时` → `[变量]设置特定实体自定义变量`
→ 作用域 **玩家自身**、变量名自定（本案例叫"玩家自身"）、**类型选「实体」**、值 = 玩家实体。

**客户端侧**（可照抄；✓ 表示真机验过）：

```lua
local READY_SIGNAL = "客户端初始化完成"   -- 握手信号名（与信号管理器逐字一致）
local PLAYER_ID_VAR = "玩家自身"          -- ★ **变量名**（不是作用域名！两者可能中文同名）

-- 从「玩家自身」作用域取实体。✓ 实测：**实体类型的变量读出来就是 number**（读到 11）
local function readPlayerId()
    local scopeOk, scope = pcall(function() return Enum.CustomVariableEntityType["PlayerSelf"] end)
    if not scopeOk or scope == nil then return nil end
    local ok, v = pcall(function() return game.GetGlobalCustomVariableValue(scope, PLAYER_ID_VAR) end)
    if not ok or v == nil then return nil end          -- ★ 读不到**不报错**，只返回 nil ⇒ 必须自己判
    if type(v) == "number" then return math.floor(v) end
    local n = tonumber(v)
    if n ~= nil then return math.floor(n) end
    return nil
end

-- 握手：告诉服务端"我已经能收了"，并带上自己是谁
local function sendReady()
    local id = readPlayerId()
    if id ~= nil then
        local ok = pcall(function()
            local sig = game.ServerSignal(READY_SIGNAL)
            sig:AddEntity(id)            -- ★ 值必须是 number；传枚举项真机报 `number expected, got EnumItem`
            sig:SendSignal()
        end)
        if ok then return end
    end
    -- 降级：不带参数也要把握手发出去（宁可参数不全，也别让握手发不出去）
    pcall(function()
        local sig = game.ServerSignal(READY_SIGNAL)
        sig:SendSignal()
    end)
end
```

**三条硬要求（错一条就静默失效 ✗，而且日志里只有一行 nil）**：

1. **顺序**：`install()` 里**先** `RegisterServerSignalHandler`、**成功了再** `sendReady()` ——
   反过来（先握手后注册）等于没修：服务端秒回的那一发照样丢（**信号是瞬时事件，错过无法补问**）。
2. **作用域别建错**：变量必须建在**「玩家自身」**作用域。建在「关卡」下 ⇒ 客户端读 `nil`**且不报错**。
   排查口诀：**同名的"玩家自身"有两个 —— 作用域（枚举，收枚举 ✓）和变量名（字符串）**。
3. **`AddEntity` 的值必须是 `number`**：客户端→服务端的信号，**接收端来源实体是「关卡实体」**（不是玩家），
   所以"靠来源认人"也不成立（见 `engine-boundaries.md` #37）。

---

## 10 · 改完必跑的三道门禁（error 红 / 基线变差 **不许 deploy** ✗）

```bash
node scripts/lua-check.mjs scope <文件>                                   # 作用域（声明在后面的 local ✓）
node scripts/lua-check.mjs style <文件或目录> --baseline <基线.json>                        # 风格（error 必过 + 不许比基线差 ✓）
miliastra_code op=lint-ui                                 # 动过界面才跑：画在哪=点哪算 / 8 倍数 / 字号档 / 行高 ≥ 字号×1.4 ✓
```

⚠️ **`preflight` 的两个已知误报（别为它们改代码）**：

1. **`IMAGE_WITHOUT_SOURCE`** —— 对**复合模板（组）**必然误报：判据假设"用了 `InstantiateClientUIControl` 就必须 `SetImage`"，
   而复合模板的图源在**模板内部**。**先读 `why` 再下结论**。
2. **"全局写"** —— 只要写了 `local x`（**不带 `=`**）再在缩进里赋值（`x = …`），就会被报成"运行期给全局赋值 —— 真机上不生效"。
   2026-10-02 两次真踩（`local on` / `local txt`），**代码明明是对的**、门禁 `scope` 也全过。
   **过法**：`local x = nil`（带等号）——纯写法问题，不是 bug、也不是真的全局写。
⚠️ **部署闭环**：`deploy（显式 level + file）` → **编辑器存盘** → 试玩 ✓
（deploy 只写活文件 ✗；游戏跑的是 `.gil` 里存盘那一刻的快照 ✓）；
试玩前用 `miliastra_map op=script` 确认 `match: true` ✓ —— **`match` 为 false 就别让人试玩** ✗（白费一轮 ✓）

---

## 11 · UI 拖拽（2026-10-13 真机跑通 ✓ 已抽象成 `bindDrag`）

**⚠️ 先过铁律 `L2-06` 的两个硬前置**：① 祖先容器 `showCursor = true`；② **接收事件的控件必须是「预设按钮」或「光标检测区域」**
—— 容器 / 图片 / 文本框**都没有** `AddCursorEventListener`（`api-client-ui.md` L584-596 的 11 种控件里只有这两种有，方法表 L791-795 / L811-815）。
**惯用解法：在要拖的容器里放一个「光标检测区域」覆盖整块，事件绑它、位置改外层容器**（分层和你"拖动的是谁"都不变）。

```lua
-- 一个调用搞定：拖「少女签名」进「破洞」⇒ 自动吸附 + 换名字
bindDrag("少女签名", {
    eventCtrl = "光标检测区域",   -- 收事件的控件（省略 = 自己/直接子控件自动找）
    dropZone  = "破洞",           -- 放置区（给了才做"拖进去"判定 + 吸附）
    onDrop    = function()
        setActiveByName("祖母名字", false)   -- 关掉
        setActiveByName("玩家名字", true)    -- 打开
    end,
})
```

**坐标口径（`api-client-ui.md` L613-615）**：只有 `anchoredPositionX/Y`（**相对父级中心**，y **向上为正**）和 `sizeDeltaX/Y`，
**没有世界坐标字段** ⇒ 判定"是否拖进区域"要求**两者同一父级**（同父级时 `anchoredPosition` 可直接相减比较，无需换算）。

**事件与数据（L426-428 / L817-832）**：三件套 `CursorBeginDrag` / `CursorDrag` / `CursorEndDrag`；
`data:GetPressUIPos()` = 按下时光标坐标、`data:GetUIPos()` = 当前坐标、`data:GetUIPosDelta()` = 本次位移。

**★ 写拖拽最容易错的两点**：

1. **别累加 `GetUIPosDelta()`** —— 会累积漂移。正解：**按下时记下（光标坐标 + 控件位置），拖动中用 `GetUIPos()` 算总位移再绝对定位**。
2. **`AddCursorEventListener` 是【追加】不是替换** ⇒ 重复绑定会"拖一次触发好几次" ⇒ **绑之前先 `RemoveCursorEventListeners(类型)`**（要包 `pcall`：没绑过时它会抛错）。

**工具里已备好**（展开 `qxtools` 即有）：`bindDrag` / `findCursorCapable`（查控件有没有光标方法）/ `isCtrlInsideCtrl`（同父级"中心点是否在矩形内"）
/ `ensureShowCursor` + `restoreShowCursor`（**自动开 `showCursor` 并记原值**、用完还原 —— 常开会让鼠标指针一直显示，是全局观感）。
