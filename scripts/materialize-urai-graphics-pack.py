from pathlib import Path
import math, random, subprocess, sys

ROOT = Path("urai-tier1/public/assets/urai")

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
        r = int(top[0] * (1-t) + bottom[0] * t)
        g = int(top[1] * (1-t) + bottom[1] * t)
        b = int(top[2] * (1-t) + bottom[2] * t)
        for x in range(w):
            pix[x, y] = (r, g, b)
    return img.convert("RGBA")

def draw_scene(path, title, subtitle, palette, kind="world", mobile=False):
    w, h = (900, 1200) if mobile else (1600, 1000)
    img = gradient(w, h, palette[0], palette[1])
    d = ImageDraw.Draw(img, "RGBA")

    # atmosphere
    for i in range(80):
        x = random.randint(-100, w+100)
        y = random.randint(-100, h+100)
        r = random.randint(40, 180)
        col = palette[2] + (random.randint(10, 36),)
        d.ellipse((x-r, y-r, x+r, y+r), fill=col)

    # route-specific symbolic scene
    if kind == "home":
        d.rectangle((0, int(h*.58), w, h), fill=(10, 45, 42, 165))
        d.ellipse((int(w*.15), int(h*.46), int(w*.85), int(h*1.08)), fill=(14, 76, 70, 170))
        d.arc((int(w*.38), int(h*.18), int(w*.62), int(h*.68)), 180, 360, fill=(150,235,255,160), width=max(4,w//260))
        for x in [0.25,0.38,0.5,0.62,0.75]:
            d.line((w*x, h*.62, w*.5, h*.2), fill=(120,240,255,70), width=2)
    elif kind == "ground":
        d.rectangle((0, int(h*.52), w, h), fill=(34, 43, 34, 200))
        for i, x in enumerate([.18,.36,.54,.72]):
            d.rounded_rectangle((w*x-100, h*.48, w*x+100, h*.76), radius=28, fill=(35,78,82,170), outline=(180,245,255,90), width=3)
            d.ellipse((w*x-22,h*.43,w*x+22,h*.49), fill=(140,240,255,180))
        d.line((w*.08,h*.84,w*.92,h*.84), fill=(180,245,255,90), width=4)
    elif kind == "life":
        for i in range(160):
            x=random.randint(0,w); y=random.randint(0,h)
            rr=random.randint(1,4)
            d.ellipse((x-rr,y-rr,x+rr,y+rr), fill=(230,255,255,random.randint(90,230)))
        for x,y,r in [(0.28,0.38,72),(0.52,0.48,110),(0.71,0.31,58),(0.62,0.70,78)]:
            d.ellipse((w*x-r,h*y-r,w*x+r,h*y+r), fill=(90,190,255,75), outline=(210,250,255,170), width=3)
        d.line((w*.28,h*.38,w*.52,h*.48,w*.71,h*.31,w*.62,h*.70), fill=(120,230,255,100), width=3)
    elif kind == "focus":
        d.rounded_rectangle((w*.24,h*.18,w*.76,h*.76), radius=60, fill=(8,22,45,190), outline=(190,245,255,150), width=5)
        d.ellipse((w*.38,h*.27,w*.62,h*.59), fill=(105,210,255,90), outline=(230,255,255,190), width=4)
        d.rectangle((w*.30,h*.64,w*.70,h*.67), fill=(180,245,255,100))
    elif kind == "replay":
        d.rounded_rectangle((w*.13,h*.20,w*.87,h*.72), radius=52, fill=(5,14,30,210), outline=(220,245,255,120), width=5)
        for i in range(6):
            x=w*(.18+i*.11)
            d.rectangle((x,h*.23,x+w*.06,h*.69), fill=(90,180,255,40+i*18))
        d.polygon([(w*.47,h*.42),(w*.47,h*.55),(w*.58,h*.485)], fill=(240,255,255,210))
    elif kind == "mirror":
        d.ellipse((w*.30,h*.14,w*.70,h*.82), fill=(130,180,255,45), outline=(230,245,255,160), width=5)
        d.line((w*.36,h*.18,w*.64,h*.78), fill=(255,255,255,95), width=4)
        d.arc((w*.38,h*.25,w*.62,h*.62), 40, 320, fill=(170,250,255,130), width=5)
    elif kind == "passport":
        d.rounded_rectangle((w*.25,h*.18,w*.75,h*.78), radius=46, fill=(20,34,72,210), outline=(240,210,120,170), width=5)
        d.ellipse((w*.41,h*.32,w*.59,h*.50), fill=(240,210,120,90), outline=(255,235,150,190), width=4)
        d.line((w*.34,h*.58,w*.66,h*.58), fill=(255,235,150,130), width=4)
        d.line((w*.38,h*.66,w*.62,h*.66), fill=(255,235,150,90), width=3)
    elif kind == "privacy":
        d.rounded_rectangle((w*.20,h*.22,w*.80,h*.75), radius=45, fill=(6,28,48,210), outline=(130,255,220,130), width=5)
        d.arc((w*.42,h*.26,w*.58,h*.48), 180, 360, fill=(170,255,235,180), width=7)
        d.rounded_rectangle((w*.38,h*.43,w*.62,h*.62), radius=22, fill=(130,255,220,70), outline=(190,255,240,180), width=4)
    elif kind == "location":
        for x in [.22,.45,.66,.78]:
            for y in [.28,.44,.62]:
                d.ellipse((w*x-18,h*y-18,w*x+18,h*y+18), fill=(80,220,255,120))
        d.line((w*.22,h*.28,w*.45,h*.44,w*.66,h*.28,w*.78,h*.62), fill=(130,240,255,110), width=4)
        d.arc((w*.18,h*.15,w*.88,h*.82), 15, 330, fill=(100,220,255,80), width=4)
    elif kind == "status":
        for i in range(5):
            y=h*(.24+i*.11)
            d.rounded_rectangle((w*.25,y,w*.75,y+h*.06), radius=18, fill=(70,220,160,70), outline=(170,255,220,130), width=3)
            d.ellipse((w*.28,y+h*.015,w*.31,y+h*.045), fill=(120,255,190,200))

    # central orb glow
    cx, cy = w//2, int(h*.36)
    for r, a in [(180,25),(120,45),(70,80),(36,190)]:
        d.ellipse((cx-r,cy-r,cx+r,cy+r), fill=palette[2]+(a,))
    d.ellipse((cx-24,cy-24,cx+24,cy+24), fill=(245,255,255,230))

    # title panel
    panel_h = int(h*.19)
    d.rounded_rectangle((int(w*.08), int(h*.78), int(w*.92), int(h*.78)+panel_h), radius=34, fill=(2,8,22,185), outline=(220,245,255,70), width=2)
    tfont = font(max(36, w//24))
    sfont = font(max(20, w//54))
    d.text((int(w*.11), int(h*.805)), title, font=tfont, fill=(245,252,255,245))
    d.text((int(w*.11), int(h*.865)), subtitle, font=sfont, fill=(185,235,255,215))

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
  <text x="170" y="875" font-family="Inter,Arial,sans-serif" font-size="24" font-weight="700" fill="#b9f3ff">URAI generated route visual • private by default</text>
</svg>'''
    path.write_text(text)

palette = {
    "home": ((2,7,19),(11,61,72),(96,235,255)),
    "ground": ((5,13,17),(48,42,30),(133,245,215)),
    "life": ((2,4,16),(15,20,55),(120,180,255)),
    "focus": ((3,8,24),(20,31,60),(130,225,255)),
    "replay": ((2,6,18),(36,18,48),(190,130,255)),
    "mirror": ((5,8,24),(33,31,70),(160,210,255)),
    "passport": ((6,8,24),(41,29,48),(255,220,130)),
    "privacy": ((2,9,20),(8,44,48),(130,255,220)),
    "location": ((2,10,22),(15,47,54),(90,220,255)),
    "status": ((2,10,18),(13,42,34),(120,255,185)),
}

routes = [
    ("home/home-threshold-main.webp","URAI Home World","Threshold between Ground and Life Map","home"),
    ("home/home-threshold-mobile.webp","URAI Home World","Mobile threshold crop","home"),
    ("home/home-ground-portal.webp","Ground Portal","Private workforce entrance","ground"),
    ("home/home-sky-ascent.webp","Sky Ascent","Life Map galaxy ascent","life"),
    ("ground/ground-world-main.webp","Ground World","Private real-life command world","ground"),
    ("ground/ground-world-mobile.webp","Ground World","Mobile command world crop","ground"),
    ("ground/ground-privacy-sanctuary.webp","Privacy Sanctuary","Consent and protection chamber","privacy"),
    ("ground/ground-reception.webp","Reception","Welcome guide and intake","ground"),
    ("ground/ground-logistics.webp","Logistics","Errands and operations station","ground"),
    ("ground/ground-wellness.webp","Wellness","Recovery and support corner","ground"),
    ("ground/ground-memory-archive.webp","Memory Archive","Living archive shelf","focus"),
    ("life-map/life-map-galaxy-main.webp","Life Map Galaxy","Private constellation of memory","life"),
    ("life-map/life-map-galaxy-mobile.webp","Life Map Galaxy","Mobile constellation crop","life"),
    ("life-map/life-map-node-threshold.webp","Threshold Node","Memory node visual","life"),
    ("life-map/life-map-node-becoming.webp","Becoming Node","Growth memory visual","life"),
    ("life-map/life-map-node-studio.webp","Studio Node","Creation memory visual","life"),
    ("focus/focus-memory-chamber-main.webp","Focus Chamber","Selected memory chamber","focus"),
    ("focus/focus-memory-chamber-mobile.webp","Focus Chamber","Mobile selected memory chamber","focus"),
    ("replay/replay-memory-film-main.webp","Replay Film","Living memory film scene","replay"),
    ("replay/replay-memory-film-mobile.webp","Replay Film","Mobile memory film crop","replay"),
    ("mirror/mirror-reflection-main.webp","Mirror Realm","Private reflection surface","mirror"),
    ("mirror/mirror-reflection-mobile.webp","Mirror Realm","Mobile reflection crop","mirror"),
    ("mirror/mirror-pattern-glyph.webp","Mirror Pattern","Pattern recognition glyph","mirror"),
    ("passport/passport-vault-main.webp","Passport Vault","Identity and consent vault","passport"),
    ("passport/passport-vault-mobile.webp","Passport Vault","Mobile vault crop","passport"),
    ("passport/passport-ownership-seal.webp","Ownership Seal","Provenance and control seal","passport"),
    ("privacy-controls/privacy-controls-main.webp","Privacy Controls","Consent console","privacy"),
    ("privacy-controls/privacy-controls-mobile.webp","Privacy Controls","Mobile consent console","privacy"),
    ("privacy-controls/privacy-model-access.webp","Model Access","Permission state visual","privacy"),
    ("privacy-controls/privacy-location-precision.webp","Location Precision","Location privacy visual","privacy"),
    ("location-map/location-emotional-weather-main.webp","Location Map","Emotional weather atlas","location"),
    ("location-map/location-emotional-weather-mobile.webp","Location Map","Mobile atlas crop","location"),
    ("location-map/location-place-node.webp","Place Node","Symbolic place memory node","location"),
    ("status/status-route-matrix-main.webp","Status Matrix","Launch health route matrix","status"),
    ("status/status-route-matrix-mobile.webp","Status Matrix","Mobile health matrix","status"),
    ("status/status-health-pill.webp","Health Pill","Launch health indicator","status"),
    ("ui/orb-idle.webp","Orb Idle","Companion idle state","home"),
    ("ui/orb-active.webp","Orb Active","Companion active state","life"),
    ("ui/orb-listening.webp","Orb Listening","Companion listening state","focus"),
]

for rel,title,sub,kind in routes:
    draw_scene(ROOT / rel, title, sub, palette[kind], kind, mobile=("mobile" in rel))

# avatars
avatars = [
    "receptionist","privacy-steward","schedule-steward","wellness-guide","relationship-liaison",
    "logistics-helper","archivist","operator","builder","protector","mirror","guide"
]
for a in avatars:
    draw_scene(ROOT / f"avatars/{a}.webp", a.replace("-", " ").title(), "URAI workforce avatar", palette["home"], "focus", mobile=True)

# SVG fallbacks
fallbacks = [
    ("home/home-threshold-fallback.svg","URAI Home Threshold","#7beafe"),
    ("home/home-ground-portal-fallback.svg","Ground Portal","#85f5d7"),
    ("home/home-sky-ascent-fallback.svg","Sky Ascent","#94bfff"),
    ("ground/ground-world-fallback.svg","Ground World","#85f5d7"),
    ("ground/ground-privacy-fallback.svg","Privacy Sanctuary","#80ffdc"),
    ("ground/ground-reception-fallback.svg","Reception","#7beafe"),
    ("ground/ground-logistics-fallback.svg","Logistics","#9af6c8"),
    ("ground/ground-wellness-fallback.svg","Wellness","#b8f7ff"),
    ("ground/ground-memory-archive-fallback.svg","Memory Archive","#a7d7ff"),
    ("life-map/life-map-galaxy-fallback.svg","Life Map Galaxy","#86b6ff"),
    ("life-map/life-map-node-fallback.svg","Life Map Node","#b2d6ff"),
    ("focus/focus-memory-chamber-fallback.svg","Focus Memory Chamber","#9eeaff"),
    ("replay/replay-memory-film-fallback.svg","Replay Memory Film","#c49bff"),
    ("mirror/mirror-reflection-fallback.svg","Mirror Reflection","#a7c7ff"),
    ("mirror/mirror-pattern-fallback.svg","Mirror Pattern","#b8d8ff"),
    ("passport/passport-vault-fallback.svg","Passport Vault","#ffd978"),
    ("privacy-controls/privacy-controls-fallback.svg","Privacy Controls","#8effdc"),
    ("location-map/location-emotional-weather-fallback.svg","Location Emotional Weather","#7beafe"),
    ("status/status-route-matrix-fallback.svg","Status Route Matrix","#8cffbf"),
    ("avatars/avatar-fallback.svg","URAI Workforce Avatar","#7beafe"),
    ("ui/orb-fallback.svg","URAI Orb","#7beafe"),
    ("ui/privacy-lock.svg","Privacy Lock","#8effdc"),
    ("ui/consent-key.svg","Consent Key","#ffd978"),
    ("ui/route-arrow.svg","Route Arrow","#7beafe"),
    ("ui/portal-ground.svg","Ground Portal","#85f5d7"),
    ("ui/portal-sky.svg","Sky Portal","#94bfff"),
]
for rel,title,color in fallbacks:
    svg(ROOT / rel, title, color)

print("Generated assets:", len(list(ROOT.rglob("*.*"))))
