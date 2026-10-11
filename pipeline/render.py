#!/usr/bin/env python3
"""Zoomed Art renderer: one script per artwork -> carousel (max 10 PNG, 1080x1350) + reel (MP4, 1080x1920).

Usage:
    python3 render.py works/arnolfini            # carousel + reel
    python3 render.py works/arnolfini --only carousel
    python3 render.py works/arnolfini --debug    # draws every focus box on the painting, to tune coordinates
    python3 render.py works/arnolfini --no-upscale

Small images are upscaled automatically (see upscale.py) to the size the deepest zoom needs.

Each work folder holds script.json and the painting image. Output goes to <work>/out/.
Focus boxes are [cx, cy, w] or [cx, cy, w, h]: centre and size of the detail, as fractions of the image (0..1).
The camera always frames the whole box in the free area between the top bar/mini-map and the text,
so the text never covers the detail it talks about. Without h, the box is a landscape rectangle (h = 0.62 * w in pixels).
    python3 render.py works/arnolfini --preview  # quick stills of every reel slide (no video) to check framing
"""
import argparse, json, os, subprocess, sys
from PIL import Image, ImageDraw, ImageFilter, ImageFont

HANDLE = "@zoomed.art"
BRAND = "ZOOMED ART"
# Final slide (Alex, 2026-10-10): urgency, but true: the algorithm rarely shows a page you don't follow
CTA_HEAD = "You may never see this page again."
CTA_SUB = "The algorithm won't show us twice. Follow @zoomed.art"
MAX_SLIDES = 10

CAROUSEL = (1080, 1350)
REEL = (1080, 1920)
FPS = 30
HOLD = 2.7      # minimum seconds a reel shot holds per slide (plus the move)
READ_WPS = 3.0  # reading speed for reel text, words per second; holds stretch to fit the text
LOOK = 1.5      # extra seconds per slide to look at the detail itself
MOVE = 0.9      # seconds of camera move between slides
FOCUS_MARGIN = 0.90  # the focus box fills at most this share of the free area
DRIFT = 0.93    # reel slow push-in: the shot starts this much wider and ends on the framed box
SAFE_GAP = 36   # px kept clear between the detail and the text / mini-map
DEFAULT_BOX_ASPECT = 0.62
# Reel safe zones (px of the 1080x1920 frame), measured on Instagram Reels and YouTube Shorts screenshots
# (Alex, 2026-10-10) and kept wide enough for Facebook Reels and TikTok. Phones crop ~47 px off each side;
# the app header covers the top ~260 px; the like/comment/share column covers x > ~900 from y ~1000 down;
# username + caption cover the bottom ~480 px. Text, logo and mini-map stay inside these margins.
REEL_SAFE = {"top": 270, "bottom": 480, "left": 90, "right": 200}  # h/w in pixels when a focus box has no h
MAX_UPSCALE_W = 6000  # never upscale beyond this width (memory and render time)
upscale_enabled = True

GOLD = (214, 178, 110)
INK = (12, 11, 10)
WHITE = (245, 240, 230)

# fonts are bundled in pipeline/fonts so Windows/macOS render the same as Linux
FONT_DIRS = [os.path.join(os.path.dirname(os.path.abspath(__file__)), "fonts"),
             "/usr/share/fonts/truetype/liberation", "/usr/share/fonts/truetype/dejavu"]
def font(name, size):
    for d in FONT_DIRS:
        p = os.path.join(d, name)
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()

SERIF_B = "LiberationSerif-Bold.ttf"
SERIF_I = "LiberationSerif-Italic.ttf"
SANS = "DejaVuSans.ttf"
SANS_B = "DejaVuSans-Bold.ttf"


# ---------- text helpers ----------
def wrap(draw, text, f, max_w):
    lines = []
    for para in text.split("\n"):
        cur = ""
        for word in para.split():
            test = (cur + " " + word).strip()
            if draw.textlength(test, font=f) <= max_w:
                cur = test
            else:
                if cur:
                    lines.append(cur)
                cur = word
        lines.append(cur)
    return lines

def text_block(draw, x, y, text, f, max_w, fill, spacing=1.25):
    lh = int(f.size * spacing)
    for line in wrap(draw, text, f, max_w):
        draw.text((x, y), line, font=f, fill=fill)
        y += lh
    return y

def block_height(draw, text, f, max_w, spacing=1.25):
    return len(wrap(draw, text, f, max_w)) * int(f.size * spacing)

def fit_font(draw, text, name, size, max_w, max_lines):
    while size > 20:
        f = font(name, size)
        if len(wrap(draw, text, f, max_w)) <= max_lines:
            return f
        size -= 2
    return font(name, size)


# ---------- image helpers ----------
from functools import lru_cache

@lru_cache(maxsize=8)
def gradient(size, start_frac, max_alpha=235):
    """Transparent at top, dark at bottom, starting at start_frac of the height."""
    w, h = size
    g = Image.new("L", (1, h), 0)
    y0 = int(h * start_frac)
    for y in range(y0, h):
        t = (y - y0) / max(1, h - y0)
        g.putpixel((0, y), int(max_alpha * min(1, t * 1.6) ** 1.2))
    g = g.resize((w, h))
    layer = Image.new("RGBA", (w, h), INK + (0,))
    layer.putalpha(g)
    return layer

@lru_cache(maxsize=8)
def top_shade(size, h_px=220, max_alpha=150):
    w, h = size
    g = Image.new("L", (1, h), 0)
    for y in range(h_px):
        g.putpixel((0, y), int(max_alpha * (1 - y / h_px)))
    layer = Image.new("RGBA", (w, h), INK + (0,))
    layer.putalpha(g.resize((w, h)))
    return layer

def cover_bg(img, size, blur=40, dim=0.45):
    """Painting scaled to cover the frame, blurred and dimmed: background for letterboxed shots."""
    w, h = size
    s = max(w / img.width, h / img.height)
    bg = img.convert("RGB").resize((int(img.width * s) + 1, int(img.height * s) + 1), Image.LANCZOS)
    l, t = (bg.width - w) // 2, (bg.height - h) // 2
    bg = bg.crop((l, t, l + w, t + h)).filter(ImageFilter.GaussianBlur(blur))
    return Image.blend(bg, Image.new("RGB", size, INK), 1 - dim).convert("RGBA")

def view_rect(img, cx, cy, wfrac, aspect):
    """Crop rectangle (in image pixels) centred on (cx,cy), width wfrac of image, output aspect w/h."""
    vw = wfrac * img.width
    vh = vw / aspect
    x0 = cx * img.width - vw / 2
    y0 = cy * img.height - vh / 2
    return x0, y0, vw, vh

def full_view(img, aspect, margin=1.0):
    """Camera that shows the whole painting inside the frame."""
    ia = img.width / img.height
    if ia > aspect:
        w = margin
    else:
        w = margin * aspect / ia
    return [0.5, 0.5, w]

def render_view(img_rgba, bg, view, size):
    """Draw the painting through a camera onto bg. Areas outside the painting show bg."""
    W, H = size
    x0, y0, vw, vh = view_rect(img_rgba, view[0], view[1], view[2], W / H)
    sx, sy = vw / W, vh / H
    layer = img_rgba.transform(size, Image.AFFINE, (sx, 0, x0, 0, sy, y0),
                               resample=Image.BICUBIC, fillcolor=(0, 0, 0, 0))
    out = bg.copy()
    out.alpha_composite(layer)
    return out

def inset_map(img, view, size, box_w):
    """Small thumbnail of the whole painting with the zoomed area outlined."""
    th = img.convert("RGB").copy()
    th.thumbnail((box_w, box_w * 2), Image.LANCZOS)
    W, H = size
    x0, y0, vw, vh = view_rect(img, view[0], view[1], view[2], W / H)
    k = th.width / img.width
    d = ImageDraw.Draw(th)
    r = [max(0, x0 * k), max(0, y0 * k), min(th.width - 1, (x0 + vw) * k), min(th.height - 1, (y0 + vh) * k)]
    d.rectangle(r, outline=GOLD, width=3)
    framed = Image.new("RGB", (th.width + 6, th.height + 6), WHITE)
    framed.paste(th, (3, 3))
    return framed


# ---------- slide model ----------
def load(work):
    with open(os.path.join(work, "script.json"), encoding="utf-8") as fh:
        s = json.load(fh)
    slides = list(s["slides"])
    if len(slides) > MAX_SLIDES - 1:
        sys.exit(f"script has {len(slides)} slides; max is {MAX_SLIDES - 1} plus the automatic Follow slide")
    img = Image.open(os.path.join(work, s["image"])).convert("RGBA")
    if upscale_enabled:
        img = ensure_resolution(work, s, img, slides)
    slides.append({"type": "cta"})
    return s, img, slides

def needed_width(slides):
    """Width the painting must have so the deepest zoom still fills 1080 px without stretching."""
    zooms = [sl["focus"][2] for sl in slides if sl.get("focus")]
    deepest = min(zooms + [1.0]) * 0.93      # 0.93 = the reel's slow push-in
    return min(MAX_UPSCALE_W, int(REEL[0] / deepest))

def ensure_resolution(work, s, img, slides):
    """Upscale the painting when it is smaller than the deepest zoom needs. Result is cached in <work>/.cache/."""
    need = needed_width(slides)
    if img.width >= need * 0.9:          # within 10% is not visible on a phone
        return img
    stem = os.path.splitext(os.path.basename(s["image"]))[0]
    cache = os.path.join(work, ".cache", f"{stem}_{need}w.png")
    src = os.path.join(work, s["image"])
    if os.path.exists(cache) and os.path.getmtime(cache) >= os.path.getmtime(src):
        print(f"upscale: using cached {cache}")
        return Image.open(cache).convert("RGBA")
    print(f"upscale: image is {img.width}px wide, deepest zoom needs ~{need}px")
    from upscale import upscale
    big = upscale(img, need)
    os.makedirs(os.path.dirname(cache), exist_ok=True)
    big.save(cache)
    return big.convert("RGBA")

_measure = ImageDraw.Draw(Image.new("RGBA", (1, 1)))

def layout(img, slide, size, fmt):
    """Where text and mini-map go on a slide. Shared by drawing and by camera framing, so they can't disagree."""
    W, H = size
    if fmt == "reel":
        pad = REEL_SAFE["left"]
        maxw = W - REEL_SAFE["left"] - REEL_SAFE["right"]
        brand_y = REEL_SAFE["top"] + 20
        text_bottom = H - REEL_SAFE["bottom"]
    else:
        pad = 72
        maxw = W - 2 * pad
        brand_y = 58
        text_bottom = H - pad
    L = {"pad": pad, "maxw": maxw, "brand_y": brand_y, "map": None, "text_top": H}
    t = slide.get("type", "detail")
    if t == "cover":
        fh = fit_font(_measure, slide["headline"], SERIF_B, 92, maxw, 4)
        hh = block_height(_measure, slide["headline"], fh, maxw, 1.1)
        L.update(fh=fh, text_top=text_bottom - (0 if fmt == "reel" else 40) - hh - 45
                 - block_height(_measure, slide.get("sub", "x"), font(SERIF_I, 40), maxw))  # sub may wrap
    elif t == "detail":
        fh = fit_font(_measure, slide["headline"], SERIF_B, 64, maxw, 3)
        ft = fit_font(_measure, slide.get("text", ""), SANS, 36, maxw, 6)
        hh = block_height(_measure, slide["headline"], fh, maxw, 1.12)
        th = block_height(_measure, slide.get("text", ""), ft, maxw, 1.35)
        bottom = text_bottom
        L.update(fh=fh, ft=ft, text_top=bottom - th - 28 - hh)
        if slide.get("focus") and slide.get("map", True):
            box_w = 170 if fmt == "carousel" else 190
            k = min(box_w / img.width, 2 * box_w / img.height)
            mw, mh = int(img.width * k) + 6, int(img.height * k) + 6
            right = pad if fmt == "carousel" else REEL_SAFE["left"]  # top-right is free below the app header
            L["map"] = (W - right - mw, 120 if fmt == "carousel" else brand_y, mw, mh)
    return L

def safe_area(img, slide, size, fmt):
    """Vertical band (top, bottom) in frame pixels where a detail can sit without touching text or mini-map."""
    L = layout(img, slide, size, fmt)
    top = L["brand_y"] + 60
    if L["map"]:
        top = max(top, L["map"][1] + L["map"][3] + SAFE_GAP)
    return top, L["text_top"] - SAFE_GAP

def focus_box(img, focus):
    """Focus [cx, cy, w(, h)] as a pixel box (centre x, centre y, width, height)."""
    cx, cy, w = focus[:3]
    bw = w * img.width
    bh = focus[3] * img.height if len(focus) > 3 else bw * DEFAULT_BOX_ASPECT
    return cx * img.width, cy * img.height, bw, bh

def fit_view(img, slide, size, fmt, margin=FOCUS_MARGIN):
    """Camera that shows the whole focus box inside the safe area, as large as possible.
    It slides towards the painting's edges to avoid empty borders, but never so far that the box leaves the safe area."""
    W, H = size
    top, bot = safe_area(img, slide, size, fmt)
    bx, by, bw, bh = focus_box(img, slide["focus"])
    s = margin * min(W / bw, (bot - top) / bh)          # frame px per image px
    vw, vh = W / s, H / s
    slack_x = (W - bw * s) / 2 / s
    slack_y = ((bot - top) - bh * s) / 2 / s
    x0 = bx - (W / 2) / s
    y0 = by - ((top + bot) / 2) / s
    def settle(v0, span, limit, slack):
        if span > limit:
            return v0
        want = min(max(v0, 0), limit - span)
        return v0 + min(max(want - v0, -slack), slack)
    x0 = settle(x0, vw, img.width, slack_x)
    y0 = settle(y0, vh, img.height, slack_y)
    return [(x0 + vw / 2) / img.width, (y0 + vh / 2) / img.height, vw / img.width]

def slide_view(img, slide, size, fmt, margin=FOCUS_MARGIN):
    if slide.get("focus"):
        return fit_view(img, slide, size, fmt, margin)
    return full_view(img, size[0] / size[1], margin=slide.get("margin", 0.92))


def draw_overlay(frame, s, slide, idx, total, img, view, alpha=1.0, fmt="carousel"):
    """Text and branding over a rendered shot. alpha fades the text in (reel)."""
    W, H = frame.size
    over = Image.new("RGBA", frame.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(over)
    a = int(255 * alpha)
    t = slide.get("type", "detail")
    L = layout(img, slide, frame.size, fmt)
    pad, maxw = L["pad"], L["maxw"]

    # brand bar
    fb = font(SANS_B, 26)
    d.text((pad, L["brand_y"]), BRAND, font=fb, fill=GOLD + (230,), spacing=4)
    if fmt == "carousel":
        num = f"{idx + 1}/{total}"
        d.text((W - pad - d.textlength(num, font=fb), 58), num, font=fb, fill=WHITE + (200,))

    L = layout(img, slide, frame.size, fmt)
    if t == "cover":
        fh = L["fh"]
        fs = font(SERIF_I, 40)
        sub = slide.get("sub", f'{s["artist"]}, {s["year"]}')
        y = L["text_top"]
        y = text_block(d, pad, y, slide["headline"], fh, maxw, WHITE + (a,), 1.1)
        d.rectangle([pad, y + 18, pad + 90, y + 23], fill=GOLD + (a,))
        text_block(d, pad, y + 45, sub, fs, maxw, GOLD + (a,))
        if fmt == "carousel":
            sw = font(SANS, 26)
            msg = "Swipe to zoom in  →"
            d.text((W - pad - d.textlength(msg, font=sw), H - 70), msg, font=sw, fill=WHITE + (int(a * 0.8),))
    elif t == "cta":
        fh = font(SERIF_B, 72)
        fs = font(SERIF_I, 42)
        y = H // 2 - (260 if fmt == "carousel" else 370)   # reel: stay above the like/share column
        for text, f, col in ((CTA_HEAD, fh, WHITE), (CTA_SUB, fs, GOLD)):
            for line in wrap(d, text, f, min(maxw, 860)):
                w = d.textlength(line, font=f)
                d.text(((W - w) / 2, y), line, font=f, fill=col + (a,))
                y += int(f.size * 1.2)
            y += 30
        cap = f'{s["title"]} · {s["artist"]}, {s["year"]}'
        fc = font(SANS, 26)
        w = d.textlength(cap, font=fc)
        d.text(((W - w) / 2, y + 40), cap, font=fc, fill=WHITE + (int(a * 0.7),))
    else:
        fh, ft = L["fh"], L["ft"]
        y = L["text_top"]
        y = text_block(d, pad, y, slide["headline"], fh, maxw, WHITE + (a,), 1.12)
        text_block(d, pad, y + 28, slide.get("text", ""), ft, maxw, (232, 226, 214, a), 1.35)
        if L["map"]:
            m = inset_map(img, view, frame.size, 170 if fmt == "carousel" else 190)
            mx, my = L["map"][0], L["map"][1]
            m = m.convert("RGBA")
            m.putalpha(int(235 * alpha))
            over.alpha_composite(m, (mx, my))

    frame.alpha_composite(over)
    return frame


def compose(img, bg, s, slide, idx, total, view, size, fmt, alpha=1.0):
    t = slide.get("type", "detail")
    frame = render_view(img, bg, view, size)
    if t == "cta":
        frame = Image.blend(frame, Image.new("RGBA", size, INK + (255,)), 0.72)
    else:
        frame.alpha_composite(top_shade(size))
        top = layout(img, slide, size, fmt)["text_top"]
        start = max(0.3, round((top - 220) / size[1], 2))   # darken only from just above the text down
        frame.alpha_composite(gradient(size, start))
    return draw_overlay(frame, s, slide, idx, total, img, view, alpha, fmt)


# ---------- outputs ----------
def contact_sheet(frames, cols, path, w=360):
    """Small overview image of all slides, for a quick check on the phone."""
    ims = [f.convert("RGB").resize((w, int(w * f.height / f.width))) for f in frames]
    h = ims[0].height
    rows = (len(ims) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * w, rows * h), INK)
    for n, im in enumerate(ims):
        sheet.paste(im, ((n % cols) * w, (n // cols) * h))
    sheet.save(path, quality=85)

def render_carousel(work, s, img, slides):
    out = os.path.join(work, "out", "carousel")
    os.makedirs(out, exist_ok=True)
    for f in os.listdir(out):
        os.remove(os.path.join(out, f))
    bg = cover_bg(img, CAROUSEL)
    frames = []
    for i, sl in enumerate(slides):
        view = slide_view(img, sl, CAROUSEL, "carousel")
        fr = compose(img, bg, s, sl, i, len(slides), view, CAROUSEL, "carousel")
        fr.convert("RGB").save(os.path.join(out, f"slide_{i + 1:02d}.jpg"), quality=93)
        frames.append(fr)
    contact_sheet(frames, 5, os.path.join(work, "out", "carousel_preview.jpg"))
    print(f"carousel: {len(slides)} slides -> {out}")

def ease(t):
    return t * t * (3 - 2 * t)

def lerp_view(a, b, t):
    # interpolate zoom in log space so the move feels even
    import math
    w = math.exp(math.log(a[2]) + (math.log(b[2]) - math.log(a[2])) * t)
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, w]

def hold_frames(sl):
    """Frames a reel slide stays on screen: long enough to read its text, or slide["hold"] seconds if set."""
    if "hold" in sl:
        return int(sl["hold"] * FPS)
    words = len((sl.get("headline", "") + " " + sl.get("text", "") + " " + sl.get("sub", "")).split())
    return int((LOOK + words / READ_WPS) * FPS)

def reel_shots(img, slides):
    """(start, end) camera per slide: a slow push-in that ends with the focus box framed above the text."""
    shots = []
    for sl in slides:
        end = slide_view(img, sl, REEL, "reel")
        if sl.get("focus"):
            start = slide_view(img, sl, REEL, "reel", FOCUS_MARGIN * DRIFT)
        else:
            start, end = end, [end[0], end[1], end[2] * DRIFT]
        shots.append((start, end))
    return shots

def render_reel(work, s, img, slides, stills_only=False):
    out = os.path.join(work, "out")
    os.makedirs(out, exist_ok=True)
    path = os.path.join(out, "reel.mp4")
    W, H = REEL
    bg = cover_bg(img, REEL)
    shots = reel_shots(img, slides)
    stills = [compose(img, bg, s, sl, i, len(slides), shots[i][1], REEL, "reel")
              for i, sl in enumerate(slides)]
    contact_sheet(stills, 5, os.path.join(out, "reel_preview.jpg"), w=270)
    if stills_only:
        print("reel preview ->", os.path.join(out, "reel_preview.jpg"))
        return
    cmd = ["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24",
           "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
           "-c:v", "libx264", "-preset", "medium", "-crf", "23", "-maxrate", "8M", "-bufsize", "16M",
           "-pix_fmt", "yuv420p",  # capped bitrate: detailed paintings otherwise give 300 MB files
           "-movflags", "+faststart", path]
    p = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    n_hold, n_move = int(HOLD * FPS), int(MOVE * FPS)
    total = 0
    for i, sl in enumerate(slides):
        start, end = shots[i]
        hold = max(n_hold, hold_frames(sl)) + (int(1.0 * FPS) if sl.get("type") == "cta" else 0)
        for k in range(hold):
            t = k / max(1, hold - 1)
            cam = lerp_view(start, end, t)
            alpha = min(1.0, k / (0.5 * FPS))
            fr = compose(img, bg, s, sl, i, len(slides), cam, REEL, "reel", alpha)
            p.stdin.write(fr.convert("RGB").tobytes()); total += 1
        if i + 1 < len(slides):
            nxt = shots[i + 1][0]
            for k in range(n_move):
                t = ease(k / max(1, n_move - 1))
                cam = lerp_view(end, nxt, t)
                fr = render_view(img, bg, cam, REEL)
                fr.alpha_composite(top_shade(REEL))
                p.stdin.write(fr.convert("RGB").tobytes()); total += 1
    p.stdin.close()
    p.wait()
    print(f"reel: {total / FPS:.1f}s -> {path}")

def render_debug(work, s, img, slides):
    """Focus boxes (green) plus what the carousel (red) and reel (blue) actually show for each slide."""
    out = os.path.join(work, "out")
    os.makedirs(out, exist_ok=True)
    im = img.convert("RGB").copy()
    d = ImageDraw.Draw(im)
    lw = max(3, img.width // 400)
    f = font(SANS_B, max(24, img.width // 40))
    for i, sl in enumerate(slides):
        if not sl.get("focus"):
            continue
        for size, fmt, col in ((CAROUSEL, "carousel", (255, 60, 60)), (REEL, "reel", (60, 200, 255))):
            x0, y0, vw, vh = view_rect(img, *slide_view(img, sl, size, fmt), size[0] / size[1])
            d.rectangle([x0, y0, x0 + vw, y0 + vh], outline=col, width=lw)
        bx, by, bw, bh = focus_box(img, sl["focus"])
        d.rectangle([bx - bw / 2, by - bh / 2, bx + bw / 2, by + bh / 2], outline=(60, 230, 90), width=lw)
        d.text((bx - bw / 2 + 8, by - bh / 2 + 8), str(i + 1), fill=(60, 230, 90), font=f)
    im.save(os.path.join(out, "debug_focus.jpg"), quality=85)
    print("debug: green = focus box, red = carousel view, blue = reel view ->", os.path.join(out, "debug_focus.jpg"))


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("work")
    ap.add_argument("--only", choices=["carousel", "reel"])
    ap.add_argument("--debug", action="store_true")
    ap.add_argument("--preview", action="store_true", help="only write out/reel_preview.jpg (one still per reel slide)")
    ap.add_argument("--no-upscale", action="store_true", help="use the image as is, even if it is small")
    a = ap.parse_args()
    upscale_enabled = not a.no_upscale
    s, img, slides = load(a.work)
    if a.debug:
        render_debug(a.work, s, img, slides)
        sys.exit()
    if a.preview:
        render_reel(a.work, s, img, slides, stills_only=True)
        sys.exit()
    if a.only != "reel":
        render_carousel(a.work, s, img, slides)
    if a.only != "carousel":
        render_reel(a.work, s, img, slides)
