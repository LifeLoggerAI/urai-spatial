import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const base = path.join(root, "urai-tier1", "public", "assets", "urai", "final");
const receiptRoot =
  process.env.URAI_ASSET_RECEIPT ||
  path.join(process.env.HOME || root, "urai-final-receipts", "asset-spine-local");

const now = new Date().toISOString();

const routes = [
  {
    tier: "tier1",
    route: "home",
    canon: "Home Threshold",
    mood: "real sky, horizon, orb companion, user world threshold",
    assets: [
      "home-threshold-desktop",
      "home-threshold-mobile",
      "home-threshold-og",
      "home-sky-ascent-portal",
      "home-ground-descent-portal",
      "home-orb-presence",
      "home-avatar-grounded"
    ]
  },
  {
    tier: "tier1",
    route: "ground",
    canon: "Ground Realm",
    mood: "private real-world operations layer, walkable support world",
    assets: [
      "ground-realm-desktop",
      "ground-realm-mobile",
      "ground-reception",
      "ground-privacy-sanctuary",
      "ground-work-table",
      "ground-logistics-bay",
      "ground-wellness-pool",
      "ground-memory-archive",
      "ground-workforce-council",
      "ground-og"
    ]
  },
  {
    tier: "tier2",
    route: "life-map",
    canon: "Life Map",
    mood: "private galaxy, organic dust cloud, memory constellations, camera pull",
    assets: [
      "lifemap-galaxy-field-desktop",
      "lifemap-galaxy-field-mobile",
      "lifemap-organic-dust-core",
      "lifemap-selected-star",
      "lifemap-memory-star",
      "lifemap-camera-pull-cue",
      "lifemap-og"
    ]
  },
  {
    tier: "tier2",
    route: "focus",
    canon: "Focus Chamber",
    mood: "selected memory chamber, image inside star, replay entry",
    assets: [
      "focus-memory-chamber-desktop",
      "focus-memory-chamber-mobile",
      "focus-star-image-frame",
      "focus-replay-threshold",
      "focus-og"
    ]
  },
  {
    tier: "tier2",
    route: "replay",
    canon: "Replay Realm",
    mood: "cinematic memory film, inside the memory, emotional beat stage",
    assets: [
      "replay-cinematic-stage-desktop",
      "replay-cinematic-stage-mobile",
      "replay-emotional-beat-01",
      "replay-emotional-beat-02",
      "replay-emotional-beat-03",
      "replay-xr-tease",
      "replay-og"
    ]
  },
  {
    tier: "tier2",
    route: "mirror",
    canon: "Mirror Realm",
    mood: "reflection without judgment, private pattern layer, orb integrated",
    assets: [
      "mirror-reflection-realm-desktop",
      "mirror-reflection-realm-mobile",
      "mirror-private-pattern-field",
      "mirror-orb-reflection",
      "mirror-og"
    ]
  },
  {
    tier: "tier2",
    route: "passport",
    canon: "Passport Vault",
    mood: "identity, consent, ownership, provenance, private-by-default",
    assets: [
      "passport-vault-desktop",
      "passport-vault-mobile",
      "passport-consent-seal",
      "passport-provenance-thread",
      "passport-ownership-panel",
      "passport-og"
    ]
  },
  {
    tier: "tier2",
    route: "status",
    canon: "Status Realm",
    mood: "system pulse, live trust, operational proof",
    assets: [
      "status-system-pulse-desktop",
      "status-system-pulse-mobile",
      "status-route-proof",
      "status-trust-grid",
      "status-og"
    ]
  },
  {
    tier: "tier2",
    route: "privacy-controls",
    canon: "Privacy Controls",
    mood: "consent controls, private operating boundary",
    assets: [
      "privacy-controls-desktop",
      "privacy-controls-mobile",
      "privacy-consent-ring",
      "privacy-og"
    ]
  },
  {
    tier: "tier2",
    route: "location-map",
    canon: "Location Map",
    mood: "emotional weather, world signal, place memory",
    assets: [
      "location-map-desktop",
      "location-map-mobile",
      "location-emotional-weather",
      "location-signal-field",
      "location-og"
    ]
  },
  {
    tier: "tier3",
    route: "xr",
    canon: "XR Preview",
    mood: "Quest, AR, WebXR, spatial preview without fake hardware proof",
    assets: [
      "xr-preview-desktop",
      "xr-preview-mobile",
      "quest-entry-frame",
      "ar-world-anchor",
      "webxr-threshold",
      "xr-og"
    ]
  },
  {
    tier: "tier3",
    route: "demo",
    canon: "Demo Film",
    mood: "public proof, replay film, onboarding cinematic",
    assets: [
      "demo-replay-film-poster",
      "demo-replay-film-mobile",
      "demo-phone-cameo",
      "demo-ground-council-shot",
      "demo-life-map-shot",
      "demo-og"
    ]
  }
];

const shared = [
  {
    folder: "shared/orb",
    canon: "Orb Companion",
    mood: "alive companion state language",
    assets: ["orb-idle", "orb-hover", "orb-thinking", "orb-guiding", "orb-listening", "orb-protecting"]
  },
  {
    folder: "shared/avatar",
    canon: "Avatar Presence",
    mood: "grounded body presence, not cartoon",
    assets: ["avatar-grounded-idle", "avatar-walking-shadow", "avatar-focus-distance", "avatar-ground-presence"]
  },
  {
    folder: "shared/atmosphere",
    canon: "URAI Atmosphere",
    mood: "depth, fog, light beams, private spatial continuity",
    assets: ["atmosphere-depth-haze", "atmosphere-ground-fog", "atmosphere-sky-glow", "atmosphere-memory-dust"]
  },
  {
    folder: "shared/panels",
    canon: "Spatial Panels",
    mood: "glass, private, readable, mobile-safe",
    assets: ["panel-glass-soft", "panel-ground-console", "panel-memory-card", "panel-vault"]
  },
  {
    folder: "shared/portals",
    canon: "Route Portals",
    mood: "movement between worlds",
    assets: ["portal-descend-ground", "portal-ascend-sky", "portal-enter-focus", "portal-enter-replay", "portal-unwind"]
  }
];

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function slugColor(seed) {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return h;
}

function svgFor({ name, canon, mood, tier, route, kind }) {
  const h = slugColor(name);
  const h2 = (h + 42) % 360;
  const h3 = (h + 210) % 360;
  const title = `${canon} / ${name}`;
  const small = `${tier || "shared"} • ${route || kind || "asset"} • ${mood}`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1920" height="1080" viewBox="0 0 1920 1080" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${escapeXml(title)}">
  <defs>
    <radialGradient id="core" cx="50%" cy="46%" r="64%">
      <stop offset="0%" stop-color="hsl(${h2}, 88%, 76%)" stop-opacity="0.84"/>
      <stop offset="28%" stop-color="hsl(${h}, 74%, 46%)" stop-opacity="0.42"/>
      <stop offset="67%" stop-color="hsl(${h3}, 68%, 18%)" stop-opacity="0.88"/>
      <stop offset="100%" stop-color="#03050A"/>
    </radialGradient>
    <linearGradient id="floor" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="rgba(255,255,255,0.28)"/>
      <stop offset="50%" stop-color="rgba(120,170,255,0.14)"/>
      <stop offset="100%" stop-color="rgba(255,255,255,0.04)"/>
    </linearGradient>
    <filter id="blur">
      <feGaussianBlur stdDeviation="18"/>
    </filter>
    <filter id="soft">
      <feGaussianBlur stdDeviation="2"/>
    </filter>
  </defs>

  <rect width="1920" height="1080" fill="url(#core)"/>
  <rect width="1920" height="1080" fill="#03050A" opacity="0.30"/>

  <g opacity="0.50" filter="url(#blur)">
    <ellipse cx="960" cy="540" rx="520" ry="220" fill="hsl(${h2}, 90%, 70%)" opacity="0.24"/>
    <ellipse cx="820" cy="610" rx="620" ry="180" fill="hsl(${h3}, 90%, 55%)" opacity="0.16"/>
    <ellipse cx="1120" cy="430" rx="380" ry="160" fill="hsl(${h}, 100%, 68%)" opacity="0.22"/>
  </g>

  <g opacity="0.55">
    <path d="M0 850 C330 740 520 915 825 804 C1100 704 1390 785 1920 642 L1920 1080 L0 1080 Z" fill="url(#floor)" opacity="0.30"/>
    <path d="M0 910 C420 790 680 1010 1000 870 C1300 738 1540 888 1920 760" stroke="rgba(255,255,255,0.30)" stroke-width="2"/>
  </g>

  <g opacity="0.78">
    ${starField(name)}
  </g>

  <g transform="translate(960 500)">
    <circle r="132" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.28)" stroke-width="1.5"/>
    <circle r="82" fill="rgba(255,255,255,0.10)" stroke="rgba(255,255,255,0.36)" stroke-width="1"/>
    <circle r="34" fill="hsl(${h2}, 100%, 78%)" opacity="0.82"/>
    <circle r="168" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="1"/>
    <path d="M-260 120 C-120 20 120 20 260 120" stroke="rgba(255,255,255,0.23)" stroke-width="2" fill="none"/>
  </g>

  <g transform="translate(120 805)">
    <rect x="0" y="0" width="820" height="150" rx="28" fill="rgba(3,8,18,0.58)" stroke="rgba(255,255,255,0.18)"/>
    <text x="36" y="55" fill="rgba(255,255,255,0.92)" font-family="Inter, Arial, sans-serif" font-size="31" font-weight="700">${escapeXml(canon)}</text>
    <text x="36" y="96" fill="rgba(255,255,255,0.70)" font-family="Inter, Arial, sans-serif" font-size="21">${escapeXml(name)}</text>
    <text x="36" y="126" fill="rgba(255,255,255,0.50)" font-family="Inter, Arial, sans-serif" font-size="17">${escapeXml(small).slice(0, 120)}</text>
  </g>

  <text x="1780" y="1012" text-anchor="end" fill="rgba(255,255,255,0.38)" font-family="Inter, Arial, sans-serif" font-size="18">URAI final asset spine fallback</text>
</svg>`;
}

function starField(seed) {
  let out = "";
  let n = 52;
  let x = 123;
  for (let i = 0; i < n; i++) {
    x = (x * 1103515245 + 12345 + seed.length * 17) & 0x7fffffff;
    const cx = 80 + (x % 1760);
    x = (x * 1103515245 + 12345) & 0x7fffffff;
    const cy = 70 + (x % 720);
    x = (x * 1103515245 + 12345) & 0x7fffffff;
    const r = 1.2 + (x % 42) / 10;
    const op = 0.18 + ((x % 60) / 100);
    out += `<circle cx="${cx}" cy="${cy}" r="${r.toFixed(1)}" fill="white" opacity="${op.toFixed(2)}"/>\n`;
  }
  return out;
}

function escapeXml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

ensureDir(base);
ensureDir(receiptRoot);

const manifest = {
  generatedAt: now,
  canon: "URAI final asset spine",
  warning:
    "These are structured fallback/source assets. Replace SVGs with bespoke final WEBP/AVIF as art arrives while preserving ids and manifest paths.",
  basePath: "/assets/urai/final",
  routes: {},
  shared: {},
  tiers: {
    tier1: "Public spatial shell",
    tier2: "Life OS journey",
    tier3: "XR / Quest / AR preview",
    tier4: "Expansion worlds",
    tier5: "Governance / trust / provenance"
  }
};

const created = [];
const missingWebp = [];

for (const r of routes) {
  const dir = path.join(base, r.tier, r.route);
  ensureDir(dir);

  manifest.routes[r.route] = {
    tier: r.tier,
    canon: r.canon,
    mood: r.mood,
    assets: {}
  };

  for (const asset of r.assets) {
    const svgName = `${asset}.svg`;
    const svgPath = path.join(dir, svgName);
    const relSvg = `/assets/urai/final/${r.tier}/${r.route}/${svgName}`;
    const webpName = `${asset}.webp`;
    const relWebp = `/assets/urai/final/${r.tier}/${r.route}/${webpName}`;

    fs.writeFileSync(
      svgPath,
      svgFor({
        name: asset,
        canon: r.canon,
        mood: r.mood,
        tier: r.tier,
        route: r.route
      })
    );

    manifest.routes[r.route].assets[asset] = {
      id: asset,
      fallbackSvg: relSvg,
      preferredWebp: relWebp,
      status: "fallback-svg-ready"
    };

    created.push(svgPath);
    missingWebp.push(relWebp);
  }
}

for (const s of shared) {
  const dir = path.join(base, s.folder);
  ensureDir(dir);

  manifest.shared[s.folder] = {
    canon: s.canon,
    mood: s.mood,
    assets: {}
  };

  for (const asset of s.assets) {
    const svgName = `${asset}.svg`;
    const svgPath = path.join(dir, svgName);
    const relSvg = `/assets/urai/final/${s.folder}/${svgName}`;
    const webpName = `${asset}.webp`;
    const relWebp = `/assets/urai/final/${s.folder}/${webpName}`;

    fs.writeFileSync(
      svgPath,
      svgFor({
        name: asset,
        canon: s.canon,
        mood: s.mood,
        kind: s.folder
      })
    );

    manifest.shared[s.folder].assets[asset] = {
      id: asset,
      fallbackSvg: relSvg,
      preferredWebp: relWebp,
      status: "fallback-svg-ready"
    };

    created.push(svgPath);
    missingWebp.push(relWebp);
  }
}

const manifestDir = path.join(base, "manifests");
ensureDir(manifestDir);

const manifestPath = path.join(manifestDir, "urai-final-assets.json");
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

const md = [
  "# URAI Final Asset Spine Receipt",
  "",
  `Generated: ${now}`,
  "",
  "## Created fallback/source assets",
  "",
  ...created.map((p) => `- ${path.relative(root, p)}`),
  "",
  "## Preferred final WEBP/AVIF targets still to replace with bespoke production art",
  "",
  ...missingWebp.map((p) => `- ${p}`),
  "",
  "## Manifest",
  "",
  `- ${path.relative(root, manifestPath)}`,
  "",
  "## Rule",
  "",
  "Scene code should consume the manifest. Bespoke art should replace the fallback SVGs without changing ids."
].join("\n");

fs.writeFileSync(path.join(receiptRoot, "urai-final-asset-spine-receipt.md"), md);
fs.writeFileSync(path.join(receiptRoot, "urai-final-assets.json"), JSON.stringify(manifest, null, 2));
fs.writeFileSync(path.join(receiptRoot, "missing-webp-targets.txt"), missingWebp.join("\n") + "\n");

console.log(`CREATED_FALLBACK_ASSETS=${created.length}`);
console.log(`MANIFEST=${path.relative(root, manifestPath)}`);
console.log(`RECEIPT=${path.join(receiptRoot, "urai-final-asset-spine-receipt.md")}`);
