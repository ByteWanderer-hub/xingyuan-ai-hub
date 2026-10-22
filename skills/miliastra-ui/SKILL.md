---
name: miliastra-ui
description: 设计或调整千星奇域客户端 UI，检索其图片、图标、音效、音乐和特效素材。普通网站及其他平台 UI 不触发。
---

# 千星 UI 与素材

按本次任务选入口，不要求先走一套完整 UI 流程。脚本工程、API 和部署用 `miliastra-code`；视觉验收由用户确认，遵守工作区不生成图片的限制。

## 素材检索

仅找素材直接读 [素材检索与接入](references/asset-search.md)，交付候选及来源、类型、真实 ID、接入条件与未确认项；不启动项目恢复、布局或部署。

主要美术优先复用已核实的官方模板/素材组，再考虑官方单图和少量组合；简单遮罩、分隔线可用基础色块。已有合适素材不重复搜索，不用大量小色块描绘可复用美术。详细选型见 [素材优先](references/design-guide.md#assets)。

## 1. 坐标、模板与层序

修改布局先按需要查 [坐标和层级](references/design-guide.md#layout)：区分画布与父级中心，使用文档几何 API，核对创建顺序与热区层级。图片 ID、模板索引和画布实例不可互换；复合模板保留子树，禁止递归清理或凭空 imageId 隐藏子控件。

## 2. 栅格与安全区

本项目规范为 8 基数、外边距 ≥32、元素间距 ≥24、分组间距 48，常规面板宽 480/720/960；整屏按实际画布加总。具体布局分配与一次性例外见 [栅格](references/design-guide.md#grid)，不把设计稿尺寸当作所有设备的固定分辨率。

## 3. 字号、颜色与常量

使用项目语义常量表，避免散落数值。字号档位 64/52/28/22，同屏至多 3 档、正文不低于 22；文字高度至少为字号 ×1.4。颜色、对比和新增档位的校验同步见 [字号与颜色](references/design-guide.md#typography)。

## 4. 面板与交互

面板、遮罩、内容和热区的层序及按钮常态/悬停/按下/禁用四态见 [面板与状态](references/design-guide.md#layers)。光标、拖拽、图片填充、遮罩或动态面板还需读 [交互可靠性](../miliastra-code/references/ui-interaction-reliability.md)，核对编辑器开关和中断恢复。

## 5. 观感问题

用户指出看不清、层次混乱或焦点冲突时，对照 [观感问题清单](references/design-guide.md#pitfalls) 的相关项，不对无关区域重做设计。

## 6. 实现参考

- 整屏或联动布局：按 [实现流程](references/design-guide.md#implementation) 记录必要的素材、坐标、层序和数据归属；明确的小改直接实施，不强制草图审批。
- 消息延迟、渲染归属或跨脚本显示问题：[数据归属](references/ui-data-ownership.md)。
- 对话/黑幕/选项、手柄导航与打字机：[已运行对话工程](../miliastra-code/references/dialog-template-patterns.md)。
- 网格换算：[网格计算](references/grid-calculator.md)；复用整屏样本：[侦探 UI 案例](references/case-detectives-ui.md)。
- 仅在用户明确要求或素材确不适配时参考 [程序背景](references/procedural-background.md)，不默认生成图片或像素拼图。

## 7. 验证与交付

适用的 UI1–UI6 约束见 [规则摘要](references/design-guide.md#rules)，按 [门禁](references/design-guide.md#gates) 检查候选；error 级失败不部署。对 [验收清单](references/design-guide.md#validation) 只核对本次受影响项，整屏制作适用全表。

静态通过不能证明素材渲染、真实点击、观感或动效手感。完成可执行的检查与返修，说明证据和待用户确认项；不将截图标注当成程序输出，不声称未做的真机验收。

## 8. 缺少环境信息

画布、素材或模板索引缺失时按 [环境与降级](references/design-guide.md#environment) 获取或标注未验证。占位只说明缺口，不算完成素材接入；不编造 ID、观感或帧率。

## 9. 相邻技能

`miliastra-code` 负责脚本与部署；`miliastra-bb` 仅在用户要求需求分析或存在实质范围歧义时介入。
