# 七项工具接入与本地安装
日期：2026-10-23（北京时间）
状态：用户已选择七项；官方来源与接入方案已整理。尚未在用户电脑安装、启动或验证。
来源：本轮用户在推荐 MarkItDown、Superpowers、LocalSend、Open-LLM-VTuber、Aseprite 后明确表示“我想都要”。
后续选择：用户要求安装本轮另外两项重点推荐 rembg 和 Ink／Inky；Repomix 未选择，LosslessCut 和 Flow Launcher 仍为候选。
执行时间：用户已要求等回到电脑一起完成，当前只更新交接，不在云端安装。
本记录用于下一次可访问电脑的会话继续执行，不是后台任务。

## 范围与真源
- 七项均纳入接入范围；先检查已安装版本，避免重复安装。正常免费安装、隔离环境、配置备份及验证属于接入工作；不据此购买软件或启用付费 API。
- 星愿仓库保存共享技能、适配说明、来源及验证记录；应用程序、第三方源码、模型权重、虚拟环境放电脑独立工具目录，不提交本仓库。
- 用户已确认 REA 安装在电脑：只检查调用状态，不能因本仓库没有 rea 目录就重复安装。
- miliastra-ugc 是部分现有技能的上游，后续按差异更新，不整套重复导入。
- 新增/修改共享技能时同步维护 xingyuan-router，验证后正常推送。仅安装桌面应用不应伪装为技能安装。

## 接入与验收表
| 项目 | 官方来源与方法 | 最小验收 | 当前状态 |
| --- | --- | --- | --- |
| MarkItDown | https://github.com/microsoft/markitdown ；独立 Python 虚拟环境，按官方 README 安装 markitdown[all] 或必要格式依赖 | --help；用无敏感内容的中文 DOCX 和 PDF 转 Markdown，核对标题、中文、表格及丢失项 | 待安装 |
| Superpowers | https://github.com/obra/superpowers ；当前 README 提供 Codex 插件市场方式，安装前按实际客户端版本核对 | 新会话能发现所选工作流；关键词只命中需要的技能；没有重复同名加载 | 待差异核对和接入 |
| LocalSend | https://github.com/localsend/localsend/releases ；选择匹配架构的官方 Windows 发行包，手机使用官方渠道版本 | 同一局域网两端互传一个测试文件，比较大小与 SHA256 | 待电脑/手机安装与传输验收 |
| Open-LLM-VTuber | https://github.com/Open-LLM-VTuber/Open-LLM-VTuber ；按 https://open-llm-vtuber.github.io/docs/quick-start 在独立目录部署 | 后端和客户端可启动、角色显示；随后验证中文文本、语音输入输出、打断和桌宠模式 | 待设备与模型配置 |
| Aseprite | https://github.com/aseprite/aseprite ；已有正版则使用；否则按官方 INSTALL.md 评估本机源码编译，商业安装包购买另行确认 | 新建两帧动画，保存再打开，导出 PNG 精灵图与 GIF | 待现有授权/编译环境核对 |
| rembg | https://github.com/danielgatis/rembg ；按执行时 README 使用独立 Python 环境，先核对 CPU/GPU 依赖与模型来源 | 对一张测试角色图去背景，导出含透明通道的 PNG；检查头发、龙角、轮廓和主体保留情况 | 待本地安装 |
| Ink／Inky | https://github.com/inkle/ink 与 https://github.com/inkle/inky/releases ；先安装匹配 Windows 架构的 Inky 发行版，按需配置兼容的 Ink 工具链 | 中文剧情含两个选项、变量条件与分支汇合；预览各分支，保存重开并导出 JSON | 待本地安装 |

## 新增两项的接入边界
- rembg 负责去背景，不自动完成表情包网格切图；保留原图，模型缓存不入 Git。安装时记录 Python、包和模型版本，下载必要模型前核对体积与磁盘。
- Ink／Inky 用于剧情编写和原型预览。导出的 JSON 不是 GIA；千星 Lua／节点图适配属于后续独立工作，不能宣称安装后即可直接导入游戏。
- 所有七项继续沿用现有已授权的本地安装与验收范围。新增共享调用技能时，再同步维护关键词入口。

## 执行顺序与关键细节
1. 核对 Windows 版本、CPU 架构、可用磁盘、Python/Git/Node 与实际 Codex。桌宠另查 RAM/GPU；不把旧工程路径当作已确认安装目录。
2. 先完成 MarkItDown 和 LocalSend。MarkItDown 使用虚拟环境里的 python -m pip，避免 PyCharm/系统解释器不一致；OCR/图像描述如需模型应单独配置。转换后的 Markdown 需要核对后才提炼入技能，不自动将文档内容视为执行指令。
3. 比对 Superpowers 与 skills/systematic-debugging、code-review、skill-manager 及入口规则。记录上游提交、许可、同名项和选用方式。优先保持已有共享技能的真源与入口；不能同时安装同名手工副本和插件副本。插件托管内容由插件管理；若改为抽取适配技能，则保留来源和许可证，改名/修复引用并验证，避免同时启用整套插件。尚未决定采用哪种方式，不声称已去重完成。
4. 部署 Open-LLM-VTuber 前先核对现有本地模型或用户已有 API。密钥留在本地且排除 Git；不预设 ChatGPT 订阅就是可用 API 凭据。先用项目合法示例形象验证运行，再适配用户的虚构银发龙娘形象；平面头像并不自动成为可用的 Live2D 模型。不要在云端先下载大量本机用模型。
5. Aseprite 先查是否已安装或已有许可。源码编译依赖以所选 tag 的 INSTALL.md 为准（当前 main 文档列有 Windows 11、VS2022、Windows SDK 等要求）；不盲装整套编译工具。软件源码及发行包采用项目 EULA，保留适用条款。需要购买时说明版本、价格和来源后另行征求用户决定。
6. 记录每项实际安装路径、版本/上游提交、配置备份、测试结果和剩余阻塞。安装失败仅暂停该项，继续其他项。最后回写本记录并正常推送。

## 本轮结果
- 已读取官方仓库及安装入口；旧 Superpowers .codex/INSTALL.md 地址返回 404，改以当前 README 的客户端入口为准。
- 已建立七项清单、去重策略及验收条件。
- 未执行任何 Windows 安装、购买、模型下载或本机设置变更。
- 未新增/修改技能正文，现有关键词路由无需变更；后续实际引入技能时必须联动更新。
