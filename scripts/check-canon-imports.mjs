#!/usr/bin/env node
import fs from 'node:fs';

const index = fs.readFileSync('src/canon/index.ts', 'utf8');
for (const token of [
  'tier1',
  'tier2',
  'tier3',
  'tier4',
  'tier5',
  'locs',
  'foundation',
  'identity',
  'ontology',
  'privacy',
  'design',
  'invariants',
]) {
  if (!index.includes(token)) {
    console.error(`src/canon/index.ts missing export reference for ${token}`);
    process.exit(1);
  }
}

const tier1 = fs.readFileSync('src/canon/tier1.ts', 'utf8');
for (const token of ['URAI_TIER_1_CANON', 'TIER_1_CANON_STATUS', 'URAI_TIER_1_HOME_INVARIANT']) {
  if (!tier1.includes(token)) {
    console.error(`src/canon/tier1.ts missing canonical export/reference ${token}`);
    process.exit(1);
  }
}

console.log('Canon import/export surface looks valid.');
