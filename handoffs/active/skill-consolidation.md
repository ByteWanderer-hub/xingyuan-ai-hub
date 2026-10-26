# 技能通读、去重与关键词入口

日期：2026-10-23（北京时间）。
最后更新：2026-10-27（北京时间）。
当前状态：主动技能选择规则已发布并安装，路由与安装校验通过；REA 归属已修正、三类能力已区分；新技能录用守则已落地并推送。
下一步：在后续实际任务中检验主动选用效果；下一次录入新技能时按录用守则走一遍并记录实际卡点。

## Matt Pocock 技能集与 XERJ（2026-10-27）

- **Matt Pocock Skills**：上游 `mattpocock/skills`（MIT，commit `5beb35b`）；`skills/` 下 engineering 20 + productivity 7 + misc 4 = 31 个可用技能，另有 7 个 `in-progress` 与空 `deprecated`。导入 30 个（原样复制，含各自 references/模板/脚本），`code-review` 与上游同名，按守则合并为本库 `code-review/references/matt-pocock.md` 并在 SKILL.md 加指路，不新增重复条目。`in-progress`、`.claude-plugin`、仓库级 `scripts/`、`docs/`、`CHANGELOG` 未收。
- 分类：`diagnosing-bugs`、`wizard`、`git-guardrails-claude-code` 各带脚本/模板 → `kind: skill`（16→19）；其余 27 个 → `kind: experience`（10→37）；索引 27→57 条。来源、范围、边界集中在 [skills/MATT_POCOCK_SKILLS.md](../../skills/MATT_POCOCK_SKILLS.md)，许可证存 `skills/MATT_POCOCK_LICENSE`。
- 一个真实冲突：初版给 `retro` 的关键词含单字“复盘”，把「项目复盘优化技能」「复盘沟通风格」两条既有路由抢走；已收窄为「代码复盘/会话复盘/开发复盘/retro/retrospective」，两条原有测试恢复通过。这是守则里“关键词要用用户表达、同时防误触发”的实例。
- **XERJ**：`xerj-org/xerj`（Apache-2.0，commit `6a7d7da`）= Rust 本地搜索引擎 + MCP server，不是技能；登记为 `externals[]` 的 `xerj`（kind mcp、status missing），写明依赖（二进制在 PATH、本地节点默认 `http://localhost:9200`）与“上游 DSH 插件包自称未在 DSH 验证”。未下载二进制、未装插件、未改 profile。
- 验证：`python -B -m unittest discover -s scripts/tests -p 'test_*.py'` **93 项 OK（1 skipped）**，新增 `test_matt_pocock_import`（含 code-review 合并断言、正反例）与 `test_xerj_external_mcp`；`verify_skills.py` PASSED（58 个 SKILL.md、本地引用 167、外部引用 3）。
- [ ] 未完成：30 个导入技能在真实任务中的效果未验证；`git-guardrails-claude-code`、`setup-pre-commit`、`wizard` 的 Claude Code/Node 假设未改写适配 DSH；XERJ 与 ponytail 的上游收益数字未复测。

## Ponytail 收录（2026-10-27）

按新守则走一遍真实录入，验证守则可执行：

- 来源：`DietrichGebert/ponytail`（GitHub，MIT，Copyright 2026 DietrichGebert），固定 commit `09c434ab73ca43761c5d8b0c5d341926c2fba710`，`git clone --depth 1` 取得；未执行上游 hooks/脚本/安装器。
- 类别判定：上游 6 个技能全部**无脚本**、无平台 API，产出是改法建议与审查报告 → `kind: experience`（不是 skill）。不写 `requires`，不进 `externals`。
- 收录范围：6 个上游 SKILL.md（核心 + review/audit/debt/gain/help）、上游 `LICENSE`（存 `LICENSE-MIT`）。**未收录** `hooks/`、`scripts/`、`.claude-plugin`、各编辑器插件目录、`commands/*.toml`、`i18n/`、`benchmarks/`、图片资源。
- 结构决定：6 个独立技能合并为 1 条索引 + 5 份 `references/*.md`（去掉 frontmatter、加来源行），避免同一套准则在索引里重复占 6 条；核心 SKILL.md 保留上游英文规则原文，另加中文的何时用、档位、变体入口、分工、自检、不承诺。改动见 [skills/ponytail/NOTICE.md](../../skills/ponytail/NOTICE.md)。
- 索引：`routes.json` 加 `ponytail`（experience、general、15 个关键词含 ponytail/懒人模式/过度设计/YAGNI/技术债等）；入口快速表加一行标（经验）；三类表 experience 9→10。
- 验证：全量 `python -B -m unittest discover -s scripts/tests -p 'test_*.py'` **91 项 OK（1 skipped）**（新增 `test_ponytail_experience_route` 正反例）；`verify_skills.py` PASSED（28 个 SKILL.md、本地引用 139）。路由实测「用 ponytail 模式写这个功能」「这段代码过度设计了」「YAGNI 一下」均命中 ponytail，且「整理技能入口」「千星 UI 布局」「生成表情包」不误触发。
- [ ] 未完成：上游宣传的代码量/成本/速度收益未复测，本库不作为能力证据；客户端加载与真实编码任务中的效果未验证。

## 新技能录用守则（2026-10-27）

录入前的旧规则是散的：AGENTS「关键词入口联动维护」只说必须同步入口，`xingyuan-router` 的维护表按“变更类型”列要求，`skill-manager` 第 4–5 步提来源/许可与 kind，`local-skill-sync.md` 第 3 步管导入，但**没有一条规则在写索引之前先判定类别**，也没写“什么情况不该建技能”。本次补齐为单一守则：

- 全文 [skills/skill-manager/references/admission.md](../../skills/skill-manager/references/admission.md)：顺序判定表（外部依赖 → 技能 → 经验 → 外部工具清单 → 不录用）、准入硬门槛（来源/许可/安全/结构/去重）、写索引顺序、常见误判与改判、完成定义。
- `skill-manager/SKILL.md` 增「新技能录用守则」摘要与链接，维护步骤改为 6 步（先定类别再写索引、跑全量测试与 `verify_skills.py`）。
- `xingyuan-router/SKILL.md` 维护表增「新增/导入技能、接入 MCP/服务前」一行，编号修正为 1–6，第 1 步即“先定类别，再写索引”。
- `AGENTS.md`「关键词入口联动维护」增一句：录入前按录用守则判定类别并过门槛，类别未定不写索引，外部依赖进 `externals[]`。
- 判定样例：REA→外部 MCP（missing）；SnowLuma 网关→服务（ready）；motion-design/game-feel 等 9 项→经验（无脚本）；desktop-toolbox→外部工具清单。
- 验证：`python -B -m unittest discover -s scripts/tests -p 'test_*.py'` **90 项 OK（1 skipped）**；`python -B scripts/verify_skills.py` PASSED（27 个 SKILL.md、本地引用 133、不可变素材 passed）。本轮不改路由数据，`test_route_skills` 用例未变。
- [ ] 未完成：尚未用一次真实新技能录入演练该守则；客户端是否按 `kind` 区别处理、安装副本之外的工程侧发现仍未验证。

## 技能 / 外部 MCP / 经验三类区分（2026-10-27）

判定依据只看证据，不按名字：`SKILL.md` 的 frontmatter 说明、`references/` 内容性质、是否存在可执行脚本、是否依赖库外服务。「能直接执行并验收」→ `kind: skill`；「只给原则/数值/判据/案例」→ `kind: experience`；「本机工具清单，需先核对状态」→ `kind: external`。

- 索引 26 条：`skill` **16**、`experience` **9**、`external` **1**。
  - `skill`：miliastra-code、miliastra-ui、miliastra-motion、miliastra-bb、qianxing-auto-delivery、tiantangzhimen-gia、performance-optimization、systematic-debugging、skill-manager、user-intent-alignment、character-image-design、character-sticker-comic、whalechan-image-character、whalechan-image-comic、slack-gif-creator、qq-sticker-pack。
  - `experience`：game-design-theory、motion-design、level-design、game-ui-ux、game-feel、code-review、roblox-luau-expert、roblox-security-audit、qianxing-agent。共同证据：无脚本；正文自述 engine-neutral / 第三方参考 / 审视清单（game-design-theory 明确 “NOT for coding”；motion-design 注明 LottieFiles MIT 原样收录）。
  - `external`：desktop-toolbox（工具清单，状态以 `handoffs/active/tool-adoption.md` 为准，已安装≠已验收）。
- 新增 `externals[]` 登记库外依赖，与技能分开，避免再把外部能力写成库内技能：
  - `rea`（mcp，missing）——REA=morluto/rea 逆向工程 MCP，未接入。
  - `snowluma-onebot`（service，ready）——2026-10-27 探活网关可达、账号在线；`qq-sticker-pack` 的 `requires` 指向它。
  - `qianxing-platform`（platform，unverified）——本机未见编辑器进程，安装/登录未核实；`miliastra-code`/`-ui`/`-motion`、`tiantangzhimen-gia` 的 `requires` 指向它。
- `route.py` 变更：候选输出加 `kind`/`requires`；新增 `externals` 匹配与“外部…不在本库”的 warning；`note` 说明三类含义。REA 从 `gaps` 移入 `externals`，`gaps` 只留 platformer 输入、Lottie/Rive/Spine、GIA 生成器三条真实能力缺口。
- 测试：`test_rea_external_mcp`、`test_kind_classification`（含“experience 条目不得有脚本”的不变式）、`test_externals_section`（kind/status 枚举、requires 只能引用已登记 externals）新增，`python -B -m unittest discover -s scripts/tests -p test_route_skills.py` **41/41 通过**。
- 入口同步：`skills/xingyuan-router/SKILL.md` 增“三类入口”表与维护表条目，`skills/skill-manager/SKILL.md` 增归类与 externals 登记要求。
- [ ] 未完成：`qianxing-platform` 与 `desktop-toolbox` 各工具的实际状态仍待在本机核实；REA 接入、编辑器存盘与真机验收均未执行。分类计数是静态判定，客户端是否按 `kind` 区别使用要等真实任务反馈。

## REA 路由归属修正（2026-10-27）

- [x] 已完成：原 `gaps` 把 `rea` 与 `gia`/`gil` 并入同一条（源自 2026-10-23 “不虚构 platformer、input-systems、rea 等技能”的整理），任何 REA 提问都会返回千星 GIA 提示。经核对，REA 指 GitHub 的 `morluto/rea`（面向 Agent 的逆向工程 MCP，接入 Hopper/Ghidra/JADX/浏览器等工具，MIT），与千星 GIA/GIL 无关，也不是 GIA 生成器，本库确无对应技能。
- [x] 已完成：拆为独立缺口（`rea`/`morluto/rea`/`逆向工程`/`逆向分析`/`reverse engineering`/`ghidra`/`hopper`/`jadx`），提示语写明其真实身份与“按 MCP 单独接入”的边界；GIA/GIL 缺口保留原千星语义。`skills/xingyuan-router/SKILL.md` 细分入口同步拆成两条。
- [x] 已完成：新增 `test_rea_reverse_engineering_gap` 正反例（REA/逆向查询只出 REA 缺口，GIA 查询不带 REA 文案），`python -B -m unittest discover -s scripts/tests -p test_route_skills.py` **39/39 通过**。
- [x] 已完成：提交 `2cb5cb7` 正常推送，`ls-remote` 核实远端 `main` 同 SHA；使用副本（`C:\Users\admin\.dsh\skills`）与该提交内容一致。
- [ ] 未完成：客户端是否按新缺口实际提示，取决于下一次真实任务；本轮只验证路由输出，未做客户端行为测试。

补充：本机 `github.com` 直连超时，本次 push 仅单次命令复用已启用的系统代理（`127.0.0.1:17891`），未改任何网络或 git 全局配置。

后续（同日）：REA 不再留在 `gaps`，已移入 `externals[]`（`kind: mcp`、`status: missing`），对应测试改名 `test_rea_external_mcp`；见上节。

## 主动技能选择（2026-10-26）

- [x] 已完成：针对“需要用户反复点名技能”的反馈，根入口改为每次任务先判断可用技能；xingyuan-router 明确语义/上下文选择、主辅组合、实际读取、阶段变化重评、已读复用与无适用技能直接处理。系统/插件技能按会话目录选择，不将星愿索引视作全部能力。
- [x] 已完成：补充游戏加载慢、创建 UI 时间太长、冻结不动与入口维护自然表达，保留网页/游戏、刻意顿帧/故障边界；38 项路由测试、27 技能结构/130 本地引用/不可变素材和 diff 检查通过。情景表覆盖性能、异常、动效转性能、网页与纯维护；属于规则与检索检查，不是独立模型行为测试。
- [x] 已完成：技能提交 37559dc775b76487c422e4b71890ceaecc96e8ec 正常推送，ls-remote 核实同 SHA；工程入口已补充任务前评估，安装器从干净发布源更新 xingyuan-router 的 4 文件，全库安装检查通过。直连失败后仅本次 Git 命令复用已启用的系统代理，未改网络配置。
- [ ] 未完成：后续真实任务中是否主动选择并使用相关技能，依赖客户端新上下文加载及实际任务反馈；不得以静态测试承诺未来每次调用成功。

备份：本机 D:/xingyuan-ai-hub-backups/20261026-proactive-routing。本次只改技能入口、索引/测试与工程入口指向，没有改游戏脚本或干预在途任务。


## 入口持续维护（2026-10-23）

用户要求新增或修改技能时同步更新关键词快速跳转入口。已在根AGENTS、xingyuan-router及skill-manager落实同任务、同提交维护要求，覆盖新增、职责修改、更名、合并、删除及旧缺口说明更新；纯内部修改也需核对入口，路由无变化可记录而不强行改文件。

补充了“新增技能、修改技能、关键词入口、快速跳转入口”等自然表达。新增索引字段/关键词唯一性检查、逐关键词可达检查，以及维护请求正反例；本轮路由测试 **15/15通过**，两项修改技能的quick_validate通过。入口的客户端展示元数据仍匹配其检索职责，无需调整。安装时须同时更新目标技能和入口；当前只完成仓库变更，原电脑安装未执行。没有添加后台文件监听或自动改写服务。

## 来源、范围与授权

用户要求通读星缘资料库技能文档，合并重复内容并建立关键词调用入口。仓库实际名称为星愿 AI 中心；基线提交 `3b28edeb76052cfb2f6d98958cb8577033ec46f9`。本主题仅维护共享技能与安装入口，不修改游戏工程、不调用编辑器部署。正文与结果以本记录所在提交为准。

通读原有14项技能的入口及参考：技能包内159份Markdown，其中158份说明文档全文阅读，1份素材目录按数据检查（1543条、ID不重复）。全部路径及源Blob见[证据](../evidence/skill-consolidation.json)。仓库级技能索引和迁移记录另行核对；没有将脚本、JSON或二进制素材声称为逐个重审。

## 已完成

| 重复或问题 | 整理结果 |
| --- | --- |
| code/create/fix的整篇提示词与分章重复 | 3份整篇转为兼容入口；36个编号章节为唯一正文。逐序非空行完全一致，章节内容和SHA-256未改 |
| 3份role入口内联总纲/开工约束 | 改为角色范围和章节链接；保留更新后的code/02，消除annotations路径要求的旧副本 |
| Lua R10、L2-02/03/04；视觉L2-V1/V2/V3 | 7处总篇正文改为分章引用，保留原标题；删除的正文均验证被目标分章完整包含 |
| 奖励章节重复教学案例/教程原则 | gameplay-elements链接design-principles的教学章节，保留奖励策略 |
| 网格换算中的旧锚点公式 | 合并到design-guide唯一公式入口，避免漏半宽高 |
| 旧案例/角色流程与现行入口混杂 | 添加明确适用边界、历史说明与权威入口，保留独有案例数据 |
| 外部技能名误当已安装能力 | 标明外部参考并由路由报告缺口，不虚构platformer、input-systems等技能；rea 经 2026-10-27 核对实为 morluto/rea 逆向工程 MCP，已拆为独立缺口 |

新增 [xingyuan-router](../../skills/xingyuan-router/SKILL.md)：中英文关键词、显式技能名、平台筛选、常见否定平台、缺失目标提示。路由只给候选，随后读取目标SKILL执行，不自动扩大权限。覆盖原14项技能；默认安装为11项（入口+原10项），`--all`为15项。

## 为什么保留其他相似技能

- game-design-theory负责设计原则，level-design负责空间/节奏，game-feel负责动作反馈；不是同一交付。
- game-ui-ux负责通用适配/导航，miliastra-ui负责千星控件与素材，miliastra-code负责平台实现。
- systematic-debugging负责根因取证，code-review负责审查，auto-delivery负责显式要求的交付编排。
- Roblox两个技能仅用于明确Roblox任务，保留实现与安全专项的分工。
- API、工程案例、算法、黑板与变量迁移参考含独有约束和实验数据，不按标题相似整篇删除。

## 保留并标出的分歧

以下不是完全相同的副本，本轮未猜测改写；后续校准需依据实际API/检测器和工程证据：

1. 旧Lua总篇R14是状态赋值点，现行R14是删除/替换动作忠实性；R15/R16另有独有内容。视觉总篇V7是层级，guide V7是实例化时机，V8/V9含历史前提。已在总篇说明编号区别。
2. 旧V1的“SetImage第二参数≥6位打回”与六位合法图片ID矛盾；不能因文本重复就认定规则正确。
3. L2-05检测器支持范围、R4 warn/error、跨脚本Invoke返回值、旋转/填充接口等存在旧新说法，需按实际代码/API专项核实。
4. UI旧分章/案例的getter、层序、字号档位等仍有历史表述；当前使用先读SKILL与design-guide及实际API，不能照抄旧案例。
5. 角色章节仍保留历史流程细节；authority明确现行工程规则和用户授权优先，不强制重复Demo、两轮交接、固定派工或每bug另建文档。

## 验证与验收

- 安装器15项、校验器21项、路由12项，共 **48/48通过**。
- 新入口quick_validate通过；全部15项技能名称/描述格式核对通过。
- 对本轮改动Markdown校验相对路径；36个正文分章指纹保持不变。详见同目录机器证据的verification字段。
- 独立路由试用7个真实表达；否定平台和自然表达遗漏已修复并加入测试。
- 新入口隔离安装成功（4文件），安装后运行脚本可用；只安装入口时缺少相邻技能如实显示available=false。
- 独立内容审查未发现本轮阻塞问题。二进制素材、迁移基线和旧脚本通过基准Git树原样保留，未伪造本轮完整资产复验。

下一步：在用户实际Codex工程更新安装并确认入口被发现。游戏插件和真机仍需在实际工程验证；这些不是本轮资料整理完成的替代证据。
