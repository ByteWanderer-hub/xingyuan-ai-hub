# L2-V1. "没显示"必须先分三类，不许凭代码推理

> 归属：`miliastra-code` 语义铁律（默认不查）｜从 `iron-rules-visual-debug.md` 拆出（内容未改）

| 类别 | 判据 |
|---|---|
| ① **没建出来** | 日志里没有"实例化成功"行 / 有 `实例化失败` ⇒ 查 id、查是否为模板 |
| ② **建出来但不可见** | 探针显示 `visible/active/scale/子控件数` 全正常 ⇒ 查 `sanitize`、几何、层级 |
| ③ **被盖住** | 同级扫一遍 `GetChildren()` + `GetSiblingIndex()` + `GetAnchoredPosition()` + `GetSizeDelta()`，找出**索引更大且矩形覆盖目标点**的那个控件 = 真凶 |
