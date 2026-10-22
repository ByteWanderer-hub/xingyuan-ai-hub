"""Focused installer safety/transaction tests. No third-party test dependencies."""

from __future__ import annotations

import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import sys


SCRIPT = Path(__file__).resolve().parents[1] / "install_skills.py"
SPEC = importlib.util.spec_from_file_location("xingyuan_install_skills", SCRIPT)
installer = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = installer
SPEC.loader.exec_module(installer)


class InstallerTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.base = Path(self.temp.name)
        self.repo = self.base / "repo"
        self.source = self.repo / "skills"
        self.target = self.base / "project" / ".agents" / "skills"
        self.skill("alpha")

    def skill(self, name, text="original"):
        directory = self.source / name
        directory.mkdir(parents=True, exist_ok=True)
        (directory / "SKILL.md").write_text(f"---\nname: {name}\n---\n{text}\n", encoding="utf-8")
        (directory / "references").mkdir(exist_ok=True)
        (directory / "references" / "guide.md").write_text(text, encoding="utf-8")
        return directory

    def plan(self, *names):
        return installer.plan_install(self.repo, self.target, names or ["alpha"])

    def install(self, *names):
        plan = self.plan(*names)
        installer.apply_plan(plan)
        return plan

    def assert_no_transaction_files(self):
        if self.target.parent.exists():
            self.assertEqual([], list(self.target.parent.glob(".xingyuan-install-*")))
            self.assertFalse((self.target.parent / f".{self.target.name}.xingyuan-install.lock").exists())

    def test_preview_fresh_install_and_unrelated_skill_preservation(self):
        plan = self.plan()
        self.assertEqual({"alpha": "ADDED"}, plan.actions)
        self.assertFalse(self.target.exists(), "preview must not create target/parents")
        unrelated = self.target / "personal-skill"
        unrelated.mkdir(parents=True)
        (unrelated / "notes.txt").write_text("keep me", encoding="utf-8")
        installer.apply_plan(plan)
        manifest = json.loads((self.target / installer.MANIFEST_NAME).read_text(encoding="utf-8"))
        self.assertEqual(installer.REPOSITORY, manifest["repo"])
        self.assertEqual("keep me", (unrelated / "notes.txt").read_text(encoding="utf-8"))
        self.assertEqual((self.source / "alpha" / "SKILL.md").read_bytes(),
                         (self.target / "alpha" / "SKILL.md").read_bytes())
        self.assertEqual({"alpha"}, set(manifest["skills"]))
        self.assert_no_transaction_files()

    def test_idempotency_and_managed_update_with_source_deletion(self):
        self.install()
        manifest_before = (self.target / installer.MANIFEST_NAME).read_bytes()
        plan = self.plan()
        self.assertEqual({"alpha": "UNCHANGED"}, plan.actions)
        with patch.object(installer.os, "replace", side_effect=AssertionError("No-op wrote files")):
            installer.apply_plan(plan)
        self.assertEqual(manifest_before, (self.target / installer.MANIFEST_NAME).read_bytes())
        (self.source / "alpha" / "references" / "guide.md").unlink()
        (self.source / "alpha" / "new.txt").write_text("new upstream file", encoding="utf-8")
        plan = self.install()
        self.assertEqual({"alpha": "UPDATED"}, plan.actions)
        self.assertFalse((self.target / "alpha" / "references" / "guide.md").exists())
        self.assertEqual("new upstream file", (self.target / "alpha" / "new.txt").read_text(encoding="utf-8"))
        self.assert_no_transaction_files()

    def test_unmanaged_collision_and_case_collision_are_preserved(self):
        collision = self.target / "alpha"
        collision.mkdir(parents=True)
        (collision / "private.txt").write_text("local", encoding="utf-8")
        with self.assertRaisesRegex(installer.Refusal, "collision"):
            self.plan()
        self.assertEqual("local", (collision / "private.txt").read_text(encoding="utf-8"))
        collision.rename(self.target / "ALPHA")
        with self.assertRaisesRegex(installer.Refusal, "collision"):
            self.plan()

    def test_local_edit_deletion_extra_file_or_empty_directory_blocks_all_updates(self):
        self.install()
        self.skill("beta")
        root = self.target / "alpha"
        guide = root / "references" / "guide.md"
        original = guide.read_bytes()
        baseline_manifest = (self.target / installer.MANIFEST_NAME).read_bytes()
        for mode in ("edited", "deleted", "extra-file", "extra-directory"):
            with self.subTest(mode=mode):
                guide.write_bytes(original)
                extra = root / "extra.txt"
                directory = root / "empty-local-folder"
                if mode == "edited":
                    guide.write_text("local edit", encoding="utf-8")
                elif mode == "deleted":
                    guide.unlink()
                elif mode == "extra-file":
                    extra.write_text("local extra", encoding="utf-8")
                else:
                    directory.mkdir()
                with self.assertRaisesRegex(installer.Refusal, "Local changes"):
                    self.plan("beta")  # Even an unselected managed skill protects the whole transaction.
                self.assertFalse((self.target / "beta").exists())
                self.assertEqual(baseline_manifest, (self.target / installer.MANIFEST_NAME).read_bytes())
                extra.unlink(missing_ok=True)
                if directory.exists():
                    directory.rmdir()

    def test_missing_managed_skill_is_not_silently_recreated(self):
        self.install()
        installer.shutil.rmtree(self.target / "alpha")
        with self.assertRaisesRegex(installer.Refusal, "deletion"):
            self.plan()

    def test_overlap_and_traversal_names_refused(self):
        for target in (self.source, self.source / "installed", self.repo):
            with self.subTest(target=target), self.assertRaisesRegex(installer.Refusal, "overlap"):
                installer.plan_install(self.repo, target, ["alpha"])
        for name in ("../alpha", "/alpha", "alpha/child", "CON", "alpha."):
            with self.subTest(name=name), self.assertRaises(installer.Refusal):
                self.plan(name)
        self.assertFalse(self.target.exists())

    def test_git_output_uses_utf8_and_decode_failure_is_nonblocking(self):
        error = UnicodeDecodeError("utf-8", b"\xff", 0, 1, "injected non-UTF8 output")
        with patch.object(installer.subprocess, "run", side_effect=error) as run:
            self.assertEqual((None, None), installer._git_state(self.repo))
        self.assertEqual("utf-8", run.call_args.kwargs["encoding"])

    def test_foreign_malformed_duplicate_or_traversal_manifest_refused(self):
        self.install()
        path = self.target / installer.MANIFEST_NAME
        original = path.read_text(encoding="utf-8")
        foreign = json.loads(original)
        foreign["repo"] = "someone/else"
        traversal = json.loads(original)
        traversal["skills"]["alpha"]["files"]["../outside.txt"] = "a" * 64
        absolute = json.loads(original)
        absolute["skills"]["alpha"]["files"]["C:/outside.txt"] = "a" * 64
        bad_values = ["{", original.replace('"format_version": 1', '"format_version": 1, "format_version": 1'),
                      json.dumps(foreign), json.dumps(traversal), json.dumps(absolute)]
        for content in bad_values:
            with self.subTest(content=content[:60]):
                path.write_text(content, encoding="utf-8")
                with self.assertRaises(installer.Refusal):
                    self.plan()

    def test_symlink_in_source_and_target_ancestor_refused(self):
        external = self.base / "external.txt"
        external.write_text("external", encoding="utf-8")
        link = self.source / "alpha" / "link.txt"
        try:
            link.symlink_to(external)
        except (OSError, NotImplementedError):
            self.skipTest("Creating symlinks is unavailable on this platform/account")
        with self.assertRaisesRegex(installer.Refusal, "Symlink"):
            self.plan()
        link.unlink()
        actual = self.base / "actual"
        actual.mkdir()
        linked = self.base / "linked"
        linked.symlink_to(actual, target_is_directory=True)
        with self.assertRaisesRegex(installer.Refusal, "Symlink"):
            installer.plan_install(self.repo, linked / "skills", ["alpha"])

    def test_changed_inputs_after_preview_refused_before_writes(self):
        self.install()
        plan = self.plan()
        (self.source / "alpha" / "SKILL.md").write_text("changed after preview", encoding="utf-8")
        with self.assertRaisesRegex(installer.Refusal, "Source changed"):
            installer.apply_plan(plan)
        self.assertIn("original", (self.target / "alpha" / "SKILL.md").read_text(encoding="utf-8"))
        self.assert_no_transaction_files()

    def test_unreadable_source_directory_is_not_treated_as_upstream_deletions(self):
        self.install()
        before = (self.target / installer.MANIFEST_NAME).read_bytes()
        unreadable = self.source / "alpha" / "references"
        real_scandir = installer.os.scandir

        def fail_scandir(path):
            if Path(path) == unreadable:
                raise PermissionError(13, "injected unreadable directory", str(path))
            return real_scandir(path)

        with patch.object(installer.os, "scandir", side_effect=fail_scandir):
            with self.assertRaisesRegex(installer.Refusal, "Cannot completely read"):
                self.plan()
        self.assertEqual(before, (self.target / installer.MANIFEST_NAME).read_bytes())
        self.assertEqual("original", (self.target / "alpha" / "references" / "guide.md").read_text(encoding="utf-8"))

    def test_failure_mid_update_restores_old_skills_and_manifest(self):
        self.install()
        before = (self.target / installer.MANIFEST_NAME).read_bytes()
        self.skill("alpha", "upstream update")
        self.skill("beta")
        plan = self.plan("alpha", "beta")
        real_replace = installer.os.replace

        def fail_beta(source, target):
            if Path(source).parent.name == "stage" and Path(source).name == "beta":
                raise OSError("injected copy activation failure")
            return real_replace(source, target)

        with patch.object(installer.os, "replace", side_effect=fail_beta):
            with self.assertRaisesRegex(OSError, "injected"):
                installer.apply_plan(plan)
        self.assertIn("original", (self.target / "alpha" / "SKILL.md").read_text(encoding="utf-8"))
        self.assertFalse((self.target / "beta").exists())
        self.assertEqual(before, (self.target / installer.MANIFEST_NAME).read_bytes())
        self.assert_no_transaction_files()

    def test_manifest_replace_failure_restores_existing_install(self):
        self.install()
        before = (self.target / installer.MANIFEST_NAME).read_bytes()
        self.skill("alpha", "upstream update")
        plan = self.plan()
        real_replace = installer.os.replace

        def fail_manifest(source, target):
            if Path(source).name == "manifest.new":
                raise OSError("injected manifest failure")
            return real_replace(source, target)

        with patch.object(installer.os, "replace", side_effect=fail_manifest):
            with self.assertRaisesRegex(OSError, "injected manifest"):
                installer.apply_plan(plan)
        self.assertEqual(before, (self.target / installer.MANIFEST_NAME).read_bytes())
        self.assertIn("original", (self.target / "alpha" / "SKILL.md").read_text(encoding="utf-8"))
        self.assert_no_transaction_files()

    def test_keyboard_interrupt_rolls_back_before_discarding_backups(self):
        self.install()
        before = (self.target / installer.MANIFEST_NAME).read_bytes()
        self.skill("alpha", "upstream update")
        plan = self.plan()
        real_replace = installer.os.replace

        def interrupt_manifest(source, target):
            if Path(source).name == "manifest.new":
                raise KeyboardInterrupt()
            return real_replace(source, target)

        with patch.object(installer.os, "replace", side_effect=interrupt_manifest):
            with self.assertRaises(KeyboardInterrupt):
                installer.apply_plan(plan)
        self.assertEqual(before, (self.target / installer.MANIFEST_NAME).read_bytes())
        self.assertIn("original", (self.target / "alpha" / "SKILL.md").read_text(encoding="utf-8"))
        self.assert_no_transaction_files()

    def test_manifest_failure_on_fresh_install_removes_created_directories(self):
        plan = self.plan()
        real_replace = installer.os.replace

        def fail_manifest(source, target):
            if Path(source).name == "manifest.new":
                raise OSError("injected manifest failure")
            return real_replace(source, target)

        with patch.object(installer.os, "replace", side_effect=fail_manifest):
            with self.assertRaisesRegex(OSError, "injected"):
                installer.apply_plan(plan)
        self.assertFalse((self.base / "project").exists())


if __name__ == "__main__":
    unittest.main()
