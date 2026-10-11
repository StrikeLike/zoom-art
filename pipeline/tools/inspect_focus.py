#!/usr/bin/env python3
"""Check the focus boxes of a work by eye (for people and for Claude).

  python tools/inspect_focus.py <work>                   -> out/inspect/overview.jpg (grid + numbered boxes)
                                                            out/inspect/crops.jpg (each box with its headline/text)
  python tools/inspect_focus.py <work> x0 y0 x1 y1       -> out/inspect/region.jpg (a region with a fine grid)

Coordinates are fractions of the painting (0 = left/top, 1 = right/bottom), like `focus` in script.json.
"""
import json, os, sys, textwrap

from PIL import Image, ImageDraw, ImageFont

Image.MAX_IMAGE_PIXELS = None
PIPE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
F = ImageFont.truetype(os.path.join(PIPE, "fonts", "DejaVuSans-Bold.ttf"), 18)
FS = ImageFont.truetype(os.path.join(PIPE, "fonts", "DejaVuSans.ttf"), 15)
COLORS = ["#00ff66", "#ff3355", "#33aaff", "#ffcc00", "#ff66ff", "#00ffff", "#ff8800", "#aaff00", "#ffffff", "#8888ff"]


def box(f, W, H):
    """focus [cx, cy, w, h?] -> (x0, y0, x1, y1); missing h = landscape box like render.py."""
    cx, cy, w = f[:3]
    h = f[3] if len(f) > 3 else w * 0.62 * W / H
    return cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2


def grid(im, x0, y0, x1, y1, step):
    d = ImageDraw.Draw(im)
    sw, sh = im.size
    for horiz, a, b, size in ((False, x0, x1, sw), (True, y0, y1, sh)):
        v = round(a / step) * step
        while v <= b + 1e-9:
            p = (v - a) / (b - a) * size
            line = [(0, p), (sw, p)] if horiz else [(p, 0), (p, sh)]
            d.line(line, fill=(255, 255, 255), width=1)
            d.text((2, p + 2) if horiz else (p + 2, 2), f"{v:.2f}", font=FS, fill=(255, 255, 0),
                   stroke_width=2, stroke_fill=(0, 0, 0))
            v += step
    return d


def draw_boxes(d, slides, W, H, x0, y0, x1, y1, sw, sh):
    sx, sy = sw / (x1 - x0), sh / (y1 - y0)
    for i, sl in enumerate(slides):
        if "focus" in sl:
            a, b, c, e = box(sl["focus"], W, H)
            col = COLORS[i % len(COLORS)]
            d.rectangle([(a - x0) * sx, (b - y0) * sy, (c - x0) * sx, (e - y0) * sy], outline=col, width=3)
            d.text(((a - x0) * sx + 4, (e - y0) * sy - 22), str(i), font=F, fill=col, stroke_width=2, stroke_fill=(0, 0, 0))


def main():
    if len(sys.argv) not in (2, 6):
        sys.exit(__doc__)
    work = os.path.join(PIPE, "works", sys.argv[1])
    s = json.load(open(os.path.join(work, "script.json"), encoding="utf-8"))
    img = Image.open(os.path.join(work, s["image"])).convert("RGB")
    W, H = img.size
    out = os.path.join(work, "out", "inspect")
    os.makedirs(out, exist_ok=True)

    if len(sys.argv) == 6:
        x0, y0, x1, y1 = map(float, sys.argv[2:])
        reg = img.crop((int(x0 * W), int(y0 * H), int(x1 * W), int(y1 * H)))
        reg.thumbnail((1400, 1100), Image.LANCZOS)
        step = 0.01 if (x1 - x0) <= 0.25 else 0.02 if (x1 - x0) <= 0.5 else 0.05
        d = grid(reg, x0, y0, x1, y1, step)
        draw_boxes(d, s["slides"], W, H, x0, y0, x1, y1, reg.width, reg.height)
        reg.save(os.path.join(out, "region.jpg"), quality=88)
        print(os.path.join(out, "region.jpg"))
        return

    ov = img.copy()
    ov.thumbnail((1400, 1100), Image.LANCZOS)
    d = grid(ov, 0, 0, 1, 1, 0.1)
    draw_boxes(d, s["slides"], W, H, 0, 0, 1, 1, ov.width, ov.height)
    ov.save(os.path.join(out, "overview.jpg"), quality=88)

    tiles = []
    for i, sl in enumerate(s["slides"]):
        if "focus" not in sl:
            continue
        a, b, c, e = box(sl["focus"], W, H)
        t = img.crop((int(max(a, 0) * W), int(max(b, 0) * H), int(min(c, 1) * W), int(min(e, 1) * H)))
        t.thumbnail((440, 360), Image.LANCZOS)
        tile = Image.new("RGB", (460, 470), (25, 25, 25))
        tile.paste(t, ((460 - t.width) // 2, 5))
        lines = textwrap.wrap(f"{i}. {sl['headline']} | {sl.get('text', '')}", 52)[:5]
        ImageDraw.Draw(tile).multiline_text((6, 370), "\n".join(lines), font=FS, fill=(230, 230, 230))
        tiles.append(tile)
    cols = 4
    sheet = Image.new("RGB", (460 * cols, 470 * max(1, (len(tiles) + cols - 1) // cols)), (0, 0, 0))
    for k, t in enumerate(tiles):
        sheet.paste(t, ((k % cols) * 460, (k // cols) * 470))
    sheet.save(os.path.join(out, "crops.jpg"), quality=88)
    print(os.path.join(out, "overview.jpg"))
    print(os.path.join(out, "crops.jpg"))


if __name__ == "__main__":
    main()
