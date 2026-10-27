# 共享记忆（跨会话上下文）

本目录是本机所有 agent（DSH / Codex / Claude Code 等）共用的记忆仓库。

## 结构

| 路径 | 作用 | 是否入库 |
| --- | --- | --- |
| `memory.py` | 读写入口（Python 标准库，无依赖） | 入库 |
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
python memory.py briefing --scope machine      # 会话开始的摘要
python memory.py search 代理                    # 关键词检索
python memory.py add --kind decision --scope project:qxqy_AI --text "……" --tags 仓库,规则
python memory.py add --kind preference --text "……" --confidence pending   # 未确认
python memory.py promote m-20261027-001        # 转正
python memory.py revoke  m-20261027-001        # 撤销（保留记录）
python memory.py list --kind gotcha            # 按类型列
python memory.py stats                         # 统计
python memory.py rebuild                       # 重建 INDEX.md
```

## 写入纪律

- 只记**事实、决定、约定和踩坑结论**，即能改变后续动作的信息；不记聊天原文、凭据、账号、他人隐私。
- 一条一句话、可检索；同主题新结论优先于旧条目，冲突时 `revoke` 旧条再新增新条。
- 用户明确认可、否定或纠正的直接记 `confirmed`；自己推断的记 `pending`，用户确认后再 `promote`。
- 记忆不是交接文档：任务过程仍写在 `handoffs/`，这里只留跨会话要复用的结论。

## 各 agent 如何接入

- 规则已写入 `~/.codex/AGENTS.md`、`~/.agents/AGENTS.md`、`~/.claude/CLAUDE.md`、`~/.dsh/AGENTS.md`，以及工程 `AGENTS.md` 的「跨会话记忆」章节。
- 任何能执行命令的 agent 直接调用 `memory.py`；没有 shell 的客户端只读 `INDEX.md`。
