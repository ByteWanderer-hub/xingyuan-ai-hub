# 千星奇域技能迁移状态

状态：**文件迁移已完成；客户端与游戏工程验收另行记录。**

基线核验时间：2026-10-22 15:04:37 UTC（北京时间 23:04:37）。

| 对象 | 固定版本与路径 |
| --- | --- |
| 只读来源 | `lizhenyu2845905433-rgb/qxqy_AI`，提交 `80b07a1e396d199d0aad255d4f6b08b501429b78`，`.agents/skills/` |
| 完整迁移目标 | `lizhenyu2845905433-rgb/xingyuan-ai-hub`，提交 `3084d1c02ec0d094d547e61f2aa10ea7be930524`，`skills/` |
| 比较结果 | 10 项技能、187 个文件；Git Blob SHA、字节数、Git 文件模式全部一致；无缺失、无差异 |
| 可复核清单 | [migration-baseline.json](../scripts/migration-baseline.json) |

迁入范围包括 `game-design-theory`、`game-feel`、`game-ui-ux`、`level-design`、`miliastra-bb`、`miliastra-code`、`miliastra-ui`、`qianxing-agent`、`qianxing-auto-delivery`、`systematic-debugging`，以及其原有 `references`、`scripts`、`assets`、`evals` 等文件。此前“依赖未迁完”的记录已被上述基线核验取代。

## 原始关键素材

| 文件（相对 `skills/miliastra-code/assets/`） | 字节数 | Git Blob SHA |
| --- | ---: | --- |
| `Image_sample_by_id.json` | 5,586,269 | `7aa5b7c15648220c7a91757ad862ddf2b4fd73c9` |
| `信号节点图_4类型整改_侦探杀_20260929.gia` | 26,463 | `f3adbdc7eceb15f71c5a1c59ff487e7631e40dac` |

图片目录可解析为含 **1,543 条**记录的 JSON 数组。两项素材保留来源的原始字节，未用空文件、占位内容或重建数据替换；本地校验器会持续核对这两项素材。此结果不等于素材在编辑器中的导入或运行已验证。

## 迁移后的维护

本仓库 `skills/` 是后续共享技能维护真源；`qxqy_AI` 保留只读。首轮优化仅对 `qianxing-auto-delivery/SKILL.md` 两段路径说明作兼容调整，使共享仓库的 `handoffs/active/` 与目标游戏工程路径明确区分。该调整是迁移完成后的有意变更，因此当前文件不再要求与历史来源所有文本逐字一致。

安装与检查入口见 [维护脚本](../scripts/README.md)。当前实现、验证证据、外部依赖和下一步统一放在 [千星就绪检查](../handoffs/active/qianxing-readiness.md)。

## 验证边界

- 迁移核对证明原始文件齐全；安装校验证明本地副本与当前真源一致。
- GitHub 仓库连接不自动安装 ChatGPT/Codex 技能；实际客户端发现与技能调用需单独验证。
- 部分迁入脚本是旧游戏工程的快照，含工程路径、地图约定或 `dsh-miliastra` 插件依赖；不能将这些依赖在共享仓库中假定为可用。
- 旧迁移 Action 的失败状态属于对应历史运行；是否完成迁移以固定提交和文件核验为准。本轮不以重跑 Action 代替文件验证。
