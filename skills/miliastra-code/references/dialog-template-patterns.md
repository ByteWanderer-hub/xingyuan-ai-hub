# 对话模版工程：可复用写法与证据边界

适用：对话/黑幕/选项分支/历史记录、模块拆分、控件挂载脚本协作、Tween、复杂变量与多端导航。先选需要的章节，不要求新项目复制整套工程。

## 1. 来源与可关闭的待办

2026-10-18 完整读取关卡 `1073742022` 的 `external_lua_file` 下 51 个 Lua 文件。用户明确确认该开源项目在千星奇域正常运行。本轮只读取源码和当前 API，未启动试玩、未修改源目录。原作者/上游 URL/许可证未随文件提供；不推测署名或授权范围。

源目录：`C:/Users/Administrator/AppData/LocalLow/miHoYo/原神/BeyondLocal/341622797/Beyond_Local_Save_Level/1073742022/external_lua_file`。
逐文件 SHA、bytes、行数与修改清单：本次工作区 `work/skill-dialog-template-study/audit.json`。不同工程不能复制其中模板 ID、变量名、信号名作为平台常量。

证据记录：`evidence_source=provided_unverified`，附 `evidence_origin=user_confirmed_working_project`；API 签名另记 `documented`。原工程可记 `source_runtime_status=user_confirmed_passed`，本轮现场复测为 `not_performed`；迁移后的新脚本仍依实际验证填写 `device_status`。不能把用户确认丢掉，也不能冒充助手亲自试玩通过。

| 原待办或旧限制 | 现在可采用的结论 | 仍需验证的范围 |
|---|---|---|
| 客户端只验过 Level | PlayerSelf 读值有实际业务调用；QuestViewer 使用 PlayerSelf 变化监听并重新查询 | 每个新字段的实体、类型、初始化时机；字典增删事件见边界 #43 |
| 没有复杂变量案例 | QuestService/SceneService 读取玩家嵌套字典；CustomVariable 保留原类型 | 自定义结构的具体 schema；不代表服务器信号支持直接传 table |
| require 路径完全未知 | 同一工程有 `Lib.Timer`、`Lib/Timer`、`default_import_file.` 回退 | 其他工程的导入根、映射、缓存/隔离语义 |
| 跨脚本只能黑板 | 目标控件 `GetScripts()` → 对该 Script `Invoke`，以回调协作 | 未挂载/未就绪/无同名函数；Invoke 不保证业务结果 |
| 所有脚本只能一个入口 | 纯库与多个控件挂载脚本并存，各自拥有生命周期 | 新工程挂载配置与职责归属 |
| Tween/选项导航缺少范例 | 原生 Tween、Sequence、网格、导航、隐藏后恢复焦点均有业务写法 | 新模板显示、帧率、设备切换体验 |
| AvatarSelf 是否已实读 | 文档声明与三个解析库支持其分支 | 目录中没有具体角色变量成功读值证据，保留待验 |
| 运镜完整实现 | 本目录没有镜头控制调用；SceneService 只读 player_pos/player_rot | 服务器节点图/其他资产中的运镜实现未读，不推断不存在 |

## 2. 两类文件与 require

- `Lib/*` 返回模块表，提供通用函数/构造器；配置文件返回路由表。
- Root、Renderer、Style、按钮、页面脚本挂在各自控件上，用顶层公开函数供 `Invoke` 调用，其局部 Runtime 属于该实例。不要用 require 另一挂载脚本来取得它的当前控件状态。
- 原范例 Import 是 `pcall(require, path) and require(path) or require("default_import_file." .. path)`。回退前缀属于项目导入布局，不是平台硬规则。新代码应保存第一次 require 的返回值，避免依赖二次加载；两个路径都失败时报告原路径与两次错误，不用空表伪装成功。
- 路径大小写、`.`/`/`、导入前缀按已配置映射复用，文件先在编辑器沙箱中配置。库可以在顶层建立枚举映射（TweenTimelineLib 如此做）；不要据此承诺所有运行时对象加载时均就绪。需要宿主的依赖在对应生命周期取。

## 3. 脚本通信与职责

`Lib/NodeInvoke.lua` 的核心流程：`node:GetScripts()`，遍历脚本，检查 `targetScript.alive`，`pcall` 调用 `targetScript:Invoke(funcName, ...)`，累计调用数与错误列表。只遍历该节点，不遍历子控件。

`Invoke` 的接收者是取得的目标 Script；文档“当前脚本”指这个实例，并非强制指调用者。调用目标公开函数要在其脚本环境顶层定义。API 没有返回值契约；普通 Lua 模块函数有返回值，二者不能混淆。范例把表与回调作为参数传入，正常完成再回调；调用数只说明未抛错，不能当渲染成功证据。

职责链：服务器信号 → DialogRoot（会话 token、历史、唯一确认发送方）→ TalkDialogRenderer/SelectRenderer（样式路由）→ 挂载 Style（表现、点击、完成回调）。UtilityBar 通过 BindActions 获取行为回调。纯客户端发 ServerSignal 不能假定自动回环到其他客户端脚本。

对话来信参数：`style,talker,subtitle,content,continueDelay,params,autoContinue,token`。选项来信：`style,contents,icons,params,token`。推进信号按顺序添加 `Guid,index,token`；分支从 0 开始，SelectRenderer 将 Lua 选项 index 转为 `index-1`。这是范例协议，迁移时与服务器实际契约核对；客户端不是完整服务端分支执行器。

## 4. 对话生命周期与重入

- 同样式续句使用 `Next_Line`；样式变化使用 `Enter` 并通知旧样式 `OnInterruptDialog`；`NOLOC_Clear` 清显示，`NOLOC_Begin/Done` 由 Root 处理会话状态。
- 正常完成与中断区分：中断清回调、定时器、输入、Tween，不发送正常完成确认；正常完成只执行一次。样式隐藏后保留需要恢复的选项焦点。
- 默认对话首次点击补全打字机，之后才推进；其他样式可有自己的点击语义，不强制所有样式相同。
- 延时提示：负数不显示，0 立即显示，正数延时；范例 Timer.Start(0) 同步执行回调，避免把已完成句柄重新写回。自动推进计时与“文字打完”是独立状态，不擅自合并时间口径。
- 复用 `DialogClickTip.generation` 与选项 `Runtime.session` 的失效令牌：替换/销毁时递增，回调确认本次会话后才能操作控件。
- 可迁移的收尾顺序以 Select 的 ClickOption 为例：取旧回调 → 清旧状态/停输入/杀旧 Tween/使旧 session 失效 → 调旧回调。回调可能同步开始新会话，禁止回调后无条件清空新状态。TalkDialogRenderer 的 OnFinish 在回调后仍写 Runtime，不能因整个范例可运行就复制此重入风险。

## 5. 黑幕、Tween 与透明度

SimpleBlackScreen 读 `hex,fadeIn,keep,fadeOut`，解析 RGB/RGBA，先置透明、杀旧序列；Sequence Append 淡入，在 `fadeIn+keep` Insert 淡出，再 Play。普通属性动画优先用原生 Tween，不必全部逐帧手算；新会话开始与停用/销毁时释放自己持有的句柄。

TweenTimelineLib v8.3 支持 @3–@7 Clip 以及 @8 关键帧；导出数据需匹配库版本。`groupAlpha` 是该库的组合轨道，**不是原生控件字段**：扫描文本/图片颜色并展开为实际颜色 Tween，缓存初始 Alpha、保留 RGB。动态生成新后代后需重新扫描；不能在整体淡到 0 时重新记录“基础 Alpha=0”。同一颜色不能同时由 groupAlpha 与独立颜色轨道写。

关键帧显隐使用 SetVisible；旋转用数据角度差做相对补间，避免 getter 归一化丢失多圈意图。库内明确留下“同一时刻回调/Tween 顺序、0 秒恢复、Restart”待游戏内验证，不能把工程总体可运行当成这些边界已覆盖。

Timer 通过 Tween `localScaleZ` 相对变化承载计时，存在属性副作用与缩放写入冲突；复用时明确独立载体，或采用现有已验证计时机制，不把此写法当无副作用系统时钟。

## 6. 网格选项与多端输入

- 网格项由 RefreshItems 创建/复用；回调 nativeIndex 从 0 开始，Lua 数组用 `nativeIndex+1`。回调可能异步，不能依赖返回后立即拿到完整按钮列表；导航应在条目就绪后配置。
- 鼠标 hover、按下、确认与手柄焦点共用业务选中入口；检查 owner/祖先 alive、activeInHierarchy、visible 后才交互。动画确认期间加锁并记录 session，避免换会话后旧按下动画确认新选项。
- 使用 SetControllerNavigation/GetControllerFocus/SetControllerFocus；隐藏或历史退出后 RefreshFocus 恢复旧选择，无需重建选项。手动方向导航与默认导航不要同时争抢焦点；设备切换需刷新状态。
- 动态条目绑定记录 event+callback，复用/停用时解除自己注册的监听；仅在明确独占该控件全部监听时用 RemoveAll。高亮与内容淡入分开拥有颜色字段，避免 Tween 相互覆盖。

## 7. 富文本、变量与业务服务

RichTextTypewriter 按 UTF-8 字符及标签拆分；保留后续文字但 Alpha=0，减少打字时布局跳变；完整显示后返回原文。Measure 是估算，不是引擎真实排版：CJK≈字号、ASCII≈0.6字号、行高≈1.2字号，不可代替技能 R12 的文本容器高度验收。

LocalizedRichText 先 GetText，再解析 `{1:ps.name}`/`{1:lv.name}`/`{1:as.name}`；文件头 `{1.as.variable}` 是注释笔误，实现统一识别 `{1:`。嵌套路径及变量值递归解析有限额与循环引用检测。I18nText 同时保存原始 key 和上次译文，不能每帧把译文重新当 key。

CustomVariable 的字符串路径先字符串键、再整数键，显式键数组不转换；不缓存业务原值、不把 false 当缺失。Expression 是有长度/深度限制的只读解析器，不使用 load 执行表达式；它定义数字 0 为假、整数除法向零截断，这些是库规则，**不是 Lua 默认语义**。

QuestService/SceneService 在 Load 时读取当次配置、建立索引；重复查询复用同一查询对象，更新后重新 Load。QuestRenderer 在实际出队时组装快照，由样式完成回调释放队列，以 pumping/busy 防同步重入。场景距离函数只读项目 player_pos/player_rot 与区域配置，不构成镜头或原生玩家坐标获取 API。

## 8. 迁移前明确的限制

整体已运行不意味着每个 sample、可选分支和注释都精确，也不意味着符合现有全部风格门禁。保留范例有效架构，新增代码仍按当前 API/错误边界写；不批量整改用户提供的原文件。

UIControlLayout 的默认换算按整个画布计算且不递归父层级；不能覆盖技能中已有父子坐标边界，更不能作为任意嵌套/旋转/拉伸布局的通用证明。ContentSizeFitter 的中文宽度余量 8 来自该工程样本，不推广为所有字体固定常数。界面诊断 DevTools 仅是源工程组件，不改变本技能“不在正式玩法画面塞诊断”的规则。
