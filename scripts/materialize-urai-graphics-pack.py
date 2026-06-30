from pathlib import Path
import math
import random
import subprocess
import sys

ROOT = Path("urai-tier1/public/assets/urai")
random.seed(424242)

try:
    from PIL import Image, ImageDraw, ImageFont, ImageFilter
except Exception:
    subprocess.check_call([sys.executable, "-m", "pip", "install", "--user", "pillow"])
    from PIL import Image, ImageDraw, ImageFont, ImageFilter


def font(size):
    for name in [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf",
    ]:
        if Path(name).exists():
            return ImageFont.truetype(name, size)
    return ImageFont.load_default()


def ensure(path):
    path.parent.mkdir(parents=True, exist_ok=True)


def gradient(w, h, top, bottom):
    img = Image.new("RGB", (w, h), top)
    pix = img.load()
    for y in range(h):
        t = y / max(1, h - 1)
        r = int(top[0] * (1 - t) + bottom[0] * t)
        g = int(top[1] * (1 - t) + bottom[1] * t)
        b = int(top[2] * (1 - t) + bottom[2] * t)
        for x in range(w):
            pix[x, y] = (r, g, b)
    return img.convert("RGBA")


def glow(d, cx, cy, color, scale=1.0):
    for r, a in [(220, 20), (150, 34), (86, 66), (42, 130), (20, 220)]:
        rr = int(r * scale)
        d.ellipse((cx - rr, cy - rr, cx + rr, cy + rr), fill=color + (a,))


def write_label_panel(d, w, h, title, subtitle):
    panel_h = int(h * 0.19)
    d.rounded_rectangle(
        (int(w * 0.08), int(h * 0.78), int(w * 0.92), int(h * 0.78) + panel_h),
        radius=34,
        fill=(2, 8, 22, 185),
        outline=(220, 245, 255, 70),
        width=2,
    )
    tfont = font(max(36, w // 24))
    sfont = font(max(20, w // 54))
    d.text((int(w * 0.11), int(h * 0.805)), title, font=tfont, fill=(245, 252, 255, 245))
    d.text((int(w * 0.11), int(h * 0.865)), subtitle, font=sfont, fill=(185, 235, 255, 215))


def draw_scene(path, title, subtitle, palette, kind="world", mobile=False):
    w, h = (900, 1200) if mobile else (1600, 1000)
    img = gradient(w, h, palette[0], palette[1])
    d = ImageDraw.Draw(img, "RGBA")

    # atmosphere
    for _ in range(80):
        x = random.randint(-100, w + 100)
        y = random.randint(-100, h + 100)
        r = random.randint(40, 180)
        col = palette[2] + (random.randint(10, 36),)
        d.ellipse((x - r, y - r, x + r, y + r), fill=col)

    # route-specific symbolic scene
    if kind == "home":
        d.rectangle((0, int(h * 0.58), w, h), fill=(10, 45, 42, 165))
        d.ellipse((int(w * 0.15), int(h * 0.46), int(w * 0.85), int(h * 1.08)), fill=(14, 76, 70, 170))
        d.arc((int(w * 0.38), int(h * 0.18), int(w * 0.62), int(h * 0.68)), 180, 360, fill=(150, 235, 255, 160), width=max(4, w // 260))
        for x in [0.25, 0.38, 0.5, 0.62, 0.75]:
            d.line((w * x, h * 0.62, w * 0.5, h * 0.2), fill=(120, 240, 255, 70), width=2)
    elif kind == "ground":
        d.rectangle((0, int(h * 0.52), w, h), fill=(34, 43, 34, 200))
        for i, x in enumerate([0.18, 0.36, 0.54, 0.72]):
            d.rounded_rectangle((w * x - 100, h * 0.48, w * x + 100, h * 0.76), radius=28, fill=(35, 78, 82, 170), outline=(180, 245, 255, 90), width=3)
            d.ellipse((w * x - 22, h * 0.43, w * x + 22, h * 0.49), fill=(140, 240, 255, 180))
        d.line((w * 0.08, h * 0.84, w * 0.92, h * 0.84), fill=(180, 245, 255, 90), width=4)
    elif kind == "life":
        for _ in range(180):
            x = random.randint(0, w)
            y = random.randint(0, h)
            rr = random.randint(1, 4)
            d.ellipse((x - rr, y - rr, x + rr, y + rr), fill=(230, 255, 255, random.randint(90, 230)))
        points = [(0.28, 0.38, 72), (0.52, 0.48, 110), (0.71, 0.31, 58), (0.62, 0.70, 78)]
        for x, y, r in points:
            d.ellipse((w * x - r, h * y - r, w * x + r, h * y + r), fill=(90, 190, 255, 75), outline=(210, 250, 255, 170), width=3)
        d.line((w * 0.28, h * 0.38, w * 0.52, h * 0.48, w * 0.71, h * 0.31, w * 0.62, h * 0.70), fill=(120, 230, 255, 100), width=3)
    elif kind == "focus":
        d.rounded_rectangle((w * 0.24, h * 0.18, w * 0.76, h * 0.76), radius=60, fill=(8, 22, 45, 190), outline=(190, 245, 255, 150), width=5)
        d.ellipse((w * 0.38, h * 0.27, w * 0.62, h * 0.59), fill=(105, 210, 255, 90), outline=(230, 255, 255, 190), width=4)
        d.rectangle((w * 0.30, h * 0.64, w * 0.70, h * 0.67), fill=(180, 245, 255, 100))
    elif kind == "replay":
        d.rounded_rectangle((w * 0.13, h * 0.20, w * 0.87, h * 0.72), radius=52, fill=(5, 14, 30, 210), outline=(220, 245, 255, 120), width=5)
        for i in range(6):
            x = w * (0.18 + i * 0.11)
            d.rectangle((x, h * 0.23, x + w * 0.06, h * 0.69), fill=(90, 180, 255, 40 + i * 18))
        d.polygon([(w * 0.47, h * 0.42), (w * 0.47, h * 0.55), (w * 0.58, h * 0.485)], fill=(240, 255, 255, 210))
    elif kind == "mirror":
        d.ellipse((w * 0.30, h * 0.14, w * 0.70, h * 0.82), fill=(130, 180, 255, 45), outline=(230, 245, 255, 160), width=5)
        d.line((w * 0.36, h * 0.18, w * 0.64, h * 0.78), fill=(255, 255, 255, 95), width=4)
        d.arc((w * 0.38, h * 0.25, w * 0.62, h * 0.62), 40, 320, fill=(170, 250, 255, 130), width=5)
    elif kind == "passport":
        d.rounded_rectangle((w * 0.25, h * 0.18, w * 0.75, h * 0.78), radius=46, fill=(20, 34, 72, 210), outline=(240, 210, 120, 170), width=5)
        d.ellipse((w * 0.41, h * 0.32, w * 0.59, h * 0.50), fill=(240, 210, 120, 90), outline=(255, 235, 150, 190), width=4)
        d.line((w * 0.34, h * 0.58, w * 0.66, h * 0.58), fill=(255, 235, 150, 130), width=4)
        d.line((w * 0.38, h * 0.66, w * 0.62, h * 0.66), fill=(255, 235, 150, 90), width=3)
    elif kind == "privacy":
        d.rounded_rectangle((w * 0.20, h * 0.22, w * 0.80, h * 0.75), radius=45, fill=(6, 28, 48, 210), outline=(130, 255, 220, 130), width=5)
        d.arc((w * 0.42, h * 0.26, w * 0.58, h * 0.48), 180, 360, fill=(170, 255, 235, 180), width=7)
        d.rounded_rectangle((w * 0.38, h * 0.43, w * 0.62, h * 0.62), radius=22, fill=(130, 255, 220, 70), outline=(190, 255, 240, 180), width=4)
    elif kind == "location":
        for x in [0.22, 0.45, 0.66, 0.78]:
            for y in [0.28, 0.44, 0.62]:
                d.ellipse((w * x - 18, h * y - 18, w * x + 18, h * y + 18), fill=(80, 220, 255, 120))
        d.line((w * 0.22, h * 0.28, w * 0.45, h * 0.44, w * 0.66, h * 0.28, w * 0.78, h * 0.62), fill=(130, 240, 255, 110), width=4)
        d.arc((w * 0.18, h * 0.15, w * 0.88, h * 0.82), 15, 330, fill=(100, 220, 255, 80), width=4)
    elif kind == "status":
        for i in range(5):
            y = h * (0.24 + i * 0.11)
            d.rounded_rectangle((w * 0.25, y, w * 0.75, y + h * 0.06), radius=18, fill=(70, 220, 160, 70), outline=(170, 255, 220, 130), width=3)
            d.ellipse((w * 0.28, y + h * 0.015, w * 0.31, y + h * 0.045), fill=(120, 255, 190, 200))
    elif kind == "xr":
        d.rounded_rectangle((w * 0.16, h * 0.22, w * 0.84, h * 0.72), radius=64, fill=(11, 18, 38, 190), outline=(170, 220, 255, 150), width=6)
        d.arc((w * 0.28, h * 0.30, w * 0.72, h * 0.75), 200, 340, fill=(140, 245, 255, 150), width=8)
        d.line((w * 0.42, h * 0.52, w * 0.58, h * 0.52), fill=(240, 255, 255, 160), width=5)
        for x in [0.35, 0.50, 0.65]:
            d.ellipse((w * x - 24, h * 0.46 - 24, w * x + 24, h * 0.46 + 24), fill=(130, 220, 255, 130))
    elif kind == "ops":
        for i, x in enumerate([0.18, 0.38, 0.58, 0.78]):
            d.rounded_rectangle((w * x - 90, h * 0.24, w * x + 90, h * 0.70), radius=24, fill=(18, 44, 62, 170), outline=(140, 245, 255, 100), width=3)
            d.line((w * x - 58, h * 0.38, w * x + 58, h * 0.38), fill=(150, 245, 255, 90), width=3)
            d.line((w * x - 58, h * 0.48, w * x + 58, h * 0.48), fill=(150, 245, 255, 70), width=3)
        d.arc((w * 0.22, h * 0.18, w * 0.78, h * 0.76), 20, 340, fill=(120, 255, 190, 90), width=4)
    elif kind == "trust":
        d.rounded_rectangle((w * 0.28, h * 0.20, w * 0.72, h * 0.72), radius=48, fill=(10, 28, 42, 205), outline=(130, 255, 220, 150), width=5)
        d.arc((w * 0.43, h * 0.29, w * 0.57, h * 0.50), 180, 360, fill=(180, 255, 235, 180), width=7)
        d.rounded_rectangle((w * 0.40, h * 0.46, w * 0.60, h * 0.61), radius=22, fill=(130, 255, 220, 95), outline=(210, 255, 245, 180), width=4)
        for y in [0.68, 0.73]:
            d.line((w * 0.34, h * y, w * 0.66, h * y), fill=(170, 255, 235, 100), width=4)
    elif kind == "accessibility":
        d.ellipse((w * 0.34, h * 0.18, w * 0.66, h * 0.50), fill=(170, 220, 255, 60), outline=(240, 255, 255, 150), width=5)
        d.line((w * 0.50, h * 0.50, w * 0.50, h * 0.74), fill=(240, 255, 255, 180), width=8)
        d.line((w * 0.34, h * 0.58, w * 0.66, h * 0.58), fill=(240, 255, 255, 140), width=6)
        d.line((w * 0.50, h * 0.72, w * 0.38, h * 0.84), fill=(240, 255, 255, 140), width=6)
        d.line((w * 0.50, h * 0.72, w * 0.62, h * 0.84), fill=(240, 255, 255, 140), width=6)
    elif kind == "social":
        d.rounded_rectangle((w * 0.10, h * 0.16, w * 0.90, h * 0.74), radius=50, fill=(3, 11, 28, 190), outline=(220, 245, 255, 90), width=4)
        d.text((int(w * 0.15), int(h * 0.25)), "URAI", font=font(max(72, w // 12)), fill=(245, 252, 255, 245))
        d.text((int(w * 0.15), int(h * 0.38)), "Own your life.\nStep inside yourself.", font=font(max(34, w // 34)), fill=(190, 240, 255, 230))
        d.line((w * 0.15, h * 0.58, w * 0.85, h * 0.58), fill=(130, 240, 255, 100), width=4)

    # central orb glow
    cx, cy = w // 2, int(h * 0.36)
    glow(d, cx, cy, palette[2], 1.0)
    write_label_panel(d, w, h, title, subtitle)

    ensure(path)
    img.save(path, "WEBP", quality=88, method=6)


def svg(path, title, color="#7beafe"):
    ensure(path)
    text = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" role="img" aria-label="{title}">
  <defs>
    <radialGradient id="g" cx="50%" cy="38%" r="70%">
      <stop offset="0" stop-color="#ffffff" stop-opacity=".92"/>
      <stop offset=".18" stop-color="{color}" stop-opacity=".7"/>
      <stop offset=".62" stop-color="#071a33" stop-opacity=".98"/>
      <stop offset="1" stop-color="#020617"/>
    </radialGradient>
    <filter id="blur"><feGaussianBlur stdDeviation="18"/></filter>
  </defs>
  <rect width="1600" height="1000" fill="#020617"/>
  <circle cx="800" cy="360" r="260" fill="{color}" opacity=".18" filter="url(#blur)"/>
  <circle cx="800" cy="360" r="88" fill="url(#g)"/>
  <path d="M240 720 C520 560 760 820 1360 640" fill="none" stroke="{color}" stroke-width="6" opacity=".45"/>
  <rect x="120" y="760" width="1360" height="150" rx="42" fill="#030b1d" opacity=".78" stroke="{color}" stroke-opacity=".32"/>
  <text x="170" y="830" font-family="Inter,Arial,sans-serif" font-size="54" font-weight="800" fill="#f8fcff">{title}</text>
  <text x="170" y="875" font-family="Inter,Arial,sans-serif" font-size="24" font-weight="700" fill="#b9f3ff">URAI generated route visual - private by default</text>
</svg>'''
    path.write_text(text)


def gltf(path, title, category):
    ensure(path)
    content = f'''{{
  "asset": {{
    "version": "2.0",
    "generator": "URAI deterministic spatial asset placeholder"
  }},
  "scene": 0,
  "scenes": [
    {{
      "name": "{title}",
      "nodes": []
    }}
  ],
  "nodes": [],
  "extras": {{
    "uraiAssetStatus": "placeholder-final",
    "category": "{category}",
    "replacementRule": "Replace with optimized GLB/GLTF production model before Tier 3 headset launch."
  }}
}}
'''
    path.write_text(content)


palette = {
    "home": ((2, 7, 19), (11, 61, 72), (96, 235, 255)),
    "ground": ((5, 13, 17), (48, 42, 30), (133, 245, 215)),
    "life": ((2, 4, 16), (15, 20, 55), (120, 180, 255)),
    "focus": ((3, 8, 24), (20, 31, 60), (130, 225, 255)),
    "replay": ((2, 6, 18), (36, 18, 48), (190, 130, 255)),
    "mirror": ((5, 8, 24), (33, 31, 70), (160, 210, 255)),
    "passport": ((6, 8, 24), (41, 29, 48), (255, 220, 130)),
    "privacy": ((2, 9, 20), (8, 44, 48), (130, 255, 220)),
    "location": ((2, 10, 22), (15, 47, 54), (90, 220, 255)),
    "status": ((2, 10, 18), (13, 42, 34), (120, 255, 185)),
    "xr": ((2, 7, 20), (22, 35, 74), (140, 220, 255)),
    "ops": ((3, 10, 18), (20, 52, 46), (120, 255, 205)),
    "trust": ((2, 8, 18), (14, 42, 44), (130, 255, 220)),
    "accessibility": ((4, 8, 22), (28, 42, 66), (190, 235, 255)),
    "social": ((2, 6, 18), (14, 32, 56), (130, 235, 255)),
}

routes = [
    ("home/home-threshold-main.webp", "URAI Home World", "Threshold between Ground and Life Map", "home"),
    ("home/home-threshold-mobile.webp", "URAI Home World", "Mobile threshold crop", "home"),
    ("home/home-ground-portal.webp", "Ground Portal", "Private workforce entrance", "ground"),
    ("home/home-sky-ascent.webp", "Sky Ascent", "Life Map galaxy ascent", "life"),
    ("ground/ground-world-main.webp", "Ground World", "Private real-life command world", "ground"),
    ("ground/ground-world-mobile.webp", "Ground World", "Mobile command world crop", "ground"),
    ("ground/ground-privacy-sanctuary.webp", "Privacy Sanctuary", "Consent and protection chamber", "privacy"),
    ("ground/ground-reception.webp", "Reception", "Welcome guide and intake", "ground"),
    ("ground/ground-logistics.webp", "Logistics", "Errands and operations station", "ground"),
    ("ground/ground-wellness.webp", "Wellness", "Recovery and support corner", "ground"),
    ("ground/ground-memory-archive.webp", "Memory Archive", "Living archive shelf", "focus"),
    ("life-map/life-map-galaxy-main.webp", "Life Map Galaxy", "Private constellation of memory", "life"),
    ("life-map/life-map-galaxy-mobile.webp", "Life Map Galaxy", "Mobile constellation crop", "life"),
    ("life-map/life-map-node-threshold.webp", "Threshold Node", "Memory node visual", "life"),
    ("life-map/life-map-node-becoming.webp", "Becoming Node", "Growth memory visual", "life"),
    ("life-map/life-map-node-studio.webp", "Studio Node", "Creation memory visual", "life"),
    ("focus/focus-memory-chamber-main.webp", "Focus Chamber", "Selected memory chamber", "focus"),
    ("focus/focus-memory-chamber-mobile.webp", "Focus Chamber", "Mobile selected memory chamber", "focus"),
    ("replay/replay-memory-film-main.webp", "Replay Film", "Living memory film scene", "replay"),
    ("replay/replay-memory-film-mobile.webp", "Replay Film", "Mobile memory film crop", "replay"),
    ("mirror/mirror-reflection-main.webp", "Mirror Realm", "Private reflection surface", "mirror"),
    ("mirror/mirror-reflection-mobile.webp", "Mirror Realm", "Mobile reflection crop", "mirror"),
    ("mirror/mirror-pattern-glyph.webp", "Mirror Pattern", "Pattern recognition glyph", "mirror"),
    ("passport/passport-vault-main.webp", "Passport Vault", "Identity and consent vault", "passport"),
    ("passport/passport-vault-mobile.webp", "Passport Vault", "Mobile vault crop", "passport"),
    ("passport/passport-ownership-seal.webp", "Ownership Seal", "Provenance and control seal", "passport"),
    ("privacy-controls/privacy-controls-main.webp", "Privacy Controls", "Consent console", "privacy"),
    ("privacy-controls/privacy-controls-mobile.webp", "Privacy Controls", "Mobile consent console", "privacy"),
    ("privacy-controls/privacy-model-access.webp", "Model Access", "Permission state visual", "privacy"),
    ("privacy-controls/privacy-location-precision.webp", "Location Precision", "Location privacy visual", "privacy"),
    ("location-map/location-emotional-weather-main.webp", "Location Map", "Emotional weather atlas", "location"),
    ("location-map/location-emotional-weather-mobile.webp", "Location Map", "Mobile atlas crop", "location"),
    ("location-map/location-place-node.webp", "Place Node", "Symbolic place memory node", "location"),
    ("status/status-route-matrix-main.webp", "Status Matrix", "Launch health route matrix", "status"),
    ("status/status-route-matrix-mobile.webp", "Status Matrix", "Mobile health matrix", "status"),
    ("status/status-health-pill.webp", "Health Pill", "Launch health indicator", "status"),
    ("ui/orb-idle.webp", "Orb Idle", "Companion idle state", "home"),
    ("ui/orb-active.webp", "Orb Active", "Companion active state", "life"),
    ("ui/orb-listening.webp", "Orb Listening", "Companion listening state", "focus"),
    ("ui/orb-thinking.webp", "Orb Thinking", "Reasoning state", "life"),
    ("ui/orb-guiding.webp", "Orb Guiding", "Route guidance state", "home"),
    ("ui/orb-protecting.webp", "Orb Protecting", "Privacy boundary state", "privacy"),
    ("open-graph/urai-home-og.webp", "URAI Open Graph", "Home launch share card", "social"),
    ("open-graph/urai-ground-og.webp", "Ground Open Graph", "Private workforce share card", "social"),
    ("open-graph/urai-life-map-og.webp", "Life Map Open Graph", "Private galaxy share card", "social"),
    ("social/launch-card.webp", "Launch Card", "Own your life. Step inside yourself.", "social"),
    ("social/app-preview-phone.webp", "Phone Preview", "Mobile app-like preview", "social"),
    ("social/press-hero.webp", "Press Hero", "URAI public launch still", "social"),
    ("demo/replay-film-storyboard.webp", "Replay Film Storyboard", "Launch demo sequence", "replay"),
    ("xr/quest-entry-main.webp", "Quest Entry", "WebXR entry portal", "xr"),
    ("xr/webxr-fallback.webp", "WebXR Fallback", "Unsupported browser fallback", "xr"),
    ("xr/controller-reticle.webp", "Controller Reticle", "Gaze and controller selection", "xr"),
    ("xr/hand-ray.webp", "Hand Ray", "Spatial hand pointer", "xr"),
    ("xr/comfort-mode.webp", "Comfort Mode", "Seated safe spatial mode", "xr"),
    ("xr/ar-tabletop-constellation.webp", "AR Tabletop", "Phone AR constellation preview", "xr"),
    ("tier4/studio-preview.webp", "Studio Preview", "Render and asset jobs surface", "ops"),
    ("tier4/admin-control-room.webp", "Admin Control Room", "Internal operations plane", "ops"),
    ("tier4/analytics-insight-map.webp", "Analytics Insight Map", "Aggregate intelligence surface", "ops"),
    ("tier4/jobs-queue.webp", "Jobs Queue", "Worker queue lifecycle", "ops"),
    ("tier4/content-story-template.webp", "Content Template", "Story and replay template surface", "ops"),
    ("tier4/privacy-ops.webp", "Privacy Ops", "Consent operations surface", "trust"),
    ("tier4/investor-system-map.webp", "System Map", "Partner and investor architecture visual", "ops"),
    ("tier5/trust-consent-architecture.webp", "Trust Architecture", "Consent and private-by-default", "trust"),
    ("tier5/accessibility-reduced-motion.webp", "Reduced Motion", "Low-motion visual mode", "accessibility"),
    ("tier5/accessibility-high-contrast.webp", "High Contrast", "Readable accessibility mode", "accessibility"),
    ("tier5/captions-layer.webp", "Captions Layer", "Replay caption state", "accessibility"),
    ("tier5/launch-proof-matrix.webp", "Launch Proof Matrix", "Build deploy route screenshot proof", "status"),
    ("tier5/security-boundary.webp", "Security Boundary", "Data permission boundary", "trust"),
    ("tier5/export-delete-flow.webp", "Export Delete Flow", "User ownership and control", "trust"),
    ("audio/haptic-waveform.webp", "Haptic Waveform", "Audio and haptics placeholder", "accessibility"),
    ("audio/caption-card.webp", "Caption Card", "Accessible replay text layer", "accessibility"),
]

for rel, title, sub, kind in routes:
    draw_scene(ROOT / rel, title, sub, palette[kind], kind, mobile=("mobile" in rel or "phone" in rel))

# avatars
avatars = [
    "receptionist",
    "privacy-steward",
    "schedule-steward",
    "wellness-guide",
    "relationship-liaison",
    "logistics-helper",
    "archivist",
    "operator",
    "builder",
    "protector",
    "mirror",
    "guide",
    "quest-guide",
    "accessibility-guide",
    "trust-steward",
    "proof-operator",
]
for a in avatars:
    draw_scene(ROOT / f"avatars/{a}.webp", a.replace("-", " ").title(), "URAI workforce avatar", palette["home"], "focus", mobile=True)

# lightweight textual GLTF placeholders for Tier 3 replacement targets
for rel, title, category in [
    ("xr/models/ground-room.placeholder.gltf", "Ground Room Placeholder", "ground"),
    ("xr/models/life-map-star.placeholder.gltf", "Life Map Star Placeholder", "life-map"),
    ("xr/models/focus-chamber.placeholder.gltf", "Focus Chamber Placeholder", "focus"),
    ("xr/models/orb-companion.placeholder.gltf", "Orb Companion Placeholder", "orb"),
]:
    gltf(ROOT / rel, title, category)

# SVG fallbacks
fallbacks = [
    ("home/home-threshold-fallback.svg", "URAI Home Threshold", "#7beafe"),
    ("home/home-ground-portal-fallback.svg", "Ground Portal", "#85f5d7"),
    ("home/home-sky-ascent-fallback.svg", "Sky Ascent", "#94bfff"),
    ("ground/ground-world-fallback.svg", "Ground World", "#85f5d7"),
    ("ground/ground-privacy-fallback.svg", "Privacy Sanctuary", "#80ffdc"),
    ("ground/ground-reception-fallback.svg", "Reception", "#7beafe"),
    ("ground/ground-logistics-fallback.svg", "Logistics", "#9af6c8"),
    ("ground/ground-wellness-fallback.svg", "Wellness", "#b8f7ff"),
    ("ground/ground-memory-archive-fallback.svg", "Memory Archive", "#a7d7ff"),
    ("life-map/life-map-galaxy-fallback.svg", "Life Map Galaxy", "#86b6ff"),
    ("life-map/life-map-node-fallback.svg", "Life Map Node", "#b2d6ff"),
    ("focus/focus-memory-chamber-fallback.svg", "Focus Memory Chamber", "#9eeaff"),
    ("replay/replay-memory-film-fallback.svg", "Replay Memory Film", "#c49bff"),
    ("mirror/mirror-reflection-fallback.svg", "Mirror Reflection", "#a7c7ff"),
    ("mirror/mirror-pattern-fallback.svg", "Mirror Pattern", "#b8d8ff"),
    ("passport/passport-vault-fallback.svg", "Passport Vault", "#ffd978"),
    ("privacy-controls/privacy-controls-fallback.svg", "Privacy Controls", "#8effdc"),
    ("location-map/location-emotional-weather-fallback.svg", "Location Emotional Weather", "#7beafe"),
    ("status/status-route-matrix-fallback.svg", "Status Route Matrix", "#8cffbf"),
    ("open-graph/urai-og-fallback.svg", "URAI Open Graph", "#7beafe"),
    ("xr/xr-entry-fallback.svg", "XR Entry", "#9adfff"),
    ("tier4/ops-fallback.svg", "Tier 4 Operations", "#80ffd0"),
    ("tier5/trust-fallback.svg", "Tier 5 Trust", "#8effdc"),
    ("accessibility/accessibility-fallback.svg", "Accessibility", "#d8f4ff"),
    ("avatars/avatar-fallback.svg", "URAI Workforce Avatar", "#7beafe"),
    ("ui/orb-fallback.svg", "URAI Orb", "#7beafe"),
    ("ui/privacy-lock.svg", "Privacy Lock", "#8effdc"),
    ("ui/consent-key.svg", "Consent Key", "#ffd978"),
    ("ui/route-arrow.svg", "Route Arrow", "#7beafe"),
    ("ui/portal-ground.svg", "Ground Portal", "#85f5d7"),
    ("ui/portal-sky.svg", "Sky Portal", "#94bfff"),
]
for rel, title, color in fallbacks:
    svg(ROOT / rel, title, color)

print("Generated assets:", len(list(ROOT.rglob("*.*"))))
