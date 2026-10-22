# 共享技能

每项技能的维护真源位于 `skills/<skill-name>/SKILL.md`。按任务读取需要的技能，通过 [安装器](../scripts/README.md) 生成客户端副本；不要同时手改 `skills/` 与 `.agents/skills/`。

## 默认安装：千星奇域

共 10 项、187 个文件，完整来源与校验见 [迁移状态](QIANXING_MIGRATION_STATUS.md)。

| 技能 | 入口 |
| --- | --- |
| game-design-theory | [SKILL.md](game-design-theory/SKILL.md) |
| game-feel | [SKILL.md](game-feel/SKILL.md) |
| game-ui-ux | [SKILL.md](game-ui-ux/SKILL.md) |
| level-design | [SKILL.md](level-design/SKILL.md) |
| miliastra-bb | [SKILL.md](miliastra-bb/SKILL.md) |
| miliastra-code | [SKILL.md](miliastra-code/SKILL.md) |
| miliastra-ui | [SKILL.md](miliastra-ui/SKILL.md) |
| qianxing-agent | [SKILL.md](qianxing-agent/SKILL.md) |
| qianxing-auto-delivery | [SKILL.md](qianxing-auto-delivery/SKILL.md) |
| systematic-debugging | [SKILL.md](systematic-debugging/SKILL.md) |

## 按需安装

另保留 `code-review`、`skill-manager`、`roblox-luau-expert`、`roblox-security-audit`。可用 `--skill 名称` 单独选择，或 `--all` 安装全部 14 项；Roblox 技能仅在相关任务中启用。

文件完整和安装副本一致，不代表客户端已发现或编辑器已可用。工程专用脚本、素材在引擎中的可用性和插件能力仍以目标工程验证为准；当前待办见 [千星就绪检查](../handoffs/active/qianxing-readiness.md)。
