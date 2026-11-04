#!/usr/bin/env python3
"""Turn a '[NN | NN_Title_en.jpg]' narration-by-shot file into project.json segments.

Narration text is copied verbatim (whitespace-trimmed only). Shot numbers and
directions are never spoken. Usage:
    python3 media/video-pipeline/ingest_shots.py <narration.txt> <project.json>
Existing project.json keys other than `segments`/`source` are kept.
"""
import hashlib
import json
import re
import sys
from pathlib import Path

src, proj = Path(sys.argv[1]), Path(sys.argv[2])
raw = src.read_bytes()
text = raw.decode("utf-8")
blocks = re.findall(r"^\[(\d+)\s*\|\s*([^\]]+)\]\s*\n(.*?)(?=^\[\d+\s*\||\Z)", text, re.S | re.M)
if not blocks:
    raise SystemExit("no [NN | file] shot blocks found")
data = json.loads(proj.read_text(encoding="utf-8")) if proj.exists() else {}
segments = []
# shot 01 = music only, no narration (per A02 header); held over the opening card
if re.search(r"01:\s*music only", text, re.I):
    segments.append({"id": "01", "en": "", "hold": 4.0, "kicker": "", "headline": "ASCLEPIOS HEALTH",
                     "image": "01_*_en.jpg"})
for num, image, body in blocks:
    title = re.sub(r"^\d+_|_en\.jpg$", "", image.strip()).replace("_", " ")
    segments.append({"id": num, "image": image.strip(), "kicker": f"Shot {num}", "headline": title,
                     "en": " ".join(body.split())})
data["segments"] = segments
data["source"] = {"file": src.name, "bytes": len(raw), "sha256": hashlib.sha256(raw).hexdigest()}
proj.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
print(f"{len(segments)} segments ({len(blocks)} narrated) -> {proj}")
