# Matt Pocock Skills 收录说明

- 上游：`mattpocock/skills`（GitHub，「Skills for Real Engineers」），MIT，固定 commit `5beb35b040e3de97e54fa9e386d7e42d15c295c2`（2026-10-22）。`git clone --depth 1` 取得，未执行上游安装器、`npx skills`、插件或 hooks。
- 收录范围：上游 `skills/engineering`（20）、`skills/productivity`（7）、`skills/misc`（4）共 **31 个技能**；其中 `git-guardrails-claude-code` 因硬绑 Claude Code 的 `.claude/settings.json` hook、在本环境无法执行，已于 2026-10-27 移出，现保留 **29 个**（1 个合并进 `code-review`）。
- 未收录：`skills/in-progress`（7 个未完成）、`skills/deprecated`（空）、`.claude-plugin/`、`scripts/`（仓库级）、`package.json`/`package-lock.json`、`CHANGELOG.md`、`docs/`、`SCOPE.md`/`CLAUDE.md` 等仓库级文档。
- 处理方式：
  1. 29 个技能初次**原样复制**到 `skills/<name>/`（含各自 `references/`、模板与脚本）；`git-guardrails-claude-code` 已移出。后续本库适配见下项，历史sha256清单保留为导入基线。
  2. 上游 `code-review` 与本库同名条目**合并**：正文存为 `skills/code-review/references/matt-pocock.md`，本库 SKILL.md 加一行指路，避免同名两份正文分叉。
  3. 上游根 `LICENSE` 存为 `skills/MATT_POCOCK_LICENSE`。
  4. 2026-10-28 按用户要求适配 improve-codebase-architecture：增加日常写/优化/修改代码的局部检查模式，更新description并移除disable-model-invocation；完整上游流程仅用于明确架构审查，避免小改自动扩大为全库报告。上游正文和许可保留。
- 分类：29 个条目中 `diagnosing-bugs`、`wizard` 带可执行脚本/模板，判 `kind: skill`；其余 27 个为方法/流程文档，判 `kind: experience`。判定依据见 [录用守则](skill-manager/references/admission.md)。
- 已知边界：
  - `setup-pre-commit`、`migrate-to-shoehorn` 面向 Node 工具链，`wizard` 依赖 bash；在本库只是文案与模板，不视为已在本机可用。
  - `setup-matt-pocock-skills` 会改项目的 issue tracker 配置，属写操作，执行前须确认目标仓库。
  - 上游宣传的收益与基准不在本库证据范围。
- 更新方式：上游有新提交时按 commit 差异核对本文件与目录；本库适配须明确记录并保留来源/许可，不静默改写已导入正文。

## 验证证据（2026-10-27，零网络、零安装、零模型调用）

| 检查 | 方法 | 结果 |
| --- | --- | --- |
| 结构、元数据、本地引用 | `python -B scripts/verify_skills.py` | PASSED：58 个 SKILL.md、167 条本地引用、3 条外部引用 |
| 路由与分类 | `python -B -m unittest discover -s scripts/tests -p 'test_*.py'` | 94 项 OK（1 skipped），含 `test_matt_pocock_import`、`test_self_description_probe` |
| 绝对路径 / 凭据 | 正则扫 29 个目录的 83 个文件 | 绝对路径 0；`api_key/token/secret/credential` 6 处均为正文描述（如向导要求用户填写 `.env`），无真实凭据 |
| 平台专有假设 | 同一次扫描 | `git-guardrails-claude-code` 已移出；剩余：`pr` 1 处外链、斜杠命令 2 个（`handoff`、`teach`）、Node 工具链 2 个（`migrate-to-shoehorn`、`setup-pre-commit`）→ 在 DSH 需改写，仅作参考 |
| 随包脚本 | 列出全部 `.sh` | 3 个：`block-dangerous-git.sh`（Claude Code hook，依赖 `jq`）、`hitl-loop.template.sh`、`wizard/template.sh`（后两者为模板，需自行复制改写）；import 过程未执行任何脚本 |
| 自描述探针 | 用每个技能自己的 description 当查询跑路由 | 57 条中 47 条 top-1（82%）、56 条进 top-3、0 条完全失配；Matt 30 条全部能路由回自己。据此补了 46 个英文触发词（如 `test-driven development`、`relentless interview`、`whale-chan comics`） |
| 漂移检测 | `skills/MATT_POCOCK_SKILLS.sha256` | 83 个文件的 SHA-256；上游同步或手工改正文后用它核对差异 |

仍**未验证**：这些技能在真实任务中的行为效果；Claude Code/Node 假设在 DSH 下是否可用；上游宣传的收益数字。自描述探针只证明“能被自己的描述找到”，不证明“用得好”。
