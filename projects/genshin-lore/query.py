"""Local, bounded retrieval of sourced Genshin reference cards. No dependencies/network."""
import argparse
import json
from pathlib import Path
import sys
import unicodedata
from collections import Counter
from story_index import read_stories, validate_stories, check_index
from timeline import read_timeline, validate_timeline, participants

ROOT = Path(__file__).resolve().parent
SPOILERS = {"none": 0, "minor": 1, "major": 2, "all": 2}
SPOILER_LABELS = {"none": "无剧情揭示", "minor": "轻度剧透", "major": "重大剧透"}
SOURCE_KINDS = {"official", "developer_article", "community_wiki", "community_summary", "community_transcription", "community_post"}


def read_data(root=ROOT):
    registry = json.loads((root / "sources.json").read_text(encoding="utf-8"))
    entries = [json.loads(line) for line in (root / "entries.jsonl").read_text(encoding="utf-8").splitlines() if line.strip()]
    patterns = json.loads((root / "patterns.json").read_text(encoding="utf-8"))
    # Keep the original source verification date; expansion is not a recheck of every old source.
    expansion = json.loads((root / "expansion_sources.json").read_text(encoding="utf-8"))
    for source in registry["sources"]:
        source.setdefault("checked_at", registry["checked_at"])
    registry["baseline_checked_at"] = registry["checked_at"]
    registry["checked_at"] = expansion["checked_at"]
    registry["sources"].extend(expansion["sources"])
    entries.extend(read_jsonl(root / "entities.jsonl"))
    characters = json.loads((root / "character_sources.json").read_text(encoding="utf-8"))
    registry["sources"].extend(characters["sources"])
    registry["checked_at"] = max(registry["checked_at"], characters["checked_at"])
    entries.extend(read_jsonl(root / "playable_entities.jsonl"))
    timeline_registry = json.loads((root / "timeline_sources.json").read_text(encoding="utf-8"))
    registry["sources"].extend(timeline_registry["sources"])
    registry["checked_at"] = max(registry["checked_at"], timeline_registry["checked_at"])
    entries.extend(read_jsonl(root / "timeline_entities.jsonl"))
    # Aliases belong to the same identity; elemental/gender variants are not new people.
    by_id = {e["id"]: e for e in entries}
    roster = json.loads((root / "character_roster.json").read_text(encoding="utf-8"))
    for character in roster["characters"]:
        entity = by_id[character["entity"]]
        entity["aliases"] = sorted(set(entity["aliases"] + character["aliases"]))
    return registry, entries, patterns


def read_jsonl(path):
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def read_atlas(root=ROOT):
    return read_jsonl(root / "quests.jsonl"), read_jsonl(root / "relations.jsonl")


def validate_atlas(registry, entries, quests, relations):
    errors = validate(registry, entries + quests + relations, [])
    entities = {e["id"]: e for e in entries}
    quest_map = {q["id"]: q for q in quests}
    for card in quests + relations:
        refs = []
        if card in quests:
            if card.get("quest_type") not in {"魔神任务", "世界任务", "传说任务", "活动任务", "地图事件"}:
                errors.append(f"{card['id']}: invalid quest type")
            if card.get("coverage") not in {"流程摘要", "官方概要"}:
                errors.append(f"{card['id']}: invalid coverage")
            for field in ("availability", "cast", "places", "prerequisites", "stages", "outcome", "adaptation"):
                if not card.get(field):
                    errors.append(f"{card['id']}: missing {field}")
            refs = [c.get("entity") for c in card.get("cast", [])] + card.get("places", [])
            if any(not c.get("role") for c in card.get("cast", [])):
                errors.append(f"{card['id']}: missing cast role")
            adaptation = card.get("adaptation", {})
            if adaptation.get("kind") != "original_adaptation":
                errors.append(f"{card['id']}: adaptation must be labelled original")
            for field in ("hook", "loop", "avoid", "acceptance"):
                if not adaptation.get(field):
                    errors.append(f"{card['id']}: adaptation missing {field}")
            outcome = card.get("outcome", {})
            if outcome.get("status") not in {"documented", "not_reviewed"} or not outcome.get("summary"):
                errors.append(f"{card['id']}: invalid outcome evidence")
            if card.get("coverage") == "官方概要" and outcome.get("status") != "not_reviewed":
                errors.append(f"{card['id']}: preview cannot establish an ending")
            if not card.get("prerequisites", {}).get("note"):
                errors.append(f"{card['id']}: missing prerequisite scope")
            for ref in card.get("prerequisites", {}).get("quest_ids", []):
                if ref not in quest_map:
                    errors.append(f"{card['id']}: unresolved prerequisite {ref}")
                elif SPOILERS.get(quest_map[ref].get("spoiler"), 99) > SPOILERS.get(card.get("spoiler"), -1):
                    errors.append(f"{card['id']}: prerequisite spoiler exceeds card label")
        else:
            refs = [card.get("subject"), card.get("object")]
            if not card.get("relation_type") or refs[0] == refs[1]:
                errors.append(f"{card['id']}: invalid directed relation")
        for ref in refs:
            if ref not in entities:
                errors.append(f"{card['id']}: unresolved entity {ref}")
            elif SPOILERS.get(entities[ref].get("spoiler"), 99) > SPOILERS.get(card.get("spoiler"), -1):
                errors.append(f"{card['id']}: entity spoiler exceeds card label")
        if not card.get("checked_at"):
            errors.append(f"{card['id']}: missing checked_at")
    visiting, visited = set(), set()

    def visit(ref):
        if ref in visiting:
            errors.append(f"{ref}: prerequisite cycle")
            return
        if ref in visited or ref not in quest_map:
            return
        visiting.add(ref)
        for parent in quest_map[ref].get("prerequisites", {}).get("quest_ids", []):
            visit(parent)
        visiting.remove(ref)
        visited.add(ref)

    for ref in quest_map:
        visit(ref)
    return errors


def resolve_entity(value, entries, spoilers):
    key = normalize(value)
    found = [e for e in entries if SPOILERS[e["spoiler"]] <= SPOILERS[spoilers]
             and key in {normalize(v) for v in [e["id"], e["title"], *e["aliases"]]}]
    if len(found) != 1:
        raise ValueError("实体名称未唯一命中可见条目；请使用准确 ID，并检查 --spoilers。")
    return found[0]["id"]


def linked_to(card, entity_id, entity_map=None):
    if card.get('node_kind') in {'quest', 'series', 'hangout_act'}:
        return entity_id in participants(card, entity_map or {})
    return entity_id in [card.get("entity"), card.get("subject"), card.get("object"),
                         *card.get("places", []), *[c["entity"] for c in card.get("cast", [])]]


def normalize(value):
    return unicodedata.normalize("NFKC", value).casefold()


def read_community(root=ROOT):
    registry = json.loads((root / "community_sources.json").read_text(encoding="utf-8"))
    entries = [json.loads(line) for line in (root / "community.jsonl").read_text(encoding="utf-8").splitlines() if line.strip()]
    return registry, entries


def validate_community(registry, entries):
    errors = validate(registry, entries, [])
    for source in registry["sources"]:
        if not source.get("platform") or type(source.get("official_community")) is not bool:
            errors.append(f"{source['id']}: missing platform/host classification")
        if source.get("author_role") not in {"player", "official", "community_editors", "unverified"}:
            errors.append(f"{source['id']}: invalid author role")
        if source["kind"] == "official" and source.get("author_role") != "official":
            errors.append(f"{source['id']}: official host does not establish official authorship")
    for entry in entries:
        for key in ("origin_sources", "origin_status", "origin_note", "circulation", "tone", "use", "avoid", "example_original", "player_test"):
            if not entry.get(key):
                errors.append(f"{entry['id']}: missing {key}")
        if entry.get("origin_status") not in {"official_context", "community_context", "needs_primary_check"}:
            errors.append(f"{entry['id']}: invalid origin status")
        circulation = entry.get("circulation", {})
        refs = set(entry.get("sources", []))
        if not set(entry.get("origin_sources", [])) <= refs or not set(circulation.get("sources", [])) <= refs:
            errors.append(f"{entry['id']}: provenance references absent from source list")
        if circulation.get("assessment") not in {"single_sample", "multiple_posts", "cross_platform_samples"}:
            errors.append(f"{entry['id']}: invalid circulation evidence level")
        if not circulation.get("sources") or not circulation.get("note"):
            errors.append(f"{entry['id']}: missing circulation evidence/limits")
        source_map = {s["id"]: s for s in registry["sources"]}
        observed_sources = circulation.get("sources", [])
        if circulation.get("assessment") == "multiple_posts" and len(set(observed_sources)) < 2:
            errors.append(f"{entry['id']}: multiple_posts needs two sources")
        if circulation.get("assessment") == "cross_platform_samples":
            platforms = {source_map.get(s, {}).get("platform") for s in observed_sources}
            if None in platforms or len(platforms) < 2:
                errors.append(f"{entry['id']}: cross-platform claim lacks evidence")
        # No unlabelled engagement counts. Introduce a reviewed metric schema before adding them.
        if circulation.get("metrics") is not None:
            errors.append(f"{entry['id']}: engagement metrics not supported without a reviewed schema")
    return errors


def validate(registry, entries, patterns):
    errors = []
    sources = registry["sources"]
    for label, records in [("source", sources), ("entry", entries), ("pattern", patterns)]:
        ids = [r.get("id") for r in records]
        if None in ids or len(ids) != len(set(ids)):
            errors.append(f"{label}: missing/duplicate id")
    source_ids = {s["id"] for s in sources}
    entry_map = {e["id"]: e for e in entries}
    for source in sources:
        if source.get("kind") not in SOURCE_KINDS or source.get("access") not in {"page", "search_excerpt"}:
            errors.append(f"{source['id']}: invalid evidence metadata")
        if not source.get("url", "").startswith("https://") or not source.get("scope"):
            errors.append(f"{source['id']}: missing URL/scope")
    required = {"id", "title", "aliases", "category", "region", "spoiler", "timeline", "summary", "sources", "tags", "boundary"}
    for entry in entries:
        if not required <= entry.keys() or any(not entry.get(k) for k in required - {"aliases", "tags"}):
            errors.append(f"{entry['id']}: missing required field")
        if entry.get("spoiler") not in SPOILER_LABELS:
            errors.append(f"{entry['id']}: invalid spoiler level")
        if not set(entry.get("sources", [])) <= source_ids:
            errors.append(f"{entry['id']}: unresolved source")
    for pattern in patterns:
        if pattern.get("kind") != "original_adaptation":
            errors.append(f"{pattern['id']}: must label original adaptation")
        for field in ("title", "premise", "loop", "localization", "sample_original_line", "implementation", "acceptance", "basis"):
            if not pattern.get(field):
                errors.append(f"{pattern['id']}: missing {field}")
        level = SPOILERS.get(pattern.get("spoiler"), -1)
        if pattern.get("spoiler") not in SPOILER_LABELS:
            errors.append(f"{pattern['id']}: invalid spoiler level")
        for ref in pattern.get("basis", []):
            if ref not in entry_map:
                errors.append(f"{pattern['id']}: unresolved basis {ref}")
            elif SPOILERS.get(entry_map[ref].get("spoiler"), 99) > level:
                errors.append(f"{pattern['id']}: basis spoiler exceeds pattern label")
    return errors


def search(entries, query="", region=None, category=None, spoilers="none", entry_id=None):
    terms = normalize(query).split()
    ranked = []
    for entry in entries:
        if SPOILERS[entry["spoiler"]] > SPOILERS[spoilers]:
            continue
        if entry_id and entry["id"] != entry_id:
            continue
        if region and entry["region"] != region:
            continue
        if category and entry["category"] != category:
            continue
        haystack = normalize(" ".join(str(v) for k, v in entry.items() if k != "sources"))
        if not all(term in haystack for term in terms):
            continue
        headline = normalize(" ".join([entry["title"], *entry["aliases"], *entry["tags"]]))
        score = sum(3 if term in headline else 1 for term in terms)
        ranked.append((score, entry))
    return [e for _, e in sorted(ranked, key=lambda pair: (-pair[0], pair[1]["id"]))]


def main(argv=None):
    parser = argparse.ArgumentParser(description="原神本土化资料检索：关键词用空格分隔（全部匹配），默认隐藏剧情揭示。")
    parser.add_argument("query", nargs="?", default="")
    parser.add_argument("--region")
    parser.add_argument("--category")
    parser.add_argument("--spoilers", choices=SPOILERS, default="none")
    parser.add_argument("--id", dest="entry_id")
    parser.add_argument("--limit", type=int, default=5)
    parser.add_argument("--json", action="store_true", dest="as_json")
    parser.add_argument("--stats", action="store_true")
    parser.add_argument("--validate", action="store_true")
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--patterns", action="store_true", help="检索原创设计参考；不是原作剧情")
    mode.add_argument("--community", action="store_true", help="检索玩家梗与名场面；与原作事实分开")
    mode.add_argument("--quests", action="store_true", help="检索任务资料卡，含独立标注的原创改编建议")
    mode.add_argument("--relations", action="store_true", help="检索有方向、时点和来源的人物/组织/地域关系")
    mode.add_argument("--profiles", action="store_true", help="检索人物资料卡及故事、任务和关系入口")
    mode.add_argument("--stories", action="store_true", help="检索人物故事章节主题提要及来源定位")
    mode.add_argument("--timeline", action="store_true", help="检索任务、邀约和活动的证据时间线节点")
    mode.add_argument("--branches", action="store_true", help="检索邀约结局分支与条件证据等级")
    mode.add_argument("--event-relations", action="store_true", help="检索由叙事证据支持的任务人物关系")
    parser.add_argument("--entity", help="用于任务、关系、人物或故事；准确实体 ID、标题或别名")
    parser.add_argument("--relation-type", help="仅用于关系，如 师徒、成员、位于")
    parser.add_argument("--tone", choices=["轻松", "温暖", "燃", "悲伤"], help="仅筛选玩家文化条目的情绪用途")
    args = parser.parse_args(argv)
    if not 1 <= args.limit <= 20:
        parser.error("--limit 必须为 1–20")
    if args.tone and not args.community:
        parser.error("--tone 需要 --community")
    if args.entity and not (args.quests or args.relations or args.profiles or args.stories or args.timeline or args.branches or args.event_relations):
        parser.error("--entity 需要一个人物、关系或时间线检索模式")
    if args.relation_type and not (args.relations or args.event_relations):
        parser.error("--relation-type 需要 --relations 或 --event-relations")
    try:
        registry, entries, patterns = read_data()
        # Keep the validated identity map for this invocation. Re-reading it for
        # every candidate made character timeline queries perform 1,208 disk reads.
        entity_map = {entry["id"]: entry for entry in entries}
        errors = validate(registry, entries, patterns)
        quests, relations = read_atlas()
        errors.extend(validate_atlas(registry, entries, quests, relations))
        roster, profiles, stories = read_stories()
        errors.extend(validate(registry, entries + quests + relations + profiles + stories, []))
        errors.extend(validate_stories(registry, entries, roster, profiles, stories))
        events, timelines, branches, event_relations, timeline_coverage = read_timeline()
        errors.extend(validate(registry, entries + events + timelines + branches + event_relations, []))
        errors.extend(validate_timeline(registry, entries, roster, events, timelines, branches, event_relations, timeline_coverage))
        if args.stories or args.profiles or args.timeline or args.branches or args.event_relations or args.stats or args.validate:
            errors.extend(check_index())
        community_registry, community_entries = (None, [])
        if args.community or args.stats or args.validate:
            community_registry, community_entries = read_community()
            errors.extend(validate_community(community_registry, community_entries))
            if {e['id'] for e in entries + quests + relations + profiles + stories} & {e['id'] for e in community_entries}:
                errors.append("fact/community ids overlap")
        localization_kits = []
        if args.stats or args.validate:
            from localization import read_context, read_kits, validate_kits
            localization_cards, _ = read_context()
            localization_kits = read_kits()
            errors.extend(validate_kits(localization_kits, localization_cards))
        if errors:
            raise ValueError("; ".join(errors))
    except (OSError, ValueError, KeyError, TypeError) as exc:
        print(f"资料库错误：{exc}", file=sys.stderr)
        return 1
    if args.validate:
        print(f"PASS: {len(entries)} fact/entities, {len(registry['sources'])} fact sources, {len(patterns)} patterns; {len(quests)} quests, {len(relations)} relations; {roster['playable_count']} playable identities, {len(profiles)} profiles, {len(stories)} story sections; {len(events)} timeline events, {len(branches)} hangout endings, {len(event_relations)} narrative relations; {len(localization_kits)} localization kits; {len(community_entries)} community entries, {len(community_registry['sources'])} community sources; IDs/references/spoilers/index valid")
        return 0
    if args.stats:
        print(json.dumps({"entries": len(entries), "sources": len(registry["sources"]), "patterns": len(patterns), "localization_kits": len(localization_kits), "quests": len(quests), "quest_coverage": dict(Counter(q["coverage"] for q in quests)), "relations": len(relations), "relation_categories": dict(Counter(r["category"] for r in relations)), "timeline": {"events": len(events), "evidence_depth": dict(Counter(e["coverage"] for e in events)), "hangout_endings": len(branches), "narrative_relations": len(event_relations), "coverage": "partial quest progression; no inferred world chronology or complete appearance corpus"}, "regions": dict(Counter(e["region"] for e in entries)), "spoilers": dict(Counter(e["spoiler"] for e in entries)), "checked_at": registry["checked_at"], "characters": {"playable_identities": roster["playable_count"], "profiles": len(profiles), "npc_profiles": sum(not p["playable"] for p in profiles), "story_sections": len(stories), "availability": dict(Counter(s["availability"] for s in stories)), "coverage": "chapter topic summaries and source locators; not a complete chronology of all appearances"}, "community": {"entries": len(community_entries), "sources": len(community_registry["sources"]), "source_platforms": dict(Counter(s["platform"] for s in community_registry["sources"])), "checked_at": community_registry["checked_at"]}, "coverage": "selected sourced cards; not complete/latest-story coverage; community samples are not a popularity ranking"}, ensure_ascii=False, indent=2))
        return 0
    entity_id = None
    if args.entity:
        try:
            entity_id = resolve_entity(args.entity, entries, args.spoilers)
        except ValueError as exc:
            parser.error(str(exc))
    if args.quests or args.relations or args.profiles or args.stories or args.timeline or args.branches or args.event_relations:
        entries = quests if args.quests else relations if args.relations else profiles if args.profiles else stories if args.stories else events if args.timeline else branches if args.branches else event_relations
        if entity_id:
            entries = [e for e in entries if linked_to(e, entity_id, entity_map)]
        if args.relation_type:
            entries = [e for e in entries if e["relation_type"] == args.relation_type]
    elif args.community:
        registry, entries = community_registry, community_entries
        if args.tone:
            entries = [e for e in entries if e["tone"] == args.tone]
    source_map = {s["id"]: s for s in registry["sources"]}
    entry_map = {e["id"]: e for e in entries}
    if args.patterns:
        if args.category:
            parser.error("--category 仅适用于事实卡片")
        terms = normalize(args.query).split()
        matches = [p for p in patterns if SPOILERS[p["spoiler"]] <= SPOILERS[args.spoilers]
                   and (not args.entry_id or p["id"] == args.entry_id)
                   and (not args.region or any(entry_map[i]["region"] == args.region for i in p["basis"]))
                   and all(t in normalize(json.dumps(p, ensure_ascii=False)) for t in terms)]
        results = []
        for pattern in matches[:args.limit]:
            cited = sorted({s for ref in pattern["basis"] for s in entry_map[ref]["sources"]})
            results.append({**pattern, "source_details": [source_map[s] for s in cited]})
    else:
        matches = search(entries, args.query, args.region, args.category, args.spoilers, args.entry_id)
        results = [{**e, "source_details": [source_map[s] for s in e["sources"]]} for e in matches[:args.limit]]
    if args.as_json:
        print(json.dumps({"collection": "quests" if args.quests else "relations" if args.relations else "profiles" if args.profiles else "stories" if args.stories else "timeline" if args.timeline else "branches" if args.branches else "event_relations" if args.event_relations else "community" if args.community else "patterns" if args.patterns else "facts", "matched": len(matches), "shown": len(results), "spoiler_filter": args.spoilers, "results": results}, ensure_ascii=False, indent=2))
    else:
        print(f"匹配 {len(matches)} 条，显示 {len(results)} 条；剧透范围={args.spoilers}。")
        if not results:
            print("没有符合条件的已收录条目；这不表示原作不存在。可拆分关键词或按需补查来源。")
        for item in results:
            print(f"\n[{item['id']}] {item['title']} 【{SPOILER_LABELS[item['spoiler']]}】")
            if args.patterns:
                print("性质：原创改编，不是原作已有任务或对白")
                for key in ("premise", "loop", "localization", "sample_original_line", "implementation", "acceptance"):
                    print(f"{key}: {item[key]}")
                print("事实依据 ID：" + ", ".join(item["basis"]))
            else:
                label = "玩家文化摘要" if args.community else "事实摘要"
                print(f"时点：{item['timeline']}\n{label}：{item['summary']}\n边界：{item['boundary']}")
                if args.relations or args.event_relations:
                    print(f"方向：{item['subject']} --{item['relation_type']}--> {item['object']}")
                if args.event_relations:
                    print(f"关系时点：{item['time_scope']}")
                    print("事件依据：" + ", ".join(item["event_ids"]))
                if args.timeline:
                    print(f"核对深度：{item['coverage']}；节点类型：{item['node_kind']}")
                    print("时序：仅局部任务进度；检索顺序不是世界内编年。")
                    print("已核对的进度前置：" + (", ".join(item["progression_predecessor_ids"]) or "未建立"))
                    print("解锁条件边界：" + item["unlock_logic_note"])
                if args.branches:
                    print(f"条件概述 [{item['condition_evidence']}]：{item['condition']}")
                    print(f"所属邀约：{item['act_event_id']}；结局标题为编辑检索标签。")
                    print("同次路线互斥结局：" + ", ".join(item["mutually_exclusive_with"]))
                if args.stories or args.profiles:
                    print(f"覆盖：{item['coverage']}；人物：{item['entity']}")
                if args.stories:
                    print(f"来源状态：{item['availability']}；章节：{item['section_title']}")
                    print("来源明确列出的解锁条件：" + "；".join(item["unlock_conditions"]))
                if args.quests:
                    print(f"核对深度：{item['coverage']}；{item['availability']}")
                    print("人物职责：" + "；".join(f"{c['entity']}（{c['role']}）" for c in item["cast"]))
                    print("地点：" + ", ".join(item["places"]))
                    print("前置：" + item["prerequisites"]["note"])
                    print("已核对阶段：" + " → ".join(item["stages"]))
                    print(f"收尾 [{item['outcome']['status']}]：{item['outcome']['summary']}")
                    print("原创改编建议（不是原作任务或对白）：")
                    for key in ("hook", "loop", "avoid", "acceptance"):
                        print(f"  {key}: {item['adaptation'][key]}")
                if args.community:
                    print(f"出处状态：{item['origin_status']}；{item['origin_note']}")
                    print(f"传播证据：{item['circulation']['assessment']}；{item['circulation']['note']}")
                    print(f"用途（设计建议）：{item['use']}\n避免：{item['avoid']}\n原创示例：{item['example_original']}\n试玩观察：{item['player_test']}")
            for source in item["source_details"]:
                attribution = f"; {source['platform']}; author={source['author_role']}" if args.community else ""
                print(f"来源 [{source['kind']}; {source['access']}{attribution}] {source['title']}: {source['url']}")
    return 0


if __name__ == "__main__":
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8")
    raise SystemExit(main())
