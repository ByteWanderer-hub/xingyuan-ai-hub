---
name: code-review
description: Review changes for correctness, security, performance and regression risk.
---

# Code Review

优先输出可复现的高严重度问题，定位文件和行号；区分事实、推断和未验证风险。检查边界条件、兼容性、测试覆盖与回滚方式。不修改代码，除非任务明确要求。

需要更细的审查流程（固定基准点、按正确/安全/负载/测试/快/精简排序、报告结构）时，读 [references/matt-pocock.md](references/matt-pocock.md)（上游 Matt Pocock 的 code-review，MIT）。两者是同一职责的正文合并：本文件给简报口径，参考文件给完整流程。
