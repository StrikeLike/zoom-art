#!/usr/bin/env python3
"""Same as make_post.sh, but works on Windows too (no bash needed).

Usage (from this folder):  python make_post.py <work-folder-name>
Makes the carousel (10 JPG, 1080x1350) and the reel (MP4 1080x1920, max 59 s) into ../works/<name>/out/.
Optional: set BROWSER=<path to chrome-headless-shell> to use a specific browser.
"""
import glob, os, shutil, subprocess, sys

from PIL import Image

here = os.path.dirname(os.path.abspath(__file__))
os.chdir(here)
if len(sys.argv) != 2:
    sys.exit(__doc__)
name = sys.argv[1]
work = os.path.join("..", "works", name)
if not os.path.isdir(work):
    sys.exit(f"no such work folder: {work}")
npx = "npx.cmd" if os.name == "nt" else "npx"
extra = [f"--browser-executable={os.environ['BROWSER']}"] if os.environ.get("BROWSER") else []


def run(cmd):
    print(">", " ".join(cmd), flush=True)
    subprocess.run(cmd, check=True)


run([sys.executable, "export_shots.py", "..", work, "public"])
run([npx, "remotion", "render", "Carousel", f"out/{name}_c", "--sequence", "--image-format=jpeg", "--jpeg-quality=93", *extra])
run([npx, "remotion", "render", "Reel", f"out/{name}_reel.mp4", *extra])

car = os.path.join(work, "out", "carousel")
os.makedirs(car, exist_ok=True)
for n in range(10):
    src = f"out/{name}_c/element-{n}.jpeg"
    if os.path.exists(src):
        shutil.copy(src, os.path.join(car, f"slide_{n + 1:02d}.jpg"))
# capped bitrate: detailed paintings otherwise give 100+ MB files
run(["ffmpeg", "-v", "error", "-y", "-i", f"out/{name}_reel.mp4", "-c:v", "libx264", "-preset", "slow", "-crf", "23",
     "-maxrate", "6M", "-bufsize", "12M", "-pix_fmt", "yuv420p", "-movflags", "+faststart", os.path.join(work, "out", "reel.mp4")])

fs = sorted(glob.glob(os.path.join(car, "slide_*.jpg")))
sheet = Image.new("RGB", (360 * 5, 900))
for i, f in enumerate(fs):
    sheet.paste(Image.open(f).convert("RGB").resize((360, 450)), ((i % 5) * 360, (i // 5) * 450))
sheet.save(os.path.join(work, "out", "carousel_preview.jpg"), quality=88)

# ready-to-post folder: gata/<name>/ with carusel/01-10.jpg, reel.mp4 and the post texts
ready = os.path.abspath(os.path.join(here, "..", "..", "gata", name))
shutil.rmtree(ready, ignore_errors=True)
os.makedirs(os.path.join(ready, "carusel"))
for f in fs:
    shutil.copy(f, os.path.join(ready, "carusel", os.path.basename(f).replace("slide_", "")))
shutil.copy(os.path.join(work, "out", "reel.mp4"), os.path.join(ready, "reel.mp4"))
texts = os.path.join(here, "..", "..", "postari", name + ".md")
if os.path.exists(texts):
    shutil.copy(texts, os.path.join(ready, "texte.md"))
else:
    print(f"warning: no post texts yet ({os.path.relpath(texts)})")
print("done:", ready)
