# 来源、许可与校正依据

2026-10-25 引入；这是星愿中文修改版，非上游原样镜像，不代表千星官方背书。

## 固定上游

- 仓库：[gamedev-skills/awesome-gamedev-agent-skills](https://github.com/gamedev-skills/awesome-gamedev-agent-skills)。本次固定提交 `184b72be02884f782a0058f2eeae2ce4277453e4`，由远端 main 查询并以该提交读取文件。
- 改写源：[SKILL.md](https://github.com/gamedev-skills/awesome-gamedev-agent-skills/blob/184b72be02884f782a0058f2eeae2ce4277453e4/skills/disciplines/performance-optimization/SKILL.md) 和 [profiling-and-budgets.md](https://github.com/gamedev-skills/awesome-gamedev-agent-skills/blob/184b72be02884f782a0058f2eeae2ce4277453e4/skills/disciplines/performance-optimization/references/profiling-and-budgets.md)。保留复现、测量、定位、单变量修改与复测的方法及池/预算主题；本地同名文件已重写。
- Apache-2.0；保留上游 [LICENSE](../LICENSE) 和 [NOTICE](../NOTICE)（追加本地修改声明），Copyright 2026 Abhishek Barali and the awesome-gamedev-agent-skills contributors。新增千星参考为本地适配；未引入第三方可执行安装脚本。

## 主要校正

| 原表述或示例问题 | 本地处理 |
| --- | --- |
| 减少 Draw Call 被归为常见 GPU 优化，并称 CPU-bound 不受益 | 区分 CPU 提交/状态切换和 GPU pass；减少 Draw Call 可减 CPU 渲染线程成本，不保证 GPU 帧时间下降 |
| 整帧 CPU/GPU 总预算及最大者模型过于简化 | 增加并发流水、同步、VSync/限帧与计时口径；不直接相加，也不只按哪个接近 Frame 判因 |
| 池只隐藏/关闭 process；池空直接创建 | 改为有界生命周期方案，覆盖事件/任务/物理等重置、扩容峰值、池满与销毁；不复制不完整运行代码 |
| 设备资源固定表与两分钟掉帧即热降频 | 移除通用硬阈值，按当前设备实测，热问题保留其他成因与验证要求 |
| 未提升整帧便断定找错瓶颈 | 增加局部改善、瓶颈迁移、等待与测量噪声解释 |
| 精确引擎版本、计数器、伪代码细节及缺失技能被当作现成能力 | 工具仅作需核实入口，删除未验证示例与版本承诺，不假装安装上游相关技能 |

## 外部事实核对入口

以下官方资料用于核对通用性能概念（2026-10-25 已读取），不构成千星 API 依据：

- [Unity：Introduction to optimizing draw calls](https://docs.unity3d.com/Manual/optimizing-draw-calls.html)：Draw Call/渲染状态的 CPU 成本及合批方向。
- [Godot：GPU optimization](https://docs.godotengine.org/en/stable/tutorials/performance/gpu_optimization.html)：渲染瓶颈也可位于 CPU/驱动，批处理成本与剔除粒度权衡。

千星依据为本库 `miliastra-code` 的 API 参考、工程约束和历史性能记录，以及 UI/动效技能；具体入口见 [miliastra.md](miliastra.md)。这些是项目资料，当前 API 与设备仍需按任务核实，本次仅验证技能文件与路由，没有执行游戏或声称真机通过。
