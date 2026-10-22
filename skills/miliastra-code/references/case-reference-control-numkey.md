# 案例：改「模板引用控件」实例内部的文字（数字键 0~9）

> **性质**：2026-10-01 真机跑通的完整案例。证据等级 `observed`（`.gia` 日志原文 + 创作者目视确认"可行"）。
> **适用场景**：手上有一批长得一模一样的控件（**模板引用控件 `ClientUIReferenceControl`**），
> 需要让它们**各自显示不同内容**（数字键 / 编号 / 卡面序号 / 名字）。
> **一句话结论**：**能改** —— 引用实例内部 `GetChildren()` 进得去，但要**钻够 3 层**；
> 而且末端的四态预设按钮**有四套文本框（不可用/按下/悬停/默认），必须全刷**。

- **关卡**：`1074397189`《酬礼03》｜**日期**：2026-10-01
- **交付物**：`数字键初始化.lua`（挂在「数字键」容器上）+ `数字键测试.lua`（挂在容器节点上，负责把模板建出来）
- **最终判据**：`[数字键] 初始化完成 total=10 done=10` + 本局 136 条记录**零报错** + 创作者目视确认

---

## 0. 现场结构（创作者交接 + `.gil` 核对）

- **需求**：数字键盘 `0~9` 十个键，初始**全都显示「1」**，要在脚本里初始化成各自那个数字。
- **结构**：`密码解密`（客户端控件组）→ `数字键`（容器）→ **10 个模板引用控件**（名字就是 `0`..`9`），
  每个引用模板 `1073742430`「数字按钮」。
- 「数字按钮」内部（`.gil` 记录）：**四态预设按钮** —— `不可用 / 按下 / 悬停 / 默认` 四个状态容器，
  **每个状态一套 `[图片 + 文本框]`**（`1073742432/1073742433`、`…35/…36`、`…38/…39`、`…41/…42`）。

⚠️ `.gil` 里有**两份**「密码解密」，别认错（本轮最贵的一步）：

| 索引 | 在 `.gil` 里的位置 | 能不能 `InstantiateClientUIControl` |
|---|---|---|
| `1073742456` | **无父节点**的客户端控件组 | ✅ **实测可创建**（`创建成功 id=2 name=密码解密 prefabIndex=1073742456`） |
| `1073742443` | 在 `ClientUIPrototypeHierarchyRoot` 下（模板原型区） | 未测（同族行为，按 #24 也属"模板副本"，本关用不到） |
| `1073742458` | **组内**的子控件「数字键」 | ❌ **实测返回 `nil`**（上一局 `首错=实例化返回 nil —— 1073742458 …`） |

⇒ **判据：`op=clientui` 的 `records` 里看 `parent`** —— 组本身（无父节点）可建，**组内的子节点不可建**。
名字是自定义名（`密码解密`/`数字键`）时不会进 `likelyTemplates`（那只认"控件类型名"），**别因为没进就以为不能建**。

---

## 1. 两次失败（各烧掉一轮真机，值得照抄的教训）

| 轮 | 做法 | 真机结果 | 根因 |
|---|---|---|---|
| v1 | 直接 `ctrl.text = 控件名` | 一个都没刷上 | 引用控件**自己没有 `text` 字段**（`ClientUIReferenceControl` 文档只有一个只读 `referencedPrefabIndex`） |
| v2 | 往实例内部钻，`INNER_DEPTH = 2`，**找到第一个能写 text 的就停** | `初始化完成 total=10 done=0` | ① 文本框在**第 3 层**，差一层没够到；② 就算够到，四态按钮**有四套**文本框，只刷一套也不对 |

**v2 的真机日志原文**（`.gia 2026-10-01_14-16-49_5848`，可直接当"差一层"的教科书）：

```
[数字键] 键 name=0 type=ClientUIReferenceControl
[数字键]   内层 层=1 name=数字按钮 type=ClientUIPresetButtonControl
[数字键]   内层 层=2 name=默认 type=ClientUIContainerControl     ← v2 停在这
[数字键]   未刷上 name=0（自己与内层都找不到可写 text 的文本框）
[数字键] 初始化完成 total=10 done=0
```

**同一局顺带结清的两个 `unknown`**（原本文档没写、只能猜）：

1. **引用实例内部可以访问** ✅ —— `GetChildren()` 拿到了被引用模板的实例子树，
   `referencedPrefabIndex` 也能读回（`引用模板=1073742430`）。
2. **实例内部脚本会随实例化一起跑** ✅ —— 日志顺序是「实例内部脚本的 `[数字键] …` 先出现，
   `[数字键测试] 创建成功` 后出现」⇒ `InstantiateClientUIControl` 返回前，实例里那条脚本的 `OnInit` 已经执行完了。

**实例内部的真实运行时树**（`数字键测试.lua` 第 30 帧快照，135 个控件一次性建出）：

```
节点 depth=0 name=密码解密 type=ClientUIContainerControl id=2
  节点 depth=1 name=图片   type=ClientUIImageControl id=3
  节点 depth=1 name=数字键 type=ClientUIContainerControl id=4
    节点 depth=2 name=0 type=ClientUIReferenceControl id=5 引用模板=1073742430
      节点 depth=3 name=数字按钮 type=ClientUIPresetButtonControl id=15
        节点 depth=4 name=不可用 / 按下 / 悬停 / 默认 type=ClientUIContainerControl
    …（9 同理，共 10 键，id 递增到 142）
```

---

## 2. 修法（v3，真机通过）

三处改动，缺一不可：

```lua
    INNER_DEPTH = 4,        -- ① 原为 2：引用控件→数字按钮→状态容器→文本框 = 3 层，留 1 层余量
```

```lua
-- ② 由「找到第一个能写 text 的就停」改为「整棵子树全刷」
--    四态按钮每个状态各一个文本框，只刷一个 ⇒ 一按/一悬停数字就变回「1」
local function assignAllText(node, value, depth, stat)
    if node == nil then
        return
    end

    if setTextVerified(node, value) then       -- ③ 写+读回校验，见下
        stat.texts = stat.texts + 1
        if CONFIG.PROBE_INNER then
            log("  刷上 层=" .. depth .. " name=" .. tostring(node.name))
        end
    end

    if depth >= CONFIG.INNER_DEPTH then
        return
    end

    local children = childrenOf(node)
    if children == nil then
        return
    end
    for i = 1, #children do
        assignAllText(children[i], value, depth + 1, stat)
    end
end
```

```lua
-- ③ 每条写入都读回校验：给「没有 text 字段」的控件写 text 通常是**静默无效**，
--    不校验就会把"没刷上"记成"刷上了"（v1 的坑本可以就此现形）
local function setTextVerified(ctrl, text)
    local ok = pcall(function()
        ctrl.text = text
    end)
    if not ok then
        return false
    end

    local readBack = nil
    local readOk = pcall(function()
        readBack = ctrl.text
    end)
    if not readOk then
        return false
    end
    return readBack == text
end
```

调用侧（按控件名认键，**不写死个数**，多一个 `0`/`10` 也自动跟着走）：

```lua
    local sub = { texts = 0 }
    assignAllText(ctrl, name, 0, sub)
    if sub.texts > 0 then
        stat.done = stat.done + 1
        log("  刷上 name=" .. name .. " 文本框数=" .. sub.texts)
    else
        log("  未刷上 name=" .. name .. "（整棵子树都没有可写 text 的文本框）")
    end
```

**验收输出**（`.gia 2026-10-01_14-22-36_5849`）：

```
[数字键] 初始化完成 total=10 done=10
[数字键测试] 创建成功 prefab=1073742456 id=2 name=密码解密 prefabIndex=1073742456
[数字键测试] 实例直接子控件数=2
```

---

## 3. "模板不会被创建出来"怎么办（第二个脚本的职责）

模板/控件组**不会自己出现在玩家的容器里** ⇒ 需要一个**挂在容器节点上**的脚本负责建：

```lua
    local ok, item = pcall(function()
        return game.InstantiateClientUIControl(CONFIG.PREFAB, Runtime.host)  -- host = script.object
    end)
    if not ok then … end
    if item == nil then … end          -- 号不对 / 没存为模板 ⇒ 只可能是 nil，没有异常
    item:SetActive(true)              -- ★ active 默认 false，不激活就整块不可见
    item:SetVisible(true)
```

- 两种失败**要分开记**：`ok=false`（调用异常）vs **`返回 nil`（号不对/没存为模板）** —— 后者没有报错，只靠日志区分。
- 建完最好**延迟几十帧再看一次实例内部**（本案例用 30 帧）——实例化是同步的，但"子控件是否齐、内部脚本有没有跑"看这一眼最省事。

---

## 4. 这个案例里的工具边界（AI 侧）

| 事 | 结论 |
|---|---|
| 新建活文件 | ❌ **`op=deploy` 不能创建新活文件**（回执原文：`关卡 … 下没有活文件 "数字键测试.lua"`）⇒ 必须**先在编辑器里「添加脚本」**把它建出来，我再 `deploy` 覆盖 |
| 局中看本局脚本日志 | ✅ **截编辑器的「日志」窗口**：`miliastra_shot {op:"capture", target:"editor", window:"日志"}` —— 本局 `.gia` 要等这一局结束才落盘，**局中这是唯一能看到 `print` 的路**（编辑器进程常带多个窗口，用 `window=` 挑标题） |
| 截图选错窗口 | ⚠️ 本轮复现旧坑：`target=game` 的回执写着 `process=YuanShen / title=原神`，**画出来的却是千星沙箱编辑器界面** ⇒ 画面证据一定要**看一眼**，别只看回执字段 |
| `preflight` 的 `IMAGE_WITHOUT_SOURCE` | ⚠️ 对「实例化**复合模板**」是**误报**（它按"用了 `InstantiateClientUIControl` 就必须有 `SetImage`"的启发式判）。本案例反证：脚本一处 `SetImage` 都没有，**画面 10 个白圆全部正常渲染** ⇒ 复合模板的图源在模板内部，脚本本就不该调 `SetImage` |
| 判"游戏跑的是哪版" | `miliastra_map {op:"script"}` 的 `match` + `miliastra_code {op:"inspect"}` 的 `sameAsDeploy`；`deploy` 回执的 `reconcile.match:false` = **改完还没存盘**，试玩跑的还是旧版 |

---

## 5. 可复用检查清单（下次遇到"改一批同款控件的字"照这个走）

1. **先读结构**：`miliastra_map {op:"clientui"}` 看 `records` 的 `parent/children` —— 认清哪些是**组**、哪些是**组内子节点**、哪些引用哪个模板。
2. **判能不能建**：无父节点的组/模板可建；**组内子节点返回 `nil`**；名字是自定义名时别指望 `likelyTemplates` 会列出来。
3. **钻进实例**：`GetChildren()` 递归，**默认深度给 4**（引用控件→预设按钮→状态容器→文本框）。
4. **全刷不止一个**：预设按钮是**四态**，每个状态一套 `[图片 + 文本框]` ⇒ 整棵子树全刷，别"找到第一个就停"（R14 同族：状态相关的字面量都要有赋值点，这里则是"每个状态都要被写到"）。
5. **每条写入都读回校验**：静默无效是这一域的常态，不校验就会假成功。
6. **日志给足判据**：`键 name=… type=…` + `刷上 name=… 文本框数=N` + `初始化完成 total=… done=…` —— 一局就能定位到"是哪一层断的"。
7. **部署后必须存盘**：`.gil` 是快照，`reconcile.match:false` 就说明这一局跑的还是旧版。

> 相关：`references/engine-boundaries.md`（#29~#32 本案例新增的实测边界）、
> `references/code-patterns.md` §11（同款代码形状）、`references/plugin-toolbox.md` §1.5 / §6（工具边界与坑）。
