#!/usr/bin/env python3
"""Build a bitmap font atlas for the news-image entry.

Renders DejaVu Sans (bold + regular) glyphs with PIL and emits a
TypeScript module holding bit-packed glyph bitmaps. The entry program
(main.ts) stamps these bitmaps to draw all text - no font files and no
network are needed at runtime.
"""
import base64
import json
from PIL import Image, ImageDraw, ImageFont

CHARSET = (
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    "abcdefghijklmnopqrstuvwxyz"
    "0123456789"
    " .,;:!?-'\"'\"()[]/\\%$€£#&@*+=<>_–—·’‘“”~"
)
# sizes: (font_path, pixel_size, key)
FONTS = [
    ("bold", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 84),
    ("bold", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 56),
    ("bold", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 38),
    ("bold", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 26),
    ("reg", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 30),
    ("reg", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 24),
]


def render_glyph(font, ch):
    """Return dict with packed 1-bit bitmap + metrics, or None if blank."""
    # bbox relative to anchor 'la' (left, ascender): (x0, y0, x1, y1); y grows down, baseline at y=ascent
    bbox = font.getbbox(ch, anchor="la")
    ascent, descent = font.getmetrics()
    x0, y0, x1, y1 = bbox
    w = x1 - x0
    h = y1 - y0
    adv = font.getlength(ch)
    if w <= 0 or h <= 0:
        return {"w": 0, "h": 0, "ax": 0, "ay": 0, "adv": round(adv), "data": ""}
    img = Image.new("L", (w, h), 0)
    d = ImageDraw.Draw(img)
    d.text((-x0, -y0), ch, font=font, fill=255, anchor="la")
    px = img.load()
    # pack bits, threshold 128, row-major, MSB first
    bits = bytearray()
    cur = 0
    nbits = 0
    for y in range(h):
        for x in range(w):
            cur = (cur << 1) | (1 if px[x, y] >= 128 else 0)
            nbits += 1
            if nbits == 8:
                bits.append(cur)
                cur = 0
                nbits = 0
    if nbits:
        bits.append(cur << (8 - nbits))
    return {
        "w": w,
        "h": h,
        "ax": x0,          # left bearing: glyph left edge relative to pen x
        "ay": y0,          # top edge relative to ascender line (baseline = ascent)
        "adv": round(adv),
        "data": base64.b64encode(bytes(bits)).decode(),
    }


out = {}
for weight, path, size in FONTS:
    font = ImageFont.truetype(path, size)
    ascent, descent = font.getmetrics()
    glyphs = {}
    for ch in CHARSET:
        g = render_glyph(font, ch)
        glyphs[ch] = g
    key = f"{weight}{size}"
    out[key] = {"ascent": ascent, "descent": descent, "size": size, "glyphs": glyphs}
    print(key, "ascent", ascent, "descent", descent, "glyphs", len(glyphs))

with open("/home/hatch/workspace/makefun/news-image-20261119/font.json", "w") as f:
    f.write(json.dumps(out, separators=(",", ":")))

import os
print("font.json bytes:", os.path.getsize("/home/hatch/workspace/makefun/news-image-20261119/font.json"))
