#!/usr/bin/env python3
"""Find and download a painting from Wikimedia Commons into works/<name>/image.jpg.

Only Public domain / CC0 files are accepted. Originals larger than --max px (default 8000)
are decoded with JPEG draft mode and shrunk, so 40000 px scans don't need 10 GB of RAM.

  python tools/fetch_image.py --search "Bruegel Children's Games"          # list candidates
  python tools/fetch_image.py <work> --file "Children's Games (Bruegel).jpg" # download into works/<work>/
"""
import argparse, json, os, re, shutil, sys, tempfile, time, urllib.parse, urllib.request

from PIL import Image

Image.MAX_IMAGE_PIXELS = None
UA = {"User-Agent": "ZoomedArtPipeline/1.0 (https://github.com/StrikeLike/zoom-art)"}
API = "https://commons.wikimedia.org/w/api.php?"
WORKS = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "works")
OK_LICENSES = ("Public domain", "CC0")


def get(url, timeout=120):
    for i in range(4):
        try:
            return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=timeout)
        except Exception as e:
            print(f"  retry {i + 1}: {e}", file=sys.stderr)
            time.sleep(5 * (i + 1))
    raise RuntimeError("download failed: " + url)


def api(**p):
    p.update(format="json", formatversion=2)
    return json.load(get(API + urllib.parse.urlencode(p)))


def search(q, limit=15):
    r = api(action="query", generator="search", gsrsearch=q + " filetype:bitmap", gsrnamespace=6, gsrlimit=limit,
            prop="imageinfo", iiprop="size|extmetadata")
    pages = sorted(r.get("query", {}).get("pages", []), key=lambda p: -p["imageinfo"][0]["width"])
    for pg in pages:
        ii = pg["imageinfo"][0]
        m = ii.get("extmetadata", {})
        lic = m.get("LicenseShortName", {}).get("value")
        desc = re.sub(r"<[^>]+>", "", m.get("ImageDescription", {}).get("value") or "").strip()[:100]
        flag = "ok " if lic in OK_LICENSES else "NO "
        print(f"{flag} {ii['width']:>6}x{ii['height']:<6} {lic:<14} {pg['title'][5:]}\n      {desc}")


def fetch(work, title, max_px):
    ii = api(action="query", prop="imageinfo", iiprop="url|size|extmetadata", titles="File:" + title)["query"]["pages"][0]
    if "imageinfo" not in ii:
        sys.exit(f"not on Commons: {title}")
    ii = ii["imageinfo"][0]
    lic = ii.get("extmetadata", {}).get("LicenseShortName", {}).get("value")
    if lic not in OK_LICENSES:
        sys.exit(f"refused: license is {lic!r}, only {OK_LICENSES} are allowed")
    dst_dir = os.path.join(WORKS, work)
    os.makedirs(dst_dir, exist_ok=True)
    dst = os.path.join(dst_dir, "image.jpg")
    with tempfile.TemporaryDirectory() as tmp:
        raw = os.path.join(tmp, "orig")
        print(f"downloading {ii['width']}x{ii['height']} ({lic}) ...", flush=True)
        with get(ii["url"], timeout=900) as r, open(raw, "wb") as fh:
            shutil.copyfileobj(r, fh, 1 << 20)
        with Image.open(raw) as im:
            w, h = im.size
            if max(w, h) <= max_px and im.format == "JPEG":
                im.close()
                shutil.copy(raw, dst)
            else:
                k = min(1.0, max_px / max(w, h))
                im.draft("RGB", (int(w * k), int(h * k)))  # DCT downscale while decoding, stays >= target
                out = im.convert("RGB")
                if max(out.size) > max_px:
                    k = max_px / max(out.size)
                    out = out.resize((round(out.width * k), round(out.height * k)), Image.LANCZOS)
                out.save(dst, quality=95)
    size = Image.open(dst).size
    print(f"saved {dst} {size}")
    print(f'source text: Wikimedia Commons: {title}, {ii["width"]}x{ii["height"]} ({lic})'
          + (f", saved at {max(size)} px" if max(size) < max(w, h) else ""))


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")  # Windows console: Cyrillic file names
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("work", nargs="?", help="folder name in works/")
    ap.add_argument("--search", help="list Commons candidates, biggest first")
    ap.add_argument("--file", help="exact Commons file name to download (without 'File:')")
    ap.add_argument("--max", type=int, default=8000, help="longest side in px (default 8000)")
    a = ap.parse_args()
    if a.search:
        search(a.search)
    elif a.work and a.file:
        fetch(a.work, a.file, a.max)
    else:
        ap.print_help()
