# 粒子特效系统与真机预算

> 来历：夏日祭法师（74 角色同屏 · 222 个技能 · 1494→3200 颗粒子 · 3482→5188 控件）
> **真机跑通**。
> 本文 = ① 插件的调用链与生成逻辑 ② **真机性能上限（实测数字）** ③ **预存多套特效**的架构。
> 配套：[`iron-rules/R3-declare-before-use.md`](iron-rules/R3-declare-before-use.md)（R3 作用域）、[`iron-rules/V1-asset-vs-template-id.md`](iron-rules/V1-asset-vs-template-id.md)（V1 图源）。

---

## 0. 三句话

1. **特效不该在运行时"拼"**，而该**构建期一次生成、运行时只读表** —— 插件的产物是**数据**，不是要抄的代码。
2. **一颗粒子 = 一个控件** ⇒ 特效的"量"直接等于控件数 ⇒ **帧率上限就是特效上限**。真机实测软上限见 §2。
3. **"预存多套"是同一个控件预算下做出最多花样的唯一办法**：先把 N 套外观全建出来，再按 id 索引选层组 —— **不新增控件**，只多一个索引。

---

## 1. 插件调用链：`miliastra_gen op=vfx-lua`

### 1.1 三个入口（选对入口很重要）

| 入口 | 拿到什么 | 用在哪 |
|---|---|---|
| `op=vfx-lua preset:"list"` | 16 个预设清单（13 粒子 `emitter` + 3 **图元 `sprite`**） | 挑预设 |
| `op=vfx-lua output:"data"` | **结构化层**（`layers[]`，含每个字段、曲线、弧长） | **推荐**：喂给构建脚本 |
| `op=vfx-lua output:"lua"` | 可直接部署的整段 Lua | 单脚本小玩法；大工程会顶破文件规模 |

> ★ **`output:"data"` 优先**。我一开始用 `output:"lua"` 再**正则解析自己的产物** —— 白绕一层，
> 而且产物格式一变就静默错位。现在两个库的生成都直接读 `res.layers`（`layers[].shapeKind` 分流）。

### 1.2 最终生成的逻辑（链路的每一段）

```
miliastra_gen op=vfx-lua            ← 插件：一个预预设 = 若干"层"，每层给全参数
        │  output:"data"  ⇒  { layers:[…], pool:{controls}, estimate:{arcLength,…} }
        ▼
tools/make-skills.mjs               ← 构建脚本：把层写成**紧凑 Lua 表**（位置参数行）
        │  两套库：PREFIX=SPELL / SPELL2（靠 varPrefix 不撞名）
        ▼
案子/夏日祭法师/2.代码/技能数据.lua   ← 生成物（勿手改）
        │
tools/build-mage-battle.mjs         ← 把数据 + 手写运行时拼成**可部署产物**（默认 --map 夏日祭法师）
        │  -- @@SKILLS@@ 标记注入
        ▼
案子/夏日祭法师/2.代码/夏祭特效.lua    ← 构建产物（勿手改）
        │  deploy → 编辑器存盘 → 试玩
        ▼
运行时：buildSpellPools() 建池 → castSpell() 取粒子 → updateParticles(dt) 推时间
```

**关键认识**：插件给的是**"一层长什么样"**（曲线 / 颜色 / 重力 / 自转 / 池大小 / 贴图），
**不是"什么时候放"**。后者是你的编排（见 §3.5）—— 这个分工不要混。

### 1.3 图元层（`shapeKind:"sprite"`）：一个形状 = 1 个控件

13 个粒子预设全是**发射器语义**（从某区域按频率吐小点）⇒ 出不了**圆环 / 刀光 / 弧刃**这类"形状"。
插件新增 3 个图元预设，**控件成本低一个数量级**：

| | 图元 | 用粒子拼 |
|---|---|---|
| 一个圆环 | **1 个控件**（+`trailCount` 个残影） | 一圈 24 点 = 24 个 |
| 池预算 | `pool.kind:"sprite"`，`controls = Σ(1+trailCount)` | `层数 × 每层池` |

图元层的新增字段：`imageId / path[] / stretch{x,y} / spinAlign:"tangent" / widthCurve /
heightCurve / spinCurve / sizeCurve / alphaCurve / trailCount / trailGap / arcLength`。

**运行时怎么驱动**（复用粒子那套几何，不另起一套）：
```lua
-- 图元也是"沿路径飞"，只是**整体**在动 + 拉伸 + 对齐切向
local x, y = bezPath(it, prog)                       -- 复用多段贝塞尔求值
local rot = math.rad(sampleCurve(S.SPIN_CURVE, prog, 0))
if S.ALIGN == "tangent" then
    -- ★ 切向 = 路径上前后两点的差分；必须自己写 atan2（见 §1.4 坑 5）
    local ex, ey = bezPath(it, prog + 0.02 > 1 and 1 or prog + 0.02)
    if ex ~= x or ey ~= y then rot = rot + atan2(ey - y, ex - x) end
end
it.c:SetSizeDelta(base * S.STRETCH_X * sampleCurve(S.WIDTH_CURVE, prog, 1),
                  base * S.STRETCH_Y * sampleCurve(S.HEIGHT_CURVE, prog, 1))
it.c:SetLocalRotation(0, 0, rot)
```

> ⚠️ **真机未验项**（插件自己标 `unverified`）：`SetLocalRotation` 的**正负号**、
> `Enum.ImageType.Stretch` 的缩放行为、拉伸后的**采样质量**。第一局重点看旋转方向。
> ⚠️ **非正方形图片在模拟器里画成"圆"**（引擎按直径取纹理）⇒ **拉伸形状只能真机看**，
> 模拟器能证明的只有"位置 / 旋转 / 尺寸场在变"。

**用在哪最划算**：第三技能叠刀光、死亡叠环刃、命中叠新月 —— 全是**+1 控件**级别的加法。
实测：三类图元一共只花 **11 个控件**（环刃 1 + 刀光 4 + 新月 6），而一层粒子是 36 个。

### 1.4 踩过的 6 个坑（每条都是真报错原文）

| # | 现象 | 根因 | 防线 |
|---|---|---|---|
| 1 | `:1083: '}' expected near 'petal'` | 编排里传了**预设名**（`"petal-fall"`）而不是数字 id | 编排表里存 `presetId`，构建时 `Number.isInteger` 断言 |
| 2 | `:1335: '}' expected (to close '{' at line 1333) near '{'` | 有自定义钢笔的那行**少了结尾逗号** | 构建脚本的**括号配平自检** |
| 3 | 日志打出 `预设=-420 形态=-260 发数=320` | 路径表写成了行的**第二个元素**（不是第 14/15 个字段） | 同一条括号配平自检 + 位置参数顺序断言 |
| 4 | `夏祭冰.lua:530: attempt to index a nil value (field 'hpBar')` ⇒ `控件累计=0`（**整块冻死**） | 砍 UI 时只给**创建**分支加了 `CFG.SHOW_UI and`，**调用它的 `else` 分支还在** ⇒ 每次 spawn 都走 `refreshHp(f)` ⇒ pcall 抓 ⇒ `failDone` ⇒ 此后每帧 tick 直接 return | **守卫加在"被调用的函数自己"里**，不能只加在创建处；同类 `needBuild = (f.hpBar == nil)` 关 UI 后**恒为真**（反复重建池）⇒ 改用显式 `f.built` |
| 5 | `attempt to call a nil value (field 'atan2')` | **Lua 5.3 删掉了 `math.atan2`**（沙箱版本不由我们挑） | 产物自带可移植 shim，**且声明在用到它的函数之前** |
| 6 | `check-lua-scope` 报 `L1771 UNDEF_READ 读 SOFT_CAP` | `takeParticle` 读了**声明在它之后**的 `SOFT_CAP`/`growQueue`（Lua local = 词法作用域） | **R3 门禁**（这就是它存在的理由）；搬到读取者之前 |

> ★ **#4 与 #6 是同一个 bug 类的两种面貌**：**"名字读到了 nil"**。前者是**运行期**（pcall 抓住 ⇒ 整块冻死），
> 后者是**静态**（门禁抓住）。⇒ 改完必跑两道门，别靠看。

---

## 2. 真机性能上限（**实测数字，不是估计**）

### 2.1 已知锚点

| 控件数 | 场景 | 真机结论 | `evidence_source` / `device_status` |
|---|---|---|---|
| ~950 | 7 角色 + 26 套粒子外观 | **58.8 fps**（470 帧 / 8.013s，长帧>34ms 仅 3 帧） | `observed` / `passed` |
| **5188** | **74 角色 + 3200 颗粒子 + 图元 + 1977 块头像** | **「不错，小卡」⇒ 可接受，创作者据此定为软上限** | `observed` / **`passed`（★ 真机实战）** |
| ~9339 | 74 角色 × cols=12 头像（7814 块） | **没做**（算出来就否了） | `inferred` / `not_required` |

★ **结论（创作者 裁决：以实战为准）**：
**`5188 控件 / 3200 粒子` = 真机实战验证过的特效软上限**（74 角色全同屏、每帧约 3200 颗粒子
× 位置/尺寸/颜色 3 次 setter，观感"小卡、可接受"）✓

> ★ **这条同时修订了 L2-07**（那条原来的"每帧 70+ 次 setter 就拖慢"**不是阈值**，
> 与本次实战量级差 100 倍以上）⇒ 见 [`iron-rules-l2/l2-07-frame-budget.md`](iron-rules-l2/l2-07-frame-budget.md) 的 修订。
> 判据顺序：**先数控件，再看真机帧率**。

> ⚠️ **这两条锚点与那个 `budget.total = 1024` 不是一回事，别互相替代**：
> `1024` 是**上游工具自述的核算口径**（`provenance: upstream-tool-self-declared`），**没有任何设备的帧率证据**；
> 上表两条是**同一台机器上的真机观测**。做预算时：**用观测数当参照**，但仍要按你自己的条件重测
> —— 换机器、换画布分辨率、换玩法（头像块数 / 图元数量）都会变。

### 2.2 池子吞吐公式（**"效果变少"的真因**）

固定池子的**供给速率**是：

```
供给（颗/秒） = 池大小 / 粒子平均寿命
需求（颗/秒） = 施法者数 × 每秒施法次数 × 每发颗数
```

**夏日祭实测**：74 人 × 每 1.2 秒一发 × 每发 60 颗 = **3720 颗/秒**；
池 1494 颗 / 寿命 ~0.45s ⇒ 供给 **~3300 颗/秒** ⇒ **差 11%，峰值一冲就干** ✗

**原来池干了的行为**：`freeParticle` 返回 nil ⇒ **整发直接空掉**，而且**静默**
（日志里什么都看不到）⇒ 玩家感受就是"技能打出去了但没有效果"/"效果少了点"，
而**代码、门禁、日志全都正常** ✗✗

### 2.2b ★ 先分辨是**哪一种**病因（两种病，同一个症状）

"越玩越稀 + 控件总数不变"有**两个**成因，**修法完全不同** ⇒ **先探针，再动手**：

| 现象 | 病因 | 修法 |
|---|---|---|
| 活跃数长期**贴着池上限**、池干次数持续增长 | **吞吐不足**（池太小 / 寿命太长 / 施法太密） | §2.2 的四个杠杆 |
| 活跃数不涨，但**空闲数单调减少**（尸体堆积） | **回收漏了**（`active` 没清 / 寿命计时吃不到有效 `dt`） | 下面三条硬规则 |

★ **怎么一眼分开**：**"控件总数不变"本身分不开这两种** —— 它只能说明"池是固定的"。
要看的是**活跃数 vs 空闲数**（控件总数是个常量，天然对不上病因）。

**回收路径的三条硬规则**（第二类病因的常见形状，真机上全是静默的）：
1. **别"正向遍历 + `table.remove` 边遍历边删"** —— 每次会漏掉一个；那个"尸体"**不画但占着槽位**，
   堆积到吃光可用容量 ⇒ 改**倒序**或**原地压缩**。
2. `release()` 做成**唯一出口** + 幂等标记（`inFree`）+ **全量状态重置**
   （复用旧对象忘了清状态 ⇒ 下一发带着上一发的残留）。
3. **`dt` 夹紧**（`dt = math.min(dt, 0.1)`）—— 卡一帧给一个大 `dt` 会让寿命计时跳变、回收错拍。

**探针（限频 1 秒一次；热路径只累加，绝不 print）**：
```lua
-- 热路径：只累加，不打日志
poolDryCount = poolDryCount + 1
-- 另设限频点聚合输出（k=v ⇒ miliastra_log op=metrics 能直接抽分布）
print(string.format("[VFX] 池干=%d 活跃=%d 空闲=%d 池=%d", poolDryCount, activeN, freeN, poolSize))
```
**判据**：`池干涨 + 活跃贴着上限` ⇒ **吞吐不足**；`活跃不涨 + 空闲单调降` ⇒ **回收漏了**。

> ⚠️ 另外两类"看起来也像"的病因**症状不同，别混**：渲染/图源/层级问题表现为
> **"某件东西从头到尾不显示"**，不是"**逐渐**变稀" ✓

**⇒ 提密的四个杠杆（按性价比）**：
| 杠杆 | 效果 | 代价 |
|---|---|---|
| **① 池干了抢最老的一颗**（不再空发） | 画面**永远满**，零延迟 | **零控件** ✓✓ 代价只是那颗弹提前消失（肉眼看不出来） |
| **② 缩短寿命**（0.45→0.30s） | 供给 **+50%** | 零控件 ✓；观感更"脆" |
| **③ 可增长池**（见 2.3） | 需求多少长多少 | **控件数上升**（这是唯一真正花钱的） |
| ④ 每发颗数/发数调小 | 需求↓ | 观感变稀 ✗ 最后才考虑 |

**代码形状**（①② 一起做，热路径，别在里面 log）：
```lua
local function takeParticle(pool, L)
    local p = freeParticle(pool)      -- 先找空闲的
    if p ~= nil then return p end
    -- ★ 池干了：这一发**照样发**（抢最老的），同时**排队补建** ⇒ 下几帧就不干了
    if L ~= nil and #spellParticles < SOFT_CAP then
        growQueue[L] = (growQueue[L] or 0) + 1
    end
    local oldest = nil
    for i = 1, #pool do
        local q = pool[i]
        if q.active and (oldest == nil or q.t > oldest.t) then oldest = q end
    end
    return oldest
end
```

### 2.3 可增长池（"无上限"的正确做法）

**先讲物理事实**：**一颗粒子 = 一个控件**，而控件是真的 UI 对象（要 `InstantiateClientUIControl` 建）
⇒ 严格意义的"无上限" = **无上限的控件**；战斗中途按需大量建会**直接卡帧** ✗

⇒ 正确做法是**按需增长**（观感上就是没有上限）：
- 池干了 ⇒ **当帧抢最老的**（画面不空）+ **排队补建**
- **每帧最多建 `GROW_PER_FRAME` 颗**（分帧建，别一帧建几百个）
- **软上限 `SOFT_CAP`** 只防跑飞，**不是"设计上限"** —— 撞到它说明该谈预算了

**实测**：池子从 1494 **自己长到 3200**（≈ +1706 颗），正好等于算出来的需求 ~1670 ✓
⇒ 诊断被数字证实；然后**创作者用它当真机软上限**（§2.1）。

> ⚠️ 增长要**按层排队**（`growQueue[L]`）—— 只有"干过"的那一层长，控件花在该花的地方。
> ⚠️ `GROW_PER_FRAME` / `SOFT_CAP` / `growQueue` 的**声明必须在读取者之前**（就是 §1.4 坑 6）。

---

## 3. 预存多套特效（同一个预算下做最多花样）

### 3.1 为什么要预存

**建控件最贵，改字段最便宜。** 反向做法（按需建/销毁）要付：
`InstantiateClientUIControl` 的调用成本 + 运行时 ID 空洞 + 建的那一刻的掉帧 ⇒
**能预存就预存**：开局把 N 套外观一次建好，战斗中**只改字段**（位置/尺寸/旋转/颜色/可见性）。

### 3.2 两套库 + `varPrefix`（同屏两种风格）

```js
// 库 1：主技能（预设 1..13）
vfxLua({ op:'vfx-lua', preset, output:'data' }, { templateIndex: T, container: C })
// 库 2：副技能（预设 101..113）—— varPrefix 让变量名不撞，能同屏共存
vfxLua({ op:'vfx-lua', preset, output:'data', varPrefix:'SPELL2', sizeScale:0.62, particlesPerEmitter:20 },
       { templateIndex: T, container: C })
```
构建期把 `spellLib1 + spellLib2` **一起注入同一个文件** ⇒ 运行时 `pid = PRESET + lib`（0 或 100）区分。

★ **同一批预设，参数不同 ⇒ 观感不同**（库 2 更小更疏）⇒ **26 套外观只花一份代码**。

### 3.3 按预设 id 索引全部层（本命技能靠它）

```lua
pools.preset[pid][…] = L      -- 13 个预设的层**本来就已经全建出来了**
                              -- ⇒ 多一个索引、**不新增任何控件**
```
⇒ "每人一个本命技能"= 查 `pools.preset[该角色的预设 id]` 拿层组 ✓ **零额外控件** ✓

### 3.4 位置参数行（为什么要压缩）

74 角色 × 3 技能 = **222 个技能**。具名表一个技能 10 行 ⇒ **2200+ 行**，直接顶破 `BIG_FILE` 门禁。
⇒ 压缩成**一行一个技能的位置参数**（构建器写、运行时按位解码）：

```
1 preset / 2 pattern / 3 img / 4 shots / 5 spread / 6 r1 / 7 r2 / 8 lift
9 slow / 10 spin / 11 stagger / 12 flags / 13 size / 14 per（每发颗数）/ 15 path（可选）
flags 位：1=tang 2=rand 4=useLayer 8=custom:"boom" 16=custom:"weave" 32=curve（两段贝塞尔）
```
```lua
{ 5, "ring", 100004, 12, 349, 639, 598, 0.95, 1.0, 0, 0, 0, 1, 3 },   -- 主技能
```
> ⚠️ **加字段只能往末尾追加**，而且**构建器与解码器要同时改**（这是隐性契约）。
> ⚠️ **自定义钢笔必须是行的第 15 个元素**（写在同一个花括号里）—— 写成平级元素 ⇒ 见 §1.4 坑 3。

### 3.5 与技能码的绑定（"主/副/第三"怎么轮换）

```
skillId = 角色全局序号 × 3 + 位    （位 0=主 / 1=副 / 2=第三）
```
⇒ 主控只传一个整数，特效脚本 `idx = floor(code/3)` / `which = code%3` 解出"谁的第几个技能" ✓
⇒ **跨脚本只传数字**（表不跨界），角色名留在各元素脚本自己里 ✓

---

## 4. 哪道门抓哪类错（别指望一道门包打）

| 门 | 抓什么 | 抓不到什么 |
|---|---|---|
| `miliastra_code op=preflight` | **Lua 真语法**（fengari 编译，带行号）/ 结构配对 / 全局写 / 图片有图源 | 作用域、风格、类型、运行时语义 |
| `node tools/check-lua-scope.mjs` | **漏 `local` / 声明晚于使用（R3）** | 语法错 |
| `node tools/check-lua-style.mjs --baseline` | BOM/CRLF/tab/`OnUpdate` 少 pcall/吞错 pcall；行宽/规模 | 语义 |
| `node tools/scan-lua-globals.mjs` | 运行期给**全局**赋值（真机不生效） | 表字段（不算） |
| `miliastra_sim op=bind` | **整块冻死 / 控件没建 / 逻辑崩**（`run.logs` 的 `首错=`） | 真机渲染、帧率、手感 |
| 构建器自带括号配平 | §1.4 坑 2/3 那类 | 全部 |

★ **构建产物才过门**：源片段里有 `@@SKILLS@@` 之类注入 ⇒ 直接扫源会报一堆 `UNDEF_READ`（那是**正常**的）。

---

## 5. 交接值（每次都现读，**写死即废**）

- 图片模板索引 / 文本框模板索引 / **容器节点索引** ⇒ `miliastra_map op=clientui` 或 `miliastra_gen`（自动读 `.gil`）
- 台账：`miliastra_health op=handover action=set` 记一次，之后 `miliastra_gen` **自动带上**（回执标 `from:"ledger"`）
- ⚠️ **换图 = 换关卡 ID = 换活文件目录** ⇒ deploy 每次显式传 `level` + `file`
