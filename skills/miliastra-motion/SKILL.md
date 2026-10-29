---
name: miliastra-motion
description: 千星奇域客户端 UI 的动效与粒子：按意图选「补间 / 逐帧 / 粒子池 / 帧动画」，给出时长、缓动、编排、状态反馈与过冲的数值口径，并把粒子参数落到原生图片控件和真机预算。普通 Web 动效、其他引擎、纯素材检索或纯代码排错不触发。
---

# 千星 UI 动效与 UI 粒子

一句话流程：**先把"感觉"翻译成数字**（时长、缓动、编排、数量），**再选实现**（Tween / 逐帧 / 粒子池 / 帧动画），**最后用真机预算与清理兜底**。

本技能只管"动得好不好、贵不贵"；控件怎么建、API 怎么调、怎么部署不在这里。

## 何时用

- 按钮、面板、列表、HUD 的出现/消失/状态切换要"顺"，不是"能跑就行"。
- 想要粒子（蒸汽、冷汽、火花、彩纸、碎块、故障感），但不确定控件数、寿命、池子怎么定。
- 动效发飘、抖动、控件数随帧增长、退页残留、循环久了漂移。

**不适用**：纯 Web/CSS 动效（用 `motion-design` 参考技能）、素材检索与控件生成（`miliastra-ui`）、打击感/顿帧/震屏（`game-feel`）、API 与部署（`miliastra-code`）、故障取证（`systematic-debugging`）。

## 一、先选实现（决策矩阵）

| 要的效果 | 用什么 | 代价 / 注意 |
| --- | --- | --- |
| 位置、尺寸、透明度的一次性变化（弹窗进出、按钮按下） | **Tween**（引擎插值） | 减少脚本手写插值，不等于零每帧开销；进场 ease-out、退场 ease-in 可作起点 |
| 循环、呼吸、跟随状态的连续变化（气体边缘、进度光） | **OnUpdate 逐帧**（`EnableUpdate`） | 每帧都要算；必须按 dt 累积，不能按帧数硬算 |
| 多元素错峰入场（列表、图标排布） | 同一 Tween + **延迟（stagger）** | 总stagger ≤500ms，超过 8 个元素改分组入场 |
| 大量同类小元素（蒸汽、火花、彩纸、碎屑） | **粒子池**（固定池 / 可增长池） | 一个粒子＝一个控件；预算先算再写 |
| 画好的序列帧（逐帧美术） | **帧动画**（控件池 + 帧数据） | 数据量大，注意文件体积铁律 |

实现细节按已核实的工程口径，别照本文件臆造 API 名：

- 控件创建、几何、颜色、层序：[api-client-ui.md](../miliastra-code/references/api-client-ui.md)
- 整组渐入渐出先核对[父级透明度实机经验](../miliastra-ui/references/control-cost-benchmark.md)：父图片颜色Alpha不等于子树整体Alpha；容器候选字段返回nil不代表已执行修改。当前采用已核实的子控件颜色更新时，缓存原色并统计真实setter数量，不能将库的groupAlpha封装当成原生父级单字段。
- 逐帧与 Tween 的写法：[frame-animation.md](../miliastra-code/references/frame-animation.md)
- 粒子池的历史实现：[vfx-particles-and-budget.md](../miliastra-code/references/vfx-particles-and-budget.md)、[case-extreme-particles.md](../miliastra-code/references/case-extreme-particles.md)；当前测量与预算边界见 [性能适配](../performance-optimization/references/miliastra.md)，不套用历史数量作为上限。
- 每帧预算与分帧：[l2-07-frame-budget.md](../miliastra-code/references/iron-rules-l2/l2-07-frame-budget.md)
- 栅格、字号、层序：[design-guide.md](../miliastra-ui/references/design-guide.md)

## 二、数字口径（详表见 [references/ui-motion-timing.md](references/ui-motion-timing.md)）

- 时长：微反馈 80–120ms｜按钮/开关 120–180ms｜图标切换 150–250ms｜卡片出入 200–350ms｜弹窗 300–400ms｜整屏 400–600ms。
- 距离缩放：100px 为基准，200px≈1.3×，400px≈1.6×，整屏 1.8–2.0×。
- 入场比出场长 30–50%（出场取入场的 65–75%）。
- 交互延迟上限：悬停 <100ms，按下 <150ms，释放回弹 200–300ms，错误抖动 300–400ms（2–3 次）。
- 缓动方向：进场 ease-out｜退场 ease-in｜屏内移动 ease-in-out｜循环 sine｜旋转/进度 linear。
- 过冲预算：成功 5–10%｜错误 0%｜庆祝 15–25%｜高级感 0%。
- **换算**：60fps 下 1 帧≈16.7ms，30fps 下 ≈33.3ms；传参单位按目标 API（毫秒/秒）换算，别把 ms 当秒。

## 三、粒子（机制与参数见 [references/particles.md](references/particles.md)）

- 一颗粒子 = **一个原生图片控件**（矩形 100001 / 圆 100002 / 三角 100003）+ 一份状态（位置、速度、寿命、旋转、尺寸、颜色）。
- **先算预算再写代码**：稳态活跃粒子量级 ≈ 发射率 × 平均寿命；再加常驻、包装层和空闲池，并测同时爆发峰值。当前设备预算须复测，历史实测只作线索。
- 建粒子**只在一个地方**；热路径（每帧）只改字段，不 log、不新建。
- 池不足时按既定策略抢最老（可增长池要声明增长上限）；分帧补建，别在一帧建几百个。
- 退页/切关销毁本脚本拥有的控件，别把别人的控件清掉。

## 四、铁律（以 `miliastra-code` 为准，本技能只做提醒）

- 每帧不新建控件、不重建整棵树；静态美术建一次后复用。
- OnUpdate 里必须 pcall（[R1-onupdate-pcall.md](../miliastra-code/references/iron-rules/R1-onupdate-pcall.md)）；不泄漏全局。
- 文件体积按 [R11-file-size.md](../miliastra-code/references/iron-rules/R11-file-size.md)；纯 Lua 有门禁，动效别把文件堆爆。
- 文字高度 ≥ 字号×1.4（[R12-text-height.md](../miliastra-code/references/iron-rules/R12-text-height.md)）——**缩放/呼吸动效作用在文字上时同样成立**，别把字挤扁。
- 常规界面布局沿用项目栅格、字号与间距；曲线、门转轴、裁切和透视使用实际几何，不能为凑整把相接边界拆开。
- 颜色按目标 API 的签名、分量范围和序列化格式写；RGBA 函数、ARGB 整数与 CSS 字符串不可混用，不能统一假定 alpha 的位置。

## 五、工作流

1. **写清意图**：这是哪种反馈（成功/警告/切换/氛围/庆祝），给谁看。
2. **选属性**：只动必要的 1–2 个（位置、缩放、透明度、颜色），同时动 4 样通常不是动效而是噪音。
3. **定时长与缓动**：查第二节，按元素类型与距离选。
4. **编排**：谁先谁后、stagger 多少；短反馈可从 ≤600ms 起步，气体转移/结算等多阶段演出按可读性定总时长，并明确期间输入与取消。
5. **选实现**：查决策矩阵。
6. **算预算**：控件数、每帧工作量、文件体积。
7. **实现 → 门禁 → 模拟器 → 真机试玩**；手感只能在真机定，模拟器通过不等于通过。

## 六、验证（报数字，不报"流畅"）

- 控件数：动效前后各数一次，**不随时间增长**。
- 退出：退页、切关、重开后无本脚本残留控件。
- 循环：连续跑 30 秒以上位置不漂移（dt 用累计时间，别用帧数×常量）。
- 性能：记录同屏粒子数、平均帧率与最差帧；模拟器数据只能作参考，真机才是结论。
- 视觉：关键帧截图对得上设计意图（起始/中间/结束各一张）。

## 七、常见坑

| 症状 | 常见原因 | 处理 |
| --- | --- | --- |
| 动效一顿一顿 | 每帧堆了新建控件或重建树 | 建一次复用；分帧补建 |
| 越跑越慢 | 控件泄漏（退页没销毁） | 只销毁自己拥有的；核对前后控件数 |
| 手感"飘" | 反馈延迟、距离/时长失衡或落点不清 | 核对首次反馈、速度曲线和终态；不能仅凭 ease-in 或超过 400ms 定错 |
| 弹窗"软" | 没有过冲也没有位移方向感 | 加 5–10% 过冲或 8–16px 位移 |
| 文字抖/糊 | 动效缩放了文字控件 | 动容器，不动字体；高度守住字号×1.4 |
| 粒子"糊成一团" | 发射太密、颜色超出调色板 | 降 rate，限定 5 色以内，能量饱和·物质去饱和 |
| 颜色不对 | 分量范围/顺序错、旧缓存或重复透明叠加 | 按实际 API 核对首帧颜色与合成结果；颜色来自定稿参数 |

## 八、参考

- [有状态场景动效：气体边缘/转移、门、食物、结算与预览验收](references/stateful-scene-motion.md)
- [时长 / 缓动 / 编排 / 状态反馈全表](references/ui-motion-timing.md)
- [UI 粒子：机制、参数、配方、预算](references/particles.md)
- [来源与改编说明](references/sources.md)

数值来源：LottieFiles `motion-design`（MIT）、iart-ai `webgl-animation-skills` 的 particle-system（MIT）、adnvli `vfxskill` 的 VFX 设计原则（MIT），按千星口径改写；涉及平台的 API、门禁、预算以 `miliastra-code` 为准。
