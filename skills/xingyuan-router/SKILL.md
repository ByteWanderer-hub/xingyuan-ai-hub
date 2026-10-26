---
name: xingyuan-router
description: 星愿/星缘资料库任务技能入口。开始或接续本库覆盖的游戏、工程、设计、排错及技能维护任务时，主动判断并加载有用的主辅技能，无需用户点名；结合目标、上下文和技能描述选择，关键词仅辅助检索。无关任务使用会话中对应技能，不引入千星流程。
---

# 星愿技能入口

## 路由步骤

1. **先判断任务需要。** 每次收到任务，先结合当前有效上下文识别目标、平台、对象、问题和当前阶段。用户只说“加载慢”“点了没反应”“继续”也要接回已确认对象；用户点名的技能优先核对并按请求使用；不要求用户知道技能名，不因当前目录推断平台，不恢复已取消或仅供参考的任务。
2. **检查可用技能。** 先看会话可用技能的名称与描述，再用下表和 [routes.json](references/routes.json) 查星愿能力。按语义判断能否提供本任务需要的方法、约束、工具或验证；索引未收录的系统/插件/项目技能仍可按其描述选用。不全量读取 SKILL.md，也不扫描业务仓库猜意图。
3. **选择有用的组合。** 明确一个主技能负责当前核心问题，补齐有实际作用的辅助技能；不机械限制技能数量，也不把关联关键词全部加载。性能问题先定位性能，原因未明/反复故障补排错，进入平台实现补工程；设计、动效或交付方法只在该阶段确实需要时加载。明确范围的小改不额外启动需求评审。
4. **实际读取再应用。** 从当前有效安装目录打开所选 SKILL.md，只跟进本阶段必要引用；阅读索引、打印路径或运行路由脚本均不等于已加载技能。已在当前上下文完整读取且没有版本变化的内容可复用。缺失时定向查已知来源；仍缺失如实说明，继续不依赖它的工作，不假装调用。
5. **简述后执行。** 首次使用时简要说明选了哪些技能及用途，随即完成任务；不向用户抛出选技能问卷，不逐项展示排除清单。只要求找技能时交付路径与理由，不擅自执行其业务流程；没有适用技能则直接处理。只有影响正确性的真实信息缺口才集中澄清；加载技能不授予部署、发送、安装或其他范围外权限。
6. **随证据重评。** 用户新增问题、实现转入排错/性能、设计转入平台落地或原方法反复失败时，在下一步实质操作前检查是否需要补充/更换技能。单纯状态查询或同范围续做不重复读取整套文件，不让“按需加载”变成等待用户指定技能。

可选检索：运行 `python scripts/route.py "包含已确认平台与当前问题的任务摘要"`，或用脚本绝对路径并传 `--platform qianxing` 等已知平台。脚本只返回关键词候选，不理解完整上下文、不执行技能；零命中、排序、否定词和混合任务均须结合技能描述人工判断。

### 选择示例

| 当前任务与已知上下文 | 应加载/复用 | 边界 |
| --- | --- | --- |
| 已知千星游戏：切关卡很卡、创建 UI 时间太长 | `performance-optimization`；改脚本加 `miliastra-code`；原因未明或反复失效加 `systematic-debugging` | 不能只因“UI”选择布局技能；只有需要改控件/动效才补对应技能 |
| 已知千星游戏：开始按钮按下后完全不动 | `systematic-debugging` + `miliastra-code`；测量证实存在长帧再补性能技能 | 冻结可能是异常或状态阻塞，不能直接认定性能瓶颈 |
| 千星转场要更有动感，随后反馈掉帧 | 先 `miliastra-motion` + 实现所需平台技能；出现掉帧后补 `performance-optimization` | 不把非预期卡顿当作设计顿帧 |
| 已知网页项目：页面加载慢 | 查会话可用的网页性能/工程技能；无适用项直接排查 | 不套千星流程或本库游戏性能技能 |
| 找已有图标；修改技能入口；回复“继续” | 分别选素材入口、`skill-manager`、当前任务仍适用的已读技能 | 不因检索、维护或短句启动业务恢复/部署 |

## 三类入口：技能 / 外部 MCP 与服务 / 经验

索引里 `kind` 字段区分三类，加载和承诺能力前先看清是哪一类：

| 类型 | 索引位置 | 当前内容 | 怎么用 | 不能做什么 |
| --- | --- | --- | --- | --- |
| 技能 `skill` | `skills[]`，16 项 | 千星实现、需求边界、交付编排、调试、性能、QQ 表情包、图像配方、技能维护等 | 读 SKILL.md 按步骤执行，产出并验证 | 不把参考条目当实现步骤；有 `requires` 的先核验外部依赖 |
| 外部工具清单 `external` | `skills[]`，1 项 `desktop-toolbox` | 本机桌面软件的选择与核对 | 先按清单核验安装/可启动/功能验收状态再用 | 不把“已安装”当成“已验收”，不臆测 GUI 与连通性 |
| 经验 `experience` | `skills[]`，9 项 | `game-design-theory`、`motion-design`、`level-design`、`game-ui-ux`、`game-feel`、`code-review`、`roblox-luau-expert`、`roblox-security-audit`、`qianxing-agent` | 只取原则、数值、判据、案例与审视清单，落地另配平台技能 | 不假装有脚本、生成器、平台 API 或真机验证 |
| 库外依赖 `externals[]` | 独立段 | `rea`（MCP，missing）、`snowluma-onebot`（服务，ready）、`qianxing-platform`（平台，unverified） | 先看 `status` 再接入，`ready` 才可直接用 | 不把库外能力写成本库技能，不虚构已接入 |

`experience` 类没有任何脚本；它们的落地路径写在各自 SKILL.md 里（多为“配合平台技能”）。`externals` 的 `status`：`ready` 已探活可用、`unverified` 未核实、`missing` 未接入。

## 快速表

下表除标注外均为 `skill`；标（经验）的是只提供原则/数值/判据的 reference 类，标（外部）的是本机工具清单。

| 关键词/意图 | 主技能 | 按需补充 |
| --- | --- | --- |
| 千星 Lua、API、变量、信号、require、对话、部署 | `miliastra-code` | 故障加 `systematic-debugging` |
| 千星 UI/UX 流程、控件选型、多端适配、手柄导航；2D 控件/同型资产/图片转 GIA/Lua | `miliastra-ui` | 新整屏按七步流程、小改按需；跨引擎原理加 `game-ui-ux`，同型资产优先；Lua API 加 `miliastra-code`，其他控件按地图适配，完整《天堂之门》GIA 加专用技能 |
| 千星 UI 动效、状态反馈、ui 粒子、粒子池与预算 | `miliastra-motion` | 只给数值口径与预算方法；脚本 API 与真机预算加 `miliastra-code`，控件与素材加 `miliastra-ui` |
| 《天堂之门》设计图转完整客户端 GIA | `tiantangzhimen-gia` | 先确认设计数据与目标地图模板；写入存档另遵守 `miliastra-code` |
| UGC 需求分析、范围歧义、验收标准 | `miliastra-bb` | 范围明确后转实现，不重复审批 |
| 实现/创作/修复角色提示词 | `qianxing-agent`（经验） | 只选对应角色 |
| 自动交付、自主派工、继续工作流 | `qianxing-auto-delivery` | 按阶段选实现技能，不自动扩大部署权限 |
| 玩法、玩家动机、叙事、好不好玩 | `game-design-theory`（经验） | 空间安排加 `level-design` |
| 关卡、白盒、动线、节奏、可达性 | `level-design`（经验） | 千星落地前核对实际工程能力 |
| 游戏卡顿、掉帧、渲染优化、帧耗时、Draw Call、GC 尖峰 | `performance-optimization` | 千星测量边界读其 references/miliastra.md；Lua/API 加 `miliastra-code`，动效加 `miliastra-motion`；刻意 hit-stop 仍走 `game-feel` |
| 打击感、顿帧、震动、缓动、juice | `game-feel`（经验） | 引擎技能实现 API；不是移动控制器技能 |
| 通用动效原则、时长/缓动表、迪士尼动画原则（第三方参考） | `motion-design`（经验） | 只提供平台无关的原则与数值；千星落地加 `miliastra-motion` |
| 通用 HUD、安全区、焦点导航、多端适配 | `game-ui-ux`（经验） | 明确千星时以 `miliastra-ui` 为主，本技能补充原理 |
| 报错、没效果、偶发失败、根因 | `systematic-debugging` | 加目标平台工程技能 |
| 本地软件、文件夹比较、二进制查看、局域网传文件、虚拟主播配置 | `desktop-toolbox`（外部） | 先检查本机可用性和验收状态；不强行启动 GUI |
| 代码审查、回归风险 | `code-review`（经验） | 不因审查擅自修改代码 |
| 技能文档、去重、合并、资料库整理、把项目经验写入技能 | `skill-manager` | 维护真源与引用；普通项目总结不触发技能修改 |
| 沟通风格、我的意思是、你理解错了；优化提示词/系统提示词 | `user-intent-alignment` | 理解纠正先修当前任务；明确要求时才交付提示词；按长期授权校准有证据的偏好，普通“对话/继续”不启动复盘 |
| QQ 机器人表情包/贴纸、自定义表情上架、表情发不出去 | `qq-sticker-pack` | 美术画风走 `design`；千星平台图片资产走 `miliastra-ui`；发送链路排错可加 `systematic-debugging` |
| GIF 表情包、制作动图、逐帧动画 | `slack-gif-creator` | 通用角色设定/画面用 `character-sticker-comic`；本地帧合成不代表具备视频模型，QQ 上架另走专用技能 |
| 通用人设图、角色立绘、设定图、三视图 | `character-image-design` | 固定身份与可变画风分离；文字人设提示词不触发 |
| 生成表情包、角色贴纸、表情差分、角色漫画 | `character-sticker-comic` | 任意角色图像创作；QQ 上架/发送用 `qq-sticker-pack`，鲸鱼娘优先专用技能 |
| 鲸鱼娘 / DeepSeek娘人设图、立绘、主题插画 | `whalechan-image-character` | 专用角色身份锁定，不当作任意人设生成器；本地脚本先读技能 runtime 依赖说明，保留上游授权范围 |
| 鲸鱼娘 / DeepSeek娘表情包、1/2/4 格反转漫画 | `whalechan-image-comic` | 美术与漫画生成；Windows 锁兼容已补充，仍需 ImageMagick；QQ 上架和发送另加 `qq-sticker-pack`，通用表情包不默认套用鲸鱼娘身份 |
| 明确 Roblox/Luau 开发 | `roblox-luau-expert`（经验） | 明确反作弊加 `roblox-security-audit` |

## 细分入口与缺口

- `prompt-optimizer` 已合并为 `user-intent-alignment` 的提示词改写分支，仅作检索别名，不代表另有已安装技能；普通业务请求仍交付业务结果，游戏角色对白系统实现仍走平台工程技能。

- 将项目复盘用于优化技能：读 `skill-manager` 的“从项目经验优化技能”，区分可复用不变量、项目决定与未验证方案；不启动业务恢复或重新部署游戏。
- 千星房间/门共用几何、杯子遮挡、浏览器微调回流：读 `miliastra-ui` 的 [场景几何参考](../miliastra-ui/references/scene-iteration.md)。气体波动/转移、口袋门、食物达成和结算编排：读 `miliastra-motion` 的 [状态动效参考](../miliastra-motion/references/stateful-scene-motion.md)。这些是千星实现参考，不让普通网站任务误入千星流程。
- 游戏性能与渲染卡顿：`performance-optimization` 提供跨引擎测量/复测和千星适配；无 GPU 计时不确诊 GPU-bound，控件数不冒充 Draw Call，历史控件/粒子数量不作为通用上限。网页性能、网络延迟和刻意打击停顿不归此技能；混合 UI/动效性能任务以性能定位为主，平台技能负责实现。

- 千星对话/黑幕/选项/打字机：读 `miliastra-code` 后按其对话工程参考继续。
- 千星静态资产包、资产 ID 对照图：读 `miliastra-ui/references/static-image-pack.md`，使用只读脚本按 ID/用途查询和检查几何元数据；不把图片索引视为控件创建模板，不自动重传原始资产。
- 参考图重建、按圈选小改、图片转 GIA/Lua：读 `miliastra-ui` 的 `references/client-template-gia.md`。仅图片控件可走通用输出，不要求指定地图；加入其他控件或玩法才按地图适配。区分预览、离线 GIA 与 Lua 创建模块，不把图片文件本身当可导入资源，不为通用美术或其他地图误启《天堂之门》专用流程。
- GIL/GIA、节点图：先读 `miliastra-code` 的 `references/node-graph-capabilities.md` 与 `references/plugin-toolbox.md` 的相关能力。仓库未包含通用地图 GIA 生成器；素材样例不等于生成工具。
- REA：库外 MCP 依赖，见 `externals[]` 的 `rea`（`status: missing`）。它指 GitHub 上 morluto 的 Agent 逆向工程 MCP（接入 Hopper/Ghidra/JADX/浏览器等工具，MIT），与千星 GIA/GIL 无关，也不是 GIA 生成器；本库没有逆向工程技能，需要时按 MCP 单独接入并按目标环境核验。
- SnowLuma / NapCat OneBot 网关、千星奇域编辑器：分别是 `externals[]` 的 `snowluma-onebot`（ready）与 `qianxing-platform`（unverified）。引用它们的技能（`qq-sticker-pack`、`miliastra-*`、`tiantangzhimen-gia`）在 `requires` 里标注，落地前先核对实际状态。
- 土狼时间/郊狼时间/coyote time、输入缓冲/input buffer：本库暂无对应移动/输入专项技能。`game-feel` 不负责原始控制器数学；可结合已核实引擎 API 实现，但明确是补充实现而非调用现成专用技能。
- `platformer`、`input-systems`、`camera-systems` 等旧文档提及的外部技能：先确认实际存在，不能从名字推断已安装。
- 已接入的桌面软件：读 `desktop-toolbox`，其接入记录区分已安装、可启动和已完成实际功能验收；不因曾经安装就默认可用。
- 关键词未命中：回到任务目标判断，必要时追问一句；不默认启动全部技能。

## 安装与维护

本技能目录和其他技能目录应同级。仓库安装器默认安装本入口与十项千星技能；备用审查、维护和 Roblox 技能可按名安装，或使用 `--all`。只安装入口时仍可查索引，但运行目标技能前必须补齐目标目录。

索引真源为 [routes.json](references/routes.json)，脚本仅检索，不执行目标技能。仓库访问、文件安装、客户端发现、插件可用和真机验收分别报告。

## 技能变更必须同步维护入口

把入口维护作为每次新增、修改、重命名、合并或删除技能的完成条件，与技能变更在同一轮、同一提交中交付，无需用户另行提醒。所有修改在仓库真源进行。

| 变更 | 必须核对和更新 |
| --- | --- |
| 新增/导入技能、接入 MCP/服务前 | 先按 [skill-manager 录用守则](../skill-manager/references/admission.md) 判定「技能 / 经验 / 外部依赖」与准入门槛，再写 routes.json；类别未定就写索引视为未完成 |
| 新增/导入技能 | 在 routes.json 添加唯一条目：name、`kind`、purpose、platform、中英文/自然表达关键词；在上方快速表加入或并入对应行 |
| 新增库外 MCP/服务/平台 | 在 `externals[]` 增加条目：name、display、kind（mcp/service/platform/software）、status（ready/unverified/missing）、purpose、note、keywords；依赖它的技能在 `requires` 里写该 name |
| 修改职责、适用条件或能力 | 同步 purpose、`kind`、platform、keywords、快速表、主辅技能分工及细分入口；新增能力落实后撤销对应过时的缺口提示 |
| 更名、合并、删除 | 更新目标名称与路径，移除失效条目；有必要时将旧名称作为新目标的关键词，不能指向已删除目录；同步清理 `requires` 与 `externals` 引用 |
| 仅修正文案/内部实现 | 仍核对该技能索引；若职责、`kind` 与关键词没有变化，记录“入口已核对，无需变更”，不制造无意义改动 |

1. **先定类别，再写索引。** 按 [skill-manager 录用守则](../skill-manager/references/admission.md) 走顺序判定：需要库外 MCP/网关/平台 → `externals[]` + `requires`；能直接执行并验收 → `skill`；只给原则/数值/判据 → `experience`（不得带脚本）；本机工具清单 → `external`；重复/不可验证/许可不明 → 不录用。判定用证据（frontmatter 自述、references 性质、有无脚本、是否必调外部服务），不按名字分。
2. 先读变更后的目标 SKILL.md，按实际能力整理关键词，不能只靠目录名猜测；缺口说明同时检查 routes.json 的 gaps 与本入口正文。
3. 核对同义词、用户常用说法、平台边界及同关键词下主辅关系；新增平台需同步 route.py 的平台识别、过滤和参数，不能只填一个脚本不认识的平台值。
4. 新增/改变路由时增加能代表用户表达的正例和易误触发的反例。保留原有路由行为；全部目标必须存在，每项实际技能（本路由自身除外）恰好一个索引条目，关键词不能为空。
5. 在仓库根运行全量测试 `python -B -m unittest discover -s scripts/tests -p 'test_*.py'`，并运行 `python -B scripts/verify_skills.py` 检查结构与本地引用。测试失败先修复，不以“技能正文已完成”跳过入口维护。
6. 技能、路由数据、必要入口说明和测试一起提交推送。更新实际使用副本时也选择 xingyuan-router，不能只更新目标技能而留下旧索引。当前无法访问客户端时报告“仓库入口已更新，安装副本待同步”。

规则和测试不会后台监听文件，也不会自动理解新能力；执行技能维护任务的助手负责落实以上步骤。
