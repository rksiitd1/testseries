#!/usr/bin/env python3
"""Validate SHRI CLASSES paper/key pairs and optionally create quiz forms.

Dry run:  py -3 scripts/generate_google_form.py
Create one: py -3 scripts/generate_google_form.py --create [--allow-unverified] <paper.html> <key.html>
Create all: py -3 scripts/generate_google_form.py --create --allow-unverified

Creation uses the deployed Apps Script execution API (clasp run) and the
existing clasp authentication. A local JSON report records each processed job.
"""

import argparse
import html
import json
import os
import re
import subprocess
import sys
import shutil
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
REPORT = ROOT / "google_forms_report.json"
PUBLIC_FORMS = ROOT / "forms.json"
PAPER_NAME = re.compile(r"^(.*)-question-paper(?:-english)?(-\d+)?\.html$", re.I)
MOJIBAKE = ("\ufffd", "Ã", "â€", "ï¿½")


def text_content(value):
    value = re.sub(r"<br\s*/?>", " ", value, flags=re.I)
    value = re.sub(r"<[^>]+>", "", value)
    return re.sub(r"\s+", " ", html.unescape(value)).strip()


def parse_questions(path):
    source = path.read_text(encoding="utf-8-sig")
    starts = list(re.finditer(r'<div\s+class="q"\s*>', source, re.I))
    legacy = not starts
    if legacy:
        starts = list(re.finditer(r'<div\s+class="qa-container"\s*>', source, re.I))
    if not starts:
        raise ValueError("No supported question blocks found")

    questions = []
    for i, match in enumerate(starts):
        block = source[match.start(): starts[i + 1].start() if i + 1 < len(starts) else len(source)]
        title_class = "question" if legacy else "t"
        title_match = re.search(rf'<span\s+class="{title_class}"\s*>(.*?)</span>', block, re.I | re.S)
        if not title_match:
            raise ValueError(f"Question {i + 1}: title not found")
        if legacy:
            raw = re.findall(r'<div\s+class="option-item"\s*>(.*?)</div>', block, re.I | re.S)
        else:
            options_match = re.search(r'<div\s+class="o(?:\s+[^\"]*)?"\s*>(.*?)</div>\s*</div>\s*</div>', block, re.I | re.S)
            if not options_match:
                raise ValueError(f"Question {i + 1}: options not found")
            option_block = options_match.group(1)
            raw = re.findall(r'<div[^>]*>(.*?)</div>', option_block, re.I | re.S)
            if len(raw) != 4:
                raw = re.findall(r'<div[^>]*>(.*?)</div>', block[options_match.start():], re.I | re.S)[:4]
        options = [re.sub(r"^\s*\([A-D]\)\s*", "", text_content(x), flags=re.I) for x in raw]
        title = text_content(title_match.group(1))
        title = re.sub(r"^\s*(?:(?:Q\s*\.?\s*)?\d+\s*[.):\-]\s*)", "", title, flags=re.I)
        if not title or len(options) != 4 or any(not x for x in options):
            raise ValueError(f"Question {i + 1}: expected a title and four nonempty options; found {len(options)} options")
        questions.append({"title": title, "options": options})
    return questions, source


def parse_answer_key(path):
    source = path.read_text(encoding="utf-8-sig")
    match = re.search(r"\bconst\s+KEY\s*=\s*\[(.*?)\]\s*;", source, re.I | re.S)
    if match:
        answers = [x.upper() for x in re.findall(r"[\"']([ABCD])[\"']", match.group(1), re.I)]
    else:
        numbered = re.findall(r'<span\s+class="answer"[^>]*>\s*(\d+)\s*-\s*([ABCD])\s*</span>', source, re.I)
        by_number = {}
        for number, answer in numbered:
            by_number.setdefault(int(number), answer.upper())
        if not by_number:
            raise ValueError("Could not find a machine-readable answer key")
        expected = list(range(1, max(by_number) + 1))
        if sorted(by_number) != expected:
            raise ValueError("Numbered answer key has missing question numbers")
        answers = [by_number[n] for n in expected]
    unverified = bool(re.search(r"illustrative|unverified", source, re.I))
    return answers, unverified


def parse_pdf_answer_key(path):
    """Extract numbered answers from a text PDF and confirm duplex repeats agree."""
    try:
        import pdfplumber
    except ImportError as exc:
        raise ValueError("PDF key extraction requires the bundled pdfplumber runtime") from exc
    with pdfplumber.open(path) as pdf:
        text = "\n".join(page.extract_text() or "" for page in pdf.pages)
    numbered = re.findall(r"(?<!\d)(\d{1,3})\s*-\s*([ABCD])\b", text, re.I)
    occurrences = {}
    for number, answer in numbered:
        n = int(number)
        if 1 <= n <= 100:
            occurrences.setdefault(n, set()).add(answer.upper())
    if not occurrences:
        raise ValueError("Could not extract numbered answers from PDF")
    expected = set(range(1, 101))
    if set(occurrences) != expected:
        raise ValueError(f"PDF answer numbers incomplete: found {len(occurrences)} of 100")
    conflicts = {n: values for n, values in occurrences.items() if len(values) != 1}
    if conflicts:
        raise ValueError(f"PDF duplex copies disagree: {conflicts}")
    return [next(iter(occurrences[n])) for n in range(1, 101)]


def pair_key(paper):
    match = PAPER_NAME.match(paper.name)
    if not match:
        raise ValueError("Unrecognized question-paper filename")
    prefix, suffix = match.groups()
    return paper.with_name(f"{prefix}-AnswerKey-16-Up-Duplex{suffix or ''}.html")


def validate(paper, key):
    if not paper.is_file() or not key.is_file():
        raise ValueError("Question paper or matching answer key is missing")
    questions, paper_source = parse_questions(paper)
    answers, unverified = parse_answer_key(key)
    if len(questions) != len(answers):
        raise ValueError(f"Question/key count mismatch: {len(questions)} questions, {len(answers)} answers")
    for token in MOJIBAKE:
        if token in paper_source:
            raise ValueError(f"Possible encoding corruption marker {token!r} in question paper")
    for i, (question, answer) in enumerate(zip(questions, answers), 1):
        if answer not in "ABCD":
            raise ValueError(f"Question {i}: invalid answer {answer!r}")
        correct_text = question["options"]["ABCD".index(answer)]
        if question["options"].count(correct_text) != 1:
            raise ValueError(f"Question {i}: correct option text is duplicated")
    return questions, answers, unverified


def load_report():
    if not REPORT.exists():
        return {"jobs": {}}
    try:
        data = json.loads(REPORT.read_text(encoding="utf-8"))
        if not isinstance(data.get("jobs"), dict):
            raise ValueError("report jobs must be an object")
        return data
    except (OSError, json.JSONDecodeError, ValueError) as exc:
        raise ValueError(f"Cannot safely update existing report: {exc}") from exc


def save_report(data):
    REPORT.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def save_public_forms(data):
    """Write only respondent links for the public test archive; never expose edit URLs."""
    forms_by_paper = {}
    for job in data["jobs"].values():
        if job.get("status") not in {"created", "skipped_duplicate"}:
            continue
        paper = job.get("paper")
        title = job.get("title")
        student_url = job.get("studentUrl")
        if not isinstance(paper, str) or not isinstance(title, str) or not isinstance(student_url, str):
            continue
        if not re.fullmatch(r"https://docs\.google\.com/forms/d/e/[^/]+/viewform/?", student_url):
            continue
        forms_by_paper[paper] = {"paper": paper, "title": title, "studentUrl": student_url}
    forms = sorted(forms_by_paper.values(), key=lambda item: item["paper"].casefold())
    PUBLIC_FORMS.write_text(json.dumps({"forms": forms}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def refresh_papers_manifest():
    """Include newly generated HTML/PDF assets in the test archive index."""
    manifest_script = ROOT / "scripts" / "build_papers_manifest.py"
    result = subprocess.run(
        [sys.executable, str(manifest_script)],
        cwd=ROOT,
        text=True,
        encoding="utf-8",
        errors="replace",
        capture_output=True,
    )
    if result.returncode:
        raise RuntimeError((result.stderr or result.stdout).strip() or "Could not refresh papers.json")
    if result.stdout.strip():
        print(result.stdout.strip(), flush=True)


def title_for(paper):
    stem = paper.stem.lower()
    grade = re.search(r"class[-_ ]?(\d+)", stem)
    normalized = re.sub(r"[^a-z]", "", stem)
    subject = next((s for s in ("Social Science", "Mathematics", "Biology", "Chemistry", "Physics", "Hindi", "English", "Sanskrit") if re.sub(r"[^a-z]", "", s.lower()) in normalized), "Test")
    if re.search(r"all[-_ ]chapters", stem, re.I):
        test_name = "Complete Syllabus Test"
    else:
        chapter = re.search(r"chapter[-_ ]?(\d+)", stem, re.I)
        test_name = f"Chapter {chapter.group(1)} Test" if chapter else "Test"
    return f"SHRI CLASSES | Class {grade.group(1) if grade else '10'} {subject} | {test_name}"


def description_for(paper, question_count, medium):
    source = paper.read_text(encoding="utf-8-sig")
    descriptors = []
    if re.search(r"all[-_ ]chapters|complete syllabus", paper.stem, re.I):
        descriptors.append("Complete Syllabus")
    else:
        chapter = re.search(r"chapter[-_ ]?(\d+)", paper.stem, re.I)
        if chapter:
            descriptors.append(f"Chapter {chapter.group(1)}")
    if re.search(r"Bihar Board", source, re.I):
        descriptors.append("Bihar Board")
    descriptors.append(f"{question_count} Objective Questions")
    duration = re.search(r"(?:Maximum Time|Suggested duration)\s*:\s*(\d+)\s*minutes?", source, re.I)
    if not duration:
        duration = re.search(r"अधिकतम समय\s*:\s*(\d+)\s*मिनट", source)
    if duration:
        descriptors.append(f"Suggested duration: {duration.group(1)} minutes")
    test_date = re.search(r"\d{4}-\d{2}-\d{2}", paper.stem)
    if test_date:
        date = datetime.strptime(test_date.group(0), "%Y-%m-%d").strftime("%d %B %Y").lstrip("0")
        descriptors.append(f"Test date: {date}")
    return (
        " | ".join(descriptors)
        + f"\n\nScoring: 1 mark per correct answer. Unanswered questions receive 0. Total: {question_count} marks."
        + f"\n\nMedium: {medium.removesuffix(' Medium')}."
    )


def form_questions_with_unique_options(questions):
    """Keep source wording while suffixing repeated form choices with a period."""
    form_questions = []
    adjustments = []
    for question_number, question in enumerate(questions, 1):
        original_options = list(question["options"])
        options = []
        used = set()
        for option_number, option in enumerate(original_options):
            display_option = option
            if display_option in used:
                display_option += "."
                while display_option in used or display_option in original_options[option_number + 1:]:
                    display_option += "."
                adjustments.append({
                    "questionNumber": question_number,
                    "option": "ABCD"[option_number],
                    "periodsAdded": len(display_option) - len(option),
                })
            options.append(display_option)
            used.add(display_option)
        if len(options) != len(set(options)):
            raise ValueError(f"Question {question_number}: could not make duplicate choices unique")
        form_questions.append({"title": question["title"], "options": options})
    return form_questions, adjustments


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--create", action="store_true", help="create a validated form via clasp run")
    parser.add_argument("--pdf-key", action="store_true", help="use the answer_key argument as a PDF answer key")
    parser.add_argument("--allow-unverified", action="store_true", help="allow keys whose source contains an illustrative/unverified label after user review")
    parser.add_argument("paper", nargs="?", type=Path)
    parser.add_argument("answer_key", nargs="?", type=Path)
    args = parser.parse_args()
    if bool(args.paper) != bool(args.answer_key):
        parser.error("provide both paper and answer_key")
    if args.pdf_key and not args.paper:
        parser.error("--pdf-key requires a paper and PDF key")

    if args.paper:
        paper = args.paper if args.paper.is_absolute() else ROOT / args.paper
        key = args.answer_key if args.answer_key.is_absolute() else ROOT / args.answer_key
        pairs = [(paper.resolve(), key.resolve())]
    else:
        pairs = []
        for paper in sorted(ROOT.glob("*-question-paper*.html")):
            try:
                key = pair_key(paper)
                if key.is_file():
                    pairs.append((paper, key))
            except ValueError:
                continue

    report = load_report()
    if args.create:
        refresh_papers_manifest()
    failed = 0
    for paper, key in pairs:
        job_id = f"{paper.name}|{key.name}"
        record = {"paper": paper.name, "answerKey": key.name, "updatedAt": datetime.now(timezone.utc).isoformat()}
        try:
            if args.pdf_key:
                questions, paper_source = parse_questions(paper)
                for token in MOJIBAKE:
                    if token in paper_source:
                        raise ValueError(f"Possible encoding corruption marker {token!r} in question paper")
                answers = parse_pdf_answer_key(key)
                if len(questions) != len(answers):
                    raise ValueError(f"Question/key count mismatch: {len(questions)} questions, {len(answers)} answers")
                for i, question in enumerate(questions, 1):
                    correct_text = question["options"]["ABCD".index(answers[i - 1])]
                    if question["options"].count(correct_text) != 1:
                        raise ValueError(f"Question {i}: correct option text is duplicated")
                unverified = False
            else:
                questions, answers, unverified = validate(paper, key)
            record.update(status="validated_unverified_key" if unverified else "validated", questionCount=len(questions), answerCount=len(answers))
            if args.create:
                if unverified and not args.allow_unverified:
                    raise ValueError("Answer key is explicitly illustrative/unverified; verify it before publishing")
                previous = report["jobs"].get(job_id, {})
                if previous.get("status") == "created" and previous.get("editUrl") and previous.get("studentUrl"):
                    record = {**previous, **record, "status": "skipped_duplicate", "editUrl": previous["editUrl"], "studentUrl": previous["studentUrl"]}
                else:
                    medium = "English Medium" if re.search(r"-english(?:-\d+)?\.html$", paper.name, re.I) or "-English-" in paper.name else "Hindi Medium"
                    form_questions, option_adjustments = form_questions_with_unique_options(questions)
                    payload = {
                        "jobId": job_id,
                        "title": title_for(paper),
                        "description": description_for(paper, len(questions), medium),
                        "questions": form_questions,
                        "answers": answers,
                    }
                    clasp = os.environ.get("CLASP_CMD") or shutil.which("clasp.cmd") or shutil.which("clasp")
                    if not clasp:
                        raise RuntimeError("Could not locate clasp; set CLASP_CMD to the installed clasp.cmd path")
                    node = shutil.which("node.exe") or shutil.which("node")
                    if not node:
                        raise RuntimeError("Node.js is required to submit large Unicode payloads safely")
                    clasp_dir = Path(clasp).resolve().parent
                    auth_module = (clasp_dir / "node_modules" / "@google" / "clasp" / "build" / "src" / "auth" / "auth.js").as_uri()
                    core_module = (clasp_dir / "node_modules" / "@google" / "clasp" / "build" / "src" / "core" / "clasp.js").as_uri()
                    node_code = (
                        f'import {{initAuth}} from "{auth_module}"; '
                        f'import {{initClaspInstance}} from "{core_module}"; '
                        'import fs from "node:fs"; '
                        'const p=JSON.parse(fs.readFileSync(process.argv[1],"utf8")); '
                        'const a=await initAuth({}); '
                        'const c=await initClaspInstance({credentials:a.credentials}); '
                        'const r=await c.functions.runFunction("createShriClassesForm",[p]); '
                        'console.log(JSON.stringify(r.response?.result ?? r));'
                    )
                    import tempfile
                    with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", suffix=".json", delete=False) as payload_file:
                        payload_file.write(json.dumps(payload, ensure_ascii=False))
                        payload_path = Path(payload_file.name)
                    try:
                        result = subprocess.run([node, "--input-type=module", "-e", node_code, str(payload_path)], cwd=ROOT, text=True, encoding="utf-8", errors="replace", capture_output=True)
                    finally:
                        payload_path.unlink(missing_ok=True)
                    if result.returncode:
                        raise RuntimeError((result.stderr or result.stdout).strip() or "clasp run failed")
                    output = result.stdout.strip()
                    match = re.search(r'\{[^{}]*"editUrl"[^{}]*\}', output)
                    if not match:
                        raise RuntimeError(f"Could not parse Apps Script result: {output[-1000:]}")
                    created = json.loads(match.group(0))
                    record.update(status="created", title=created["title"], editUrl=created["editUrl"], studentUrl=created["studentUrl"])
                    if option_adjustments:
                        record["optionTextAdjustments"] = option_adjustments
            print(f"{record['status'].upper()}: {paper.name} - {record.get('questionCount', '?')} questions" + (" (key requires verification)" if unverified else ""), flush=True)
        except Exception as exc:
            failed += 1
            record.update(status="error", error=str(exc))
            print(f"ERROR: {paper.name}: {exc}", file=sys.stderr, flush=True)
        report["jobs"][job_id] = record
        save_report(report)
        save_public_forms(report)

    print(f"Processed {len(pairs)} pair(s); errors: {failed}; report: {REPORT.name}")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
