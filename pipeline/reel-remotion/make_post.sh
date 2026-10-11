#!/bin/bash
# Usage (from this folder): ./make_post.sh <work-folder-name>
# Makes the carousel (10 JPG, 1080x1350) and the reel (MP4 1080x1920, max 59 s) into ../works/<name>/out/.
# Optional: BROWSER=/path/to/chrome-headless-shell ./make_post.sh <name>
set -e
cd "$(dirname "$0")"
WORK=../works/$1
EXTRA=${BROWSER:+--browser-executable=$BROWSER}
python3 export_shots.py .. $WORK public
npx remotion render Carousel out/$1_c --sequence --image-format=jpeg --jpeg-quality=93 $EXTRA
npx remotion render Reel out/$1_reel.mp4 $EXTRA
mkdir -p $WORK/out/carousel
for n in $(seq 0 9); do [ -f out/$1_c/element-$n.jpeg ] && cp out/$1_c/element-$n.jpeg $WORK/out/carousel/slide_$(printf %02d $((n+1))).jpg; done
# capped bitrate: detailed paintings otherwise give 100+ MB files
ffmpeg -v error -y -i out/$1_reel.mp4 -c:v libx264 -preset slow -crf 23 -maxrate 6M -bufsize 12M -pix_fmt yuv420p -movflags +faststart $WORK/out/reel.mp4
python3 -c "
import glob, sys
from PIL import Image
fs = sorted(glob.glob(sys.argv[1] + '/out/carousel/slide_*.jpg'))
ims = [Image.open(f).convert('RGB').resize((360, 450)) for f in fs]
sheet = Image.new('RGB', (360 * 5, 900))
for i, im in enumerate(ims):
    sheet.paste(im, ((i % 5) * 360, (i // 5) * 450))
sheet.save(sys.argv[1] + '/out/carousel_preview.jpg', quality=88)" $WORK
# ready-to-post folder: gata/<name>/ with carusel/01-10.jpg, reel.mp4 and the post texts
READY=../../gata/$1
rm -rf $READY && mkdir -p $READY/carusel
for f in $WORK/out/carousel/slide_*.jpg; do cp $f $READY/carusel/$(basename $f | sed 's/slide_//'); done
cp $WORK/out/reel.mp4 $READY/reel.mp4
[ -f ../../postari/$1.md ] && cp ../../postari/$1.md $READY/texte.md || echo "warning: no post texts yet (postari/$1.md)"
echo "done: $READY"
