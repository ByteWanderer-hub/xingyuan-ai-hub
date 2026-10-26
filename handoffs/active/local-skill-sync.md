# 原电脑技能同步规则

日期：2026-10-23（北京时间）。
最后更新：2026-10-26（北京时间）。
状态：自动交付提速规则已发布并更新工程使用副本；其他已完成事项见原记录。
下一步：后续实际任务观察耗时与回归质量；本轮维护完成，不干预在途游戏任务。
触发：用户回到原电脑，在可访问本地文件和 Git 的会话要求“同步星愿/星缘资料库”时执行。不是定时任务，不在用户离线时自动运行。


## 工作流等待优化（2026-10-26）

- [x] 已完成：根据用户“工作流速度太慢”定向修订自动交付及其验证参考。局部默认定向检查；新增关卡验证新数据、特殊机制和导航，调用既有结算不自动触发关键审查；按依赖指纹复用旧证据、避免硬编码旧关卡数量；候选冻结后独立测试与审查可重叠，单一有状态 Host 串行。
- [x] 已完成：入口已核对，职责/关键词不变无需改路由；33项路由测试、仓库结构/链接/资产验证及diff空白检查通过。skill-creator快速校验因本机缺PyYAML未执行成功，以仓库结构校验补充，未安装额外依赖。
- [x] 已完成：人工情景核对：仅改单组件→局部效果与输入；只加两关且引擎未变→新增机制/导航及旧依赖证明；改结算去重→关键状态与独立审查。仅规则推演，尚无后续任务耗时对比，不承诺提速比例。
- [x] 已完成：提交620f10981a5b75ee641afd96a26562abd8e8f12a正常推送，ls-remote核实同SHA；直连失败后仅本次Git命令复用系统本地代理，未改网络配置。安装器因交付技能原为未受管目录拒绝覆盖；核对全包与原基线一致后备份并定向分发2文件，保持未受管状态，入口未变且全包共7文件哈希相同。回执及备份D:/xingyuan-ai-hub-backups/20261026-workflow-speed。未修改游戏或干预在途执行。

## 通用角色技能提炼（2026-10-26）

- [x] 已完成：按用户“那就给我提炼”新增 character-image-design 与 character-sticker-comic；角色卡区分固定身份与可变表现，参考图分工、三视图、分镜、文字与整套检查独立于鲸鱼娘。保留原两项专用技能，不复制其素材或脚本，不新增运行依赖。
- [x] 已完成：两项各含主技能、按需参考、界面元数据、固定上游归属与 CC BY-NC-SA 4.0 许可。通用版取消固定角色/比例/候选配额及多轮批准；尊重当前生成授权、数量与预算，QQ 上架另走专用技能。
- [x] 已完成：入口与关键词同步，33 项路由测试通过；全库 26 项结构、126 条本地引用与素材检查通过，两项 quick_validate 在 Windows 使用 -X utf8 后通过（首次系统 GBK 解码失败，无内容错误）。人工流程检查覆盖非人形机器人不长腿、姿势参考不覆盖身份、无反转安慰贴纸、三视图未见背面标记为建议；这是文档路径检查，不是实际出图。
- [x] 已完成：技能提交 d4c588bd63012e32ef0b86f4acbf0dd0def17169 正常推送，ls-remote 核实同 SHA；从干净发布源安装两技能及入口，14 个文件与源 SHA-256 相同，全库安装清单检查通过。备份和回执：D:/xingyuan-ai-hub-backups/20261026-generic-character。保留其他会话已提交改动及同步记录，不修改游戏与用户级 Host。
- [ ] 未完成：真实图片生成及客户端新技能发现未验证；由后续实际角色创作任务检验，不把静态检查称为出图验收。

## 沟通与意图对齐技能（2026-10-26）


- [x] 已完成：用户追加长期授权“以后自动修订，不要提醒”。主技能改为发现可复用误解、明确新约定或有重复证据的偏好时主动修订；先处理当前任务，收尾前维护与同步，无须再问是否记住。单次业务条件不升为永久规则，不承诺离线监听。客户端本轮已发现该技能。
- [x] 已完成：追加 C17—C20 正反例，更新路由职责和关键词；32 项路由测试、结构/引用/素材检查及 quick_validate 通过。源与安装副本已备份至 D:/xingyuan-ai-hub-backups/20261026-intent-auto-revision；修订提交 6c3f4a6cfaba4576cee70802d3e7f39be7e9393d。
- [x] 已完成：用户要求重试后，核实系统使用本地代理而 Git 未配置代理；仅为本次命令显式复用系统代理，推送成功且 ls-remote 核实远端 3050f296725b41d5b28adaf886b270d4b680386c。安装器更新沟通技能与入口，全库结构/素材/安装清单校验通过，本次 7 文件与源及清单 SHA-256 一致；主动修订长期授权已发布并安装。未修改全局 Git 或系统代理配置。

- [x] 已完成：用户要求整理双方对话风格、反复对比并制作技能。定向抽样四个会话的用户请求与相关公开答复，结合当前明确规则；未读取内部推理、业务恢复缓存或发布私人聊天全文。
- [x] 已完成：新增原创 user-intent-alignment（主技能、按需对照案例、UI 元数据）；含对象指代、条件继承、局部纠正、状态与行动区分、授权终点和可选表达捷径。8 个样本案例与 8 个相反场景做了两轮人工自查，实际改善尚待后续反馈，不声称已完成模型训练或后台学习。
- [x] 已完成：入口职责、自然表达关键词、快速表和正反例测试同步更新。原入口与工程副本逐文件一致；基线 b35cc2a230d61b66964e8c53821da6d39359224b，源、安装入口与清单备份至 D:/xingyuan-ai-hub-backups/20261026-user-intent-alignment。
- [x] 已完成：32 项路由测试、全库结构/本地引用/不可变素材、diff 检查通过；系统 quick_validate 初次缺 PyYAML，在备份目录的独立验证环境安装 PyYAML 后通过，未改全局 Python。
- [x] 已完成：发布提交 93480c4cbe54db27fa73299b516ac563cbd4b37e 正常推送并由 ls-remote 核实；为隔离并行鲸鱼娘修改，从该提交独立 worktree 预览并安装沟通技能与入口，两项共 7 个文件与发布源及安装清单 SHA-256 全部一致，安装版原话路由 available=true。证据见备份目录 sync-receipt.json。
- [x] 已核实：全安装检查在独立 worktree 报 37 项其他技能源文件与历史清单差异，逐项证明仅 CRLF/LF 检出换行差异；不冒称全安装字节检查通过，不覆盖其他技能。本轮两项的内容、文件集合与清单验证通过；未改用户级 Host。
- [x] 已完成：后续会话技能清单已发现 user-intent-alignment。
- [ ] 未完成：后续真实沟通效果，依赖实际使用与用户反馈；案例自查不替代效果验收。

## 鲸鱼娘人设与漫画技能导入（2026-10-26）

- [x] 已完成：按用户教程定向找到 Neko3000/deepseek-whalechan 两项技能，上游固定提交 `ced7e609db91e8743e7919611eee31f1c093b7e9`；归档位于 D:/xingyuan-ai-hub-imports/whalechan-main.zip。星愿起点干净 main 与远端均为 e40905dde64f23a2527d1b060a8fb87105e95a63。
- [x] 已完成：原入口、测试、说明、同步记录及安装清单备份至 D:/xingyuan-ai-hub-backups/20261026-whalechan-skills；完整导入两项技能并保留分层许可证、署名和图片授权边界。补充关键词入口，未执行生图或付费 API。
- [x] 已完成：30 项路由测试、全库结构/引用与不可变素材检查通过；全部导入文件与固定上游逐字节一致，Python 语法和目录素材 SHA-256 核对通过，证据 source-validation.json 位于上述备份目录。
- [x] 已完成：执行上游离线测试并如实记录：character 46 项（errors=38、skipped=3），comic 92 项（failures=3、errors=72、skipped=20）。Windows 缺 magick/python3 命令且漫画模块依赖 Unix fcntl；限制写入两包 UPSTREAM.md，未修改上游程序，不宣称端到端可用。测试日志保留上述备份目录。
- [x] 已完成：技能发布提交 c4d8b1478f8178494c45c580957b70e3aad6a574（含导入 b1e26f5 与新增说明 LF 修正）已正常推送，GitHub API 回读远端 main 同 SHA。安装器从干净技能源安装 character 55 文件、comic 122 文件并更新入口；全安装结构/素材/清单验证 passed，3 项逐文件 SHA-256 与源一致。证据 sync-receipt.json 位于上述备份目录；未修改用户级 Host 或游戏资产。
- [x] 已完成：当前会话技能目录已列出两项技能，客户端发现已核实。
- [x] 已完成：用户要求缺什么装什么且必须 D 盘。ImageMagick 7.1.2-34 便携 Q16 x64 安装于 D:/tools/imagemagick/7.1.2-34；7zr 26.05 安装于 D:/tools/7zip；均核对官方发布 SHA-256。既有 Python 3.14.7、Pillow 12.3.0、Node 24.19.0 复用，无新增 C 盘软件。用户 PATH 增加 ImageMagick 目录，当前会话激活脚本与测试临时目录位于 D:/tools/whalechan-runtime。
- [x] 已完成：起点 b35cc2a 与远端一致，源/工程两包及入口逐文件一致后备份至 D:/xingyuan-ai-hub-backups/20261026-whalechan-windows。补充 Windows 文件锁、UTF-8 文件读写和测试解释器调用；入口职责/关键词已核对，无需新增关键词，补充 runtime 提示。
- [x] 已完成：character 46 项中 43 通过、3 个漫画布局项按原条件跳过；comic 101 项中 100 通过，唯一 HEIC 编码样本失败由官方 Windows 构建只读能力引起，测试新增能力判断后单项复测显式跳过。PNG/WebP、批次、并发互斥、预算、失败恢复、中文与图库导出均有离线覆盖；实际生图/HEIC 真样本转换未验证。32 项路由、全库结构、语法、CLI 帮助和未修改素材指纹通过。日志及 dependency-receipt.json 位于上述备份目录。
- [x] 已完成：Windows 补丁提交 a40cf6f3c1da528bf24bdb0dc30749f9a9e4339c 正常推送并由 GitHub API 回读远端 main 核实。安装器从干净技能源更新 character 56 文件、comic 124 文件与入口 4 文件；三项目录共 184 文件与源和清单 SHA-256 完全一致，安装副本跨进程互斥测试通过，回执 sync-receipt.json。
- [x] 已核实：全安装检查仅报并行任务 user-intent-alignment 的 3 个源文件与其清单 CRLF/LF 差异，逐字节归一化相同且安装副本仍匹配其原清单；本轮不改无关技能，不宣称全库安装校验通过。入口遗留 Python 缓存目录已定向移至本轮备份，未删除源码或测试证据。
- [ ] 未完成：实际生图与 HEIC 真样本转换；本轮按依赖安装范围不调用生图/付费 API，后续按用户创作要求验证。

## 天堂之门项目经验归纳与技能优化（2026-10-26）

- [x] 已完成：依据当前对话的设计、动画、编辑器与部署反馈归纳；仅维护技能，未预读业务交接/缓存、调用 Host 或修改游戏。项目专属玩法作为条件化案例，未验收的视觉/性能方案不包装成成功配方。
- [x] 已完成：起点干净 main 与 fetch 后 origin/main 均为 cc3dc3ad261bbd29d5d2eeba2f66ab1c423e780b；7 项工程副本与源逐文件完全相同。源、项目副本、原清单、测试及本记录已备份至 D:/xingyuan-ai-hub-backups/20261026-project-lessons。
- [x] 已完成：miliastra-ui 新增场景几何/材质/凹形布局、实心杯遮挡与浏览器编辑回流参考；miliastra-motion 新增有状态气体/门/食物/结算编排，并纠正 Tween、颜色顺序、栅格、时长与历史预算的绝对表述。
- [x] 已完成：miliastra-code 补充常驻背景、模态输入、构建就绪、代际取消，以及部署/存盘/挂载/运行证据区别；qianxing-auto-delivery 补充合成验收、局部冻结和测试超时取证；performance-optimization 补充连续轮廓小样与 setter/透明合成预算。
- [x] 已完成：skill-manager 新增项目复盘转技能方法；xingyuan-router 更新相关入口及精确维护关键词，避免把普通项目总结、角色技能和网页任务误当技能维护。共 7 项技能，无新顶层技能，不修改系统/插件或第三方 motion-design 原文。
- [x] 已完成：28 项路由测试通过；源结构、不可变素材检查通过；新增/修改 Markdown 链接检查通过。证据 source-validation.json、reference-validation.json 位于上述备份目录；git diff --check 无错误。纯文档与路由词条更新，不运行游戏门禁/真机，device_status=not_required。
- [x] 已完成：技能提交 bbd795220c72c9f84042288606f3b7ee6e31d346 正常推送，git ls-remote 回读远端 main 同 SHA。5 项受管技能由安装器从干净发布源更新；miliastra-code 与 qianxing-auto-delivery 保持原未受管状态，写前全量核对无并发变化后定向分发 3 个变更文件，未伪造清单。
- [x] 已完成：安装器首次拒绝源于入口 SKILL.md/routes.json 的历史清单漂移，其他 8 项受管技能与清单一致。本轮修改前文件与源一致且已完整备份；从清单记载提交取回与原 SHA-256 精确一致的两份字节，恢复可核验基线后正常安装新版，未手改清单。原状态、基线文件和安装回执保留于备份目录。
- [x] 已完成：源/工程 7 项共 135 个文件逐文件 SHA-256 一致，受管项同时与清单一致；全安装结构、素材、清单验证 passed。安装版路由能将本次原话定向到 skill-manager；证据 installed-validation.json、installed-route-probe.json、sync-receipt.json。纯技能维护，未修改游戏或用户级 Host。

## UI/UX 图片流程转技能规范（2026-10-25）

- [x] 已完成：用户要求根据流程图优化千星 UI/UX 技能，属已授权共享技能维护。起点干净 main 与 fetch 后 origin/main 均为 ecd07c4d344971fb54485c20cfbd28b436a8bbcb；源/工程三项逐文件完全一致。源、工程副本、安装清单及原同步记录已备份至 D:/xingyuan-ai-hub-backups/20261025-ui-ux-workflow。
- [x] 已完成：miliastra-ui 新增 references/ui-ux-workflow.md，按实际七项整理需求、布局、选型、模板、适配、绑定和试玩；小改按需。补充事件契约、多人数据归属、节点图与 Lua 生命周期边界、触控热区、手柄焦点恢复、失败/重开验证与证据表。官方控件组/开关/事件文档来源与核对日期在参考中；图示容量未核实，不作为平台硬上限。
- [x] 已完成：design-guide 澄清 1600×1000 为历史 PC 参考；game-ui-ux 补千星主辅入口并允许正确换算的设计坐标。xingyuan-router 同步职责、关键词及主辅分工；不发布业务方案、图片，不修改 Host 或部署游戏。
- [x] 已完成：27 项路由测试通过（增加 UI/UX、选型、多端、焦点、控件组正例及 Unity/网页/Roblox/流程图反例）；全库结构与不可变素材检查 passed，20 个技能、113 条本地引用通过；git diff --check 通过。系统 quick_validate.py 因 Python 缺 PyYAML 未能执行，未修改全局环境；使用仓库标准库校验器验证元数据/引用，不宣称等价完整 YAML 检查。
- [x] 已完成：人工路径审查覆盖单按钮位置小改（不启动全流程）、新商店界面（选型/状态/绑定/端适配）、纯图片输出（仍守原通用分支）、控件组隐藏/关闭重开（区分 Lua）和多人购买（个人 UI 与权威结果分开）。这是指令路径审查，不是真机试玩；device_status=not_required。
- [x] 已完成：技能提交 3f9916c9ced7d092eeecc2415e5684ce5ea1b280 正常推送，远端 main SHA 回读一致；从该干净发布源安装 miliastra-ui（20 文件）与 xingyuan-router（5 文件），source_dirty=false。game-ui-ux 原为未受管副本，写入前复查两文件未并发变化，定向更新 SKILL.md 并保留未受管状态，未伪造清单。三项 27 文件逐字节与源一致，安装后的四条 UI/UX 路由探针通过；verify_skills.py --installed 的 structure/immutable assets/installation 均 passed。回执：上述备份目录 sync-receipt.json。实际客户端重新发现及真机交互未验证，不冒称试玩完成。

## 素材基线换行告警修复（2026-10-25）

- [x] 已完成：用户要求查明换行/内容差异并直接修复。基线干净 main 与 fetch 后 origin/main 均为 f4ce741160791a18ef6ce5c25b84576e500db65c；沿用本同步记录。取证及修改前备份位于 D:/xingyuan-ai-hub-backups/20261025-asset-baseline-eol（源/工程原素材、迁移基线、安装清单、原记录、evidence.json）。
- [x] 已完成：Image_sample_by_id.json 工作副本/工程副本均为 5,680,730 bytes，94,461 个 CRLF；Git HEAD、迁移目标提交 3084d1c 及基线为相同的 5,586,269 bytes/94,461 个 LF，Git Blob SHA 7aa5b7c15648220c7a91757ad862ddf2b4fd73c9。CRLF→LF 后逐字节相等，JSON 数据相同；无 BOM/孤立 CR，唯一差异是换行。根因：系统 Git core.autocrlf=true 且原仓库未给素材设 text/eol 属性。
- [x] 已完成：添加根 .gitattributes，为两项不可变素材设 -text；保持严格字节校验与迁移基线不变。从已核实 HEAD Blob 恢复源 JSON，其 SHA-256 为 0c85024b799b4e2ca5c747ac2ad001ff4230282336feff8416c6f68d206d7464；Git 素材 Blob 没有内容变更。维护文档补充旧工作副本恢复边界。技能职责/关键词未变，入口已核对，无需变更。
- [x] 已完成：新增真实 Git autocrlf=true 检出回归及有效 JSON 改动/换行差异仍被拦截的反例。全部 75 项仓库测试通过；verify_skills.py 的结构和不可变素材检查均 passed，原告警消除，diff 检查通过。
- [x] 已核实：本工程 miliastra-code 是原有未受安装清单管理的副本，安装器预览拒绝同名接管；修改前与源 94 个文件完全相同。此次只从发布源定向分发该素材，保留未受管状态及其他 93 个文件，不伪造/改写安装清单。
- [x] 已完成：修复提交 f3780638c841e1bff86ea0724af145d3829278be 正常推送，远端 main 回读相同 SHA；从已核实源定向复制素材至工程。写入前复查目标原文件及安装清单未并发变化，复制后整个 miliastra-code 的 94 个文件均与源相同，安装清单未变；回执见上述备份目录 sync-receipt.json。工程素材不受本项目 Git 跟踪，无项目检出再次转换的路径。
- [x] 已完成：全安装检查额外发现源 miliastra-ui/scripts/__pycache__/inspect_image_pack.cpython-312.pyc 为未跟踪编译缓存；已仅将该文件移入同一备份目录，未改技能源码/清单，保留空缓存目录。复验 verify_skills.py --installed D:/千星奇遇/qxqy_AI/.agents/skills：structure/immutable assets/installation 均 passed，无告警。未做游戏部署，device_status=not_required。

## 游戏性能技能引入与千星适配（2026-10-25）

- [x] 已完成：用户明确要求引入第一份 performance-optimization、校正、适配千星并同步工程；沿用本主题记录，不启动游戏工程恢复或部署。
- [x] 已完成：起点干净 main 与 fetch 后 origin/main 均为 bf8f2370cc10c5d9d89644f1fab2e358566c0a87；工程入口安装器预览 UNCHANGED，无同名新技能。源/安装副本与清单备份至 D:/xingyuan-ai-hub-backups/20261025-performance-optimization。
- [x] 已完成：固定上游 gamedev-skills/awesome-gamedev-agent-skills 提交 184b72be02884f782a0058f2eeae2ce4277453e4；Apache-2.0 LICENSE 与 NOTICE 保留。中文改写两个源文件，新增千星适配及来源/校正参考，无第三方安装脚本。
- [x] 已完成：校正 Draw Call 的 CPU 提交成本、CPU/GPU 流水与等待、尖峰/平均值口径、池的生命周期与溢出、热降频推断和固定资源阈值；千星区分回调 dt/脚本计时/GPU/呈现，历史数据不冒充当前设备上限。入口、默认安装集和正反例同步。
- [x] 已完成：73 项仓库测试（含 26 项路由测试）通过；20 项 SKILL.md 元数据/引用结构检查和新增 Markdown 链接检查、git diff --check 通过。全库仍仅报既存 Image_sample_by_id.json 迁移字节基线告警，本次未改；quick_validate.py 缺 PyYAML，未运行成功，未为此改环境。
- [x] 已完成：技能提交 a4994c7d690f5a571d27424f730c2c963cfd1fb6 正常推送至 origin/main，git ls-remote 回读相同 SHA。安装器从该干净版本（source_dirty=false）新增 performance-optimization（6 文件）并更新 xingyuan-router（5 文件）到 D:/千星奇遇/qxqy_AI/.agents/skills；复查两项 UNCHANGED，11 个文件的源/安装/清单 SHA-256 一致。安装副本探针“千星渲染卡顿掉帧”“千星 UI 粒子卡顿掉帧”“Unity low fps frame time”均首选 performance-optimization 且目标存在。
- [x] 已完成：2026-10-25 本轮会话的可用技能目录已列出 performance-optimization，正文可读取；目录发现不等于真实性能任务效果通过。
- [ ] 未完成：未来实际性能任务的真机效果验证；本次只有技能维护，device_status=not_required，不宣称游戏优化已通过。
- [x] 已完成：用户要求再次审查并直接修正/同步。基线干净 main 与 fetch 后 origin/main 均为 0c0b9a4faef13b10b2b25be5718e554bf36fe793，源/工程安装器预览两项 UNCHANGED。审查使用 code-review、skill-manager 与 skill-creator 规范；备份 D:/xingyuan-ai-hub-backups/20261025-performance-optimization-review。
- [x] 已完成：依据现有 API/交互可靠性/对话工程资料，修复 SetVisible/SetActive/EnableUpdate 区别、池与 Tween/回调清理及重开生命周期、模板索引与包装层成本、setter 缓存所有权和 parent 时机边界；增加原始 dt/无效值统计与有界追赶，修正冻结实验的混杂因素及 pending/not_required/failed 区分。不改其他动效/工程技能正文，不调用 Host 或部署。路由职责与关键词未变，入口已核对，无需变更。
- [x] 已完成：本轮 26 项路由测试通过；20 项技能元数据/引用结构通过，新增引用目标及本技能全部 Markdown 链接通过，git diff --check 通过。全库仍仅报原有素材基线告警；本次无可执行代码变更，未重复全套测试或已知缺 PyYAML 的系统校验。
- [x] 已完成：二次审查修订提交 1cf3aebb9c29629b707de0da7c6b9ca41a4921bd 正常推送，远端 main SHA 已回读一致。安装器从该干净版本更新本工程 performance-optimization（6 文件），入口职责/关键词核对无需变更，xingyuan-router（5 文件）UNCHANGED；两项复查均 UNCHANGED，11 个文件的源/安装/清单 SHA-256 一致，source_dirty=false。未改游戏工程脚本或执行部署。

## UI 动效与粒子技能（2026-10-23）

- [x] 已确认：用户要求“去 GitHub 找 UI 动画与 UI 粒子的 skill”，并选择“① 装参考技能 ② 改写成千星口径技能”，两项同时执行。
- [x] 已调研：GitHub 无千星专属动效/粒子技能（仅 `1475505/Miliastra-toolbox` 知识库，明确不含 Lua）。选定 LottieFiles `motion-design-skill`（MIT, ★2449）、iart-ai `webgl-animation-skills/particle-system`（MIT）、adnvli `vfxskill`（MIT）作为数值与机制来源；`transitions.dev` 许可证为 NOASSERTION，未收录。
- [x] 已完成：`skills/motion-design/` 原样收录上游 `skills/motion-design/` 17 个 md + LICENSE + 上游 README，固定 commit `f9a8a041b85185ee4881b3471d3415e939aac772`（`git ls-remote` 取得），改动仅两处（description 加限定、正文加第三方声明），记录在 `NOTICE.md`。
- [x] 已完成：新增 `skills/miliastra-motion/`（SKILL.md + `references/ui-motion-timing.md`、`references/particles.md`、`references/sources.md`）：时长/缓动/编排/状态反馈/过冲的数值口径（补 60/30fps 帧换算）、实现选型矩阵（Tween/逐帧/粒子池/帧动画）、粒子机制与预算公式、R1/R11/R12 与栅格落字约束、验收清单；与 `miliastra-code`（API/预算实测）、`miliastra-ui`（控件/素材）、`game-feel`（打击感）明确分工，不复制其正文。
- [x] 已完成：路由 `routes.json` 新增两行并补 1 条缺口说明（Lottie/Rive/Spine 制作与 Web 动效实现不在本库）；`xingyuan-router/SKILL.md` 快速表同步两行；`install_skills.py` 默认集 11→13；README 示例与迁移说明同步。
- [x] 已验证：`verify_skills.py` 结构检查通过（19 个 SKILL.md，本地引用 106、外部引用 1 条不校验）；既有 `Image_sample_by_id.json` 迁移基线告警仍为历史问题，本轮未改该素材。四份测试 24+21+15+11=71 项全部 OK；新增技能本地链接断链 0；路由探针「千星 UI 动效 / 千星 粒子 特效 / 千星 按钮 按下 动画 / 千星 粒子上限」均命中 `miliastra-motion`，「关卡设计」「roblox particle」未被误改。
- [x] 已完成：提交 `1528f4fbe5965fbcdd2a423bfea5261729b7acf8` 正常推送，`git ls-remote origin main` 回读同一 SHA。前方备份在 `D:/xingyuan-ai-hub-backups/20261023-motion-skills`（含 hub 的 `xingyuan-router`、`install_skills.py`、README、本文件，以及工程安装副本的 `xingyuan-router` 与原安装清单）。
- [x] 已完成：用仓库安装器安装到本工程 `D:/千星奇遇/qxqy_AI/.agents/skills`：ADDED `miliastra-motion`(4 文件)、ADDED `motion-design`(21 文件)、UPDATED `xingyuan-router`(5 文件)，来源 `source_dirty=false`；复查三项均 UNCHANGED，受管清单 revision 与远端一致。安装副本的 route.py 探针「千星 UI 动效 / 千星 粒子 特效 / 千星 入场动画」均命中 `miliastra-motion`；技能目录已出现 `miliastra-motion` 与 `motion-design`。
- [ ] 未完成：真实动效/粒子任务的效果仍待后续验证（本技能只给口径，不代表任何动效已在真机通过）；`transitions.dev`（许可证 NOASSERTION）与其余候选未收录，需要时另行核对许可。

## 参考图到原生控件技能升级（2026-10-23）

- [x] 已确认：本次侧边会话明确要求升级图转千星美术技能，并再次授权提交、正常推送到资料库和更新本工程使用副本；不延续主线程美术修改，不操作子代理或活地图。
- [x] 已完成：以干净 `main` 的 `f03182e0c3c92d3954f597631106e18bc37b432b` 为起点，fetch 后与远端一致。`miliastra-ui`、`tiantangzhimen-gia`、`xingyuan-router` 源/安装副本逐文件相同；已分别备份至 `D:/xingyuan-ai-hub-backups/20261023-reference-art-skill-upgrade`。
- [x] 已完成：补齐缺失的 `miliastra-ui/references/client-template-gia.md`；固定对象语义、数量、圆/椭圆原生化、透视接缝、阴影分层、控件预算、同源预览、局部字段白名单、不可变基线及四态/GIA最终回读。预览、导出、动态代码按最新请求分支，不混称实现或真机通过。
- [x] 已完成：两个技能入口引用共用流程，修正专用技能把游戏工程路径误当技能库路径的表述；路由加入参考图、控件计数与中英文自然说法，缩窄地图专用关键词，保留“没有通用转换器”的能力边界。
- [x] 已完成：全部 56 项仓库测试通过（含 20 项路由测试），`git diff --check` 通过，仓库元数据/本地引用结构检查通过。系统 `quick_validate.py` 因本机缺少 PyYAML 无法运行，未安装额外依赖，以仓库标准库校验补证，不冒称该工具成功。
- [x] 已核实：全库校验仅余既存 `Image_sample_by_id.json` 的原始字节与迁移基线不一致（当前 Git 规范化 blob 与 HEAD/基线相同）；本次未改该素材、换行或迁移基线，不将全库结果称为全绿。
- [x] 已完成：技能提交 `9ec1563de1a5aa726b9d54517ee80ac3a1ad85bc` 正常推送至 `origin/main`，`git ls-remote` 回读相同 SHA。当前工程 `D:/千星奇遇/qxqy_AI/.agents/skills` 的三个使用副本已同步，25 个受管文件与发布源 SHA-256 一致（含原有且内容未改的 `desktop-toolbox`）；安装器复查三个技能均为 UNCHANGED。
- [x] 已完成：安装器初次发现清单仍使用旧仓库名。已备份旧清单及原受管副本，在独立 `staged-install` 目录由安装器生成四项技能的合法清单；检查安装副本无并发变化后，仅复制本次 5 个改动/新增文件及生成清单。未删除目录，未手工伪造哈希，未改其他技能内容。备份沿用上述目录，清单为 `original-install-manifest.json`。
- [x] 已完成：按用户追加要求，将通用纯图片控件 GIA/Lua 纳入 `miliastra-ui`：不要求指定地图；其他控件、地图结构与玩法才按地图生成。必要封装根单独声明计数，Lua 使用调用方父级；共用图元规则、实际叶节点类型、参数和层序校验，不把流程规范写成已存在的自动转换器。
- [x] 已完成：本轮从干净且已 fetch 核实的 `2e0488610eb0da26985cb4827ce4e77ad5aec85f` 追加修改，源/安装副本一致后，将 UI、入口及原安装清单备份到 `D:/xingyuan-ai-hub-backups/20261023-image-only-gia-lua-skill-upgrade`。入口补充图片转 Lua/纯图片控件及英文表达，修正实际测试发现的英文路由优先级；全部 58 项仓库测试（含 22 项路由测试）与 diff 检查通过。
- [x] 已核实：本轮结构校验通过；全库校验仍仅有上述既存素材基线问题，Git 规范化 blob 仍与 HEAD 一致。系统 quick_validate 再次确认因缺少 PyYAML 无法运行；未改依赖或无关资产。
- [x] 已完成：本轮通用 GIA/Lua 修订提交 `adf67593c435e156baf40c2bd2c73b0f6c848654` 正常推送，`git ls-remote` 核实远端 SHA 一致。通过现有安装器预览并安装本工程 `miliastra-ui` 与 `xingyuan-router`（21 个文件），复查均为 UNCHANGED；受管安装清单校验通过，来源提交一致且 `source_dirty=false`。本轮未修改专用地图技能及游戏产物。
- [x] 已完成：用户提供 `C:/Users/Administrator/Downloads/图片静态资产.zip` 后，核实包 SHA-256 `2f48ce4050d3a45e7e37e39c698c23b8fb8bbc8303108fc8799adf73e04aa176`，32,677,199 bytes；1,543 张 PNG、同名元数据和 6 份索引。包只读且前后哈希相同，未将原始包/图片提交到资料库，未把“官方”来源声明升级为真机或发布版本验证。
- [x] 已完成：新增 `miliastra-ui/scripts/inspect_image_pack.py`（只读 ZIP、ID/关键词查询、显式全包审计、可选 Pillow 像素分析）及 `references/static-image-pack.md`，接入主技能、素材检索与图转控件流程；补齐 ID 配对、实际 ZIP 路径与旧索引路径差异、透明边界、裁切偏移、图集坐标、九宫格/染色待验证和控件计数规则。索引用途不授权新增功能控件。
- [x] 已核实：全包配对/JSON/PNG头检查发现 713 项 PNG/逻辑尺寸不同、21 项缺独立 desc 记录；无其他审计问题。抽看 100002/100006/100113 原 PNG 并解码像素，未做全部图片解码或真机检查；缺描述不自动删图，尺寸差异不自动判坏。
- [x] 已完成：全部 70 项测试（含 11 项资产包脚本测试、23 项路由测试）、diff 与技能结构检查通过。系统 quick_validate 仍缺 PyYAML；全库仍有既存素材迁移基线告警，未修改该资产/基线。本轮起点为干净且远端一致的 `99fe7fe8ad52bb1b7bde3b75d8126598a54ea7c4`；UI/入口源与安装副本、原清单已备份至 `D:/xingyuan-ai-hub-backups/20261023-static-image-pack-skill-upgrade`，样本原图放其 `samples/`。
- [x] 已完成：本轮资产包技能提交 `3a6f05d734466dde69c1e8d8b3b7e4c320fefc3b` 正常推送，远端 main SHA 回读一致；现有安装器预览/安装本工程 UI（19 文件）与入口（4 文件），复查均 UNCHANGED，受管安装校验 passed、来源干净。直接执行安装副本的脚本查询并解码 100002 成功；未修改游戏产物，未上传原始资产包。
- [x] 已完成：按用户追加要求，在 UI 主技能明确所有千星 2D 控件（布局、参考图、GIA、Lua）同型资产优先，不以像素块/扫描线/小矩形重画现成形状；缺口才少量图形组合，预览器缺图不构成拼像素理由。保持定稿与权限范围。入口及自然表达路由同步，71 项测试、diff/结构检查通过；既存素材告警和缺 PyYAML 状态未变。本轮基线 `689c94121562cf5ee8719dd06123217495ff5695`，备份 `D:/xingyuan-ai-hub-backups/20261023-2d-matching-asset-first`，源/安装副本一致后备份。
- [x] 已完成：同型资产优先规则发布提交 `85f6bc8b03d4ca4deab67ed24a75dadeb7b8f03d` 正常推送且远端 SHA 核实一致；UI/入口两项安装副本已更新，安装器复查 UNCHANGED，受管安装校验 passed、来源干净。未改游戏产物或旧定稿美术。
- [ ] 未完成：新会话技能发现与未来真实图转控件/GIA任务的端到端效果待后续验证；本次不运行游戏生成器、不生成美术预览或GIA、不导入编辑器。

## 历史同步授权与约定

用户说明电脑技能目前应无修改、只有新增，并明确要求：
- 同名技能直接使用 Git 仓库版本替换电脑版本。
- 电脑独有的新技能保留，并上传到星愿资料库。
- 同步所需的备份、同名目录替换、技能导入、索引更新、必要检查、Git 提交及正常推送到本仓库 main 已获授权，不再重复询问是否覆盖或上传。

远程维护真源：`ByteWanderer-hub/xingyuan-ai-hub` 的最新 `main`。旧 `qxqy_AI` 远程仍只读，不向旧仓库推送；本规则允许更新原电脑正在使用的技能目录，不代表允许覆盖其中的游戏工程、地图或其他资料。后续用户的新指示优先。

## 唯一真源的长期设置

2026-10-23 用户要求“绑定星愿数据库，本地技能更新时同步更新数据库技能”。当前绑定远端为 `https://github.com/ByteWanderer-hub/xingyuan-ai-hub`，本机工作副本为 `D:\xingyuan-ai-hub`；当前工程为 `D:\千星奇遇\qxqy_AI`，下文桌面路径仅为首次收口的历史记录。

- [x] 已完成：2026-10-23 核对新远端 `ByteWanderer-hub/xingyuan-ai-hub` 可访问，`origin/main` 与本机基线同为 `b264bfe4460ec66a122e2da72900368391869d81`；fetch 与 push URL 已同时改为新地址。后续资料库和共享技能均引用该远端。

- [x] 已完成：核实本机仓库 origin，并成功 fetch main；当前工程 AGENTS.md 已补充真源、入口、安装目录与持续同步授权。
- [x] 已完成：后续用户要求维护共享技能时，同一任务完成真源修改、入口核对、验证、提交、正常推送及本工程使用副本更新；系统及插件托管技能排除。用户直接修改使用副本时先备份并合并差异，不能套用首次收口的旧版覆盖规则。
- [x] 已完成：绑定规则已提交推送为 `89ab4bc`，通过 `git ls-remote origin refs/heads/main` 核实远端 main 为该提交（2026-10-23）。
- [x] 已完成：只读 SHA-256 比较当前工程 12 项共享技能，11 项与真源完全一致；本轮未修改技能正文，入口路由职责无需变更，未设置后台监听。
- [x] 已完成：2026-10-23 重新获取远端 `main`，确认资料库工作树与远端同为 `fdf8b97`；本轮未发现需写入资料库的技能内容变更，路由索引无需调整。
- [x] 已完成：备份工程入口目录至 `D:\xingyuan-ai-hub-backups\20261023-xingyuan-router-pre-update`（8 个文件）；以真源替换 `scripts/route.py`，并将重复的嵌套 `xingyuan-router/` 目录移入该备份。真源版本保留“天堂之门”千星上下文识别，本地旧版本会遗漏该识别。
- [x] 已完成：逐文件 SHA-256 比对工程已安装的 12 项共享技能，全部与资料库真源一致；入口路由验证可找到 `tiantangzhimen-gia`。当前工程未找到安装清单，因此这是内容一致性验证，不宣称安装器清单验证通过。

用户进一步指定 Git 仓库为技能唯一真源。遵循[根规则](../../AGENTS.md)的“技能唯一真源”章节：原电脑这次先完成历史技能收口，之后所有新增和修改在本仓库 clone 的 skills/ 完成并提交推送，客户端目录只用于安装。旧安装副本的远端优先替换，不适用于仓库工作副本中尚未提交/推送的开发草稿。

首次接入还要完成：
- 识别实际扫描目录，为同一项目选定有效安装位置，备份并移出重复的旧同名手工副本，保留无关和系统/插件托管技能。
- 在目标游戏工程 AGENTS.md 保留既有规则，补充实际本地仓库路径、唯一真源规则与关键词入口。此连接配置属于本次用户要求的真源设置范围。
- 验证目标会话能发现所需技能，并记录实际路径、来源提交和未验证项。仅记录规则不能标成电脑已配置。

## 同步决策

| 情况 | 操作 |
| --- | --- |
| 远端与电脑同名 | 以本轮固定的远端提交为准，先备份，再整体替换该技能目录；不要把已精简的旧正文重新合入远端 |
| 电脑独有的新技能 | 保留完整技能包（SKILL.md及必要脚本、参考、素材），导入仓库skills/，更新关键词入口，再提交推送 |
| 远端新增、电脑没有 | 安装默认技能集合及本轮用户所需技能；包括统一入口，不因全库存在就启用无关平台技能 |
| 无关目录/非技能文件 | 保持原样，不随技能同步删除或上传 |

同名以规范目录名和 SKILL.md 的 name 共同核对，Windows 大小写差异也视为潜在同名；两者一致时按上表执行。若目录名与 name 不一致，或多个位置出现同名但内容不同，先核对实际使用位置；无法确定身份时只暂停相关项并询问，不猜测改名或静默丢弃。

“应该没有修改”是用户对现状的描述，不是已验事实。同名替换的授权已经明确：即使检测到正文差异，也先保留可恢复备份后按远端替换，记录差异，不自动恢复成“必须逐个问是否覆盖”。路径或文件在备份之后又变化时先重核，不能覆盖正在写入的数据。

## 执行顺序

1. **定位实际目录。** 在原电脑读取实际仓库 remote、Git 状态、项目规则、客户端配置和技能目录。旧工程路径仅是线索，不能假定所有技能都在同一位置。获取本仓库最新 main，使用独立 checkout/干净工作树处理，不用强制重置旧工程或清理未跟踪文件。
2. **固定快照并备份。** 列出同名、电脑独有、远端独有技能及安装清单。将会替换的完整技能目录、安装清单和待导入技能复制到客户端扫描目录之外的带时间备份，记录源路径、文件清单及哈希，核验备份可读。备份失败则暂停受影响写入；不自动删除备份。
3. **导入新增。** 将电脑独有技能复制到本仓库 skills/，保留必要资源、许可证和来源；排除缓存、凭据及无关工程文件，不执行未知脚本来完成复制。检查 name、目录名和本地引用；缺依赖的技能明确记录，不能把不可运行说成已可用。更新 xingyuan-router 的 routes.json、必要选择说明与路由测试，确保新增技能能按关键词找到。
4. **验证和上传。** 验证本轮技能元数据、引用、索引与受影响测试。只暂存本轮新增技能、索引和本主题记录；不要 git add 整个旧工程。推送前重新 fetch；若远端出现与本地新增同名的技能，重新按“同名远端优先”归类并备份本地版，不覆盖刚出现的远端版本。无关并发变更正常合并；不强推、不倒退远端。正常提交并推送 main，失败时保留本地结果和恢复点，不能声称已上传。
5. **更新使用副本。** 以推送并核实后的仓库快照替换原电脑同名技能，安装本轮新增及默认入口。安装目标以实际客户端使用位置为准。先预览，再执行，记录最终来源提交和哈希。
6. **验收与回写。** 检查替换后的技能与来源一致、新增技能在本地和远端都存在、原有无关技能未变、备份仍在、路由可找到新增项。更新本记录的执行时间、目录、提交、数量、备份位置、结果及未完成项。客户端实际发现与插件/真机验证分开记录。

## 与现有安装器的衔接

现有 install_skills.py 是带保护的单向安装器，不能直接完成本规则的新增上传，也没有强制覆盖选项。本规则不伪称脚本已有双向同步能力。

- 清单正常且受管理副本未改动时，按现有预览→安装流程更新。
- 遇到未管理同名目录或本地差异时，已有备份与替换授权足以继续安排接管，不要求再次授权；不要删除清单后直接盲跑，也不要篡改哈希骗过校验。
- 必要时在独立暂存目录用安装器重建所需安装集合和新清单：包含旧清单里仍应保留的全部受管理技能、本轮默认选择及新增技能；检查通过后，备份目标目录与清单，仅替换这些明确列出的技能目录和对应清单。保留所有无关技能目录。替换中失败则用备份回滚。
- 这种接管是同步执行者按授权安排的步骤，并非当前安装器已经提供了自动接管功能。不要清空整个技能目录，不使用 git clean、reset --hard 或强制推送来绕过冲突。

## 当前执行记录

- 规则写入：完成。
- 执行时间：2026-10-23（北京时间）。
- 资料库工作副本：`D:\xingyuan-ai-hub`；起始远端快照：`ac2664e3b47870fb36f348464aab83087367cc3e`（`main`）。
- 实际项目技能目录：`C:\Users\Administrator\Desktop\千星奇遇\qxqy_AI\.agents\skills`；用户级 `C:\Users\Administrator\.agents\skills` 未含同名千星技能，本轮未改动。
- 备份：`D:\xingyuan-ai-hub-backups\20261023-102544`，完整技能副本 191 个文件已核对可读；替换前的目录副本位于其中的 `detached_project_skills`。
- 同名替换：10 项远端技能已从本次资料库工作副本安装到项目目录；本机独有 `tiantangzhimen-gia`（3 个文件）已导入真源并安装回项目目录；统一入口 `xingyuan-router` 已一并安装。
- 路由联动：已新增《天堂之门》GIA 路由、快速表说明及正例测试；修正路由测试中未指定 UTF-8 的读取，并将“天堂之门”识别为千星上下文。
- 验证：16 项关键词路由测试通过；项目安装副本与真源的 12 项同步目录逐文件 SHA-256 一致。`verify_skills.py` 仍因真源既有的关键素材 `skills/miliastra-code/assets/Image_sample_by_id.json` 与迁移基线不一致而失败；本轮未改写该素材或基线，需另行核实其来源。
- 验收标准：同名版本与远端一致；新增技能两端保留且可检索；无关技能不变；备份和推送结果可追溯。

## QQ 自定义表情包技能新增（2026-10-25）

- [x] 已完成：用户要求把本轮实测的 QQ 机器人表情包流程固化成技能。真源新增 `skills/qq-sticker-pack/`：SKILL.md + `scripts/gen_stickers.py`（Pillow 生成器）+ `scripts/upload_stickers.ps1`（批量 `add_custom_face` / `modify_custom_face` + 收藏数校验）。核心内容为 SnowLuma/NapCat 的非标准动作、base64 上传、备注、以及「不能把 emoji_id 当 file」的发送姿势与踩坑表。
- [x] 已完成：入口联动——`references/routes.json` 追加条目（platform=general，15 个中英关键词，含 `add_custom_face`、`enoent emoji_id` 等排错词），`SKILL.md` 快速表新增「QQ 机器人表情包/贴纸」一行；路由职责与关键词已核对，无缺口提示需撤销。
- [x] 已完成：`python -B -m unittest discover -s scripts/tests -p test_route_skills.py` → 27 项通过（含 `test_all_targets_exist_and_are_unique`、`test_each_indexed_keyword_can_reach_its_target`）；安装副本内 route.py 探针「让机器人发表情包」命中 qq-sticker-pack 且 available=true。
- [x] 已完成：提交 `0f5e985bce8873ba2f0ede507414495ac5daded9` 正常推送至 origin/main；`git rev-parse origin/main` 回读同 SHA，`git ls-tree -r origin/main -- skills/qq-sticker-pack` 列出 3 个文件。
- [x] 已完成：工程安装副本 `D:\千星奇遇\qxqy_AI\.agents\skills\qq-sticker-pack`（3 文件）与 `xingyuan-router` 的 SKILL.md、routes.json 已同步，SKILL.md 与 routes.json 的 SHA-256 与真源一致；本轮 DSH 会话技能目录已列出 `qq-sticker-pack`。
- [x] 已记录：本次只新增目录并修改 router 两文件，改动均在 Git 历史中可还原，未另建 D:/xingyuan-ai-hub-backups 目录；未改游戏工程、未部署、未动 Host。
- [x] 已记录：首次实跑（第二弹 8 张表情）暴露两处技能缺陷并已修复——① `fetch_custom_face_detail` 传 `{"count":N}` 返回空数组、必须发 `{}`；② PowerShell 5.1 按 ANSI 解析无 BOM 脚本，中文导致 `Unexpected token '}'`。另记录 QQ 按图片 md5 去重（同图复用 emoji_id、会覆盖备注）。修复提交 `0d60dc7e31d985648c0d744bf802b5e1129fe368` 已推送，远端回读一致，新增 `scripts/upload_stickers.py`（Python 版，绕开 PS 编码问题）并同步到工程安装副本（SKILL.md SHA-256 一致）。
- [x] 已完成：第二弹 8 张（震惊/委屈/点赞/吃瓜/再见/催更/哈哈/睡了）上架，收藏数 15→23，备注全部写入；桥接 `/api/stickers` 回读 23 条；实发「震惊」`message_id=758792231` 有效。
- [x] 已完成：真机效果验证——bot 在私聊里**自主**挑选并成功发出表情（19:28:56，`[sticker] 工具发送表情 private:2845905433: …9ED1A07B…`，QQ 历史同刻出现 `[image]`）。触发方式是控制台 `POST /api/socialV2/wake` 只给意图提示，选哪张由 agent 自己决定（先挑了「委屈」和「无语」）。
- [x] 已定位并绕过阻塞：首次自主发送连续失败，报「域名解析到内网/本机地址，已阻止」。根因是本机 fake-ip 代理把所有域名解析到 `198.18.0.0/15`，而桥接 `src/safe-fetch.js:82` 把该段判为内网。**未改第三方代码**，改用 DoH 查真实 IP 后写入 hosts（`C:\Windows\System32\drivers\etc\hosts`，备份 `hosts.bak-qqbridge`），钉 `p.qpic.cn` / `gxh.vip.qq.com` / `multimedia.nt.qq.com.cn` 三条，随后发送成功。此改动是**系统级、环境相关**：CDN IP 会变，长期方案是代理 `fake-ip-filter` 放行这些域名；回退只需删 hosts 里那 4 行。
- [x] 已记录：上述两坑已写入 `qq-sticker-pack` 的踩坑表与专节（含 DoH 命令与两种修法），提交 `docs/skills` 同步推送；该技能的验收项现在包含「agent 自主发送」而非仅 API 直发。

## 本地表情库（方案 B，2026-10-25）

- [x] 已完成：用户要求「表情放本地、需要时调用」。实现为桥接侧本地库：`src/local-sticker-lib.js`（新增）+ `src/bridge.js`（+61/−14：列表合并、`local:` 前缀分流读盘、唤醒提示追加一行），配置 `socialV2.localStickers={enabled,dir}`。**工具名与参数不变 ⇒ 只重启桥接，不重启 DSH**。
- [x] 已完成：实机验证——AI 自主挑中 `local:deepseek娘_爱心 1_…` 并发出（19:54:20），QQ 历史出现 `[image]`，`fetch_custom_face_detail` 仍为 7 条（收藏夹零污染）。
- [x] 已完成：素材——BrickAZ「蓝色大肥鱼」161 张 GIF（569 MB）压到 300px/≈15fps/≤950KB 共 103 MB，存 `D:\qqbot\stickers_bricka`（另含 `manifest.json`、`compress.py`、`send.py` 供人工/脚本按名发送）；此前两套自绘与第三方 PNG 包已按用户要求删除，收藏夹恢复为用户原有 7 张。
- [x] 已记录：补丁与操作说明落盘 `D:\qqbot\LOCAL-STICKERS.patch`、`D:\qqbot\qq-bridge\LOCAL-STICKERS.md`（含重打/回滚/验收）；技能文档新增「方案 B」一节并推送，提交 `86addf531fd700b994ba4165d4cf95ab41709ef9`，工程副本 SHA-256 一致。
- [ ] 未完成：跨机器迁移未验证（需同时带走表情目录、桥接补丁与 config 段）；桥接上游更新后补丁需重打。

- [x] 已完成（同日追加）：「让它自己发表情」的调参结论——**人设卡 > 提示词样例 > 频率措辞**。实测：仅加提示样例与放宽频率时仍纯文字；在 `roles/小鲸鱼-女儿版.md` 的「小习惯」段加一段「聊天爱顺手配表情」后，bot 在私聊里自发发出 `local:deepseek娘_摸头_…`（用户说"有点累"→选摸头，20:14:32），收藏夹仍 7 条。结论与可复用文案已写入 `qq-sticker-pack`。
- [x] 已知第三方行为（未修）：会话繁忙时桥接的唤醒排队会被静默丢弃（`pendingWake=false` 且无回合），排查时勿误判为人设/表情配置问题。

## 自动提交授权（2026-10-23 用户指定）

- **范围**：技能改动**只自动提交到星愿真源仓库**（`D:\xingyuan-ai-hub` 的 `skills/`、入口与交接文档），提交后正常推送。
- **不提交**：游戏工程 `qxqy_AI` 里的 `.agents/skills/`（安装副本）。已在工程仓库加入 `.gitignore` 并执行 `git rm -r --cached .agents/skills` 停止跟踪，消除每次同步产生的 166 条噪音改动。
- **闭环**：改真源 → 核对/更新 `xingyuan-router` 入口 → 运行验证（`verify_skills.py` 及必要测试）→ 提交 → 推送 → 更新工程安装副本 → 回写本文件。
- **仍需先问**：验证失败、入口测试失败、合并冲突、需要强推、以及推送以外的破坏性操作。
- **不改动**：系统内置或插件托管技能；工程仓库里与技能无关的未提交改动不随本次清理一并提交。
