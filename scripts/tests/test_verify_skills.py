"""Focused regression tests for verification boundaries and failure detection."""
from __future__ import annotations

from contextlib import redirect_stdout
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import shutil
import stat
import subprocess
import sys
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch

sys.dont_write_bytecode = True
SPEC = importlib.util.spec_from_file_location("verify_skills", Path(__file__).parents[1] / "verify_skills.py")
verifier = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(verifier)


class VerificationTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name) / "repository"
        self.root.mkdir()
        for name in verifier.CORE_SKILLS:
            self.skill(name)
        self.write(verifier.CRITICAL_ASSETS[0], '[{"assetID": 1}]\n')
        self.write(verifier.CRITICAL_ASSETS[1], b"\x00GIA\xff\xfe\x01")
        self.manifest()

    def write(self, relative, content):
        path = self.root / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(content.encode("utf-8") if isinstance(content, str) else content)
        return path

    def skill(self, name, body="", metadata=None):
        if metadata is None:
            metadata = f"name: {name}\ndescription: Test skill for {name}"
        return self.write(f"skills/{name}/SKILL.md", f"---\n{metadata}\n---\n\n{body}\n")

    def manifest(self):
        entries = []
        for path in sorted((self.root / "skills").rglob("*")):
            if path.is_file():
                data = path.read_bytes()
                entries.append({"path": path.relative_to(self.root).as_posix(),
                                "git_blob_sha": hashlib.sha1(f"blob {len(data)}\0".encode() + data).hexdigest(),
                                "size": len(data), "mode": "100644"})
        self.write("scripts/migration-baseline.json", json.dumps({
            "schema_version": 1, "source": {"repository": "source", "commit": "a" * 40},
            "destination": {"repository": verifier.REPOSITORY, "baseline_commit": "b" * 40},
            "verified_at": "2026-10-22", "files": entries,
            "immutable_assets": list(verifier.CRITICAL_ASSETS),
        }))

    def verify(self, installed=None):
        return verifier.verify(self.root, installed=installed, probe_tools=False)

    @staticmethod
    def codes(report):
        return {error["code"] for error in report["errors"]}

    def install_fixture(self):
        target = Path(self.temp.name) / "installed"
        shutil.copytree(self.root / "skills", target)
        skills = {}
        for directory in target.iterdir():
            skills[directory.name] = {
                "git_revision": "a" * 40,
                "files": {p.relative_to(directory).as_posix(): hashlib.sha256(p.read_bytes()).hexdigest()
                          for p in directory.rglob("*") if p.is_file()},
            }
        (target / verifier.INSTALL_MANIFEST).write_text(json.dumps({
            "format_version": 1, "repo": verifier.REPOSITORY, "git_revision": "a" * 40,
            "source_dirty": False, "skills": skills,
        }), encoding="utf-8")
        return target

    def test_local_pass_keeps_external_capabilities_unverified(self):
        result = self.verify()
        self.assertEqual(result["status"], "passed", result["errors"])
        self.assertEqual(len(result["skills"]), 10)
        self.assertEqual(result["image_catalog"]["entries"], 1)
        self.assertEqual(result["scope"]["offline_selftests"], "not_run")
        for name in ("codex_discovery", "editor_plugin", "game_runtime"):
            self.assertEqual(result["scope"][name], "not_verified")

    def test_optional_scaffold_skills_are_included_in_discovery(self):
        for name in ("code-review", "skill-manager", "roblox-luau-expert", "roblox-security-audit"):
            self.skill(name)
        result = self.verify()
        self.assertEqual(result["status"], "passed", result["errors"])
        self.assertEqual(len(result["skills"]), 14)

    def test_missing_core_skill_is_a_failure(self):
        shutil.rmtree(self.root / "skills/game-feel")
        result = self.verify()
        self.assertIn("missing_core_skill", self.codes(result))
        self.assertEqual(result["structure_validation"], "failed")

    def test_missing_empty_or_non_scalar_metadata_is_rejected(self):
        for metadata in ("name: game-feel", "name: game-feel\ndescription: ''",
                         "name: game-feel\ndescription: []", "name: game-feel\ndescription: 123",
                         "name: game-feel\ndescription: # comment only",
                         "name: game-feel\nname: duplicate\ndescription: Test"):
            with self.subTest(metadata=metadata):
                self.skill("game-feel", metadata=metadata)
                self.assertIn("invalid_skill_metadata", self.codes(self.verify()))

    def test_folded_description_and_quoted_name_are_accepted(self):
        self.skill("game-feel", metadata="name: 'game-feel'\ndescription: >-\n  First line.\n  Second line.")
        result = self.verify()
        self.assertEqual(result["status"], "passed", result["errors"])
        found = next(s for s in result["skills"] if s["directory"] == "game-feel")
        self.assertEqual(found["description"], "First line. Second line.")

    def test_duplicate_skill_names_are_rejected(self):
        self.skill("game-feel", metadata="name: miliastra-code\ndescription: Test")
        self.assertIn("duplicate_skill_name", self.codes(self.verify()))

    def test_local_links_resolve_encoding_fragments_and_cross_skill_paths(self):
        self.write("skills/game-feel/references/good one.md", "# Good")
        self.write("skills/game-feel/references/test(1).md", "# Test")
        self.skill("game-feel", body=(
            "[one](references/good%20one.md#not-checked)\n"
            "[two](../miliastra-ui/SKILL.md)\n"
            "[three](references/test(1).md \"Title\")\n"
            "[ref]: <references/good one.md>\n"
            "[link][ref]\n"
        ))
        result = self.verify()
        self.assertEqual(result["status"], "passed", result["errors"])
        self.assertEqual(result["local_reference_count"], 4)

    def test_missing_local_link_fails_but_code_examples_are_ignored(self):
        self.skill("game-feel", body=(
            "```md\n[ignore](missing-fenced.md)\n```\n"
            "~~~md\n[ignore](missing-tilde.md)\n~~~\n"
            "`[ignore](missing-inline.md)`\n"
            "[broken](references/missing.md)\n"
        ))
        result = self.verify()
        failures = [e for e in result["errors"] if e["code"] == "missing_local_reference"]
        self.assertEqual(len(failures), 1)
        self.assertEqual(failures[0]["message"], "references/missing.md")

    def test_project_windows_and_web_references_are_unverified_not_local_failures(self):
        self.skill("game-feel", body=(
            "[project](../../instructions/qianxing/AGENTS.md)\n"
            "[machine](C:/Users/Creator/project/AGENTS.md)\n"
            "[web](https://example.com/documentation)\n[heading](#title)\n"
        ))
        result = self.verify()
        self.assertEqual(result["status"], "passed", result["errors"])
        self.assertEqual(len(result["external_references"]), 3)
        self.assertTrue(all(r["status"] == "not_verified" for r in result["external_references"]))

    def test_critical_corruption_or_missing_asset_fails(self):
        path = self.root / verifier.CRITICAL_ASSETS[1]
        path.write_bytes(b"corrupt")
        self.assertIn("critical_asset_changed", self.codes(self.verify()))
        path.unlink()
        self.assertIn("missing_critical_asset", self.codes(self.verify()))

    @unittest.skipUnless(shutil.which("git"), "Git required for checkout regression")
    def test_immutable_assets_keep_bytes_with_autocrlf_checkout(self):
        # Exercise the actual repository policy, not a duplicated test-only rule.
        policy = Path(__file__).resolve().parents[2] / ".gitattributes"
        self.write(".gitattributes", policy.read_bytes())
        originals = {rel: (self.root / rel).read_bytes() for rel in verifier.CRITICAL_ASSETS}

        def git(*args):
            return subprocess.run(["git", *args], cwd=self.root, check=True,
                                  capture_output=True, timeout=20)

        git("init", "-q")
        git("config", "core.autocrlf", "true")
        git("add", "--", ".gitattributes", *verifier.CRITICAL_ASSETS)
        for relative in verifier.CRITICAL_ASSETS:
            (self.root / relative).unlink()
        git("checkout-index", "--force", "--", *verifier.CRITICAL_ASSETS)
        for relative, original in originals.items():
            self.assertEqual((self.root / relative).read_bytes(), original, relative)
        self.assertEqual(self.verify()["asset_validation"], "passed")

    def test_catalog_valid_json_edits_and_line_endings_still_fail_baseline(self):
        path = self.root / verifier.CRITICAL_ASSETS[0]
        original = path.read_bytes()
        for changed in (original.replace(b"\n", b"\r\n"),
                        original.replace(b'"assetID": 1', b'"assetID": 2')):
            with self.subTest(content=changed):
                json.loads(changed)  # Both variants remain syntactically valid JSON.
                path.write_bytes(changed)
                self.assertIn("critical_asset_changed", self.codes(self.verify()))
        path.write_bytes(original)
        self.assertEqual(self.verify()["asset_validation"], "passed")

    def test_intentional_text_edit_is_not_a_migration_hash_failure(self):
        self.skill("game-feel", body="A legitimate documentation improvement after migration.")
        result = self.verify()
        self.assertEqual(result["status"], "passed", result["errors"])
        self.assertEqual(result["asset_validation"], "passed")

    def test_missing_or_weakened_immutable_manifest_fails(self):
        path = self.root / "scripts/migration-baseline.json"
        manifest = json.loads(path.read_text())
        manifest["schema_version"] = True
        path.write_text(json.dumps(manifest))
        self.assertIn("asset_validation_error", self.codes(self.verify()))
        manifest["schema_version"] = 1
        manifest["immutable_assets"] = []
        path.write_text(json.dumps(manifest))
        self.assertIn("asset_validation_error", self.codes(self.verify()))
        path.unlink()
        self.assertIn("asset_validation_error", self.codes(self.verify()))

    def test_optional_node_and_git_unavailable_do_not_prevent_structure_check(self):
        with patch.object(verifier.shutil, "which", return_value=None):
            result = verifier.verify(self.root)
        self.assertEqual(result["status"], "passed", result["errors"])
        self.assertEqual(result["tools"]["node"]["status"], "unavailable")
        self.assertEqual(result["tools"]["git"]["status"], "unavailable")

    def test_installed_copies_match_but_do_not_prove_codex_loading(self):
        target = self.install_fixture()
        (target / "unrelated-skill").mkdir()
        result = self.verify(target)
        self.assertEqual(result["status"], "passed", result["errors"])
        self.assertEqual(result["installation"]["status"], "passed")
        self.assertEqual(result["scope"]["codex_discovery"], "not_verified")

    def test_installed_edits_extras_and_source_changes_are_detected(self):
        target = self.install_fixture()
        path = target / "game-feel/SKILL.md"
        original = path.read_bytes()
        path.write_bytes(original + b"local edit")
        self.assertIn("installed_content_changed", self.codes(self.verify(target)))
        path.write_bytes(original)
        extra = target / "game-feel/local.txt"
        extra.write_text("local addition")
        self.assertIn("installed_file_set_changed", self.codes(self.verify(target)))
        extra.unlink()
        self.skill("game-feel", body="source update")
        self.assertIn("installed_content_changed", self.codes(self.verify(target)))

    def test_installed_manifest_traversal_is_refused(self):
        target = self.install_fixture()
        path = target / verifier.INSTALL_MANIFEST
        manifest = json.loads(path.read_text())
        manifest["skills"]["game-feel"]["files"]["../../outside.txt"] = "0" * 64
        path.write_text(json.dumps(manifest))
        self.assertIn("installed_validation_error", self.codes(self.verify(target)))

    def test_installed_manifest_strict_types_duplicate_keys_and_revision(self):
        target = self.install_fixture()
        path = target / verifier.INSTALL_MANIFEST
        original = path.read_text()
        for invalid_version in (True, 1.0):
            with self.subTest(format_version=invalid_version):
                manifest = json.loads(original)
                manifest["format_version"] = invalid_version
                path.write_text(json.dumps(manifest))
                self.assertIn("installed_validation_error", self.codes(self.verify(target)))
        manifest = json.loads(original)
        manifest["skills"]["game-feel"]["git_revision"] = "not-a-commit"
        path.write_text(json.dumps(manifest))
        self.assertIn("installed_validation_error", self.codes(self.verify(target)))
        path.write_text(original.replace('"format_version": 1', '"format_version": 1, "format_version": 1'))
        self.assertIn("installed_validation_error", self.codes(self.verify(target)))

    def test_installed_symlink_target_and_parent_are_refused(self):
        target = self.install_fixture()
        direct_link = Path(self.temp.name) / "target-link"
        parent_link = Path(self.temp.name) / "parent-link"
        try:
            direct_link.symlink_to(target, target_is_directory=True)
            parent_link.symlink_to(target.parent, target_is_directory=True)
        except OSError as exc:
            self.skipTest(f"Host cannot create directory symlinks: {exc}")
        for linked_target in (direct_link, parent_link / target.name):
            with self.subTest(target=str(linked_target)):
                report = self.verify(linked_target)
                self.assertEqual(report["installation"]["status"], "failed")
                self.assertIn("installed_validation_error", self.codes(report))

    def test_link_inside_managed_skill_is_refused(self):
        target = self.install_fixture()
        path = target / "game-feel/SKILL.md"
        path.unlink()
        try:
            path.symlink_to(self.root / "skills/game-feel/SKILL.md")
        except OSError as exc:
            self.skipTest(f"Host cannot create symlinks: {exc}")
        self.assertIn("installed_validation_error", self.codes(self.verify(target)))

    def test_simulated_windows_reparse_target_is_refused(self):
        target = self.install_fixture()
        original_lstat = Path.lstat
        def lstat(path, *args, **kwargs):
            if path == target:
                return SimpleNamespace(st_mode=stat.S_IFDIR, st_file_attributes=0x400)
            return original_lstat(path, *args, **kwargs)
        with patch.object(Path, "lstat", lstat):
            report = self.verify(target)
        self.assertIn("installed_validation_error", self.codes(report))
        self.assertEqual(report["installation"]["status"], "failed")

    def test_json_cli_exit_and_files_remain_unchanged(self):
        before = {p.relative_to(self.root): p.read_bytes() for p in self.root.rglob("*") if p.is_file()}
        output = io.StringIO()
        with patch.object(verifier, "tool_versions", return_value={}), redirect_stdout(output):
            code = verifier.main(["--root", str(self.root), "--json"])
        self.assertEqual(code, 0)
        self.assertEqual(json.loads(output.getvalue())["status"], "passed")
        after = {p.relative_to(self.root): p.read_bytes() for p in self.root.rglob("*") if p.is_file()}
        self.assertEqual(before, after)
        (self.root / verifier.CRITICAL_ASSETS[1]).unlink()
        with patch.object(verifier, "tool_versions", return_value={}), redirect_stdout(io.StringIO()):
            self.assertEqual(verifier.main(["--root", str(self.root), "--json"]), 1)


if __name__ == "__main__":
    unittest.main()
