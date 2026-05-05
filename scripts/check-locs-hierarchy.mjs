#!/usr/bin/env node
import fs from 'node:fs';

const requiredDocs = [
  'docs/canon/LOCS_OVERVIEW.md',
  'docs/canon/LOCS_CANON_MAP.md',
  'docs/canon/TIER_2_CANON_STANDARDS.md',
  'docs/canon/TIER_3_CANON_STANDARDS.md',
  'docs/canon/TIER_4_CANON_STANDARDS.md',
  'docs/canon/TIER_5_CANON_STANDARDS.md',
  'docs/canon/LOCS_MIGRATION_PROCESS.md',
  'docs/canon/CANON_MIGRATION_PROCESS.md'
];
const requiredExports = [
  'src/canon/locs.ts','src/canon/tier2.ts','src/canon/tier3.ts','src/canon/tier4.ts','src/canon/tier5.ts','src/canon/index.ts'
];

const missing = [...requiredDocs, ...requiredExports].filter((p) => !fs.existsSync(p));
if (missing.length) {
  console.error('Missing LOCS requirements:\n' + missing.join('\n'));
  process.exit(1);
}
console.log('LOCS hierarchy files present.');
