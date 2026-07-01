import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const publicRoot = path.join(root, "urai-tier1", "public");
const packRoot = path.join(publicRoot, "assets", "urai-aaa-full-pack");
const docsRoot = path.join(root, "docs");
const stamp = new Date().toISOString().replace(/[:.]/g, "-");

const versions = [
  {
    id: "v1",
    name: "V1 Public Preview",
    mood: "arrival, trust, cinematic first step",
    palette: ["#090b16", "#21183f", "#6ee7ff", "#c084fc", "#fff7ad"],
  },
  {
    id: "v2",
    name: "V2 Living Memory",
    mood: "memory, replay, emotional continuity",
    palette: ["#070812", "#1f295b", "#8fffe6", "#ff9fd6", "#f7e7a8"],
  },
  {
    id: "v3",
    name: "V3 Spatial XR",
    mood: "Quest, AR, VR, spatial embodiment",
    palette: ["#04070f", "#0d3b4f", "#78ffd6", "#84a9ff", "#ffffff"],
  },
  {
    id: "v4",
    name: "V4 Autonomous Council",
    mood: "agents, operations, private workforce",
    palette: ["#080914", "#30224d", "#93c5fd", "#f0abfc", "#fde68a"],
  },
  {
    id: "v5",
    name: "V5 Legacy Governance",
    mood: "ownership, consent, provenance, legacy",
    palette: ["#05070d", "#1e293b", "#67e8f9", "#d9f99d", "#fef3c7"],
  },
];

const tiers = [
  {
    id: "tier-1",
    name: "Tier 1 — Public Spatial Shell",
    intent: "Home, world entry, sky/ground threshold, orb, avatar, first impression.",
    assets: [
      ["home-cinematic-world", "Home world with sky, ground, orb, threshold portals"],
      ["sky-ascent-portal", "Sky portal into Life Map"],
      ["ground-descent-portal", "Ground portal into private command world"],
      ["orb-companion-idle", "Living orb companion idle state"],
      ["avatar-presence-shell", "Body/avatar presence silhouette"],
      ["mobile-home-crop", "Mobile-safe home composition"],
      ["open-graph-launch", "Share image for launch surface"],
    ],
  },
  {
    id: "tier-2",
    name: "Tier 2 — Memory Realms",
    intent: "Life Map, Focus, Replay, Mirror, Passport, Status, Location Map.",
    assets: [
      ["life-map-galaxy", "Private 3D memory galaxy"],
      ["memory-star-image-core", "Image-bearing memory star"],
      ["focus-memory-chamber", "Selected memory chamber"],
      ["replay-cinematic-film", "Cinematic memory replay scene"],
      ["mirror-reflection-realm", "Reflection realm with orb intelligence"],
      ["passport-ownership-vault", "Identity, consent, ownership vault"],
      ["status-control-room", "Premium product status control room"],
      ["location-emotional-weather", "Emotional weather and place map"],
    ],
  },
  {
    id: "tier-3",
    name: "Tier 3 — XR / Quest / AR",
    intent: "Quest Browser proof layer, WebXR fallback, AR/VR readiness.",
    assets: [
      ["quest-entry-lobby", "Quest Browser entry lobby"],
      ["xr-hand-targets", "Controller and hand target visual"],
      ["ar-plane-grid", "AR floor/passthrough plane grid"],
      ["vr-depth-rings", "VR spatial depth rings"],
      ["spatial-audio-field", "Spatial audio field visual"],
      ["webxr-fallback-card", "Fallback state when XR is unavailable"],
      ["device-proof-frame", "Manual Quest proof frame"],
    ],
  },
  {
    id: "tier-4",
    name: "Tier 4 — Autonomous Council",
    intent: "Private AI workforce, council floor, life operations, agents.",
    assets: [
      ["council-operations-floor", "Council and workforce operations floor"],
      ["agent-pod-cluster", "Private agent pod cluster"],
      ["schedule-work-table", "Schedule and work table"],
      ["logistics-command-table", "Logistics command table"],
      ["wellness-sanctuary", "Wellness and nervous-system area"],
      ["memory-archive-vault", "Memory archive vault"],
      ["signal-router-orbit", "Private signal routing orbit"],
    ],
  },
  {
    id: "tier-5",
    name: "Tier 5 — Governance / Legacy",
    intent: "Consent, provenance, private-by-default, legacy, audit layer.",
    assets: [
      ["consent-ledger", "Consent ledger"],
      ["privacy-shield", "Private-by-default shield"],
      ["provenance-ribbon", "Source and ownership provenance ribbon"],
      ["legacy-vault", "Legacy vault"],
      ["governance-constellation", "Governance constellation"],
      ["audit-seal", "Launch audit seal"],
      ["data-boundary-map", "Data boundary map"],
    ],
  },
];

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, ch => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&apos;",
  }[ch]));
}

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function svgFor({ version, tier, assetSlug, assetName, index }) {
  const [bg, deep, accent, glow, warm] = version.palette;
  const title = `${version.id.toUpperCase()} ${tier.id.toUpperCase()} ${assetSlug}`;
  const cx = 640;
  const cy = 360;
  const rings = Array.from({ length: 8 }, (_, i) => {
    const r = 80 + i * 54 + index * 3;
    const opacity = (0.16 - i * 0.012).toFixed(3);
    return `<ellipse cx="${cx}" cy="${cy}" rx="${r}" ry="${Math.max(28, r * 0.32)}" fill="none" stroke="${i % 2 ? glow : accent}" stroke-width="1.5" opacity="${opacity}">
      <animate attributeName="rx" values="${r};${r + 18};${r}" dur="${7 + i}s" repeatCount="indefinite"/>
      <animate attributeName="opacity" values="${opacity};${Math.min(0.28, Number(opacity) + 0.08)};${opacity}" dur="${6 + i}s" repeatCount="indefinite"/>
    </ellipse>`;
  }).join("\n");

  const stars = Array.from({ length: 34 }, (_, i) => {
    const x = 90 + ((i * 97 + index * 31) % 1100);
    const y = 80 + ((i * 53 + index * 47) % 520);
    const rr = 1.5 + ((i + index) % 4);
    const op = 0.35 + ((i % 7) / 10);
    return `<circle cx="${x}" cy="${y}" r="${rr}" fill="${i % 3 ? accent : warm}" opacity="${op.toFixed(2)}">
      <animate attributeName="opacity" values="${op.toFixed(2)};1;${op.toFixed(2)}" dur="${3 + (i % 6)}s" repeatCount="indefinite"/>
    </circle>`;
  }).join("\n");

  const panels = Array.from({ length: 5 }, (_, i) => {
    const x = 160 + i * 205;
    const y = 485 - (i % 2) * 42;
    return `<g opacity="0.82">
      <rect x="${x}" y="${y}" width="150" height="68" rx="22" fill="${deep}" stroke="${accent}" stroke-width="1.2" opacity="0.58"/>
      <circle cx="${x + 32}" cy="${y + 34}" r="12" fill="${glow}" opacity="0.72"/>
      <path d="M${x + 58} ${y + 32} H${x + 128}" stroke="${warm}" stroke-width="3" stroke-linecap="round" opacity="0.55"/>
    </g>`;
  }).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1600" height="900" viewBox="0 0 1280 720" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="title desc">
<title id="title">${esc(title)}</title>
<desc id="desc">${esc(assetName)}. ${esc(version.name)}. ${esc(tier.name)}.</desc>
<defs>
  <radialGradient id="orb" cx="50%" cy="50%" r="50%">
    <stop offset="0%" stop-color="#ffffff"/>
    <stop offset="32%" stop-color="${warm}"/>
    <stop offset="62%" stop-color="${accent}"/>
    <stop offset="100%" stop-color="${deep}" stop-opacity="0.15"/>
  </radialGradient>
  <linearGradient id="sky" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="${bg}"/>
    <stop offset="46%" stop-color="${deep}"/>
    <stop offset="100%" stop-color="${bg}"/>
  </linearGradient>
  <linearGradient id="ground" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0%" stop-color="${deep}" stop-opacity="0.12"/>
    <stop offset="52%" stop-color="${accent}" stop-opacity="0.24"/>
    <stop offset="100%" stop-color="${deep}" stop-opacity="0.12"/>
  </linearGradient>
  <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
    <feGaussianBlur stdDeviation="10" result="blur"/>
    <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
</defs>
<rect width="1280" height="720" fill="url(#sky)"/>
<path d="M0 472 C155 430 272 493 430 456 C596 417 701 490 852 451 C1008 411 1122 437 1280 392 V720 H0 Z" fill="url(#ground)" opacity="0.88"/>
${stars}
<g transform="translate(0 ${index % 2 ? 6 : 0})">
${rings}
</g>
<circle cx="640" cy="330" r="74" fill="url(#orb)" filter="url(#softGlow)" opacity="0.94">
  <animate attributeName="r" values="68;78;68" dur="4.8s" repeatCount="indefinite"/>
</circle>
<circle cx="640" cy="330" r="106" fill="none" stroke="${accent}" stroke-width="2" opacity="0.32">
  <animate attributeName="r" values="96;122;96" dur="5.6s" repeatCount="indefinite"/>
  <animate attributeName="opacity" values="0.22;0.48;0.22" dur="5.6s" repeatCount="indefinite"/>
</circle>
<path d="M560 603 C583 533 610 492 640 492 C670 492 697 533 720 603" stroke="${warm}" stroke-width="8" stroke-linecap="round" opacity="0.48"/>
<circle cx="640" cy="466" r="31" fill="${warm}" opacity="0.23"/>
${panels}
<g opacity="0.9">
  <rect x="68" y="58" width="468" height="112" rx="34" fill="#020617" opacity="0.42" stroke="${accent}" stroke-opacity="0.32"/>
  <text x="96" y="103" fill="#ffffff" font-family="Inter, Arial, sans-serif" font-size="24" font-weight="800" letter-spacing="1.5">${esc(version.name)}</text>
  <text x="96" y="139" fill="${warm}" font-family="Inter, Arial, sans-serif" font-size="18" font-weight="600">${esc(tier.name)}</text>
</g>
<text x="96" y="650" fill="#ffffff" font-family="Inter, Arial, sans-serif" font-size="30" font-weight="900" opacity="0.92">${esc(assetSlug.replaceAll("-", " "))}</text>
<text x="96" y="682" fill="${accent}" font-family="Inter, Arial, sans-serif" font-size="16" font-weight="700" opacity="0.76">${esc(assetName)}</text>
</svg>
`;
}

function motionFor({ version, tier, assetSlug }) {
  return {
    schema: "urai.motion.v1",
    asset: assetSlug,
    version: version.id,
    tier: tier.id,
    loops: [
      { target: "orb", property: "scale", keyframes: [0.96, 1.04, 0.96], durationMs: 4800, easing: "breath" },
      { target: "depth-rings", property: "opacity", keyframes: [0.22, 0.48, 0.22], durationMs: 5600, easing: "sine" },
      { target: "world", property: "parallax", keyframes: [-8, 0, 8, 0, -8], durationMs: 12000, easing: "cinematic" },
      { target: "portal", property: "glow", keyframes: [0.3, 0.72, 0.3], durationMs: 6200, easing: "soft-pulse" },
    ],
    interactionStates: {
      idle: "ambient living world",
      hover: "increase glow and ring density",
      selected: "move camera inward and reveal memory/council/vault detail",
      mobile: "reduce panel spread, preserve orb and primary portal",
      xrFallback: "show Quest/WebXR instructions without claiming physical proof",
    },
  };
}

function writeWav(file, baseFreq, seconds = 1.8, sampleRate = 22050) {
  const channels = 1;
  const bits = 16;
  const samples = Math.floor(seconds * sampleRate);
  const dataSize = samples * channels * bits / 8;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(channels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * channels * bits / 8, 28);
  buffer.writeUInt16LE(channels * bits / 8, 32);
  buffer.writeUInt16LE(bits, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < samples; i++) {
    const t = i / sampleRate;
    const fadeIn = Math.min(1, t / 0.15);
    const fadeOut = Math.min(1, (seconds - t) / 0.35);
    const env = Math.max(0, Math.min(fadeIn, fadeOut));
    const wave =
      Math.sin(2 * Math.PI * baseFreq * t) * 0.38 +
      Math.sin(2 * Math.PI * baseFreq * 1.5 * t) * 0.18 +
      Math.sin(2 * Math.PI * baseFreq * 2.01 * t) * 0.08;
    const val = Math.max(-1, Math.min(1, wave * env * 0.36));
    buffer.writeInt16LE(Math.floor(val * 32767), 44 + i * 2);
  }

  fs.writeFileSync(file, buffer);
}

ensureDir(packRoot);
ensureDir(docsRoot);

const manifest = {
  schema: "urai.aaa.fullAssetPack.v1",
  generatedAt: new Date().toISOString(),
  purpose: "Complete generated AAA asset matrix for v1-v5 and tier-1 through tier-5: visuals, animations, audio, motion CSS, docs receipts.",
  warning: "Quest 2 physical proof is not asserted by these assets. Manual Quest Browser verification remains required.",
  publicRoot: "/assets/urai-aaa-full-pack",
  versions,
  tiers: tiers.map(t => ({ id: t.id, name: t.name, intent: t.intent })),
  assets: [],
};

let count = 0;
let audioCount = 0;
let motionCount = 0;
let visualCount = 0;

for (const version of versions) {
  for (const tier of tiers) {
    const baseDir = path.join(packRoot, version.id, tier.id);
    const visualDir = path.join(baseDir, "visuals");
    const motionDir = path.join(baseDir, "animations");
    const audioDir = path.join(baseDir, "audio");
    ensureDir(visualDir);
    ensureDir(motionDir);
    ensureDir(audioDir);

    const ambientPath = path.join(audioDir, `${version.id}-${tier.id}-ambient.wav`);
    const chimePath = path.join(audioDir, `${version.id}-${tier.id}-ui-chime.wav`);
    writeWav(ambientPath, 108 + versions.indexOf(version) * 17 + tiers.indexOf(tier) * 11, 2.2);
    writeWav(chimePath, 420 + versions.indexOf(version) * 31 + tiers.indexOf(tier) * 17, 0.42);
    audioCount += 2;

    const soundscape = {
      schema: "urai.soundscape.v1",
      version: version.id,
      tier: tier.id,
      ambient: `/${path.relative(publicRoot, ambientPath).replaceAll(path.sep, "/")}`,
      chime: `/${path.relative(publicRoot, chimePath).replaceAll(path.sep, "/")}`,
      intention: tier.intent,
      mix: {
        ambientDb: -18,
        chimeDb: -10,
        spatialWidth: tier.id === "tier-3" ? "wide-xr" : "cinematic",
        loopSafe: true,
      },
    };
    fs.writeFileSync(path.join(audioDir, `${version.id}-${tier.id}-soundscape.json`), JSON.stringify(soundscape, null, 2));

    tier.assets.forEach(([assetSlug, assetName], i) => {
      const fullSlug = `${version.id}-${tier.id}-${assetSlug}`;
      const svgPath = path.join(visualDir, `${fullSlug}.svg`);
      const motionPath = path.join(motionDir, `${fullSlug}.motion.json`);
      fs.writeFileSync(svgPath, svgFor({ version, tier, assetSlug: fullSlug, assetName, index: count + i }));
      fs.writeFileSync(motionPath, JSON.stringify(motionFor({ version, tier, assetSlug: fullSlug }), null, 2));

      visualCount += 1;
      motionCount += 1;
      manifest.assets.push({
        id: fullSlug,
        version: version.id,
        tier: tier.id,
        type: "visual+motion",
        role: assetName,
        visual: `/${path.relative(publicRoot, svgPath).replaceAll(path.sep, "/")}`,
        motion: `/${path.relative(publicRoot, motionPath).replaceAll(path.sep, "/")}`,
        ambient: soundscape.ambient,
        chime: soundscape.chime,
        status: "generated-final-placeholder",
        launchUse: "safe to wire as production placeholder; replace with bespoke art when commissioned",
      });
    });

    count += tier.assets.length;
  }
}

const css = `/*
URAI AAA Full Asset Motion Layer
Generated ${new Date().toISOString()}
*/
:root {
  --urai-aaa-orb-breath-ms: 4800ms;
  --urai-aaa-world-drift-ms: 12000ms;
  --urai-aaa-portal-pulse-ms: 6200ms;
}

@keyframes uraiAaaOrbBreath {
  0%, 100% { transform: scale(0.96); filter: drop-shadow(0 0 18px rgba(110, 231, 255, 0.24)); }
  50% { transform: scale(1.045); filter: drop-shadow(0 0 42px rgba(192, 132, 252, 0.52)); }
}

@keyframes uraiAaaWorldDrift {
  0%, 100% { transform: translate3d(-8px, 2px, 0) scale(1.01); }
  50% { transform: translate3d(8px, -2px, 0) scale(1.025); }
}

@keyframes uraiAaaPortalPulse {
  0%, 100% { opacity: 0.72; filter: saturate(1); }
  50% { opacity: 1; filter: saturate(1.35) brightness(1.08); }
}

.urai-aaa-orb-motion { animation: uraiAaaOrbBreath var(--urai-aaa-orb-breath-ms) ease-in-out infinite; transform-origin: center; }
.urai-aaa-world-motion { animation: uraiAaaWorldDrift var(--urai-aaa-world-drift-ms) ease-in-out infinite; will-change: transform; }
.urai-aaa-portal-motion { animation: uraiAaaPortalPulse var(--urai-aaa-portal-pulse-ms) ease-in-out infinite; }

@media (prefers-reduced-motion: reduce) {
  .urai-aaa-orb-motion,
  .urai-aaa-world-motion,
  .urai-aaa-portal-motion {
    animation: none;
  }
}
`;
ensureDir(path.join(packRoot, "styles"));
fs.writeFileSync(path.join(packRoot, "styles", "urai-aaa-motion.css"), css);

manifest.counts = {
  versions: versions.length,
  tiers: tiers.length,
  visualSvg: visualCount,
  motionJson: motionCount,
  audioFiles: audioCount,
  totalManifestAssets: manifest.assets.length,
};

fs.writeFileSync(path.join(packRoot, "manifest.json"), JSON.stringify(manifest, null, 2));

const matrixRows = manifest.assets.map(a =>
  `| ${a.version} | ${a.tier} | ${a.id} | ${a.role} | ${a.status} |`
).join("\n");

const receipt = `# URAI AAA Full Asset Pack Receipt

Generated: ${manifest.generatedAt}

## Result

This materializes a full generated asset matrix for:

- V1 through V5
- Tier 1 through Tier 5
- Visual SVG scene assets
- SVG-native animations
- Motion JSON manifests
- Ambient WAV loops
- UI chime WAV files
- Motion CSS
- Public manifest

## Counts

| Type | Count |
|---|---:|
| Versions | ${manifest.counts.versions} |
| Tiers | ${manifest.counts.tiers} |
| Visual SVG files | ${manifest.counts.visualSvg} |
| Motion JSON files | ${manifest.counts.motionJson} |
| Audio WAV files | ${manifest.counts.audioFiles} |
| Manifest asset records | ${manifest.counts.totalManifestAssets} |

## Public Manifest

\`/assets/urai-aaa-full-pack/manifest.json\`

## Important Truth Boundary

These assets create the full generated production-placeholder visual/audio/motion layer.

They do **not** claim physical Quest 2 proof. Quest Browser proof still requires a human opening the live app on a real Quest 2 headset.

## Matrix

| Version | Tier | Asset | Role | Status |
|---|---|---|---|---|
${matrixRows}
`;

fs.writeFileSync(path.join(docsRoot, "AAA_FULL_ASSET_PACK_RECEIPT.md"), receipt);
fs.writeFileSync(path.join(packRoot, `receipt-${stamp}.md`), receipt);

console.log("AAA_ASSET_PACK_RESULT=GREEN");
console.log(`AAA_ASSET_PACK_ROOT=${packRoot}`);
console.log(`VISUAL_SVG=${visualCount}`);
console.log(`MOTION_JSON=${motionCount}`);
console.log(`AUDIO_WAV=${audioCount}`);
console.log(`MANIFEST_ASSETS=${manifest.assets.length}`);
