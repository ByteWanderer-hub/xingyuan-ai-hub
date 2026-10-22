# 千星域文档来源与版本档案

> 用途：守则 §3 要求「记录实际使用的 API 文档路径和文件哈希，避免任务中途文件被替换后继续使用旧结论」。
> 本文档就是那份记录。**改动任何一份文档后，必须回来更新对应哈希与日期。**

## 一、来源与快照

| 本机文件 | 体量 | SHA-256（前 16 位） | 来源 |
|---|---|---|---|
| `references/guardrails.md` | 61.3KB / 693 行 | 原 `B172E2B867E53965` → 本地 `A31734F502FCF8F5` | 官方《千星沙箱客户端脚本使用指南》包内的 `README.MD`。⚠️ **2026-10-02 本地改动 1 处**（§3.1 把已移出的 `Image_sample_by_id.json` 换成 `asset-catalog.md`） |
| `references/api-client-ui.md` | 56.0KB / 1127 行 | `7AF9F8044A7CDB02` | 《客户端控件API文档》结构化摘要（769 行表格，含全部签名与枚举）；其头部声明来源飞书文档 ID `OadtdEngroTeMmxUKmmcot03njd` |
| `references/api-client-ui-outline.md` | 5.2KB / 282 行 | `BAA7688417AAB6AF` | 同上的**空壳导出**：章节标题齐全但所有「字段/方法」小节为空（导出丢表格）。**仅作存档，不作 API 依据** |
| `references/usage-guide/千星沙箱客户端脚本使用指南.md` | 14.4KB | 原 `5356540C7DACFD62` → 本地 `6A447943DEE8BFA0` | 官方使用指南正文（原另含 33 张配图）。⚠️ **2026-10-02 本地已剥离 34 张配图 + 顶部加一行说明**（为可携带性），正文内 `图片和附件/…` 链接在本技能内失效，配图请回官方来源 |
| ~~`assets/Image_sample_by_id.json`~~ | ~~5.4MB~~ | `AA1E628FFAF4142A` | ⚠️ **2026-10-02 已移出技能**（可携带性）。替代：`assets/asset-catalog.md`（1543 条索引，同源生成）+ 插件 `miliastra_asset op=catalog` / `op=icon-search`。原始哈希留在本行备查 |
| `references/frame-animation.md` | 14.8KB / 286 行 | 原 `E6F5B25C1E39C8C1` → 本地 `2A4AB27796D2A0D5` | 米哈游 skillhub 官方技能 `lua-control-frame-animation` v1.1.0（id `cmshd908w0180rj0132mmvo6k`）原 SKILL.md。⚠️ **2026-10-02 本地改动 1 处**（图片资产来源改指 `asset-catalog.md`） |
| `references/compact-stream.md` | 8.2KB / 168 行 | `73D348B895A4E775` | 同上技能的配套参考《紧凑帧流》，**逐字保留** |
| `references/pixel-reconstruction.md` | 31.0KB / 560 行 | 原 `171B290E70C11D20` → 本地 `21A318862A22F18F` | 米哈游 skillhub 官方技能 `pixel-lua-reconstruction` v1.1.0（id `cmshd90be0184rj01brgmohwe`）原 SKILL.md。⚠️ **2026-10-02 本地改动 2 处**（图片资产来源改指 `asset-catalog.md`） |

- **版本锚点**：**7.1 版本测试服**（离线包说明原文：「本次 7.1 版本测试服新增 ui 脚本说明」）
- **入库日期**：2026-09-12
- **线上原文（需飞书登录，权限问题找对接人）**：
  - UI 脚本说明：`https://kcnote9o8u33.feishu.cn/wiki/V0s9wbFO2ia45akMBjHcjCSdnpd`
  - 接口文档：`https://kcnote9o8u33.feishu.cn/wiki/QF4qw7SEUig3q6kY0M3cUYYUnsh`

## 二、两份 API 文档的关系（重要）

`api-client-ui-outline.md` 与 `api-client-ui.md` 是**同一份飞书文档的两次导出**：

- 前者只有目录骨架，**没有任何函数签名**——按它写代码等于凭空猜 API；
- 后者是结构化摘要，**接口全带签名与参数表**，可以支撑守则 §3 要求的「逐项核对」。

⇒ **唯一可用依据是 `references/api-client-ui.md`**。保留空壳版只为留痕（说明这次导出丢过表格），**任何情况下都不要拿它当 API 来源**。

## 三、官方技能与真实 API 的差异清单

两个米哈游 skillhub 官方技能（v1.1.0）已于 2026-09-12 **合并进本技能**，正文逐字保留为 `references/frame-animation.md`、`references/pixel-reconstruction.md`、`references/compact-stream.md`（搬迁前后 SHA-256 一致，见 §一）。它们是**检索线索，不是 API 依据**——守则 §0 第 2 条。已核对的差异：

| 出处 | 官方技能里写的 | 文档实际 | 处置 |
|---|---|---|---|
| `lua-control-frame-animation` §1 / §8.1 | `script:EnableTick(enabled)` | **`script:EnableUpdate(enabled: boolean)`**（文档 §2 逐帧控制） | ⚠️ **写代码时用 `EnableUpdate`**；直接抄官方技能会拿到不存在的方法（静默失效） |

其余核对结果：官方技能引用的 **29 个接口全部存在**——`game.InstantiateClientUIControl` / `game.DestroyClientUIControl` / `game.GetUICanvasSize` / `ClientUIImageControl:SetImage` / `SetSizeDelta` / `SetAnchoredPosition` / `SetLocalScale` / `SetLocalRotation` / `SetSiblingIndex` / `imageColor` / `SetActive` / `SetVisible` / `SetAnchorMin` / `SetAnchorMax` / `SetPivot` / `OnInit`~`OnDestroy` 全部生命周期 / `Enum.ImageSource` / `Enum.ImageType` / `Color.FromRGB` / `Color.FromRGBA` / `game.Tween` / `script.object` 等。

> `math.floor` 未在文档出现属正常：文档 §三 只列**补充**方法（`math.isnan` / `math.isinf`），`math.floor` 是 Lua 5.3 基础库。

## 四、仍缺的材料

| 缺什么 | 影响 | 怎么补 |
|---|---|---|
| `annotations.lua`（平台随项目提供的 API 签名注解） | 官方技能第一步就是读它；本机没有 → 现用 `api-client-ui.md` 顶替 | 从千星域项目工作区取；两者冲突时**以项目内为准**（它带当前版本签名） |
| `API/Tools/ReconstructPixelArt.py`、`ValidatePixelArtLua.py` | 像素技能 §1.4 提到的官方工具；本机没有 → 按技能指引在任务内自建 | 项目目录里找；没有就自建（技能已给职责拆分建议） |
| 完整版飞书接口文档（未丢表格的导出） | 现有摘要是人工结构化版本，可能与原表有细节差 | 飞书重新导出（保留表格）后替换 `api-client-ui.md` 并更新哈希 |

## 五、文档变更纪律（照守则执行）

1. 每次开工先用下面这条命令记录当前哈希，写进任务报告：

   ```powershell
   Get-FileHash "~\.dsh\skills\miliastra-code\references\api-client-ui.md" -Algorithm SHA256
   ```

2. 任务中途文档路径 / 内容 / 哈希发生变化 → **废弃此前所有 API 核对结论与代码审查结果**，从守则 §3 第 1 步重新执行（守则 §3 第 12 条）。
3. 同一接口在文档内部出现实质冲突 → 标 `unknown`，**不要自行选一个说法**，也不要按文件时间猜版本。
4. 文档缺失或说不清时：标 `unknown` 并停止依赖它的实现，向创作者索取文档——**最小探针不能代替文档**。

## 六、本技能自身的变更纪律

> 2026-10-02 从 SKILL.md 原「§8 版本与更新」吸收进来（该节已删；其余条目上文各节本来就有）。

- ⚠️ **先别动本技能顶部的 `description`**（2026-09-30 实测）：有人（就是我）看到"新加的 reference 里那些词描述里一个都没有"，就往描述里补了「粒子特效 / 性能预算 / 预存多套外观」——
  结果**两批触发测试都没提高，两批都变差**：容易的 20 条两边都是满分（没有区分度）；加难的 10 条 **原版 10/10 → 加词后 9/10 → 再锚定"千星"后 8/10** ✗
  原因：通用短语会把**别的平台**（Unity / Godot）拉进来；锚定"千星"又会把**同平台的兄弟技能**（`miliastra-ui` 视觉布局 / `miliastra-bb` 需求拆解）拉进来 ✓
  ⇒ **reference 里的内容只要技能被加载就能按需读到，不需要把它的关键词塞进 description** ✓
  数据与实验方法：工作区 `docs/技能基准测试报告_miliastra-code_2026-09-30.md` §4.5。
- 已核对过的文档锚点（**7.1 版本测试服**）、API 变更作废规则、skillhub 两技能整编记录：分别见本文 §一、§五、§三。
