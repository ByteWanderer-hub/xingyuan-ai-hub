# R7 日志：`[标签] 消息` + `k=v`；**单条 ≤10000 字符**（超出静默截断）

> 归属：`miliastra-code` 机械可查铁律｜从 `iron-rules-lua.md` 拆出（内容未改）


- **真实事故**：一次性打印 `Enum.KeyEventType` 全部成员，**第一片就被截断** ⇒ 反向得出"没有这个键"的错误结论。
  ⇒ **长输出必须分片**；数值写成 `k=v`（`miliastra_log op=metrics` 能直接抽）。
- **审查动作**：`grep -n 'print(' <脚本>` 人工过标签与分片；工具不判这条（列在 `check-lua-style` 的"不判"清单里）。
