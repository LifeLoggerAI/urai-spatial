#!/usr/bin/env node
import fs from 'node:fs';

const forbidden = [/tier\s*1\s+is\s+deprecated/i, /replace\s+tier\s*1/i, /override\s+tier\s*1\s+definition/i];
const files = [
  'docs/canon/TIER_2_CANON_STANDARDS.md',
  'docs/canon/TIER_3_CANON_STANDARDS.md',
  'docs/canon/TIER_4_CANON_STANDARDS.md',
  'docs/canon/TIER_5_CANON_STANDARDS.md',
  'src/canon/tier2.ts',
  'src/canon/tier3.ts',
  'src/canon/tier4.ts',
  'src/canon/tier5.ts'
];
for (const file of files) {
  if (!fs.existsSync(file)) continue;
  const c = fs.readFileSync(file, 'utf8');
  for (const rx of forbidden) {
    if (rx.test(c)) {
      console.error(`Tier-1 redefinition detected in ${file} via ${rx}`);
      process.exit(1);
    }
  }
}
console.log('No Tier-1 redefinition patterns found.');
