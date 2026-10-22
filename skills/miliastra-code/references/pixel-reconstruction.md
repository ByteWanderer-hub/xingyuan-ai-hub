---
name: pixel-lua-reconstruction
description: "面向千星奇域 Lua 客户端脚本的像素画重建 Skill，包含三项核心能力：从参考图还原 RGBA 点阵和 Lua 图片控件；通过同色矩形合并、形状拟合和资源复用压缩控件数量；通过调色板、尺寸字典、差分与安全 ASCII 编码减小 levelScript.lua 文件体积。适用于从零生成、修复偏色或优化现有千星奇域像素拼图脚本。"
---

# 参考图转 Lua 控件拼图

## 目标与产物

将用户参考图转换为可运行的 Lua 图片控件，形成以下可复核链路：

```text
系统 API 与资源标注 + 用户参考图
  -> RGBA 像素点阵
  -> 调色板、图层和形状 mask
  -> 控件绘制记录
  -> 未压缩 levelScript.lua 基线
  -> 控件数量优化
  -> Lua 数据压缩
  -> 像素、记录、语法和运行时验证
```

为每次任务产出：

1. 目标 `levelScript.lua`。
2. 一份可恢复完整绘制信息的规范化记录流。
3. 像素提取、记录生成、压缩和校验所需的工具；目录中已有兼容工具时直接复用。
4. 控件数量、Lua 字节数、像素误差和记录 round-trip 报告。
5. 已有脚本的备份或新脚本的初始哈希。

分别记录三类精度：

- **参考图误差**：最终栅格与参考图的差异像素数、最大通道误差和平均误差。
- **控件优化误差**：优化前后控件流的最终栅格差异。
- **压缩 round-trip 误差**：压缩数据解码后与规范化记录流的逐项差异。

## 1. 发现输入并选择执行分支

### 1.1 读取系统文件

按顺序读取以下文件：

1. `annotations.lua`

   提取 Lua 版本、生命周期函数和实际 API 签名：

   - `game.InstantiateClientUIControl`
   - `game.GetUICanvasSize`
   - `Enum.ImageSource`
   - `Enum.ImageType`
   - `Color.FromRGB`、`Color.FromRGBA`
   - `ClientUIImageControl:SetImage`
   - `SetAnchorMin`、`SetAnchorMax`、`SetPivot`
   - `SetSizeDelta`、`SetAnchoredPosition`、`SetLocalRotation`

2. `readme.md`

   提取脚本挂载节点、图片控件 prefab ID、空节点/点击区域 prefab ID、RGB 约定和脚本生命周期说明。

3. 图片资产目录：`assets/asset-catalog.md`（1543 条索引，可 rg 检索）或插件 `miliastra_asset op=catalog`；原 `Image_sample_by_id.json` 已于 移出技能

   按目标功能检索实际可用的资源，提取：

   - `assetID`
   - `render.image_source`
   - `render.image_type`
   - `render.tintable`
   - `render.preserve_aspect`
   - 拉伸、旋转和透明边界信息
   - 方形、椭圆、三角形或其他可用于拼图的基础资源

使用这些字段建立本任务的资源能力表：

```text
kind | assetID | ImageSource | ImageType | tintable | stretchable | shape
```

### 1.2 检查参考图

记录：

- 文件路径和格式；
- 原始宽高；
- RGBA/alpha 情况；
- 是否需要保持原始分辨率；
- 用户给定的控件数量、文件大小或图像误差目标。

把原始图片哈希写入任务报告，使后续像素验证始终对应同一个输入。

在生成任何降采样或量化候选前，固定三份互不混淆的事实数据：

- `O`：解码后的原始参考图；
- `T`：从 `O` 提取的规范目标点阵；像素画使用原生/推断逻辑网格，连续色图片使用明确记录的重采样网格；
- `Q`：可选的颜色合并或量化目标。

不得把 `Q` 当作原图保真验收基准。报告必须分别计算 `O -> T`、`T -> Q` 和 `Q -> 控件栅格` 的误差。已有 `levelScript.lua` 时，先独立回解并栅格化现有脚本，使用同一画布、对齐方式和缩放方法计算它相对 `O` 与 `T` 的基线误差。

### 1.3 检查 `levelScript.lua`

根据文件状态选择分支：

- 文件包含有效实现：读取现有常量、调色板、绘制记录、坐标公式、生命周期和压缩格式，保存原始副本后迭代。
- 文件为空、包含模板或尚未创建：从系统文件提取资源参数，先生成规范化绘制记录，再创建完整 Lua 基线。
- 文件包含其他玩法逻辑：保留现有生命周期和非拼图逻辑，将绘制模块接入合适的初始化位置。

基线统计包括文件字节数、绘制记录数、运行时控件数、网格宽高和 SHA-256。新文件的初始统计记为 0。

### 1.4 检查目录中的工具

搜索与图片解码、像素提取、矩形合并、Lua 生成、压缩和验证相关的脚本。

目录中已有相关工具时，依次检查：

1. 输入格式是否覆盖当前参考图。
2. 输出坐标是否采用当前网格约定。
3. alpha、调色板和 painter order 是否完整保存。
4. Lua API 和资源 ID 是否来自当前系统文件。
5. 编码器是否带有解码 round-trip。
6. 校验器是否独立于生成器实现。
7. 输出路径是否指向本任务的候选文件。

检查通过后复用工具，并将本任务参数传入工具。

目录中需要补充工具时，创建任务内工具，推荐职责拆分为：

- `extract_pixels.py`：参考图 → RGBA 点阵、行 RLE、颜色统计。
- `build_draws.py`：点阵/图层 → 规范化控件记录。
- `emit_level_lua.py`：系统参数 + 控件记录 → 未压缩 Lua。
- `compress_draws.py`：规范化记录 → 压缩数据和 Lua 解码器。
- `validate_reconstruction.py`：独立栅格化、逐项比较和统计。

本项目处理整数倍放大的像素画时，优先检查并复用 `API/Tools/ReconstructPixelArt.py` 和 `API/Tools/ValidatePixelArtLua.py`；前者执行逻辑网格推断、稳健单元取色、`τ` 约束合色、矩形拟合与编码，后者独立回解 Lua 并复算 `O -> T -> Q -> 栅格` 四层误差。

文件名可以适配项目约定；职责和验证边界保持清晰。

## 2. 将参考图转换为像素点阵

### 2.1 建立坐标和采样约定

采用统一坐标：

- 左上角为 `(0,0)`；
- x 向右，y 向下；
- 源像素中心为 `(x+0.5,y+0.5)`；
- 矩形使用 `[x,y,width,height]`；
- 覆盖区间为 `x <= X < x+width`、`y <= Y < y+height`。

高精度模式使用原始 `W×H` 网格。需要控制实例数时，可以生成多个候选网格，并分别报告清晰度和控件数量。

像素画、像素风插图或被整数倍放大的低分辨率图必须先推断原生逻辑网格，不得直接选用方便的 `48×48`、`64×64` 等任意尺寸。执行：

1. 用同色游程、边缘周期、自相关或候选分块一致性估计像素单元宽高与网格原点。
2. 检查候选单元内部的主色占比、跨单元边缘对齐率，以及整图宽高是否可由候选网格解释。
3. 对 JPEG 等带压缩噪声的像素画，在每个对齐单元内使用众数、medoid 或稳健聚类中心提取代表色；禁止用单个 `NEAREST` 采样点代表整个单元。
4. 将原始尺寸、推断逻辑尺寸、单元尺寸、网格原点、置信依据和重建误差写入报告。
5. 推断不可靠时保留原始网格，或生成多个候选供比较；不得无证据降低分辨率。

连续色照片、抗锯齿插画和像素画使用不同采样策略。连续色图片降采样优先使用 area/Lanczos 等覆盖采样；无论使用哪种策略，都必须把候选按明确方式恢复到 `O` 的尺寸后计算原图误差。

### 2.2 有视觉能力时

按以下顺序观察参考图：

1. 画布、透明边界和大面积背景。
2. 主体外轮廓和主要色块。
3. 遮挡关系和绘制顺序。
4. 阴影、描边、抗锯齿边缘。
5. 文字、细线、小装饰和重复结构。
6. 方形、椭圆、三角形等可用基础控件的候选区域。

视觉观察用于建立图层假设；原始 RGBA 点阵用于确定最终颜色和边界坐标。

### 2.3 无视觉能力时

优先使用目录中的图片解码工具；检查输出的宽高、RGBA 顺序和 alpha 后直接使用。

需要创建解码步骤时，使用本地可用的 Pillow、ImageMagick、系统图像组件或项目依赖。Pillow 提取示例：

```python
from PIL import Image
import json

image = Image.open(input_path).convert("RGBA")
width, height = image.size
flat = list(image.getdata())

rows = [
    [list(flat[y * width + x]) for x in range(width)]
    for y in range(height)
]

with open(output_path, "w", encoding="utf-8") as f:
    json.dump(
        {
            "width": width,
            "height": height,
            "coordinate_space": "top_left_pixel",
            "pixels": rows
        },
        f,
        ensure_ascii=False,
        separators=(",", ":")
    )
```

完整矩阵较大时输出等价的稀疏格式：

- 行连续段 `(y,x0,x1,r,g,b,a)`；
- 非透明像素 `(x,y,r,g,b,a)`；
- 颜色索引图；
- 每种颜色的二值 mask；
- 连通组件 bounding box。

为稀疏格式实现一次解码回像素矩阵的检查，确认它能完整恢复原始 RGBA。

若当前环境需要新的图片格式支持，选择可用的本地图像库完成解码；也可以让用户提供 RGBA 矩阵或行 RLE 作为点阵输入，然后从下一步继续。

### 2.4 生成点阵分析数据

从 RGBA 点阵计算：

1. 每种 RGBA 的出现次数。
2. alpha 直方图和透明边界。
3. 每行同色 RLE。
4. 每种颜色/颜色簇的 mask。
5. 四邻域或八邻域连通组件。
6. 每个组件的 bounding box、面积、孔洞和边缘。
7. 水平、垂直、对称和重复结构。
8. 方形、椭圆、三角形候选 mask。

输出中间结构：

```json
{
  "width": REFERENCE_WIDTH,
  "height": REFERENCE_HEIGHT,
  "palette": [
    {"index": 1, "rgba": [255, 255, 255, 255]}
  ],
  "layers": [
    {
      "order": 0,
      "color_index": 1,
      "bounds": [0, 0, REFERENCE_WIDTH, REFERENCE_HEIGHT],
      "mask_encoding": "row_rle",
      "mask_data": []
    }
  ]
}
```

## 3. 选择颜色和图层策略

### 3.1 原色模式

将每个不同 RGBA 值保留为调色板项。该模式适合逐像素精确重建，调色板和控件数量通常较大。

### 3.2 量化模式

为控件数量和 Lua 大小设定目标时，生成多个颜色候选，例如 16、32、48、64 色。使用 median-cut、k-means 或感知颜色距离进行映射，并为每个候选计算：

- 差异像素数；
- RGB/RGBA 最大通道误差；
- MAE；
- PSNR 或其他项目采用的指标；
- 估算控件数量。

选择满足用户清晰度要求且控件数较低的候选。将量化后的点阵作为后续控件拟合的明确目标。

“还原图片”默认表示保真优先。用户没有明确提出调色板、控件数或文件大小上限时，默认使用原色目标或第 3.3 节 `τ <= 3` 的轻微色差合并；不得仅为了减小控件数自动采用 16/32/48/64 色的有损量化。需要有损量化时同时满足：

1. 候选集合包含原色/原生逻辑网格候选和 `τ <= 3` 候选，不能只比较低色数候选。
2. 对每个候选分别报告 `O -> T`、`T -> Q` 的差异像素数、最大单通道误差、MAE、RMSE/PSNR、调色板数和控件数。
3. 用户未给色差阈值时，`T -> Q` 的默认硬门槛为每通道最大误差 `<= 3`；超过门槛的 median-cut/k-means 候选只能作为待用户确认的近似方案，不能直接覆盖正式脚本。
4. 检查低频但显著的肤色、眼睛、描边、标志色和高饱和点缀色。逐连通区域或颜色簇确认其没有消失、串色或被背景色吞并；平均 MAE 较低不能替代该检查。
5. 与已有脚本相比，正式候选的原图误差不得回退；若为满足用户明确的资源上限而回退，报告具体代价并等待确认。

禁止用“量化目标与控件栅格差异为 0”证明原图色彩正确。该结果只证明控件忠实绘制了 `Q`。

### 3.3 轻微色差合并规则

用户允许轻微色差且没有另行指定阈值时，采用以下默认规则：

```text
颜色合并阈值 τ = 3
max(|R1-R2|, |G1-G2|, |B1-B2|) <= τ
```

也就是每个 RGB 通道允许 `0–3` 的整数差；RGBA 输入的 alpha 默认保持完全一致。

按像素使用次数从高到低选择代表色，把满足阈值的低频颜色映射到代表色。每个原颜色都直接与其最终代表色比较，使颜色链不能把误差扩展到阈值之外。存在多个候选代表色时，依次选择最大通道差较小、RGB 平方距离较小、使用次数较多的颜色。

优先从已有调色板选择代表色，以保持平均色差较低。需要继续减少颜色和控件时，可以在多个源颜色各自 `±τ` 区间的 RGB 交集中生成新代表色；新代表色必须同时满足组内每个源颜色的逐通道误差上限，并与已有代表色方案比较调色板数、控件数、Lua 字节数和 MAE 后再选用。

颜色映射完成后：

1. 重新生成颜色索引点阵和调色板。
2. 从合并后的点阵重新提取矩形，使相邻同色区域产生新的合并机会。
3. 逐像素比较合并前后的点阵，确认最大单通道误差不超过 `τ`。
4. 报告变色像素数、最大通道误差、MAE、RMSE、调色板数量和控件数量。
5. 可计算 `τ=2、3、4` 的候选；在用户给定上限内选择控件数和 Lua 字节数较低的方案。

分别执行以下精度约束：

```text
颜色合并误差：每通道 <= τ，默认 τ=3
控件重建误差：相对合并后的目标点阵必须为 0
Lua 编解码误差：相对规范化控件记录必须为 0
```

### 3.4 图层顺序

从背景到细节建立 painter order：

1. 大面积背景；
2. 大色块和主体；
3. 阴影与轮廓；
4. 内部结构；
5. 文字、线条和高频细节。

允许较大的底层形状延伸到后续图层覆盖区域，以减少控件数。每次采用 overpaint 后重新栅格化完整绘制流，使用最终像素结果判断候选质量。

## 4. 将点阵拟合成控件记录

### 4.1 规范化记录

使用一份与压缩方式无关的规范化记录作为事实基线：

```text
{kind, x, y, width, height, angle, colorIndex}
```

其中：

- `kind` 对应本任务资源能力表中的形状；
- `x,y,width,height` 使用左上角网格坐标；
- `angle` 使用 Lua 控件的旋转角；
- `colorIndex` 指向本任务调色板；
- 数组顺序就是 painter order。

### 4.2 将同色像素合并为可缩放矩形控件

把一个可拉伸图片控件视为一个矩形，而不是一个固定大小的像素。对于完全由同一种颜色和 alpha 填充的 `width × height` 区域，只生成一条 `{kind,x,y,width,height,angle,colorIndex}` 记录，并在 Lua 中只实例化一个图片控件；使用 `SetSizeDelta(width * pixelSize, height * pixelSize)` 独立调整其宽高，使一个控件覆盖该矩形内的全部像素。

对每个颜色/alpha mask 执行：

1. 将每行连续同色像素转换为水平段，首先得到 `width > 1` 的横向矩形。
2. 将相邻行中起点、宽度、颜色、alpha 和资源 kind 相同的水平段垂直合并，得到 `height > 1` 的矩形。
3. 对剩余 mask 搜索面积较大的全填充矩形；可分别按原图的四种旋转和镜像后的四种方向扫描，再把候选坐标还原，选择记录数最少的结果。
4. 对已有矩形反复执行相邻合并：
   - 两个矩形上下相邻，且 `x`、`width`、颜色、alpha、kind 和角度相同时，合并高度；
   - 两个矩形左右相邻，且 `y`、`height`、颜色、alpha、kind 和角度相同时，合并宽度；
   - 多个矩形的并集恰好填满其共同 bounding box，且该 bounding box 在目标 mask 中全部是同色像素时，用一个 bounding-box 矩形替换它们。
5. 每次合并后继续扫描，直到一整轮没有产生新矩形；对弧边、细线和小细节保留无法继续合并的短矩形。
6. 栅格化全部矩形，检查每个目标像素被精确覆盖一次、矩形之间没有重叠、没有孔洞，并与当前目标点阵逐像素一致。

合并候选成立时，同时满足以下条件：

```text
资源支持独立宽高缩放
kind、颜色、alpha 和角度一致
合并后的 bounding box 内全部为目标同色像素
合并不改变 painter order 和最终栅格
```

把每条最终矩形记录直接映射为一个运行时图片控件。统计并报告：

```text
unit_controls = count(width == 1 and height == 1)
scaled_controls = count(width > 1 or height > 1)
covered_pixels = sum(width * height)
controls_saved_vs_pixel_controls = covered_pixels - record_count
```

可用以下贪心目标排序矩形候选：

```text
score = covered_target_pixels
        - overlap_penalty
        - uncovered_penalty
        - control_cost
```

精确模式将 overlap/uncovered 的容许值设为 0。分层 overpaint 模式允许底层覆盖后续图层区域，并以最终合成结果为验收依据。

### 4.3 拟合椭圆和三角形

对每个连通组件：

1. 计算 bounding box。
2. 使用资源能力表中的椭圆或三角形控件生成候选 mask。
3. 枚举资源支持的旋转角、尺寸和 pivot。
4. 计算候选 mask 与目标区域的差异。
5. 比较“一个形状控件”与“多个矩形控件”的数量收益。
6. 选择满足误差约束且控件数更少的方案。
7. 将候选插入原 painter order 位置并验证最终合成。

实际候选 mask 采用控件资源的真实透明轮廓。使用资源标注中的几何信息建立初始 mask，再通过一次控件栅格化测试校准边界和旋转结果。

### 4.4 复用完整图片资源

在 `assets/asset-catalog.md`（或插件 `miliastra_asset op=catalog` / `op=icon-search`）中检索可直接表达参考图整体或局部的资源。检查资源尺寸、透明边界、缩放方式、染色能力和目标区域一致性。

满足误差约束时使用一个完整资源控件替代多个基础图元；其余区域继续使用点阵控件。

### 4.5 迭代优化

循环执行：

1. 合并相邻矩形。
2. 用一个大矩形配合后画细节替代多个小矩形。
3. 用椭圆/三角形替代矩形集合。
4. 用完整资源替代基础图元集合。
5. 重新栅格化。
6. 记录控件数量和误差变化。

当连续一轮的控件数量保持不变，或误差达到用户上限时结束。

## 5. 从空脚本生成 Lua 基线

### 5.1 生成任务常量

从系统文件写入实际值：

```lua
local IMAGE_PREFAB_ID = IMAGE_PREFAB_ID_VALUE
local GRID_WIDTH = REFERENCE_WIDTH_VALUE
local GRID_HEIGHT = REFERENCE_HEIGHT_VALUE
local BASE_PIXEL_SIZE = TARGET_PIXEL_SIZE_VALUE

local IMAGE_BY_KIND = {
    [0] = SQUARE_ASSET_ID_VALUE,
    [1] = ELLIPSE_ASSET_ID_VALUE,
    [2] = TRIANGLE_ASSET_ID_VALUE,
}
```

`*_VALUE` 是生成器在写出 Lua 时替换的占位名称。资源能力表中列出的 kind 写入映射和记录流，其他 kind 留在下一轮资源补充后再生成。

### 5.2 生成调色板

```lua
local PALETTE = {
    [1] = Color.FromRGB(R1, G1, B1),
    [2] = Color.FromRGB(R2, G2, B2),
}
```

根据 `annotations.lua` 的真实签名选择 `Color.FromRGB` 或 `Color.FromRGBA`。

### 5.3 生成可读的 `DRAWS` 基线

先输出完整记录：

```lua
local DRAWS = {
    -- {kind, x, y, width, height, angle, colorIndex}
}
```

这份未压缩记录是压缩、回归和故障定位的事实基线。将它保存在正式脚本的备份或独立中间文件中。

### 5.4 生成控件函数

```lua
local function DrawItem(parent, kind, x, y, w, h, angle, colorIndex)
    local image = game.InstantiateClientUIControl(IMAGE_PREFAB_ID, parent)
    ---@cast image ClientUIImageControl

    image:SetAnchorMin(0.5, 0.5)
    image:SetAnchorMax(0.5, 0.5)
    image:SetPivot(0.5, 0.5)
    image:SetImage(IMAGE_SOURCE_BY_KIND[kind], IMAGE_BY_KIND[kind])
    image.imageType = IMAGE_TYPE_BY_KIND[kind]

    if TINTABLE_BY_KIND[kind] then
        image.imageColor = PALETTE[colorIndex]
    end

    image:SetSizeDelta(w * pixelSize, h * pixelSize)

    if angle ~= 0 then
        image:SetLocalRotation(0, 0, angle)
    end

    local px = -imageWidth / 2 + (x + w / 2) * pixelSize
    local py =  imageHeight / 2 - (y + h / 2) * pixelSize
    image:SetAnchoredPosition(px, py)
end
```

`IMAGE_SOURCE_BY_KIND`、`IMAGE_TYPE_BY_KIND` 和 `TINTABLE_BY_KIND` 由资源能力表生成。

### 5.5 生成 `OnStart()`

```lua
function OnStart()
    local canvasWidth, canvasHeight = game.GetUICanvasSize()

    pixelSize = math.min(
        BASE_PIXEL_SIZE,
        canvasWidth / GRID_WIDTH * CANVAS_MARGIN,
        canvasHeight / GRID_HEIGHT * CANVAS_MARGIN
    )

    imageWidth = GRID_WIDTH * pixelSize
    imageHeight = GRID_HEIGHT * pixelSize

    local parent = script.object
    for i = 1, #DRAWS do
        local item = DRAWS[i]
        DrawItem(
            parent,
            item[1], item[2], item[3], item[4],
            item[5], item[6], item[7]
        )
    end
end
```

根据目标布局生成 `CANVAS_MARGIN` 和 `BASE_PIXEL_SIZE`，并使用同一 `pixelSize` 计算所有位置与尺寸。

### 5.6 接入已有脚本

已有脚本包含玩法逻辑时：

1. 保留原生命周期函数和全局状态。
2. 将资源常量、绘制数据和 `DrawItem()` 放入局部作用域。
3. 在原有初始化顺序中调用图片构建函数。
4. 验证重复启用、重载和销毁时的控件生命周期。
5. 比较修改前后的非拼图逻辑行为。

## 6. 验证未压缩基线

在进入压缩前完成四层验证。

### 6.1 数据验证

检查：

- 每个 kind 都存在资源能力表条目；
- 每个 colorIndex 都存在调色板项；
- 坐标和尺寸位于网格范围；
- 宽高为正值；
- painter order 与生成记录一致；
- 记录数量等于预计运行时图片控件数。

### 6.2 软件栅格验证

创建或复用独立栅格器：

1. 按记录顺序绘制每个形状。
2. 应用颜色、alpha、旋转和覆盖。
3. 输出基线 RGBA。
4. 分四层比较，不得合并或省略层级：
   - 采样误差：`O` 与恢复到原图尺寸的 `T`；
   - 色彩优化误差：`T` 与 `Q`；
   - 控件重建误差：`Q` 与控件栅格，必须为 0；
   - 压缩误差：规范记录与 Lua 解码记录及其栅格，必须为 0。
5. 每层报告差异像素、最大单通道误差、MAE 和 RMSE；保存差异位置或差异 mask，供下一轮拟合优化。
6. 使用独立于生成器的校验实现复算记录和像素结果，并检查所有压缩数据游标恰好到达末尾。
7. 如果报告只有相对 `Q` 的 `0 differences`，但没有 `O -> T` 和 `T -> Q` 指标，则验证不完整，禁止标记 `passed` 或替换正式脚本。

### 6.3 Lua 静态验证

检查 Lua 语法、局部变量作用域、枚举名称、API 参数数量、字符串长度和生命周期函数。

### 6.4 游戏运行验证

在目标环境加载脚本，确认：

- 控件创建完成；
- 位置、尺寸、颜色和旋转正确；
- 画布缩放正确；
- 绘制顺序正确；
- 帧率、加载时间和控件上限满足要求。

## 7. 压缩 Lua 数据

在未压缩基线通过验证后执行压缩。目录中已有兼容压缩器时复用；目录中需要压缩器时创建 `compress_draws.py` 和独立解码校验逻辑。

### 7.1 选择压缩结构

根据本次数据统计选择组合：

1. **调色板索引**：每条记录保存颜色索引。
2. **形状/颜色游程**：连续相同 kind 或 color 的记录只写一次元数据。
3. **尺寸字典**：重复的 `(width,height)` 只存一次。
4. **坐标差分**：保存相邻记录的 `dx,dy`。
5. **ZigZag**：将有符号差分映射为无符号整数。
6. **变长整数**：小数值使用较少字符。
7. **安全 ASCII**：将数字流写进 Lua 字符串。
8. **字符串分块**：按加载器可接受的长度拆分字面量。
9. **按行分组**：记录每行的控件数，在每行开头重置 `x`，从记录流中消除重复的 `y/dy`。
10. **右边界间隔**：同一行按 `x` 排序，保存 `gap = x - previousRight`，绘制后令 `previousRight = x + width`。
11. **高频记录字典**：统计常见的 `(gap,sizeIndex,colorIndex)`，用一个字符表示高频组合，用保留字符转义其余组合。
12. **两级记录字典**：保留一组单字符高频项，再用“页前缀 + 页内索引”两个字符覆盖次高频项；逐项比较新增字典元数据与记录流节省量，选择 Lua 总字节数最低的页数。
13. **固定短语字典**：把已编码的调色板、尺寸、记录字典和绘制流串联，统计重复的 3 字符短语；用“保留标记 + 标签”替换，保留标记本身用专用标签转义。把短语字典、压缩流和解码器开销一起计入 Lua 总字节数，并逐层检查外层流恢复出四段原始数据。
14. **调色板重排**：按像素或记录使用频率重排颜色，让高频索引落入较短编码区间。
15. **Lua 解码器压缩**：数据格式固定并通过 round-trip 后，缩短局部变量和辅助函数名、合并只使用一次的绘制函数、共享常量与临时值，并删除不参与运行的空生命周期函数；每次改写后重新执行 Lua 语法检查和独立数据回解。
16. **按 Lua 总字节计费**：比较候选时统计数据字符串、字典、常量、解码器和字符串分块开销的总和。只有数据字符串变短但解码器增长更多的编码不予采用。

按行分组只适用于能够按最终像素分区任意排序的非重叠控件流。存在 overpaint、透明混合或其他 painter order 依赖时，保留原始绘制顺序，并改用不会改变顺序的游程和差分编码。

输出名称由生成器定义，例如：

```lua
local RUN_DATA = "..."
local SIZE_DATA = "..."
local RECT_DATA = "..."
local SHAPE_DATA = "..."
```

这些变量由本次压缩步骤生成，同时生成匹配的 Lua 解码器。

### 7.2 动态生成编码参数

根据本次数据计算：

- 安全字母表和基数；
- 坐标差分范围；
- 尺寸字典数量；
- 固定字段位宽；
- 变长整数的终止/延续区间；
- 每个游程的重置点；
- 字符串分块长度。

将这些参数同时写入编码器、压缩数据头和 Lua 解码器，使候选脚本自描述。

一个通用的安全 ASCII 变长整数方案：

```python
alphabet = "".join(
    chr(code)
    for code in range(33, 127)
    if chr(code) not in ('"', "\\")
)
radix = len(alphabet) // 2

def encode_uint(value):
    out = []
    while True:
        value, digit = divmod(value, radix)
        if value:
            out.append(alphabet[radix + digit])
        else:
            out.append(alphabet[digit])
            return "".join(out)

def zigzag(value):
    return value * 2 if value >= 0 else -value * 2 - 1
```

对应的 Lua 解码逻辑：

```lua
local ALPHABET = ENCODED_ALPHABET_VALUE
local RADIX = #ALPHABET // 2
local DIGIT = {}

for i = 1, #ALPHABET do
    DIGIT[string.byte(ALPHABET, i)] = i - 1
end

local function ReadUInt(data, position)
    local value = 0
    local multiplier = 1

    while true do
        local digit = DIGIT[string.byte(data, position)]
        position = position + 1

        local continued = digit >= RADIX
        if continued then
            digit = digit - RADIX
        end

        value = value + digit * multiplier
        if not continued then
            return value, position
        end

        multiplier = multiplier * RADIX
    end
end

local function DecodeZigZag(value)
    if value % 2 == 0 then
        return value // 2
    end
    return -(value + 1) // 2
end
```

生成器把 `ENCODED_ALPHABET_VALUE` 替换为安全字母表的 Lua 字符串。根据 `annotations.lua` 确认 Lua 版本后选择 `//` 或 `math.floor`。

### 7.3 保持绘制顺序

压缩器按原记录顺序编码。若使用 kind/color 游程，每个游程保存其连续记录数量。坐标差分可以跨记录连续，也可以在游程头重置；将重置规则写入数据头和解码器。

### 7.4 压缩 round-trip

压缩器完成后：

1. 使用压缩器内部解码函数恢复一份记录。
2. 使用独立实现的第二个解码器再次恢复记录。
3. 将两份结果分别与规范化记录逐项比较。
4. 检查所有数据游标恰好到达字符串末尾。
5. 栅格化解码记录，与未压缩基线逐像素比较。
6. 统计候选 Lua 的字节数和解码开销。
7. 满足目标后将候选脚本替换为正式输出，同时保留基线和哈希。

## 8. 优化顺序

按以下顺序迭代可以同时控制清晰度、控件数和 Lua 大小：

1. 建立原始 RGBA 或明确的量化目标。
2. 生成精确矩形基线。
3. 使用垂直合并和最大矩形减少控件。
4. 使用分层 overpaint 减少背景碎片。
5. 使用椭圆、三角形和完整资源替代矩形集合。
6. 验证最终像素误差。
7. 固定规范化记录。
8. 在允许的色差阈值内合并颜色，并重新拟合矩形。
9. 对记录做行分组、右边界间隔、字典、差分和变长编码。
10. 验证记录 round-trip 和 Lua 运行结果。
11. 在数据编码稳定后压缩 Lua 解码器，并再次执行语法、记录与栅格验证。

控件优化改变图元集合；Lua 压缩改变图元集合的存储方式。分别统计两步收益。

## 9. 交付格式

```text
系统文件：...
参考图：路径、尺寸、哈希
网格推断：图像类型、逻辑尺寸、单元尺寸、原点、证据与置信度
脚本起点：新建 / 迭代已有脚本
工具处理：复用的工具 / 本次创建的工具
像素策略：原始 RGBA / 量化配置 / alpha 配置
资源能力：kind、assetID、ImageSource、ImageType、染色和拉伸
控件记录：矩形、椭圆、三角形、完整资源数量
控件优化：优化前 -> 优化后
Lua 大小：未压缩基线 -> 压缩候选
采样误差 O -> T：差异像素、最大通道误差、MAE、RMSE
颜色误差 T -> Q：差异像素、最大通道误差、MAE、RMSE
控件重建误差 Q -> 栅格：差异像素、最大通道误差、MAE、RMSE
压缩 round-trip：记录数、逐项差异、游标检查
Lua 验证：静态结果、游戏运行结果
备份与 SHA-256：...
```

## 10. 完成标准

满足以下条件后交付：

- 资源 ID 和 API 参数可追溯到本任务读取的系统文件。
- 参考图已经转换为可恢复的像素点阵或等价稀疏表示。
- 像素画已记录原生逻辑网格的推断依据；没有使用无证据的任意降采样尺寸。
- 已报告原图级 `O -> T` 和颜色级 `T -> Q` 误差；没有用相对量化目标的零误差冒充原图保真。
- 用户未指定有损阈值时，正式候选的颜色替换满足默认最大单通道误差 `<= 3`，且关键颜色/区域未消失。
- 规范化控件记录可以独立重绘。
- Lua 在空脚本场景可完整创建，在已有脚本场景可正确接入。
- 控件优化结果满足用户设定的误差上限。
- 压缩数据经过两套解码逻辑 round-trip。
- 未压缩与压缩记录的栅格结果一致。
