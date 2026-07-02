#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const publicRoot = path.join(repoRoot, 'urai-tier1/public');
const strict = process.argv.includes('--strict');

const v1Assets = [
  '/assets/urai/home/home-threshold-main.webp',
  '/assets/urai/home/home-threshold-mobile.webp',
  '/assets/urai/home/home-ground-portal.webp',
  '/assets/urai/home/home-sky-ascent.webp',
  '/assets/urai/home/home-threshold-fallback.svg',
  '/assets/urai/ground/ground-world-main.webp',
  '/assets/urai/ground/ground-world-mobile.webp',
  '/assets/urai/ground/ground-reception.webp',
  '/assets/urai/ground/ground-privacy-sanctuary.webp',
  '/assets/urai/ground/ground-logistics.webp',
  '/assets/urai/ground/ground-wellness.webp',
  '/assets/urai/ground/ground-memory-archive.webp',
  '/assets/urai/life-map/life-map-galaxy-main.webp',
  '/assets/urai/life-map/life-map-galaxy-mobile.webp',
  '/assets/urai/life-map/life-map-node-threshold.webp',
  '/assets/urai/life-map/life-map-node-becoming.webp',
  '/assets/urai/life-map/life-map-node-studio.webp',
  '/assets/urai/focus/focus-memory-chamber-main.webp',
  '/assets/urai/focus/focus-memory-chamber-mobile.webp',
  '/assets/urai/replay/replay-memory-film-main.webp',
  '/assets/urai/replay/replay-memory-film-mobile.webp',
  '/assets/urai/mirror/mirror-reflection-main.webp',
  '/assets/urai/mirror/mirror-reflection-mobile.webp',
  '/assets/urai/passport/passport-vault-main.webp',
  '/assets/urai/passport/passport-vault-mobile.webp',
  '/assets/urai/privacy-controls/privacy-controls-main.webp',
  '/assets/urai/privacy-controls/privacy-controls-mobile.webp',
  '/assets/urai/location-map/location-emotional-weather-main.webp',
  '/assets/urai/location-map/location-emotional-weather-mobile.webp',
  '/assets/urai/status/status-route-matrix-main.webp',
  '/assets/urai/status/status-route-matrix-mobile.webp',
  '/assets/urai/ui/orb-idle.webp',
  '/assets/urai/ui/orb-active.webp',
  '/assets/urai/ui/orb-listening.webp',
  '/assets/urai/avatars/receptionist.webp',
  '/assets/urai/avatars/privacy-steward.webp',
  '/assets/urai/avatars/schedule-steward.webp',
  '/assets/urai/avatars/wellness-guide.webp',
  '/assets/urai/avatars/relationship-liaison.webp',
  '/assets/urai/avatars/logistics-helper.webp',
  '/assets/urai/avatars/archivist.webp',
  '/assets/urai/avatars/operator.webp',
];

const v2Assets = [
  '/assets/urai/v2/helpers/welcome-guide-idle.webp',
  '/assets/urai/v2/helpers/welcome-guide-working.webp',
  '/assets/urai/v2/helpers/privacy-steward-protecting.webp',
  '/assets/urai/v2/helpers/schedule-steward-approval.webp',
  '/assets/urai/v2/helpers/wellness-guide-complete.webp',
  '/assets/urai/v2/objects/keys-idle.webp',
  '/assets/urai/v2/objects/keys-inspect.webp',
  '/assets/urai/v2/objects/work-console-approval.webp',
  '/assets/urai/v2/objects/memory-case-protected.webp',
  '/assets/urai/v2/stars/star-base.webp',
  '/assets/urai/v2/stars/star-hover.webp',
  '/assets/urai/v2/stars/star-selected.webp',
  '/assets/urai/v2/stars/star-focus-ready.webp',
  '/assets/urai/v2/stars/star-replay-ready.webp',
  '/assets/urai/v2/stars/star-protected.webp',
  '/assets/urai/v2/stars/recovery-star.webp',
  '/assets/urai/v2/stars/relationship-star.webp',
  '/assets/urai/v2/stars/family-star.webp',
  '/assets/urai/v2/stars/legacy-star.webp',
  '/assets/urai/v2/focus/recovery-focus-chamber.webp',
  '/assets/urai/v2/focus/relationship-focus-chamber.webp',
  '/assets/urai/v2/focus/legacy-focus-chamber.webp',
  '/assets/urai/v2/focus/missing-image-focus-fallback.webp',
  '/assets/urai/v2/replay/recovery-replay-template.webp',
  '/assets/urai/v2/replay/relationship-replay-template.webp',
  '/assets/urai/v2/replay/legacy-replay-template.webp',
  '/assets/urai/v2/replay/daily-reset-replay-template.webp',
  '/assets/urai/v2/mirror/body-pattern-glyph.webp',
  '/assets/urai/v2/mirror/relationship-pattern-glyph.webp',
  '/assets/urai/v2/mirror/soft-warning-pattern-state.webp',
  '/assets/urai/v2/passport/passport-private.webp',
  '/assets/urai/v2/passport/passport-consent-requested.webp',
  '/assets/urai/v2/passport/passport-consent-granted.webp',
  '/assets/urai/v2/passport/passport-consent-revoked.webp',
  '/assets/urai/v2/onboarding/first-run-home-card.webp',
  '/assets/urai/v2/accessibility/reduced-motion-equivalent.webp',
];

const v3Assets = [
  '/assets/urai/xr/quest-entry-main.webp',
  '/assets/urai/xr/webxr-fallback.webp',
  '/assets/urai/xr/xr-entry-fallback.svg',
  '/assets/urai/xr/models/home-threshold.glb',
  '/assets/urai/xr/models/ground-room.glb',
  '/assets/urai/xr/models/life-map-galaxy.glb',
  '/assets/urai/xr/models/focus-chamber.glb',
  '/assets/urai/xr/models/replay-film-space.glb',
  '/assets/urai/xr/models/orb-companion.glb',
  '/assets/urai/xr/input/gaze-cursor.webp',
  '/assets/urai/xr/input/controller-reticle.webp',
  '/assets/urai/xr/input/hand-ray.webp',
  '/assets/urai/xr/comfort/comfort-mode.webp',
  '/assets/urai/xr/comfort/seated-mode-card.webp',
  '/assets/urai/xr/ar/tabletop-life-map.webp',
  '/assets/urai/xr/ar/focus-preview.webp',
  '/assets/urai/xr/audio/orb-idle.webm',
  '/assets/urai/xr/audio/star-select.webm',
  '/assets/urai/xr/haptics/orb-pulse.json',
  '/assets/urai/xr/haptics/replay-beat.json',
  '/assets/urai/xr/performance/asset-weight-manifest.json',
  '/assets/urai/xr/proof/quest-home-proof.webp',
  '/assets/urai/xr/proof/quest-ground-proof.webp',
  '/assets/urai/xr/proof/quest-life-map-proof.webp',
  '/assets/urai/xr/proof/quest-focus-proof.webp',
  '/assets/urai/xr/proof/quest-replay-proof.webp',
  '/assets/urai/xr/proof/quest-xr-entry-proof.webp',
  '/assets/urai/xr/proof/quest-navigation-proof.mp4',
  '/assets/urai/xr/proof/quest-device-receipt.json',
];

function checkGroup(name, items) {
  const present = [];
  const missing = [];
  for (const asset of items) {
    const diskPath = path.join(publicRoot, asset.replace(/^\/assets\//, 'assets/'));
    if (fs.existsSync(diskPath)) present.push(asset);
    else missing.push(asset);
  }
  return { name, total: items.length, present, missing };
}

const results = [
  checkGroup('V1 public route final-art assets', v1Assets),
  checkGroup('V2 living system state assets', v2Assets),
  checkGroup('V3 XR physical proof assets', v3Assets),
];

for (const result of results) {
  console.log(`\n## ${result.name}`);
  console.log(`present=${result.present.length} missing=${result.missing.length} total=${result.total}`);
  if (result.missing.length) {
    console.log('missing:');
    for (const item of result.missing) console.log(`- ${item}`);
  }
}

const summary = Object.fromEntries(results.map((result) => [result.name, {
  present: result.present.length,
  missing: result.missing.length,
  total: result.total,
}]));

const outDir = path.join(repoRoot, 'docs/receipts');
fs.mkdirSync(outDir, { recursive: true });
const reportPath = path.join(outDir, 'V123_ASSET_WALL_AUDIT.latest.json');
fs.writeFileSync(reportPath, JSON.stringify({ generatedAt: new Date().toISOString(), strict, summary, results }, null, 2));
console.log(`\nWrote ${path.relative(repoRoot, reportPath)}`);

const missingTotal = results.reduce((sum, result) => sum + result.missing.length, 0);
if (strict && missingTotal > 0) {
  console.error(`Strict asset wall failed: ${missingTotal} required assets missing.`);
  process.exit(1);
}
