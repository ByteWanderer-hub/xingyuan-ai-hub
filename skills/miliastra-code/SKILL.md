---
name: miliastra-code
description: 开发、排障、验证和部署千星奇域客户端 Lua 脚本。用于千星脚本与平台 API 问题；普通 Lua 和指令维护不触发。
---

# 千星客户端 Lua

## 0. 范围与完成

客户端 UI 由 Lua 驱动编辑器原生控件；`levelScript.lua` 是常见入口，不代表只能有一个挂载脚本。以当前工作区规则、API 和授权为准。

- 先定位目标关卡、脚本与问题，只读目标源码、必要调用方和相关 API。纯问答、指令维护不启动项目恢复；不全仓扫描或预读全部参考。
- 沿用已确认的范围、验收和授权，继续完成实现、受影响检查和返修；已授权部署则按 §8 继续。只有需要改变玩法、范围、权限或无法独立解决的外部条件时才集中询问。
- 工具查询收窄到本次对象；截断内容不作结论，缩小查询或保存完整回执后取相关证据。未变化的资料和同一候选 SHA 的有效检查不重复读取、运行。

## 1. 平台与代码约束

修改脚本时读 [工程细则的 R1–R14 摘要](references/development-guide.md#rules)，涉及控件/几何再读同节 V1–V7；示例按具体编号查，不加载整套参考。编号不重排。

关键约束：`OnUpdate` 异常进入聚合故障块；平台调用失败有明确去向；避免漏 `local` 和声明前引用；源码无 BOM、LF；不直接修改构建产物；诊断不进游戏画面；删除/替换按用户要求实际完成。

- 动态创建、挂载、脚本映射或静默失效：读 [平台边界](references/development-guide.md#platform) 和必要的 [编辑器配置](references/editor-setup-sop.md)。
- 光标、拖拽、遮罩、填充或“日志有变化但画面不动”：读 [UI 交互可靠性](references/ui-interaction-reliability.md)，确认必要编辑器配置、事件对象和中断恢复；测试走真实输入路径。
- L2 规则约束跨脚本/跨局行为；其专项深度审查仍仅在用户明确要求时开展。针对当前故障读取相关规则不等于全项目专项审查。

## 2. 证据与完成状态

分别报告 `evidence_source`（documented / provided_unverified / observed / inferred / unknown）和 `device_status`（passed / failed / pending / not_required）。静态检查、模拟器、探针均不等于真机通过。

`pending` 不阻止继续完成可执行工作，也不允许跳过部署门禁。不得通过删需求、交空壳或回退用户要求的功能来凑通过。证据边界与故障块示例见 [完成判据](references/development-guide.md#evidence)。

## 3. 现状、交接与备份

当前关卡与活文件用 `miliastra_health brief:true` 获取；容器索引、挂载脚本名、模板索引和图片 ID 只能用可追溯来源，不能互换或编造。先用工具和既有记录，确实缺失再集中询问，见 [交接边界](references/development-guide.md#handover)。

写前读当前源码并确认可恢复备份；构建工程只改真源并由当前项目入口生成产物。覆盖活文件前核对归属和已确认 SHA，变化时停止覆盖并报告；中断后先核实结果，不盲重试。

## 4. 按任务选参考

| 任务 | 读取 |
|---|---|
| 新玩法需要确定脚本、容器或数据契约 | [架构评估](references/project-architecture-assessment.md) 的相关部分；明确小改不重做规划 |
| 多挂载脚本、对话/黑幕/选项、require、Tween、复杂变量 | [已运行对话工程](references/dialog-template-patterns.md)，区分来源确认与本轮实测 |
| 控件名、模板引用或字段读不到 | [控件名与探测](references/control-name-and-probe.md) |
| 跨脚本通信 | [通信参考](references/cross-script-comm.md)；涉及已运行对话工程时同时核对上一条的修正 |
| 粒子与性能预算 | [粒子与预算](references/vfx-particles-and-budget.md) |
| 用户明确要求帧动画/像素重建 | [帧动画](references/frame-animation.md) / [像素重建](references/pixel-reconstruction.md)，遵守工作区素材与图片限制 |
| 视觉布局或素材检索 | `miliastra-ui`；需求有实质歧义才用 `miliastra-bb` |

## 5. 其他资料

上述路由未覆盖的功能，先在 [工作流索引](references/development-guide.md#workflow) 或 [资料索引](references/development-guide.md#catalog) 定位；不顺带加载其他分支。

## 6. API 依据

项目 `annotations.lua`（存在时）→ [客户端 API](references/api-client-ui.md)。冲突以项目版本为准并记录；示例、旧脚本和记忆只作线索。查不到的类型/签名标 `unknown`，停止依赖该接口的部分，继续独立工作。已确认运行的源码可补充写法证据，不证明未执行分支。

已知差异与 Lua 环境限制按需查 [API 说明](references/development-guide.md#api)。

## 7. 风格与工程纪律

沿用项目既有风格，不为统一重排存量代码。需要具体风格项时读 [风格速查](references/development-guide.md#style)；授权边界、证据和验证强度见 [工程纪律](references/discipline-lua.md)。

## 8. 验证、部署与交付

- 代码修改运行适用的作用域/风格门禁；UI、构建和模拟器检查按改动触发。具体命令、前置条件及工具位置见 [门禁流程](references/development-guide.md#validation)，不把纯问答或指令维护套入业务检查。
- 静态门禁绑定显式候选文件与 SHA。`preflight.dir` 只放本次候选和必要部署依赖，不用工作区根；开工检查尚无候选时使用目标源码暂存副本。
- error 级失败、基线退化或模拟器首错修复前不部署。仅当证据证明判据错误且在授权范围内时修判据，并验证正反例。
- 部署显式指定 `level` 和 `file`，先核对当前指纹、归属与备份。部署后继续完成授权内的存盘/同步核对；`.gil` 与磁盘 Lua 一致后才能证明试玩使用该版。
- 报告修改、必要检查结果、SHA/bytes/备份路径、真机状态及需创作者完成的事项。不能执行的编辑器操作和视觉验收明确交给用户，不虚称通过。
