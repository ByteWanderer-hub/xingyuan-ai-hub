#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""共享记忆仓库 CLI（DSH / Codex / Claude 等本机 agent 共用）。

数据：entries.jsonl（追加写，每行一条）
视图：INDEX.md（由 rebuild 生成，人读）
约定见同目录 README.md。

用法：
  python memory.py briefing [--scope machine|project:xxx] [--limit 20]
  python memory.py add --kind decision --scope project:qxqy_AI --text "..." \
      [--tags a,b] [--confidence pending|confirmed] [--agent dsh] [--detail "..."]
  python memory.py search 关键词 [--limit 10]
  python memory.py list [--kind decision] [--scope ...]
  python memory.py promote <id> | revoke <id>
  python memory.py rebuild
  python memory.py stats
"""
import argparse
import json
import os
import sys
import unicodedata
from datetime import datetime, timezone, timedelta

BASE = os.path.dirname(os.path.abspath(__file__))
STORE = os.path.join(BASE, "entries.jsonl")
INDEX = os.path.join(BASE, "INDEX.md")
TZ = timezone(timedelta(hours=8))
KINDS = ("preference", "decision", "fact", "task", "gotcha")
KIND_LABEL = {
    "preference": "偏好", "decision": "决定", "fact": "事实",
    "task": "任务", "gotcha": "踩坑",
}


def now():
    return datetime.now(TZ).strftime("%Y-%m-%dT%H:%M:%S%z")


def iter_entries():
    if not os.path.exists(STORE):
        return []
    out = []
    with open(STORE, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                out.append(json.loads(line))
            except json.JSONDecodeError:
                continue
    return out


def write_all(entries):
    tmp = STORE + ".tmp"
    with open(tmp, "w", encoding="utf-8", newline="\n") as f:
        for e in entries:
            f.write(json.dumps(e, ensure_ascii=False) + "\n")
    os.replace(tmp, STORE)


def next_id(entries):
    day = datetime.now(TZ).strftime("%Y%m%d")
    n = sum(1 for e in entries if e.get("id", "").startswith("m-" + day)) + 1
    return f"m-{day}-{n:03d}"


def short(e, width=88):
    text = e.get("text", "")
    if len(text) > width:
        text = text[: width - 1] + "…"
    tag = "✓" if e.get("confidence") == "confirmed" else "?"
    tags = ("#" + ",".join(e["tags"])) if e.get("tags") else ""
    return f"{tag} {e['id']} [{KIND_LABEL.get(e.get('kind'), e.get('kind'))}] {e.get('scope','-')} {text} {tags}".strip()


def cmd_add(a):
    entries = iter_entries()
    e = {
        "id": next_id(entries),
        "ts": now(),
        "kind": a.kind,
        "scope": a.scope,
        "text": a.text.strip(),
        "detail": (a.detail or "").strip(),
        "tags": [t.strip() for t in (a.tags or "").split(",") if t.strip()],
        "confidence": a.confidence,
        "status": "active",
        "source": a.source,
        "agent": a.agent,
    }
    if not e["text"]:
        print("拒绝：text 为空", file=sys.stderr)
        return 2
    entries.append(e)
    write_all(entries)
    print(f"已记录 {e['id']}（{KIND_LABEL[e['kind']]}/{e['scope']}，{e['confidence']}）")
    return 0


def match(e, q):
    hay = " ".join([
        e.get("text", ""), e.get("detail", ""), e.get("scope", ""),
        " ".join(e.get("tags", [])), KIND_LABEL.get(e.get("kind"), ""),
    ]).lower()
    q2 = unicodedata.normalize("NFKC", q).lower()
    return q2 in unicodedata.normalize("NFKC", hay)


def cmd_search(a):
    hits = [e for e in iter_entries() if e.get("status") != "revoked" and match(e, a.query)]
    hits.sort(key=lambda x: x.get("ts", ""), reverse=True)
    for e in hits[: a.limit]:
        print(short(e))
    if not hits:
        print("（无命中）")
    elif len(hits) > a.limit:
        print(f"…共 {len(hits)} 条，仅显示前 {a.limit} 条")
    return 0


def cmd_briefing(a):
    entries = [e for e in iter_entries() if e.get("status") != "revoked"]
    if a.scope and a.scope != "all":
        entries = [e for e in entries if e.get("scope") in (a.scope, "machine") or a.scope == "machine"]
    entries.sort(key=lambda x: x.get("ts", ""), reverse=True)
    conf = [e for e in entries if e.get("confidence") == "confirmed"]
    pend = [e for e in entries if e.get("confidence") != "confirmed"]
    print(f"# 共享记忆摘要（{len(conf)} 条已确认 / {len(pend)} 条待确认）")
    for e in conf[: a.limit]:
        print(short(e))
    if pend:
        print("-- 待确认（用 promote <id> 转正）--")
        for e in pend[: max(3, a.limit // 3)]:
            print(short(e))
    if not entries:
        print("（记忆库为空：重要决定用 memory.py add 记录）")
    return 0


def cmd_list(a):
    entries = [e for e in iter_entries() if e.get("status") != "revoked"]
    if a.kind:
        entries = [e for e in entries if e.get("kind") == a.kind]
    if a.scope:
        entries = [e for e in entries if e.get("scope") == a.scope]
    entries.sort(key=lambda x: x.get("ts", ""))
    for e in entries:
        print(short(e))
    print(f"-- 共 {len(entries)} 条 --")
    return 0


def cmd_promote(a):
    entries = iter_entries()
    for e in entries:
        if e["id"] == a.id:
            e["confidence"] = "confirmed"
            write_all(entries)
            print(f"已转正 {a.id}")
            return 0
    print(f"未找到 {a.id}", file=sys.stderr)
    return 1


def cmd_revoke(a):
    entries = iter_entries()
    for e in entries:
        if e["id"] == a.id:
            e["status"] = "revoked"
            e["confidence"] = "revoked"
            write_all(entries)
            print(f"已撤销 {a.id}（保留记录，不再进入摘要）")
            return 0
    print(f"未找到 {a.id}", file=sys.stderr)
    return 1


def cmd_stats(a):
    entries = iter_entries()
    active = [e for e in entries if e.get("status") != "revoked"]
    by_kind, by_scope = {}, {}
    for e in active:
        by_kind[e.get("kind")] = by_kind.get(e.get("kind"), 0) + 1
        by_scope[e.get("scope")] = by_scope.get(e.get("scope"), 0) + 1
    print(f"总计 {len(entries)} 条，有效 {len(active)} 条，已撤销 {len(entries)-len(active)} 条")
    print("按类型：" + "，".join(f"{KIND_LABEL.get(k,k)} {v}" for k, v in sorted(by_kind.items())))
    print("按范围：" + "，".join(f"{k} {v}" for k, v in sorted(by_scope.items())))
    print(f"文件：{STORE}（{os.path.getsize(STORE)} 字节）" if os.path.exists(STORE) else "文件：尚未创建")
    return 0


def cmd_rebuild(a):
    entries = [e for e in iter_entries() if e.get("status") != "revoked"]
    entries.sort(key=lambda x: x.get("ts", ""), reverse=True)
    conf = [e for e in entries if e.get("confidence") == "confirmed"]
    pend = [e for e in entries if e.get("confidence") != "confirmed"]
    lines = [
        "# 共享记忆索引（自动生成，勿手工编辑）",
        "",
        f"更新时间：{now()}　|　已确认 {len(conf)} 条　待确认 {len(pend)} 条",
        "",
        "> 数据源 entries.jsonl；用 `python memory.py add/search/briefing` 读写。",
        "",
        "## 已确认",
        "",
    ]
    scopes = {}
    for e in conf:
        scopes.setdefault(e.get("scope", "-"), []).append(e)
    if not scopes:
        lines.append("（暂无）")
    for scope in sorted(scopes):
        lines.append(f"### {scope}")
        lines.append("")
        for e in scopes[scope]:
            lines.append(f"- `{e['ts'][:10]}` **{KIND_LABEL.get(e.get('kind'), e.get('kind'))}**：{e.get('text','')}")
            if e.get("detail"):
                lines.append(f"  - 详情：{e['detail']}")
        lines.append("")
    lines.append("## 待确认")
    lines.append("")
    if not pend:
        lines.append("（无）")
    for e in pend:
        lines.append(f"- `{e['ts'][:10]}` {e.get('text','')}")
    lines.append("")
    with open(INDEX, "w", encoding="utf-8", newline="\n") as f:
        f.write("\n".join(lines))
    print(f"已重建 {INDEX}（{len(conf)} 条已确认，{len(pend)} 条待确认）")
    return 0


def main():
    p = argparse.ArgumentParser(description="共享记忆仓库")
    sub = p.add_subparsers(dest="cmd")

    b = sub.add_parser("briefing", help="会话开始时的摘要")
    b.add_argument("--scope", default="machine")
    b.add_argument("--limit", type=int, default=20)
    b.set_defaults(func=cmd_briefing)

    ad = sub.add_parser("add", help="新增一条记忆")
    ad.add_argument("--kind", required=True, choices=KINDS)
    ad.add_argument("--scope", default="machine")
    ad.add_argument("--text", required=True)
    ad.add_argument("--detail", default="")
    ad.add_argument("--tags", default="")
    ad.add_argument("--confidence", default="confirmed", choices=("confirmed", "pending"))
    ad.add_argument("--source", default="session")
    ad.add_argument("--agent", default="dsh")
    ad.set_defaults(func=cmd_add)

    s = sub.add_parser("search", help="关键词检索")
    s.add_argument("query")
    s.add_argument("--limit", type=int, default=10)
    s.set_defaults(func=cmd_search)

    l = sub.add_parser("list", help="按类型/范围列出")
    l.add_argument("--kind", choices=KINDS)
    l.add_argument("--scope")
    l.set_defaults(func=cmd_list)

    pr = sub.add_parser("promote", help="待确认转正")
    pr.add_argument("id")
    pr.set_defaults(func=cmd_promote)

    rv = sub.add_parser("revoke", help="撤销一条（保留记录）")
    rv.add_argument("id")
    rv.set_defaults(func=cmd_revoke)

    st = sub.add_parser("stats", help="统计")
    st.set_defaults(func=cmd_stats)

    rb = sub.add_parser("rebuild", help="重建 INDEX.md")
    rb.set_defaults(func=cmd_rebuild)

    a = p.parse_args()
    if not getattr(a, "func", None):
        p.print_help()
        return 2
    return a.func(a)


if __name__ == "__main__":
    sys.exit(main())
