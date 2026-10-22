# L2-03 `OnStart` 不是每局都跑 ⇒ 必须有 `freshStart()` + 新局检测

> 归属：`miliastra-code` 语义铁律（默认不查）｜从 `iron-rules-lua.md` 拆出（内容未改）

- **真实事故**：第 2 局开局就显示上一局的"时间 4/12、结算中"（脚本 chunk 在两次试玩间不重载，`G` 跨局残留）。
- **判据**："清局"抽成 `freshStart()`，除 `OnStart` 调它外，**tick 里再加一道**新局检测（命令序号回退 = 新局 → 清局 + 重新同步）。
- **过查方法**：grep `freshStart` 的调用点是否为 ≥2 处；grep `lastSeq` 是否有"回退即新局"分支。
