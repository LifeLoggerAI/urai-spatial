#!/usr/bin/env node
import { execSync } from 'node:child_process';
import fs from 'node:fs';

const tierMarkers = {
  1: 'CANON_MIGRATION_APPROVED',
  2: 'LOCS_TIER_2_MIGRATION_APPROVED',
  3: 'LOCS_TIER_3_MIGRATION_APPROVED',
  4: 'LOCS_TIER_4_MIGRATION_APPROVED',
  5: 'LOCS_TIER_5_MIGRATION_APPROVED'
};

function lines(command) {
  try {
    return execSync(command, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
      .trim()
      .split('\n')
      .filter(Boolean);
  } catch {
    return [];
  }
}

function gitChangedFiles() {
  const candidates = [];
  if (process.env.GITHUB_BASE_REF) candidates.push(`git diff --name-only origin/${process.env.GITHUB_BASE_REF}...HEAD`);
  candidates.push('git diff --name-only HEAD~1..HEAD');
  candidates.push('git diff --name-only --cached');
  candidates.push('git diff --name-only');

  for (const command of candidates) {
    const result = lines(command);
    if (result.length) return result;
  }

  return [];
}

const changed = gitChangedFiles();
if (changed.length === 0) {
  console.log('No comparable git diff available; migration marker check skipped for shallow checkout.');
  process.exit(0);
}

const touched = new Set();
for (const file of changed) {
  if (/TIER_1_CANON_STANDARDS\.md|src\/canon\/tier1\.ts|src\/canon\/foundation\.ts|src\/canon\/identity\.ts|src\/canon\/ontology\.ts|src\/canon\/privacy\.ts|src\/canon\/design\.ts|src\/canon\/invariants\.ts|TIER1_/i.test(file)) touched.add(1);
  if (/TIER_2_CANON_STANDARDS\.md|src\/canon\/tier2\.ts/i.test(file)) touched.add(2);
  if (/TIER_3_CANON_STANDARDS\.md|src\/canon\/tier3\.ts/i.test(file)) touched.add(3);
  if (/TIER_4_CANON_STANDARDS\.md|src\/canon\/tier4\.ts/i.test(file)) touched.add(4);
  if (/TIER_5_CANON_STANDARDS\.md|src\/canon\/tier5\.ts/i.test(file)) touched.add(5);
}

if (touched.size === 0) {
  console.log('No canon tier files changed; migration marker check skipped.');
  process.exit(0);
}

const markerFiles = [
  'docs/canon/CANON_MIGRATION_PROCESS.md',
  'docs/canon/LOCS_MIGRATION_PROCESS.md',
  '.canon-migration/20260506-tier1-lock-hardening.md',
]
  .filter((p) => fs.existsSync(p))
  .map((p) => fs.readFileSync(p, 'utf8'))
  .join('\n');

for (const tier of touched) {
  const marker = tierMarkers[tier];
  if (!markerFiles.includes(marker)) {
    console.error(`Missing migration marker reference for Tier-${tier}: ${marker}`);
    process.exit(1);
  }
}
console.log(`Migration markers verified for tiers: ${[...touched].sort().join(', ')}`);
