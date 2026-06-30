import { existsSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, extname, relative } from 'node:path';

const repoRoot = process.cwd();
const assetRoot = join(repoRoot, 'urai-tier1', 'public', 'assets', 'urai');
const outPath = join(repoRoot, 'docs', 'final-asset-receipt.md');
const supported = new Set(['.png', '.jpg', '.jpeg', '.webp', '.svg', '.glb', '.gltf', '.mp3', '.wav', '.ogg']);

const required = [
  ['home', 'home/home-threshold-main.webp', 'placeholder-final'],
  ['home-mobile', 'home/home-threshold-mobile.webp', 'placeholder-final'],
  ['ground', 'ground/ground-world-main.webp', 'placeholder-final'],
  ['life-map', 'life-map/life-map-galaxy-main.webp', 'placeholder-final'],
  ['focus', 'focus/focus-memory-chamber-main.webp', 'placeholder-final'],
  ['replay', 'replay/replay-memory-film-main.webp', 'placeholder-final'],
  ['mirror', 'mirror/mirror-reflection-main.webp', 'placeholder-final'],
  ['passport', 'passport/passport-vault-main.webp', 'placeholder-final'],
  ['privacy-controls', 'privacy-controls/privacy-controls-main.webp', 'placeholder-final'],
  ['location-map', 'location-map/location-emotional-weather-main.webp', 'placeholder-final'],
  ['status', 'status/status-route-matrix-main.webp', 'placeholder-final'],
  ['orb-idle', 'ui/orb-idle.webp', 'placeholder-final'],
  ['orb-active', 'ui/orb-active.webp', 'placeholder-final'],
  ['orb-listening', 'ui/orb-listening.webp', 'placeholder-final'],
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

const all = walk(assetRoot).map((file) => relative(assetRoot, file).replaceAll('\\\\', '/'));
const rows = required.map(([area, path, status]) => {
  const present = existsSync(join(assetRoot, path));
  return { area, path, status: present ? status : 'missing', present };
});
const missing = rows.filter((row) => !row.present);
const unusedReview = all.filter((file) => !rows.some((row) => row.path === file));

const md = [
  '# URAI Final Asset Receipt',
  '',
  `Generated: ${new Date().toISOString()}`,
  '',
  `Total asset files found: ${all.length}`,
  `Required assets checked: ${rows.length}`,
  `Missing required assets: ${missing.length}`,
  '',
  '## Required launch assets',
  '',
  '| Area | Path | Status |',
  '| --- | --- | --- |',
  ...rows.map((row) => `| ${row.area} | \`${row.path}\` | ${row.status} |`),
  '',
  '## Review bucket',
  '',
  'These assets exist but are not in the minimum required launch list. They may still be used by route manifests or older surfaces and should be reviewed before deletion.',
  '',
  ...unusedReview.slice(0, 80).map((file) => `- \`${file}\``),
  unusedReview.length > 80 ? `- ...and ${unusedReview.length - 80} more` : '',
  '',
  '## Classification language',
  '',
  '- final: custom approved art or production capture.',
  '- placeholder-final: safe production placeholder currently wired and acceptable until final custom art replaces it.',
  '- missing: required route asset not present.',
  '- review: present but not part of the minimum launch list.',
].join('\n');

writeFileSync(outPath, md);
console.log(`Wrote ${outPath}`);
console.log(`TOTAL_ASSETS=${all.length}`);
console.log(`REQUIRED=${rows.length}`);
console.log(`MISSING=${missing.length}`);
