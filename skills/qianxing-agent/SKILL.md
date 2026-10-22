---
name: qianxing-agent
description: 为千星功能实现、玩法设计或故障修复选择角色参考。仅在任务需要角色工作流时使用，普通问答与指令维护不触发。
---

# qianxing-agent —— 千星三种角色入口（**先选一种，按需读章**）

| 任务 | 读哪份 | 一句话 |
|---|---|---|
| 实现工程师：新增功能 / 写代码 / 加页面控件 | [`references/role-code.md`](references/role-code.md) | 工程实现角色与按需章节 |
| 游戏设计师：关卡设计稿 / 玩法方案 / 复刻 | [`references/role-create.md`](references/role-create.md) | 设计角色与按需章节 |
| 故障修复工程师：报错 / 没效果 / 行为不对 / 偶发失败 | [`references/role-fix.md`](references/role-fix.md) | 修复角色与按需章节 |

正文只维护在编号章节，三个旧整篇文件保留兼容跳转；角色入口不再内联复制正文。先读[角色使用边界](references/authority.md)，再按任务选择章节。

**与相邻技能的分工**（要"规则/边界"而不是"角色提示词"时）：
- 代码与工程纪律、API 核对、机械门禁 → `miliastra-code`
- 视觉与布局规范、设计稿↔锚点换算 → `miliastra-ui`
- 需求边界确认与奇葩需求梳理 → `miliastra-bb`

> ⚠️ **同域内容以谁为准**：本技能 `references/code/` 与 `references/fix/` 里讲**运行期状态机 / 布局适配 / 错误边界与证据口径**的那几章，
> 与 `miliastra-code`、`miliastra-ui` 覆盖的是**同一套 levelScript 规则**（角色参考只补充视角，不复制或另立平台规则）。
> ⇒ **两份说法不一致时，以 `miliastra-code` / `miliastra-ui` 为准**（它们跟着真机实测持续更新）；
> 只按当前任务读取角色参考的相关章节；不因“完整工作流”重复规划、确认或全量审查。平台结论以工程技能及当前 API 为准。

对话模版、复杂变量、require 路径或多控件挂载脚本协作，按需读 [对话工程参考](../miliastra-code/references/dialog-template-patterns.md)。单入口是架构选择；不据此否定已运行的多挂载脚本项目。
