# 星愿 AI 中心 🌙

ChatGPT × Codex 的私有共享知识、技能和任务交接仓库。

千星奇域的 10 项来源技能已完整迁入；本仓库另保留 4 项辅助技能。迁移证据见 [迁移状态](skills/QIANXING_MIGRATION_STATUS.md)，当前进度和下一步见 [千星就绪检查](handoffs/active/qianxing-readiness.md)。

## 开始使用

从仓库根目录运行，要求 **Python 3.10+**，安装与结构检查仅使用标准库。Windows 可将 `python3` 换成 `py -3`。

```bash
# 1. 只读检查技能、引用和原始素材
python3 -B scripts/verify_skills.py

# 2. 预览默认 10 项技能将安装到哪里、改动哪些文件
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
