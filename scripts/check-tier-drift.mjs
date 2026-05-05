#!/usr/bin/env node
import fs from 'node:fs';

const tier1Pattern = /tier[- ]1/i;
const t1 = fs.readFileSync('docs/canon/TIER_1_CANON_STANDARDS.md', 'utf8');
if (!tier1Pattern.test(t1)) {
  console.error('Tier-1 doc missing tier-1 references');
  process.exit(1);
}

for (const n of [2, 3, 4, 5]) {
  const content = fs.readFileSync(`docs/canon/TIER_${n}_CANON_STANDARDS.md`, 'utf8');
  if (!tier1Pattern.test(content)) {
    console.error(`Tier-${n} doc missing Tier-1 relationship reference`);
    process.exit(1);
  }
}

console.log('Tier drift checks passed.');
