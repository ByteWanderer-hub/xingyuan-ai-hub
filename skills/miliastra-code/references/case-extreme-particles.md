# 极限粒子测试案例（真机跑通 · 可照抄代码）

> **来历**：千星奇域《夏日祭法师》—— **74 个角色全员同屏**互相打，每人 **3 个技能**（主/副/直线散射轮换），
> **26 套粒子外观** + 3 类图元形状 + 6 种随机死亡特效。**真机跑通**（创作者验收："不错，小卡"）。
> 这是目前**唯一一次把控件数推到 5000+ 的真机案例**，也是"特效预算"那条铁律的**证据来源**。
>
> **本文的代码不是转述** —— 全部由 `tools/extract-case-code.mjs` 从**真源码**逐字抽出，
> 每段都标了 `文件:行号`，可逐字复核。

---

## 目录

| 章节 | 内容 | 什么时候看 |
|---|---|---|
| **§0** | 规模数字（74 角色 / 1977 块头像 / 3200 粒子 / **5188 控件** / 真机"小卡"） | 想判"我这个规模真机能跑吗" |
| **§1** | ★★ **可增长粒子池**（池干抢最老 + 排队补建 + 分帧建 + 软上限） | ★ 特效"越玩越稀"、或要**提密度** |
| **§2** | 几何：**多段贝塞尔**求值 + 相似变换重定基 + 曲线/颜色采样 | 做弹道、曲线、任意图案 |
| **§3** | ★ **预存多套特效**（两套库 `varPrefix` / 按预设 id 索引 / 位置参数行） | 要给很多角色配不同外观、又不想多花控件 |
| **§4** | **图元驱动**（圆环 / 刀光 / 新月 —— 一个形状 = 1 个控件） | 做"形状类"特效 |
| **§5** | 粒子推进（每帧只改字段） | — |
| **§6** | 踩过的 **6 个坑**（真报错原文 + 根因 + 现在写在哪条铁律） | ★ 出 bug 时先对照这张表 |
| **§7** | **复现的最短路径**（命令序列 + 4 条可量化验收判据） | 要照做一遍 |

> ★ 本文代码全部由 `tools/extract-case-code.mjs`（在**工作区** `C:\Users\Administrator\Desktop\yuanshen\tools\`）
> 从**真源码**逐字抽取（不是转述、不是凭记忆重写）—— 每段都带 `文件:行号`，可复核。
> ★ **为什么用抽取而不是手抄**：手抄会漂。本轮就栽过一次 —— 报告里说"已补进某节"，
> 实际那次编辑只删了一个换行、内容一个字都没写进去，**是靠测试的子代理才发现的**。
> ⇒ 要沉淀代码就用脚本从真源码抽，**别靠复述**。

---

## 0. 这个案例的规模（先看数，再看代码）

| 项 | 数值 | 说明 |
|---|---|---|
| 角色 | **74** | 一个元素脚本持有一个元素的所有人（冰 14 / 水 13 / 火 11 / 风 11 / 雷 9 / 岩 8 / 草 8） |
| 技能 | **222** | 74 × 3（主 = 库1预设 / 副 = 库2预设101+ / 第三 = 直线散射） |
| 粒子外观 | **26 套** | 库1 13 + 库2 13（`varPrefix:"SPELL2"` 让两套同屏共存） |
| 图元形状 | **3 类** | 环刃 / 刀光 / 新月（**一个形状 = 1 个控件**） |
| 头像 | **1977 块** | cols=6 / pixelSize=4（每人 ~27 块） |
| 粒子池（初建） | **1494 颗** | 库1 954 + 库2 540 |
| 粒子池（**长上去的**） | **3200 颗** | 撞到 `SOFT_CAP` —— 实测需求 ~1670，公式预测 1665 |
| **同屏控件总数** | **5188** | 真机实测；`controlCount == controlCountPeak`（不失控） |
| 真机观感 | **"不错，小卡"** | ⇒ 创作者**拍板为软上限**（见 `vfx-particles-and-budget.md` §2） |
| 帧循环 | 每帧约 **3200 颗粒子 × 3 次 setter** | 位置 / 尺寸 / 颜色 |

★ **关键结论**：**一颗粒子 = 一个控件** ⇒ 特效的"量"直接等于控件数；
**3200 颗粒子 + 5188 控件在真机上只是"小卡"** ⇒ 别拿"每帧 70 次 setter"那种旧阈值当红线（见 L2-07 修订）。

---

## 1. ★★ 可增长粒子池（**这个案例最值钱的一段**）

**要解决的问题**：固定池子的 **供给 = 池 / 寿命**，而 **需求 = 施法者数 × 频率 × 每发颗数** ——
74 人时需求 **3720 颗/秒**、供给只有 **~3300 颗/秒** ⇒ 峰值一冲就干。
**而原来池干的行为是"整发直接空掉"，静默无日志** ⇒ 玩家只会说"效果少了点" ✗

**三步修法**（代码在下面）：
1. **池干 ⇒ 抢最老的那颗**（这一发照样发出来，**零控件成本**）
2. **同时排队补建** ⇒ 下几帧就不干了
3. **每帧最多建 `GROW_PER_FRAME` 颗**（分帧建，别一帧建几百个卡住）；`SOFT_CAP` 只防跑飞

### 1.1 增长机制的声明（⚠️ 必须写在读取者之前）

<!-- 源码：sources/夏日祭法师/特效.lua L342~347（6 行）-->
```lua
local GROW_PER_FRAME = 6
local SOFT_CAP = 3200
local growQueue = {}   -- [层] = 还欠几颗
local growTotal = 0
local growLogged = false

```

> ⚠️ **这五行原来写在 `takeParticle` 之后** ⇒ 运行期读到 nil。
> `node tools/check-lua-scope.mjs` 报 `L1771 UNDEF_READ 读 SOFT_CAP` 才抓到 ——
> **Lua 的 local 是词法作用域：声明晚于使用者 = 读到 nil 全局**（本工程最高发的 bug 类，见 R3）。

### 1.2 建一颗粒子（**唯一的建粒子处**）

<!-- 源码：sources/夏日祭法师/特效.lua L417~437（21 行）-->
```lua
local function newParticle(L)
    local tag = "spell/grow/" .. tostring(growTotal)
    local c = newImage(0, 0, 8 * s, 8 * s, 255, 255, 255, 0, tag)
    -- ★ 每个图片控件都必须自己指定图源：模板没贴图的话真机渲染成问号占位符
    c:SetImage(Enum.ImageSource.StaticReference, L.IMG or CFG.PIXEL_IMAGE)
    c:SetVisible(false)
    local q = {
        c = c, layer = L, active = false, t = 0, life = 1, delay = 0, mode = L.MOTION,
        px = nil, segs = 1,
        x = 0, y = 0, vx = 0, vy = 0, gx = 0, gy = 0,
        r0 = 255, g0 = 255, b0 = 255, r1 = 255, g1 = 255, b1 = 255,
        rot = 0, spin = 0, smin = 1, smax = 1, img = L.IMG or CFG.PIXEL_IMAGE,
    }
    if L.pool == nil then
        L.pool = {}
    end
    L.pool[#L.pool + 1] = q
    spellParticles[#spellParticles + 1] = q
    growTotal = growTotal + 1
    return q
end
```

### 1.3 取粒子：池干抢最老（**热路径，绝不 log**）

<!-- 源码：sources/夏日祭法师/特效.lua L366~384（19 行）-->
```lua
local function takeParticle(pool, L)
    local p = freeParticle(pool)
    if p ~= nil then
        return p
    end
    -- 池干了：这一发**照样发**（抢最老的），同时**排队补建** ⇒ 下几帧就不干了
    poolDry = poolDry + 1
    if L ~= nil and #spellParticles < SOFT_CAP then
        growQueue[L] = (growQueue[L] or 0) + 1
    end
    local oldest = nil
    for i = 1, #pool do
        local q = pool[i]
        if q.active and (oldest == nil or q.t > oldest.t) then
            oldest = q
        end
    end
    return oldest
end
```

### 1.4 每帧补建（分帧，防一帧建几百个）

<!-- 源码：sources/夏日祭法师/特效.lua L440~463（24 行）-->
```lua
local function growStep()
    if next(growQueue) == nil then
        return
    end
    local budget = GROW_PER_FRAME
    for L, need in pairs(growQueue) do
        while need > 0 and budget > 0 do
            if #spellParticles >= SOFT_CAP then
                growQueue[L] = 0
                break
            end
            newParticle(L)
            need = need - 1
            budget = budget - 1
        end
        growQueue[L] = need
    end
    if not growLogged and growTotal > 0 then
        growLogged = true
        log("粒子池**按需增长**：已补建 " .. tostring(growTotal) .. " 颗"
            .. "（总 " .. tostring(#spellParticles) .. " / 软上限 " .. tostring(SOFT_CAP)
            .. "，每帧最多 " .. tostring(GROW_PER_FRAME) .. " 颗）")
    end
end
```

> ★ **实测结果**：池子从 **1494 自己长到 3200**（+1706），与公式算出的需求 ~1670 对上了 ✓
> 撞到 `SOFT_CAP` 说明**需求 ≥ 上限** ⇒ 那是"该谈预算"的信号，不是设计上限。

---

## 2. ★ 几何：多段贝塞尔 + 相似变换重定基

**铁律**：**每一发都必须"从施法者身上发出、打在目标身上"** —— 图案只能改**控制点**，不许动端点。

### 2.1 多段贝塞尔求值（点数 = `4 + 3×(段数−1)`）

<!-- 源码：sources/夏日祭法师/特效.lua L191~209（19 行）-->
```lua
local function bezPath(p, prog)
    local n = p.segs or 1
    if n <= 1 then
        return bez1(p.px[1], p.px[3], p.px[5], p.px[7], prog),
            bez1(p.px[2], p.px[4], p.px[6], p.px[8], prog)
    end
    local f = prog * n
    local si = math.floor(f)
    if si >= n then
        si = n - 1
    end
    if si < 0 then
        si = 0
    end
    local t = f - si
    local b = si * 6 + 1
    return bez1(p.px[b], p.px[b + 2], p.px[b + 4], p.px[b + 6], t),
        bez1(p.px[b + 1], p.px[b + 3], p.px[b + 5], p.px[b + 7], t)
end
```

> 口径：**等分参数**，段内三次求值；`segs = (n−1)/3`。
> 生成端（`miliastra_gen` 的图元预设）用的是**同一口径** ⇒ 两边对得上账。

### 2.2 相似变换重定基（把"标准帧 (0,0)→(1024,0)"映到实际起点终点）

<!-- 源码：sources/夏日祭法师/特效.lua L265~267（3 行）-->
```lua
local function rebaseX(cx, ux, uy, px, py)
    return cx + px * ux - py * uy
end
```
<!-- 源码：sources/夏日祭法师/特效.lua L269~271（3 行）-->
```lua
local function rebaseY(cy, ux, uy, px, py)
    return cy + px * uy + py * ux
end
```

### 2.3 曲线采样与颜色插值（**位置参数与具名两种形态都吃**）

<!-- 源码：sources/夏日祭法师/特效.lua L228~248（21 行）-->
```lua
local function sampleCurve(curve, t, dflt)
    if curve == nil or #curve == 0 then
        return dflt
    end
    local pt, pv = curvePt(curve, 1)
    if t <= pt then
        return pv
    end
    for i = 2, #curve do
        local ct, cv = curvePt(curve, i)
        if t <= ct then
            local span = ct - pt
            if span <= 0 then
                return cv
            end
            return lerp(pv, cv, (t - pt) / span)
        end
        pt, pv = ct, cv
    end
    return pv
end
```
<!-- 源码：sources/夏日祭法师/特效.lua L251~260（10 行）-->
```lua
local function colorAt(c, i)
    if c == nil then
        return 255
    end
    local v = c[i]
    if v == nil then
        v = ({ c.r, c.g, c.b, c.a })[i]
    end
    return v or 255
end
```

---

## 3. ★ 预存多套特效：建一次、按 id 索引、运行时只改字段

**核心认识**：**建控件最贵、改字段最便宜** ⇒ 开局把 26 套外观**一次建好**，战斗中只改位置/尺寸/旋转/颜色/可见性。

### 3.1 建池（两套库 + 按预设 id 索引全部层）

<!-- 源码：sources/夏日祭法师/特效.lua L465~517（53 行）-->
```lua
local function buildSpellPools()
    local layers = 0
    local total = 0
    -- ★★ **两套层规格一起建**：库 1（主技能，预设 1..13）+ 库 2（副技能，预设 101..113）。
    --   两套都来自 `miliastra_gen op=vfx-lua`（库 2 用了 `varPrefix:"SPELL2"` ⇒ 变量名不撞）。
    --   库 2 的参数不同（更小的尺寸 / 更少的池）⇒ **副技能看起来和主技能不一样**。
    for lib, data in pairs({ [0] = SPELL_DATA, [100] = SPELL2_DATA }) do
    for li = 1, #data do
        local L = data[li]
        local kind = L.KIND or "bullet"
        local v = L.VARIANT or 1
        if pools[kind][v] == nil then
            pools[kind][v] = {}
        end
        L.pool = {}
        L.kind = kind
        layers = layers + 1
        local n = L.POOL or 8
        for i = 1, n do
            -- ★ 建一颗就调 newParticle（**池会增长**，所以建粒子的代码只有这一处）
            if newParticle(L) ~= nil then
                total = total + 1
            end
        end
        pools[kind][v][#pools[kind][v] + 1] = L
        -- 按预设 id 再索引一份（本命技能选层组用；同一层会同时出现在两个索引里，正常）
        -- ★ 库 2 的 id 整体 +100 ⇒ 主技能查 `pools.preset[1..13]`、副技能查 `[101..113]`
        local pid = (L.PRESET or 0) + lib
        if pid > lib then
            if pools.preset[pid] == nil then
                pools.preset[pid] = {}
            end
            pools.preset[pid][#pools.preset[pid] + 1] = L
        end
    end
    end
    -- ⚠️ `#pools.preset` 对**稀疏表**（键 1..13 与 101..113）是**未定义**行为（Lua 5.3 手册），
    --   实测只返回 13 ⇒ 日志会谎报"13 组"（其实 26 组）。这里**数一遍**，不用 `#`。
    local groups = 0
    for _ in pairs(pools.preset) do
        groups = groups + 1
    end
    log("技能粒子池就绪：层=" .. tostring(layers) .. " 粒子=" .. tostring(total)
        .. "（主技能库 1 + 副技能库 2，各 13 个预设；按预设 id 可索引的层组 "
        .. tostring(groups) .. " 组）")
end

-- ★★ **两段贝塞尔的甩法**（散射 × 多段贝塞尔的落点，创作者要求）。
--   把 (0,0)→(C,0) 拆成两段、**中点在 (C/2, 0)**，每段各甩各的方向角：
--     · 第 1 段的控制点按 `deg1` 甩  · 第 2 段的控制点按 `deg2` 甩
--   ⇒ 每颗弹自己走一条 **S 型/回勾**，而**起点仍是施法者、终点仍是目标**（铁律不破）。
--   为什么值得：单段三次贝塞尔只能弯**一次**（一个方向），两段才能"先往左上、再往右下"，
--   散射看起来才是"乱中有序"，而不是一束同向的弧。
```

**三个要点**：
1. `pairs({[0]=SPELL_DATA, [100]=SPELL2_DATA})` —— **两套层规格一起建**，`pid = PRESET + lib` 区分（0 / 100）
2. `L.pool = {}` + 循环 `newParticle(L)` —— **池是可增长的**，所以建粒子只有一处代码
3. `pools.preset[pid][…] = L` —— **"每人一个本命技能"靠它**：13 个预设的层本来就在，多一个索引 ⇒ **零额外控件**

### 3.2 位置参数解码（222 个技能不能写成 2200 行）

<!-- 源码：sources/夏日祭法师/特效.lua L548~575（28 行）-->
```lua
local function skillOf(code)
    local c = code or 0
    local idx = math.floor(c / 3)
    local which = c % 3
    local row = CHAR_SKILL[idx + 1]
    if row == nil or row == false then
        return nil, idx, which
    end
    local a = row[which + 1]
    if a == nil then
        return nil, idx, which
    end
    local fl = a[12] or 0
    local custom = nil
    if hasBit(fl, 8) then
        custom = "boom"
    end
    if hasBit(fl, 16) then
        custom = "weave"
    end
    return {
        preset = a[1], pattern = a[2], img = a[3], shots = a[4], spread = a[5],
        r1 = a[6], r2 = a[7], lift = a[8], slow = a[9], spin = a[10], stagger = a[11],
        size = a[13] or 1, per = a[14] or 2, path = a[15],
        tang = hasBit(fl, 1), rand = hasBit(fl, 2), useLayer = hasBit(fl, 4),
        custom = custom, curve = hasBit(fl, 32),
    }, idx, which
end
```

**字段序**（构建器写、运行时按位解码的**隐性契约**，加字段只能往末尾追加）：
```
1 preset / 2 pattern / 3 img / 4 shots / 5 spread / 6 r1 / 7 r2 / 8 lift
9 slow / 10 spin / 11 stagger / 12 flags / 13 size / 14 per（每发颗数）/ 15 path（可选）
flags 位：1=tang 2=rand 4=useLayer 8=custom:"boom" 16=custom:"weave" 32=curve（两段贝塞尔）
```
> ⚠️ **自定义钢笔必须是这一行的第 15 个元素**（写在同一个花括号里）。
> 写成平级元素 ⇒ 解码时 `row[2]` 拿到的是路径表，日志会打出 `预设=-420 形态=-260 发数=320` ✗

---

## 4. 图元驱动（一个形状 = 1 个控件）

### 4.1 建图元（每层 `1 + TRAIL` 个控件）

<!-- 源码：sources/夏日祭法师/特效.lua L850~882（33 行）-->
```lua
local function buildSprites()
    if SPELL_SPRITES == nil or spriteBuilt then
        return 0
    end
    spriteBuilt = true
    local n = 0
    for si = 1, #SPELL_SPRITES do
        local S = SPELL_SPRITES[si]
        local pid = S.PRESET or 0
        if spriteLayer[pid] == nil then
            spriteLayer[pid] = {}
        end
        spriteLayer[pid][#spriteLayer[pid] + 1] = S
        S.pool = {}
        local cnt = (S.TRAIL or 0) + 1
        for i = 1, cnt do
            local c = newImage(0, 0, 16 * s, 16 * s, 255, 255, 255, 0,
                "sprite/" .. tostring(S.ID) .. "/" .. tostring(i))
            -- ★ 每个图片控件都必须自己指定图源（模板没贴图 ⇒ 真机画 `?`）
            c:SetImage(Enum.ImageSource.StaticReference, S.IMG or CFG.PIXEL_IMAGE)
            c:SetVisible(false)
            local it = {
                c = c, L = S, active = false, t = 0, off = (i - 1) * (S.GAP or 0.1),
                life = 1, px = nil, segs = 1, smul = 1, r0 = 255, g0 = 255, b0 = 255,
                r1 = 255, g1 = 255, b1 = 255,
            }
            S.pool[#S.pool + 1] = it
            spriteItems[#spriteItems + 1] = it
            n = n + 1
        end
    end
    return n
end
```

### 4.2 放一组图元（起点终点同样是 施法者 → 目标）

<!-- 源码：sources/夏日祭法师/特效.lua L886~926（41 行）-->
```lua
local function castSprite(pid, x0, y0, x1, y1, tint, sizeMul)
    local g = spriteLayer[pid]
    if g == nil then
        return
    end
    local ux = (x1 - x0) / CFG.CANON_LEN
    local uy = (y1 - y0) / CFG.CANON_LEN
    for li = 1, #g do
        local S = g[li]
        local raw = S.PT
        if raw ~= nil then
            local pts = {}
            for k = 1, #raw, 2 do
                pts[k] = rebaseX(x0, ux, uy, raw[k], raw[k + 1])
                pts[k + 1] = rebaseY(y0, ux, uy, raw[k], raw[k + 1])
            end
            local lo = S.LIFE_MIN or 0.5
            local hi = S.LIFE_MAX or 0.8
            local life = lo + math.random() * (hi - lo)
            for i = 1, #S.pool do
                local it = S.pool[i]
                it.active = true
                it.t = 0
                it.life = life
                it.px = pts
                it.segs = math.floor((#raw / 2 - 1) / 3)
                if it.segs < 1 then
                    it.segs = 1
                end
                it.smul = sizeMul or 1
                if tint ~= nil then
                    it.r0, it.g0, it.b0 = tint.hot[1], tint.hot[2], tint.hot[3]
                    it.r1, it.g1, it.b1 = tint.cold[1], tint.cold[2], tint.cold[3]
                else
                    it.r0, it.g0, it.b0 = colorAt(S.C0, 1), colorAt(S.C0, 2), colorAt(S.C0, 3)
                    it.r1, it.g1, it.b1 = colorAt(S.C1, 1), colorAt(S.C1, 2), colorAt(S.C1, 3)
                end
            end
        end
    end
end
```

### 4.3 每帧驱动（位置 / 拉伸 / **对齐切向** / 颜色）

<!-- 源码：sources/夏日祭法师/特效.lua L928~965（38 行）-->
```lua
local function updateSprites(dt)
    for i = 1, #spriteItems do
        local it = spriteItems[i]
        if it.active then
            it.t = it.t + dt
            local prog = (it.t - it.off) / it.life
            if prog >= 1 then
                it.active = false
                it.c:SetVisible(false)
            elseif prog >= 0 then
                local S = it.L
                local x, y = bezPath(it, prog)
                local base = (S.SIZE or 120) * sampleCurve(S.SIZE_CURVE, prog, 1) * it.smul
                local wx = base * (S.STRETCH_X or 1) * sampleCurve(S.WIDTH_CURVE, prog, 1)
                local wy = base * (S.STRETCH_Y or 1) * sampleCurve(S.HEIGHT_CURVE, prog, 1)
                local rot = math.rad(sampleCurve(S.SPIN_CURVE, prog, 0))
                if S.ALIGN == "tangent" then
                    -- ★ **对齐切向**：用路径上前后两个采样点的差分当切线 ⇒ 刀刃永远朝着飞行方向
                    local ex, ey = bezPath(it, prog + 0.02 > 1 and 1 or prog + 0.02)
                    if ex ~= x or ey ~= y then
                        rot = rot + atan2(ey - y, ex - x)
                    end
                end
                local alpha = clamp(sampleCurve(S.ALPHA_CURVE, prog, 1), 0, 1)
                it.c:SetAnchoredPosition(x, y)
                it.c:SetSizeDelta(wx, wy)
                it.c:SetLocalRotation(0, 0, rot)
                it.c.imageColor = Color.FromRGBA(
                    math.floor(lerp(it.r0, it.r1, prog)),
                    math.floor(lerp(it.g0, it.g1, prog)),
                    math.floor(lerp(it.b0, it.b1, prog)),
                    math.floor(255 * alpha))
            else
                it.c:SetVisible(false)
            end
        end
    end
end
```

> ⚠️ **切向旋转要自己写 `atan2`** —— **Lua 5.3 删掉了 `math.atan2`**（沙箱版本不由我们挑）。
> 该案例栽过一次：`attempt to call a nil value (field 'atan2')`。
> ⚠️ **真机未验项**（插件自己标 `unverified`）：`SetLocalRotation` 的**正负号**、
> `Enum.ImageType.Stretch` 的缩放行为、拉伸后的采样质量。

---

## 5. 粒子推进（每帧只改字段）

<!-- 源码：sources/夏日祭法师/特效.lua L1205~1251（47 行）-->
```lua
local function updateParticles(dt)
    for i = 1, #spellParticles do
        local p = spellParticles[i]
        if p.active then
            p.t = p.t + dt
            if p.t >= 0 then
                local prog = p.t / p.life
                if prog >= 1 then
                    p.active = false
                    p.c:SetVisible(false)
                else
                    local L = p.layer
                    local x = p.x
                    local y = p.y
                    if p.mode == "bezier" then
                        local bx, by = bezPath(p, prog)
                        x = bx
                        y = by
                    else
                        p.vx = p.vx + p.gx * dt
                        p.vy = p.vy + p.gy * dt
                        x = p.x + p.vx * dt
                        y = p.y + p.vy * dt
                        p.x = x
                        p.y = y
                    end
                    local base = p.smin + (p.smax - p.smin) * prog
                    local shaped = base * sampleCurve(L.SIZE_CURVE, prog, 1)
                    local size = shaped * CFG.SPELL_SIZE * s * (p.smul or 1)
                    if size < 3 then
                        size = 3
                    end
                    local alpha = clamp(sampleCurve(L.ALPHA_CURVE, prog, 1), 0, 1)
                    p.rot = p.rot + p.spin * dt
                    p.c:SetAnchoredPosition(x, y)
                    p.c:SetSizeDelta(size, size)
                    p.c:SetLocalRotation(0, 0, p.rot)
                    p.c.imageColor = Color.FromRGBA(
                        math.floor(lerp(p.r0, p.r1, prog)),
                        math.floor(lerp(p.g0, p.g1, prog)),
                        math.floor(lerp(p.b0, p.b1, prog)),
                        math.floor(255 * alpha))
                end
            end
        end
    end
end
```

---

## 6. 这个案例踩过的坑（**每一条都是真报错原文**）

| # | 现象 | 根因 | 现在写在哪 |
|---|---|---|---|
| 1 | `夏祭冰.lua:530: attempt to index a nil value (field 'hpBar')` ⇒ `控件累计=0`（**整块冻死**） | 砍 UI 时只给**创建**分支加了`CFG.SHOW_UI and`，**调用它的 `else` 分支还在** ⇒ 每次 spawn 走 `refreshHp(f)` ⇒ pcall 抓 ⇒ `failDone` ⇒ 此后每帧 tick 直接 return | 守卫要加在**被调函数自己**里 |
| 2 | `check-lua-scope` 报 `UNDEF_READ 读 SOFT_CAP` | 声明写在读取者之后（本文 §1.1） | R3 |
| 3 | 元素脚本只出 7 个人（`控件累计=178`） | `SLOT_MAX = 7` 没跟着主控的 `SPAWN_COUNT` 改 ⇒ **只遍历前 7 个槽** | 改成**构建期注入**，两边同一个数 |
| 4 | `attempt to call a nil value (field 'atan2')` | Lua 5.3 删了 `math.atan2` | 自带可移植 shim，**声明在用到它之前** |
| 5 | `'}' expected near 'petal'` | 编排里传了**预设名**而不是数字 id | 构建时 `Number.isInteger` 断言 |
| 6 | 日志打出 `预设=-420 形态=-260 发数=320` | 路径表写成了行的**第二个元素** | 同一行的**位置参数契约** + 括号配平自检 |

★ **#1 与 #2 是同一个 bug 类的两种面貌 —— "名字读到了 nil"**：
前者**运行期**（pcall 抓住 ⇒ 整块冻死），后者**静态**（门禁抓住）⇒ **改完必跑两道门，别靠看。**

---

## 7. 复现这个案例的最小路径

```powershell
# ① 生成（插件）：一个预设 = 若干层，每层给全参数
miliastra_gen {op:"vfx-lua", preset:"star-scatter", output:"data", particlesPerEmitter:36}
miliastra_gen {op:"vfx-lua", preset:"star-scatter", output:"data", varPrefix:"SPELL2", sizeScale:0.62, particlesPerEmitter:20}
miliastra_gen {op:"vfx-lua", preset:"slash-arc",   output:"data"}     # 图元：刀光

# ② 构建：层 → 紧凑 Lua 表 → 注入运行时骨架（`-- @@SKILLS@@` 标记）
node tools/make-skills.mjs --bulletPool=36 --burstPool=36 --ambientPool=6
node tools/make-skills.mjs --out=技能数据2.lua --prefix=SPELL2 --bulletPool=20 --burstPool=20 --ambientPool=4 --sizeScale=0.62
node tools/build-mage-battle.mjs --cols=6 --pixel=4 --image=<图片模板> --text=<文本框模板> --container=<容器节点>

# ③ 三道门 + 模拟器（**deploy 之前**）
miliastra_code {op:"preflight", dir:"<工程目录>"}
node tools/check-lua-scope.mjs  code/<玩法>/<产物>.lua
node tools/check-lua-style.mjs --baseline code/<玩法>/<产物>.lua
miliastra_sim {op:"bind", containerId:<容器节点>, runForMs:16000, ...}   # 看 controlCount + 有没有 lua-error

# ④ 部署 → 编辑器存盘 → 人点试玩（真机帧率只能这里拿）
miliastra_code {op:"deploy", level:"<关卡ID>", file:"<活文件名>", source:"<本地产物>"}
```

**验收判据**（可量化）：
- `miliastra_sim` 的 `controlCount` **与峰值相等**（不失控）且落在预算内
- `run.logs` 里**没有** `首错=` / `attempt to index`
- 连续 60 秒高频施法，**每帧活跃粒子数 ≥ 池上限的 90%**（池没被抽干）
- **真机帧率** —— 模拟器不覆盖，只能人点试玩（`miliastra_probe template:"perf"` 取数）
