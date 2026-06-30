import { existsSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { extname, join, relative } from 'node:path';

const repoRoot = process.cwd();
const assetRoot = join(repoRoot, 'urai-tier1', 'public', 'assets', 'urai');
const outPath = join(repoRoot, 'docs', 'final-asset-receipt.md');
const supported = new Set(['.png', '.jpg', '.jpeg', '.webp', '.svg', '.glb', '.gltf', '.mp3', '.wav', '.ogg']);

const coreRequired = [
  ['home', 'home/home-threshold-main.webp', 'placeholder-final'],
  ['home-mobile', 'home/home-threshold-mobile.webp', 'placeholder-final'],
  ['home-ground-portal', 'home/home-ground-portal.webp', 'placeholder-final'],
  ['home-sky-ascent', 'home/home-sky-ascent.webp', 'placeholder-final'],
  ['ground', 'ground/ground-world-main.webp', 'placeholder-final'],
  ['ground-mobile', 'ground/ground-world-mobile.webp', 'placeholder-final'],
  ['ground-reception', 'ground/ground-reception.webp', 'placeholder-final'],
  ['ground-privacy', 'ground/ground-privacy-sanctuary.webp', 'placeholder-final'],
  ['ground-logistics', 'ground/ground-logistics.webp', 'placeholder-final'],
  ['ground-wellness', 'ground/ground-wellness.webp', 'placeholder-final'],
  ['ground-memory-archive', 'ground/ground-memory-archive.webp', 'placeholder-final'],
  ['life-map', 'life-map/life-map-galaxy-main.webp', 'placeholder-final'],
  ['life-map-mobile', 'life-map/life-map-galaxy-mobile.webp', 'placeholder-final'],
  ['life-map-threshold-node', 'life-map/life-map-node-threshold.webp', 'placeholder-final'],
  ['life-map-becoming-node', 'life-map/life-map-node-becoming.webp', 'placeholder-final'],
  ['life-map-studio-node', 'life-map/life-map-node-studio.webp', 'placeholder-final'],
  ['focus', 'focus/focus-memory-chamber-main.webp', 'placeholder-final'],
  ['focus-mobile', 'focus/focus-memory-chamber-mobile.webp', 'placeholder-final'],
  ['replay', 'replay/replay-memory-film-main.webp', 'placeholder-final'],
  ['replay-mobile', 'replay/replay-memory-film-mobile.webp', 'placeholder-final'],
  ['mirror', 'mirror/mirror-reflection-main.webp', 'placeholder-final'],
  ['mirror-mobile', 'mirror/mirror-reflection-mobile.webp', 'placeholder-final'],
  ['mirror-pattern', 'mirror/mirror-pattern-glyph.webp', 'placeholder-final'],
  ['passport', 'passport/passport-vault-main.webp', 'placeholder-final'],
  ['passport-mobile', 'passport/passport-vault-mobile.webp', 'placeholder-final'],
  ['passport-ownership-seal', 'passport/passport-ownership-seal.webp', 'placeholder-final'],
  ['privacy-controls', 'privacy-controls/privacy-controls-main.webp', 'placeholder-final'],
  ['privacy-controls-mobile', 'privacy-controls/privacy-controls-mobile.webp', 'placeholder-final'],
  ['privacy-model-access', 'privacy-controls/privacy-model-access.webp', 'placeholder-final'],
  ['privacy-location-precision', 'privacy-controls/privacy-location-precision.webp', 'placeholder-final'],
  ['location-map', 'location-map/location-emotional-weather-main.webp', 'placeholder-final'],
  ['location-map-mobile', 'location-map/location-emotional-weather-mobile.webp', 'placeholder-final'],
  ['location-place-node', 'location-map/location-place-node.webp', 'placeholder-final'],
  ['status', 'status/status-route-matrix-main.webp', 'placeholder-final'],
  ['status-mobile', 'status/status-route-matrix-mobile.webp', 'placeholder-final'],
  ['status-health-pill', 'status/status-health-pill.webp', 'placeholder-final'],
  ['orb-idle', 'ui/orb-idle.webp', 'placeholder-final'],
  ['orb-active', 'ui/orb-active.webp', 'placeholder-final'],
  ['orb-listening', 'ui/orb-listening.webp', 'placeholder-final'],
  ['avatar-receptionist', 'avatars/receptionist.webp', 'placeholder-final'],
  ['avatar-privacy-steward', 'avatars/privacy-steward.webp', 'placeholder-final'],
  ['avatar-schedule-steward', 'avatars/schedule-steward.webp', 'placeholder-final'],
  ['avatar-wellness-guide', 'avatars/wellness-guide.webp', 'placeholder-final'],
  ['avatar-relationship-liaison', 'avatars/relationship-liaison.webp', 'placeholder-final'],
  ['avatar-logistics-helper', 'avatars/logistics-helper.webp', 'placeholder-final'],
  ['avatar-archivist', 'avatars/archivist.webp', 'placeholder-final'],
  ['avatar-operator', 'avatars/operator.webp', 'placeholder-final'],
  ['avatar-builder', 'avatars/builder.webp', 'placeholder-final'],
  ['avatar-protector', 'avatars/protector.webp', 'placeholder-final'],
  ['avatar-mirror', 'avatars/mirror.webp', 'placeholder-final'],
  ['avatar-guide', 'avatars/guide.webp', 'placeholder-final'],
];

const expansionTargets = [
  ['orb-thinking', 'ui/orb-thinking.webp', 'v1-polish'],
  ['orb-guiding', 'ui/orb-guiding.webp', 'v1-polish'],
  ['orb-protecting', 'ui/orb-protecting.webp', 'v1-polish'],
  ['og-home', 'open-graph/urai-home-og.webp', 'v1-launch'],
  ['og-ground', 'open-graph/urai-ground-og.webp', 'v1-launch'],
  ['og-life-map', 'open-graph/urai-life-map-og.webp', 'v1-launch'],
  ['social-launch-card', 'social/launch-card.webp', 'v1-launch'],
  ['social-app-preview-phone', 'social/app-preview-phone.webp', 'v1-launch'],
  ['social-press-hero', 'social/press-hero.webp', 'v1-launch'],
  ['demo-replay-film-storyboard', 'demo/replay-film-storyboard.webp', 'v1-launch'],
  ['xr-quest-entry', 'xr/quest-entry-main.webp', 'tier3'],
  ['xr-webxr-fallback', 'xr/webxr-fallback.webp', 'tier3'],
  ['xr-controller-reticle', 'xr/controller-reticle.webp', 'tier3'],
  ['xr-hand-ray', 'xr/hand-ray.webp', 'tier3'],
  ['xr-comfort-mode', 'xr/comfort-mode.webp', 'tier3'],
  ['xr-ar-tabletop-constellation', 'xr/ar-tabletop-constellation.webp', 'tier3'],
  ['xr-model-ground-room', 'xr/models/ground-room.placeholder.gltf', 'tier3-placeholder'],
  ['xr-model-life-map-star', 'xr/models/life-map-star.placeholder.gltf', 'tier3-placeholder'],
  ['xr-model-focus-chamber', 'xr/models/focus-chamber.placeholder.gltf', 'tier3-placeholder'],
  ['xr-model-orb-companion', 'xr/models/orb-companion.placeholder.gltf', 'tier3-placeholder'],
  ['tier4-studio-preview', 'tier4/studio-preview.webp', 'tier4'],
  ['tier4-admin-control-room', 'tier4/admin-control-room.webp', 'tier4'],
  ['tier4-analytics-insight-map', 'tier4/analytics-insight-map.webp', 'tier4'],
  ['tier4-jobs-queue', 'tier4/jobs-queue.webp', 'tier4'],
  ['tier4-content-story-template', 'tier4/content-story-template.webp', 'tier4'],
  ['tier4-privacy-ops', 'tier4/privacy-ops.webp', 'tier4'],
  ['tier4-investor-system-map', 'tier4/investor-system-map.webp', 'tier4'],
  ['tier5-trust-consent-architecture', 'tier5/trust-consent-architecture.webp', 'tier5'],
  ['tier5-accessibility-reduced-motion', 'tier5/accessibility-reduced-motion.webp', 'tier5'],
  ['tier5-accessibility-high-contrast', 'tier5/accessibility-high-contrast.webp', 'tier5'],
  ['tier5-captions-layer', 'tier5/captions-layer.webp', 'tier5'],
  ['tier5-launch-proof-matrix', 'tier5/launch-proof-matrix.webp', 'tier5'],
  ['tier5-security-boundary', 'tier5/security-boundary.webp', 'tier5'],
  ['tier5-export-delete-flow', 'tier5/export-delete-flow.webp', 'tier5'],
  ['audio-haptic-waveform', 'audio/haptic-waveform.webp', 'tier5-accessibility'],
  ['audio-caption-card', 'audio/caption-card.webp', 'tier5-accessibility'],
  ['avatar-quest-guide', 'avatars/quest-guide.webp', 'tier3'],
  ['avatar-accessibility-guide', 'avatars/accessibility-guide.webp', 'tier5'],
  ['avatar-trust-steward', 'avatars/trust-steward.webp', 'tier5'],
  ['avatar-proof-operator', 'avatars/proof-operator.webp', 'tier5'],
];

function walk(dir, files = []) {
  if (!existsSync(dir)) return files;
  for (const item of readdirSync(dir)) {
    const full = join(dir, item);
    const stat = statSync(full);
    if (stat.isDirectory()) walk(full, files);
    else if (supported.has(extname(full).toLowerCase())) files.push(full);
  }
  return files;
}

function rowsFor(items) {
  return items.map(([area, path, status]) => {
    const present = existsSync(join(assetRoot, path));
    return { area, path, status: present ? status : 'missing', present };
  });
}

const all = walk(assetRoot).map((file) => relative(assetRoot, file).split('\\').join('/'));
const coreRows = rowsFor(coreRequired);
const expansionRows = rowsFor(expansionTargets);
const coreMissing = coreRows.filter((row) => !row.present);
const expansionMissing = expansionRows.filter((row) => !row.present);
const allKnown = [...coreRows, ...expansionRows];
const review = all.filter((file) => !allKnown.some((row) => row.path === file));
const result = coreMissing.length === 0 ? 'GREEN' : 'RED';

const byStatus = expansionRows.reduce((counts, row) => {
  counts[row.status] = (counts[row.status] || 0) + 1;
  return counts;
}, {});

const md = [
  '# URAI Final Asset Receipt',
  '',
  `Generated: ${new Date().toISOString()}`,
  `Result: ${result}`,
  '',
  `Total asset files found: ${all.length}`,
  `Core launch assets checked: ${coreRows.length}`,
  `Core launch assets missing: ${coreMissing.length}`,
  `Expansion / AAA next-stage targets checked: ${expansionRows.length}`,
  `Expansion / AAA next-stage targets missing: ${expansionMissing.length}`,
  '',
  '## Core launch assets',
  '',
  'These are the assets that must be present for the current wired Tier-1/Tier-2 launch surfaces.',
  '',
  '| Area | Path | Status |',
  '| --- | --- | --- |',
  ...coreRows.map((row) => `| ${row.area} | ${row.path} | ${row.status} |`),
  '',
  '## AAA next-stage asset targets',
  '',
  'These are the Tier 1-5 / v1-v5 expansion assets. Missing items do not make the current build RED, but they show what still needs to be materialized or replaced with bespoke art.',
  '',
  '| Area | Path | Target | Present |',
  '| --- | --- | --- | --- |',
  ...expansionRows.map((row) => `| ${row.area} | ${row.path} | ${row.status} | ${row.present ? 'yes' : 'no'} |`),
  '',
  '## Expansion target counts',
  '',
  ...Object.entries(byStatus).sort(([a], [b]) => a.localeCompare(b)).map(([status, count]) => `- ${status}: ${count}`),
  '',
  '## Review bucket',
  '',
  'Present assets outside the required launch and expansion target lists. Review before deletion.',
  '',
  ...review.slice(0, 160).map((file) => `- ${file}`),
  review.length > 160 ? `- ...and ${review.length - 160} more` : '',
  '',
  '## Classification language',
  '',
  '- final: custom approved art or production capture.',
  '- placeholder-final: safe production placeholder currently wired and acceptable until final custom art replaces it.',
  '- v1-launch: launch social/demo/proof asset needed for the first public push.',
  '- tier3: WebXR/Quest/AR visual asset needed for the spatial release path.',
  '- tier4: operations, studio, analytics, jobs, or partner platform visual.',
  '- tier5: trust, accessibility, consent, security, or evidence visual.',
  '- missing: required route asset not present.',
  '- review: present but not part of the required launch or expansion list.',
].join('\n');

writeFileSync(outPath, md);
console.log(`Wrote ${outPath}`);
console.log(`RESULT=${result}`);
console.log(`TOTAL_ASSETS=${all.length}`);
console.log(`CORE_REQUIRED=${coreRows.length}`);
console.log(`CORE_MISSING=${coreMissing.length}`);
console.log(`EXPANSION_TARGETS=${expansionRows.length}`);
console.log(`EXPANSION_MISSING=${expansionMissing.length}`);
