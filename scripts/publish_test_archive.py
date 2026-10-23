#!/usr/bin/env python3
"""Refresh the public archive snapshot and publish only approved archive files."""

from __future__ import annotations

import json
import re
import subprocess
import sys
from datetime import date
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
PAPER_NAME = re.compile(
    r"^(?:SHRI_)?\d{4}-\d{2}-\d{2}-.+-Class-(?:10th|12th)-.+\.(?:html|pdf)$",
    re.IGNORECASE,
)
SITE_FILES = (
    ".gitignore",
    "index.html",
    "index.js",
    "papers.json",
    "forms.json",
    "scripts/build_papers_manifest.py",
    "scripts/generate_google_form.py",
    "scripts/publish_test_archive.py",
)


def run_git(*args: str, check: bool = True) -> str:
    result = subprocess.run(
        ["git", *args],
        cwd=ROOT,
        text=True,
        encoding="utf-8",
        errors="replace",
        capture_output=True,
    )
    output = (result.stdout or result.stderr).strip()
    output = re.sub(r"(https?://)[^/@]+@", r"\1[redacted]@", output)
    if check and result.returncode:
        raise RuntimeError(output or f"git {' '.join(args)} failed with exit code {result.returncode}")
    return output


def refresh_manifests() -> list[str]:
    report_path = ROOT / "google_forms_report.json"
    if not report_path.is_file():
        raise RuntimeError("google_forms_report.json is missing; refusing to publish a partial archive")
    report = json.loads(report_path.read_text(encoding="utf-8"))
    jobs = report.get("jobs")
    if not isinstance(jobs, dict):
        raise RuntimeError("Google Forms report has no jobs object")

    public_forms = {}
    for job in jobs.values():
        if job.get("status") not in {"created", "skipped_duplicate"}:
            continue
        paper = job.get("paper")
        title = job.get("title")
        student_url = job.get("studentUrl")
        if not all(isinstance(value, str) and value for value in (paper, title, student_url)):
            continue
        if not re.fullmatch(r"https://docs\.google\.com/forms/d/e/[^/]+/viewform/?", student_url):
            raise RuntimeError(f"Invalid student-facing Form URL for {paper}")
        public_forms[paper] = {"paper": paper, "title": title, "studentUrl": student_url}
    if any("editUrl" in entry for entry in public_forms.values()):
        raise RuntimeError("Refusing to publish an edit URL")
    (ROOT / "forms.json").write_text(
        json.dumps({"forms": sorted(public_forms.values(), key=lambda item: item["paper"].casefold())}, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    build = subprocess.run(
        [sys.executable, str(ROOT / "scripts" / "build_papers_manifest.py")],
        cwd=ROOT,
        text=True,
        encoding="utf-8",
        errors="replace",
        capture_output=True,
    )
    if build.returncode:
        raise RuntimeError((build.stderr or build.stdout).strip() or "Could not rebuild archive index")
    if build.stdout.strip():
        print(build.stdout.strip())
    manifest = json.loads((ROOT / "papers.json").read_text(encoding="utf-8"))
    files = manifest.get("files")
    if not isinstance(files, list):
        raise RuntimeError("papers.json does not contain a files array")
    for name in files:
        if not isinstance(name, str) or Path(name).name != name or not PAPER_NAME.fullmatch(name):
            raise RuntimeError(f"Unexpected archive path in papers.json: {name!r}")
        if not (ROOT / name).is_file():
            raise RuntimeError(f"Archive asset is missing: {name}")
    return files


def main() -> int:
    if not (ROOT / ".git").is_dir():
        raise RuntimeError("Workspace is not a Git repository")

    staged_changes = subprocess.run(
        ["git", "diff", "--cached", "--quiet"], cwd=ROOT, capture_output=True
    )
    if staged_changes.returncode == 1:
        raise RuntimeError("Found pre-staged changes; refusing to mix the archive publish with them")
    if staged_changes.returncode != 0:
        raise RuntimeError("Could not inspect staged changes")

    branch = run_git("branch", "--show-current")
    if not branch:
        raise RuntimeError("Cannot publish from a detached HEAD")
    upstream_result = subprocess.run(
        ["git", "rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"],
        cwd=ROOT,
        text=True,
        encoding="utf-8",
        errors="replace",
        capture_output=True,
    )
    upstream = upstream_result.stdout.strip() if upstream_result.returncode == 0 else ""
    if not upstream:
        raise RuntimeError("Current branch has no upstream; refusing to guess a GitHub destination")
    ahead = run_git("rev-list", "--count", f"{upstream}..HEAD")
    if ahead != "0":
        raise RuntimeError(f"Branch already has {ahead} unpushed commit(s); refusing to push unrelated commits")

    assets = refresh_manifests()
    for name in assets:
        result = subprocess.run(
            ["git", "status", "--porcelain=v1", "--", name],
            cwd=ROOT,
            text=True,
            encoding="utf-8",
            errors="replace",
            capture_output=True,
        )
        state = result.stdout[:2] if result.stdout else "  "
        if state not in {"  ", "??"}:
            raise RuntimeError(f"Refusing to publish a modified or staged existing paper asset: {name}")

    paths = [*SITE_FILES, *assets]
    for path in paths:
        if not (ROOT / path).is_file():
            raise RuntimeError(f"Required publish file is missing: {path}")
    run_git("add", "--", *paths)
    staged_changes = subprocess.run(
        ["git", "diff", "--cached", "--quiet"], cwd=ROOT, capture_output=True
    )
    if staged_changes.returncode == 0:
        print("Archive is already current; nothing to commit or push.")
        return 0
    if staged_changes.returncode != 1:
        raise RuntimeError("Could not inspect staged archive changes")

    message = f"Publish SHRI CLASSES archive ({date.today().isoformat()})"
    run_git("commit", "-m", message)
    commit = run_git("rev-parse", "--short", "HEAD")
    remote, remote_branch = upstream.split("/", 1)
    print(f"Committed archive update {commit}; pushing to {upstream}.")
    print(run_git("push", remote, f"HEAD:{remote_branch}"))
    print(f"Published archive update {commit} to {upstream}.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise SystemExit(1)
