#!/usr/bin/env python3
"""Set focus boxes in a work's script.json, without hand-editing JSON.

  python tools/set_focus.py <work> '{"2": [0.115, 0.89, 0.19, 0.14], "5": [0.28, 0.5, 0.08, 0.12]}' [--note "..."]

Keys are slide indexes as in script.json (0 = cover). Each change is printed old -> new.
--note adds a line to _verify (e.g. what is not visible on the image, or a text that changed).
"""
import argparse, json, os

WORKS = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "works")

ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
ap.add_argument("work")
ap.add_argument("changes", help='JSON object: {"slide index": [cx, cy, w, h]}')
ap.add_argument("--note", action="append", default=[], help="line to add to _verify (repeatable)")
a = ap.parse_args()

p = os.path.join(WORKS, a.work, "script.json")
s = json.load(open(p, encoding="utf-8"))
for k, f in json.loads(a.changes).items():
    sl = s["slides"][int(k)]
    if len(f) != 4 or not all(0 <= v <= 1 for v in f):
        raise SystemExit(f"slide {k}: focus must be [cx, cy, w, h] as fractions 0-1, got {f}")
    print(f"{k}. {sl['headline']}: {sl.get('focus')} -> {f}")
    sl["focus"] = f
s["_verify"] = s.get("_verify", []) + a.note
with open(p, "w", encoding="utf-8", newline="\n") as fh:
    json.dump(s, fh, ensure_ascii=False, indent=2)
    fh.write("\n")
