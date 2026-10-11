#!/usr/bin/env python3
"""AI upscaling for paintings that are too small for deep zooms.

Uses Real-ESRGAN x4plus (BSD-3, github.com/xinntao/Real-ESRGAN) converted to ONNX, run on CPU with onnxruntime.
Falls back to a plain Lanczos resize when onnxruntime or the model file is missing.

Standalone:  python3 upscale.py in.jpg out.png [--width 5000]
"""
import os, sys, time
from PIL import Image

MODEL = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models", "realesrgan_x4plus.onnx")
TILE = 192      # input tile size; smaller uses less memory
PAD = 12        # overlap per side so tile seams don't show


def _ai_x4(img, log=print):
    import numpy as np
    import onnxruntime as ort
    sess = ort.InferenceSession(MODEL, providers=["CPUExecutionProvider"])
    a = np.asarray(img.convert("RGB"), dtype=np.float32) / 255.0
    h, w, _ = a.shape
    out = np.zeros((h * 4, w * 4, 3), dtype=np.float32)
    tiles = [(y, x) for y in range(0, h, TILE) for x in range(0, w, TILE)]
    t0 = time.time()
    for n, (y, x) in enumerate(tiles, 1):
        y0, x0 = max(0, y - PAD), max(0, x - PAD)
        y1, x1 = min(h, y + TILE + PAD), min(w, x + TILE + PAD)
        inp = a[y0:y1, x0:x1].transpose(2, 0, 1)[None]
        res = sess.run(None, {"input": inp})[0][0].transpose(1, 2, 0)
        ty, tx = min(TILE, h - y), min(TILE, w - x)
        oy, ox = (y - y0) * 4, (x - x0) * 4
        out[y * 4:(y + ty) * 4, x * 4:(x + tx) * 4] = res[oy:oy + ty * 4, ox:ox + tx * 4]
        if n % 10 == 0 or n == len(tiles):
            el = time.time() - t0
            log(f"  upscale: tile {n}/{len(tiles)}, ~{el / n * (len(tiles) - n) / 60:.1f} min left")
    return Image.fromarray((out.clip(0, 1) * 255 + 0.5).astype("uint8"))


def upscale(img, target_w, log=print):
    """Return img enlarged to target_w px wide. AI (x4, repeated if needed) then Lanczos to the exact size."""
    if img.width >= target_w:
        return img
    alpha = img.getchannel("A") if img.mode == "RGBA" else None
    try:
        import onnxruntime  # noqa: F401
        if not os.path.exists(MODEL):
            raise ImportError(f"model missing: {MODEL}")
        cur = img
        while cur.width < target_w:
            log(f"  upscale: Real-ESRGAN x4 on {cur.width}x{cur.height}")
            # shrink first if a full x4 would overshoot a lot: saves time, same result
            need = target_w / 4
            if cur.width > need * 1.15:
                cur = cur.resize((int(need * 1.15), int(cur.height * need * 1.15 / cur.width)), Image.LANCZOS)
            cur = _ai_x4(cur, log)
        method = "Real-ESRGAN"
    except ImportError as e:
        log(f"  upscale: AI not available ({e}); using Lanczos resize. Install with: pip install onnxruntime numpy")
        cur = img
        method = "Lanczos"
    h = round(img.height * target_w / img.width)
    out = cur.convert("RGB").resize((target_w, h), Image.LANCZOS)
    if alpha is not None:
        out.putalpha(alpha.resize(out.size, Image.LANCZOS))
    log(f"  upscale: {img.width}x{img.height} -> {out.width}x{out.height} ({method})")
    return out


if __name__ == "__main__":
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument("src"); ap.add_argument("dst")
    ap.add_argument("--width", type=int, help="target width (default: 4x)")
    a = ap.parse_args()
    im = Image.open(a.src)
    upscale(im, a.width or im.width * 4).save(a.dst)
