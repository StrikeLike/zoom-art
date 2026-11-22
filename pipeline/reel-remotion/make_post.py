#!/usr/bin/env python3
"""Same as make_post.sh, but works on Windows too (no bash needed).

Usage (from this folder):  python make_post.py <work-folder-name> [NN] [--date YYYY-MM-DD]
NN = position in the day's posting order (folder NN-<name>); --date = batch date (default: today).
Makes the carousel (10-13 JPG, 1080x1350) and the reel (MP4 1080x1920, max 59 s) into ../works/<name>/out/.
Optional: set BROWSER=<path to chrome-headless-shell> to use a specific browser.
"""
import glob, json, os, shutil, subprocess, sys

from PIL import Image

here = os.path.dirname(os.path.abspath(__file__))
os.chdir(here)
import datetime
args = sys.argv[1:]
batch_date = datetime.date.today()
if "--date" in args:
    i = args.index("--date")
    batch_date = datetime.date.fromisoformat(args[i + 1])
    del args[i:i + 2]
if len(args) not in (1, 2):
    sys.exit(__doc__)
name = args[0]
nn = int(args[1]) if len(args) == 2 else None
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
for f in glob.glob(os.path.join(car, "slide_*.jpg")):  # no stale slides when the count changes
    os.remove(f)
n_slides = len(json.load(open("public/carousel.json", encoding="utf-8"))["slides"])
for n in range(n_slides):
    w = len(str(n_slides - 1))  # Remotion pads frame numbers to the width of the last one
    src = f"out/{name}_c/element-{n:0{w}d}.jpeg"
    if not os.path.exists(src):
        src = f"out/{name}_c/element-{n}.jpeg"
    if os.path.exists(src):
        shutil.copy(src, os.path.join(car, f"slide_{n + 1:02d}.jpg"))
# capped bitrate: detailed paintings otherwise give 100+ MB files
run(["ffmpeg", "-v", "error", "-y", "-i", f"out/{name}_reel.mp4", "-c:v", "libx264", "-preset", "slow", "-crf", "23",
     "-maxrate", "6M", "-bufsize", "12M", "-pix_fmt", "yuv420p", "-movflags", "+faststart", os.path.join(work, "out", "reel.mp4")])

fs = sorted(glob.glob(os.path.join(car, "slide_*.jpg")))
sheet = Image.new("RGB", (360 * 5, 450 * ((len(fs) + 4) // 5)))
for i, f in enumerate(fs):
    sheet.paste(Image.open(f).convert("RGB").resize((360, 450)), ((i % 5) * 360, (i // 5) * 450))
sheet.save(os.path.join(work, "out", "carousel_preview.jpg"), quality=88)

def batch_folder(d):
    """Dated batch folder that sorts newest first by name (Alex, 14 Nov 2026): 9999 - days since 2026-01-01, then the date."""
    return f"{9999 - (d - datetime.date(2026, 1, 1)).days}_{d.isoformat()}"

# ready-to-post folder: gata/<PREFIX_YYYY-MM-DD>/<NN-name>/ with carusel/01-13.jpg, reel.mp4 and the post texts
ready = os.path.abspath(os.path.join(here, "..", "..", "gata", batch_folder(batch_date),
                                     f"{nn:02d}-{name}" if nn else name))
shutil.rmtree(ready, ignore_errors=True)
os.makedirs(os.path.join(ready, "carusel"), exist_ok=True)  # OneDrive can leave the emptied folder behind
for f in fs:
    shutil.copy(f, os.path.join(ready, "carusel", os.path.basename(f).replace("slide_", "")))
shutil.copy(os.path.join(work, "out", "reel.mp4"), os.path.join(ready, "reel.mp4"))
texts = os.path.join(here, "..", "..", "postari", name + ".md")
if os.path.exists(texts):
    shutil.copy(texts, os.path.join(ready, "texte.md"))
else:
    print(f"warning: no post texts yet ({os.path.relpath(texts)})")
if os.name == "nt":  # OneDrive: keep the delivery online-only, nothing stays on the full disk
    subprocess.run('attrib -P +U /s /d "' + os.path.join(ready, "*") + '"', shell=True)
    subprocess.run(f'attrib -P +U "{ready}"', shell=True)
print("done:", ready)
