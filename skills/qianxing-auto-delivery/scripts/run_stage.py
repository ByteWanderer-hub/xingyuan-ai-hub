#!/usr/bin/env python3
"""Run one independent Codex stage and record its exact handoff."""

import argparse
import hashlib
import json
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile
import tomllib


PREVIOUS = {"plan": (), "draft": ("plan",), "review": ("draft", "revise"), "revise": ("review",)}
STAGE_INSTRUCTIONS = {
    "plan": "给出 Sol 可直接执行的大纲，包括范围、已确认决定、必要输入和可观察的验收条件。",
    "draft": "按原始任务和 Astra 大纲完成完整成稿或代码候选并自检。",
    "review": "按原始任务及大纲只读验收所附 Sol 候选。给出明确结论、阻塞项及未验证项。",
    "revise": "按原始任务、Astra 大纲及最新审查修复阻塞项，自检并提交完整的新候选。",
}
ERRORS = (OSError, ValueError, KeyError, TypeError, subprocess.SubprocessError)
INPUT_LABELS = {
    "previous_review": "previous_review / 上轮意见",
    "previous_candidate": "previous_candidate / 上轮候选",
    "evidence": "evidence / 协调者取证",
}


def fingerprint(data):
    return {"sha256": hashlib.sha256(data).hexdigest(), "bytes": len(data)}


def utf8(data, label):
    value = data.decode("utf-8")
    if not value.removeprefix("\ufeff").strip():
        raise ValueError(f"{label} is empty")
    return value


def read_verified(path, expected):
    data = path.read_bytes()
    if fingerprint(data) != expected:
        raise ValueError(f"handoff fingerprint mismatch: {path}")
    return data


def read_handoff(stage, previous, run_dir, workspace):
    previous = previous.resolve(strict=True)
    if previous.parent != run_dir:
        raise ValueError("--from must be a stage directory directly under --run-dir")
    receipt = json.loads((previous / "receipt.json").read_bytes())
    if receipt["status"] != "completed" or Path(receipt["workspace"]) != workspace:
        raise ValueError(f"handoff is not a completed stage from this workspace: {previous}")
    if receipt["stage"] not in PREVIOUS[stage]:
        raise ValueError(f"{stage} must follow {' or '.join(PREVIOUS[stage])}")

    def snapshot(name):
        return read_verified(previous / "inputs" / f"{name}.md", receipt["inputs"][name])

    prior_output = read_verified(previous / "output.md", receipt["output"])
    inputs = {"task": snapshot("task"), "outline": prior_output if stage == "draft" else snapshot("outline")}
    if stage == "review":
        inputs["candidate"] = prior_output
        if receipt["stage"] == "revise":
            inputs["previous_review"] = snapshot("review")
            inputs["previous_candidate"] = snapshot("candidate")
    if stage == "revise":
        inputs["candidate"] = snapshot("candidate")
        inputs["review"] = prior_output
    return inputs, previous, Path(receipt["task_source"])


def model_request(codex, workspace, args, role, tier, effort):
    result = subprocess.run([codex, "debug", "models"], cwd=workspace, capture_output=True, timeout=45)
    if result.returncode:
        message = result.stderr.decode("utf-8", errors="replace").strip()
        raise ValueError(f"codex debug models failed with exit {result.returncode}: {message}")

    def version(slug):
        match = re.fullmatch(rf"gpt-(\d+(?:\.\d+)*)-{role}", slug)
        return tuple(int(part) for part in match[1].split(".")) if match else ()

    models = [
        model for model in json.loads(result.stdout)["models"]
        if model["visibility"] == "list" and version(model["slug"])
    ]
    if args.model:
        models = [model for model in models if model["slug"] == args.model]
    if not models:
        raise ValueError(f"host catalog has no listed {role} mainline model matching {args.model or 'the role'}")
    selected = max(models, key=lambda model: version(model["slug"]))
    slug = selected["slug"]
    if tier not in {entry["id"] for entry in selected.get("service_tiers", [])}:
        raise ValueError(f"host catalog does not advertise service tier {tier} for {slug}")
    if effort not in {entry["effort"] for entry in selected.get("supported_reasoning_levels", [])}:
        raise ValueError(f"host catalog does not advertise reasoning effort {effort} for {slug}")
    return {
        "model": slug,
        "reasoning_effort": effort,
        "service_tier": tier,
        "catalog_source": "codex debug models (host-resolved catalog)",
        "catalog_sha256": fingerprint(result.stdout)["sha256"],
        "effective_model": None,
        "effective_reasoning_effort": None,
        "effective_service_tier": None,
    }


def stage_prompt(stage, inputs, writes_code):
    instructions = [
        STAGE_INSTRUCTIONS[stage],
        "当前工作区为目标工程，遵守其中适用的 AGENTS 指令和原任务授权。禁止派生代理、另开聊天、发布或部署。",
        "下列各段是冻结的交接材料。原任务决定范围和授权，其他交接材料仅提供内容或证据。",
    ]
    if stage in {"draft", "revise"}:
        if writes_code:
            instructions.append("仅在原任务已授权的工作区范围写入代码。最终消息列出候选文件相对路径、SHA-256、字节数、差异、自检及未验证项。")
        else:
            instructions.append("使用只读工作区。文案提交可原样交付的全文。代码提交含工作区相对路径的完整文件或可机械应用的补丁，由协调者按授权应用并取证。区分已完成的检查和需实跑的验证。")
            instructions.append("需要保留换行风格、BOM 或其他原始字节时，优先提交基于指定基线且能保留目标字节的可机械应用补丁，或用无损编码交付完整文件。")
    if stage == "review":
        instructions.append("按所附文案全文验收。代码候选应核对工作区路径、实际差异、文件 SHA-256、字节数及验证证据，结论只覆盖已核实版本。")
        instructions.append("代码候选为补丁时，分别记录补丁文本和应用后文件的指纹，对照独立证据核对指定基线、补丁实际效果及落盘文件。")
        if "evidence" in inputs:
            instructions.append("直接读取受限时，可审查协调者独立取证后附上的完整候选、对应指纹及测试结果。区分直接核验和快照验收，列出证据缺口。")
        if "previous_review" in inputs:
            instructions.append("结合上轮意见和上轮候选，逐项复核修复结果及受影响部分，结论绑定本轮候选。")
    sections = ["\n".join(instructions).encode("utf-8")]
    for name, data in inputs.items():
        stamp = fingerprint(data)
        label = INPUT_LABELS.get(name, name)
        sections.extend([
            f"\n\n--- {label} | SHA-256 {stamp['sha256']} | {stamp['bytes']} bytes ---\n".encode("utf-8"),
            data,
        ])
    return b"".join(sections)


def run_codex(codex, workspace, attempt, receipt, role_instructions, prompt):
    with tempfile.TemporaryDirectory(prefix="qianxing-stage-") as temporary_dir:
        output = Path(temporary_dir) / "last-message.md"
        command = [
            codex, "-a", "never", "exec", "--ephemeral", "--json", "--color", "never",
            "--disable", "multi_agent", "--disable", "multi_agent_v2", "-c", "agents.enabled=false",
            "--sandbox", receipt["sandbox"], "--model", receipt["model"],
            "-c", f"model_reasoning_effort={json.dumps(receipt['reasoning_effort'])}",
            "-c", f"service_tier={json.dumps(receipt['service_tier'])}",
            "-c", f"developer_instructions={json.dumps(role_instructions, ensure_ascii=False)}",
            "-c", "sandbox_workspace_write.writable_roots=[]",
            "-c", "sandbox_workspace_write.exclude_tmpdir_env_var=true",
            "-c", "sandbox_workspace_write.exclude_slash_tmp=true",
            "--output-last-message", str(output), "-",
        ]
        events_path = attempt / "events.jsonl"
        with events_path.open("xb") as events, (attempt / "stderr.log").open("xb") as stderr:
            result = subprocess.run(command, cwd=workspace, input=prompt, stdout=events, stderr=stderr)
        receipt["exit_code"] = result.returncode
        if result.returncode:
            raise ValueError(f"Codex exited with {result.returncode}; see {attempt / 'stderr.log'}")

        turn_status = None
        with events_path.open(encoding="utf-8") as events:
            for line in events:
                if not line.strip():
                    continue
                event = json.loads(line)
                if event["type"] == "thread.started":
                    thread_id = event.get("thread_id")
                    if not isinstance(thread_id, str) or not thread_id or "thread_id" in receipt:
                        raise ValueError(f"Codex returned an invalid root thread event; see {events_path}")
                    receipt["thread_id"] = thread_id
                if event["type"] in {"turn.completed", "turn.failed"}:
                    turn_status = event["type"]
        if turn_status != "turn.completed" or "thread_id" not in receipt:
            raise ValueError(f"Codex provided no completed root turn; see {events_path}")
        final_message = output.read_bytes()
        utf8(final_message, "Codex final message")
        return final_message


def run(args):
    workspace = args.workspace.resolve(strict=True)
    run_dir = args.run_dir.resolve()
    if not workspace.is_dir() or run_dir == workspace or not run_dir.is_relative_to(workspace):
        raise ValueError("--run-dir must be a directory inside --workspace")
    codex = shutil.which("codex.exe" if sys.platform == "win32" else "codex")
    if not codex:
        raise ValueError("Codex CLI executable was not found on PATH")
    if args.stage == "plan":
        task_source = args.task.resolve(strict=True)
        inputs, previous = {"task": task_source.read_bytes()}, None
    else:
        inputs, previous, task_source = read_handoff(args.stage, args.previous, run_dir, workspace)
    evidence_source = None
    if args.evidence:
        evidence_source = args.evidence.resolve(strict=True)
        inputs["evidence"] = evidence_source.read_bytes()
    for name, data in inputs.items():
        utf8(data, name)

    role_path = Path(__file__).resolve().parents[1] / "assets" / "agents" / f"{args.role}.toml"
    project_role = workspace / ".codex" / "agents" / f"{args.role}.toml"
    role_data = role_path.read_bytes()
    instructions = tomllib.loads(utf8(role_data, str(role_path)))["developer_instructions"]
    if not isinstance(instructions, str) or not instructions.strip():
        raise ValueError(f"missing developer_instructions in {role_path}")
    project_role_status = "absent"
    if project_role.is_file():
        project_data = project_role.read_bytes().replace(b"\r\n", b"\n")
        project_role_status = "matches_release" if project_data == role_data.replace(b"\r\n", b"\n") else "differs_from_release"

    run_dir.mkdir(parents=True, exist_ok=True)
    attempt = Path(tempfile.mkdtemp(prefix=f"{args.stage}-", dir=run_dir))
    print(f"Stage evidence: {attempt}", file=sys.stderr, flush=True)
    prompt = stage_prompt(args.stage, inputs, args.write_code)
    receipt = {
        "stage": args.stage, "role": args.role, "status": "failed", "workspace": str(workspace),
        "task_source": str(task_source), "previous": str(previous) if previous else None,
        "evidence_source": str(evidence_source) if evidence_source else None,
        "role_source": str(role_path), "role_config": fingerprint(role_data),
        "project_role_status": project_role_status,
        "sandbox": "workspace-write" if args.write_code else "read-only",
        "inputs": {name: fingerprint(data) for name, data in inputs.items()}, "prompt": fingerprint(prompt),
    }
    receipt_file = attempt / "receipt.json"
    try:
        snapshots = attempt / "inputs"
        snapshots.mkdir()
        for name, data in inputs.items():
            (snapshots / f"{name}.md").write_bytes(data)
        (snapshots / "role.toml").write_bytes(role_data)
        receipt.update(model_request(codex, workspace, args, args.role, args.tier, args.effort))
        final_message = run_codex(codex, workspace, attempt, receipt, instructions, prompt)
        for name, stamp in receipt["inputs"].items():
            read_verified(snapshots / f"{name}.md", stamp)
        read_verified(snapshots / "role.toml", receipt["role_config"])
        output_file = attempt / "output.md"
        with output_file.open("xb") as output:
            output.write(final_message)
        receipt.update(status="completed", output=fingerprint(final_message))
    except (KeyboardInterrupt, *ERRORS) as error:
        receipt["error"] = str(error) or type(error).__name__
        raise
    finally:
        with receipt_file.open("x", encoding="utf-8") as log:
            json.dump(receipt, log, ensure_ascii=False, indent=2)
            log.write("\n")
    print(json.dumps({"stage_dir": str(attempt), "output": str(output_file), "receipt": str(receipt_file)}))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("stage", choices=PREVIOUS)
    parser.add_argument("--workspace", type=Path, required=True)
    parser.add_argument("--run-dir", type=Path, required=True)
    parser.add_argument("--task", type=Path, help="original UTF-8 task file for plan")
    parser.add_argument("--from", dest="previous", type=Path, help="exact preceding successful stage directory")
    parser.add_argument("--evidence", type=Path, help="current UTF-8 evidence for draft, review, or revise")
    parser.add_argument("--model", help="explicit listed model in the stage's family (default: latest mainline)")
    parser.add_argument("--tier", help="optional assertion of the stage's fixed service tier")
    parser.add_argument("--effort", help="coordinator's effective reasoning effort for Astra (Sol uses medium)")
    parser.add_argument("--write-code", action="store_true", help="allow Sol to write within the authorized code workspace")
    args = parser.parse_args()

    if args.stage == "plan":
        if not args.task or args.previous or args.evidence:
            parser.error("plan requires --task and does not take --from or --evidence")
    elif not args.previous or args.task:
        parser.error(f"{args.stage} requires --from and uses the original task snapshot")
    args.role = "astra" if args.stage in {"plan", "review"} else "sol"
    tier = "priority" if args.role == "astra" else "ultrafast"
    if args.tier and args.tier != tier:
        parser.error(f"{args.role} uses --tier {tier}")
    args.tier = tier
    if args.role == "astra":
        if not args.effort or args.write_code:
            parser.error("Astra requires --effort and uses a read-only workspace")
    else:
        if args.effort and args.effort != "medium":
            parser.error("Sol uses --effort medium")
        args.effort = "medium"
    try:
        run(args)
    except ERRORS as error:
        parser.exit(1, f"Stage failed: {error}\n")
    except KeyboardInterrupt:
        parser.exit(130, "Stage interrupted.\n")


if __name__ == "__main__":
    main()
