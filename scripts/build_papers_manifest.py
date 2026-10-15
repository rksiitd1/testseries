#!/usr/bin/env python3
"""Write the compact root-level manifest consumed by index.html."""

from __future__ import annotations

import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
PAPER_NAME = re.compile(
    r"^(?:SHRI_)?\d{4}-\d{2}-\d{2}-.+-Class-(?:10th|12th)-.+\.(?:html|pdf)$",
    re.IGNORECASE,
)


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
    print(f"Wrote {len(files)} paper files to papers.json")


if __name__ == "__main__":
    main()
