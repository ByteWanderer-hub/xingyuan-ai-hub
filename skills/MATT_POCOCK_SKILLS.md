# Matt Pocock Skills 收录说明

- 上游：`mattpocock/skills`（GitHub，「Skills for Real Engineers」），MIT，固定 commit `5beb35b040e3de97e54fa9e386d7e42d15c295c2`（2026-10-22）。`git clone --depth 1` 取得，未执行上游安装器、`npx skills`、插件或 hooks。
- 收录范围：上游 `skills/engineering`（20）、`skills/productivity`（7）、`skills/misc`（4）共 **31 个技能**。
- 未收录：`skills/in-progress`（7 个未完成）、`skills/deprecated`（空）、`.claude-plugin/`、`scripts/`（仓库级）、`package.json`/`package-lock.json`、`CHANGELOG.md`、`docs/`、`SCOPE.md`/`CLAUDE.md` 等仓库级文档。
- 处理方式：
  1. 30 个技能**原样复制**到 `skills/<name>/`（含各自 `references/`、模板与脚本），未改正文与 frontmatter。
  2. 上游 `code-review` 与本库同名条目**合并**：正文存为 `skills/code-review/references/matt-pocock.md`，本库 SKILL.md 加一行指路，避免同名两份正文分叉。
  3. 上游根 `LICENSE` 存为 `skills/MATT_POCOCK_LICENSE`。
- 分类：30 个新条目中 `diagnosing-bugs`、`wizard`、`git-guardrails-claude-code` 各带可执行脚本/模板，判 `kind: skill`；其余 27 个为方法/流程文档，判 `kind: experience`。判定依据见 [录用守则](skill-manager/references/admission.md)。
- 已知边界：
  - `git-guardrails-claude-code`、`setup-pre-commit`、`wizard` 面向 Claude Code / Node 工具链；在本库只是文案与模板，DSH 环境需改写，不视为已可用。
  - `setup-matt-pocock-skills` 会改项目的 issue tracker 配置，属写操作，执行前须确认目标仓库。
  - 上游宣传的收益与基准不在本库证据范围。
- 更新方式：上游有新提交时按 commit 差异重做本文件与目录，不手工改已导入正文。
