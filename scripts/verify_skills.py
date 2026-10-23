#!/usr/bin/env python3
"""Read-only checks for the shared skill repository (Python 3.10+, stdlib only).

This is deliberately not a YAML/CommonMark parser or a Codex loader. It checks
required scalar frontmatter fields, inline/reference Markdown link destinations
outside fenced/inline code, and immutable migration assets. Anchors, bare paths
in prose, external projects, editor plugins, and skill self-tests are not verified.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import platform
import re
import shutil
import stat
import subprocess
import sys
from urllib.parse import unquote, urlsplit


CORE_SKILLS = (
    "game-design-theory", "game-feel", "game-ui-ux", "level-design",
    "miliastra-bb", "miliastra-code", "miliastra-ui", "qianxing-agent",
    "qianxing-auto-delivery", "systematic-debugging",
)
CRITICAL_ASSETS = (
    "skills/miliastra-code/assets/Image_sample_by_id.json",
    "skills/miliastra-code/assets/信号节点图_4类型整改_侦探杀_20260929.gia",
)
INSTALL_MANIFEST = ".xingyuan-ai-hub-install.json"
REPOSITORY = "ByteWanderer-hub/xingyuan-ai-hub"
SAFE_NAME = re.compile(r"[A-Za-z0-9][A-Za-z0-9._-]*\Z")
RESERVED_NAMES = {"CON", "PRN", "AUX", "NUL"} | {
    f"{prefix}{number}" for prefix in ("COM", "LPT") for number in range(1, 10)
}


def issue(report: dict, code: str, path: str | Path, message: str) -> None:
    report["errors"].append({"code": code, "path": str(path), "message": message})


def safe_relative(value: object) -> bool:
    """Manifest paths are portable POSIX paths, without traversal or empty parts."""
    return (isinstance(value, str) and bool(value) and not PurePosixPath(value).is_absolute()
            and all(part not in ("", ".", "..") and not part.endswith((".", " "))
                    and not any(c in part for c in '\\/:*?"<>|')
                    and not any(ord(c) < 32 for c in part)
                    and part.split(".", 1)[0].upper() not in RESERVED_NAMES
                    for part in value.split("/")))


def _is_link(path: Path) -> bool:
    info = path.lstat()
    return stat.S_ISLNK(info.st_mode) or bool(
        getattr(info, "st_file_attributes", 0)
        & getattr(stat, "FILE_ATTRIBUTE_REPARSE_POINT", 0x400)
    )


def no_links(path: Path) -> None:
    """Keep lexical paths until every ancestor is checked, including Windows junctions."""
    for item in reversed((path, *path.parents)):
        if os.path.lexists(item) and _is_link(item):
            raise ValueError(f"symlink/reparse-point path is not allowed: {item}")


def unique_json(pairs: list[tuple[str, object]]) -> dict:
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError(f"duplicate manifest key: {key!r}")
        result[key] = value
    return result


def valid_revision(value: object) -> bool:
    return value is None or (isinstance(value, str)
                            and bool(re.fullmatch(r"(?:[0-9a-f]{40}|[0-9a-f]{64})", value)))


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def _scalar(value: str) -> str:
    value = value.strip()
    if value.startswith('"'):
        try:
            result, end = json.JSONDecoder().raw_decode(value)
        except ValueError as exc:
            raise ValueError("unsupported/invalid quoted scalar") from exc
        if not isinstance(result, str) or value[end:].strip().split("#", 1)[0].strip():
            raise ValueError("expected a string scalar")
        return result.strip()
    if value.startswith("'"):
        match = re.fullmatch(r"'((?:[^']|'')*)'\s*(?:#.*)?", value)
        if not match:
            raise ValueError("invalid single-quoted scalar")
        return match.group(1).replace("''", "'").strip()
    value = re.split(r"\s+#", value, maxsplit=1)[0].strip()
    if (value.lower() in ("", "null", "~", "true", "false")
            or value.startswith(("[", "{", "&", "*", "!", "#", ">", "|"))
            or re.fullmatch(r"[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[-+]?\d+)?", value, re.IGNORECASE)
            or ": " in value):
        raise ValueError("expected a nonempty plain or quoted string scalar")
    return value


def frontmatter(text: str) -> tuple[dict[str, str], str]:
    """Validate name/description only; support plain/quoted and |/> block strings."""
    lines = text.splitlines()
    if not lines or lines[0] != "---":
        raise ValueError("SKILL.md must begin with a --- frontmatter delimiter")
    try:
        end = lines.index("---", 1)
    except ValueError as exc:
        raise ValueError("frontmatter closing --- delimiter is missing") from exc
    values: dict[str, str] = {}
    pos = 1
    while pos < end:
        match = re.match(r"^(name|description)\s*:\s*(.*)$", lines[pos])
        if not match:
            pos += 1
            continue
        key, raw = match.groups()
        if key in values:
            raise ValueError(f"duplicate frontmatter field: {key}")
        pos += 1
        if re.fullmatch(r"[>|][+-]?\s*(?:#.*)?", raw):
            block = []
            while pos < end and (not lines[pos].strip() or lines[pos][0].isspace()):
                block.append(lines[pos].strip())
                pos += 1
            value = " ".join(block).strip()
        else:
            value = _scalar(raw)
        if not value:
            raise ValueError(f"frontmatter {key} is empty")
        values[key] = value
    for key in ("name", "description"):
        if key not in values:
            raise ValueError(f"required frontmatter field is missing: {key}")
    return values, "\n".join(lines[end + 1:])


def without_code(text: str) -> str:
    lines = []
    fence_char, fence_length = "", 0
    for line in text.splitlines():
        match = re.match(r"^ {0,3}(`{3,}|~{3,})(.*)$", line)
        if fence_char:
            if (match and match.group(1)[0] == fence_char
                    and len(match.group(1)) >= fence_length and not match.group(2).strip()):
                fence_char, fence_length = "", 0
            lines.append("")
        elif match:
            fence_char, fence_length = match.group(1)[0], len(match.group(1))
            lines.append("")
        else:
            lines.append(line)
    return re.sub(r"(`+).*?\1", "", "\n".join(lines), flags=re.DOTALL)


def _destination(text: str) -> str:
    text = text.lstrip()
    if text.startswith("<"):
        match = re.match(r"<((?:\\.|[^>])*)>", text)
        return match.group(1) if match else ""
    output, depth, escaped = [], 0, False
    for char in text:
        if escaped:
            output.extend(("\\", char))
            escaped = False
        elif char == "\\":
            escaped = True
        elif char.isspace() or (char == ")" and depth == 0):
            break
        else:
            if char == "(":
                depth += 1
            elif char == ")":
                depth -= 1
            output.append(char)
    return "".join(output)


def markdown_targets(text: str) -> list[str]:
    text = without_code(text)
    targets = []
    for match in re.finditer(r"(?<!\\)!?\[[^\]\n]*\]\(", text):
        tail = text[match.end():]
        # An incomplete [label]( expression is not a Markdown link.
        if ")" in tail.split("\n", 1)[0]:
            targets.append(_destination(tail))
    for match in re.finditer(r"^ {0,3}\[[^\]\n]+\]:\s*(.+)$", text, flags=re.MULTILINE):
        targets.append(_destination(match.group(1)))
    return [re.sub(r"\\([!\"#$%&'()*+,\-./:;<=>?@\[\]\\^_`{|}~])", r"\1", t)
            for t in targets if t]


def check_links(report: dict, skill_file: Path, body: str, skills_root: Path) -> None:
    for target in markdown_targets(body):
        entry = {"source": str(skill_file.relative_to(report["root"])), "target": target}
        if target.startswith(("#", "?")):
            continue  # This checker does not resolve heading anchors.
        try:
            url = urlsplit(target)
            if url.scheme or url.netloc or target.startswith(("/", "\\")):
                report["external_references"].append({**entry, "status": "not_verified"})
                continue
            path = (skill_file.parent / unquote(url.path).replace("\\", "/")).resolve()
            if not path.is_relative_to(skills_root):
                report["external_references"].append({**entry, "status": "not_verified"})
            elif not path.exists():
                issue(report, "missing_local_reference", entry["source"], target)
            else:
                report["local_reference_count"] += 1
        except (OSError, RuntimeError, ValueError) as exc:
            issue(report, "invalid_local_reference", entry["source"], f"{target}: {exc}")


def file_hash(path: Path, algorithm: str = "sha256", git_blob: bool = False) -> str:
    digest = hashlib.new(algorithm)
    if git_blob:
        digest.update(f"blob {path.stat().st_size}\0".encode("ascii"))
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def check_assets(report: dict, root: Path) -> None:
    manifest_file = root / "scripts/migration-baseline.json"
    try:
        manifest = json.loads(read_text(manifest_file), object_pairs_hook=unique_json)
        if (not isinstance(manifest, dict) or type(manifest.get("schema_version")) is not int
                or manifest["schema_version"] != 1):
            raise ValueError("expected schema_version 1")
        entries = manifest.get("files")
        if not isinstance(entries, list) or not all(isinstance(e, dict) for e in entries):
            raise ValueError("files must be an array of objects")
        by_path = {}
        for entry in entries:
            path = entry.get("path")
            if not safe_relative(path) or not path.startswith("skills/") or path in by_path:
                raise ValueError(f"invalid or duplicate baseline path: {path!r}")
            by_path[path] = entry
        immutable = manifest.get("immutable_assets")
        if (not isinstance(immutable, list)
                or not all(isinstance(p, str) and p in by_path for p in immutable)
                or not set(CRITICAL_ASSETS).issubset(immutable)):
            raise ValueError("immutable_assets must include both required critical assets")
        report["migration_baseline"] = {
            "source": manifest.get("source"), "destination": manifest.get("destination"),
            "verified_at": manifest.get("verified_at"), "recorded_file_count": len(entries),
            "scope": "Only immutable asset sizes/hashes are enforced; text skill edits are allowed.",
        }
        for relative in sorted(set(immutable)):
            entry, path = by_path[relative], root / relative
            expected_size, expected_sha = entry.get("size"), entry.get("git_blob_sha")
            if (not isinstance(expected_size, int) or isinstance(expected_size, bool) or expected_size <= 0
                    or not isinstance(expected_sha, str) or not re.fullmatch(r"[0-9a-f]{40}", expected_sha)):
                issue(report, "invalid_asset_baseline", relative, "positive size and Git SHA-1 blob hash required")
                continue
            if not path.is_file() or not path.resolve().is_relative_to(root / "skills"):
                issue(report, "missing_critical_asset", relative, "required regular asset is missing or outside skills")
                continue
            size, sha = path.stat().st_size, file_hash(path, "sha1", git_blob=True)
            valid = size == expected_size and sha == expected_sha
            report["critical_assets"].append({"path": relative, "size": size, "git_blob_sha": sha,
                                               "status": "passed" if valid else "failed"})
            if not valid:
                issue(report, "critical_asset_changed", relative, f"expected size={expected_size}, Git blob={expected_sha}")
        catalog = root / CRITICAL_ASSETS[0]
        if catalog.is_file() and catalog.resolve().is_relative_to(root / "skills"):
            data = json.loads(read_text(catalog))
            if not isinstance(data, list):
                raise ValueError("image catalog must be a JSON array")
            report["image_catalog"] = {"status": "valid_json", "entries": len(data),
                                       "scope": "JSON syntax and array length; asset IDs not checked in editor"}
    except (OSError, RuntimeError, UnicodeError, ValueError, TypeError) as exc:
        issue(report, "asset_validation_error", manifest_file, str(exc))


def scan_files(directory: Path) -> dict[str, Path]:
    """Reject symlinks and special files rather than follow them outside a skill."""
    no_links(directory)
    if not directory.is_dir():
        raise ValueError(f"not a regular directory: {directory}")
    files = {}
    def walk_error(error: OSError) -> None:
        raise error
    for current, dirs, names in os.walk(directory, followlinks=False, onerror=walk_error):
        for name in dirs + names:
            path = Path(current) / name
            if _is_link(path):
                raise ValueError(f"symlink/reparse point is not supported: {path}")
            if name in names:
                if not path.is_file():
                    raise ValueError(f"not a regular file: {path}")
                files[path.relative_to(directory).as_posix()] = path
    return files


def check_installed(report: dict, root: Path, target: Path) -> None:
    start_errors = len(report["errors"])
    report["installation"] = {"target": str(target), "status": "failed", "managed_skills": []}
    try:
        no_links(target)
        manifest_file = target / INSTALL_MANIFEST
        no_links(manifest_file)
        if not manifest_file.is_file() or manifest_file.stat().st_size > 4 * 1024 * 1024:
            raise ValueError("managed-install manifest must be a regular file of at most 4 MiB")
        manifest = json.loads(read_text(manifest_file), object_pairs_hook=unique_json)
        expected_keys = {"format_version", "repo", "git_revision", "source_dirty", "skills"}
        if (not isinstance(manifest, dict) or set(manifest) != expected_keys
                or type(manifest["format_version"]) is not int or manifest["format_version"] != 1
                or manifest["repo"] != REPOSITORY or not isinstance(manifest["skills"], dict)
                or not manifest["skills"]):
            raise ValueError("missing or incompatible managed-install manifest")
        if not valid_revision(manifest["git_revision"]):
            raise ValueError("git_revision must be a commit hash or null")
        if manifest["source_dirty"] is not None and type(manifest["source_dirty"]) is not bool:
            raise ValueError("source_dirty must be a boolean or null")
        report["installation"].update({"git_revision": manifest.get("git_revision"),
                                       "source_dirty": manifest.get("source_dirty")})
        seen_names = set()
        for name, skill in sorted(manifest["skills"].items()):
            if (not SAFE_NAME.fullmatch(name) or not safe_relative(name)
                    or name.casefold() in seen_names or not isinstance(skill, dict)
                    or set(skill) != {"git_revision", "files"} or not valid_revision(skill["git_revision"])):
                raise ValueError(f"invalid installed skill: {name!r}")
            seen_names.add(name.casefold())
            expected = skill.get("files")
            if not isinstance(expected, dict) or "SKILL.md" not in expected:
                raise ValueError(f"missing files/SKILL.md manifest for {name}")
            seen_files = set()
            for relative, digest in expected.items():
                if (not safe_relative(relative) or not isinstance(digest, str)
                        or relative.casefold() in seen_files
                        or not re.fullmatch(r"[0-9a-f]{64}", digest)):
                    raise ValueError(f"invalid installed file manifest: {name}/{relative}")
                seen_files.add(relative.casefold())
            installed_files = scan_files(target / name)
            source_files = scan_files(root / "skills" / name)
            for label, files in (("installed", installed_files), ("source", source_files)):
                if set(files) != set(expected):
                    issue(report, "installed_file_set_changed", f"{label}:{name}",
                          f"missing={sorted(set(expected) - set(files))}, extra={sorted(set(files) - set(expected))}")
                for relative in sorted(set(files) & set(expected)):
                    if file_hash(files[relative]) != expected[relative]:
                        issue(report, "installed_content_changed", f"{label}:{name}/{relative}",
                              "content differs from the managed installation manifest")
            report["installation"]["managed_skills"].append(name)
        if len(report["errors"]) == start_errors:
            report["installation"]["status"] = "passed"
    except (OSError, UnicodeError, ValueError, TypeError) as exc:
        issue(report, "installed_validation_error", target, str(exc))


def tool_versions() -> dict:
    versions = {"python": {"status": "available", "version": platform.python_version(),
                            "executable": sys.executable}}
    for name in ("node", "git"):
        executable = shutil.which(name)
        if not executable:
            versions[name] = {"status": "unavailable", "required_for_structure_check": False}
            continue
        try:
            result = subprocess.run([executable, "--version"], capture_output=True, text=True,
                                    timeout=5, check=False)
            versions[name] = {"status": "available" if result.returncode == 0 else "unavailable",
                              "version": (result.stdout or result.stderr).strip()[:200],
                              "required_for_structure_check": False}
        except (OSError, subprocess.SubprocessError, UnicodeError) as exc:
            versions[name] = {"status": "unavailable", "reason": str(exc),
                              "required_for_structure_check": False}
    return versions


def verify(root: Path, installed: Path | None = None, probe_tools: bool = True) -> dict:
    root = root.resolve()
    report = {
        "schema_version": 1, "root": str(root), "status": "failed", "errors": [],
        "skills": [], "core_skills_required": list(CORE_SKILLS), "local_reference_count": 0,
        "external_references": [], "critical_assets": [],
        "scope": {"metadata": "Required name/description scalar fields only; not a full YAML parser.",
                  "references": "SKILL.md inline/reference Markdown destinations outside code; no heading checks.",
                  "offline_selftests": "not_run", "codex_discovery": "not_verified",
                  "editor_plugin": "not_verified", "game_runtime": "not_verified"},
        "installation": {"status": "not_checked"},
        "tools": tool_versions() if probe_tools else {"status": "not_probed"},
    }
    skills_root = root / "skills"
    if not skills_root.is_dir() or skills_root.is_symlink():
        issue(report, "missing_skills_directory", skills_root, "skills must be a regular directory")
    else:
        for name in CORE_SKILLS:
            if not (skills_root / name / "SKILL.md").is_file():
                issue(report, "missing_core_skill", name, "required core skill SKILL.md is missing")
        names = {}
        for directory in sorted(skills_root.iterdir()):
            if directory.name.startswith(".") or not directory.is_dir():
                continue
            path = directory / "SKILL.md"
            try:
                if directory.is_symlink() or path.is_symlink():
                    raise ValueError("skill directory/SKILL.md must not be a symlink")
                metadata, body = frontmatter(read_text(path))
                name = metadata["name"]
                if name in names:
                    issue(report, "duplicate_skill_name", path, f"name {name!r} also used by {names[name]}")
                else:
                    names[name] = directory.name
                report["skills"].append({"directory": directory.name, **metadata})
                check_links(report, path, body, skills_root)
            except (OSError, UnicodeError, ValueError) as exc:
                issue(report, "invalid_skill_metadata", path, str(exc))
    report["structure_validation"] = "failed" if report["errors"] else "passed"
    before_assets = len(report["errors"])
    check_assets(report, root)
    report["asset_validation"] = "passed" if len(report["errors"]) == before_assets else "failed"
    if installed is not None:
        # resolve() would hide a linked target or parent before no_links can inspect it.
        target = Path(os.path.abspath(os.fspath(installed.expanduser())))
        check_installed(report, root, target)
    report["status"] = "failed" if report["errors"] else "passed"
    return report


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1],
                        help="Repository root; defaults to the parent of scripts/.")
    parser.add_argument("--installed", type=Path, help="Managed installed skills container to compare.")
    parser.add_argument("--json", action="store_true", help="Emit one JSON report.")
    args = parser.parse_args(argv)
    report = verify(args.root, args.installed)
    if args.json:
        print(json.dumps(report, ensure_ascii=False, indent=2))
    else:
        print(f"Local skill validation: {report['status'].upper()}")
        print(f"Structure: {report['structure_validation']}; immutable assets: {report['asset_validation']}")
        print(f"SKILL.md files parsed: {len(report['skills'])}; required core skills: {len(CORE_SKILLS)}")
        print(f"Local references found: {report['local_reference_count']}; external references not verified: {len(report['external_references'])}")
        print(f"Installation copy check: {report['installation']['status']}")
        for name, info in report["tools"].items():
            print(f"{name}: {info.get('status')} {info.get('version', '')}")
        print("Offline self-tests: NOT RUN; actual Codex discovery: NOT VERIFIED")
        print("Editor/plugin and game runtime: NOT VERIFIED")
        print("Scope: required metadata fields, Markdown file targets, immutable assets; text edits are allowed.")
        for error in report["errors"]:
            print(f"ERROR [{error['code']}] {error['path']}: {error['message']}")
    return 1 if report["errors"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
