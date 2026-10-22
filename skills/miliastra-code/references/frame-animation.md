---
name: lua-control-frame-animation
description: "面向千星奇域 Lua 客户端脚本的控件帧动画 Skill，包含三项核心能力：从参考图、帧序列或已有控件流进行高保真还原；通过矩形合并、父节点、控件池和跨帧复用压缩控件数量；通过紧凑帧流、差分编码和字典压缩减小 levelScript.lua 文件体积。适用于制作、重建或优化千星奇域客户端 Lua 序列帧动画。"
---

# Lua 控件帧动画

## 目标

把参考帧表示为可复用图片控件的时间序列，并同时优化：

```text
最终画面误差
峰值控件数
播放期间创建/销毁数
每帧属性调用数
显隐切换数
Lua 文件字节数
```

采用以下处理链：

```text
系统 API 与图片资源标注 + 参考图/参考帧/已有控件流
  -> 统一 RGBA 点阵和时间轴
  -> 每帧同色缩放矩形
  -> 静态背景、共同运动和动态残差
  -> 跨帧控件轨迹与控件池
  -> I 帧、P 帧和关键帧插值
  -> 紧凑 Lua 数据与播放器
  -> 逐帧栅格、时序、性能和 round-trip 验证
```

## 1. 开始前读取文件

按顺序读取并记录事实：

1. `annotations.lua`

   提取 Lua 版本、生命周期和实际存在的接口，重点检查：

   - `OnStart()`、`OnUpdate(dt)`、`OnEnable()`、`OnDisable()`、`OnDestroy()`；
   - `script:EnableTick(enabled)`；
   - `game.InstantiateClientUIControl()`、`game.DestroyClientUIControl()`；
   - `SetActive()`、`SetVisible()`；
   - `SetAnchoredPosition()`、`SetSizeDelta()`、`SetLocalScale()`、`SetLocalRotation()`；
   - `imageColor`、`SetImage()`；
   - `SetSiblingIndex()` 和其他层级顺序接口；
   - `game.Tween()` 与 Tween 生命周期。

2. `readme.md`

   提取主脚本挂载节点、图片控件 prefab、空节点 prefab、资源 ID 约定和生命周期说明。空节点可作为共同运动父节点；图片控件用于实际像素矩形。

   不要把“接口存在”当成父节点可用性证明。资料未明确 prefab 默认 `active`、`visible` 或子控件继承行为时，将这些状态视为未知并安排运行时冒烟验证。

3. 图片资产目录：`assets/asset-catalog.md`（1543 条索引，可 rg 检索）或插件 `miliastra_asset op=catalog`；原 `Image_sample_by_id.json` 已于 移出技能

   为动画实际使用的每种图片资源确认：

   ```text
   assetID
   image_source
   image_type
   tintable
   preserve_aspect
   resize_policy
   alpha/content bounds
   ```

   优先选择支持染色、宽高独立缩放且无透明留白的实心基础图元来表示同色矩形。

4. `levelScript.lua`

   - 文件已有静态拼图时，恢复调色板、尺寸字典、矩形记录、父子层级和坐标公式；保留一份字节级备份。
   - 文件已有动画时，恢复控件池、轨迹、时间轴和编码格式，先建立行为基线。
   - 文件为空或缺失时，从系统文件和参考帧生成完整播放器骨架。

5. 参考输入

   接受以下一种或多种输入：

   - 有序帧目录；
   - GIF、WebP 或其他多帧文件；
   - 视频及其目标截取区间；
   - 单张参考图和明确的位移、缩放、旋转、淡入淡出等关键帧要求；
   - 已经规范化的 RGBA 点阵、矩形记录或控件状态序列。

记录帧顺序、每帧持续时间、循环方式、源尺寸、alpha、颜色空间和源文件哈希。

6. 目录中的工具

搜索图片解码、点阵提取、矩形拟合、轨迹匹配、Lua 生成和验证工具。已有工具覆盖当前格式和接口时，检查其 round-trip 后直接使用；缺少某一步时，创建任务内工具完成对应职责。

## 2. 建立统一帧点阵

将每帧转换为同一宽高的 RGBA 点阵：

```text
左上角 = (0,0)
x 向右，y 向下
矩形 = [x,y,width,height]
覆盖区间 = x <= X < x+width, y <= Y < y+height
```

多帧文件优先读取其原始逐帧 duration；视频按目标帧率取样。帧率候选至少比较 `12/15/24/30 FPS`，快速动作可增加更高候选。

只有单张图片时，尝试用自己的理解去构造用户所需的帧动画

使用关键帧插值保持流畅，并使首尾状态连续。

## 3. 统一颜色与色差

先建立整个动画共享的全局调色板，再拟合各帧。默认无损保留 RGB/RGBA；只有用户明确允许轻微色差且未指定阈值时才使用：

```text
颜色阈值 τ = 3
max(|R1-R2|, |G1-G2|, |B1-B2|) <= τ
alpha 保持一致
```

每个源颜色直接与最终代表色比较，使映射链不能把误差扩展到 `τ` 之外。按整个时间轴的像素使用频率选择代表色；同时比较颜色数量、矩形数量、帧间变化数量和 Lua 字节数。

量化后逐帧记录：

```text
changed_pixels
maximum_channel_error
MAE / RMSE
palette_size
```

## 4. 使用缩放控件拟合每帧

把可拉伸图片控件视为任意宽高矩形。对于完全同色的 `w × h` 区域，只生成一个控件：

```lua
image:SetSizeDelta(w * pixelSize, h * pixelSize)
```

对每个颜色 mask：

1. 将水平连续像素合并为行段。
2. 将相邻行中同起点、同宽、同色的行段垂直合并。
3. 从八种旋转/翻转扫描方向提取矩形并选择记录数较低的候选。
4. 反复合并能够完整填满共同 bounding box 的同色相邻矩形。
5. 允许底层大矩形被后续细节覆盖时，使用最终 painter order 栅格结果判断候选。
6. 逐帧验证最终栅格。

单帧矩形最少不是唯一目标。允许某帧多保留少量矩形，以换取跨帧边界稳定、槽位复用更多和差分数据更短。

## 5. 提取时间冗余

### 5.1 静态背景

找出整个时间区间保持不变的像素或矩形，只在启动时创建一次。对于物体离开后需要重新露出的背景，让动态控件覆盖静态背景，而不是反复重画背景。

### 5.2 共同运动

检测一组矩形是否共享同一个平移、缩放、旋转或透明度轨迹。共享轨迹时：

1. 启动时实例化一个空节点作为父控件。
2. 创建子图片控件时直接把该空节点作为 parent。
3. 播放时只更新父节点变换。

系统未提供可靠的运行时换父节点接口时，在初始化阶段固定分组。

正式挂载大量子控件前，先用父节点和一个测试子控件验证：实例化非空、`active`、`activeInHierarchy`、`visible`、子控件实际可见且父变换能带动子控件。显式调用 `SetActive(true)` 和 `SetVisible(true)`，不能依赖 prefab 默认值。若目标运行时无法做该验证，使用已验证可见的透明图片控件作变换宿主，并保留“直接挂到主节点的完整静态图”回退；父节点失败时禁止只留下已创建的背景。

### 5.3 动态残差

先对相邻帧做全局或分组运动补偿，再计算变化区域。只把补偿后仍然不同的像素转成动态矩形，避免把整幅平移误判为全屏变化。

## 6. 建立控件轨迹与控件池

为相邻帧矩形建立稳定槽位。按以下顺序匹配：

1. 完整状态相同：复用槽位且不产生事件。
2. 几何相同、颜色变化：只产生 `RECOLOR`。
3. 颜色和尺寸相同、位置变化：只产生 `MOVE`。
4. 颜色相同、位置或尺寸变化：产生 `MOVE_RESIZE`。
5. 一个矩形离场且另一个同时入场：优先让原槽位直接接管新状态。
6. 没有接管对象的离场矩形：产生 `HIDE`。
7. 没有可用槽位的入场矩形：分配池中空闲槽位并产生 `SHOW_STATE`。

先用状态哈希完成精确匹配，再按颜色、尺寸、资源 kind 和空间网格分桶，只在局部候选中计算匹配代价：

```text
match_cost = encoded_bytes
           + setter_calls * setter_weight
           + visibility_changes * visibility_weight
           + z_order_changes * z_order_weight
           + spatial_distance * distance_weight
```

对局部候选使用稀疏最小费用匹配或带阈值的贪心匹配。池大小取每种资源在任意时刻的最大同时占用槽位数，而不是各帧控件数之和。

播放阶段使创建和销毁数均为 0；在启动预热和最终退出阶段集中处理生命周期。

## 7. 设计动画数据

使用 I 帧和 P 帧：

```text
I frame:
  全部槽位初始状态

P frame:
  duration
  event_count
  slot_id_delta
  opcode
  opcode_fields
```

事件操作码按实际频率选择：

```text
MOVE
RESIZE
RECOLOR
MOVE_RESIZE
MOVE_RECOLOR
FULL_STATE
SHOW_STATE
HIDE
GROUP_TRANSFORM
```

压缩顺序：

1. 全动画共享资源表、调色板和尺寸字典。
2. 按槽位 ID 排序事件并编码 `slot_delta`。
3. 对 x、y、w、h、颜色和角度做帧间差分。
4. 匀速轨迹比较一阶差分与二阶差分。
5. 无变化时间使用 duration RLE。
6. 高频事件元组建立一字节和两字节字典。
7. 重复运动向量建立 motion dictionary。
8. 关键帧只在差分事件比完整状态更大、需要随机跳转或误差累积需要重置时插入。
9. 使用安全 ASCII 变长整数写入 Lua 字符串。
10. 将数据、字典和解码器总开销一起计入候选字节数。

关键帧变换数量较少时，可把每个量化字段直接编码成一个安全字符，并在 Lua 中用当前关键帧与下一关键帧线性插值。

## 8. 生成 Lua 播放器

### 8.1 初始化

在 `OnStart()` 中：

1. 计算统一 `pixelSize`。
2. 创建动画需要的空父节点。
3. 分配图片控件池。
4. 设置不再变化的 anchor、pivot、image source 和 image type。
5. 应用 I 帧。
6. 调用 `script:EnableTick(true)`。

父节点建池完成后再次显式激活并显示；只有父节点和完整池均有效时才开启 tick。失败时关闭 tick，并让全部图片控件直接挂到主节点以保留完整静态画面。

控件数量较大时，在多个启动 tick 中分批预热并让根父节点保持不可见；池完整后一次显示。

### 8.2 逐帧更新

使用 `dt` 累积真实时间：

```lua
function OnUpdate(dt)
    elapsed = elapsed + dt
    -- 找到当前目标帧或关键帧区间
    -- 解码本次到期事件
    -- 只应用发生变化的属性
end
```

为每个槽位缓存当前状态。只有缓存值变化时才调用对应 setter：

```text
位置变化 -> SetAnchoredPosition
尺寸变化 -> SetSizeDelta
颜色变化 -> imageColor
旋转变化 -> SetLocalRotation
显隐变化 -> SetVisible
```

一次更新跨过多帧时，把中间事件合并为每个槽位的最终状态，再调用 setter；保持时间进度而不逐帧追赶属性调用。

循环动画用累计时间取模，避免每圈浮点漂移。动画暂停或失活时关闭 tick；重新启用时按选择的语义恢复时间或重置到关键帧。

### 8.3 插值与 Tween

- 逐帧像素变化按目标 FPS 离散应用。
- 少量父节点或稳定矩形轨迹可在相邻关键帧之间线性插值。
- Tween 用于少量连续轨迹；把大量矩形归入父节点后再对父节点 Tween。
- 关键帧插值保持首尾位置、缩放和旋转连续。

## 9. 降低 Lua 文件大小

不要预设 P 帧差分一定最小。帧数较少、每帧大部分几何都会变化或运行时可能跨帧时，“按不可变颜色/资源分组的前缀控件池 + 每帧绝对几何状态”通常更简单、更稳健，也可能更小。

当文件大小是主要约束时，必须先阅读 [紧凑帧流参考](compact-stream.md)，再设计编码和独立验证器。

同时比较以下候选的正式 Lua 总字节数：

- 每帧完整矩形流；
- 静态背景 + P 帧差分；
- 固定矩形分区 + 每帧颜色差分；
- 控件轨迹 + 稀疏状态事件；
- 按不可变颜色/资源分组的前缀控件池 + 每帧绝对状态；
- 父节点轨迹 + 子控件残差；
- 数学轨迹参数 + 少量修正关键帧。

压缩播放器本身时：

1. 共享整数解码器、字母表和坐标公式。
2. 使用平行数组保存槽位状态。
3. 从字符串直接解码，复用临时变量。
4. 将高频 opcode 分支放在短编码区间。
5. 对已编码数据再尝试固定短语字典，并把解码器增长计入总大小。
6. 每次缩短解码器后重新执行语法、事件 round-trip 和逐帧栅格验证。

## 10. 验证

### 10.1 数据 round-trip

使用两个独立解码实现，把压缩动画恢复成规范化时间轴，并逐帧比较：

```text
frame duration
slot id
visible
kind
x, y, width, height
angle
color index
group transform
z order
```

独立验证器不得导入压缩器的编码或解码函数。轨迹优化可能改变同色槽位编号；这时按 `(color, x, y, width, height)` 多重集合比较，再以最终逐帧栅格为准，不要强制旧槽位 ID 相同。

### 10.2 逐帧栅格

按实际 painter order 栅格化每个目标时间点，比较参考点阵：

```text
different_pixels
maximum_channel_error
MAE / RMSE
```

对插值动画额外采样关键帧之间的中间时刻，检查跳变、穿插和首尾循环接缝。

无损任务要求每帧 `different_pixels`、`maximum_channel_error`、`MAE` 和 `RMSE` 全部为 0。

### 10.3 生命周期和性能

静态检查紧凑 Lua 时，先屏蔽字符串，再删除 `--` 注释并检查括号和代码块；安全 ASCII 数据可能包含看似注释或括号的字符。

静态检查并在目标运行时统计：

```text
startup_created_controls
playback_created_controls
playback_destroyed_controls
peak_visible_controls
peak_pool_controls
average_dirty_controls_per_frame
peak_dirty_controls_per_frame
setter_calls_per_second
visibility_changes_per_loop
frame_time / dropped_frames
Lua bytes
```

当前运行环境缺少游戏运行时测试时，完成静态接口核对、独立解码、逐帧栅格和理论调用量统计，并明确保留运行时验证项。

静态验证不得把“父节点接口存在”报告为“父子显示已验证”。至少分别报告 `api_contract_checked`、`parent_visibility_runtime_checked` 和 `child_transform_runtime_checked`；后两项未在目标环境执行时必须为 `pending`。

## 11. 交付

交付以下内容：

1. 可回滚的原始 `levelScript.lua` 或其哈希与备份路径。
2. 正式动画 `levelScript.lua`。
3. 规范化帧/轨迹事实数据或可恢复它的压缩流。
4. 编码器与独立验证器；目录已有兼容工具时复用。
5. 帧率、循环长度、池大小、Lua 字节数、误差和运行成本报告。

压缩已有正式脚本时，以当前 `levelScript.lua` 中的用户修改值为准，尤其保留 FPS。先验证候选并备份、核对正式文件哈希，再替换；替换后必须对正式路径重新运行独立验证。

满足以下标准后完成：

- 图片控件宽高缩放实际参与矩形合并。
- 播放阶段复用已有控件，创建和销毁计数为 0。
- 未变化槽位不调用属性接口。
- 共同运动优先由父节点表达。
- 压缩事件可无损恢复规范化时间轴。
- 每个参考帧满足用户规定的图像误差。
- 循环边界连续，目标帧率下无明显跳动。
- 正式 Lua 总字节数已包含播放器和动画数据开销。
