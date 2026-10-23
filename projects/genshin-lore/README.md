# 原神本土化资料库

最后更新：2026-10-23（Asia/Shanghai）。当前状态：已覆盖 122 个可玩角色的任务、邀约和活动检索入口，建立 1,208 个事件节点、102 个邀约结局分支、1,783 个来源标签 NPC／叙事对象和 19 条叙事关系；索引与回归验证待本轮完成后同步星愿仓库。事件边只表达经来源支持的局部任务进度，不声称完整剧情、全出场名单或世界内绝对编年。

- [x] 已完成：37 条背景事实卡、6 套原创改编参考及项目路由。
- [x] 已完成：14 条玩家梗/名场面卡、27 个新增来源、独立检索与剧透/出处检查；维护责任方：助手。
- [x] 已完成：在原 87 张事实与实体卡基础上新增 95 张人物身份卡，合计 182 张；事实与人物故事共登记 161 个来源。
- [x] 已完成：13 张任务资料卡（5 张流程摘要、8 张官方概要），每张分开记录原作信息、证据缺口和原创改编建议。
- [x] 已完成：49 条有方向和时点的关系（14 条人物、16 条组织、19 条地域），支持按人物、地点或组织查相关任务与关系。
- [x] 已完成：122 个可玩角色身份与 9 个相关 NPC 的 131 张人物档案，976 个故事／背景记录（972 个提要、4 个来源未开放占位）；保留来源定位、标题纠错与任务前后文本条件。
- [x] 已完成：AI 索引连接 182 个实体、1,371 张卡片与 188 个来源，提供中英文别名、文件行号、指纹、人物故事／任务／关系入口及过期检查；44 项测试通过。
- [x] 已完成：时间线增加 1,208 个事件、102 个邀约结局清单和 19 条具来源、时点与方向的叙事关系；未审定的前置条件保留为来源引用，不推导为时间先后。
- [ ] 未完成：运行全套回归、更新 AI 索引后推送 `ByteWanderer-hub/xingyuan-ai-hub`，再回写工程镜像；验收条件为远端提交可核实且镜像校验通过。
- [ ] 未完成：4 个旅行者故事占位在核对来源中仍标“暂未开放”，尚未取得可核对正文。责任方：助手；取得公开正文后再替换，不把占位当故事内容，也不据此断言当前客户端状态。
- [ ] 未完成：8 张官方概要卡的完整流程与结局尚未逐项核对；助手按具体设计需求补正文证据后升级，不把概要当全剧情。所有角色的全任务、邀约、活动出场年表与逐句游戏内核验仍未完成。
- [ ] 未完成：部分候选的精确原作出处尚需补证，条目已标 `needs_primary_check`。责任方：助手；在具体设计把它当原句或剧情事实使用前完成。
- [ ] 未完成：尚无全论坛统计、最新热榜或目标关卡试玩偏好数据。助手按需补查；用户辅助试玩后确认具体设计是否自然好玩，不作为本次资料库交付的阻塞项。

服务于本项目的千星奇域关卡：让任务动机、角色表达、环境线索和玩法规则与原神背景相容。初建日期：2026-10-21。

这是可检索、可追溯、按需扩充的资料库，不是全量 Wiki 镜像，也不代表已掌握截至今日全部剧情。全文仅保存简短转述和原创设计参考，不保存整篇文章、全部对白或媒体素材。

## 共享与本机使用

用户于 2026-10-23 明确授权将本库同步到星愿 GitHub 仓库，供其他电脑与有仓库权限的使用者下载。

- 正式共享入口：[星愿仓库原神资料库](https://github.com/ByteWanderer-hub/xingyuan-ai-hub/tree/main/projects/genshin-lore)。仓库克隆中的路径为 `projects/genshin-lore/`，本机为 `D:/xingyuan-ai-hub/projects/genshin-lore/`。
- 游戏工程使用副本：`D:/千星奇遇/qxqy_AI/project-docs/genshin-lore/`。本主题只维护这份 README 的同步副本，不另建交接正文。
- 分发的是实际 JSON、JSONL、Python 与说明文件，不依赖本机软链接、私有磁盘路径、额外 Python 包或在线数据库服务。取得仓库后可离线检索；仓库的访问权限仍按 GitHub 设置执行。
- 后续维护先比较两边与远端差异，保留未同步改动，合并验证后正常提交、推送，再更新使用副本。没有后台监听或自动抓取剧情的进程。
- 共享版本以远端 `main` 的文件为准；仅修改本机 clone 不等于已上传。推送后由执行助手核对远端提交与本机两份内容哈希。

在任意下载位置进入 `projects/genshin-lore/` 后，可直接执行 `python -B query.py --validate`、`python -B query.py --stats` 与下方的新检索命令。Python 3 标准库即可。

## 用户确定的口径

- 可收录全部**已公开发布的剧情**，包括结局和身份揭示；每条明确标记剧透，并注明章节或版本时点。不纳入泄露或未发布测试服内容。
- `none`：地区简介、公开角色介绍、基础玩法等，不揭示任务进展。`minor`：任务前提、阶段信息。`major`：结局、重要转折或身份揭示。
- 为方便无剧透背景设计，检索默认 `none`。涉及具体剧情时直接使用 `--spoilers all`，无须再次向用户确认是否允许收录；对用户展示涉及的章节与剧透标签。
- 原作事实、社区推测和原创改编不可混写。当前库不收录社区推测为事实。
- 人物故事范围扩为全部已实装可玩角色，NPC 按相关任务补充。旅行者的空／荧与元素形态合并为一个档案身份；奇偶的男女外观合并为一个身份，不用形态数量充当人数。
- 本土化要进入职业、动机、环境、任务反馈与交互规则，不止替换名词或堆叠角色梗。

## 内容与来源

| 文件 | 用途 |
| --- | --- |
| [entries.jsonl](entries.jsonl) | 37 条事实摘要卡：世界观、地区、组织、地点、角色、机制、文化、生活及剧情 |
| [entities.jsonl](entities.jsonl) | 新增 50 张人物／地点／组织卡；与背景事实一起检索，ID 不重复 |
| [playable_entities.jsonl](playable_entities.jsonl) | 本轮新增 95 张人物身份卡（含派蒙）；复用原有角色 ID，不重复造人 |
| [character_roster.json](character_roster.json) | 122 个可玩身份、形态归并、目录核对、实装日期证据及未纳入候选 |
| [character_profiles.jsonl](character_profiles.jsonl) | 131 张人物档案：身份、所属标签、章节入口、已收录任务／关系与覆盖限制 |
| [character_stories.jsonl](character_stories.jsonl) | 976 个逐章／背景记录；短提要、来源定位、解锁条件、纠错及文本变体 |
| [character_sources.json](character_sources.json) | 138 个新增来源；HoYoWiki 公共数据与 BWIKI 正文的证据分类及指纹 |
| [ai_index.json](ai_index.json) / [story_index.py](story_index.py) | AI 可读的别名、卡片定位及关系索引；离线构建、限量查询、过期检查 |
| [quests.jsonl](quests.jsonl) | 13 张任务资料卡：章节、参与者、地点、前置、阶段、结局证据与原创改编 |
| [relations.jsonl](relations.jsonl) | 49 条人物／组织／地域关系；通过稳定实体 ID 连接背景卡与新增实体 |
| [timeline_events.jsonl](timeline_events.jsonl) / [character_timelines.jsonl](character_timelines.jsonl) | 任务、邀约与活动的事件节点及 122 个可玩角色的局部进度入口；不把版本号或目录排序当世界内日期 |
| [hangout_branches.jsonl](hangout_branches.jsonl) / [timeline_relations.jsonl](timeline_relations.jsonl) | 102 个互斥邀约结局及 19 条经叙事证据支持的关系；同场或目录列名不自动成为关系 |
| [timeline_entities.jsonl](timeline_entities.jsonl) / [timeline_sources.json](timeline_sources.json) | 任务中具名称呼的 NPC／叙事对象与逐条来源定位；同名、化身和回忆身份保持待核 |
| [sources.json](sources.json) / [expansion_sources.json](expansion_sources.json) | 原 13 个与新增 10 个事实来源；新文件不是对所有旧来源的重新核查 |
| [community.jsonl](community.jsonl) | 14 条玩家文化卡：梗、熟悉台词、外号、反差与情绪名场面，和事实库分开 |
| [community_sources.json](community_sources.json) | 27 个新增证据来源；记录平台、发帖者身份类别与访问限制 |
| [patterns.json](patterns.json) | 6 个原创关卡改编参考，单独标记 `original_adaptation` |
| [query.py](query.py) | 本地 Python 标准库检索；不联网、不操作存档 |
| [test_query.py](test_query.py) | 检索、来源引用和剧透隔离的定向验证 |
| [test_story_index.py](test_story_index.py) | 故事完整性边界、人物归并、标题纠错、索引定位与跨目录检索验证 |

地区索引包括蒙德、璃月、稻妻、须弥、枫丹、纳塔、挪德卡莱、至冬及通用条目。至冬已补相关可玩角色档案，但地域和任务关系仍是选录。角色故事已覆盖本轮目录的公开档案章节，尚无全任务出场语料库。

用户指定的 [GameKee 原神专区](https://www.gamekee.com/ysgl/) 保留为社区资料入口。它不等于米哈游官方游戏网站。补充资料来自开发团队署名的 PlayStation Blog 文章、原神官网，以及 BWIKI 的任务转录与社区整理。

证据分类：

- `official`：游戏官方网站。
- `developer_article`：开发团队署名文章；虽发表于 PlayStation 网站，仍可作为该文章内容的第一手资料。
- `community_transcription`：社区转录任务或教程；关键对白、角色身份或剧情复刻需复核游戏原文。
- `community_summary` / `community_wiki`：社区整理；页面可靠性不外推至所有段落。
- `community_post`：公开玩家帖子、讨论或二创；仅证明样本中有人这样表达，不自动成为原作设定或玩家共识。
- `access: page`：已访问正文相关段落，不表示完整校对该页；`search_excerpt`：仅核对检索摘录，证据较弱，不宣称已读全文。

来源登记的 `checked_at` 是本次核对日期，不代表剧情更新至该日。旧版本文章只支持其对应时点；卡池、奖励与活动日期不作为当前资料使用。中文术语若只有英文依据，应补查中文原文；例如 Kuuvahki 卡保留英文主标题，中文别名仅用于检索并标记待核。

### 人物故事的覆盖与证据边界

人物名录交叉比对 [HoYoWiki 角色目录](https://wiki.hoyolab.com/pc/genshin/aggregate/character) 与 [BWIKI 角色表](https://wiki.biligame.com/ys/角色)。中文 HoYoWiki 128 条目录记录与 BWIKI 129 条展示行按身份归并，再补奇偶公开介绍，得到 122 个可玩身份。目录含预告页的可能性已单独处理：仅出现在英文预告目录且缺实装证据的候选不入可玩名单。除实际核对过日期的 3 个角色外，`release_date` 留空；本次不是逐人的上线日期审计。

故事正文核对使用 HoYoWiki 公开角色页面的 JSON 接口，记录请求语言、页面 ID、组件定位与原文指纹；不需要账号、Cookie 或令牌。页面在官方运营社区内，但内容由社区编辑转录，因此统一标 `community_transcription`，不冒称官方署名原文。来源查询日期、页面版本号和指纹仅用于追溯，不等于游戏版本号或逐句客户端核验。BWIKI 用于缺章、错题和特殊档案补证。

976 个记录分为 966 个可玩角色档案章节（其中 4 个来源占位）、奇偶公开介绍 1 个、NPC 任务背景 9 个。其余 972 个保存简短主题提要，通常每节一句，用于先定位相关经历；需要详细改编时沿来源阅读该节公开正文。没有把原作长篇故事逐字复制进仓库，也不把一行提要称为完整人物生平。

- 提纳里：HoYoWiki 缺少“初学者放大镜”“神之眼”，已按 BWIKI 补齐，两节保留独立来源。
- 嘉明：HoYoWiki 多个章节标题与正文错位；按 BWIKI 同段内容纠正，保留原标题、原文哈希与纠错来源。
- 夏沃蕾：特殊章节纠正为“特巡队贰型制式铳枪”，保留错题证据。
- 旅行者：基础页的 4 个“暂未开放”只作为来源占位；各元素页另保留章节数量。火形态缺神之眼条目、冰形态故事组件为空、水形态重复标题等差异不擅自补写，也不据页面缺失推断游戏实装状态。
- 埃洛伊沿用来源的 6 节结构；奇偶只有公开介绍，不强造角色故事 1—5。
- 纳西妲等来源中的任务前后文本分开记录 `variants` 条件及指纹；提要只概括共同主题，不能把世界树记忆改写前后的叙述当作同时成立的证词。

`affiliation_labels` 是公开档案标签，不自动生成永久效忠关系；`mentioned_entities` 和索引 `mentioned_in` 是文本名称匹配，只用于找材料，不证明亲属、师徒、同盟或敌对。原有 49 条已整理关系仍独立保存。故事卡默认标重大剧透；`unlock_conditions` 空列表只表示来源未显式列出条件，不代表游戏内无需解锁。

### AI 如何读取人物资料

先按名字解析唯一实体，再读取对应的少量卡片，按需要追任务、关系和来源。AI 不应一次预读全部故事，也不能将正文中出现另一个名字直接推成关系。`ai_index.json` 本身含剧透标题，需要无剧透结果时通过查询命令过滤。

```powershell
python -B story_index.py --lookup Nahida --spoilers all --limit 3
python -B query.py --profiles --entity 纳西妲 --spoilers all --json
python -B query.py --stories --entity Tighnari --spoilers all --limit 8 --json
python -B query.py --stories --entity 嘉明 --spoilers all
python -B query.py --quests --entity 婕德 --spoilers all --json
python -B query.py --timeline --entity 钟离 --spoilers all --limit 8 --json
python -B query.py --branches --entity 久岐忍 --spoilers all --json
python -B query.py --event-relations --entity 马科修斯 --spoilers all
python -B story_index.py --check
```

索引包含规范化别名到稳定 ID 的映射，以及人物到 `profile_ids`、`story_ids`、`quest_ids`、`relation_ids`、`mentioned_in` 的映射。名称归一化采用 Unicode NFKC 与大小写折叠；别名歧义时报错，不随意挑一个人物。`--lookup` 对每类结果分别限量 1–20 条，并报告匹配与显示数量；全部结果可在确认剧透范围后按实体 ID 读取索引对应集合。

JSONL 定位的 `line` 从 1 开始；`sha256` 为该行 UTF-8 字节、不含换行。JSON 文件用 `pointer` 定位，`data_hashes` 覆盖全部数据文件；`.gitattributes` 固定 LF，避免其他电脑克隆时因换行转换导致指纹失效。全部路径相对资料库目录，不依赖这台电脑的盘符。修改任何数据后需重新构建索引；过期索引会使索引查询、人物／故事查询与总校验失败，不静默读错行。

故事来源中的 `component_pointer` 指向公开接口响应中的 JSON 字符串字段；先解析这段字符串，再用 `decoded_pointer` 取具体章节。`html_sha256` 指向该节原始 HTML 字符串；BWIKI 补证未保存原文快照时该字段为 `null`，使用页面标题定位，不伪造指纹。全文研究缓存不随库发布，离线查询依赖库内提要，在线原文查证依赖对应网站仍可访问。

## 检索方法

在项目根目录运行，Python 3 即可，无需安装依赖：

```powershell
python project-docs/genshin-lore/query.py "委托" --region 璃月
python project-docs/genshin-lore/query.py "Lynette"
python project-docs/genshin-lore/query.py --region 枫丹 --category 角色
python project-docs/genshin-lore/query.py --id quest.liyue-osial --spoilers all
python project-docs/genshin-lore/query.py --patterns --region 纳塔
python project-docs/genshin-lore/query.py "桂花" --community
python project-docs/genshin-lore/query.py --community --tone 轻松 --limit 3
python project-docs/genshin-lore/query.py "森林" --community --spoilers all
python project-docs/genshin-lore/query.py --stats
python project-docs/genshin-lore/query.py --validate
python project-docs/genshin-lore/test_query.py
```

关键词按子串匹配；空格分隔的词要求全部命中，不做中文分词或语义向量检索。长句未命中时改用“地区 + 核心词”，如 `"璃月 委托"`。默认最多返回 5 条，`--limit` 可设 1–20；`--json` 返回结构化结果与完整来源元数据。结果为零只表示当前库没有匹配记录，不证明原作中不存在。

### 任务和关系检索

以下命令在资料库目录内执行；在游戏工程根目录执行时，把 `query.py` 换为 `project-docs/genshin-lore/query.py`。

```powershell
python -B query.py --quests --region 稻妻 --spoilers all
python -B query.py --quests --entity 婕德 --spoilers all
python -B query.py --quests --id questcard.forest-child --spoilers all
python -B query.py --relations --entity 丝柯克 --spoilers all
python -B query.py --relations --entity Childe --relation-type 师徒 --spoilers all
python -B query.py --relations --category 地域关系 --region 纳塔
python -B query.py --relations --entity region.nodkrai --json
python -B query.py --category 角色 --region 枫丹 --limit 10
```

`--entity` 精确匹配 ID、标题或别名，可用于 `--quests`、`--relations`、`--profiles` 或 `--stories`。关系两端都能被查到，但输出方向保持原样。查询只返回直接登记的关联，不进行传递推理；查全地区内容用 `--region`。例如“老师的学生”不会自动推成另一人的同门、政治盟友或亲属。别名不唯一时使用 ID。实体本身与关系均受剧透过滤，名字查询不会绕过此限制。

### 本轮任务覆盖

| 地区 | 卡片 ID（省略共同前缀 `questcard.`） | 证据深度 |
| --- | --- | --- |
| 蒙德 | `mondstadt-dragon` 巨龙与自由之歌 | 流程摘要 |
| 璃月 | `liyue-star` 迫近的客星 | 流程摘要 |
| 璃月 | `moonchase` 逐月节；`skirk-story` 丝柯克传说任务相遇 | 官方概要；到访地点不等于人物出身 |
| 稻妻 | `sakura` 神樱大祓 | 流程摘要 |
| 稻妻 | `inazuma-finale` 主线终章前提 | 官方概要 |
| 须弥 | `golden-slumber` 黄金梦乡 | 流程摘要；人物牺牲细节待补证 |
| 须弥 | `jeht-oasis` 婕德后续旅程；`sumeru-rescue` 营救纳西妲 | 官方概要 |
| 枫丹 | `fontaine-show` 歌剧院开篇；`meropide` 水下设施寻人 | 官方概要 |
| 纳塔 | `forest-child` 迷林之子 | 地图事件流程摘要；不等于整个后续世界任务系列 |
| 挪德卡莱 | `nodkrai-opening` 月之一开篇 | 官方概要；未覆盖后续月之版本 |

“官方概要”描述开发团队文章公开的内容边界，不代表这些旧版本任务尚未发布。卡片标题带“概要／阶段／开篇”的部分是资料库导航标题，不冒充游戏任务的精确中文名称。`outcome.status=not_reviewed` 表示本库没有核对结局，不能推断游戏没有结局。

### 关系怎么用于本土化

先确定章节时点，再用实体 ID 查任务与关系，最后读取任务卡的 `adaptation`。这里的“本土化”指让原创游戏内容符合原神世界背景、社会关系与角色动机；不是把国家强行等同现实国家，也不是只替换场景名。

| 要确定的问题 | 使用资料 | 改编时检查 |
| --- | --- | --- |
| 谁能委托、指挥或提供帮助？ | `任职`、`领导`、`管理`、`协作`等有向关系 | 不把同场登场推成上下级；不把故事对立永久化 |
| 人物为什么关心任务？ | 任务 `cast.role`、师徒／家庭／援救关系 | 让动机影响目标与完成反馈；CP 或亲密程度不由关系图推断 |
| 场景属于哪，怎样往来？ | `位于`、`西侧`、`驻地`、`自治区域` | 地理位置、政治管辖、设施自治、人物到访分别处理；没有登记的路线不猜 |
| 可以改什么，不能冒充什么？ | `adaptation.hook/loop/avoid/acceptance` | 原创 NPC、流程与对白单独标注；原作身份揭示和制度变化需要对应章节证据 |
| 怎么确认设计有效？ | `acceptance` 与项目平台验证 | 检查玩家能否理解动机、线索是否可见、协作是否有效；库内测试不能替代试玩 |

每张任务卡都有前置说明、人物职责、地点、已核对阶段、收尾证据和原创建议。`cast` 仅列本卡重点参与者，不是完整出场名单。`region` 是本卡的叙事或检索地区，不代表人物国籍、出生地或永久居所。`prerequisites.quest_ids` 只连接已收录前置；没连边不代表没有其他前置。关系 `subject → object` 有明确方向，`timeline` 是有效语境，`boundary` 说明推断边界；它们不是完整世界编年史或实时组织架构。

## 在千星任务中的使用流程

1. 明确任务所处地区、题材、玩法和时间线。没有剧情时点时优先使用无剧透、少依赖政治状态的日常题材；重要时点影响设计才集中询问。
2. 检索 3–5 条相关卡片，查看来源等级、时间背景与边界；不要全量预读资料库。
   涉及玩家口味、名场面或梗时，再检索 `--community`；默认事实检索不混入社区表达。
3. 缺少关键证据时按专题补查用户提供的 Wiki、官方游戏文本或开发者资料。新版本剧情、现任职务、关系变化与角色原句需专门核实，不由旧卡片猜测。
4. 交付设计时明确列出：原作依据及链接、原创设定、剧情时点和剧透等级、玩家动机、目标流程与验收。原创对白标记为原创，不放入引号冒充游戏原句。
5. 用当前 `miliastra-code` / `miliastra-ui` 验证平台能力。事实卡与 `patterns.json` 都不是 API 文档；未知能力标记待验证，必要时设计明确的替代实现。
6. 涉及信号、自定义变量或服务端事件时沿用现有分工：助手写客户端接口与准确配置契约，用户辅助创建和配置；要求明确且目标已确定的节点图沿用现有生成/注入流程，用户辅助挂载。备份、保存切图、回读与试玩要求不变。

## 设计输出模板

```text
地区 / 时间线：
剧透等级与涉及章节：
原作依据：卡片 ID + 来源链接 + 证据限制
原创部分：NPC / 场所 / 事件 / 台词（分别说明）
玩家动机：谁遇到什么问题，玩家为什么参与
任务流程：引入 → 学习 → 变化 → 完成反馈
本土化落点：职业、环境、物件用途、说话方式、社会关系
实现契约：客户端 / 服务端 / 信号 / 变量 / 节点图 / 挂载
验收：剧情一致性 + 可理解性 + 机制与多人归属
待核实：仅列实际影响方案的缺口
```

例如“璃月送货关卡”可检索 `org.guild` 与 `region.liyue`，采用 `pattern.liyue-delivery` 的原创货主与货单流程。协会日常委托有来源；这个货主、货物、任务及台词是原创。具体奖励若未核实可称关卡积分，不冒称官方账户奖励。

## 增补与维护

事实卡必填：唯一 ID、标题、别名、分类、地区、剧透等级、适用时点、简短事实摘要、来源 ID、检索标签、边界。来源必填 URL、标题、类别、访问方式与所支持的范围；能核实的发布日期一并记录，未知留空。

任务与关系必须引用 `entries.jsonl`、`entities.jsonl` 或 `playable_entities.jsonl` 中存在的实体，不重复创建同一人物。关系 ID、任务 ID、实体 ID 全局唯一；涉及实体和前置卡的剧透级别不得高于当前卡。新增任务需标 `coverage`、`outcome.status`，原创建议的 `kind` 必须为 `original_adaptation`。`--validate` 会检查这些引用、来源、标签与前置环路；预告概要不能标为已核实结局。

每次补充只处理当前任务相关主题，保持摘要简短。原作发生变化时保留历史时点，不把不同章节状态合并成一个“当前事实”。若来源冲突，记录冲突并核对原文后再用于关键设计。新增原创模式必须引用已有卡片，剧透等级不得低于它引用的事实卡。

修改数据后运行 `python -B story_index.py --build`，再运行 `python -B query.py --validate` 和定向检索；修改检索程序时运行 `python -B -m unittest test_query test_story_index test_timeline`。这些检查只验证结构、引用与检索行为，不证明世界观事实正确，也不代表关卡已真机通过。更新数量时同步本页，统计以 `--stats` 为准。

## 玩家文化资料：怎么用，怎么判断

本批以米游社、HoYoLAB 为优先研究入口，登记其中 12 个帖子/合集来源，补充 Reddit、哔哩哔哩、TapTap 的公开讨论，以及官网、BWIKI、Fandom 的出处依据。尚未系统覆盖 NGA、贴吧、所有版本或所有语种；不收集玩家 UID、联系方式、画像或私人讨论。

**官方社区不等于官方发言。** `official_community` 只描述平台；`author_role` 单独区分玩家、官方、社区编辑或未核实发布者。官方账号发布的作品可作为出处，玩家在同一平台上的分析仍是玩家分析。米游社 URL 中的频道前缀也可能与正文题材不一致，入库按正文核对游戏，排除搜到的其他游戏内容。

首批主题：应急食品、欸嘿、桂花酒、锅巴喷火、协会招呼语、大黄金钓鱼手、一斗与派蒙的外号、岩王帝菌、文弱的学术分子，以及神女劈观、森林书、万叶挡刀、罪人的终幕、从容旅行的台词表达。它们不是全部都搞笑，也不是实时热门榜。

每张卡额外记录：

| 字段 | 阅读方式 |
| --- | --- |
| `origin_sources` / `origin_note` | 原作语境依据及尚未核实的部分 |
| `origin_status` | `official_context`：官方作品入口与语境已定位，未必逐句校对；`community_context`：社区转录/整理支持；`needs_primary_check`：具体原作出处仍待补证 |
| `circulation.sources` | 能证明玩家使用或讨论的样本，和原作依据分开 |
| `circulation.assessment` | `single_sample` 单一样本；`multiple_posts` 多帖；`cross_platform_samples` 跨平台样本。这是证据范围，不是高/中/低热度 |
| `tone` / `use` / `avoid` | 助手给出的设计判断与适用边界，不是玩家统计结论 |
| `example_original` / `player_test` | 原创改编示例及关卡试玩观察点；不能标成官方原句 |

部分动态网页直接访问只有 Loading，本批据可读取的搜索摘录入库并标记 `search_excerpt`。未校对全文、不看见截图内容就不描述截图；搜索索引时间不是发帖时间。相邻但无标签的数字不擅自解读为浏览、点赞或收藏。当前互动指标均留空；不根据搜索排名推断热度，不把同一作品的转载误算成独立偏好样本。

从样本可以形成**待试玩验证的设计假设**：熟悉的日常互动适合短彩蛋；人物反差须保留其完整人格；记忆、告别、归属与挺身救援适合认真叙事；反复播放熟悉台词也可能让人厌烦。它们不是所有原神玩家共同的固定口味。

使用时优先把原作关系与动机融进玩法：梗放在可选对话、物件说明或一次性的完成反馈中；每个任务先选一个主要情绪，按实际节奏控制密度。让没见过梗的玩家也能完成任务。角色喜爱、强度争论、CP、嘲讽与圈外攻击等需要具体语境，默认不塞进通用 NPC 台词；这是为避免破坏代入感，不是把论坛争议误当游戏设定。

新增条目应分别补原作出处和传播证据，保留反例或不同感受。若要求“现在流行什么”，另做带时间窗口的公开样本核对，给出样本范围与局限；本批历史材料不能代替当前热度调查。开发实际关卡时按当前平台能力实现，资料卡不授权复用论坛作者的整套图、视频、音乐或代码。

截至 2026-10-23 共 44 项测试，覆盖实体引用、任务关系检索、前置环路、证据深度、故事归属、来源纠错、剧透过滤、跨目录运行及索引指纹。首批项目本机备份记录为 `work/genshin-lore-setup/before/community-20261021T161736/`，此路径不属于共享包依赖；共享仓库不包含该项目备份。

目前待扩充：七国完整文化与地区索引、角色原作语言习惯、组织关系、物品与料理用途、敌人生态、全量任务时间线、枫丹/纳塔/月之系列后续剧情及最新公开版本。用户允许完整剧情，但首版仅收录少量有证据的剧情节点；没有自动更新或后台抓取任务。

## 接入范围

已由游戏工程的 `instructions/qianxing/AGENTS.md` 按需路由。读取该项目规则的聊天及工作流，在涉及原神背景、剧情、角色口吻或本土化时使用本库；普通 Lua 修复等无关任务不加载。共享包可独立查询，千星实现规则仍须在实际游戏工程读取。项目外工作流需显式引用本目录或接入相同规则。
