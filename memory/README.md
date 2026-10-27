# 共享记忆（跨会话上下文）

本目录是本机所有 agent（DSH / Codex / Claude Code 等）共用的记忆仓库。

## 结构

| 路径 | 作用 | 是否入库 |
| --- | --- | --- |
| `mem.cmd` | **推荐入口**：Windows 包装，自动切 UTF-8（解决 GBK 报错），DSH / Codex 直接调用 | 入库 |
| `memory.py` | 读写实现（Python 标准库，无依赖） | 入库 |
| `entries.jsonl` | 数据本体，一行一条，追加写 | **默认不入库**（见 `.gitignore`） |
| `INDEX.md` | 由 `rebuild` 生成的人读视图 | 默认不入库 |
| `README.md` | 本说明 | 入库 |

数据与索引默认留在这台机器：`entries.jsonl` 可能含个人信息，不随手推到远端。
需要跨机同步时，自行删掉 `.gitignore` 里对应的两行，并确认内容可以进你自己的私库。

## 字段

| 字段 | 取值 | 说明 |
| --- | --- | --- |
| `id` | `m-YYYYMMDD-NNN` | 自动生成 |
| `ts` | ISO 时间 | 自动 |
| `kind` | `preference` / `decision` / `fact` / `task` / `gotcha` | 偏好、决定、事实、任务、踩坑 |
| `scope` | `machine` 或 `project:<名>` | 适用范围，检索时按此过滤 |
| `text` | 一句话结论 | 摘要里直接展示，建议 ≤ 60 字 |
| `detail` | 可选补充 | 背景、理由、复现步骤 |
| `tags` | 逗号分隔 | 关键词，便于检索 |
| `confidence` | `confirmed` / `pending` | 未确认的先进 pending |
| `status` | `active` / `revoked` | 撤销不删记录 |
| `source` / `agent` | 会话 / dsh、codex、claude | 来源与写入方 |

## 常用命令

```bash
mem.cmd briefing --scope machine        # 会话开始：默认只给最近 5 条（省上下文）
mem.cmd briefing --all                  # 需要时看全部
mem.cmd briefing --ids                  # 带编号（转正/撤销用）
mem.cmd search 代理                      # 关键词检索
mem.cmd add --kind decision --scope project:qxqy_AI --text "……" --tags 仓库,规则
mem.cmd add --kind preference --text "……" --confidence pending   # 未确认
mem.cmd promote m-20261027-001          # 转正
mem.cmd revoke  m-20261027-001          # 撤销（保留记录）
mem.cmd list --kind gotcha               # 按类型列
mem.cmd stats                            # 统计
mem.cmd rebuild                          # 重建 INDEX.md
```

> 上下文预算：briefing 默认 5 条、每条一句话；`text` 超过 80 字会提示压缩（建议 ≤60 字），细节放 `--detail`。
> 排序规则：范围匹配（请求的 scope 优先）→ 类型权重（决定/踩坑 > 偏好 > 事实）→ 新鲜度（14 天半衰）→ 简短度；`--q 关键词` 额外加权并过滤。因此条目多时，靠前的总是更该被记起的。

## 写入纪律

- **两个触发词**（已写入各 agent 的全局指令）：`前置：<任务>` 走拆解—补齐—实现通道；`记住：<一句话>` 直接写库并回一行确认。
- 只记**事实、决定、约定和踩坑结论**，即能改变后续动作的信息；不记聊天原文、凭据、账号、他人隐私。
- 一条一句话、可检索；同主题新结论优先于旧条目，冲突时 `revoke` 旧条再新增新条。
- 用户明确认可、否定或纠正的直接记 `confirmed`；自己推断的记 `pending`，用户确认后再 `promote`。
- 记忆不是交接文档：任务过程仍写在 `handoffs/`，这里只留跨会话要复用的结论。

## 各 agent 如何接入

- 规则已写入 `~/.codex/AGENTS.md`、`~/.agents/AGENTS.md`、`~/.claude/CLAUDE.md`、`~/.dsh/AGENTS.md`，以及工程 `AGENTS.md` 的「跨会话记忆」章节。
- 任何能执行命令的 agent 直接调用 `memory.py`；没有 shell 的客户端只读 `INDEX.md`。
