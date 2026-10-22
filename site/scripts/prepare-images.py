"""Build web derivatives from repository originals; no AI, recolouring or upscaling.
Run from anywhere: python site/scripts/prepare-images.py [slug ...] [--force]

For every work in src/data/published.json (or only the slugs given) it writes into public/images/<slug>/:
whole-painting WebPs, one crop per guided detail, and a DZI tile pyramid. Works whose image.jpg and
script.json are older than their outputs are skipped unless --force is given.
Sizes go to src/data/images.json, which the pages read.
"""
from pathlib import Path
from PIL import Image, ImageOps
import json, math, shutil, sys

Image.MAX_IMAGE_PIXELS = None
SITE = Path(__file__).resolve().parents[1]
ROOT = SITE.parent
WIDTHS = [480, 768, 1280, 1920]
TILE, OVERLAP = 510, 1  # 512 px tiles: a quarter of the files of 256 px tiles

args = [a for a in sys.argv[1:] if not a.startswith('--')]
force = '--force' in sys.argv
published = json.loads((SITE / 'src' / 'data' / 'published.json').read_text(encoding='utf-8'))['works']
index_path = SITE / 'src' / 'data' / 'images.json'
index = json.loads(index_path.read_text(encoding='utf-8')) if index_path.exists() else {}


def build(slug):
    source = ROOT / 'pipeline' / 'works' / slug
    dest = SITE / 'public' / 'images' / slug
    script = json.loads((source / 'script.json').read_text(encoding='utf-8-sig'))
    dzi = dest / 'painting.dzi'
    newest = max((source / 'image.jpg').stat().st_mtime, (source / 'script.json').stat().st_mtime)
    if not force and slug in index and dzi.exists() and dzi.stat().st_mtime > newest:
        print(slug, 'up to date', flush=True)
        return
    shutil.rmtree(dest, ignore_errors=True)
    dest.mkdir(parents=True)
    with Image.open(source / 'image.jpg') as original:
        image = ImageOps.exif_transpose(original).convert('RGB')
    width, height = image.size
    sizes = {}
    for size in WIDTHS:
        target = min(size, width)
        out = image.resize((target, round(height * target / width)), Image.Resampling.LANCZOS)
        out.save(dest / f'painting-{size}.webp', quality=82, method=6)
        sizes[str(size)] = list(out.size)
    details = []
    for i, slide in enumerate(s for s in script['slides'] if 'focus' in s):
        cx, cy, w, h = slide['focus']
        crop = image.crop((round(max(0, cx - w / 2) * width), round(max(0, cy - h / 2) * height),
                           round(min(1, cx + w / 2) * width), round(min(1, cy + h / 2) * height)))
        crop.thumbnail((960, 900), Image.Resampling.LANCZOS)
        crop.save(dest / f'detail-{i + 1}.webp', quality=87, method=6)
        details.append(list(crop.size))
    maximum = math.ceil(math.log2(max(width, height)))
    for level in range(maximum + 1):
        scale = 2 ** (maximum - level)
        lw, lh = math.ceil(width / scale), math.ceil(height / scale)
        level_image = image.resize((lw, lh), Image.Resampling.LANCZOS)
        level_dir = dest / 'painting_files' / str(level)
        level_dir.mkdir(parents=True)
        for col in range(math.ceil(lw / TILE)):
            for row in range(math.ceil(lh / TILE)):
                box = (max(0, col * TILE - OVERLAP), max(0, row * TILE - OVERLAP),
                       min(lw, (col + 1) * TILE + OVERLAP), min(lh, (row + 1) * TILE + OVERLAP))
                level_image.crop(box).save(level_dir / f'{col}_{row}.jpg', quality=84)
    dzi.write_text(f'<?xml version="1.0" encoding="UTF-8"?><Image TileSize="{TILE}" Overlap="{OVERLAP}" Format="jpg" '
                   f'xmlns="http://schemas.microsoft.com/deepzoom/2008"><Size Width="{width}" Height="{height}"/></Image>',
                   encoding='utf-8')
    index[slug] = {'width': width, 'height': height, 'sizes': sizes, 'details': details}
    print(slug, width, height, len(details), 'details', flush=True)


for slug in args or published:
    build(slug)
index = {slug: index[slug] for slug in published if slug in index}
index_path.write_text(json.dumps(index, indent=1), encoding='utf-8')
