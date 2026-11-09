# 共享技能

每项技能的维护真源位于 `skills/<skill-name>/SKILL.md`。按任务读取需要的技能，通过 [安装器](../scripts/README.md) 生成客户端副本；不要同时手改 `skills/` 与 `.agents/skills/`。

## 统一入口

优先使用 [xingyuan-router](xingyuan-router/SKILL.md)，结合任务语义与中英文关键词定位技能并继续任务。索引覆盖当前技能集合（路由自身除外）；查询脚本只推荐，不自动执行。

```bash
python3 skills/xingyuan-router/scripts/route.py "千星 UI 素材"
python3 skills/xingyuan-router/scripts/route.py "输入缓冲" --platform qianxing
```

## 默认安装：入口 + 千星奇域

默认共 17 项，含入口、千星开发/设计/动效、性能/排错与日常代码辅助。原迁移基线为 10 项、187 个文件，仅为历史基线，当前集合以安装器为准；完整历史来源与校验见 [迁移状态](QIANXING_MIGRATION_STATUS.md)。换机按 [2D Lua 迁移指南](../docs/qianxing-2d-portability.md) 分层准备依赖、工程与验收。

| 技能 | 入口 |
| --- | --- |
| xingyuan-router | [SKILL.md](xingyuan-router/SKILL.md) |
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
| miliastra-motion | [SKILL.md](miliastra-motion/SKILL.md) |
| motion-design | [SKILL.md](motion-design/SKILL.md) |
| performance-optimization | [SKILL.md](performance-optimization/SKILL.md) |
| ponytail | [SKILL.md](ponytail/SKILL.md) |
| improve-codebase-architecture | [SKILL.md](improve-codebase-architecture/SKILL.md) |
| codebase-design | [SKILL.md](codebase-design/SKILL.md) |

## 按需安装

其他技能按任务选择，例如 `code-review`、`skill-manager`、`roblox-luau-expert`、`roblox-security-audit`。可用 `--skill 名称` 替代本次默认选择（可重复，不自动展开依赖、不卸载其他受管技能），或 `--all` 选择当前仓库全部技能；总数以当次预览为准，Roblox 技能仅在相关任务中启用。

文件完整和安装副本一致，不代表客户端已发现或编辑器已可用。工程专用脚本、素材在引擎中的可用性和插件能力仍以目标工程验证为准；当前待办见 [千星就绪检查](../handoffs/active/qianxing-readiness.md)。
