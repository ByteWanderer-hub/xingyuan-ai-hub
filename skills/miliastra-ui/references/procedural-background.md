# 程序化动态背景范本（千星奇域 · 纯 Lua，不用美术）

> 实测来源：**《侦探杀》地图 `1073741835`**，真机截图通过（创作者认可："现在背景不错"）。
> 用途：不想/没有合适背景美术时，用**已确证可用的图片资产 + 每帧插值**做出"有氛围的活背景"。
> 需求出处：创作者原话「背景不要透明，直接整个有意思的背景」「星星能动起来，缓慢的动」。
> **更新**：代码块已按规范整改后的写法同步（续行改**缩进式**、`pcall` 失败必须有去向），与《侦探杀》`view.lua` 现状一致。

---

## 1. 四条硬约束（不满足就会失败）

| 约束 | 实测事实 |
|---|---|
| **① 整屏单块图片控件不渲染** | `1600×1000` 的图片控件写进去不报错、**画面上是空的**（面板 `480×468` 正常）。⇒ 全屏底必须**拼块**（本范本用 4 块 `800×500`） |
| **② 方块色块很丑** | 用可着色底片 `100001` 铺大色块 = 生硬矩形。⇒ 柔光要用**素材「光晕」`106004`**、星点用**素材「星」`105034`**（两张都已验证能作静态图源） |
| **③ 每帧狂写 API 会拖慢** | 32 星 + 4 光晕 ≈ 每帧 70+ 次 `SetAnchoredPosition/imageColor`。⇒ 背景更新**限频到 ~20fps**（累积 dt，>0.05s 才动） |
| **④ 创建顺序 = 绘制层级** | 后建的在上层。背景必须**最先建**；结果面板、按钮等"要压最上面"的东西**最后建**。（实战两次踩坑：角图盖住格子文字、结果面板盖住按钮） |

---

## 2. 可直接抄的代码

```lua
-- 素材图资产（可用作 StaticReference 的已验证清单）
local IMG_BASE = 100001    -- 可着色底片（当纯色块用）
local IMG_GLOW = 106004    -- 光晕（柔和椭圆）
local IMG_STAR = 105034    -- 星

local washes, particles = {}, {}
local pt, bgAcc = 0, 0

local function buildBackdrop(add)        -- add(name, kind, x, y, w, h, color, assetId)
    -- ① 全屏底：4 块拼（整屏单块在真机不渲染）
    add("bg1", "img",   0,   0, 800, 500, { 12, 14, 26 })
    add("bg2", "img", 800,   0, 800, 500, { 12, 14, 26 })
    add("bg3", "img",   0, 500, 800, 500, { 12, 14, 26 })
    add("bg4", "img", 800, 500, 800, 500, { 12, 14, 26 })

    -- ② 柔光：4 团，大尺寸低透明度，缓慢漂移 + 呼吸胀缩
    local wdef = {
        { "wash1", {  40,  56, 128 },  420, 320, 860, 0.34 },
        { "wash2", { 104,  48, 112 }, 1200, 660, 900, 0.28 },
        { "wash3", {  24,  84, 104 },  820, 180, 720, 0.24 },
        { "wash4", { 150, 108,  44 },  260, 700, 640, 0.18 },
    }
    for i = 1, #wdef do
        local d = wdef[i]
        local it = add(d[1], "img", d[3] - d[5] / 2, d[4] - d[5] / 2, d[5], d[5], d[2], IMG_GLOW)
        if it then washes[i] = { it = it, cx = d[3], cy = d[4], r = d[5], peak = d[6], ph = i * 1.7 } end
    end

    -- ③ 星尘：28 颗，12~34 px/s 缓慢上浮 + 左右横摆 + 闪烁
    for i = 1, 28 do
        local px = (i * 173) % 1560 + 20
        local py = (i * 293) %  960 + 20
        local sz = 10 + (i % 4) * 5
        local it = add("p" .. i, "img", px, py, sz, sz, { 245, 240, 234 }, IMG_STAR)
        if it then
            particles[i] = {
                it = it, x = px, y = py, v = 12 + (i % 6) * 4,
                sway = 8 + (i % 5) * 3, ph = (i % 7) * 0.9,
            }
        end
    end
end

local function bgTick(dt, toX, toY)
    bgAcc = bgAcc + dt
    if bgAcc < 0.05 then return end          -- ★ 限频 ~20fps
    local step = bgAcc; bgAcc = 0; pt = pt + step

    for i = 1, #washes do
        local w = washes[i]
        local k = math.sin(pt * 0.35 + w.ph)
        local scale = 1.0 + 0.06 * k
        w.it.c:SetSizeDelta(w.r * scale, w.r * scale)
        w.it.c:SetAnchoredPosition(
            toX(w.cx + 18 * math.sin(pt * 0.2 + w.ph)),
            toY(w.cy + 14 * math.cos(pt * 0.17 + w.ph))
        )
        w.it.c.imageColor = Color.FromRGBA(
            w.it.col[1], w.it.col[2], w.it.col[3],
            math.floor(w.peak * 255 * (0.75 + 0.25 * k))
        )
    end
    for i = 1, #particles do
        local p = particles[i]
        p.y = p.y - p.v * step
        if p.y < -24 then p.y = 1024 end            -- 出屏循环
        local tw = 0.45 + 0.55 * (0.5 + 0.5 * math.sin(pt * 1.6 + p.ph))
        p.it.c:SetAnchoredPosition(toX(p.x + p.sway * math.sin(pt * 0.6 + p.ph)), toY(p.y))
        p.it.c.imageColor = Color.FromRGBA(245, 240, 234, math.floor(70 + 130 * tw))
    end
end
```

在 `OnUpdate(dt)` 里：先 `render()`（只在 `fx` 变化时跑），再**无条件**跑背景 `bgTick`（背景每帧都要动）。
⚠️ 按规范 §9，`pcall` 的返回值**必须有去向**（不许静默吞错），同一原因最多报 3 次：

```lua
-- nonFatal(what, err)：降级 + 日志说明，同一原因最多报 3 次（防每帧刷屏）
local okBg, errBg = pcall(bgTick, dt)
if not okBg then
    nonFatal("背景 tick", errBg)
end
```

---

## 3. 调参手感（都是纯 Lua 常数，改完部署即可看）

| 想要的效果 | 改哪里 |
|---|---|
| 星点更明显 | `p.v` 12→24（更快）/ 星图尺寸 `sz` 10→18 / alpha 上限 130→200 |
| 星点更密 | 数量 28 → 40（⚠️ 每颗每帧 2 次 API 调用，别再翻倍） |
| 光晕更亮/更花 | `wdef` 的 peak 0.18~0.34 → 0.3~0.5；或加第 5 团 |
| 不要横摆 | 把 `sway` 设 0 |
| 更"深空" | 底色 `{12,14,26}` → `{6,7,16}`，光晕 peak 降一点 |

---

## 4. 还没做但可加的（同样纯 Lua）

- **暗角**：4 条大尺寸低透明度黑条贴边（注意同样避开"整屏单块"）
- **渐变**：3~4 块半透明色块自下而上叠（每块 ≤800×500）
- **扫描线 / 网格**：细长图片控件阵列（≤200 个，注意限频）
- **与玩法联动**：`fx` 计数变化时给背景叠一层闪色（和 `效果引擎 fx.lua` 同款做法）

---

## 5. 验收口径（别只看"跑通"）

1. **真机截图**（`miliastra_shot op=burst awaitPlaytest:true`）——⚠️ **开局前 ~14 秒是千星试玩加载画面（星空图）**，要看**进图后**的帧
2. 图里逐项确认：底**不透明**（世界草地不透出来）、光晕/星点在动（隔 2~3 秒的两帧对比**位置变了**）
3. 层级：结果面板/按钮**压在最上面**（不被格子、角图盖住）
4. 帧数：加背景前后对比 `miliastra_playtest` 不卡（限频 20fps 基本无感）
