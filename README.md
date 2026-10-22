# 星愿 AI 中心 🌙

ChatGPT × Codex 的私有共享知识、技能和任务交接仓库。

千星奇域的 10 项来源技能已完整迁入；本仓库另保留 4 项辅助技能，新增 [关键词统一入口](skills/xingyuan-router/SKILL.md)。迁移证据见 [迁移状态](skills/QIANXING_MIGRATION_STATUS.md)，当前进度和下一步见 [千星就绪检查](handoffs/active/qianxing-readiness.md)。

## 唯一真源与维护方式

**本仓库 main 的 skills/ 是用户共享技能的唯一正式真源。** 电脑上的仓库克隆用于编辑，客户端技能目录仅作为安装副本；完整约束见 [Agent 规则](AGENTS.md)。

| 位置 | 用途 | 如何修改 |
| --- | --- | --- |
| GitHub main 的 skills/ | 正式共享版本 | 经验证的提交正常推送 |
| 电脑克隆仓库的 skills/ | 新增与修改的工作副本 | 在这里编辑，保留草稿，合并远端变化后提交 |
| 实际客户端的技能安装目录 | 使用副本 | 从仓库安装，不手工维护正文 |
| 旧 qxqy_AI、备份或缓存 | 历史来源与恢复 | 不作为后续维护真源 |

首次回原电脑，按[同步规则](handoffs/active/local-skill-sync.md)收录独有新增、备份替换同名旧技能，再核对实际扫描目录，避免同名副本同时被加载。以后采用“更新仓库 → 修改真源 → 验证并推送 → 更新安装副本”。源目录尚未提交的工作需要保留和合并，不适用旧安装副本的直接替换规则。

目前已设置的是仓库协作规则；原电脑目录、工程入口和实际客户端加载尚待接入。系统内置及插件托管技能不在接管范围。

## 开始使用

从仓库根目录运行，要求 **Python 3.10+**，安装与结构检查仅使用标准库。Windows 可将 `python3` 换成 `py -3`。

```bash
# 1. 只读检查技能、引用和原始素材
python3 -B scripts/verify_skills.py

# 2. 预览默认 11 项技能（入口 + 10 项千星技能）将安装到哪里、改动哪些文件
python3 -B scripts/install_skills.py

# 3. 执行安装到当前仓库 .agents/skills
python3 -B scripts/install_skills.py --apply

# 4. 检查安装副本与真源是否一致
python3 -B scripts/verify_skills.py --installed .agents/skills
```

在另一个游戏工程使用时，安装目标应是那个工程的 `.agents/skills`：

```bash
python3 -B scripts/install_skills.py --target /path/to/game-project/.agents/skills
python3 -B scripts/install_skills.py --target /path/to/game-project/.agents/skills --apply
```

也可用 `--scope user` 安装到用户的 `~/.agents/skills`，或用 `--skill 名称` 选择技能。目标中已有未管理的同名技能或本地改动时，安装器会拒绝覆盖并指出冲突。更新操作沿用“预览 → 安装 → 检查”，详见 [维护脚本](scripts/README.md)。

Codex 的技能发现位置参考[官方技能文档](https://learn.chatgpt.com/docs/build-skills)。文件安装通过后，仍需在实际 Codex 会话确认技能被发现；仓库访问不会自动安装 ChatGPT 插件或建立两端共享记忆。

## 目录

- `AGENTS.md`：协作规则和安全边界
- `skills/`：可审查、可版本管理的 SKILL.md 技能
- `memory/`：经用户确认的项目知识与开发偏好（当前为空白模板）
- `handoffs/`：任务请求、执行结果和待审核记录
- `projects/`：项目索引
- `scripts/`：技能安装器、只读校验器、迁移基线和定向测试

## 使用方式

1. 在 ChatGPT 中规划任务，明确范围和验收标准。
2. 将任务请求保存到 `handoffs/active/`。
3. Codex 在获得仓库访问权并完成所需技能安装后，读取交接内容，执行并记录提交与测试结果。
4. ChatGPT 读取结果进行复核，更新知识需用户确认。

> 注意：GitHub 充当共享资料源，不会自动同步 ChatGPT 内部记忆、插件或 Codex 技能安装。严禁提交凭据及私人聊天全文。

## 已选工具接入

MarkItDown、Superpowers、LocalSend、Open-LLM-VTuber、Aseprite、rembg、Ink／Inky、WinMerge、ImHex 已纳入[接入清单](handoffs/active/tool-adoption.md)。目前完成接入准备，电脑安装与运行验证待执行；应用与模型不存放在技能目录。
