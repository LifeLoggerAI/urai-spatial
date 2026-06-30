#!/usr/bin/env python3
"""Final URAI launch asset polish.

Runs locally from the repository root. It repairs remaining soft/flat raster assets
inside urai-tier1/public/assets/urai while preserving filenames and route wiring.
"""

from __future__ import annotations

from pathlib import Path
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageStat
import hashlib
import math
import random

ROOT = Path("urai-tier1/public/assets/urai")
RASTER = {".png", ".webp", ".jpg", ".jpeg"}

PALETTES = {
    "home": ("#06152a", "#64eaff", "#fff1c4", "#102b3c"),
    "ground": ("#061711", "#70ffc9", "#e6d29a", "#1d2c1e"),
    "life-map": ("#03091d", "#75e7ff", "#b36bff", "#142a56"),
    "focus": ("#050d18", "#9defff", "#d5fff6", "#12233a"),
    "replay": ("#090716", "#bc75ff", "#ffe3a6", "#20123a"),
    "mirror": ("#070a18", "#9fc7ff", "#dcc7ff", "#1a2138"),
    "passport": ("#0b0b13", "#f5c56b", "#e8f2ff", "#28200e"),
    "privacy": ("#071514", "#69ffc6", "#9df3ff", "#13382f"),
    "location": ("#061422", "#5df4ff", "#81ffc8", "#14395a"),
    "status": ("#060d18", "#7fffd4", "#a6c8ff", "#0f2a3a"),
    "orb": ("#050d1a", "#7df8ff", "#d9fbff", "#11233a"),
    "avatar": ("#07121d", "#72f7ff", "#b5fff2", "#142334"),
    "default": ("#050b18", "#76eaff", "#bba7ff", "#10233d"),
}


def rgb(hex_color: str) -> tuple[int, int, int]:
    hex_color = hex_color.lstrip("#")
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))  # type: ignore[return-value]


def mix(a: tuple[int, int, int], b: tuple[int, int, int], t: float) -> tuple[int, int, int]:
    return tuple(int(a[i] * (1 - t) + b[i] * t) for i in range(3))  # type: ignore[return-value]


def kind_for(path: Path) -> str:
    s = str(path).lower()
    if "home" in s: return "home"
    if any(k in s for k in ["ground", "workforce", "logistics", "wellness", "reception"]): return "ground"
    if any(k in s for k in ["life-map", "lifemap", "node", "galaxy"]): return "life-map"
    if any(k in s for k in ["focus", "chamber", "memory"]): return "focus"
    if "replay" in s: return "replay"
    if "mirror" in s: return "mirror"
    if "passport" in s: return "passport"
    if "privacy" in s: return "privacy"
    if any(k in s for k in ["location", "weather", "place"]): return "location"
    if "status" in s: return "status"
    if "orb" in s or "ui" in s: return "orb"
    if "avatar" in s: return "avatar"
    return "default"


def palette(path: Path) -> tuple[str, str, str, str]:
    return PALETTES.get(kind_for(path), PALETTES["default"])


def rng_for(path: Path) -> random.Random:
    return random.Random(int(hashlib.sha256(str(path).encode()).hexdigest()[:12], 16))


def score(path: Path) -> tuple[str, float, float, float]:
    img = Image.open(path).convert("RGB")
    stat = ImageStat.Stat(img)
    contrast = sum(stat.stddev) / 3
    saturation = ImageStat.Stat(img.convert("HSV")).mean[1]
    edge = ImageStat.Stat(img.filter(ImageFilter.FIND_EDGES).convert("L")).mean[0]
    grade = "GREEN"
    if img.width < 900 or img.height < 520 or contrast < 45 or saturation < 65 or edge < 8:
        grade = "YELLOW"
    if img.width < 20 or img.height < 20 or contrast < 20 or saturation < 18:
        grade = "RED"
    return grade, contrast, saturation, edge


def make_asset(path: Path) -> Image.Image:
    kind = kind_for(path)
    base_hex, accent_hex, warm_hex, deep_hex = palette(path)
    base, accent, warm, deep = map(rgb, [base_hex, accent_hex, warm_hex, deep_hex])
    portrait = any(k in str(path).lower() for k in ["mobile", "avatar", "portrait"])
    w, h = (900, 1200) if portrait else (1600, 1000)
    r = rng_for(path)

    img = Image.new("RGB", (w, h), base)
    pix = img.load()
    for y in range(h):
        ny = y / max(1, h - 1)
        for x in range(w):
            nx = x / max(1, w - 1)
            a = max(0, 1 - math.hypot(nx - .34, ny - .30) * 2.0)
            b = max(0, 1 - math.hypot(nx - .68, ny - .44) * 1.8)
            horizon = max(0, 1 - abs(ny - .64) * 5.2)
            v = min(1, math.hypot(nx - .5, ny - .5) * 1.32)
            c = mix(base, deep, .24 + .18 * ny)
            c = mix(c, accent, a * .42)
            c = mix(c, warm, b * .25)
            c = mix(c, accent, horizon * .20)
            c = mix(c, (0, 0, 0), v * .38)
            pix[x, y] = c

    rgba = img.convert("RGBA")
    d = ImageDraw.Draw(rgba, "RGBA")

    for _ in range(180 if not portrait else 95):
        x = r.randint(0, w - 1)
        y = r.randint(0, h - 1)
        rr = r.choice([1, 1, 2])
        d.ellipse([x-rr, y-rr, x+rr, y+rr], fill=(210, 245, 255, r.randint(90, 220)))

    def orb(cx: int, cy: int, rad: int, color: tuple[int, int, int] = accent) -> None:
        for i in range(10, 0, -1):
            rr = rad * i / 5
            aa = int(17 * i)
            d.ellipse([cx-rr, cy-rr, cx+rr, cy+rr], fill=(*color, aa))
        d.ellipse([cx-rad, cy-rad, cx+rad, cy+rad], fill=(*color, 55), outline=(*color, 150), width=max(2, w // 520))
        d.ellipse([cx-rad*.28, cy-rad*.28, cx+rad*.28, cy+rad*.28], fill=(245, 255, 255, 245))
        d.arc([cx-rad*1.15, cy-rad*.34, cx+rad*1.15, cy+rad*.34], 5, 355, fill=(*color, 155), width=max(2, w // 420))

    if kind == "life-map":
        for _ in range(22):
            orb(r.randint(int(w*.12), int(w*.88)), r.randint(int(h*.16), int(h*.75)), r.randint(w//70, w//32), r.choice([accent, warm, (176, 110, 255), (110, 255, 205)]))
        for _ in range(8):
            pts = [(r.randint(int(w*.1), int(w*.9)), r.randint(int(h*.18), int(h*.78))) for __ in range(3)]
            d.line(pts, fill=(*accent, 90), width=max(2, w // 420))
    elif kind == "ground":
        for xx in [.22, .36, .50, .64, .78]:
            d.rounded_rectangle([int(w*xx-w*.045), int(h*.42), int(w*xx+w*.045), int(h*.73)], radius=int(w*.025), fill=(*accent,75), outline=(*accent,135), width=max(2, w//500))
        orb(int(w*.5), int(h*.30), int(min(w,h)*.055))
    elif kind == "home":
        d.polygon([(0,h),(w,h),(w,int(h*.71)),(int(w*.66),int(h*.62)),(int(w*.48),int(h*.60)),(int(w*.18),int(h*.66)),(0,int(h*.72))], fill=(6,28,36,205))
        d.polygon([(int(w*.49),int(h*.10)),(int(w*.52),int(h*.10)),(int(w*.58),int(h*.67)),(int(w*.43),int(h*.67))], fill=(255,238,190,55))
        orb(int(w*.505), int(h*.56), int(min(w,h)*.10), warm)
    elif kind == "replay":
        d.rounded_rectangle([int(w*.22), int(h*.22), int(w*.78), int(h*.68)], radius=int(w*.035), fill=(10,8,30,170), outline=(*accent,145), width=max(2,w//360))
        for i in range(6):
            x = int(w*(.27+i*.075))
            d.rounded_rectangle([x,int(h*.31),x+int(w*.046),int(h*.60)], radius=int(w*.01), fill=(*accent,88+i*18))
        orb(int(w*.64), int(h*.28), int(min(w,h)*.07), warm)
    else:
        orb(int(w*.50), int(h*.38), int(min(w,h)*.12))
        d.arc([int(-w*.05), int(h*.50), int(w*1.05), int(h*1.12)], 188, 352, fill=(*accent, 92), width=max(2, w//170))

    title = path.stem.replace("-", " ").replace("_", " ").title()[:34]
    card_h = int(h * .15)
    pad = max(22, int(w * .035))
    y = h - card_h - pad
    d.rounded_rectangle([pad, y, w-pad, y+card_h], radius=int(card_h*.18), fill=(2,8,20,225), outline=(*accent,125), width=max(2,w//700))
    d.text((pad*1.55, y+card_h*.30), title, fill=(245,252,255,255))
    d.line([pad*1.55, y+card_h*.76, w-pad*1.55, y+card_h*.76], fill=(*accent,120), width=max(2,w//760))

    out = rgba.convert("RGB")
    out = ImageEnhance.Contrast(out).enhance(1.34)
    out = ImageEnhance.Color(out).enhance(1.42)
    out = ImageEnhance.Sharpness(out).enhance(1.22)
    return out


def main() -> None:
    changed: list[str] = []
    for path in sorted(ROOT.rglob("*")):
        if path.suffix.lower() not in RASTER:
            continue
        grade, contrast, saturation, edge = score(path)
        if grade != "YELLOW":
            continue
        img = make_asset(path)
        if path.suffix.lower() == ".webp":
            img.save(path, "WEBP", quality=96, method=6)
        elif path.suffix.lower() == ".png":
            img.save(path, "PNG", optimize=True)
        else:
            img.save(path, quality=96, optimize=True)
        new_grade, new_contrast, new_saturation, new_edge = score(path)
        changed.append(f"{grade}->{new_grade} {path} C:{contrast:.1f}->{new_contrast:.1f} S:{saturation:.1f}->{new_saturation:.1f} E:{edge:.1f}->{new_edge:.1f}")

    print(f"POLISHED={len(changed)}")
    for line in changed:
        print(line)


if __name__ == "__main__":
    main()
