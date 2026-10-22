# 千星 Lua 工程细则

按 [技能入口](../SKILL.md) 定位相关章节，不整篇预读。R/V/L2 编号保持不变，供现有文档引用。
Markdown 链接相对此文件；正文代码中的 `references/`、`scripts/` 相对技能根，`tools/` 相对当前工程工作区。历史地图路径只作示例，以工作区规则为准。

## 0. 一句话认清自己能干什么

| | 内容 |
|---|---|
| ✅ **AI 能做** | 写/改 `levelScript.lua`；读 API 文档判断玩法可行性；把参考图/帧序列编码成控件绘制流水线（点阵→矩形/形状→Lua）；用图片资产标注检索素材；静态检查、独立解码 round-trip、软件栅格比对、调用量统计 |
| ⛔ **AI 做不到**（必须创作者在编辑器做） | 建客户端控件容器 / 控件模板；把脚本挂到模板上；在千星沙箱里建 lua 映射；保存 + 试玩；完成工具不可达的编辑器操作与真机视觉验收；索引、脚本名和图片 ID 先通过工具或当前工程取证 |
| ⚠️ **平台硬边界**（环境定的） | 见 §1。任一不满足就是**静默不生效**——先查环境，别先怀疑代码 |
| 📋 **完成判据** | 见 §2。没在真实环境跑过一律 `pending`，**不许写"真机通过"** |

**能力上限（官方口径 + 实测）**：可实现**绝大多数 2D 玩法**与界面动态效果（双实证：平台跳跃《双相》4 关、网格游戏俄罗斯方块均真机跑通，见 `references/engine-boundaries.md`）；工作方式见 `references/usage-guide/千星沙箱客户端脚本使用指南.md` §一、§三。

<a id="rules"></a>

## 铁律（强制，不可违反）

> **说明**：以下规范是本域的硬性底线，所有千星脚本（新增/修改/重构）必须遵守。铁律分**两组**（查询成本递增）：
> - **一级（`R1`~`R14` 代码形态 · `V1`~`V7` 控件与几何）**：单文件内、模式固定，**快速扫描即可判定**——写码时即时遵守，审查时核对本次修改及受影响范围，不扩大为全仓审查。
> - **二级（`L2-01` ~ `L2-08`）**：**语义级**问题，跨脚本 / 跨局才能判定，**简单扫描扫不出来**——细则全在 [`references/iron-rules-l2/`](iron-rules-l2/)。
>   **写码时照常遵守二级要求；但二级专项查询默认不执行——用户没有明说就不进行查询**，仅当用户明确要求（"深度审查 / 二级铁律 / 接手摸底 / 重构前过查"等）时才按各文件「过查方法」专项过查。
>
> 一级铁律的具体**违反示例 / 改进示例 / 审查动作**见 [`references/iron-rules/`](iron-rules/)（`R1` ~ `R14`、`V1` ~ `V7`，一条一文件）；
> 二级铁律的细则与过查方法见 [`references/iron-rules-l2/`](iron-rules-l2/)（`l2-01` ~ `l2-08`）。
> ⚠️ **编号永不重排**：工程文档 / 需求清单 / 案例在引 `R4`、`L2-06` 这类编号（300+ 处）⇒ 只合并叙述、**不改编号**。
> **P 平台边界（1–9）不在本区**——它就是 §1 那张表，**动手前倒查**。

---

### R1　`OnUpdate` 必须包 `pcall` → 聚合故障块
- 引擎只调 `OnUpdate`：一次异常后**整脚本不再更新**，表现是"点了没反应"，而日志里**什么都没有**。
- 任何异常转成**聚合故障块**（首错 / 尝试数 / 交接值），**绝不静默死亡**。
- 审查动作：`node tools/check-lua-style.mjs`（`ONUPDATE_NO_PCALL` = error）。

> 违反/改进参考 → [`references/iron-rules/R1-onupdate-pcall.md`](iron-rules/R1-onupdate-pcall.md)

### R2　不许漏 `local`（漏了就写到黑板 / 全局）
- 漏 `local` = 往共用的黑板乱写全局（多脚本互相踩）；只有**登记过的跨脚本字段**才允许写全局。
- 审查动作：`node tools/check-lua-scope.mjs`（漏 `local`）＋ `node tools/scan-lua-globals.mjs`（**运行期给全局赋值** —— 真机上不生效）。

> 违反/改进参考 → [`references/iron-rules/R2-no-global-leak.md`](iron-rules/R2-no-global-leak.md)

### R3　函数 / 变量声明必须早于使用
- 闭包在声明前读到 `nil`；"前置声明 + 赋值"（`local f` … `f = function()`）是**语言硬规则**，不是风格偏好。
- 审查动作：`node tools/check-lua-scope.mjs`（报"第 N 行声明过"）。

> 违反/改进参考 → [`references/iron-rules/R3-declare-before-use.md`](iron-rules/R3-declare-before-use.md)

### R4　平台调用都包 `pcall`，失败必须有去向
- 返回值必须被使用（`fail()` 或 `log`）：裸调 = `BARE_PCALL`，"`pcall` 完就吞" = `SWALLOWED_PCALL`，都是 error 级。
- **例外**：可选功能失败允许**只降级 + 日志明说"不阻断"**——降级是让步，不是吞错。
- 审查动作：`node tools/check-lua-style.mjs`。

> 违反/改进参考 → [`references/iron-rules/R4-pcall-failure-route.md`](iron-rules/R4-pcall-failure-route.md)

### R5　无 BOM / LF / 缩进 4 空格 / 禁 tab
- BOM 会让原神直接报 Lua 错。
- 审查动作：`node tools/check-lua-style.mjs`（`BOM` / `CRLF` / `TAB` / `INDENT` = error）。

> 违反/改进参考 → [`references/iron-rules/R5-file-format.md`](iron-rules/R5-file-format.md)

### R6　不用 `assert` 引爆；校验走显式检查 + `fail()`
- `assert` 抛错中断整帧、信息零散；只留给"绝不该发生"的开发期自检。
- 审查动作：`check-lua-style`（`ASSERT` = warn，逐处分析是否会中断运行）。

> 违反/改进参考 → [`references/iron-rules/R6-no-assert.md`](iron-rules/R6-no-assert.md)

### R7　日志契约：`[标签] 消息` + `k=v`，单条 ≤10000 字符
- 关键值写成 `k=v`，`miliastra_log op=metrics` 才能直接抽取。
- 超出 10000 字符会被**静默截断** ⇒ 长输出必须分片。
- 审查动作：`grep -n 'print(' <脚本>` 人工过。

> 违反/改进参考 → [`references/iron-rules/R7-log-contract.md`](iron-rules/R7-log-contract.md)

### R8　交接值只能现读，禁止编造
- 容器/控件模板索引来自当前关卡 `.gil` 或创作者确认；图片资产 ID 可来自已核实的素材目录或本地索引，记录来源与未验证项。不得把旧关卡模板索引当通用常量；写死 = **换图即废**（实测 `1073741838` → `1073741839` 后旧号全不适用）。
- 审查动作：`miliastra_map op=clientui --summaryOnly` / `miliastra_sim op=handover`；确认过的值用 `miliastra_health op=handover` 记台账。

> 违反/改进参考 → [`references/iron-rules/R8-handover-values.md`](iron-rules/R8-handover-values.md)

### R9　构建产物不许直接改
- 改 `2.代码/main/` 之类**构建源片段**后重建；判断依据：存在 `tools/build-*.mjs` + 片段目录 ⇒ 你手上就是产物。

> 违反/改进参考 → [`references/iron-rules/R9-build-artifacts.md`](iron-rules/R9-build-artifacts.md)

### R10　画面不许塞诊断 / 兜底显示
- 诊断只走 `print` 与模拟器；画面上塞诊断会盖住真实观感，还会被误当成玩法。
- 审查动作：`grep -n 'FAULT@\|诊断\|状态>' <脚本>`。

> 违反/改进参考 → [`references/iron-rules/R10-no-onscreen-diagnostics.md`](iron-rules/R10-no-onscreen-diagnostics.md)

### R11　文件与函数规模有度（>1000 行要拆）
- 拆完先扫同义函数再合并，别造重复轮子。
- 审查动作：`check-lua-style`（`BIG_FILE` = warn）。

> 违反/改进参考 → [`references/iron-rules/R11-file-size.md`](iron-rules/R11-file-size.md)

### R12　文本控件高度必须容得下字号（`h ≥ 字号 × 1.4`）
- 容不下行高 ⇒ **整条一个像素都不画**（不裁切、不报错，**只有真机暴露**）。
- 审查动作：`node tools/check-ui-contract.mjs` 第 ④ 条（自动配对 `add(... "txt",x,y,w,h)` ↔ `setFont` / `.c.fontSize`）。

> 违反/改进参考 → [`references/iron-rules/R12-text-height.md`](iron-rules/R12-text-height.md)

### R13　`deploy` 之前必须先在模拟器跑一遍
- 动了 `view` / `board` / `hud` / `input` 任一脚本就要跑——真机一轮试玩很贵，模拟器 30 秒就能拦住"**整块界面消失**"这类崩溃。
- 审查动作：`miliastra_sim op=bind`（`last:true` 复用配方）→ `run.logs` 不许有 `attempt to call` / `nil value` / `首错=`，并看 `run.controlCount` 合理增长。

> 违反/改进参考 → [`references/iron-rules/R13-simulator-before-deploy.md`](iron-rules/R13-simulator-before-deploy.md)

### R14　动作类型必须与作者原话一致（★ 创作者明令）
- 原话：「**删除就一定要删除　替换就一定要换　不是隐藏不是注释就是直接删除原来的**」
- 说"删除" ⇒ **把创建它的代码真的删掉**；说"替换" ⇒ **旧的必须真的消失**、位置文案热区由新控件原样接管。
- ⛔ `SetVisible(false)` 藏起来 / 整段注释掉 / "留着以防万一" / "叠一层·新旧并存" 一律打回；⛔ 不许用"留在注释里"糊弄门禁字面量（正解是**改门禁**）。
- ⛔ **门禁红 / "判不了"不是不换的理由**：说替换就必须换（新控件接管位置·文案·热区）——**不许因为门禁报了错就回退成旧实现、删掉要换的功能、或拿个空壳顶上**。
- 审查动作：人工——把作者原话**逐字抄进任务**，完工逐条回执「**原话 → 我实际做了什么**」。

> 违反/改进参考 → [`references/iron-rules/R14-action-type-fidelity.md`](iron-rules/R14-action-type-fidelity.md)

### V1　图片资产 id 与控件模板 id 严禁混用
- **6 位 = 图片资产**（`SetImage`）｜**`1073742xxx` = 控件模板**（`InstantiateClientUIControl`）——混用画面出「**?**」。
- 审查动作：产物 `grep SetImage`，第二参数 ≥ 6 位 ⇒ 打回。

> 违反/改进参考 → [`references/iron-rules/V1-asset-vs-template-id.md`](iron-rules/V1-asset-vs-template-id.md)

### V2　复合模板（带子控件的）实例化后禁止 `sanitize()`
- 对**带子控件**的模板做"清理"动作 = 真机"**整卡不画**"，且静默。
- 审查动作：清理动作只对**单图模板**开白名单。

> 违反/改进参考 → [`references/iron-rules/V2-no-sanitize-composite.md`](iron-rules/V2-no-sanitize-composite.md)

### V3　几何只按官方 API 读，别用编辑器字段名
- **只用 `GetAnchoredPosition()` / `GetSizeDelta()` / `GetSiblingIndex()`**：`posX` / `width` / `height` 是**编辑器字段**，真机为 `nil`（**`nil` ≠ 没设置**）。
- 审查动作：探针里出现 `posX` / `width` / `height` ⇒ 打回。

> 违反/改进参考 → [`references/iron-rules/V3-geometry-official-api.md`](iron-rules/V3-geometry-official-api.md)

### V4　位置口径：有父层级 = 相对**父层级中心**的偏移
- `SetAnchoredPosition` 在**有父层级时**相对**父层级中心**，不是画布中心。
- 审查动作：坐标换算默认"画布中心" ⇒ 复核。

> 违反/改进参考 → [`references/iron-rules/V4-parent-center-offset.md`](iron-rules/V4-parent-center-offset.md)

### V5　层级：索引越大越靠上（文档写"通常"）
- 精确插位用 `SetSiblingIndex(i)`；别把 `SetAsLastSibling` 当提层万金油。

> 违反/改进参考 → [`references/iron-rules/V5-sibling-order.md`](iron-rules/V5-sibling-order.md)

### V6　画布上摆的实例：建不了、但找得到
- 画布上摆的实例**不能 `InstantiateClientUIControl` 出来**，但**能按名字找到**：`GetChildren()` 扫名字 → `GetChild("子控件")` → 改 `text`（复合模板优先走这条）。

> 违反/改进参考 → [`references/iron-rules/V6-canvas-instance-findable.md`](iron-rules/V6-canvas-instance-findable.md)

### V7　实例化时机是变量
- **build 期建的**与**渲染期建的**同模板，行为可能不同（真机见**两份结果相反**）⇒ 排查时把"时机"列入对照。

> 违反/改进参考 → [`references/iron-rules/V7-instantiate-timing.md`](iron-rules/V7-instantiate-timing.md)

---

### 二级铁律（深度审查级：L2-01 ~ L2-08）

> **定位**：一级铁律看单文件形态就能判；二级铁律是**语义级**——每处代码单看都"没错"，违规发生在**跨脚本 / 跨局 / 依赖上下文**层面，**现有快速扫描扫不出来**。
>
> **查询边界：用户没有明说就不进行二级查询。** 日常写码按二级要求写（如黑板单向写、`OnStart` 不等于"每局都跑"），但**不主动跑**本节任何「过查方法」；仅当用户明确说出（"深度审查"、"二级铁律查一遍"、"重构前过查"、"接手摸底"等）时，才按各文件「过查方法」专项执行。

| 编号 | 铁律 | 一句话判定 | 细则与过查方法 |
|------|------|-----------|----------------|
| **L2-01** | **跨脚本层级** | 跨脚本压盖只 `InstantiateClientUIControl` 就以为在最上层，或清理遗留控件无白名单 → 【违规】 | [`l2-01`](iron-rules-l2/l2-01-cross-script-layer.md) |
| **L2-02** | **重画判据用状态串** | 重画判据只用 `fx` 单值（跨局整屏停在上局）→ 【违规】 | [`l2-02`](iron-rules-l2/l2-02-redraw-state-string.md) |
| **L2-03** | **`OnStart` 不是每局都跑** | 把 `OnStart` 当"每局都跑"用（缺 `freshStart()` + 新局检测）→ 【违规】 | [`l2-03`](iron-rules-l2/l2-03-onstart-fresh-start.md) |
| **L2-04** | **黑板单向写** | 一个字段有两个写入者（跨脚本互写）→ 【违规】 | [`l2-04`](iron-rules-l2/l2-04-blackboard-single-writer.md) |
| **L2-05** | **控件名是契约** | 名字拼错——严格模式下**冻结整脚本** → 【违规】 | [`l2-05`](iron-rules-l2/l2-05-control-name-contract.md) |
| **L2-06** | **光标事件双前置** | ① 祖先容器没开 `showCursor = true`；② 绑定对象不是「预设按钮」/「光标检测区域」（容器·图片·文本框都没这个方法）→ 【违规】 | [`l2-06`](iron-rules-l2/l2-06-cursor-prerequisite.md) |
| **L2-07** | **每帧预算** | 每帧无脑 setter、每个效果各建控件、不复用父节点 / 池子 → 【违规】 | [`l2-07`](iron-rules-l2/l2-07-frame-budget.md) |
| **L2-08** | **玩法本体不碰** | 顺手改规则 / 判定 / 数值 / 组件位置 → 【违规】 | [`l2-08`](iron-rules-l2/l2-08-gameplay-untouched.md) |

> **审查分级**：日常写码 / 快速审查 → **只查一级**；二级铁律**默认不查（用户没明说就不进行查询）**；用户明确要求深度审查 / 二级铁律时 → **两级全查**。
> ★ **L2-07 量级锚点**：**一颗粒子 = 一个控件**。真机 `~950 控件 @58.8fps`；**`5188 控件 / 3200 粒子` = 「小卡」可接受（创作者裁决的软上限）**。
> 池**供给 = 池大小 / 寿命**、**需求 = 施法者数 × 每秒次数 × 每发颗数**，超供给会**静默抽干**；"越来越稀"有两个同症状病因 ⇒ 先看**活跃数 vs 空闲数**。
> 公式与可增长池：[`references/vfx-particles-and-budget.md`](vfx-particles-and-budget.md)

#### 排查方法（"东西看不见"时按这个顺序走，**不占铁律编号**）

| 代号 | 方法 |
|---|---|
| **L2-V1** | "没显示"先分三类：①没建出来（查日志）②建出来不可见（查清理 / 几何 / 层级）③被盖住（同级扫矩形 + 索引找真凶）→ [细则](iron-rules-l2/l2-v1-not-visible-triage.md) |
| **L2-V2** | **先日志 → 无报错直接上散布实验**：同模板画布 3×3 九点各一份、每帧重设位置 + 可见性（四种结果各指向什么，见细则）→ [细则](iron-rules-l2/l2-v2-scatter-experiment.md) |
| **L2-V3** | **一个实验只改一个变量**（连改多处 ⇒ 结论不可归因）→ [细则](iron-rules-l2/l2-v3-one-variable.md) |

---

### 冲突裁决（紧急避险条款）

> 当上述铁律之间、或铁律与"用户意愿 / 平台能力 / 性能底线"产生不可调和的冲突时，按此顺序处置：
> **⓪ 作者意图 vs 门禁 / 证据（最高优先，先看这条）**：门禁红、`ok:null`、"没测 / 判不了"**一律不构成**"不实现 / 回退旧版 / 删功能 / 做空壳"的理由——**门禁只是证据，作者的要求是命令**。
> 正确动作只有两个：**① 修到门过**（只有证据证明判据错误且修改在授权范围内时才修判据，并验证正反例）**② 保留候选并如实标 `pending`，说明阻塞**；error 级失败仍禁止部署，不让真机试玩替代已知错误修复。
> ① **平台做不到 vs 创作者要的效果** → **不改玩法意图**，给 **2~3 个可落地替代**（换素材 / 换表达 / 降级为动效）让他选；
> ② **规范 vs 存量代码** → **跟存量走**（不为统一重排全库）；只有明确"要整改"时才走 [`references/style-remediation-workflow.md`](style-remediation-workflow.md) 三步；
> ③ **性能 vs 规范 / 可读性** → 先限额（限频 / 控件池 / 共享父节点）；仍不够才谈豁免，且豁免必须**留注释写理由**并记进交付报告；
> ④ **AI 能力边界 vs 需求** → 越界的（建控件 / 挂脚本 / 建映射 / 点试玩 / 看真实画面）**明确说"这步只能你做"**，不硬扛、不假装、不用别的办法绕过。

---

## 开工前检查（按本次操作选择）

- 需要当前关卡/活文件时，用 `miliastra_health brief:true`；覆盖活文件前用 `miliastra_code op=inspect` 核对目标、归属和 SHA，先备份。并发变化停止覆盖并报告。
- 涉及模板、挂载或“改了没效果”时，查目标 `clientui` 子树及 `op=script`，不要全图盘点。
- 改前读目标源码和必要引用，识别构建源与产物；按当前工作区的构建入口操作，不套用其他地图路径。
- 机械门禁及基线见 §8；复用绑定同一候选 SHA 的有效结果。基线缺失是未建立证据，不拿其他地图基线代替。
- `preflight.dir` 只指向本次候选及必要部署依赖的独立暂存目录；开工检查尚无候选时使用目标源码副本，不递归检查工作区根、历史或备份。

<a id="platform"></a>

## 1. 平台硬边界：不满足就静默失效（动手前先过这 9 条）

| # | 边界 | 现象 / 必须做什么 |
|---|---|---|
| 1 | 运行时主屏**没有客户端控件容器**（或容器建了但**没在「界面布局」里添加界面控件把它加进来**） | 所有客户端控件与脚本**都无法生效**——先让创作者确认容器存在**且已进界面布局**，别改代码（清单见 `references/editor-setup-sop.md`） |
| 2 | 容器被**隐藏或关闭** | 其中所有客户端控件都不显示 |
| 3 | 脚本**没挂载在客户端控件模板上** | 不生效。只有挂在客户端控件模板上的脚本才正常生效 |
| 4 | lua 未在千星沙箱**建立映射** | 运行时**上传不上去**（顺序：保存脚本 → 沙箱侧保存 → 试玩） |
| 5 | **只有「存为模板的客户端控件的父节点」可被脚本实例化**（`ClientUIBaseControl`） | 主屏中挂载的控件、以及模板控件的**子节点**，**都不能**用脚本接口实例化——这条直接决定 AI 能动态创建什么 |
| 6 | 部分控件的部分属性**未开放给脚本**，只能静态控制 | 查 annotation / API 文档确认；查不到就 `unknown`，不要试写 |
| 7 | 按键提示控件**仅影响视觉**，不影响响应事件 | 别拿它当输入源 |
| 8 | 仅靠控件**无法完成手柄导航配置** | 适配逻辑必须在脚本里写 |
| 9 | 出现**循环调用** | 进关加载变久甚至卡死，而且**正常日志无法报告**——去查本地 `ErrorLog.txt`（与客户端脚本同目录，仅在正常日志无法报告的错误时才创建） |

> 这 9 条里 1~5 是"AI 再怎么努力也修不好"的类型。遇到"代码没问题但没效果"，**按这个顺序倒查环境**，不要陷入反复改代码。

<a id="evidence"></a>

## 2. 完成判据：AI 的证据边界

守则 §6.1 的两把尺子必须**分开写**，混在一起就是自欺：

- `evidence_source`：`documented`（文档写明）/ `provided_unverified`（创作者给的、未核对）/ `observed`（真实环境直接观察到）/ `inferred`（静态推断）/ `unknown`（无证据或证据冲突）
- `device_status`：`passed` / `failed` / `pending`（需真机但没跑）/ `not_required`

> ⚠️ **`pending` 是"交付状态"，不是"停止信号"**：该做的实现照做、照交付，只是把"未在真机验证"如实标出来 —— **别把"没证据"做成"不实现"**。
> 典型坏结局（**实测发生过**）：门禁对某项报"没测 / 判不了"（`ok:null`），AI 就**一直交空壳**（例：作者要"3 个状态的按钮模板"，AI 交了个空按钮）；或一看到门红了就**把作者的改动整个回退**。
> ⇒ 这两种都属"脱离掌控"：**要求照做，证据如实标**；门红了就修到过，修不动就 `pending` + 说明卡在哪，**不许靠删功能 / 回退 / 占位来让门变绿**。

- **四条"不能证明"**（照这个划边界，别越界宣称）：静态检查 ↛ 编辑器真实行为｜最小探针 ↛ 完整玩法｜场景测试 ↛ 所有故障分支｜故障注入 ↛ 正常画面保真（细则见 `references/guardrails.md`）。

**自报成功 ≠ 成功**：绑定调用报错、文档支持的读回结果不一致、画面仍是问号/缺图占位、状态切换后恢复成模板默认资源——任一发生立即进入 `FAILED`，解决前**不得继续使用该资源**。

### 故障块模板（R1 的代码形状）

`OnUpdate` 全体包 `pcall`，任何异常转成聚合故障块（带首错/尝试数/交接值），**绝不静默死亡**。已验证的代码形状（俄罗斯方块/《双相》三轮排障全部一轮定位，见 `../miliastra-bb/references/examples/yuan-tetris-first-game.md`）：

```lua
function OnUpdate(dt)
    -- 任何 tick 内异常都转成聚合故障，绝不静默死亡
    local ok, err = pcall(tick, dt)
    if not ok then fail("OnUpdate 异常: " .. tostring(err)) end
end
-- fail(): 同一故障只报一次；块内含 首错 / 尝试数 / 最后原因 / 交接值
-- 骨架直接生成：node scripts/scaffold-game.mjs <输出.lua> [游戏名]
```

<a id="handover"></a>

## 3. 交接边界

- 先从当前关卡、源码和已确认记录获取容器节点索引、实际挂载脚本名与本次所需模板索引；不能获取的再集中向创作者询问。接受名称、相对或绝对路径，不要求重发已有值。
- 图片资产 ID 按需检索，遵循 `miliastra-ui` 的素材检索参考；不索取或整读全部图库。
- 需要创作者配置编辑器时，列明本次必要的控件名称、父级、开关及挂载关系；不让创作者重复提供可由工具读取的信息。
- 未形成可玩候选前，不把反复点击、拖拽或校准交给创作者。完成可执行部分后，明确需要创作者完成的存盘、试玩或视觉确认。
- 改造现有脚本前按工作区规则留可恢复快照；备份位置采用当前项目约定。

## 4. 两条技术路线（**仅在用户要求帧动画或像素重建时选择**）

| 路线 | 何时用 | 参考文件 |
|---|---|---|
| **控件帧动画** | 做/重建/优化序列帧动画：参考帧 → 控件矩形流（矩形合并、父节点共同运动、控件池、I/P 帧差分与字典压缩） | `references/frame-animation.md`（+ 体积压缩细读 `references/compact-stream.md`） |
| **像素画重建** | 参考图 → 像素画控件拼图：点阵/调色板/图层、同色矩形与形状拟合、压缩与独立验证 | `references/pixel-reconstruction.md` |

★ **仅在用户要求帧动画或像素重建时选择**：
- **像素画** → `miliastra_gen {op:"pixel-art", source:"<图片绝对路径>", cols:…, pixelSize:…}`
  （**实测**：cols=6 / pixelSize=4 ⇒ 每人 ~27 块；74 人共 1977 块 ✓ 产物是**矩形块拼图**，不是一像素一控件）
- **逐帧刷字（流光标题）** → `miliastra_gen {op:"text-gradient", text:…, colors:[…]}` ⇒ 直接出可用 Lua
- 手动路线（本节两份 reference）留给**生成器覆盖不到的形状**（异形遮罩、复杂图层、需要极致压缩的帧流） ✓

两条路线的产物都受 §1 第 5 条约束（**能实例化什么**是平台定的），也都受 §2 约束（**验证器必须独立于编码器**，没真机就如实标 `pending`）。

## 工程纪律（执行与交付）

需要核对授权、修改范围、验证强度或交付证据时，读 [工程纪律](discipline-lua.md)。部署门禁的执行口径统一见 §8，不叠加重复流程。

<a id="workflow"></a>

## 工作流总览（意图 → 走哪条）

| 用户说什么 | 阶段 | 走哪条 |
|---|---|---|
| "控件没反应 / 静默失效 / 改了没效果 / 日志里什么都没有" | **环境倒查** | §1 九条按序倒查（1~5 属"改代码修不好"的类型） |
| "跑不起来 / 崩了 / 冻结了 / 点了没反应" | **运行时排障** | `miliastra_log op=runs` 找 `首错=` → 修 → 再跑（§2 故障块模板） |
| "第二局不对 / 跨局残留 / 开局就带着上局状态" | **生命周期** | L2-02 / L2-03 ＋ 模拟器复现 |
| "界面丑 / 看不清 / 没层次 / 摆版面 / 动效" | **视觉与布局** | 技能 `miliastra-ui`（整屏范本 `case-detectives-ui.md`、背景范本 `procedural-background.md`） |
| "序列帧动画 / 逐帧还原 / 帧数据太大" | **帧动画路线** | §4 → `references/frame-animation.md`（+ `compact-stream.md`） |
| "像素画 / 参考图转控件" | **像素画路线** | §4 → `references/pixel-reconstruction.md` |
| "按规范扫一遍并整改 / 清理存量 / 接手别人的脚本" | **规范整改** | `references/style-remediation-workflow.md` 三步（备份→摸底→分档）＋ `references/lua-style.md` |
| "起个新玩法 / 搭骨架" | **新工程** | `node scripts/scaffold-game.mjs <输出.lua> [游戏名]`（生成物已内置故障块与两道门禁写法） |
| "要接音效 / 加了音没响 / 想调音量" | **音效** | `references/code-patterns.md` §1（平台只有播/停/查三个动作；**没有音量参数**）＋ §8（该接哪些点） |
| "按钮字色不对 / 黑字黑底 / 状态卡住" | **按钮四态** | `references/code-patterns.md` §3（每帧按同一份状态**成对刷**底板+字色） |
| "要圆角 / 要画圆 / 要排表格 / 要单独标红一行" | **平台画不出来的替代** | `references/code-patterns.md` §4–§5（羽化伪圆角 / 窄条拼圆 / 全角空格对齐 / 独立文本框染色） |
| **"要做粒子特效 / 技能弹道 / 特效卡不卡 / 到底能建多少控件"** | **特效与真机预算** | ★ [`references/vfx-particles-and-budget.md`](vfx-particles-and-budget.md)（真机软上限 / 池子吞吐 / 可增长池 / 预存多套） |
| "多脚本 / 黑板通信 / 分工怎么分" | **多脚本工程** | `references/case-detectives-6scripts.md`（分工表 + 黑板契约 + 构建期防错） |
| **"新玩法开工前怎么定架构 / 要几个脚本 / 容器怎么分 / 变量挂哪个实体"** | **新项目架构评估（规划）** | `references/project-architecture-assessment.md` 七步 ＋ 开工前填表模板（**从 `miliastra-bb` 接来的 `需求边界清单_*.md` 就是这一步的输入**） |
| "这个 API 怎么调 / 这接口存在吗 / 枚举叫什么" | **API 核对** | §6：项目 `annotations.lua` → `references/api-client-ui.md`；查不到标 `unknown`，**禁止猜** |
| **"这张图都干了啥 / 谁身上挂着哪张图 / 什么时候跑"** | **节点图能力读取** | ★ [`references/node-graph-capabilities.md`](node-graph-capabilities.md)（区地图 / 挂载判据 / 入口事件） |
| "要模板索引 / 容器索引 / 资产 ID" | **交接** | §3 按需交接；能自动读的先读（`miliastra_map op=clientui` / `miliastra_sim op=handover`） |
| **"按名字找不到控件 / 名字对但设不了字段 / 作者把块做成了模板引用"** | **控件名与探测** | ★ [`references/control-name-and-probe.md`](control-name-and-probe.md)（三种控件来源形态 · 候选+**字段探测** · `SCAN_TREE` 诊断 · `.gil` 反查名字与父 id） |
| **"两个脚本怎么传数据 / 界面关了数据就丢 / 跨脚本调用没反应"** | **跨脚本通信** | ★ [`references/cross-script-comm.md`](cross-script-comm.md)（**只走控件黑板**；`GetScript` / `Invoke` 两次真机证伪；`game.GetClientUIRoots()` 拿同一个根） |
| "改完能不能上 / 该试玩了" | **交付闸门** | 按 **§8 门禁流程**走完（含 `deploy` → 编辑器存盘 → `match:true` → 人试玩） |

<a id="catalog"></a>

## 5. 资料索引（我该读哪个文件）

> 分工：**本节**回答"东西在哪"；上文「工作流总览」回答"用户这么说时走哪条"。路径均相对本技能目录。

### 5.1 官方 / 外部资料 → 本机

| 资料里的名字 | 本机对应 | 状态 |
|---|---|---|
| `readme.md`（官方包内守则） | `references/guardrails.md` | ✅ 原文照录（有 1 处本地改动，见账本） |
| 官方《客户端控件 API 文档》 | `references/api-client-ui.md`（1127 行，接口全带签名） | ✅ 见 §6 |
| 官方《千星沙箱客户端脚本使用指南》 | `references/usage-guide/千星沙箱客户端脚本使用指南.md` | ✅ 正文在；34 张配图已剥离 |
| 图片资产数据标注 | `assets/asset-catalog.md`（1543 条索引，可 rg）或插件 `miliastra_asset op=catalog` | ⚠️ 原始 JSON 已移出技能 |
| `annotations.lua`（随项目给的 API 签名） | 千星域项目工作区 | ⚠️ 本机无 → 退用 `api-client-ui.md`，见 §6 |
| `levelScript.lua` | 千星域项目工作区 | AI 的**唯一落点** |
| `API/Tools/ReconstructPixelArt.py`、`ValidatePixelArtLua.py` | 本机**没有** → 按 `pixel-reconstruction.md` §1.4 任务内自建 | ❌ |
| 来源 / 哈希 / 许可账本（含空壳导出 `api-client-ui-outline.md` 的留痕说明） | `references/api-doc-sources.md` | ✅ |

### 5.2 本技能 reference（「工作流总览」未覆盖的那些）

| 用途 | 文件 |
|---|---|
| 铁律 R / V（机械可查） | `references/iron-rules/`（R1–R14、V1–V7，**一条一文件**） |
| ★ **门禁工具（技能自带快照，可携带）** | `scripts/gates/`（入口 `gate.mjs`，认**显式文件/目录**；判据与工程工作区逐字一致；用法/差异/刷新见其 [`README.md`](../scripts/gates/README.md)） |
| ★ **变量 JSON 转换**（Excel / CSV / TSV → 千星可导入的「自定义变量」JSON） | `scripts/varjson/excel-to-json.mjs`（宽表两行表头 → **字典**；长表 → 结构体；中文类型名认「整数 / 浮点数」；GBK 自动回退）。配套**只读**探针 `scripts/varjson/probe-gil-vars.mjs` 可 dump `.gil` 里实体自定义变量的默认值字段 |
| 铁律 L2（语义级，**默认不查**） | `references/iron-rules-l2/`（L2-01~08、L2-V1~3） |
| 客户端控件与按键实测（只有"存为模板"的能动态创建 / 164 项按键 / `pairs()` 返回 0 项） | `references/千星奇域_客户端控件与按键实测.md` |
| 工程纪律五节 | `references/discipline-lua.md` |
| Lua 代码风格（融合版） | `references/lua-style.md` |
| 编辑器配置 SOP（容器/模板/多脚本/黑板） | `references/editor-setup-sop.md` |
| 引擎实测边界清单（编号事实表；含 #44~47：模板引用 / 名字≠控件 / cursor 方法不通用 / 状态子控件可缺） | `references/engine-boundaries.md` |
| ★ **控件名怎么定**（三种来源形态 · 候选+**字段探测** · `SCAN_TREE` · `.gil` 反查名字与父 id · `MOCK_MODE` 假数据） | `references/control-name-and-probe.md` |
| ★ **跨脚本通信**（唯一正解=**控件黑板**；`GetScript`/`Invoke` 为何不行；常驻脚本保管+重发模式） | `references/cross-script-comm.md` |
| ★ 可照抄的代码片段（变量/信号/提前布点/直推） | `references/code-snippets.md` |
| 黑板 → 自定义变量 + 服务器信号（完整案例） | `references/blackboard-to-variable-signal.md` |
| 数据口径（四种基础类型 / 列表优先 / 关卡实体=数据库） | `references/variables-and-signals.md` |
| ★ 极限粒子测试案例（可照抄代码） | `references/case-extreme-particles.md` |
| ★ 插件工具箱（`dsh-miliastra` 怎么用） | `references/plugin-toolbox.md` |

### 5.3 资产与跨技能

| 东西 | 在哪 |
|---|---|
| 可导入节点图（4 类型信号 → 通用设变量） | `assets/信号节点图_4类型整改_侦探杀_20260929.gia`（**推荐导入**；不方便就按 `variables-and-signals.md` §5 手搭 8 个节点） |
| 图片资产索引（1543 条） | `assets/asset-catalog.md` |
| 玩法实战案例（俄罗斯方块 / 双相跳跃） | `../miliastra-bb/references/examples/yuan-tetris-first-game.md` · `../miliastra-bb/references/examples/yuan-biphase-flip.md` |
| 界面视觉规范 | 技能 `miliastra-ui` |
| 需求边界确认 | 技能 `miliastra-bb` |

## 已运行对话工程的复用入口

对话、黑幕、选项/分支、历史记录、挂载脚本通信、require、Tween 时间线、复杂变量读取：按需读 [`references/dialog-template-patterns.md`](dialog-template-patterns.md)。该参考基于 2026-10-18 用户确认可运行的 51 文件工程，区分来源确认与本轮实测；它也修正旧文中的 PlayerSelf、Invoke 和单入口限制。

<a id="api"></a>

## 6. API 依据与已知差异

**硬要求（守则 §3）**：具体类型/函数/字段/枚举/参数/返回值**一律以当前 API 文档为准**；README、旧脚本、示例、模型记忆用于定位；用户确认可运行且已读源码的范例可补充运行写法证据，但不替代 API 类型/签名，不把未走到的分支当实测。查不到就标 `unknown` 并停止依赖它的实现——**禁止猜**。

依据优先级：**项目工作区的 `annotations.lua`（若存在，它是当前版本）→ `references/api-client-ui.md` → 冲突时以工作区文件为准并记进报告**。

> ⚠️ **已核出的真实差异**：原官方技能 `lua-control-frame-animation` 写的是 `script:EnableTick(enabled)`，
> 而 API 文档中是 **`script:EnableUpdate(enabled: boolean)`**，**没有 `EnableTick`**。
> 照原文直接抄会拿到一个不存在的方法（静默失效）。**写代码时用 `EnableUpdate`**，并在拿到项目内 `annotations.lua` 后复核定论。
> 其余核对：官方技能引用的 **29 个接口全部存在于文档**（`game.InstantiateClientUIControl` / `DestroyClientUIControl` /
> `GetUICanvasSize` / `SetImage` / `SetSizeDelta` / `SetAnchoredPosition` / `SetLocalScale` / `SetLocalRotation` /
> `SetSiblingIndex` / `imageColor` / `OnInit`~`OnDestroy` / `Enum.ImageSource` / `Color.FromRGB`… ）。

运行环境锚点：**Lua 5.3**；不可用 `string.dump`、`io.*`、除 `os.time/date/clock/difftime` 外的 `os.*`、除 `debug.traceback` 外的 `debug.*`；补充 `math.isnan` / `math.isinf`。

<a id="style"></a>

## 7. 代码风格（速查）

> 三份外部 Lua 风格指南（LuaRocks / Olivine / Daedalic）**按千星现实仲裁**后的结果：冲突处一律**跟本工程既有代码走**，不为"统一"重排全库。
> 判定与审查动作在铁律区（R1/R4/R6 异常、R2/R3 作用域、R5/R11 形态、R7 日志），本节只讲**风格口径**；细则与 §11 自查表见 `references/lua-style.md`。

- **缩进 4 空格**、禁 tab、LF；运算符与逗号两侧留空格；**不用分号**；函数名与括号之间不留空格。
- 命名：变量/函数 **camelCase**、常量 **ALL_CAPS**、布尔 **`is`/`has` 前缀**且不用否定名。
- **早校验、早返回**；`else` 不跟在 `return` 后面；单行块只许 `then return` / `then break`。
- **文件头版本块**照工程既有格式写（玩法名 + 逐版"日期 + 依据 + 改动" + 交接值 + 键位/物理 + 接口章节），**只加不覆盖** —— 日志里的版本行要能和它对上。
- **改完先过门禁**：顺序与分工见 **§8 门禁流程**（作用域 + 风格两道必跑，UI / 构建 / 插件两道按改动性质加挂）。
- 工具**不判**的那几条（布尔命名语义、`k=v` 内容、常量表纪律、黑板单向写、失败去向…）逐条过 `references/lua-style.md` §11。
- **要"按规范扫一遍并整改"时**：走 `references/style-remediation-workflow.md` 三步（**① 先备份 → ② 贪婪摸底 → ③ 分档改造**）；备份命令 `tools/snapshot-lua-project.mjs`（连片段一起快照）；机械档 `--fix`、判断档逐条改、历史产物与玩法数值**不碰**。

<a id="validation"></a>

## 8. 门禁流程（改完按这个顺序过，**口径以此节为准**）

> 分工：**工作区脚本**（`tools/*.mjs`，跑在本机工程目录）管语言形态与 UI 契约；**插件 op** 管真语法与平台 UI 铁律；两者互补，不互相替代。
> ⚠️ 路径口径：这些 `tools/` 在**工程工作区**（如 `Desktop\yuanshen\tools\`），**不在技能目录里**；技能只给命令口径。路径由 `tools/_paths.mjs` 统一解析，**子脚本一律以工作区根为 cwd 跑**。

- ★ **日常一把跑（工作区里，单一入口）**：`node tools/check.mjs [--map <地图>]` —— **薄封装四道门** + 「门｜命令｜exit｜结论」汇总表：
  `① scope`（作用域 / 控件名）· `② style --summary`（风格）· `③ iron`（**R1–R11 状态板**）· `④ ui-contract`（**只服务《侦探1》**，别的图自动 skip、不算失败）。
  `--only <scope|style|iron|ui>` 只跑一道；地图名认别名（侦探杀→侦探1、双向→双相…），**认不出就报错并列候选，不猜**。
  ⚠️ 它**刻意不卡基线**（没基线的图 `exit 2` = "没法跑"，不是"跑红了"）⇒ 卡基线要单独跑 `check-lua-style --baseline --map <地图>`；`--fix` / `--update-baseline` / `--selftest` **只在旧命令里**，门红了**直接跑那一道门**定位。
- ★ **换了电脑 / 没有工作区**：`node scripts/gates/gate.mjs --dir <目录>`（技能自带快照，认**显式文件/目录**；**不认 `--map`**、不卡基线；判据与工作区逐字一致，差异见 [`scripts/gates/README.md`](../scripts/gates/README.md)）。
  **技能里另有 6 个可单跑的门禁脚本**（不只有那四道）：`check-script-attach.mjs <关卡>.gil`（**脚本真的挂到控件上了吗** → 挂在哪个控件）· `scan-lua-globals.mjs <目录>`（**R2 专项**）· `gil-clientui.mjs <关卡>.gil`（控件模板索引现读）·
  `scan-gil-ids.mjs` · `scan-binary-api.mjs` · `snapshot-lua-project.mjs <目录>`。完整清单（含哪些是**工程专用、技能里跑不了**）见同目录 README。

| # | 门 | 命令 | 什么时候跑 |
|---|---|---|---|
| 0 | **改前快照** | `node tools/snapshot-lua-project.mjs --map <地图> --label "改前"`（`--restore` 回滚） | 改动已有能跑的脚本前 |
| 1 | **作用域**（R2 / R3 / L2-05） | `node tools/check-lua-scope.mjs [--map <地图>]` | **候选代码变化时运行，复用同 SHA 有效结果** |
| 1b | **全局赋值自查**（R2 专项） | `node tools/scan-lua-globals.mjs [--map <地图>]` | 动过**标志位 / 缓存 / 累加器**时（真机上"写全局"不生效，实测刷出 13 983 行日志） |
| 2 | **风格**（R1/R4/R5/R6/R11） | `node tools/check-lua-style.mjs --map <地图>`（看现状）｜**`--baseline` = 卡"不许比基线差"**（本图有基线时） | **候选代码变化时运行，复用同 SHA 有效结果**（error 必过） |
| 3 | **UI 契约**（R12） | `node tools/check-ui-contract.mjs` | **动过界面 / 布局 / 字号**才跑（画在哪=点哪算 · 8 的倍数 · 字号档 · `h ≥ 字号×1.4`） |
| 4 | **构建**（R9） | `node tools/build-main.mjs --map <地图>` | **改过构建片段**才跑（字段契约 + 关卡表断言，不合格**拒绝落盘**） |
| 5 | **插件真语法** | `miliastra_code {op:"preflight", dir:"<只放可部署产物的目录>"}` | `deploy` 前；覆盖范围以当前版本回执为准，不替代项目规定的独立作用域/风格/UI 门禁 |
| 6 | **平台 UI 铁律** | `miliastra_code {op:"lint-ui"}` | 动过界面时，与第 3 道并行看 |
| 7 | **模拟器**（R13） | `miliastra_sim {op:"bind", runForMs:16000}` → `run.logs` 无 `首错=` | `deploy` 前（动过 `view`/`board`/`hud`/`input` 必跑） |
| 8 | **部署 → 存盘 → 对齐 → 试玩 → 取证** | `deploy`（显式 `level`+`file`）→ 编辑器**存盘** → `miliastra_map op=script` 看 `match:true` → **人点试玩** → `miliastra_log {op:"errors"}` | 交付 |
| 8b | **挂载对账**（"改了没反应"先查这条） | `node tools/check-script-attach.mjs <关卡>.gil` | 存盘后，或怀疑"脚本没挂上"时（比 `op=script` 多给"**挂在哪个控件**"；解析失败会说 `PARSE_FAILED`＋结论不可用） |

#### 门被打回了，怎么动（⚠️ 最容易"脱离掌控"的地方）

- **门禁是证据，不是否决权**。红的正确动作只有两个：**① 修到过**（必要时改的是**门禁判据**——工具是我们自己的，改判据比骗检查对）**② 保留候选并如实标 `pending`，说明阻塞**；error 级失败仍禁止部署，不让真机试玩替代已知错误修复。
- ⛔ **不许**：回退 / 还原成旧实现 · 删掉或藏起作者要的功能（`SetVisible(false)`、注释掉也算）· 用空壳 / 占位 / 假数据凑数。
- ⛔ **`ok:null` / "没测" / "判不了" ≠ 失败**：那只是"本轮没证据"——**照作者要的做**，把未测项如实标注。**别把"没证据"做成"不实现"**。
  实测坏结局：门禁说某项没测，AI 就一直交空壳（作者要"3 个状态的按钮模板"，交出来的是空按钮）。
- **作者意图 > 门禁**：门禁挡住作者明确要求的实现时，**保留实现**、把门禁结论当**报告项**列出（红了什么 / 哪一行 / 为什么 / 我怎么修），证实判据错误且在授权范围内时修正判据并验证正反例——**绝不改需求、绝不退回旧版**。
- **症状自检**：发现自己在做「门一红就撤销改动」或「门说没测就一直交空壳」⇒ **停**，回到上面两条。

- ⛔ **error 级红 / 基线变差 ⇒ 不许 deploy**；第 7 道有 `首错=` ⇒ 修完再 deploy，别把人请来试一个已知会崩的版本。目标选择与基线口径见 [`scripts/gates/README.md`](../scripts/gates/README.md)。

## 输出格式（交付模板）

1. **结论先行**（1~2 句：改了什么 / 判定是什么 / 能不能上）
2. **改动或代码**，关键行带 `-- 为什么这样写`
3. **证据**：命令 + 回执要点（deploy SHA / `log op=runs` 无首错 / 模拟器 `snapshot.logs` / 图片路径）——**没真机跑过就写 `pending`**
4. **涉及规范**：标注命中的条目（如 `R4` / `L2-06` / 平台边界第 5 条）
5. **下一步（谁的活）**：需要创作者做的（存盘 / 点试玩 / 给交接值）**单独一行**，别混进结论

> 本回复遵循: `miliastra-code` — [具体章节]
