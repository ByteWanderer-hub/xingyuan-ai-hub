# 收录说明：ponytail

- 上游：`DietrichGebert/ponytail`（GitHub），MIT，固定 commit `09c434ab73ca43761c5d8b0c5d341926c2fba710`（2026-10-18），仓库头 `main`。`git clone --depth 1` 取得，未执行上游任何脚本、hooks 或安装器。
- 上游形态：一个面向 16+ 编码 Agent 的插件包，含 `hooks/`、`scripts/`、各编辑器插件目录、`commands/*.toml`、`skills/` 六个技能与 `i18n/`。本库只取 `skills/` 的文档部分，不取插件机制。
- 收录范围：`skills/ponytail/SKILL.md` 的规则正文；`skills/ponytail-{review,audit,debt,gain,help}/SKILL.md` 转为 `references/*.md`；上游根 `LICENSE` 存为 `LICENSE-MIT`。
- 改动：
  1. 合并上游 6 个独立技能为 1 个经验条目（1 个 SKILL.md + 5 份 references），避免同一套准则在索引里重复占 6 条。
  2. 5 份变体去掉 YAML frontmatter，加一行来源与“Claude Code 专属命令不适用”的说明；正文未改写。
  3. 本库 SKILL.md 的规则段落保留上游英文原文，另加中文的何时用、档位、变体入口、与其他技能分工、自检与不承诺。
  4. 清洗：未收录 `.claude-plugin`、`hooks`、`scripts`、`package.json`、`benchmarks`、`i18n` 与任何图片资源；不含 npm 包名、更新命令或 Band 等 Claude Code 专属内容（`references/help.md` 中相关段落保留原样，仅作上下文）。
  5. 2026-10-28：在本库 description、适用场景与路由补充「代码优化／代码精简」等自然语言别名，区分代码精简和性能测量；上游英文规则与许可不变。
  6. 同日按用户追加要求，日常写代码、优化代码、修改代码固定配合 improve-codebase-architecture 的局部检查模式；保留小改范围与既定功能/美术标准。
- 许可：MIT，Copyright (c) 2026 DietrichGebert，全文见 `LICENSE-MIT`。再分发与修改需保留该许可与版权声明。
- 分类：`kind: experience`。依据是本目录无任何可执行脚本、无平台 API、产出是改法建议与审查报告，不是可自动核对工件；因此不登记 `requires`，也不进入 `externals`。
- 未验证：上游宣传的代码量/成本/速度收益；本库未复测。上游 176k+ star、趋势排名等只作来源背景，不作为能力证据。
