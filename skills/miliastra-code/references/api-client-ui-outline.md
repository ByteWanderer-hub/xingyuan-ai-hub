# 客户端控件API文档

本文档介绍客户端 Lua UI 脚本公共 API，包括接口签名、类型、字段、函数、方法和枚举。

# 一、术语约定

本部分为API专有名词的中英文对照约定，不代表实际接口和字段名称。

# 二、API 范围

本页覆盖：脚本生命周期、全局函数、颜色、Script、game、服务器信号、补间动画、输入事件、手柄导航、全部客户端控件类型及枚举。

# 三、运行环境

Lua 版本

运行时使用 **Lua 5\.3**

以下标准库能力不可用：

`string.dump`

`io.*`

除 `os.time`、`os.date`、`os.clock`、`os.difftime` 外的 `os.*`

除 `debug.traceback` 外的 `debug.*`

以下为标准库补充的方法：

`math.isnan(n)`和`math.isinf(n)`的math

# 四、具体介绍

## 1\.脚本生命周期

运行时按固定名称查找并调用下列生命周期回调函数。

## 2\.逐帧控制

## 3\.全局API

### \(1\)类型查询

### \(2\)日志和调试

### \(3\)数值检查

处理摇杆、坐标或补间动画补间动画参数等外部数值时，可用这两个函数进行有限数校验。

### \(4\)全局变量

## 4\.Color

### \(1\)构造函数

### \(2\)函数

## 5\.Script

表示脚本实例。运行时通过全局变量 `script` 提供当前脚本实例。

### \(1\)字段

### \(2\)方法

## 6\.game

`game` 是客户端运行时提供的全局表。以下函数均使用点号调用。

### \(1\)UI 与层级

### \(2\)输入与聚焦

读取摇杆轴值后，可按交互需求应用有限数检查、死区、范围钳制与坐标系转换。

### \(3\)补间动画、服务器信号与自定义变量

### \(4\)关卡、音效与本地化

## 7\.Tween

补间动画类，用于对目标对象的 Tweenable字段进行插值。

### \(1\)创建

### \(2\)方法

## 8\.TweenSequence

将多个补间动画补间动画、间隔和回调编排到同一时间线上。

### \(1\)创建

### \(2\)方法

## 9\.ServerSignal

创建并向服务器发送信号。参数按服务器约定依次添加。

### \(1\)创建

### \(2\)方法

## 10\.EnumItem

### \(1\)字段

## 11\.枚举系统

### \(1\)Enum\.EaseType

### \(2\)Enum\.CustomVariableEntityType

### \(3\)Enum\.Device

### \(4\)Enum\.StageMode

### \(5\)Enum\.LanguageType

### \(6\)Enum\.ParamType

### \(7\)Enum\.CursorEventType

### \(8\)Enum\.ScrollDirection

### \(9\)Enum\.ScrollLayoutConstraint

### \(10\)Enum\.ScrollAlignType

### \(11\)Enum\.ControllerNavigationDir

### \(12\)Enum\.ControllerNavigationEventType

### \(13\)Enum\.ControllerNavigationMode

### \(14\)Enum\.TextHorizontalAlignment

### \(15\)Enum\.TextVerticalAlignment

### \(16\)Enum\.ImageType

### \(17\)Enum\.ImageSource

### \(18\)Enum\.ImageFillType

### \(19\)Enum\.ImageFillHorizontalType

### \(20\)Enum\.ImageFillVerticalType

### \(21\)Enum\.ImageFillRadial90Type

### \(22\)Enum\.ImageFillRadialType

### \(23\)Enum\.ImageMaskSoftEdgeMode

### \(24\)Enum\.UIAnimationLayer

## 12\.客户端控件

### \(1\)继承关系

所有具体控件都继承 `ClientUIBaseControl`：

## 13\.ClientUIBaseControl

客户端控件基类，提供层级、布局、脚本访问、输入监听与手柄导航。

### \(1\)字段

### \(2\)层级与可见性

复用列表生成的列表项不保证同级排序结果稳定。

### \(3\)布局与变换

父子层级中的位移、缩放、可见性、Alpha、镜像与裁剪效果由运行时 UI 层级共同决定；使用组合布局时应验证实际显示结果。

### \(4\)脚本访问

返回的脚本实例可能因销毁而不再存活，使用前检查 `script.alive`。

### \(5\)键鼠/手柄按键事件

### \(6\)手柄导航事件

### \(7\)手柄导航配置

## 14\.ClientUIImageControl

图片控件，用于显示图片并控制颜色、遮罩与填充效果。

### \(1\)字段

### \(2\)方法

## 15\.ClientUITextBoxControl

文本框控件，用于显示普通文本。

### \(1\)字段

## 16\.ClientUITextWindowControl

文本视窗控件，用于显示可滚动的文本。

### \(1\)字段

## 17\.ClientUIPresetButtonControl

预设按钮控件，提供按钮交互与光标事件监听。

### \(1\)字段

### \(2\)方法

## 18\.ClientUICursorEventAreaControl

光标检测区域控件，检测该控件区域内的光标事件。

### \(1\)字段

### \(2\)方法

## 19\.CursorEventData

### \(1\)字段

### \(2\)方法

## 20\.ClientUIGridScrollerControl

网格视窗控件，用于显示和滚动复用列表项。

### \(1\)字段

### \(2\)方法

列表项索引以运行时传入和返回的 `index` 为准。

## 21\.ClientUIKeyHintControl

按键提示控件，根据当前输入设备显示对应按键。

### \(1\)字段

## 22\.ClientUIAnimationControl

界面动效控件，用于播放或停止已配置的动效。

### \(1\)字段

### \(2\)方法

## 23\.ClientUIFullscreenAnimationControl

全屏动效控件，用于显示覆盖界面的已配置动效。

### \(1\)字段

## 24\.ClientUIContainerControl

容器节点控件，用于组织子控件。

### \(1\)字段

## 25\.ClientUIReferenceControl

模板引用控件，用于引用已配置的控件模板。

### \(1\)字段

## 26\.按键输入

### \(1\)Enum\.KeyboardKeyCode

### \(2\)Enum\.ControllerKeyCode

### \(3\)Enum\.KeyEventType



