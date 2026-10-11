#!/usr/bin/env python3
"""Contact sheet for suggested paintings: thumbnail + title + one-line hook, so Alex sees them at a glance.

Input: a JSON list of {"title", "artist", "year", "file" (exact Commons file name), "hook"}.
Thumbnails come from Wikimedia Commons; the license and original size are checked and printed on each card.

  python tools/suggest_sheet.py sugestii.json             -> gata/_sugestii/<date>.jpg (synced to the phone)
  python tools/suggest_sheet.py sugestii.json -o out.jpg
"""
import argparse, datetime, io, json, os, sys, textwrap

from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fetch_image import OK_LICENSES, api, get  # noqa: E402

PIPE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONTS = os.path.join(PIPE, "fonts")
GATA = os.path.join(os.path.dirname(PIPE), "gata", "_sugestii")
BG, GOLD, WHITE, GREY, RED = (18, 16, 14), (214, 178, 110), (245, 240, 230), (170, 165, 155), (255, 99, 99)
CARD_W, IMG_H, PAD, COLS = 720, 560, 36, 2


def font(name, size):
    return ImageFont.truetype(os.path.join(FONTS, name), size)


def thumb(file):
    """-> (PIL image ~1000 px, original 'WxH', license) from Commons."""
    pg = api(action="query", prop="imageinfo", iiprop="url|size|extmetadata", iiurlwidth=1000,
             titles="File:" + file)["query"]["pages"][0]
    if "imageinfo" not in pg:
        raise RuntimeError(f"not on Commons: {file}")
    ii = pg["imageinfo"][0]
    lic = ii.get("extmetadata", {}).get("LicenseShortName", {}).get("value") or "?"
    im = Image.open(io.BytesIO(get(ii.get("thumburl") or ii["url"]).read())).convert("RGB")
    return im, f"{ii['width']}x{ii['height']}", lic


def card(n, item):
    title_f, meta_f, hook_f, num_f = (font("LiberationSerif-Bold.ttf", 40), font("DejaVuSans.ttf", 22),
                                      font("DejaVuSans.ttf", 26), font("DejaVuSans-Bold.ttf", 30))
    hook = textwrap.wrap(item.get("hook", ""), 46)
    title = textwrap.wrap(item["title"], 30)
    h = IMG_H + 30 + len(title) * 46 + 40 + len(hook) * 34 + 30
    c = Image.new("RGB", (CARD_W, h), BG)
    d = ImageDraw.Draw(c)
    try:
        im, size, lic = thumb(item["file"])
        im.thumbnail((CARD_W, IMG_H), Image.LANCZOS)
        c.paste(im, ((CARD_W - im.width) // 2, (IMG_H - im.height) // 2))
    except Exception as e:
        size, lic = "?", "?"
        d.text((20, IMG_H // 2), f"thumbnail missing: {e}"[:60], font=meta_f, fill=RED)
    d.rounded_rectangle((10, 10, 62, 56), 8, fill=GOLD)
    d.text((36, 33), str(n), font=num_f, fill=BG, anchor="mm")
    y = IMG_H + 30
    for line in title:
        d.text((0, y), line, font=title_f, fill=WHITE)
        y += 46
    ok = lic in OK_LICENSES
    d.text((0, y + 4), f"{item.get('artist', '')}, {item.get('year', '')}  ·  {size} px  ·  {lic}",
           font=meta_f, fill=GOLD if ok else RED)
    y += 40
    for line in hook:
        d.text((0, y), line, font=hook_f, fill=GREY)
        y += 34
    print(f"{n}. {item['title']}: {size} px, {lic}{'' if ok else '  <-- NOT public domain'}")
    return c


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("list", help="JSON file with the suggestions")
    ap.add_argument("-o", "--out", help="output JPG (default gata/_sugestii/<date>.jpg)")
    a = ap.parse_args()
    items = json.load(open(a.list, encoding="utf-8"))
    cards = [card(i + 1, it) for i, it in enumerate(items)]
    rows = [cards[i:i + COLS] for i in range(0, len(cards), COLS)]
    row_h = [max(c.height for c in r) for r in rows]
    W = COLS * CARD_W + (COLS + 1) * PAD
    sheet = Image.new("RGB", (W, sum(row_h) + (len(rows) + 1) * PAD + 90), BG)
    d = ImageDraw.Draw(sheet)
    d.text((PAD, 30), "ZOOMED ART  ·  SUGESTII", font=font("DejaVuSans-Bold.ttf", 30), fill=GOLD)
    y = 90 + PAD
    for r, rh in zip(rows, row_h):
        for j, c in enumerate(r):
            sheet.paste(c, (PAD + j * (CARD_W + PAD), y))
        y += rh + PAD
    out = a.out or os.path.join(GATA, datetime.datetime.now().strftime("%Y-%m-%d_%H%M") + ".jpg")
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    sheet.save(out, quality=88)
    print(f"sheet -> {out}")


if __name__ == "__main__":
    main()
