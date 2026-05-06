#!/usr/bin/env node
import { execSync } from 'node:child_process';
import fs from 'node:fs';

const scope = JSON.parse(fs.readFileSync('src/canon/tier1-scope.json', 'utf8')).paths;
const migrationDocs = ['docs/canon/CANON_MIGRATION_PROCESS.md', 'docs/canon/LOCS_MIGRATION_PROCESS.md', '.canon-migration/2026-05-05-locs-lock-pass.md']
  .filter((p) => fs.existsSync(p))
  .map((p) => fs.readFileSync(p, 'utf8'))
  .join('\n');

const base = process.env.GITHUB_BASE_REF ? `origin/${process.env.GITHUB_BASE_REF}` : 'HEAD~1';
let changed = [];
try {
  changed = execSync(`git diff --name-only ${base}...HEAD`, { encoding: 'utf8' }).trim().split('\n').filter(Boolean);
} catch {
  changed = execSync('git diff --name-only HEAD~1..HEAD', { encoding: 'utf8' }).trim().split('\n').filter(Boolean);
}
const tier1Changed = changed.filter((f) => scope.includes(f));
if (!tier1Changed.length) {
  console.log('Tier-1 immutability check: no Tier-1 scoped file changes.');
  process.exit(0);
}
if (!migrationDocs.includes('CANON_MIGRATION_APPROVED')) {
  console.error('TIER1 IMMUTABILITY FAIL: Tier-1 files changed without CANON_MIGRATION_APPROVED marker.');
  console.error(tier1Changed.join('\n'));
  process.exit(1);
}
console.log('TIER1 IMMUTABILITY PASS: approved Tier-1 changes.');
