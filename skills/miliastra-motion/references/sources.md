# 来源、许可与改编说明

本技能是**改写**（不是收录）：保留可迁移的数值与原则，换成千星口径，并与本库已有的工程文档交叉引用。

## 上游来源

| 上游 | 许可 | 本技能用到的部分 | 处理方式 |
| --- | --- | --- | --- |
| [LottieFiles/motion-design-skill](https://github.com/LottieFiles/motion-design-skill) `f9a8a04` | MIT | 时长表、距离缩放、进/出场比例、交互延迟、性格档、缓动方向与曲线、材质倍率、弹簧参数、stagger、过冲预算、情绪映射、Disney 原则、状态反馈配方 | 数值照用；补 60/30fps 帧换算、千星落点与文字约束；示例栈（CSS/GSAP/Framer）全部剔除 |
| [iart-ai/webgl-animation-skills](https://github.com/iart-ai/webgl-animation-skills) `skills/particle-system` | MIT | 逐粒子积分、力与阻尼、burst/continuous、流场、深度错觉、彩纸/雪/烟配方、连接点网络 | 机制与相对量照用；实现从 Canvas/Three 换成"一粒子=一个原生图片控件"；流场改成无依赖的正弦叠加 |
| [adnvli/vfxskill](https://github.com/adnvli/vfxskill) | MIT | VFX 设计原则：5 色调色板、能量饱和/物质去饱和、渐变暗尾、层与亮度关系 | 只取原则，不取 Roblox 数值（bloom/亮度阈值属该平台，未验证于千星） |

完整的上游技能另见本库 `motion-design`（LottieFiles 原样收录，MIT）。

## 本技能新增、上游没有的内容

- 决策矩阵（Tween / OnUpdate / 粒子池 / 帧动画 各自适用面）。
- 千星约束：一粒子=一控件、预算估算式、分帧补建、退页清理、R1/R11/R12 与 8px 栅格/字号档位。
- 与 `miliastra-code`、`miliastra-ui`、`game-feel` 的分工与跳转。
- 落地注意：单位（ms/s）、循环用累计时间、文字不缩放、层序不改。

## 不能当结论的部分

- 千星 API 名称、参数与可用性：以 `miliastra-code` 已核实口径为准；本技能不提供函数签名。
- 真机性能：以 `miliastra-code/references/vfx-particles-and-budget.md` 的实测数字为准；本文件的"相对量"只用于设计估算。
- 视觉与手感：只能真机试玩确认；离线预览、模拟器、截图差分都不等于通过。
