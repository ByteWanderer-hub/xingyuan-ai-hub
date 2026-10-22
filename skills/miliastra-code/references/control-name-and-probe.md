# 控件名与模板引用：怎么定名 · 名字不对怎么办 · `.gil` 里怎么查

> **这份解决的问题**：脚本里"按名字找控件"这一步**反复翻车** —— 名字对但设不了字段、
> 宿主里根本找不到、`.gil` 里读到的 offset 下一次就失效。
> **来源**：2026-10-08 天赋面板（3 轮真机试玩，其中一次"详情页子控件名全找错"）。
> **什么时候读**：任何**"脚本要按名字去操作创作者摆的控件"**的任务，动手前过一遍。

## 0. 一句话结论

**控件名是契约，但"名字一样"不等于"同一个东西"** ⇒

① 名字一律走**候选列表**；② 命中后**用 `pcall` 试写一次**验货；③ 结构一变就**重新取证**，别复用上次的 offset。

---

## 1. 先认清"控件是怎么来的"——三种形态，写法完全不同

| 形态 | 长什么样 | 脚本怎么写 | 详见 |
|---|---|---|---|
| **A. 画布上摆的实例** | 创作者在容器画布上直接摆 | **按名字找** + 改字段 | 铁律 `V6` |
| **B. 存为模板** | 客户端控件模板库里"存为模板" | `InstantiateClientUIControl(索引, 父)` | 铁律 `V6` / 边界 #16 |
| **C. 模板引用**（★ 本份新增） | 主模板里**引用**了别的模板 | **也按名字找**（不要 Instantiate） | §2 |

⚠️ **A 与 C 最容易混**：作者说"我把它做成了模板"时，可能是 B（要 Instantiate），也可能是 C（不用）。
**别猜** —— 让他给一句口径，或者自己看控件树（§4.1）。

---

## 2. 模板引用（`ClientUIReferenceControl`）：宿主里会出现"两层同名"

真机实测结构（天赋面板嵌了三棵树 + 一个详情页）：

```
天赋面板
├ 天赋底板-分栏按钮
├ 天赋-金钱          ← 引用控件（第 1 层）
│  └ 天赋-金钱       ← 被引用模板的根（第 2 层，**与上层同名**）
│     └ 炼金术 …     ← 内容
└ 天赋详情           ← 引用控件
   └ 天赋详情页-加点  ← 内容层**名字与引用层不同**（模板自己叫什么就叫什么）
```

要记住的三件事：

- **它们本来就存在** ⇒ 脚本只需 `findByChild(host, "天赋-金钱", 3)` 拿到，切页只切 `SetVisible`；
  **不要**再 `InstantiateClientUIControl`（那是形态 B 的做法）
- **深度要给够**：内容是"引用层 +1"，`findByChild` 的深度给 **3~4**
- **别写死"一定同名"**：`天赋-金钱` 两层同名，而 `天赋详情 → 天赋详情页-加点` 不同名 ⇒
  两种都存在，按名字找 + 给足深度才是通用解

### ⚠️ 更狠的一种：**同名子控件有多套**，而 `GetChild` 只给你第一个

实测（2026-10-08，天赋面板的格子）——**四态不在格子的直接子级**，而在**交互态容器**里面，
并且**每个交互态各有一套同名子控件**：

```
炼金术
├ 默认                          ← 交互态容器
│ └ 天赋面板-未解锁 / -未升级 / -升级 / -满级
└ 悬停
  └ 天赋面板-未解锁 / -未升级 / -升级 / -满级     ← 又一套（**同名**）
```

⇒ `GetChild("天赋面板-未解锁")` 只返回**第一个**：你 `SetVisible` 的那一套可能落在 `悬停` 里，
而画面上的 `默认` 那套**根本没动**。表现就是"**改了没反应**" ——
作者的原话是"解锁了但依旧带锁，**没有更改按钮的「默认」显示**"（"默认"是关键词，不是口语）。

**正解：递归收集全部同名控件，逐个容器都设一遍**（`SetVisible` 幂等，多设无害）：

```lua
-- 反查表：控件名 → 状态 key
local STATE_KEY = {}
for k, v in pairs(N_ST) do STATE_KEY[v] = k end

-- out["满级"] = { ctrl, ctrl, ... }（可能 2 份：默认态 + 悬停态）
local function collectStates(root, depth)
    local out = {}
    local function walk(node, d)
        if node == nil or d < 0 then return end
        local okK, kids = pcall(function() return node:GetChildren() end)
        if not okK or type(kids) ~= "table" then return end
        for i = 1, #kids do
            local k = kids[i]
            local okN, nm = pcall(function() return k.name end)
            if okN and nm ~= nil and STATE_KEY[nm] ~= nil then
                local key = STATE_KEY[nm]
                out[key] = out[key] or {}
                out[key][#out[key] + 1] = k
            end
            walk(k, d - 1)
        end
    end
    walk(root, depth)
    return out
end
```

配套两点：① 缓存键要带**序号**（`状态#1` / `状态#2`），否则两份互相顶掉缓存；
② 顺手把"找到几份"打进日志（`状态子控件有多套 … 示例=炼金术 : 满级×2 …`）——
这是**验证"到底几套"的唯一手段**（可见性**没有 getter**，读不回来，见 `engine-boundaries.md` #20）。

---

## 3. ★ 名字对 ≠ 控件对：候选 + 字段探测

**2026-10-08 一次真机试玩暴露的三个错**：

| 按名字找到的 | 真机报错 | 它其实是什么 |
|---|---|---|
| `天赋名称` | `cannot set text, no such field` | **容器**（它的子控件才叫 `文本框`） |
| `购买按钮` | `cannot set interactable, no such field` | 按钮**内部**的子控件（父 id ≠ 详情页根） |
| `点击升级` | 根本不在这棵树里 | 属于**另一个模板**（商店列表项）的字段名 |

**结论：字面命中不够，得验"这个控件支不支持我要写的字段"。** 可照抄的形状：

```lua
-- 候选按"更可能是真控件"的顺序排；命中后 pcall 试写一次验货；
-- 若候选本身是**容器**（设不了 text），就**下钻一层**到它的子控件里找能设 text 的那个
local function firstText(node, cands)
    local i, j
    for i = 1, #cands do
        local c = directChild(node, cands[i])
        if c == nil then c = findByChild(node, cands[i], 2) end
        if c ~= nil then
            local ok = pcall(function() c.text = "" end)   -- 试写空串，随后被真值覆盖
            if ok then return c, cands[i] end
            -- 它是容器 ⇒ 在直接子控件里找能设 text 的（图片设不了，自然被跳过）
            local okK, kids = pcall(function() return c:GetChildren() end)
            if okK and type(kids) == "table" then
                for j = 1, #kids do
                    local kk = kids[j]
                    local ok2 = pcall(function() kk.text = "" end)
                    if ok2 then return kk, cands[i] .. "/子文本框" end
                end
            end
        end
    end
    return nil, nil
end

-- 按钮同理：试 interactable（预设按钮行，它内部的子控件不行）
local function firstInteractive(node, cands)
    local i
    for i = 1, #cands do
        local c = directChild(node, cands[i])
        if c == nil then c = findByChild(node, cands[i], 2) end
        if c ~= nil then
            local ok = pcall(function() c.interactable = true end)
            if ok then return c, cands[i] end
        end
    end
    return nil, nil
end
```

### ★ 作者口述的名字 ≠ 真名，别按他说的写死

实测两组（同一个详情页）：

| 作者怎么说 | `.gil` 里的真名 | 它其实是 |
|---|---|---|
| "**标题**文本框" | `天赋名称` | **容器**（真文本框躲在它里面） |
| "**等级-上限**文本框" | `等级-上限` | 真名就这个，没有"文本框"三个字 |

⇒ 两条推论：① **"…文本框"常常只是叫法**，别把它当控件名；② `等级-上限` 到底是不是文本框**不用先问** ——
探测**下钻一层**之后，文本框 / 容器两种形态都能命中。

**为什么这招管用**：控件是**受控对象**（`engine-boundaries.md` 末尾那条），
**字段不存在就直接抛错** —— `pcall` 恰好把"抛错"变成**可判定的探测**。
于是**不需要预先知道真名**，也不靠运气。

配套三条纪律：

1. **探测只验字段、不改语义**：试写空串 / 试 `interactable=true`，紧接着就写真实值
2. **命中后把真名打进日志**：`note("详情页子控件名 标题=" .. name .. " 按钮=" .. btnName)` ——
   下一次不用再猜，也能直接写进交接文档
3. **找不到时日志要带候选**：`fail("缺标题控件", "候选=" .. table.concat(CANDS, "/"))` ——
   否则"失败了"这句话对排查毫无价值

---

## 4. 找不准时的两个诊断手段

### 4.1 `SCAN_TREE`：把子树的名字全打出来

```lua
local SCAN_TREE, SCAN_DEPTH, SCAN_MAX_CHARS = true, 5, 6000

local function scanTree(node, depth, out)
    if node == nil or depth > SCAN_DEPTH then return end
    local nm = "?"
    local okN, n = pcall(function() return node.name end)
    if okN and n ~= nil then nm = tostring(n) end
    out[#out + 1] = "d" .. tostring(depth) .. ":" .. nm
    local okK, kids = pcall(function() return node:GetChildren() end)
    if okK and type(kids) == "table" then
        local i
        for i = 1, #kids do scanTree(kids[i], depth + 1, out) end
    end
end
```

- **深度必须给够**：实测 `SCAN_DEPTH=3` 恰好停在内容层**门口**
  （`d2:天赋详情 | d3:天赋详情页-加点` 就断了），里面的真名一个都看不到 ⇒ **给 5**
- **分开扫**：宿主树一条、浮窗/子树再单独一条 —— 浮窗在宿主深处，一起扫容易被截断
- **诊断完就关**（`SCAN_TREE=false`）：一条日志几千字符，常驻会把日志淹了
- 单条日志上限 10000 字符（铁律 `R7`）⇒ 长输出 `string.sub` 截断

### 4.2 `.gil` 取证：按 ID 反查名字、按名字反查父 id

**① 按模板 ID 反查名字**（作者只甩给你一个 ID 时）：
ID 以 **LEB128 varint** 存在 `.gil` 里，且**紧挨着名字字符串** ⇒ 把 ID 编成 varint 字节、
在字节流里搜，命中处前后 ±130 字节回读 UTF-8 串即是名字。实测：

```
1073754236 → 天赋-金钱 ｜ 1073755106 → 天赋-伙伴 ｜ 1073755895 → 天赋-特殊 ｜ 1073758478 → 天赋详情页-加点
```

**② 按名字反查父 id**（重建层级）：名字出现位置 **−13 字节**处的 varint **往往就是父 id**
（实测：同一格子的 4 个状态子控件共享同一个 −13 值）。

**③ ⚠️ offset 会随每次存盘整体失效**：实测同一天两次存盘，`.gil` 从 `6213303` → `5597523` 字节，
原来在 offset **322 万**的详情页数据跑到 **240 万**。
⇒ **每次重新定位**。别复用上次的 offset —— 我犯过这个错，白读了一段"物品/商店"的名字还当成了详情页。

**④ 结构变化的判据**：`.gil` 体积**骤降/骤增**通常意味"实例数据 ↔ 引用数据"的转换 ——
本案例 `6213303 → 5597523` 正对应"把三棵树 + 详情页改成模板引用"。

---

## 5. 配套手法：先把界面点亮，再谈数据（`MOCK_MODE`）

服务端节点图 / 变量往往**晚于界面**就绪。挂一个本地假数据开关，UI 就能先跑起来：

```lua
local MOCK_MODE   = true        -- 不读变量、不发信号
local MOCK_POINTS = 9999        -- "无限"资源
local MOCK_INIT_LEVELS = { ["炼金术"] = 3, ["解锁紫金币"] = 1 }

-- ★ 数据入口收在两个函数里 ⇒ 切回真数据只改 MOCK_MODE，交互/刷新代码一行不动
local function currentLevels()
    if MOCK_MODE then return mockLevels, nil end
    return readDict(VAR_LEVELS)
end
```

三条经验：

- 假数据初始值**故意配成"一屏看全所有状态"**（满级 / 升级 / 未升级 / 未解锁各来一个）——
  一次试玩把四种表现全看到
- 点"升级"时**本地 +1 并扣点**（不发信号），四态与连线**立刻跟着变** ⇒ UI 逻辑闭环可测
- 测完 `MOCK_MODE = false` **再 deploy 一次**即可接真数据

---

## 6. 交付节奏（这条路 2026-10-08 走通了）

```
preflight → 模拟器 bind（runForMs）→ deploy → ★ 人在编辑器里**存盘** → ★ 人点**试玩**
   → miliastra_log {op:"errors"}（按形态捞，不看标签）→ op=grep tag=[你的标签]（读关键行）
```

- **`首错种类=0` + `errors count:0`** 是"这一版干净"的硬指标
- **自检行要设计成"一次试玩能回答多个问题"**，例如：
  `格子缓存完成 可见格子=31 缺控件=0` ｜ `详情页子控件名 标题=… 按钮=…` ｜
  `配置自检 天赋=31 条 连线=28 条 首错种类=0`
- ⚠️ **不是所有控件都有 cursor 方法**：对"按钮内部的子控件"调 `AddCursorEventListener` 会
  `attempt to call a nil value` ⇒ **绑定函数要带控件名**（否则只报一次，不知道是谁坏的）

---

## 相关

- 铁律 [`V6`](iron-rules/V6-canvas-instance-findable.md)（画布实例：建不了但找得到）·
  [`R8`](iron-rules/R8-handover-values.md)（交接值只能现读）
- [`engine-boundaries.md`](engine-boundaries.md) #44~#47（本轮新增四条实测）·
  文末「控件实例不允许挂自定义字段」（"字段不存在就抛错"的由来）
- [`plugin-toolbox.md`](plugin-toolbox.md) §6（**工具本身**的坑：`op=clientui` 在 7.1.0 读不到控件）
- [`code-patterns.md`](code-patterns.md)（按钮四态、文本控件等可照抄片段）
