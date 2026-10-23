"""Targeted behavior tests; no game connection or web requests."""
import copy
from contextlib import redirect_stderr, redirect_stdout
import io
import json
from pathlib import Path
import subprocess
import sys
import unittest
from unittest.mock import patch

import query
from query import ROOT, read_data, read_community, read_atlas, search, validate, validate_community, validate_atlas, resolve_entity


class LoreTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.registry, cls.entries, cls.patterns = read_data()

    def test_reference_integrity(self):
        self.assertEqual(validate(self.registry, self.entries, self.patterns), [])

    def test_broken_source_is_rejected(self):
        entries = copy.deepcopy(self.entries)
        entries[0]["sources"] = ["does-not-exist"]
        self.assertTrue(any("unresolved source" in e for e in validate(self.registry, entries, self.patterns)))

    def test_region_and_chinese_terms(self):
        found = search(self.entries, "璃月 委托", region="璃月")
        self.assertIn("org.guild", [e["id"] for e in found])
        self.assertTrue(all(e["region"] == "璃月" for e in found))

    def test_english_alias_casefold(self):
        self.assertEqual(search(self.entries, "LYNETTE")[0]["id"], "character.lynette")

    def test_spoilers_hidden_even_by_id(self):
        self.assertEqual(search(self.entries, entry_id="quest.liyue-osial"), [])
        self.assertEqual(search(self.entries, spoilers="minor", entry_id="quest.liyue-osial"), [])
        self.assertEqual(search(self.entries, spoilers="all", entry_id="quest.liyue-osial")[0]["spoiler"], "major")

    def test_default_hides_all_story_reveals(self):
        self.assertTrue(all(e["spoiler"] == "none" for e in search(self.entries)))

    def test_pattern_cannot_understate_source_spoiler(self):
        patterns = copy.deepcopy(self.patterns)
        patterns[0]["basis"].append("quest.liyue-osial")
        self.assertTrue(any("basis spoiler exceeds" in e for e in validate(self.registry, self.entries, patterns)))

    def test_no_match_does_not_fabricate(self):
        self.assertEqual(search(self.entries, "__not_in_this_library__"), [])

    def run_cli(self, *args):
        return subprocess.run([sys.executable, str(ROOT / "query.py"), *args], cwd=Path.home(), text=True, encoding="utf-8", capture_output=True)

    def test_cli_portable_bounded_and_cited(self):
        result = self.run_cli("--json", "--limit", "2")
        self.assertEqual(result.returncode, 0, result.stderr)
        payload = json.loads(result.stdout)
        self.assertEqual(payload["shown"], 2)
        self.assertTrue(all(e["source_details"] for e in payload["results"]))

    def test_cli_spoiler_output_labels_chapter(self):
        result = self.run_cli("--id", "quest.liyue-osial", "--spoilers", "all")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("重大剧透", result.stdout)
        self.assertIn("迫近的客星", result.stdout)

    def test_cli_patterns_keep_original_label_and_sources(self):
        result = self.run_cli("--patterns", "--region", "纳塔", "--json")
        self.assertEqual(result.returncode, 0, result.stderr)
        records = json.loads(result.stdout)["results"]
        self.assertEqual(len(records), 1)
        self.assertEqual(records[0]["kind"], "original_adaptation")
        self.assertTrue(records[0]["source_details"])

    def test_cli_limit_and_empty_json(self):
        invalid = self.run_cli("--limit", "21")
        self.assertNotEqual(invalid.returncode, 0)
        self.assertIn("必须为", invalid.stderr)
        result = self.run_cli("__not_in_this_library__", "--json")
        self.assertEqual(json.loads(result.stdout)["results"], [])

    def test_community_integrity(self):
        registry, entries = read_community()
        self.assertEqual(validate_community(registry, entries), [])

    def test_community_is_separate_from_canon(self):
        self.assertEqual(search(self.entries, entry_id="meme.emergency-food"), [])
        result = self.run_cli("应急食品", "--community", "--json")
        data = json.loads(result.stdout)
        self.assertEqual(data["collection"], "community")
        self.assertEqual(data["results"][0]["id"], "meme.emergency-food")
        self.assertIn("circulation", data["results"][0])

    def test_community_spoiler_and_tone_filters(self):
        hidden = json.loads(self.run_cli("--community", "--id", "scene.sinners-finale", "--json").stdout)
        self.assertEqual(hidden["results"], [])
        shown = json.loads(self.run_cli("--community", "--tone", "悲伤", "--spoilers", "all", "--json").stdout)
        self.assertTrue(shown["results"])
        self.assertTrue(all(e["tone"] == "悲伤" and e["spoiler"] == "major" for e in shown["results"]))

    def test_host_is_not_official_authorship(self):
        registry, entries = read_community()
        registry["sources"][0]["kind"] = "official"
        self.assertTrue(any("official host" in e for e in validate_community(registry, entries)))

    def test_circulation_claim_requires_multiple_platforms(self):
        registry, entries = read_community()
        entries[0]["circulation"]["sources"] = ["reddit-food"]
        self.assertTrue(any("cross-platform" in e for e in validate_community(registry, entries)))

    def test_community_output_preserves_uncertainty(self):
        result = self.run_cli("--community", "--id", "meme.fungus-name")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("needs_primary_check", result.stdout)
        self.assertIn("single_sample", result.stdout)
        self.assertIn("author=player", result.stdout)
        self.assertIn("原创示例", result.stdout)

    def test_incompatible_modes_are_rejected(self):
        self.assertNotEqual(self.run_cli("--community", "--patterns").returncode, 0)
        self.assertNotEqual(self.run_cli("--tone", "轻松").returncode, 0)

    def test_atlas_reference_integrity(self):
        quests, relations = read_atlas()
        self.assertEqual(validate_atlas(self.registry, self.entries, quests, relations), [])

    def test_unknown_relation_endpoint_rejected(self):
        quests, relations = read_atlas()
        relations[0]["object"] = "missing.person"
        errors = validate_atlas(self.registry, self.entries, quests, relations)
        self.assertTrue(any("unresolved entity" in e for e in errors))

    def test_unknown_quest_participant_rejected(self):
        quests, relations = read_atlas()
        quests[0]["cast"][0]["entity"] = "missing.person"
        self.assertTrue(any("unresolved entity" in e for e in validate_atlas(self.registry, self.entries, quests, relations)))

    def test_relation_cannot_leak_endpoint_spoiler(self):
        quests, relations = read_atlas()
        edge = next(r for r in relations if r["id"] == "rel.jeht-benben")
        edge["spoiler"] = "none"
        self.assertTrue(any("entity spoiler exceeds" in e for e in validate_atlas(self.registry, self.entries, quests, relations)))

    def test_preview_cannot_claim_verified_ending(self):
        quests, relations = read_atlas()
        next(q for q in quests if q["coverage"] == "官方概要")["outcome"]["status"] = "documented"
        self.assertTrue(any("preview cannot establish" in e for e in validate_atlas(self.registry, self.entries, quests, relations)))

    def test_adaptation_must_be_explicit(self):
        quests, relations = read_atlas()
        quests[0]["adaptation"]["kind"] = "canon"
        self.assertTrue(any("labelled original" in e for e in validate_atlas(self.registry, self.entries, quests, relations)))

    def test_prerequisite_cycles_rejected(self):
        quests, relations = read_atlas()
        next(q for q in quests if q["id"] == "questcard.golden-slumber")["prerequisites"]["quest_ids"] = ["questcard.jeht-oasis"]
        self.assertTrue(any("prerequisite cycle" in e for e in validate_atlas(self.registry, self.entries, quests, relations)))

    def test_entity_filter_matches_either_endpoint_preserving_direction(self):
        result = self.run_cli("--relations", "--entity", "CHILDE", "--relation-type", "师徒", "--spoilers", "all", "--json")
        self.assertEqual(result.returncode, 0, result.stderr)
        data = json.loads(result.stdout)
        self.assertEqual(data["collection"], "relations")
        self.assertEqual(len(data["results"]), 1)
        self.assertEqual(data["results"][0]["subject"], "character.skirk")
        self.assertEqual(data["results"][0]["object"], "character.tartaglia")
        self.assertTrue(data["results"][0]["source_details"])

    def test_quest_entity_filter_and_coverage(self):
        result = self.run_cli("--quests", "--entity", "婕德", "--spoilers", "all", "--json")
        self.assertEqual(result.returncode, 0, result.stderr)
        data = json.loads(result.stdout)
        self.assertEqual({q["id"] for q in data["results"]}, {"questcard.golden-slumber", "questcard.jeht-oasis"})
        shown = self.run_cli("--quests", "--id", "questcard.meropide", "--spoilers", "all")
        self.assertIn("not_reviewed", shown.stdout)
        self.assertIn("原创改编建议", shown.stdout)

    def test_new_modes_respect_spoilers_and_options(self):
        hidden = self.run_cli("--relations", "--id", "rel.skirk-childe", "--json")
        self.assertEqual(json.loads(hidden.stdout)["results"], [])
        self.assertNotEqual(self.run_cli("--quests", "--relations").returncode, 0)
        self.assertNotEqual(self.run_cli("--entity", "婕德").returncode, 0)
        self.assertNotEqual(self.run_cli("--quests", "--relation-type", "师徒").returncode, 0)

    def test_entity_resolution_does_not_leak_hidden_entities(self):
        with self.assertRaises(ValueError):
            resolve_entity("婕德", self.entries, "none")
        with self.assertRaises(ValueError):
            resolve_entity("__not_present__", self.entries, "all")
        ambiguous = [self.entries[0], {**self.entries[0], "id": "other.entity"}]
        with self.assertRaises(ValueError):
            resolve_entity(self.entries[0]["title"], ambiguous, "all")

    def test_duplicate_id_across_collections_rejected(self):
        quests, relations = read_atlas()
        quests[0]["id"] = self.entries[0]["id"]
        self.assertTrue(any("duplicate id" in e for e in validate_atlas(self.registry, self.entries, quests, relations)))

    def test_timeline_entity_map_is_read_once(self):
        output = io.StringIO()
        with patch.object(query, "read_data", wraps=query.read_data) as read, redirect_stdout(output):
            result = query.main(["--timeline", "--entity", "雷电将军", "--spoilers", "all", "--json", "--limit", "2"])
        self.assertEqual(result, 0)
        self.assertEqual(read.call_count, 1)
        data = json.loads(output.getvalue())
        self.assertEqual(data["shown"], 2)
        self.assertGreater(data["matched"], data["shown"])

    def test_timeline_aggregate_keeps_original_identity_and_filters(self):
        # The event names Ei specifically; the Shogun aggregate is a retrieval
        # convenience and must not replace the source's actual cast identity.
        result = self.run_cli("--timeline", "--entity", "雷电将军", "--id", "event.bwiki-4fef4ab00af88910", "--region", "稻妻", "--spoilers", "all", "--json")
        self.assertEqual(result.returncode, 0, result.stderr)
        data = json.loads(result.stdout)
        self.assertEqual(data["collection"], "timeline")
        self.assertEqual(data["shown"], 1)
        event = data["results"][0]
        self.assertEqual(event["title"], "试胆大会")
        self.assertIn("aspect.raiden-ei", [c["entity"] for c in event["cast"]])
        self.assertNotIn("character.shogun", [c["entity"] for c in event["cast"]])
        self.assertEqual(event["region"], "稻妻")
        self.assertIsNone(event["in_world_date"])
        self.assertTrue(event["source_details"])

    def test_timeline_collections_are_bounded_cited_and_spoiler_filtered(self):
        for flag, collection in (("--timeline", "timeline"), ("--branches", "branches"), ("--event-relations", "event_relations")):
            with self.subTest(collection=collection):
                shown = self.run_cli(flag, "--spoilers", "all", "--json", "--limit", "2")
                self.assertEqual(shown.returncode, 0, shown.stderr)
                data = json.loads(shown.stdout)
                self.assertEqual(data["collection"], collection)
                self.assertEqual(data["shown"], 2)
                self.assertGreater(data["matched"], 2)
                self.assertTrue(all(record["source_details"] for record in data["results"]))
                hidden = self.run_cli(flag, "--id", data["results"][0]["id"], "--json")
                self.assertEqual(hidden.returncode, 0, hidden.stderr)
                self.assertEqual(json.loads(hidden.stdout)["results"], [])

    def test_branch_entity_filter_keeps_mutually_exclusive_routes(self):
        result = self.run_cli("--branches", "--entity", "诺艾尔", "--spoilers", "all", "--json", "--limit", "20")
        self.assertEqual(result.returncode, 0, result.stderr)
        branches = json.loads(result.stdout)["results"]
        self.assertTrue(branches)
        by_id = {branch["id"]: branch for branch in branches}
        for branch in branches:
            self.assertEqual(branch["entity"], "character.hoyowiki-40")
            self.assertTrue(branch["condition"])
            self.assertTrue(branch["condition_evidence"])
            self.assertEqual(branch["predecessor_branch_ids"], [])
            self.assertEqual(branch["successor_branch_ids"], [])
            for ref in branch["mutually_exclusive_with"]:
                self.assertEqual(by_id[ref]["branch_group"], branch["branch_group"])
                self.assertIn(branch["id"], by_id[ref]["mutually_exclusive_with"])

    def test_event_relations_filter_either_endpoint_without_reversing_relation(self):
        result = self.run_cli("--event-relations", "--entity", "迪希雅", "--relation-type", "抚养者", "--spoilers", "all", "--json")
        self.assertEqual(result.returncode, 0, result.stderr)
        data = json.loads(result.stdout)
        self.assertEqual(data["shown"], 1)
        relation = data["results"][0]
        self.assertEqual(relation["subject"], "actor.bwiki-e3e3cd8f56c30931")
        self.assertEqual(relation["object"], "character.hoyowiki-3463")
        self.assertEqual(relation["relation_type"], "抚养者")
        self.assertTrue(relation["time_scope"])
        self.assertTrue(relation["event_ids"])

    def test_new_text_modes_show_evidence_and_direction(self):
        checks = (
            (["--timeline"], ["核对深度", "检索顺序不是世界内编年", "解锁条件边界"]),
            (["--branches", "--entity", "诺艾尔"], ["条件概述", "同次路线互斥", "编辑检索标签"]),
            (["--event-relations", "--entity", "迪希雅", "--relation-type", "抚养者"], ["--抚养者-->", "关系时点", "事件依据"]),
        )
        for args, labels in checks:
            with self.subTest(mode=args[0]):
                result = self.run_cli(*args, "--spoilers", "all", "--limit", "1")
                self.assertEqual(result.returncode, 0, result.stderr)
                for label in labels:
                    self.assertIn(label, result.stdout)

    def test_timeline_queries_still_reject_stale_index(self):
        for mode in ("--timeline", "--branches", "--event-relations"):
            with self.subTest(mode=mode), patch.object(query, "check_index", return_value=["stale index fixture"]), redirect_stdout(io.StringIO()) as output, redirect_stderr(io.StringIO()) as error:
                result = query.main([mode, "--spoilers", "all", "--json"])
                self.assertEqual(result, 1)
                self.assertEqual(output.getvalue(), "")
                self.assertIn("stale index fixture", error.getvalue())

    def test_stats_report_validated_localization_kits(self):
        result = self.run_cli("--stats")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertGreater(json.loads(result.stdout)["localization_kits"], 0)

    def test_validate_rejects_invalid_localization_kit(self):
        with patch("localization.validate_kits", return_value=["broken localization basis fixture"]), redirect_stdout(io.StringIO()) as output, redirect_stderr(io.StringIO()) as error:
            result = query.main(["--validate"])
        self.assertEqual(result, 1)
        self.assertEqual(output.getvalue(), "")
        self.assertIn("broken localization basis fixture", error.getvalue())


if __name__ == "__main__":
    unittest.main(verbosity=1)
