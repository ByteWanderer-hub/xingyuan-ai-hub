# V7. 画布实例默认在**脚本控件之下**

> 归属：`miliastra-code` 机械可查铁律｜从 `iron-rules-visual-debug.md` 拆出（内容未改）

- 作者内容先生成、脚本控件后生成 ⇒ 脚本的全屏底板会把画布实例盖住。
- 修法：找到它之后 `SetAsLastSibling()` / `SetSiblingIndex(...)` 提层（真机验证：提了立刻可见）。

---

## 二级铁律（语义级：要运行时事实才能判）
