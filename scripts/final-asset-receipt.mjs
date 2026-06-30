import { existsSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, extname, relative } from 'node:path';

const repoRoot = process.cwd();
const assetRoot = join(repoRoot, 'urai-tier1', 'public', 'assets', 'urai');
const outPath = join(repoRoot, 'docs', 'final-asset-receipt.md');
const supported = new Set(['.png', '.jpg', '.jpeg', '.webp', '.svg', '.glb', '.gltf', '.mp3', '.wav', '.ogg']);

const required = [
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

const all = walk(assetRoot).map((file) => relative(assetRoot, file).split('\\').join('/'));
const rows = required.map(([area, path, status]) => {
  const present = existsSync(join(assetRoot, path));
  return { area, path, status: present ? status : 'missing', present };
});
const missing = rows.filter((row) => !row.present);
const review = all.filter((file) => !rows.some((row) => row.path === file));
const result = missing.length === 0 ? 'GREEN' : 'RED';

const md = [
  '# URAI Final Asset Receipt',
  '',
  `Generated: ${new Date().toISOString()}`,
  `Result: ${result}`,
  '',
  `Total asset files found: ${all.length}`,
  `Required assets checked: ${rows.length}`,
  `Missing required assets: ${missing.length}`,
  '',
  '## Required launch assets',
  '',
  '| Area | Path | Status |',
  '| --- | --- | --- |',
  ...rows.map((row) => `| ${row.area} | ${row.path} | ${row.status} |`),
  '',
  '## Review bucket',
  '',
  'Present assets outside the required launch list. Review before deletion.',
  '',
  ...review.slice(0, 120).map((file) => `- ${file}`),
  review.length > 120 ? `- ...and ${review.length - 120} more` : '',
  '',
  '## Classification language',
  '',
  '- final: custom approved art or production capture.',
  '- placeholder-final: safe production placeholder currently wired and acceptable until final custom art replaces it.',
  '- missing: required route asset not present.',
  '- review: present but not part of the required launch list.',
].join('\n');

writeFileSync(outPath, md);
console.log(`Wrote ${outPath}`);
console.log(`RESULT=${result}`);
console.log(`TOTAL_ASSETS=${all.length}`);
console.log(`REQUIRED=${rows.length}`);
console.log(`MISSING=${missing.length}`);
