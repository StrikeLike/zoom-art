"""Build web derivatives from repository originals; no AI, recolouring or upscaling.
Run from anywhere: python site/scripts/prepare-images.py
"""
from pathlib import Path
from PIL import Image, ImageOps
import json, math

SITE = Path(__file__).resolve().parents[1]
ROOT = SITE.parent
SLUGS = ['childrens-games', 'netherlandish-proverbs', 'peasant-wedding', 'fall-of-icarus']
manifest = {}
for slug in SLUGS:
    source = ROOT / 'pipeline' / 'works' / slug
    dest = SITE / 'public' / 'images' / slug
    dest.mkdir(parents=True, exist_ok=True)
    with Image.open(source / 'image.jpg') as original:
        image = ImageOps.exif_transpose(original).convert('RGB')
        width, height = image.size
        sizes = [480, 768, 1280, 1920] if slug == 'childrens-games' else [480, 768, 1280]
        for size in sizes:
            target = min(size, width)
            image.resize((target, round(height * target / width)), Image.Resampling.LANCZOS).save(dest / f'painting-{size}.webp', quality=82, method=6)
        if slug == 'childrens-games':
            script = json.loads((source / 'script.json').read_text(encoding='utf-8-sig'))
            for index, slide in enumerate(script['slides'][1:]):
                cx, cy, w, h = slide['focus']
                box = (round((cx-w/2)*width), round((cy-h/2)*height), round((cx+w/2)*width), round((cy+h/2)*height))
                crop = image.crop(box)
                crop.thumbnail((960, 900), Image.Resampling.LANCZOS)
                crop.save(dest / f'detail-{index+1}.webp', quality=87, method=6)
            tile_size, overlap = 256, 1
            maximum = math.ceil(math.log2(max(width, height)))
            for level in range(maximum+1):
                scale = 2**(maximum-level)
                lw, lh = math.ceil(width/scale), math.ceil(height/scale)
                level_image = image.resize((lw, lh), Image.Resampling.LANCZOS)
                level_dir = dest / 'painting_files' / str(level)
                level_dir.mkdir(parents=True, exist_ok=True)
                for col in range(math.ceil(lw/tile_size)):
                    for row in range(math.ceil(lh/tile_size)):
                        box = (max(0,col*tile_size-overlap), max(0,row*tile_size-overlap), min(lw,(col+1)*tile_size+overlap), min(lh,(row+1)*tile_size+overlap))
                        level_image.crop(box).save(level_dir / f'{col}_{row}.jpg', quality=88)
            (dest / 'painting.dzi').write_text(f'<?xml version="1.0" encoding="UTF-8"?><Image TileSize="256" Overlap="1" Format="jpg" xmlns="http://schemas.microsoft.com/deepzoom/2008"><Size Width="{width}" Height="{height}"/></Image>', encoding='utf-8')
        manifest[slug] = {'width': width, 'height': height, 'source': str((source/'image.jpg').relative_to(ROOT)), 'derivatives': {p.name: p.stat().st_size for p in dest.glob('*.webp')}}
        print(slug, width, height, flush=True)
(SITE / 'public' / 'images' / 'manifest.json').write_text(json.dumps(manifest, indent=2), encoding='utf-8')
sizes = {}
for path in (SITE / 'public' / 'images').rglob('*.webp'):
    with Image.open(path) as derivative:
        sizes['/images/' + path.relative_to(SITE / 'public' / 'images').as_posix()] = list(derivative.size)
(SITE / 'src' / 'data' / 'image-sizes.json').write_text(json.dumps(sizes, indent=2), encoding='utf-8')
