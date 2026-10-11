"""Export the reel timeline (camera, text layout, timing) from render.py for the Remotion reel.
Usage: python3 export_shots.py <pipeline_dir> <work_dir> <remotion_public_dir>"""
import json, os, shutil, sys
pipe, work, pub = sys.argv[1:4]
sys.path.insert(0, pipe)
import render as R
from PIL import Image

R.upscale_enabled = True
s, img, slides = R.load(work)
d = R._measure

def slide_entries(size, fmt):
    shots = R.reel_shots(img, slides) if fmt == "reel" else None
    out = []
    for i, sl in enumerate(slides):
        t = sl.get("type", "detail")
        L = R.layout(img, sl, size, fmt)
        if fmt == "reel":
            hold = max(int(R.HOLD * R.FPS), R.hold_frames(sl)) + (int(1.0 * R.FPS) if t == "cta" else 0)
            start, end = shots[i]
        else:
            hold, start = 0, None
            end = R.slide_view(img, sl, size, fmt)
        e = {"type": t, "start": start or end, "end": end, "hold": hold,
             "move": int(R.MOVE * R.FPS) if fmt == "reel" and i + 1 < len(slides) else 0,
             "textTop": L["text_top"], "map": L["map"], "focus": sl.get("focus")}
        if t == "cover":
            fh = L["fh"]; fs = R.font(R.SERIF_I, 40)
            e["head"] = {"lines": R.wrap(d, sl["headline"], fh, L["maxw"]), "size": fh.size, "lh": int(fh.size * 1.1)}
            e["sub"] = {"lines": R.wrap(d, sl.get("sub", f'{s["artist"]}, {s["year"]}'), fs, L["maxw"]), "size": 40, "lh": int(40 * 1.25)}
        elif t == "detail":
            fh, ft = L["fh"], L["ft"]
            e["head"] = {"lines": R.wrap(d, sl["headline"], fh, L["maxw"]), "size": fh.size, "lh": int(fh.size * 1.12)}
            e["body"] = {"lines": R.wrap(d, sl.get("text", ""), ft, L["maxw"]), "size": ft.size, "lh": int(ft.size * 1.35)}
        out.append(e)
    if fmt == "reel":
        fit_duration(out)
    return out

MAX_SECONDS = 59   # Alex, 2026-10-10: reels stay under 60 s
MIN_HOLD = 3.0     # no slide shorter than this
def fit_duration(out):
    """Shrink holds (longest text keeps the most time) so the whole reel fits MAX_SECONDS."""
    fps = R.FPS
    for e in out:
        if e["move"]:
            e["move"] = int(0.75 * fps)
    budget = MAX_SECONDS * fps - sum(e["move"] for e in out)
    fixed = [e for e in out if e["type"] == "cta"]
    for e in fixed:
        e["hold"] = int(2.5 * fps)
    flex = [e for e in out if e["type"] != "cta"]
    room = budget - sum(e["hold"] for e in fixed)
    total = sum(e["hold"] for e in flex)
    if total <= room:
        return
    lo = MIN_HOLD * fps
    k = (room - lo * len(flex)) / max(1, total - lo * len(flex))
    for e in flex:
        e["hold"] = int(lo + (e["hold"] - lo) * k)

os.makedirs(pub, exist_ok=True)
# painting at the resolution render.py uses (upscaled if needed), as JPEG for the browser
img.convert("RGB").save(os.path.join(pub, "painting.jpg"), quality=92)
R.cover_bg(img, R.REEL).convert("RGB").save(os.path.join(pub, "bg.jpg"), quality=90)
R.cover_bg(img, R.CAROUSEL).convert("RGB").save(os.path.join(pub, "bg_carousel.jpg"), quality=90)
th = img.convert("RGB"); th.thumbnail((400, 800)); th.save(os.path.join(pub, "thumb.jpg"), quality=90)
for f in (R.SERIF_B, R.SERIF_I, R.SANS, R.SANS_B):
    for dd in R.FONT_DIRS:
        p = os.path.join(dd, f)
        if os.path.exists(p):
            shutil.copy(p, os.path.join(pub, f)); break
for fmt, size, name, bg in (("reel", R.REEL, "reel.json", "bg.jpg"), ("carousel", R.CAROUSEL, "carousel.json", "bg_carousel.jpg")):
    sl = slide_entries(size, fmt)
    data = {"title": s["title"], "artist": s["artist"], "year": s["year"], "fps": R.FPS, "width": size[0], "height": size[1],
            "fmt": fmt, "bg": bg, "img": [img.width, img.height], "slides": sl}
    L0 = R.layout(img, slides[1] if len(slides) > 1 else slides[0], size, fmt)
    data.update(pad=L0["pad"], brandY=L0["brand_y"], safeTop=L0["brand_y"] + 60)
    data.update(ctaHead=R.CTA_HEAD, ctaSub=R.CTA_SUB)  # final slide text lives in render.py  # safe zones come from render.py
    json.dump(data, open(os.path.join(pub, name), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    if fmt == "reel":
        print("reel frames", sum(x["hold"] + x["move"] for x in sl), "img", img.size)
