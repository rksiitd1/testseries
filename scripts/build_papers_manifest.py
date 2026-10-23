#!/usr/bin/env python3
"""Write the compact root-level manifest consumed by index.html."""

from __future__ import annotations

import json
import re
from pathlib import Path
from urllib.parse import quote


ROOT = Path(__file__).resolve().parent.parent
INDEX = ROOT / "index.html"
FORMS_MANIFEST = ROOT / "forms.json"
GITHUB_REPOSITORY = "https://github.com/rksiitd1/testseries"
PAPER_NAME = re.compile(
    r"^(?:SHRI_)?\d{4}-\d{2}-\d{2}-.+-Class-(?:10th|12th)-.+\.(?:html|pdf)$",
    re.IGNORECASE,
)


def public_forms() -> list[dict[str, str]]:
    if not FORMS_MANIFEST.is_file():
        return []
    data = json.loads(FORMS_MANIFEST.read_text(encoding="utf-8"))
    forms = []
    for entry in data.get("forms", []):
        paper = entry.get("paper")
        title = entry.get("title")
        student_url = entry.get("studentUrl")
        if not all(isinstance(value, str) and value for value in (paper, title, student_url)):
            continue
        if not re.fullmatch(r"https://docs\.google\.com/forms/d/e/[^/]+/viewform/?", student_url):
            continue
        forms.append({"paper": paper, "title": title, "studentUrl": student_url})
    return sorted(forms, key=lambda item: item["paper"].casefold())


def write_embedded_archive(files: list[str], forms: list[dict[str, str]]) -> None:
    paper_links = [
        {
            "name": name,
            "url": "./" + quote(name),
            "fallbackUrl": f"{GITHUB_REPOSITORY}/blob/main/{quote(name)}",
        }
        for name in files
    ]
    data = {"files": paper_links, "forms": forms}
    serialized = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    serialized = serialized.replace("<", "\\u003c").replace(">", "\\u003e").replace("&", "\\u0026")
    block = f'<script id="archive-data" type="application/json">{serialized}</script>'

    source = INDEX.read_text(encoding="utf-8")
    pattern = re.compile(
        r'<script\s+id="archive-data"\s+type="application/json">.*?</script>', re.I | re.S
    )
    if pattern.search(source):
        source = pattern.sub(block, source, count=1)
    else:
        anchor = '  <script src="index.js"></script>'
        if anchor not in source:
            raise ValueError("Could not find the index.js script tag to insert the archive snapshot")
        source = source.replace(anchor, f"  {block}\n{anchor}", 1)
    INDEX.write_text(source, encoding="utf-8", newline="\n")


def main() -> None:
    files = sorted(
        path.name
        for path in ROOT.iterdir()
        if path.is_file() and PAPER_NAME.fullmatch(path.name)
    )
    (ROOT / "papers.json").write_text(
        json.dumps({"files": files}, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    forms = public_forms()
    write_embedded_archive(files, forms)
    print(f"Embedded {len(files)} paper files and {len(forms)} student Form links in index.html")


if __name__ == "__main__":
    main()
