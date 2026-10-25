#!/usr/bin/env python3
"""Preview or safely install this repository's skills. Python 3.10+, stdlib only."""

from __future__ import annotations

import argparse
import copy
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import stat
import subprocess
import sys
import tempfile
from dataclasses import dataclass


REPOSITORY = "ByteWanderer-hub/xingyuan-ai-hub"
MANIFEST_NAME = ".xingyuan-ai-hub-install.json"
DEFAULT_SKILLS = (
    "xingyuan-router",
    "game-design-theory", "game-feel", "game-ui-ux", "level-design",
    "miliastra-bb", "miliastra-code", "miliastra-ui", "miliastra-motion",
    "motion-design", "performance-optimization", "qianxing-agent",
    "qianxing-auto-delivery", "systematic-debugging",
)
_HASH = re.compile(r"[0-9a-f]{64}\Z")
_REVISION = re.compile(r"(?:[0-9a-f]{40}|[0-9a-f]{64})\Z")
_NAME = re.compile(r"[A-Za-z0-9][A-Za-z0-9._-]*\Z")
_RESERVED = {"CON", "PRN", "AUX", "NUL"} | {
    f"{prefix}{number}" for prefix in ("COM", "LPT") for number in range(1, 10)
}


class Refusal(ValueError):
    """An unsafe or ambiguous installation; nothing should be overwritten."""


@dataclass
class Plan:
    repo_root: Path
    source: Path
    target: Path
    source_files: dict[str, dict[str, str]]
    previous: dict | None
    previous_bytes: bytes | None
    manifest: dict
    actions: dict[str, str]

    @property
    def manifest_bytes(self) -> bytes:
        return (json.dumps(self.manifest, ensure_ascii=False, indent=2,
                           sort_keys=True) + "\n").encode("utf-8")

    @property
    def needs_write(self) -> bool:
        return (any(action != "UNCHANGED" for action in self.actions.values())
                or self.previous != self.manifest)


def absolute(path: Path) -> Path:
    return Path(os.path.abspath(os.fspath(path.expanduser())))


def _is_link(path: Path) -> bool:
    info = path.lstat()
    # Windows directory junctions are reparse points, including on Python 3.10.
    return stat.S_ISLNK(info.st_mode) or bool(
        getattr(info, "st_file_attributes", 0)
        & getattr(stat, "FILE_ATTRIBUTE_REPARSE_POINT", 0x400)
    )


def no_links(path: Path) -> None:
    for item in reversed((path, *path.parents)):
        if os.path.lexists(item) and _is_link(item):
            raise Refusal(f"Symlink/reparse-point path is not allowed: {item}")


def _segment(value: str) -> None:
    if (not value or value in (".", "..") or value.endswith((".", " "))
            or any(c in value for c in '\\/:*?"<>|')
            or any(ord(c) < 32 for c in value)
            or value.split(".", 1)[0].upper() in _RESERVED):
        raise Refusal(f"Unsafe or non-portable path component: {value!r}")


def skill_name(value: str) -> str:
    if not isinstance(value, str) or not _NAME.fullmatch(value):
        raise Refusal(f"Invalid skill name: {value!r}")
    _segment(value)
    return value


def relative_file(value: str) -> str:
    if not isinstance(value, str):
        raise Refusal("Manifest file paths must be strings")
    for part in value.split("/"):
        _segment(part)
    return value


def _hash_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _inventory(path: Path) -> tuple[dict[str, str], set[str]]:
    no_links(path)
    if not path.is_dir():
        raise Refusal(f"Missing skill directory or local deletion: {path}")
    files: dict[str, str] = {}
    directories: set[str] = set()
    seen: dict[str, str] = {}

    def unreadable(error: OSError) -> None:
        raise Refusal(f"Cannot completely read skill directory {error.filename or path}: {error}") from error

    for current, dirs, names in os.walk(path, followlinks=False, onerror=unreadable):
        for name in sorted(dirs + names):
            child = Path(current) / name
            rel = relative_file(child.relative_to(path).as_posix())
            folded = rel.casefold()
            if folded in seen:
                raise Refusal(f"Case-insensitive path collision: {seen[folded]} / {rel}")
            seen[folded] = rel
            if _is_link(child):
                raise Refusal(f"Symlink/reparse point in skill: {child}")
            mode = child.lstat().st_mode
            if stat.S_ISDIR(mode):
                directories.add(rel)
            elif stat.S_ISREG(mode):
                files[rel] = _hash_file(child)
            else:
                raise Refusal(f"Non-regular skill file: {child}")
    if "SKILL.md" not in files:
        raise Refusal(f"Missing regular SKILL.md: {path}")
    return dict(sorted(files.items())), directories


def _expected_directories(files: dict[str, str]) -> set[str]:
    result = set()
    for name in files:
        parts = name.split("/")
        result.update("/".join(parts[:i]) for i in range(1, len(parts)))
    return result


def _unique_json(pairs: list[tuple[str, object]]) -> dict:
    result = {}
    for key, value in pairs:
        if key in result:
            raise Refusal(f"Duplicate manifest key: {key!r}")
        result[key] = value
    return result


def _revision(value: object) -> bool:
    return value is None or (isinstance(value, str) and bool(_REVISION.fullmatch(value)))


def _read_manifest(target: Path) -> tuple[dict | None, bytes | None]:
    path = target / MANIFEST_NAME
    if not os.path.lexists(path):
        return None, None
    no_links(path)
    if not path.is_file() or path.stat().st_size > 4 * 1024 * 1024:
        raise Refusal(f"Invalid installation manifest: {path}")
    raw = path.read_bytes()
    try:
        data = json.loads(raw, object_pairs_hook=_unique_json)
    except (UnicodeError, json.JSONDecodeError) as error:
        raise Refusal(f"Malformed installation manifest: {error}") from error
    keys = {"format_version", "repo", "git_revision", "source_dirty", "skills"}
    if (not isinstance(data, dict) or set(data) != keys
            or type(data["format_version"]) is not int or data["format_version"] != 1
            or data["repo"] != REPOSITORY or not _revision(data["git_revision"])
            or (data["source_dirty"] is not None and type(data["source_dirty"]) is not bool)
            or not isinstance(data["skills"], dict)):
        raise Refusal("Malformed, incompatible, or foreign installation manifest")
    seen_names = set()
    for name, item in data["skills"].items():
        skill_name(name)
        if name.casefold() in seen_names:
            raise Refusal(f"Case-insensitive skill collision in manifest: {name}")
        seen_names.add(name.casefold())
        if (not isinstance(item, dict) or set(item) != {"git_revision", "files"}
                or not _revision(item["git_revision"]) or not isinstance(item["files"], dict)
                or "SKILL.md" not in item["files"]):
            raise Refusal(f"Malformed skill record in manifest: {name}")
        seen_files = set()
        for rel, digest in item["files"].items():
            relative_file(rel)
            if rel.casefold() in seen_files or not isinstance(digest, str) or not _HASH.fullmatch(digest):
                raise Refusal(f"Invalid file path/hash in manifest: {name}/{rel}")
            seen_files.add(rel.casefold())
    return data, raw


def _check_managed(target: Path, manifest: dict | None) -> None:
    for name, item in (manifest or {}).get("skills", {}).items():
        actual, dirs = _inventory(target / name)
        expected = item["files"]
        changed = sorted(p for p in expected if p in actual and actual[p] != expected[p])
        missing = sorted(set(expected) - set(actual))
        extra = sorted(set(actual) - set(expected))
        extra_dirs = sorted(dirs - _expected_directories(expected))
        if changed or missing or extra or extra_dirs:
            details = [f"{label}: {', '.join(items[:5])}"
                       for label, items in (("edited", changed), ("deleted", missing),
                                            ("extra files", extra), ("extra directories", extra_dirs))
                       if items]
            raise Refusal(f"Local changes in managed skill {name}; " + "; ".join(details))


def _git_state(root: Path) -> tuple[str | None, bool | None]:
    def git(*args: str) -> str:
        return subprocess.run(["git", "-C", str(root), *args], check=True,
                              capture_output=True, encoding="utf-8", timeout=10).stdout.strip()
    try:
        if absolute(Path(git("rev-parse", "--show-toplevel"))) != root:
            return None, None
        revision = git("rev-parse", "HEAD")
        dirty = bool(git("status", "--porcelain", "--untracked-files=normal", "--", "skills"))
        return (revision, dirty) if _revision(revision) else (None, None)
    except (OSError, subprocess.SubprocessError, UnicodeError):
        return None, None


def available_skills(source: Path) -> list[str]:
    no_links(source)
    if not source.is_dir():
        raise Refusal(f"Source skills directory is missing: {source}")
    result = []
    seen = set()
    for path in sorted(source.iterdir()):
        if _is_link(path):
            raise Refusal(f"Symlink/reparse point in source: {path}")
        if path.is_dir() and (path / "SKILL.md").exists():
            name = skill_name(path.name)
            if name.casefold() in seen:
                raise Refusal(f"Case-insensitive source skill collision: {name}")
            seen.add(name.casefold())
            result.append(name)
    return result


def plan_install(repo_root: Path, target: Path, names: list[str] | tuple[str, ...]) -> Plan:
    root, target = absolute(repo_root), absolute(target)
    source = root / "skills"
    no_links(source)
    no_links(target)
    if source == target or source in target.parents or target in source.parents:
        raise Refusal("Installation target must not overlap the source skills directory")
    if os.path.lexists(target) and not target.is_dir():
        raise Refusal(f"Installation target is not a directory: {target}")
    available = set(available_skills(source))
    names = sorted(set(skill_name(name) for name in names))
    if not names:
        raise Refusal("No skills selected")
    if set(names) - available:
        raise Refusal("Unknown or incomplete source skills: " + ", ".join(sorted(set(names) - available)))
    previous, previous_bytes = _read_manifest(target)
    _check_managed(target, previous)
    existing = {p.name.casefold(): p.name for p in target.iterdir()} if target.exists() else {}
    revision, dirty = _git_state(root)
    new_manifest = copy.deepcopy(previous) if previous else {
        "format_version": 1, "repo": REPOSITORY, "skills": {},
    }
    new_manifest.update(git_revision=revision, source_dirty=dirty)
    actions, inventories = {}, {}
    for name in names:
        managed = (previous or {}).get("skills", {}).get(name)
        collision = existing.get(name.casefold())
        if collision is not None and (managed is None or collision != name):
            raise Refusal(f"Unmanaged or differently-cased name collision: {target / collision}")
        files, _ = _inventory(source / name)
        inventories[name] = files
        actions[name] = "ADDED" if managed is None else (
            "UNCHANGED" if managed["files"] == files else "UPDATED")
        new_manifest["skills"][name] = {"git_revision": revision, "files": files}
    return Plan(root, source, target, inventories, previous, previous_bytes,
                new_manifest, actions)


def _check_inputs(plan: Plan) -> None:
    no_links(plan.source)
    no_links(plan.target)
    previous, raw = _read_manifest(plan.target)
    if raw != plan.previous_bytes:
        raise Refusal("Installation manifest changed after planning; run a fresh preview")
    _check_managed(plan.target, previous)
    for name, expected in plan.source_files.items():
        if _inventory(plan.source / name)[0] != expected:
            raise Refusal(f"Source changed after planning: {name}; run a fresh preview")
        if plan.actions[name] == "ADDED" and os.path.lexists(plan.target / name):
            raise Refusal(f"Target appeared after planning: {plan.target / name}")


def _make_parents(path: Path) -> list[Path]:
    missing = []
    current = path
    while not current.exists():
        missing.append(current)
        current = current.parent
    created = []
    for item in reversed(missing):
        no_links(item)
        item.mkdir()
        created.append(item)
    return created


def _remove(path: Path) -> None:
    if not os.path.lexists(path):
        return
    if _is_link(path) or not path.is_dir():
        path.unlink()
    else:
        shutil.rmtree(path)


def apply_plan(plan: Plan) -> None:
    """Stage beside the target, atomically replace each skill, roll back on failure."""
    _check_inputs(plan)  # No writes, including temporary files, before validation.
    if not plan.needs_write:
        return
    created_parents: list[Path] = []
    lock = plan.target.parent / f".{plan.target.name}.xingyuan-install.lock"
    lock_owned = False
    transaction: Path | None = None
    created_target = False
    moved: list[dict] = []
    rollback_failed = False
    completed = False
    try:
        created_parents = _make_parents(plan.target.parent)
        try:
            descriptor = os.open(lock, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        except FileExistsError as error:
            raise Refusal(f"Installation lock exists; inspect the other operation first: {lock}") from error
        lock_owned = True
        with os.fdopen(descriptor, "w", encoding="utf-8") as stream:
            stream.write(f"pid={os.getpid()}\n")
        _check_inputs(plan)
        transaction = Path(tempfile.mkdtemp(prefix=".xingyuan-install-", dir=plan.target.parent))
        stage, backup = transaction / "stage", transaction / "backup"
        stage.mkdir()
        backup.mkdir()
        for name, action in plan.actions.items():
            if action == "UNCHANGED":
                continue
            for rel, expected_hash in plan.source_files[name].items():
                source_file = plan.source / name / Path(rel)
                no_links(source_file)
                destination = stage / name / Path(rel)
                destination.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(source_file, destination, follow_symlinks=False)
                if _is_link(destination) or _hash_file(destination) != expected_hash:
                    raise Refusal(f"Source changed while staging: {name}/{rel}")
        staged_manifest = transaction / "manifest.new"
        staged_manifest.write_bytes(plan.manifest_bytes)
        if plan.previous_bytes is not None:
            shutil.copy2(plan.target / MANIFEST_NAME, transaction / "manifest.old")
        _check_inputs(plan)  # Detect changes while the staged copies were prepared.
        if not plan.target.exists():
            plan.target.mkdir()
            created_target = True
        for name, action in plan.actions.items():
            if action == "UNCHANGED":
                continue
            entry = {"name": name, "old": False, "new": False}
            moved.append(entry)
            destination = plan.target / name
            if action == "UPDATED":
                os.replace(destination, backup / name)
                entry["old"] = True
            os.replace(stage / name, destination)
            entry["new"] = True
        os.replace(staged_manifest, plan.target / MANIFEST_NAME)
        completed = True
    except BaseException as error:
        failures = []
        for entry in reversed(moved):
            try:
                destination = plan.target / entry["name"]
                if entry["new"]:
                    _remove(destination)
                if entry["old"]:
                    os.replace(transaction / "backup" / entry["name"], destination)
            except OSError as rollback_error:
                failures.append(str(rollback_error))
        if transaction is not None:
            try:
                manifest_path = plan.target / MANIFEST_NAME
                current = manifest_path.read_bytes() if manifest_path.exists() else None
                if current != plan.previous_bytes:
                    if plan.previous_bytes is None:
                        manifest_path.unlink(missing_ok=True)
                    else:
                        os.replace(transaction / "manifest.old", manifest_path)
            except OSError as rollback_error:
                failures.append(str(rollback_error))
        if failures:
            rollback_failed = True
            raise OSError(f"Installation failed ({error}); rollback also failed. "
                          f"Recovery files retained at {transaction}: {'; '.join(failures)}") from error
        raise
    finally:
        if transaction is not None and not rollback_failed:
            try:
                shutil.rmtree(transaction)
            except OSError as error:
                print(f"WARNING: temporary backup cleanup failed at {transaction}: {error}", file=sys.stderr)
        if lock_owned:
            try:
                lock.unlink()
            except OSError as error:
                print(f"WARNING: could not remove installation lock {lock}: {error}", file=sys.stderr)
        if not completed and not rollback_failed:
            if created_target:
                try:
                    plan.target.rmdir()
                except OSError:
                    pass
            for parent in reversed(created_parents):
                try:
                    parent.rmdir()
                except OSError:
                    pass


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    selection = parser.add_mutually_exclusive_group()
    selection.add_argument("--all", action="store_true", help="Select every source skill")
    selection.add_argument("--skill", action="append", metavar="NAME", help="Select a skill; repeatable")
    parser.add_argument("--scope", choices=("repo", "user"), default="repo")
    parser.add_argument("--target", type=Path, help="Override the destination skill directory")
    parser.add_argument("--apply", action="store_true", help="Apply; default is a read-only preview")
    args = parser.parse_args(argv)
    root = absolute(Path(__file__).parent.parent)
    target = args.target if args.target is not None else (
        root if args.scope == "repo" else Path.home()) / ".agents" / "skills"
    try:
        names = available_skills(root / "skills") if args.all else args.skill or DEFAULT_SKILLS
        plan = plan_install(root, target, names)
        print(f"{'APPLY' if args.apply else 'DRY RUN'}: {plan.target}")
        print(f"Source Git revision: {plan.manifest['git_revision'] or 'unknown (Git metadata unavailable)'}")
        print(f"Source skills working-tree dirty: {plan.manifest['source_dirty']}")
        for name, action in plan.actions.items():
            print(f"{action:9} {name} ({len(plan.source_files[name])} files)")
        if args.apply:
            apply_plan(plan)
            print("Installation committed." if plan.needs_write else "Already up to date; no files written.")
        else:
            print("Preview only; no files written. Add --apply to install this selection.")
        print("File installation does not prove that Codex has discovered or executed these skills.")
        return 0
    except Refusal as error:
        print(f"REFUSED: {error}", file=sys.stderr)
        return 2
    except OSError as error:
        print(f"ERROR: {error}", file=sys.stderr)
        return 1
    except KeyboardInterrupt:
        print("CANCELLED: installation interrupted; transaction rollback completed.", file=sys.stderr)
        return 130


if __name__ == "__main__":
    raise SystemExit(main())
