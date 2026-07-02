#!/usr/bin/env python3
import os
import sys
import json
import math
import subprocess
from pathlib import Path

try:
    from PIL import Image, ImageStat
except Exception:
    subprocess.check_call([sys.executable, "-m", "pip", "install", "--user", "pillow"])
    from PIL import Image, ImageStat

ROOT = Path.cwd()
RECEIPTS = Path.home() / "urai-final-receipts"
EXPECTED = int(os.environ.get("EXPECTED_PNG_COUNT", "24"))
LOOP_NAME = os.environ.get("LOOP_NAME", "loop5-one-screen-life-location")

def latest_proof_dir():
    env = os.environ.get("PROOF_DIR")
    if env and Path(env).exists():
        return Path(env)
    dirs = [p for p in RECEIPTS.glob("aaa-launch-proof-*") if p.is_dir()]
    if not dirs:
        return None
    return max(dirs, key=lambda p: p.stat().st_mtime)

def entropy(img):
    try:
        return float(img.entropy())
    except Exception:
        hist = img.histogram()
        total = sum(hist)
        if total <= 0:
            return 0.0
        e = 0.0
        for c in hist:
            if c:
                p = c / total
                e -= p * math.log2(p)
        return e

def detail_score(gray):
    # Downsample for speed and compute entropy + contrast.
    g = gray.resize((min(320, gray.width), max(1, int(gray.height * min(320, gray.width) / max(1, gray.width)))))
    stat = ImageStat.Stat(g)
    std = float(stat.stddev[0])
    ent = entropy(g)
    return std, ent

def analyze_png(path):
    im = Image.open(path).convert("RGB")
    w, h = im.size
    gray = im.convert("L")

    full_std, full_entropy = detail_score(gray)

    bottom = gray.crop((0, int(h * 0.68), w, h))
    mid = gray.crop((0, int(h * 0.25), w, int(h * 0.65)))
    top = gray.crop((0, 0, w, int(h * 0.32)))

    bottom_std, bottom_entropy = detail_score(bottom)
    mid_std, mid_entropy = detail_score(mid)
    top_std, top_entropy = detail_score(top)

    issues = []
    warnings = []

    if w < 320 or h < 500:
        issues.append(f"too-small screenshot {w}x{h}")

    if full_entropy < 1.0 or full_std < 5:
        issues.append(f"screen appears nearly empty: entropy={full_entropy:.2f}, std={full_std:.2f}")

    name = path.name.lower()
    is_mobile = "mobile" in name
    is_target_tail_route = any(x in name for x in ["life-map", "location-map"])

    # Full-page mobile screenshots should not be massive after one-screen lock.
    if is_mobile and is_target_tail_route and h > 1400:
        issues.append(f"suspected mobile full-page tail: height={h}")

    # Desktop full-page tails can also show up as huge blank scenes.
    if (not is_mobile) and is_target_tail_route and h > 1800:
        warnings.append(f"desktop screenshot is unusually tall: height={h}")

    # Blank lower-tail detector: bottom has very low texture compared to middle/top.
    if is_target_tail_route:
        if bottom_entropy < 2.15 and bottom_std < 16:
            issues.append(
                f"suspected blank lower tail: bottom_entropy={bottom_entropy:.2f}, bottom_std={bottom_std:.2f}"
            )
        elif bottom_entropy < 2.6 and bottom_std < 20:
            warnings.append(
                f"possible low-detail lower tail: bottom_entropy={bottom_entropy:.2f}, bottom_std={bottom_std:.2f}"
            )

    # General warning: mobile screenshots with giant pages.
    if is_mobile and h > 2400:
        warnings.append(f"mobile screenshot very tall: height={h}")

    return {
        "file": path.name,
        "width": w,
        "height": h,
        "full_entropy": round(full_entropy, 3),
        "full_std": round(full_std, 3),
        "top_entropy": round(top_entropy, 3),
        "mid_entropy": round(mid_entropy, 3),
        "bottom_entropy": round(bottom_entropy, 3),
        "bottom_std": round(bottom_std, 3),
        "issues": issues,
        "warnings": warnings,
    }

proof = latest_proof_dir()
if not proof:
    print("VERDICT: MACHINE_FAIL")
    print("No aaa-launch-proof directory found.")
    sys.exit(2)

screens = proof / "screenshots"
pngs = sorted(screens.glob("*.png")) if screens.exists() else []

results = []
issues = []
warnings = []

if len(pngs) != EXPECTED:
    issues.append(f"PNG_COUNT expected {EXPECTED}, got {len(pngs)}")

for p in pngs:
    try:
        r = analyze_png(p)
        results.append(r)
        for item in r["issues"]:
            issues.append(f"{p.name}: {item}")
        for item in r["warnings"]:
            warnings.append(f"{p.name}: {item}")
    except Exception as e:
        issues.append(f"{p.name}: failed to analyze: {e}")

status = "MACHINE_PASS" if not issues else "MACHINE_FAIL"

out_dir = ROOT / "docs" / "receipts" / "visual-verdicts"
out_dir.mkdir(parents=True, exist_ok=True)
json_path = out_dir / f"{LOOP_NAME}-machine-visual-verdict.json"
md_path = out_dir / f"{LOOP_NAME}-machine-visual-verdict.md"

report = {
    "verdict": status,
    "proofDir": str(proof),
    "pngCount": len(pngs),
    "expectedPngCount": EXPECTED,
    "issues": issues,
    "warnings": warnings,
    "results": results,
}

json_path.write_text(json.dumps(report, indent=2))

lines = []
lines.append(f"# Machine visual verdict — {LOOP_NAME}")
lines.append("")
lines.append(f"VERDICT: {status}")
lines.append("")
lines.append(f"- Proof dir: `{proof}`")
lines.append(f"- PNG_COUNT: {len(pngs)}/{EXPECTED}")
lines.append("")
lines.append("## Issues")
if issues:
    for item in issues:
        lines.append(f"- {item}")
else:
    lines.append("- None")
lines.append("")
lines.append("## Warnings")
if warnings:
    for item in warnings:
        lines.append(f"- {item}")
else:
    lines.append("- None")
lines.append("")
lines.append("## Note")
lines.append("This is a machine measurable-visual gate, not final human AAA taste approval.")
md_path.write_text("\n".join(lines) + "\n")

print("")
print(f"VERDICT: {status}")
print(f"PROOF_DIR={proof}")
print(f"PNG_COUNT={len(pngs)}/{EXPECTED}")
print(f"REPORT_MD={md_path}")
print(f"REPORT_JSON={json_path}")
print("")
if issues:
    print("ISSUES:")
    for item in issues:
        print(f"- {item}")
if warnings:
    print("")
    print("WARNINGS:")
    for item in warnings:
        print(f"- {item}")

sys.exit(0 if status == "MACHINE_PASS" else 3)
