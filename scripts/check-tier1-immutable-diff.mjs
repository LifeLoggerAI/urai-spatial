#!/usr/bin/env node
import { execSync } from 'node:child_process';
import fs from 'node:fs';

const scope = JSON.parse(fs.readFileSync('src/canon/tier1-scope.json', 'utf8')).paths;
const migrationDocs = [
  'docs/canon/CANON_MIGRATION_PROCESS.md',
  'docs/canon/LOCS_MIGRATION_PROCESS.md',
  '.canon-migration/2026-05-05-locs-lock-pass.md',
  '.canon-migration/20260506-tier1-lock-hardening.md',
]
  .filter((p) => fs.existsSync(p))
  .map((p) => fs.readFileSync(p, 'utf8'))
  .join('\n');

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

function changedFiles() {
  const candidates = [];
  if (process.env.GITHUB_BASE_REF) candidates.push(`git diff --name-only origin/${process.env.GITHUB_BASE_REF}...HEAD`);
  candidates.push('git diff --name-only HEAD~1..HEAD');
  candidates.push('git diff --name-only --cached');
  candidates.push('git diff --name-only');

  for (const command of candidates) {
    const result = lines(command);
    if (result.length) return result;
  }

  // In shallow PR merge checkouts there may be no comparable parent available.
  // In that case verify the migration marker and let the content checks handle drift.
  return [];
}

const changed = changedFiles();
const tier1Changed = changed.filter((f) => scope.includes(f));
const hasApprovedMarker = migrationDocs.includes('TIER_1_CANON_MIGRATION_APPROVED') || migrationDocs.includes('CANON_MIGRATION_APPROVED');

if (!changed.length) {
  if (!hasApprovedMarker) {
    console.error('TIER1 IMMUTABILITY FAIL: shallow checkout has no diff and no approved migration marker.');
    process.exit(1);
  }
  console.log('TIER1 IMMUTABILITY PASS: shallow checkout; approved migration marker present.');
  process.exit(0);
}

if (!tier1Changed.length) {
  console.log('Tier-1 immutability check: no Tier-1 scoped file changes.');
  process.exit(0);
}

if (!hasApprovedMarker) {
  console.error('TIER1 IMMUTABILITY FAIL: Tier-1 files changed without approved migration marker.');
  console.error(tier1Changed.join('\n'));
  process.exit(1);
}
console.log('TIER1 IMMUTABILITY PASS: approved Tier-1 changes.');
