# 平台适配：蛋仔派对（Eggy Party UGC）

> 🔗 **联动**：需求方法论 → 本技能 `../../SKILL.md`（七步 + 平台识别表）｜玩法拆解与放置 → `lua-eggy-level`｜工具与通道 → `lua-eggy-dsh`（toolkit-channels.md）｜全景地图 → `../../../EGGY-SKILLS-MAP.md`

> 本文件是 miliastra-bb 的**蛋仔域落地适配**：SKILL.md 的通用四层比对、交接表、验收手段，在蛋仔域按下表执行。工程纪律（写闸门/回滚/坐标纪律）归 `lua-eggy-dsh`，本文件只做"需求阶段要用什么"的指路。

## 1. 工程识别与多项目嗅探

- 工程目录特征：含 `eggy.json` 的工作区，Lua 源码在 `D:\lua_danzai\LuaSource_<图名>\`（惯例，以实际工作区为准）。
- 多工程并存（多张图）：按 `lua-eggy-dsh` 的多项目嗅探规则定位，**别猜**；`eggy_code` 定位不到会报 `CODE_PROJECT_AMBIGUOUS` 并给候选列表。
- 图类型：FS（帧同步）/ LS；涉及确定性红线时按 `lua-eggy-code` 的 FS 纪律。

## 2. 四层比对手段（对应 SKILL.md 步骤 2）

| 层 | 查什么 | 手段（工具/命令） |
|---|---|---|
| **逻辑层** | 已有函数/事件注册/配置区/计分与胜负 | grep 工程 `main.lua`；`eggy_code op=diff` 看本地与编辑器是否一致 |
| **触发/配置层（蛋码层）** | 已有的触发器组/积木逻辑 | `eggy_trigger op=tree` / `op=nodes`；必要时解码 `triggereditor.mm`（玩法逻辑常藏在蛋码，main.lua 空壳 ≠ 没逻辑） |
| **场景/资源层** | 已有的组件/坐标/组/命名 | `eggy_scene nameContains=…`（中文过滤）、`eggy_scene op=stats`（分簇+异常扫描）、`eggy_bridge op=snapshot` |
| **能力层** | 官方 API 支不支持；本机实测坑 | `lua-eggy-se-manual`（官方契约 933 页）；`lua-eggy-code`（实测边界：假属性名/沙箱限制）；`eggy_docs`（prefab key 真实性，**禁止编造 key**） |

**F1 证据卡采集格式（蛋仔域）**：

| 层 | 证据格式 | 采集手段 |
|---|---|---|
| 逻辑层 | `main.lua:行号` / 函数名 | grep 工程文件 + `eggy_code op=diff` |
| 蛋码层 | 触发器组名 / 节点数 | `eggy_trigger op=tree`、`op=nodes` |
| 场景层 | 组件名×坐标 / 组名 | `eggy_scene nameContains=…`、`eggy_scene op=stats` |
| 能力层 | 官方页 URL 或 `[手册查不到]` | `lua-eggy-se-manual` grep、`eggy_docs` |

> 降级：编辑器没开/通道不可用 → 场景与蛋码证据标 `[待确认：需开编辑器]`。通道健康检查入口：`eggy_health`（连不上先走 `lua-eggy-dsh` 开场三件套）。

## 3. 六维体检的蛋仔域口径（对应 SKILL.md 步骤 3）

六维定义与问法见 [`../dimensions.md`](../dimensions.md)；**下面是蛋仔域"怎么取证/怎么标"的换算表**：

| 维度 | 蛋仔域怎么问 | 证据与工具 | 常态结论 |
|---|---|---|---|
| **D1 玩家体感** | 玩家第一次碰到懂不懂？按键/交互有反馈吗？相机角度与视野下看得见目标吗？提示是文字还是可感知物？ | 试玩取证（截图 + 试玩日志行，带 playSession）；UI 反馈归 `lua-eggy-*` 的 UI 章节；组件摆放与视野检查用 `eggy_scene op=stats`（分簇/异常扫描）+ `eggy_bridge op=snapshot` | 未试玩前 `[待确认：需开编辑器]` |
| **D2 失败与重复** | 失败了怎么重开？重开几步？重复同一段多久会腻？惩罚有数字吗？ | 逻辑层 grep `main.lua`；蛋码层 `eggy_trigger op=tree`（重开/复活逻辑常藏在蛋码）；FS 图还要看帧同步回放 | 重开步数与惩罚数值必须是具体数字 |
| **D3 公平与社交** | 本图人数上限？FS/LS（帧同步/状态同步）？掉线/挂机怎么办？ | **向创作者/地图设置确认**；FS 红线按 `lua-eggy-code`（定点、无浮点累计）；场景容量用 `eggy_scene op=stats` | 人数上限不明 → `[待确认]`，并写明"难度/奖励定不了档"的后果 |
| **D4 平台规则与合规** | 素材来源与许可？官方资产 vs 自定义模型？有没有血腥/恐怖表现？ | 官方契约与资产清单 `lua-eggy-se-manual`；prefab key 真实性 `eggy_docs`（**禁止编造 key**）；自定义模型（编辑器无 API、运行时才有）必须单独标出 | 素材来源不明 = 必查项 |
| **D5 性能与规模** | 同屏组件/单位几个？总数有没有回基线要求？ | `eggy_scene op=stats`（数量与分簇）；`eggy_bridge op=layout`（几何）；**组件总数回基线**是写闸门纪律（见 `lua-eggy-dsh`） | 数量上限要有数字（不是"差不多"） |
| **D6 可撤性与维护** | 改坏了怎么回滚？batchId 有没有？会不会覆盖用户手工摆的东西？ | 写闸门 + batchId 可回滚 + 地图外坐标验证（`lua-eggy-dsh`）；本地与编辑器一致性 `eggy_code op=diff` | **不许覆盖用户手工成果（R0）**；改动前先备份/确认回滚路径 |

## 4. 交接表（对应 SKILL.md「联动交接」）

| 功能点类别 | 交接给 | 交接内容 |
|---|---|---|
| 玩法怎么拆 / 要素清单 / 场地分区 / 坐标与间距 | **`lua-eggy-level`** | 功能点 + 确认后的玩法规则 + 量化参数 + On/Off scope |
| 放置组件 / 摆件 / 改模型外观形状颜色 | **`lua-eggy-ai`**（路线由 `lua-eggy-level/references/ai-first-placement.md` 定） | 要什么 + 放哪 + 验收口径（AI 优先，直接改是兜底） |
| Lua 逻辑 / 蛋码触发器 / 存档排行榜 / 试玩取证 | **`lua-eggy-code`** | 功能点 + 方案 + 平台矩阵 + 验收标准 + 现状比对 |
| 官方 API 到底支不支持 / 参数与 Realm / 官方资产清单 | **`lua-eggy-se-manual`** | 要查的能力点（查不到就说查不到，不许推测） |
| 工具与通道 / 写闸门与回滚 / 换图 / 工程档案 | **`lua-eggy-dsh`** | 地图名 + 工程路径 + 写操作清单 + 回滚要求 |
| 需求边界确认本身 | **本技能（miliastra-bb）** | 重复分析新需求 |

## 5. 实现方案模板的蛋仔域落点（对应 SKILL.md 方案级骨架）

- **逻辑层**：改哪（`main.lua` 哪个函数/配置区；或哪个蛋码触发器组）；事件与计时（用哪个 EVENT；频率；**FS 红线**：定点/无浮点累计）；取证口径（试玩后看什么日志/数字算成功）。
- **场景层**：放什么（组件/prefab 或"待内置 AI 检索后确认"）；放哪（区域 + 坐标参照，未实测标 `[待确认]`）；谁去放（**内置 AI 优先**；纯几何批量才走 `eggy_floor`/`eggy_scatter` 等工具）；验收（`eggy_scene` 数量坐标 + `eggy_bridge op=layout` 几何 + 截图观感）。
- **外观层**：路径（prefab+缩放 / 可变形组件 / 染色 paint_area1~4 / 自定义模型——自定义模型编辑器无 API、运行时才有，需求阶段就标出来）。
- **契约核对**：官方是否支持（`lua-eggy-se-manual` 查到的页 / 查不到则 `[待确认]`）。
- **风险与通道**：⚠️ 落地时遵守——写闸门 + batchId 可回滚 + 组件总数回基线 + 地图外坐标验证 + **不许覆盖用户手工摆放（R0）**（纪律细节见 `lua-eggy-dsh`）。

## 6. 清单与项目文档的落盘惯例

- 需求边界清单落 `project-docs/<图名>/需求边界清单_<需求名>_<日期>.md`。
- 复测证据格式：`eggy_scene` 数字 / 试玩日志行（带 playSession）/ 截图路径。

## 7. 案例

- [`../examples/eggy-classroom-feedback-bugs.md`](../examples/eggy-classroom-feedback-bugs.md)——bug 报告甄别 / 夹带需求拆分 / 零反馈系统性问题（蛋仔域首案）。
