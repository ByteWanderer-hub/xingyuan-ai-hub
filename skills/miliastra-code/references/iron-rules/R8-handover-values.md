# R8 交接值必须可追溯，禁止编造

> 归属：`miliastra-code` 机械可查铁律｜从 `iron-rules-lua.md` 拆出（内容未改）


- **违反长什么样**：模板索引"看着像"就填、控件模板拿画布上的实例号去用 ⇒ `InstantiateClientUIControl` 恒返回 `nil`，**不报错**。
- **正确做法**：先自动读——`miliastra_sim op=handover source=<活文件>`（从源码抽候选）→
  `miliastra_map op=clientui`（从 `.gil` 读模板）→ 都拿不到**才**问创作者（只问本次缺失的必要值）。
- **审查动作**：`node tools/gil-clientui.mjs "<关卡>.gil"` / `miliastra_map op=clientui --summaryOnly`。

- 容器与控件模板索引依赖当前关卡；图片资产 ID 可由已核实的素材目录或本地索引获取，记录来源和未验证项。素材检索见 `miliastra-ui/references/asset-search.md`；目录存在不代表已导入或真机可用，图片 ID 与模板索引不能互换。
