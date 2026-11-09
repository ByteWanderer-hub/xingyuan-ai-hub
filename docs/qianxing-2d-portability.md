# 千星奇域 2D Lua：另一台电脑从克隆到可开发

更新：2026-11-09。结论：**本仓库可以迁移技能与部分离线工具，不是可直接启动的完整游戏工程或环境镜像。** 默认安装补齐日常代码辅助技能；外部工具、游戏、工程、模板与真机仍要在目标电脑接入。不要把下面任一层通过代替后一层。

## 1. 克隆能带走什么

| 层 | 仓库提供 | 另一台电脑还要做 |
| --- | --- | --- |
| 知识 | Lua/API 边界、UI/UX 与设计辨识度、动效/粒子预算、排错与交付经验 | 让当前客户端实际发现并读取所需技能 |
| 离线工具 | 安装/结构校验、关键词路由、Lua scope/style/iron、UI 几何检查、1,543 条素材目录及离线检索 | Python / Node；按脚本用途准备输入，不能直接套旧工程默认路径 |
| 外部运行时 | 来源、观察版本、接入与核验说明 | DSH 与 dsh-miliastra；可选独立 MCP / 节点图编译器 |
| 游戏与编辑器 | 使用约束和核验路径，不分发客户端 | 从官方渠道安装、登录并记录实际版本；保持用户对编辑器的操作权 |
| 项目 | 通用方法；少量已有历史样例，不是全部工程 | 安全传输真实源码、地图、模板、注解、数据与契约；确认修改范围 |
| 验收 | 分层方法、断言与证据格式 | 模拟器预测试；作者存盘、挂载/模板操作、点试玩；真实目标端验收 |

不随克隆/默认安装迁移：私人记忆、全局 Agent 指令、profile/MCP 配置、模型凭据、游戏账号、活文件、完整地图与项目资产、私有 GIA exporter。已有样例和各技能上游文件仍按其原授权使用；本次没有完成全库许可证与旧 GIA 样例隐私审计，不据此授予新分发权。

## 2. 最短安装路径

安装与结构检查要求 **Python 3.10+，仅标准库**；运行 `.mjs` 脚本另需 Node。安装器不下载插件、不安装 npm/Python 依赖、不修改游戏或用户级指令。Windows 可用 `py -3` 替换 `python`。

在可信终端执行，先将 `PROJECT` 换为真实工程路径：

```bash
git clone https://github.com/ByteWanderer-hub/xingyuan-ai-hub.git
cd xingyuan-ai-hub
git pull --ff-only
python -B scripts/verify_skills.py
python -B scripts/install_skills.py --target "PROJECT/.agents/skills"
python -B scripts/install_skills.py --target "PROJECT/.agents/skills" --apply
python -B scripts/verify_skills.py --installed "PROJECT/.agents/skills"
```

- 默认 **17 项**：`xingyuan-router`、`game-design-theory`、`game-feel`、`game-ui-ux`、`level-design`、`miliastra-bb`、`miliastra-code`、`miliastra-ui`、`miliastra-motion`、`motion-design`、`performance-optimization`、`qianxing-agent`、`qianxing-auto-delivery`、`systematic-debugging`、`ponytail`、`improve-codebase-architecture`、`codebase-design`。
- 不传 `--target` 默认装到**技能仓库自身**的 `.agents/skills`，不是旁边的游戏工程。`--scope user` 是另一种显式选择，不能因此制造多份同名技能同时加载。
- `--skill 名称` **替换本次默认选择**，不是追加；不会自动展开依赖，也不会卸载其他已管理技能。只选少数技能时自行带上实际需要的主辅组合与入口。
- 先预览再 apply。已有未管理同名目录、受管副本本地修改或缓存污染等冲突会被拒绝；先备份、比对并合并到真源，不强制覆盖。安装清单记录源 revision / `source_dirty` / 文件 SHA；脏源安装不等于远端已发布。
- 在新会话实际调用技能加载机制，确认读到目标安装副本。文件存在、安装清单正确、客户端已发现、技能实际读取是不同证据；不要全量加载全部技能来证明发现。

具体选项和冲突保护见 [维护脚本](../scripts/README.md)。用户级 Agent 规则与跨会话记忆如要迁移，单独审查、脱敏、授权，不放入本次技能安装。

## 3. 依赖来源、版本与接入边界

下表是 **2026-11-09 本机只读证据**，不是所有电脑的最低版本或兼容性锁定。新机器按所选版本上游 manifest/lockfile 与现场 schema 核验；不要关闭引擎限制强装，也不在另一台电脑上无提示执行上游安装脚本。

| 项目 | 来源与已观察版本 | 前置 / 核验 |
| --- | --- | --- |
| 安装/校验器 | 本仓库当前提交；Python 3.14.7 观察值，声明最低 3.10 | `python --version`；下节离线回归；不要求 Pillow 或系统 Lua |
| Node / Git | 本机 Node 24.19.0、Git 2.56.0.windows.4 | 记录目标机 `node --version` / `git --version`；具体 Node 最低版本按外部包 manifest，不将观察值当最低值 |
| DSH | 本机运行时 manifest 为 0.2.2-rc.1 | 从实际使用的 DSH 发行渠道安装，记录版本/来源；确认目标 profile 和技能发现机制；本仓库不打包 DSH |
| dsh-miliastra | [上游](https://github.com/LoktLin/dsh-miliastra)，本机 manifest 0.8.0，GPL-3.0-only | 该 manifest 声明 Node >=20.0.0、DSH >=0.1.2-rc.1；启用对应 bundle，新会话核对 `miliastra_*` 工具及 schema。manifest 满足不是运行验收 |
| genshin-miliastra MCP（可选） | [8itlab 上游](https://github.com/8itlab/genshin-miliastra-mcp)，本机 manifest 0.1.0，MIT | Node >=22.12.0；按上游锁文件构建并独立注册 MCP，截图/OCR 等另按能力安装 Python 依赖；先 doctor / 握手 / tools/list / get_capabilities。不是 dsh-miliastra 的别名 |
| Genshin-TS（可选） | [上游](https://github.com/josStorer/genshin-ts)，上述 MCP 独立依赖 0.2.2，MIT | 仅节点图编译/注入工作按项目采用；不是客户端 Lua 运行时。沿用工程锁文件和配置，不因 MCP 带新版就替换工程编译器 |
| 游戏/千星编辑器 | 官方安装与用户许可，不随本库再分发 | 本轮未记录实际游戏/编辑器版本；目标机标 pending，记录安装来源、版本、目标地图和可读目录，不能凭主机历史状态填 passed |

出处：本轮只读核对已安装包的 `package.json`；8itlab 的历史本机接入记录（2026-11-02）曾证明握手/发现，不是本轮重测。本库只登记元信息，不复制外部包或私人配置。可检索登记见 [routes.json](../skills/xingyuan-router/references/routes.json)：代码/UI/动效的工具路径声明 `requires: dsh-miliastra`；可选 MCP / Genshin-TS 不设为默认硬依赖。登记 `unverified` 不等于缺包，也不等于已可用。

### 能力级核验，禁止凭工具名承诺

1. 确认实际运行的 Host/profile；获取包版本、来源、manifest 的 `engines` 与依赖。客户端内工具注册不代表新机器也有它。
2. 先看现场 schema，至少核实本任务会用的 health/read/inspect、map/clientui、log/errors、sim/bind/verify/frames 等能力。不要照旧文档拼不存在的 op/字段。
3. 真正操作 UGC 时先 `miliastra_health` 定位；在改码/部署前问作者“现在在哪张图”。`editorHint`、最近修改、窗口标题不是当前图的可靠授权证据。
4. 只读定位、真实 Lua 编译、模拟器、存档写入、桌面控制分别验收。8itlab 即使有输入/自动试玩接口，也不改变本工程**人点试玩、不擅自控制桌面**的约束。保持 `MILIASTRA_ALLOW_LIVE_WRITE=0`；这也不等于 UI 自动化天然无风险。
5. 插件 preflight 的真 Lua 编译使用其 fengari 依赖；仓库自带词法门禁不能替代。没有据此要求额外安装系统 Lua。

## 4. 工程迁移清单（私下交接，不提交到技能库）

| 必需输入 | 核对方式 / 缺失时怎么办 |
| --- | --- |
| 工程规则与范围 | 真实项目 AGENTS、当前主题、授权、作者当前地图；缺范围先澄清，不凭本机旧路径部署 |
| 源码与部署映射 | Lua、构建源、产物、锁文件、每份脚本的地图/活文件名/挂载对象、SHA 与作者未合并修改；不只拿某个镜像覆盖活文件 |
| 地图与原生依赖 | 安全传输正确 `.gil` 和需要的控件组、模板与资源；`.gil` 是存盘快照，不是实时内存；检查账号信息与项目许可 |
| 项目 API 注解 | 从目标编辑器/工程取得对应版本注解（常见为 `annotations.lua`）并记录来源/日期/SHA；通用文档不是唯一真源，不假装仓库包含目标工程完整 API |
| 模板与容器交接 | 容器索引、独立模板索引、控件名、父子关系、模板建立与挂载状态；优先从源码/交接/真实 `.gil` 核实，拿不到就问，不猜号 |
| 数据与事件契约 | 自定义变量/结构体 ID、信号、黑板键、客户端/服务端归属、多脚本调用与绑定；实际支持以项目注解和运行证据为准 |
| 素材与导出工具 | 真实素材、许可、序列化器/封装、已知良好样例及契约。私有 exporter 未入库，缺失就停止相应完整输出承诺；纯几何候选不等于可导入 GIA |
| 验收基线 | 上一版原生截图、输入路径、目标端、性能与控件预算、已知问题/恢复点；模拟器图不代替原生观感 |

关键语义：只有无父节点的独立模板才可能动态创建，画布实例/模板子控件不能直接当模板号。控件组空白除重复槽位外还有封装、依赖与语义问题，不做单因诊断。`100001–100006` 是本项目纯几何拼图白名单，不是全平台素材上限；未来美术按当前技能/作者最后确认方向和 ≤1000 控件预算执行，不追改已批准作品。

## 5. 可以独立复测的最小离线门禁

从仓库根执行；这些只操作仓库/临时样例，不会部署游戏：

```bash
python -B -m unittest discover -s scripts/tests -p 'test_*.py'
python -B scripts/verify_skills.py
node skills/miliastra-code/scripts/gates/check-lua-scope.mjs --selftest
node skills/miliastra-code/scripts/gates/check-lua-style.mjs --selftest
node skills/miliastra-code/scripts/gates/lua-iron-check.mjs --selftest
node skills/miliastra-ui/scripts/gates/check-ui-rules.mjs --selftest
node skills/miliastra-code/scripts/search-assets.mjs 纹理
```

对真实**可部署产物**使用显式文件/目录门禁，参数先看 [Lua 门禁](../skills/miliastra-code/scripts/gates/README.md) 与 [UI 门禁](../skills/miliastra-ui/scripts/gates/README.md)，不要把构建片段或缺失的工程主题常量当成成品。

- `scan-gil-ids`、`scan-binary-api`、地图专用 UI 契约/构建器等仍可能依赖旧账号/安装/工程路径；迁移后定向适配，不据名称宣称通用。
- 可选 UI builder/打包器所需 Pillow、lupa 2.8、tkinter、PyInstaller 等按具体脚本另准备；它们不属于基础安装要求。
- `varjson` 的 Excel/探测工具会导入插件内部模块，**即使 dry-run 也可能需要外部 dsh-miliastra**；显式核实插件目录及模块接口。未提供目标版本时不承诺可移植。
- 两条文字高度门槛同时生效：`h >= font*1.4` **且** `h >= font+16`；网格/字号沿用平台规则。通过几何静态检查也不代表原生不裁字。

## 6. 一个真实小任务的接续验收

按任务已有授权完成：确认范围与图 → 检查活文件/镜像差异和备份 → 离线门禁 → 插件真语法 preflight → 模拟器预测试 → 有部署授权才显式 `level` + `file` 部署 → 作者执行必要模板/挂载/存盘 → 核对快照与活文件 → 作者点试玩 → 日志 `errors` + 原生截图/目标端操作 → 作者效果验收。

- 嵌套模板使用真实 `.gil` 树，不平铺猜造；先读运行时控件名再写 `verify` 断言。逻辑用 `verify`；动效用 `frames` 多帧/差分。模拟器通过 ≠ 真机通过。
- `.gia` 运行日志一般在结束后落盘；开跑状态看 `output_log.txt` 对应 playtest 信号。旧局日志或没有新日志不证明本局成功/未执行。错误可没有标签，先用 `errors`。
- 临时试玩探针会替换活文件：部署后明确告诉作者现在去点一次试玩，试玩后 collect，收完还原脚本。没有真正试玩不写运行结论。
- 编辑器模板、挂载、存盘和试玩等 UI 环节由人操作；不自动删除备份/素材/截图，不迁移或改动玩法规则/数值/控件位置来“修环境”。

## 7. 换机验收记录模板

每层单独填一行；本轮没有另一台电脑与目标游戏验收，不能预填通过。

```text
机器别名（非账号/路径）｜日期｜仓库 commit / 源是否干净｜客户端与profile别名
能力/层级｜版本与来源/锁文件或SHA｜操作与证据
  evidence_source = documented | provided_unverified | observed | inferred | unknown
  device_status = passed | failed | pending | not_required
结果与边界｜未验证项｜下一步/责任人
```

`documented` 是文档写了，`provided_unverified` 是他人提供但未复测，`observed` 才是该环境实际观察；`device_status` 单独表达当前目标机验收。插件无关任务可写 `not_required`，不能为了清单全绿运行无关能力。

最终可声明：**技能安装通过 / 客户端发现通过 / 依赖接入通过 / 目标工程预测试通过 / 目标端真机通过**中的已完成层；不要合并写成“拉取即能完整开发”。当前发布与本机测试状态见 [就绪交接](../handoffs/active/qianxing-readiness.md)。
