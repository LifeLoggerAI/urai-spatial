import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const repoRoot = process.cwd();
const docsRoot = join(repoRoot, 'docs');
const wiredRoot = join(repoRoot, 'urai-tier1', 'public', 'assets', 'urai');
const generatedRoot = join(repoRoot, 'urai-tier1', 'public', 'assets', 'urai-aaa-full-pack');

const requirements = [
  {
    id: 'home-final-art',
    area: 'Home final art',
    route: '/',
    required: ['home/home-threshold-main.webp', 'home/home-threshold-mobile.webp', 'ui/orb-idle.webp'],
    generatedProbe: 'v1/tier-1/visuals/v1-tier-1-home-cinematic-world.svg',
    finalMeaning: 'real threshold, sky, ground, orb, body/avatar presence',
  },
  {
    id: 'ground-final-art',
    area: 'Ground final art',
    route: '/ground',
    required: ['ground/ground-world-main.webp', 'ground/ground-reception.webp', 'ground/ground-privacy-sanctuary.webp', 'ground/ground-logistics.webp', 'ground/ground-wellness.webp', 'ground/ground-memory-archive.webp'],
    generatedProbe: 'v4/tier-4/visuals/v4-tier-4-council-operations-floor.svg',
    finalMeaning: 'private operations floor, sanctuary, tables, archive, helpers, objects',
  },
  {
    id: 'life-map-final-3d',
    area: 'Life Map final 3D pass',
    route: '/life-map',
    required: ['life-map/life-map-galaxy-main.webp', 'life-map/life-map-node-threshold.webp', 'life-map/life-map-node-becoming.webp', 'life-map/life-map-node-studio.webp'],
    generatedProbe: 'v2/tier-2/visuals/v2-tier-2-life-map-galaxy.svg',
    finalMeaning: 'stars with memory images, depth, camera movement, living galaxy',
  },
  {
    id: 'focus-final-chamber',
    area: 'Focus final chamber',
    route: '/focus',
    required: ['focus/focus-memory-chamber-main.webp', 'focus/focus-memory-chamber-mobile.webp'],
    generatedProbe: 'v2/tier-2/visuals/v2-tier-2-focus-memory-chamber.svg',
    finalMeaning: 'selected memory as a real chamber, not panel UI',
  },
  {
    id: 'replay-final-film',
    area: 'Replay final film assets',
    route: '/replay',
    required: ['replay/replay-memory-film-main.webp', 'replay/replay-memory-film-mobile.webp', 'demo/replay-film-storyboard.webp'],
    generatedProbe: 'v2/tier-2/visuals/v2-tier-2-replay-cinematic-film.svg',
    finalMeaning: 'cinematic memory beats, thumbnails, transitions',
  },
  {
    id: 'mirror-passport-premium',
    area: 'Mirror / Passport premium visuals',
    route: '/mirror / /passport',
    required: ['mirror/mirror-reflection-main.webp', 'mirror/mirror-pattern-glyph.webp', 'passport/passport-vault-main.webp', 'passport/passport-ownership-seal.webp'],
    generatedProbe: 'v2/tier-2/visuals/v2-tier-2-passport-ownership-vault.svg',
    finalMeaning: 'reflection realm and ownership vault',
  },
  {
    id: 'quest-xr-entry-chamber',
    area: 'Quest/XR entry chamber',
    route: '/spatial/ar-vr',
    required: ['xr/quest-entry-main.webp', 'xr/webxr-fallback.webp', 'xr/controller-reticle.webp', 'xr/hand-ray.webp'],
    generatedProbe: 'v3/tier-3/visuals/v3-tier-3-quest-entry-lobby.svg',
    finalMeaning: 'louder, embodied, standing-inside-it entry chamber',
  },
  {
    id: 'models-avatars',
    area: 'Models / avatars',
    route: '/ground / /spatial/ar-vr',
    required: ['avatars/receptionist.webp', 'avatars/privacy-steward.webp', 'avatars/schedule-steward.webp', 'avatars/wellness-guide.webp', 'xr/models/orb-companion.placeholder.gltf', 'xr/models/ground-room.placeholder.gltf', 'xr/models/life-map-star.placeholder.gltf'],
    generatedProbe: 'v4/tier-4/visuals/v4-tier-4-agent-pod-cluster.svg',
    finalMeaning: 'orb states, council/workforce figures, simple polished 3D/animated assets',
  },
  {
    id: 'sound-design',
    area: 'Sound',
    route: 'global',
    required: ['audio/haptic-waveform.webp', 'audio/caption-card.webp'],
    generatedProbe: 'v3/tier-3/audio/v3-tier-3-ambient.wav',
    finalMeaning: 'orb tone, portal hum, focus/replay atmosphere, UI feedback',
  },
  {
    id: 'receipts-proof',
    area: 'Receipts',
    route: 'proof',
    required: [],
    generatedProbe: 'manifest.json',
    finalMeaning: 'asset manifest, no-missing-assets scan, screenshot proof, Quest proof',
  },
];

function presentWired(path) {
  return existsSync(join(wiredRoot, path));
}

function presentGenerated(path) {
  return existsSync(join(generatedRoot, path));
}

const rows = requirements.map((req) => {
  const missing = req.required.filter((path) => !presentWired(path));
  const generatedPresent = presentGenerated(req.generatedProbe);
  const wiredStatus = missing.length === 0 ? 'wired-green' : 'wired-missing';
  const generatedStatus = generatedPresent ? 'generated-asset-present' : 'generated-asset-missing';
  const aaaStatus = missing.length === 0 && generatedPresent ? 'AAA_PLACEHOLDER_READY__BESPOKE_FINAL_PENDING' : 'BLOCKED_MISSING_ASSET';
  return { ...req, missing, generatedPresent, wiredStatus, generatedStatus, aaaStatus };
});

const blocked = rows.filter((row) => row.aaaStatus === 'BLOCKED_MISSING_ASSET');
const placeholderReady = rows.filter((row) => row.aaaStatus === 'AAA_PLACEHOLDER_READY__BESPOKE_FINAL_PENDING');
const result = blocked.length === 0 ? 'GREEN_PLACEHOLDER_READY__NOT_BESPOKE_FINAL' : 'RED_MISSING_ASSETS';

let generatedManifestSummary = '';
const manifestPath = join(generatedRoot, 'manifest.json');
if (existsSync(manifestPath)) {
  try {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    generatedManifestSummary = [
      `Generated manifest schema: ${manifest.schema || 'unknown'}`,
      `Generated visual/motion records: ${manifest.counts?.totalManifestAssets ?? 'unknown'}`,
      `Generated audio files: ${manifest.counts?.audioFiles ?? 'unknown'}`,
    ].join('\n');
  } catch {
    generatedManifestSummary = 'Generated manifest exists but could not be parsed.';
  }
} else {
  generatedManifestSummary = 'Generated full-pack manifest is missing. Run `node urai-tier1/scripts/materialize-all-aaa-assets.mjs` from repo root.';
}

const md = [
  '# URAI AAA+++ Final Asset Audit',
  '',
  `Generated: ${new Date().toISOString()}`,
  `Result: ${result}`,
  '',
  '## What this means',
  '',
  '- `wired-green` means the live route has an asset path present in `urai-tier1/public/assets/urai`.',
  '- `generated-asset-present` means the v1-v5 generated visual/audio/motion matrix has a matching proof asset.',
  '- `AAA_PLACEHOLDER_READY__BESPOKE_FINAL_PENDING` means the system is materially assetized and shippable, but not yet true bespoke AAA art.',
  '- True `AAA+++ final` requires replacing placeholder/generated assets with custom approved art, optimized models, production audio, screenshot proof, and physical Quest proof.',
  '',
  '## Generated full-pack summary',
  '',
  '```txt',
  generatedManifestSummary,
  '```',
  '',
  '## Area audit',
  '',
  '| Area | Route | Wired status | Generated status | AAA status | Final meaning | Missing wired assets |',
  '| --- | --- | --- | --- | --- | --- | --- |',
  ...rows.map((row) => `| ${row.area} | ${row.route} | ${row.wiredStatus} | ${row.generatedStatus} | ${row.aaaStatus} | ${row.finalMeaning} | ${row.missing.length ? row.missing.join('<br>') : 'none'} |`),
  '',
  '## Counts',
  '',
  `- Areas checked: ${rows.length}`,
  `- Placeholder-ready areas: ${placeholderReady.length}`,
  `- Blocked/missing areas: ${blocked.length}`,
  '',
  '## Launch truth',
  '',
  blocked.length === 0
    ? 'The asset system is ready for a public preview / launch-candidate pass with generated production placeholders. Do not call it fully bespoke AAA+++ until replacement art/models/sound and final device/screenshot receipts are recorded.'
    : 'Some required wired assets or generated proof assets are missing. Run the materialization scripts before claiming launch-candidate asset readiness.',
  '',
].join('\n');

writeFileSync(join(docsRoot, 'AAA_FINAL_ASSET_AUDIT.md'), md);
console.log(`AAA_FINAL_ASSET_RESULT=${result}`);
console.log(`AAA_AREAS_CHECKED=${rows.length}`);
console.log(`AAA_PLACEHOLDER_READY=${placeholderReady.length}`);
console.log(`AAA_BLOCKED=${blocked.length}`);
console.log('AAA_AUDIT_DOC=docs/AAA_FINAL_ASSET_AUDIT.md');
