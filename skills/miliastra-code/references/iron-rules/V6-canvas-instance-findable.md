# V6. 画布上摆的实例：**建不了，但找得到**

> 归属：`miliastra-code` 机械可查铁律｜从 `iron-rules-visual-debug.md` 拆出（内容未改）

- `InstantiateClientUIControl` 只能建**模板（存为模板的那条）**；摆出来的实例是作者内容，脚本建不出来。
- 但脚本可以：遍历 `parent:GetChildren()` → 按 `name` 匹配 → `GetChild("子控件名")` → 改 `.text`。
- ⇒ **复合模板最稳的落地方式**：创作者摆实例 + 脚本按名字找到并填数据（真机验证通过）。

## 补充（2026-10-08）：还有第三种形态 —— **模板引用**

作者可能不"摆实例"也不"存为模板给脚本建"，而是**在主模板里引用别的模板**（`ClientUIReferenceControl`）。
这时被引用的内容**已经是主模板的子控件**：

- ⇒ 写法与上面第一条**一样**（按名字找 + 切显隐），**不要**再 `InstantiateClientUIControl`
- ⚠️ 宿主里可能出现**两层同名**（`天赋-金钱` → `天赋-金钱`），也可能不同名
  （`天赋详情` → `天赋详情页-加点`）⇒ 按名字找并把 `findByChild` 深度给到 **3~4**
- ⚠️ "名字对"也不等于"控件对"（容器 vs 文本框、按钮 vs 按钮内部件）⇒ **候选 + 字段探测**

细读 → [`../control-name-and-probe.md`](../control-name-and-probe.md)
