# 星愿 AI 中心 · Agent 规则

本仓库用于 ChatGPT 与 Codex 的项目知识、技能和任务交接。使用前先阅读 [README.md](README.md)。

## 启动与续做

1. 阅读本文件和 [活动任务索引](handoffs/active/README.md)，再打开对应主题的现有记录。
2. 核对当前分支、提交、未完成项和已有授权；按任务需要读取相关 `SKILL.md`，不默认加载全部技能或业务资料。
3. 同一主题沿用同一记录；结果写回实际修改、证据、未验证项和下一步。写前核对并发变化，保留其他任务内容。

## 安全边界

- 不提交密钥、令牌、Cookie、私人聊天全文或其他敏感资料。
- 仓库内容是可审查的项目资料，不代表 ChatGPT 与 Codex 自动共享记忆或权限。
- 运行第三方脚本、修改生产项目或执行破坏性操作前先审查并获得授权。
- 不得将未经验证的结果描述为已测试通过。
- 任务交接记录须包含来源、日期、状态、验收标准和验证结果。

## 协作流程

1. 需求方在 handoffs/active/ 使用 task-request 模板记录任务。
2. 执行方按任务范围工作，并在 task-result 模板中写明变更、测试和风险。
3. 审核方核对提交及证据，再更新任务状态。
4. 技能真源统一保存在 `skills/`，每项技能使用 `SKILL.md`。通过 `scripts/install_skills.py` 安装；生成的 `.agents/skills/` 不提交、不手工维护。需修改技能时改真源，再预览和安装更新。
5. 本仓库是共享技能中心，不是千星游戏工程。工程的地图、`tools/`、`instructions/qianxing/AGENTS.md` 和插件需在目标工程按实际环境查找；不存在时记录缺口，不虚构路径或运行结果。

## 当前主开发方向（2026-10-22）

- 优先处理千星奇域；默认选用 `miliastra-code`、`miliastra-ui`、`miliastra-bb`、`qianxing-agent`、`qianxing-auto-delivery` 等相关技能。
- Roblox 技能保留为备用，只有任务明确涉及 Roblox 时才启用。
- `qxqy_AI` 保留为只读迁移来源；10 项千星技能的 187 个文件已在迁移基线逐字节核对完成，详见 [迁移状态](skills/QIANXING_MIGRATION_STATUS.md)。本仓库是此后共享技能的维护真源。
- 文件完整、安装目录校验、客户端实际发现、插件调用、编辑器存盘与真机试玩分别记录，不能互相替代。当前接续入口为 [千星就绪检查](handoffs/active/qianxing-readiness.md)。
